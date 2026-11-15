import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'tsx/esm/api';
register();
const edit = await import('../src/admin/article-edit.ts');
const { parseArticle, articleMediaIds, ARTICLE_SYNTAX_ITEMS } = await import('../src/cms/article-format.ts');
const { blogCopy } = await import('../src/admin/blog-copy.ts');
const { nestedItemLabel } = await import('../src/admin/editor-names.ts');
const { createCmsSeed } = await import('../src/cms/seed.ts');

const sel = (text, a, b) => ({ text, a, b });

test('heading, subheading, quote and lists apply to the cursor line or every selected line, keep the cursor and toggle off', () => {
  const text = 'First line\nSecond line\n\nThird';
  for (const [format, prefix] of [['heading', '## '], ['subheading', '### '], ['bullets', '- '], ['quote', '> ']]) {
    // cursor in the middle of "Second": the same letter stays under the cursor
    const caret = text.indexOf('Second') + 3;
    const one = edit.applyArticleLineFormat(text, caret, caret, format);
    assert.equal(one.text, `First line\n${prefix}Second line\n\nThird`, format);
    assert.equal(one.start, caret + prefix.length); assert.equal(one.end, one.start);
    // toggling again removes it and returns to the same position
    const undone = edit.applyArticleLineFormat(one.text, one.start, one.end, format);
    assert.equal(undone.text, text); assert.equal(undone.start, caret);
    // a selection over two lines formats both (blank lines untouched) and stays selected
    const many = edit.applyArticleLineFormat(text, 2, text.indexOf('Third') + 2, format);
    assert.equal(many.text, `${prefix}First line\n${prefix}Second line\n\n${prefix}Third`, format);
    assert.equal(many.text.slice(many.start, many.end), many.text);
  }
  const numbered = edit.applyArticleLineFormat('One\nTwo\n\nThree', 0, 12, 'numbers');
  assert.equal(numbered.text, '1. One\n2. Two\n\n3. Three');
  // switching between formats replaces the old marker instead of stacking them
  assert.equal(edit.applyArticleLineFormat('## Title', 3, 3, 'subheading').text, '### Title');
  assert.equal(edit.applyArticleLineFormat('- item', 0, 0, 'numbers').text, '1. item');
  // an empty line gets just the marker, cursor after it
  const empty = edit.applyArticleLineFormat('Before\n\nAfter', 7, 7, 'bullets');
  assert.equal(empty.text, 'Before\n- \nAfter'); assert.equal(empty.start, 9);
  // selection that ends right after a line break leaves the next line alone
  assert.equal(edit.applyArticleLineFormat('a\nb', 0, 2, 'heading').text, '## a\nb');
});

test('formatted output is understood by the real article parser', () => {
  let text = 'Intro paragraph';
  text = edit.applyArticleLineFormat('Heading', 0, 0, 'heading').text + '\n\n' + text;
  assert.equal(parseArticle(text).blocks[0].type, 'heading');
  assert.equal(parseArticle(edit.applyArticleLineFormat('A\nB', 0, 3, 'bullets').text).blocks[0].items.length, 2);
  assert.equal(parseArticle(edit.applyArticleLineFormat('A\nB', 0, 3, 'numbers').text).blocks[0].ordered, true);
  assert.equal(parseArticle(edit.applyArticleLineFormat('Wise words', 0, 0, 'quote').text).blocks[0].type, 'quote');
});

test('bold and italic wrap the selection, trim spaces, select a placeholder without one, and unwrap', () => {
  const text = 'Visit the old medina today';
  const a = text.indexOf('old'), b = a + 'old medina'.length;
  const bold = edit.applyArticleInlineFormat(text, a, b, 'bold');
  assert.equal(bold.text, 'Visit the **old medina** today');
  assert.equal(bold.text.slice(bold.start, bold.end), '**old medina**');
  assert.equal(edit.applyArticleInlineFormat(bold.text, bold.start + 2, bold.end - 2, 'bold').text, text, 'selecting the words inside removes the markers');
  assert.equal(edit.applyArticleInlineFormat(bold.text, bold.start, bold.end, 'bold').text, text, 'selecting the markers too removes them');
  const italic = edit.applyArticleInlineFormat(text, a, b, 'italic');
  assert.equal(italic.text, 'Visit the *old medina* today');
  // spaces at the edges stay outside the markers
  assert.equal(edit.applyArticleInlineFormat('x  hello  y', 1, 10, 'bold').text, 'x  **hello**  y');
  // several lines: every line is wrapped on its own
  assert.equal(edit.applyArticleInlineFormat('one\ntwo', 0, 7, 'bold').text, '**one**\n**two**');
  // no selection: a placeholder is inserted and selected, per language
  for (const [language, word] of [['en', 'bold text'], ['fr', 'texte en gras'], ['es', 'texto en negrita']]) {
    const empty = edit.applyArticleInlineFormat('ab', 1, 1, 'bold', language);
    assert.equal(empty.text, `a**${word}**b`);
    assert.equal(empty.text.slice(empty.start, empty.end), word);
  }
  const parsed = parseArticle(bold.text).blocks[0].spans.map(span => span.t);
  assert.deepEqual(parsed, ['text', 'strong', 'text']);
  assert.deepEqual(parseArticle(italic.text).blocks[0].spans.map(span => span.t), ['text', 'em', 'text']);
});

test('link addresses are validated with isSafeCmsUrl, friendly fixes are applied, and the link replaces the selection', () => {
  for (const good of ['https://example.com', 'https://example.com/a?b=1', '/our-fez-tours', 'mailto:hello@example.com', 'tel:+212600000000']) assert.equal(edit.checkArticleLink(good).valid, true, good);
  assert.deepEqual(edit.checkArticleLink('www.example.com/path'), { url: 'https://www.example.com/path', valid: true });
  assert.deepEqual(edit.checkArticleLink('  example.org '), { url: 'https://example.org', valid: true });
  for (const bad of ['', 'javascript:alert(1)', 'http://example.com', 'data:text/html,hi', '//evil.example', 'not a link', 'https://user:pw@example.com', '/../etc']) assert.equal(edit.checkArticleLink(bad).valid, false, bad);
  const done = edit.insertArticleLink('Read the guide now', 9, 14, 'https://example.com', 'guide');
  assert.equal(done.text, 'Read the [guide](https://example.com) now');
  assert.equal(done.start, done.end); assert.equal(done.text.slice(done.start), ' now');
  assert.equal(edit.insertArticleLink('', 0, 0, '/x', 'a ] b [c\nd').text, '[a b c d](/x)', 'brackets and line breaks cannot break the syntax');
  assert.equal(parseArticle(done.text).blocks[0].spans.some(span => span.t === 'link' && span.href === 'https://example.com'), true);
});

test('a photo is inserted alone on its own line with the photo description, and the parser finds it', () => {
  const doc = createCmsSeed();
  const media = doc.media[0];
  const alt = media.alt.en;
  const line = `![${alt.replace(/[[\]]/g, '')}](media:${media.id})`;
  const middle = edit.insertArticlePhoto('First paragraph.\n\nSecond paragraph.', 5, 5, media.id, alt);
  assert.equal(middle.text, `First paragraph.\n\n${line}\n\nSecond paragraph.`);
  assert.equal(middle.text.slice(middle.start - line.length, middle.start), line); assert.equal(middle.start, middle.end);
  assert.equal(edit.insertArticlePhoto('', 0, 0, media.id, alt).text, `${line}\n`);
  assert.equal(edit.insertArticlePhoto('Only paragraph', 14, 14, media.id, alt).text, `Only paragraph\n\n${line}\n`);
  assert.equal(edit.insertArticlePhoto('A\n\n\nB', 2, 2, media.id, alt).text, `A\n\n${line}\n\nB`);
  assert.deepEqual(articleMediaIds(middle.text), [media.id]);
  assert.equal(parseArticle(middle.text).blocks.find(block => block.type === 'image').mediaId, media.id);
  assert.match(edit.insertArticlePhoto('', 0, 0, 'media-1', '').text, /^!\[Photo\]\(media:media-1\)/);
});

test('dates: today as YYYY-MM-DD, old spellings shown in the picker, invalid values rejected', () => {
  assert.equal(edit.todayIso(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.equal(edit.dateInputValue('2025-03-09'), '2025-03-09');
  assert.equal(edit.dateInputValue('2025-03-09T10:00:00Z'), '2025-03-09');
  assert.equal(edit.dateInputValue('March 9, 2025'), '2025-03-09');
  for (const bad of ['', 'soon', '2025-02-30', '2025-13-01', 'Foo 9, 2025']) assert.equal(edit.dateInputValue(bad), '', bad);
  assert.equal(edit.isIsoDate('2025-03-09'), true); assert.equal(edit.isIsoDate('2025-3-9'), false); assert.equal(edit.isIsoDate('2025-02-30'), false);
});

test('the Blog page hero is the default cover for new posts', () => {
  const doc = createCmsSeed();
  const hero = doc.pages.find(page => page.id === 'blog').sections.find(section => section.type === 'hero');
  assert.equal(edit.blogPageCover(doc), doc.media.find(item => item.id === hero.image.mediaId).src);
  const without = structuredClone(doc); without.pages = without.pages.filter(page => page.id !== 'blog');
  assert.equal(edit.blogPageCover(without), undefined);
});

test('toolbar, help, picker, date and cover text exist in English, French and Spanish', () => {
  const keys = Object.keys(blogCopy('en'));
  for (const language of ['en', 'fr', 'es']) {
    const copy = blogCopy(language);
    assert.deepEqual(Object.keys(copy), keys, language);
    for (const key of keys) assert.ok(copy[key].length > 1, `${language}.${key}`);
    for (const item of ARTICLE_SYNTAX_ITEMS) assert.ok(item.label[language], `${language} ${item.id}`);
  }
  assert.notEqual(blogCopy('fr').linkInvalid, blogCopy('en').linkInvalid); assert.notEqual(blogCopy('es').coverChoose, blogCopy('en').coverChoose);
  assert.equal(edit.adminMediaSrc('/media/upload-11111111-1111-4111-8111-111111111111.png'), '/api/admin/media/upload-11111111-1111-4111-8111-111111111111.png');
  assert.equal(edit.adminMediaSrc('/images/a.jpg'), '/images/a.jpg');
});

test('list items inside a tour use meaningful names in EN/FR/ES', () => {
  const doc = createCmsSeed();
  const product = doc.products.find(item => item.itinerary?.length && item.galleryImages?.length) ?? doc.products[0];
  const p = doc.products.indexOf(product);
  assert.equal(nestedItemLabel(`products.${p}.highlights.en.0`, 'x', doc, 'en'), 'Highlight 1');
  assert.equal(nestedItemLabel(`products.${p}.highlights.fr.1`, 'x', doc, 'fr'), 'Atout 2');
  assert.equal(nestedItemLabel(`products.${p}.highlights.es.2`, 'x', doc, 'es'), 'Punto destacado 3');
  if (product.itinerary?.length) assert.ok(nestedItemLabel(`products.${p}.itinerary.0`, product.itinerary[0], doc, 'en').startsWith('Stop 1 — '));
  const media = doc.media.find(item => item.src === product.galleryImages?.[0]);
  if (media) assert.ok(nestedItemLabel(`products.${p}.galleryImages.0`, media.src, doc, 'en').startsWith('Photo 1 — '));
  assert.equal(nestedItemLabel(`products.${p}.galleryImages.3`, '/images/unknown.jpg', doc, 'es'), 'Foto 4');
  assert.equal(nestedItemLabel('pages.home.sections.x.cards.0', {}, doc, 'en'), undefined);
  assert.equal(nestedItemLabel('products.0', {}, doc, 'en'), undefined);
});
