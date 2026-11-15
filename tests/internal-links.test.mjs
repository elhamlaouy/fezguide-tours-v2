import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { register } from 'tsx/esm/api';

register();
registerHooks({ load(url, context, nextLoad) {
  if (url.endsWith('.css')) return { format: 'module', source: 'export default {};', shortCircuit: true };
  return nextLoad(url, context);
} });
const { Window } = await import('happy-dom');
const window = new Window({ url: 'https://fez.example/' });
const assign = (key, value) => Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
for (const key of ['window', 'document', 'navigator']) assign(key, key === 'window' ? window : window[key]);
for (const key of Object.getOwnPropertyNames(window)) {
  if (!(key in globalThis) && typeof window[key] === 'function' && /^[A-Z]/.test(key)) assign(key, window[key]);
}
assign('IS_REACT_ACT_ENVIRONMENT', true);
const { act, createElement } = await import('react');
const { createRoot } = await import('react-dom/client');
const { renderToStaticMarkup } = await import('react-dom/server');
const { CmsProvider, CmsPreviewProvider } = await import('../src/context/CmsContext.tsx');
const { Navbar } = await import('../src/components/Navbar.tsx');
const { Footer } = await import('../src/components/Footer.tsx');
const { PageCrumbBar } = await import('../src/components/PageCrumbBar.tsx');
const { SectionCard } = await import('../src/components/SectionCard.tsx');
const { InternalLink } = await import('../src/components/InternalLink.tsx');
const { PageRenderer } = await import('../src/cms/PageRenderer.tsx');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { FEZ_PILLARS } = await import('../src/data/translations.ts');

const LANGUAGES = [['en', ''], ['fr', '/fr'], ['es', '/es']];
const seed = createCmsSeed();
const withCms = children => createElement(CmsPreviewProvider, { document: seed }, children);
const withLegacy = children => createElement(CmsProvider, null, children);
const hrefs = html => { const host = new Window().document.createElement('div'); host.innerHTML = html; return [...host.querySelectorAll('a[href]')].map(a => a.getAttribute('href')); };
const noop = () => {};
const navbar = (language, document) => createElement(Navbar, { currentPage: 'home', language, document, onNavigate: noop, onLanguageChange: noop, onOpenBooking: noop });

test('Navbar and Footer render real anchors with locale-prefixed paths, in CMS and source-fallback modes', () => {
  for (const [language, prefix] of LANGUAGES) {
    for (const [mode, wrap, document] of [['cms', withCms, seed], ['source', withLegacy, null]]) {
      const header = renderToStaticMarkup(wrap(navbar(language, document)));
      const footer = renderToStaticMarkup(wrap(createElement(Footer, { language, document, onNavigate: noop })));
      for (const [name, html] of [['navbar', header], ['footer', footer]]) {
        const links = hrefs(html);
        assert.ok(links.includes(prefix || '/'), `${mode}/${language}/${name}: home link`);
        assert.ok(links.includes(`${prefix}/fez`), `${mode}/${language}/${name}: /fez link ${links}`);
        assert.ok(links.includes(`${prefix}/about`), `${mode}/${language}/${name}: about link`);
        assert.ok(links.includes(`${prefix}/day-trips`), `${mode}/${language}/${name}: day-trips link`);
      }
      // Navigation items are anchors, not buttons: every nav page label is inside an <a>.
      const nav = /<nav\b[\s\S]*?<\/nav>/.exec(header)[0];
      assert.equal(/<button\b/.test(nav), false, `${mode}/${language}: no navigation buttons`);
    }
  }
});

test('breadcrumb links Home and parent, marks the current page and offers a Back link', () => {
  for (const [language, prefix] of LANGUAGES) {
    const html = renderToStaticMarkup(withCms(createElement(PageCrumbBar, { language, parentLabel: 'Fez', parentPageId: 'fez', currentTitle: 'Current article', onHome: noop, onParent: noop })));
    assert.deepEqual(hrefs(html), [prefix || '/', `${prefix}/fez`, `${prefix}/fez`], language);
    assert.match(html, /<span aria-current="page"[^>]*>Current article<\/span>/);
    assert.equal(/<button\b/.test(html), false);
    assert.equal(/<a\b[^>]*aria-current/.test(html), false, 'current page is plain text');
  }
});

test('SectionCard is a set of anchors to the product page with no nested interactive controls', () => {
  const pillar = FEZ_PILLARS.find(item => item.id === 'our-fez-tours') ?? FEZ_PILLARS[0];
  for (const [language, prefix] of LANGUAGES) {
    const html = renderToStaticMarkup(withLegacy(createElement(SectionCard, { pillar, language, onExplore: noop, onBookTour: noop })));
    const links = hrefs(html);
    assert.ok(links.length >= 3, 'image, copy and action links');
    assert.ok(links.every(href => href === `${prefix}/${pillar.id}`), `${language}: ${links}`);
    assert.equal(/role="button"/.test(html), false);
    const host = new Window().document.createElement('div'); host.innerHTML = html;
    assert.equal(host.querySelectorAll('a a, a button, button a').length, 0, 'no nested interactive elements');
  }
});

test('CMS cards, product grids and action links render localized hrefs', () => {
  const text = en => ({ en, fr: en, es: en });
  const doc = createCmsSeed();
  const product = doc.products.find(item => doc.pages.some(page => page.productId === item.id));
  const target = doc.pages.find(page => page.productId === product.id);
  doc.pages.push({ id: 'links-demo', slug: 'links-demo', kind: 'landing', enabled: true, title: text('Links demo'), seo: { title: text('Demo'), description: text('Demo') }, sections: [
    { id: 'cards', type: 'cardGrid', variant: 'standard', enabled: true, title: text('Cards'), cards: [{ id: 'card-1', pageId: 'about', title: text('About card'), description: text('About') }] },
    { id: 'products', type: 'productGrid', variant: 'standard', enabled: true, title: text('Products'), productIds: [product.id] },
    { id: 'cta', type: 'cta', variant: 'banner', enabled: true, links: [{ id: 'cta-link', enabled: true, pageId: 'fez', label: text('Go to Fez') }] },
  ] });
  const page = doc.pages.at(-1);
  const slug = encodeURIComponent(target.slug);
  for (const [language, prefix] of LANGUAGES) {
    const html = renderToStaticMarkup(createElement(PageRenderer, { document: doc, page, language, onNavigate: noop, onBook: noop }));
    const host = new Window().document.createElement('div'); host.innerHTML = html;
    const link = selector => host.querySelector(selector)?.getAttribute('href');
    assert.equal(link('a.cms-card[data-page-id="about"]'), `${prefix}/about`, `${language}: card`);
    assert.equal(link('a.cms-product-card'), `${prefix}/${slug}`, `${language}: product card`);
    assert.equal(link('a.cms-button[data-page-id="fez"]'), `${prefix}/fez`, `${language}: action`);
    assert.equal(host.querySelectorAll('button[data-page-id]').length, 0, `${language}: no page-targeting buttons`);
    assert.equal(host.querySelectorAll('a a, a button').length, 0, 'no nested interactive elements');
  }
});

const mount = async element => {
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(element));
  return { host, unmount: () => act(async () => root.unmount()) };
};
const click = async (target, init = {}) => {
  const event = new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
  await act(async () => target.dispatchEvent(event));
  return event;
};

test('a plain click is handled client-side; modified and non-primary clicks are left to the browser', async () => {
  const calls = [];
  const { host, unmount } = await mount(createElement(InternalLink, { href: '/fr/fez', onNavigate: () => calls.push('go'), className: 'x' }, 'Fès'));
  const link = host.querySelector('a');
  assert.equal(link.getAttribute('href'), '/fr/fez');
  assert.equal(link.className, 'x');
  assert.equal((await click(link)).defaultPrevented, true);
  assert.deepEqual(calls, ['go']);
  for (const init of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
    assert.equal((await click(link, init)).defaultPrevented, false, JSON.stringify(init));
  }
  assert.deepEqual(calls, ['go'], 'modified clicks never run the SPA handler');
  await unmount();
});

test('Navbar and Footer links invoke the navigation handler without a full reload', async () => {
  const calls = [];
  const onNavigate = page => calls.push(page);
  const { host, unmount } = await mount(withCms(createElement('div', null,
    createElement(Navbar, { currentPage: 'home', language: 'fr', document: seed, onNavigate, onLanguageChange: noop, onOpenBooking: noop }),
    createElement(Footer, { language: 'fr', document: seed, onNavigate }),
  )));
  const nav = host.querySelector('nav a[href="/fr/fez"]');
  assert.ok(nav, 'FR Fez nav link');
  const event = await click(nav);
  assert.equal(event.defaultPrevented, true, 'browser navigation (full reload) is cancelled');
  assert.deepEqual(calls, ['fez']);
  const modified = await click(host.querySelector('footer a[href="/fr/fez"]'), { ctrlKey: true });
  assert.equal(modified.defaultPrevented, false, 'ctrl-click opens a new tab natively');
  assert.deepEqual(calls, ['fez']);
  await click(host.querySelector('footer a[href="/fr/about"]'));
  assert.deepEqual(calls, ['fez', 'about']);
  await unmount();
});
after(async () => { await window.happyDOM.close(); });

test('Navbar never overflows: tighter spacing first, then the compact menu button', async () => {
  const proto = window.HTMLElement.prototype;
  const original = { sw: Object.getOwnPropertyDescriptor(proto, 'scrollWidth'), cw: Object.getOwnPropertyDescriptor(proto, 'clientWidth') };
  // Simulate a header row that is too narrow for the full menu even with tighter spacing.
  Object.defineProperty(proto, 'scrollWidth', { configurable: true, get() { return this.hasAttribute?.('data-nav-fit') ? 1400 : 0; } });
  Object.defineProperty(proto, 'clientWidth', { configurable: true, get() { return this.hasAttribute?.('data-nav-fit') ? 1200 : 0; } });
  try {
    const { host, unmount } = await mount(withCms(navbar('es', seed)));
    const row = host.querySelector('[data-nav-fit]');
    assert.equal(row.getAttribute('data-nav-fit'), '2', 'falls back to the compact menu');
    assert.match(host.querySelector('header nav').className, /^hidden$/, 'full menu hidden when it cannot fit');
    await unmount();
    // Fits with tighter spacing.
    Object.defineProperty(proto, 'scrollWidth', { configurable: true, get() { if (!this.hasAttribute?.('data-nav-fit')) return 0; return this.getAttribute('data-nav-fit') === '0' ? 1250 : 1190; } });
    const second = await mount(withCms(navbar('es', seed)));
    assert.equal(second.host.querySelector('[data-nav-fit]').getAttribute('data-nav-fit'), '1', 'tighter spacing is enough');
    assert.match(second.host.querySelector('header nav').className, /gap-3/);
    await second.unmount();
  } finally {
    for (const [key, d] of [['scrollWidth', original.sw], ['clientWidth', original.cw]]) { if (d) Object.defineProperty(proto, key, d); else delete proto[key]; }
  }
});
