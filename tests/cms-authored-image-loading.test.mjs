import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { register } from 'tsx/esm/api';
register();
registerHooks({ load(url, context, next) { return url.endsWith('.css') ? { format: 'module', source: 'export default ""', shortCircuit: true } : next(url, context); } });
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { PageRenderer } = await import('../src/cms/PageRenderer.tsx');
const { rewriteRouteHtml } = await import('../worker/seo.ts');
const { resolveRoute } = await import('../src/cms/routing.ts');
const decode = value => value?.replaceAll('&amp;', '&').replaceAll('&quot;', '"');
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1].toLowerCase(), decode(match[2])]));
const render = (document, language) => renderToStaticMarkup(createElement(PageRenderer, { document, page: document.pages.find(page => page.id === 'home'), language, onNavigate() {}, onBook() {} }));

test('the actual authored homepage consumes the Worker hero preload without downloading its original again', () => {
  const document = createCmsSeed();
  for (const language of ['en', 'fr', 'es']) {
    const rendered = render(document, language);
    const hero = attrs(rendered.match(/<img\b[^>]*>/)[0]);
    const route = resolveRoute(new URL(language === 'en' ? 'https://example.test/' : `https://example.test/${language}/`), document);
    const html = rewriteRouteHtml('<html><head></head><body></body></html>', document, route, 'https://example.test');
    const preload = [...html.matchAll(/<link\b[^>]*>/g)].map(match => attrs(match[0])).find(link => link.rel === 'preload' && link.as === 'image');
    assert.ok(hero.srcset, 'test the restored HomePage, not the unused generic hero');
    assert.equal(hero.srcset, preload.imagesrcset);
    assert.equal(hero.sizes, preload.imagesizes);
    assert.equal(hero.fetchpriority, 'high');
    assert.equal(hero.loading, 'eager');
  }
});

test('below-hero authored home photographs are deferred without changing source identity or photo slots', () => {
  const document = createCmsSeed();
  const html = render(document, 'en');
  const images = [...html.matchAll(/<img\b[^>]*>/g)].map(match => attrs(match[0]));
  const photos = images.slice(1).filter(image => document.media.some(media => media.src === image.src));
  assert.ok(photos.length >= 5);
  for (const image of photos) {
    assert.equal(image.loading, 'lazy', image.src);
    assert.equal(image.decoding, 'async', image.src);
    assert.ok(image.srcset, image.src);
  }
});
