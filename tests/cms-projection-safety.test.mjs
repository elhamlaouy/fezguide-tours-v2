import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { register } from 'tsx/esm/api';
register();
registerHooks({ load(url, context, nextLoad) {
  if (url.endsWith('.css')) return { format: 'module', source: 'export default "";', shortCircuit: true };
  return nextLoad(url, context);
} });
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { PageRenderer } = await import('../src/cms/PageRenderer.tsx');
await (await import('../src/cms/ApprovedPageRenderer.tsx')).preloadApprovedLayouts();
const { setEditorPath } = await import('../src/cms/editor-controls.ts');
const projection = await import('../src/cms/entity-projection.ts');
const { validateCmsDocument } = await import('../src/cms/schema.ts');
const text = value => ({ en: value, fr: value, es: value });
const render = (document, id, language = 'en') => renderToStaticMarkup(createElement(PageRenderer, {
  document, page: document.pages.find(page => page.id === id), language, onNavigate() {}, onBook() {},
}));
const edit = (doc, id, field, value) => setEditorPath(doc, ['products', id, ...field.split('.')], value);
const facts = (doc, id) => doc.pages.find(page => page.id === id).sections.find(section => section.id === 'facts').items;
function roundTrip(doc) {
  const result = validateCmsDocument(JSON.parse(JSON.stringify(doc)));
  assert.equal(result.valid, true, result.errors.join('\n'));
  return result.document;
}
function productFixture(id) {
  const doc = createCmsSeed();
  if (id === 'new-experience') {
    const product = { ...structuredClone(doc.products[0]), id, title: text(id) };
    doc.products.push(product);
    doc.pages.push({ id, slug: id, kind: 'product', enabled: true, productId: id, parentId: product.pageId, title: text(id), seo: { title: text(id), description: text('') }, sections: [] });
  }
  return doc;
}
const permutations = values => values.length ? values.flatMap((value, index) => permutations(values.filter((_, i) => i !== index)).map(tail => [value, ...tail])) : [[]];
const prices = { MAD: 987, EUR: 654, USD: 321 };

for (const id of ['our-fez-tours', 'daytrip-chefchaouen', 'new-experience']) {
  test(`all currencies retain the right labels for every edit order: ${id}`, () => {
    for (const order of permutations(Object.keys(prices))) {
      const before = productFixture(id);
      const prior = JSON.stringify(before);
      let doc = before;
      for (const currency of order) doc = edit(doc, id, `practicalInfo.price${currency}`, prices[currency]);
      doc = roundTrip(doc);
      for (const [currency, amount] of Object.entries(prices)) {
        const rows = facts(doc, id).filter(row => row.description.en === `${amount} ${currency}`);
        assert.equal(rows.length, 1, `${order.join(',')}: ${currency}`);
        assert.equal(rows[0].title.en, `Price (${currency})`);
        for (const locale of ['en', 'fr', 'es']) assert.ok(render(doc, id, locale).includes(`${amount} ${currency}`));
      }
      assert.equal(JSON.stringify(before), prior, 'prior draft is immutable');
      const originalFacts = before.pages.find(page => page.id === id).sections.find(section => section.id === 'facts');
      if (originalFacts) for (const row of originalFacts.items) assert.ok(facts(doc, id).some(item => JSON.stringify(item) === JSON.stringify(row)), 'existing languages/custom facts remain');
      doc = edit(doc, id, 'practicalInfo.priceEUR', undefined);
      doc = roundTrip(doc);
      const html = render(doc, id);
      assert.ok(!html.includes('654 EUR'));
      assert.ok(html.includes('987 MAD'));
      assert.ok(html.includes('321 USD'));
      doc = edit(doc, id, 'practicalInfo.priceEUR', 0);
      assert.ok(render(roundTrip(doc), id).includes('0 EUR'));
    }
  });
}

test('reordered renamed facts use prior semantic descriptions, never fixed slots', () => {
  let doc = createCmsSeed();
  const id = 'our-fez-tours';
  for (const [currency, value] of Object.entries(prices)) doc = edit(doc, id, `practicalInfo.price${currency}`, value);
  const rows = facts(doc, id);
  rows.forEach((row, index) => { row.title = text(`OWNER LABEL ${index}`); });
  rows.reverse();
  const owner = { title: text('OWNER CUSTOM FACT'), description: text('OWNER CUSTOM VALUE') };
  rows.unshift(owner);
  const previous = JSON.stringify(doc);
  for (const field of ['duration', 'groupSize', 'departure']) {
    const old = doc.products.find(product => product.id === id).practicalInfo[field];
    const bound = facts(doc, id).find(row => JSON.stringify(row.description) === JSON.stringify(old));
    assert.ok(bound);
    const title = structuredClone(bound.title);
    doc = edit(doc, id, `practicalInfo.${field}.en`, `NEW ${field}`);
    assert.deepEqual(facts(doc, id).find(row => row.description.en === `NEW ${field}`).title, title);
  }
  for (const [currency, value] of Object.entries(prices)) {
    const row = facts(doc, id).find(row => row.description.en === `${value} ${currency}`);
    const title = structuredClone(row.title);
    doc = edit(doc, id, `practicalInfo.price${currency}`, value + 1);
    assert.deepEqual(facts(doc, id).find(row => row.description.en === `${value + 1} ${currency}`).title, title);
  }
  assert.deepEqual(facts(doc, id)[0], owner);
  assert.equal(rows[0], owner);
  assert.ok(previous.includes('987 MAD'));
  roundTrip(doc);
});

test('semantic titles match when a fact description is independently overridden', () => {
  let doc = createCmsSeed();
  const id = 'daytrip-chefchaouen';
  const duration = facts(doc, id)[0];
  duration.description = text('OWNER DURATION OVERRIDE');
  facts(doc, id).reverse();
  doc = edit(doc, id, 'practicalInfo.duration.en', 'ENTITY DURATION UPDATE');
  assert.equal(facts(doc, id).length, 4);
  const row = facts(doc, id).find(row => row.title.en === 'Duration');
  assert.equal(row.description.en, 'ENTITY DURATION UPDATE');
  assert.equal(row.description.fr, 'OWNER DURATION OVERRIDE');
  assert.equal(row.description.es, 'OWNER DURATION OVERRIDE');
  roundTrip(doc);
});

for (const type of ['list', 'quote', 'heading', 'link']) {
  test(`custom ${type} blocks detach the complete prose section without erasing locales`, () => {
    for (const [root, id, field, sectionId] of [
      ['products', 'our-fez-tours', 'fullDescription', 'overview'],
      ['products', 'our-fez-tours', 'meetingPointDetails', 'meeting'],
      ['products', 'our-fez-tours', 'cancellationPolicy', 'cancel'],
      ['blogPosts', createCmsSeed().blogPosts[0].id, 'content', 'content'],
      ['blogPosts', createCmsSeed().blogPosts[0].id, 'excerpt', 'excerpt'],
    ]) {
      const before = createCmsSeed();
      const page = before.pages.find(page => page.id === id);
      let section = page.sections.find(section => section.id === sectionId);
      if (!section) { section = { id: sectionId, type: 'richText', variant: 'panel', enabled: true, blocks: [] }; page.sections.push(section); }
      const payload = { en: 'OWNER EN COPY', fr: 'OWNER FR COPY', es: 'OWNER ES COPY' };
      const block = type === 'list' ? { type, items: Object.fromEntries(Object.entries(payload).map(([locale, value]) => [locale, [value]])) } : { type, text: payload, ...(type === 'link' ? { href: 'https://example.org/owner-link' } : {}) };
      section.blocks = [{ type: 'paragraph', text: text('OWNER INTRO') }, block];
      const snapshot = structuredClone(section);
      const prior = JSON.stringify(before);
      const after = roundTrip(setEditorPath(before, [root, id, field, 'en'], 'NEW ENTITY ENGLISH PROSE'));
      assert.deepEqual(after.pages.find(page => page.id === id).sections.find(section => section.id === sectionId), snapshot);
      assert.equal(JSON.stringify(before), prior);
      for (const locale of ['en', 'fr', 'es']) assert.ok(render(after, id, locale).includes(payload[locale]));
    }
  });
}

test('bound paragraphs still update English and preserve untouched locales when paragraph counts change', () => {
  const before = createCmsSeed();
  const id = 'our-fez-tours';
  const section = before.pages.find(page => page.id === id).sections.find(section => section.id === 'overview');
  section.blocks[0].text.fr = 'OWNER FRENCH PARAGRAPH';
  section.blocks[0].text.es = 'OWNER SPANISH PARAGRAPH';
  const untouched = section.blocks.map(block => ({ fr: block.text.fr, es: block.text.es }));
  let after = edit(before, id, 'fullDescription.en', 'NEW FIRST\n\nNEW SECOND\n\nNEW THIRD');
  after = edit(after, id, 'fullDescription.en', 'SHORTER ENGLISH');
  after = roundTrip(after);
  const blocks = after.pages.find(page => page.id === id).sections.find(section => section.id === 'overview').blocks;
  for (const [index, value] of untouched.entries()) {
    assert.equal(blocks[index].text.fr, value.fr);
    assert.equal(blocks[index].text.es, value.es);
  }
  assert.ok(render(after, id).includes('SHORTER ENGLISH'));
  assert.ok(!render(after, id).includes('NEW SECOND'));
  assert.ok(render(after, id, 'fr').includes('OWNER FRENCH PARAGRAPH'));
});

function teamFixture() {
  const doc = createCmsSeed();
  doc.pages.find(page => page.id === 'about').sections.push({ id: 'team-safety', type: 'team', variant: 'story', enabled: true, teamIds: doc.teamMembers.map(member => member.id) });
  return doc;
}
for (const wholeCollection of [false, true]) {
  test(`safe arbitrary team avatar URLs register and render (${wholeCollection ? 'collection' : 'field'} edit)`, () => {
    const before = teamFixture();
    const prior = JSON.stringify(before);
    const src = 'https://example.org/new-owner-avatar.jpg';
    const id = before.teamMembers[0].id;
    const after = roundTrip(wholeCollection
      ? setEditorPath(before, ['teamMembers'], before.teamMembers.map(member => member.id === id ? { ...member, avatarUrl: src } : member))
      : setEditorPath(before, ['teamMembers', id, 'avatarUrl'], src));
    const media = after.media.find(media => media.src === src);
    assert.ok(media);
    assert.ok(render(after, 'about').includes(src));
    assert.equal(JSON.stringify(before), prior);
    assert.equal(after.media.filter(media => media.src === src).length, 1);
    const repeat = setEditorPath(after, ['teamMembers', id, 'avatarUrl'], src);
    assert.equal(repeat.media.filter(media => media.src === src).length, 1);
  });
}

test('media source replacements update canonical raw URLs and preserve stable image references', () => {
  for (const wholeCollection of [false, true]) {
    const before = teamFixture();
    const row = before.media[0];
    const old = row.src;
    const src = 'https://example.org/replaced-library-image.jpg';
    before.products[0].image = old;
    before.products[0].galleryImages = [old];
    before.blogPosts[0].coverImage = old;
    before.teamMembers[0].avatarUrl = old;
    before.siteSettings.heroImage = old;
    const gallery = before.pages.find(page => page.id === before.products[0].id).sections.find(section => section.id === 'gallery');
    gallery.images[0] = { mediaId: row.id, alt: text('OWNER GALLERY ALT') };
    const cover = before.pages.find(page => page.id === before.blogPosts[0].id).sections.find(section => section.id === 'cover');
    cover.images[0] = { mediaId: row.id, alt: text('OWNER COVER ALT') };
    before.pages.find(page => page.id === 'about').sections.push({ id: 'stable-photo', type: 'gallery', variant: 'grid', enabled: true, images: [{ mediaId: row.id, alt: text('STABLE PHOTO') }] });
    const prior = JSON.stringify(before);
    const after = roundTrip(wholeCollection
      ? setEditorPath(before, ['media'], before.media.map(media => media.id === row.id ? { ...media, src } : media))
      : setEditorPath(before, ['media', row.id, 'src'], src));
    assert.equal(after.media.find(media => media.id === row.id).src, src);
    assert.equal(after.products[0].image, src);
    assert.deepEqual(after.products[0].galleryImages, [src]);
    assert.equal(after.blogPosts[0].coverImage, src);
    assert.equal(after.teamMembers[0].avatarUrl, src);
    assert.equal(after.siteSettings.heroImage, src);
    assert.deepEqual(after.pages, before.pages, 'library source edits preserve every stable placement, custom photo and alt');
    assert.equal(after.media.length, before.media.length, 'old URLs are not re-registered');
    assert.equal(after.pages.find(page => page.id === 'about').sections.find(section => section.id === 'stable-photo').images[0].mediaId, row.id);
    assert.ok(render(after, 'about').includes(src));
    assert.ok(render(after, after.products[0].id).includes(src));
    assert.ok(render(after, after.blogPosts[0].id).includes(src));
    assert.equal(JSON.stringify(before), prior);
    assert.deepEqual(after.legacy, before.legacy);
  }
});

test('site hero safe URLs register without changing the prior draft; unsafe URLs do not register', () => {
  const before = createCmsSeed();
  const prior = JSON.stringify(before);
  const src = 'https://example.org/owner-hero.jpg';
  const after = roundTrip(setEditorPath(before, ['siteSettings', 'heroImage'], src));
  assert.ok(after.media.some(media => media.src === src));
  assert.equal(JSON.stringify(before), prior);
  for (const unsafe of ['javascript:alert(1)', 'data:image/png;base64,AAAA', '/api/admin/media/private.png']) {
    const rejected = setEditorPath(before, ['teamMembers', before.teamMembers[0].id, 'avatarUrl'], unsafe);
    assert.equal(validateCmsDocument(rejected).valid, false);
    assert.ok(!rejected.media.some(media => media.src === unsafe));
  }
});

test('raw URL reference inventory includes every canonical string-backed image field, not archives', () => {
  const doc = createCmsSeed();
  const urls = ['https://example.org/product.jpg', 'https://example.org/gallery.jpg', 'https://example.org/blog.jpg', 'https://example.org/team.jpg', 'https://example.org/hero.jpg'];
  doc.products[0].image = urls[0];
  doc.products[0].galleryImages = [urls[1]];
  doc.blogPosts[0].coverImage = urls[2];
  doc.teamMembers[0].avatarUrl = urls[3];
  doc.siteSettings.heroImage = urls[4];
  doc.legacy.teamMembers = structuredClone(doc.legacy.teamMembers);
  doc.legacy.teamMembers[0].avatarUrl = 'https://example.org/archive-only.jpg';
  const refs = projection.referencedMediaUrls(doc);
  for (const url of urls) assert.ok(refs.has(url), url);
  assert.ok(!refs.has('https://example.org/archive-only.jpg'));
});

for (const consumer of ['product', 'gallery', 'blog', 'team']) {
  test(`removal of media referenced only by a canonical ${consumer} URL fails validation without resurrection`, () => {
    const before = createCmsSeed();
    const row = { id: 'raw-only-safety', src: 'https://example.org/raw-only-safety.jpg', alt: text('RAW ONLY') };
    before.media.push(row);
    if (consumer === 'product') before.products[0].image = row.src;
    if (consumer === 'gallery') before.products[0].galleryImages = [row.src];
    if (consumer === 'blog') before.blogPosts[0].coverImage = row.src;
    if (consumer === 'team') before.teamMembers[0].avatarUrl = row.src;
    roundTrip(before);
    const prior = JSON.stringify(before);
    const after = setEditorPath(before, ['media'], before.media.filter(media => media.id !== row.id));
    assert.ok(!after.media.some(media => media.src === row.src), 'removed source is never re-registered under another ID');
    const result = validateCmsDocument(after);
    assert.equal(result.valid, false);
    assert.match(result.errors.join('\n'), /unknown media source/);
    assert.equal(JSON.stringify(before), prior);
    assert.equal(validateCmsDocument({ ...before, media: after.media }).valid, false, 'direct/import payloads use the same protection');
  });
}

test('unreferenced media can still be removed', () => {
  const before = createCmsSeed();
  const row = { id: 'unreferenced-safety', src: 'https://example.org/unreferenced-safety.jpg', alt: text('UNREFERENCED') };
  before.media.push(row);
  const after = roundTrip(setEditorPath(before, ['media'], before.media.filter(media => media.id !== row.id)));
  assert.ok(!after.media.some(media => media.id === row.id));
  assert.ok(before.media.some(media => media.id === row.id));
});
