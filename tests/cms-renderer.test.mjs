import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { register } from 'tsx/esm/api';

register();
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.css')) return { format: 'module', source: 'export default "";', shortCircuit: true };
    return nextLoad(url, context);
  },
});

const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { PageRenderer } = await import('../src/cms/PageRenderer.tsx');
await (await import('../src/cms/ApprovedPageRenderer.tsx')).preloadApprovedLayouts();

const SECTION_TYPES = ['hero', 'richText', 'cardGrid', 'productGrid', 'gallery', 'benefits', 'cta', 'reviews', 'faq', 'team', 'itinerary', 'inclusions', 'practicalInfo', 'contact'];
const text = (en, fr = en, es = en) => ({ en, fr, es });
const render = (document, page, language = 'en', handlers = {}) => renderToStaticMarkup(createElement(PageRenderer, {
  document, page, language, onNavigate: handlers.onNavigate || (() => {}), onBook: handlers.onBook || (() => {}),
}));
const sectionIds = html => [...html.matchAll(/data-section-id="([^"]+)"/g)].map(match => match[1]);
const decode = value => value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');

test('approved seed pages render their enabled sections in document order in every locale', () => {
  const document = createCmsSeed();
  for (const page of document.pages.filter(item => item.enabled)) {
    for (const language of ['en', 'fr', 'es']) {
      const html = render(document, page, language);
      const contentLanguage = page.localeFallback?.[language] || language;
      assert.deepEqual(sectionIds(html), page.sections.filter(section => section.enabled).map(section => section.id), `${page.id}.${language}`);
      assert.equal((html.match(/<h1\b/g) || []).length, 1, `${page.id}.${language} has one page heading`);
      assert.ok(html.includes(`lang="${contentLanguage}"`), `${page.id}.${language}`);
      assert.ok(html.includes('dir="ltr"'), `${page.id}.${language}`);
      assert.equal(/javascript:/i.test(html), false, page.id);
      assert.equal(/<script\b/i.test(html), false, page.id);
      if (page.kind !== 'product') assert.equal(/data-action="book"/.test(html), false, `${page.id} is not a booking page`);
      if (page.kind === 'product' && page.sections.some(section => section.enabled && section.type === 'cta' && section.variant === 'booking')) {
        assert.match(html, /data-action="book"/, page.id);
        assert.match(html, new RegExp(`data-product-id="${page.productId}"`), page.id);
      }
      if (language === 'en') {
        for (const match of html.matchAll(/<img\b[^>]*\bsrc="([^"]*)"/g)) {
          const src = decode(match[1]);
          assert.ok(document.media.some(media => media.src === src), `${page.id} image ${src} is not in the media library`);
        }
      }
    }
  }
});

test('seed routes retain the authored hosted layouts rather than generic CMS replacements', () => {
  const document = createCmsSeed();
  const html = id => render(document, document.pages.find(page => page.id === id));
  const home = html('home');
  assert.match(home, /data-section-id="hero"[^>]*data-variant="banner"/);
  assert.match(home, /min-h-\[580px\]/);
  assert.match(home, /lg:min-h-\[660px\]/);
  assert.match(home, /backdrop-blur-md/);
  assert.doesNotMatch(home, /cms-hero-banner/);
  const product = html('our-fez-tours');
  assert.match(product, /id="our-fez-tour-gallery"/);
  assert.match(product, /id="our-fez-tour-booking"/);
  assert.match(product, /lg:sticky lg:top-24/);
  assert.match(product, /id="our-fez-tour-itinerary"/);
  assert.doesNotMatch(product, /cms-gallery-carousel|cms-cta-booking/);
  for (const id of ['fez', 'travel-tips', 'about']) {
    assert.match(html(id), /data-section-id=/);
    assert.doesNotMatch(html(id), /cms-hero-banner|cms-prose-story/);
  }
});

test('every section type renders from document data', () => {
  const document = createCmsSeed();
  const product = document.products.find(item => item.published !== false);
  const page = {
    id: 'renderer-fixture', slug: 'renderer-fixture', kind: 'landing', enabled: true,
    title: text('All sections'), seo: { title: text('All sections'), description: text('') },
    sections: [
      { id: 'hero', type: 'hero', variant: 'split', enabled: true, title: text('Split hero'), links: [], image: { mediaId: document.media[0].id, alt: text('Hero') } },
      { id: 'story', type: 'richText', variant: 'story', enabled: true, blocks: [{ type: 'paragraph', text: text('Story paragraph') }, { type: 'heading', text: text('Subhead') }, { type: 'quote', text: text('A quote') }, { type: 'list', items: text(['One']) }, { type: 'link', text: text('Safe link'), href: 'https://example.com/guide' }] },
      { id: 'cards', type: 'cardGrid', variant: 'overview', enabled: true, cards: [{ id: 'card', title: text('Card'), description: text('Copy'), pageId: 'home' }] },
      { id: 'products', type: 'productGrid', variant: 'featured', enabled: true, productIds: [product.id] },
      { id: 'photos', type: 'gallery', variant: 'grid', enabled: true, images: [{ mediaId: document.media[0].id, alt: text('Photo') }] },
      { id: 'benefits', type: 'benefits', variant: 'grid', enabled: true, items: [{ title: text('Benefit'), description: text('Why') }] },
      { id: 'invite', type: 'cta', variant: 'banner', enabled: true, links: [{ id: 'go-home', label: text('Home'), enabled: true, pageId: 'home' }] },
      { id: 'reviews', type: 'reviews', variant: 'grid', enabled: true, reviewIds: [document.reviews[0].id] },
      { id: 'faq', type: 'faq', variant: 'accordion', enabled: true, faqIds: [document.faqs[0].id] },
      { id: 'team', type: 'team', variant: 'story', enabled: true, teamIds: [document.teamMembers[0].id] },
      { id: 'stops', type: 'itinerary', variant: 'list', enabled: true, stops: [{ title: text('Stop'), description: text('Walk') }] },
      { id: 'included', type: 'inclusions', variant: 'list', enabled: true, included: text(['Water']), excluded: text(['Tickets']) },
      { id: 'facts', type: 'practicalInfo', variant: 'facts', enabled: true, items: [{ title: text('Duration'), description: text('3 hours') }] },
      { id: 'contact', type: 'contact', variant: 'panel', enabled: true, links: [{ id: 'mail', label: text('Email'), enabled: true, href: 'mailto:guide@example.com' }] },
      { id: 'hidden-section', type: 'benefits', variant: 'strip', enabled: false, items: [{ title: text('HIDDEN SECTION XYZ'), description: text('') }] },
    ],
  };
  const html = render(document, page);
  assert.deepEqual(sectionIds(html), page.sections.filter(section => section.enabled).map(section => section.id));
  for (const type of SECTION_TYPES) assert.match(html, new RegExp(`data-section-type="${type}"`), type);
  assert.equal(html.includes('HIDDEN SECTION XYZ'), false);
  assert.match(html, /href="https:\/\/example.com\/guide"/);
  assert.match(html, /href="mailto:guide@example.com"/);
  assert.equal(/data-action="book"/.test(html), false);
  assert.ok(html.includes(product.title.en));
  assert.ok(html.includes(document.faqs[0].question.en));
  assert.ok(html.includes(document.teamMembers[0].name));
});

test('hidden pages, products, reviews and links do not render their content', () => {
  const hiddenPage = createCmsSeed();
  const home = hiddenPage.pages.find(page => page.id === 'home');
  home.enabled = false;
  assert.equal(render(hiddenPage, home), '');

  const hiddenProductPage = createCmsSeed();
  const product = hiddenProductPage.products.find(item => item.id === 'our-fez-tours');
  product.published = false;
  assert.equal(render(hiddenProductPage, hiddenProductPage.pages.find(page => page.id === product.id)), '');

  const filtered = createCmsSeed();
  const omitted = filtered.products.find(item => item.published !== false);
  omitted.title = text('HIDDEN PRODUCT TITLE XYZ');
  omitted.published = false;
  const landing = filtered.pages.find(page => page.id === 'home');
  landing.sections.push({ id: 'hidden-products', type: 'productGrid', variant: 'overview', enabled: true, productIds: [omitted.id] });
  const filteredHtml = render(filtered, landing);
  assert.equal(filteredHtml.includes('HIDDEN PRODUCT TITLE XYZ'), false);
  assert.match(filteredHtml, /data-section-id="hidden-products"/);

  const reviews = createCmsSeed();
  const review = reviews.reviews.find(item => item.enabled);
  review.enabled = false;
  review.quote = 'HIDDEN REVIEW QUOTE XYZ';
  assert.equal(render(reviews, reviews.pages.find(page => page.id === 'home')).includes('HIDDEN REVIEW QUOTE XYZ'), false);

  const links = createCmsSeed();
  links.pages.find(page => page.id === 'fez').enabled = false;
  const linked = render(links, links.pages.find(page => page.id === 'home'));
  assert.equal(linked.includes('data-page-id="fez"'), false);
});

test('edited CMS text replaces source text and is not overwritten', () => {
  const document = createCmsSeed();
  const home = document.pages.find(page => page.id === 'home');
  const hero = home.sections.find(section => section.id === 'hero');
  const original = hero.title.en;
  hero.title = { ...hero.title, en: 'EDITED HERO TITLE XYZ' };
  const html = render(document, home, 'en');
  assert.ok(html.includes('EDITED HERO TITLE XYZ'));
  assert.equal(html.includes(original), false);
  assert.ok(render(document, home, 'fr').includes(hero.title.fr));

  const productPage = document.pages.find(page => page.id === 'our-fez-tours');
  document.products.find(item => item.id === 'our-fez-tours').price = { amount: 321, currency: 'EUR', basis: 'person' };
  document.uiCopy['ui.common.bookNow'] = text('EDITED BOOK LABEL');
  const productHtml = render(document, productPage);
  assert.ok(productHtml.includes('€321'));
  assert.ok(productHtml.includes('EDITED BOOK LABEL'));
  assert.equal(productHtml.includes('Book This Tour'), false);
});

test('Spanish pages use genuine Spanish copy and left-to-right direction', () => {
  const document = createCmsSeed();
  const home = document.pages.find(page => page.id === 'home');
  const hero = home.sections.find(section => section.id === 'hero');
  assert.notEqual(hero.title.fr, hero.title.en);
  assert.notEqual(hero.title.es, hero.title.en);
  assert.ok(render(document, home, 'fr').includes(hero.title.fr));
  const spanish = render(document, home, 'es');
  assert.match(spanish, /lang="es"/);
  assert.match(spanish, /dir="ltr"/);
  assert.ok(spanish.includes(hero.title.es));
  for (const page of document.pages) assert.equal(page.localeFallback?.es, undefined, page.id);
  // Editors may explicitly declare a different content language; never a silent fallback.
  home.localeFallback = { fr: 'en' };
  const fallbackHtml = render(document, home, 'fr');
  assert.match(fallbackHtml, /lang="en"/);
  assert.ok(fallbackHtml.includes(hero.title.en));
});

test('media is resolved by mediaId and unsafe markup or links are not injected', () => {
  const document = createCmsSeed();
  const home = document.pages.find(page => page.id === 'home');
  const hero = home.sections.find(section => section.id === 'hero');
  const html = render(document, home);
  const src = decode(html.match(/<img\b[^>]*\bsrc="([^"]+)"/)[1]);
  const media = document.media.find(item => item.src === src);
  media.src = 'javascript:alert(1)';
  hero.title = { ...hero.title, en: '<script>alert(1)</script>' };
  hero.links = [...hero.links, { id: 'bad-link', label: text('Bad'), enabled: true, href: 'javascript:alert(1)' }];
  const story = home.sections.find(section => section.type === 'richText') || home.sections[1];
  home.sections.splice(1, 0, { id: 'unsafe-copy', type: 'richText', variant: 'story', enabled: true, blocks: [{ type: 'link', text: text('Bad rich link'), href: 'javascript:alert(2)' }] });
  const again = render(document, home);
  assert.equal(/javascript:/i.test(again), false);
  assert.equal(/<script\b/i.test(again), false);
  assert.ok(again.includes('&lt;script&gt;'));
  assert.equal(again.includes(src), false);
  hero.image = { mediaId: 'missing-media', alt: text('Missing') };
  const missing = render(document, home);
  const heroHtml = missing.slice(0, missing.indexOf('data-section-id="trust"'));
  assert.equal(/<img\b/.test(heroHtml), false);
  assert.equal(story && again.includes('Bad rich link'), true);
});

test('editorial pages never render a booking CTA, even if one is injected', () => {
  const document = createCmsSeed();
  const editorial = document.pages.find(page => page.kind === 'editorial' && page.enabled);
  editorial.sections.push({ id: 'forced-book', type: 'cta', variant: 'booking', enabled: true, productId: 'our-fez-tours', title: text('Book secretly'), links: [] });
  const html = render(document, editorial);
  assert.equal(/data-action="book"/.test(html), false);
  assert.equal(html.includes('forced-book'), false);
  assert.equal(html.includes('Book secretly'), false);

  const productPage = document.pages.find(page => page.id === 'our-fez-tours');
  const booking = productPage.sections.find(section => section.variant === 'booking');
  booking.productId = document.products.find(product => product.id !== productPage.productId).id;
  const mismatched = render(document, productPage);
  assert.equal(/data-action="book"/.test(mismatched), false);
  assert.equal(mismatched.includes('data-section-id="booking"'), false);
});
