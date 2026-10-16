import type { ReactNode } from 'react';
import type { CmsDocument, CmsLink, CmsPage } from './schema';
import type { Language } from '../types';
import { isSafeCmsUrl, validateCmsDocument } from './schema';
import { localizedText, visibleLink, pageLocaleAvailable } from './render-utils';

export const CMS_DOCUMENT_PATH = '/api/cms/document';

export type AdminAppProps = { language: 'en' | 'fr' | 'es'; onClose: () => void };
export type AdminAppComponent = (props: AdminAppProps) => ReactNode;

type FetchLike = (input: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

/**
 * Seed page() sets id and slug together. Custom pages and blog posts override slug
 * (the existing PageId). experience-detail is app state; its experience id is the page id.
 */
export function publishedPage(document: CmsDocument, pageId: string, experienceId?: string): CmsPage | undefined {
  const key = pageId === 'experience-detail' ? experienceId : pageId;
  if (!key || key === 'experience-detail' || key === 'admin') return undefined;
  return document.pages.find(page => page.id === key) ?? document.pages.find(page => page.slug === key);
}

export function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

/** Shape guard only. fetchPublishedDocument already ran validateCmsDocument. */
export function isShellDocument(document: CmsDocument | null | undefined): document is CmsDocument {
  return Boolean(document && document.schemaVersion === 1 && Array.isArray(document.pages) && Array.isArray(document.navigation) && document.footer && Array.isArray(document.footer.links) && document.siteSettings && document.uiCopy);
}

export function visibleShellLinks(document: CmsDocument, links: CmsLink[], language: Language): CmsLink[] {
  return links.filter((link) => visibleLink(document, link) && (!link.pageId || document.pages.some(page => page.id === link.pageId && pageLocaleAvailable(document, page, language))) && localizedText(link.label, language).trim());
}

/** The hardcoded Atlas credit stays; a CMS link must not add a second one. */
export function isAtlasCreditLink(link: CmsLink): boolean {
  if ([link.label?.en, link.label?.fr, link.label?.es].some((label) => {
    const text = label?.trim().toLowerCase();
    return text === 'atlas tactics' || text === 'powered by atlas tactics';
  })) return true;
  if (!link.href || !isSafeCmsUrl(link.href)) return false;
  try {
    const host = new URL(link.href).hostname;
    return host === 'atlastactics.com' || host === 'www.atlastactics.com';
  } catch {
    return false;
  }
}

export function footerShellLinks(document: CmsDocument, language: Language): CmsLink[] {
  return visibleShellLinks(document, document.footer.links, language).filter((link) => !isAtlasCreditLink(link));
}

/** Full validation still applies; publication may legitimately project every page away. */
function validPublishedDocument(value: unknown): CmsDocument | null {
  const result = validateCmsDocument(value);
  if (result.valid) return result.document;
  return result.errors.length === 1 && result.errors[0] === 'pages: at least one page required'
    ? value as CmsDocument : null;
}

/** Read the Worker's validated published revision before React's first paint. */
export function readPublishedSnapshot(): CmsDocument | null {
  if (typeof document === 'undefined') return null;
  try {
    const embedded = document.getElementById('cms-published-document')?.textContent;
    return embedded ? validPublishedDocument(JSON.parse(embedded)) : null;
  } catch { return null; }
}

/** Missing, non-OK, null, or invalid documents stay null so the current pages remain. */
export async function fetchPublishedDocument(options?: { fetch?: FetchLike; signal?: AbortSignal }): Promise<CmsDocument | null> {
  // The Worker snapshot and initial SEO share one published revision. Never replace it with a draft or newer API result.
  const initial = readPublishedSnapshot();
  if (initial) return initial;
  const fetchImpl = options?.fetch ?? (globalThis.fetch as FetchLike);
  try {
    const response = await fetchImpl(CMS_DOCUMENT_PATH, {
      headers: { Accept: 'application/json' },
      signal: options?.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const candidate = payload && typeof payload === 'object' && 'document' in payload
      ? (payload as { document?: unknown }).document
      : undefined;
    if (candidate == null) return null;
    return validPublishedDocument(candidate);
  } catch {
    return null;
  }
}

export function loadAdminApp(): Promise<{ AdminApp: AdminAppComponent } | null> {
  // @ts-ignore TS2307 — src/admin/AdminApp.tsx is created concurrently and may be absent.
  return import('../admin/AdminApp')
    .then((mod: { AdminApp?: unknown }) => (typeof mod?.AdminApp === 'function' ? { AdminApp: mod.AdminApp as AdminAppComponent } : null))
    .catch(() => null);
}
