// Server-rendered, text-only snapshot of the current page, placed inside #root.
// React's createRoot().render() replaces it on mount, so everything here must be text the
// visitor also sees after hydration (no cloaking). It is a conservative subset: navigation,
// breadcrumb, the page H1, section headings, paragraphs, lists, cards, prices, FAQ, itinerary,
// inclusions, practical facts, footer. Every CMS string is HTML-escaped, every URL passes
// isSafeCmsUrl, and no CMS value ever becomes markup, an attribute name, or a class.
import type { CmsDocument, CmsLink, CmsPage, CmsProduct, CmsSection } from '../src/cms/schema';
import { isSafeCmsUrl } from '../src/cms/schema';
import type { Language } from '../src/types';
import { contentLanguage, formatPrice, localizedList, localizedText, pageLocaleAvailable, publicProduct, uiText, visibleLink } from '../src/cms/render-utils';
import { pagePath } from '../src/cms/routing';
import { businessContactHref } from '../src/cms/business-contact';
import { footerShellLinks, visibleShellLinks } from '../src/cms/public-document';
import { escapeHtml as esc } from '../src/cms/seo';
import { UI_TEXT } from '../src/data/shared-ui';

// Approved hand-built product layouts (src/cms/ApprovedPageRenderer.tsx) omit a few generic labels.
// The fidelity test renders every seed page through the real client, so drift here is caught.
const EXPERIENCE_LAYOUTS = ['daytrip-chefchaouen', 'daytrip-meknes', 'daytrip-ifrane', 'daytrip-custom', 'our-food-tours'];
const EXPERIENCE_INCLUSIONS = {
  included: { en: 'Included in Tour:', fr: 'Inclus :', es: 'Incluido en la visita:' },
  excluded: { en: 'Not Included:', fr: 'Non inclus :', es: 'No incluido:' },
} as const;
const GENERIC_INCLUSION_TITLES = ['Included & Formats', 'Inclusions & Formats', 'Qué incluye y modalidades'];
const HOME_LABEL = { en: 'Home', fr: 'Accueil', es: 'Inicio' } as const;
const BREADCRUMB_LABEL = { en: 'Breadcrumb', fr: 'Breadcrumb', es: 'Ruta de navegación' } as const;

const tag = (name: string, value: string, attributes = '') => value ? `<${name}${attributes}>${esc(value)}</${name}>` : '';

/** Same destination rules as the client's Actions/SafeAnchor/Footer links; unsafe URLs yield no anchor. */
function anchor(document: CmsDocument, link: CmsLink, language: Language): string {
  const label = localizedText(link.label, language).trim();
  if (!label) return '';
  if (link.pageId !== undefined) return `<a href="${esc(pagePath(document, link.pageId, language))}">${esc(label)}</a>`;
  const href = businessContactHref(document, link.href || '');
  if (!isSafeCmsUrl(href)) return '';
  return `<a href="${esc(href)}"${href.startsWith('https://') ? ' rel="noopener noreferrer" target="_blank"' : ''}>${esc(label)}</a>`;
}
function actions(document: CmsDocument, links: CmsLink[], language: Language): string {
  const visible = visibleShellLinks(document, links, language).map(link => anchor(document, link, language)).filter(Boolean);
  return visible.length ? `<ul class="ssr-actions">${visible.map(item => `<li>${item}</li>`).join('')}</ul>` : '';
}

function head(section: CmsSection, language: Language, level: 'h1' | 'h2'): string {
  return tag('p', localizedText(section.eyebrow, language), ' class="ssr-eyebrow"') + tag(level, localizedText(section.title, language)) + tag('p', localizedText(section.description, language), ' class="ssr-lead"');
}

function productCard(document: CmsDocument, product: CmsProduct, language: Language): string {
  const target = document.pages.find(page => page.kind === 'product' && page.productId === product.id);
  if (!target || !pageLocaleAvailable(document, target, language)) return '';
  const title = localizedText(product.title, language);
  const price = formatPrice(product, language);
  return `<li>${tag('p', localizedText(product.subtitle, language), ' class="ssr-eyebrow"')}<h3><a href="${esc(pagePath(document, target.id, language))}">${esc(title)}</a></h3>${tag('p', localizedText(product.shortDescription, language))}${tag('p', price, ' class="ssr-price"')}</li>`;
}

function section(document: CmsDocument, page: CmsPage, item: CmsSection, language: Language, level: 'h1' | 'h2'): string {
  switch (item.type) {
    case 'hero': return head(item, language, level) + actions(document, item.links, language);
    case 'richText': {
      const blocks = item.blocks.map(block => {
        if (block.type === 'list') { const items = localizedList(block.items, language).filter(Boolean); return items.length ? `<ul>${items.map(li => tag('li', li)).join('')}</ul>` : ''; }
        if (block.type === 'link') { const label = (block.text[language] ?? localizedText(block.text, language)).trim(); const href = businessContactHref(document, block.href); return label && isSafeCmsUrl(href) ? `<p><a href="${esc(href)}"${href.startsWith('https://') ? ' rel="noopener noreferrer" target="_blank"' : ''}>${esc(label)}</a></p>` : ''; }
        const value = block.text[language] ?? localizedText(block.text, language);
        return block.type === 'heading' ? tag('h3', value) : block.type === 'quote' ? tag('blockquote', value) : tag('p', value);
      }).join('');
      return head(item, language, level) + blocks;
    }
    case 'cardGrid': {
      const cards = item.cards.filter(card => card.pageId === undefined || document.pages.some(target => target.id === card.pageId && pageLocaleAvailable(document, target, language)));
      const items = cards.map(card => {
        const title = localizedText(card.title, language);
        const linked = card.pageId !== undefined && title ? `<a href="${esc(pagePath(document, card.pageId, language))}">${esc(title)}</a>` : esc(title);
        return `<li>${tag('p', localizedText(card.badge, language), ' class="ssr-eyebrow"')}${title ? `<h3>${linked}</h3>` : ''}${tag('p', localizedText(card.description, language))}</li>`;
      }).join('');
      return head(item, language, level) + (items ? `<ul class="ssr-cards">${items}</ul>` : '');
    }
    case 'productGrid': {
      const items = item.productIds.map(id => publicProduct(document, id)).filter((product): product is CmsProduct => product !== undefined).map(product => productCard(document, product, language)).join('');
      return head(item, language, level) + (items ? `<ul class="ssr-cards">${items}</ul>` : '');
    }
    case 'benefits': {
      // Approved homepage trust badges render the exact language only (an emptied badge stays hidden, no fallback);
      // the generic Benefits renderer falls back to EN/FR. Mirror whichever the client uses.
      const exact = page.id === 'home' && item.id === 'trust';
      const text = (value: Partial<Record<Language, string>>) => exact ? (value[language] ?? '') : localizedText(value, language);
      const items = item.items.map(entry => ({ title: text(entry.title), description: text(entry.description) })).filter(entry => entry.title || entry.description)
        .map(entry => `<li>${tag('strong', entry.title)}${entry.title && entry.description ? ' ' : ''}${tag('span', entry.description)}</li>`).join('');
      return head(item, language, level) + (items ? `<ul>${items}</ul>` : '');
    }
    case 'cta': {
      const booking = item.variant === 'booking' && page.kind === 'product' && item.productId === page.productId ? publicProduct(document, item.productId) : undefined;
      if (item.variant === 'booking' && !booking) return '';
      return head(item, language, level) + (booking ? tag('p', formatPrice(booking, language), ' class="ssr-price"') : '') + actions(document, item.links, language);
    }
    case 'faq': {
      const items = item.faqIds.map(id => document.faqs.find(faq => faq.id === id)).filter(faq => faq !== undefined)
        .map(faq => [localizedText(faq.question, language), localizedText(faq.answer, language)]).filter(([question]) => question)
        .map(([question, answer]) => `<li><h3>${esc(question)}</h3>${tag('p', answer)}</li>`).join('');
      return head(item, language, level) + (items ? `<ul class="ssr-faq">${items}</ul>` : '');
    }
    case 'itinerary': {
      const items = item.stops.map(stop => ({ time: stop.time ?? '', badge: localizedText(stop.badge, language), title: localizedText(stop.title, language), description: localizedText(stop.description, language) })).filter(stop => stop.title)
        .map(stop => `<li>${stop.time ? `${tag('time', stop.time)} ` : ''}${stop.badge ? `${tag('span', stop.badge)} ` : ''}<strong>${esc(stop.title)}</strong>${tag('p', stop.description)}</li>`).join('');
      return head(item, language, level) + (items ? `<ol>${items}</ol>` : '');
    }
    case 'inclusions': {
      const experience = EXPERIENCE_LAYOUTS.includes(page.id);
      const included = localizedList(item.included, language).filter(Boolean);
      const excluded = localizedList(item.excluded, language).filter(Boolean);
      const list = (label: string, values: string[]) => `<h3>${esc(label)}</h3><ul>${values.map(value => tag('li', value)).join('')}</ul>`;
      if (experience) return (GENERIC_INCLUSION_TITLES.includes(localizedText(item.title, language)) ? '' : head(item, language, level)) + list(EXPERIENCE_INCLUSIONS.included[language], included) + list(EXPERIENCE_INCLUSIONS.excluded[language], excluded);
      return head(item, language, level) + list(uiText(document, 'ui.renderer.included', language, { en: 'Included', fr: 'Inclus', es: 'Incluido' }), included) + list(uiText(document, 'ui.renderer.excluded', language, { en: 'Not included', fr: 'Non inclus', es: 'No incluido' }), excluded);
    }
    case 'practicalInfo': {
      const items = item.items.map(entry => ({ title: localizedText(entry.title, language), description: localizedText(entry.description, language) })).filter(entry => entry.title || entry.description)
        .map(entry => `<li>${tag('h3', entry.title)}${tag('p', entry.description)}</li>`).join('');
      // The product layouts show the fact cards without the section heading.
      const product = page.kind === 'product' && (item.id === 'facts');
      return (product ? '' : head(item, language, level)) + (items ? `<ul class="ssr-facts">${items}</ul>` : '');
    }
    case 'contact': return head(item, language, level) + actions(document, item.links, language);
    // gallery, reviews and team add no text beyond their heading in the approved layouts: not snapshotted.
    default: return '';
  }
}

function breadcrumb(document: CmsDocument, page: CmsPage, language: Language): string {
  if (page.id === 'home' || !page.parentId) return '';
  const chain: CmsPage[] = [];
  for (let parent = document.pages.find(p => p.id === page.parentId), steps = 0; parent && steps < 8; parent = parent.parentId ? document.pages.find(p => p.id === parent!.parentId) : undefined, steps++) {
    if (parent.id === page.id || chain.includes(parent)) break;
    if (parent.id !== 'home' && pageLocaleAvailable(document, parent, language)) chain.unshift(parent);
  }
  if (!chain.length) return '';
  const label = (item: CmsPage) => localizedText(document.navigation.find(link => link.enabled && link.pageId === item.id)?.label, language) || localizedText(item.title, language);
  const crumbs = [`<a href="${esc(pagePath(document, 'home', language))}">${esc(HOME_LABEL[language])}</a>`,
    ...chain.map(item => `<a href="${esc(pagePath(document, item.id, language))}">${esc(label(item))}</a>`), `<span aria-current="page">${esc(localizedText(page.title, language))}</span>`];
  return `<nav class="ssr-crumbs" aria-label="${esc(BREADCRUMB_LABEL[language])}">${crumbs.join(' ')}</nav>`;
}

function brand(document: CmsDocument, language: Language): string {
  const name = document.siteSettings.siteName;
  return `<a class="ssr-brand" href="${esc(pagePath(document, 'home', language))}" aria-label="${esc(name)} Logo">${name === 'FezGuideTours' ? '<span>FezGuide</span><span>Tours</span>' : `<span>${esc(name)}</span>`}</a>`;
}

function header(document: CmsDocument, language: Language): string {
  const links = visibleShellLinks(document, document.navigation, language).map(link => anchor(document, link, language)).filter(Boolean);
  return `<header class="ssr-header"><div class="ssr-bar">${brand(document, language)}<nav aria-label="${language === 'es' ? 'Principal' : language === 'fr' ? 'Principale' : 'Main'}">${links.join('')}</nav></div></header>`;
}

function footer(document: CmsDocument, language: Language): string {
  const t = UI_TEXT.footer;
  const settings = document.siteSettings;
  const links = footerShellLinks(document, language).map(link => anchor(document, link, language)).filter(Boolean);
  const address = localizedText(settings.address, language) || t.address[language];
  const phone = `${settings.phoneNumber} (WhatsApp 24/7)`;
  const whatsapp = `https://wa.me/${(settings.whatsappNumber || '212719603009').replace(/[^0-9]/g, '')}`;
  const contact = [tag('li', address), `<li><a href="${esc(whatsapp)}" rel="noopener noreferrer" target="_blank">${esc(phone)}</a></li>`,
    isSafeCmsUrl(`mailto:${settings.email}`) ? `<li><a href="${esc(`mailto:${settings.email}`)}">${esc(settings.email)}</a></li>` : ''].join('');
  return `<footer class="ssr-footer"><div class="ssr-wrap">${brand(document, language)}<p>${esc(localizedText(document.footer.text, language) || t.aboutText[language])}</p>`
    + tag('p', settings.licenseBadge[language] || t.trustBadges[language])
    + `<h2>${esc(uiText(document, 'ui.common.allDepartments', language, UI_TEXT.common.allDepartments))}</h2><ul>${links.map(item => `<li>${item}</li>`).join('')}</ul>`
    + `<h2>${esc(uiText(document, 'ui.footer.contactTitle', language, t.contactTitle))}</h2><ul>${contact}</ul>`
    + `<p>${esc(uiText(document, 'ui.footer.copyright', language, t.copyright))}</p></div></footer>`;
}

/** Uncached build of the snapshot for a found, public page. */
export function buildSnapshot(document: CmsDocument, page: CmsPage, routeLanguage: Language): string {
  const language = contentLanguage(page, routeLanguage);
  const sections = page.sections.filter(item => item.enabled);
  const hero = sections.find(item => item.type === 'hero' && localizedText(item.title, language));
  const body = sections.map(item => section(document, page, item, language, item === hero ? 'h1' : 'h2'))
    .map(html => html ? `<section>${html}</section>` : '').join('');
  const title = hero ? '' : `<header class="ssr-page-head">${tag('h1', localizedText(page.title, language))}</header>`;
  return `<div class="ssr-snapshot">${header(document, routeLanguage)}<main>${breadcrumb(document, page, language)}<article lang="${language}">${title}${body}</article></main>${footer(document, routeLanguage)}</div>`;
}

const MAX_ENTRIES = 300;
const cache = new Map<string, string>();
const documentIds = new WeakMap<object, number>();
let nextDocumentId = 1;
/** Test/maintenance hook: drop every cached snapshot. */
export const clearSnapshotCache = () => cache.clear();
export const snapshotCacheSize = () => cache.size;

/**
 * Snapshot per (published revision, page id, language), cached per isolate in a bounded LRU map.
 * `revision` is the immutable published revision number; without it the document identity is used.
 */
export function cachedSnapshot(document: CmsDocument, page: CmsPage, routeLanguage: Language, revision?: number | string): string {
  let id = documentIds.get(document);
  if (id === undefined) { id = nextDocumentId++; documentIds.set(document, id); }
  const key = `${revision ?? 0}|d${id}|${page.id}|${routeLanguage}`;
  const hit = cache.get(key);
  if (hit !== undefined) { cache.delete(key); cache.set(key, hit); return hit; }
  const built = buildSnapshot(document, page, routeLanguage);
  cache.set(key, built);
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  return built;
}
