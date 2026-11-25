import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { register as registerTsx } from 'tsx/esm/api';

const loaderDirectory = mkdtempSync(join(tmpdir(), 'cms-admin-loader-'));
const loaderPath = join(loaderDirectory, 'css-loader.mjs');
process.once('exit', () => rmSync(loaderDirectory, { recursive: true, force: true }));
writeFileSync(loaderPath, `export async function load(url, context, nextLoad) {
  if (url.endsWith('.css')) return { format: 'module', source: 'export default {};', shortCircuit: true };
  return nextLoad(url, context);
}
`);
registerTsx();
register(pathToFileURL(loaderPath));

const { Window } = await import('happy-dom');
const window = new Window({ url: 'https://fez.example/admin' });
const assign = (key, value) => {
  try { globalThis[key] = value; }
  catch { Object.defineProperty(globalThis, key, { configurable: true, writable: true, value }); }
};
assign('window', window);
assign('document', window.document);
assign('navigator', window.navigator);
for (const key of Object.getOwnPropertyNames(window)) {
  if (key in globalThis) continue;
  if (typeof window[key] === 'function' && /^[A-Z]/.test(key)) assign(key, window[key]);
}
assign('getComputedStyle', window.getComputedStyle.bind(window));
assign('requestAnimationFrame', window.requestAnimationFrame.bind(window));
assign('cancelAnimationFrame', window.cancelAnimationFrame.bind(window));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// Most tests are about behaviour, not timing: settle the live preview immediately. One test restores the real delay.
globalThis.__cmsPreviewDelayMs = 0;

const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { act, createElement } = React;
const { AdminApp } = await import('../src/admin/AdminApp.tsx');
await (await import('../src/cms/ApprovedPageRenderer.tsx')).preloadApprovedLayouts();
const { validateCmsDocument } = await import('../src/cms/schema.ts');
const { DEFAULT_SITE_SETTINGS } = await import('../src/data/translations.ts');

const text = (en = '') => ({ en, fr: Array.isArray(en) ? [...en] : en, es: Array.isArray(en) ? [...en] : en });
const theme = { colors: { primary: '#005F5A', accent: '#C84B31', background: '#FAF8F5', text: '#1C2524' }, font: 'system', fontScale: 1, containerWidth: 1280, spacing: 'comfortable', radius: 'rounded', buttonVariant: 'solid', cardVariant: 'outlined' };
const SECTION_TYPES = ['hero', 'richText', 'cardGrid', 'productGrid', 'gallery', 'benefits', 'cta', 'reviews', 'faq', 'team', 'itinerary', 'inclusions', 'practicalInfo', 'contact'];
const section = (id, type, extra) => ({ id, type, enabled: true, title: text(`${type} title`), ...extra });
function cmsDoc(paragraph = 'Hello paragraph', title = 'Home title') {
  return {
    schemaVersion: 1,
    siteSettings: structuredClone(DEFAULT_SITE_SETTINGS),
    theme: structuredClone(theme),
    navigation: [],
    footer: { text: text('Footer'), links: [] },
    uiCopy: {},
    pages: [{
      id: 'home', slug: 'home', kind: 'landing', enabled: true, title: text(title),
      seo: { title: text('Home'), description: text('Home description') },
      sections: [{ id: 'intro', type: 'richText', enabled: true, variant: 'story', blocks: [{ type: 'paragraph', text: text(paragraph) }] }],
    }],
    products: [], editorialEntries: [], blogPosts: [], teamMembers: [], faqs: [], media: [], reviews: [],
    legacy: { tours: [], customPages: [], blogPosts: [], teamMembers: [], faqs: [], siteSettings: structuredClone(DEFAULT_SITE_SETTINGS) },
  };
}
function allTypesDocument() {
  const doc = cmsDoc('Coverage paragraph', 'Coverage title');
  doc.pages[0].sections = [
    section('hero', 'hero', { variant: 'banner', links: [] }),
    section('rich-text', 'richText', { variant: 'story', blocks: [{ type: 'paragraph', text: text('Rich body') }] }),
    section('card-grid', 'cardGrid', { variant: 'overview', cards: [] }),
    section('product-grid', 'productGrid', { variant: 'overview', productIds: [] }),
    section('gallery', 'gallery', { variant: 'grid', images: [] }),
    section('benefits', 'benefits', { variant: 'grid', items: [] }),
    section('cta', 'cta', { variant: 'banner', links: [] }),
    section('reviews', 'reviews', { variant: 'grid', reviewIds: [] }),
    section('faq', 'faq', { variant: 'list', faqIds: [] }),
    section('team', 'team', { variant: 'grid', teamIds: [] }),
    section('itinerary', 'itinerary', { variant: 'list', stops: [] }),
    section('inclusions', 'inclusions', { variant: 'list', included: text([]), excluded: text([]) }),
    section('practical-info', 'practicalInfo', { variant: 'facts', items: [] }),
    section('contact', 'contact', { variant: 'banner', links: [] }),
  ];
  return doc;
}
const content = (doc, version = 2) => ({ version, draftRevision: version, publishedRevision: 1, document: doc });

let root;
let calls;
test.after(async () => {
  if (root) await act(async () => root.unmount());
  await window.happyDOM.close();
});
function installFetch(handler) {
  calls = [];
  const fetchMock = async (input, init = {}) => {
    const url = String(input);
    const method = init.method ?? 'GET';
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
    calls.push({ url, method, body, credentials: init.credentials });
    const result = await handler({ url, method, body });
    return new Response(JSON.stringify(result.body ?? {}), { status: result.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  };
  assign('fetch', fetchMock);
  window.fetch = fetchMock;
}
async function settle() {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
}
async function render(language = 'en') {
  if (root) await act(async () => root.unmount());
  document.body.replaceChildren();
  const host = window.document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root.render(createElement(AdminApp, { language, onClose() {} })); });
  await settle();
}
async function waitFor(predicate) {
  const start = Date.now();
  while (Date.now() - start < 2000) {
    const found = predicate();
    if (found) return found;
    await settle();
  }
  throw new Error(`timed out: ${window.document.body.textContent?.slice(0, 400)}`);
}
const WORKSPACE_TABS = ['sections', 'page', 'content', 'photos', 'appearance', 'settings', 'history'];
// The editor mounts only the open workspace and opens collection items on demand. Go where the control lives.
async function reveal(selector) {
  const has = () => window.document.querySelector(selector);
  if (has()) return;
  for (const tab of WORKSPACE_TABS) {
    await act(async () => { window.document.querySelector(`[data-workspace-tab="${tab}"]`)?.click(); });
    await openLazy(has);
    if (has()) return;
    // A tour mounts one tab's fields at a time: open each tab of the open tours.
    for (const tourTab of ['basics', 'price', 'itinerary', 'included', 'photos', 'policies']) {
      const buttons = [...window.document.querySelectorAll(`[data-tour-tab="${tourTab}"]`)];
      if (!buttons.length) break;
      await act(async () => { for (const button of buttons) button.click(); });
      await openLazy(has);
      if (has()) return;
    }
    for (const panel of ['photos', 'layout', 'advanced', 'content']) {
      if (!window.document.querySelector(`[data-section-panel="${panel}"]`)) break;
      await act(async () => { window.document.querySelector(`[data-section-panel="${panel}"]`).click(); });
      await openLazy(has);
      if (has()) return;
    }
  }
}
async function openLazy(done = () => false) {
  for (let round = 0; round < 4 && !done(); round += 1) {
    const closed = [...window.document.querySelectorAll('details[data-lazy]:not([open])')];
    if (!closed.length) return;
    await act(async () => { for (const details of closed) { details.open = true; details.dispatchEvent(new window.Event('toggle')); } });
  }
}
async function typeInto(selector, value) {
  await reveal(selector);
  const el = await waitFor(() => window.document.querySelector(selector));
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  await settle(); // let the (debounced, deferred) live preview catch up
}
async function click(selector) {
  await reveal(selector);
  const el = await waitFor(() => window.document.querySelector(selector));
  await act(async () => { el.click(); });
  await settle();
  await settle();
}
async function choose(selector, value) {
  await reveal(selector);
  const el = await waitFor(() => window.document.querySelector(selector));
  const proto = window.HTMLSelectElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  await settle();
}
// Preview content lives in a real browsing context, not hidden duplicate editor DOM.
function previewQuery(selector) {
  const frame = document.querySelector('[data-preview] iframe');
  assert.ok(frame, 'isolated live preview iframe missing');
  assert.ok(frame.contentDocument, 'same-origin preview document missing');
  return selector ? frame.contentDocument.querySelector(selector) : frame.contentDocument.body;
}
const puts = () => calls.filter(call => call.method === 'PUT');
let tail = Promise.resolve();
const serial = (name, fn) => test(name, async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const previous = tail;
  tail = gate;
  await previous;
  try { await fn(); }
  finally { release(); }
});

serial('seeded product category edits and canonical page duplicates save valid relationships', async () => {
 window.confirm=()=>true;
 const {createCmsSeed}=await import('../src/cms/seed.ts');
 const doc=createCmsSeed();doc.pages.find(page=>page.id==='about').seo.canonical='/company';
 // Keep the genuine seeded product/archive relationship, without mounting every unrelated global entity.
 const kept=new Set(['home','fez','day-trips','our-fez-tours','about']);
 doc.pages=doc.pages.filter(page=>kept.has(page.id)).map(page=>({...page,sections:[]}));
 doc.products=doc.products.filter(product=>product.id==='our-fez-tours');
 doc.navigation=doc.navigation.filter(link=>!link.pageId||kept.has(link.pageId));doc.footer.links=doc.footer.links.filter(link=>!link.pageId||kept.has(link.pageId));
 doc.editorialEntries=[];doc.blogPosts=[];doc.teamMembers=[];doc.faqs=[];doc.reviews=[];
 const imageUrls=new Set(doc.products.flatMap(product=>[product.image,...(product.galleryImages??[])]));doc.media=doc.media.filter(media=>imageUrls.has(media.src));
 doc.legacy={...doc.legacy,tours:doc.legacy.tours.filter(tour=>tour.id==='our-fez-tours'),customPages:[],blogPosts:[],teamMembers:[],faqs:[]};
 assert.equal(validateCmsDocument(doc).valid,true);
 let saved;
 installFetch(({url,method,body})=>method==='PUT'?(saved=body.document,{body:{version:3,draftRevision:3,published:false}}):url.endsWith('/revisions')?{body:{revisions:[]}}:{body:content(doc)});
 await render();
 const index=doc.products.findIndex(product=>product.id==='our-fez-tours');
 await choose(`[data-path="products.${index}.pageId"]`,'day-trips');
 await click('[data-page="about"]');await click('[name="duplicate-page"]');
 assert.ok(document.querySelector('[data-page="about-copy"]'));
 await click('[name="save-draft"]');
 assert.equal(validateCmsDocument(saved).valid,true);
 assert.equal(saved.pages.find(page=>page.id==='our-fez-tours').parentId,'day-trips');
 assert.equal(saved.legacy.tours.find(tour=>tour.id==='our-fez-tours').pageId,'day-trips');
 assert.equal(saved.pages.find(page=>page.id==='about-copy').seo.canonical,undefined);
 assert.equal(saved.pages.find(page=>page.id==='about').seo.canonical,'/company');
});

serial('editor uploads, selects and privately previews a new photo without implicit publishing', async () => {
  const doc = cmsDoc();
  doc.pages[0].sections = [section('hero', 'hero', { variant: 'banner', links: [] })];
  const id = 'upload-11111111-1111-4111-8111-111111111111';
  const media = { id, src: `/media/${id}.png`, alt: text('Uploaded image'), width: 1, height: 1, source: 'cms-upload' };
  let saved;
  installFetch(({ url, method, body }) => {
    if (url === '/api/admin/content' && method === 'GET') return { body: content(doc) };
    if (url === '/api/admin/content/revisions') return { body: { revisions: [] } };
    if (url === '/api/admin/media') return { status: 201, body: { media, previewSrc: `/api/admin/media/${id}.png` } };
    if (url === '/api/admin/content/draft') { saved = body.document; return { body: { version: 3, draftRevision: 3, published: false } }; }
    throw new Error(`unexpected ${method} ${url}`);
  });
  await render();
  const input = await waitFor(() => document.querySelector('.cms-admin-upload input[type="file"]'));
  await act(async () => {
    Object.defineProperty(input, 'files', { configurable: true, value: [new File([new Uint8Array([1, 2])], 'test.png', { type: 'image/png' })] });
    input.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  const upload = [...document.querySelectorAll('.cms-admin-upload button')].find(button => button.textContent === 'Upload photo');
  assert.ok(upload);
  await act(async () => upload.click());
  await reveal(`[data-media-pick="${id}"]`);
  await waitFor(() => document.querySelector(`[data-media-pick="${id}"]`));
  assert.equal(document.querySelector(`[data-media-pick="${id}"]`).getAttribute('aria-pressed'), 'true');
  const preview = previewQuery('img');
  assert.equal(preview.getAttribute('src'), `/api/admin/media/${id}.png`);
  assert.equal(puts().length, 0);
  assert.match(document.querySelector('.cms-admin-bar').textContent, /Unsaved changes/);
  await click('button[name="save-draft"]');
  await waitFor(() => saved);
  assert.equal(saved.media[0].src, `/media/${id}.png`);
  assert.equal(saved.pages[0].sections[0].image.mediaId, id);
  assert.equal(calls.some(call => call.url.endsWith('/publish')), false);
  // A saved draft must still use private images after a fresh editor load.
  doc.media = saved.media; doc.pages = saved.pages;
  await render();
  assert.equal(previewQuery('img').getAttribute('src'), `/api/admin/media/${id}.png`);
});

serial('Spanish validation and page/revision errors retain paths with Spanish explanations', async () => {
  installFetch(({ url }) => url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(cmsDoc()) });
  await render('es');
  await typeInto('textarea[data-path="pages.home.title.es"]', 'x'.repeat(501));
  await click('button[name="save-draft"]');
  const errors = await waitFor(() => document.querySelector('[data-field-errors]'));
  // The field is named in words (page → field → language); the raw validator path stays available for support.
  assert.match(errors.textContent, /Página “x+…” › Título › Español: Texto no válido o demasiado largo/);
  assert.doesNotMatch(errors.textContent, /invalid or oversized|document\.pages\[0\]/);
  assert.equal(errors.querySelector('li').dataset.code, 'document.pages[0].title.es: invalid or oversized string');
  assert.equal(errors.querySelector('li').title, 'document.pages[0].title.es: invalid or oversized string');
  assert.equal(puts().length, 0);
  await typeInto('input[name="new-page-id"]', 'INVALID');
  await click('button[name="add-page"]');
  assert.match(document.querySelector('[data-field-errors]').textContent, /Usa solo minúsculas, números y guiones/);
  await click('button[name="rollback"]');
  assert.match(document.querySelector('[data-field-errors]').textContent, /Introduce un número de versión válido/);
});

serial('401 shows sign-in required and stores no token', async () => {
  installFetch(() => ({ status: 401, body: { error: 'unauthorized' } }));
  window.localStorage.clear();
  await render();
  const status = await waitFor(() => document.querySelector('[data-admin-status="unauthorized"]'));
  assert.match(status.textContent, /Sign-in required/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/admin/content');
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[0].credentials, 'same-origin');
  assert.equal(window.localStorage.length, 0);
  assert.equal(document.querySelector('[data-preview]'), null);
});

serial('a section text edit appears in the preview markup', async () => {
  const doc = cmsDoc();
  assert.equal(validateCmsDocument(doc).valid, true);
  installFetch(({ url, method }) => {
    if (url === '/api/admin/content' && method === 'GET') return { body: content(doc) };
    if (url === '/api/admin/content/revisions') return { body: { revisions: [] } };
    throw new Error(`unexpected ${method} ${url}`);
  });
  await render();
  await waitFor(() => document.querySelector('[data-admin-status="ready"]'));
  await typeInto('textarea[data-path="pages.home.sections.intro.blocks.0.text.en"]', 'Edited paragraph');
  await settle();
  const preview = previewQuery();
  assert.ok(preview, 'preview missing');
  assert.match(preview.textContent, /Edited paragraph/);
  assert.doesNotMatch(preview.innerHTML, /dangerouslySetInnerHTML|Edited paragraph<\/textarea>/);
  assert.equal(puts().length, 0);
});

serial('409 reloads the server draft and does not send a second overwrite', async () => {
  const initial = cmsDoc('Hello paragraph', 'Home title');
  const server = cmsDoc('Hello paragraph', 'Server title');
  installFetch(({ url, method, body }) => {
    if (url === '/api/admin/content' && method === 'GET') return { body: content(calls.some(call => call.method === 'PUT') ? server : initial, 4) };
    if (url === '/api/admin/content/revisions') return { body: { revisions: [] } };
    if (url === '/api/admin/content/draft' && method === 'PUT') {
      assert.equal(body.expectedVersion, 4);
      assert.equal(body.document.pages[0].title.en, 'Client edit');
      return { status: 409, body: { error: 'version_conflict' } };
    }
    throw new Error(`unexpected ${method} ${url}`);
  });
  await render();
  await waitFor(() => document.querySelector('[data-admin-status="ready"]'));
  await typeInto('textarea[data-path="pages.home.title.en"]', 'Client edit');
  await click('button[name="save-draft"]');
  const conflict = await waitFor(() => document.querySelector('[data-admin-conflict]'));
  assert.match(conflict.textContent, /conflict/i);
  await settle();
  assert.equal(puts().length, 1);
  assert.equal(calls.filter(call => call.method === 'PUT' && call.url === '/api/admin/content/draft').length, 1);
  assert.ok(calls.slice(calls.findIndex(call => call.method === 'PUT') + 1).some(call => call.method === 'GET' && call.url === '/api/admin/content'));
  assert.match(previewQuery().textContent, /Server title/);
  assert.doesNotMatch(previewQuery().textContent, /Client edit/);
});

serial('publish sends the edited document then the real publish endpoint', async () => {
  let version = 4;
  let saved;
  installFetch(({ url, method, body }) => {
    if (url === '/api/admin/content' && method === 'GET') return { body: content(cmsDoc(), version) };
    if (url === '/api/admin/content/revisions') return { body: { revisions: [{ version: 2, kind: 'publish', actor: 'owner', created_at: '2026-01-01T00:00:00.000Z', source_revision: null }] } };
    if (url === '/api/admin/content/revisions/1') return { body: { version: 1, kind: 'publish', document: cmsDoc() } };
    if (url === '/api/admin/content/draft' && method === 'PUT') {
      assert.deepEqual(Object.keys(body).sort(), ['document', 'expectedVersion']);
      assert.equal(body.expectedVersion, version);
      saved = body.document;
      version += 1;
      return { body: { version, draftRevision: version, published: false } };
    }
    if (url === '/api/admin/content/publish' && method === 'POST') {
      assert.deepEqual(body, { expectedVersion: version });
      version += 1;
      return { body: { version, draftRevision: version, published: true } };
    }
    throw new Error(`unexpected ${method} ${url}`);
  });
  await render();
  await waitFor(() => document.querySelector('[data-admin-status="ready"]'));
  await typeInto('textarea[data-path="pages.home.sections.intro.blocks.0.text.en"]', 'Published paragraph');
  await click('button[name="publish"]');
  await waitFor(() => document.querySelector('[data-publish-changes]'));
  assert.equal(calls.filter(call => call.method === 'PUT').length, 0, 'the dialog opens before anything is written');
  assert.match(document.querySelector('[data-publish-changes]').textContent, /Page: Home — 1 section changed/);
  await click('button[name="confirm-publish"]');
  await waitFor(() => document.querySelector('[data-revision="6"]'));
  assert.equal(saved.pages[0].sections[0].blocks[0].text.en, 'Published paragraph');
  assert.equal(calls.filter(call => call.url === '/api/admin/content/publish' && call.method === 'POST').length, 1);
  assert.match(document.querySelector('[data-revision="6"]').textContent, /6/);
});

serial('rollback calls the real endpoint and shows the returned revision', async () => {
  let version = 5;
  installFetch(({ url, method, body }) => {
    if (url === '/api/admin/content' && method === 'GET') return { body: content(cmsDoc(), version) };
    if (url === '/api/admin/content/revisions') return { body: { revisions: [{ version: 2, kind: 'publish', actor: 'owner', created_at: '2026-01-01T00:00:00.000Z', source_revision: null }] } };
    if (url === '/api/admin/content/rollback' && method === 'POST') {
      assert.deepEqual(body, { expectedVersion: 5, revision: 2 });
      version = 8;
      return { body: { version, draftRevision: version, published: true } };
    }
    throw new Error(`unexpected ${method} ${url}`);
  });
  await render();
  await waitFor(() => document.querySelector('[data-admin-status="ready"]'));
  await typeInto('input[name="rollback-revision"]', '2');
  await click('button[name="rollback"]');
  await waitFor(() => document.querySelector('[data-revision="8"]'));
  assert.equal(puts().length, 0);
  assert.equal(calls.filter(call => call.url === '/api/admin/content/rollback').length, 1);
});

serial('invalid edits show field errors and are not saved', async () => {
  installFetch(({ url, method }) => {
    if (url === '/api/admin/content' && method === 'GET') return { body: content(cmsDoc()) };
    if (url === '/api/admin/content/revisions') return { body: { revisions: [] } };
    if (method === 'PUT') return { body: { version: 3, draftRevision: 3, published: false } };
    throw new Error(`unexpected ${method} ${url}`);
  });
  await render();
  await waitFor(() => document.querySelector('[data-admin-status="ready"]'));
  await typeInto('textarea[data-path="pages.home.title.en"]', 'x'.repeat(501));
  await click('button[name="save-draft"]');
  const errors = await waitFor(() => document.querySelector('[data-field-errors]'));
  assert.match(errors.textContent, /Page “x+…” › Title › English: This text is not valid or is too long\./);
  assert.equal(errors.querySelector('li').dataset.code, 'document.pages[0].title.en: invalid or oversized string');
  assert.equal(puts().length, 0);
});

serial('enabled flags and section order change the preview', async () => {
  const doc = cmsDoc('Alpha copy');
  doc.pages[0].sections.push({ id: 'next', type: 'richText', enabled: true, variant: 'panel', blocks: [{ type: 'paragraph', text: text('Beta copy') }] });
  installFetch(({ url, method }) => {
    if (url === '/api/admin/content' && method === 'GET') return { body: content(doc) };
    if (url === '/api/admin/content/revisions') return { body: { revisions: [] } };
    throw new Error(`unexpected ${method} ${url}`);
  });
  await render();
  await waitFor(() => document.querySelector('[data-preview]'));
  const before = previewQuery().textContent;
  assert.ok(before.indexOf('Alpha copy') < before.indexOf('Beta copy'));
  await click('button[data-move="down"][data-section="intro"]');
  const moved = previewQuery().textContent;
  assert.ok(moved.indexOf('Beta copy') < moved.indexOf('Alpha copy'));
  await click('input[data-flag="section-enabled"][data-section="next"]');
  assert.doesNotMatch(previewQuery().textContent, /Beta copy/);
  assert.match(previewQuery().textContent, /Alpha copy/);
});

serial('every seed section type exposes its text for editing', async () => {
  const doc = allTypesDocument();
  const valid = validateCmsDocument(doc);
  assert.equal(valid.valid, true, valid.errors?.join('\n'));
  installFetch(({ url, method }) => {
    if (url === '/api/admin/content' && method === 'GET') return { body: content(doc) };
    if (url === '/api/admin/content/revisions') return { body: { revisions: [] } };
    throw new Error(`unexpected ${method} ${url}`);
  });
  await render();
  await waitFor(() => document.querySelector('[data-admin-status="ready"]'));
  for (const id of ['hero', 'rich-text', 'card-grid', 'product-grid', 'gallery', 'benefits', 'cta', 'reviews', 'faq', 'team', 'itinerary', 'inclusions', 'practical-info', 'contact']) {
    await click(`button[data-section-tab="${id}"]`);
    assert.ok(document.querySelector(`textarea[data-path="pages.home.sections.${id}.title.en"]`), id);
  }
  assert.equal(document.querySelectorAll('button[data-section-tab]').length, SECTION_TYPES.length);
});

serial('preview shows an unpublished page without publishing it', async () => {
  const doc = cmsDoc('Hidden paragraph', 'Hidden title');
  doc.pages[0].enabled = false;
  installFetch(({ url, method }) => {
    if (url === '/api/admin/content' && method === 'GET') return { body: content(doc) };
    if (url === '/api/admin/content/revisions') return { body: { revisions: [] } };
    throw new Error(`unexpected ${method} ${url}`);
  });
  await render();
  const preview = await waitFor(() => previewQuery());
  assert.match(preview.textContent, /Hidden paragraph/);
  assert.equal(puts().length, 0);
});

serial('adds, duplicates, and removes a schema section', async () => {
  let saved;
  installFetch(({ url, method, body }) => {
    if (url === '/api/admin/content' && method === 'GET') return { body: content(cmsDoc('Hello paragraph')) };
    if (url === '/api/admin/content/revisions') return { body: { revisions: [] } };
    if (url === '/api/admin/content/draft' && method === 'PUT') {
      saved = body.document;
      return { body: { version: 3, draftRevision: 3, published: false } };
    }
    throw new Error(`unexpected ${method} ${url}`);
  });
  await render();
  await waitFor(() => document.querySelector('[data-admin-status="ready"]'));
  await choose('select[name="section-type"]', 'benefits');
  await click('button[name="add-section"]');
  await waitFor(() => document.querySelector('button[data-section-tab="benefits"]'));
  assert.match(previewQuery().textContent, /benefits/);
  await click('button[data-duplicate-section="benefits"]');
  await waitFor(() => document.querySelector('button[data-section-tab="benefits-copy"]'));
  await click('button[data-remove-section="intro"]');
  await settle();
  assert.equal(document.querySelector('button[data-section-tab="intro"]'), null);
  assert.doesNotMatch(previewQuery().textContent, /Hello paragraph/);
  await click('button[name="save-draft"]');
  const valid = validateCmsDocument(saved);
  assert.equal(valid.valid, true, valid.errors?.join('\n'));
  assert.deepEqual(saved.pages[0].sections.map(item => item.id), ['benefits', 'benefits-copy']);
  assert.equal(saved.pages[0].sections.every(item => item.type === 'benefits'), true);
});

serial('creates an enabled page and adds navigation only when checked', async () => {
  let saved;
  installFetch(({ url, method, body }) => {
    if (url === '/api/admin/content' && method === 'GET') return { body: content(cmsDoc()) };
    if (url === '/api/admin/content/revisions') return { body: { revisions: [] } };
    if (url === '/api/admin/content/draft' && method === 'PUT') {
      saved = body.document;
      return { body: { version: 3, draftRevision: 3, published: false } };
    }
    throw new Error(`unexpected ${method} ${url}`);
  });
  await render();
  await waitFor(() => document.querySelector('[data-admin-status="ready"]'));
  await typeInto('input[name="new-page-id"]', 'summer-walk');
  await click('button[name="add-page"]');
  const added = await waitFor(() => document.querySelector('button[data-page="summer-walk"]'));
  assert.equal(added.getAttribute('aria-current'), 'page');
  assert.doesNotMatch(added.textContent, /unpublished/);
  assert.equal(document.querySelector('[data-nav-page="summer-walk"]'), null);
  assert.match(previewQuery().textContent, /summer-walk/);
  assert.ok(document.querySelector('button[data-section-tab="hero"]'));
  assert.ok(previewQuery('.cms-hero'));
  await typeInto('input[name="new-page-id"]', 'home');
  await click('button[name="add-page"]');
  const duplicate = await waitFor(() => document.querySelector('[data-field-errors]'));
  assert.match(duplicate.textContent, /already used/);
  await typeInto('input[name="new-page-id"]', 'night-walk');
  await click('input[name="show-in-navigation"]');
  await click('button[name="add-page"]');
  await reveal('[data-nav-page="night-walk"]');
  await waitFor(() => document.querySelector('[data-nav-page="night-walk"]'));
  assert.equal(document.querySelector('[data-nav-page="summer-walk"]'), null);
  await click('button[name="save-draft"]');
  const valid = validateCmsDocument(saved);
  assert.equal(valid.valid, true, valid.errors?.join('\n'));
  const summer = saved.pages.find(item => item.id === 'summer-walk');
  const night = saved.pages.find(item => item.id === 'night-walk');
  assert.equal(summer.enabled, true);
  assert.equal(summer.slug, 'summer-walk');
  assert.equal(summer.sections.length, 1);
  assert.equal(summer.sections[0].type, 'hero');
  assert.equal(night.enabled, true);
  assert.equal(saved.navigation.some(link => link.pageId === 'summer-walk'), false);
  assert.equal(saved.navigation.some(link => link.pageId === 'night-walk'), true);
  assert.equal(saved.footer.links.some(link => link.pageId === 'night-walk'), false);
});

serial('media picker sets a library id and rejects an unknown id before save', async () => {
  const doc = cmsDoc();
  doc.media = [{ id: 'gate', src: '/images/gate.jpg', alt: text('Bab gate') }];
  doc.pages[0].sections = [{ id: 'hero', type: 'hero', variant: 'banner', enabled: true, title: text('Home title'), links: [] }];
  let saved;
  installFetch(({ url, method, body }) => {
    if (url === '/api/admin/content' && method === 'GET') return { body: content(doc) };
    if (url === '/api/admin/content/revisions') return { body: { revisions: [] } };
    if (url === '/api/admin/content/draft' && method === 'PUT') {
      saved = body.document;
      return { body: { version: 3, draftRevision: 3, published: false } };
    }
    throw new Error(`unexpected ${method} ${url}`);
  });
  await render();
  await reveal('[data-media-pick="gate"]');
  await waitFor(() => document.querySelector('[data-media-pick="gate"]'));
  assert.ok(document.querySelector('.cms-admin-upload input[type="file"]'));
  await click('button[data-media-pick="gate"]');
  const img = await waitFor(() => previewQuery('img'));
  assert.equal(img.getAttribute('src'), '/images/gate.jpg');
  assert.equal(img.getAttribute('alt'), 'Bab gate');
  await click('button[name="save-draft"]');
  assert.equal(saved.pages[0].sections[0].image.mediaId, 'gate');
  assert.equal(JSON.stringify(saved).includes('data:'), false);
  assert.equal(calls.some(call => /upload/i.test(call.url)), false);
  const source = readFileSync(new URL('../src/admin/AdminApp.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /base64|type="file"/i);

  const bad = cmsDoc();
  bad.pages[0].sections = [{ id: 'hero', type: 'hero', variant: 'banner', enabled: true, title: text('Home title'), links: [], image: { mediaId: 'missing', alt: text('Missing') } }];
  installFetch(({ url, method }) => {
    if (url === '/api/admin/content' && method === 'GET') return { body: content(bad) };
    if (url === '/api/admin/content/revisions') return { body: { revisions: [] } };
    if (method === 'PUT') return { body: { version: 3, draftRevision: 3, published: false } };
    throw new Error(`unexpected ${method} ${url}`);
  });
  await render();
  await waitFor(() => document.querySelector('[data-admin-status="ready"]'));
  await click('button[name="save-draft"]');
  const errors = await waitFor(() => document.querySelector('[data-field-errors]'));
  assert.match(errors.textContent, /Photo not found in the library: missing/);
  assert.match(errors.querySelector('li').dataset.code, /unknown id missing/);
  assert.equal(puts().length, 0);
});

serial('full structured controls expose SEO, globals and numeric theme fields', async () => {
  installFetch(({ url }) => url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(cmsDoc()) });
  await render();
  await reveal('[data-path="pages.home.seo.description.en"]');
  assert.ok(document.querySelector('[data-path="pages.home.seo.description.en"]'), 'SEO control');
  await reveal('[data-path="theme.fontScale"]');
  assert.ok(document.querySelector('[data-path="theme.fontScale"]'), 'numeric theme control');
  await reveal('[data-path="siteSettings.email"]');
  assert.ok(document.querySelector('[data-path="siteSettings.email"]'), 'contact control');
  await reveal('[data-add="faqs"]');
  assert.ok(document.querySelector('[data-add="faqs"]'), 'entity creation control');
});

serial('theme edits appear in the page preview without raw CSS', async () => {
  installFetch(({ url, method }) => {
    if (url === '/api/admin/content' && method === 'GET') return { body: content(cmsDoc()) };
    if (url === '/api/admin/content/revisions') return { body: { revisions: [] } };
    throw new Error(`unexpected ${method} ${url}`);
  });
  await render();
  const preview = await waitFor(() => previewQuery('.cms-page'));
  assert.match(preview.getAttribute('style') || '', /--cms-primary:\s*#005F5A/i);
  await typeInto('input[name="theme-color-primary"]', 'red; }');
  await settle();
  const rejected = previewQuery('.cms-page').getAttribute('style') || '';
  assert.doesNotMatch(rejected, /red;|}/);
  assert.match(rejected, /--cms-primary:\s*#[0-9a-f]{6}/i);
  await typeInto('input[name="theme-color-primary"]', '#112233');
  await choose('select[name="theme-font"]', 'inter');
  await choose('select[name="theme-spacing"]', 'generous');
  await choose('select[name="theme-radius"]', 'pill');
  const style = previewQuery('.cms-page').getAttribute('style') || '';
  assert.match(style, /--cms-primary:\s*#112233/i);
  assert.match(style, /Inter/);
  assert.match(style, /6rem/);
  assert.match(style, /2rem|999px/);
  assert.equal(document.querySelector('textarea[name="theme-css"], input[name="custom-css"]'), null);
});

serial('language tabs, navigation labels, and footer order stay on existing pages', async () => {
  const doc = cmsDoc();
  doc.navigation = [{ id: 'nav-home', pageId: 'home', label: text('Home'), enabled: true }];
  doc.footer.links = [
    { id: 'foot-a', pageId: 'home', label: text('First'), enabled: true },
    { id: 'foot-b', pageId: 'home', label: text('Second'), enabled: true },
  ];
  installFetch(({ url, method }) => {
    if (url === '/api/admin/content' && method === 'GET') return { body: content(doc) };
    if (url === '/api/admin/content/revisions') return { body: { revisions: [] } };
    throw new Error(`unexpected ${method} ${url}`);
  });
  await render();
  await reveal('textarea[data-path="pages.home.title.en"]');
  await waitFor(() => document.querySelector('textarea[data-path="pages.home.title.en"]'));
  await click('button[data-locale="fr"]');
  assert.equal(document.querySelector('textarea[data-path="pages.home.title.en"]'), null);
  await typeInto('textarea[data-path="pages.home.title.fr"]', 'Titre');
  await typeInto('input[data-nav-label="nav-home"]', 'Accueil');
  await click('button[data-locale="en"]');
  await reveal('textarea[data-path="pages.home.title.en"]');
  assert.equal(document.querySelector('textarea[data-path="pages.home.title.en"]').value, 'Home title');
  await reveal('input[data-nav-label="nav-home"]');
  assert.equal(document.querySelector('input[data-nav-label="nav-home"]').value, 'Home');
  await click('button[data-locale="es"]');
  await reveal('textarea[data-path="pages.home.title.es"]');
  assert.equal(document.querySelector('textarea[data-path="pages.home.title.es"]').value, 'Home title');
  await click('button[data-locale="fr"]');
  await reveal('textarea[data-path="pages.home.title.fr"]');
  assert.equal(document.querySelector('textarea[data-path="pages.home.title.fr"]').value, 'Titre');
  await reveal('input[data-nav-label="nav-home"]');
  assert.equal(document.querySelector('input[data-nav-label="nav-home"]').value, 'Accueil');
  await reveal('select[data-footer-page="foot-a"]');
  const options = [...document.querySelectorAll('select[data-footer-page="foot-a"] option')].map(option => option.value);
  assert.deepEqual(options, ['home']);
  await choose('select[data-footer-page="foot-a"]', 'missing-page');
  assert.equal(document.querySelector('[data-footer-link="foot-a"]').getAttribute('data-link-page'), 'home');
  await click('button[data-footer-move="down"][data-link="foot-a"]');
  const order = [...document.querySelectorAll('[data-footer-link]')].map(item => item.getAttribute('data-footer-link'));
  assert.deepEqual(order, ['foot-b', 'foot-a']);
});

serial('admin sources do not store secrets or inject HTML', () => {
  const source = ['AdminApp.tsx', 'admin-api.ts', 'admin.css'].map(file => readFileSync(new URL(`../src/admin/${file}`, import.meta.url), 'utf8')).join('\n');
  assert.doesNotMatch(source, /localStorage|sessionStorage|document\.cookie|dangerouslySetInnerHTML/i);
  assert.doesNotMatch(source, /\bbookings\b/i);
  assert.match(source, /export function AdminApp/);
});


serial('Spanish editor controls and locale tabs edit Spanish without changing EN/FR and preview each locale', async () => {
  const doc = cmsDoc('Original English paragraph', 'Home title');
  doc.pages[0].title.es = 'Página de inicio';
  doc.pages[0].sections[0].blocks[0].text.es = 'Descubre Fez de la mano de nuestros guías locales.';
  installFetch(({ url, method }) => {
    if (url === '/api/admin/content' && method === 'GET') return { body: content(doc) };
    if (url === '/api/admin/content/revisions') return { body: { revisions: [] } };
    if (url === '/api/admin/content/draft' && method === 'PUT') return { body: { version: 3, draftRevision: 3, published: false } };
    throw new Error(`unexpected ${method} ${url}`);
  });
  await render('es');
  const editor = await waitFor(() => document.querySelector('[data-admin-status="ready"]'));
  assert.equal(editor.dir, 'ltr');
  assert.match(editor.textContent, /Editor de contenido/);
  assert.equal(document.querySelector('button[name="save-draft"]').textContent, 'Guardar borrador');
  await reveal('input[name="theme-color-primary"]');
  assert.equal(document.querySelector('input[name="theme-color-primary"]').parentElement.textContent.trim(), 'principal');
  assert.deepEqual([...document.querySelectorAll('[data-locale]')].map(tab => tab.dataset.locale), ['en', 'fr', 'es']);
  assert.deepEqual([...document.querySelectorAll('[data-locale]')].map(tab => tab.textContent), ['English', 'Français', 'Español']);
  assert.match(previewQuery().textContent, /Descubre Fez/);
  await typeInto('textarea[data-path="pages.home.sections.intro.blocks.0.text.es"]', 'Visita la medina con un guía local privado.');
  assert.match(previewQuery().textContent, /Visita la medina/);
  await click('[data-locale="fr"]');
  assert.equal(previewQuery('article').lang, 'fr');
  assert.match(previewQuery().textContent, /Original English paragraph/);
  await click('[data-locale="es"]');
  assert.equal(previewQuery('article').lang, 'es');
  await click('button[name="save-draft"]');
  const saved = puts()[0].body.document.pages[0].sections[0].blocks[0].text;
  assert.deepEqual(saved, { en: 'Original English paragraph', fr: 'Original English paragraph', es: 'Visita la medina con un guía local privado.' });
});

serial('structured global entities SEO theme arrays and UI copy survive draft save and reload', async () => {
  window.confirm = () => true;
  let doc = cmsDoc(); let saved;
  doc.media = [{ id: 'gate', src: '/images/gate.jpg', alt: text('Gate') }, { id: 'city', src: '/images/city.jpg', alt: text('City') }];
  doc.pages[0].sections.push(section('gallery', 'gallery', { variant: 'grid', images: [{ mediaId: 'gate', alt: text('Gate') }, { mediaId: 'city', alt: text('City') }] }));
  doc.pages[0].sections.push(section('faq', 'faq', { variant: 'list', faqIds: [] }));
  doc.uiCopy = { 'ui.common.bookNow': text('Book') };
  installFetch(({ url, method, body }) => {
    if (url.endsWith('/revisions')) return { body: { revisions: [] } };
    if (method === 'GET') return { body: content(doc) };
    if (url.endsWith('/draft')) { saved = body.document; doc = structuredClone(saved); return { body: { version: 3, draftRevision: 3, published: false } }; }
    throw new Error(`unexpected ${method} ${url}`);
  });
  await render();
  await typeInto('[data-path="pages.home.slug"]', 'welcome');
  await typeInto('[data-path="pages.home.seo.description.en"]', 'Edited search description');
  await typeInto('[data-path="theme.fontScale"]', '1.2');
  await typeInto('[data-path="theme.containerWidth"]', '1440');
  await choose('[data-path="theme.buttonVariant"]', 'outline');
  await choose('[data-path="theme.cardVariant"]', 'flat');
  await typeInto('[data-path="siteSettings.email"]', 'owner@example.com');
  await typeInto('[data-path="uiCopy.ui.common.bookNow.en"]', 'Reserve with our guide');
  await click('[data-add="faqs"]');
  await typeInto('[data-path="faqs.0.question.en"]', 'New owner question?');
  await typeInto('[data-path="faqs.0.answer.en"]', 'New owner answer.');
  await click('[data-section-tab="faq"]');
  await click('[data-add="pages.home.sections.faq.faqIds"]');
  assert.match(previewQuery().textContent, /New owner answer/);
  await click('[data-section-tab="gallery"]');
  await click('[data-array-move="pages.home.sections.gallery.images.0:down"]');
  assert.equal(previewQuery('.cms-gallery img').getAttribute('src'), '/images/city.jpg');
  await choose('[data-path="pages.home.sections.gallery.variant"]', 'story');
  await click('[data-enable="pages.home.sections.gallery.images.0.caption"]');
  await typeInto('[data-path="pages.home.sections.gallery.images.0.caption.en"]', 'City caption');
  assert.match(previewQuery().textContent, /City caption/);
  await click('button[name="save-draft"]');
  assert.equal(validateCmsDocument(saved).valid, true);
  assert.equal(saved.pages[0].seo.description.en, 'Edited search description');
  assert.equal(saved.theme.fontScale, 1.2); assert.equal(saved.theme.containerWidth, 1440);
  assert.equal(saved.theme.buttonVariant, 'outline'); assert.equal(saved.theme.cardVariant, 'flat');
  assert.equal(saved.pages[0].sections[1].images[0].mediaId, 'city');
  assert.equal(saved.uiCopy['ui.common.bookNow'].en, 'Reserve with our guide');
  assert.equal(calls.some(call => call.url.endsWith('/publish')), false);
  await render();
  await reveal('[data-path="pages.home.seo.description.en"]');
  assert.equal(document.querySelector('[data-path="pages.home.seo.description.en"]').value, 'Edited search description');
  await reveal('[data-path="faqs.0.answer.en"]');
  assert.equal(document.querySelector('[data-path="faqs.0.answer.en"]').value, 'New owner answer.');
  await reveal('[data-path="theme.fontScale"]');
  assert.equal(document.querySelector('[data-path="theme.fontScale"]').value, '1.2');
});

serial('structured rich-text blocks and localized lists add reorder remove without raw JSON', async () => {
  window.confirm = () => true;
  let saved;
  installFetch(({ url, method, body }) => method === 'PUT' ? (saved = body.document, { body: { version: 3, draftRevision: 3, published: false } }) : url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(cmsDoc('')) });
  await render();
  await choose('[data-path="pages.home.sections.intro.blocks.0.type"]', 'list');
  await click('[data-add="pages.home.sections.intro.blocks.0.items.en"]');
  await typeInto('[data-path="pages.home.sections.intro.blocks.0.items.en.0"]', 'First list item');
  await click('[data-add="pages.home.sections.intro.blocks.0.items.en"]');
  await typeInto('[data-path="pages.home.sections.intro.blocks.0.items.en.1"]', 'Second list item');
  await click('[data-array-move="pages.home.sections.intro.blocks.0.items.en.0:down"]');
  assert.ok(previewQuery().textContent.indexOf('Second list item') < previewQuery().textContent.indexOf('First list item'));
  await click('[data-array-remove="pages.home.sections.intro.blocks.0.items.en.1"]');
  await click('[data-add="pages.home.sections.intro.blocks"]');
  await choose('[data-path="pages.home.sections.intro.blocks.1.type"]', 'link');
  await typeInto('[data-path="pages.home.sections.intro.blocks.1.text.en"]', 'Read more');
  await typeInto('[data-path="pages.home.sections.intro.blocks.1.href"]', 'https://example.com/story');
  await click('button[name="save-draft"]');
  assert.equal(validateCmsDocument(saved).valid, true);
  assert.deepEqual(saved.pages[0].sections[0].blocks[0].items.en, ['Second list item']);
  assert.equal(saved.pages[0].sections[0].blocks[1].href, 'https://example.com/story');
});

serial('entity creation keeps product graph valid and referenced page removal hides rather than destroys', async () => {
  window.confirm = () => true;
  let saved;
  installFetch(({ url, method, body }) => method === 'PUT' ? (saved = body.document, { body: { version: 3, draftRevision: 3, published: false } }) : url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(cmsDoc()) });
  await render();
  await reveal('[name="remove-page"]');
  assert.equal(document.querySelector('[name="remove-page"]').disabled, true);
  await click('[data-add="products"]');
  await click('[data-tour-tab="price"]');
  await click('[data-open-pricing="experience"]');
  await typeInto('[name="price-amount"]', '170');
  await choose('[name="price-currency"]', 'EUR');
  await choose('[name="price-basis"]', 'person');
  await click('[name="apply-price"]');
  await click('[data-page="experience"]');
  await click('[name="remove-page"]');
  assert.ok(document.querySelector('[data-page="experience"]'), 'referenced detail retained');
  await click('[name="duplicate-page"]');
  assert.ok(document.querySelector('[data-page="experience-copy"]'));
  assert.equal(document.querySelector('[data-add="editorialEntries"]'), null, 'editorial entries are internal and not offered');
  await click('[data-add="blogPosts"]');
  await click('[data-add="teamMembers"]');
  await click('[data-add="faqs"]');
  await click('[name="save-draft"]');
  assert.equal(validateCmsDocument(saved).valid, true, validateCmsDocument(saved).errors?.join('\n'));
  assert.equal(saved.products.length, 2);
  assert.equal(saved.products[0].price.amount, 170);
  assert.equal(saved.pages.find(p => p.id === 'experience').enabled, false);
  assert.equal(saved.pages.find(p => p.id === 'experience-copy').productId, 'experience-copy');
  assert.equal(saved.editorialEntries.length, 0); assert.equal(saved.blogPosts.length, 1); assert.equal(saved.teamMembers.length, 1); assert.equal(saved.faqs.length, 1);
});

serial('invalid and oversized JSON imports never save or publish; valid import is dirty draft only', async () => {
  window.confirm = () => true;
  const doc = cmsDoc();
  installFetch(({ url }) => url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(doc) });
  await render();
  const importFile = async file => {
    const input = document.querySelector('[name="import-draft"]');
    await act(async () => {
      Object.defineProperty(input, 'files', { configurable: true, value: [file] });
      input.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    await settle();
  };
  const fakeFile = (raw, size = raw.length) => ({ size, text: async () => raw });
  await importFile(fakeFile('{"schemaVersion":1}'));
  assert.match(document.querySelector('[data-field-errors]').textContent, /This content block is missing|not valid or is too long/);
  await importFile(fakeFile('{}', 2000001));
  assert.match(document.querySelector('[data-field-errors]').textContent, /too big to save/);
  assert.equal(puts().length, 0);
  const imported = structuredClone(doc); imported.pages[0].title.en = 'Imported title';
  await importFile(fakeFile(JSON.stringify(imported)));
  await reveal('[data-path="pages.home.title.en"]');
  assert.equal(document.querySelector('[data-path="pages.home.title.en"]').value, 'Imported title');
  assert.match(document.querySelector('.cms-admin-bar').textContent, /Unsaved changes/);
  assert.equal(puts().length, 0); assert.equal(calls.some(call => call.url.endsWith('/publish')), false);
  await click('[name="preview-mobile"]'); assert.equal(document.querySelector('[data-preview]').dataset.previewSize, 'mobile');
  await click('[name="preview-desktop"]'); assert.equal(document.querySelector('[data-preview]').dataset.previewSize, 'desktop');
  const unload = new window.Event('beforeunload', { cancelable: true }); window.dispatchEvent(unload); assert.equal(unload.defaultPrevented, true);
});

serial('every section family mounts approved variants and structured array creation controls', async () => {
  window.confirm = () => true;
  const { SECTION_VARIANTS, GLOBAL_FIELDS, editorDefault } = await import('../src/cms/editor-controls.ts');
  const doc = allTypesDocument();
  doc.media = [{ id: 'gate', src: '/images/gate.jpg', alt: text('Gate') }];
  doc.faqs = [{ id: 'faq-one', category: 'general', question: text('Question?'), answer: text('Answer') }];
  doc.teamMembers = [{ id: 'guide', name: 'Guide', role: text('Local guide'), bio: text('Biography'), languages: ['English'], experience: text('Experience'), avatarUrl: '/images/gate.jpg' }];
  doc.reviews = [{ id: 'real-review', author: 'Traveler', title: 'Real review', quote: 'Source quote', date: '2026-01-01', url: 'https://www.tripadvisor.com/Review-real', source: 'tripadvisor', enabled: true }];
  const product = editorDefault(GLOBAL_FIELDS.products.item, doc); Object.assign(product, { id: 'walk', kind: 'product', actionType: 'book_tour', pageId: 'home', title: text('Walk') });
  doc.products = [product]; doc.pages.push({ id: 'walk', slug: 'walk', kind: 'product', enabled: true, productId: 'walk', parentId: 'home', title: text('Walk'), seo: { title: text('Walk'), description: text('Walk description') }, sections: [] });
  let saved;
  installFetch(({ url, method, body }) => method === 'PUT' ? (saved = body.document, { body: { version: 3, draftRevision: 3, published: false } }) : url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(doc) });
  await render();
  const arrays = { hero: 'links', richText: 'blocks', cardGrid: 'cards', productGrid: 'productIds', gallery: 'images', benefits: 'items', cta: 'links', reviews: 'reviewIds', faq: 'faqIds', team: 'teamIds', itinerary: 'stops', inclusions: 'included.en', practicalInfo: 'items', contact: 'links' };
  for (const section of doc.pages[0].sections) {
    await click(`[data-section-tab="${section.id}"]`);
    const prefix = `pages.home.sections.${section.id}`;
    await reveal(`[data-path="${prefix}.variant"]`);
    assert.deepEqual([...document.querySelectorAll(`[data-path="${prefix}.variant"] option`)].map(o => o.value), SECTION_VARIANTS[section.type]);
    const variant = SECTION_VARIANTS[section.type].find(v => v !== section.variant && v !== 'booking') ?? section.variant;
    await choose(`[data-path="${prefix}.variant"]`, variant);
    assert.equal(previewQuery(`[data-section-id="${section.id}"]`).dataset.variant, variant);
    await click(`[data-add="${prefix}.${arrays[section.type]}"]`);
    assert.ok(document.querySelector(`[data-array-item="${prefix}.${arrays[section.type]}.0"]`), section.type);
    if (section.type === 'cardGrid') {
      await click(`[data-enable="${prefix}.cards.0.image"]`);
      await click(`[data-enable="${prefix}.cards.0.pageId"]`);
      await click(`[data-enable="${prefix}.cards.0.badge"]`);
      await typeInto(`[data-path="${prefix}.cards.0.title.en"]`, 'Owner card');
      await typeInto(`[data-path="${prefix}.cards.0.image.alt.en"]`, 'Owner alt');
    }
    if (section.type === 'itinerary') { await click(`[data-enable="${prefix}.stops.0.time"]`); await typeInto(`[data-path="${prefix}.stops.0.time"]`, '09:00'); }
  }
  await click('[name="save-draft"]');
  assert.equal(validateCmsDocument(saved).valid, true, validateCmsDocument(saved).errors?.join('\n'));
  await reveal('[data-path="reviews.0.quote"]');
  assert.equal(document.querySelector('[data-path="reviews.0.quote"]').readOnly, true);
  await reveal('[data-add="reviews"]');
  assert.equal(document.querySelector('[data-add="reviews"]').disabled, true);
  assert.equal(calls.some(call => call.url.endsWith('/publish')), false);
});

serial('navigation footer and UI copy have safe creation deletion target switching and reordering', async () => {
  window.confirm = () => true;
  let saved;
  installFetch(({ url, method, body }) => method === 'PUT' ? (saved = body.document, { body: { version: 3, draftRevision: 3, published: false } }) : url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(cmsDoc()) });
  await render();
  await click('[data-add="navigation"]');
  await typeInto('[data-path="navigation.0.label.en"]', 'Owner navigation');
  await click('[data-enable="navigation.0.href"]');
  await typeInto('[data-path="navigation.0.href"]', 'https://example.com');
  assert.equal(document.querySelector('[data-path="navigation.0.pageId"]'), null);
  await click('[data-add="footer.links"]');
  await typeInto('[data-path="footer.links.0.label.en"]', 'First');
  await click('[data-add="footer.links"]');
  await typeInto('[data-path="footer.links.1.label.en"]', 'Second');
  await click('[data-array-move="footer.links.0:down"]');
  await typeInto('[data-path="footer.text.en"]', 'Owner footer copy');
  await typeInto('[name="new-copy-key"]', 'ui.brand.name'); await click('[name="add-copy"]');
  await typeInto('[data-path="uiCopy.ui.brand.name.en"]', 'Owner brand');
  await click('[name="save-draft"]');
  assert.equal(saved.navigation[0].href, 'https://example.com'); assert.equal(saved.navigation[0].pageId, undefined);
  assert.deepEqual(saved.footer.links.map(link => link.label.en), ['Second', 'First']);
  assert.equal(saved.footer.text.en, 'Owner footer copy'); assert.equal(saved.uiCopy['ui.brand.name'].en, 'Owner brand');
  await click('[data-array-remove="navigation.0"]');
  await click('[data-remove-copy="ui.brand.name"]');
  await click('[name="save-draft"]');
  assert.equal(saved.navigation.length, 0); assert.equal(Object.hasOwn(saved.uiCopy, 'ui.brand.name'), false);
});

serial('export uses the actual draft Blob and pending import disables save publish rollback', async () => {
  window.confirm = () => true;
  installFetch(({ url }) => url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(cmsDoc()) });
  await render();
  let exported; const createUrl = URL.createObjectURL; const revokeUrl = URL.revokeObjectURL;
  URL.createObjectURL = blob => { exported = blob; return 'blob:cms-draft'; }; URL.revokeObjectURL = () => {};
  await typeInto('[data-path="pages.home.title.en"]', 'Blob draft title');
  try { await click('[name="export-draft"]'); } finally { URL.createObjectURL = createUrl; URL.revokeObjectURL = revokeUrl; }
  assert.equal(JSON.parse(await exported.text()).pages[0].title.en, 'Blob draft title');
  let release;
  const input = document.querySelector('[name="import-draft"]');
  await act(async () => {
    Object.defineProperty(input, 'files', { configurable: true, value: [{ size: 2, text: () => new Promise(resolve => { release = resolve; }) }] });
    input.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  await reveal('[name="rollback"]');
  for (const name of ['save-draft', 'publish', 'rollback']) assert.equal(document.querySelector(`[name="${name}"]`).disabled, true, name);
  await act(async () => release('{}')); await settle();
  assert.equal(puts().length, 0); assert.equal(calls.some(call => call.url.endsWith('/publish')), false);
  assert.equal(document.querySelector('[name="save-draft"]').disabled, false);
});

serial('French structured controls and validation keep diagnostic paths with localized explanations', async () => {
  installFetch(({ url }) => url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(cmsDoc()) });
  await render('fr');
  assert.equal(document.querySelector('[name="save-draft"]').textContent, 'Enregistrer le brouillon');
  await reveal('[data-path="theme.containerWidth"]');
  assert.match(document.querySelector('[data-path="theme.containerWidth"]').parentElement.textContent, /Largeur du contenu/);
  await typeInto('[data-path="theme.fontScale"]', '2');
  await click('[name="save-draft"]');
  assert.match(document.querySelector('[data-field-errors]').textContent, /Thème › Échelle typographique: Nombre hors de la plage autorisée/);
  assert.equal(document.querySelector('[data-field-errors] li').dataset.code, 'document.theme.fontScale: number out of range');
  assert.equal(puts().length, 0);
});

serial('focused workspaces separate page settings, photos and advanced controls without writes', async () => {
  installFetch(({ url }) => url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(cmsDoc()) });
  await render();
  assert.equal(document.querySelector('.cms-admin').dataset.workspace, 'sections');
  // Only the open workspace is mounted; the others cost nothing until chosen.
  assert.equal(document.querySelector('.cms-page-settings'), null);
  assert.equal(document.querySelector('.cms-photo-workspace').hidden, true);
  assert.equal(document.querySelector('.cms-section-outline').open, false);
  assert.equal(document.querySelector('[data-section-fields="advanced"]'), null);
  assert.equal(document.querySelector('[name="current-section"]').value, 'intro');
  for (const key of ['page','content','photos','appearance','settings','history','sections']) {
    await click(`[data-workspace-tab="${key}"]`);
    assert.equal(document.querySelector('.cms-admin').dataset.workspace, key);
    assert.equal(document.querySelector(`[data-workspace-tab="${key}"]`).getAttribute('aria-pressed'), 'true');
  }
  await click('[data-section-panel="layout"]');
  assert.ok(document.querySelector('[data-section-fields="layout"]'));
  assert.equal(document.querySelector('[data-section-fields="content"]'), null);
  assert.equal(puts().length, 0);
  assert.equal(calls.some(call => call.method === 'POST'), false);
});

serial('layout modes preserve unsaved draft and preview selection returns to focused editing', async () => {
  const doc = cmsDoc(); doc.pages[0].sections.push(section('next', 'cta', { variant: 'banner', links: [] }));
  installFetch(({ url }) => url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(doc) });
  await render();
  await typeInto('textarea[data-path="pages.home.sections.intro.blocks.0.text.en"]', 'Still private after changing layout');
  const originalFrame = document.querySelector('[data-preview] iframe');
  for (const mode of ['preview','editor','split']) {
    await click(`[name="view-${mode}"]`);
    assert.equal(document.querySelector('.cms-admin').dataset.layout, mode);
    assert.match(previewQuery().textContent, /Still private after changing layout/);
    assert.equal(document.querySelector('[data-preview] iframe'), originalFrame);
  }
  await click('[data-workspace-tab="history"]'); await click('[name="view-preview"]');
  await act(async () => previewQuery('[data-section-id="next"]').click()); await settle();
  assert.equal(document.querySelector('.cms-admin').dataset.layout, 'split');
  assert.equal(document.querySelector('.cms-admin').dataset.workspace, 'sections');
  assert.equal(document.querySelector('[name="current-section"]').value, 'next');
  assert.equal(document.querySelector('.cms-focused-section h3').textContent, 'cta title');
  await click('[name="previous-section"]');
  assert.equal(document.querySelector('[name="current-section"]').value, 'intro');
  assert.match(previewQuery().textContent, /Still private after changing layout/);
  assert.equal(puts().length, 0);
});

serial('whole-site draft shell previews unsaved contact brand and footer edits without a public fetch', async () => {
  installFetch(({ url }) => url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(cmsDoc()) });
  await render();
  assert.ok(previewQuery('header')); assert.ok(previewQuery('footer'));
  await click('[data-workspace-tab="settings"]');
  await typeInto('[data-path="siteSettings.siteName"]', 'Private draft brand');
  await typeInto('[data-path="footer.text.en"]', 'Private footer preview');
  assert.match(previewQuery('header').textContent, /Private draft brand/);
  assert.match(previewQuery('footer').textContent, /Private footer preview/);
  assert.equal(calls.some(call => call.url.startsWith('/api/cms')), false);
  assert.equal(puts().length, 0);
});

serial('photo metadata shows one editable language and keeps optional fields collapsed', async () => {
  installFetch(({ url }) => url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(cmsDoc()) });
  await render(); await click('[data-workspace-tab="photos"]');
  const upload = document.querySelector('.cms-admin-upload');
  assert.equal(upload.querySelector('fieldset[lang="en"]').hidden, false);
  assert.equal(upload.querySelector('fieldset[lang="fr"]').hidden, true);
  assert.equal(upload.querySelector('fieldset[lang="en"] details').open, false);
  await act(async () => [...upload.querySelectorAll('button')].find(button => button.textContent === 'Français').click());
  assert.equal(upload.querySelector('fieldset[lang="fr"]').hidden, false);
  assert.equal(upload.querySelector('fieldset[lang="en"]').hidden, true);
  assert.equal(puts().length, 0);
});

serial('custom product prose visibly warns that its independently formatted page section is detached', async () => {
  const { createCmsSeed } = await import('../src/cms/seed.ts');
  const doc=createCmsSeed(),product=doc.products.find(product=>product.id==='our-fez-tours');
  // This notice needs one genuine linked product, not the unrelated media-heavy site library.
  const kept=new Set(['home','fez','our-fez-tours']);
  doc.pages=doc.pages.filter(page=>kept.has(page.id)).map(page=>({...page,sections:page.id==='our-fez-tours'?page.sections.filter(section=>section.id==='overview'):[]}));
  doc.products=[product];const index=0;
  doc.navigation=doc.navigation.filter(link=>!link.pageId||kept.has(link.pageId));doc.footer.links=doc.footer.links.filter(link=>!link.pageId||kept.has(link.pageId));
  doc.editorialEntries=[];doc.blogPosts=[];doc.teamMembers=[];doc.faqs=[];doc.reviews=[];
  const sources=new Set([product.image,...(product.galleryImages??[])]);doc.media=doc.media.filter(media=>sources.has(media.src));
  doc.legacy={...doc.legacy,tours:doc.legacy.tours.filter(tour=>tour.id===product.id),customPages:[],blogPosts:[],teamMembers:[],faqs:[]};
  doc.pages.find(page=>page.id==='our-fez-tours').sections.find(section=>section.id==='overview').blocks=[{type:'list',items:text(['Owner custom list'])}];
  assert.equal(validateCmsDocument(doc).valid,true,'focused fixture retains the real validated relationship');
  installFetch(({url})=>url.endsWith('/revisions')?{body:{revisions:[]}}:{body:content(doc)});
  await render();await click('[data-workspace-tab="content"]');
  await reveal(`[data-projection-notice="products.${index}.fullDescription"]`);
  const notice=document.querySelector(`[data-projection-notice="products.${index}.fullDescription"]`);
  assert.ok(notice);assert.match(notice.textContent,/custom formatting|Edit that page section directly/);
  assert.equal(puts().length,0);
});

serial('pending media upload blocks save publish rollback without a document write', async () => {
  const doc = cmsDoc(); doc.pages[0].sections = [section('hero', 'hero', { variant: 'banner', links: [] })];
  let release;
  const id = 'upload-22222222-2222-4222-8222-222222222222';
  installFetch(({ url }) => url === '/api/admin/media' ? new Promise(resolve => { release = resolve; }) : url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(doc) });
  await render();
  const input = document.querySelector('.cms-admin-upload input[type="file"]');
  await act(async () => {
    Object.defineProperty(input, 'files', { configurable: true, value: [new File([new Uint8Array([1, 2])], 'test.png', { type: 'image/png' })] });
    input.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  const upload = [...document.querySelectorAll('.cms-admin-upload button')].find(button => button.textContent === 'Upload photo');
  await act(async () => upload.click()); await settle();
  await reveal('[name="rollback"]');
  for (const name of ['save-draft', 'publish', 'rollback']) assert.equal(document.querySelector(`[name="${name}"]`).disabled, true, name);
  assert.equal(puts().length, 0);
  await act(async () => release({ status: 201, body: { media: { id, src: `/media/${id}.png`, alt: text('Image'), width: 1, height: 1, source: 'cms-upload' }, previewSrc: `/api/admin/media/${id}.png` } }));
  await settle();
  assert.equal(document.querySelector('[name="save-draft"]').disabled, false);
  assert.equal(puts().length, 0); assert.equal(calls.some(call => call.url.endsWith('/publish')), false);
});

test('empty store offers a one-click private draft seeded from the current site content', async () => {
  let stored = null;
  let version = 0;
  installFetch(({ url, method, body }) => {
    if (url.endsWith('/api/admin/content') && method === 'GET') return { body: { version, draftRevision: stored ? version : null, publishedRevision: null, document: stored } };
    if (url.endsWith('/api/admin/content/revisions')) return { body: { revisions: [] } };
    if (url.endsWith('/api/admin/content/draft') && method === 'PUT') {
      assert.equal(body.expectedVersion, 0);
      stored = body.document; version = 1;
      return { body: { version: 1, draftRevision: 1, published: false } };
    }
    return { status: 404, body: { error: 'not_found' } };
  });
  await render('en');
  await waitFor(() => window.document.querySelector('[data-admin-bootstrap]'));
  await click('button[name="bootstrap-from-site"]');
  await waitFor(() => window.document.querySelector('select[name="current-page"] option[value="home"]'));
  const save = calls.filter(call => call.method === 'PUT');
  assert.equal(save.length, 1, 'exactly one draft save');
  assert.ok(validateCmsDocument(save[0].body.document).valid, 'seed passes the shared validator');
  assert.equal(calls.filter(call => call.url.endsWith('/publish')).length, 0, 'bootstrapping never publishes');
});

test('page SEO fields show a live Google length counter with localized guidance', async () => {
  const doc = cmsDoc();
  installFetch(({ url }) => url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(doc) });
  await render('fr');
  await click('[data-workspace-tab="page"]');
  const counter = () => window.document.querySelector('[data-seo-counter="pages.home.seo.description"]');
  await waitFor(counter);
  assert.match(counter().textContent, /^16\/155 · Google affiche environ 155 caractères/);
  assert.ok(!counter().classList.contains('is-warning'));
  await typeInto('textarea[data-path="pages.home.seo.description.fr"]', 'x'.repeat(170));
  assert.match(counter().textContent, /^170\/155/);
  assert.ok(counter().classList.contains('is-warning'), 'too long is highlighted');
  await typeInto('textarea[data-path="pages.home.seo.description.fr"]', '');
  assert.match(counter().textContent, /résumé est pris automatiquement/);
  const title = window.document.querySelector('[data-seo-counter="pages.home.seo.title"]');
  assert.match(title.textContent, /\/42 · .*Fez Guide Tours/);
});

const seedDocument = async () => (await import('../src/cms/seed.ts')).createCmsSeed();
const saveOk = body => ({ body });

serial('Site settings no longer offers fallback-only hero fields, explains where the homepage headline lives, and keeps the data', async () => {
  const doc = cmsDoc();
  doc.siteSettings.heroTitle = text('Legacy headline');
  let saved;
  installFetch(({ url, method, body }) => method === 'PUT' ? (saved = body.document, saveOk({ version: 3, draftRevision: 3, published: false })) : url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(doc) });
  await render();
  for (const field of ['heroTitle', 'heroTagline', 'heroSubtitle']) assert.equal(document.querySelector(`[data-path^="siteSettings.${field}"]`), null, field);
  assert.equal(document.querySelector('.cms-legacy-settings'), null);
  await reveal('[data-hero-hint]');
  assert.match(document.querySelector('[data-hero-hint]').textContent, /^To change the homepage headline, open Page sections → Home → the first section\.$/);
  // heroImage still feeds Google structured data, so it stays editable (under Advanced).
  assert.ok(document.querySelector('.cms-advanced [data-path="siteSettings.heroImage"], .cms-advanced [data-enable="siteSettings.heroImage"]'));
  await typeInto('[data-path="siteSettings.email"]', 'owner@example.com');
  await click('button[name="save-draft"]');
  assert.equal(saved.siteSettings.email, 'owner@example.com');
  assert.deepEqual(saved.siteSettings.heroTitle, text('Legacy headline'), 'hidden fields are saved untouched');
});

serial('technical fields live in a collapsed Advanced disclosure but remain editable; owner fields stay in the open', async () => {
  const doc = await seedDocument();
  let saved;
  installFetch(({ url, method, body }) => method === 'PUT' ? (saved = body.document, saveOk({ version: 3, draftRevision: 3, published: false })) : url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(doc) });
  await render();
  await click('[data-page="about"]');
  await click('[data-workspace-tab="page"]');
  const advanced = document.querySelector('[data-advanced="pages.about"]');
  assert.ok(advanced && advanced.tagName === 'DETAILS' && advanced.open === false, 'collapsed by default');
  assert.equal(advanced.querySelector('summary').textContent, 'Advanced');
  for (const field of ['id', 'kind']) assert.ok(advanced.querySelector(`[data-path="pages.about.${field}"]`), `${field} under Advanced`);
  const slug = document.querySelector('[data-path="pages.about.slug"]');
  assert.ok(slug && !slug.closest('.cms-advanced'), 'web address stays primary');
  assert.match(slug.closest('label').textContent, /^Web address \(after fezguidetours\.com\/\)/);
  assert.ok(document.querySelector('[data-advanced="pages.about.seo"] [data-enable="pages.about.seo.canonical"], [data-advanced="pages.about.seo"] [data-path="pages.about.seo.canonical"]'), 'canonical under Advanced');
  // Still editable.
  await choose('[data-path="pages.about.kind"]', document.querySelector('[data-path="pages.about.kind"]').value);
  await click('[data-enable="pages.about.seo.canonical"]');
  await typeInto('[data-path="pages.about.seo.canonical"]', '/about-us');
  // Products: id/kind/action/gallery URLs are secondary, category is visible as "Shown under".
  await reveal('[data-advanced="products.0"]');
  const product = document.querySelector('[data-array-item="products.0"]');
  const productAdvanced = product.querySelector('[data-advanced="products.0"]');
  assert.equal(productAdvanced.open, false);
  for (const field of ['id', 'kind', 'actionType']) assert.ok(productAdvanced.querySelector(`[data-path="products.0.${field}"]`), field);
  assert.equal(productAdvanced.querySelector('[data-array="products.0.galleryImages"], [data-enable="products.0.galleryImages"]'), null, 'gallery lives in the Photos tab, not Advanced');
  await click('[data-tour-tab="basics"]');
  const category = product.querySelector('[data-path="products.0.pageId"]');
  assert.ok(category && !category.closest('.cms-advanced'));
  assert.match(category.closest('label').textContent, /^Shown under/);
  await click('[data-tour-tab="photos"]');
  assert.ok(product.querySelector('[data-array="products.0.galleryImages"], [data-enable="products.0.galleryImages"]'), 'gallery is in the Photos tab');
  const primaryPicker = product.querySelector('[data-url-picker="products.0.image"]');
  assert.ok(primaryPicker && !primaryPicker.closest('.cms-advanced'), 'photo picker is the primary way to choose a photo');
  assert.ok(product.querySelector('.cms-advanced [data-path="products.0.image"]'), 'raw image address is secondary but usable');
  await click('button[name="save-draft"]');
  assert.ok(saved, document.querySelector('[data-field-errors]')?.textContent);
  assert.equal(saved.pages.find(page => page.id === 'about').seo.canonical, '/about-us');
  assert.equal(validateCmsDocument(saved).valid, true);
});

serial('a tour shows one tab of fields at a time, flags tabs with errors and remembers the last tab', async () => {
  const doc = await seedDocument();
  installFetch(({ url }) => url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(doc) });
  await render();
  await click('[data-workspace-tab="content"]');
  await reveal('[data-tour-tab="basics"]');
  const item = () => document.querySelector('[data-array-item="products.0"]');
  const tabs = () => [...item().querySelectorAll('[data-tour-tab]')];
  assert.deepEqual(tabs().map(tab => tab.dataset.tourTab), ['basics', 'price', 'itinerary', 'included', 'photos', 'policies']);
  assert.ok(tabs().every(tab => tab.tagName === 'BUTTON' && tab.hasAttribute('aria-pressed')));
  await click('[data-tour-tab="basics"]');
  assert.equal(item().querySelector('[data-tour-tab="basics"]').getAttribute('aria-pressed'), 'true');
  assert.ok(item().querySelector('[data-path="products.0.title.en"]'));
  assert.equal(item().querySelector('[data-path="products.0.cancellationPolicy.en"]'), null, 'inactive tab fields are not mounted');
  assert.equal(item().querySelectorAll('[data-tour-panel]').length, 1);
  await click('[data-tour-tab="price"]');
  assert.equal(item().querySelector('[data-tour-tab="basics"]').getAttribute('aria-pressed'), 'false');
  assert.equal(item().querySelector('[data-path="products.0.title.en"]'), null);
  assert.ok(item().querySelector('[data-price-readonly="products.0.price"] [data-open-pricing]'));
  assert.ok(item().querySelector('[data-path="products.0.practicalInfo.duration.en"]'));
  await click('[data-tour-tab="policies"]');
  assert.ok(item().querySelector('[data-path="products.0.cancellationPolicy.en"]'));
  assert.ok(item().querySelector('[data-path="products.0.meetingPointDetails.en"]'));
  // The next render of the same session reopens the tab the owner used last.
  await render();
  await click('[data-workspace-tab="content"]');
  await reveal('[data-tour-tab="basics"]');
  assert.equal(item().querySelector('[data-tour-tab="policies"]').getAttribute('aria-pressed'), 'true');
});

serial('a tour tab with an invalid field shows an error count', async () => {
  const doc = await seedDocument();
  installFetch(({ url, method }) => method === 'PUT' ? { status: 400, body: { error: 'invalid_document', errors: [`products.${doc.products[0].id}.title.en: invalid or oversized string`] } } : url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(doc) });
  await render();
  await click('[data-workspace-tab="content"]');
  await reveal('[data-tour-tab="basics"]');
  await typeInto('[data-path="products.0.title.en"]', 'x'.repeat(5000));
  await click('button[name="save-draft"]');
  const badge = document.querySelector('[data-array-item="products.0"] [data-tour-tab="basics"] [data-tab-errors]');
  assert.ok(badge, document.querySelector('[data-field-errors]')?.textContent ?? 'no errors shown');
  assert.equal(badge.dataset.tabErrors, '1');
});

serial('collections use plain names, editorial entries are hidden, and lists are numbered with item names', async () => {
  const doc = await seedDocument();
  installFetch(({ url }) => url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(doc) });
  await render();
  await click('[data-workspace-tab="content"]');
  await openLazy();
  const summaries = [...document.querySelectorAll('.cms-global-fields > details > summary')].map(summary => summary.textContent);
  assert.ok(summaries.includes('Tours & experiences'));
  assert.ok(summaries.includes('Tripadvisor reviews (show/hide and order)'));
  assert.ok(!summaries.some(label => /Editorial entries|^Products$|attribution locked/.test(label)), summaries.join('|'));
  assert.equal(document.querySelector('[data-array="editorialEntries"]'), null);
  const legend = path => document.querySelector(`[data-array-item="${path}"] [data-object="${path}"] > legend`)?.textContent;
  assert.equal(legend('products.0'), `1. ${doc.products[0].title.en}`);
  assert.equal(legend('products.1'), `2. ${doc.products[1].title.en}`);
  assert.equal(legend('teamMembers.0'), `1. ${doc.teamMembers[0].name}`);
  assert.match(document.querySelector('[data-array-move="products.0:down"]').getAttribute('aria-label'), new RegExp(`Move down: 1\\. ${doc.products[0].title.en.slice(0, 20)}`));
  const tourLabels = () => [...document.querySelectorAll('[data-array-item="products.0"] label')].filter(label => !label.closest('.cms-advanced')).map(label => label.textContent).join('\n');
  await click('[data-tour-tab="photos"]');
  let text0 = tourLabels();
  await click('[data-tour-tab="basics"]');
  text0 += `\n${tourLabels()}`;
  assert.match(text0, /Photo description \(for Google & screen readers\)/);
  assert.match(text0, /Short description/);
  assert.doesNotMatch(text0, /Image alternative text|Identifier \(stable\)|Action \(fixed\)/);
  const blog = document.querySelector('[data-array-item="blogPosts.0"]');
  const blogText = [...blog.querySelectorAll('label')].map(label => label.textContent).join('\n');
  assert.match(blogText, /Short summary/); assert.match(blogText, /Article text/); assert.match(blogText, /Show on website/);
  assert.match(blogText, /Web address \(after fezguidetours\.com\/\)/);
  await click('[data-workspace-tab="settings"]');
  await openLazy();
  assert.equal(legend('navigation.0'), `1. ${doc.navigation[0].label.en}`);
});

serial('header shows a friendly publish status with revision numbers as a small secondary detail', async () => {
  const doc = cmsDoc();
  installFetch(({ url }) => url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: { version: 37, draftRevision: 37, publishedRevision: 36, document: doc } });
  await render();
  const state = () => document.querySelector('.cms-draft-state');
  assert.equal(state().textContent, 'Draft saved, not published yet');
  assert.equal(document.querySelector('.cms-version-details').textContent, 'Version 37. Draft revision 37. Published revision 36.');
  await typeInto('textarea[data-path="pages.home.title.en"]', 'Changed');
  assert.equal(state().textContent, 'Unsaved changes');
  installFetch(({ url }) => url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: { version: 37, draftRevision: 37, publishedRevision: 37, document: doc } });
  await render('fr');
  assert.equal(state().textContent, 'Publié — à jour');
  await render('es');
  assert.equal(state().textContent, 'Publicado — al día');
});

serial('interface text editor lists every supported key with a human label and default, even when the document has none', async () => {
  const { SUPPORTED_UI_COPY } = await import('../src/cms/ui-copy.ts');
  const { uiCopyRegistry } = await import('../src/admin/ui-copy-registry.ts');
  const doc = cmsDoc();
  doc.uiCopy = {};
  let saved;
  installFetch(({ url, method, body }) => method === 'PUT' ? (saved = body.document, saveOk({ version: 3, draftRevision: 3, published: false })) : url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(doc) });
  await render();
  await reveal('[data-copy-key]');
  const entries = uiCopyRegistry(SUPPORTED_UI_COPY, 'en');
  assert.ok(entries.length > 0);
  for (const entry of entries) {
    const row = document.querySelector(`[data-copy-key="${entry.key}"]`);
    assert.ok(row, `missing row for ${entry.key}`);
    assert.equal(row.querySelector(`[data-path="uiCopy.${entry.key}.en"]`).value, entry.defaults.en, `default prefilled for ${entry.key}`);
    assert.ok(row.querySelector('label').textContent.startsWith(`${entry.label} (English)`), `human label for ${entry.key}`);
    const rawKey = [...row.querySelectorAll('code')].find(code => code.textContent === entry.key);
    assert.ok(rawKey && rawKey.closest('.cms-advanced'), `raw key only under Advanced for ${entry.key}`);
    assert.equal(row.querySelector('[data-remove-copy]').disabled, true, 'nothing to reset yet');
  }
  const target = entries[0];
  await typeInto(`[data-path="uiCopy.${target.key}.en"]`, 'Edited wording');
  await click('button[name="save-draft"]');
  assert.deepEqual(Object.keys(saved.uiCopy), [target.key], 'only the edited key is written');
  assert.deepEqual(saved.uiCopy[target.key], { ...target.defaults, en: 'Edited wording' });
  assert.equal(validateCmsDocument(saved).valid, true);
});

serial('save errors appear as plain-language messages in EN, FR and ES, keeping the raw code for support', async () => {
  const failures = [
    { respond: { status: 507, body: { error: 'cms_revision_storage_budget' } }, code: 'cms_revision_storage_budget', en: /history is full/i, fr: /historique.*plein/i, es: /historial.*lleno/i },
    { respond: { status: 401, body: { error: 'unauthorized' } }, code: 'unauthorized', en: /session expired — sign in again in a new tab/i, fr: /session a expiré/i, es: /sesión ha caducado/i },
    { respond: 'network', code: 'network_error', en: /internet connection/i, fr: /connexion internet/i, es: /conexión a internet/i },
  ];
  for (const failure of failures) {
    for (const language of ['en', 'fr', 'es']) {
      const doc = cmsDoc();
      installFetch(({ url, method }) => {
        if (url.endsWith('/revisions')) return { body: { revisions: [] } };
        if (method === 'PUT') { if (failure.respond === 'network') throw new TypeError('Failed to fetch'); return failure.respond; }
        return { body: content(doc) };
      });
      await render(language);
      await typeInto(`textarea[data-path="pages.home.title.${language}"]`, 'Edited');
      await click('button[name="save-draft"]');
      const item = await waitFor(() => document.querySelector('[data-field-errors] li')).catch(error => { throw new Error(`${failure.code}/${language}: ${error.message.slice(-300)}`); });
      assert.match(item.textContent, failure[language], `${failure.code}/${language}: ${item.textContent}`);
      assert.doesNotMatch(item.textContent, new RegExp(failure.code));
      assert.equal(item.dataset.code, failure.code);
      assert.equal(item.title, failure.code);
      assert.equal(document.querySelector(`textarea[data-path="pages.home.title.${language}"]`).value, 'Edited', 'edits are kept');
    }
  }
});

serial('a version conflict explains itself in plain language and the conflict banner keeps its code', async () => {
  const doc = cmsDoc();
  installFetch(({ url, method }) => url.endsWith('/revisions') ? { body: { revisions: [] } } : method === 'PUT' ? { status: 409, body: { error: 'version_conflict' } } : { body: content(doc) });
  await render();
  await waitFor(() => document.querySelector('[data-admin-status="ready"]'));
  await typeInto('textarea[data-path="pages.home.title.en"]', 'Mine');
  await click('button[name="save-draft"]');
  const banner = await waitFor(() => document.querySelector('[data-admin-conflict]'));
  assert.match(banner.textContent, /Someone else saved at the same time \(edit conflict\)/);
  assert.equal(banner.dataset.code, 'version_conflict');
});

// ---- Phone performance: mount only what is on screen -------------------------------------------------------------
serial('only the open workspace is mounted; switching tabs mounts the next one and drops the last', async () => {
  const doc = cmsDoc();
  installFetch(({ url }) => url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(doc) });
  await render();
  const mounted = () => ({
    sections: !!document.querySelector('.cms-section-workspace'),
    page: !!document.querySelector('.cms-page-settings'),
    appearance: !!document.querySelector('[name="theme-font"]'),
    settings: !!document.querySelector('[data-ui-copy]'),
    history: !!document.querySelector('[name="rollback"]'),
    content: [...document.querySelectorAll('.cms-global-fields > details > summary')].some(summary => summary.textContent === 'FAQ'),
  });
  const none = { sections: false, page: false, appearance: false, settings: false, history: false, content: false };
  assert.deepEqual(mounted(), { ...none, sections: true });
  for (const key of ['page', 'appearance', 'settings', 'history', 'content']) {
    await click(`[data-workspace-tab="${key}"]`);
    assert.deepEqual(mounted(), { ...none, [key]: true }, key);
  }
  // Only the chosen section panel exists, not all four.
  await click('[data-workspace-tab="sections"]');
  assert.deepEqual([...document.querySelectorAll('[data-section-fields]')].map(el => el.dataset.sectionFields), ['content']);
});

serial('collection items stay collapsed (children not mounted) until opened, and a new item opens itself', async () => {
  const doc = cmsDoc();
  doc.faqs = [1, 2, 3].map(n => ({ id: `faq-${n}`, category: 'general', question: text(`Question ${n}`), answer: text(`Answer ${n}`) }));
  installFetch(({ url }) => url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(doc) });
  await render();
  await click('[data-workspace-tab="content"]');
  const faqsDetails = [...document.querySelectorAll('.cms-global-fields > details')].find(details => details.querySelector('summary').textContent === 'FAQ');
  await act(async () => { faqsDetails.open = true; faqsDetails.dispatchEvent(new window.Event('toggle')); });
  const faqsRoot = await waitFor(() => document.querySelector('[data-array="faqs"]'));
  assert.equal(faqsRoot.querySelectorAll('[data-array-item]').length, 3);
  assert.equal(faqsRoot.querySelectorAll('input, textarea, select').length, 0, 'collapsed items mount no fields');
  assert.match(faqsRoot.querySelector('[data-lazy-item="faqs.1"] summary').textContent, /^2\. Question 2/);
  const second = faqsRoot.querySelector('[data-lazy-item="faqs.1"]');
  await act(async () => { second.open = true; second.dispatchEvent(new window.Event('toggle')); });
  assert.equal(document.querySelector('[data-path="faqs.1.question.en"]').value, 'Question 2');
  assert.equal(document.querySelector('[data-path="faqs.0.question.en"]'), null, 'siblings remain unmounted');
  await act(async () => { second.open = false; second.dispatchEvent(new window.Event('toggle')); });
  assert.equal(document.querySelector('[data-path="faqs.1.question.en"]'), null);
  await click('[data-add="faqs"]');
  assert.ok(document.querySelector('[data-lazy-item="faqs.3"][open]'), 'a freshly added item is open for editing');
  assert.ok(document.querySelector('[data-path="faqs.3.question.en"]'));
});

serial('the live preview trails typing by a short pause but then shows the edit', async () => {
  const doc = cmsDoc();
  installFetch(({ url }) => url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(doc) });
  const saved = globalThis.__cmsPreviewDelayMs;
  delete globalThis.__cmsPreviewDelayMs;
  try {
    await render();
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 150)); }); // first preview paints right after the editor
    await typeInto('textarea[data-path="pages.home.sections.intro.blocks.0.text.en"]', 'Typed once');
    assert.equal(document.querySelector('textarea[data-path="pages.home.sections.intro.blocks.0.text.en"]').value, 'Typed once', 'the field itself updates at once');
    assert.doesNotMatch(previewQuery().textContent, /Typed once/, 'preview waits for typing to pause');
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 400)); });
    await settle();
    assert.match(previewQuery().textContent, /Typed once/);
  } finally { globalThis.__cmsPreviewDelayMs = saved; }
});

serial('SEO length counters update live while typing and edits survive tab and page switches', async () => {
  window.confirm = () => true;
  const doc = cmsDoc();
  let savedDoc;
  installFetch(({ url, method, body }) => method === 'PUT' ? (savedDoc = body.document, saveOk({ version: 3, draftRevision: 3, published: false })) : url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(doc) });
  await render();
  await click('[data-workspace-tab="page"]');
  await typeInto('[data-path="pages.home.seo.title.en"]', 'Hello');
  assert.match(document.querySelector('[data-seo-counter="pages.home.seo.title"]').textContent, /^5\/42/);
  await typeInto('[data-path="pages.home.seo.title.en"]', 'Hello there');
  assert.match(document.querySelector('[data-seo-counter="pages.home.seo.title"]').textContent, /^11\/42/);
  await typeInto('[data-path="pages.home.title.en"]', 'Kept title');
  // Away to another workspace and a freshly added page, then back: nothing is lost.
  await click('[data-workspace-tab="page"]');
  await typeInto('input[name="new-page-id"]', 'second-page');
  await click('button[name="add-page"]');
  await choose('select[name="current-page"]', 'home');
  await click('[data-workspace-tab="page"]');
  assert.equal(document.querySelector('[data-path="pages.home.title.en"]').value, 'Kept title');
  assert.equal(document.querySelector('[data-path="pages.home.seo.title.en"]').value, 'Hello there');
  assert.match(document.querySelector('.cms-draft-state').textContent, /Unsaved/);
  await click('button[name="save-draft"]');
  assert.equal(savedDoc.pages[0].title.en, 'Kept title');
  assert.equal(savedDoc.pages[0].seo.title.en, 'Hello there');
  assert.ok(savedDoc.pages.some(page => page.id === 'second-page'));
  assert.match(document.querySelector('.cms-draft-state').textContent, /saved/i);
});

serial('the seeded FAQ page is editable end to end: questions, accordion membership, order, a brand-new FAQ, and referenced FAQs cannot vanish', async () => {
  window.confirm = () => true;
  const { createCmsSeed } = await import('../src/cms/seed.ts');
  const doc = createCmsSeed();
  const kept = new Set(['home', 'faq']);
  doc.pages = doc.pages.filter(page => kept.has(page.id)).map(page => page.id === 'faq' ? page : { ...page, sections: [] });
  doc.products = []; doc.editorialEntries = []; doc.blogPosts = []; doc.teamMembers = []; doc.reviews = [];
  doc.navigation = doc.navigation.filter(link => !link.pageId || kept.has(link.pageId));
  doc.footer.links = doc.footer.links.filter(link => !link.pageId || kept.has(link.pageId));
  const mediaIds = new Set(doc.pages.flatMap(page => page.sections.flatMap(section => section.image ? [section.image.mediaId] : [])));
  doc.media = doc.media.filter(media => mediaIds.has(media.id));
  doc.legacy = { ...doc.legacy, tours: [], customPages: [], blogPosts: [], teamMembers: [], faqs: [] };
  assert.equal(validateCmsDocument(doc).valid, true);
  assert.equal(doc.footer.links.at(-1).pageId, 'faq');
  let saved;
  installFetch(({ url, method, body }) => method === 'PUT' ? (saved = body.document, { body: { version: 3, draftRevision: 3, published: false } }) : url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(doc) });
  await render();
  await click('[data-page="faq"]');
  // The page's own SEO and title are plain fields.
  await reveal('[data-path="pages.faq.title.en"]');
  assert.equal(document.querySelector('[data-path="pages.faq.title.en"]').value, 'Frequently Asked Questions');
  assert.match(document.querySelector('[data-seo-counter="pages.faq.seo.title"]').textContent, /^38\/42/);
  await typeInto('[data-path="pages.faq.seo.title.en"]', 'FAQ Fez Tours');
  // The accordion lists every question by name, in order, with plain-language labels.
  await click('[data-section-tab="questions"]');
  const itemsPath = 'pages.faq.sections.questions.faqIds';
  await reveal(`[data-array="${itemsPath}"]`);
  assert.equal(document.querySelectorAll(`[data-array="${itemsPath}"] > ol > li`).length, 12);
  assert.match(document.querySelector(`[data-array="${itemsPath}"] legend`).textContent, /FAQ entries/);
  assert.match(document.querySelector(`[data-array="${itemsPath}"] > ol > li`).textContent, /1\. What types of experiences do you offer in Fez\?/);
  // Edit an existing question's answer (library) and reorder the accordion.
  await typeInto('[data-path="faqs.0.answer.en"]', 'Edited answer text.');
  await click('[data-section-tab="questions"]');
  await click(`[data-array-move="${itemsPath}.0:down"]`);
  assert.match(previewQuery().textContent, /Edited answer text/);
  // A referenced FAQ cannot be deleted from the library; drop it from the page first.
  await click('[data-array-remove="faqs.0"]');
  assert.ok(document.querySelector('[data-field-errors]'), 'deleting a FAQ the page uses is refused');
  await click('[data-section-tab="questions"]');
  await click(`[data-array-remove="${itemsPath}.11"]`);
  assert.equal(document.querySelectorAll(`[data-array="${itemsPath}"] > ol > li`).length, 11);
  // A brand-new FAQ joins the page through the editor alone: create it, then add it to the accordion.
  await click('[data-add="faqs"]');
  const created = doc.faqs.length; // library index of the new row
  await typeInto(`[data-path="faqs.${created}.question.en"]`, 'Brand new owner question?');
  await typeInto(`[data-path="faqs.${created}.answer.en"]`, 'Brand new owner answer.');
  await click('[data-section-tab="questions"]');
  await click(`[data-add="${itemsPath}"]`); // adds the next library FAQ not yet on the page (the one dropped above)
  await click(`[data-add="${itemsPath}"]`); // and then the new one
  assert.match(previewQuery().textContent, /Brand new owner answer/);
  await click('button[name="save-draft"]');
  assert.equal(validateCmsDocument(saved).valid, true);
  const savedPage = saved.pages.find(page => page.id === 'faq');
  assert.equal(savedPage.seo.title.en, 'FAQ Fez Tours');
  assert.equal(savedPage.sections[1].faqIds.length, 13);
  assert.equal(savedPage.sections[1].faqIds[1], 'faq-1', 'reordered');
  assert.ok(savedPage.sections[1].faqIds.includes(saved.faqs.at(-1).id));
  assert.equal(saved.faqs.at(-1).question.en, 'Brand new owner question?');
  assert.equal(saved.faqs[0].answer.en, 'Edited answer text.');
});
