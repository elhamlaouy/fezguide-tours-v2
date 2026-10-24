import type { CmsDocument, CmsSection } from '../src/cms/schema';
import { validateCmsDocument } from '../src/cms/schema';
import { isPublicPage, pageLocaleAvailable } from '../src/cms/render-utils';
import { pagePath, resolveRoute, type PublicRoute } from '../src/cms/routing';
import { CmsStore } from './cms-store';
import { slugRedirects } from './cms-slug-redirects';
import { resolveImage } from '../src/cms/render-utils';
import { imageSizes, optimizedImageSrc, responsiveImageProps } from '../src/cms/optimized-image';
import { publicCmsDocument, type CmsRoutesEnv } from './cms-routes';

export interface PublicSeoEnv extends CmsRoutesEnv {
  CANONICAL_ORIGIN?: string;
  /** Trusted deployment config: JSON object mapping old slugs to current stable page ids. */
  CMS_SLUG_REDIRECTS?: string;
  ASSETS?: { fetch(request: Request): Promise<Response> };
}
import { canonicalOrigin, routeSeoHead, safeJson, notFound } from '../src/cms/seo';

/** The Vite entrypoint is controlled markup, not arbitrary CMS HTML. Preserve all non-SEO assets. */
export function rewriteRouteHtml(html: string, document: CmsDocument, route: PublicRoute, origin: string): string {
  const attribute = (tag: string, name: string) => new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag)?.slice(1).find(value => value !== undefined)?.toLowerCase();
  let result = html.replace(/<title\b[^>]*>[\s\S]*?<\/title\s*>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, tag => attribute(tag, 'type') === 'application/ld+json' || attribute(tag, 'id') === 'cms-published-document' ? '' : tag)
    .replace(/<(?:meta|link)\b(?:"[^"]*"|'[^']*'|[^'">])*\/?\s*>/gi, tag => {
      const name = attribute(tag, 'name') ?? attribute(tag, 'property') ?? '';
      const rel = attribute(tag, 'rel');
      return name === 'description' || name === 'robots' || name.startsWith('og:') || name.startsWith('twitter:') || rel === 'canonical' || (rel === 'alternate' && attribute(tag, 'hreflang')) ? '' : tag;
    });
  // Replace stale source-route image hints, preserving font/script/style preloads.
  result = result.replace(/<link\b(?:"[^"]*"|'[^']*'|[^'">])*\/?\s*>/gi, tag => attribute(tag, 'rel') === 'preload' && attribute(tag, 'as') === 'image' ? '' : tag);
  const hero = route.page?.sections.find(section => section.type === 'hero' && section.enabled && section.variant !== 'minimal');
  const image = hero?.type === 'hero' && hero.image ? resolveImage(document, hero.image, route.language) : undefined;
  if (image) {
    // Only fixed manifest paths and numerically bounded CSS enter HTML attributes, never CMS URLs.
    const derivative = optimizedImageSrc(image.src);
    const props = responsiveImageProps(image.src, imageSizes(document.theme.containerWidth, hero?.variant === 'split' ? 'split' : 'banner'), true);
    if (/^\/images\/optimized\/[a-f0-9]+\.webp$/.test(derivative) && props.srcSet) result = result.replace(/<\/head\s*>/i, `<link rel="preload" as="image" href="${derivative}" imagesrcset="${props.srcSet}" imagesizes="${props.sizes}" fetchpriority="high">\n</head>`);
  }
  // Canonical pages/products drive published rendering. Keep stored/API legacy data intact,
  // but omit its duplicate collections from the validated public HTML bootstrap.
  // The restored authored cards still consume editorial highlights absent from the
  // section schema. Keep those public records; trim only duplicated product/archive collections.
  const productIds = new Set(document.products.map(product => product.id));
  const blogIds = new Set(document.blogPosts.map(post => post.id));
  const blogRoute = route.page?.id === 'blog' || blogIds.has(route.page?.id ?? '');
  const customIds = new Set(document.legacy.customPages.map(page => page.id));
  const pages = document.pages.map(page => {
    // Cross-page card summaries feed approvedPublicData. Custom pages retain their
    // authored projection; the blog's inline reader also needs every post body.
    if (page.id === route.page?.id || page.source === 'src/data/translations.ts' || customIds.has(page.id) ||
        blogRoute && (page.id === 'blog' || blogIds.has(page.id))) return page;
    const summary = page.kind === 'editorial' ? page.sections.find(section => section.enabled && section.type === 'richText' && section.blocks.some(block => block.type === 'paragraph')) : undefined;
    return { ...page, sections: page.sections.flatMap<CmsSection>(section => {
      if (section.type === 'cardGrid') return [section];
      // Preserve the canonical shortDescription fallback when no card/archive exists.
      if (section === summary && section.type === 'richText') return [{ ...section, blocks: section.blocks.filter(block => block.type === 'paragraph').slice(0, 1) }];
      return [];
    }) };
  });
  const snapshot = { ...document, pages, legacy: { ...document.legacy, tours: document.legacy.tours.filter(tour => !productIds.has(tour.id)), customPages: document.legacy.customPages.filter(custom => document.pages.find(page => page.id === custom.id)?.source !== 'src/data/translations.ts'), blogPosts: [], teamMembers: [], faqs: [] } };
  // The scope is an explicit bootstrap envelope, never part of saved/API documents.
  const bootstrap = { scope: { version: 1, pageId: route.page?.id ?? null, language: route.language }, document: snapshot };
  result = result.replace(/<html\b[^>]*>/i, `<html lang="${route.language}" dir="ltr">`)
    .replace(/<\/head\s*>/i, `${routeSeoHead(document, route, origin)}\n<meta name="cms-canonical-origin" content="${origin}">\n</head>`)
    .replace(/<\/body\s*>/i, `<script id="cms-published-document" type="application/json">${safeJson(bootstrap)}</script>\n</body>`);
  if (!route.page) result = result.replace(/(<div\s+id=["']root["'][^>]*>)[\s\S]*?(<\/div>)/i, `$1<main><h1>404 — ${notFound(route.language)}</h1></main>$2`);
  return result;
}

const textResponse = (body: string, type: string, status = 200) => new Response(body, { status, headers: { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store' } });
export async function publicSeoResponse(request: Request, env: PublicSeoEnv): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  const discovery = path === '/sitemap.xml' || path === '/robots.txt';
  if (!['GET', 'HEAD'].includes(request.method) || /^\/(?:admin|api|assets|images|media|\.well-known|cdn-cgi)(?:\/|$)/.test(path) || (!discovery && /\.[^/]+$/.test(path))) return null;
  const accept = request.headers.get('Accept') ?? '*/*';
  if (!discovery && !accept.includes('text/html') && !accept.includes('*/*')) return null;
  if (!env.CMS_DB) return null;
  const published = await new CmsStore(env.CMS_DB, validateCmsDocument).readPublished();
  if (!published) return null;
  // The store validates the private document; only its public projection enters HTML/SEO.
  const document = publicCmsDocument(published.document) as unknown as CmsDocument;
  const origin = canonicalOrigin(env.CANONICAL_ORIGIN);
  if (path === '/robots.txt') return textResponse(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`, 'text/plain');
  if (path === '/sitemap.xml') {
    const urls = document.pages.filter(page => isPublicPage(document, page) && !page.seo.noIndex).flatMap(page => (['en', 'fr', 'es'] as const).filter(language => pageLocaleAvailable(document, page, language)).map(language => {
      const alternates = (['en', 'fr', 'es'] as const).filter(lang => pageLocaleAvailable(document, page, lang)).map(lang => `<xhtml:link rel="alternate" hreflang="${lang}" href="${origin}${pagePath(document, page.id, lang)}"/>`).join('');
      return `<url><loc>${origin}${pagePath(document, page.id, language)}</loc>${alternates}</url>`;
    })).join('');
    return textResponse(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`, 'application/xml');
  }
  const route = resolveRoute(url, document);
  if (!route.page && env.CMS_SLUG_REDIRECTS) {
    const aliases = slugRedirects(env.CMS_SLUG_REDIRECTS);
    const key = route.experienceId ?? route.pageId;
    const targetId = Object.hasOwn(aliases, key) ? (aliases as Record<string, string>)[key] : undefined;
    const target = document.pages.find(page => page.id === targetId && isPublicPage(document, page));
    if (target) {
      const search = new URLSearchParams(url.search);
      for (const name of ['page', 'experience', 'tour', 'lang', 'language']) search.delete(name);
      route.redirect = `${pagePath(document, target.id, route.language)}${search.size ? `?${search}` : ''}`;
    }
  }
  if (route.redirect) return new Response(null, { status: 308, headers: { Location: route.redirect, 'Cache-Control': 'no-store' } });
  if (!env.ASSETS) return textResponse('Public assets are unavailable', 'text/plain', 503);
  const assetUrl = new URL('/index.html', url);
  const asset = await env.ASSETS.fetch(new Request(assetUrl, { headers: { Accept: 'text/html' } }));
  if (!asset.ok || !asset.headers.get('Content-Type')?.includes('text/html')) return textResponse('Public assets are unavailable', 'text/plain', 503);
  const html = rewriteRouteHtml(await asset.text(), document, route, origin);
  return new Response(request.method === 'HEAD' ? null : html, { status: route.page ? 200 : 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
