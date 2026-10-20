import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'tsx/esm/api';
register();
const { Window } = await import('happy-dom');
const window = new Window({ url: 'https://fez.example/' });
const globals = new Map();
for (const [key, value] of Object.entries({ window, document: window.document, navigator: window.navigator, IS_REACT_ACT_ENVIRONMENT: true })) {
  globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
}
const { createElement, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { CmsPreviewProvider } = await import('../src/context/CmsContext.tsx');
const { ApprovedContentProvider } = await import('../src/cms/approved-content.tsx');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { MedinaArticlePage } = await import('../src/pages/MedinaArticlePage.tsx');
const { HistoryCultureArticlePage } = await import('../src/pages/HistoryCultureArticlePage.tsx');
const { ThingsToDoArticlePage } = await import('../src/pages/ThingsToDoArticlePage.tsx');
const { EditorialArticlePage } = await import('../src/components/EditorialArticlePage.tsx');
const { approvedEditorial } = await import('../src/cms/approved-data.ts');
const text = value => ({ en: value, fr: value, es: value });
const props = { language: 'en', onBack() {}, onNavigate() {}, onExploreTours() {} };
const stories = [
  ['fez-explore-medina', MedinaArticlePage],
  ['fez-history-landmarks', HistoryCultureArticlePage],
  ['fez-things-to-do', ThingsToDoArticlePage],
];
async function mounted(Component, document, check, options = {}) {
  const host = window.document.createElement('div'); window.document.body.append(host);
  const root = createRoot(host), errors = [], original = console.error;
  console.error = (...args) => errors.push(args.map(String).join(' '));
  const render = async doc => {
    const id = options.pageId ?? stories.find(([, component]) => component === Component)?.[0];
    const page = doc.pages.find(page => page.id === id);
    const currentProps = Component === EditorialArticlePage ? { ...props, article: approvedEditorial(doc, page), onOpenProduct() {} } : props;
    await act(async () => root.render(createElement(CmsPreviewProvider, { document: doc }, createElement(ApprovedContentProvider, { document: doc, page }, createElement(Component, { ...currentProps, ...options.props })))));
  };
  try { await render(document); await check(host, render); assert.deepEqual(errors, []); }
  finally { await act(async () => root.unmount()); host.remove(); console.error = original; }
}

test('approved Fez articles consume canonical title introduction story gallery and CTA on one mounted lifetime', async () => {
  for (const [id, Component] of stories) {
    const doc = createCmsSeed(), page = doc.pages.find(page => page.id === id);
    page.title = text(`OWNER TITLE ${id}`);
    const intro = page.sections.find(section => section.id === 'introduction');
    intro.blocks = [{ type: 'paragraph', text: text('OWNER INTRODUCTION') }];
    const story = page.sections.find(section => section.id === 'story-1');
    story.blocks = [{ type: 'paragraph', text: text('OWNER STORY FIRST') }, { type: 'paragraph', text: text('OWNER STORY SECOND') }];
    const gallery = page.sections.find(section => section.id === 'gallery-1');
    gallery.images[0].alt = text('OWNER GALLERY ALT');
    doc.media.find(media => media.id === gallery.images[0].mediaId).src = '/images/owner-photo.jpg';
    const cta = page.sections.find(section => section.id === 'fez-tours-cta');
    cta.title = text('OWNER CTA TITLE'); cta.description = text('OWNER CTA DESCRIPTION'); cta.links[0].label = text('OWNER CTA BUTTON');
    await mounted(Component, doc, async (host, render) => {
      assert.equal(host.querySelector('h1').textContent, `OWNER TITLE ${id}`);
      for (const value of ['OWNER INTRODUCTION', 'OWNER STORY FIRST', 'OWNER STORY SECOND', 'OWNER CTA TITLE', 'OWNER CTA DESCRIPTION', 'OWNER CTA BUTTON']) assert.ok(host.textContent.includes(value), `${id}: ${value}`);
      assert.equal(host.querySelector('img[alt="OWNER GALLERY ALT"]').getAttribute('src'), '/images/owner-photo.jpg');
      const blank = structuredClone(doc), changed = blank.pages.find(page => page.id === id);
      changed.title = text(''); changed.sections.find(section => section.id === 'introduction').blocks = [];
      changed.sections.find(section => section.id === 'story-1').blocks = [];
      changed.sections.find(section => section.id === 'gallery-1').images = [];
      await render(blank);
      assert.equal(host.querySelector('h1').textContent, '');
      assert.ok(!host.textContent.includes('OWNER INTRODUCTION')); assert.ok(!host.textContent.includes('OWNER STORY'));
      assert.equal(host.querySelector('img[alt="OWNER GALLERY ALT"]'), null);
    });
  }
});

test('native review marquee uses current references, canonical values, disabled records and preview isolation', async () => {
  for (const [id, Component] of stories) {
    const published = createCmsSeed(), doc = structuredClone(published);
    const section = doc.pages.find(page => page.id === id).sections.find(section => section.id === 'reviews');
    section.reviewIds = [doc.reviews[2].id, doc.reviews[0].id, doc.reviews[1].id];
    doc.reviews[2].author = 'OWNER AUTHOR'; doc.reviews[2].title = 'OWNER REVIEW TITLE';
    doc.reviews[2].quote = 'OWNER ACTUAL QUOTE'; doc.reviews[2].url = 'https://www.tripadvisor.com/ShowUserReviews-owner';
    doc.reviews[0].enabled = false; section.title = text('OWNER REVIEW HEADING');
    await mounted(Component, doc, async (host, render) => {
      const reviews = host.querySelector('#tripadvisor-reviews'); assert.ok(reviews);
      assert.equal(reviews.className, 'space-y-8 overflow-hidden');
      assert.equal(reviews.querySelector('h2').textContent.trim(), 'OWNER REVIEW HEADING');
      assert.equal(reviews.querySelectorAll('.tripadvisor-set').length, 2);
      const cards = [...reviews.querySelectorAll('.tripadvisor-set:first-child .tripadvisor-card')];
      assert.equal(cards.length, 2); assert.ok(cards[0].textContent.includes('OWNER AUTHOR'));
      assert.ok(cards[0].textContent.includes('OWNER REVIEW TITLE')); assert.ok(cards[0].textContent.includes('OWNER ACTUAL QUOTE'));
      assert.equal(cards[0].getAttribute('href'), 'https://www.tripadvisor.com/ShowUserReviews-owner');
      assert.equal(cards[0].querySelectorAll('.tripadvisor-bubbles span').length, 5); assert.ok(cards[0].querySelector('svg.tripadvisor-mark'));
      assert.ok([...reviews.querySelectorAll('.tripadvisor-set:last-child .tripadvisor-card')].every(card => card.tabIndex === -1 && card.getAttribute('aria-hidden') === 'true'));
      assert.ok(reviews.textContent.includes('Read all 82 reviews on Tripadvisor'));
      assert.equal(published.reviews[2].author, 'Roam14564840921');
      const disabled = structuredClone(doc); disabled.pages.find(page => page.id === id).sections.find(section => section.id === 'reviews').enabled = false;
      await render(disabled); assert.equal(host.querySelector('#tripadvisor-reviews'), null);
      await render(published); assert.ok(host.querySelector('#tripadvisor-reviews').textContent.includes('Roam14564840921')); assert.ok(!host.textContent.includes('OWNER ACTUAL QUOTE'));
    });
  }
});

test('every authored Fez section keeps selection metadata and independently obeys missing or disabled sections', async () => {
  for (const [id, Component] of stories) {
    const doc = createCmsSeed(), page = doc.pages.find(page => page.id === id);
    await mounted(Component, doc, async (host, render) => {
      for (const section of page.sections) assert.ok(host.querySelector(`[data-section-id="${section.id}"][data-section-type="${section.type}"]`), `${id}: ${section.id}`);
      const changed = structuredClone(doc), current = changed.pages.find(page => page.id === id);
      for (const section of current.sections) if (['introduction', 'story-1', 'gallery-1', 'fez-tours-cta'].includes(section.id)) section.enabled = false;
      await render(changed);
      for (const sectionId of ['introduction', 'story-1', 'gallery-1', 'fez-tours-cta']) assert.equal(host.querySelector(`[data-section-id="${sectionId}"]`), null, `${id}: disabled ${sectionId}`);
      assert.ok(host.querySelector('[data-section-id="gallery-2"]'));
      current.sections = current.sections.filter(section => !['story-2', 'gallery-2'].includes(section.id));
      await render(structuredClone(changed));
      for (const sectionId of ['story-2', 'gallery-2']) assert.equal(host.querySelector(`[data-section-id="${sectionId}"]`), null, `${id}: deleted ${sectionId}`);
    });
  }
});

test('generic approved editorial keeps canonical section IDs after deletion and independent story/photos visibility', async () => {
  const doc = createCmsSeed(), id = 'food-tasting-walk', page = doc.pages.find(page => page.id === id);
  page.sections = page.sections.filter(section => !['story-1', 'photos-1'].includes(section.id));
  page.sections.find(section => section.id === 'story-2').blocks = [{ type: 'paragraph', text: text('OWNER SECOND STORY') }];
  await mounted(EditorialArticlePage, doc, async (host, render) => {
    assert.equal(host.querySelector('[data-section-id="story-1"]'), null);
    assert.ok(host.querySelector('[data-section-id="story-2"]').textContent.includes('OWNER SECOND STORY'));
    for (const section of page.sections) assert.ok(host.querySelector(`[data-section-id="${section.id}"]`), section.id);
    const disabled = structuredClone(doc), current = disabled.pages.find(page => page.id === id);
    current.sections.find(section => section.id === 'story-2').enabled = false;
    current.sections.find(section => section.id === 'product-cta').enabled = false;
    await render(disabled);
    assert.equal(host.querySelector('[data-section-id="story-2"]'), null); assert.ok(!host.textContent.includes('OWNER SECOND STORY'));
    assert.ok(host.querySelector('[data-section-id="photos-2"] img'), 'photos survive hiding their neighboring story');
    assert.equal(host.querySelector('[data-section-id="product-cta"]'), null);
    current.sections.find(section => section.id === 'photos-2').enabled = false;
    await render(structuredClone(disabled)); assert.equal(host.querySelector('[data-section-id="photos-2"]'), null);
  }, { pageId: id });
});

test('source fallback and seeded CMS preserve approved baseline DOM geometry and classes', async () => {
  const { readFileSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const fixtureBytes = readFileSync(new URL('./fixtures/approved-editorial-baseline.json', import.meta.url));
  assert.equal(createHash('sha256').update(fixtureBytes).digest('hex'), '20294759c7542c5696bafdde0a5d7951001fb844d59a881213a38da69115cbc2');
  const fixture = JSON.parse(fixtureBytes);
  assert.equal(fixture.revision, '241dca78c7c89dc5803082a4804681fc5b7529a9');
  const { createRequire } = await import('node:module');
  const { transformSync } = await import('esbuild');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { EDITORIAL_ARTICLES } = await import('../src/data/editorialArticles.ts');
  const require = createRequire(import.meta.url);
  const modules = new Map();
  for (const path of ['../components/PageCrumbBar', '../components/FezToursCtaSection', './PageCrumbBar']) modules.set(path, await import(`../src/${path.replace(/^\.\.\//, '').replace(/^\.\//, 'components/')}.tsx`));
  function baseline(path) {
    const source = fixture.files[path];
    assert.equal(typeof source, 'string', `Missing approved baseline source: ${path}`);
    const { code } = transformSync(source, { loader: 'tsx', format: 'cjs', jsx: 'transform' });
    const module = { exports: {} };
    // Hash-pinned, owner-approved source fixture only; no CMS/user text is evaluated.
    new Function('require', 'module', 'exports', code)(name => modules.get(name) ?? require(name), module, module.exports);
    return module.exports;
  }
  const review = baseline('src/components/TripadvisorReviewsSection.tsx');
  modules.set('../components/TripadvisorReviewsSection', review); modules.set('./TripadvisorReviewsSection', review);
  const shapes = node => [node.tagName, node.className?.baseVal ?? node.className, [...node.children].map(shapes)];
  // Only React-escaped renderToStaticMarkup output enters this detached test DOM.
  const parse = html => { const host = window.document.createElement('div'); host.innerHTML = html; return host; };
  const doc = createCmsSeed();
  const cases = stories.map(([id, Component]) => [id, Component, baseline(`src/pages/${Component.name}.tsx`)[Component.name], props]);
  const OriginalEditorial = baseline('src/components/EditorialArticlePage.tsx').EditorialArticlePage;
  for (const article of EDITORIAL_ARTICLES) cases.push([article.id, EditorialArticlePage, OriginalEditorial, { ...props, article, onOpenProduct() {} }]);
  for (const [id, Component, Original, sourceProps] of cases) for (const language of ['en', 'fr', 'es']) {
    const original = parse(renderToStaticMarkup(createElement(Original, { ...sourceProps, language })));
    const fallback = parse(renderToStaticMarkup(createElement(Component, { ...sourceProps, language })));
    assert.deepEqual(shapes(fallback), shapes(original), `${id}/${language}: source fallback geometry`);
    assert.ok(fallback.querySelector('h1').textContent, `${id}/${language}: source fallback remains available`);
    const page = doc.pages.find(page => page.id === id);
    const cmsProps = Component === EditorialArticlePage ? { ...sourceProps, article: approvedEditorial(doc, page), language } : { ...sourceProps, language };
    const cms = parse(renderToStaticMarkup(createElement(CmsPreviewProvider, { document: doc }, createElement(ApprovedContentProvider, { document: doc, page }, createElement(Component, cmsProps)))));
    assert.deepEqual(shapes(cms), shapes(original), `${id}/${language}: seeded CMS geometry`);
  }
});

test('Fez story/gallery groups follow CMS order within the approved article slots without empty disabled groups', async () => {
  for (const [id, Component] of stories) {
    const doc = createCmsSeed(), page = doc.pages.find(page => page.id === id);
    const offset = id === 'fez-history-landmarks' ? 1 : 0;
    const first = [`story-1`, `gallery-${1 + offset}`], second = [`story-2`, `gallery-${2 + offset}`];
    const ids = [...second].reverse().concat([...first].reverse());
    const changed = ids.map(id => page.sections.find(section => section.id === id));
    const start = Math.min(...ids.map(id => page.sections.findIndex(section => section.id === id)));
    page.sections = page.sections.filter(section => !ids.includes(section.id)); page.sections.splice(start, 0, ...changed);
    await mounted(Component, doc, async (host, render) => {
      const order = [...host.querySelectorAll('[data-section-id]')].map(node => node.dataset.sectionId).filter(id => ids.includes(id));
      assert.deepEqual(order, ids, id);
      const disabled = structuredClone(doc), current = disabled.pages.find(page => page.id === id);
      current.sections.forEach(section => { if (first.includes(section.id)) section.enabled = false; });
      await render(disabled);
      assert.ok([...host.querySelectorAll('article > section.space-y-7')].every(section => section.children.length > 0), 'no blank structural story slot');
    });
  }
});

test('generic editorial CTA uses its current enabled link and permits a genuinely empty photo', async () => {
  const doc = createCmsSeed(), id = 'food-tasting-walk', page = doc.pages.find(page => page.id === id);
  doc.siteSettings.whatsappNumber = '212600123456';
  const cta = page.sections.find(section => section.id === 'product-cta');
  cta.links = [{ id: 'owner-action', enabled: true, label: text('OWNER EXTERNAL ACTION'), href: 'https://wa.me/212719603009' }]; delete cta.image;
  await mounted(EditorialArticlePage, doc, async (host, render) => {
    const root = host.querySelector('[data-section-id="product-cta"]');
    assert.equal(root.querySelector('img'), null);
    const action = root.querySelector('a'); assert.ok(action);
    assert.equal(action.textContent.trim(), 'OWNER EXTERNAL ACTION'); assert.equal(action.href, 'https://wa.me/212600123456');
    const disabled = structuredClone(doc); disabled.pages.find(page => page.id === id).sections.find(section => section.id === 'product-cta').links[0].enabled = false;
    await render(disabled); assert.equal(host.querySelector('[data-section-id="product-cta"] button, [data-section-id="product-cta"] a'), null);
  }, { pageId: id });
});

test.after(() => { for (const [key, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } window.happyDOM.abort(); });
