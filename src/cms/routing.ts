import type { Language } from '../types';
import type { CmsDocument, CmsPage } from './schema';
import { pageLocaleAvailable } from './render-utils';

export interface PublicRoute {
  language: Language;
  pageId: string;
  experienceId?: string;
  page?: CmsPage;
  redirect?: string;
}

/** A validated relative canonical is an intentional preferred route; the old slug stays an alias. */
export function preferredSlug(page: CmsPage): string {
  return page.seo.canonical?.startsWith('/') ? page.seo.canonical.slice(1) : page.slug;
}

/** English has no prefix; the home page is the locale root, independent of its editable slug. */
export function pagePath(document: CmsDocument | null, key: string, language: Language): string {
  const page = document?.pages.find(page => page.id === key) ?? document?.pages.find(page => page.slug === key);
  const prefix = language === 'en' ? '' : `/${language}`;
  return `${prefix}${(page?.id ?? key) === 'home' ? '' : `/${encodeURIComponent(page ? preferredSlug(page) : key)}`}` || '/';
}

/** URL is the source of truth for reload and back/forward, not ephemeral history.state. */
export function resolveRoute(url: URL, document: CmsDocument | null = null): PublicRoute {
  const segments = url.pathname.split('/').filter(Boolean);
  const prefix = segments[0];
  const prefixed = prefix === 'fr' || prefix === 'es' || prefix === 'en';
  const queryLanguage = url.searchParams.get('lang') ?? url.searchParams.get('language');
  const language: Language = prefixed ? prefix : queryLanguage === 'fr' || queryLanguage === 'es' ? queryLanguage : 'en';
  const pathKey = segments.slice(prefixed ? 1 : 0).join('/');
  const experienceId = !pathKey ? url.searchParams.get('experience') || url.searchParams.get('tour') || undefined : undefined;
  const queryPage = !pathKey ? url.searchParams.get('page') : null;
  const key = pathKey || experienceId || queryPage || 'home';
  // Slugs own paths; ids are retained as legacy aliases after a slug edit.
  const candidate = !pathKey ? document?.pages.find(page => page.id === key) ?? document?.pages.find(page => page.slug === key)
    : document?.pages.find(page => preferredSlug(page) === key) ?? document?.pages.find(page => page.slug === key) ?? document?.pages.find(page => page.id === key);
  const page = candidate && pageLocaleAvailable(document!, candidate, language) ? candidate : undefined;
  const route: PublicRoute = { language, pageId: page?.id ?? (experienceId ? 'experience-detail' : key), experienceId, page };
  if (page) {
    const target = pagePath(document, page.id, language);
    if (url.pathname !== target || experienceId || queryPage || queryLanguage) {
      const search = new URLSearchParams(url.search);
      for (const key of ['experience', 'tour', 'page', 'lang', 'language']) search.delete(key);
      route.redirect = `${target}${search.size ? `?${search}` : ''}${url.hash}`;
    }
  }
  return route;
}
