import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { register } from 'tsx/esm/api';
register();
registerHooks({ load(url, context, next) { return url.endsWith('.css') ? { format: 'module', source: 'export default ""', shortCircuit: true } : next(url, context); } });
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { PageRenderer } = await import('../src/cms/PageRenderer.tsx');
const { HomePage } = await import('../src/pages/HomePage.tsx');
const { SectionCard } = await import('../src/components/SectionCard.tsx');
const { ApprovedContentProvider } = await import('../src/cms/approved-content.tsx');
const { CmsPreviewProvider } = await import('../src/context/CmsContext.tsx');
const { authoredCardImageSizes, responsiveImageProps } = await import('../src/cms/optimized-image.ts');
const { preloadApprovedLayouts } = await import('../src/cms/ApprovedPageRenderer.tsx');
await preloadApprovedLayouts();
const manifest = JSON.parse(await readFile(new URL('../src/cms/optimized-images.json', import.meta.url), 'utf8'));
const decode = value => value?.replaceAll('&amp;', '&').replaceAll('&quot;', '"');
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1].toLowerCase(), decode(match[2])]));
const photos = html => [...html.matchAll(/<img\b[^>]*>/g)].map(match => attrs(match[0]));
const sectionCardPhotos = html => [...html.matchAll(/<div\b[^>]*class="relative aspect-4\/3 w-full[^>]*>\s*(<img\b[^>]*>)/g)].map(match => attrs(match[1]));
const renderCard = (document, pageId, pillar, language = 'en') => renderToStaticMarkup(createElement(ApprovedContentProvider, { document, page: document.pages.find(page => page.id === pageId), language }, createElement(SectionCard, { pillar, language, onExplore() {}, onBookTour() {} })));
const render = (document, pageId = 'home', language = 'en') => renderToStaticMarkup(createElement(PageRenderer, { document, page: document.pages.find(page => page.id === pageId), language, onNavigate() {}, onBook() {} }));
const quickPhotos = html => photos(html.match(/<section\b[^>]*data-section-id="quick-navigation"[^>]*>([\s\S]*?)<\/section>/)[1]);

// Evaluate only emitted CSS sizes math; this is not an emulation of browser resource heuristics.
function slotWidth(sizes, viewport) {
  let depth = 0;
  const parts = sizes.replace(/[(),]/g, char => {
    if (char === '(') depth++;
    if (char === ')') depth--;
    return char === ',' && depth === 0 ? ';' : char;
  }).split(';').map(part => part.trim());
  for (const part of parts) {
    const media = /^\(min-width: ([\d.]+)(rem|px)\) (.*)$/.exec(part);
    if (media && viewport < Number(media[1]) * (media[2] === 'rem' ? 16 : 1)) continue;
    const expression = (media?.[3] ?? part).replace(/([\d.]+)vw/g, (_, n) => String(Number(n) * viewport / 100)).replace(/([\d.]+)rem/g, (_, n) => String(Number(n) * 16)).replace(/px/g, '').replace(/calc\(/g, '(').replace(/min\(/g, 'Math.min(').replace(/max\(/g, 'Math.max(');
    assert.match(expression, /^[\d\s.+*/(),\-Mathimnax]+$/);
    return Function(`return ${expression}`)();
  }
  assert.fail('no matching size');
}

function cardWidth(viewport, layout) {
  const padding = viewport >= 1024 ? 64 : viewport >= 640 ? 48 : 32;
  const columns = layout === 'fez' ? (viewport >= 1280 ? 4 : viewport >= 768 ? 2 : 1)
    : layout === 'travel-tips' ? (viewport >= 768 ? 3 : 1)
    : ['home', 'quick-navigation'].includes(layout) ? (viewport >= 1024 ? 3 : viewport >= 768 ? 2 : 1)
    : viewport >= 768 ? 2 : 1;
  const gap = ['home', 'quick-navigation'].includes(layout) ? 24 : 32;
  return (Math.min(1280, viewport) - padding - (columns - 1) * gap) / columns - 2; // Card border, not image width.
}

function checkSelection(photo, viewport, layout, dpr = 1) {
  const entry = manifest[photo.src];
  const width = cardWidth(viewport, layout);
  const height = layout === 'quick-navigation' ? 176 : width * 3 / 4;
  const required = Math.max(width, height * entry.width / entry.height);
  const declared = slotWidth(photo.sizes, viewport);
  assert.ok(Math.abs(declared - required) < .01, `${layout}/${photo.src}/${viewport}: sizes ${declared} should describe cover width ${required}`);
  const selected = entry.candidates.find(candidate => candidate.width >= declared * dpr) ?? entry.candidates.at(-1);
  assert.ok(selected.width <= entry.width, 'never upsize the source');
  if (entry.width >= required * dpr) {
    assert.ok(selected.width >= width * dpr && entry.height * selected.width / entry.width + 1 >= height * dpr, 'candidate must cover both slot dimensions at this DPR');
  } else assert.equal(selected.width, entry.width, 'source-resolution ceiling must retain the native file');
  return selected;
}

test('actual HomePage quick-navigation cards select existing smaller cover-adequate candidates', () => {
  const document = createCmsSeed();
  const images = quickPhotos(render(document));
  assert.equal(images.length, 5);
  for (const photo of images) for (const viewport of [320, 390, 412, 639, 640, 767, 768, 1023, 1024, 1279, 1280, 1440]) {
    for (const dpr of [1, 1.75, 2, 3]) checkSelection(photo, viewport, 'quick-navigation', dpr);
  }
  const photo = images.find(image => image.src === '/images/daytrip-chefchaouen/blue-alley.webp');
  assert.equal(checkSelection(photo, 412, 'quick-navigation', 1.75).width, 800, 'the audited mobile slot should not request native 1100w');
});

test('actual authored SectionCards describe each home and category grid, not their native bitmap width', () => {
  const document = createCmsSeed();
  for (const pageId of ['home', 'fez', 'day-trips', 'food-tours', 'travel-tips']) {
    const html = render(document, pageId);
    // Only SectionCard has this exact authored 4:3 image-slot class.
    const images = sectionCardPhotos(html);
    assert.ok(images.length > 0, `exercise real ${pageId} SectionCards`);
    for (const photo of images) for (const viewport of [320, 390, 412, 639, 640, 767, 768, 1023, 1024, 1279, 1280, 1440]) {
      for (const dpr of [1, 1.75, 2, 3]) checkSelection(photo, viewport, pageId, dpr);
    }
  }
});


test('wide, portrait and limited-resolution photos retain adequate cover selection through authored paths', () => {
  for (const src of ['/images/fez-medina/medina-12.jpg', '/images/fez-medina/medina-08.jpg', '/images/real/about_us_image1.jpg', '/images/food-tasting-walk/wood-oven.webp']) {
    const document = createCmsSeed();
    const quick = document.pages.find(page => page.id === 'home').sections.find(section => section.id === 'quick-navigation');
    document.media.find(media => media.id === quick.cards[0].image.mediaId).src = src;
    const quickPhoto = quickPhotos(render(document))[0];
    assert.equal(quickPhoto.src, src);
    const pillar = { ...document.products[0], image: src };
    for (const viewport of [320, 390, 412, 768, 1024, 1280, 1440, 1920]) for (const dpr of [1, 1.75, 2, 3]) checkSelection(quickPhoto, viewport, 'quick-navigation', dpr);
    for (const pageId of ['home', 'fez', 'day-trips', 'food-tours', 'travel-tips']) {
      const photo = photos(renderCard(document, pageId, pillar))[0];
      for (const viewport of [320, 390, 412, 768, 1024, 1280, 1440, 1920]) for (const dpr of [1, 1.75, 2, 3]) checkSelection(photo, viewport, pageId, dpr);
    }
  }
});

test('card photo identity, localized alt and lazy/async attributes survive; rendering does not mutate CMS data', () => {
  const document = createCmsSeed();
  const before = JSON.stringify(document);
  const quick = document.pages.find(page => page.id === 'home').sections.find(section => section.id === 'quick-navigation');
  for (const language of ['en', 'fr', 'es']) {
    const actual = quickPhotos(render(document, 'home', language));
    assert.deepEqual(actual.map(photo => photo.src), quick.cards.map(card => document.media.find(media => media.id === card.image.mediaId).src));
    assert.deepEqual(actual.map(photo => photo.alt), quick.cards.map(card => card.image.alt[language]));
    for (const pageId of ['home', 'fez', 'day-trips', 'food-tours', 'travel-tips']) for (const photo of sectionCardPhotos(render(document, pageId, language))) {
      assert.equal(photo.loading, 'lazy');
      assert.equal(photo.decoding, 'async');
      assert.equal(photo.referrerpolicy, 'no-referrer');
      assert.equal(photo.srcset, manifest[photo.src].candidates.map(candidate => `${candidate.src} ${candidate.width}w`).join(', '));
    }
    const pillar = { ...document.products[0], imageAlt: { en: 'Exact EN', fr: 'Exact FR', es: 'Exact ES' } };
    const photo = photos(renderCard(document, 'fez', pillar, language))[0];
    assert.equal(photo.src, pillar.image);
    assert.equal(photo.alt, pillar.imageAlt[language]);
  }
  assert.equal(JSON.stringify(document), before, 'never mutate saved content/media or generate derivatives at render time');
});

test('unknown, remote, upload and authenticated-private card URLs remain unchanged without fabricated metadata', () => {
  for (const src of ['/api/admin/media/upload-12345678-1234-1234-1234-123456789abc.webp', '/media/upload-12345678-1234-1234-1234-123456789abc.webp', 'https://example.test/photo.jpg?x=1&y=2', '/images/not-built.jpg', '__proto__', 'constructor']) {
    const document = createCmsSeed();
    const quick = document.pages.find(page => page.id === 'home').sections.find(section => section.id === 'quick-navigation');
    document.media.find(media => media.id === quick.cards[0].image.mediaId).src = src;
    const pillar = { ...document.products[0], image: src };
    const actual = [photos(renderCard(document, 'fez', pillar))[0]];
    // The existing CMS URL validator (not the sizing helper) rejects prototype-like non-URLs.
    if (!['__proto__', 'constructor'].includes(src)) actual.push(quickPhotos(render(document))[0]);
    assert.deepEqual(responsiveImageProps(src, authoredCardImageSizes(src, 'home')), { src });
    for (const photo of actual) {
      assert.equal(photo.src, src);
      assert.equal(photo.srcset, undefined);
      assert.equal(photo.sizes, undefined);
      assert.equal(photo.loading, 'lazy');
      assert.equal(photo.decoding, 'async');
    }
  }
});

test('hidden quick-navigation pages and unpublished featured products remain absent', () => {
  const document = createCmsSeed();
  const home = document.pages.find(page => page.id === 'home');
  const quick = home.sections.find(section => section.id === 'quick-navigation');
  const featured = home.sections.find(section => section.id === 'featured');
  const hiddenQuick = quick.cards[0];
  const hiddenFeatured = featured.cards.find(card => document.products.some(product => product.id === card.pageId));
  const beforeCount = sectionCardPhotos(render(document)).length;
  hiddenQuick.image.alt = { en: 'Hidden quick photo', fr: 'Hidden quick photo', es: 'Hidden quick photo' };
  hiddenFeatured.image.alt = { en: 'Hidden featured photo', fr: 'Hidden featured photo', es: 'Hidden featured photo' };
  document.pages.find(page => page.id === hiddenQuick.pageId).enabled = false;
  document.products.find(product => product.id === hiddenFeatured.pageId).published = false;
  const before = JSON.stringify(document);
  for (const language of ['en', 'fr', 'es']) {
    const html = render(document, 'home', language);
    assert.equal(quickPhotos(html).length, quick.cards.length - 1);
    assert.doesNotMatch(html, /Hidden quick photo|Hidden featured photo/);
    assert.equal(sectionCardPhotos(html).length, beforeCount - 1);
  }
  assert.equal(JSON.stringify(document), before);
});

test('legacy HomePage uses its own featured grid even when a product belongs to another category', () => {
  const document = createCmsSeed();
  const html = renderToStaticMarkup(createElement(CmsPreviewProvider, { document }, createElement(HomePage, { language: 'en', onNavigate() {}, onExplore() {}, onBookTour() {} })));
  const actual = sectionCardPhotos(html);
  assert.ok(actual.length > 0);
  for (const photo of actual) for (const viewport of [320, 390, 768, 1024, 1440]) checkSelection(photo, viewport, 'home', 2);
  for (const pageId of ['fez', 'day-trips', 'food-tours', 'travel-tips']) {
    const pillar = { ...document.products[0], pageId };
    const photo = photos(renderToStaticMarkup(createElement(SectionCard, { pillar, language: 'en', onExplore() {}, onBookTour() {} })))[0];
    for (const viewport of [320, 390, 768, 1024, 1440]) checkSelection(photo, viewport, pageId, 2);
  }
});

test('native hero contract and conservative unknown-layout fallback remain unchanged', () => {
  const src = '/images/real/about_us_image7.jpg';
  assert.equal(responsiveImageProps(src, '100vw', true).sizes, `${manifest[src].width}px`);
  const images = photos(render(createCmsSeed()));
  assert.equal(images[0].sizes, `${manifest[images[0].src].width}px`);
  assert.equal(images[0].loading, 'eager');
  assert.equal(images[0].fetchpriority, 'high');
  for (const viewport of [320, 390, 640, 768, 1024, 1440]) {
    const expected = Math.min(1280, viewport) - (viewport >= 1024 ? 64 : viewport >= 640 ? 48 : 32) - 2;
    assert.equal(slotWidth(authoredCardImageSizes('/images/real/about_us_image1.jpg', 'unknown-layout'), viewport), expected);
  }
});
