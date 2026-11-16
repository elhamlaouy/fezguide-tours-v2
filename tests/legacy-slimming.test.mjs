import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'tsx/esm/api';
register();
const { renderSite, compareSites, compatibilityJson } = await import('../scripts/legacy-golden-lib.mjs');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { validateCmsDocument } = await import('../src/cms/schema.ts');
const { slimCmsDocument, slimLegacy } = await import('../src/cms/legacy-slim.ts');
const { publicCmsDocument, publicCmsCompatibility } = await import('../worker/cms-routes.ts');
const { approvedPublicData } = await import('../src/cms/approved-data.ts');
const { withFullLegacy } = await import('./fixtures/full-legacy.mjs');

const bytes = value => Buffer.byteLength(JSON.stringify(value));
const identical = async (before, after, label) => {
  const [a, b] = [await renderSite(before), await renderSite(after)];
  assert.ok(a.size >= 150, `${label}: rendered ${a.size} outputs`);
  assert.deepEqual(compareSites(a, b), [], `${label}: every public output is byte-identical`);
  return a.size;
};

test('the seed ships the slim archive and is far smaller than the full archive', () => {
  const seed = createCmsSeed();
  const full = withFullLegacy(seed);
  assert.equal(validateCmsDocument(seed).valid, true);
  assert.deepEqual(Object.keys(seed.legacy).sort(), ['customPages', 'tours']);
  for (const tour of seed.legacy.tours.filter(tour => !('title' in tour))) assert.deepEqual(Object.keys(tour).filter(key => !['id', 'pageId', 'actionType', 'kind', 'published'].includes(key)), []);
  assert.ok(bytes(seed.legacy) * 2 < bytes(full.legacy), `archive ${bytes(seed.legacy)} < half of ${bytes(full.legacy)}`);
  assert.deepEqual(slimCmsDocument(full), seed, 'slimming the full archive yields exactly the seed');
  assert.equal(slimCmsDocument(seed), seed, 'idempotent: an already slim document is returned untouched');
});

test('golden: full archive and slim archive render every public page, language, head, sitemap and client view identically', async () => {
  const seed = createCmsSeed();
  const full = withFullLegacy(seed);
  assert.equal(validateCmsDocument(full).valid, true, 'old unslimmed documents still validate');
  const count = await identical(full, slimCmsDocument(full), 'seed');
  assert.ok(count >= 150, 'all localized routes plus client renders compared');
});

test('golden: owner edits that leave the archive stale do not change what slimming renders', async () => {
  const seed = createCmsSeed();
  const full = withFullLegacy(seed);
  full.blogPosts[0].title = { en: 'Edited post', fr: 'Article modifié', es: 'Artículo editado' };
  full.teamMembers[0].role = { en: 'Edited role', fr: 'Rôle modifié', es: 'Cargo editado' };
  full.faqs[0].question = { en: 'Edited?', fr: 'Modifié ?', es: '¿Editado?' };
  full.siteSettings.heroTitle = { en: 'Edited hero', fr: 'Héros modifié', es: 'Héroe editado' };
  full.products[0].title = { en: 'Edited product', fr: 'Produit modifié', es: 'Producto editado' };
  assert.equal(validateCmsDocument(full).valid, true);
  await identical(full, slimCmsDocument(full), 'edited');
});

test('hidden flags on archive copies keep hiding the page after slimming', async () => {
  const seed = createCmsSeed();
  const productId = seed.products[0].id;
  const hideTour = withFullLegacy(seed);
  hideTour.legacy.tours.find(tour => tour.id === productId).published = false;
  const slimTourDoc = slimCmsDocument(hideTour);
  assert.equal(slimTourDoc.legacy.tours.find(tour => tour.id === productId).published, false, 'hidden flag survives on the slim copy');
  assert.equal(publicCmsDocument(slimTourDoc).products.some(product => product.id === productId), false);
  await identical(hideTour, slimTourDoc, 'hidden tour copy');

  const hideBlog = withFullLegacy(seed);
  hideBlog.legacy.blogPosts[0].published = false;
  const slimBlogDoc = slimCmsDocument(hideBlog);
  assert.deepEqual(slimBlogDoc.legacy.blogPosts, hideBlog.legacy.blogPosts, 'a hidden blog copy is kept');
  assert.equal(publicCmsDocument(slimBlogDoc).pages.some(page => page.id === hideBlog.legacy.blogPosts[0].id), false);
  await identical(hideBlog, slimBlogDoc, 'hidden blog copy');
});

test('archive-derived data the client reads is unchanged (tour order, editorial fallbacks, custom pages)', () => {
  const seed = createCmsSeed();
  const full = withFullLegacy(seed);
  assert.deepEqual(approvedPublicData(slimCmsDocument(full)), approvedPublicData(full));
  const noCards = structuredClone(full);
  for (const page of noCards.pages) for (const section of page.sections) if (section.type === 'cardGrid') section.cards = [];
  assert.deepEqual(approvedPublicData(slimCmsDocument(noCards)), approvedPublicData(noCards), 'editorial fallback fields still come from the kept cards');
});

test('slim documents validate; malformed slim archives are rejected', () => {
  const seed = createCmsSeed();
  const productId = seed.products[0].id;
  const tweak = change => { const doc = structuredClone(seed); change(doc); return validateCmsDocument(doc); };
  assert.equal(tweak(() => {}).valid, true);
  assert.equal(tweak(doc => { doc.legacy.tours.find(tour => tour.id === productId).price = 1; }).valid, false, 'unknown field on a slim tour');
  assert.equal(tweak(doc => { doc.legacy.tours.find(tour => tour.id === productId).pageId = 'about'; }).valid, false, 'category drift is still caught');
  assert.equal(tweak(doc => { doc.legacy.tours.find(tour => tour.id === productId).actionType = 'explore'; }).valid, false);
  assert.equal(tweak(doc => { doc.legacy.tours.push({ id: 'ghost', pageId: 'fez', actionType: 'book_tour' }); }).valid, false, 'slim tour without a product');
  assert.equal(tweak(doc => { delete doc.legacy.customPages; }).valid, false);
  assert.equal(tweak(doc => { doc.legacy.bookings = []; }).valid, false);
  assert.equal(tweak(doc => { doc.legacy.faqs = [{ id: 'x', category: 'tours', question: { en: 1 }, answer: {} }]; }).valid, false, 'optional archive collections are still validated when present');
});

test('compatibility API answers the same six fields from slim documents', () => {
  const seed = createCmsSeed();
  const full = withFullLegacy(seed);
  const slim = JSON.parse(compatibilityJson(seed));
  assert.deepEqual(Object.keys(slim), ['tours', 'customPages', 'blogPosts', 'teamMembers', 'faqs', 'siteSettings']);
  assert.deepEqual(slim.blogPosts, publicCmsCompatibility(full).blogPosts);
  assert.deepEqual(slim.teamMembers, publicCmsCompatibility(full).teamMembers);
  assert.deepEqual(slim.faqs, publicCmsCompatibility(full).faqs);
  assert.deepEqual(slim.siteSettings, publicCmsCompatibility(full).siteSettings);
  assert.deepEqual(slim.customPages, publicCmsCompatibility(full).customPages);
});

test('slimming never mutates its input and keeps rollback of old revisions loadable', () => {
  const full = withFullLegacy(createCmsSeed());
  const before = JSON.stringify(full);
  slimLegacy(full);
  slimCmsDocument(full);
  assert.equal(JSON.stringify(full), before);
  // A revision stored before slimming is read back as plain JSON and must validate untouched (rollback / history).
  assert.equal(validateCmsDocument(JSON.parse(before), { parsedJson: true }).valid, true);
});
