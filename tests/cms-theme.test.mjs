import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { register } from 'tsx/esm/api';
register();
registerHooks({ load(url, context, nextLoad) {
  if (url.endsWith('.css')) return { format: 'module', source: 'export default "";', shortCircuit: true };
  return nextLoad(url, context);
} });
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { PageRenderer } = await import('../src/cms/PageRenderer.tsx');
await (await import('../src/cms/ApprovedPageRenderer.tsx')).preloadApprovedLayouts();
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { Window } = await import('happy-dom');
const css = readFileSync(new URL('../src/cms/cms-renderer.css', import.meta.url), 'utf8');

test('edited theme fields affect actual renderer styles including booking buttons and card shadows', async () => {
  const document = createCmsSeed();
  document.theme = { colors: { primary: '#112233', accent: '#abcdef', background: '#eeeeee', text: '#334455' }, font: 'inter', fontScale: 1.3, containerWidth: 1100, spacing: 'generous', radius: 'square', buttonVariant: 'outline', cardVariant: 'flat' };
  const page = { ...document.pages.find(page => page.id === 'our-fez-tours'), id: 'theme-fixture' }; // Generic new-page theme contract; originals keep their authored markup.
  const html = renderToStaticMarkup(createElement(PageRenderer, { document, page, language: 'en', onNavigate() {}, onBook() {} }));
  const window = new Window({ settings: { disableCSSFileLoading: true } });
  try {
    window.document.body.innerHTML = `<style>${css}</style>${html}`;
    const article = window.document.querySelector('article.cms-page');
    assert.equal(article.getAttribute('data-card-variant'), 'flat');
    assert.equal(article.getAttribute('data-button-variant'), 'outline');
    const style = element => window.getComputedStyle(element);
    assert.match(style(article).fontFamily, /Inter/);
    assert.equal(style(article).backgroundColor, '#eeeeee');
    assert.equal(style(article).color, '#334455');
    assert.match(style(window.document.querySelector('h1')).fontSize, /1.3/);
    // Happy DOM does not calculate min()/layout widths; verify the rendered token and real CSS consumer instead.
    assert.equal(article.style.getPropertyValue('--cms-container'), '1100px');
    assert.match(css, /\.cms-page-header, \.cms-wrap \{ width: min\(calc\(100% - 2rem\), var\(--cms-container\)\)/);
    assert.match(style(window.document.querySelector('section')).paddingBlock, /6rem/);
    assert.equal(style(window.document.querySelector('.cms-button-book')).backgroundColor, 'transparent');
    assert.equal(style(window.document.querySelector('.cms-button-book')).borderRadius, '0px');
    assert.equal(style(window.document.querySelector('.cms-cta-layout')).boxShadow, 'none');
    const fontCss=readFileSync(new URL('../src/cms/site-theme.css',import.meta.url),'utf8');
    assert.match(fontCss,/font-family:Inter; src:url\('\/fonts\/inter\.woff2'\)/);
    assert.equal(readFileSync(new URL('../public/fonts/inter.woff2',import.meta.url)).subarray(0,4).toString(),'wOF2','selected font is self-hosted');
  } finally { await window.happyDOM.close(); }
});
