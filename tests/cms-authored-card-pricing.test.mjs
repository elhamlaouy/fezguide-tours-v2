import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'tsx/esm/api';
register();
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { ApprovedContentProvider } = await import('../src/cms/approved-content.tsx');
const { SectionCard } = await import('../src/components/SectionCard.tsx');
const { formatPrice } = await import('../src/cms/SectionRenderer.tsx');

function render(document, product, language) {
  return renderToStaticMarkup(createElement(ApprovedContentProvider, {
    document, page: document.pages.find(page => page.id === 'fez'), language,
  }, createElement(SectionCard, { pillar: product, language, onExplore() {}, onBookTour() {} })));
}

test('authored category cards use the canonical live product price, currency and basis in every locale', () => {
  const document = createCmsSeed();
  for (const id of ['our-fez-tours', 'daytrip-chefchaouen']) {
    const product = document.products.find(item => item.id === id);
    for (const language of ['en', 'fr', 'es']) for (const currency of ['EUR', 'MAD', 'USD']) {
      product.price = { amount: 243.75, currency, basis: 'group' };
      const html = render(document, product, language);
      assert.ok(html.includes(formatPrice(product, language)), `${id}/${language}/${currency}: canonical price, not a stale literal or manual equivalent`);
      assert.ok(html.includes(`data-price-product-id="${id}"`), 'the real linked price remains editable from preview');
      assert.doesNotMatch(html, /€170/);
    }
  }
});

test('CMS cards do not invent a fallback price when the product price is absent or hidden', () => {
  const document = createCmsSeed();
  const product = document.products.find(item => item.id === 'our-fez-tours');
  delete product.price;
  assert.doesNotMatch(render(document, product, 'en'), /€170|data-price-product-id=/);
  product.price = { amount: 243.75, currency: 'USD', basis: 'vehicle' };
  product.published = false;
  assert.ok(!render(document, product, 'en').includes(formatPrice(product, 'en')));
});
