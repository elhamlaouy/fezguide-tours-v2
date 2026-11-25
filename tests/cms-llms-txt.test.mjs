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
const { buildLlmsTxt } = await import('../src/cms/llms.ts');
const { pagePath } = await import('../src/cms/routing.ts');
const { isPublicPage } = await import('../src/cms/render-utils.ts');
const template = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const ORIGIN = 'https://canonical.example';

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
  const call = (path, options = {}) => worker.fetch(new Request(`https://spoofed-host.test${path}`, options), env);
  return { sqlite, store, call };
}
const links = text => [...text.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map(match => match[1]);

test('llms.txt lists every public indexable page once, with title, H1 and summary', () => {
  const document = createCmsSeed();
  const text = buildLlmsTxt(document, ORIGIN);
  assert.match(text, new RegExp(`^# ${document.siteSettings.siteName}\\n\\n> \\S`));
  for (const heading of ['## Contact', '## Main pages', '## Tours', '## Guides', '## Blog', '## Frequently asked questions']) assert.ok(text.includes(`\n${heading}\n`), heading);
  const expected = document.pages.filter(page => isPublicPage(document, page) && !page.seo.noIndex).map(page => `${ORIGIN}${pagePath(document, page.id, 'en')}`);
  const listed = links(text).filter(url => !url.endsWith('/sitemap.xml'));
  assert.deepEqual([...listed].sort(), [...expected].sort());
  assert.equal(new Set(listed).size, listed.length, 'no page listed twice');
  assert.ok(text.includes(`(${ORIGIN}/faq)`));
  assert.match(text, /Price: €\d+/);
  assert.ok(!/\[[^\]]*\n/.test(text), 'link labels stay on one line');
});

test('llms.txt follows CMS edits: hidden, noindex and unpublished content drops out, new posts appear', () => {
  const document = createCmsSeed();
  document.pages.find(page => page.id === 'about').enabled = false;
  document.pages.find(page => page.id === 'tips-practical').seo.noIndex = true;
  const post = document.blogPosts[0];
  post.published = false;
  const postSlug = document.pages.find(page => page.id === post.id).slug;
  const text = buildLlmsTxt(document, ORIGIN);
  assert.ok(!text.includes(`${ORIGIN}/about)`));
  assert.ok(!text.includes('/tips-practical)'));
  assert.ok(!text.includes(`/${postSlug})`));
  // A new post created in the editor shows up under Blog without code changes.
  const source = document.blogPosts[1];
  const sourcePage = document.pages.find(page => page.id === source.id);
  document.pages.push({ ...structuredClone(sourcePage), id: 'blog-post-99', slug: 'a-new-story', source: 'cms-blog', seo: { ...structuredClone(sourcePage.seo), canonical: undefined } });
  delete document.pages.at(-1).seo.canonical;
  document.blogPosts.push({ ...structuredClone(source), id: 'blog-post-99', slug: 'a-new-story' });
  const updated = buildLlmsTxt(document, ORIGIN);
  const blog = updated.split('\n## Blog\n')[1].split('\n## ')[0];
  assert.ok(blog.includes(`(${ORIGIN}/a-new-story)`));
  // A question removed from every page is no longer listed.
  const faqPage = document.pages.find(page => page.id === 'faq');
  const faqSection = faqPage.sections.find(section => section.type === 'faq');
  const removed = document.faqs.find(item => item.id === faqSection.faqIds[0]);
  faqSection.faqIds = faqSection.faqIds.slice(1);
  assert.ok(!buildLlmsTxt(document, ORIGIN).includes(removed.question.en));
});

test('the worker serves /llms.txt from the published document as text/plain on the canonical origin', async () => {
  const { sqlite, store, call } = fixture();
  try {
    const document = createCmsSeed();
    await store.saveDraft(document, 0, 'fixture'); await store.publish(1, 'fixture');
    const response = await call('/llms.txt', { headers: { Accept: '*/*' } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
    const text = await response.text();
    assert.equal(text, buildLlmsTxt(document, ORIGIN));
    assert.doesNotMatch(text, /spoofed-host/);
    const head = await call('/llms.txt', { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    // Publishing an edit changes the file with no deploy.
    document.pages.find(page => page.id === 'faq').title.en = 'Questions & Answers';
    await store.saveDraft(document, 2, 'fixture'); await store.publish(3, 'fixture');
    assert.match(await (await call('/llms.txt')).text(), /\[Questions & Answers\]\(https:\/\/canonical\.example\/faq\)/);
  } finally { sqlite.close(); }
});
