import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { register } from 'tsx/esm/api';
register();
registerHooks({ load(url, context, nextLoad) { if (url.endsWith('.css')) return { format: 'module', source: 'export default "";', shortCircuit: true }; return nextLoad(url, context); } });
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { Window } = await import('happy-dom');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { CmsPreviewProvider } = await import('../src/context/CmsContext.tsx');
const { ApprovedContentProvider } = await import('../src/cms/approved-content.tsx');
const { OurFezToursPage } = await import('../src/pages/OurFezToursPage.tsx');
const { ExperienceDetailPage } = await import('../src/pages/ExperienceDetailPage.tsx');
const text = value => ({ en: value, fr: value, es: value });
const productIds = ['our-fez-tours', 'daytrip-chefchaouen'];
function render(doc, id, language = 'en') {
  const pillar = doc.legacy.tours.find(item => item.id === id);
  const html = renderToStaticMarkup(createElement(CmsPreviewProvider, { document: doc }, createElement(ApprovedContentProvider, { document: doc, page: doc.pages.find(item => item.id === id) }, createElement(id === 'our-fez-tours' ? OurFezToursPage : ExperienceDetailPage, { pillar, language, onBack() {}, onNavigate() {}, onBookTour() {}, onSelectExperience() {} }))));
  // React server markup is escaped by React; only test-owned HTML enters this detached DOM.
  const window = new Window(); window.document.body.innerHTML = html;
  return window.document;
}

test('approved product templates render current typed section data in the original gallery, facts, cards and timeline', () => {
  for (const id of productIds) {
    const doc = createCmsSeed(), page = doc.pages.find(item => item.id === id);
    const section = name => page.sections.find(item => item.id === name);
    section('header').title = text('OWNER HEADER'); section('header').description = text('OWNER LEAD');
    section('gallery').images = structuredClone(doc.pages.find(item => item.id === 'our-fez-tours').sections.find(item => item.id === 'gallery').images.slice(0, 2).reverse());
    section('gallery').images[0].alt = text('OWNER GALLERY ALT');
    doc.media.find(item => item.id === section('gallery').images[0].mediaId).focalPoint = { x: .2, y: .8 };
    section('facts').items = section('facts').items.slice(0, 2).map((item, index) => ({ title: text(`OWNER FACT ${index}`), description: text(`OWNER VALUE ${index}`) }));
    section('overview').title = text('OWNER OVERVIEW'); section('overview').blocks = [{ type: 'paragraph', text: text('OWNER PARAGRAPH') }];
    section('itinerary').title = text('OWNER ROUTE'); section('itinerary').stops = [{ time: '73 min', title: text('OWNER STOP'), description: text('OWNER STOP DESCRIPTION'), badge: text('OWNER TICKET') }];
    section('included').included = { en: ['OWNER INCLUDED'], fr: [], es: [] }; section('included').excluded = { en: ['OWNER EXCLUDED'], fr: [], es: [] };
    const rendered = render(doc, id);
    assert.equal(rendered.querySelector('h1').textContent.trim(), 'OWNER HEADER', id);
    const gallery = rendered.querySelector('[data-section-id="gallery"]');
    assert.ok(gallery, `${id}: gallery marker`);
    assert.equal(gallery.querySelector('img').getAttribute('src'), doc.media.find(item => item.id === section('gallery').images[0].mediaId).src);
    assert.equal(gallery.querySelector('img').alt, 'OWNER GALLERY ALT');
    assert.equal(gallery.querySelector('img').style.objectPosition, '20% 80%');
    assert.equal(gallery.querySelectorAll('button').length, 2, id);
    const facts = rendered.querySelector('[data-section-id="facts"]');
    assert.ok(facts.textContent.includes('OWNER FACT 0')); assert.ok(facts.textContent.includes('OWNER VALUE 1'));
    assert.ok(!facts.textContent.includes('English, Français'));
    for (const [name, value] of [['overview', 'OWNER PARAGRAPH'], ['itinerary', 'OWNER STOP DESCRIPTION'], ['included', 'OWNER INCLUDED']]) assert.ok(rendered.querySelector(`[data-section-id="${name}"]`).textContent.includes(value), `${id}/${name}`);
    assert.ok(rendered.querySelector('[data-section-id="itinerary"]').textContent.includes('OWNER TICKET'));
    assert.equal(rendered.querySelector('[data-section-id="overview"] h2').textContent.trim(), 'OWNER OVERVIEW');
    assert.equal(rendered.querySelector('[data-section-id="itinerary"] h2').textContent.trim(), 'OWNER ROUTE');
    assert.ok(rendered.querySelector('[data-section-id="included"]').textContent.includes('OWNER EXCLUDED'));
    assert.ok(rendered.querySelector('[data-section-id="overview"]').closest('.lg\\:col-span-8'));
    assert.ok(rendered.querySelector('[data-section-id="itinerary"] .border-l-2'));
  }
});

test('approved product CMS section visibility, blanks and main-column order never resurrect source content', () => {
  for (const id of productIds) {
    const doc = createCmsSeed(), page = doc.pages.find(item => item.id === id);
    const section = name => page.sections.find(item => item.id === name);
    section('itinerary').stops = [];
    section('included').included.en = []; section('included').excluded.en = [];
    section('overview').blocks = []; section('overview').title = text('');
    section('gallery').images = [];
    section('facts').items = [];
    section('booking').enabled = false;
    section('reviews').enabled = false;
    if (id === 'our-fez-tours') section('meeting').enabled = false;
    else { section('related').enabled = false; section('bring').enabled = false; section('highlights').enabled = false; }
    page.sections = [...page.sections].sort((a, b) => (a.id === 'included' ? -1 : b.id === 'included' ? 1 : a.id === 'overview' ? 1 : b.id === 'overview' ? -1 : 0));
    const rendered = render(doc, id);
    assert.ok(!rendered.querySelector('[data-section-id="booking"]'), `${id}: disabled sidebar`);
    assert.ok(!rendered.querySelector('button[data-cms-product-id]'), `${id}: disabled bottom booking action`);
    assert.ok(!rendered.querySelector('[data-section-id="reviews"]'));
    assert.ok(!rendered.querySelector('[data-section-id="related"]'));
    assert.ok(!rendered.querySelector('[data-section-id="gallery"] img'), `${id}: empty gallery stays empty`);
    assert.equal(rendered.querySelector('[data-section-id="facts"]').children.length, 0);
    assert.equal(rendered.querySelector('[data-section-id="overview"] h2').textContent.trim(), '');
    assert.ok(!rendered.querySelector('[data-section-id="itinerary"] h3'));
    assert.ok(!rendered.querySelector('[data-section-id="included"] li'));
    const overview = rendered.querySelector('[data-section-id="overview"]');
    const siblings = [...overview.parentElement.children].map(item => item.dataset.sectionId);
    assert.ok(siblings.indexOf('included') < siblings.indexOf('overview'), `${id}: CMS order inside the unchanged main column`);
    if (id === 'our-fez-tours') assert.ok(!rendered.querySelector('[data-section-id="meeting"]'));
    else assert.ok(!rendered.querySelector('[data-section-id="bring"]'));
  }
});

test('all authored fact rows, supporting prose, related cards and booking copy remain CMS-driven', () => {
  for (const id of productIds) {
    const doc = createCmsSeed(), page = doc.pages.find(item => item.id === id), product = doc.products.find(item => item.id === id);
    const section = name => page.sections.find(item => item.id === name);
    section('facts').items.push({ title: text('OWNER FIFTH FACT'), description: text('OWNER FIFTH VALUE') });
    section('booking').title = text('OWNER RATE LABEL'); section('booking').description = text('OWNER RATE DESCRIPTION');
    section('booking').links[0].label = text('OWNER CONTACT LABEL');
    product.cancellationPolicy = text('OWNER CANCELLATION');
    if (id === 'our-fez-tours') {
      section('meeting').blocks = [{ type: 'paragraph', text: text('OWNER MEETING') }];
      section('extra').blocks = [{ type: 'list', items: { en: ['OWNER SUITABILITY'], fr: [], es: [] } }];
      section('cancel').blocks = [{ type: 'paragraph', text: text('OWNER CANCELLATION') }];
    } else {
      section('bring').title = text('OWNER BRING HEADING'); section('bring').blocks = [{ type: 'list', items: { en: ['OWNER PACKING'], fr: [], es: [] } }];
      section('highlights').title = text('OWNER HIGHLIGHTS HEADING'); section('highlights').blocks = [{ type: 'list', items: { en: ['OWNER HIGHLIGHT'], fr: [], es: [] } }];
      section('related').cards = [section('related').cards[0]]; section('related').cards[0].title = text('OWNER RELATED CARD'); section('related').cards[0].description = text('OWNER RELATED DESCRIPTION');
    }
    const rendered = render(doc, id);
    assert.ok(rendered.querySelector('[data-section-id="facts"]').textContent.includes('OWNER FIFTH VALUE'), id);
    const booking = rendered.querySelector('[data-section-id="booking"]');
    for (const value of ['OWNER RATE LABEL', 'OWNER RATE DESCRIPTION', 'OWNER CONTACT LABEL']) assert.ok(booking.textContent.includes(value), `${id}/${value}`);
    assert.ok(rendered.body.textContent.includes('OWNER CANCELLATION'));
    if (id === 'our-fez-tours') { assert.ok(rendered.body.textContent.includes('OWNER MEETING')); assert.ok(rendered.body.textContent.includes('OWNER SUITABILITY')); }
    else {
      for (const value of ['OWNER BRING HEADING', 'OWNER PACKING', 'OWNER HIGHLIGHTS HEADING', 'OWNER HIGHLIGHT', 'OWNER RELATED CARD', 'OWNER RELATED DESCRIPTION']) assert.ok(rendered.body.textContent.includes(value), value);
      assert.ok(rendered.querySelector('[data-section-id="related"] [data-product-id]'));
    }
  }
});

test('mounted preview keeps thumbnails interactive, applies price edits immediately and scrolls only its owning window', async () => {
  const { act } = await import('react'); const { createRoot } = await import('react-dom/client');
  const shell = new Window({ url: 'https://editor.example/admin' }), preview = new Window({ url: 'https://editor.example/preview' });
  const globals = new Map(['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries({ window: shell, document: shell.document, navigator: shell.navigator, IS_REACT_ACT_ENVIRONMENT: true })) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  let shellScrolls = 0, previewScrolls = 0; shell.scrollTo = () => shellScrolls++; preview.scrollTo = () => previewScrolls++;
  try {
    for (const id of productIds) {
      let doc = createCmsSeed(); const host = preview.document.createElement('div'); preview.document.body.append(host); const root = createRoot(host), booked = [], warnings = [], originalError = console.error;
      console.error = (...args) => warnings.push(args.join(' '));
      const draw = () => createElement(CmsPreviewProvider, { document: doc }, createElement(ApprovedContentProvider, { document: doc, page: doc.pages.find(item => item.id === id) }, createElement(id === 'our-fez-tours' ? OurFezToursPage : ExperienceDetailPage, { pillar: doc.legacy.tours.find(item => item.id === id), language: 'en', onBack() {}, onNavigate() {}, onSelectExperience() {}, onBookTour: value => booked.push(value) })));
      try {
        const gallery = doc.pages.find(item => item.id === id).sections.find(item => item.id === 'gallery');
        gallery.images = structuredClone(doc.pages.find(item => item.id === 'our-fez-tours').sections.find(item => item.id === 'gallery').images.slice(0, 2));
        await act(async () => root.render(draw()));
        const thumbnails = host.querySelectorAll('[data-section-id="gallery"] button'); assert.equal(thumbnails.length, 2);
        await act(async () => thumbnails[1].click());
        assert.equal(host.querySelector('[data-section-id="gallery"] img').getAttribute('src'), doc.media.find(item => item.id === gallery.images[1].mediaId).src);
        doc = structuredClone(doc); const product = doc.products.find(item => item.id === id); product.price = { amount: 0, currency: 'MAD', basis: 'group' };
        const page = doc.pages.find(item => item.id === id); page.sections.find(item => item.id === 'gallery').images = page.sections.find(item => item.id === 'gallery').images.slice(0, 1); page.sections.find(item => item.id === 'header').title = text('LIVE BOOKING TITLE');
        await act(async () => root.render(draw()));
        assert.ok(host.querySelector(`[data-price-product-id="${id}"]`).textContent.includes('0 MAD'));
        assert.ok(host.querySelector('[data-section-id="gallery"] img').getAttribute('src'));
        await act(async () => host.querySelector(`button[data-cms-product-id="${id}"]`).click()); assert.deepEqual(booked, ['LIVE BOOKING TITLE']);
        if (id !== 'our-fez-tours') assert.equal(host.querySelectorAll('button[data-contact-action="whatsapp"]').length, 2);
        assert.deepEqual(warnings, []);
      } finally { console.error = originalError; await act(async () => root.unmount()); host.remove(); }
    }
    assert.equal(shellScrolls, 0, 'editor parent never scrolls'); assert.ok(previewScrolls > 0, 'experience navigation targets the iframe owning window');
  } finally {
    for (const [key, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
    await shell.happyDOM.close(); await preview.happyDOM.close();
  }
});

test('approved product booking displays canonical live price currency and basis, never stale equivalent as main price', () => {
  for (const id of productIds) {
    const doc = createCmsSeed(), product = doc.products.find(item => item.id === id);
    assert.ok(product, id);
    product.price = { amount: 321, currency: 'USD', basis: 'vehicle' };
    product.practicalInfo = { ...product.practicalInfo, priceMAD: 1900, priceEUR: 170, priceUSD: 191 };
    const page = render(doc, id);
    const booking = page.querySelector('[data-section-id="booking"]');
    assert.ok(booking, `${id}: approved sidebar carries its CMS section marker`);
    assert.ok(booking.textContent.includes('$321'), `${id}: canonical amount/currency`);
    assert.ok(booking.textContent.includes('per vehicle'), `${id}: canonical basis`);
    assert.ok(booking.textContent.includes('1900 MAD'), `${id}: manual MAD equivalent`);
    assert.ok(booking.textContent.includes('€170'), `${id}: manual EUR equivalent`);
    assert.ok(!booking.textContent.includes('$191'), `${id}: stale primary-currency equivalent is omitted`);
    assert.ok(booking.querySelector(`button[data-cms-product-id="${id}"]`));
    assert.ok(booking.querySelector(`[data-price-product-id="${id}"]`), `${id}: visible price target supports immediate editing`);
  }
});
