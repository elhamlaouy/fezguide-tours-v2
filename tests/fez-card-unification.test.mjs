import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const translations = read('src/data/translations.ts');
const card = read('src/components/SectionCard.tsx');
const cardIds = [
  'fez-explore-medina',
  'fez-history-landmarks',
  'fez-things-to-do',
  'our-fez-tours',
];

function pillarBlock(id) {
  const start = translations.indexOf(`id: '${id}'`);
  assert.notEqual(start, -1, `missing Fez card data: ${id}`);
  const next = translations.indexOf('\n  {', start + 1);
  return translations.slice(start, next === -1 ? undefined : next);
}

function localeRecord(block, field) {
  const match = block.match(new RegExp(`${field}:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`));
  assert.ok(match, `missing ${field} record`);
  return Object.fromEntries(['en', 'fr', 'es'].map((language) => {
    const localized = match[1].match(new RegExp(`${language}:\\s*'([^']*)'`));
    assert.ok(localized, `missing ${language} ${field}`);
    return [language, localized[1]];
  }));
}

function localizedHighlights(block) {
  const match = block.match(/highlights:\s*\{([\s\S]*?)\n\s*image:/);
  assert.ok(match, 'missing localized highlights');
  return Object.fromEntries(['en', 'fr', 'es'].map((language) => {
    const localized = match[1].match(new RegExp(`${language}:\\s*\\[([^\\]]*)\\]`));
    assert.ok(localized, `missing ${language} highlights`);
    return [language, [...localized[1].matchAll(/'([^']*)'/g)].map((item) => item[1])];
  }));
}

test('the four Fez guide and tour cards use concise, distinct localized summaries and two highlights', () => {
  for (const id of cardIds) {
    const block = pillarBlock(id);
    const titles = localeRecord(block, 'title');
    const subtitles = localeRecord(block, 'subtitle');
    const summaries = localeRecord(block, 'shortDescription');
    const highlights = localizedHighlights(block);

    assert.doesNotMatch(titles.es, /\p{Script=Arabic}/u, `${id} should have a Spanish title`);
    assert.notEqual(titles.es, titles.en, `${id} has genuine Spanish copy`);
    for (const language of ['en', 'fr', 'es']) {
      assert.ok(subtitles[language].length > 0 && subtitles[language].length <= 32, `${id} ${language} label should stay concise`);
      assert.ok(summaries[language].length >= 45 && summaries[language].length <= 130, `${id} ${language} summary should be concise but useful`);
      assert.ok(!summaries[language].includes('…') && !summaries[language].includes('...'), `${id} ${language} summary should not show truncation`);
      assert.equal(highlights[language].length, 2, `${id} ${language} card should show exactly two highlights`);
      assert.ok(highlights[language].every((item) => item.length > 0 && item.length <= 52), `${id} ${language} highlights should be readable without ellipses`);
    }
  }
});

test('the Fez cards share guide wording while keeping the tour action distinct', () => {
  assert.match(card, /Read the Guide/);
  assert.match(card, /View Tour Details/);
  assert.match(card, /fez-overview-card/);
  assert.match(card, /fez-overview-card-highlights/);
});

test('unifying the cards does not replace their original photos', () => {
  const expectedImages = [
    "image: '/images/fez-medina/medina-01.jpg'",
    "image: '/images/fez-history/history-01.jpg'",
    "image: '/images/fez-things-to-do/things-01.jpg'",
    "image: '/images/fez-medina/medina-14.jpg'",
  ];
  for (const image of expectedImages) assert.ok(translations.includes(image), `original card image must remain: ${image}`);
});
