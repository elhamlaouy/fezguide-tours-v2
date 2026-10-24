import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'tsx/esm/api';
register();
const { default: main } = await import('../worker/index.ts');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { CMS_LOCALES, validateCmsDocument, validateCmsRelationships } = await import('../src/cms/schema.ts');

test('only EN/FR/ES are active; retired ar slug and canonical route cannot be authored', () => {
  assert.deepEqual(CMS_LOCALES, ['en', 'fr', 'es']);
  for (const field of ['slug', 'canonical']) {
    const document = createCmsSeed();
    assert.equal(validateCmsDocument(document).valid, true);
    const page = document.pages.find(page => page.id === 'about');
    if (field === 'slug') page.slug = 'ar';
    else page.seo.canonical = '/ar';
    const result = validateCmsDocument(document);
    assert.equal(result.valid, false, `retired ${field} is reserved`);
    assert.ok(validateCmsRelationships(document).some(error => /reserved slug|invalid canonical route/.test(error)));
  }
});

for (const mode of ['legacy', 'staged-v1']) {
  test(`${mode}: retired Arabic public URLs return 410 before any source or fallback read`, async () => {
    let reads = 0;
    const forbidden = () => { reads++; throw new Error('retired request read source'); };
    const env = {
      ...(mode === 'staged-v1' ? { CMS_PROCESSING_MODE: mode, CMS_DB: { prepare: forbidden } } : {}),
      CMS_KV: { get: forbidden }, CMS_MEDIA: { get: forbidden },
      ASSETS: { fetch: forbidden },
      CMS_PUBLIC_RATE_LIMIT_REQUIRED: 'true', CMS_PUBLIC_RATE_LIMITER: { limit: forbidden },
    };
    for (const path of ['/ar', '/ar/', '/ar/about', '/%61r/about', '/a%72', '/ar%2Fabout', '/?lang=ar', '/about?language=ar', '/fr/about?lang=%61r', '/?lang=en&lang=ar', '/?language=ar&lang=es']) {
      for (const method of ['GET', 'HEAD']) {
        const response = await main.fetch(new Request(`https://fixture.test${path}`, { method }), env);
        assert.equal(response.status, 410, `${method} ${path}`);
        assert.match(response.headers.get('X-Robots-Tag'), /noindex/);
        assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
        assert.equal(response.headers.get('X-Frame-Options'), 'DENY');
        assert.ok(response.headers.get('Content-Security-Policy'));
        assert.equal(response.headers.get('Location'), null);
        if (method === 'HEAD') assert.equal(response.body, null);
        else assert.match(await response.text(), /no longer available/i);
      }
    }
    assert.equal(reads, 0);
  });
}

test('active locale URLs and namespace exclusions remain outside retirement in staged delivery', async () => {
  const env = { CMS_PROCESSING_MODE: 'staged-v1', CMS_DB: { prepare() { throw new Error('unavailable fixture'); } }, ASSETS: { fetch: async () => new Response('asset fallback') } };
  for (const path of ['/', '/en/about', '/fr/about', '/es/about', '/?lang=en', '/?lang=fr', '/?lang=es', '/architecture', '/images/ar/photo.jpg?lang=ar', '/assets/app.js?lang=ar', '/api/missing?lang=ar', '/admin?lang=ar', '/media/photo.jpg?lang=ar']) {
    assert.notEqual((await main.fetch(new Request(`https://fixture.test${path}`), env)).status, 410, path);
  }
});

test('retirement is bounded to public pages and exact decoded locale segments', async () => {
  const env = { ASSETS: { fetch: async () => new Response('asset fallback') } };
  for (const path of ['/architecture', '/arabic-history', '/images/ar/photo.jpg?lang=ar', '/assets/app.js?language=ar', '/fonts/ar.woff2?lang=ar', '/media/photo.jpg?lang=ar', '/favicon.svg?lang=ar', '/manifest.json?lang=ar', '/robots.txt?lang=ar', '/sitemap.xml?lang=ar', '/about.js?lang=ar', '/%ZZ?lang=en', '/', '/en/about', '/fr/about', '/es/about', '/?lang=en', '/?lang=fr', '/?lang=es']) {
    const response = await main.fetch(new Request(`https://fixture.test${path}`), env);
    assert.notEqual(response.status, 410, path);
  }
  for (const path of ['/api/missing?lang=ar', '/admin?lang=ar', '/admin/ar?language=ar']) {
    assert.notEqual((await main.fetch(new Request(`https://fixture.test${path}`), env)).status, 410, path);
  }
  assert.notEqual((await main.fetch(new Request('https://fixture.test/ar', { method: 'POST' }), env)).status, 410);
});
