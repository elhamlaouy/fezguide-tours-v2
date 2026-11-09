// Phase 1 rebuild — CMS document model: types + validator.
//
// Rebuilt from the Phase 1 spec (PLAN.md section 2). Same document shape and
// the same validation decisions as the previous implementation, written fresh
// from the spec: no field is invented, no editor value is ever defaulted,
// merged or rewritten by validation. Pure check: returns errors, never throws,
// never mutates its input.
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

const PRICE_MIRROR_FIELD = { EUR: 'priceEUR', MAD: 'priceMAD', USD: 'priceUSD' } as const;

/**
 * Trap 1 backstop: a product's canonical price and the practicalInfo mirror in
 * the same currency must agree. A missing mirror is allowed (not every
 * product is priced in every currency); a present mirror that disagrees is an
 * error. Cross-currency conversion is a Phase 6 concern, not checked here.
 * Kept separate from validateCmsDocument so a mid-edit conflict (which the
 * editor resolves explicitly) is never silently normalised or rejected.
 */
export function checkPriceAgreement(document: CmsDocument): string[] {
  const errors: string[] = [];
  for (const product of document.products ?? []) {
    if (!product.price || !product.practicalInfo) continue;
    const field = PRICE_MIRROR_FIELD[product.price.currency];
    const mirror = product.practicalInfo[field];
    if (mirror !== undefined && mirror !== product.price.amount) {
      errors.push(`products.${product.id}.price: disagrees with practicalInfo ${field} (${mirror} instead of ${product.price.amount})`);
    }
  }
  return errors;
}

/** Reject non-JSON objects, dangerous keys and recursion before any field traversal. */
function isPlainJson(value: unknown, seen = new Set<object>(), depth = 0): boolean {
  if (depth > 30) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || seen.has(value)) return false;
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return false;
  if (Reflect.ownKeys(value).some(key => typeof key !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(key))) return false;
  if (Array.isArray(value) && (value.length > CMS_LIMITS.media || Object.keys(value).length !== value.length || Object.keys(value).some(key => !/^(0|[1-9][0-9]*)$/.test(key)))) return false;
  seen.add(value);
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if ((!descriptor.enumerable && !(Array.isArray(value) && key === 'length')) || descriptor.get || descriptor.set || !isPlainJson(descriptor.value, seen, depth + 1)) return false;
  }
  seen.delete(value);
  return true;
}

type FieldCheck = (value: unknown, path: string) => void;
type FieldSpec = Record<string, FieldCheck>;

/** One validation pass. Collects at most CMS_LIMITS.errors diagnostics, each `path: message`. */
class Checker {
  errors: string[] = [];

  fail(path: string, message: string): void {
    if (this.errors.length < CMS_LIMITS.errors) this.errors.push(`${path}: ${message}`);
  }

  text(max: number = CMS_LIMITS.text, pattern?: RegExp): FieldCheck {
    return (v, p) => {
      if (typeof v !== 'string' || v.length > max || (pattern && !pattern.test(v))) this.fail(p, 'invalid or oversized string');
    };
  }

  id: FieldCheck = this.text(80, /^[a-z0-9][a-z0-9-]*$/);

  bool: FieldCheck = (v, p) => {
    if (typeof v !== 'boolean') this.fail(p, 'expected boolean');
  };

  num(min: number, max: number, integer = false): FieldCheck {
    return (v, p) => {
      if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) this.fail(p, 'number out of range');
    };
  }

  oneOf(...values: (string | number)[]): FieldCheck {
    return (v, p) => {
      if (!values.includes(v as string)) this.fail(p, 'unsupported value');
    };
  }

  opt(check: FieldCheck): FieldCheck {
    return (v, p) => {
      if (v !== undefined) check(v, p);
    };
  }

  record(spec: FieldSpec): FieldCheck {
    return (v, p) => {
      if (!v || typeof v !== 'object' || Array.isArray(v)) { this.fail(p, 'expected object'); return; }
      const item = v as Record<string, unknown>;
      for (const key of Object.keys(item)) if (!Object.hasOwn(spec, key)) this.fail(`${p}.${key}`, 'unknown field');
      for (const [key, check] of Object.entries(spec)) check(item[key], `${p}.${key}`);
    };
  }

  array(check: FieldCheck, max: number = CMS_LIMITS.items): FieldCheck {
    return (v, p) => {
      if (!Array.isArray(v) || v.length > max) { this.fail(p, 'expected bounded array'); return; }
      v.forEach((item, i) => check(item, `${p}[${i}]`));
    };
  }

  localized(check: FieldCheck = this.text()): FieldCheck {
    return this.record({ en: check, fr: check, es: check });
  }

  dict(check: FieldCheck, max: number): FieldCheck {
    return (v, p) => {
      if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).length > max) { this.fail(p, 'expected bounded dictionary'); return; }
      for (const [key, child] of Object.entries(v)) {
        if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,159}$/.test(key)) this.fail(p, 'invalid dictionary key');
        check(child, `${p}.${key}`);
      }
    };
  }

  url(image = false): FieldCheck {
    return (v, p) => {
      if (!isSafeCmsUrl(v, image)) this.fail(p, 'unsafe URL');
    };
  }

  date: FieldCheck = (v, p) => {
    if (typeof v !== 'string' || v.length > 50 || !/^(?:\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?|[A-Z][a-z]+ \d{1,2}, \d{4})$/.test(v)) { this.fail(p, 'invalid date'); return; }
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
    const named = /^([A-Z][a-z]+) (\d{1,2}), (\d{4})$/.exec(v);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const year = Number(iso?.[1] ?? named?.[3]);
    const month = iso ? Number(iso[2]) - 1 : months.indexOf(named![1]);
    const day = Number(iso?.[3] ?? named?.[2]);
    // Calendar-only dates must not inherit the editor browser's timezone.
    const parsed = new Date(iso ? v : `${named![3]}-${String(month + 1).padStart(2, '0')}-${named![2].padStart(2, '0')}T00:00:00.000Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month || parsed.getUTCDate() !== day) this.fail(p, 'invalid calendar date');
  };

  // -- shared shapes -------------------------------------------------------
  copy = this.localized();
  title = this.localized(this.text(CMS_LIMITS.title));
  list = this.localized(this.array(this.text()));
  image = this.record({ mediaId: this.id, alt: this.copy, caption: this.opt(this.copy) });

  link: FieldCheck = (v, p) => {
    this.record({ id: this.id, label: this.title, enabled: this.bool, pageId: this.opt(this.id), href: this.opt(this.url()) })(v, p);
    if (v && typeof v === 'object') {
      const l = v as CmsLink;
      if ((l.pageId !== undefined) === (l.href !== undefined)) this.fail(p, 'exactly one link target required');
    }
  };

  stop = this.record({ time: this.opt(this.text(100)), title: this.title, description: this.copy, badge: this.opt(this.title) });
  facts = this.array(this.record({ title: this.title, description: this.copy }));

  block: FieldCheck = (v, p) => {
    const t = (v as CmsRichTextBlock | null)?.type;
    if (t === 'paragraph' || t === 'heading' || t === 'quote') this.record({ type: this.oneOf(t), text: this.copy })(v, p);
    else if (t === 'list') this.record({ type: this.oneOf(t), items: this.list })(v, p);
    else if (t === 'link') this.record({ type: this.oneOf(t), text: this.copy, href: this.url() })(v, p);
    else this.fail(p, 'unsupported rich text block');
  };

  section: FieldCheck = (v, p) => {
    const t = (v as CmsSection | null)?.type;
    const extra: Record<string, FieldSpec> = {
      hero: { variant: this.oneOf('banner', 'split', 'minimal'), image: this.opt(this.image), links: this.array(this.link) },
      richText: { variant: this.oneOf('story', 'panel'), blocks: this.array(this.block) },
      cardGrid: { variant: this.oneOf('overview', 'featured'), cards: this.array(this.record({ id: this.id, title: this.title, description: this.copy, image: this.opt(this.image), pageId: this.opt(this.id), badge: this.opt(this.title) })) },
      productGrid: { variant: this.oneOf('overview', 'featured'), productIds: this.array(this.id) },
      gallery: { variant: this.oneOf('grid', 'carousel', 'story'), images: this.array(this.image) },
      benefits: { variant: this.oneOf('grid', 'strip'), items: this.facts },
      cta: { variant: this.oneOf('split', 'banner', 'booking'), productId: this.opt(this.id), image: this.opt(this.image), links: this.array(this.link) },
      reviews: { variant: this.oneOf('marquee', 'grid'), reviewIds: this.array(this.id) },
      faq: { variant: this.oneOf('accordion', 'list'), faqIds: this.array(this.id) },
      team: { variant: this.oneOf('grid', 'story'), teamIds: this.array(this.id) },
      itinerary: { variant: this.oneOf('timeline', 'list'), stops: this.array(this.stop) },
      inclusions: { variant: this.oneOf('columns', 'list'), included: this.list, excluded: this.list },
      practicalInfo: { variant: this.oneOf('facts', 'panel'), items: this.facts },
      contact: { variant: this.oneOf('banner', 'panel'), links: this.array(this.link) },
    };
    if (!t || !Object.hasOwn(extra, t)) { this.fail(p, 'unsupported section type'); return; }
    this.record({ id: this.id, type: this.oneOf(t), enabled: this.bool, title: this.opt(this.title), eyebrow: this.opt(this.title), description: this.opt(this.copy), ...extra[t] })(v, p);
  };

  siteSettings = this.record({
    siteName: this.text(200),
    phoneNumber: (v, p) => {
      this.text(30, /^\+?[0-9 ()-]{7,30}$/)(v, p);
      if (typeof v === 'string' && !/^[0-9]{7,15}$/.test(v.replace(/[^0-9]/g, ''))) this.fail(p, 'invalid phone digits');
    },
    whatsappNumber: this.text(15, /^[0-9]{7,15}$/),
    email: this.text(254, /^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    address: this.copy, licenseBadge: this.title, heroTagline: this.title, heroTitle: this.title, heroSubtitle: this.copy,
    heroImage: this.opt(this.url(true)), socialInstagram: this.opt(this.url()), socialFacebook: this.opt(this.url()), socialTripadvisor: this.opt(this.url()), googleMaps: this.opt(this.url()),
  });

  pillarFields: FieldSpec = {
    id: this.id, pageId: this.id, title: this.title, subtitle: this.title, shortDescription: this.copy, fullDescription: this.copy, highlights: this.list,
    practicalInfo: this.opt(this.record({ duration: this.opt(this.title), departure: this.opt(this.title), groupSize: this.opt(this.title), priceMAD: this.opt(this.num(0, 1_000_000)), priceEUR: this.opt(this.num(0, 1_000_000)), priceUSD: this.opt(this.num(0, 1_000_000)) })),
    image: this.url(true), imageAlt: this.copy, actionType: this.oneOf('view_more', 'explore', 'book_tour'), kind: this.opt(this.oneOf('article', 'product')), published: this.opt(this.bool),
    galleryImages: this.opt(this.array(this.url(true))), itinerary: this.opt(this.array(this.stop)), included: this.opt(this.list), excluded: this.opt(this.list), whatToBring: this.opt(this.list), meetingPointDetails: this.opt(this.copy),
  };
  pillar = this.record(this.pillarFields);
  customPage = this.record({ id: this.id, slug: this.id, title: this.title, subtitle: this.title, heroImage: this.url(true), content: this.copy, highlights: this.list, showInNav: this.bool, published: this.bool, createdAt: this.date });
  blog = this.record({ id: this.id, slug: this.id, title: this.title, excerpt: this.copy, content: this.copy, coverImage: this.url(true), category: this.title, author: this.text(200), date: this.date, readTime: this.title, published: this.bool });
  team = this.record({ id: this.id, name: this.text(200), role: this.title, bio: this.copy, languages: this.array(this.text(100)), experience: this.title, licenseNumber: this.opt(this.text(100)), avatarUrl: this.url(true) });
  faq = this.record({ id: this.id, category: this.oneOf('tours', 'booking', 'guides', 'transport', 'walking', 'food', 'daytrips', 'general'), question: this.copy, answer: this.copy });

  page = this.record({
    id: this.id, slug: this.id, kind: this.oneOf('editorial', 'product', 'landing'), enabled: this.bool, title: this.title, parentId: this.opt(this.id), productId: this.opt(this.id),
    localeFallback: this.opt(this.record({ en: this.opt(this.oneOf(...CMS_LOCALES)), fr: this.opt(this.oneOf(...CMS_LOCALES)) })),
    seo: this.record({ title: this.title, description: this.copy, canonical: this.opt(this.url()), image: this.opt(this.image), noIndex: this.opt(this.bool) }),
    sections: this.array(this.section, CMS_LIMITS.sections), source: this.opt(this.text(500)),
  });

  product = this.record({
    ...this.pillarFields, kind: this.oneOf('product'), actionType: this.oneOf('book_tour'),
    price: this.opt(this.record({ amount: this.num(0, 1_000_000), currency: this.oneOf('EUR', 'MAD', 'USD'), basis: this.oneOf('person', 'group', 'vehicle') })),
    cancellationPolicy: this.copy, suitableFor: this.list,
  });

  mediaItem = this.record({
    id: this.id, src: this.url(true), alt: this.copy, caption: this.opt(this.copy),
    width: this.opt(this.num(1, 20000, true)), height: this.opt(this.num(1, 20000, true)),
    focalPoint: this.opt(this.record({ x: this.num(0, 1), y: this.num(0, 1) })), source: this.opt(this.text(500)),
  });

  review = this.record({ id: this.id, author: this.text(200), title: this.text(500), quote: this.text(), date: this.date, url: this.url(), source: this.oneOf('tripadvisor'), enabled: this.bool });

  document = this.record({
    schemaVersion: this.oneOf(1), siteSettings: this.siteSettings,
    theme: this.record({
      colors: this.record({ primary: this.text(7, /^#[0-9a-f]{6}$/i), accent: this.text(7, /^#[0-9a-f]{6}$/i), background: this.text(7, /^#[0-9a-f]{6}$/i), text: this.text(7, /^#[0-9a-f]{6}$/i) }),
      font: this.oneOf('system', 'inter', 'noto-sans'), fontScale: this.num(0.8, 1.4), containerWidth: this.num(960, 1600, true),
      spacing: this.oneOf('compact', 'comfortable', 'generous'), radius: this.oneOf('square', 'rounded', 'pill'),
      buttonVariant: this.oneOf('solid', 'outline'), cardVariant: this.oneOf('outlined', 'flat'),
    }),
    navigation: this.array(this.link), footer: this.record({ text: this.copy, links: this.array(this.link) }), uiCopy: this.dict(this.copy, CMS_LIMITS.uiCopy),
    pages: this.array(this.page, CMS_LIMITS.pages),
    products: this.array(this.product, CMS_LIMITS.products),
    editorialEntries: this.array(this.record({ id: this.id, pageId: this.id, source: this.text(500), productId: this.opt(this.id) }), CMS_LIMITS.pages),
    blogPosts: this.array(this.blog), teamMembers: this.array(this.team), faqs: this.array(this.faq),
    media: this.array(this.mediaItem, CMS_LIMITS.media),
    reviews: this.array(this.review),
    legacy: this.record({ tours: this.array(this.pillar, CMS_LIMITS.pages), customPages: this.array(this.customPage), blogPosts: this.array(this.blog), teamMembers: this.array(this.team), faqs: this.array(this.faq), siteSettings: this.siteSettings }),
  });
}


const RESERVED_SLUGS = ['admin', 'api', 'assets', 'media', 'images', 'fonts', 'en', 'fr', 'es'];

/** Cross-document checks: uniqueness, references, classification, cycles. Runs only on shape-valid documents. */
function checkReferences(c: Checker, d: CmsDocument): void {
  const fail = (path: string, message: string) => c.fail(path, message);
  const unique = (values: string[], path: string) => { if (new Set(values).size !== values.length) fail(path, 'duplicate identifier'); };
  const ids = (items: { id: string }[], path: string) => { unique(items.map(i => i.id), path); return new Set(items.map(i => i.id)); };
  if (!d.pages.length) fail('pages', 'at least one page required');
  const pagesById = new Map(d.pages.map(p => [p.id, p]));
  const pageIds = ids(d.pages, 'pages');
  unique(d.pages.map(p => p.slug), 'pages.slug');
  const productIds = ids(d.products, 'products');
  const mediaIds = ids(d.media, 'media');
  const mediaSources = new Set(d.media.map(media => media.src));
  const mediaUrlRef = (src: string | undefined, path: string) => { if (src && !mediaSources.has(src)) fail(path, 'unknown media source'); };
  for (const member of d.teamMembers) mediaUrlRef(member.avatarUrl, `teamMembers.${member.id}.avatarUrl`);
  for (const post of d.blogPosts) mediaUrlRef(post.coverImage, `blogPosts.${post.id}.coverImage`);
  for (const product of d.products) {
    mediaUrlRef(product.image, `products.${product.id}.image`);
    for (const src of product.galleryImages ?? []) mediaUrlRef(src, `products.${product.id}.galleryImages`);
  }
  for (const media of d.media) if ((media.width === undefined) !== (media.height === undefined)) fail(`media.${media.id}`, 'width and height must be provided together');
  const reviewIds = ids(d.reviews, 'reviews');
  const faqIds = ids(d.faqs, 'faqs');
  const teamIds = ids(d.teamMembers, 'teamMembers');
  ids(d.blogPosts, 'blogPosts'); ids(d.editorialEntries, 'editorialEntries');
  ids(d.legacy.tours, 'legacy.tours'); ids(d.legacy.customPages, 'legacy.customPages'); ids(d.legacy.blogPosts, 'legacy.blogPosts'); ids(d.legacy.faqs, 'legacy.faqs'); ids(d.legacy.teamMembers, 'legacy.teamMembers');
  const ref = (id: string | undefined, set: Set<string>, path: string) => { if (id !== undefined && !set.has(id)) fail(path, 'missing reference'); };
  const checkImage = (img: CmsImage | undefined, path: string) => ref(img?.mediaId, mediaIds, path);
  const links = (items: CmsLink[], path: string) => { ids(items, path); items.forEach(l => ref(l.pageId, pageIds, path)); };
  links(d.navigation, 'navigation'); links(d.footer.links, 'footer.links');
  for (const entry of d.editorialEntries) {
    ref(entry.pageId, pageIds, `editorialEntries.${entry.id}.pageId`); ref(entry.productId, productIds, `editorialEntries.${entry.id}.productId`);
    if (d.pages.find(p => p.id === entry.pageId)?.kind !== 'editorial') fail(entry.id, 'editorial entry must reference editorial page');
  }
  // SectionPillar.pageId is the category; the detail route uses its product id.
  for (const product of d.products) {
    const path = `products.${product.id}`;
    ref(product.pageId, pageIds, `${path}.pageId`);
    const detail = pagesById.get(product.id);
    if (detail?.kind !== 'product' || detail.productId !== product.id) fail(path, 'product requires its matching product detail page');
    if (detail?.parentId !== product.pageId) fail(`${path}.pageId`, 'product category must match detail page parent');
  }
  for (const tour of d.legacy.tours) {
    const path = `legacy.tours.${tour.id}`;
    ref(tour.pageId, pageIds, `${path}.pageId`);
    const bookable = tour.actionType === 'book_tour';
    if ((tour.kind === 'article' && bookable) || (tour.kind === 'product' && !bookable)) fail(path, 'kind and booking action must agree');
    const detail = pagesById.get(tour.id);
    if (detail?.kind !== (bookable ? 'product' : 'editorial')) fail(path, 'legacy classification must match detail page');
    if (detail?.parentId !== tour.pageId) fail(`${path}.pageId`, 'legacy category must match detail page parent');
    if (bookable ? !productIds.has(tour.id) : productIds.has(tour.id)) fail(path, 'legacy classification must match product collection');
  }
  for (const page of d.pages) {
    const p = `pages.${page.id}`;
    if (RESERVED_SLUGS.includes(page.slug)) fail(p, 'reserved slug');
    if (page.seo.canonical?.startsWith('/')) {
      const preferred = page.seo.canonical.slice(1);
      if ((page.id === 'home' ? preferred !== '' : !/^[a-z0-9][a-z0-9-]{0,79}$/.test(preferred)) || RESERVED_SLUGS.includes(preferred)) fail(`${p}.seo.canonical`, 'invalid canonical route');
      if (d.pages.some(other => other.id !== page.id && (other.slug === preferred || other.id === preferred || other.seo.canonical === page.seo.canonical))) fail(`${p}.seo.canonical`, 'canonical route already used');
    }
    ref(page.parentId, pageIds, `${p}.parentId`); ref(page.productId, productIds, `${p}.productId`);
    const ancestors = new Set([page.id]);
    let parentId = page.parentId;
    while (parentId !== undefined) {
      if (ancestors.has(parentId)) { fail(p, 'cyclic page parents'); break; }
      ancestors.add(parentId); parentId = pagesById.get(parentId)?.parentId;
    }
    if (page.kind === 'product' && !page.productId) fail(p, 'product page requires productId');
    if (page.kind === 'product' && page.productId !== page.id) fail(`${p}.productId`, 'product detail page must target its matching product');
    if (page.kind !== 'product' && page.productId) fail(p, 'non-product page cannot be bookable');
    for (const locale of CMS_LOCALES) {
      const visited = new Set<Language>([locale]);
      let fallback = page.localeFallback?.[locale];
      while (fallback !== undefined) {
        if (visited.has(fallback)) { fail(`${p}.localeFallback`, 'cyclic locale fallback'); break; }
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
        if (s.variant === 'booking' && (page.kind !== 'product' || s.productId !== page.productId)) fail(path, 'booking CTA must target this product page');
      }
      if (s.type === 'productGrid') { unique(s.productIds, path); s.productIds.forEach(i => ref(i, productIds, path)); }
      if (s.type === 'gallery') s.images.forEach(i => checkImage(i, path));
      if (s.type === 'cardGrid') { ids(s.cards, path); s.cards.forEach(card => { checkImage(card.image, path); ref(card.pageId, pageIds, path); }); }
      if (s.type === 'reviews') { unique(s.reviewIds, path); s.reviewIds.forEach(i => ref(i, reviewIds, path)); }
      if (s.type === 'faq') { unique(s.faqIds, path); s.faqIds.forEach(i => ref(i, faqIds, path)); }
      if (s.type === 'team') { unique(s.teamIds, path); s.teamIds.forEach(i => ref(i, teamIds, path)); }
    }
  }
  for (const review of d.reviews) {
    const host = new URL(review.url).hostname;
    if (host !== 'tripadvisor.com' && !host.endsWith('.tripadvisor.com')) fail(`reviews.${review.id}`, 'review attribution must link to Tripadvisor');
  }
}

/** Pure validation: never merges source defaults into an editor's valid document. */
export function validateCmsDocument(value: unknown): CmsValidationResult {
  const c = new Checker();
  try {
    if (!isPlainJson(value)) return { valid: false, errors: ['document: expected safe JSON data'] };
    const encoded = JSON.stringify(value);
    if (encoded.length > CMS_LIMITS.bytes || new TextEncoder().encode(encoded).length > CMS_LIMITS.bytes) return { valid: false, errors: ['document: exceeds byte limit'] };
    c.document(value, 'document');
    if (c.errors.length) return { valid: false, errors: c.errors };
    const d = value as CmsDocument;
    checkReferences(c, d);
    return c.errors.length ? { valid: false, errors: c.errors } : { valid: true, errors: [], document: d };
  } catch { return { valid: false, errors: ['document: invalid input'] }; }
}
