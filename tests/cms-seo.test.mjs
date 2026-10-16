import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { register } from 'tsx/esm/api';
register();
const { default: worker } = await import('../worker/index.ts');
const { CmsStore } = await import('../worker/cms-store.ts');
const { validateCmsDocument } = await import('../src/cms/schema.ts');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const template = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of ['0001_cms.sql', '0002_media_budget.sql', '0003_cms_release_safeguards.sql']) sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
  const statement = (sql, values = []) => ({
    bind: (...args) => statement(sql, args),
    async first() { return sqlite.prepare(sql).get(...values) ?? null; },
    async run() { const result = sqlite.prepare(sql).run(...values); return { success: true, meta: { changes: Number(result.changes) } }; },
  });
  const db = { prepare: statement, async batch(statements) {
    sqlite.exec('BEGIN');
    try { const results = []; for (const stmt of statements) results.push(await stmt.run()); sqlite.exec('COMMIT'); return results; }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  } };
  const assets = [];
  const env = { CMS_DB: db, CANONICAL_ORIGIN: 'https://canonical.example', ASSETS: { async fetch(request) {
    assets.push(new URL(request.url).pathname);
    return new Response(template, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } } };
  const store = new CmsStore(db, validateCmsDocument);
  const call = (path, options = {}) => worker.fetch(new Request(`https://spoofed-host.test${path}`, { headers: { Accept: 'text/html' }, ...options }), env);
  return { sqlite, store, env, assets, call };
}

test('preferred canonical routes resolve without 404 and discovery uses the same URL', async () => {
 const {sqlite,store,call}=fixture();
 try {
  const document=createCmsSeed();document.pages.find(page=>page.id==='about').seo.canonical='/company';
  await store.saveDraft(document,0,'fixture');await store.publish(1,'fixture');
  const alias=await call('/fr/about');assert.equal(alias.status,308);assert.equal(alias.headers.get('Location'),'/fr/company');
  const target=await call('/fr/company');assert.equal(target.status,200);
  const html=await target.text();assert.match(html,/rel="canonical" href="https:\/\/canonical\.example\/fr\/company"/);
  assert.match(html,/hreflang="es" href="https:\/\/canonical\.example\/es\/company"/);
  const sitemap=await(await call('/sitemap.xml')).text();assert.match(sitemap,/<loc>https:\/\/canonical\.example\/fr\/company<\/loc>/);
  assert.doesNotMatch(sitemap,/<loc>https:\/\/canonical\.example\/fr\/about<\/loc>/);
  for(const bad of ['/api','/es','/foodTours','/company?x=1','/two/paths']) {
   document.pages.find(page=>page.id==='about').seo.canonical=bad;
   assert.equal(validateCmsDocument(document).valid,false,bad);
  }
 } finally {sqlite.close();}
});

test('missing Spanish titles are unavailable and excluded from sitemap and hreflang', async () => {
 const {sqlite,store,call}=fixture();
 try {
  const document=createCmsSeed();document.pages.find(page=>page.id==='about').title.es='';
  await store.saveDraft(document,0,'fixture');await store.publish(1,'fixture');
  const missing=await call('/es/about');assert.equal(missing.status,404);
  assert.match(await missing.text(),/name="robots" content="noindex,follow"/);
  const english=await(await call('/about')).text();assert.doesNotMatch(english,/hreflang="es"/);
  const sitemap=await(await call('/sitemap.xml')).text();assert.doesNotMatch(sitemap,/https:\/\/canonical\.example\/es\/about/);
  assert.match(sitemap,/https:\/\/canonical\.example\/fr\/about/);
  for(const page of document.pages) for(const language of ['en','fr','es']) assert.ok(page.seo.description[language].trim(),page.id+' '+language);
 } finally {sqlite.close();}
});

test('fresh HTML resolves published locale page metadata before JS and replaces baseline SEO exactly once', async () => {
  const { sqlite, store, call, assets } = fixture();
  try {
    const document = createCmsSeed();
    const page = document.pages.find(page => page.id === 'about');
    page.seo.title.fr = 'Titre publié <test> & "citation"';
    page.seo.description.fr = 'Description publiée </script><script>alert(1)</script>';
    page.seo.canonical = 'https://attacker.example/stolen';
    page.seo.image = { mediaId: document.media[0].id, alt: document.media[0].alt };
    await store.saveDraft(document, 0, 'fixture');
    await store.publish(1, 'fixture');
    const draft = structuredClone(document);
    draft.pages.find(page => page.id === 'about').seo.title.fr = 'PRIVATE-DRAFT';
    await store.saveDraft(draft, 2, 'fixture');
    const response = await call('/fr/about');
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /<html lang="fr"/);
    assert.match(html, /<title>Titre publié &lt;test&gt; &amp; &quot;citation&quot;<\/title>/);
    assert.equal((html.match(/<title>/g) ?? []).length, 1);
    assert.equal((html.match(/name="description"/g) ?? []).length, 1);
    assert.equal((html.match(/property="og:title"/g) ?? []).length, 1);
    assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1);
    assert.match(html, /href="https:\/\/canonical.example\/fr\/about"/);
    assert.match(html, /hreflang="es" href="https:\/\/canonical.example\/es\/about"/);
    assert.match(html, /property="og:image" content="https:\/\/canonical.example\/images\//);
    assert.doesNotMatch(html, /PRIVATE-DRAFT|spoofed-host.test|<script>alert\(1\)/);
    assert.doesNotMatch(html.split('</head>')[0], /attacker.example/);
    const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
    assert.equal(schemas.length, 1);
    assert.deepEqual(schemas[0].map(item => item['@type']), ['WebSite', 'TravelAgency', 'WebPage']);
    assert.doesNotMatch(JSON.stringify(schemas), /Product|AggregateRating|openingHoursSpecification|GeoCoordinates/);
    assert.ok(html.includes('/src/main.tsx'), 'existing asset URLs survive rewriting');
    assert.deepEqual(assets, ['/index.html'], 'serve the asset entrypoint, not an unknown per-route asset');
  } finally { sqlite.close(); }
});

test('hidden and absent canonical pages are HTTP 404 even for default Accept, with no legacy or private leakage', async () => {
  const { sqlite, store, call } = fixture();
  try {
    const document = createCmsSeed();
    const about = document.pages.find(page => page.id === 'about');
    about.enabled = false;
    about.title = { en: 'PRIVATE-HIDDEN', fr: 'PRIVATE-HIDDEN', es: 'PRIVATE-HIDDEN' };
    await store.saveDraft(document, 0, 'fixture'); await store.publish(1, 'fixture');
    for (const path of ['/about', '/fr/about', '/missing', '/es/missing', '/?page=about']) {
      const response = await call(path, { headers: {} });
      assert.equal(response.status, 404, path);
      const html = await response.text();
      assert.match(html, /<h1>404/);
      assert.match(html, /name="robots" content="noindex,follow"/);
      assert.doesNotMatch(html, /PRIVATE-HIDDEN|Authentic Fez Medina Tours|application\/ld\+json/);
    }
  } finally { sqlite.close(); }
});

test('published legacy redirects, sitemap, robots and product schema share one trusted route policy', async () => {
  const { sqlite, store, call, env } = fixture();
  try {
    env.CMS_SLUG_REDIRECTS = JSON.stringify({ 'old-fez-tour': 'our-fez-tours', 'old-about': 'about' });
    const document = createCmsSeed();
    document.pages.find(page => page.id === 'about').enabled = false;
    document.pages.find(page => page.id === 'travel-tips').seo.noIndex = true;
    await store.saveDraft(document, 0, 'fixture'); await store.publish(1, 'fixture');
    for (const [path, target] of [['/?page=home', '/'], ['/?page=fez&lang=es', '/es/fez'], ['/?experience=our-fez-tours&utm_source=old', '/our-fez-tours?utm_source=old'], ['/fr/page-bespoke-itinerary', '/fr/bespoke-morocco-experiences'], ['/fr/old-fez-tour', '/fr/our-fez-tours']]) {
      const response = await call(path);
      assert.equal(response.status, 308);
      assert.equal(response.headers.get('location'), target);
      assert.equal((await call(target)).status, 200);
    }
    assert.equal((await call('/old-about')).status, 404, 'configured redirects must not resurrect hidden targets');
    const sitemapResponse = await call('/sitemap.xml');
    assert.equal(sitemapResponse.headers.get('content-type'), 'application/xml; charset=utf-8');
    const sitemap = await sitemapResponse.text();
    assert.doesNotMatch(sitemap, /spoofed-host|about|travel-tips|\?page=|\?experience=/);
    assert.match(sitemap, /https:\/\/canonical.example\/es\/our-fez-tours/);
    const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => new URL(match[1]).pathname);
    assert.equal(new Set(urls).size, urls.length);
    for (const path of urls) assert.equal((await call(path)).status, 200, path);
    const robots = await (await call('/robots.txt')).text();
    assert.match(robots, /Sitemap: https:\/\/canonical.example\/sitemap.xml/);
    const html = await (await call('/es/our-fez-tours')).text();
    assert.match(html.split('</head>')[0], /property="og:image" content="https:\/\/canonical.example\/images\//);
    const schema = JSON.parse([...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)][0][1]);
    const product = schema.find(item => item['@type'] === 'Product');
    assert.equal(product.offers.price, 170);
    assert.equal(product.offers.priceCurrency, 'EUR');
    assert.equal(product.offers.url, 'https://canonical.example/es/our-fez-tours');
    assert.doesNotMatch(JSON.stringify(schema), /AggregateRating|PRIVATE/);
    const head = await call('/fr/fez', { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
  } finally { sqlite.close(); }
});

test('missing published content preserves actual asset fallback; store failure is fail-closed; asset/api/admin/media routes bypass SEO', async () => {
  const { sqlite, env, call, assets } = fixture();
  try {
    const fallback = await call('/fr/about');
    assert.equal(await fallback.text(), template);
    assert.deepEqual(assets, ['/fr/about']);
    env.CMS_DB.prepare = () => { throw new Error('store unavailable'); };
    assert.equal((await call('/about')).status, 503);
    for (const path of ['/assets/app.js', '/images/real/about.jpg', '/media/other.jpg']) {
      const response = await call(path);
      assert.equal(response.status, 200);
      assert.equal(await response.text(), template);
      assert.equal(assets.at(-1), path);
    }
    assert.equal((await call('/api/unknown')).status, 404);
    assert.equal((await call('/admin')).status, 401);
    assert.equal((await call('/media/upload-00000000-0000-0000-0000-000000000000.jpg')).status, 503);
  } finally { sqlite.close(); }
});
