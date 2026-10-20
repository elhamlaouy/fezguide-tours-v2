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

test('Tripadvisor interface copy is localized without translating attributed reviews', async () => {
  const { register } = await import('tsx/esm/api'); register();
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { TripadvisorReviewsSection } = await import('../src/components/TripadvisorReviewsSection.tsx');
  const { ApprovedContentProvider } = await import('../src/cms/approved-content.tsx');
  const { createCmsSeed } = await import('../src/cms/seed.ts');
  const document = createCmsSeed(), page = document.pages.find(page => page.id === 'home');
  for (const language of ['en', 'fr', 'es']) for (const cms of [false, true]) {
    const element = createElement(TripadvisorReviewsSection, { language });
    const html = renderToStaticMarkup(cms ? createElement(ApprovedContentProvider, { document, page, language }, element) : element);
    const label = language === 'es' ? 'Leer las 82 opiniones en Tripadvisor' : language === 'fr' ? 'Lire les 82 avis sur Tripadvisor' : 'Read all 82 reviews on Tripadvisor';
    assert.ok(html.includes(label), `${language}/${cms}: localized review link`);
    if (language === 'es') {
      assert.ok(html.includes('Opiniones verificadas publicadas en la página oficial de Fez Guide Tours en Tripadvisor.'));
      assert.ok(!html.includes('Verified reviews published on the official'));
      assert.ok(!html.includes('Real stories from travelers in Fez'));
      assert.ok(html.includes('aria-label="5 de 5 burbujas"'));
    }
    assert.ok(html.includes('Mathilde H'), 'attributed reviewer identity is preserved');
    assert.ok(html.includes('A very professional guide'), 'original attributed review remains verbatim');
  }
});
