import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { registerHooks } from 'node:module';
import { register } from 'tsx/esm/api';
register();
registerHooks({ load(url, context, next) { return url.endsWith('.css') ? { format: 'module', source: 'export default "";', shortCircuit: true } : next(url, context); } });
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { validateCmsDocument } = await import('../src/cms/schema.ts');
const { publicCmsDocument } = await import('../worker/cms-routes.ts');
const { rewriteRouteHtml } = await import('../worker/seo.ts');
const { safeJson } = await import('../src/cms/seo.ts');
const { resolveRoute, pagePath } = await import('../src/cms/routing.ts');
const { PageRenderer } = await import('../src/cms/PageRenderer.tsx');
await (await import('../src/cms/ApprovedPageRenderer.tsx')).preloadApprovedLayouts();
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { PublicPageSwitch } = await import('../src/App.tsx');
const template = '<html><head></head><body><div id="root"></div></body></html>';
export const outputFor = (document, path = '/') => {
  const route = resolveRoute(new URL(`https://example.test${path}`), document);
  const html = rewriteRouteHtml(template, document, route, 'https://example.test');
  const payload = JSON.parse(/<script id="cms-published-document" type="application\/json">([\s\S]*?)<\/script>/.exec(html)[1]);
  return { html, payload, document: payload.document, route };
};
const render = (document, id, language) => renderToStaticMarkup(createElement(PageRenderer, { document, page: document.pages.find(page => page.id === id), language, onNavigate() {}, onBook() {} }));

test('Worker produces a valid explicit route-scoped snapshot with materially less HTML and validation input', () => {
  const original = publicCmsDocument(createCmsSeed());
  const before = structuredClone(original);
  const output = outputFor(original);
  assert.deepEqual(output.payload.scope, { version: 1, pageId: 'home', language: 'en' });
  assert.equal(validateCmsDocument(output.document).valid, true);
  assert.deepEqual(output.document.pages.find(page => page.id === 'home'), original.pages.find(page => page.id === 'home'));
  assert.deepEqual(output.document.products, original.products, 'all current canonical prices survive');
  assert.deepEqual(original, before, 'projection must not mutate storage/API source');
  const previous = { ...original, legacy: { ...original.legacy, tours: original.legacy.tours.filter(tour => !original.products.some(product => product.id === tour.id)), customPages: [], blogPosts: [], teamMembers: [], faqs: [] } };
  // Same real Worker output, SEO and escaping: only replace its new bootstrap with the previous complete one.
  const baseline = output.html.replace(/(<script id="cms-published-document" type="application\/json">)[\s\S]*?(<\/script>)/, (_match, open, close) => `${open}${safeJson(previous)}${close}`);
  assert.ok(Buffer.byteLength(output.html) < Buffer.byteLength(baseline) * .8, 'at least 20% smaller raw startup HTML');
  assert.ok(gzipSync(output.html).length < gzipSync(baseline).length * .85, 'at least 15% smaller actual gzipped output');
  console.log(JSON.stringify({ baselineRaw: Buffer.byteLength(baseline), scopedRaw: Buffer.byteLength(output.html), baselineGzip: gzipSync(baseline).length, scopedGzip: gzipSync(output.html).length, fullSections: original.pages.reduce((n,p)=>n+p.sections.length,0), scopedSections: output.document.pages.reduce((n,p)=>n+p.sections.length,0) }));
});

test('each of 27 public pages in every locale renders exactly like the full published revision', () => {
  const original = publicCmsDocument(createCmsSeed());
  let count = 0;
  for (const page of original.pages) for (const language of ['en', 'fr', 'es']) {
    const path = pagePath(original, page.id, language);
    const output = outputFor(original, path);
    assert.equal(validateCmsDocument(output.document).valid, true, path);
    assert.equal(render(output.document, page.id, language), render(original, page.id, language), path);
    count++;
  }
  assert.equal(count, 81);
});

test('owner edits, custom blanks, arbitrary paths and independent gallery identities preserve every localized renderer', () => {
  const original = createCmsSeed();
  const copy = text => ({ en: text, fr: text, es: text });
  original.products.forEach((product, index) => { product.price = { amount: 703 + index, currency: 'USD', basis: 'vehicle' }; product.title = copy(`CURRENT PRODUCT ${index}`); });
  const custom = original.pages.find(page => page.id === 'page-bespoke-itinerary');
  custom.source = 'owner-created'; custom.slug = 'owner-route'; custom.seo.canonical = '/preferred-owner-route';
  custom.sections.find(section => section.type === 'hero').description = copy('');
  custom.sections.find(section => section.id === 'content').blocks = [];
  custom.sections.find(section => section.id === 'highlights').blocks = [];
  const added = structuredClone(custom);
  added.id = 'owner-added-page'; added.slug = 'brand-new-owner-path'; delete added.seo.canonical;
  added.title = copy('NEW OWNER PAGE');
  original.pages.push(added);
  original.pages.find(page => page.id === 'about').sections = [];
  const article = original.pages.find(page => page.id === 'food-tasting-walk');
  article.sections = article.sections.filter(section => section.id !== 'story-1');
  article.sections.find(section => section.id === 'photos-1').images[0].alt = copy('INDEPENDENT GALLERY');
  article.sections.reverse();
  const overview = original.pages.find(page => page.id === 'food-tours').sections.find(section => section.id === 'overview');
  overview.cards.forEach(card => { card.title = copy('OWNER CARD'); card.description = copy(''); });
  // No card/archive fallback: off-route editorial summaries must retain their first paragraph.
  const fallbackId = 'tips-practical';
  for (const page of original.pages) for (const section of page.sections) if (section.type === 'cardGrid') section.cards = section.cards.filter(card => card.pageId !== fallbackId);
  original.legacy.tours = original.legacy.tours.filter(tour => tour.id !== fallbackId);
  assert.equal(validateCmsDocument(original).valid, true);
  for (const page of original.pages) for (const language of ['en', 'fr', 'es']) {
    const path = pagePath(original, page.id, language);
    const output = outputFor(original, path);
    assert.equal(validateCmsDocument(output.document).valid, true, path);
    assert.equal(render(output.document, page.id, language), render(original, page.id, language), path);
  }
});

test('unavailable locales remain a real 404 rather than an off-scope loading screen', async () => {
  const { Window } = await import('happy-dom');
  const window = new Window({ url: 'https://example.test/es/about' });
  globalThis.window = window; globalThis.document = window.document;
  try {
    const original = createCmsSeed();
    original.pages.find(page => page.id === 'about').title.es = '';
    const output = outputFor(original, '/es/about');
    const script = document.createElement('script'); script.id = 'cms-published-document'; script.textContent = JSON.stringify(output.payload); document.body.append(script);
    const parsed = (await import('../src/cms/public-document.ts')).readPublishedSnapshot();
    assert.ok(parsed);
    const markup = renderToStaticMarkup(createElement(PublicPageSwitch, { document: parsed, pageId: 'about', language: 'es', onNavigate() {}, onBook() {}, legacy: 'SOURCE MUST NOT APPEAR' }));
    assert.match(markup, /404/);
    assert.doesNotMatch(markup, /SOURCE MUST NOT APPEAR/);
    assert.match(output.html, /404/);
  } finally { await window.happyDOM.close(); delete globalThis.window; delete globalThis.document; }
});

test('hidden and empty publications remain schema-checked public projections with no private text or source resurrection', async () => {
  const { Window } = await import('happy-dom');
  const window = new Window({ url: 'https://example.test/food-tasting-walk' });
  globalThis.window = window; globalThis.document = window.document;
  try {
    const original = createCmsSeed();
    original.pages.find(page => page.id === 'food-tasting-walk').title = { en: 'PRIVATE DRAFT SENTINEL', fr: 'PRIVATE DRAFT SENTINEL', es: 'PRIVATE DRAFT SENTINEL' };
    original.pages.find(page => page.id === 'food-tasting-walk').enabled = false;
    for (const empty of [false, true]) {
      if (empty) original.pages.forEach(page => { page.enabled = false; });
      const projection = publicCmsDocument(original);
      const before = structuredClone(projection);
      const output = outputFor(projection, '/food-tasting-walk');
      assert.deepEqual(output.payload.scope, { version: 1, pageId: null, language: 'en' });
      assert.doesNotMatch(output.html, /PRIVATE DRAFT SENTINEL/);
      assert.match(output.html, /404/);
      const script = document.getElementById('cms-published-document') ?? document.body.appendChild(document.createElement('script'));
      script.id = 'cms-published-document'; script.textContent = JSON.stringify(output.payload);
      const parsed = (await import('../src/cms/public-document.ts')).readPublishedSnapshot();
      assert.ok(parsed, 'empty publication is authoritative, not a missing API');
      assert.deepEqual(projection, before, 'no projection/source mutation');
      if (empty) assert.equal(parsed.pages.length, 0);
    }
  } finally { await window.happyDOM.close(); delete globalThis.window; delete globalThis.document; }
});
