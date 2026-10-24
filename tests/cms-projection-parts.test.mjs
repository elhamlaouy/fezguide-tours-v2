import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { register } from 'tsx/esm/api';
register();
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { CMS_PART_FIELDS } = await import('../src/cms/schema.ts');
const { splitCmsDocument, assembleCmsDocument, referenceSummary } = await import('../src/cms/document-parts.ts');
const { publicCmsDocument, publicCmsCompatibility } = await import('../worker/cms-routes.ts');
const moduleUrl = new URL('../worker/cms-projection-parts.ts', import.meta.url);
async function api() {
  assert.equal(existsSync(moduleUrl), true, 'bounded public projection module exists');
  const module = await import(moduleUrl.href);
  for (const name of ['createPublicProjectionContext', 'projectPublicPart']) assert.equal(typeof module[name], 'function', name);
  return module;
}

// Frozen pre-refactor policy. Intentionally independent of the production helpers:
// a shared implementation as the oracle could let both paths regress together.
function originalProjection(value) {
  const pick = (value, fields) => Object.fromEntries(fields.filter(field => Object.hasOwn(value, field)).map(field => [field, value[field]]));
  const result = pick(value, ['schemaVersion', 'siteSettings', 'theme', 'navigation', 'footer', 'uiCopy', 'pages', 'products', 'editorialEntries', 'blogPosts', 'teamMembers', 'faqs', 'media', 'reviews', 'legacy']);
  if (result.legacy && typeof result.legacy === 'object' && !Array.isArray(result.legacy)) result.legacy = pick(result.legacy, ['tours', 'customPages', 'blogPosts', 'teamMembers', 'faqs', 'siteSettings']);
  else delete result.legacy;
  const records = value => Array.isArray(value) ? value : [];
  const hidden = value => value.enabled === false || value.published === false;
  const legacy = result.legacy ?? {};
  const pages = records(result.pages);
  const products = records(result.products);
  const copies = [...records(result.blogPosts), ...records(legacy.blogPosts), ...records(legacy.customPages), ...records(legacy.tours)];
  const pageIds = new Set([...pages, ...products, ...copies].filter(hidden).map(record => record.id));
  const productIds = new Set([...products, ...records(legacy.tours)].filter(hidden).map(record => record.id));
  let changed = true;
  while (changed) {
    const size = pageIds.size + productIds.size;
    for (const page of pages) if (pageIds.has(page.parentId) || productIds.has(page.productId)) pageIds.add(page.id);
    for (const product of products) if (pageIds.has(product.id) || pageIds.has(product.pageId)) productIds.add(product.id);
    for (const copy of copies) if (pageIds.has(copy.id) || pageIds.has(copy.pageId) || productIds.has(copy.id)) pageIds.add(copy.id);
    changed = size !== pageIds.size + productIds.size;
  }
  const reviewIds = new Set(records(result.reviews).filter(hidden).map(record => record.id));
  function project(child, field = '') {
    if (Array.isArray(child)) {
      const ids = field === 'productIds' ? productIds : field === 'reviewIds' ? reviewIds : null;
      return child.filter(item => !ids?.has(item)).map(item => project(item, field)).filter(item => item !== undefined);
    }
    if (!child || typeof child !== 'object') return child;
    if (hidden(child) || pageIds.has(child.pageId) || productIds.has(child.productId) ||
      (['pages', 'tours', 'customPages', 'blogPosts'].includes(field) && pageIds.has(child.id)) ||
      (['products', 'tours'].includes(field) && productIds.has(child.id))) return undefined;
    return Object.fromEntries(Object.entries(child).map(([key, item]) => [key, project(item, key)]));
  }
  const projected = project(result);
  const media = records(result.media);
  const mediaSources = new Map(media.map(record => [record.src, record.id]));
  function refs(child, ids = new Set()) {
    if (Array.isArray(child)) child.forEach(item => refs(item, ids));
    else if (child && typeof child === 'object') {
      for (const [key, item] of Object.entries(child)) {
        if (key === 'media') continue;
        if (key === 'mediaId') ids.add(item);
        refs(item, ids);
      }
    } else if (mediaSources.has(child)) ids.add(mediaSources.get(child));
    return ids;
  }
  if (Array.isArray(result.media)) {
    const originalIds = refs(result);
    const publicIds = refs(projected);
    projected.media = media.filter(record => !originalIds.has(record.id) || publicIds.has(record.id));
  }
  return projected;
}

// This is the complete metadata needed by createPublicProjectionContext, not a
// truncated document or a client-authored substitute for real source admission.
function summaryDocument(document) {
  const keys = ['id', 'enabled', 'published', 'parentId', 'productId', 'pageId'];
  const metadata = record => Object.fromEntries(keys.filter(key => Object.hasOwn(record, key)).map(key => [key, record[key]]));
  return {
    pages: document.pages.map(metadata), products: document.products.map(metadata),
    blogPosts: document.blogPosts.map(metadata), reviews: document.reviews.map(metadata),
    media: document.media.map(({ id, src }) => ({ id, src })),
    legacy: Object.fromEntries(['tours', 'customPages', 'blogPosts'].map(kind => [kind, document.legacy[kind].map(metadata)])),
  };
}

// Public parts intentionally keep SOURCE indexes. Assembly below is public-only:
// do not feed omitted/index-gapped parts to the private strict document assembler.
function assembleProjected(parts) {
  const root = {};
  const legacy = {};
  for (const [kind, spec] of Object.entries(CMS_PART_FIELDS)) {
    const ordered = parts.filter(part => part.kind === kind).sort((a, b) => a.index - b.index);
    const value = kind === 'uiCopy' ? Object.fromEntries(ordered.map(part => [part.key, part.value]))
      : spec.collection ? ordered.filter(part => Object.hasOwn(part, 'value')).map(part => part.value) : ordered[0]?.value;
    if (kind.startsWith('legacy.')) legacy[kind.slice(7)] = value;
    else root[kind] = value;
  }
  root.legacy = legacy;
  const originalIds = new Set(parts.flatMap(part => part.originalMediaIds));
  const publicIds = new Set(parts.flatMap(part => part.publicMediaIds));
  root.media = root.media.filter(record => !originalIds.has(record.id) || publicIds.has(record.id));
  return root;
}

async function prove(document) {
  const module = await api();
  const before = structuredClone(document);
  const summary = summaryDocument(document);
  const summaryBefore = structuredClone(summary);
  const context = module.createPublicProjectionContext(summary);
  const parts = splitCmsDocument(document);
  const sourcePartsSummary = assembleCmsDocument(parts.map(referenceSummary));
  assert.ok(isDeepStrictEqual(module.createPublicProjectionContext(sourcePartsSummary), context),
    'real staged summaries preserve every flag, cross-copy relation and media id/src');
  const projected = parts.map(part => module.projectPublicPart(part, context));
  const expected = originalProjection(document);
  const actual = assembleProjected(projected);
  // Boolean assertions also keep opt-in private-source diffs out of test output.
  assert.ok(isDeepStrictEqual(actual, expected), 'bounded parts equal the original full policy');
  assert.ok(JSON.stringify(actual) === JSON.stringify(expected), 'bounded assembly preserves public JSON bytes/order');
  const full = publicCmsDocument(document);
  assert.ok(isDeepStrictEqual(full, expected), 'full projection retains the frozen output');
  assert.ok(JSON.stringify(full) === JSON.stringify(expected), 'full projection preserves public JSON bytes/order');
  assert.ok(isDeepStrictEqual(publicCmsCompatibility(document), expected.legacy), 'compatibility projection is unchanged');
  assert.ok(isDeepStrictEqual(document, before), 'source is unchanged');
  assert.ok(isDeepStrictEqual(summary, summaryBefore), 'summary is unchanged');
  return { actual, projected, context, module };
}

function withMedia(document, id, suffix = id) {
  const record = { ...structuredClone(document.media[0]), id, src: `/images/${suffix}.jpg` };
  document.media.push(record);
  return record;
}

test('bounded seed parts reconstruct the original public output without source mutation', async () => {
  const seed = createCmsSeed();
  const { actual } = await prove(seed);
  assert.deepEqual(actual, seed);
});

test('full projection reuses the bounded context, recursive policy and exact media rule', async () => {
  const routes = readFileSync(new URL('../worker/cms-routes.ts', import.meta.url), 'utf8');
  assert.match(routes, /from ['"]\.\/cms-projection-parts['"]/);
  for (const helper of ['createPublicProjectionContext', 'projectPublicValue', 'publicMediaReferences', 'keepPublicMedia']) {
    assert.match(routes, new RegExp(`\\b${helper}\\(`), `${helper} is reused by full projection`);
  }
  assert.doesNotMatch(routes, /function project\(|const hidden =|function mediaReferences\(/, 'no duplicate privacy implementation');
  await prove(createCmsSeed());
});

for (const [name, hide] of Object.entries({
  hiddenProduct: doc => { doc.products[0].published = false; },
  disabledFlagDisagreement: doc => { doc.legacy.tours.find(t => t.id === doc.products[0].id).published = false; doc.products[0].published = true; },
  canonicalDetailPage: doc => { doc.pages.find(p => p.productId === doc.products[0].id).enabled = false; },
  legacyBlogCopy: doc => { doc.legacy.blogPosts[0].published = false; doc.blogPosts[0].published = true; },
  canonicalBlogCopy: doc => { doc.blogPosts[0].published = false; doc.legacy.blogPosts[0].published = true; },
  ancestor: doc => { doc.pages.find(p => p.id === doc.products[0].pageId).enabled = false; },
  hiddenReview: doc => { doc.reviews[0].enabled = false; },
  emptyVisiblePages: doc => { doc.pages.forEach(p => { p.enabled = false; }); },
})) test(`bounded projection retains original privacy: ${name}`, async () => {
  // Source JSON has independent canonical/legacy copies; the seed shares some object identities.
  const doc = JSON.parse(JSON.stringify(createCmsSeed()));
  const productId = doc.products[0].id;
  const categoryId = doc.products[0].pageId;
  const postId = doc.blogPosts[0].id;
  const reviewId = doc.reviews[0].id;
  hide(doc);
  const { actual, projected } = await prove(doc);
  if (['hiddenProduct', 'disabledFlagDisagreement', 'canonicalDetailPage', 'ancestor'].includes(name)) {
    assert.equal(actual.products.some(p => p.id === productId), false);
    assert.equal(actual.legacy.tours.some(p => p.id === productId), false);
    assert.equal(actual.pages.some(p => p.productId === productId), false);
    if (name !== 'ancestor') assert.ok(actual.pages.some(p => p.id === categoryId), 'hiding a product never hides its category');
  }
  if (name.includes('BlogCopy')) {
    assert.equal(actual.pages.some(p => p.id === postId), false);
    assert.equal(actual.blogPosts.some(p => p.id === postId), false);
    assert.equal(actual.legacy.blogPosts.some(p => p.id === postId), false);
  }
  if (name === 'hiddenReview') {
    assert.equal(actual.reviews.some(p => p.id === reviewId), false);
    for (const page of actual.pages) for (const section of page.sections) assert.ok(!section.reviewIds?.includes(reviewId));
  }
  if (name === 'emptyVisiblePages') assert.deepEqual(actual.pages, []);
  assert.ok(projected.some(part => !Object.hasOwn(part, 'value')), 'omitted records retain their envelope, not their value');
});

test('exact media unions exclude private-only IDs/URLs but keep shared and unused library items', async () => {
  const doc = JSON.parse(JSON.stringify(createCmsSeed()));
  const privateOnly = withMedia(doc, 'projection-private');
  const shared = withMedia(doc, 'projection-shared');
  const privateUrl = withMedia(doc, 'projection-private-url');
  const sharedUrl = withMedia(doc, 'projection-shared-url');
  const unused = withMedia(doc, 'projection-unused');
  doc.pages[0].sections.push({ id: 'private-projection', type: 'gallery', variant: 'grid', enabled: false,
    images: [{ mediaId: privateOnly.id }, { mediaId: shared.id }] });
  doc.pages[0].sections.push({ id: 'shared-projection', type: 'gallery', variant: 'grid', enabled: true,
    images: [{ mediaId: shared.id }] });
  doc.products[0].image = privateUrl.src;
  doc.products[0].galleryImages = [sharedUrl.src];
  doc.products[0].published = false;
  doc.siteSettings.heroImage = sharedUrl.src;
  const { actual, projected, module } = await prove(doc);
  const remaining = new Set(actual.media.map(record => record.id));
  assert.equal(remaining.has(privateOnly.id), false);
  assert.equal(remaining.has(privateUrl.id), false);
  for (const record of [shared, sharedUrl, unused]) assert.ok(remaining.has(record.id));
  const originalIds = new Set(projected.flatMap(part => part.originalMediaIds));
  const publicIds = new Set(projected.flatMap(part => part.publicMediaIds));
  for (const record of [privateOnly, shared, privateUrl, sharedUrl]) assert.ok(originalIds.has(record.id));
  for (const record of [privateOnly, privateUrl, unused]) assert.equal(publicIds.has(record.id), false);
  assert.equal(originalIds.has(unused.id), false, 'a media library src must not reference itself');
  for (const part of projected.filter(part => part.kind === 'media')) {
    assert.deepEqual(part.originalMediaIds, []);
    assert.deepEqual(part.publicMediaIds, []);
  }
  for (const record of doc.media) assert.equal(module.keepPublicMedia(record.id, originalIds, publicIds), remaining.has(record.id));
});

test('hidden fixedpoint reaches reverse-ordered descendants and cross-copy/product relations', async () => {
  const doc = JSON.parse(JSON.stringify(createCmsSeed()));
  const template = doc.pages[0];
  const page = (id, extra) => ({ ...structuredClone(template), id, slug: id, ...extra });
  doc.pages.push(page('privacy-leaf', { parentId: 'privacy-middle' }),
    page('privacy-middle', { parentId: 'privacy-root' }), page('privacy-root', { enabled: false }));
  const product = { ...structuredClone(doc.products[0]), id: 'privacy-product', pageId: 'privacy-leaf', published: true };
  doc.products.push(product);
  doc.pages.push(page('privacy-detail', { productId: product.id }));
  doc.legacy.tours.push({ ...structuredClone(doc.legacy.tours[0]), id: product.id, published: true });
  doc.legacy.customPages.push({ ...structuredClone(doc.legacy.customPages[0]), id: 'privacy-copy', pageId: 'privacy-detail' });
  doc.pages.push(page('privacy-copy', {}));
  const { actual, context } = await prove(doc);
  for (const id of ['privacy-root', 'privacy-middle', 'privacy-leaf', 'privacy-detail', 'privacy-copy']) {
    assert.ok(context.pageIds.has(id));
    assert.equal(actual.pages.some(record => record.id === id), false);
  }
  assert.ok(context.productIds.has(product.id));
  assert.equal(actual.legacy.customPages.some(record => record.id === 'privacy-copy'), false);
});

test('context uses only complete metadata and each call traverses only its own admitted part', async () => {
  const module = await api();
  const doc = createCmsSeed();
  doc.products[0].published = false;
  const summary = summaryDocument(doc);
  const bomb = () => { throw new Error('long copy or foreign source part was touched'); };
  for (const page of summary.pages) Object.defineProperty(page, 'sections', { get: bomb });
  for (const record of summary.products) Object.defineProperty(record, 'description', { get: bomb });
  Object.defineProperty(summary, 'uiCopy', { get: bomb });
  const context = module.createPublicProjectionContext(summary);
  const originalContext = structuredClone(context);
  const part = splitCmsDocument(doc).find(part => part.kind === 'uiCopy');
  const before = structuredClone(part);
  const savedParse = JSON.parse;
  const savedClone = globalThis.structuredClone;
  let result;
  try {
    JSON.parse = bomb;
    globalThis.structuredClone = bomb;
    result = module.projectPublicPart(part, context);
  } finally { JSON.parse = savedParse; globalThis.structuredClone = savedClone; }
  assert.equal(result.kind, part.kind);
  assert.equal(result.index, part.index);
  assert.equal(result.key, part.key);
  assert.deepEqual(result.value, part.value);
  assert.notEqual(result.value, part.value, 'ordinary projected containers are detached');
  assert.deepEqual(part, before);
  assert.deepEqual(context, originalContext);
});

test('full compatibility fallback and public field closure stay exactly as before', async () => {
  const seed = createCmsSeed();
  seed.legacy.tours[0].published = false;
  const legacyOnly = { ...seed.legacy, privateSentinel: 'must-not-survive' };
  assert.deepEqual(publicCmsCompatibility(legacyOnly), originalProjection({ legacy: legacyOnly }).legacy);
  assert.deepEqual(publicCmsDocument({ ...seed, privateSentinel: 'must-not-survive' }), originalProjection(seed));
  for (const legacy of [null, [], 'wrong', 7]) {
    assert.deepEqual(publicCmsDocument({ legacy }), originalProjection({ legacy }));
  }
});

// Opt in explicitly; ordinary runs never need or read a private backup.
test('optional actual source 14 reconstructs byte-identical policy output without mutation', {
  skip: !process.env.CMS_PROJECTION_SOURCE_FILE,
}, async () => {
  const source = JSON.parse(readFileSync(process.env.CMS_PROJECTION_SOURCE_FILE, 'utf8'));
  const record = Array.isArray(source)
    ? source.flatMap(result => result.results ?? []).find(row => row.version === 14 && typeof row.document === 'string')
    : source;
  assert.ok(record, 'source 14 document exists in the explicitly supplied backup');
  const document = typeof record.document === 'string' ? JSON.parse(record.document) : record.document ?? record;
  const { actual } = await prove(document);
  assert.ok(JSON.stringify(actual) === JSON.stringify(originalProjection(document)), 'source 14 projection serialization is byte-identical');
});
