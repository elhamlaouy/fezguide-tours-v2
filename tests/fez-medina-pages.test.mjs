import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('Explore the Medina is a Google Doc article without the old product sections', () => {
  const article = read('src/pages/MedinaArticlePage.tsx');
  const app = read('src/App.tsx');

  assert.match(app, /fez-explore-medina[\s\S]*MedinaArticlePage/);
  for (const paragraph of [
    'Before exploring the Medina, it helps to understand Fez itself.',
    'The Medina is famous for its historic gates, narrow streets, traditional souks and maze-like passages.',
    'Exploring the Medina is also about tasting it.',
    'Exploring Fez does not have to end when you leave the Medina.',
  ]) assert.ok(article.includes(paragraph), `missing supplied paragraph: ${paragraph}`);

  for (const removed of [
    'Step-by-Step Experience & Stops',
    'What is Included & Excluded',
    'Practical Tips & What to Bring',
    '100% Private Tour',
    '5.0 (120+ reviews)',
    'All-Inclusive Rate',
  ]) assert.ok(!article.includes(removed), `old product content remains: ${removed}`);

  assert.match(article, /TripadvisorReviewsSection/);
  assert.match(article, /Explore Our Fez Tours/);
  assert.match(article, /loading=\{index === 0 \? 'eager' : 'lazy'\}/);
  assert.match(article, /index === 7 \? 'max-w-\[800px\] mx-auto'/);
});

test('all supplied Google Doc images are local and the first image is the Medina card thumbnail', () => {
  const translations = read('src/data/translations.ts');
  assert.match(translations, /id: 'fez-explore-medina'[\s\S]*image: '\/images\/fez-medina\/medina-01\.jpg'/);
  for (let index = 1; index <= 14; index += 1) {
    const file = `public/images/fez-medina/medina-${String(index).padStart(2, '0')}.jpg`;
    assert.ok(existsSync(resolve(root, file)), `missing supplied image: ${file}`);
  }
});

test('Our Fez Tours is a fourth Fez card and a €170 per-person product page', () => {
  const translations = read('src/data/translations.ts');
  const fezPage = read('src/pages/FezPage.tsx');
  const product = read('src/pages/OurFezToursPage.tsx');
  const app = read('src/App.tsx');
  const context = read('src/context/CmsContext.tsx');

  assert.match(translations, /id: 'our-fez-tours'/);
  assert.match(translations, /priceEUR: 170/);
  assert.match(translations, /priceMAD: 1900/);
  assert.match(translations, /priceUSD: 191/);
  assert.match(fezPage, /xl:grid-cols-4/);
  assert.match(app, /our-fez-tours[\s\S]*OurFezToursPage/);
  assert.ok(product.includes('€170'));
  assert.ok(product.includes('per person'));
  assert.ok(product.includes('≈ 1,900 MAD'));
  assert.ok(product.includes('≈ $191'));
  assert.match(context, /PROTECTED_FEZ_TOUR_IDS/);
});

test('the Medina article card does not expose a product quick-book action', () => {
  const card = read('src/components/SectionCard.tsx');
  assert.match(card, /pillar\.id === 'fez-explore-medina'[\s\S]*grid-cols-1/);
});

test('the homepage and Medina article reuse one authentic Tripadvisor section', () => {
  const home = read('src/pages/HomePage.tsx');
  const article = read('src/pages/MedinaArticlePage.tsx');
  const section = read('src/components/TripadvisorReviewsSection.tsx');

  assert.match(home, /<TripadvisorReviewsSection/);
  assert.match(article, /<TripadvisorReviewsSection/);
  for (const reviewer of ['Mathilde H', 'Andi', 'Roam14564840921', 'mike', 'Pamela B', 'Tara U']) {
    assert.ok(section.includes(reviewer), `missing authentic reviewer: ${reviewer}`);
  }
});

test('the Fez tour pages fit narrow 320px mobile screens without horizontal page overflow', () => {
  const navbar = read('src/components/Navbar.tsx');
  const logo = read('src/components/Logo.tsx');

  assert.ok(navbar.includes('max-[360px]:px-3'));
  assert.ok(navbar.includes('max-[360px]:gap-2'));
  assert.ok(logo.includes('max-[360px]:text-lg'));
  assert.ok(logo.includes('max-[360px]:w-[34px]'));
});

test('History, Culture & Landmarks uses the supplied Google Doc story and local images', () => {
  const article = read('src/pages/HistoryCultureArticlePage.tsx');
  const translations = read('src/data/translations.ts');
  const generator = read('scripts/generate_translations.py');
  const context = read('src/context/CmsContext.tsx');
  const card = read('src/components/SectionCard.tsx');
  const app = read('src/App.tsx');

  assert.ok(app.includes("selectedExperience.id === 'fez-history-landmarks'") && app.includes('<HistoryCultureArticlePage'));
  const translationBlock = translations.slice(translations.indexOf("id: 'fez-history-landmarks'"), translations.indexOf("id: 'fez-things-to-do'"));
  const generatorBlock = generator.slice(generator.indexOf("id: 'fez-history-landmarks'"), generator.indexOf("id: 'fez-things-to-do'"));
  assert.ok(translationBlock.includes("image: '/images/fez-history/history-01.jpg'"));
  assert.ok(generatorBlock.includes("image: '/images/fez-history/history-01.jpg'"));
  assert.ok(translationBlock.includes("actionType: 'explore'"));
  assert.ok(!translationBlock.includes('priceMAD: 500'));
  assert.ok(card.includes("pillar.id === 'fez-history-landmarks'"));
  assert.ok(card.includes('!isArticle'));
  assert.match(context, /'fez-history-landmarks'/);
  for (const phrase of [
    'history is still part of everyday life',
    'Fez was founded in the 9th century',
    'The Mellah and Fes Jdid preserve an important part of the city’s Jewish heritage',
    'Bab Boujloud, known as the Blue Gate',
    'The Chouara Tanneries show another side of the city’s traditional craftsmanship',
    'Fez is not a city where history is only found in museums',
  ]) assert.ok(article.toLowerCase().includes(phrase.toLowerCase()), `missing supplied story text: ${phrase}`);
  assert.ok(!article.includes('[Place a photo of Al-Attarine Madrasa]'));
  assert.match(article, /TripadvisorReviewsSection/);
  assert.match(article, /Explore Our Fez Tours/);
  for (let index = 1; index <= 14; index += 1) {
    const file = `public/images/fez-history/history-${String(index).padStart(2, '0')}.jpg`;
    assert.ok(existsSync(resolve(root, file)), `missing supplied image: ${file}`);
  }
});

test('Things to Do in Fez uses the supplied Google Doc as an editorial guide', () => {
  const article = read('src/pages/ThingsToDoArticlePage.tsx');
  const translations = read('src/data/translations.ts');
  const generator = read('scripts/generate_translations.py');
  const context = read('src/context/CmsContext.tsx');
  const card = read('src/components/SectionCard.tsx');
  const app = read('src/App.tsx');
  const translationStart = translations.indexOf("id: 'fez-things-to-do'");
  const generatorStart = generator.indexOf("id: 'fez-things-to-do'");
  const translationBlock = translations.slice(translationStart, translations.indexOf("id: 'our-fez-tours'", translationStart));
  const generatorBlock = generator.slice(generatorStart, generator.indexOf("id: 'our-fez-tours'", generatorStart));

  assert.ok(app.includes("selectedExperience.id === 'fez-things-to-do'") && app.includes('<ThingsToDoArticlePage'));
  assert.ok(translationBlock.includes("image: '/images/fez-things-to-do/things-01.jpg'"));
  assert.ok(generatorBlock.includes("image: '/images/fez-things-to-do/things-01.jpg'"));
  assert.ok(translationBlock.includes("actionType: 'explore'"));
  assert.ok(!translationBlock.includes('priceMAD: 400'));
  assert.ok(card.includes("pillar.id === 'fez-things-to-do'"));
  assert.match(context, /'fez-things-to-do'/);
  for (const paragraph of [
    'There is much more to do in Fez than simply visiting its famous monuments.',
    'Start by exploring the Old Medina of Fez.',
    'Discover the traditional crafts of Fez by visiting local workshops',
    'Take time to explore the local souks and markets.',
    'Food is another important part of experiencing Fez.',
    'Take a moment to discover the historic Mellah and Fes Jdid.',
    'For a different perspective, look for one of the panoramic viewpoints around Fez.',
    'And when the day comes to an end, discover Fez at night.',
    'Whether you have one day or several days in Fez, the best way to experience the city',
  ]) assert.ok(article.includes(paragraph), `missing supplied paragraph: ${paragraph}`);
  for (const removed of ['Step-by-Step Experience & Stops', 'What is Included & Excluded', 'Practical Tips & What to Bring', '100% Private Tour', 'All-Inclusive Rate', '400 MAD', '120+ reviews']) {
    assert.ok(!article.includes(removed), `old product content remains: ${removed}`);
  }
  for (let index = 1; index <= 8; index += 1) {
    const file = `public/images/fez-things-to-do/things-${String(index).padStart(2, '0')}.jpg`;
    assert.ok(existsSync(resolve(root, file)), `missing supplied image: ${file}`);
  }
});
