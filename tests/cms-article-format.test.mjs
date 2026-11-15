import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { register } from 'tsx/esm/api';

register();
registerHooks({ load(url, context, nextLoad) {
  if (url.endsWith('.css')) return { format: 'module', source: 'export default "";', shortCircuit: true };
  return nextLoad(url, context);
} });
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const format = await import('../src/cms/article-format.ts');
const { parseArticle, articleMediaIds, articleOverride, spansText, ARTICLE_SYNTAX, ARTICLE_SYNTAX_ITEMS, ARTICLE_LIMITS } = format;
const { ArticleBody, PLAIN_ARTICLE_CLASS } = await import('../src/cms/ArticleBody.tsx');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { CmsPreviewProvider } = await import('../src/context/CmsContext.tsx');
const { ApprovedContentProvider } = await import('../src/cms/approved-content.tsx');
const { BlogPage } = await import('../src/pages/BlogPage.tsx');
const { buildSnapshot } = await import('../worker/ssr-snapshot.ts');
const { publishedMediaReferenced } = await import('../worker/media.ts');
const { publicCmsDocument } = await import('../worker/cms-routes.ts');
const { retainedUploadKeys } = await import('../worker/cms-recovery.ts');
const { PublicPageSwitch } = await import('../src/App.tsx');
await (await import('../src/cms/ApprovedPageRenderer.tsx')).preloadApprovedLayouts();
const { Navbar } = await import('../src/components/Navbar.tsx');
const { Footer } = await import('../src/components/Footer.tsx');

const LANGS = ['en', 'fr', 'es'];
const UPLOAD = 'upload-11111111-2222-3333-4444-555555555555';
const escapeReact = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
const article = (text, document = null, language = 'en', props = {}) => renderToStaticMarkup(createElement(ArticleBody, { text, language, document, ...props }));
const kinds = text => parseArticle(text).blocks.map(block => block.type + (block.level ? block.level : block.ordered ? '#' : ''));

function withPhotos(document) {
  document.media.push({ id: UPLOAD, src: `/media/${UPLOAD}.jpg`, alt: { en: 'Library alt', fr: 'Alt bibliothèque', es: 'Alt biblioteca' }, width: 800, height: 600, source: 'cms-upload' });
  return document;
}
const readerHtml = (document, postId, language) => {
  const page = document.pages.find(page => page.id === postId);
  return renderToStaticMarkup(createElement(CmsPreviewProvider, { document },
    createElement(ApprovedContentProvider, { document, page }, createElement(BlogPage, { language, initialPostId: postId, onNavigate() {}, onExplore() {}, onBookTour() {} }))));
};
const clientHtml = (document, pageId, language) => renderToStaticMarkup(createElement(CmsPreviewProvider, { document }, createElement('div', null,
  createElement(Navbar, { currentPage: pageId, language, document, onNavigate() {}, onLanguageChange() {}, onOpenBooking() {} }),
  createElement('main', null, createElement(PublicPageSwitch, { document, pageId, language, onNavigate() {}, onBook() {}, legacy: null })),
  createElement(Footer, { language, document, onNavigate() {} }))));
const decode = value => value.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16))).replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const textNodes = html => html.replace(/<(script|style)[\s\S]*?<\/\1>/g, '').split(/<[^>]*>/).map(value => decode(value).replace(/\s+/g, ' ').trim()).filter(Boolean);

const EN = [
  '## The medina at dawn', '', 'Walk early. **Bold words**, *italic words* and [a safe link](https://example.com/guide) in one paragraph.',
  'Second line of the same paragraph.', '', '### Where to start', '', '- Bab Boujloud', '- The tanneries', '- *Al-Qarawiyyin*', '',
  '1. Arrive before eight', '2. Hire a guide', '', '> The medina is a book that is read slowly.', '',
  `![The tanneries at work](media:${UPLOAD} "Chouara tannery")`, '', '[Book a tour](/our-fez-tours) or [write to us](mailto:hello@example.com) or [call](tel:+212600000000).',
].join('\n');
const FR = ['## Le matin dans la médina', '', 'Un seul paragraphe avec du **gras** et un lien [sûr](https://example.com/fr).', '', '- Un', '- Deux', '', '> « Citation »'].join('\n');
const ES = ['### Subtítulo sin título', '', '1. Primero', '2. Segundo', '', `![Foto](media:${UPLOAD})`, '', 'Párrafo con *cursiva* y **negrita** y ¡acentos!'].join('\n');

test('block syntax: headings, paragraphs, lists, quotes, photos (EN)', () => {
  const parsed = parseArticle(EN);
  assert.equal(parsed.formatted, true);
  assert.deepEqual(kinds(EN), ['heading2', 'paragraph', 'heading3', 'list', 'list#', 'quote', 'image', 'paragraph']);
  const [h2, p, h3, bullets, numbers, quote, image] = parsed.blocks;
  assert.equal(spansText(h2.spans), 'The medina at dawn');
  assert.equal(spansText(h3.spans), 'Where to start');
  assert.equal(bullets.items.length, 3);
  assert.equal(numbers.items.length, 2);
  assert.equal(spansText(quote.spans), 'The medina is a book that is read slowly.');
  assert.deepEqual(image, { type: 'image', mediaId: UPLOAD, alt: 'The tanneries at work', caption: 'Chouara tannery' });
  assert.ok(p.spans.some(span => span.t === 'strong') && p.spans.some(span => span.t === 'em') && p.spans.some(span => span.t === 'link'));
  assert.match(spansText(p.spans), /paragraph\.\nSecond line/);
});
test('French and Spanish use independent structures', () => {
  assert.deepEqual(kinds(FR), ['heading2', 'paragraph', 'list', 'quote']);
  assert.deepEqual(kinds(ES), ['heading3', 'list#', 'image', 'paragraph']);
  assert.equal(parseArticle(ES).blocks[3].spans.map(span => span.t).join(','), 'text,em,text,strong,text');
  assert.equal(spansText(parseArticle(ES).blocks[3].spans), 'Párrafo con cursiva y negrita y ¡acentos!');
});
test('inline rules: nesting, literal markers, escapes, safe link kinds', () => {
  const spans = text => parseArticle(text).blocks[0].spans;
  assert.deepEqual(spans('***both***'), [{ t: 'strong', children: [{ t: 'em', children: [{ t: 'text', text: 'both' }] }] }]);
  assert.equal(parseArticle('2 * 3 * 4 and a ** b ** c').formatted, false, 'spaced markers are literal');
  assert.equal(spansText(spans('**unclosed and *also')), '**unclosed and *also');
  assert.equal(spansText(spans('\\*not italic\\*')), '*not italic*');
  assert.equal(spansText(spans('****')), '****');
  const hrefs = parseArticle('[a](https://x.example/a_(b)) [b](/p) [c](mailto:a@b.co) [d](tel:+21260000000) [e](#top)').blocks[0].spans.filter(s => s.t === 'link').map(s => s.href);
  assert.deepEqual(hrefs, ['https://x.example/a_(b)', '/p', 'mailto:a@b.co', 'tel:+21260000000', '#top']);
  assert.equal(parseArticle('# Not a heading\n#### nor this\n##nospace').blocks.length, 1, 'only ## and ### are headings');
});
test('plain text keeps the original layout; syntax switches the renderer per language', () => {
  const plain = 'First paragraph, with an apostrophe\'s & <b>.\n\nSecond paragraph\nwith a line break.';
  assert.equal(parseArticle(plain).formatted, false);
  assert.equal(article(plain), `<div class="${PLAIN_ARTICLE_CLASS}">${escapeReact(plain)}</div>`);
  assert.equal(article('a **b**', null, 'en', { plain: true }), `<div class="${PLAIN_ARTICLE_CLASS}">a **b**</div>`);
  assert.match(article('a **b**'), /^<div class="article-body"><p>a <strong>b<\/strong><\/p><\/div>$/);
});
test('rendered markup for every element', () => {
  const document = withPhotos(createCmsSeed());
  for (const [language, text] of [['en', EN], ['fr', FR], ['es', ES]]) {
    const html = article(text, document, language);
    assert.ok(html.startsWith('<div class="article-body">'), language);
  }
  const html = article(EN, document, 'en');
  for (const part of ['<h2>The medina at dawn</h2>', '<h3>Where to start</h3>', '<ul><li>Bab Boujloud</li>', '<ol><li>Arrive before eight</li>', '<blockquote>The medina is a book that is read slowly.</blockquote>',
    '<strong>Bold words</strong>', '<em>italic words</em>', '<a href="https://example.com/guide" rel="noopener noreferrer" target="_blank">a safe link</a>', '<a href="/our-fez-tours">Book a tour</a>',
    '<a href="mailto:hello@example.com">write to us</a>', '<a href="tel:+212600000000">call</a>',
    `<img src="/media/${UPLOAD}.jpg" alt="The tanneries at work" width="800" height="600" loading="lazy" decoding="async" referrerPolicy="no-referrer"`, '<figcaption>Chouara tannery</figcaption>'])
    assert.ok(html.includes(part), part);
  // description is the alt; the library alt is only the fallback; the optimized srcset is used for build-time derivatives
  assert.match(article(ES, document, 'es'), /alt="Foto"/);
  assert.match(article(`![](media:${UPLOAD})`, document, 'fr'), /alt="Alt bibliothèque"/);
  const seeded = createCmsSeed().media.find(media => media.src.startsWith('/images/real/'));
  const optimized = article(`![x](media:${seeded.id})`, createCmsSeed(), 'en');
  assert.match(optimized, /srcSet="[^"]*\.webp \d+w/);
});
test('unknown or unusable photos render nothing', () => {
  const document = withPhotos(createCmsSeed());
  assert.equal(article('![x](media:does-not-exist)', document), '<div class="article-body"></div>');
  assert.equal(article('![x](media:media-1)\n\ntext', null), '<div class="article-body"><p>text</p></div>');
  document.media.push({ id: 'bad-src', src: 'javascript:alert(1)', alt: { en: '', fr: '', es: '' }, source: 'x' });
  assert.equal(article('![x](media:bad-src)', document), '<div class="article-body"></div>');
  assert.equal(parseArticle('![x](https://example.com/a.jpg)').blocks[0].type, 'paragraph', 'only library photos are accepted');
  assert.deepEqual(articleMediaIds(`text\n![a](media:one)\n![b](media:two "c")\n![c](media:one)\ninline ![d](media:three) here`), ['one', 'two']);
  assert.deepEqual(articleMediaIds('no photos'), []);
});

test('security: markup, scripts and unsafe links are text; nothing executes', () => {
  const hostile = [
    '<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '**<b onmouseover=alert(1)>x</b>**', '[x](javascript:alert(1))', '[x]( javascript:alert(1))', '[x](JaVaScRiPt:alert(1))',
    '[x](data:text/html;base64,PHNjcmlwdD4=)', '[x](//evil.example/x)', '[x](http://insecure.example)', '[x](vbscript:msgbox(1))', '[x](/a/../b)', '[x](https://u:p@evil.example)',
    '> <iframe src=//evil></iframe>', '- <svg onload=alert(1)>', '## <style>*{display:none}</style>', '![<script>](media:media-1 "<script>")', 'onerror=alert(1)',
    '[**[x](https://a.example)**](https://b.example)', '"><script>alert(1)</script>', '[x](https://ok.example"onclick="alert(1))',
  ];
  const document = createCmsSeed();
  const html = article(hostile.join('\n\n'), document);
  assert.ok(!/<(script|iframe|style|svg|b |img src=x)/i.test(html), html);
  assert.ok(!/href="(javascript|data|vbscript|http:|\/\/)/i.test(html), html);
  assert.ok(!/<[a-z][^>]*\son[a-z]+\s*=/i.test(html), 'no live event attribute');
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!/href="[^"]*(a\/\.\.\/b|evil\.example)/.test(html));
  const hrefs = [...html.matchAll(/ href="([^"]*)"/g)].map(match => match[1]);
  for (const href of hrefs) assert.ok(/^(https:\/\/|\/[^/]|mailto:|tel:|#)/.test(href), href);
  assert.equal(/dangerouslySetInnerHTML/.test(readFileSync(new URL('../src/cms/ArticleBody.tsx', import.meta.url), 'utf8')), false);
  assert.equal(/dangerouslySetInnerHTML|innerHTML/.test(readFileSync(new URL('../src/cms/article-format.ts', import.meta.url), 'utf8')), false);
  // the same hostile text through the server snapshot
  const post = document.blogPosts[0];
  post.content.en = hostile.join('\n\n');
  const snapshot = buildSnapshot(document, document.pages.find(page => page.id === post.id), 'en');
  assert.ok(!/<(script|iframe|style|svg|b |img src=x)/i.test(snapshot.replace(/<style[\s\S]*?<\/style>/g, '')), 'snapshot has no injected elements');
  for (const [, href] of snapshot.matchAll(/ href="([^"]*)"/g)) assert.ok(!/^(javascript|data|vbscript|http:|\/\/)/i.test(href), href);
});
test('security: nested and unbalanced markers, deep nesting, huge inputs stay linear and bounded', () => {
  const run = (text, limit = 400) => { const start = performance.now(); const result = parseArticle(text); const ms = performance.now() - start; assert.ok(ms < limit, `${ms.toFixed(0)}ms for ${text.slice(0, 20)}…`); return result; };
  run('*'.repeat(100_000)); run('**a '.repeat(25_000)); run('[a'.repeat(50_000)); run('['.repeat(100_000) + '](' + 'x'.repeat(3000));
  run('[a](' + 'x'.repeat(100_000)); run('[a](https://a.example/'.repeat(5_000)); run('*a **b *c **d '.repeat(10_000)); run('- x\n'.repeat(50_000)); run('> '.repeat(50_000));
  run('\n'.repeat(100_000)); run('![x](media:a)\n'.repeat(50_000)); run('# '.repeat(50_000)); run('1. a\n'.repeat(50_000)); run('\\*'.repeat(50_000));
  run('[' .repeat(2000) + 'a' + '](https://x.example)'.repeat(2000));
  const nested = run('*a '.repeat(3000) + '*'.repeat(3000));
  const depth = node => 'children' in node ? 1 + Math.max(0, ...node.children.map(depth)) : 0;
  for (const block of nested.blocks) if (block.spans) for (const span of block.spans) assert.ok(depth(span) <= ARTICLE_LIMITS.inlineDepth + 1);
  assert.ok(run('word\n\n'.repeat(100_000)).blocks.length <= ARTICLE_LIMITS.blocks);
  assert.ok(run('- x\n'.repeat(50_000)).blocks[0].items.length <= ARTICLE_LIMITS.listItems);
  assert.ok(articleMediaIds('![a](media:b)\n'.repeat(500_000)).length === 1);
  // nothing throws and everything renders
  const html = article('**a *b** c* [d **e](https://x.example) f**\n\n' + '*'.repeat(5000));
  assert.ok(html.length > 0);
});
test('inputs of any type are safe', () => {
  for (const value of [undefined, null, 5, {}, [], '']) assert.deepEqual(parseArticle(value), { blocks: [], formatted: false });
});

test('syntax help exists in all three languages and covers every element', () => {
  for (const language of LANGS) {
    const help = ARTICLE_SYNTAX[language];
    for (const token of ['##', '###', '- ', '1. ', '> ', '**', '[', '](', '![', 'media:']) assert.ok(help.includes(token), `${language} ${token}`);
  }
  assert.notEqual(ARTICLE_SYNTAX.fr, ARTICLE_SYNTAX.en);
  assert.notEqual(ARTICLE_SYNTAX.es, ARTICLE_SYNTAX.en);
  assert.deepEqual(ARTICLE_SYNTAX_ITEMS.map(item => item.id), ['heading', 'subheading', 'bullets', 'numbers', 'quote', 'bold', 'italic', 'link', 'photo']);
  for (const item of ARTICLE_SYNTAX_ITEMS) for (const language of LANGS) assert.ok(item.label[language]);
});

test('existing seed posts: reader markup is exactly the original plain layout in every language', () => {
  const document = createCmsSeed();
  assert.ok(document.blogPosts.length >= 3);
  for (const post of document.blogPosts) for (const language of LANGS) {
    const page = document.pages.find(page => page.id === post.id);
    const content = page.sections.find(section => section.id === 'content');
    const expected = content.blocks.map(block => block.text[language]).join('\n\n');
    assert.equal(parseArticle(post.content[language]).formatted, false, `${post.id}/${language} plain`);
    assert.equal(articleOverride(post, content, language), undefined);
    const html = readerHtml(document, post.id, language);
    assert.ok(html.includes(`<div class="${PLAIN_ARTICLE_CLASS}">${escapeReact(expected)}</div>`), `${post.id}/${language}`);
    assert.ok(!html.includes('article-body'));
    assert.ok(buildSnapshot(document, page, language).includes('<section>'), 'snapshot unchanged shape');
    assert.ok(!buildSnapshot(document, page, language).includes('ssr-article'));
  }
});
test('existing live posts render as plain text too (set CMS_LIVE_DOC to a {version, document} file)', { skip: !process.env.CMS_LIVE_DOC || !existsSync(process.env.CMS_LIVE_DOC) }, () => {
  const document = JSON.parse(readFileSync(process.env.CMS_LIVE_DOC, 'utf8')).document;
  for (const post of document.blogPosts) for (const language of LANGS) {
    const content = document.pages.find(page => page.id === post.id).sections.find(section => section.id === 'content');
    assert.equal(articleOverride(post, content, language), undefined, `${post.id}/${language}`);
    const expected = content.blocks.map(block => block.text[language]).join('\n\n');
    assert.ok(readerHtml(document, post.id, language).includes(`<div class="${PLAIN_ARTICLE_CLASS}">${escapeReact(expected)}</div>`), `${post.id}/${language}`);
  }
});

function formattedDocument() {
  const document = withPhotos(createCmsSeed());
  const post = document.blogPosts[0];
  post.content = { en: EN, fr: FR, es: ES };
  return { document, post, page: document.pages.find(page => page.id === post.id) };
}
test('formatted post: reader dialog and post page render each language from its own text', () => {
  const { document, post } = formattedDocument();
  const expected = { en: ['<h2>The medina at dawn</h2>', '<ol>', '<blockquote>', '<figure'], fr: ['<h2>Le matin dans la médina</h2>', '<ul><li>Un</li>', '<blockquote>'], es: ['<h3>Subtítulo sin título</h3>', '<ol>', 'alt="Foto"'] };
  for (const language of LANGS) {
    const html = readerHtml(document, post.id, language);
    for (const part of expected[language]) assert.ok(html.includes(part), `${language} ${part}`);
    assert.ok(html.includes('class="article-body"'));
  }
  assert.ok(!readerHtml(document, post.id, 'fr').includes('<figure'), 'FR has no photo');
  assert.ok(!readerHtml(document, post.id, 'en').includes('<h3>Subtítulo'), 'ES heading is not in EN');
});
test('formatted post: a page without its content section enabled shows no article; custom blocks keep the page layout', () => {
  const { document, post, page } = formattedDocument();
  const content = page.sections.find(section => section.id === 'content');
  content.blocks.push({ type: 'quote', text: { en: 'Owner custom quote', fr: 'x', es: 'x' } });
  assert.ok(readerHtml(document, post.id, 'en').includes('Owner custom quote'));
  assert.ok(!readerHtml(document, post.id, 'en').includes('article-body'));
  content.blocks.pop(); content.enabled = false;
  assert.ok(!readerHtml(document, post.id, 'en').includes('article-body'));
  assert.ok(!buildSnapshot(document, page, 'en').includes('ssr-article'));
});
test('server snapshot of a formatted post: escaped elements, safe links, optimized photo, per language', () => {
  const { document, post, page } = formattedDocument();
  const en = buildSnapshot(document, page, 'en');
  for (const part of ['<div class="ssr-article">', '<h2>The medina at dawn</h2>', '<h3>Where to start</h3>', '<ul><li>Bab Boujloud</li><li>The tanneries</li><li><em>Al-Qarawiyyin</em></li></ul>', '<ol><li>Arrive before eight</li><li>Hire a guide</li></ol>',
    '<blockquote>The medina is a book that is read slowly.</blockquote>', '<strong>Bold words</strong>', '<a href="https://example.com/guide" rel="noopener noreferrer" target="_blank">a safe link</a>', '<a href="/our-fez-tours">Book a tour</a>',
    `<img src="/media/${UPLOAD}.jpg"`, 'alt="The tanneries at work"', 'loading="lazy"', '<figcaption>Chouara tannery</figcaption>']) assert.ok(en.includes(part), part);
  const fr = buildSnapshot(document, page, 'fr'), es = buildSnapshot(document, page, 'es');
  assert.ok(fr.includes('<h2>Le matin dans la médina</h2>') && !fr.includes('<figure') && !fr.includes('The medina at dawn'));
  assert.ok(es.includes('<h3>Subtítulo sin título</h3>') && es.includes('<ol><li>Primero</li>') && es.includes('alt="Foto"'));
  post.content.en = '<script>alert(1)</script> **x** [bad](javascript:alert(1))';
  const hostile = buildSnapshot(document, page, 'en');
  assert.ok(hostile.includes('&lt;script&gt;alert(1)&lt;/script&gt; <strong>x</strong> bad'));
  assert.ok(!hostile.includes('javascript:'));
});
test('fidelity: every server text node of a formatted post page appears in the rendered page, all languages', () => {
  const { document, page } = formattedDocument();
  for (const language of LANGS) {
    const snapshot = buildSnapshot(document, page, language);
    const visible = ` ${textNodes(clientHtml(document, page.id, language)).join(' ')} `;
    assert.deepEqual(textNodes(snapshot).filter(node => !visible.includes(node)), [], language);
    const links = new Set([...clientHtml(document, page.id, language).matchAll(/ href="([^"]*)"/g)].map(match => decode(match[1])));
    for (const [, href] of snapshot.matchAll(/ href="([^"]*)"/g)) if (!/^\/(fr\/|es\/)?[a-z-]*$/.test(decode(href)) || links.size) assert.ok(links.has(decode(href)) || /^\/(fr\/|es\/)?[a-z0-9-]*$/.test(decode(href)), href);
  }
});

test('photos used only inside article text are public once published and retained', () => {
  const { document, post } = formattedDocument();
  const src = `/media/${UPLOAD}.jpg`;
  assert.equal(publishedMediaReferenced(document, src), true);
  assert.deepEqual([...retainedUploadKeys([document])], [`${UPLOAD}.jpg`]);
  document.blogPosts[0].content = { en: 'plain', fr: 'plain', es: `![x](media:${UPLOAD})` };
  assert.equal(publishedMediaReferenced(document, src), true, 'any language counts');
  document.blogPosts[0].content.es = 'plain';
  assert.equal(publishedMediaReferenced(document, src), false, 'a library row alone stays private');
  document.blogPosts[0].content.en = `inline ![x](media:${UPLOAD}) is not a photo line`;
  assert.equal(publishedMediaReferenced(document, src), false);
  document.blogPosts[0].content.en = `![x](media:${UPLOAD})`;
  post.published = false;
  assert.equal(publishedMediaReferenced(document, src), false, 'hidden post');
  post.published = true;
  document.pages.find(page => page.id === post.id).enabled = false;
  assert.equal(publishedMediaReferenced(document, src), false, 'disabled page');
});
test('public document keeps article photo rows for visible posts and drops them for hidden ones', () => {
  const { document, post } = formattedDocument();
  const ids = value => publicCmsDocument(value).media.map(media => media.id);
  assert.ok(ids(document).includes(UPLOAD));
  document.pages.find(page => page.id === post.id).enabled = false;
  post.published = false;
  assert.ok(!ids(document).includes(UPLOAD), 'only a hidden post uses it');
});

test('snapshot build for a long formatted article stays within the Workers Free budget', () => {
  const { document, post, page } = formattedDocument();
  const chunk = EN + '\n\n';
  post.content.en = chunk.repeat(60).slice(0, 19_900);
  buildSnapshot(document, page, 'en');
  const runs = 40; const start = performance.now();
  for (let i = 0; i < runs; i++) buildSnapshot(document, page, 'en');
  const each = (performance.now() - start) / runs;
  console.log(`snapshot(long article, ${post.content.en.length} chars): ${each.toFixed(2)} ms`);
  assert.ok(each < 10, `${each} ms`);
  const parseStart = performance.now(); for (let i = 0; i < runs; i++) parseArticle(post.content.en);
  console.log(`parseArticle(${post.content.en.length} chars): ${((performance.now() - parseStart) / runs).toFixed(2)} ms`);
});
