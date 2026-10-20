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

// Deliberately do not preload layouts: preload in other SSR tests hid the cold-start suspension.
test('the already-bundled homepage paints its authored hero without a loading-only first frame', () => {
  const document = createCmsSeed();
  const page = document.pages.find(item => item.id === 'home');
  for (const language of ['en', 'fr', 'es']) {
    const html = renderToStaticMarkup(createElement(PageRenderer, {
      document, page, language, onNavigate() {}, onBook() {},
    }));
    assert.match(html, /data-section-id="hero"/, `${language}: hero must exist on the first render`);
    assert.match(html, /<h1\b/, `${language}: page heading must exist on the first render`);
    assert.doesNotMatch(html, /role="status"/, `${language}: no collapsed loading frame above the footer`);
  }
});

test('a cold lazy route reserves a viewport instead of showing the footer above the fold', () => {
  const document = createCmsSeed();
  const page = document.pages.find(item => item.id === 'fez');
  const html = renderToStaticMarkup(createElement(PageRenderer, {
    document, page, language: 'en', onNavigate() {}, onBook() {},
  }));
  assert.match(html, /role="status"/, 'this test deliberately exercises an unpreloaded route');
  assert.match(html, /min-height:100svh/, 'reserve the initial viewport while its existing layout loads');
});
