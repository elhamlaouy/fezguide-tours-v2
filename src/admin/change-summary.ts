import type { CmsDocument, CmsPage } from '../cms/schema';
import type { Language } from '../types';
import { itemName } from './editor-names';
import { safetyCopy, type SafetyCopy } from './safety-copy';

/** One plain-language line of the "what changed" list. `area` orders the lines (pages first, design and photos last). */
export interface ChangeLine { area: 'pages' | 'tours' | 'blog' | 'people' | 'settings' | 'design' | 'photos'; text: string }
export interface ChangeSummary { lines: ChangeLine[]; total: number }

const AREA_ORDER: Record<ChangeLine['area'], number> = { pages: 0, tours: 1, blog: 2, people: 3, settings: 4, design: 5, photos: 6 };

/** Key-order independent structural equality. Runs once per Publish click, never while typing. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left).filter(key => left[key] !== undefined);
  if (keys.length !== Object.keys(right).filter(key => right[key] !== undefined).length) return false;
  for (const key of keys) if (!deepEqual(left[key], right[key])) return false;
  return true;
}

interface Row { id: string }
function byId<T extends Row>(rows: readonly T[] | undefined): Map<string, T> {
  return new Map((rows ?? []).map(row => [row.id, row]));
}
interface Delta<T> { added: T[]; removed: T[]; changed: { before: T; after: T }[] }
function delta<T extends Row>(before: readonly T[] | undefined, after: readonly T[] | undefined): Delta<T> {
  const old = byId(before);
  const next = byId(after);
  const out: Delta<T> = { added: [], removed: [], changed: [] };
  for (const [id, row] of next) {
    const prior = old.get(id);
    if (!prior) out.added.push(row);
    else if (!deepEqual(prior, row)) out.changed.push({ before: prior, after: row });
  }
  for (const [id, row] of old) if (!next.has(id)) out.removed.push(row);
  return out;
}

function pageName(page: CmsPage, language: Language): string {
  if (page.id === 'home') return { en: 'Home', fr: 'Accueil', es: 'Inicio' }[language];
  return itemName(page, language) || page.slug || page.id;
}
function name(row: unknown, fallbackId: string, language: Language): string {
  return itemName(row, language) || fallbackId;
}

/** How a page changed, as short phrases ("2 sections changed"). Empty when the page is identical. */
function pageParts(before: CmsPage, after: CmsPage, t: SafetyCopy): string[] {
  const parts: string[] = [];
  const sections = delta(before.sections, after.sections);
  if (sections.changed.length) parts.push(t.sectionsChanged(sections.changed.length));
  if (sections.added.length) parts.push(t.sectionsAdded(sections.added.length));
  if (sections.removed.length) parts.push(t.sectionsRemoved(sections.removed.length));
  const keptBefore = before.sections.filter(item => after.sections.some(other => other.id === item.id)).map(item => item.id);
  const keptAfter = after.sections.filter(item => before.sections.some(other => other.id === item.id)).map(item => item.id);
  if (keptBefore.join('\n') !== keptAfter.join('\n')) parts.push(t.sectionsMoved);
  const { sections: _a, ...restBefore } = before;
  const { sections: _b, ...restAfter } = after;
  if (!deepEqual(restBefore, restAfter)) parts.push(t.pageSettings);
  return parts;
}

const PRICE_KEYS = ['priceEUR', 'priceMAD', 'priceUSD'] as const;
function withoutPrices(product: CmsDocument['products'][number]): unknown {
  const { price: _price, practicalInfo, ...rest } = product as unknown as Record<string, unknown> & { practicalInfo?: Record<string, unknown> };
  const info = { ...(practicalInfo ?? {}) };
  for (const key of PRICE_KEYS) delete info[key];
  return { ...rest, practicalInfo: info };
}
function pricesDiffer(before: CmsDocument['products'][number], after: CmsDocument['products'][number]): boolean {
  if (!deepEqual(before.price, after.price)) return true;
  const a = (before.practicalInfo ?? {}) as Record<string, unknown>;
  const b = (after.practicalInfo ?? {}) as Record<string, unknown>;
  return PRICE_KEYS.some(key => !deepEqual(a[key], b[key]));
}
function countParts(d: { added: unknown[]; removed: unknown[]; changed: unknown[] }, t: SafetyCopy): string {
  return [[d.added.length, t.added], [d.changed.length, t.changed], [d.removed.length, t.removed]]
    .filter(([n]) => (n as number) > 0).map(([n, label]) => `${n} ${label}`).join(', ');
}

/**
 * What differs between the live (published) document and the draft about to be published, in the editor's own words.
 * `published` is null before anything has ever been published. Every line names something the owner can find in the menus.
 */
export function summarizeChanges(published: CmsDocument | null, draft: CmsDocument, language: Language): ChangeSummary {
  const t = safetyCopy(language);
  const lines: ChangeLine[] = [];
  const add = (area: ChangeLine['area'], text: string) => lines.push({ area, text });
  const before: CmsDocument = published ?? { ...draft, pages: [], products: [], blogPosts: [], teamMembers: [], faqs: [], media: [], reviews: [], editorialEntries: [], uiCopy: {}, navigation: [], footer: { ...draft.footer, links: [] } };
  const productIds = new Set([...before.products, ...draft.products].map(item => item.id));
  /** A tour's page is the page that points at it (or shares its id). */
  const tourPageId = (productId: string): string => draft.pages.find(page => page.productId === productId)?.id ?? before.pages.find(page => page.productId === productId)?.id ?? productId;
  const tourPageIds = new Set([...productIds].map(tourPageId));
  const postIds = new Set([...before.blogPosts, ...draft.blogPosts].map(item => item.id));
  const pagesBefore = byId(before.pages);

  // Pages. A tour's or blog post's own page is reported on the tour / post line instead.
  const pages = delta(before.pages, draft.pages);
  for (const page of pages.added) if (!tourPageIds.has(page.id) && !postIds.has(page.id)) add('pages', t.pageAdded(pageName(page, language)));
  for (const page of pages.removed) if (!tourPageIds.has(page.id) && !postIds.has(page.id)) add('pages', t.pageRemoved(pageName(page, language)));
  for (const { before: was, after: now } of pages.changed) {
    if (tourPageIds.has(now.id) || postIds.has(now.id)) continue;
    const parts = pageParts(was, now, t);
    add('pages', `${t.page}${t.colon} ${pageName(now, language)}${parts.length ? ` — ${parts.join(', ')}` : ''}`);
  }
  const ownPageParts = (id: string): string[] => {
    const was = pagesBefore.get(id);
    const now = draft.pages.find(page => page.id === id);
    return was && now ? pageParts(was, now, t) : [];
  };

  // Tours.
  const products = delta(before.products, draft.products);
  for (const row of products.added) add('tours', t.tourAdded(name(row, row.id, language)));
  for (const row of products.removed) add('tours', t.tourRemoved(name(row, row.id, language)));
  const touched = new Set(products.changed.map(item => item.after.id));
  for (const { before: was, after: now } of products.changed) {
    const parts: string[] = [];
    if (pricesDiffer(was, now)) parts.push(t.prices);
    if (!deepEqual(withoutPrices(was), withoutPrices(now))) {
      if (was.published !== now.published && deepEqual({ ...(withoutPrices(was) as object), published: 0 }, { ...(withoutPrices(now) as object), published: 0 })) parts.push(now.published === false ? t.nowHidden : t.nowVisible);
      else parts.push(t.details);
    }
    parts.push(...ownPageParts(tourPageId(now.id)));
    add('tours', `${t.tour}${t.colon} ${name(now, now.id, language)} — ${parts.join(', ')}`);
  }
  // A tour whose own page changed but whose tour data did not.
  for (const page of pages.changed) {
    const product = draft.products.find(item => tourPageId(item.id) === page.after.id);
    if (product && !touched.has(product.id)) add('tours', `${t.tour}${t.colon} ${name(product, product.id, language)} — ${pageParts(page.before, page.after, t).join(', ')}`);
  }

  // Blog posts.
  const posts = delta(before.blogPosts, draft.blogPosts);
  for (const row of posts.added) add('blog', t.blogAdded(name(row, row.id, language)));
  for (const row of posts.removed) add('blog', t.blogRemoved(name(row, row.id, language)));
  const postTouched = new Set(posts.changed.map(item => item.after.id));
  for (const { after: now } of posts.changed) {
    const parts = ownPageParts(now.id);
    add('blog', `${t.blogPost}${t.colon} ${name(now, now.id, language)}${parts.length ? ` — ${parts.join(', ')}` : ''}`);
  }
  for (const page of pages.changed) {
    const id = page.after.id;
    if (!postIds.has(id) || postTouched.has(id) || !draft.blogPosts.some(item => item.id === id)) continue;
    add('blog', `${t.blogPost}${t.colon} ${name(draft.blogPosts.find(item => item.id === id), id, language)} — ${pageParts(page.before, page.after, t).join(', ')}`);
  }

  // People and shared library rows are summarised per collection to keep the list short.
  for (const [key, label] of [['teamMembers', t.team], ['faqs', t.faqs], ['reviews', t.reviews]] as const) {
    const d = delta(before[key] as Row[], draft[key] as Row[]);
    const summary = countParts(d, t);
    if (summary) add('people', `${label}${t.colon} ${summary}`);
  }
  const copyKeys = new Set([...Object.keys(before.uiCopy), ...Object.keys(draft.uiCopy)]);
  const copyChanged = [...copyKeys].filter(key => !deepEqual(before.uiCopy[key], draft.uiCopy[key])).length;
  if (copyChanged) add('settings', `${t.texts}${t.colon} ${copyChanged} ${t.changed}`);

  if (!deepEqual(before.siteSettings, draft.siteSettings)) add('settings', t.siteSettings);
  if (!deepEqual(before.navigation, draft.navigation)) add('settings', t.menu);
  if (!deepEqual(before.footer, draft.footer)) add('settings', t.footer);
  if (!deepEqual(before.theme, draft.theme)) add('design', t.design);

  const media = delta(before.media, draft.media);
  const photos = countParts(media, t);
  if (photos) add('photos', `${t.photos}${t.colon} ${photos}`);

  lines.sort((a, b) => AREA_ORDER[a.area] - AREA_ORDER[b.area]);
  return { lines, total: lines.length };
}
