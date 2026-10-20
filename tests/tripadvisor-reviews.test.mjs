import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const home = readFileSync(resolve(root, 'src/pages/HomePage.tsx'), 'utf8');
const reviews = readFileSync(resolve(root, 'src/components/TripadvisorReviewsSection.tsx'), 'utf8');
const css = readFileSync(resolve(root, 'src/index.css'), 'utf8');
const translations = readFileSync(resolve(root, 'src/data/shared-ui.ts'), 'utf8');

const listing = 'https://www.tripadvisor.com/Attraction_Review-g293733-d33349838-Reviews-Fez_Guide_Tours-Fez_Fez_Meknes.html';

test('homepage uses real reviews from the official Fez Guide Tours Tripadvisor listing', () => {
  assert.match(home, /<TripadvisorReviewsSection/);
  assert.ok(reviews.includes(listing));
  assert.ok(translations.includes(listing));
  for (const reviewer of ['Mathilde H', 'Andi', 'Roam14564840921', 'mike', 'Pamela B', 'Tara U']) {
    assert.ok(reviews.includes(reviewer), `missing verified reviewer: ${reviewer}`);
  }
  for (const inventedReviewer of ['David & Clara Miller', 'Marie-Laure Dupont']) {
    assert.ok(!reviews.includes(inventedReviewer), `invented reviewer remains: ${inventedReviewer}`);
  }
  assert.match(home, /5\.0 on Tripadvisor \(82 reviews\)/);
});

test('Tripadvisor cards form an accessible looping marquee', () => {
  assert.match(reviews, /id="tripadvisor-reviews"/);
  assert.match(reviews, /tripadvisor-marquee/);
  assert.match(reviews, /tripadvisor-track/);
  assert.match(reviews, /\[reviews, reviews\]/);
  assert.match(reviews, /aria-hidden=\{duplicate\}/);
  assert.match(css, /#tripadvisor-reviews\s*\{[^}]*scroll-margin-top:/s);
  assert.match(css, /@keyframes tripadvisor-scroll/);
  assert.match(css, /\.tripadvisor-marquee:hover \.tripadvisor-track/);
  assert.match(css, /\.tripadvisor-marquee:focus-within \.tripadvisor-track/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /overflow-x:\s*auto/);
});
