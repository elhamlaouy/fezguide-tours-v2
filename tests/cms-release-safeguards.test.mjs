import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { register } from 'tsx/esm/api';
register();
const { CmsStore, MAX_DOCUMENT_BYTES, MAX_REVISION_COUNT, MAX_REVISION_DOCUMENT_BYTES } = await import('../worker/cms-store.ts');
const { consumeCmsRequest, CMS_REQUEST_LIMITS, MAX_CMS_REQUEST_IDENTITIES } = await import('../worker/cms-request-budget.ts');
const { createCmsHandler } = await import('../worker/cms-routes.ts');
const migrations = ['0001_cms.sql', '0002_media_budget.sql', '0003_cms_release_safeguards.sql'];
const migrate = (sqlite, names = migrations) => { for (const name of names) sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8')); };
function database(path = ':memory:', initialize = true) {
  const sqlite = new DatabaseSync(path);
  sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000');
  if (initialize) migrate(sqlite);
  const trace = [];
  const statement = (sql, values = []) => ({
    sql, values, bind: (...args) => statement(sql, args),
    async first() { trace.push(sql); return sqlite.prepare(sql).get(...values) ?? null; },
    async all() { trace.push(sql); return { success: true, results: sqlite.prepare(sql).all(...values) }; },
    async run() { trace.push(sql); return { success: true, meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } }; },
  });
  const db = { prepare: statement, async batch(statements) {
    // No SQL mocks: execute the entire batch in a real SQLite write transaction.
    sqlite.exec('BEGIN IMMEDIATE');
    try {
      const result = statements.map(({ sql, values }) => { trace.push(sql); return { success: true, meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } }; });
      sqlite.exec('COMMIT'); return result;
    } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  } };
  return { sqlite, db, trace, store: new CmsStore(db, validate), close: () => sqlite.close() };
}
function validate(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.schemaVersion !== 1 || !Array.isArray(value.pages)) throw Error('invalid fixture');
  return value;
}
const doc = (title = 'normal') => ({ schemaVersion: 1, pages: [{ id: 'home', title }] });
if (isMainThread) test('D1 trigger-inclusive changes preserve save/publish success and stale-write denial', async () => {
  const f = database();
  const db = { ...f.db, async batch(statements) {
    // D1 reports total_changes(), including the revision-budget AFTER INSERT trigger.
    f.sqlite.exec('BEGIN IMMEDIATE');
    try {
      const results = statements.map(({ sql, values }) => {
        const before = f.sqlite.prepare('SELECT total_changes() AS count').get().count;
        f.sqlite.prepare(sql).run(...values);
        const after = f.sqlite.prepare('SELECT total_changes() AS count').get().count;
        return { success: true, meta: { changes: Number(after - before) } };
      });
      f.sqlite.exec('COMMIT'); return results;
    } catch (error) { f.sqlite.exec('ROLLBACK'); throw error; }
  } };
  try {
    const store = new CmsStore(db, validate);
    assert.equal((await store.saveDraft(doc(), 0, 'owner')).version, 1);
    assert.equal((await store.publish(1, 'owner')).version, 2);
    const before = snapshot(f);
    await assert.rejects(store.saveDraft(doc('stale'), 0, 'other'), error => error.code === 'version_conflict');
    assert.deepEqual(snapshot(f), before);
    assert.equal((await store.readPublished()).version, 2);
  } finally { f.close(); }
});
const budget = f => f.sqlite.prepare('SELECT revision_count, document_bytes FROM cms_revision_budget').get();
const snapshot = f => ({ rows: f.sqlite.prepare('SELECT * FROM cms_revisions ORDER BY version').all(), state: f.sqlite.prepare('SELECT * FROM cms_documents').get(), budget: budget(f) });
const charge = (f, actor, bucket, used, reset = 4_000_000_000) => f.sqlite.prepare(`INSERT INTO cms_request_budgets VALUES (?, ?, ?, ?) ON CONFLICT(actor,bucket) DO UPDATE SET reset_at=excluded.reset_at, used=excluded.used`).run(actor, bucket, reset, used);
function legacyFixture() {
  const f = database(':memory:', false); migrate(f.sqlite, migrations.slice(0, 2));
  return f;
}
function seedRow(f, version, raw) {
  f.sqlite.prepare("INSERT INTO cms_revisions VALUES (?, ?, 'draft', 'synthetic-editor', '2026-01-01T00:00:00Z', NULL)").run(version, raw);
  f.sqlite.prepare('UPDATE cms_documents SET version=?, draft_revision=? WHERE id=1').run(version, version);
}
function seedBytes(f, total) {
  const base = JSON.stringify(doc(''));
  let version = 0;
  while (total > 0) {
    const bytes = Math.min(total, MAX_DOCUMENT_BYTES);
    assert.ok(bytes >= Buffer.byteLength(base));
    seedRow(f, ++version, JSON.stringify(doc('x'.repeat(bytes - Buffer.byteLength(base)))));
    total -= bytes;
  }
  return version;
}
async function race(path, mode, actors) {
  const shared = new SharedArrayBuffer(4);
  let ready = 0;
  const tasks = actors.map(actor => new Promise((resolve, reject) => {
    const worker = new Worker(new URL(import.meta.url), { workerData: { path, mode, actor, shared } });
    worker.on('message', message => {
      if (!message.ready) return resolve(message);
      if (++ready === actors.length) {
        Atomics.store(new Int32Array(shared), 0, 1);
        Atomics.notify(new Int32Array(shared), 0);
      }
    });
    worker.once('error', reject);
    worker.once('exit', code => { if (code) reject(new Error(`worker exit ${code}`)); });
  }));
  return Promise.all(tasks);
}
if (!isMainThread) {
  const f = database(workerData.path, false);
  parentPort.postMessage({ ready: true });
  Atomics.wait(new Int32Array(workerData.shared), 0, 0);
  try {
    if (workerData.mode === 'request') await consumeCmsRequest(f.db, workerData.actor, 'write');
    else if (workerData.mode === 'raw-revision') f.sqlite.prepare("INSERT INTO cms_revisions VALUES (?, ?, 'draft', 'synthetic-editor', '2026-01-01', NULL)").run(workerData.actor, JSON.stringify(doc()));
    else await f.store.saveDraft(doc(workerData.actor), workerData.mode, workerData.actor);
    parentPort.postMessage({ ok: true });
  } catch (error) { parentPort.postMessage({ ok: false, status: error.status ?? (error.message.includes('cms_revision_storage_budget') ? 507 : undefined), code: error.code }); }
  finally { f.close(); }
} else {
  test('migration counts existing UTF-8 history exactly and leaves immutable content/pointers intact', () => {
    const f = legacyFixture();
    try {
      seedRow(f, 1, JSON.stringify(doc('مَدينة 🏛️')));
      const before = f.sqlite.prepare('SELECT * FROM cms_revisions').all();
      migrate(f.sqlite, migrations.slice(2));
      assert.deepEqual(f.sqlite.prepare('SELECT * FROM cms_revisions').all(), before);
      assert.equal(budget(f).revision_count, 1);
      assert.equal(budget(f).document_bytes, Buffer.byteLength(before[0].document));
      assert.throws(() => f.sqlite.exec("UPDATE cms_revisions SET actor='other'"), /immutable/);
      assert.throws(() => f.sqlite.exec('DELETE FROM cms_revisions'), /immutable/);
    } finally { f.close(); }
  });

  test('save/publish/rollback/backup/restore remain usable and every immutable copy is charged', async () => {
    const { exportBackup, restoreBackup, orphanDryRun } = await import('../worker/cms-recovery.ts');
    const f = database();
    try {
      await f.store.saveDraft(doc('أهلا'), 0, 'synthetic-editor');
      await f.store.publish(1, 'synthetic-editor');
      await f.store.saveDraft(doc('second'), 2, 'synthetic-editor');
      await f.store.rollback(1, 3, 'synthetic-editor');
      await f.store.requireBoundedRecovery();
      const backup = await exportBackup(f.db, f.store);
      assert.equal(backup.revisions.length, 4);
      await restoreBackup(f.store, undefined, backup, 3, 4, 'synthetic-editor');
      assert.equal((await f.store.read()).draftRevision, 5);
      assert.equal((await f.store.readPublished()).version, 4, 'restore does not publish');
      assert.deepEqual((await f.store.readRevision(1)).document, doc('أهلا'));
      const dryRun = await orphanDryRun(f.db, f.store, { async list() { return { objects: [], truncated: false }; } });
      assert.equal(dryRun.deleted, 0);
      assert.equal(budget(f).revision_count, 5);
      assert.equal(budget(f).document_bytes, f.sqlite.prepare('SELECT SUM(length(CAST(document AS BLOB))) AS bytes FROM cms_revisions').get().bytes);
      const before = snapshot(f);
      await assert.rejects(f.store.saveDraft(doc('stale'), 0, 'synthetic-editor'), e => e.status === 409);
      assert.deepEqual(snapshot(f), before);
    } finally { f.close(); }
  });

  test('exact byte ceiling admits the last UTF-8 document; all later copies fail without changing history', async () => {
    const f = legacyFixture();
    const last = doc('界🌍');
    const raw = JSON.stringify(last);
    try {
      const version = seedBytes(f, MAX_REVISION_DOCUMENT_BYTES - Buffer.byteLength(raw));
      migrate(f.sqlite, migrations.slice(2));
      await f.store.saveDraft(last, version, 'synthetic-editor');
      assert.equal(budget(f).document_bytes, MAX_REVISION_DOCUMENT_BYTES);
      const before = snapshot(f);
      for (const operation of [() => f.store.saveDraft(doc(), version + 1, 'synthetic-editor'), () => f.store.publish(version + 1, 'synthetic-editor'), () => f.store.rollback(1, version + 1, 'synthetic-editor')]) {
        await assert.rejects(operation(), e => e.status === 507 && e.code === 'cms_revision_storage_budget');
        assert.deepEqual(snapshot(f), before);
      }
      assert.throws(() => seedRow(f, version + 2, raw), /cms_revision_storage_budget/, 'direct SQL is also bounded');
      const { restoreBackup } = await import('../worker/cms-recovery.ts');
      const sha256 = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))).toString('hex');
      const backup = { format: 'fez-cms-backup-v1', state: { version: 1, draftRevision: 1, publishedRevision: null },
        revisions: [{ version: 1, kind: 'draft', actor: 'synthetic-editor', createdAt: '2026-01-01', sourceRevision: null, document: last, sha256 }], media: [] };
      await assert.rejects(restoreBackup(f.store, undefined, backup, 1, version + 1, 'synthetic-editor'), e => e.status === 507);
      assert.deepEqual(snapshot(f), before, 'restore cannot evade aggregate storage accounting');
      await f.store.requireBoundedRecovery();
    } finally { f.close(); }
  });

  test('count ceiling and existing over-budget migration are non-destructive; oversized recovery is rejected before row materialization', async () => {
    for (const count of [MAX_REVISION_COUNT - 1, MAX_REVISION_COUNT + 1]) {
      const f = legacyFixture();
      try {
        f.sqlite.exec('BEGIN');
        for (let i = 1; i <= count; i++) seedRow(f, i, JSON.stringify(doc()));
        f.sqlite.exec('COMMIT'); migrate(f.sqlite, migrations.slice(2));
        if (count < MAX_REVISION_COUNT) await f.store.saveDraft(doc('last'), count, 'synthetic-editor');
        const before = snapshot(f);
        await assert.rejects(f.store.saveDraft(doc('blocked'), before.state.version, 'synthetic-editor'), e => e.status === 507);
        assert.deepEqual(snapshot(f), before);
        assert.equal((await f.store.read()).version, before.state.version);
        if (count > MAX_REVISION_COUNT) {
          f.trace.length = 0;
          await assert.rejects(f.store.requireBoundedRecovery(), e => e.status === 413);
          assert.equal(f.trace.some(sql => /SELECT .*document.*FROM cms_revisions/.test(sql)), false);
        }
      } finally { f.close(); }
    }
  });

  test('real CMS schema and shipped multilingual seed save/publish/rollback/recovery within the bounded store', async () => {
    const { validateCmsDocument } = await import('../src/cms/schema.ts');
    const { createCmsSeed } = await import('../src/cms/seed.ts');
    const { exportBackup, restoreBackup } = await import('../worker/cms-recovery.ts');
    const f = database();
    const store = new CmsStore(f.db, validateCmsDocument);
    try {
      const seed = createCmsSeed();
      assert.equal(validateCmsDocument(seed).valid, true);
      await store.saveDraft(seed, 0, 'synthetic-editor');
      await store.publish(1, 'synthetic-editor');
      await store.rollback(1, 2, 'synthetic-editor');
      await store.requireBoundedRecovery();
      const backup = await exportBackup(f.db, store);
      await restoreBackup(store, undefined, backup, 1, 3, 'synthetic-editor');
      assert.equal((await store.read()).draftRevision, 4);
      assert.equal((await store.readPublished()).version, 3);
      assert.deepEqual((await store.read()).document, seed);
      assert.ok(budget(f).document_bytes < MAX_REVISION_DOCUMENT_BYTES);
    } finally { f.close(); }
  });

  test('failed pointer transaction rolls back both revision and its storage charge', async () => {
    const f = database();
    try {
      const before = snapshot(f);
      f.sqlite.exec("CREATE TRIGGER injected_failure BEFORE UPDATE ON cms_documents BEGIN SELECT RAISE(ABORT, 'synthetic failure'); END");
      await assert.rejects(f.store.saveDraft(doc(), 0, 'synthetic-editor'));
      assert.deepEqual(snapshot(f), before);
    } finally { f.close(); }
  });

  test('all three durable identity thresholds allow exactly the documented number then reject; buckets and identities are independent', async () => {
    const f = database();
    try {
      for (const [bucket, limits] of Object.entries(CMS_REQUEST_LIMITS)) {
        for (let i = 0; i < limits.identity; i++) await consumeCmsRequest(f.db, 'synthetic-editor', bucket);
        const before = f.sqlite.prepare('SELECT * FROM cms_request_budgets ORDER BY actor,bucket').all();
        await assert.rejects(consumeCmsRequest(f.db, 'synthetic-editor', bucket), e => e.status === 429 && e.retryAfter === limits.seconds);
        assert.deepEqual(f.sqlite.prepare('SELECT * FROM cms_request_budgets ORDER BY actor,bucket').all(), before, 'denials do not consume global quota');
        await consumeCmsRequest(f.db, 'other-synthetic-editor', bucket);
      }
      charge(f, 'synthetic-editor', 'write', 60, 0);
      await consumeCmsRequest(f.db, 'synthetic-editor', 'write');
      assert.equal(f.sqlite.prepare("SELECT used FROM cms_request_budgets WHERE actor='synthetic-editor' AND bucket='write'").get().used, 1);
    } finally { f.close(); }
  });

  test('site-wide ceilings, bounded identity cardinality and expired metadata cleanup fail closed', async () => {
    const f = database();
    try {
      charge(f, '', 'write', CMS_REQUEST_LIMITS.write.site);
      await assert.rejects(consumeCmsRequest(f.db, 'new-editor', 'write'), e => e.status === 429);
      assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS n FROM cms_request_budgets WHERE actor!=''").get().n, 0);
      charge(f, '', 'write', CMS_REQUEST_LIMITS.write.site, 0);
      for (let i = 0; i < MAX_CMS_REQUEST_IDENTITIES; i++) charge(f, `fixture-${i}`, 'read', 1);
      await assert.rejects(consumeCmsRequest(f.db, 'new-editor', 'write'), e => e.status === 429);
      await consumeCmsRequest(f.db, 'fixture-0', 'read');
      f.sqlite.exec("UPDATE cms_request_budgets SET reset_at=0 WHERE actor!=''");
      await consumeCmsRequest(f.db, 'new-editor', 'write');
      assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS n FROM cms_request_budgets WHERE actor!=''").get().n, 1);
    } finally { f.close(); }
  });

  test('separate SQLite connections race for the final identity/site rate slot; restart keeps the charge', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cms-release-rate-'));
    const path = join(dir, 'test.sqlite');
    const f = database(path);
    try {
      charge(f, '', 'write', CMS_REQUEST_LIMITS.write.site - 1);
      charge(f, 'race-editor', 'write', CMS_REQUEST_LIMITS.write.identity - 1);
      const result = await race(path, 'request', ['race-editor', 'race-editor', 'race-editor']);
      assert.equal(result.filter(r => r.ok).length, 1);
      assert.ok(result.filter(r => !r.ok).every(r => r.status === 429));
      assert.equal(f.sqlite.prepare("SELECT used FROM cms_request_budgets WHERE actor='' AND bucket='write'").get().used, CMS_REQUEST_LIMITS.write.site);
      const restarted = database(path, false);
      try { await assert.rejects(consumeCmsRequest(restarted.db, 'other-editor', 'write'), e => e.status === 429); }
      finally { restarted.close(); }
    } finally { f.close(); rmSync(dir, { recursive: true, force: true }); }
  });

  test('separate connections race on the final revision slot; stale CAS cannot move either pointer', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cms-release-revision-'));
    const path = join(dir, 'test.sqlite');
    const f = database(path, false);
    try {
      migrate(f.sqlite, migrations.slice(0, 2));
      f.sqlite.exec('BEGIN');
      for (let i = 1; i < MAX_REVISION_COUNT; i++) seedRow(f, i, JSON.stringify(doc()));
      f.sqlite.exec('COMMIT');
      migrate(f.sqlite, migrations.slice(2));
      const result = await race(path, MAX_REVISION_COUNT - 1, ['first', 'second', 'third']);
      assert.equal(result.filter(r => r.ok).length, 1);
      assert.ok(result.filter(r => !r.ok).every(r => r.status === 409));
      assert.equal(budget(f).revision_count, MAX_REVISION_COUNT);
      assert.equal((await f.store.read()).draftRevision, MAX_REVISION_COUNT);
      assert.equal((await f.store.read()).publishedRevision, null);
    } finally { f.close(); rmSync(dir, { recursive: true, force: true }); }
  });

  test('storage trigger independently arbitrates concurrent distinct inserts, not just the application CAS', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cms-release-trigger-'));
    const path = join(dir, 'test.sqlite');
    const f = database(path, false);
    try {
      migrate(f.sqlite, migrations.slice(0, 2));
      f.sqlite.exec('BEGIN');
      for (let i = 1; i < MAX_REVISION_COUNT; i++) seedRow(f, i, JSON.stringify(doc()));
      f.sqlite.exec('COMMIT'); migrate(f.sqlite, migrations.slice(2));
      const result = await race(path, 'raw-revision', [1000, 1001, 1002]);
      assert.equal(result.filter(r => r.ok).length, 1);
      assert.ok(result.filter(r => !r.ok).every(r => r.status === 507));
      assert.equal(budget(f).revision_count, MAX_REVISION_COUNT);
      assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n, MAX_REVISION_COUNT);
      assert.equal(budget(f).document_bytes, f.sqlite.prepare('SELECT SUM(length(CAST(document AS BLOB))) AS bytes FROM cms_revisions').get().bytes);
      assert.equal((await f.store.read()).draftRevision, MAX_REVISION_COUNT - 1, 'raw inserts do not gain publication authority');
    } finally { f.close(); rmSync(dir, { recursive: true, force: true }); }
  });

  // The JWT is generated locally, used in memory, and never printed or persisted.
  async function apiFixture(f = database()) {
    const keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
    const jwk = { ...await crypto.subtle.exportKey('jwk', keys.publicKey), kid: 'release-fixture', alg: 'RS256', use: 'sig' };
    const now = 2_000_000_000;
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${encode({ alg: 'RS256', kid: jwk.kid })}.${encode({ iss: 'https://fixture.cloudflareaccess.com', aud: ['release-fixture'], sub: 'synthetic-editor', email: 'private-marker@example.test', exp: now + 60 })}`;
    const signed = `${unsigned}.${Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keys.privateKey, new TextEncoder().encode(unsigned))).toString('base64url')}`;
    const handler = () => createCmsHandler({ validateDocument: validate, access: { now: () => now * 1000, fetch: async () => Response.json({ keys: [jwk] }) } });
    const env = { CMS_DB: f.db, ACCESS_TEAM_DOMAIN: 'fixture.cloudflareaccess.com', ACCESS_AUD: 'release-fixture', ACCESS_ALLOWED_SUBJECTS: 'synthetic-editor' };
    const call = (path, method = 'GET', body, authenticated = true, target = handler(), extraHeaders = {}) => target(new Request(`https://example.test${path}`, { method, headers: { ...(authenticated ? { 'Cf-Access-Jwt-Assertion': signed } : {}), 'Content-Type': 'application/json', ...extraHeaders }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), env);
    return { ...f, env, handler, call };
  }

  test('signed routes share durable budgets across handlers; all expensive paths reject before work and keep generic responses', async () => {
    const f = await apiFixture();
    try {
      await f.store.saveDraft(doc(), 0, 'synthetic-editor');
      const before = snapshot(f);
      const groups = {
        read: [['/api/admin/content', 'GET'], ['/api/admin/content/revisions', 'GET'], ['/api/admin/content/revisions/1', 'GET'], ['/api/admin/media/upload-12345678-1234-1234-1234-123456789012.png', 'GET'], ['/api/admin/media/upload-12345678-1234-1234-1234-123456789012.png', 'HEAD']],
        write: [['/api/admin/content/draft', 'PUT'], ['/api/admin/content/publish', 'POST'], ['/api/admin/content/rollback', 'POST'], ['/api/admin/content/validate', 'POST'], ['/api/admin/media', 'POST']],
        recovery: [['/api/admin/recovery/backup', 'GET'], ['/api/admin/recovery/orphans', 'GET'], ['/api/admin/recovery/restore', 'POST']],
      };
      for (const [bucket, routes] of Object.entries(groups)) {
        charge(f, 'synthetic-editor', bucket, CMS_REQUEST_LIMITS[bucket].identity);
        for (const [path, method] of routes) {
          f.trace.length = 0;
          const response = await f.call(path, method, method === 'POST' || method === 'PUT' ? { privateMarker: 'private-marker@example.test' } : undefined);
          assert.equal(response.status, 429, `${method} ${path}`);
          assert.deepEqual(await response.json(), { error: 'cms_request_rate' });
          assert.equal(response.headers.get('retry-after'), String(CMS_REQUEST_LIMITS[bucket].seconds));
          assert.equal(response.headers.get('cache-control'), 'no-store');
          assert.ok(f.trace.every(sql => sql.includes('cms_request_budgets')), 'no document/media/recovery work occurs on denial');
        }
      }
      assert.deepEqual(snapshot(f), before);
      assert.equal((await f.call('/api/admin/content', 'GET', undefined, false)).status, 401);
      assert.equal((await f.call('/api/admin/content', 'POST', {})).status, 405);
      assert.equal((await f.call('/api/admin/content/draft', 'PUT', {}, true, f.handler(), { Origin: 'https://hostile.test' })).status, 403);
      assert.equal((await f.call('/api/cms/document', 'GET', undefined, false)).status, 200, 'public reads are outside this authenticated limiter');
    } finally { f.close(); }
  });

  test('signed API positive workflow, invalid attempts charged, missing migration fails closed without leaking marker or logging', async () => {
    const f = await apiFixture();
    const captured = [], originals = {};
    for (const name of ['log', 'warn', 'error', 'info', 'debug']) { originals[name] = console[name]; console[name] = (...args) => captured.push(args); }
    try {
      assert.equal((await f.call('/api/admin/content/draft', 'PUT', { expectedVersion: 0, document: doc('private-marker@example.test') })).status, 200);
      assert.equal((await f.call('/api/admin/content/publish', 'POST', { expectedVersion: 1 })).status, 200);
      assert.equal((await f.call('/api/admin/content/rollback', 'POST', { expectedVersion: 2, revision: 1 })).status, 200);
      assert.equal((await f.call('/api/admin/content/validate', 'POST', { document: doc() })).status, 200);
      const invalid = await f.call('/api/admin/content/validate', 'POST', { document: 'private-marker@example.test' });
      assert.equal(invalid.status, 422);
      assert.deepEqual(await invalid.json(), { error: 'invalid_document' });
      assert.equal(f.sqlite.prepare("SELECT used FROM cms_request_budgets WHERE actor='synthetic-editor' AND bucket='write'").get().used, 5);
      const backupResponse = await f.call('/api/admin/recovery/backup');
      assert.equal(backupResponse.status, 200);
      const backup = await backupResponse.json();
      assert.equal((await f.call('/api/admin/recovery/restore', 'POST', { backup, revision: 1, expectedVersion: 3 })).status, 200);
      assert.equal((await f.store.read()).publishedRevision, 3);
      f.sqlite.exec('DROP TABLE cms_request_budgets');
      const failure = await f.call('/api/admin/content');
      assert.equal(failure.status, 503);
      assert.deepEqual(await failure.json(), { error: 'cms_unavailable' });
      assert.deepEqual(captured, [], 'no request/identity/token/provider logging');
    } finally { for (const [name, original] of Object.entries(originals)) console[name] = original; f.close(); }
  });
}
