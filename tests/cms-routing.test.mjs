import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'tsx/esm/api';
register();
const { createCmsSeed } = await import('../src/cms/seed.ts');

test('published route resolution uses stable locale paths and canonicalizes legacy query/id aliases', async () => {
  const routing = await import('../src/cms/routing.ts').catch(() => ({}));
  assert.equal(typeof routing.resolveRoute, 'function', 'shared route resolver exists');
  const document = createCmsSeed();
  const page = document.pages.find(page => page.id === 'page-bespoke-itinerary');
  for (const language of ['en', 'fr', 'es']) {
    const path = `${language === 'en' ? '' : `/${language}`}/${page.slug}`;
    const route = routing.resolveRoute(new URL(`https://untrusted.test${path}`), document);
    assert.equal(route.language, language);
    assert.equal(route.page.id, page.id);
    assert.equal(route.redirect, undefined);
    assert.equal(routing.pagePath(document, page.id, language), path);
  }
  for (const [input, expected] of [
    ['/?page=about', '/about'], ['/?experience=our-fez-tours', '/our-fez-tours'],
    ['/?tour=our-fez-tours&lang=es', '/es/our-fez-tours'],
    ['/fr/page-bespoke-itinerary', `/fr/${page.slug}`], ['/fr/home/', '/fr'],
  ]) assert.equal(routing.resolveRoute(new URL(`https://untrusted.test${input}`), document).redirect, expected);
  for (const input of ['/missing', '/fr/missing', '/es/a/b']) {
    const route = routing.resolveRoute(new URL(`https://untrusted.test${input}`), document);
    assert.equal(route.page, undefined);
    assert.notEqual(route.pageId, 'home');
    assert.equal(route.redirect, undefined);
  }
  const home = document.pages.find(page => page.id === 'home');
  home.slug = 'welcome';
  page.slug = 'home';
  assert.equal(routing.resolveRoute(new URL('https://untrusted.test/'), document).page.id, 'home', 'locale roots belong to the stable home id, never an unrelated slug');
  assert.equal(routing.resolveRoute(new URL('https://untrusted.test/fr'), document).page.id, 'home');
  assert.equal(routing.resolveRoute(new URL('https://untrusted.test/?page=home'), document).page.id, 'home', 'legacy query identifiers retain their id meaning');
  assert.equal(routing.resolveRoute(new URL('https://untrusted.test/home'), document).page.id, page.id, 'actual slugs win over legacy id aliases on non-root paths');
  document.pages.find(page => page.id === 'about').enabled = false;
  assert.equal(routing.resolveRoute(new URL('https://untrusted.test/about'), document).page, undefined);
  assert.equal(routing.resolveRoute(new URL('https://untrusted.test/?page=about'), document).redirect, undefined);
});

test('mounted public shell tracks locale URLs, CMS-only navigation and popstate without history state', async () => {
  const { registerHooks } = await import('node:module');
  registerHooks({ load(url, context, nextLoad) {
    if (url.endsWith('.css')) return { format: 'module', source: 'export default "";', shortCircuit: true };
    return nextLoad(url, context);
  } });
  const { Window } = await import('happy-dom');
  const window = new Window({ url: 'https://fez.test/fr/about' });
  for (const key of ['window', 'document', 'HTMLElement', 'Node', 'navigator']) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: window[key] ?? window });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { act, createElement } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { default: App } = await import('../src/App.tsx');
  const document = createCmsSeed();
  document.navigation.push({ id: 'route-test', label: { en: 'Route test', fr: 'Route test', es: 'Route test' }, enabled: true, pageId: 'page-bespoke-itinerary' });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async path => Response.json(path === '/api/cms/document' ? { version: 2, document } : document.legacy);
  const host = window.document.createElement('div');
  window.document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => { root.render(createElement(App)); await new Promise(resolve => setTimeout(resolve, 30)); });
    assert.equal(window.document.documentElement.lang, 'fr');
    assert.match(host.querySelector('main').textContent, /Fès|guides|Guides/);
    await act(async () => { [...host.querySelectorAll('nav button')].find(button => button.textContent.trim() === 'Route test').click(); });
    assert.equal(window.location.pathname, '/fr/bespoke-morocco-experiences');
    assert.ok(host.querySelector('article.cms-page'));
    assert.match(host.querySelector('h1').textContent, /Voyages Sur Mesure/);
    assert.equal(window.document.title, document.pages.find(page => page.id === 'page-bespoke-itinerary').seo.title.fr);
    assert.equal(window.document.querySelector('link[rel="canonical"]').href, 'https://fezguidetours.elhamlaouy.workers.dev/fr/bespoke-morocco-experiences');
    await act(async () => { window.history.back(); await new Promise(resolve => setTimeout(resolve, 10)); });
    assert.equal(window.location.pathname, '/fr/about');
    assert.equal(host.querySelector('article.cms-page').lang, 'fr');
    await act(async () => { window.history.forward(); await new Promise(resolve => setTimeout(resolve, 10)); });
    assert.equal(window.location.pathname, '/fr/bespoke-morocco-experiences');
    assert.match(host.querySelector('h1').textContent, /Voyages Sur Mesure/);
    for (const [path, lang, expected] of [['/es/about', 'es', /Fez/], ['/fr/missing', 'fr', /404/], ['/fr/bespoke-morocco-experiences', 'fr', /Voyages Sur Mesure/]]) {
      await act(async () => {
        window.history.pushState(null, '', path);
        window.dispatchEvent(new window.PopStateEvent('popstate', { state: null }));
      });
      assert.equal(window.document.documentElement.lang, lang);
      assert.match(host.querySelector('main').textContent, expected);
    }
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch = originalFetch;
    await window.happyDOM.close();
    for (const key of ['window', 'document', 'HTMLElement', 'Node', 'navigator']) delete globalThis[key];
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
