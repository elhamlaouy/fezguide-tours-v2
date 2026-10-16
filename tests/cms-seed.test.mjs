import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'tsx/esm/api';
register();
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { validateCmsDocument } = await import('../src/cms/schema.ts');
const { FEZ_PILLARS, DAY_TRIPS_PILLARS, FOOD_TOURS_PILLARS, TRAVEL_TIPS_PILLARS, DEFAULT_SITE_SETTINGS, UI_TEXT } = await import('../src/data/translations.ts');
const { EXPERIENCE_EXTRAS } = await import('../src/data/experienceDetails.ts');
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { CmsProvider } = await import('../src/context/CmsContext.tsx');
const { ExperienceDetailPage } = await import('../src/pages/ExperienceDetailPage.tsx');
const { Footer } = await import('../src/components/Footer.tsx');
const { BlogPage } = await import('../src/pages/BlogPage.tsx');
const renderSource = (component, props) => renderToStaticMarkup(createElement(CmsProvider, null, createElement(component, props)));
const htmlText = value => value.replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|quot|#x27|#39);/g, (_, entity) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#x27': "'", '#39': "'" })[entity]);

test('generic product headers match the rendered source detail page in every locale', () => {
  const seed = createCmsSeed();
  for (const pillar of [...DAY_TRIPS_PILLARS, FOOD_TOURS_PILLARS.find(p => p.id === 'our-food-tours')]) {
    const header = seed.pages.find(p => p.id === pillar.id).sections.find(s => s.id === 'header');
    for (const language of ['en', 'fr', 'es']) {
      const html = renderSource(ExperienceDetailPage, { pillar, language });
      const rendered = /<h1\b[^>]*>([\s\S]*?)<\/h1>\s*<p\b[^>]*>([\s\S]*?)<\/p>/.exec(html);
      assert.ok(rendered, `${pillar.id}.${language}: source header`);
      assert.equal(header.title[language], htmlText(rendered[1]));
      assert.equal(header.description[language], htmlText(rendered[2]), `${pillar.id}.${language}: header description`);
    }
  }
});

test('generic product facts preserve all four rendered source facts in every locale', () => {
  const seed = createCmsSeed();
  for (const pillar of [...DAY_TRIPS_PILLARS, FOOD_TOURS_PILLARS.find(p => p.id === 'our-food-tours')]) {
    const facts = seed.pages.find(p => p.id === pillar.id).sections.find(s => s.id === 'facts');
    for (const language of ['en', 'fr', 'es']) {
      const html = renderSource(ExperienceDetailPage, { pillar, language });
      const ribbon = html.slice(html.indexOf('<div class="grid grid-cols-2 sm:grid-cols-4'), html.indexOf('<div class="grid grid-cols-1 lg:grid-cols-12'));
      const spans = [...ribbon.matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/g)].map(m => htmlText(m[1]));
      assert.equal(spans.length, 8, `${pillar.id}.${language}: source has four label/value pairs`);
      assert.deepEqual(facts.items.map(i => [i.title[language], i.description[language]]), Array.from({ length: 4 }, (_, i) => spans.slice(i * 2, i * 2 + 2)), `${pillar.id}.${language}: source facts`);
    }
  }
});

test('footer matches rendered source links including Blog and published non-navigation custom pages', () => {
  const seed = createCmsSeed();
  const basePages = ['home', 'fez', 'day-trips', 'food-tours', 'travel-tips', 'about'];
  assert.deepEqual(seed.footer.links.map(l => l.pageId), [
    ...basePages, ...(seed.legacy.blogPosts.length ? ['blog'] : []),
    ...seed.legacy.customPages.filter(p => p.published !== false).map(p => p.id),
  ]);
  assert.ok(seed.footer.links.some(l => l.pageId === 'page-bespoke-itinerary'));
  assert.ok(!seed.navigation.some(l => l.pageId === 'page-bespoke-itinerary'));
  for (const language of ['en', 'fr', 'es']) {
    const html = renderSource(Footer, { language });
    const list = /<ul\b[^>]*>([\s\S]*?)<\/ul>/.exec(html);
    assert.ok(list, 'source footer link list');
    const labels = [...list[1].matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)].map(m => htmlText(m[1]));
    assert.deepEqual(seed.footer.links.map(l => l.label[language]), labels, `${language}: source footer labels/order`);
    assert.ok(seed.footer.links.every(l => l.enabled));
  }
});

test('blog landing preserves the rendered source hero, localized copy, photo and grid order', () => {
  const seed = createCmsSeed();
  const page = seed.pages.find(p => p.id === 'blog');
  assert.deepEqual(page.sections.map(s => s.id), ['hero', 'posts']);
  const hero = page.sections[0];
  assert.equal(hero.type, 'hero');
  assert.equal(hero.variant, 'banner');
  for (const language of ['en', 'fr', 'es']) {
    const html = renderSource(BlogPage, { language });
    const sourceHero = /<section\b[^>]*>([\s\S]*?)<\/section>/.exec(html)?.[1];
    assert.ok(sourceHero, 'source blog hero');
    assert.equal(hero.title[language], htmlText(/<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(sourceHero)[1]));
    assert.equal(hero.description[language], htmlText(/<p\b[^>]*>([\s\S]*?)<\/p>/.exec(sourceHero)[1]));
    assert.equal(hero.eyebrow[language], htmlText(/<span\b[^>]*>([\s\S]*?)<\/span>/.exec(sourceHero)[1]));
    const image = /<img\b[^>]*src="([^"]+)"[^>]*alt="([^"]+)"/.exec(sourceHero);
    assert.equal(seed.media.find(m => m.id === hero.image.mediaId).src, image[1]);
    assert.equal(hero.image.alt[language], htmlText(image[2]));
  }
  assert.deepEqual(page.sections[1].cards.map(c => c.pageId), seed.blogPosts.filter(p => p.published !== false).map(p => p.id));
});

test('seed is validated, independent JSON data with current approved contact values', () => {
  const seed = createCmsSeed();
  const result = validateCmsDocument(seed);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.deepEqual(seed.siteSettings, DEFAULT_SITE_SETTINGS);
  assert.deepEqual(seed.legacy.siteSettings, DEFAULT_SITE_SETTINGS);
  assert.deepEqual(JSON.parse(JSON.stringify(seed)), seed);
  seed.pages[0].title.en = 'Edited'; seed.siteSettings.email = 'changed@example.com';
  assert.notEqual(createCmsSeed().pages[0].title.en, 'Edited');
  assert.equal(createCmsSeed().siteSettings.email, 'fezguidetours1@gmail.com');
});

test('global UI copy seeds only effective interface keys, never dead component snapshots', async () => {
  const { SUPPORTED_UI_COPY } = await import('../src/cms/ui-copy.ts');
  const { BOOKING_COPY } = await import('../src/cms/booking-copy.ts');
  const seed = createCmsSeed();
  assert.deepEqual(Object.keys(seed.uiCopy).sort(), Object.keys(SUPPORTED_UI_COPY).sort());
  for (const key of Object.keys(seed.uiCopy)) assert.ok(!key.includes('.source.'), `${key}: entity-owned source snapshot`);
  for (const [key, value] of Object.entries(BOOKING_COPY)) assert.deepEqual(seed.uiCopy[`ui.booking.${key}`], value);
  assert.deepEqual(seed.uiCopy['ui.booking.fullName'], { en: 'Full Name', fr: 'Nom Complet', es: 'Nombre completo' });
  for (const dead of ['BookingModal.copy.3','Navbar.text.1','ExperienceDetailPage.label.2','ui.nav.home','ui.footer.rights','ui.hero.subtitle','ui.homeQuickNav.subtitle']) assert.equal(seed.uiCopy[dead], undefined, dead);
  seed.uiCopy['ui.common.close'].en = 'Dismiss';
  assert.equal(validateCmsDocument(seed).valid, true);
  assert.equal(createCmsSeed().uiCopy['ui.common.close'].en, UI_TEXT.common.close.en);
});

test('hidden seeded narratives are absent throughout anonymous JSON after real store publication', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { readFileSync } = await import('node:fs');
  const { CmsStore } = await import('../worker/cms-store.ts');
  const { createCmsHandler } = await import('../worker/cms-routes.ts');
  const { EDITORIAL_ARTICLES } = await import('../src/data/editorialArticles.ts');
  const sqlite = new DatabaseSync(':memory:');
  try {
    for (const name of ['0001_cms.sql', '0002_media_budget.sql', '0003_cms_release_safeguards.sql']) sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
    // The actual store SQL runs locally with D1's atomic batch semantics, not a mocked store.
    const statement = (sql, values = []) => ({
      bind: (...args) => statement(sql, args),
      async first() { return sqlite.prepare(sql).get(...values) ?? null; },
      async run() { const result = sqlite.prepare(sql).run(...values); return { success: true, meta: { changes: Number(result.changes) } }; },
    });
    const db = { prepare: statement, async batch(statements) {
      sqlite.exec('BEGIN IMMEDIATE');
      try { const results = []; for (const stmt of statements) results.push(await stmt.run()); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    } };
    const store = new CmsStore(db, validateCmsDocument);
    const handler = createCmsHandler({ validateDocument: validateCmsDocument });
    const anonymous = async path => {
      const response = await handler(new Request(`https://example.test${path}`), { CMS_DB: db });
      assert.equal(response.status, 200);
      return response.json();
    };
    const seed = createCmsSeed();
    const ids = ['fez-explore-medina', 'fez-history-landmarks', 'fez-things-to-do', 'our-fez-tours', 'about', ...EDITORIAL_ARTICLES.map(article => article.id)];
    const narratives = ids.map(id => {
      const page = seed.pages.find(page => page.id === id);
      const paragraphs = page.sections.filter(section => section.type === 'richText').flatMap(section => section.blocks).filter(block => block.type === 'paragraph');
      // The food walk's first two paragraphs also belong to the still-public food category/product.
      // Use its first article-only paragraph; keep the exact original Medina introduction as the primary regression.
      const intro = paragraphs[id === 'food-tasting-walk' ? 2 : 0].text;
      assert.ok(intro.en.length > 30, `${id}: original narrative, not a sentinel`);
      return { id, intro };
    });
    await store.saveDraft(seed, 0, 'seed-regression');
    await store.publish(1, 'seed-regression');
    assert.deepEqual((await anonymous('/api/cms/document')).document, seed, 'published source parity');
    for (const { id } of narratives) seed.pages.find(page => page.id === id).enabled = false;
    seed.uiCopy['ui.common.close'].en = 'Dismiss';
    await store.saveDraft(seed, 2, 'seed-regression');
    await store.publish(3, 'seed-regression');
    for (const path of ['/api/cms/document', '/api/cms']) {
      const output = await anonymous(path);
      const json = JSON.stringify(output);
      for (const { id, intro } of narratives) for (const language of ['en', 'fr', 'es']) {
        if (intro[language]) assert.equal(json.includes(JSON.stringify(intro[language]).slice(1, -1)), false, `${path}: ${id}.${language} leaked its seeded introduction`);
      }
      if (output.document) {
        assert.equal(output.version, 4);
        assert.equal(output.document.uiCopy['ui.common.close'].en, 'Dismiss');
        assert.equal(validateCmsDocument(output.document).valid, true);
        assert.ok(output.document.pages.some(page => page.id === 'home'));
        assert.ok(output.document.pages.every(page => !ids.includes(page.id)));
      }
    }
    assert.deepEqual((await store.read()).document, seed, 'visibility never deletes stored narratives or edits');
    assert.deepEqual((await store.readPublished()).document, seed);
  } finally { sqlite.close(); }
});

test('legacy tours preserve protected source values, extras, card ordering and public paths', () => {
  const seed = createCmsSeed();
  const pillars = [...FEZ_PILLARS, ...DAY_TRIPS_PILLARS, ...FOOD_TOURS_PILLARS, ...TRAVEL_TIPS_PILLARS];
  assert.deepEqual(seed.legacy.tours.map(t => t.id), pillars.map(t => t.id));
  for (const source of pillars) {
    const tour = seed.legacy.tours.find(t => t.id === source.id);
    for (const field of ['title', 'subtitle', 'shortDescription', 'fullDescription', 'highlights', 'practicalInfo', 'imageAlt', 'actionType']) assert.deepEqual(tour[field], source[field], `${source.id}.${field}`);
    const extra = EXPERIENCE_EXTRAS[source.id];
    assert.deepEqual(tour.galleryImages, (extra?.galleryImages ?? [source.image]).map(s => s.replace('/src/assets/images/', '/images/')));
    assert.deepEqual(tour.itinerary, extra?.itinerary ?? []);
  }
  assert.equal(JSON.stringify(seed).includes('/src/assets/images/'), false);
});
test('products remain separate from editorial guides and retain approved Fez pricing', () => {
  const seed = createCmsSeed();
  assert.deepEqual(seed.products.map(p => p.id), ['our-fez-tours', ...DAY_TRIPS_PILLARS.map(p => p.id), 'our-food-tours']);
  const fez = seed.products.find(p => p.id === 'our-fez-tours');
  assert.deepEqual(fez.price, { amount: 170, currency: 'EUR', basis: 'person' });
  assert.equal(fez.practicalInfo.priceMAD, 1900);
  assert.equal(fez.practicalInfo.priceUSD, 191);
  for (const id of ['food-tasting-walk', 'food-culture-life', 'food-markets-souks', 'food-traditional-fassi', 'tips-plan-trip', 'tips-getting-around', 'tips-practical', 'about']) {
    const page = seed.pages.find(p => p.id === id);
    assert.equal(page.kind, 'editorial');
    assert.equal(page.productId, undefined);
    assert.ok(page.sections.every(s => s.variant !== 'booking'));
  }
  for (const id of ['about', 'travel-tips', 'tips-plan-trip', 'tips-getting-around', 'tips-practical']) assert.ok(seed.pages.find(p => p.id === id).sections.every(s => s.type !== 'cta'), id);
});
test('Fez product preserves the approved section and original gallery order', () => {
  const seed = createCmsSeed();
  const page = seed.pages.find(p => p.id === 'our-fez-tours');
  assert.deepEqual(page.sections.map(s => s.id), ['header', 'gallery', 'facts', 'overview', 'included', 'meeting', 'itinerary', 'extra', 'cancel', 'booking', 'reviews']);
  const paths = page.sections.find(s => s.type === 'gallery').images.map(i => seed.media.find(m => m.id === i.mediaId).src);
  assert.deepEqual(paths, Array.from({ length: 8 }, (_, i) => `/images/our-fez-tours/0${i + 1}.webp`));
  assert.equal(page.localeFallback?.es, undefined);
  assert.equal(page.sections.find(s => s.id === 'itinerary').stops.length, 9);
});
test('preserves all current food and travel-tip article paragraphs, headings, dimensions and image ordering', async () => {
  const { EDITORIAL_ARTICLES } = await import('../src/data/editorialArticles.ts');
  const seed = createCmsSeed();
  for (const article of EDITORIAL_ARTICLES) {
    const page = seed.pages.find(p => p.id === article.id);
    const rich = page.sections.filter(s => s.type === 'richText');
    assert.equal(rich.length, article.sections.length);
    for (const [index, source] of article.sections.entries()) {
      assert.deepEqual(rich[index].title, source.heading);
      for (const lang of ['en', 'fr', 'es']) assert.deepEqual(rich[index].blocks.map(b => b.text[lang]), source.paragraphs[lang]);
    }
    const galleries = page.sections.filter(s => s.type === 'gallery');
    assert.deepEqual(galleries.flatMap(s => s.images.map(i => seed.media.find(m => m.id === i.mediaId).src)), article.sections.flatMap(s => s.images.map(i => i.src)));
    for (const img of article.sections.flatMap(s => s.images)) {
      const migrated = seed.media.find(m => m.src === img.src);
      assert.equal(migrated.width, img.width); assert.equal(migrated.height, img.height);
    }
    if (article.productId) assert.equal(page.sections.find(s => s.type === 'cta').productId, article.productId);
    else assert.ok(page.sections.every(s => s.type !== 'cta'));
    let offset = 0;
    for (const [index, source] of article.sections.entries()) {
      assert.equal(page.sections[offset++].id, `story-${index + 1}`, `${article.id}: paragraphs before photos`);
      if (source.images.length) assert.equal(page.sections[offset++].id, `photos-${index + 1}`);
    }
    assert.equal(page.sections.at(-1).type, 'reviews', `${article.id}: original review placement`);
  }
});
test('home and category composition retains visible headings and source order', () => {
  const seed = createCmsSeed();
  const home = seed.pages.find(p => p.id === 'home');
  assert.equal(home.sections.find(s => s.id === 'quick-navigation').eyebrow.en, 'FezGuideTours Ecosystem');
  assert.equal(home.sections.find(s => s.id === 'featured').title.en, 'Top Featured Medina Tours & Excursions');
  assert.equal(home.sections.find(s => s.id === 'why-choose-us').title.en, 'Why Discerning Travelers Choose Us');
  assert.deepEqual(home.sections.map(s => s.id), ['hero', 'trust', 'quick-navigation', 'featured', 'why-choose-us', 'reviews', 'contact']);
  assert.deepEqual(seed.pages.find(p => p.id === 'fez').sections.map(s => s.id), ['hero', 'introduction', 'overview', 'fez-tours-cta', 'gallery']);
  assert.deepEqual(seed.pages.find(p => p.id === 'travel-tips').sections.map(s => s.id), ['hero', 'introduction', 'quick-rules', 'overview', 'gallery', 'currency-estimator', 'medina-gates', 'contact']);
  for (const id of [...DAY_TRIPS_PILLARS.map(p => p.id), 'our-food-tours']) {
    const ids = seed.pages.find(p => p.id === id).sections.map(s => s.id);
    assert.ok(ids.indexOf('itinerary') < ids.indexOf('included'), id);
    assert.ok(ids.indexOf('booking') < ids.indexOf('related'), id);
    assert.ok(ids.indexOf('related') < ids.indexOf('reviews'), id);
  }
  assert.equal(seed.products.find(p => p.id === 'our-food-tours').price.basis, 'group');
});
test('About preserves team headings, founder role, paragraphs and ordered original photos', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../src/pages/AboutPage.tsx', import.meta.url), 'utf8');
  const seed = createCmsSeed();
  const page = seed.pages.find(p => p.id === 'about');
  const med = page.sections.find(s => s.id === 'med');
  assert.equal(med.title.en, 'Meet Our Team');
  assert.equal(med.title.fr, 'Notre équipe');
  assert.deepEqual(med.blocks.slice(0, 2).map(b => b.text.en), ['Med', 'Founder & Local Host']);
  const paragraphValues = [...source.matchAll(/en: '([^']*)',\s*fr: '([^']*)',\s*es: (?:"[^"]+"|'[^']+')/g)];
  assert.equal(paragraphValues.length, 10);
  for (const match of paragraphValues) for (const [offset, lang] of [[1, 'en'], [2, 'fr']]) {
    assert.ok(page.sections.some(s => s.type === 'richText' && s.blocks.some(b => b.text?.[lang] === match[offset])), `${lang}: ${match[offset]}`);
  }
  const photos = [...source.matchAll(/<Photo src="([^"]+)" alt=\{language === \'es\' \? "[^"]+" : "([^"]+)"\} width=\{(\d+)\} height=\{(\d+)\}/g)];
  const migrated = page.sections.filter(s => s.type === 'gallery').flatMap(s => s.images);
  assert.deepEqual(migrated.map(i => seed.media.find(m => m.id === i.mediaId).src), photos.map(m => m[1]));
  for (const [index, photo] of photos.entries()) {
    const media = seed.media.find(m => m.id === migrated[index].mediaId);
    assert.equal(migrated[index].alt.en, photo[2]);
    assert.equal(media.width, Number(photo[3])); assert.equal(media.height, Number(photo[4]));
  }
});

test('all migrated media exists in the local public library', async () => {
  const { access } = await import('node:fs/promises');
  const seed = createCmsSeed();
  for (const media of seed.media) if (media.src.startsWith('/')) await access(new URL(`../public${media.src}`, import.meta.url));
});
// Compile trusted local fixture declarations only; React and browser globals are never loaded.
async function sourceConstants(component, names) {
  const { readFile } = await import('node:fs/promises');
  const { transformSync } = await import('esbuild');
  const { runInNewContext } = await import('node:vm');
  const source = await readFile(new URL(`../src/pages/${component}.tsx`, import.meta.url), 'utf8');
  const boundary = source.indexOf(`export const ${component}:`);
  assert.ok(boundary > 0);
  const declarations = source.slice(0, boundary).replace(/^import\b[\s\S]*?;/gm, '');
  const { code } = transformSync(`${declarations}\nmodule.exports = { ${names.join(', ')} };`, { loader: 'tsx', format: 'cjs' });
  const sandbox = { module: { exports: {} } };
  runInNewContext(code, sandbox, { timeout: 1000 });
  return JSON.parse(JSON.stringify(sandbox.module.exports));
}
test('Fez editorial stories retain every EN/FR paragraph and approved interleaved photo groups', async () => {
  const seed = createCmsSeed();
  for (const [id, component, names] of [
    ['fez-explore-medina', 'MedinaArticlePage', ['content', 'imageGroups', 'imageAlts']],
    ['fez-history-landmarks', 'HistoryCultureArticlePage', ['content', 'imageAlts', 'imageDimensions']],
    ['fez-things-to-do', 'ThingsToDoArticlePage', ['content', 'imageAlts', 'imageDimensions']],
  ]) {
    const source = await sourceConstants(component, names);
    const page = seed.pages.find(p => p.id === id);
    assert.equal(page.localeFallback?.es, undefined);
    const paragraphs = page.sections.filter(s => s.type === 'richText').flatMap(s => s.blocks);
    for (const lang of ['en', 'fr', 'es']) {
      assert.equal(page.title[lang], source.content[lang].title);
      assert.deepEqual(paragraphs.map(p => p.text[lang]), source.content[lang].paragraphs);
    }
    const expectedIds = ['introduction'];
    if (id === 'fez-explore-medina') for (let i = 0; i < source.imageGroups.length; i++) {
      expectedIds.push(`gallery-${i + 1}`);
      if (i < source.content.en.paragraphs.length - 1) expectedIds.push(`story-${i + 1}`);
    }
    else {
      if (id === 'fez-history-landmarks') expectedIds.push('gallery-1');
      for (let i = 1; i < source.content.en.paragraphs.length; i++) {
        expectedIds.push(`story-${i}`);
        const photo = id === 'fez-history-landmarks' ? source.content.en.imageAfter[i] : i;
        if (photo != null) expectedIds.push(`gallery-${photo}`);
      }
    }
    assert.deepEqual(page.sections.map(s => s.id), [...expectedIds, 'fez-tours-cta', 'reviews']);
    const galleries = page.sections.filter(s => s.type === 'gallery');
    const images = galleries.flatMap(s => s.images);
    if (source.imageGroups) assert.deepEqual(galleries.map(s => s.images.map(i => seed.media.find(m => m.id === i.mediaId).src)), source.imageGroups);
    for (const [index, image] of images.entries()) {
      for (const lang of ['en', 'fr']) assert.equal(image.alt[lang], Array.isArray(source.imageAlts) ? source.imageAlts[index] : source.imageAlts[lang][index]);
      if (source.imageDimensions) {
        const media = seed.media.find(m => m.id === image.mediaId);
        assert.deepEqual([media.width, media.height], source.imageDimensions[index]);
      }
    }
  }
});
test('Fez product migration retains the component-local source paragraphs, policies and photos', async () => {
  const { copy, galleryImages } = await sourceConstants('OurFezToursPage', ['copy', 'galleryImages']);
  const seed = createCmsSeed();
  const page = seed.pages.find(p => p.id === 'our-fez-tours');
  const product = seed.products.find(p => p.id === page.productId);
  for (const lang of ['en', 'fr']) {
    assert.equal(page.title[lang], copy[lang].title);
    for (const id of ['overview', 'meeting']) assert.deepEqual(page.sections.find(s => s.id === id).blocks.map(b => b.text[lang]), copy[lang][id]);
    assert.deepEqual(product.included[lang], copy[lang].included);
    assert.deepEqual(product.excluded[lang], copy[lang].excluded);
    assert.deepEqual(product.suitableFor[lang], copy[lang].extra);
    assert.equal(product.cancellationPolicy[lang], copy[lang].cancel);
  }
  const images = page.sections.find(s => s.type === 'gallery').images;
  assert.deepEqual(images.map(i => seed.media.find(m => m.id === i.mediaId).src), galleryImages.map(i => i.src));
  for (const [index, image] of images.entries()) {
    const media = seed.media.find(m => m.id === image.mediaId);
    assert.deepEqual([media.width, media.height], [galleryImages[index].width, galleryImages[index].height]);
  }
});
test('valid CMS edits are not overwritten by source defaults', () => {
  const seed = createCmsSeed();
  seed.siteSettings.email = 'owner@example.com';
  seed.pages.find(p => p.id === 'about').sections[0].blocks[0].text.en = 'An approved new description';
  seed.products[0].price.amount = 175;
  assert.equal(validateCmsDocument(seed).valid, true);
  assert.equal(seed.siteSettings.email, 'owner@example.com');
  assert.equal(seed.products[0].price.amount, 175);
});

test('only attributed real Tripadvisor records are seeded, never private or invented reviews', () => {
  const seed = createCmsSeed();
  assert.equal(seed.reviews.length, 6);
  assert.ok(seed.reviews.every(r => r.source === 'tripadvisor' && r.url.startsWith('https://www.tripadvisor.com/ShowUserReviews-')));
  assert.equal(seed.reviews[0].author, 'Mathilde H');
  assert.ok(!JSON.stringify(seed).includes('BookingInquiry'));
  assert.deepEqual(Object.keys(seed.legacy).sort(), ['blogPosts', 'customPages', 'faqs', 'siteSettings', 'teamMembers', 'tours']);
});
