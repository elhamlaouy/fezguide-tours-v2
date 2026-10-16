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
const { setEditorPath } = await import('../src/cms/editor-controls.ts');
const text = value => ({ en: value, fr: value, es: value });
const render = (doc, id, language = 'en') => renderToStaticMarkup(createElement(PageRenderer, {
  document: doc, page: doc.pages.find(page => page.id === id), language, onNavigate() {}, onBook() {},
}));
const edit = (doc, id, field, value) => setEditorPath(doc, ['products', id, ...field.split('.')], value);
const { validateCmsDocument } = await import('../src/cms/schema.ts');

test('accepted external image URLs register library references without mutating the prior draft', () => {
 const before=createCmsSeed();const mediaCount=before.media.length;
 const src='https://example.org/review-photo.jpg';
 const after=edit(before,'our-fez-tours','galleryImages',[src]);
 assert.equal(validateCmsDocument(after).valid,true);
 assert.equal(before.media.length,mediaCount);
 const row=after.media.find(media=>media.src===src);assert.ok(row);
 assert.equal(after.pages.find(page=>page.id==='our-fez-tours').sections.find(section=>section.id==='gallery').images[0].mediaId,row.id);
 assert.ok(render(after,'our-fez-tours').includes(src));
});

test('unavailable locales remove content card/product/action targets and choose a working x-default', async () => {
 const document=createCmsSeed();document.pages.find(page=>page.id==='our-fez-tours').title.es='';
 const html=render(document,'fez','es');
 assert.doesNotMatch(html,/data-page-id="our-fez-tours"/);
 const page=document.pages.find(page=>page.id==='about');page.title={en:'',fr:'',es:'Solo español'};
 const {routeSeoHead}=await import('../src/cms/seo.ts');
 const {resolveRoute}=await import('../src/cms/routing.ts');
 const head=routeSeoHead(document,resolveRoute(new URL('https://canonical.example/es/about'),document),'https://canonical.example');
 assert.match(head,/hreflang="x-default" href="https:\/\/canonical\.example\/es\/about"/);
 assert.doesNotMatch(head,/hreflang="en"/);
});

test('all product long-form families propagate for seeded and newly authored products without resetting page copy', () => {
  for (const id of ['our-fez-tours', 'daytrip-chefchaouen', 'new-experience']) {
    let doc = createCmsSeed();
    if (id === 'new-experience') {
      doc.products.push({ ...structuredClone(doc.products[0]), id, title: text(id) });
      doc.pages.push({ id, slug: id, kind: 'product', enabled: true, productId: id, parentId: doc.products[0].pageId, title: text(id), seo: { title: text(id), description: text('') }, sections: [] });
    }
    const page = doc.pages.find(page => page.id === id);
    page.sections.push({ id: 'custom-owner-story', type: 'richText', variant: 'story', enabled: true, blocks: [{ type: 'paragraph', text: text('OWNER CUSTOM STORY') }] });
    const fields = {
      highlights: text(['ENTITY HIGHLIGHT']), included: text(['ENTITY INCLUDED']), excluded: text(['ENTITY EXCLUDED']),
      whatToBring: text(['ENTITY BRING']), suitableFor: text(['ENTITY SUITABLE']), meetingPointDetails: text('ENTITY MEETING'), cancellationPolicy: text('ENTITY CANCEL'),
      itinerary: [{ time: '09:37', title: text('ENTITY STOP'), description: text('ENTITY STOP DESCRIPTION'), badge: text('ENTITY BADGE') }],
      'practicalInfo.duration': text('ENTITY DURATION'), 'practicalInfo.departure': text('ENTITY DEPARTURE'), 'practicalInfo.groupSize': text('ENTITY GROUP'),
      'practicalInfo.priceMAD': 987, 'practicalInfo.priceEUR': 654, 'practicalInfo.priceUSD': 321,
    };
    for (const [field, value] of Object.entries(fields)) {
      doc = edit(doc, id, field, value);
      const html = render(doc, id);
      const sentinel = typeof value === 'number' ? String(value) : Array.isArray(value) ? 'ENTITY STOP' : Array.isArray(value.en) ? value.en[0] : value.en;
      assert.ok(html.includes(sentinel), `${id}.${field}`);
      assert.ok(html.includes('OWNER CUSTOM STORY'));
    }
    const photo = doc.media.find(media => !doc.products.find(product => product.id === id).galleryImages?.includes(media.src));
    doc = edit(doc, id, 'galleryImages', [photo.src]);
    assert.ok(render(doc, id).includes(photo.src));
    const overview = doc.pages.find(page => page.id === id).sections.find(section => section.id === 'overview');
    if (overview) overview.blocks = [{ type: 'paragraph', text: text('OWNER OVERVIEW OVERRIDE') }];
    doc = edit(doc, id, 'highlights.en', ['UNRELATED HIGHLIGHT EDIT']);
    const html = render(doc, id);
    if (overview) assert.ok(html.includes('OWNER OVERVIEW OVERRIDE'));
    assert.ok(html.includes('UNRELATED HIGHLIGHT EDIT'));
    assert.ok(html.includes('OWNER CUSTOM STORY'));
    const result = validateCmsDocument(doc);
    assert.equal(result.valid, true, result.errors.join('\n'));
  }
});

test('blog entity edits reach listing and detail, preserve custom content, and respect deletion visibility', () => {
  let doc = createCmsSeed();
  const post = doc.blogPosts[0];
  const id = post.id;
  const fields = { title: text('BLOG TITLE SENTINEL'), excerpt: text('BLOG EXCERPT SENTINEL'), content: text('BLOG CONTENT SENTINEL'), category: text('BLOG CATEGORY SENTINEL'), author: 'BLOG AUTHOR SENTINEL', date: '2026-11-07', readTime: text('BLOG READTIME SENTINEL'), coverImage: doc.media[0].src, slug: 'changed-blog-route' };
  for (const [field, value] of Object.entries(fields)) doc = setEditorPath(doc, ['blogPosts', id, field], value);
  const detail = render(doc, id);
  const listing = render(doc, 'blog');
  for (const field of ['title', 'excerpt', 'category', 'readTime']) {
    assert.ok(detail.includes(fields[field].en), `detail.${field}`);
    assert.ok(listing.includes(fields[field].en), `listing.${field}`);
  }
  for (const field of ['content', 'author', 'date', 'coverImage']) assert.ok(detail.includes(fields[field].en ?? fields[field]), field);
  assert.equal(doc.pages.find(page => page.id === id).slug, fields.slug);
  doc.pages.find(page => page.id === id).sections.find(section => section.id === 'content').blocks = [{ type: 'paragraph', text: text('OWNER BLOG CONTENT') }];
  doc = setEditorPath(doc, ['blogPosts', id, 'excerpt', 'en'], 'UNRELATED BLOG EXCERPT');
  assert.ok(render(doc, id).includes('OWNER BLOG CONTENT'));
  assert.ok(!render(doc, id).includes('BLOG CONTENT SENTINEL'));
  doc = setEditorPath(doc, ['blogPosts', id, 'published'], false);
  assert.equal(render(doc, id), '');
  assert.ok(!render(doc, 'blog').includes('BLOG TITLE SENTINEL'));
  doc = setEditorPath(doc, ['blogPosts'], doc.blogPosts.filter(post => post.id !== id));
  assert.equal(render(doc, id), '');
  assert.ok(!render(doc, 'blog').includes('BLOG TITLE SENTINEL'));
});

test('a product description authored through the document editor reaches its public detail', () => {
  const before = createCmsSeed();
  const old = before.products.find(product => product.id === 'our-fez-tours').fullDescription.en;
  const doc = edit(before, 'our-fez-tours', 'fullDescription.en', 'ENTITY DESCRIPTION SENTINEL');
  const html = render(doc, 'our-fez-tours');
  assert.ok(html.includes('ENTITY DESCRIPTION SENTINEL'));
  assert.ok(!html.includes(old.split('\n\n')[0]));
  assert.equal(render(doc, 'our-fez-tours', 'fr'), render(before, 'our-fez-tours', 'fr'));
  assert.deepEqual(doc.legacy, before.legacy, 'archive is never rewritten by canonical edits');
});
