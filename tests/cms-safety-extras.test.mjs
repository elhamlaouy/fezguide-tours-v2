process.env.TZ = 'UTC';
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
assign('localStorage', window.localStorage);
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

const { summarizeChanges, deepEqual } = await import('../src/admin/change-summary.ts');
const { describeRevision, whoDid } = await import('../src/admin/history.ts');
const unsaved = await import('../src/admin/unsaved-copy.ts');
const { PUBLISH_LIST_LIMIT } = await import('../src/admin/PublishDialog.tsx');

const TEXTAREA = 'textarea[data-path="pages.home.sections.intro.blocks.0.text.en"]';
const KEY = unsaved.UNSAVED_COPY_KEY;
const copyOf = (doc, baseVersion = 2, savedAt = '2026-11-15T22:55:00.000Z') => ({ v: 1, baseVersion, savedAt, json: JSON.stringify(doc) });
const stored = () => JSON.parse(window.localStorage.getItem(KEY) ?? 'null');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const product = (id, title, price = 30) => ({ id, kind: 'product', actionType: 'book_tour', title: text(title), pageId: 'home', published: true, price: { amount: price, currency: 'EUR', basis: 'person' }, practicalInfo: { priceEUR: price } });

// ---- change summary ----
test('an unchanged draft produces no change lines, and key order does not matter', () => {
  const doc = cmsDoc();
  assert.equal(summarizeChanges(doc, structuredClone(doc), 'en').total, 0);
  assert.ok(deepEqual({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 }));
  assert.ok(!deepEqual({ a: 1 }, { a: 2 }));
});
test('changes are described with the editor names, grouped by area', () => {
  const live = cmsDoc();
  live.products = [product('fez-medina-tour', 'Fez Medina Tour')];
  live.pages.push({ id: 'about', slug: 'about', kind: 'landing', enabled: true, title: text('About'), seo: { title: text('About'), description: text('') }, sections: [
    section('a', 'richText', { variant: 'story', blocks: [] }), section('b', 'richText', { variant: 'story', blocks: [] }), section('c', 'richText', { variant: 'story', blocks: [] })] });
  const draft = structuredClone(live);
  draft.pages[1].sections[0].title = text('changed one');
  draft.pages[1].sections[1].title = text('changed two');
  draft.products[0].price.amount = 45; draft.products[0].practicalInfo.priceEUR = 45;
  draft.siteSettings.siteName = 'Changed name';
  draft.theme.colors.primary = '#111111';
  draft.media.push({ id: 'photo-1', src: '/images/a.jpg', alt: text('A photo') });
  draft.blogPosts.push({ id: 'new-post', title: text('Ten tips'), slug: 'new-post' });
  const out = summarizeChanges(live, draft, 'en').lines.map(line => line.text);
  assert.deepEqual(out, [
    'Page: About — 2 sections changed',
    'Tour: Fez Medina Tour — prices changed',
    'Blog post added: Ten tips',
    'Site settings changed',
    'Design changed',
    'Photo library: 1 added',
  ]);
  const fr = summarizeChanges(live, draft, 'fr').lines.map(line => line.text);
  assert.equal(fr[0], 'Page : About — 2 sections modifiées');
  assert.equal(fr[3], 'Paramètres du site modifiés');
  assert.equal(summarizeChanges(live, draft, 'es').lines[4].text, 'Diseño modificado');
});
test('a first publication has no live version to compare with and lists everything as new', () => {
  const draft = cmsDoc(); draft.media.push({ id: 'p', src: '/images/a.jpg', alt: text('x') });
  const { lines } = summarizeChanges(null, draft, 'en');
  assert.ok(lines.some(line => line.text === 'Photo library: 1 added'));
});

// ---- history labels ----
test('history rows say when, what and who; service tokens read "Automated test"', () => {
  const row = (kind, actor, extra = {}) => ({ version: 7, kind, actor, created_at: '2026-11-15T22:55:00.000Z', source_revision: null, ...extra });
  const view = describeRevision(row('publish', 'owner@example.com'), 'en', 8, 7);
  assert.deepEqual([view.when, view.what, view.who, view.live, view.current], ['15 Nov 2026, 22:55', 'Published', 'owner@example.com', true, false]);
  assert.equal(describeRevision(row('draft', 'a@b.co'), 'en', 7, 3).what, 'Saved draft');
  assert.equal(describeRevision(row('draft', 'a@b.co'), 'en', 7, 3).current, true);
  assert.equal(describeRevision(row('rollback', 'a@b.co', { source_revision: 4 }), 'en', 1, 1).what, 'Rollback to version 4');
  assert.equal(whoDid('service:ci-token', 'en'), 'Automated test');
  assert.equal(whoDid('service:ci-token', 'fr'), 'Test automatique');
  assert.equal(whoDid('9a3f-opaque-subject', 'es'), 'Editor');
  assert.match(describeRevision(row('publish', 'a@b.co'), 'fr', null, null).when, /^15 nov\.? 2026, 22:55$/);
});

// ---- local copy storage ----
test('the local copy survives blocked, full and corrupt storage without throwing', () => {
  assert.equal(unsaved.writeUnsavedCopy({ baseVersion: 3, savedAt: '2026-11-15T10:00:00.000Z', json: '{}' }), true);
  assert.equal(unsaved.readUnsavedCopy().baseVersion, 3);
  unsaved.clearUnsavedCopy();
  assert.equal(unsaved.readUnsavedCopy(), null);
  window.localStorage.setItem(KEY, '{not json');
  assert.equal(unsaved.readUnsavedCopy(), null);
  window.localStorage.setItem(KEY, JSON.stringify({ v: 2, baseVersion: 1, savedAt: 'x', json: '{}' }));
  assert.equal(unsaved.readUnsavedCopy(), null, 'unknown format is ignored');
  window.localStorage.removeItem(KEY);
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
  try {
    assert.equal(unsaved.writeUnsavedCopy({ baseVersion: 1, savedAt: 'x', json: '{}' }), false);
    assert.equal(unsaved.readUnsavedCopy(), null);
    assert.doesNotThrow(() => unsaved.clearUnsavedCopy());
  } finally { Object.defineProperty(globalThis, 'localStorage', original); }
  assert.equal(unsaved.formatWhen('not a date', 'en'), null);
});
test('only the safety-copy module touches browser storage', () => {
  const source = readFileSync(new URL('../src/admin/AdminApp.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.match(readFileSync(new URL('../src/admin/unsaved-copy.ts', import.meta.url), 'utf8'), /try \{/);
});

// ---- editor: unsaved copy ----
serial('typing leaves a local copy after a pause, and saving removes it', async () => {
  window.localStorage.clear();
  installFetch(({ url, method }) => {
    if (url === '/api/admin/content') return { body: content(cmsDoc(), 2) };
    if (url === '/api/admin/content/revisions') return { body: { revisions: [] } };
    if (url === '/api/admin/content/draft' && method === 'PUT') return { body: { version: 3, draftRevision: 3, published: false } };
    throw new Error(`unexpected ${method} ${url}`);
  });
  await render();
  await typeInto(TEXTAREA, 'Typed once');
  assert.equal(stored(), null, 'nothing is written per keystroke');
  await sleep(unsaved.UNSAVED_COPY_DELAY_MS + 250);
  const copy = stored();
  assert.equal(copy.baseVersion, 2);
  assert.match(JSON.parse(copy.json).pages[0].sections[0].blocks[0].text.en, /Typed once/);
  await click('button[name="save-draft"]');
  assert.equal(stored(), null, 'a successful save clears the copy');
  assert.equal(document.querySelector('[data-restore-banner]'), null);
});
serial('closing the page writes the pending edit immediately', async () => {
  window.localStorage.clear();
  installFetch(({ url }) => url === '/api/admin/content' ? { body: content(cmsDoc(), 2) } : { body: { revisions: [] } });
  await render();
  await typeInto(TEXTAREA, 'About to close');
  await act(async () => { window.dispatchEvent(new window.Event('pagehide')); });
  assert.match(stored().json, /About to close/);
});
serial('a differing copy shows the banner; Restore brings the edits back as unsaved and Save uses the copy\'s version', async () => {
  window.localStorage.clear();
  const edited = cmsDoc('Edited before the crash');
  window.localStorage.setItem(KEY, JSON.stringify(copyOf(edited, 2)));
  installFetch(({ url, method, body }) => {
    if (url === '/api/admin/content') return { body: content(cmsDoc(), 2) };
    if (url === '/api/admin/content/revisions') return { body: { revisions: [] } };
    if (url === '/api/admin/content/draft' && method === 'PUT') { assert.equal(body.expectedVersion, 2); return { body: { version: 3, draftRevision: 3, published: false } }; }
    throw new Error(`unexpected ${method} ${url}`);
  });
  await render();
  const banner = await waitFor(() => document.querySelector('[data-restore-banner]'));
  assert.match(banner.textContent, /You have unsaved changes from 15 Nov 2026, 22:55\./);
  assert.equal(banner.querySelector('[data-restore-stale]'), null, 'same version: no stale warning');
  await click('button[name="restore-unsaved"]');
  assert.equal(document.querySelector('[data-restore-banner]'), null);
  assert.equal(document.querySelector('[data-state]').dataset.state, 'unsaved');
  assert.match(document.querySelector('[data-restored-note]').textContent, /Save draft/);
  assert.equal(document.querySelector(TEXTAREA).value, 'Edited before the crash');
  assert.equal(puts().length, 0, 'restoring does not save by itself');
  await click('button[name="save-draft"]');
  assert.equal(puts().length, 1);
  assert.equal(stored(), null);
});
serial('a copy made from an older server version says so, and saving it goes through the version conflict', async () => {
  window.localStorage.clear();
  window.localStorage.setItem(KEY, JSON.stringify(copyOf(cmsDoc('Old base edit'), 2)));
  installFetch(({ url, method, body }) => {
    if (url === '/api/admin/content') return { body: content(cmsDoc('Newer server text'), 5) };
    if (url === '/api/admin/content/revisions') return { body: { revisions: [] } };
    if (url === '/api/admin/content/draft' && method === 'PUT') { assert.equal(body.expectedVersion, 2, 'the copy keeps the version it came from'); return { status: 409, body: { error: 'version_conflict' } }; }
    throw new Error(`unexpected ${method} ${url}`);
  });
  await render();
  const banner = await waitFor(() => document.querySelector('[data-restore-banner]'));
  assert.match(banner.querySelector('[data-restore-stale]').textContent, /version 2.*now version 5/);
  await click('button[name="restore-unsaved"]');
  await click('button[name="save-draft"]');
  await waitFor(() => document.querySelector('[data-admin-conflict]'));
  assert.equal(document.querySelector(TEXTAREA).value, 'Newer server text', 'the newer draft is not overwritten');
  assert.ok(stored(), 'the copy is kept after a conflict');
  assert.ok(document.querySelector('[data-restore-banner]'), 'and offered again');
});
serial('Discard asks first and removes the copy; an identical copy never shows a banner', async () => {
  window.localStorage.clear();
  window.localStorage.setItem(KEY, JSON.stringify(copyOf(cmsDoc('Something else'))));
  installFetch(({ url }) => url === '/api/admin/content' ? { body: content(cmsDoc(), 2) } : { body: { revisions: [] } });
  await render();
  await waitFor(() => document.querySelector('[data-restore-banner]'));
  let asked = 0;
  window.confirm = () => { asked += 1; return false; };
  await click('button[name="discard-unsaved"]');
  assert.equal(asked, 1);
  assert.ok(document.querySelector('[data-restore-banner]') && stored(), 'declining keeps the copy');
  window.confirm = () => true;
  await click('button[name="discard-unsaved"]');
  assert.equal(document.querySelector('[data-restore-banner]'), null);
  assert.equal(stored(), null);
  window.localStorage.setItem(KEY, JSON.stringify(copyOf(cmsDoc())));
  await render();
  await settle();
  assert.equal(document.querySelector('[data-restore-banner]'), null);
  assert.equal(stored(), null, 'a copy equal to the saved draft is dropped');
});
serial('the banner is localized and a corrupt copy reports a problem instead of loading', async () => {
  window.localStorage.clear();
  const broken = copyOf(cmsDoc('x')); broken.json = JSON.stringify({ schemaVersion: 1 });
  window.localStorage.setItem(KEY, JSON.stringify(broken));
  installFetch(({ url }) => url === '/api/admin/content' ? { body: content(cmsDoc(), 2) } : { body: { revisions: [] } });
  await render('fr');
  const banner = await waitFor(() => document.querySelector('[data-restore-banner]'));
  assert.match(banner.textContent, /Vous avez des modifications non enregistrées du 15 nov\.? 2026, 22:55\./);
  await click('button[name="restore-unsaved"]');
  assert.ok(document.querySelector('[data-restore-problem]'));
  assert.notEqual(document.querySelector('[data-state]').dataset.state, 'unsaved', 'a corrupt copy never replaces the draft');
  assert.equal(document.querySelector('button[name="discard-unsaved"]').textContent, 'Supprimer');
  await render('es');
  assert.match((await waitFor(() => document.querySelector('[data-restore-banner]'))).textContent, /Tienes cambios sin guardar del 15 nov\.? 2026, 22:55\./);
  window.localStorage.clear();
});

// ---- editor: publish confirmation ----
function publishHandler({ live, draft = cmsDoc(), published = 1, onPublish } = {}) {
  return ({ url, method }) => {
    if (url === '/api/admin/content') return { body: { version: 4, draftRevision: 4, publishedRevision: published, document: draft } };
    if (url === '/api/admin/content/revisions') return { body: { revisions: [] } };
    if (url === `/api/admin/content/revisions/${published}`) return { body: { version: published, kind: 'publish', document: live ?? cmsDoc() } };
    if (url === '/api/admin/content/publish' && method === 'POST') { onPublish?.(); return { body: { version: 5, draftRevision: 5, published: true } }; }
    throw new Error(`unexpected ${method} ${url}`);
  };
}
serial('Publish first shows what changed; Cancel publishes nothing', async () => {
  window.localStorage.clear();
  installFetch(publishHandler({ live: cmsDoc('Old live text') }));
  await render();
  await click('button[name="publish"]');
  const dialog = await waitFor(() => document.querySelector('[data-publish-dialog]'));
  assert.equal(dialog.getAttribute('role'), 'dialog');
  assert.equal(dialog.getAttribute('aria-modal'), 'true');
  assert.equal(document.getElementById(dialog.getAttribute('aria-labelledby')).textContent, 'Publish to the live website?');
  await waitFor(() => dialog.querySelector('[data-publish-changes]'));
  assert.match(dialog.textContent, /Page: Home — 1 section changed/);
  assert.equal(document.activeElement.getAttribute('name'), 'cancel-publish');
  await click('button[name="cancel-publish"]');
  assert.equal(document.querySelector('[data-publish-dialog]'), null);
  assert.equal(calls.filter(call => call.url.endsWith('/publish')).length, 0);
  assert.equal(puts().length, 0);
});
serial('with nothing changed the dialog says so, and Publish still works', async () => {
  window.localStorage.clear();
  let published = 0;
  installFetch(publishHandler({ onPublish: () => { published += 1; } }));
  await render();
  await click('button[name="publish"]');
  const dialog = await waitFor(() => document.querySelector('[data-publish-dialog]'));
  await waitFor(() => dialog.querySelector('[data-publish-none]'));
  assert.match(dialog.textContent, /Nothing has changed compared with the live website\./);
  await click('button[name="confirm-publish"]');
  await waitFor(() => document.querySelector('[data-revision="5"]'));
  assert.equal(published, 1);
  assert.equal(document.querySelector('[data-publish-dialog]'), null);
});
serial('a long list is capped at twelve lines plus "and N more", and a failed lookup still allows publishing', async () => {
  window.localStorage.clear();
  const live = cmsDoc();
  const draft = structuredClone(live);
  for (let i = 0; i < 16; i += 1) draft.pages.push({ id: `extra-${i}`, slug: `extra-${i}`, kind: 'landing', enabled: true, title: text(`Extra ${i}`), seo: { title: text('x'), description: text('') }, sections: [section('s', 'richText', { variant: 'story', blocks: [] })] });
  installFetch(publishHandler({ live, draft }));
  await render();
  await click('button[name="publish"]');
  const list = await waitFor(() => document.querySelector('[data-publish-changes]'));
  assert.equal(list.querySelectorAll('li[data-area]').length, PUBLISH_LIST_LIMIT);
  assert.equal(list.querySelector('[data-publish-more]').textContent, '…and 4 more');
  await click('button[name="cancel-publish"]');
  installFetch(({ url }) => url === '/api/admin/content' ? { body: { version: 4, draftRevision: 4, publishedRevision: 1, document: cmsDoc() } }
    : url.endsWith('/revisions') ? { body: { revisions: [] } } : url.endsWith('/publish') ? { body: { version: 5, draftRevision: 5, published: true } } : { status: 500, body: { error: 'boom' } });
  await render('es');
  await click('button[name="publish"]');
  const failed = await waitFor(() => document.querySelector('[data-publish-failed]'));
  assert.match(failed.textContent, /No se pudo cargar la lista de cambios/);
  assert.equal(document.querySelector('button[name="confirm-publish"]').textContent, 'Publicar');
  await click('button[name="confirm-publish"]');
  await waitFor(() => document.querySelector('[data-revision="5"]'));
});
serial('the publish dialog keeps keyboard focus inside and closes on Escape', async () => {
  window.localStorage.clear();
  installFetch(publishHandler());
  await render();
  await click('button[name="publish"]');
  const dialog = await waitFor(() => document.querySelector('[data-publish-dialog]'));
  await waitFor(() => !document.querySelector('[name="confirm-publish"]').disabled);
  const confirm = document.querySelector('[name="confirm-publish"]');
  const cancel = document.querySelector('[name="cancel-publish"]');
  confirm.focus();
  await act(async () => { dialog.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })); });
  assert.equal(document.activeElement, cancel, 'Tab from the last button wraps to the first');
  await act(async () => { dialog.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })); });
  assert.equal(document.activeElement, confirm, 'Shift+Tab from the first wraps to the last');
  await act(async () => { dialog.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
  assert.equal(document.querySelector('[data-publish-dialog]'), null);
});

// ---- editor: readable history ----
serial('History lists date, who, what and the Live now / Current draft markers, and rollback still works', async () => {
  window.localStorage.clear();
  const revisions = [
    { version: 6, kind: 'draft', actor: 'owner@example.com', created_at: '2026-11-15T22:55:00.000Z', source_revision: null },
    { version: 5, kind: 'publish', actor: 'owner@example.com', created_at: '2026-11-14T09:05:00.000Z', source_revision: 4 },
    { version: 4, kind: 'rollback', actor: 'service:ci', created_at: '2026-11-13T08:00:00.000Z', source_revision: 2 },
  ];
  installFetch(({ url, method, body }) => {
    if (url === '/api/admin/content') return { body: { version: 6, draftRevision: 6, publishedRevision: 5, document: cmsDoc() } };
    if (url === '/api/admin/content/revisions') return { body: { revisions } };
    if (url === '/api/admin/content/rollback' && method === 'POST') { assert.deepEqual(body, { expectedVersion: 6, revision: 5 }); return { body: { version: 7, draftRevision: 7, published: true } }; }
    throw new Error(`unexpected ${method} ${url}`);
  });
  await render();
  await reveal('[data-history]');
  const rows = [...document.querySelectorAll('[data-history] li[data-history-version]')];
  assert.equal(rows.length, 3);
  assert.match(rows[0].textContent, /15 Nov 2026, 22:55/);
  assert.match(rows[0].textContent, /Saved draft/);
  assert.match(rows[0].textContent, /by owner@example\.com/);
  assert.match(rows[0].querySelector('[data-mark="draft"]').textContent, /Current draft/);
  assert.equal(rows[0].querySelector('[data-mark="live"]'), null);
  assert.match(rows[1].querySelector('[data-mark="live"]').textContent, /Live now/);
  assert.match(rows[1].textContent, /Published/);
  assert.match(rows[2].textContent, /Rollback to version 2/);
  assert.match(rows[2].textContent, /Automated test/);
  assert.doesNotMatch(document.querySelector('[data-history]').textContent, /service:/);
  await click('[data-history] li[data-history-version="5"] button');
  assert.equal(document.querySelector('input[name="rollback-revision"]').value, '5');
  await click('button[name="rollback"]');
  await waitFor(() => document.querySelector('[data-revision="7"]'));
});
