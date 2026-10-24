import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'tsx/esm/api';
register();
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { validateCmsDocument } = await import('../src/cms/schema.ts');
const authoring = await import('../src/cms/page-authoring.ts').catch(() => ({}));

test('copy graph is immutable, private, canonical-free and rewrites product CTAs', () => {
  assert.equal(typeof authoring.copyEditorPage, 'function', 'shared copy graph helper exists');
  const doc = createCmsSeed();
  const source = doc.pages.find(p => p.productId);
  source.seo.canonical = '/original';
  source.sections.push({ id: 'copy-cta', type: 'cta', enabled: true, variant: 'banner', links: [], productId: source.productId });
  const before = JSON.stringify(doc);
  const next = authoring.copyEditorPage(doc, source, 'fresh-copy');
  const copy = next.pages.at(-1);
  assert.equal(JSON.stringify(doc), before);
  assert.equal(copy.id, 'fresh-copy');
  assert.equal(copy.slug, 'fresh-copy');
  assert.equal(copy.enabled, false);
  assert.equal(copy.seo.canonical, undefined);
  assert.equal(copy.productId, 'fresh-copy');
  assert.equal(copy.sections.at(-1).productId, 'fresh-copy');
  assert.equal(next.products.at(-1).published, false);
  assert.equal(next.products.at(-1).pageId, doc.products.find(p => p.id === source.productId).pageId);
  const valid = validateCmsDocument(next);
  assert.equal(valid.valid, true, valid.errors?.join('\n'));
});
