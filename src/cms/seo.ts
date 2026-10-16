import type { CmsDocument } from './schema';
import { contentLanguage, localizedText, publicProduct, resolveImage, pageLocaleAvailable } from './render-utils';
import { pagePath, type PublicRoute } from './routing';

export const DEFAULT_CANONICAL_ORIGIN = 'https://fezguidetours.elhamlaouy.workers.dev';

export function canonicalOrigin(configured?: string): string {
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Invalid canonical origin');
    return url.origin;
  }
  return DEFAULT_CANONICAL_ORIGIN;
}
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
export const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
export const notFound = (language: PublicRoute['language']) => language === 'fr' ? 'Page introuvable' : language === 'es' ? 'Página no encontrada' : 'Page not found';

export function pageDescription(document: CmsDocument, page: CmsDocument['pages'][number], language: PublicRoute['language']): string {
  const authored = localizedText(page.seo.description, language).trim();
  if (authored) return authored;
  const candidates = page.sections.filter(section => section.enabled).flatMap(section => {
    const copy = [localizedText(section.description, language)];
    if (section.type === 'richText') copy.push(...section.blocks.flatMap(block => block.type === 'list' ? block.items[language] : [localizedText(block.text, language)]));
    if (section.type === 'cardGrid') copy.push(...section.cards.map(card => localizedText(card.description, language)));
    if (section.type === 'productGrid') copy.push(...section.productIds.map(id => localizedText(document.products.find(product => product.id === id)?.shortDescription, language)));
    return copy;
  }).filter(Boolean);
  const narrative = (candidates.find(copy => copy.trim().length >= 60) ?? candidates[0] ?? `${localizedText(page.title, language)} — ${document.siteSettings.siteName}`).replace(/\s+/g, ' ').trim();
  return narrative.length > 160 ? `${narrative.slice(0, 157).replace(/\s+\S*$/, '')}…` : narrative;
}

export function routeSeoHead(document: CmsDocument, route: PublicRoute, origin: string): string {
  const page = route.page;
  const language = page ? contentLanguage(page, route.language) : route.language;
  const title = page ? localizedText(page.seo.title, language) || localizedText(page.title, language) : `404 — ${notFound(language)}`;
  const description = page ? pageDescription(document, page, language) : notFound(language);
  const canonical = page ? `${origin}${pagePath(document, page.id, route.language)}` : undefined;
  const visibleImage = page?.sections.flatMap(section => {
    if (!section.enabled) return [];
    if (section.type === 'gallery') return section.images;
    return 'image' in section && section.image ? [section.image] : [];
  })[0];
  const image = page?.seo.image ?? visibleImage;
  const imageSrc = image ? resolveImage(document, image, language)?.src : undefined;
  const imageUrl = imageSrc ? new URL(imageSrc, origin).href : undefined;
  const meta = (name: string, value: string, property = false) => `<meta ${property ? 'property' : 'name'}="${name}" content="${escapeHtml(value)}">`;
  const tags = [`<title>${escapeHtml(title)}</title>`, meta('description', description), meta('robots', !page || page.seo.noIndex ? 'noindex,follow' : 'index,follow'),
    meta('og:title', title, true), meta('og:description', description, true), meta('og:type', 'website', true), meta('og:site_name', document.siteSettings.siteName, true),
    meta('og:locale', { en: 'en_US', fr: 'fr_FR', es: 'es_ES' }[language], true), meta('twitter:card', imageUrl ? 'summary_large_image' : 'summary'), meta('twitter:title', title), meta('twitter:description', description)];
  if (imageUrl) tags.push(meta('og:image', imageUrl, true), meta('twitter:image', imageUrl));
  if (canonical && page) {
    tags.push(`<link rel="canonical" href="${escapeHtml(canonical)}">`, meta('og:url', canonical, true));
    for (const lang of (['en', 'fr', 'es'] as const).filter(locale => pageLocaleAvailable(document, page, locale))) tags.push(`<link rel="alternate" hreflang="${lang}" href="${origin}${pagePath(document, page.id, lang)}">`);
    const defaultLanguage = (['en', 'fr', 'es'] as const).find(locale => pageLocaleAvailable(document, page, locale)) ?? route.language;
    tags.push(`<link rel="alternate" hreflang="x-default" href="${origin}${pagePath(document, page.id, defaultLanguage)}">`);
    const settings = document.siteSettings;
    const schema: Record<string, unknown>[] = [
      { '@context': 'https://schema.org', '@type': 'WebSite', name: settings.siteName, url: `${origin}/` },
      { '@context': 'https://schema.org', '@type': 'TravelAgency', name: settings.siteName, url: `${origin}/`, telephone: settings.phoneNumber, email: settings.email,
        address: { '@type': 'PostalAddress', streetAddress: localizedText(settings.address, language) } },
      { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: canonical, inLanguage: language },
    ];
    const product = page.kind === 'product' ? publicProduct(document, page.productId) : undefined;
    // Offers are only marked up when this matching product's price is actually visible in a booking section.
    if (product && page.sections.some(section => section.enabled && section.type === 'cta' && section.variant === 'booking' && section.productId === product.id)) {
      const hero = page.sections.find(section => section.enabled && section.type === 'hero' && localizedText(section.title, language));
      schema.push({ '@context': 'https://schema.org', '@type': 'Product', name: localizedText(hero?.title ?? page.title, language), url: canonical,
        ...(imageUrl ? { image: imageUrl } : {}), ...(product.price ? { offers: { '@type': 'Offer', price: product.price.amount, priceCurrency: product.price.currency, url: canonical } } : {}) });
    }
    tags.push(`<script type="application/ld+json">${safeJson(schema)}</script>`);
  }
  return tags.join('\n');
}

/** Same escaped metadata for client transitions as a fresh Worker request. */
export function applyRouteSeo(dom: Document, document: CmsDocument, route: PublicRoute): void {
  const canonical = dom.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
  const configured = dom.querySelector('meta[name="cms-canonical-origin"]')?.getAttribute('content')
    ?? dom.head.dataset.cmsCanonicalOrigin ?? (canonical ? new URL(canonical).origin : undefined);
  const origin = canonicalOrigin(configured);
  dom.head.dataset.cmsCanonicalOrigin = origin;
  const template = dom.createElement('template');
  // Only escaped text/allowlisted attributes and safely serialized JSON enter this controlled fragment.
  template.innerHTML = routeSeoHead(document, route, origin);
  for (const node of dom.head.querySelectorAll('title, meta[name="description"], meta[name="robots"], meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"], link[rel="alternate"][hreflang], script[type="application/ld+json"]')) node.remove();
  dom.head.append(template.content);
}
