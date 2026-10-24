import assert from 'node:assert/strict';
import test from 'node:test';
import { register } from 'tsx/esm/api';
register();
const main = (await import('../worker/index.ts')).default;
const candidate = (await import('../worker/candidate-public.ts')).default;

async function compare(path, env, status, method = 'GET') {
  const request = () => new Request(`https://candidate.example${path}`, { method });
  const original = await main.fetch(request(), env);
  const preview = await candidate.fetch(request(), env);
  assert.equal(original.status, status);
  assert.equal(preview.status, original.status);
  assert.equal(preview.statusText, original.statusText);
  const headers = new Headers(original.headers);
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  assert.deepEqual([...preview.headers], [...headers]);
  assert.equal(preview.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  if (original.body === null) assert.equal(preview.body, null);
  assert.equal(await preview.text(), await original.text());
  return original;
}

test('candidate decorates actual closed staged root without changing normal indexing', async () => {
  const original = await compare('/', { CMS_PROCESSING_MODE: 'staged-v1' }, 503);
  assert.equal(original.headers.get('X-Robots-Tag'), null);
});

for (const path of ['/sitemap.xml', '/robots.txt', '/api/cms']) {
  test(`candidate decorates staged unavailable ${path}`, async () => {
    const original = await compare(path, { CMS_PROCESSING_MODE: 'staged-v1' }, 503);
    assert.equal(original.headers.get('X-Robots-Tag'), null);
  });
}

test('admin remains unauthorized before any database access', async () => {
  let reads = 0;
  await compare('/api/admin/session', {
    CMS_PROCESSING_MODE: 'staged-v1',
    CMS_DB: { prepare() { reads++; throw new Error('must authenticate first'); } },
  }, 401);
  assert.equal(reads, 0);
});

test('retired HEAD keeps its null body and existing retirement header', async () => {
  const original = await compare('/ar/about', {}, 410, 'HEAD');
  assert.equal(original.body, null);
  assert.equal(original.headers.get('X-Robots-Tag'), 'noindex, nofollow');
});

test('actual asset handler preserves streaming bytes, statusText and every metadata header', async () => {
  const original = await compare('/assets/app.js', {
    CMS_PROCESSING_MODE: 'staged-v1',
    ASSETS: { async fetch() {
      return new Response(new ReadableStream({ start(controller) {
        controller.enqueue(new TextEncoder().encode('asset bytes'));
        controller.close();
      } }), { status: 200, statusText: 'Asset OK', headers: {
        'Content-Type': 'text/javascript', 'Content-Length': '11',
        'Cache-Control': 'public, max-age=86400', ETag: '"asset-v1"',
        'Last-Modified': 'Wed, 21 Oct 2026 12:00:00 GMT',
      } });
    } },
  }, 200);
  assert.equal(original.headers.get('X-Robots-Tag'), null);
  assert.equal(original.headers.get('Content-Length'), '11');
  assert.equal(original.statusText, 'Asset OK');
});

test('canonical redirect keeps Location and null body', async () => {
  const env = { CMS_PROCESSING_MODE: 'staged-v1', CANONICAL_ORIGIN: 'https://candidate.example' };
  const request = () => new Request('https://www.candidate.example/fr/about?x=1');
  const original = await main.fetch(request(), env);
  const preview = await candidate.fetch(request(), env);
  assert.equal(original.status, 301);
  assert.equal(preview.status, 301);
  assert.equal(preview.body, null);
  const headers = new Headers(original.headers);
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  assert.deepEqual([...preview.headers], [...headers]);
  assert.equal(preview.headers.get('Location'), 'https://candidate.example/fr/about?x=1');
  assert.equal(original.headers.get('X-Robots-Tag'), null);
});
