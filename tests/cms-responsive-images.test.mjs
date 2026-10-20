import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { register } from 'tsx/esm/api';
register();
const images = await import('../src/cms/optimized-image.ts');
const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('src/cms/optimized-images.json', root), 'utf8'));
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { SectionRenderer } = await import('../src/cms/SectionRenderer.tsx');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { rewriteRouteHtml } = await import('../worker/seo.ts');
const { resolveRoute } = await import('../src/cms/routing.ts');
const decode = value => value?.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1].toLowerCase(), decode(match[2])]));
const renderSection = (document, page, section, language = 'en') => renderToStaticMarkup(createElement(SectionRenderer, { document, page, section, language, titleTag: 'h1', onNavigate() {}, onBook() {} }));

test('renderer and Worker share hero candidates/sizes and remove stale image preloads in every locale', () => {
  const document = createCmsSeed();
  const page = document.pages.find(page => page.id === 'home');
  const hero = page.sections.find(section => section.type === 'hero');
  for (const variant of ['banner', 'split']) for (const language of ['en', 'fr', 'es']) {
    hero.variant = variant;
    const rendered = renderSection(document, page, hero, language);
    const img = attrs(rendered.match(/<img\b[^>]*>/)[0]);
    assert.ok(img.srcset?.includes('320w'), 'renderer must use responsive width candidates');
    assert.equal(img.sizes, `${manifest[img.src].width}px`);
    const route = resolveRoute(new URL(language === 'en' ? 'https://example.test/' : `https://example.test/${language}/`), document);
    const template = '<html><head><link rel="preload" as="font" href="/font.woff2"><link rel="preload" as="image" href="/images/stale-original.jpg"><link rel="preload" as="image" href="/images/optimized/b0e0041a37ca4aa6b153.webp"></head><body></body></html>';
    const html = rewriteRouteHtml(template, document, route, 'https://example.test');
    const preloads = [...html.matchAll(/<link\b[^>]*>/g)].map(match => attrs(match[0])).filter(tag => tag.rel === 'preload' && tag.as === 'image');
    assert.equal(preloads.length, 1, 'no stale/duplicate hero preload');
    assert.equal(preloads[0].imagesrcset, img.srcset);
    assert.equal(preloads[0].imagesizes, img.sizes);
    assert.equal(preloads[0].href, images.optimizedImageSrc(img.src));
    assert.equal(preloads[0].fetchpriority, 'high');
    assert.ok(html.includes('/font.woff2'), 'preserve other preloads');
  }
});

test('all renderer image families preserve alt, dimensions, focal point and authenticated/remote URLs', () => {
  const document = createCmsSeed();
  const media = document.media[0];
  media.width = 1600; media.height = 1200; media.focalPoint = { x: .25, y: .75 };
  const image = { mediaId: media.id, alt: { en: 'Photo "approved" & <exact>', fr: 'Photo FR', es: 'Foto ES' } };
  const page = document.pages.find(page => page.id === 'home');
  const product = document.products[0]; product.image = media.src; product.imageAlt = image.alt;
  const member = document.teamMembers[0]; member.avatarUrl = media.src; member.name = image.alt.en;
  const sections = [
    { type: 'hero', variant: 'banner', image, links: [] },
    { type: 'cardGrid', variant: 'featured', cards: [{ id: 'a', image, title: image.alt, description: image.alt }] },
    { type: 'productGrid', variant: 'featured', productIds: [product.id] },
    { type: 'gallery', variant: 'story', images: [image] },
    { type: 'cta', variant: 'split', image, links: [] },
    { type: 'team', variant: 'story', teamIds: [member.id] },
  ];
  const original = media.src;
  for (const src of [original, '/api/admin/media/upload-12345678-1234-1234-1234-123456789abc.webp', 'https://example.test/photo.jpg?x=1&y=2']) {
    media.src = src; product.image = src; member.avatarUrl = src;
    for (const section of sections) {
      const rendered = renderSection(document, page, { id: 'image-test', enabled: true, ...section });
      const tag = rendered.match(/<img\b[^>]*>/)?.[0];
      assert.ok(tag, section.type);
      const img = attrs(tag);
      assert.equal(img.src, src, section.type);
      assert.equal(img.alt, image.alt.en, section.type);
      assert.equal(img.width, '1600'); assert.equal(img.height, '1200');
      assert.match(img.style, /object-position:25% 75%/);
      if (src === original) {
        assert.ok(img.srcset?.includes('320w'), section.type);
        assert.ok(!img.srcset.includes(original));
        if (section.type === 'gallery') assert.equal(img.sizes, `${manifest[original].width}px`);
      } else assert.equal(img.srcset, undefined, section.type);
    }
  }
});

test('Worker preloads only manifest photos, not arbitrary CMS URLs or minimal heroes', () => {
  const document = createCmsSeed();
  const page = document.pages.find(page => page.id === 'home');
  const hero = page.sections.find(section => section.type === 'hero');
  const media = document.media.find(item => item.id === hero.image.mediaId);
  for (const src of ['https://example.test/photo.jpg?a=1&b=2', '/api/admin/media/upload-12345678-1234-1234-1234-123456789abc.webp', '/images/photo.jpg" onload="alert(1)']) {
    media.src = src;
    const html = rewriteRouteHtml('<html><head></head><body></body></html>', document, resolveRoute(new URL('https://example.test/'), document), 'https://example.test');
    assert.doesNotMatch(html.split('</head>')[0], /as="image"|onload=|alert\(1\)/);
  }
});

test('tall cover slots retain native quality instead of stretching width-only thumbnails', () => {
  const src = '/images/real/about_us_image7.jpg';
  const entry = manifest[src];
  for (const viewport of [320, 390]) {
    const props = images.responsiveImageProps(src, '100vw', true);
    const declared = slotWidth(props.sizes, viewport);
    const candidate = entry.candidates.find(item => item.width >= declared) ?? entry.candidates.at(-1);
    const height = entry.height * candidate.width / entry.width;
    assert.ok(height >= 626, `${viewport}px viewport: ${candidate.width}px thumbnail must not stretch into a 626px cover`);
  }
});

test('landscape card candidates cover both dimensions of the fixed 4:3 slot', () => {
  const src = '/images/real/tips_getting_around_image1.jpg';
  const entry = manifest[src];
  const width = (1280 - 3 * 16) / 4;
  const sizes = images.imageSizes(1280, 'card', 4, false, src);
  const declared = slotWidth(sizes, 1440);
  const selected = entry.candidates.find(candidate => candidate.width >= declared) ?? entry.candidates.at(-1);
  assert.ok(selected.width >= width && entry.height * selected.width / entry.width >= width * 3 / 4, 'a width-only 320px candidate is too short for the 308×231 card');
});

test('native candidates never transfer more bytes than their unchanged original', async () => {
  for (const [src, entry] of Object.entries(manifest)) {
    const original = await readFile(new URL(`public${src}`, root));
    const native = await readFile(new URL(`public${entry.candidates.at(-1).src}`, root));
    assert.ok(native.length <= original.length, `${src}: native conversion must not increase transfer size`);
  }
});

const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('generated responsive candidates describe real pixels, preserve source identity and never upscale', async () => {
  for (const [src, entry] of Object.entries(manifest)) {
    assert.ok(Array.isArray(entry.candidates), `${src} needs width candidates, not a single 1x derivative`);
    const original = await readFile(new URL(`public${src}`, root));
    const metadata = await sharp(original).metadata();
    assert.equal(entry.sourceHash, hash(original), src);
    assert.equal(entry.width, metadata.autoOrient.width, src);
    assert.equal(entry.height, metadata.autoOrient.height, src);
    assert.ok(entry.candidates.length >= (entry.width > 320 ? 2 : 1), src);
    if (entry.width >= 640) assert.ok(entry.candidates.some(candidate => candidate.width === 640), '640px candidate avoids sending 800px to ~360px cards at DPR 1.75');
    let previous = 0;
    for (const candidate of entry.candidates) {
      const bytes = await readFile(new URL(`public${candidate.src}`, root));
      const actual = await sharp(bytes).metadata();
      assert.equal(candidate.width, actual.autoOrient.width, candidate.src);
      assert.ok(actual.autoOrient.width <= entry.width && actual.autoOrient.height <= entry.height, candidate.src);
      assert.ok(candidate.width > previous, src);
      if (candidate.src.startsWith('/images/optimized/')) assert.equal(candidate.src, `/images/optimized/${hash(bytes).slice(0, 20)}.webp`);
      else assert.equal(hash(bytes), entry.sourceHash, 'native fallback is the exact original');
      assert.ok(Math.abs(actual.autoOrient.height - entry.height * actual.autoOrient.width / entry.width) <= 1, 'no crop');
      previous = candidate.width;
    }
    assert.equal(previous, entry.width, 'retain full source width for wide slots');
    assert.equal(images.optimizedImageSrc(src), entry.candidates.at(-1).src, 'legacy API still returns a string');
  }
});

test('responsive metadata uses only derivative width descriptors and leaves private/unknown sources unchanged', () => {
  assert.equal(typeof images.responsiveImageProps, 'function');
  const src = '/images/real/about_us_image7.jpg';
  const props = images.responsiveImageProps(src, '100vw');
  assert.equal(props.src, src, 'preserve fallback and existing CMS source identity');
  assert.equal(props.srcSet, manifest[src].candidates.map(item => `${item.src} ${item.width}w`).join(', '));
  assert.equal(props.sizes, '100vw');
  assert.ok(!props.srcSet.includes(src));
  for (const unknown of ['/api/admin/media/private-photo.webp', 'https://remote.example/photo.jpg?x=1&y=2', '/images/missing.jpg', '__proto__', 'constructor']) {
    assert.deepEqual(images.responsiveImageProps(unknown, '100vw'), { src: unknown });
    assert.equal(images.optimizedImageSrc(unknown), unknown);
  }
});

// Evaluate only the numeric sizes grammar emitted by this helper, without a browser/build.
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
    const expression = (media?.[3] ?? part).replace(/([\d.]+)vw/g, (_, n) => String(Number(n) * viewport / 100)).replace(/([\d.]+)rem/g, (_, n) => String(Number(n) * 16)).replace(/px/g, '').replace(/calc\(/g, '(').replace(/min\(/g, 'Math.min(');
    assert.match(expression, /^[\d\s.+*/(),\-Mathimn]+$/);
    return Function(`return ${expression}`)();
  }
  assert.fail('no matching size');
}

test('sizes bound full bleed, split and auto-fit cards across CMS containers and visible counts', () => {
  assert.equal(typeof images.imageSizes, 'function');
  const css = new URL('src/cms/cms-renderer.css', root);
  return readFile(css, 'utf8').then(text => {
    assert.match(text, /minmax\(min\(100%, 16\.5rem\)/);
    assert.match(text, /minmax\(min\(100%, 20rem\)/);
    assert.match(text, /@media \(max-width: 720px\)/);
    for (const container of [960, 1280, 1600]) for (const viewport of [320, 390, 544, 720, 721, 960, 1024, 1280, 1440, 1920]) {
      const wrap = Math.min(viewport - 32, container);
      assert.equal(slotWidth(images.imageSizes(container, 'banner'), viewport), viewport);
      assert.equal(slotWidth(images.imageSizes(container, 'wide'), viewport), wrap);
      const split = viewport <= 720 ? wrap : (wrap - 24) * .475;
      assert.ok(Math.abs(slotWidth(images.imageSizes(container, 'split'), viewport) - split) < .01);
      for (const count of [1, 2, 3, 8]) for (const featured of [false, true]) {
        const columns = Math.min(count, Math.max(1, Math.floor((wrap + 16) / ((featured ? 320 : 264) + 16))));
        const actual = (wrap - (columns - 1) * 16) / columns;
        const declared = slotWidth(images.imageSizes(container, 'card', count, featured), viewport);
        assert.ok(Math.abs(declared - actual) < .01, `${container}/${viewport}/${count}/${featured}: ${declared} != ${actual}`);
      }
    }
    for (const invalid of [NaN, Infinity, '1280\" onload=\"bad']) assert.equal(images.imageSizes(invalid, 'wide'), images.imageSizes(1280, 'wide'));
  });
});
