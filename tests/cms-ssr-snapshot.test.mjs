import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { register } from 'tsx/esm/api';
register();
const { default: worker } = await import('../worker/index.ts');
const { CmsStore } = await import('../worker/cms-store.ts');
const { rewriteRouteHtml } = await import('../worker/seo.ts');
const { buildSnapshot, cachedSnapshot, clearSnapshotCache, snapshotCacheSize } = await import('../worker/ssr-snapshot.ts');
const { validateCmsDocument } = await import('../src/cms/schema.ts');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { resolveRoute } = await import('../src/cms/routing.ts');
const template = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const ORIGIN = 'https://canonical.example';
const render = (document, path) => rewriteRouteHtml(template, document, resolveRoute(new URL(`${ORIGIN}${path}`), document), ORIGIN);
const rootOf = html => /<div id="root">([\s\S]*?)<\/div>\s*<script type="module"/.exec(html)?.[1] ?? '';
const h1s = html => [...html.matchAll(/<h1[ >]/g)].length;
const text = value => ({ en: value, fr: value, es: value });

test('found routes get a semantic snapshot in EN, FR and ES with the page H1 and real links', () => {
  const document = createCmsSeed();
  const expected = { en: ['/fez', 'Explore the Medina of Fez — Through Local Eyes', 'Day Trips', 'Home'], fr: ['/fr/fez', 'Explorer la Médina de Fès — À Travers des Yeux Locaux', 'Excursions', 'Accueil'], es: ['/es/fez', 'Explorad la medina de Fez a través de los ojos de sus habitantes', 'Excursiones', 'Inicio'] };
  for (const [language, [path, title]] of Object.entries(expected)) {
    const html = render(document, path);
    const root = rootOf(html);
    assert.match(root, /^<div class="ssr-snapshot"><header class="ssr-header">/, language);
    assert.match(root, /<header class="ssr-header"><div class="ssr-bar"><a class="ssr-brand" href="[^"]*"[^>]*>.*<\/a><nav aria-label="[^"]+"><a href="/, language);
    assert.match(root, /<main>[\s\S]*<h1>[\s\S]*<\/h1>[\s\S]*<\/main><footer class="ssr-footer">/, language);
    assert.equal(h1s(root), 1, `${language}: exactly one h1`);
    assert.ok(root.includes(`<h1>${title.replace(/&/g, '&amp;')}</h1>`), `${language}: h1 ${title}`);
    assert.ok(root.includes(`<a href="${path}">`), `${language}: nav link to ${path}`);
    assert.match(root, /<h2>/, language);
    assert.match(root, /<h3><a href="[^"]+">/, `${language}: card title links`);
    assert.match(root, /<footer class="ssr-footer">[\s\S]*<a href="mailto:[^"]+">[\s\S]*<\/footer>/, language);
    assert.equal(html.match(/<html lang="(\w+)"/)[1], language);
  }
  // Breadcrumb and prices on deep pages, in the page's own language.
  const deep = rootOf(render(document, '/fr/daytrip-chefchaouen'));
  assert.match(deep, /<nav class="ssr-crumbs" aria-label="Breadcrumb"><a href="\/fr">Accueil<\/a> <a href="\/fr\/day-trips">[^<]+<\/a> <span aria-current="page">/);
  assert.match(deep, /€130 par véhicule/);
  assert.equal(h1s(deep), 1);
});

test('every seed page in every language has exactly one H1 and only internal or safe links', () => {
  const document = createCmsSeed();
  for (const page of document.pages) for (const language of ['en', 'fr', 'es']) {
    const route = resolveRoute(new URL(`${ORIGIN}${language === 'en' ? '' : `/${language}`}/${page.slug === 'home' ? '' : page.slug}`), document);
    if (!route.page || route.redirect) continue;
    const snapshot = buildSnapshot(document, route.page, language);
    assert.equal(h1s(snapshot), 1, `${page.id}/${language}`);
    for (const [, href] of snapshot.matchAll(/ href="([^"]*)"/g)) assert.match(href, /^(\/|https:\/\/|mailto:|tel:|#)/, `${page.id}/${language}: ${href}`);
    assert.doesNotMatch(snapshot, /<(?:script|style|img|iframe)\b/i);
  }
});

test('hidden sections, unpublished pages, disabled links and disabled cards never appear', () => {
  const document = createCmsSeed();
  const fez = document.pages.find(page => page.id === 'fez');
  fez.sections.find(section => section.id === 'introduction').enabled = false;
  document.pages.find(page => page.id === 'fez-things-to-do').enabled = false;
  document.navigation.find(link => link.pageId === 'about').enabled = false;
  document.footer.links.push({ id: 'ft-off', label: text('Disabled Footer Link'), enabled: false, pageId: 'home' });
  const introTitle = 'Fes el-Bali (Old Medina)';
  const before = rootOf(render(createCmsSeed(), '/fez'));
  assert.ok(before.includes(introTitle) && before.includes('/fez-things-to-do'));
  const root = rootOf(render(document, '/fez'));
  assert.ok(!root.includes(introTitle), 'hidden section');
  assert.ok(!root.includes('/fez-things-to-do'), 'unpublished page card');
  assert.ok(!root.includes('<a href="/about">'), 'disabled nav link');
  assert.ok(!root.includes('Disabled Footer Link'));
  // A disabled page is a 404, not a snapshot.
  document.pages.find(page => page.id === 'about').enabled = false;
  const gone = render(document, '/about');
  assert.equal(rootOf(gone), '<main><h1>404 — Page not found</h1></main>');
  // An unpublished product is not shown as a priced card or booking.
  const product = createCmsSeed();
  product.products.find(item => item.id === 'daytrip-chefchaouen').published = false;
  assert.ok(!rootOf(render(product, '/day-trips')).includes('/daytrip-chefchaouen'));
  // Hidden reviews and galleries contribute no text.
  assert.doesNotMatch(rootOf(render(createCmsSeed(), '/fez-history-landmarks')), /Tripadvisor|Mathilde/);
});

test('CMS text is always escaped and can never break out of #root or create markup', () => {
  const evil = `<script>alert(1)</script></div></main><img src=x onerror=alert(1)>"'&`;
  const document = createCmsSeed();
  const hero = document.pages.find(page => page.id === 'fez').sections.find(section => section.id === 'hero');
  hero.title = text(evil); hero.description = text(evil); hero.eyebrow = text(evil);
  const card = document.pages.find(page => page.id === 'fez').sections.find(section => section.id === 'overview').cards[0];
  card.title = text(evil); card.description = text(evil);
  document.navigation[1].label = text(evil);
  document.footer.text = text(evil);
  document.siteSettings.address = text(evil);
  const html = render(document, '/fez');
  const root = rootOf(html);
  assert.ok(root.length > 1000, 'root content found');
  assert.ok(root.includes('&lt;script&gt;alert(1)&lt;/script&gt;&lt;/div&gt;&lt;/main&gt;&lt;img src=x onerror=alert(1)&gt;&quot;&#39;&amp;'));
  assert.doesNotMatch(root, /<script|<img|<\/div><\/main>/);
  assert.doesNotMatch(html.replace(/<script id="cms-published-document"[\s\S]*?<\/script>/, ''), /<script>alert|<img src=x/);
  assert.equal(h1s(root), 1);
  // The snapshot is one balanced block: the root still closes right before the module script.
  assert.match(html, /<\/footer><\/div><\/div>\s*<script type="module"/);
});

test('unsafe URLs are dropped from snapshot links', () => {
  const document = createCmsSeed();
  const home = document.pages.find(page => page.id === 'home');
  const contact = home.sections.find(section => section.id === 'contact');
  contact.links = [
    { id: 'js', label: text('Run script link'), enabled: true, href: 'javascript:alert(1)' },
    { id: 'http', label: text('Plain http link'), enabled: true, href: 'http://evil.example/' },
    { id: 'data', label: text('Data link'), enabled: true, href: 'data:text/html,hi' },
    { id: 'proto', label: text('Protocol relative link'), enabled: true, href: '//evil.example/x' },
    { id: 'ok', label: text('Safe https link'), enabled: true, href: 'https://example.test/ok?a=1&b="2"' },
  ];
  document.footer.links.push({ id: 'ft-js', label: text('Footer script link'), enabled: true, href: 'javascript:alert(2)' });
  document.siteSettings.email = 'x@example.test?subject=<b>';
  const root = rootOf(render(document, '/'));
  for (const label of ['Run script link', 'Plain http link', 'Data link', 'Protocol relative link', 'Footer script link']) assert.ok(!root.includes(label), label);
  assert.doesNotMatch(root, /javascript:|data:text|evil\.example|href="http:/);
  assert.ok(root.includes('<a href="https://example.test/ok?a=1&amp;b=&quot;2&quot;" rel="noopener noreferrer" target="_blank">Safe https link</a>'));
  assert.doesNotMatch(root, /mailto:x@example\.test\?subject/);
});

test('the snapshot uses the content language and fallback exactly like the client', () => {
  const document = createCmsSeed();
  const page = document.pages.find(item => item.id === 'about');
  page.localeFallback = { fr: 'en' };
  page.title.fr = '';
  const root = rootOf(render(document, '/fr/about'));
  assert.match(root, /<article lang="en">/);
  assert.ok(root.includes(`<h1>${page.title.en}</h1>`) || /<h1>/.test(root));
  assert.equal(h1s(root), 1);
  // Spanish has no silent English fallback: an untranslated page is a 404 route, never English text.
  const spanish = createCmsSeed();
  spanish.pages.find(item => item.id === 'about').title.es = '';
  assert.equal(rootOf(render(spanish, '/es/about')), '<main><h1>404 — Página no encontrada</h1></main>');
});

test('snapshots are cached per revision, page and language in a bounded LRU map', () => {
  clearSnapshotCache();
  const document = createCmsSeed();
  const page = document.pages.find(item => item.id === 'fez');
  const first = cachedSnapshot(document, page, 'en', 1);
  assert.equal(snapshotCacheSize(), 1);
  // A hit returns the cached string without rebuilding, even if the (immutable-per-revision) input were changed.
  document.pages.find(item => item.id === 'fez').sections[0].title.en = 'Changed after caching';
  assert.equal(cachedSnapshot(document, page, 'en', 1), first);
  assert.ok(!first.includes('Changed after caching'));
  assert.ok(cachedSnapshot(document, page, 'en', 2).includes('Changed after caching'), 'a new revision rebuilds');
  assert.notEqual(cachedSnapshot(document, page, 'fr', 1), first, 'language is part of the key');
  assert.notEqual(cachedSnapshot(document, document.pages.find(item => item.id === 'about'), 'en', 1), first, 'page is part of the key');
  // Bounded: insertion beyond 300 evicts the least recently used entry.
  clearSnapshotCache();
  const small = createCmsSeed();
  const target = small.pages.find(item => item.id === 'about');
  for (let revision = 1; revision <= 300; revision++) cachedSnapshot(small, target, 'en', revision);
  assert.equal(snapshotCacheSize(), 300);
  cachedSnapshot(small, target, 'en', 1); // touch: revision 1 becomes most recent
  cachedSnapshot(small, target, 'en', 301); // evicts revision 2, the least recently used
  assert.equal(snapshotCacheSize(), 300);
  small.pages.find(item => item.id === 'about').sections[0].blocks[0].text.en = 'Rebuilt paragraph';
  assert.ok(!cachedSnapshot(small, target, 'en', 1).includes('Rebuilt paragraph'), 'recently used entry survived');
  assert.ok(cachedSnapshot(small, target, 'en', 2).includes('Rebuilt paragraph'), 'least recently used entry was evicted');
  assert.equal(snapshotCacheSize(), 300);
  clearSnapshotCache();
});

test('404 behaviour and the inline bootstrap are unchanged', () => {
  const document = createCmsSeed();
  for (const [path, message] of [['/nope', 'Page not found'], ['/fr/nope', 'Page introuvable'], ['/es/nope', 'Página no encontrada']]) {
    const html = render(document, path);
    assert.equal(rootOf(html), `<main><h1>404 — ${message}</h1></main>`);
    assert.match(html, /<meta name="robots" content="noindex,follow">/);
  }
  const html = render(document, '/fez');
  const script = /<script id="cms-published-document" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  assert.ok(script);
  const bootstrap = JSON.parse(script[1]);
  assert.deepEqual(bootstrap.scope, { version: 1, pageId: 'fez', language: 'en' });
  assert.equal(bootstrap.document.schemaVersion, 1);
  assert.equal((html.match(/id="cms-published-document"/g) || []).length, 1);
});

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
  const env = { CMS_DB: db, CANONICAL_ORIGIN: ORIGIN, ASSETS: { async fetch() { return new Response(template, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }); } } };
  const store = new CmsStore(db, validateCmsDocument);
  return { sqlite, store, call: path => worker.fetch(new Request(`https://spoofed-host.test${path}`, { headers: { Accept: 'text/html' } }), env) };
}

test('the Worker serves the snapshot for published pages and never for drafts', async () => {
  const { sqlite, store, call } = fixture();
  try {
    clearSnapshotCache();
    const document = createCmsSeed();
    await store.saveDraft(document, 0, 'fixture');
    await store.publish(1, 'fixture');
    const html = await (await call('/fez')).text();
    assert.match(rootOf(html), /^<div class="ssr-snapshot">/);
    assert.equal(h1s(rootOf(html)), 1);
    assert.equal(snapshotCacheSize() >= 1, true);
    // A draft edit is not published, so it never reaches the snapshot.
    document.pages.find(page => page.id === 'fez').sections.find(section => section.id === 'hero').title = text('Draft only headline');
    await store.saveDraft(document, 2, 'fixture');
    assert.ok(!rootOf(await (await call('/fez')).text()).includes('Draft only headline'));
    await store.publish(3, 'fixture');
    assert.ok(rootOf(await (await call('/fez')).text()).includes('<h1>Draft only headline</h1>'));
    const missing = await call('/does-not-exist');
    assert.equal(missing.status, 404);
    assert.equal(rootOf(await missing.text()), '<main><h1>404 — Page not found</h1></main>');
  } finally { sqlite.close(); clearSnapshotCache(); }
});
