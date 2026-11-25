import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { register } from 'tsx/esm/api';
register();
const { default: worker } = await import('../worker/index.ts');
const { CmsStore } = await import('../worker/cms-store.ts');
const { rewriteRouteHtml } = await import('../worker/seo.ts');
const { routeSeoHead } = await import('../src/cms/seo.ts');
const { resolveRoute, pagePath } = await import('../src/cms/routing.ts');
const { validateCmsDocument } = await import('../src/cms/schema.ts');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { buildFaqPage } = await import('../src/cms/faq-page.ts');
const SEO_TITLE_LIMIT = 42, SEO_DESCRIPTION_LIMIT = 155; // the editor's Google length counters (src/admin/StructuredFields.tsx)
const template = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const ORIGIN = 'https://canonical.example';
const LANGUAGES = ['en', 'fr', 'es'];
const route = (document, path) => resolveRoute(new URL(`${ORIGIN}${path}`), document);
const ld = html => JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1]);
const rootOf = html => /<div id="root">([\s\S]*?)<\/div>\s*<script type="module"/.exec(html)?.[1] ?? '';
const decode = value => value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

test('seed has a real FAQ page: titles, hero, accordion of every FAQ, WhatsApp closing, SEO within the editor counters', () => {
  const seed = createCmsSeed();
  const page = seed.pages.find(item => item.id === 'faq');
  assert.ok(page, 'faq page');
  assert.equal(page.slug, 'faq');
  assert.equal(page.enabled, true);
  assert.equal(page.parentId, undefined);
  assert.deepEqual(page.title, { en: 'Frequently Asked Questions', fr: 'Questions fréquentes', es: 'Preguntas frecuentes' });
  assert.deepEqual(page.sections.map(section => [section.id, section.type]), [['hero', 'hero'], ['questions', 'faq'], ['contact', 'contact']]);
  const faq = page.sections[1];
  assert.equal(faq.variant, 'accordion');
  assert.deepEqual(faq.faqIds, seed.faqs.map(item => item.id));
  assert.equal(seed.faqs.length, 12);
  assert.ok(page.sections[0].image && seed.media.some(media => media.id === page.sections[0].image.mediaId), 'hero photo');
  assert.ok(page.sections[2].links.every(link => link.href.startsWith('https://wa.me/')));
  for (const language of LANGUAGES) {
    assert.ok(page.seo.title[language].trim().length > 0 && page.seo.title[language].length <= SEO_TITLE_LIMIT, `${language} seo title`);
    assert.ok(page.seo.description[language].length >= 100 && page.seo.description[language].length <= SEO_DESCRIPTION_LIMIT, `${language} seo description`);
    assert.ok(page.sections.every(section => section.title?.[language]?.trim()), `${language} section titles`);
  }
  assert.equal(validateCmsDocument(seed).valid, true);
  assert.equal(seed.pages.filter(item => item.slug === 'faq' || item.id === 'faq').length, 1, 'address is unique');
  assert.ok(!seed.navigation.some(link => link.pageId === 'faq'), 'footer only: not in the top menu');
});

test('footer ends with the FAQ link; the bespoke page stays published but leaves the footer', () => {
  const seed = createCmsSeed();
  const last = seed.footer.links.at(-1);
  assert.deepEqual(last, { id: 'footer-faq', pageId: 'faq', label: seed.pages.find(item => item.id === 'faq').title, enabled: true });
  assert.ok(!seed.footer.links.some(link => link.pageId === 'page-bespoke-itinerary' || link.id === 'footer-page-bespoke-itinerary'));
  const bespoke = seed.pages.find(item => item.id === 'page-bespoke-itinerary');
  assert.ok(bespoke && bespoke.enabled && bespoke.slug === 'bespoke-morocco-experiences', 'bespoke page and URL stay alive');
  assert.ok(seed.legacy.customPages.some(item => item.id === 'page-bespoke-itinerary'));
});

test('/faq, /fr/faq and /es/faq resolve to the page and the footer link path matches', () => {
  const document = createCmsSeed();
  for (const [path, language] of [['/faq', 'en'], ['/fr/faq', 'fr'], ['/es/faq', 'es']]) {
    const resolved = route(document, path);
    assert.equal(resolved.page?.id, 'faq', path);
    assert.equal(resolved.language, language);
    assert.equal(resolved.redirect, undefined, `${path} is canonical`);
    assert.equal(pagePath(document, 'faq', language), path);
  }
  assert.equal(route(document, '/?page=faq&lang=fr').redirect, '/fr/faq');
});

test('FAQ SSR snapshot gives crawlers the H1 and every question and answer in the page language', () => {
  const document = createCmsSeed();
  for (const [path, language] of [['/faq', 'en'], ['/fr/faq', 'fr'], ['/es/faq', 'es']]) {
    const html = rewriteRouteHtml(template, document, route(document, path), ORIGIN);
    const root = rootOf(html);
    assert.equal([...root.matchAll(/<h1[ >]/g)].length, 1, `${language}: one h1`);
    assert.ok(root.includes(`<h1>${document.pages.find(page => page.id === 'faq').title[language]}</h1>`), `${language}: h1`);
    const visible = decode(root);
    for (const faq of document.faqs) {
      assert.ok(visible.includes(faq.question[language]), `${language} ${faq.id} question`);
      assert.ok(visible.includes(faq.answer[language].slice(0, 80)), `${language} ${faq.id} answer`);
    }
    assert.equal([...root.matchAll(/<ul class="ssr-faq">/g)].length, 1);
    // The footer link shows up in the crawler snapshot, with the page's own address.
    assert.ok(root.includes(`<a href="${pagePath(document, 'faq', language)}">`), `${language}: link to the FAQ`);
  }
});

test('FAQPage structured data mirrors the visible accordion in each language and only for enabled faq sections', () => {
  const document = createCmsSeed();
  for (const [path, language] of [['/faq', 'en'], ['/fr/faq', 'fr'], ['/es/faq', 'es']]) {
    const graph = ld(routeSeoHead(document, route(document, path), ORIGIN));
    const node = graph.find(item => item['@type'] === 'FAQPage');
    assert.ok(node, `${language}: FAQPage`);
    assert.equal(node.url, `${ORIGIN}${path}`);
    assert.equal(node.inLanguage, language);
    assert.equal(node.mainEntity.length, 12);
    assert.deepEqual(node.mainEntity.map(item => [item['@type'], item.name, item.acceptedAnswer['@type'], item.acceptedAnswer.text]),
      document.faqs.map(faq => ['Question', faq.question[language], 'Answer', faq.answer[language]]));
    assert.ok(graph.some(item => item['@type'] === 'BreadcrumbList'), 'breadcrumbs stay');
    assert.equal(graph.find(item => item['@type'] === 'WebPage').name, document.pages.find(page => page.id === 'faq').seo.title[language]);
  }
  // Pages without a faq section never carry FAQPage markup.
  assert.ok(!ld(routeSeoHead(document, route(document, '/about'), ORIGIN)).some(item => item['@type'] === 'FAQPage'));
  // Follows the editor: a new FAQ added to the accordion appears; removed, disabled or blank ones do not.
  const edited = structuredClone(document);
  const page = edited.pages.find(item => item.id === 'faq');
  edited.faqs.push({ id: 'faq-13', category: 'general', question: { en: 'New question?', fr: 'Nouvelle question ?', es: '¿Nueva pregunta?' }, answer: { en: 'New answer.', fr: 'Nouvelle réponse.', es: 'Nueva respuesta.' } });
  page.sections[1].faqIds = ['faq-13', 'faq-2'];
  edited.faqs.find(faq => faq.id === 'faq-2').answer.fr = '  ';
  assert.deepEqual(ld(routeSeoHead(edited, route(edited, '/faq'), ORIGIN)).find(item => item['@type'] === 'FAQPage').mainEntity.map(item => item.name), ['New question?', edited.faqs.find(faq => faq.id === 'faq-2').question.en]);
  assert.deepEqual(ld(routeSeoHead(edited, route(edited, '/fr/faq'), ORIGIN)).find(item => item['@type'] === 'FAQPage').mainEntity.map(item => item.name), ['Nouvelle question ?'], 'blank answer is left out');
  page.sections[1].enabled = false;
  assert.ok(!ld(routeSeoHead(edited, route(edited, '/faq'), ORIGIN)).some(item => item['@type'] === 'FAQPage'));
  // Markup text is escaped like everything else in the head.
  const hostile = structuredClone(document);
  hostile.faqs[0].question.en = '</script><script>alert(1)</script>';
  const head = routeSeoHead(hostile, route(hostile, '/faq'), ORIGIN);
  assert.doesNotMatch(head, /<\/script><script>alert/);
});

test('published FAQ page is served with canonical, hreflang, indexable robots, sitemap entries and FAQ markup', async () => {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of ['0001_cms.sql', '0002_media_budget.sql', '0003_cms_release_safeguards.sql']) sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
  const statement = (sql, values = []) => ({ bind: (...args) => statement(sql, args), async first() { return sqlite.prepare(sql).get(...values) ?? null; },
    async run() { const result = sqlite.prepare(sql).run(...values); return { success: true, meta: { changes: Number(result.changes) } }; } });
  const db = { prepare: statement, async batch(statements) { sqlite.exec('BEGIN'); try { const out = []; for (const item of statements) out.push(await item.run()); sqlite.exec('COMMIT'); return out; } catch (error) { sqlite.exec('ROLLBACK'); throw error; } } };
  const env = { CMS_DB: db, CANONICAL_ORIGIN: ORIGIN, ASSETS: { async fetch() { return new Response(template, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }); } } };
  const call = path => worker.fetch(new Request(`https://spoofed-host.test${path}`, { headers: { Accept: 'text/html' } }), env);
  try {
    const store = new CmsStore(db, validateCmsDocument);
    await store.saveDraft(createCmsSeed(), 0, 'fixture');
    await store.publish(1, 'fixture');
    for (const [path, language, title] of [['/faq', 'en', 'Fez Tour FAQ: Booking &amp; Practical Help'], ['/fr/faq', 'fr', 'FAQ visites de Fès : vos questions'], ['/es/faq', 'es', 'FAQ de visitas en Fez: tus preguntas']]) {
      const response = await call(path);
      assert.equal(response.status, 200, path);
      const html = await response.text();
      assert.match(html, new RegExp(`<title>${title} \\| Fez Guide Tours</title>`), path);
      assert.match(html, /name="robots" content="index,follow"/);
      assert.ok(html.includes(`rel="canonical" href="${ORIGIN}${path}"`), path);
      for (const hreflang of [['en', '/faq'], ['fr', '/fr/faq'], ['es', '/es/faq'], ['x-default', '/faq']]) assert.ok(html.includes(`hreflang="${hreflang[0]}" href="${ORIGIN}${hreflang[1]}"`), `${path} ${hreflang[0]}`);
      assert.equal(html.match(/"@type":"FAQPage"/g)?.length, 1, path);
      assert.match(rootOf(html), new RegExp(`<h1>${{ en: 'Frequently Asked Questions', fr: 'Questions fréquentes', es: 'Preguntas frecuentes' }[language]}</h1>`));
    }
    const sitemap = await (await call('/sitemap.xml')).text();
    for (const path of ['/faq', '/fr/faq', '/es/faq']) assert.ok(sitemap.includes(`<loc>${ORIGIN}${path}</loc>`), `sitemap ${path}`);
    assert.ok(sitemap.includes(`<xhtml:link rel="alternate" hreflang="fr" href="${ORIGIN}/fr/faq"`), 'sitemap alternates');
    // The bespoke URL keeps working.
    assert.equal((await call('/bespoke-morocco-experiences')).status, 200);
  } finally { sqlite.close(); }
});

test('buildFaqPage is the one definition: custom ids and no photo still produce a valid page', () => {
  const seed = createCmsSeed();
  const document = structuredClone(seed);
  document.pages = document.pages.filter(page => page.id !== 'faq');
  document.footer.links.pop();
  document.pages.push(buildFaqPage({ faqIds: ['faq-3', 'faq-1'] }));
  document.footer.links.push({ id: 'footer-faq', pageId: 'faq', label: document.pages.at(-1).title, enabled: true });
  assert.equal(validateCmsDocument(document).valid, true);
  assert.equal(document.pages.at(-1).sections[0].image, undefined);
  assert.deepEqual(document.pages.at(-1).sections[1].faqIds, ['faq-3', 'faq-1']);
});
