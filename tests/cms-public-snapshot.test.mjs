import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { registerHooks } from 'node:module';
import { register } from 'tsx/esm/api';
register();
registerHooks({ load(url, context, next) { return url.endsWith('.css') ? { format: 'module', source: 'export default "";', shortCircuit: true } : next(url, context); } });
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { validateCmsDocument } = await import('../src/cms/schema.ts');
const { rewriteRouteHtml } = await import('../worker/seo.ts');
const { resolveRoute, pagePath } = await import('../src/cms/routing.ts');
const { isPublicPage, pageLocaleAvailable } = await import('../src/cms/render-utils.ts');
const { PageRenderer } = await import('../src/cms/PageRenderer.tsx');
await (await import('../src/cms/ApprovedPageRenderer.tsx')).preloadApprovedLayouts();
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const template = '<html><head></head><body><div id="root"></div></body></html>';
const snapshot = (document, path = '/') => {
  const html = rewriteRouteHtml(template, document, resolveRoute(new URL(`https://example.test${path}`), document), 'https://example.test');
  return { html, document: JSON.parse(/<script id="cms-published-document" type="application\/json">([\s\S]*?)<\/script>/.exec(html)[1]).document };
};

test('HTML omits redundant legacy collections without altering canonical content, stored data, or route rendering', () => {
  const original = createCmsSeed();
  const before = structuredClone(original);
  const output = snapshot(original);
  const keys = ['customPages', 'blogPosts', 'teamMembers', 'faqs'];
  for (const key of keys) assert.equal(output.document.legacy[key].length, 0, `omit duplicate ${key} from public HTML only`);
  assert.deepEqual(output.document.legacy.tours, original.legacy.tours.filter(tour => !original.products.some(product => product.id === tour.id)), 'keep public editorial card metadata not represented in canonical sections');
  assert.deepEqual(original, before, 'never mutate the saved/published source');
  assert.deepEqual({ ...output.document, legacy: undefined, pages: undefined }, { ...original, legacy: undefined, pages: undefined });
  assert.deepEqual(output.document.pages.map(({ sections, ...page }) => page), original.pages.map(({ sections, ...page }) => page), 'all route metadata remains intact');
  assert.deepEqual(output.document.legacy.siteSettings, original.legacy.siteSettings);
  assert.equal(validateCmsDocument(output.document).valid, true, 'snapshot remains a valid CMS document');
  assert.ok(gzipSync(output.html).length < gzipSync(JSON.stringify(original)).length, 'actual compressed payload decreases');
  let routes = 0;
  for (const page of original.pages.filter(page => isPublicPage(original, page))) {
    for (const language of ['en', 'fr', 'es'].filter(language => pageLocaleAvailable(original, page, language))) {
      const render = document => renderToStaticMarkup(createElement(PageRenderer, { document, page: document.pages.find(item => item.id === page.id), language, onNavigate() {}, onBook() {} }));
      const path = pagePath(original, page.id, language);
      assert.equal(render(snapshot(original, path).document), render(original), path);
      routes++;
    }
  }
  assert.ok(routes >= 81, 'all existing public localized routes compared');
});
