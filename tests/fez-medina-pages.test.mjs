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
  const context = read('src/context/legacy-public-data.ts');

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

test('product pages drop the tag row and list English, Français and Español', () => {
  const product = read('src/pages/OurFezToursPage.tsx');
  const shared = read('src/pages/ExperienceDetailPage.tsx');
  const languages = 'English, Français and Español';

  for (const detail of [
    '3–5 hours',
    'Private Walking Tour',
    'Bab Boujloud, Batha or Rcif',
    'Chouara Tannery',
    '€2 per person',
    '24 hours',
    languages,
    '/images/our-fez-tours/01.webp',
  ]) assert.ok(product.includes(detail), `missing product detail: ${detail}`);
  assert.ok(!product.includes('7:00 AM') && !product.includes('7h00'), 'old 7 AM pickup must not remain');
  for (const page of [product, shared]) {
    assert.ok(page.includes(languages), 'info bar must list English, Français and Español');
    for (const removed of ['100% Private Tour', '5.0 (82 reviews)', '5.0 (120+', 'our-fez-tour-tags', 'English, Français, العربية']) {
      assert.ok(!page.includes(removed), `product tag remains: ${removed}`);
    }
  }
  assert.ok(!product.includes('8:00 AM'), 'old 8 AM pickup must not remain on Our Fez Tours');
  assert.match(product, /Clock/);
  assert.match(product, /MapPin/);
});

test('Our Fez Tours follows the Viator section order', () => {
  const product = read('src/pages/OurFezToursPage.tsx');
  const order = ['title', 'gallery', 'details', 'overview', 'included', 'meeting', 'itinerary', 'booking'];
  const indexes = order.map((name) => product.indexOf(`id="our-fez-tour-${name}"`));
  indexes.forEach((index, i) => assert.ok(index >= 0, `missing ${order[i]} section`));
  for (let i = 1; i < indexes.length; i += 1) {
    assert.ok(indexes[i] > indexes[i - 1], `${order[i]} must follow ${order[i - 1]}`);
  }
});

test('day-trip pages use the Tripadvisor strip and Fez pages keep the shared crumb bar', () => {
  const detail = read('src/pages/ExperienceDetailPage.tsx');
  const fezPages = [
    'src/pages/MedinaArticlePage.tsx',
    'src/pages/HistoryCultureArticlePage.tsx',
    'src/pages/ThingsToDoArticlePage.tsx',
    'src/pages/OurFezToursPage.tsx',
  ].map(read);
  assert.match(detail, /pillar\.pageId !== 'day-trips'/);
  assert.match(detail, /pillar\.pageId === 'day-trips'[\s\S]*TripadvisorReviewsSection/);
  for (const page of fezPages) assert.match(page, /PageCrumbBar/);
  assert.match(read('src/components/PageCrumbBar.tsx'), /Back to list/);
});

test('Chefchaouen uses the Doc story and drops the unrelated gallery photos', () => {
  const details = read('src/data/experienceDetails.ts');
  const translations = read('src/data/translations.ts');
  const start = details.indexOf("'daytrip-chefchaouen'");
  const block = details.slice(start, details.indexOf("'daytrip-meknes'", start));
  assert.match(block, /\/images\/daytrip-chefchaouen\/blue-alley\.webp/);
  assert.ok(!block.includes('about_us_image5.jpg') && !block.includes('about_us_image8.jpg'));
  assert.match(translations, /rushed from one attraction to another/);
  assert.ok(!translations.includes('traditional watermills'));
  assert.ok(!translations.includes('15th-century Kasbah'));
});

test('the custom day trip uses the Doc story and drops the unrelated gallery photo', () => {
  const details = read('src/data/experienceDetails.ts');
  const translations = read('src/data/translations.ts');
  const start = details.indexOf("'daytrip-custom'");
  const block = details.slice(start, details.indexOf('reviews:', start));
  assert.match(block, /\/images\/daytrip-custom\/group-viewpoint\.webp/);
  assert.ok(!block.includes('about_us_image5.jpg') && !block.includes('daytrip_custom_image1.jpg'));
  assert.match(translations, /a day designed around the way you want to discover Morocco/);
  assert.ok(!translations.includes('Sefrou waterfalls'));
});

test('the Meknes day trip uses the Doc story and the five Doc photos', () => {
  const details = read('src/data/experienceDetails.ts');
  const translations = read('src/data/translations.ts');
  const generator = read('scripts/generate_translations.py');
  const start = details.indexOf("'daytrip-meknes'");
  const block = details.slice(start, details.indexOf("'daytrip-ifrane'", start));
  const copyStart = translations.indexOf("id: 'daytrip-meknes'");
  const copy = translations.slice(copyStart, translations.indexOf("id: 'daytrip-ifrane'", copyStart));
  const generated = generator.slice(generator.indexOf("id: 'daytrip-meknes'"), generator.indexOf("id: 'daytrip-ifrane'"));
  for (const photo of ['volubilis-mosaic', 'moulay-idriss', 'bab-mansour', 'historic-doorway', 'city-walls']) {
    assert.match(block, new RegExp(`/images/daytrip-meknes/${photo}\\.webp`));
    assert.ok(existsSync(resolve(root, `public/images/daytrip-meknes/${photo}.webp`)));
  }
  assert.ok(!block.includes('daytrip_meknes_image') && !block.includes('Heri es-Souani') && !block.includes('grilled kefta'));
  assert.match(copy, /historic walls and traditional streets/);
  assert.match(copy, /without feeling rushed/);
  assert.ok(!copy.includes('Heri es-Souani') && !copy.includes('Place el-Hedim'));
  assert.ok(copy.includes('priceMAD: 1100'));
  assert.match(generated, /historic walls and traditional streets/);
});

test('the Ifrane day trip uses the Doc story and the three Doc photos', () => {
  const details = read('src/data/experienceDetails.ts');
  const translations = read('src/data/translations.ts');
  const generator = read('scripts/generate_translations.py');
  const start = details.indexOf("'daytrip-ifrane'");
  const block = details.slice(start, details.indexOf("'daytrip-custom'", start));
  const copyStart = translations.indexOf("id: 'daytrip-ifrane'");
  const copy = translations.slice(copyStart, translations.indexOf("id: 'daytrip-custom'", copyStart));
  const generated = generator.slice(generator.indexOf("id: 'daytrip-ifrane'"), generator.indexOf("id: 'daytrip-custom'"));
  for (const photo of ['stone-lion', 'mountain-countryside', 'macaques']) {
    assert.match(block, new RegExp(`/images/daytrip-ifrane/${photo}\\.webp`));
    assert.ok(existsSync(resolve(root, `public/images/daytrip-ifrane/${photo}.webp`)));
  }
  assert.ok(!block.includes('daytrip_ifrane_image') && !block.includes('Azrou') && !block.includes('Immouzer'));
  assert.match(copy, /road conditions/);
  assert.match(copy, /landscapes that are very different from those around Fez/);
  assert.ok(!copy.includes('Azrou') && !copy.includes('Barbary') && !copy.includes('Immouzer'));
  assert.ok(copy.includes('priceMAD: 1100'));
  assert.match(generated, /road conditions/);
});

test('food guides use the editorial template and the tasting walk is the product', () => {
  const app = read('src/App.tsx');
  const articles = read('src/data/editorialArticles.ts');
  const details = read('src/data/experienceDetails.ts');
  const translations = read('src/data/translations.ts');
  const card = read('src/components/SectionCard.tsx');
  assert.match(app, /editorial-guide/);
  assert.match(card, /pillar\.kind === 'article'/);
  for (const id of ['food-tasting-walk', 'food-culture-life', 'food-markets-souks', 'food-traditional-fassi']) {
    assert.match(articles, new RegExp(`id: '${id}'`));
    assert.match(articles, /productId: 'our-food-tours'/);
  }
  assert.match(articles, /The exact selection is not fixed/);
  assert.ok(!articles.includes('/images/real/food_'));
  assert.match(details, /'our-food-tours'/);
  assert.match(details, /\/images\/food-tasting-walk\/street-sandwich\.webp/);
  assert.match(translations, /id: 'our-food-tours'/);
  assert.match(translations, /priceMAD: 550/);
  assert.match(translations, /Bab Boujloud or Bab Rcif/);
  for (const photo of ['street-sandwich', 'medina-lane', 'wood-oven', 'pastries-tea', 'mint-tea', 'tasting-table']) {
    assert.ok(existsSync(resolve(root, `public/images/food-tasting-walk/${photo}.webp`)));
  }
});

test('travel tips are content pages from the Docs and do not link to a product', () => {
  const tips = read('src/data/tipArticles.ts');
  const page = read('src/pages/TravelTipsPage.tsx');
  assert.match(tips, /id: 'tips-getting-around'/);
  assert.match(tips, /id: 'tips-plan-trip'/);
  assert.match(tips, /id: 'tips-practical'/);
  assert.match(tips, /hexagonal sign means the alley has an entrance but does not continue/);
  assert.match(tips, /at least 2 to 3 days/);
  assert.match(tips, /covering the shoulders and knees/);
  assert.match(tips, /wa\.me\/212719603009/);
  assert.ok(!tips.includes('productId'));
  assert.ok(!tips.includes('our-fez-tours') && !tips.includes('our-food-tours'));
  assert.ok(!page.includes('/images/real/tips_'));
  assert.ok(existsSync(resolve(root, 'public/images/tips-getting-around/hexagonal-sign.webp')));
  assert.ok(existsSync(resolve(root, 'public/images/tips-plan-trip/medina-view.webp')));
  assert.ok(existsSync(resolve(root, 'public/images/tips-practical/spice-shop.webp')));
});

test('the About page is a Doc content page and not a product page', () => {
  const about = read('src/pages/AboutPage.tsx');
  const app = read('src/App.tsx');
  assert.match(about, /We are a small local team based in Fez/);
  assert.match(about, /Founder & Local Host/);
  assert.match(about, /\/images\/about\/med\.webp/);
  assert.ok(!about.includes('onBookTour') && !about.includes('Frequently Asked Questions'));
  assert.ok(!about.includes('/images/real/about_us_'));
  assert.match(app, /<AboutPage/);
  assert.ok(existsSync(resolve(root, 'public/images/about/med.webp')));
  assert.ok(existsSync(resolve(root, 'public/images/about/guides-01.webp')));
  assert.ok(existsSync(resolve(root, 'public/images/about/drivers-05.webp')));
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
  const context = read('src/context/legacy-public-data.ts');
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

test('the local-eyes tour card sits under Fez cards and before reviews on all three editorial pages', () => {
  const cta = read('src/components/FezToursCtaSection.tsx');
  const fezPage = read('src/pages/FezPage.tsx');
  const articles = [
    'src/pages/MedinaArticlePage.tsx',
    'src/pages/HistoryCultureArticlePage.tsx',
    'src/pages/ThingsToDoArticlePage.tsx',
  ].map(read);

  assert.match(cta, /medina-14\.jpg/);
  assert.match(cta, /Explore Our Fez Tours/);
  assert.match(cta, /onExploreTours/);
  const cardGrid = fezPage.indexOf('{\/\* Experiences Grid \*\/}');
  const gallery = fezPage.indexOf('{\/\* Authentic Medina Photo Gallery \*\/}');
  const fezCta = fezPage.indexOf('<FezToursCtaSection');
  assert.ok(cardGrid >= 0 && fezCta > cardGrid && fezCta < gallery, 'Fez CTA should follow the cards and precede the gallery');

  for (const article of articles) {
    const ctaIndex = article.indexOf('<FezToursCtaSection');
    const reviewsIndex = article.indexOf('<TripadvisorReviewsSection');
    assert.ok(ctaIndex >= 0 && reviewsIndex > ctaIndex, 'tour CTA must appear before Tripadvisor reviews');
  }
});

test('Things to Do in Fez uses the supplied Google Doc as an editorial guide', () => {
  const article = read('src/pages/ThingsToDoArticlePage.tsx');
  const translations = read('src/data/translations.ts');
  const generator = read('scripts/generate_translations.py');
  const context = read('src/context/legacy-public-data.ts');
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
