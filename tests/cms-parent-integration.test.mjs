import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'tsx/esm/api';
register();
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { validateCmsDocument } = await import('../src/cms/schema.ts');
const { routeSeoHead, DEFAULT_CANONICAL_ORIGIN } = await import('../src/cms/seo.ts');
const { resolveRoute } = await import('../src/cms/routing.ts');

test('routing namespaces cannot be assigned to custom page slugs', () => {
  for (const slug of ['en', 'fr', 'es', 'images', 'fonts']) {
    const document = createCmsSeed();
    document.pages.find(page => page.id === 'about').slug = slug;
    const result = validateCmsDocument(document);
    assert.equal(result.valid, false, slug);
    assert.ok(result.errors.some(error => error.includes('reserved slug')));
  }
});

test('canonical path overrides affect each locale without changing the trusted origin', () => {
  const document = createCmsSeed();
  const page = document.pages.find(page => page.id === 'about');
  page.seo.canonical = '/company';
  for (const [route, expected] of [['/about', '/company'], ['/fr/about', '/fr/company'], ['/es/about', '/es/company']]) {
    const head = routeSeoHead(document, resolveRoute(new URL('https://canonical.example' + route), document), 'https://canonical.example');
    assert.ok(head.includes(`rel="canonical" href="https://canonical.example${expected}"`));
  }
  for (const value of ['https://untrusted.example/company', 'https://canonical.example/company?x=1', 'https://canonical.example/company#fragment']) {
    page.seo.canonical = value;
    const head = routeSeoHead(document, resolveRoute(new URL('https://canonical.example/es/about'), document), 'https://canonical.example');
    assert.ok(head.includes('rel="canonical" href="https://canonical.example/es/about"'));
  }
  assert.equal(DEFAULT_CANONICAL_ORIGIN, 'https://fezguidetours.elhamlaouy.workers.dev');
});
