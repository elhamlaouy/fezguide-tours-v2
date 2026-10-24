import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { register } from 'tsx/esm/api';
register();
const schema = await import('../src/cms/schema.ts');
const { createCmsSeed } = await import('../src/cms/seed.ts');

// Lazy import keeps the first RED an assertion on the missing API, not a loader error.
test('staged parts reuse field admission and reconstruct every seed field exactly', async () => {
  assert.equal(typeof schema.validateCmsPart, 'function');
  const { splitCmsDocument, assembleCmsDocument, referenceSummary } = await import('../src/cms/document-parts.ts');
  const doc = createCmsSeed();
  const before = structuredClone(doc);
  const parts = splitCmsDocument(doc);
  for (const part of parts) assert.deepEqual(schema.validateCmsPart(part), { valid: true, errors: [] }, part.kind);
  assert.deepEqual(assembleCmsDocument(parts), doc);
  assert.deepEqual(assembleCmsDocument([...parts].reverse()), doc);
  assert.deepEqual(doc, before);
  const summaries = parts.map(referenceSummary);
  assert.deepEqual(schema.validateCmsRelationships(assembleCmsDocument(summaries)), []);
  assert.ok(JSON.stringify(summaries).length < JSON.stringify(parts).length / 4, 'metadata does not retain localized body copy');
  const page = parts.find(p => p.kind === 'pages');
  const bad = structuredClone(page); bad.value.title.en = 7;
  assert.equal(schema.validateCmsPart(bad).valid, false);
  assert.match(schema.validateCmsPart(bad).errors[0], /document\.pages\[0\]\.title\.en:/);
});

test('relationship extraction keeps full-document errors and bounded diagnostics', () => {
  assert.equal(typeof schema.validateCmsRelationships, 'function');
  const doc = createCmsSeed();
  assert.deepEqual(schema.validateCmsRelationships(doc), []);
  doc.pages[0].parentId = doc.pages[0].id;
  assert.deepEqual(schema.validateCmsRelationships(doc), schema.validateCmsDocument(doc).errors);
  doc.pages = Array.from({ length: 150 }, () => structuredClone(doc.pages[0]));
  assert.ok(schema.validateCmsRelationships(doc).length <= schema.CMS_LIMITS.errors);
});

const { splitCmsDocument, assembleCmsDocument, referenceSummary } = await import('../src/cms/document-parts.ts');
const seed = createCmsSeed();
const seedParts = splitCmsDocument(seed);
const cloneParts = () => structuredClone(seedParts);
const text = (en = 'Text') => ({ en, fr: en, es: en });

// Admission is separate from structural assembly. This harness models final acceptance,
// including the mandatory whole-document canonical byte check.
function stagedValidation(input) {
  let parts;
  try { parts = splitCmsDocument(input); }
  catch { return { valid: false, errors: ['parts: invalid structure'] }; }
  const errors = parts.flatMap(part => schema.validateCmsPart(part).errors).slice(0, schema.CMS_LIMITS.errors);
  if (errors.length) return { valid: false, errors };
  const document = assembleCmsDocument(parts);
  const encoded = JSON.stringify(document);
  if (encoded.length > schema.CMS_LIMITS.bytes || new TextEncoder().encode(encoded).length > schema.CMS_LIMITS.bytes) return { valid: false, errors: ['document: exceeds byte limit'] };
  const relationshipErrors = schema.validateCmsRelationships(assembleCmsDocument(parts.map(referenceSummary)));
  assert.deepEqual(relationshipErrors, schema.validateCmsRelationships(document));
  return relationshipErrors.length ? { valid: false, errors: relationshipErrors } : { valid: true, errors: [], document };
}

for (const [name, edit] of Object.entries({
  'missing manifest': p => p.shift(),
  'duplicate manifest': p => p.push(structuredClone(p[0])),
  'missing scalar': p => p.splice(p.findIndex(x => x.kind === 'theme'), 1),
  'missing item': p => p.splice(p.findIndex(x => x.kind === 'pages'), 1),
  'duplicate item': p => p.push(structuredClone(p.find(x => x.kind === 'pages'))),
  'negative index': p => { p.find(x => x.kind === 'pages').index = -1; },
  'fractional index': p => { p.find(x => x.kind === 'pages').index = 0.5; },
  'out-of-count index': p => { p.find(x => x.kind === 'pages').index = p[0].value.pages; },
  'out-of-limit index': p => { p.find(x => x.kind === 'pages').index = schema.CMS_LIMITS.pages; },
  'scalar index': p => { p.find(x => x.kind === 'theme').index = 1; },
  'arbitrary nested path': p => { p.find(x => x.kind === 'pages').kind = 'pages.0.title'; },
  'poison kind': p => { p.find(x => x.kind === 'pages').kind = '__proto__'; },
  'unknown kind': p => { p.find(x => x.kind === 'pages').kind = 'bookings'; },
  'unknown envelope field': p => { p[1].private = true; },
  'key on non-dictionary': p => { p[1].key = 'extra'; },
  'duplicate dictionary key': p => { const copy = p.filter(x => x.kind === 'uiCopy'); copy[1].key = copy[0].key; },
  'missing dictionary key': p => { delete p.find(x => x.kind === 'uiCopy').key; },
  'unknown manifest field': p => { p[0].value.bookings = 0; },
  'missing manifest field': p => { delete p[0].value.reviews; },
  'wrong scalar count': p => { p[0].value.footer = 0; },
  'non-integer count': p => { p[0].value.pages = 0.5; },
  'negative count': p => { p[0].value.pages = -1; },
})) test(`structural assembly rejects ${name}`, () => {
  const parts = cloneParts(); edit(parts);
  assert.throws(() => assembleCmsDocument(parts), /parts:/);
});

for (const [kind, spec] of Object.entries(schema.CMS_PART_FIELDS)) {
  test(`manifest retains original ${kind} limit`, () => {
    const parts = cloneParts(); parts[0].value[kind] = spec.max + 1;
    assert.equal(schema.validateCmsPart(parts[0]).valid, false);
    assert.throws(() => assembleCmsDocument(parts), /parts:/);
  });
  test(`exact field checker rejects a null ${kind} item`, () => {
    const part = seedParts.find(p => p.kind === kind) ?? { kind, index: 0, value: null };
    assert.equal(schema.validateCmsPart({ ...part, value: null }).valid, false);
  });
}

for (const key of ['__proto__', 'constructor', 'prototype', 'a'.repeat(161), '-invalid']) test(`dictionary admission rejects ${key.slice(0, 24)}`, () => {
  const part = { kind: 'uiCopy', index: 0, key, value: text() };
  assert.equal(schema.validateCmsPart(part).valid, false);
  const parts = cloneParts(); Object.assign(parts.find(p => p.kind === 'uiCopy'), part);
  assert.throws(() => assembleCmsDocument(parts), /parts:/);
});

test('safe JSON checks retain original depth and array semantics without invoking accessors', () => {
  for (const kind of ['pages', 'legacy.tours', 'siteSettings', 'legacy.siteSettings', 'uiCopy']) {
    const original = seedParts.find(p => p.kind === kind);
    const depth = schema.CMS_PART_FIELDS[kind].depth;
    const nested = n => { let value = null; while (n--) value = { child: value }; return value; };
    // An unknown field is schema-invalid, but only the over-depth version is unsafe JSON.
    const atLimit = { ...original, value: { extra: nested(29 - depth) } };
    assert.notDeepEqual(schema.validateCmsPart(atLimit).errors, ['document: expected safe JSON data']);
    const tooDeep = { ...original, value: { extra: nested(30 - depth) } };
    assert.deepEqual(schema.validateCmsPart(tooDeep).errors, ['document: expected safe JSON data']);
  }
  for (const invalid of [NaN, Infinity, undefined, 1n, () => {}, new Date(), Array(1), Array(1001).fill(null), Object.create({ inherited: true })]) {
    assert.equal(schema.validateCmsPart({ kind: 'pages', index: 0, value: invalid }).valid, false);
  }
  let called = 0;
  const accessor = {};
  Object.defineProperty(accessor, 'title', { enumerable: true, get() { called++; return text(); } });
  assert.equal(schema.validateCmsPart({ kind: 'pages', index: 0, value: accessor }).valid, false);
  const envelope = { kind: 'pages', index: 0 };
  Object.defineProperty(envelope, 'value', { enumerable: true, get() { called++; return seed.pages[0]; } });
  assert.equal(schema.validateCmsPart(envelope).valid, false);
  assert.equal(called, 0);
  const cycle = {}; cycle.cycle = cycle;
  assert.equal(schema.validateCmsPart({ kind: 'pages', index: 0, value: cycle }).valid, false);
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    const value = JSON.parse(`{"${key}":{}}`);
    assert.deepEqual(schema.validateCmsPart({ kind: 'pages', index: 0, value }).errors, ['document: expected safe JSON data']);
  }
});

test('empty collections survive reconstruction while empty pages fail relationships', () => {
  const doc = structuredClone(seed);
  for (const [kind, spec] of Object.entries(schema.CMS_PART_FIELDS)) if (spec.collection) {
    if (kind.startsWith('legacy.')) doc.legacy[kind.slice(7)] = [];
    else doc[kind] = kind === 'uiCopy' ? {} : [];
  }
  doc.footer.links = [];
  const parts = splitCmsDocument(doc);
  assert.deepEqual(assembleCmsDocument(parts), doc);
  assert.deepEqual(schema.validateCmsRelationships(assembleCmsDocument(parts.map(referenceSummary))), ['pages: at least one page required']);
});

test('split rejects unknown fields, non-JSON containers and sparse arrays instead of discarding them', () => {
  for (const edit of [d => { d.bookings = []; }, d => { delete d.footer; }, d => { d.legacy.bookings = []; }, d => { d.pages = Array(1); }, d => { d.uiCopy = JSON.parse('{"__proto__":{}}'); }]) {
    const doc = structuredClone(seed); edit(doc); assert.throws(() => splitCmsDocument(doc), /parts:/);
  }
});

test('reference summaries are data-only and are NOT a replacement for real field admission', () => {
  const parts = cloneParts();
  assert.equal(schema.validateCmsPart(parts.find(p => p.kind === 'pages')).valid, true);
  const summaries = parts.map(referenceSummary);
  const roundTripped = JSON.parse(JSON.stringify(summaries));
  assert.deepEqual(schema.validateCmsRelationships(assembleCmsDocument(roundTripped)), []);
  assert.equal(schema.validateCmsPart(roundTripped.find(p => p.kind === 'pages')).valid, false);
  assert.equal(schema.validateCmsDocument(assembleCmsDocument(roundTripped)).valid, false);
});

test('reference envelopes preserve public visibility and routing metadata without body copy', () => {
  for (const original of seedParts) {
    if (original.kind === 'manifest' || !original.value || typeof original.value !== 'object') continue;
    const summary = referenceSummary(original);
    assert.equal(summary.kind, original.kind);
    assert.equal(summary.index, original.index);
    assert.equal(summary.key, original.key);
    for (const key of ['id', 'pageId', 'parentId', 'productId', 'enabled', 'published']) {
      if (Object.hasOwn(original.value, key)) assert.deepEqual(summary.value[key], original.value[key], `${original.kind}.${key}`);
    }
    if (original.kind === 'pages') for (const [index, section] of original.value.sections.entries()) {
      assert.equal(summary.value.sections[index].enabled, section.enabled);
      if ('links' in section) for (const [i, link] of section.links.entries()) assert.equal(summary.value.sections[index].links[i].enabled, link.enabled);
    }
  }
});

test('assembly rejects non-JSON part-list containers without invoking accessors', () => {
  for (const edit of [p => { p[Symbol('hidden')] = true; }, p => { Object.defineProperty(p, 'hidden', { value: true }); }, p => { p.extra = true; }]) {
    const parts = cloneParts(); edit(parts); assert.throws(() => assembleCmsDocument(parts), /parts:/);
  }
  const parts = cloneParts(); let called = 0;
  Object.defineProperty(parts, '0', { enumerable: true, get() { called++; return seedParts[0]; } });
  assert.throws(() => assembleCmsDocument(parts), /parts:/);
  assert.equal(called, 0);
});

const referenceEdits = {
  'duplicate media ID': d => d.media.push(structuredClone(d.media[0])),
  'duplicate product ID': d => d.products.push(structuredClone(d.products[0])),
  'duplicate review ID': d => d.reviews.push(structuredClone(d.reviews[0])),
  'duplicate FAQ ID': d => d.faqs.push(structuredClone(d.faqs[0])),
  'duplicate team ID': d => d.teamMembers.push(structuredClone(d.teamMembers[0])),
  'duplicate blog ID': d => d.blogPosts.push(structuredClone(d.blogPosts[0])),
  'duplicate editorial ID': d => d.editorialEntries.push(structuredClone(d.editorialEntries[0])),
  'missing avatar source': d => { d.teamMembers[0].avatarUrl = '/images/missing.jpg'; },
  'missing blog source': d => { d.blogPosts[0].coverImage = '/images/missing.jpg'; },
  'missing product source': d => { d.products[0].image = '/images/missing.jpg'; },
  'missing gallery source': d => { d.products[0].galleryImages = ['/images/missing.jpg']; },
  'media dimensions together': d => { d.media[0].width = 10; delete d.media[0].height; },
  'footer link reference': d => { d.footer.links[0].pageId = 'missing'; delete d.footer.links[0].href; },
  'footer duplicate link ID': d => d.footer.links.push(structuredClone(d.footer.links[0])),
  'editorial wrong kind': d => { d.editorialEntries[0].pageId = d.pages[0].id; },
  'editorial missing page': d => { d.editorialEntries[0].pageId = 'missing'; },
  'editorial missing product': d => { d.editorialEntries[0].productId = 'missing'; },
  'reserved slug': d => { d.pages[0].slug = 'api'; },
  'invalid root canonical': d => { d.pages[0].seo.canonical = '/not-home'; },
  'reserved canonical': d => { d.pages[1].seo.canonical = '/admin'; },
  'duplicate canonical': d => { d.pages[1].seo.canonical = '/'; },
  'canonical matching other ID': d => { d.pages[1].seo.canonical = `/${d.pages[0].id}`; },
  'missing page parent': d => { d.pages[0].parentId = 'missing'; },
  'self parent': d => { d.pages[0].parentId = d.pages[0].id; },
  'long parent cycle': d => { d.pages[0].parentId = d.pages[1].id; d.pages[1].parentId = d.pages[0].id; },
  'missing page product': d => { d.pages.find(p => p.kind === 'product').productId = 'missing'; },
  'product page without product': d => { delete d.pages.find(p => p.kind === 'product').productId; },
  'non-product bookable': d => { d.pages[0].productId = d.products[0].id; },
  'cyclic accepted locale fields': d => { d.pages[0].localeFallback = { en: 'fr', fr: 'en' }; },
  'unknown seo image': d => { d.pages[0].seo.image = { mediaId: 'missing', alt: text() }; },
  'review wrong attribution': d => { d.reviews[0].url = 'https://example.com/review'; },
};
for (const kind of ['legacy.tours', 'legacy.customPages', 'legacy.blogPosts', 'legacy.teamMembers', 'legacy.faqs']) {
  referenceEdits[`duplicate ${kind}`] = d => { const rows = d.legacy[kind.slice(7)]; rows.push(structuredClone(rows[0])); };
}
const sectionBase = (type, fields) => ({ id: 'proof-section', type, enabled: true, ...fields });
for (const [name, section] of Object.entries({
  'hero image': sectionBase('hero', { variant: 'banner', image: { mediaId: 'missing', alt: text() }, links: [] }),
  'hero link': sectionBase('hero', { variant: 'banner', links: [{ id: 'proof-link', enabled: true, label: text(), pageId: 'missing' }] }),
  'hero duplicate links': sectionBase('hero', { variant: 'banner', links: Array.from({ length: 2 }, () => ({ id: 'proof-link', enabled: true, label: text(), pageId: 'home' })) }),
  'cta product': sectionBase('cta', { variant: 'banner', productId: 'missing', links: [] }),
  'cta booking': sectionBase('cta', { variant: 'booking', links: [] }),
  'product grid missing': sectionBase('productGrid', { variant: 'overview', productIds: ['missing'] }),
  'product grid duplicate': sectionBase('productGrid', { variant: 'overview', productIds: ['missing', 'missing'] }),
  'gallery image': sectionBase('gallery', { variant: 'grid', images: [{ mediaId: 'missing', alt: text() }] }),
  'card image and page': sectionBase('cardGrid', { variant: 'overview', cards: [{ id: 'card', title: text(), description: text(), image: { mediaId: 'missing', alt: text() }, pageId: 'missing' }] }),
  'duplicate cards': sectionBase('cardGrid', { variant: 'overview', cards: Array.from({ length: 2 }, () => ({ id: 'card', title: text(), description: text() })) }),
  'review duplicates': sectionBase('reviews', { variant: 'grid', reviewIds: ['missing', 'missing'] }),
  'faq duplicates': sectionBase('faq', { variant: 'list', faqIds: ['missing', 'missing'] }),
  'team duplicates': sectionBase('team', { variant: 'grid', teamIds: ['missing', 'missing'] }),
})) referenceEdits[name] = d => { d.pages[0].sections = [structuredClone(section)]; };

// Supply only standard public test data for entity categories absent from the seed.
function referenceFixture() {
  const d = structuredClone(seed);
  if (!d.blogPosts.length) d.blogPosts.push({ id: 'proof-post', slug: 'proof-post', title: text(), excerpt: text(), content: text(), coverImage: d.media[0].src, category: text(), author: 'Test', date: '2026-10-20', readTime: text(), published: true });
  if (!d.legacy.blogPosts.length) d.legacy.blogPosts.push(structuredClone(d.blogPosts[0]));
  if (!d.legacy.customPages.length) d.legacy.customPages.push({ id: 'proof-custom', slug: 'proof-custom', title: text(), subtitle: text(), heroImage: d.media[0].src, content: text(), highlights: { en: [], fr: [], es: [] }, showInNav: false, published: true, createdAt: '2026-10-20' });
  return d;
}
for (const [name, edit] of Object.entries(referenceEdits)) test(`exact summary/whole relationship negatives: ${name}`, () => {
  const d = referenceFixture();
  assert.equal(schema.validateCmsDocument(d).valid, true);
  edit(d);
  const parts = splitCmsDocument(d);
  for (const part of parts) assert.equal(schema.validateCmsPart(part).valid, true, `${name}: field admission`);
  const full = schema.validateCmsDocument(d);
  assert.equal(full.valid, false, `${name} must actually fail`);
  assert.deepEqual(schema.validateCmsRelationships(assembleCmsDocument(parts.map(referenceSummary))), full.errors);
});

test('optional private source14 proof and aggregate per-part timings', { skip: !process.env.CMS_SOURCE14_PROOF }, t => {
  const backup = JSON.parse(readFileSync(process.env.CMS_SOURCE14_PROOF, 'utf8'));
  let doc = backup[1].results.find(row => row.version === 14).document;
  if (typeof doc === 'string') doc = JSON.parse(doc);
  const result = schema.validateCmsDocument(doc);
  assert.equal(result.valid, true, 'private source14 passes full admission');
  const parts = splitCmsDocument(doc);
  assert.ok(JSON.stringify(assembleCmsDocument(parts)) === JSON.stringify(doc), 'private source14 exact JSON reconstruction');
  assert.ok(parts.every(part => schema.validateCmsPart(part).valid), 'private source14 every part admitted');
  const summaries = parts.map(referenceSummary);
  assert.ok(JSON.stringify(schema.validateCmsRelationships(assembleCmsDocument(summaries))) === JSON.stringify(schema.validateCmsRelationships(doc)), 'private source14 same relationship errors');
  const times = [];
  for (let warmup = 0; warmup < 5; warmup++) for (const part of parts) assert.equal(schema.validateCmsPart(part).valid, true);
  for (let repeat = 0; repeat < 15; repeat++) for (const part of parts) {
    const start = performance.now();
    const result = schema.validateCmsPart(part);
    times.push(performance.now() - start);
    assert.equal(result.valid, true);
  }
  times.sort((a, b) => a - b);
  const bytes = value => Buffer.byteLength(JSON.stringify(value));
  const digest = value => createHash('sha256').update(value).digest('hex');
  t.diagnostic(JSON.stringify({ privateSource: 'version14', reconstructionExact: true,
    documentSha256: digest(JSON.stringify(doc)), parts: parts.length, documentBytes: bytes(doc), summaryBytes: bytes(summaries),
    largestPartBytes: Math.max(...parts.map(part => bytes(part.value))), samples: times.length,
    partMs: { median: times[Math.floor(times.length / 2)], p95: times[Math.floor(times.length * 0.95)], max: times.at(-1) } }));
});

test('relationship predicates retain the original pipeline except the approved retired-locale reservation', () => {
  const source = readFileSync(new URL('../src/cms/schema.ts', import.meta.url), 'utf8');
  const start = source.indexOf('export function validateCmsRelationships');
  const currentTail = source.slice(source.indexOf('    const d = value as CmsDocument;', start), source.indexOf('  return errors;', start));
  // Only the two explicit ar reservations are approved changes to the original predicates.
  // Keep the historical fingerprints for every other byte; behavioral coverage rejects ar.
  const retired = "['admin', 'api', 'assets', 'media', 'images', 'fonts', 'en', 'fr', 'es', 'ar']";
  const originalReserved = "['admin', 'api', 'assets', 'media', 'images', 'fonts', 'en', 'fr', 'es']";
  assert.equal(currentTail.split(retired).length - 1, 2, 'slug and canonical reservations must both retain ar');
  const tail = currentTail.replaceAll(retired, originalReserved);
  const digest = value => createHash('sha256').update(value).digest('hex');
  assert.equal(digest(tail), 'ec16c50732437189fc5b728f8a5483e07aa461bb651a02fff9d70fdfb67e2186');
  const whole = source.slice(source.indexOf('export function validateCmsDocument'));
  const original = whole.replace('    const d = value as CmsDocument;\n    errors.push(...validateCmsRelationships(d));\n', tail);
  assert.equal(digest(original), '3708b98d82e32129b9b10c72b71f10f695b080f84ead17ecb5ae968d96500b21');
});

// Run the existing reusable schema corpus unchanged against staged admission, and
// compare its every actual input with the whole validator. No copied schema or fixtures.
let corpus = readFileSync(new URL('./cms-schema.test.mjs', import.meta.url), 'utf8');
corpus = corpus.replace("import { register } from 'tsx/esm/api';\nregister();", '');
corpus = corpus.replace("import test from 'node:test';", "import baseTest from 'node:test'; const test = (name, fn) => baseTest('staged corpus: ' + name, fn);");
corpus = corpus.replace("const { validateCmsDocument, CMS_LIMITS } = await import('../src/cms/schema.ts');", `
const schema = await import(${JSON.stringify(new URL('../src/cms/schema.ts', import.meta.url).href)});
const { CMS_LIMITS } = schema;
const { splitCmsDocument, assembleCmsDocument, referenceSummary } = await import(${JSON.stringify(new URL('../src/cms/document-parts.ts', import.meta.url).href)});
const stagedValidation = ${stagedValidation.toString()};
const validateCmsDocument = input => {
  const actual = stagedValidation(input);
  const expected = schema.validateCmsDocument(input);
  assert.equal(actual.valid, expected.valid, 'staged/whole admission equivalence');
  if (actual.valid) assert.deepEqual(actual.document, expected.document);
  return actual;
};`);
corpus = corpus.replaceAll("'../src/data/translations.ts'", JSON.stringify(new URL('../src/data/translations.ts', import.meta.url).href));
corpus = corpus.replaceAll("'../src/cms/seed.ts'", JSON.stringify(new URL('../src/cms/seed.ts', import.meta.url).href));
await import(`data:text/javascript;base64,${Buffer.from(corpus).toString('base64')}`);
