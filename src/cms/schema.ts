import type { Language, SectionPillar, SiteSettings, BlogPost, CustomPage, TeamMember, FaqItem, ItineraryStop } from '../types';

export const CMS_LOCALES = ['en', 'fr', 'es'] as const;
export type Localized<T = string> = Record<Language, T>;
export const CMS_LIMITS = { bytes: 2_000_000, pages: 150, sections: 100, products: 100, media: 1000, items: 100, text: 20_000, title: 500, uiCopy: 2000, errors: 100 } as const;
export interface CmsLink { id: string; label: Localized; enabled: boolean; pageId?: string; href?: string }
export interface CmsTheme {
  colors: { primary: string; accent: string; background: string; text: string };
  font: 'system' | 'inter' | 'noto-sans'; fontScale: number; containerWidth: number;
  spacing: 'compact' | 'comfortable' | 'generous'; radius: 'square' | 'rounded' | 'pill';
  buttonVariant: 'solid' | 'outline'; cardVariant: 'outlined' | 'flat';
}
export interface CmsImage { mediaId: string; alt: Localized; caption?: Localized }
export type CmsRichTextBlock =
  | { type: 'paragraph' | 'heading' | 'quote'; text: Localized }
  | { type: 'list'; items: Localized<string[]> }
  | { type: 'link'; text: Localized; href: string };
interface SectionBase { id: string; enabled: boolean; title?: Localized; eyebrow?: Localized; description?: Localized }
export interface CmsCard { id: string; title: Localized; description: Localized; image?: CmsImage; pageId?: string; badge?: Localized }
export type CmsSection = SectionBase & (
  | { type: 'hero'; variant: 'banner' | 'split' | 'minimal'; image?: CmsImage; links: CmsLink[] }
  | { type: 'richText'; variant: 'story' | 'panel'; blocks: CmsRichTextBlock[] }
  | { type: 'cardGrid'; variant: 'overview' | 'featured'; cards: CmsCard[] }
  | { type: 'productGrid'; variant: 'overview' | 'featured'; productIds: string[] }
  | { type: 'gallery'; variant: 'grid' | 'carousel' | 'story'; images: CmsImage[] }
  | { type: 'benefits'; variant: 'grid' | 'strip'; items: { title: Localized; description: Localized }[] }
  | { type: 'cta'; variant: 'split' | 'banner' | 'booking'; productId?: string; image?: CmsImage; links: CmsLink[] }
  | { type: 'reviews'; variant: 'marquee' | 'grid'; reviewIds: string[] }
  | { type: 'faq'; variant: 'accordion' | 'list'; faqIds: string[] }
  | { type: 'team'; variant: 'grid' | 'story'; teamIds: string[] }
  | { type: 'itinerary'; variant: 'timeline' | 'list'; stops: ItineraryStop[] }
  | { type: 'inclusions'; variant: 'columns' | 'list'; included: Localized<string[]>; excluded: Localized<string[]> }
  | { type: 'practicalInfo'; variant: 'facts' | 'panel'; items: { title: Localized; description: Localized }[] }
  | { type: 'contact'; variant: 'banner' | 'panel'; links: CmsLink[] }
);
export interface CmsPage {
  id: string; slug: string; kind: 'editorial' | 'product' | 'landing'; enabled: boolean; title: Localized;
  parentId?: string; productId?: string; localeFallback?: Partial<Record<Language, Language>>;
  seo: { title: Localized; description: Localized; canonical?: string; image?: CmsImage; noIndex?: boolean };
  sections: CmsSection[]; source?: string;
}
export interface CmsProduct extends SectionPillar {
  kind: 'product'; actionType: 'book_tour'; price?: { amount: number; currency: 'EUR' | 'MAD' | 'USD'; basis: 'person' | 'group' | 'vehicle' };
  cancellationPolicy: Localized; suitableFor: Localized<string[]>;
}
export interface CmsMedia {
  id: string; src: string; alt: Localized; caption?: Localized; width?: number; height?: number;
  focalPoint?: { x: number; y: number }; source?: string;
}
export interface CmsReview { id: string; author: string; title: string; quote: string; date: string; url: string; source: 'tripadvisor'; enabled: boolean }
export interface PublicCmsData { tours: SectionPillar[]; customPages: CustomPage[]; blogPosts: BlogPost[]; teamMembers: TeamMember[]; faqs: FaqItem[]; siteSettings: SiteSettings }
export interface CmsDocument {
  schemaVersion: 1; siteSettings: SiteSettings; theme: CmsTheme; navigation: CmsLink[];
  footer: { text: Localized; links: CmsLink[] }; uiCopy: Record<string, Localized>;
  pages: CmsPage[]; products: CmsProduct[];
  editorialEntries: { id: string; pageId: string; source: string; productId?: string }[];
  blogPosts: BlogPost[]; teamMembers: TeamMember[]; faqs: FaqItem[]; media: CmsMedia[]; reviews: CmsReview[];
  /** Compatibility data is public-only; never include bookings, credentials or drafts. */
  legacy: PublicCmsData;
}
export type CmsValidationResult = { valid: true; errors: string[]; document: CmsDocument } | { valid: false; errors: string[] };

type Check = (value: unknown, path: string, errors: string[]) => void;
// Keep part admission tied to the exact same check functions and collection limits.
const objectFields = new WeakMap<Check, Record<string, Check>>();
const arrayItems = new WeakMap<Check, { check: Check; max: number }>();
const fail = (errors: string[], path: string, message: string) => { if (errors.length < CMS_LIMITS.errors) errors.push(`${path}: ${message}`); };
const str = (max: number = CMS_LIMITS.text, pattern?: RegExp): Check => (v, p, e) => {
  if (typeof v !== 'string' || v.length > max || (pattern && !pattern.test(v))) fail(e, p, 'invalid or oversized string');
};
const id = str(80, /^[a-z0-9][a-z0-9-]*$/);
const bool: Check = (v, p, e) => { if (typeof v !== 'boolean') fail(e, p, 'expected boolean'); };
const number = (min: number, max: number, integer = false): Check => (v, p, e) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) fail(e, p, 'number out of range');
};
const choice = (...values: (string | number)[]): Check => (v, p, e) => { if (!values.includes(v as string)) fail(e, p, 'unsupported value'); };
const optional = (check: Check): Check => (v, p, e) => { if (v !== undefined) check(v, p, e); };
const obj = (fields: Record<string, Check>): Check => {
  const check: Check = (v, p, e) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) { fail(e, p, 'expected object'); return; }
  const record = v as Record<string, unknown>;
  for (const key of Object.keys(record)) if (!Object.hasOwn(fields, key)) fail(e, `${p}.${key}`, 'unknown field');
  for (const [key, check] of Object.entries(fields)) check(record[key], `${p}.${key}`, e);
  };
  objectFields.set(check, fields);
  return check;
};
const array = (check: Check, max: number = CMS_LIMITS.items): Check => {
  const collection: Check = (v, p, e) => {
    if (!Array.isArray(v) || v.length > max) { fail(e, p, 'expected bounded array'); return; }
    v.forEach((item, i) => check(item, `${p}[${i}]`, e));
  };
  arrayItems.set(collection, { check, max });
  return collection;
};
const localized = (check: Check = str()): Check => obj({ en: check, fr: check, es: check });
const copy = localized();
const title = localized(str(CMS_LIMITS.title));
const list = localized(array(str()));

/** Links are data, never scripts. Relative URLs must remain same-origin root/fragment links. */
export function isSafeCmsUrl(value: unknown, image = false): value is string {
  if (typeof value !== 'string' || !value || value.length > 2048 || value !== value.trim() || /[\\\u0000-\u0020\u007f]/.test(value)) return false;
  let decoded: string;
  try { decoded = decodeURIComponent(value); } catch { return false; }
  if (/[\\\u0000-\u001f\u007f]/.test(decoded) || /(^|\/)\.\.?($|[/?#])/.test(decoded) || /%[0-9a-f]{2}/i.test(decoded)) return false;
  if (image && /\.svg(?:[?#]|$)/i.test(decoded)) return false;
  if (decoded.startsWith('/') && !decoded.startsWith('//')) return !image || /^\/images\/[^?#]+\.(?:jpe?g|png|webp|avif|gif)$/i.test(decoded) || /^\/media\/[a-z0-9/-]+\.(?:jpe?g|png|webp|avif|gif)$/i.test(decoded);
  if (!image && /^#[a-z0-9-]+$/i.test(decoded)) return true;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return Boolean(url.hostname) && !url.username && !url.password;
    if (!image && url.protocol === 'mailto:') return /^[^\s@?]+@[^\s@?]+\.[^\s@?]+$/.test(url.pathname) && !url.search && !url.hash;
    if (!image && url.protocol === 'tel:') return /^\+?[0-9-]{7,20}$/.test(url.pathname);
  } catch { return false; }
  return false;
}
const url = (image = false): Check => (v, p, e) => { if (!isSafeCmsUrl(v, image)) fail(e, p, 'unsafe URL'); };
const image = obj({ mediaId: id, alt: copy, caption: optional(copy) });
const link: Check = (v, p, e) => {
  obj({ id, label: title, enabled: bool, pageId: optional(id), href: optional(url()) })(v, p, e);
  if (v && typeof v === 'object') {
    const l = v as CmsLink;
    if ((l.pageId !== undefined) === (l.href !== undefined)) fail(e, p, 'exactly one link target required');
  }
};
const stop = obj({ time: optional(str(100)), title, description: copy, badge: optional(title) });
const facts = array(obj({ title, description: copy }));
const block: Check = (v, p, e) => {
  const t = (v as CmsRichTextBlock | null)?.type;
  if (t === 'paragraph' || t === 'heading' || t === 'quote') obj({ type: choice(t), text: copy })(v, p, e);
  else if (t === 'list') obj({ type: choice(t), items: list })(v, p, e);
  else if (t === 'link') obj({ type: choice(t), text: copy, href: url() })(v, p, e);
  else fail(e, p, 'unsupported rich text block');
};
const sectionFields: Record<CmsSection['type'], Record<string, Check>> = {
  hero: { variant: choice('banner', 'split', 'minimal'), image: optional(image), links: array(link) },
  richText: { variant: choice('story', 'panel'), blocks: array(block) },
  cardGrid: { variant: choice('overview', 'featured'), cards: array(obj({ id, title, description: copy, image: optional(image), pageId: optional(id), badge: optional(title) })) },
  productGrid: { variant: choice('overview', 'featured'), productIds: array(id) },
  gallery: { variant: choice('grid', 'carousel', 'story'), images: array(image) },
  benefits: { variant: choice('grid', 'strip'), items: facts },
  cta: { variant: choice('split', 'banner', 'booking'), productId: optional(id), image: optional(image), links: array(link) },
  reviews: { variant: choice('marquee', 'grid'), reviewIds: array(id) },
  faq: { variant: choice('accordion', 'list'), faqIds: array(id) },
  team: { variant: choice('grid', 'story'), teamIds: array(id) },
  itinerary: { variant: choice('timeline', 'list'), stops: array(stop) },
  inclusions: { variant: choice('columns', 'list'), included: list, excluded: list },
  practicalInfo: { variant: choice('facts', 'panel'), items: facts },
  contact: { variant: choice('banner', 'panel'), links: array(link) },
};
const section: Check = (v, p, e) => {
  const t = (v as CmsSection | null)?.type;
  if (!t || !Object.hasOwn(sectionFields, t)) { fail(e, p, 'unsupported section type'); return; }
  obj({ id, type: choice(t), enabled: bool, title: optional(title), eyebrow: optional(title), description: optional(copy), ...sectionFields[t] })(v, p, e);
};
const siteSettings = obj({
  siteName: str(200), phoneNumber: (v, p, e) => {
    str(30, /^\+?[0-9 ()-]{7,30}$/)(v, p, e);
    if (typeof v === 'string' && !/^[0-9]{7,15}$/.test(v.replace(/[^0-9]/g, ''))) fail(e, p, 'invalid phone digits');
  }, whatsappNumber: str(15, /^[0-9]{7,15}$/), email: str(254, /^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  address: copy, licenseBadge: title, heroTagline: title, heroTitle: title, heroSubtitle: copy,
  heroImage: optional(url(true)), socialInstagram: optional(url()), socialFacebook: optional(url()), socialTripadvisor: optional(url()), googleMaps: optional(url()),
});
const pillarFields: Record<string, Check> = {
  id, pageId: id, title, subtitle: title, shortDescription: copy, fullDescription: copy, highlights: list,
  practicalInfo: optional(obj({ duration: optional(title), departure: optional(title), groupSize: optional(title), priceMAD: optional(number(0, 1_000_000)), priceEUR: optional(number(0, 1_000_000)), priceUSD: optional(number(0, 1_000_000)) })),
  image: url(true), imageAlt: copy, actionType: choice('view_more', 'explore', 'book_tour'), kind: optional(choice('article', 'product')), published: optional(bool),
  galleryImages: optional(array(url(true))), itinerary: optional(array(stop)), included: optional(list), excluded: optional(list), whatToBring: optional(list), meetingPointDetails: optional(copy),
};
const pillar = obj(pillarFields);
const date: Check = (v, p, e) => {
  if (typeof v !== 'string' || v.length > 50 || !/^(?:\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?|[A-Z][a-z]+ \d{1,2}, \d{4})$/.test(v)) { fail(e, p, 'invalid date'); return; }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  const named = /^([A-Z][a-z]+) (\d{1,2}), (\d{4})$/.exec(v);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const year = Number(iso?.[1] ?? named?.[3]);
  const month = iso ? Number(iso[2]) - 1 : months.indexOf(named![1]);
  const day = Number(iso?.[3] ?? named?.[2]);
  // Calendar-only dates must not inherit the editor browser's timezone.
  const parsed = new Date(iso ? v : `${named![3]}-${String(month + 1).padStart(2, '0')}-${named![2].padStart(2, '0')}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month || parsed.getUTCDate() !== day) fail(e, p, 'invalid calendar date');
};
const customPage = obj({ id, slug: id, title, subtitle: title, heroImage: url(true), content: copy, highlights: list, showInNav: bool, published: bool, createdAt: date });
const blog = obj({ id, slug: id, title, excerpt: copy, content: copy, coverImage: url(true), category: title, author: str(200), date, readTime: title, published: bool });
const team = obj({ id, name: str(200), role: title, bio: copy, languages: array(str(100)), experience: title, licenseNumber: optional(str(100)), avatarUrl: url(true) });
const faq = obj({ id, category: choice('tours', 'booking', 'guides', 'transport', 'walking', 'food', 'daytrips', 'general'), question: copy, answer: copy });
const dictionary = (check: Check, max: number): Check => (v, p, e) => {
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).length > max) { fail(e, p, 'expected bounded dictionary'); return; }
  for (const [key, child] of Object.entries(v)) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,159}$/.test(key)) fail(e, p, 'invalid dictionary key');
    check(child, `${p}.${key}`, e);
  }
};
const documentCheck = obj({
  schemaVersion: choice(1), siteSettings,
  theme: obj({ colors: obj({ primary: str(7, /^#[0-9a-f]{6}$/i), accent: str(7, /^#[0-9a-f]{6}$/i), background: str(7, /^#[0-9a-f]{6}$/i), text: str(7, /^#[0-9a-f]{6}$/i) }), font: choice('system', 'inter', 'noto-sans'), fontScale: number(0.8, 1.4), containerWidth: number(960, 1600, true), spacing: choice('compact', 'comfortable', 'generous'), radius: choice('square', 'rounded', 'pill'), buttonVariant: choice('solid', 'outline'), cardVariant: choice('outlined', 'flat') }),
  navigation: array(link), footer: obj({ text: copy, links: array(link) }), uiCopy: dictionary(copy, CMS_LIMITS.uiCopy),
  pages: array(obj({ id, slug: id, kind: choice('editorial', 'product', 'landing'), enabled: bool, title, parentId: optional(id), productId: optional(id),
    localeFallback: optional(obj({ en: optional(choice(...CMS_LOCALES)), fr: optional(choice(...CMS_LOCALES)) })),
    seo: obj({ title, description: copy, canonical: optional(url()), image: optional(image), noIndex: optional(bool) }), sections: array(section, CMS_LIMITS.sections), source: optional(str(500)) }), CMS_LIMITS.pages),
  products: array(obj({ ...pillarFields, kind: choice('product'), actionType: choice('book_tour'), price: optional(obj({ amount: number(0, 1_000_000), currency: choice('EUR', 'MAD', 'USD'), basis: choice('person', 'group', 'vehicle') })), cancellationPolicy: copy, suitableFor: list }), CMS_LIMITS.products),
  editorialEntries: array(obj({ id, pageId: id, source: str(500), productId: optional(id) }), CMS_LIMITS.pages),
  blogPosts: array(blog), teamMembers: array(team), faqs: array(faq),
  media: array(obj({ id, src: url(true), alt: copy, caption: optional(copy), width: optional(number(1, 20000, true)), height: optional(number(1, 20000, true)), focalPoint: optional(obj({ x: number(0, 1), y: number(0, 1) })), source: optional(str(500)) }), CMS_LIMITS.media),
  reviews: array(obj({ id, author: str(200), title: str(500), quote: str(), date, url: url(), source: choice('tripadvisor'), enabled: bool })),
  legacy: obj({ tours: array(pillar, CMS_LIMITS.pages), customPages: array(customPage), blogPosts: array(blog), teamMembers: array(team), faqs: array(faq), siteSettings }),
});

export interface CmsPart { kind: string; index: number; key?: string; value: unknown }
export type CmsPartValidationResult = { valid: true; errors: string[] } | { valid: false; errors: string[] };
const rootFields = objectFields.get(documentCheck)!;
const partChecks: Record<string, Check> = { ...rootFields };
delete partChecks.legacy;
for (const [name, check] of Object.entries(objectFields.get(rootFields.legacy)!)) partChecks[`legacy.${name}`] = check;
export const CMS_PART_FIELDS: Readonly<Record<string, { max: number; collection: boolean; depth: number }>> = Object.freeze(Object.fromEntries(
  Object.entries(partChecks).map(([kind, check]) => [kind, Object.freeze({
    max: kind === 'uiCopy' ? CMS_LIMITS.uiCopy : arrayItems.get(check)?.max ?? 1,
    collection: kind === 'uiCopy' || arrayItems.has(check),
    depth: (kind.startsWith('legacy.') ? 2 : 1) + (arrayItems.has(check) || kind === 'uiCopy' ? 1 : 0),
  })]),
));
const manifestCheck = obj(Object.fromEntries(Object.entries(CMS_PART_FIELDS).map(([kind, spec]) => [kind, number(spec.collection ? 0 : 1, spec.max, true)])));

/** Envelope/position checks only: also usable for already-admitted reference summaries. */
export function isCmsPartEnvelope(value: unknown): value is CmsPart {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(value).some(key => typeof key !== 'string' || !['kind', 'index', 'key', 'value'].includes(key))) return false;
  if (Object.values(descriptors).some(d => !d.enumerable || d.get || d.set)) return false;
  if (!['kind', 'index', 'value'].every(key => Object.hasOwn(descriptors, key))) return false;
  const part = value as CmsPart;
  if (typeof part.kind !== 'string' || !Number.isInteger(part.index) || part.index < 0) return false;
  if (part.kind === 'manifest') return part.index === 0 && !Object.hasOwn(part, 'key');
  if (!Object.hasOwn(CMS_PART_FIELDS, part.kind) || part.index >= CMS_PART_FIELDS[part.kind].max) return false;
  if (part.kind !== 'uiCopy') return !Object.hasOwn(part, 'key');
  return typeof part.key === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,159}$/.test(part.key) && !['__proto__', 'constructor', 'prototype'].includes(part.key);
}

/** Admit exactly one real field item at its original full-document JSON depth. */
export function validateCmsPart(part: CmsPart): CmsPartValidationResult {
  const errors: string[] = [];
  try {
    if (!isCmsPartEnvelope(part)) return { valid: false, errors: ['part: invalid kind, index, key or envelope'] };
    if (part.kind === 'manifest') {
      if (!isJson(part.value)) return { valid: false, errors: ['manifest: expected safe JSON data'] };
      manifestCheck(part.value, 'manifest', errors);
    } else {
      const spec = CMS_PART_FIELDS[part.kind];
      // The dictionary wrapper is intentional: poison keys must not disappear via object assignment.
      const value = part.kind === 'uiCopy' ? { [part.key!]: part.value } : part.value;
      if (!isJson(value, new Set(), spec.depth - (part.kind === 'uiCopy' ? 1 : 0))) return { valid: false, errors: ['document: expected safe JSON data'] };
      const field = partChecks[part.kind];
      if (part.kind === 'uiCopy') field(value, 'document.uiCopy', errors);
      else (arrayItems.get(field)?.check ?? field)(value, `document.${part.kind}${spec.collection ? `[${part.index}]` : ''}`, errors);
    }
    return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
  } catch { return { valid: false, errors: ['part: invalid input'] }; }
}

/** Reject non-JSON objects, dangerous keys and recursion before any field traversal. */
function isJson(value: unknown, ancestors = new Set<object>(), depth = 0): boolean {
  if (depth > 30) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || ancestors.has(value)) return false;
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return false;
  if (Reflect.ownKeys(value).some(key => typeof key !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(key))) return false;
  if (Array.isArray(value) && (value.length > CMS_LIMITS.media || Object.keys(value).length !== value.length || Object.keys(value).some(key => !/^(0|[1-9][0-9]*)$/.test(key)))) return false;
  ancestors.add(value);
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if ((!descriptor.enumerable && !(Array.isArray(value) && key === 'length')) || descriptor.get || descriptor.set || !isJson(descriptor.value, ancestors, depth + 1)) return false;
  }
  ancestors.delete(value);
  return true;
}

/** Relationship-only validation. Call only after real field admission (or on trusted reference summaries). */
export function validateCmsRelationships(value: CmsDocument): string[] {
  const errors: string[] = [];
    const d = value as CmsDocument;
    const unique = (values: string[], path: string) => { if (new Set(values).size !== values.length) fail(errors, path, 'duplicate identifier'); };
    const ids = (items: { id: string }[], path: string) => { unique(items.map(i => i.id), path); return new Set(items.map(i => i.id)); };
    if (!d.pages.length) fail(errors, 'pages', 'at least one page required');
    const pagesById = new Map(d.pages.map(p => [p.id, p]));
    const pageIds = ids(d.pages, 'pages');
    unique(d.pages.map(p => p.slug), 'pages.slug');
    const productIds = ids(d.products, 'products');
    const mediaIds = ids(d.media, 'media');
    const mediaSources = new Set(d.media.map(media => media.src));
    const mediaUrlRef = (src: string | undefined, path: string) => { if (src && !mediaSources.has(src)) fail(errors, path, 'unknown media source'); };
    for (const member of d.teamMembers) mediaUrlRef(member.avatarUrl, `teamMembers.${member.id}.avatarUrl`);
    for (const post of d.blogPosts) mediaUrlRef(post.coverImage, `blogPosts.${post.id}.coverImage`);
    for (const product of d.products) {
      mediaUrlRef(product.image, `products.${product.id}.image`);
      for (const src of product.galleryImages ?? []) mediaUrlRef(src, `products.${product.id}.galleryImages`);
    }
    for (const media of d.media) if ((media.width === undefined) !== (media.height === undefined)) fail(errors, `media.${media.id}`, 'width and height must be provided together');
    const reviewIds = ids(d.reviews, 'reviews');
    const faqIds = ids(d.faqs, 'faqs');
    const teamIds = ids(d.teamMembers, 'teamMembers');
    ids(d.blogPosts, 'blogPosts'); ids(d.editorialEntries, 'editorialEntries');
    ids(d.legacy.tours, 'legacy.tours'); ids(d.legacy.customPages, 'legacy.customPages'); ids(d.legacy.blogPosts, 'legacy.blogPosts'); ids(d.legacy.faqs, 'legacy.faqs'); ids(d.legacy.teamMembers, 'legacy.teamMembers');
    const ref = (id: string | undefined, set: Set<string>, path: string) => { if (id !== undefined && !set.has(id)) fail(errors, path, 'missing reference'); };
    const checkImage = (img: CmsImage | undefined, path: string) => ref(img?.mediaId, mediaIds, path);
    const links = (items: CmsLink[], path: string) => { ids(items, path); items.forEach(l => ref(l.pageId, pageIds, path)); };
    links(d.navigation, 'navigation'); links(d.footer.links, 'footer.links');
    for (const entry of d.editorialEntries) {
      ref(entry.pageId, pageIds, `editorialEntries.${entry.id}.pageId`); ref(entry.productId, productIds, `editorialEntries.${entry.id}.productId`);
      if (d.pages.find(p => p.id === entry.pageId)?.kind !== 'editorial') fail(errors, entry.id, 'editorial entry must reference editorial page');
    }
    // SectionPillar.pageId is the category; the detail route uses its product id.
    for (const product of d.products) {
      const path = `products.${product.id}`;
      ref(product.pageId, pageIds, `${path}.pageId`);
      const detail = pagesById.get(product.id);
      if (detail?.kind !== 'product' || detail.productId !== product.id) fail(errors, path, 'product requires its matching product detail page');
      if (detail?.parentId !== product.pageId) fail(errors, `${path}.pageId`, 'product category must match detail page parent');
    }
    for (const tour of d.legacy.tours) {
      const path = `legacy.tours.${tour.id}`;
      ref(tour.pageId, pageIds, `${path}.pageId`);
      const bookable = tour.actionType === 'book_tour';
      if ((tour.kind === 'article' && bookable) || (tour.kind === 'product' && !bookable)) fail(errors, path, 'kind and booking action must agree');
      const detail = pagesById.get(tour.id);
      if (detail?.kind !== (bookable ? 'product' : 'editorial')) fail(errors, path, 'legacy classification must match detail page');
      if (detail?.parentId !== tour.pageId) fail(errors, `${path}.pageId`, 'legacy category must match detail page parent');
      if (bookable ? !productIds.has(tour.id) : productIds.has(tour.id)) fail(errors, path, 'legacy classification must match product collection');
    }
    for (const page of d.pages) {
      const p = `pages.${page.id}`;
      if (['admin', 'api', 'assets', 'media', 'images', 'fonts', 'en', 'fr', 'es', 'ar'].includes(page.slug)) fail(errors, p, 'reserved slug');
      if (page.seo.canonical?.startsWith('/')) {
        const preferred = page.seo.canonical.slice(1);
        const reserved = ['admin', 'api', 'assets', 'media', 'images', 'fonts', 'en', 'fr', 'es', 'ar'];
        if ((page.id === 'home' ? preferred !== '' : !/^[a-z0-9][a-z0-9-]{0,79}$/.test(preferred)) || reserved.includes(preferred)) fail(errors, `${p}.seo.canonical`, 'invalid canonical route');
        if (d.pages.some(other => other.id !== page.id && (other.slug === preferred || other.id === preferred || other.seo.canonical === page.seo.canonical))) fail(errors, `${p}.seo.canonical`, 'canonical route already used');
      }
      ref(page.parentId, pageIds, `${p}.parentId`); ref(page.productId, productIds, `${p}.productId`);
      const ancestors = new Set([page.id]);
      let parentId = page.parentId;
      while (parentId !== undefined) {
        if (ancestors.has(parentId)) { fail(errors, p, 'cyclic page parents'); break; }
        ancestors.add(parentId); parentId = pagesById.get(parentId)?.parentId;
      }
      if (page.kind === 'product' && !page.productId) fail(errors, p, 'product page requires productId');
      if (page.kind === 'product' && page.productId !== page.id) fail(errors, `${p}.productId`, 'product detail page must target its matching product');
      if (page.kind !== 'product' && page.productId) fail(errors, p, 'non-product page cannot be bookable');
      for (const locale of CMS_LOCALES) {
        const visited = new Set<Language>([locale]);
        let fallback = page.localeFallback?.[locale];
        while (fallback !== undefined) {
          if (visited.has(fallback)) { fail(errors, `${p}.localeFallback`, 'cyclic locale fallback'); break; }
          visited.add(fallback); fallback = page.localeFallback?.[fallback];
        }
      }
      ids(page.sections, `${p}.sections`); checkImage(page.seo.image, `${p}.seo.image`);
      for (const s of page.sections) {
        const path = `${p}.sections.${s.id}`;
        if ('image' in s) checkImage(s.image, path);
        if ('links' in s) links(s.links, path);
        if (s.type === 'cta') {
          ref(s.productId, productIds, path);
          if (s.variant === 'booking' && (page.kind !== 'product' || s.productId !== page.productId)) fail(errors, path, 'booking CTA must target this product page');
        }
        if (s.type === 'productGrid') { unique(s.productIds, path); s.productIds.forEach(i => ref(i, productIds, path)); }
        if (s.type === 'gallery') s.images.forEach(i => checkImage(i, path));
        if (s.type === 'cardGrid') { ids(s.cards, path); s.cards.forEach(c => { checkImage(c.image, path); ref(c.pageId, pageIds, path); }); }
        if (s.type === 'reviews') { unique(s.reviewIds, path); s.reviewIds.forEach(i => ref(i, reviewIds, path)); }
        if (s.type === 'faq') { unique(s.faqIds, path); s.faqIds.forEach(i => ref(i, faqIds, path)); }
        if (s.type === 'team') { unique(s.teamIds, path); s.teamIds.forEach(i => ref(i, teamIds, path)); }
      }
    }
    for (const review of d.reviews) {
      const host = new URL(review.url).hostname;
      if (host !== 'tripadvisor.com' && !host.endsWith('.tripadvisor.com')) fail(errors, `reviews.${review.id}`, 'review attribution must link to Tripadvisor');
    }
  return errors;
}

/** Pure validation: never merges source defaults into an editor's valid document. */
export function validateCmsDocument(value: unknown): CmsValidationResult {
  const errors: string[] = [];
  try {
    if (!isJson(value)) return { valid: false, errors: ['document: expected safe JSON data'] };
    const encoded = JSON.stringify(value);
    if (encoded.length > CMS_LIMITS.bytes || new TextEncoder().encode(encoded).length > CMS_LIMITS.bytes) return { valid: false, errors: ['document: exceeds byte limit'] };
    documentCheck(value, 'document', errors);
    if (errors.length) return { valid: false, errors };
    const d = value as CmsDocument;
    errors.push(...validateCmsRelationships(d));
    return errors.length ? { valid: false, errors } : { valid: true, errors: [], document: d };
  } catch { return { valid: false, errors: ['document: invalid input'] }; }
}
