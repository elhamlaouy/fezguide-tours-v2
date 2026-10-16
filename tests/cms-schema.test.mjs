import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'tsx/esm/api';
register();
const { validateCmsDocument, CMS_LIMITS } = await import('../src/cms/schema.ts');
const { DEFAULT_SITE_SETTINGS } = await import('../src/data/translations.ts');
export const text = (en = '') => ({ en, fr: en, es: en });
export const fixture = () => ({
  schemaVersion: 1,
  siteSettings: structuredClone(DEFAULT_SITE_SETTINGS),
  theme: { colors: { primary: '#005F5A', accent: '#C84B31', background: '#FAF8F5', text: '#1C2524' }, font: 'system', fontScale: 1, containerWidth: 1280, spacing: 'comfortable', radius: 'rounded', buttonVariant: 'solid', cardVariant: 'outlined' },
  navigation: [{ id: 'nav-home', label: text('Home'), pageId: 'home', enabled: true }],
  footer: { text: text('Footer'), links: [] }, uiCopy: {},
  pages: [{ id: 'home', slug: 'home', kind: 'landing', enabled: true, title: text('Home'), seo: { title: text('Home'), description: text('Home description') }, sections: [{ id: 'intro', type: 'richText', enabled: true, variant: 'story', blocks: [{ type: 'paragraph', text: text('Hello') }] }] }],
  products: [], editorialEntries: [], blogPosts: [], teamMembers: [], faqs: [], media: [], reviews: [],
  legacy: { tours: [], customPages: [], blogPosts: [], teamMembers: [], faqs: [], siteSettings: structuredClone(DEFAULT_SITE_SETTINGS) },
});
test('validates a complete versioned document without changing its ordered content', () => {
  const input = fixture();
  const before = structuredClone(input);
  const result = validateCmsDocument(input);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.deepEqual(result.document, before);
  assert.deepEqual(input, before);
  assert.ok(CMS_LIMITS.sections > 0);
});

const relationshipFixture = () => {
  const input = fixture();
  input.media.push({ id: 'tour-photo', src: '/images/tour.jpg', alt: text('Tour') });
  const pillar = id => ({ id, pageId: 'home', title: text(id), subtitle: text('Subtitle'), shortDescription: text('Description'), fullDescription: text('Story'), highlights: { en: [], fr: [], es: [] }, image: '/images/tour.jpg', imageAlt: text('Tour') });
  for (const id of ['tour-one', 'tour-two']) {
    const product = { ...pillar(id), kind: 'product', actionType: 'book_tour', cancellationPolicy: text('Flexible'), suitableFor: { en: [], fr: [], es: [] } };
    input.products.push(product);
    input.pages.push({ ...structuredClone(input.pages[0]), id, slug: id, kind: 'product', parentId: 'home', productId: id });
    input.legacy.tours.push({ ...pillar(id), kind: 'product', actionType: 'book_tour' });
  }
  input.pages.push({ ...structuredClone(input.pages[0]), id: 'guide', slug: 'guide', kind: 'editorial', parentId: 'home' });
  input.legacy.tours.push({ ...pillar('guide'), kind: 'article', actionType: 'explore' });
  input.editorialEntries.push({ id: 'guide-entry', pageId: 'guide', source: 'edited-guide', productId: 'tour-one' });
  return input;
};

test('accepts a coherent editable product/editorial relationship graph', () => {
  const input = relationshipFixture();
  const result = validateCmsDocument(input);
  assert.equal(result.valid, true, result.errors.join('\n'));
});

for (const [name, edit] of Object.entries({
  'borrowed productId': d => { d.pages.find(p => p.id === 'tour-one').productId = 'tour-two'; },
  'swapped productIds': d => { d.pages.find(p => p.id === 'tour-one').productId = 'tour-two'; d.pages.find(p => p.id === 'tour-two').productId = 'tour-one'; },
  'orphaned product': d => { d.pages.find(p => p.id === 'tour-one').kind = 'landing'; delete d.pages.find(p => p.id === 'tour-one').productId; },
  'product category drift': d => { d.products[0].pageId = 'guide'; },
})) test(`rejects inconsistent product-page relationship: ${name}`, () => {
  const input = relationshipFixture(); edit(input);
  const result = validateCmsDocument(input);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => /products\.tour-one|pages\.tour-one/.test(e)), result.errors.join('\n'));
});

for (const [name, edit] of Object.entries({
  'article booking action': d => { d.legacy.tours.find(t => t.id === 'guide').actionType = 'book_tour'; },
  'product explore action': d => { d.legacy.tours[0].actionType = 'explore'; },
  'editorial product classification': d => { d.legacy.tours.find(t => t.id === 'guide').kind = 'product'; },
  'product card reclassified as article': d => { d.legacy.tours[0].kind = 'article'; d.legacy.tours[0].actionType = 'explore'; },
  'category drift': d => { d.legacy.tours[0].pageId = 'guide'; },
  'missing editorial detail': d => { d.pages = d.pages.filter(p => p.id !== 'guide'); d.editorialEntries = []; },
  'missing product record/detail': d => { d.products.shift(); d.pages = d.pages.filter(p => p.id !== 'tour-one'); delete d.editorialEntries[0].productId; },
})) test(`rejects inconsistent legacy classification: ${name}`, () => {
  const input = relationshipFixture(); edit(input);
  const result = validateCmsDocument(input);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => /legacy\.tours\./.test(e)), result.errors.join('\n'));
});

test('permits coherent category moves, independent copy edits and changed editorial cross-links', () => {
  const input = relationshipFixture();
  input.products[0].pageId = 'guide';
  input.pages.find(p => p.id === 'tour-one').parentId = 'guide';
  input.legacy.tours[0].pageId = 'guide';
  input.products[0].title.en = 'New tour name';
  input.legacy.tours[0].shortDescription.fr = 'A separately edited card';
  input.editorialEntries[0].productId = 'tour-two';
  input.siteSettings.email = 'owner@example.com';
  const before = structuredClone(input);
  const result = validateCmsDocument(input);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.deepEqual(input, before);
});

test('legacy classification may be inferred from actionType when kind is omitted', () => {
  const input = relationshipFixture();
  for (const tour of input.legacy.tours) delete tour.kind;
  const result = validateCmsDocument(input);
  assert.equal(result.valid, true, result.errors.join('\n'));
});

test('permits a coherent editorial-to-product reclassification without source-specific locks', () => {
  const input = relationshipFixture();
  const guide = input.pages.find(p => p.id === 'guide');
  guide.kind = 'product'; guide.productId = 'guide'; guide.slug = 'new-private-tour';
  const card = input.legacy.tours.find(t => t.id === 'guide');
  card.kind = 'product'; card.actionType = 'book_tour';
  input.products.push({ ...structuredClone(input.products[0]), id: 'guide', pageId: 'home' });
  input.editorialEntries = [];
  const result = validateCmsDocument(input);
  assert.equal(result.valid, true, result.errors.join('\n'));
});

test('accepts newly authored products without requiring legacy duplicates', () => {
  const input = relationshipFixture();
  input.legacy.tours = input.legacy.tours.filter(t => t.id !== 'tour-two');
  input.pages.find(p => p.id === 'tour-two').slug = 'a-new-editable-tour-slug';
  const result = validateCmsDocument(input);
  assert.equal(result.valid, true, result.errors.join('\n'));
});

const invalidEdits = {
  'unsupported schema': d => { d.schemaVersion = 2; },
  'missing pages': d => { delete d.pages; },
  'booking data': d => { d.legacy.bookings = [{ email: 'private@example.com' }]; },
  'HTML field': d => { d.pages[0].sections[0].html = '<script>bad()</script>'; },
  'CSS injection': d => { d.theme.colors.primary = 'red; background:url(https://example.com)'; },
  'unapproved variant': d => { d.pages[0].sections[0].variant = 'arbitrary'; },
  'unknown section': d => { d.pages[0].sections[0].type = 'script'; },
  'bad ID': d => { d.pages[0].id = '../../escape'; },
  'bad slug': d => { d.pages[0].slug = '/home'; },
  'unknown locale': d => { d.pages[0].title.de = 'Hallo'; },
  'missing locale': d => { delete d.pages[0].title.fr; },
  'wrong locale value': d => { d.pages[0].title.en = 12; },
  'non-boolean visibility': d => { d.pages[0].enabled = 'true'; },
  'too much text': d => { d.pages[0].sections[0].blocks[0].text.en = 'a'.repeat(CMS_LIMITS.text + 1); },
  'too many sections': d => { d.pages[0].sections = Array.from({ length: CMS_LIMITS.sections + 1 }, (_, i) => ({ ...d.pages[0].sections[0], id: `section-${i}` })); },
  'duplicate page': d => { d.pages.push(structuredClone(d.pages[0])); },
  'duplicate slug': d => { d.pages.push({ ...structuredClone(d.pages[0]), id: 'other' }); },
  'duplicate section': d => { d.pages[0].sections.push(structuredClone(d.pages[0].sections[0])); },
  'unknown page link': d => { d.navigation[0].pageId = 'missing'; },
  'two link targets': d => { d.navigation[0].href = 'https://example.com'; },
  'no link target': d => { delete d.navigation[0].pageId; },
  'javascript link': d => { delete d.navigation[0].pageId; d.navigation[0].href = 'javascript:alert(1)'; },
  'protocol relative link': d => { delete d.navigation[0].pageId; d.navigation[0].href = '//evil.example'; },
  'credential URL': d => { d.siteSettings.googleMaps = 'https://user:password@example.com'; },
  'invalid email': d => { d.siteSettings.email = 'not-an-email'; },
  'invalid phone': d => { d.siteSettings.phoneNumber = '<script>'; },
  'invalid whatsapp': d => { d.siteSettings.whatsappNumber = 'abcdef'; },
  'unknown product reference': d => { d.pages[0].sections.push({ id: 'grid', type: 'productGrid', enabled: true, variant: 'overview', productIds: ['missing'] }); },
  'unknown media reference': d => { d.pages[0].seo.image = { mediaId: 'missing', alt: text('Alt') }; },
  'legacy unsafe image': d => { d.legacy.siteSettings.heroImage = 'data:image/svg+xml,<svg onload=alert(1)>'; },
  'editorial booking CTA': d => { d.pages[0].kind = 'editorial'; d.pages[0].sections.push({ id: 'book', type: 'cta', variant: 'booking', enabled: true, links: [] }); },
};
for (const [name, edit] of Object.entries(invalidEdits)) test(`rejects ${name}`, () => {
  const input = fixture(); edit(input);
  const result = validateCmsDocument(input);
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
  assert.equal('document' in result, false);
});
for (const value of [null, [], false, 1, 'json']) test(`rejects non-document ${JSON.stringify(value)}`, () => assert.equal(validateCmsDocument(value).valid, false));
test('rejects cyclic input without throwing', () => {
  const input = fixture(); input.legacy = input;
  assert.equal(validateCmsDocument(input).valid, false);
});
test('rejects prototype-pollution keys without throwing', () => {
  const input = fixture(); input.uiCopy = JSON.parse('{"__proto__":{"en":"a","fr":"a","es":"a"}}');
  assert.equal(validateCmsDocument(input).valid, false);
});
test('accepts safe internal/contact links and permits deliberate translation fallback', () => {
  const input = fixture();
  input.pages[0].localeFallback = { fr: 'en' };
  input.navigation = ['/?page=home', '#contact', 'https://example.com', 'mailto:hello@example.com', 'tel:+212719603009'].map((href, i) => ({ id: `link-${i}`, href, enabled: true, label: text('Link') }));
  assert.equal(validateCmsDocument(input).valid, true);
});

const sections = [
  { type: 'hero', variant: 'split', links: [] },
  { type: 'richText', variant: 'panel', blocks: [{ type: 'heading', text: text('Heading') }, { type: 'list', items: { en: ['a'], fr: ['a'], es: ['a'] } }, { type: 'link', text: text('Read'), href: '/?page=home' }, { type: 'quote', text: text('Quote') }] },
  { type: 'cardGrid', variant: 'overview', cards: [{ id: 'card', title: text('Card'), description: text('Description'), pageId: 'home' }] },
  { type: 'productGrid', variant: 'featured', productIds: [] },
  { type: 'gallery', variant: 'carousel', images: [{ mediaId: 'photo', alt: text('Image') }] },
  { type: 'benefits', variant: 'strip', items: [{ title: text('Benefit'), description: text('Description') }] },
  { type: 'cta', variant: 'banner', links: [{ id: 'cta-link', pageId: 'home', label: text('Read'), enabled: true }] },
  { type: 'reviews', variant: 'grid', reviewIds: [] },
  { type: 'faq', variant: 'accordion', faqIds: [] },
  { type: 'team', variant: 'story', teamIds: [] },
  { type: 'itinerary', variant: 'timeline', stops: [{ title: text('Stop'), description: text('Description'), badge: text('Free') }] },
  { type: 'inclusions', variant: 'columns', included: { en: [], fr: [], es: [] }, excluded: { en: [], fr: [], es: [] } },
  { type: 'practicalInfo', variant: 'facts', items: [{ title: text('Duration'), description: text('3 hours') }] },
  { type: 'contact', variant: 'panel', links: [{ id: 'contact', href: 'https://wa.me/212719603009', label: text('Contact'), enabled: true }] },
];
for (const section of sections) test(`validates ${section.type} section with only its supported fields`, () => {
  const input = fixture();
  input.media = [{ id: 'photo', src: '/images/photo.webp', alt: text('Photo'), width: 800, height: 600, focalPoint: { x: 0.5, y: 0.5 } }];
  input.pages[0].sections = [{ id: 'section', enabled: true, ...section }];
  const result = validateCmsDocument(input);
  assert.equal(result.valid, true, result.errors.join('\n'));
  input.pages[0].sections[0].script = 'alert(1)';
  assert.equal(validateCmsDocument(input).valid, false);
});
test('accepts URL-encoded spaces in legitimate WhatsApp message queries', () => {
  const input = fixture();
  input.navigation = [{ id: 'contact', enabled: true, label: text('Contact'), href: 'https://wa.me/212719603009?text=Hello%20Fez' }];
  assert.equal(validateCmsDocument(input).valid, true);
});
const semanticEdits = {
  'digits-free phone': d => { d.siteSettings.phoneNumber = '         '; },
  'sparse JSON array': d => { d.navigation = Array(1); },
  'empty site pages': d => { d.pages = []; d.navigation = []; },
  'cyclic parents': d => { d.pages[0].parentId = 'other'; d.pages.push({ ...structuredClone(d.pages[0]), id: 'other', slug: 'other', parentId: 'home' }); },
  'one-dimensional media': d => { d.media = [{ id: 'image', src: '/images/test.jpg', alt: text('Alt'), width: 100 }]; },
  'unreal review date': d => { d.reviews = [{ id: 'review', author: 'Real author', title: 'Title', quote: 'Quote', date: '2026-99-99', url: 'https://www.tripadvisor.com/ShowUserReviews-review', source: 'tripadvisor', enabled: true }]; },
};
for (const [name, edit] of Object.entries(semanticEdits)) test(`rejects ${name}`, () => {
  const input = fixture(); edit(input);
  assert.equal(validateCmsDocument(input).valid, false);
});
test('rejects accessors without invoking them', () => {
  const input = fixture(); let called = false;
  Object.defineProperty(input, 'secret', { enumerable: true, get() { called = true; return 'secret'; } });
  assert.equal(validateCmsDocument(input).valid, false);
  assert.equal(called, false);
});
test('enforces UTF-8 document byte limit rather than JavaScript character count', () => {
  const input = fixture();
  input.uiCopy = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`copy-${i}`, text('ن'.repeat(10_000))]));
  assert.equal(validateCmsDocument(input).valid, false);
});
test('rejects cyclic locale fallback declarations', () => {
  const input = fixture(); input.pages[0].localeFallback = { es: 'en', en: 'es' };
  assert.equal(validateCmsDocument(input).valid, false);
});
test('rejects accidental non-bookable product records', async () => {
  const { createCmsSeed } = await import('../src/cms/seed.ts');
  const input = createCmsSeed(); input.products[0].actionType = 'view_more';
  assert.equal(validateCmsDocument(input).valid, false);
});
test('does not allow properties that would disappears during JSON serialization', () => {
  const input = fixture(); Object.defineProperty(input.pages[0], 'privateNote', { value: 'hidden', enumerable: false });
  assert.equal(validateCmsDocument(input).valid, false);
});
for (const href of ['https://example.com/%2e%2e/admin', '/%252e%252e/secret', 'https://example.com/%0aheader', '/\\\\evil.example', '/%2f%2fevil.example', 'data:text/html,test', 'https://example.com/image.svg']) test(`rejects unsafe encoded/image URL ${href}`, () => {
  const input = fixture(); input.media = [{ id: 'image', src: href, alt: text('Image') }];
  assert.equal(validateCmsDocument(input).valid, false);
});
for (const [type, field] of [['reviews', 'reviewIds'], ['faq', 'faqIds'], ['team', 'teamIds']]) test(`rejects dangling ${type} reference`, () => {
  const input = fixture();
  input.pages[0].sections.push({ id: 'reference', type, variant: type === 'faq' ? 'accordion' : 'grid', enabled: true, [field]: ['missing'] });
  assert.equal(validateCmsDocument(input).valid, false);
});
test('caps diagnostic counts and supplies useful field paths', () => {
  const input = fixture(); input.uiCopy = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`bad-${i}`, { en: 7, fr: 8, es: 9 }]));
  const result = validateCmsDocument(input);
  assert.equal(result.valid, false); assert.equal(result.errors.length, CMS_LIMITS.errors);
  assert.match(result.errors[0], /document\.uiCopy\.bad-0\.en:/);
});
