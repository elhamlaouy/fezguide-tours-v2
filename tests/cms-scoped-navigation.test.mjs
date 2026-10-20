import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { register } from 'tsx/esm/api';
register();
registerHooks({ load(url, context, next) { return url.endsWith('.css') ? { format: 'module', source: 'export default "";', shortCircuit: true } : next(url, context); } });
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { rewriteRouteHtml } = await import('../worker/seo.ts');
const { publicCmsDocument } = await import('../worker/cms-routes.ts');
const { resolveRoute } = await import('../src/cms/routing.ts');
const publicDocument = await import('../src/cms/public-document.ts');
const { Window } = await import('happy-dom');
const template = '<html><head></head><body><div id="root"></div></body></html>';
function embed(window, source, path) {
  // Controlled Worker markup only; no arbitrary HTML is accepted by this fixture.
  window.document.body.innerHTML = rewriteRouteHtml(template, source, resolveRoute(new URL(`https://example.test${path}`), source), 'https://example.test');
}

test('validated scoped snapshots are authoritative only for their exact route and locale; bad markers use the fixed full API', async () => {
  const window = new Window({ url: 'https://example.test/' });
  globalThis.document = window.document;
  globalThis.window = window;
  const seed = createCmsSeed();
  try {
    embed(window, seed, '/');
    const initial = publicDocument.readPublishedSnapshot();
    assert.ok(initial, 'new Worker envelope is read before first paint');
    assert.equal(typeof publicDocument.requiresDocumentNavigation, 'function');
    const requires = path => publicDocument.requiresDocumentNavigation(initial, new URL(`https://example.test${path}`));
    for (const path of ['/', '/?utm_source=kept', '/?page=home', '/#photos']) assert.equal(requires(path), false, path);
    for (const path of ['/fr', '/es', '/about', '/?tour=our-fez-tours', '/fr/bespoke-morocco-experiences', '/missing', '/admin']) assert.equal(requires(path), true, path);
    let fetches = 0;
    const fetch = async path => { assert.equal(path, '/api/cms/document'); fetches++; return Response.json({ document: seed }); };
    assert.deepEqual(await publicDocument.fetchPublishedDocument({ fetch }), initial);
    assert.equal(fetches, 0, 'never mix an HTML revision with a later API response');
    const script = document.getElementById('cms-published-document');
    const valid = JSON.parse(script.textContent);
    for (const scope of [{ ...valid.scope, version: 99 }, { ...valid.scope, pageId: 'missing' }, { ...valid.scope, language: 'de' }, { ...valid.scope, source: 'https://evil.test/draft' }, null]) {
      script.textContent = JSON.stringify({ ...valid, scope });
      assert.equal(publicDocument.readPublishedSnapshot(), null);
      assert.deepEqual(await publicDocument.fetchPublishedDocument({ fetch }), seed);
    }
    script.textContent = JSON.stringify({ ...valid, document: { ...valid.document, products: [] } });
    assert.equal(publicDocument.readPublishedSnapshot(), null, 'a scope never bypasses reference/schema validation');
    script.textContent = JSON.stringify(valid);
    window.history.replaceState(null, '', '/fr');
    assert.equal(publicDocument.readPublishedSnapshot(), null, 'wrong-route HTML cannot become the current public document');
    script.textContent = JSON.stringify(seed);
    const full = publicDocument.readPublishedSnapshot();
    for (const path of ['/fr', '/about', '/missing']) assert.equal(publicDocument.requiresDocumentNavigation(full, new URL(`https://example.test${path}`)), false, 'legacy full snapshots retain SPA navigation');
  } finally { await window.happyDOM.close(); delete globalThis.document; delete globalThis.window; }
});

test('mounted scoped shell uses real document navigation for custom links, locales and Back/Forward without painting partial bodies', async () => {
  const window = new Window({ url: 'https://example.test/fr/about?utm_source=retained' });
  for (const [key, value] of Object.entries({ window, document: window.document, navigator: window.navigator })) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { act, createElement } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { default: App } = await import('../src/App.tsx');
  await (await import('../src/cms/ApprovedPageRenderer.tsx')).preloadApprovedLayouts();
  const seed = createCmsSeed();
  const custom = seed.pages.find(page => page.id === 'page-bespoke-itinerary');
  custom.slug = 'owner-slug'; custom.seo.canonical = '/owner-preferred';
  seed.navigation.push({ id: 'scoped-custom', label: { en: 'Scoped custom', fr: 'Scoped custom', es: 'Scoped custom' }, enabled: true, pageId: custom.id });
  embed(window, seed, '/fr/about');
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('No API request is allowed for a valid HTML revision'); };
  const requests = [];
  window.location.assign = path => requests.push(['assign', String(path)]);
  window.location.replace = path => requests.push(['replace', String(path)]);
  const root = createRoot(document.getElementById('root'));
  try {
    await act(async () => { root.render(createElement(App)); await new Promise(resolve => setTimeout(resolve, 20)); });
    const before = document.querySelector('main').innerHTML;
    await act(async () => { [...document.querySelectorAll('nav button')].find(button => button.textContent === 'Scoped custom').click(); });
    assert.deepEqual(requests.pop(), ['assign', '/fr/owner-preferred?utm_source=retained']);
    assert.equal(window.location.pathname, '/fr/about', 'no pushState into a route with missing bodies');
    assert.equal(document.querySelector('main').innerHTML, before);
    await act(async () => document.querySelector('button[aria-label^="FR —"]').click());
    await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'EspañolES').click());
    assert.deepEqual(requests.pop(), ['assign', '/es/about?utm_source=retained']);
    assert.equal(document.documentElement.lang, 'fr', 'old document is not relabeled before the next response');
    for (const path of ['/fr/our-fez-tours', '/es/owner-preferred', '/fr/missing']) {
      await act(async () => { window.history.pushState(null, '', path); window.dispatchEvent(new window.PopStateEvent('popstate')); });
      assert.deepEqual(requests.pop(), ['replace', `https://example.test${path}`]);
      assert.equal(document.querySelector('main').innerHTML, before, 'no partial route is rendered during document replacement');
    }
    // Model same-document history entries (e.g. a hash/legacy alias), then real Back/Forward.
    window.history.replaceState(null, '', '/fr/about');
    window.history.pushState(null, '', '/fr/owner-preferred');
    await act(async () => { window.history.back(); await new Promise(resolve => setTimeout(resolve, 10)); });
    assert.equal(requests.length, 0, 'Back into the current scoped page stays in memory');
    await act(async () => { window.history.forward(); await new Promise(resolve => setTimeout(resolve, 10)); });
    assert.deepEqual(requests.pop(), ['replace', 'https://example.test/fr/owner-preferred']);
  } finally {
    await act(async () => root.unmount()); globalThis.fetch = originalFetch;
    await window.happyDOM.close();
    for (const key of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[key];
  }
});

// Reuse the real Worker envelope, App/CmsProvider and Happy DOM navigation boundary.
async function mountScopeEdgeApp(t, source, path) {
  const window = new Window({ url: `https://example.test${path}` });
  const originals = new Map();
  for (const [key, value] of Object.entries({ window, document: window.document, navigator: window.navigator, IS_REACT_ACT_ENVIRONMENT: true })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const fetches = [], requests = [], commits = [], errors = [];
  let root;
  const { act, createElement, Profiler } = await import('react');
  t.after(async () => {
    try {
      if (root) await act(async () => root.unmount());
    } finally {
      globalThis.fetch = originalFetch;
      console.error = originalError;
      await window.happyDOM.close();
      for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    }
    assert.deepEqual(errors, [], 'no React/runtime diagnostics');
    assert.deepEqual(fetches, [], 'valid scope never requests a newer CMS document or source API');
  });
  console.error = (...args) => { errors.push(args.map(String).join(' ')); };
  globalThis.fetch = async input => { fetches.push(String(input)); throw new Error('Unexpected fetch for valid Worker scope'); };
  window.location.assign = path => requests.push(['assign', String(path)]);
  window.location.replace = path => requests.push(['replace', String(path)]);
  embed(window, source, path);
  const payload = JSON.parse(document.getElementById('cms-published-document').textContent);
  assert.ok(publicDocument.readPublishedSnapshot(), 'actual Worker envelope validates at the arrival URL');
  const { createRoot } = await import('react-dom/client');
  const { default: App } = await import('../src/App.tsx');
  await (await import('../src/cms/ApprovedPageRenderer.tsx')).preloadApprovedLayouts();
  root = createRoot(document.getElementById('root'));
  await act(async () => {
    root.render(createElement(Profiler, { id: 'scope-edge', onRender() {
      const main = document.querySelector('main');
      commits.push({ html: main?.innerHTML, text: main?.textContent, activeLinks: [...document.querySelectorAll('nav button')].filter(button => button.querySelector('span')).map(button => button.textContent) });
    } }, createElement(App)));
    await new Promise(resolve => setTimeout(resolve, 20));
  });
  return {
    window, payload, requests, commits, fetches, act,
    main: () => window.document.querySelector('main'),
    pop: path => act(async () => { window.history.pushState(null, '', path); window.dispatchEvent(new window.PopStateEvent('popstate', { state: null })); }),
    traverse: direction => act(async () => { window.history[direction](); await new Promise(resolve => setTimeout(resolve, 10)); }),
  };
}

for (const scenario of ['missing URL', 'hidden public page', 'unavailable locale title', 'fully empty public projection']) {
  test(`mounted null scope: ${scenario} stays authoritative through public, unavailable and locale history navigation`, async t => {
    const seed = createCmsSeed();
    const language = scenario === 'unavailable locale title' ? 'es' : 'en';
    const prefix = language === 'en' ? '' : `/${language}`;
    const path = scenario === 'missing URL' ? '/missing?utm_source=retained' : `${prefix}/about?utm_source=retained`;
    const hiddenTitle = 'PRIVATE HIDDEN ABOUT BODY';
    const about = seed.pages.find(page => page.id === 'about');
    if (scenario === 'hidden public page') { about.enabled = false; about.title = { en: hiddenTitle, fr: hiddenTitle, es: hiddenTitle }; }
    if (scenario === 'unavailable locale title') about.title.es = '';
    if (scenario === 'fully empty public projection') seed.pages.forEach(page => { page.enabled = false; });
    const destination = seed.pages.find(page => page.id === 'fez');
    const destinationBody = 'FULL DESTINATION BODY MUST WAIT FOR ITS HTML';
    destination.sections.find(section => section.type === 'hero').description = { en: destinationBody, fr: destinationBody, es: destinationBody };
    seed.navigation.push({ id: 'edge-destination', label: { en: 'Public destination', fr: 'Public destination', es: 'Public destination' }, enabled: true, pageId: destination.id });
    const projection = publicCmsDocument(seed);
    if (scenario === 'hidden public page' || scenario === 'fully empty public projection') assert.ok(!projection.pages.some(page => page.id === 'about'), 'hidden page is removed by the real public projection');
    if (scenario === 'fully empty public projection') assert.equal(projection.pages.length, 0);
    const app = await mountScopeEdgeApp(t, projection, path);
    const { window, payload, requests, commits, act } = app;
    assert.deepEqual(payload.scope, { version: 1, pageId: null, language });
    const expected404 = language === 'es' ? '404 — Página no encontrada' : '404 — Page not found';
    assert.equal(app.main().textContent, expected404);
    assert.equal(document.querySelector('[data-cms-site]').dataset.cmsSite, 'true', 'published 404, never a source fallback');
    assert.equal(document.documentElement.lang, language);
    assert.deepEqual(requests, [], 'valid null startup does not reload itself');
    assert.deepEqual(app.fetches, []);
    assert.doesNotMatch(document.body.innerHTML, /PRIVATE HIDDEN ABOUT BODY/);
    const before = app.main().innerHTML;
    const publicButton = [...document.querySelectorAll('nav button')].find(button => button.textContent === 'Public destination');
    if (scenario !== 'fully empty public projection') {
      assert.ok(publicButton);
      assert.ok(JSON.stringify(projection.pages.find(page => page.id === 'fez')).includes(destinationBody));
      assert.ok(!JSON.stringify(payload.document.pages.find(page => page.id === 'fez')).includes(destinationBody), 'destination really is summary-only in this HTML revision');
      await act(async () => publicButton.click());
      assert.deepEqual(requests, [['assign', `${prefix}/fez?utm_source=retained`]], 'public destination requires ordinary HTML navigation');
      assert.equal(window.location.pathname, `${prefix}/${scenario === 'missing URL' ? 'missing' : 'about'}`, 'click does not pushState into an incomplete page');
      assert.equal(app.main().innerHTML, before);
    } else {
      assert.equal(publicButton, undefined, 'empty projection cannot resurrect source navigation');
    }
    const requestCount = requests.length;
    const anotherUnavailable = `${prefix}/another-unavailable?utm_source=history`;
    await app.pop(anotherUnavailable);
    assert.equal(`${window.location.pathname}${window.location.search}`, anotherUnavailable);
    assert.equal(app.main().textContent, expected404);
    assert.equal(document.title, expected404);
    assert.equal(document.querySelector('meta[name="robots"]').content, 'noindex,follow');
    assert.equal(requests.length, requestCount, 'same-locale null scope stays an in-memory 404');
    await app.traverse('back');
    assert.equal(`${window.location.pathname}${window.location.search}`, path);
    assert.equal(app.main().innerHTML, before);
    await app.traverse('forward');
    assert.equal(`${window.location.pathname}${window.location.search}`, anotherUnavailable);
    assert.equal(requests.length, requestCount, 'Back/Forward among unavailable pages never loads a document');
    await app.pop('/fr/another-unavailable?utm_source=locale');
    assert.deepEqual(requests.slice(requestCount), [['replace', 'https://example.test/fr/another-unavailable?utm_source=locale']], 'locale-changing null history entry loads a new HTML document');
    assert.equal(document.documentElement.lang, language, 'old document remains in its original locale pending HTML');
    assert.equal(app.main().innerHTML, before);
    assert.ok(commits.length > 0);
    for (const commit of commits) assert.equal(commit.text, expected404, 'every committed App body, including the first, is the authoritative 404');
  });
}

const customArrivals = [
  ['slug alias', '/fr/owner-slug?utm_source=arrival&campaign=kept#details'],
  ['stable id alias', '/fr/page-bespoke-itinerary?utm_source=arrival&campaign=kept#details'],
  ['preferred canonical', '/fr/owner-preferred?utm_source=arrival&campaign=kept#details'],
  ['page id query', '/?page=page-bespoke-itinerary&lang=fr&utm_source=arrival&campaign=kept#details'],
  ['page slug query', '/?page=owner-slug&language=fr&utm_source=arrival&campaign=kept#details'],
  ['experience query', '/?experience=page-bespoke-itinerary&lang=fr&utm_source=arrival&campaign=kept#details'],
  ['tour query', '/?tour=page-bespoke-itinerary&language=fr&utm_source=arrival&campaign=kept#details'],
];
for (const [spelling, arrival] of customArrivals) {
  test(`mounted changed custom scope: ${spelling} paints the full current identity and canonicalizes same-scope history without HTML`, async t => {
    const seed = createCmsSeed();
    const custom = seed.pages.find(page => page.id === 'page-bespoke-itinerary');
    custom.slug = 'owner-slug'; custom.seo.canonical = '/owner-preferred';
    const copy = value => ({ en: value, fr: value, es: value });
    custom.title = copy('CURRENT OWNER CUSTOM IDENTITY');
    custom.seo.title = copy('CURRENT OWNER CUSTOM SEO');
    custom.sections.find(section => section.type === 'hero').title = copy('CURRENT OWNER CUSTOM HERO');
    custom.sections.find(section => section.type === 'hero').description = copy('');
    custom.sections.find(section => section.id === 'content').blocks = [
      { type: 'paragraph', text: copy('CURRENT FULL BODY FIRST PARAGRAPH') },
      { type: 'paragraph', text: copy('CURRENT FULL BODY SECOND PARAGRAPH') },
    ];
    custom.sections.find(section => section.id === 'highlights').blocks = [{ type: 'list', items: { en: ['CURRENT HIGHLIGHT A', 'CURRENT HIGHLIGHT B'], fr: ['CURRENT HIGHLIGHT A', 'CURRENT HIGHLIGHT B'], es: ['CURRENT HIGHLIGHT A', 'CURRENT HIGHLIGHT B'] } }];
    custom.sections.push({ id: 'owner-tail', type: 'richText', variant: 'story', enabled: true, blocks: [{ type: 'paragraph', text: copy('CURRENT ADDITIONAL TAIL BODY') }] });
    seed.navigation.push({ id: 'edge-current', label: copy('Current scoped custom'), enabled: true, pageId: custom.id });
    seed.navigation.push({ id: 'edge-offscope', label: copy('Off-scope About'), enabled: true, pageId: 'about' });
    const projection = publicCmsDocument(seed);
    const app = await mountScopeEdgeApp(t, projection, arrival);
    const { window, payload, requests, commits, act } = app;
    assert.deepEqual(payload.scope, { version: 1, pageId: custom.id, language: 'fr' });
    assert.deepEqual(payload.document.pages.find(page => page.id === custom.id), projection.pages.find(page => page.id === custom.id), 'current body is retained wholesale');
    assert.equal(window.location.href, 'https://example.test/fr/owner-preferred?utm_source=arrival&campaign=kept#details', 'canonical path removes routing queries but preserves campaign queries and hash');
    assert.equal(document.title, 'CURRENT OWNER CUSTOM SEO');
    assert.equal(document.querySelector('link[rel="canonical"]').href, 'https://example.test/fr/owner-preferred', 'SEO canonical excludes query and hash');
    assert.deepEqual(requests, [], 'alias arrival canonicalizes with history.replaceState, not a document load');
    assert.deepEqual(app.fetches, []);
    // Compare against the actual full-revision renderer, not a copied routing/body implementation.
    const { createElement } = await import('react');
    const { createRoot } = await import('react-dom/client');
    const { PageRenderer } = await import('../src/cms/PageRenderer.tsx');
    const reference = document.createElement('div'); document.body.append(reference);
    const referenceRoot = createRoot(reference);
    let fullBody;
    try {
      await act(async () => referenceRoot.render(createElement(PageRenderer, { document: projection, page: projection.pages.find(page => page.id === custom.id), language: 'fr', onNavigate() {}, onBook() {} })));
      fullBody = reference.innerHTML;
    } finally { await act(async () => referenceRoot.unmount()); reference.remove(); }
    for (const marker of ['CURRENT OWNER CUSTOM HERO', 'CURRENT FULL BODY FIRST PARAGRAPH', 'CURRENT FULL BODY SECOND PARAGRAPH', 'CURRENT HIGHLIGHT A', 'CURRENT HIGHLIGHT B', 'CURRENT ADDITIONAL TAIL BODY']) assert.ok(app.main().textContent.includes(marker), marker);
    assert.equal(app.main().innerHTML, fullBody, 'mounted App body exactly matches the full current revision');
    for (const [, historyAlias] of customArrivals) {
      await app.pop(historyAlias);
      assert.equal(window.location.href, 'https://example.test/fr/owner-preferred?utm_source=arrival&campaign=kept#details');
      assert.equal(app.main().innerHTML, fullBody);
      assert.deepEqual(requests, [], `same-page ${historyAlias} canonicalization stays in memory`);
    }
    await app.traverse('back');
    await app.traverse('forward');
    assert.deepEqual(requests, [], 'real same-scope Back/Forward also stays in memory');
    assert.equal(app.main().innerHTML, fullBody);
    const offscope = [...document.querySelectorAll('nav button')].find(button => button.textContent === 'Off-scope About');
    assert.ok(offscope);
    await act(async () => offscope.click());
    assert.deepEqual(requests, [['assign', '/fr/about?utm_source=arrival&campaign=kept']], 'off-scope click loads HTML, retains campaign parameters and removes hash');
    assert.equal(window.location.pathname, '/fr/owner-preferred');
    assert.equal(app.main().innerHTML, fullBody);
    await app.pop('/fr/about?utm_source=history#new-body');
    assert.deepEqual(requests, [['assign', '/fr/about?utm_source=arrival&campaign=kept'], ['replace', 'https://example.test/fr/about?utm_source=history#new-body']]);
    assert.equal(app.main().innerHTML, fullBody, 'off-scope history cannot paint the summary-only destination');
    assert.ok(commits.length > 0);
    for (const commit of commits) {
      assert.equal(commit.html, fullBody, 'first and subsequent App commits preserve full current-page identity, never a transient 404/source/summary');
      assert.ok(commit.activeLinks.includes('Current scoped custom'), 'the stable custom page is active from the first commit');
    }
  });
}

test('API-unavailable source fallback still renders and navigates in memory in all three locales', async () => {
  const { act, createElement } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { default: App } = await import('../src/App.tsx');
  const { defaultData } = await import('../src/context/legacy-public-data.ts');
  const originalFetch = globalThis.fetch;
  try {
    for (const language of ['en', 'fr', 'es']) {
      const path = language === 'en' ? '/' : `/${language}`;
      const window = new Window({ url: `https://example.test${path}` });
      for (const [key, value] of Object.entries({ window, document: window.document, navigator: window.navigator })) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
      globalThis.IS_REACT_ACT_ENVIRONMENT = true;
      const requested = [];
      globalThis.fetch = async input => { requested.push(String(input)); throw new Error('Synthetic unavailable API'); };
      const host = document.createElement('div'); document.body.append(host);
      const root = createRoot(host);
      try {
        await act(async () => { root.render(createElement(App)); await new Promise(resolve => setTimeout(resolve, 30)); });
        const featured = defaultData.tours.find(tour => tour.id === 'fez-explore-medina');
        for (let retry = 0; retry < 100 && !host.querySelector('main').textContent.includes(featured.title[language]); retry++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
        assert.ok(host.querySelector('main').textContent.includes(featured.title[language]), `${language}: source tour is present`);
        assert.ok(requested.includes('/api/cms/document'));
        assert.ok(requested.includes('/api/cms'));
        assert.equal(document.documentElement.lang, language);
        await act(async () => [...host.querySelectorAll('nav button')][1].click());
        for (let retry = 0; retry < 100 && !host.querySelector('main h1'); retry++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
        assert.equal(window.location.pathname, `${language === 'en' ? '' : `/${language}`}/fez`);
        assert.ok(host.querySelector('main h1'), 'source navigation still renders its route');
      } finally { await act(async () => root.unmount()); await window.happyDOM.close(); }
    }
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[key];
  }
});

test('scoped blog retains identical inline reader contents in all locales', async () => {
  const { act, createElement } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { PageRenderer } = await import('../src/cms/PageRenderer.tsx');
  const seed = createCmsSeed();
  for (const language of ['en', 'fr', 'es']) {
    const path = `${language === 'en' ? '' : `/${language}`}/blog`;
    const window = new Window({ url: `https://example.test${path}` });
    for (const [key, value] of Object.entries({ window, document: window.document, navigator: window.navigator })) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    try {
      embed(window, seed, path);
      const scoped = publicDocument.readPublishedSnapshot();
      assert.ok(scoped);
      const outputs = [];
      for (const candidate of [seed, scoped]) {
        const host = document.createElement('div'); document.body.append(host);
        const root = createRoot(host);
        try {
          await act(async () => root.render(createElement(PageRenderer, { document: candidate, page: candidate.pages.find(page => page.id === 'blog'), language, onNavigate() {}, onBook() {} })));
          await act(async () => host.querySelector('[data-section-id="posts"] article button').click());
          assert.ok(host.querySelector('[role="dialog"]'), 'reader opens in the current page without navigation');
          outputs.push(host.innerHTML);
        } finally { await act(async () => root.unmount()); host.remove(); }
      }
      assert.equal(outputs[1], outputs[0], `${language}: full selected reader and background equal full document`);
    } finally {
      await window.happyDOM.close();
      for (const key of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[key];
    }
  }
});
