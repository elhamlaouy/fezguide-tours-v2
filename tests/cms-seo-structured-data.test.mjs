import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { register } from 'tsx/esm/api';
register();
const { default: worker } = await import('../worker/index.ts');
const { CmsStore } = await import('../worker/cms-store.ts');
const { rewriteRouteHtml } = await import('../worker/seo.ts');
const { routeSeoHead, brandedTitle } = await import('../src/cms/seo.ts');
const { resolveRoute } = await import('../src/cms/routing.ts');
const { validateCmsDocument } = await import('../src/cms/schema.ts');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const template = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const ORIGIN = 'https://fezguidetours.com';

const head = (document, path) => routeSeoHead(document, resolveRoute(new URL(`${ORIGIN}${path}`), document), ORIGIN);
const ld = html => JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1]);
const byType = (graph, type) => graph.find(node => node['@type'] === type);

test('brand is appended to titles unless already present', () => {
  const document = createCmsSeed();
  assert.equal(brandedTitle('Fez Food Tour'), 'Fez Food Tour | Fez Guide Tours');
  assert.equal(brandedTitle('About fezguidetours'), 'About fezguidetours');
  assert.equal(brandedTitle('Fez Guide Tours — Home'), 'Fez Guide Tours — Home');
  const html = head(document, '/fez-history-landmarks');
  const title = /<title>(.*?)<\/title>/.exec(html)[1];
  assert.ok(title.endsWith(' | Fez Guide Tours'), title);
  assert.equal(title.match(/Fez Guide Tours/g).length, 1);
  assert.ok(html.includes(`property="og:title" content="${title}"`));
  assert.ok(html.includes(`name="twitter:title" content="${title}"`));
  const webPage = byType(ld(html), 'WebPage');
  assert.ok(!webPage.name.includes('| Fez Guide Tours'), 'WebPage name stays plain');
  document.pages.find(p => p.id === 'fez-history-landmarks').seo.title.en = 'Already FezGuideTours';
  assert.match(head(document, '/fez-history-landmarks'), /<title>Already FezGuideTours<\/title>/);
  assert.match(head(document, '/'), /<title>[^<]*Fez Guide Tours[^<]*<\/title>/);
});

test('BreadcrumbList matches the visible Home > parent > page trail in every language', () => {
  const document = createCmsSeed();
  const crumbs = path => byType(ld(head(document, path)), 'BreadcrumbList').itemListElement;
  const en = crumbs('/fez-history-landmarks');
  assert.equal(en.length, 3);
  assert.deepEqual(en.map(c => c.position), [1, 2, 3]);
  assert.equal(en[0].name, 'Home'); assert.equal(en[0].item, `${ORIGIN}/`);
  assert.equal(en[1].name, 'Fez');
  assert.equal(en[1].item, `${ORIGIN}/fez`);
  assert.equal(crumbs('/fr/fez-history-landmarks')[1].name, 'Fès');
  assert.equal(en[2].name, 'History, Culture & Landmarks');
  assert.equal(en[2].item, `${ORIGIN}/fez-history-landmarks`);
  const fr = crumbs('/fr/daytrip-chefchaouen');
  assert.equal(fr[0].name, 'Accueil'); assert.equal(fr[0].item, `${ORIGIN}/fr`);
  assert.equal(fr.at(-1).item, `${ORIGIN}/fr/daytrip-chefchaouen`);
  assert.ok(fr.every(c => c.item.startsWith(`${ORIGIN}/fr`)));
  assert.equal(crumbs('/es/about')[0].name, 'Inicio');
  assert.equal(byType(ld(head(document, '/')), 'BreadcrumbList'), undefined, 'no breadcrumb on home');
  document.pages.find(p => p.id === 'fez').enabled = false;
  assert.equal(crumbs('/fez-history-landmarks').length, 2, 'disabled parents are skipped');
});

test('TravelAgency JSON-LD is rich, sameAs only keeps https URLs', () => {
  const document = createCmsSeed();
  const agency = byType(ld(head(document, '/')), 'TravelAgency');
  assert.equal(agency.name, 'Fez Guide Tours');
  assert.equal(agency.url, `${ORIGIN}/`);
  assert.equal(agency.logo, `${ORIGIN}/favicon.svg`);
  assert.equal(agency.image, `${ORIGIN}/images/real/about_us_image7.jpg`);
  assert.deepEqual(agency.address, { '@type': 'PostalAddress', streetAddress: 'Bab Boujloud, Medina of Fez', addressLocality: 'Fez', postalCode: '30110', addressCountry: 'MA' });
  assert.deepEqual(agency.geo, { '@type': 'GeoCoordinates', latitude: 34.0331, longitude: -5.0003 });
  assert.equal(agency.priceRange, '$$');
  assert.equal(agency.areaServed.name, 'Fez');
  assert.equal(agency.sameAs.length, 3);
  assert.equal(agency.aggregateRating, undefined);
  document.siteSettings.socialInstagram = 'http://insecure.example/x';
  document.siteSettings.socialFacebook = '';
  document.siteSettings.address.en = 'Somewhere odd';
  const trimmed = byType(ld(head(document, '/')), 'TravelAgency');
  assert.deepEqual(trimmed.sameAs, [document.siteSettings.socialTripadvisor]);
  assert.equal(trimmed.address.streetAddress, 'Somewhere odd');
  assert.equal(trimmed.address.postalCode, undefined);
});

test('tour Product JSON-LD carries description, brand and availability without ratings', () => {
  const document = createCmsSeed();
  const product = byType(ld(head(document, '/fr/daytrip-chefchaouen')), 'Product');
  assert.ok(product, 'product emitted');
  assert.deepEqual(product.brand, { '@type': 'Brand', name: 'Fez Guide Tours' });
  assert.equal(product.offers.availability, 'https://schema.org/InStock');
  assert.ok(product.offers.price && product.offers.priceCurrency && product.offers.url);
  const record = document.products.find(p => p.id === document.pages.find(page => page.id === 'daytrip-chefchaouen').productId);
  assert.equal(product.description, record.shortDescription.fr);
  assert.equal(product.aggregateRating, undefined);
  assert.equal(product.review, undefined);
});

test('hostile CMS text cannot break out of the JSON-LD script', () => {
  const document = createCmsSeed();
  const evil = '</script><script>alert(1)</script>';
  document.siteSettings.address.en = `${evil}, 30110 Morocco`;
  document.pages.find(p => p.id === 'fez').title.en = evil;
  document.products.find(p => p.id === document.pages.find(page => page.id === 'daytrip-chefchaouen').productId).shortDescription.en = evil;
  for (const path of ['/fez-history-landmarks', '/daytrip-chefchaouen']) {
    const html = rewriteRouteHtml(template, document, resolveRoute(new URL(`${ORIGIN}${path}`), document), ORIGIN);
    assert.ok(!html.includes('<script>alert(1)'));
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.equal(blocks.length, 1);
    assert.doesNotMatch(blocks[0][1], /</);
    JSON.parse(blocks[0][1]);
  }
});

test('rewriteRouteHtml stays cheap with the richer JSON-LD', () => {
  const document = createCmsSeed();
  const route = resolveRoute(new URL(`${ORIGIN}/`), document);
  for (let i = 0; i < 10; i++) rewriteRouteHtml(template, document, route, ORIGIN);
  const start = performance.now();
  for (let i = 0; i < 50; i++) rewriteRouteHtml(template, document, route, ORIGIN);
  const each = (performance.now() - start) / 50;
  console.log(`rewriteRouteHtml home: ${each.toFixed(2)} ms`);
  assert.ok(each < 10, `rewriteRouteHtml took ${each.toFixed(2)} ms`);
});

test('www host 301s to the canonical origin before any other processing', async () => {
  let limited = 0;
  const env = { CANONICAL_ORIGIN: ORIGIN, CMS_REDIRECT_HOSTS: 'www.fezguidetours.com, Other.example', CMS_PUBLIC_RATE_LIMIT_REQUIRED: 'true',
    CMS_PUBLIC_RATE_LIMITER: { async limit() { limited++; return { success: false }; } } };
  const call = url => worker.fetch(new Request(url), env);
  const moved = await call('https://www.fezguidetours.com/fr/about?x=1&y=2');
  assert.equal(moved.status, 301);
  assert.equal(moved.headers.get('Location'), `${ORIGIN}/fr/about?x=1&y=2`);
  assert.equal((await call('https://other.example/')).headers.get('Location'), `${ORIGIN}/`);
  assert.equal((await call('https://www.fezguidetours.com/admin')).status, 301);
  assert.equal(limited, 0, 'redirect precedes the rate limiter');
  assert.notEqual((await call('https://fezguidetours.com/')).status, 301);
  const unset = await worker.fetch(new Request('https://www.fezguidetours.com/'), { CANONICAL_ORIGIN: ORIGIN });
  assert.notEqual(unset.status, 301);
});

test('sitemap adds the published revision date as lastmod to every url', async () => {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of ['0001_cms.sql', '0002_media_budget.sql', '0003_cms_release_safeguards.sql']) sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
  let revisionQueries = 0;
  const statement = (sql, values = []) => ({
    bind: (...args) => statement(sql, args),
    async first() { if (/FROM cms_revisions WHERE version/.test(sql)) revisionQueries++; return sqlite.prepare(sql).get(...values) ?? null; },
    async run() { const result = sqlite.prepare(sql).run(...values); return { success: true, meta: { changes: Number(result.changes) } }; },
  });
  const db = { prepare: statement, async batch(statements) { const out = []; for (const s of statements) out.push(await s.run()); return out; } };
  try {
    const store = new CmsStore(db, validateCmsDocument);
    await store.saveDraft(createCmsSeed(), 0, 'fixture');
    await store.publish(1, 'fixture');
    const created = sqlite.prepare('SELECT created_at FROM cms_revisions WHERE version = 2').get().created_at;
    const env = { CMS_DB: db, CANONICAL_ORIGIN: ORIGIN };
    const xml = await (await worker.fetch(new Request(`${ORIGIN}/sitemap.xml`), env)).text();
    const urls = xml.match(/<url>/g).length;
    const stamps = xml.match(/<lastmod>([^<]+)<\/lastmod>/g);
    assert.ok(urls > 10);
    assert.equal(stamps.length, urls);
    assert.equal(stamps[0], `<lastmod>${new Date(created).toISOString()}</lastmod>`);
    const before = revisionQueries;
    await worker.fetch(new Request(`${ORIGIN}/sitemap.xml`), env);
    assert.equal(revisionQueries, before, 'cached revision needs no extra query');
  } finally { sqlite.close(); }
});

test('breadcrumb parents use their menu label and a parent loop always terminates', () => {
  const document = createCmsSeed();
  const crumbs = path => byType(ld(head(document, path)), 'BreadcrumbList').itemListElement.map(item => item.name);
  assert.deepEqual(crumbs('/fez-history-landmarks'), ['Home', 'Fez', document.pages.find(p => p.id === 'fez-history-landmarks').title.en]);
  const dayTripsLabel = document.navigation.find(link => link.pageId === 'day-trips').label.fr;
  assert.equal(crumbs('/fr/daytrip-chefchaouen')[1], dayTripsLabel, 'parent label follows the French menu');
  // Hostile graph: hidden parent pointing back at the page. Must not hang and must skip the hidden parent.
  const looped = structuredClone(document);
  const page = looped.pages.find(p => p.id === 'fez-history-landmarks');
  const fez = looped.pages.find(p => p.id === 'fez');
  fez.enabled = false; fez.parentId = page.id;
  const started = Date.now();
  const names = byType(ld(head(looped, '/fez-history-landmarks')), 'BreadcrumbList').itemListElement.map(item => item.name);
  assert.ok(Date.now() - started < 1000);
  assert.deepEqual(names, ['Home', page.title.en]);
});

test('blog post pages are marked up as articles (BlogPosting + og:type article); other pages are not', () => {
  const document = createCmsSeed();
  const posts = document.blogPosts.filter(post => post.published !== false);
  assert.ok(posts.length > 0);
  for (const post of posts) {
    const page = document.pages.find(p => p.id === post.id);
    for (const prefix of ['', '/fr', '/es']) {
      const html = head(document, `${prefix}/${page.slug}`);
      const article = byType(ld(html), 'BlogPosting');
      assert.ok(article, `${post.id}${prefix}: BlogPosting present`);
      assert.equal(article.url, `${ORIGIN}${prefix}/${page.slug}`);
      assert.equal(article.mainEntityOfPage['@id'], article.url);
      assert.equal(article.inLanguage, prefix ? prefix.slice(1) : 'en');
      assert.equal(article.datePublished, post.date);
      assert.ok(article.headline && !article.headline.includes('| Fez Guide Tours'));
      assert.ok(article.author.name && !/[—–]/.test(article.author.name), `${post.id}: author is the person, not "Name — Brand"`);
      assert.equal(article.publisher.name, 'Fez Guide Tours');
      assert.ok(html.includes('property="og:type" content="article"'));
      assert.ok(html.includes(`property="article:published_time" content="${post.date}"`));
    }
  }
  for (const path of ['/', '/blog', '/faq', '/about']) {
    const html = head(document, path);
    assert.equal(byType(ld(html), 'BlogPosting'), undefined, `${path}: no BlogPosting`);
    assert.ok(html.includes('property="og:type" content="website"'), `${path}: og:type website`);
  }
  // An unpublished post's page is not marked up as an article.
  const hidden = posts[0];
  hidden.published = false;
  const hiddenPage = document.pages.find(p => p.id === hidden.id);
  const html = head(document, `/${hiddenPage.slug}`);
  // It resolves as a 404 (no structured data at all) and never as an article.
  assert.ok(!html.includes('BlogPosting'));
  assert.ok(!html.includes('content="article"'));
});
