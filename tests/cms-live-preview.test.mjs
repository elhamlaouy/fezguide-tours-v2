import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { register } from 'tsx/esm/api';

register();
registerHooks({ load(url, context, nextLoad) {
  if (url.endsWith('.css')) return { format: 'module', source: 'export default {};', shortCircuit: true };
  return nextLoad(url, context);
} });
const { Window } = await import('happy-dom');
const window = new Window({ url: 'https://fez.example/admin' });
const assign = (key, value) => Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
for (const key of ['window', 'document', 'navigator']) assign(key, key === 'window' ? window : window[key]);
for (const key of Object.getOwnPropertyNames(window)) {
  if (!(key in globalThis) && typeof window[key] === 'function' && /^[A-Z]/.test(key)) assign(key, window[key]);
}
assign('getComputedStyle', window.getComputedStyle.bind(window));
assign('IS_REACT_ACT_ENVIRONMENT', true);
const observers = new Set();
class ResizeObserver {
  constructor(callback) { this.callback = callback; observers.add(this); }
  observe(target) { this.target = target; this.callback([{ target, contentRect: { width: 900, height: 520 } }]); }
  disconnect() { observers.delete(this); }
}
assign('ResizeObserver', ResizeObserver);
const { act, createElement } = await import('react');
const { createRoot } = await import('react-dom/client');
const { LivePreview } = await import('../src/admin/LivePreview.tsx');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const text = en => ({ en, fr: en, es: en });
let root, props, selections, navigation;
const render = async () => { await act(async () => root.render(createElement(LivePreview, props))); };
const frame = () => document.querySelector('[data-preview] iframe');
const inside = selector => frame().contentDocument.querySelector(selector);
const click = async element => { await act(async () => element.click()); };
beforeEach(async () => {
  if (root) await act(async () => root.unmount());
  document.body.replaceChildren();
  document.head.replaceChildren();
  const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const model = createCmsSeed();
  model.pages = [
    { id: 'home', slug: 'home', kind: 'landing', enabled: true, title: text('Preview title'), seo: { title: text('Home'), description: text('Description') }, sections: [
      { id: 'intro', type: 'richText', variant: 'story', enabled: true, title: text('Our story'), blocks: [{ type: 'paragraph', text: text('Unsaved draft paragraph') }, { type: 'link', text: text('External contact'), href: 'https://wa.me/123456789' }] },
      { id: 'next', type: 'cta', variant: 'banner', enabled: true, links: [{ id: 'about-link', enabled: true, pageId: 'about', label: text('Read about us') }] },
    ] },
    { id: 'about', slug: 'about', kind: 'editorial', enabled: true, title: text('About'), seo: { title: text('About'), description: text('About description') }, sections: [] },
  ];
  selections = []; navigation = [];
  props = { document: model, page: model.pages[0], language: 'en', selectedSectionId: 'intro', onSelectSection: id => selections.push(id), onNavigate: id => navigation.push(id), device: 'desktop', onDeviceChange: device => { props = { ...props, device }; root.render(createElement(LivePreview, props)); } };
});
after(async () => { if (root) await act(async () => root.unmount()); await window.happyDOM.close(); });

test('a fitted isolated desktop viewport responds to the available 320px and 900px, without rerendering a duplicate page', async () => {
  await render();
  assert.equal(frame().getAttribute('sandbox'), 'allow-same-origin');
  assert.equal(frame().hasAttribute('src'), false);
  assert.equal(frame().hasAttribute('srcdoc'), false);
  assert.match(frame().title, /Live preview.*Desktop/);
  assert.equal(frame().width, '1280');
  assert.equal(frame().style.transform, 'scale(0.703125)');
  assert.equal(document.querySelector('.cms-page'), null);
  assert.match(inside('h1').textContent, /Preview title/);
  await act(async () => { for (const observer of observers) observer.callback([{ contentRect: { width: 320, height: 500 } }]); });
  assert.equal(frame().style.width, '1280px');
  assert.equal(frame().style.transform, 'scale(0.25)');
  assert.equal(frame().height, '2000');
  assert.equal(document.querySelector('.cms-live-preview-fitted').style.width, '320px');
  await act(async () => { for (const observer of observers) observer.callback([{ contentRect: { width: 900, height: 500 } }]); });
  assert.equal(frame().style.transform, 'scale(0.703125)');
  assert.equal(document.querySelector('.cms-live-preview-fitted').style.width, '900px');
  await click(document.querySelector('[name="preview-mobile"]'));
  assert.equal(document.querySelector('[data-preview]').dataset.previewSize, 'mobile');
  assert.equal(frame().width, '390');
  assert.equal(frame().style.transform, 'scale(1)');
  assert.equal(document.querySelector('[name="preview-mobile"]').getAttribute('aria-pressed'), 'true');
  assert.equal(document.querySelector('.cms-live-preview-fitted').style.width, '390px');
});

test('choosing another part scrolls that iframe section into view, while typing does not jump', async () => {
  await render();
  const view = frame().contentWindow, original = view.scrollTo, calls = [];
  view.scrollTo = options => calls.push(options.top);
  inside('[data-section-id="next"]').getBoundingClientRect = () => ({ top: 440 });
  try {
    props = { ...props, selectedSectionId: 'next' }; await render();
    assert.deepEqual(calls, [Math.max(0, 440 + view.scrollY - 80)]);
    props = { ...props, page: { ...props.page, title: text('Typing without a scroll reset') } }; await render();
    assert.equal(calls.length, 1);
  } finally { view.scrollTo = original; }
});

test('unsaved updates preserve the frame, scroll position and editor-only theme values', async () => {
  await render();
  const originalFrame = frame(), originalDoc = frame().contentDocument;
  originalDoc.documentElement.scrollTop = 275;
  props = { ...props, document: { ...props.document, theme: { ...props.document.theme, cardVariant: 'flat', buttonVariant: 'outline', colors: { ...props.document.theme.colors, primary: '#123456' } } }, page: { ...props.page, sections: props.page.sections.map(section => section.id === 'intro' ? { ...section, blocks: [{ type: 'paragraph', text: text('Edited before saving') }] } : section) } };
  await render();
  assert.equal(frame(), originalFrame);
  assert.equal(frame().contentDocument, originalDoc);
  assert.equal(originalDoc.documentElement.scrollTop, 275);
  assert.match(originalDoc.body.textContent, /Edited before saving/);
  assert.doesNotMatch(originalDoc.body.textContent, /Unsaved draft paragraph/);
  assert.equal(inside('[data-cms-site]').style.getPropertyValue('--cms-primary'), '#123456');
  assert.equal(inside('[data-cms-site]').getAttribute('data-card-variant'), 'flat');
  assert.equal(inside('[data-cms-site]').getAttribute('data-button-variant'), 'outline');
  assert.equal(window.location.pathname, '/admin');
  assert.equal(originalDoc.querySelector('script'), null);
});

test('section click and keyboard selection use canonical IDs and suppress actions by default', async () => {
  await render();
  assert.match(document.querySelector('.cms-live-preview-hint').textContent, /Click a section to edit it/);
  assert.equal(inside('[data-section-id="intro"]').dataset.cmsPreviewSelected, 'true');
  assert.match(inside('[data-section-id="intro"]').dataset.cmsPreviewLabel, /Our story/);
  assert.match(inside('[data-section-id="next"]').dataset.cmsPreviewLabel, /Call to action/);
  assert.equal(inside('[data-section-id="next"]').tabIndex, 0);
  await click(inside('[data-section-id="intro"] p'));
  await click(inside('[data-section-id="next"] button'));
  assert.deepEqual(selections, ['intro', 'next']);
  assert.deepEqual(navigation, []);
  const link = inside('a');
  const event = new window.MouseEvent('click', { bubbles: true, cancelable: true });
  await act(async () => link.dispatchEvent(event));
  assert.equal(event.defaultPrevented, true);
  assert.equal(selections.at(-1), 'intro');
  await act(async () => inside('[data-section-id="next"]').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })));
  assert.equal(selections.at(-1), 'next');
});

test('browse mode allows local draft page navigation, but external contact stays inert', async () => {
  await render();
  await click(document.querySelector('[name="preview-browse"]'));
  assert.equal(inside('[data-section-id="intro"]').hasAttribute('tabindex'), false);
  await click(inside('[data-section-id="next"] button'));
  assert.deepEqual(navigation, ['about']);
  assert.deepEqual(selections, []);
  const event = new window.MouseEvent('click', { bubbles: true, cancelable: true });
  await act(async () => inside('a').dispatchEvent(event));
  assert.equal(event.defaultPrevented, true);
  assert.equal(window.location.pathname, '/admin');
});

test('frame copies live same-origin stylesheets only, with real media queries intact', async () => {
  const style = document.createElement('style'); style.textContent = '@media (max-width: 720px) { .cms-page { color: red; } }';
  const local = document.createElement('link'); local.rel = 'stylesheet'; local.href = '/assets/site.css';
  const remote = document.createElement('link'); remote.rel = 'stylesheet'; remote.href = 'https://remote.example/site.css';
  document.head.append(style, local, remote);
  await render();
  const head = frame().contentDocument.head;
  assert.match(head.textContent, /@media \(max-width: 720px\)/);
  assert.equal(head.querySelectorAll('link[rel="stylesheet"]').length, 1);
  assert.match(head.querySelector('link').href, /fez.example\/assets\/site.css/);
  await act(async () => { style.textContent = '@media (max-width: 720px) { .cms-page { color: blue; } }'; await Promise.resolve(); });
  assert.match(head.textContent, /color: blue/);
  assert.doesNotMatch(head.textContent, /color: red/);
});

test('French and Spanish controls, hints, frame language and friendly section labels are localized', async () => {
  for (const [language, hint, title] of [['fr', 'Cliquez sur une section', 'Aperçu en direct'], ['es', 'Haz clic en una sección', 'Vista previa en directo']]) {
    props = { ...props, language };
    await render();
    assert.ok(document.querySelector('.cms-live-preview-hint').textContent.includes(hint));
    assert.ok(frame().title.includes(title));
    assert.equal(frame().contentDocument.documentElement.lang, language);
    assert.doesNotMatch(document.querySelector('.cms-live-preview-tools').textContent, /Select sections|Browse preview/);
    assert.doesNotMatch(inside('[data-section-id="next"]').dataset.cmsPreviewLabel, /Call to action/);
  }
});
