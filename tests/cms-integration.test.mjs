import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { register } from 'tsx/esm/api';

register();
const { default: worker } = await import('../worker/index.ts');
const { CmsStore } = await import('../worker/cms-store.ts');
const { validateCmsDocument } = await import('../src/cms/schema.ts');
const { createCmsSeed } = await import('../src/cms/seed.ts');

const root = new URL('..', import.meta.url);
const SENTINEL = 'DRAFT-SENTINEL-NOT-PUBLIC';

function database() {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of ['0001_cms.sql', '0002_media_budget.sql', '0003_cms_release_safeguards.sql']) sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
  const statement = (sql, values = []) => ({
    bind: (...args) => statement(sql, args),
    async first() { return sqlite.prepare(sql).get(...values) ?? null; },
    async all() { return { results: sqlite.prepare(sql).all(...values), success: true }; },
    async run() {
      const result = sqlite.prepare(sql).run(...values);
      return { success: true, meta: { changes: Number(result.changes) } };
    },
  });
  return {
    sqlite,
    prepare: statement,
    async batch(statements) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const results = [];
        for (const stmt of statements) results.push(await stmt.run());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

function assets() {
  const calls = [];
  return {
    calls,
    fetch: async (request) => {
      calls.push(new URL(request.url).pathname);
      return new Response('<html>public-site</html>', { headers: { 'content-type': 'text/html' } });
    },
  };
}

function hasKey(value, key) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(item => hasKey(item, key));
  return Object.hasOwn(value, key) || Object.values(value).some(item => hasKey(item, key));
}

async function call(path, env, method = 'GET', body) {
  return worker.fetch(new Request(`https://example.test${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  }), env);
}

test('local simulator stays isolated and authorized release binds separate production and preview storage', () => {
  const production = readFileSync(new URL('./wrangler.toml', root), 'utf8');
  const local = readFileSync(new URL('./wrangler.cms-local.toml', root), 'utf8');
  assert.match(production, /binding = "CMS_DB"/);
  assert.equal(production.includes('00000000-0000-0000-0000-000000000000'), false);
  assert.match(production, /run_worker_first = \["\/\*", "!\/assets\/\*", "!\/images\/\*", "!\/fonts\/\*", "!\/favicon\.svg"\]/);
  assert.match(production, /binding = "CMS_DB"/);
  assert.match(production, /\[\[d1_databases\]\][\s\S]*?database_id = "edb04713-e9ba-4b72-b967-7909d9ab61af"/);
  assert.match(production, /\[\[previews\.d1_databases\]\][\s\S]*?database_id = "cf43b67c-6f6a-4348-8444-361f0c796a5d"/);
  assert.match(production, /bucket_name = "fezguidetours-cms-media-v2"/);
  assert.match(production, /bucket_name = "fezguidetours-cms-media-preview-v2"/);
  assert.equal(local.includes('edb04713-e9ba-4b72-b967-7909d9ab61af'), false);
  assert.equal(local.includes('cf43b67c-6f6a-4348-8444-361f0c796a5d'), false);
  assert.match(local, /binding = "CMS_DB"/);
  assert.match(local, /database_id = "00000000-0000-0000-0000-000000000000"/);
  assert.match(local, /run_worker_first = \["\/\*", "!\/assets\/\*", "!\/images\/\*", "!\/fonts\/\*", "!\/favicon\.svg"\]/);
  assert.equal(local.includes('877026740d534091b2f44c57a1566a54'), false);
  assert.equal(local.includes('workers_dev = true'), false);
});

test('missing CMS_DB keeps KV public reads and strips bookings', async () => {
  const raw = JSON.stringify({
    tours: [{ id: 'medina' }],
    bookings: [{ email: 'hidden@example.test' }],
    siteSettings: { siteName: 'Fez Guide Tours' },
  });
  const response = await call('/api/cms', {
    CMS_KV: { async get(key) { assert.equal(key, 'fez_cms_data'); return raw; } },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'public, max-age=30, s-maxage=30');
  const body = await response.json();
  assert.equal(body.bookings, undefined);
  assert.equal(JSON.stringify(body).includes('hidden@example.test'), false);
  assert.equal(body.siteSettings.siteName, 'Fez Guide Tours');

  const denied = await call('/api/cms', { CMS_KV: { async get() { return raw; } } }, 'PUT', { bookings: [] });
  assert.equal(denied.status, 405);
  assert.equal(denied.headers.get('allow'), 'GET');
  const missing = await call('/api/cms', {});
  assert.equal(missing.status, 503);
  assert.deepEqual(await missing.json(), { configured: false, message: 'CMS content is unavailable' });
});

test('unauthenticated admin routes are denied before assets', async () => {
  const site = assets();
  const env = { ASSETS: site };
  for (const [path, method] of [
    ['/admin', 'GET'],
    ['/admin/', 'GET'],
    ['/admin/editor', 'HEAD'],
    ['/api/admin/content', 'GET'],
    ['/api/admin/content/draft', 'PUT'],
    ['/api/admin/content/publish', 'POST'],
    ['/api/admin/content/rollback', 'POST'],
    ['/admin%2Fsecret', 'GET'],
    ['/api/admin%2Fcontent', 'GET'],
  ]) {
    const response = await call(path, env, method, method === 'GET' || method === 'HEAD' ? undefined : { expectedVersion: 0 });
    assert.equal(response.status, 401, path);
    assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
    assert.deepEqual(await response.json(), { error: 'unauthorized' });
  }
  assert.deepEqual(site.calls, []);

  const home = await call('/', env);
  assert.equal(home.status, 200);
  assert.equal(await home.text(), '<html>public-site</html>');
  assert.equal(home.headers.get('x-frame-options'), 'DENY');
  assert.deepEqual(site.calls, ['/']);
  const unknown = await call('/api/unknown', env);
  assert.equal(unknown.status, 404);
  assert.equal(site.calls.length, 1);
});

test('CMS_DB public routes follow published state and ignore KV and drafts', async () => {
  const db = database();
  const site = assets();
  try {
    const store = new CmsStore(db, validateCmsDocument);
    const seed = createCmsSeed();
    assert.equal(seed.uiCopy['ui.booking.fullName'].en, 'Full Name');
    const env = {
      CMS_DB: db,
      ASSETS: site,
      CMS_KV: { async get() { return JSON.stringify({ tours: [{ id: 'kv-only' }], bookings: [{ email: 'kv@example.test' }] }); } },
    };
    const unpublished = await call('/api/cms', env);
    assert.equal(unpublished.status, 200);
    assert.deepEqual(await unpublished.json(), { data: null });
    assert.equal(site.calls.length, 0);

    assert.equal((await store.saveDraft(seed, 0, 'editor')).version, 1);
    const drafted = await (await call('/api/cms/document', env)).json();
    assert.deepEqual(drafted, { version: null, document: null });

    assert.equal((await store.publish(1, 'editor')).published, true);
    const published = await (await call('/api/cms/document', env)).json();
    assert.equal(published.version, 2);
    assert.equal(published.document.uiCopy['ui.booking.fullName'].en, 'Full Name');
    assert.equal(hasKey(published, 'bookings'), false);
    const compatibility = await (await call('/api/cms', env)).json();
    assert.equal(compatibility.tours.some(tour => tour.id === 'kv-only'), false);
    assert.equal(hasKey(compatibility, 'bookings'), false);
    assert.equal(JSON.stringify(compatibility).includes('kv@example.test'), false);

    const draft = structuredClone(seed);
    draft.siteSettings.heroTitle = { ...draft.siteSettings.heroTitle, en: SENTINEL };
    draft.legacy.siteSettings.heroTitle = { ...draft.legacy.siteSettings.heroTitle, en: SENTINEL };
    draft.uiCopy['ui.booking.fullName'] = { ...draft.uiCopy['ui.booking.fullName'], en: SENTINEL };
    assert.equal(validateCmsDocument(draft).valid, true);
    assert.equal((await store.saveDraft(draft, 2, 'editor')).version, 3);
    const stillPublished = await (await call('/api/cms/document', env)).text();
    assert.equal(stillPublished.includes(SENTINEL), false);
    assert.equal(stillPublished.includes('Full Name'), true);

    await assert.rejects(() => store.saveDraft(draft, 0, 'editor'), (error) => error.status === 409 && error.code === 'version_conflict');
    const afterStale = await (await call('/api/cms/document', env)).text();
    assert.equal(afterStale, stillPublished);

    const write = await call('/api/admin/content/draft', env, 'PUT', { expectedVersion: 3, document: draft });
    assert.equal(write.status, 401);
    assert.equal(await (await call('/api/cms/document', env)).text(), stillPublished);
    assert.deepEqual(site.calls, []);

    assert.equal((await store.publish(3, 'editor')).published, true);
    const changed = await (await call('/api/cms/document', env)).json();
    assert.equal(changed.document.uiCopy['ui.booking.fullName'].en, SENTINEL);
    assert.equal(changed.document.siteSettings.heroTitle.en, SENTINEL);
    assert.equal(hasKey(changed, 'bookings'), false);
  } finally {
    db.sqlite.close();
  }
});
