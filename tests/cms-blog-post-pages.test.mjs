import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { register } from 'tsx/esm/api';

register();
registerHooks({ load(url, context, next) { return url.endsWith('.css') ? { format: 'module', source: 'export default ""', shortCircuit: true } : next(url, context); } });
const React = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { CmsPreviewProvider, CmsProvider } = await import('../src/context/CmsContext.tsx');
const { PageRenderer } = await import('../src/cms/PageRenderer.tsx');
const { BlogPostPage } = await import('../src/pages/BlogPostPage.tsx');
await (await import('../src/cms/ApprovedPageRenderer.tsx')).preloadApprovedLayouts();

const LANGS = ['en', 'fr', 'es'];
const prefix = language => (language === 'en' ? '' : `/${language}`);
const noop = () => {};
const render = (document, id, language) => renderToStaticMarkup(React.createElement(CmsPreviewProvider, { document },
  React.createElement(PageRenderer, { document, page: document.pages.find(page => page.id === id), language, onNavigate: noop, onBook: noop })));
const count = (html, pattern) => (html.match(pattern) || []).length;
const decode = value => value.replace(/&amp;/g, '&');
/** Markup with all text removed: two posts must differ only in their words. */
const skeleton = html => html.replace(/>[^<]*</g, '><').replace(/ (?:src|srcSet|srcset|alt|href|sizes)="[^"]*"/g, '');

/** What the editor produces for a new post: a cms-blog page, a blogPost record and a card on the blog list. */
function withNewPost(document) {
  const source = document.blogPosts[0];
  const sourcePage = document.pages.find(page => page.id === source.id);
  const id = 'blog-post-9';
  const title = { en: 'A brand new story', fr: 'Une toute nouvelle histoire', es: 'Una historia totalmente nueva' };
  const page = { ...structuredClone(sourcePage), id, slug: 'taxitips', title, source: 'cms-blog', seo: { ...structuredClone(sourcePage.seo), canonical: undefined } };
  delete page.seo.canonical;
  document.pages.push(page);
  document.blogPosts.push({ ...structuredClone(source), id, slug: 'taxitips', title });
  const grid = document.pages.find(page => page.id === 'blog').sections.find(section => section.id === 'posts');
  grid.cards.push({ ...structuredClone(grid.cards.find(card => card.pageId === source.id)), pageId: id, title });
  return { id, page };
}

test('every blog card is a real link to its post page, in every language', () => {
  const document = createCmsSeed();
  for (const language of LANGS) {
    const html = render(document, 'blog', language);
    assert.equal(count(html, /<h1\b/g), 1, `${language}: one h1`);
    assert.ok(!/role="dialog"|aria-modal/.test(html), `${language}: no popup markup`);
    assert.ok(!/<button[^>]*>\s*<span>(Read More|Lire la suite|Leer más)/.test(html), `${language}: Read more is no button`);
    for (const post of document.blogPosts.filter(post => post.published !== false)) {
      const page = document.pages.find(page => page.id === post.id);
      const href = `${prefix(language)}/${page.slug}`;
      const card = new RegExp(`<h2[^>]*><a [^>]*href="${href}"`);
      assert.ok(card.test(html), `${language}: ${post.id} card title links to ${href}`);
      assert.ok(html.includes(`data-internal-link="" href="${href}"`) || html.includes(`href="${href}" data-internal-link=""`), `${language}: ${post.id} internal link`);
    }
  }
});

test('a post page is a standalone page: one h1, back link, CTA, edit markers, no blog list or dialog', () => {
  const document = createCmsSeed();
  const back = { en: 'Back to all articles', fr: 'Retour à tous les articles', es: 'Volver a todos los artículos' };
  for (const language of LANGS) for (const post of document.blogPosts) {
    const html = render(document, post.id, language);
    const where = `${post.id}/${language}`;
    assert.equal(count(html, /<h1\b/g), 1, `${where}: one h1`);
    assert.ok(html.includes(`>${decode(post.title[language])}</h1>`.replace(/&/g, '&amp;')) || html.includes(post.title[language]), `${where}: title`);
    assert.ok(!/role="dialog"|aria-modal|fixed inset-0/.test(html), `${where}: no popup`);
    assert.ok(!html.includes('grid-cols-1 md:grid-cols-2 lg:grid-cols-3'), `${where}: no blog grid behind the post`);
    assert.ok(html.includes(`href="${prefix(language)}/blog"`) && html.includes(back[language]), `${where}: back link`);
    assert.ok(/<button[^>]*>[^<]+<\/button>/.test(html), `${where}: booking CTA`);
    assert.deepEqual([...html.matchAll(/data-section-id="([^"]+)"/g)].map(match => match[1]), ['cover', 'content'], `${where}: editor markers`);
  }
});

test('a post created later in the CMS (any slug) gets the same list card and page as the existing ones', () => {
  const document = createCmsSeed();
  const { id, page } = withNewPost(document);
  assert.equal(page.source, 'cms-blog');
  for (const language of LANGS) {
    const list = render(document, 'blog', language);
    assert.ok(new RegExp(`<h2[^>]*><a [^>]*href="${prefix(language)}/taxitips"`).test(list), `${language}: new card links to /taxitips`);
    const html = render(document, id, language);
    assert.equal(count(html, /<h1\b/g), 1);
    assert.ok(html.includes(`href="${prefix(language)}/blog"`));
    assert.ok(!/role="dialog"|aria-modal/.test(html));
    const existing = render(document, document.blogPosts[0].id, language);
    assert.equal(skeleton(html), skeleton(existing), `${language}: same structure as an existing post`);
  }
});

test('an unknown or unpublished post id is a plain not-found page with a way back, never a popup', () => {
  const html = renderToStaticMarkup(React.createElement(CmsProvider, null, React.createElement(BlogPostPage, { language: 'fr', postId: 'no-such-post', onNavigate: noop, onBookTour: noop })));
  assert.equal(count(html, /<h1\b/g), 1);
  assert.ok(html.includes('Retour à tous les articles') && html.includes('href="/fr/blog"'));
  assert.ok(!/role="dialog"/.test(html));
});

test('the bundled fallback posts open as pages without a document', () => {
  const html = renderToStaticMarkup(React.createElement(CmsProvider, null, React.createElement(BlogPostPage, { language: 'en', postId: createCmsSeed().blogPosts[0].id, onNavigate: noop, onBookTour: noop })));
  assert.equal(count(html, /<h1\b/g), 1);
  assert.ok(html.includes('Back to all articles'));
  assert.ok(!/role="dialog"/.test(html));
});

test('live published document: all posts are standalone pages (set CMS_LIVE_DOC to a {version, document} file)', { skip: !process.env.CMS_LIVE_DOC || !existsSync(process.env.CMS_LIVE_DOC) }, () => {
  const document = JSON.parse(readFileSync(process.env.CMS_LIVE_DOC, 'utf8')).document;
  for (const post of document.blogPosts) for (const language of LANGS) {
    const html = render(document, post.id, language);
    assert.equal(count(html, /<h1\b/g), 1, `${post.id}/${language}`);
    assert.ok(!/role="dialog"/.test(html));
  }
});
