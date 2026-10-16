import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { register } from 'tsx/esm/api';
register();
const { default: worker } = await import('../worker/index.ts');
const configured = { CMS_PUBLIC_RATE_LIMIT_REQUIRED: 'true' };
const call = (path, env = {}, method = 'GET') => worker.fetch(new Request(`https://example.test${path}`, { method }), env);

test('public dynamic admission fails closed before database, assets or authentication work', async () => {
  let touched = 0;
  const env = { ...configured, CMS_DB: { prepare() { touched++; throw Error('must not query'); } }, ASSETS: { async fetch() { touched++; throw Error('must not serve'); } } };
  for (const path of ['/', '/es/about', '/sitemap.xml', '/robots.txt', '/api/cms/document', '/media/upload-123.png', '/admin', '/api/admin/content', '/%61dmin']) {
    for (const CMS_PUBLIC_RATE_LIMITER of [undefined, { async limit() { throw Error('private upstream detail'); } }]) {
      const response = await call(path, { ...env, CMS_PUBLIC_RATE_LIMITER });
      assert.equal(response.status, 503, path);
      assert.deepEqual(await response.json(), { error: 'cms_unavailable' });
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
    }
  }
  assert.equal(touched, 0);
});

test('platform-denied public routes return bounded 429 without downstream work or identifier keys', async () => {
  let touched = 0; const keys = [];
  const env = { ...configured, CMS_DB: { prepare() { touched++; throw Error(); } }, CMS_PUBLIC_RATE_LIMITER: { async limit({ key }) { keys.push(key); return { success: false }; } } };
  for (const path of ['/', '/fr', '/api/cms', '/api/admin/content', '/media/upload-123.png']) {
    const response = await call(path, env);
    assert.equal(response.status, 429); assert.equal(response.headers.get('Retry-After'), '60');
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(await response.json(), { error: 'cms_public_rate' });
  }
  assert.deepEqual(keys, Array(5).fill('cms-dynamic')); assert.equal(touched, 0);
});

test('admission preserves real authorization and lets non-dynamic assets bypass the limiter', async () => {
  const env = { ...configured, CMS_PUBLIC_RATE_LIMITER: { async limit() { return { success: true }; } } };
  assert.equal((await call('/api/debug', env)).status, 404);
  assert.equal((await call('/api/admin/content', env)).status, 401);
  for (const path of ['/assets/app.js', '/images/photo.jpg', '/fonts/site.woff2', '/favicon.svg']) {
    const response = await call(path, { ...configured, CMS_DB: {}, ASSETS: { async fetch() { return new Response('asset'); } } });
    assert.equal(response.status, 200); assert.equal(await response.text(), 'asset');
  }
});

test('production and previews require distinct platform namespaces with explicit documented limits', () => {
  const config = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
  const namespaces = [...config.matchAll(/\[\[(?:previews\.)?ratelimits\]\]\s+name = "CMS_PUBLIC_RATE_LIMITER"\s+namespace_id = "(\d+)"\s+simple = \{ limit = 600, period = 60 \}/g)].map(match => match[1]);
  assert.equal(namespaces.length, 2); assert.notEqual(namespaces[0], namespaces[1]);
  assert.equal([...config.matchAll(/CMS_PUBLIC_RATE_LIMIT_REQUIRED = "true"/g)].length, 2);
});
