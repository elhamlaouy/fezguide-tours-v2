import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const pages = [
  'src/pages/MedinaArticlePage.tsx',
  'src/pages/HistoryCultureArticlePage.tsx',
  'src/pages/ThingsToDoArticlePage.tsx',
];

test('the three guide pages share an editorial reading treatment without styling the CTA or reviews', () => {
  const css = read('src/index.css');

  assert.match(css, /\.editorial-story-page\s*>\s*header/);
  assert.match(css, /\.editorial-story-page\s+\.editorial-story-copy/);
  assert.match(css, /@media \(max-width: 640px\) \{[\s\S]*font-size: clamp\(2\.1rem, 9\.5vw, 3\.5rem\)/);
  assert.doesNotMatch(css, /\.editorial-story-page\s+\.tripadvisor|\.editorial-story-page\s+\.fez-tours-cta/);

  for (const path of pages) {
    const article = read(path);
    assert.match(article, /<article className="editorial-story-page\s/);
    assert.match(article, /editorial-story-copy/);
    assert.match(article, /<FezToursCtaSection/);
    assert.match(article, /<TripadvisorReviewsSection/);
    assert.ok(article.indexOf('<FezToursCtaSection') < article.indexOf('<TripadvisorReviewsSection'));
  }
});
