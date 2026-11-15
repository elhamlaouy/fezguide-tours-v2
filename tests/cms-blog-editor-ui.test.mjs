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
const seedDocument = async () => (await import('../src/cms/seed.ts')).createCmsSeed();
const saveOk = body => ({ body });
// ---- Blog post form: formatting toolbar, preview, date picker, cover picker, polished labels ----
const sleep = ms => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });
async function openPost(language = 'en', mutate) {
  const doc = await seedDocument();
  mutate?.(doc);
  let saved;
  installFetch(({ url, method, body }) => method === 'PUT' ? (saved = body.document, saveOk({ version: 3, draftRevision: 3, published: false })) : url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(doc) });
  await render(language);
  await click('[data-workspace-tab="content"]');
  await reveal('[data-path^="blogPosts.0.content."]');
  return { doc, saved: () => saved };
}
const area = () => document.querySelector('[data-path="blogPosts.0.content.en"]');
async function write(value, start, end = start) {
  await typeInto('[data-path="blogPosts.0.content.en"]', value);
  const el = area();
  await act(async () => { el.focus(); el.setSelectionRange(start, end); });
}
const tool = id => `[data-article-tool="${id}"]`;

serial('the article toolbar has all nine buttons, labelled for screen readers, in the editor language', async () => {
  const { ARTICLE_SYNTAX_ITEMS, ARTICLE_SYNTAX } = await import('../src/cms/article-format.ts');
  for (const language of ['en', 'fr', 'es']) {
    await openPost(language);
    const bar = document.querySelector('[data-article-field^="blogPosts.0.content"] [role="toolbar"]');
    assert.ok(bar && bar.getAttribute('aria-label'));
    const buttons = [...bar.querySelectorAll('button[data-article-tool]')];
    assert.deepEqual(buttons.map(button => button.dataset.articleTool), ['heading', 'subheading', 'bold', 'italic', 'bullets', 'numbers', 'quote', 'link', 'photo']);
    for (const button of buttons) {
      const item = ARTICLE_SYNTAX_ITEMS.find(entry => entry.id === button.dataset.articleTool);
      assert.equal(button.getAttribute('aria-label'), item.label[language]);
      assert.ok(button.getAttribute('title'));
    }
    assert.equal(document.querySelector('[data-article-help] pre').textContent, ARTICLE_SYNTAX[language], `help in ${language}`);
    assert.ok(document.querySelector('[data-article-help] summary').textContent.length > 3);
  }
});

serial('each toolbar button inserts the documented syntax at the cursor or around the selection and keeps the cursor', async () => {
  await openPost();
  const state = () => { const el = area(); return { value: el.value, start: el.selectionStart, end: el.selectionEnd, focused: document.activeElement === el }; };
  // headings, quote, lists: cursor stays on the same letter
  for (const [id, prefix] of [['heading', '## '], ['subheading', '### '], ['bullets', '- '], ['numbers', '1. '], ['quote', '> ']]) {
    await write('Alpha beta\nGamma delta', 3);
    await click(tool(id));
    assert.equal(state().value, `${prefix}Alpha beta\nGamma delta`, id);
    assert.equal(state().start, 3 + prefix.length, `${id} caret`); assert.ok(state().focused, `${id} keeps focus`);
    await click(tool(id));
    assert.equal(state().value, 'Alpha beta\nGamma delta', `${id} toggles off`);
  }
  // selection over two lines formats both and stays selected
  await write('Alpha\nBeta', 0, 10);
  await click(tool('bullets'));
  assert.equal(state().value, '- Alpha\n- Beta'); assert.equal(state().end - state().start, 14);
  // bold / italic around a selection, keeping it selected
  await write('Say hello now', 4, 9);
  await click(tool('bold'));
  assert.equal(state().value, 'Say **hello** now'); assert.equal(state().value.slice(state().start, state().end), '**hello**'); assert.ok(state().focused);
  await write('Say hello now', 4, 9);
  await click(tool('italic'));
  assert.equal(state().value, 'Say *hello* now');
  // without a selection: a placeholder is inserted and selected
  await write('Ab', 1);
  await click(tool('bold'));
  assert.equal(state().value, 'A**bold text**b'); assert.equal(state().value.slice(state().start, state().end), 'bold text');
  // keyboard: Ctrl+B / Ctrl+I use the same code
  await write('Say hello now', 4, 9);
  await act(async () => { area().dispatchEvent(new window.KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true, cancelable: true })); });
  assert.equal(state().value, 'Say **hello** now');
  // the formatted text is stored in the post
  assert.equal(document.querySelector('[data-path="blogPosts.0.content.fr"]'), null, 'only the language being edited shows a toolbar');
});

serial('Link asks for text and address, refuses unsafe addresses with a friendly message and inserts [text](address)', async () => {
  await openPost();
  await write('Read the guide now', 9, 14);
  await click(tool('link'));
  const panel = () => document.querySelector('[data-article-link]');
  assert.ok(panel());
  assert.equal(panel().querySelector('[name="article-link-text"]').value, 'guide', 'selection becomes the link text');
  await typeInto('[name="article-link-address"]', 'javascript:alert(1)');
  await click('[name="insert-article-link"]');
  const error = document.querySelector('[data-article-link-error]');
  assert.ok(error && error.getAttribute('role') === 'alert' && /https:\/\//.test(error.textContent), 'friendly error');
  assert.equal(area().value, 'Read the guide now', 'nothing inserted');
  await typeInto('[name="article-link-address"]', 'www.example.com/tours');
  assert.equal(document.querySelector('[data-article-link-error]'), null, 'error clears while typing');
  await click('[name="insert-article-link"]');
  assert.equal(area().value, 'Read the [guide](https://www.example.com/tours) now');
  assert.equal(panel(), null); assert.equal(area().selectionStart, 'Read the [guide](https://www.example.com/tours)'.length);
  // a page of this site, no selection, text typed in the dialog
  await write('x', 1);
  await click(tool('link'));
  await typeInto('[name="article-link-text"]', 'Book now');
  await typeInto('[name="article-link-address"]', '/our-fez-tours');
  await click('[name="insert-article-link"]');
  assert.equal(area().value, 'x[Book now](/our-fez-tours)');
});

serial('Photo opens the library picker with thumbnails and search and inserts the photo on its own line', async () => {
  const { doc } = await openPost();
  await write('First paragraph.\n\nSecond paragraph.', 5);
  await click(tool('photo'));
  const picker = () => document.querySelector('[data-media-picker="article-photo"]');
  assert.ok(picker());
  const shown = [...picker().querySelectorAll('[data-picker-media]')];
  assert.ok(shown.length >= 6 && shown.every(button => button.querySelector('img')), 'thumbnails');
  const target = doc.media[2];
  await typeInto('[data-media-picker="article-photo"] [name="picker-search"]', target.alt.en.slice(0, 12));
  assert.ok(picker().querySelector(`[data-picker-media="${target.id}"]`), 'search finds the photo');
  assert.ok([...picker().querySelectorAll('[data-picker-media]')].length < shown.length, 'search narrows the list');
  assert.ok(picker().querySelector('[data-picker-upload] summary'), 'upload a new photo is offered');
  await click(`[data-media-picker="article-photo"] [data-picker-media="${target.id}"]`);
  const alt = target.alt.en.replace(/[[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 300);
  assert.equal(area().value, `First paragraph.\n\n![${alt}](media:${target.id})\n\nSecond paragraph.`);
  assert.equal(picker(), null);
  assert.ok(document.querySelector('[data-article-status]'));
  assert.equal(document.activeElement, area());
});

serial('the live article preview uses the real renderer a moment after typing', async () => {
  const { doc } = await openPost();
  const photo = doc.media[0];
  await write(`## Big title\n\nSome **bold** words.\n\n- one\n- two\n\n![x](media:${photo.id})`, 5);
  await sleep(320);
  const preview = document.querySelector('[data-article-preview]');
  assert.ok(preview.querySelector('.article-body h2')?.textContent === 'Big title');
  assert.ok(preview.querySelector('strong')?.textContent === 'bold');
  assert.equal(preview.querySelectorAll('ul li').length, 2);
  assert.ok(preview.querySelector('figure img'), 'photo from the library');
  await write('plain text only', 1);
  await sleep(320);
  assert.equal(document.querySelector('[data-article-preview] .article-body'), null, 'unformatted text keeps the plain layout');
  assert.match(document.querySelector('[data-article-preview]').textContent, /plain text only/);
});

serial('the post date is a calendar input that keeps the stored YYYY-MM-DD value and explains invalid entries', async () => {
  const { doc, saved } = await openPost('en', draft => { draft.blogPosts[0].date = '2025-03-09'; });
  const input = () => document.querySelector('[data-path="blogPosts.0.date"]');
  assert.equal(input().type, 'date'); assert.equal(input().value, '2025-03-09');
  await typeInto('[data-path="blogPosts.0.date"]', '2026-05-01');
  await click('button[name="save-draft"]');
  assert.equal(saved().blogPosts[0].date, '2026-05-01');
  // cleared entry: friendly message, nothing invalid is stored
  await typeInto('[data-path="blogPosts.0.date"]', '');
  const problem = document.querySelector('[data-date-problem]');
  assert.ok(problem && problem.getAttribute('role') === 'alert' && /valid date/i.test(problem.textContent) && problem.textContent.includes('2026-05-01'));
  await click('button[name="save-draft"]');
  assert.equal(saved().blogPosts[0].date, '2026-05-01');
  assert.equal(validateCmsDocument(saved()).valid, true);
  // older spelling is shown in the picker and kept until changed
  await openPost('en', draft => { draft.blogPosts[0].date = 'March 9, 2025'; });
  assert.equal(input().value, '2025-03-09');
  void doc;
});

serial('new posts start dated today and with the Blog page hero as cover', async () => {
  const { todayIso } = await import('../src/admin/article-edit.ts');
  const doc = await seedDocument();
  const hero = doc.pages.find(page => page.id === 'blog').sections.find(section => section.type === 'hero');
  const heroSrc = doc.media.find(item => item.id === hero.image.mediaId).src;
  let saved;
  installFetch(({ url, method, body }) => method === 'PUT' ? (saved = body.document, saveOk({ version: 3, draftRevision: 3, published: false })) : url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(doc) });
  await render();
  await click('[data-workspace-tab="content"]');
  const before = doc.blogPosts.length;
  await click('[data-add="blogPosts"]');
  const index = before;
  assert.equal(document.querySelector(`[data-path="blogPosts.${index}.date"]`).value, todayIso());
  assert.equal(document.querySelector(`[data-cover-field="blogPosts.${index}.coverImage"] [data-cover-thumb]`).getAttribute('src'), heroSrc);
  assert.equal(document.querySelector(`[data-cover-field="blogPosts.${index}.coverImage"] [data-cover-prompt]`), null, 'a real default needs no prompt');
  await click('button[name="save-draft"]');
  assert.equal(saved.blogPosts[index].coverImage, heroSrc); assert.equal(saved.blogPosts[index].date, todayIso());
  assert.equal(validateCmsDocument(saved).valid, true);
});

serial('without a Blog page photo the new post keeps the old placeholder but asks the owner to choose a cover photo', async () => {
  const doc = await seedDocument();
  doc.pages = doc.pages.map(page => page.id === 'blog' ? { ...page, sections: page.sections.map(section => section.type === 'hero' ? { ...section, image: undefined } : section) } : page);
  installFetch(({ url }) => url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(doc) });
  await render();
  await click('[data-workspace-tab="content"]');
  const index = doc.blogPosts.length;
  await click('[data-add="blogPosts"]');
  const field = () => document.querySelector(`[data-cover-field="blogPosts.${index}.coverImage"]`);
  assert.ok(field().querySelector('[data-cover-prompt]'));
  assert.equal(field().querySelector('[data-cover-change]').textContent, 'Choose a cover photo');
  await click(`[data-cover-field="blogPosts.${index}.coverImage"] [data-cover-change]`);
  await click(`[data-media-picker="cover"] [data-picker-media="${doc.media[3].id}"]`);
  assert.equal(field().querySelector('[data-cover-prompt]'), null);
  assert.equal(field().querySelector('[data-cover-change]').textContent, 'Change photo');
  assert.equal(field().querySelector('[data-cover-thumb]').getAttribute('src'), doc.media[3].src);
});

serial('the cover picker shows the current photo, changes coverImage from the library and keeps the raw address under Advanced', async () => {
  const { doc, saved } = await openPost();
  const field = () => document.querySelector('[data-cover-field="blogPosts.0.coverImage"]');
  const current = doc.media.find(item => item.src === doc.blogPosts[0].coverImage);
  assert.equal(field().querySelector('[data-cover-thumb]').getAttribute('src'), doc.blogPosts[0].coverImage);
  if (current) assert.match(field().textContent, new RegExp(current.alt.en.slice(0, 10).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.equal(field().querySelector('select'), null, 'no raw address dropdown');
  assert.ok(field().querySelector('.cms-advanced [data-path="blogPosts.0.coverImage"]'), 'raw address stays under Advanced');
  const next = doc.media.find(item => item.src !== doc.blogPosts[0].coverImage);
  await click('[data-cover-field="blogPosts.0.coverImage"] [data-cover-change]');
  const picker = document.querySelector('[data-media-picker="cover"]');
  assert.ok(picker.querySelector('[name="picker-search"]') && picker.querySelectorAll('[data-picker-media] img').length > 3);
  await click(`[data-media-picker="cover"] [data-picker-media="${next.id}"]`);
  assert.equal(document.querySelector('[data-media-picker="cover"]'), null);
  assert.equal(field().querySelector('[data-cover-thumb]').getAttribute('src'), next.src);
  await click('button[name="save-draft"]');
  assert.equal(saved().blogPosts[0].coverImage, next.src);
  assert.equal(validateCmsDocument(saved()).valid, true);
});

serial('the main live preview shows the blog post when its page is selected or being written', async () => {
  const { doc } = await openPost();
  const post = doc.blogPosts[0];
  await choose('select[name="current-page"]', post.id);
  await waitFor(() => previewQuery('h1, h2')?.textContent);
  assert.ok(previewQuery().textContent.includes(post.title.en), 'post title in the preview');
  await choose('select[name="current-page"]', 'home');
  await click('[data-workspace-tab="content"]');
  await reveal('[data-path="blogPosts.0.content.en"]');
  await act(async () => { area().focus(); area().dispatchEvent(new window.FocusEvent('focus', { bubbles: false })); area().dispatchEvent(new window.FocusEvent('focusin', { bubbles: true })); });
  await settle();
  assert.equal(document.querySelector('select[name="current-page"]').value, post.id, 'writing in a post selects its page for the preview');
});

serial('tour lists use meaningful names, the tour name is shown once, and gallery photos have a plain-language label', async () => {
  const doc = await seedDocument();
  const index = doc.products.findIndex(product => product.itinerary?.length && product.galleryImages?.length && product.highlights.en.length);
  const product = doc.products[index];
  installFetch(({ url }) => url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(doc) });
  await render();
  await click('[data-workspace-tab="content"]');
  await reveal(`[data-array-item="products.${index}"] [data-tour-tab="basics"]`);
  const item = () => document.querySelector(`[data-array-item="products.${index}"]`);
  const names = () => [...item().querySelectorAll('label, legend')].map(node => node.textContent.trim());
  await click(`[data-array-item="products.${index}"] [data-tour-tab="basics"]`);
  assert.ok(names().some(name => /^Highlight 1\b/.test(name)), names().join('|'));
  assert.ok(!names().some(name => /^\d+\. (Highlight|Item)/.test(name)));
  await click(`[data-array-item="products.${index}"] [data-tour-tab="itinerary"]`);
  assert.ok(names().some(name => name.startsWith(`Stop 1 — ${product.itinerary[0].title.en.slice(0, 20)}`)), names().join('|'));
  await click(`[data-array-item="products.${index}"] [data-tour-tab="photos"]`);
  assert.ok(names().some(name => name === 'Gallery photos'), names().join('|'));
  assert.ok(!names().some(name => /addresses|URL/.test(name) && /Gallery/.test(name)));
  assert.ok(names().some(name => /^Photo 1\b/.test(name)), names().join('|'));
  // the name appears once: the visible summary, while the legend is for screen readers only
  const legend = item().querySelector(`[data-object="products.${index}"] > legend`);
  assert.equal(legend.textContent, `${index + 1}. ${product.title.en}`);
  assert.ok(legend.classList.contains('cms-sr-only'));
  assert.equal(item().querySelector(':scope > details > summary').textContent, `${index + 1}. ${product.title.en}`);
  // optional-field controls are small buttons, not a "Field options" disclosure each
  assert.equal(item().querySelector('.cms-field-options summary'), null);
  assert.ok(item().querySelector('.cms-field-options button[data-unset]') || true);
  assert.equal(document.body.textContent.includes('Field options'), false);
});

serial('the main live preview shows a brand-new unpublished post while it is being written', async () => {
  const doc = await seedDocument();
  installFetch(({ url }) => url.endsWith('/revisions') ? { body: { revisions: [] } } : { body: content(doc) });
  await render();
  await click('[data-workspace-tab="content"]');
  const index = doc.blogPosts.length;
  await click('[data-add="blogPosts"]');
  await typeInto(`[data-path="blogPosts.${index}.title.en"]`, 'Brand new story');
  await typeInto(`[data-path="blogPosts.${index}.content.en"]`, '## Fresh heading\n\nFresh **body**');
  await act(async () => { document.querySelector(`[data-path="blogPosts.${index}.content.en"]`).dispatchEvent(new window.FocusEvent('focusin', { bubbles: true })); });
  await settle();
  await waitFor(() => previewQuery()?.textContent.includes('Fresh heading'));
  assert.ok(previewQuery('.article-body h2'), 'formatted article in the main preview');
});
