import { CMS_LIMITS, validateCmsDocument, type CmsDocument, type CmsSection } from './schema';
import { syncEntityEdits } from './entity-projection';

// Explicit data-only field metadata: no HTML/CSS execution and no schema inference from a populated seed.
export interface EditorField {
  type: 'text' | 'number' | 'boolean' | 'enum' | 'object' | 'array' | 'localized' | 'localizedList' | 'reference' | 'mediaUrl';
  fields?: Record<string, EditorField>; item?: EditorField; options?: readonly string[];
  collection?: 'pages' | 'products' | 'media' | 'reviews' | 'faqs' | 'teamMembers';
  optional?: boolean; readonly?: boolean; min?: number; max?: number; step?: number;
}
const text: EditorField = { type: 'text' };
const copy: EditorField = { type: 'localized' };
const list: EditorField = { type: 'localizedList' };
const bool: EditorField = { type: 'boolean' };
const fixed: EditorField = { ...text, readonly: true };
const optional = (field: EditorField): EditorField => ({ ...field, optional: true });
const enumeration = (...options: string[]): EditorField => ({ type: 'enum', options });
const object = (fields: Record<string, EditorField>): EditorField => ({ type: 'object', fields });
const array = (item: EditorField): EditorField => ({ type: 'array', item });
const reference = (collection: EditorField['collection']): EditorField => ({ type: 'reference', collection });
const number = (min: number, max: number, step = 1): EditorField => ({ type: 'number', min, max, step });
const mediaUrl: EditorField = { type: 'mediaUrl' };
const image = object({ mediaId: reference('media'), alt: copy, caption: optional(copy) });
const link = object({ id: fixed, label: copy, enabled: bool, pageId: optional(reference('pages')), href: optional(text) });
const stop = object({ time: optional(text), title: copy, description: copy, badge: optional(copy) });
const facts = array(object({ title: copy, description: copy }));
const card = object({ id: fixed, title: copy, description: copy, image: optional(image), pageId: optional(reference('pages')), badge: optional(copy) });
const common = { id: fixed, enabled: bool, title: optional(copy), eyebrow: optional(copy), description: optional(copy) };
export const SECTION_VARIANTS: Record<CmsSection['type'], readonly string[]> = {
  hero: ['banner', 'split', 'minimal'], richText: ['story', 'panel'], cardGrid: ['overview', 'featured'], productGrid: ['overview', 'featured'], gallery: ['grid', 'carousel', 'story'], benefits: ['grid', 'strip'], cta: ['split', 'banner', 'booking'], reviews: ['marquee', 'grid'], faq: ['accordion', 'list'], team: ['grid', 'story'], itinerary: ['timeline', 'list'], inclusions: ['columns', 'list'], practicalInfo: ['facts', 'panel'], contact: ['banner', 'panel'],
};
const sectionExtras: Record<CmsSection['type'], Record<string, EditorField>> = {
  hero: { image: optional(image), links: array(link) }, richText: { blocks: array(object({ type: enumeration('paragraph', 'heading', 'quote', 'list', 'link'), text: copy })) },
  cardGrid: { cards: array(card) }, productGrid: { productIds: array(reference('products')) }, gallery: { images: array(image) }, benefits: { items: facts },
  cta: { productId: optional(reference('products')), image: optional(image), links: array(link) }, reviews: { reviewIds: array(reference('reviews')) },
  faq: { faqIds: array(reference('faqs')) }, team: { teamIds: array(reference('teamMembers')) }, itinerary: { stops: array(stop) },
  inclusions: { included: list, excluded: list }, practicalInfo: { items: facts }, contact: { links: array(link) },
};
export const PAGE_FIELDS = object({ id: fixed, slug: text, kind: enumeration('editorial', 'product', 'landing'), enabled: bool, title: copy,
  parentId: optional(reference('pages')), productId: optional(reference('products')), localeFallback: optional(object({ en: optional(enumeration('en', 'fr', 'es')), fr: optional(enumeration('en', 'fr', 'es')) })),
  seo: object({ title: copy, description: copy, canonical: optional(text), image: optional(image), noIndex: optional(bool) }), source: optional(text),
});
export function sectionFields(type: CmsSection['type']): EditorField {
  return object({ ...common, type: fixed, variant: enumeration(...SECTION_VARIANTS[type]), ...sectionExtras[type] });
}
export function blockFields(type: string): EditorField {
  return object({ type: enumeration('paragraph', 'heading', 'quote', 'list', 'link'), ...(type === 'list' ? { items: list } : { text: copy }), ...(type === 'link' ? { href: text } : {}) });
}
const pillar = { id: fixed, pageId: reference('pages'), title: copy, subtitle: copy, shortDescription: copy, fullDescription: copy, highlights: list,
  practicalInfo: optional(object({ duration: optional(copy), departure: optional(copy), groupSize: optional(copy), priceMAD: optional(number(0, 1000000)), priceEUR: optional(number(0, 1000000)), priceUSD: optional(number(0, 1000000)) })),
  image: mediaUrl, imageAlt: copy, actionType: fixed, kind: fixed, published: optional(bool), galleryImages: optional(array(mediaUrl)), itinerary: optional(array(stop)), included: optional(list), excluded: optional(list), whatToBring: optional(list), meetingPointDetails: optional(copy),
};
const settings = object({ siteName: text, phoneNumber: text, whatsappNumber: text, email: text, address: copy, licenseBadge: copy, heroTagline: copy, heroTitle: copy, heroSubtitle: copy, heroImage: optional(mediaUrl), socialInstagram: optional(text), socialFacebook: optional(text), socialTripadvisor: optional(text), googleMaps: optional(text) });
export const GLOBAL_FIELDS: Record<string, EditorField> = {
  siteSettings: settings,
  theme: object({ colors: object({ primary: text, accent: text, background: text, text }), font: enumeration('system', 'inter', 'noto-sans'), fontScale: number(.8, 1.4, .05), containerWidth: number(960, 1600), spacing: enumeration('compact', 'comfortable', 'generous'), radius: enumeration('square', 'rounded', 'pill'), buttonVariant: enumeration('solid', 'outline'), cardVariant: enumeration('outlined', 'flat') }),
  navigation: array(link), footer: object({ text: copy, links: array(link) }),
  products: array(object({ ...pillar, price: optional(object({ amount: number(0, 1000000, .01), currency: enumeration('EUR', 'MAD', 'USD'), basis: enumeration('person', 'group', 'vehicle') })), cancellationPolicy: copy, suitableFor: list })),
  editorialEntries: array(object({ id: fixed, pageId: reference('pages'), source: text, productId: optional(reference('products')) })),
  blogPosts: array(object({ id: fixed, slug: text, title: copy, excerpt: copy, content: copy, coverImage: mediaUrl, category: copy, author: text, date: text, readTime: copy, published: bool })),
  teamMembers: array(object({ id: fixed, name: text, role: copy, bio: copy, languages: array(text), experience: copy, licenseNumber: optional(text), avatarUrl: mediaUrl })),
  faqs: array(object({ id: fixed, category: enumeration('tours', 'booking', 'guides', 'transport', 'walking', 'food', 'daytrips', 'general'), question: copy, answer: copy })),
  media: array(object({ id: fixed, src: mediaUrl, alt: copy, caption: optional(copy), width: optional(number(1, 20000)), height: optional(number(1, 20000)), focalPoint: optional(object({ x: number(0, 1, .01), y: number(0, 1, .01) })), source: optional(text) })),
  reviews: array(object({ id: fixed, author: fixed, title: fixed, quote: fixed, date: fixed, url: fixed, source: fixed, enabled: bool })),
};
export function editorDefault(field: EditorField, document: CmsDocument): unknown {
  if (field.type === 'localized') return { en: '', fr: '', es: '' };
  if (field.type === 'localizedList') return { en: [], fr: [], es: [] };
  if (field.type === 'object') return Object.fromEntries(Object.entries(field.fields ?? {}).filter(([, spec]) => !spec.optional).map(([key, spec]) => [key, editorDefault(spec, document)]));
  if (field.type === 'array') return [];
  if (field.type === 'boolean') return true;
  if (field.type === 'number') return field.min ?? 0;
  if (field.type === 'enum') return field.options?.[0] ?? '';
  if (field.type === 'reference') return field.collection ? document[field.collection][0]?.id ?? '' : '';
  if (field.type === 'mediaUrl') return document.media[0]?.src ?? '/images/hero_fez_medina_1790709688133.jpg';
  return '';
}
export function nextEditorId(items: unknown[], stem = 'item'): string {
  const used = new Set(items.map(item => (item as { id?: string })?.id));
  let id = stem; let i = 2;
  while (used.has(id)) id = `${stem}-${i++}`;
  return id;
}
export function setEditorPath(value: unknown, path: string[], next: unknown): unknown {
  if (!path.length) return next;
  const [key, ...rest] = path;
  if (Array.isArray(value)) {
    const index = /^\d+$/.test(key) ? Number(key) : value.findIndex(item => item?.id === key);
    return value.map((item, i) => i === index ? setEditorPath(item, rest, next) : item);
  }
  const record = (value ?? {}) as Record<string, unknown>;
  const result = { ...record, [key]: setEditorPath(record[key], rest, next) };
  if (!rest.length && next === undefined) delete result[key];
  // StructuredFields emits whole entity rows/collections; compare their fields,
  // not the UI path. Nested section edits remain independent authoring.
  if (record.schemaVersion === 1 && ['products', 'blogPosts', 'teamMembers', 'media', 'siteSettings'].includes(key)) {
    // Let validation reject broken references on removal; never silently recreate a removed library row.
    if (key === 'media' && (value as CmsDocument).media.some(media => !(result as unknown as CmsDocument).media.some(item => item.id === media.id))) return result;
    return syncEntityEdits(value as CmsDocument, result as unknown as CmsDocument);
  }
  return result;
}
export function parseEditorImport(raw: string, current: CmsDocument): CmsDocument {
  if (new TextEncoder().encode(raw).length > CMS_LIMITS.bytes) throw new Error('document: exceeds byte limit');
  const result = validateCmsDocument(JSON.parse(raw));
  if (!result.valid) throw new Error(result.errors.join('\n'));
  if (current.pages.some(page => page.id === 'home') && !result.document.pages.some(page => page.id === 'home')) throw new Error('pages.home: home cannot be removed');
  // Imports cannot manufacture or rewrite attributed review records. Visibility/order may change.
  const records = new Map(current.reviews.map(({ enabled: _enabled, ...review }) => [review.id, JSON.stringify(review)]));
  if (result.document.reviews.some(({ enabled: _enabled, ...review }) => records.get(review.id) !== JSON.stringify(review))) throw new Error('reviews: attribution records are read-only');
  return result.document;
}

/** Preserve the graph: referenced entities are retained; removable page links are cleaned explicitly. */
export function removeEditorPage(document: CmsDocument, id: string): CmsDocument {
  if (id === 'home') throw new Error('pages.home: home cannot be removed');
  const referenced = document.products.some(p => p.id === id || p.pageId === id) || document.pages.some(p => p.parentId === id) || document.legacy.tours.some(t => t.id === id || t.pageId === id) || document.editorialEntries.some(e => e.pageId === id) || document.blogPosts.some(post => post.id === id || post.slug === id) || document.legacy.customPages.some(page => page.id === id || page.slug === id);
  if (referenced) return { ...document, pages: document.pages.map(p => p.id === id ? { ...p, enabled: false } : p) };
  const cleanLinks = <T extends { pageId?: string }>(items: T[]) => items.filter(item => item.pageId !== id);
  return { ...document, pages: document.pages.filter(p => p.id !== id).map(p => ({ ...p, sections: p.sections.map(s => {
    if ('links' in s) return { ...s, links: cleanLinks(s.links) };
    if (s.type === 'cardGrid') return { ...s, cards: s.cards.map(c => { if (c.pageId !== id) return c; const { pageId: _pageId, ...card } = c; return card; }) };
    return s;
  }) })), navigation: cleanLinks(document.navigation), footer: { ...document.footer, links: cleanLinks(document.footer.links) } };
}
