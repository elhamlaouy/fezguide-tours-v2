// Golden rendering of a whole site from one stored CMS document: every public URL in EN/FR/ES through the
// real Worker path (public projection, HTML bootstrap, SEO head, JSON-LD, SSR snapshot), the sitemap, robots,
// and the client render of every public page from the projection. Used by tests/legacy-slimming.test.mjs and
// scripts/legacy-golden.mjs (live document). Both sides of a comparison must come from this same code.
import { registerHooks } from 'node:module';
import { register } from 'tsx/esm/api';
register();
registerHooks({ load(url, context, next) { return url.endsWith('.css') ? { format: 'module', source: 'export default "";', shortCircuit: true } : next(url, context); } });
const { publicSeoResponse } = await import('../worker/seo.ts');
const { publicCmsDocument, publicCmsCompatibility } = await import('../worker/cms-routes.ts');
const { approvedPublicData } = await import('../src/cms/approved-data.ts');
const { isPublicPage, pageLocaleAvailable } = await import('../src/cms/render-utils.ts');
const { pagePath } = await import('../src/cms/routing.ts');
const { PageRenderer } = await import('../src/cms/PageRenderer.tsx');
const { CmsPreviewProvider } = await import('../src/context/CmsContext.tsx');
await (await import('../src/cms/ApprovedPageRenderer.tsx')).preloadApprovedLayouts();
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');

const TEMPLATE = '<!doctype html><html><head><meta charset="utf-8"><title>x</title></head><body><div id="root"></div></body></html>';
const LANGUAGES = ['en', 'fr', 'es'];
const ORIGIN = 'https://golden.example.test';

function fakeEnv(document) {
  const text = JSON.stringify(document);
  const db = { prepare: sql => ({ bind: () => db.prepare(sql), async first() {
    return /published_revision/.test(sql) ? { published_revision: 1 } : { document: text, created_at: '2026-01-01T00:00:00.000Z' };
  } }) };
  return { CMS_DB: db, CANONICAL_ORIGIN: ORIGIN, ASSETS: { fetch: async () => new Response(TEMPLATE, { headers: { 'Content-Type': 'text/html' } }) } };
}

/** Everything a visitor can receive for this document, keyed by what produced it. */
export async function renderSite(document) {
  const env = fakeEnv(document);
  const get = async path => {
    const response = await publicSeoResponse(new Request(`${ORIGIN}${path}`, { headers: { Accept: 'text/html' } }), env);
    return response ? `${response.status}\n${await response.text()}` : 'passthrough';
  };
  const outputs = new Map();
  outputs.set('GET /sitemap.xml', await get('/sitemap.xml'));
  outputs.set('GET /robots.txt', await get('/robots.txt'));
  const projection = publicCmsDocument(document);
  const paths = [];
  for (const page of projection.pages.filter(page => isPublicPage(projection, page))) {
    for (const language of LANGUAGES.filter(language => pageLocaleAvailable(projection, page, language))) paths.push(pagePath(projection, page.id, language));
  }
  for (const path of [...new Set([...paths, '/', '/this-page-does-not-exist'])]) outputs.set(`GET ${path}`, await get(path));
  // Client view: the document the browser receives, minus the archive that only the Worker/validator read.
  const { legacy, ...visible } = projection;
  outputs.set('/api/cms/document (without legacy)', JSON.stringify(visible));
  outputs.set('client data model (approvedPublicData)', JSON.stringify(approvedPublicData(projection)));
  for (const page of projection.pages.filter(page => isPublicPage(projection, page))) {
    for (const language of LANGUAGES.filter(language => pageLocaleAvailable(projection, page, language))) {
      outputs.set(`client render ${page.id} ${language}`, renderToStaticMarkup(createElement(CmsPreviewProvider, { document: projection },
        createElement(PageRenderer, { document: projection, page, language, onNavigate() {}, onBook() {} }))));
    }
  }
  return outputs;
}

/** Byte-level comparison; returns the keys whose output differs (empty when identical). */
export function compareSites(before, after) {
  const keys = new Set([...before.keys(), ...after.keys()]);
  return [...keys].filter(key => before.get(key) !== after.get(key));
}

/** What the public compatibility API (/api/cms, only used when no published document exists) would answer. */
export const compatibilityJson = document => JSON.stringify(publicCmsCompatibility(document));
