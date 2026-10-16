import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { register } from 'tsx/esm/api';
register();
registerHooks({ load(url, context, nextLoad) {
  if (url.endsWith('.css')) return { format: 'module', source: 'export default "";', shortCircuit: true };
  return nextLoad(url, context);
} });
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { CMS_LOCALES, validateCmsDocument } = await import('../src/cms/schema.ts');
const { localizedText, localizedList, contentLanguage } = await import('../src/cms/render-utils.ts');
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { AdminApp } = await import('../src/admin/AdminApp.tsx');
const { PageRenderer } = await import('../src/cms/PageRenderer.tsx');
const { CmsProvider } = await import('../src/context/CmsContext.tsx');
const { EDITORIAL_ARTICLES } = await import('../src/data/editorialArticles.ts');
const { FEZ_PILLARS, DAY_TRIPS_PILLARS, FOOD_TOURS_PILLARS } = await import('../src/data/translations.ts');

const fallbackComponents = await Promise.all(['HomePage', 'FezPage', 'DayTripsPage', 'FoodToursPage', 'TravelTipsPage', 'AboutPage', 'BlogPage', 'MedinaArticlePage', 'HistoryCultureArticlePage', 'ThingsToDoArticlePage', 'OurFezToursPage'].map(async name => [name, (await import(`../src/pages/${name}.tsx`))[name]]));
const { ExperienceDetailPage } = await import('../src/pages/ExperienceDetailPage.tsx');
const { EditorialArticlePage } = await import('../src/components/EditorialArticlePage.tsx');
const renderFallback = (Component, props = {}) => renderToStaticMarkup(createElement(CmsProvider, null, createElement(Component, {
  language: 'es', onNavigate() {}, onExplore() {}, onBookTour() {}, onBook() {}, onBack() {}, ...props,
})));

test('all fallback landing, guide, editorial and experience pages render real Spanish', () => {
  for (const [name, Component] of fallbackComponents) {
    const spanish = renderFallback(Component);
    const english = renderFallback(Component, { language: 'en' });
    assert.doesNotMatch(spanish, /\p{Script=Arabic}/u, name);
    const spanishHeading = spanish.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1];
    const englishHeading = english.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1];
    assert.ok(spanishHeading, `${name}: visible heading`);
    if (name !== 'BlogPage') assert.notEqual(spanishHeading, englishHeading, `${name}: English heading in Spanish`);
    assert.match(spanish, /(?:Descubr|[Vv]isita|[Gg]uía|[Nn]uest|[Ee]xplor|[Vv]iaj|[Pp]rivada|[Ss]obre|[Cc]onsejo)/, name);
  }
  for (const article of EDITORIAL_ARTICLES) {
    const html = renderFallback(EditorialArticlePage, { article });
    assert.doesNotMatch(html, /\p{Script=Arabic}/u, article.id);
    assert.notEqual(article.title.es, article.title.en, article.id);
    for (const section of article.sections) {
      assert.equal(section.paragraphs.es.length, section.paragraphs.en.length, article.id);
      for (const paragraph of section.paragraphs.es) {
        assert.ok(paragraph.length > 20, article.id);
        assert.equal(section.paragraphs.en.includes(paragraph), false, `${article.id}: English fallback paragraph`);
      }
    }
  }
  for (const pillar of [...FEZ_PILLARS, ...DAY_TRIPS_PILLARS, ...FOOD_TOURS_PILLARS]) {
    const html = renderFallback(ExperienceDetailPage, { pillar });
    assert.doesNotMatch(html, /\p{Script=Arabic}/u, pillar.id);
    assert.notEqual(pillar.title.es, pillar.title.en, pillar.id);
    assert.match(html, /(?:[Ee]xperiencia|[Vv]isita|[Ff]ez|[Ff]e[sz]|[Cc]hafchaouen|[Ii]frane)/, pillar.id);
  }
});

test('every seeded page renders explicit Spanish narratives without Arabic or English fallback', () => {
  const seed = createCmsSeed();
  function walk(value, path = 'seed') {
    if (!value || typeof value !== 'object') return;
    assert.equal(Object.hasOwn(value, 'ar'), false, `${path}: obsolete locale`);
    if (Object.hasOwn(value, 'en') && Object.hasOwn(value, 'fr')) {
      assert.ok(Object.hasOwn(value, 'es'), `${path}: missing Spanish`);
      assert.doesNotMatch(JSON.stringify(value.es), /\p{Script=Arabic}/u, path);
      const english = Array.isArray(value.en) ? value.en : [value.en];
      const spanish = Array.isArray(value.es) ? value.es : [value.es];
      for (const item of english.filter(item => typeof item === 'string' && item.length > 60)) {
        assert.equal(spanish.includes(item), false, `${path}: English prose in Spanish`);
      }
    }
    for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`);
  }
  walk(seed);
  for (const page of seed.pages) {
    assert.equal(page.localeFallback?.es, undefined, page.id);
    const html = renderToStaticMarkup(createElement(PageRenderer, { document: seed, page, language: 'es', onNavigate() {}, onBook() {} }));
    assert.match(html, /lang="es"/, page.id);
    assert.match(html, /dir="ltr"/, page.id);
    assert.doesNotMatch(html, /\p{Script=Arabic}/u, page.id);
    const narrative = page.sections.filter(section => section.type === 'richText').flatMap(section => section.blocks).filter(block => block.type === 'paragraph');
    for (const block of narrative) {
      if (!block.text.en) continue;
      assert.ok(block.text.es, `${page.id}: missing Spanish narrative`);
      const escaped = block.text.es.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
      assert.ok(html.includes(escaped), `${page.id}: Spanish narrative not rendered`);
    }
  }
  const tour = seed.products.find(product => product.id === 'our-fez-tours');
  assert.deepEqual(tour.price, { amount: 170, currency: 'EUR', basis: 'person' });
  assert.equal(seed.siteSettings.email, 'fezguidetours1@gmail.com');
  assert.equal(seed.siteSettings.phoneNumber, '+212 719-603009');
  assert.equal(seed.siteSettings.whatsappNumber, '212719603009');
});

test('Spanish fallback controls, local itinerary and shell never expose English-only interface copy', async () => {
  const { SectionCard } = await import('../src/components/SectionCard.tsx');
  const { Footer } = await import('../src/components/Footer.tsx');
  const { TripadvisorReviewsSection } = await import('../src/components/TripadvisorReviewsSection.tsx');
  const { BookingModal } = await import('../src/components/BookingModal.tsx');
  const controls = [
    ...fallbackComponents.map(([name, Component]) => [name, renderFallback(Component)]),
    ['Footer', renderFallback(Footer)],
    ['Reviews', renderFallback(TripadvisorReviewsSection)],
    ['BookingModal', renderFallback(BookingModal, { isOpen: true, onClose() {} })],
    ...FOOD_TOURS_PILLARS.map(pillar => [pillar.id, renderFallback(SectionCard, { pillar })]),
  ];
  for (const [name, html] of controls) assert.doesNotMatch(html,
    /5\.0 on Tripadvisor|24\/7 WhatsApp Assistance|Read on Tripadvisor|Read the Article|View All Tours|Made with passion|The famous Blue Gate|Iconic entrance to the old city|Open in WhatsApp|Dietary requirements, Riad|English, Français and Español|Medina Food Tasting Walks|Living Heritage|Honest Tips|Middle Atlas &amp; Ifrane|alt="Thumbnail"|aria-label="Change language"/,
    name);
  const tour = renderFallback(fallbackComponents.find(([name]) => name === 'OurFezToursPage')[1]);
  assert.match(tour, /Entrada emblemática a la ciudad antigua/);
  assert.match(tour, /Hola%20Fez%20Guide%20Tours/);
});

test('Spanish CMS loading interface is Spanish and LTR', () => {
  const html = renderToStaticMarkup(createElement(AdminApp, { language: 'es', onClose() {} }));
  assert.match(html, /Cargando borrador/);
  assert.match(html, /lang="es"/);
  assert.match(html, /dir="ltr"/);
});

test('Spanish content never silently falls back to English or French', () => {
  assert.equal(localizedText({ en: 'English', fr: 'Français', es: '' }, 'es'), '');
  assert.equal(localizedText({ en: 'English' }, 'es'), '');
  assert.deepEqual(localizedList({ en: ['English'] }, 'es'), []);
  assert.deepEqual(localizedList({ en: ['English'], es: [] }, 'es'), []);
  assert.equal(localizedText({ en: 'English', es: 'Español' }, 'es'), 'Español');
  assert.equal(contentLanguage({ localeFallback: { es: 'en' } }, 'es'), 'es');
});

test('missing Spanish prose and WhatsApp titles never leak English fallback', async () => {
  const article = structuredClone(EDITORIAL_ARTICLES[0]);
  article.sections[0].paragraphs.en = ['ENGLISH_PROSE_SENTINEL'];
  delete article.sections[0].paragraphs.es;
  assert.doesNotMatch(renderFallback(EditorialArticlePage, { article }), /ENGLISH_PROSE_SENTINEL/);
  const { DetailModal } = await import('../src/components/DetailModal.tsx');
  const pillar = structuredClone(DAY_TRIPS_PILLARS[0]);
  pillar.title = { en: 'ENGLISH_TITLE_SENTINEL', fr: 'FR_SENTINEL', es: '' };
  const markup = renderFallback(DetailModal, { pillar, isOpen: true, onClose() {} });
  assert.doesNotMatch(markup, /ENGLISH_TITLE_SENTINEL/);
});

test('locale contract is EN/FR/ES and rejects obsolete Arabic documents', () => {
  assert.deepEqual([...CMS_LOCALES], ['en', 'fr', 'es']);
  const seed = createCmsSeed();
  assert.equal(validateCmsDocument(seed).valid, true);
  seed.siteSettings.heroTitle.ar = 'obsolete';
  assert.equal(validateCmsDocument(seed).valid, false);
});
