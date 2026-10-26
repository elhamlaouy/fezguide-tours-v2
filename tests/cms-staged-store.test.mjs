import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { register } from 'tsx/esm/api';
register();
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { splitCmsDocument } = await import('../src/cms/document-parts.ts');
const hash = raw => createHash('sha256').update(raw).digest('hex');
const metadata = parts => parts.map(({ value, ...part }) => ({ ...part, digest: hash(JSON.stringify(value)) }));

function fixture(now) {
  const sql = new DatabaseSync(':memory:');
  for (const file of ['0001_cms.sql', '0002_media_budget.sql', '0003_cms_release_safeguards.sql', '0004_cms_prepared_publications.sql','0005_cms_recovery.sql','0006_cms_first_catalog_bootstrap.sql','0007_cms_catalog_refreshes.sql']) {
    sql.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  }
  if (now) {
    // Real SQLite statements/transactions with a controlled database clock only.
    sql.function('unixepoch', () => now.seconds);
    sql.function('strftime', (format, value) => {
      assert.equal(value, 'now');
      if (format === '%s') return String(now.seconds);
      assert.equal(format, '%Y-%m-%dT%H:%M:%fZ');
      return new Date(now.seconds * 1000).toISOString();
    });
  }
  const statement = (query, values = []) => ({
    bind(...args) { return statement(query, args); },
    async first() { return sql.prepare(query).get(...values) ?? null; },
    async all() { return { success: true, results: sql.prepare(query).all(...values) }; },
    async run() { const result = sql.prepare(query).run(...values); return { success: true, meta: { changes: Number(result.changes) } }; },
  });
  const db = { prepare: statement, async batch(statements) {
    sql.exec('BEGIN IMMEDIATE');
    try {
      const results = [];
      for (const stmt of statements) results.push(await stmt.run());
      sql.exec('COMMIT');
      return results;
    } catch (error) { sql.exec('ROLLBACK'); throw error; }
  } };
  return { sql, db, close() { sql.close(); } };
}

function smallSeed() {
  const doc = createCmsSeed();
  for (const [key, value] of Object.entries(doc)) if (Array.isArray(value)) doc[key] = [];
  for (const [key, value] of Object.entries(doc.legacy)) if (Array.isArray(value)) doc.legacy[key] = [];
  doc.pages = [{ ...createCmsSeed().pages.find(p => p.id === 'home'), sections: [] }];
  doc.footer.links = [];
  doc.uiCopy = {};
  return doc;
}
async function stage(store, doc = smallSeed(), version = 0, actor = 'actor') {
  const parts = splitCmsDocument(doc);
  const job = await store.startSave(version, actor, metadata(parts));
  for (const index of job.missing) await store.putPart(job.id, actor, parts[index]);
  return { ...job, parts };
}
const code = expected => error => error.code === expected && error.message === expected;

test('lost start acknowledgement and failed part recover by exact actor-bound resume from a new client instance', async () => {
  const Store = await load();
  const f = fixture();
  try {
    const parts = splitCmsDocument(smallSeed()), manifest = metadata(parts);
    const first = await new Store(f.db, 'test-policy').startSave(0, 'actor', manifest);
    const recovered = await new Store(f.db, 'test-policy').startSave(0, 'actor', structuredClone(manifest));
    assert.deepEqual(recovered, first);
    await new Store(f.db, 'test-policy').putPart(first.id, 'actor', parts[0]);
    await assert.rejects(new Store(f.db, 'test-policy').putPart(first.id, 'actor', { ...parts[1], summary: {} }), code('invalid_part'));
    const retry = await new Store(f.db, 'test-policy').startSave(0, 'actor', manifest);
    assert.equal(retry.id, first.id);
    assert.deepEqual(retry.missing, first.missing.slice(1));
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_save_jobs').get().n, 1);
    for (const index of retry.missing) await new Store(f.db, 'test-policy').putPart(retry.id, 'actor', parts[index]);
    assert.deepEqual(await new Store(f.db, 'test-policy').finishSave(retry.id, 'actor'), { version: 1, draftRevision: 1, published: false });
    await assert.rejects(new Store(f.db, 'test-policy').finishSave(retry.id, 'actor'), code('save_conflict'));
    await assert.rejects(new Store(f.db, 'test-policy').startSave(0, 'actor', manifest), code('save_conflict'));
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n, 1);
  } finally { f.close(); }
});

test('explicit changed manifest or policy supersedes only the observed own uncommitted job and preserves cache, history and publication', async () => {
  const Store = await load();
  const f = fixture();
  try {
    const store = new Store(f.db, 'test-policy');
    const initial = await stage(store);
    await store.finishSave(initial.id, 'actor');
    f.sql.exec('UPDATE cms_documents SET published_revision=1');
    const doc = smallSeed();
    doc.uiCopy = { interrupted: { en: 'A', fr: 'A', es: 'A' } };
    const interrupted = await stage(store, doc, 1);
    const snapshot = () => ({
      cache: f.sql.prepare('SELECT * FROM cms_validation_parts ORDER BY policy,kind,digest').all(),
      revisions: f.sql.prepare('SELECT * FROM cms_revisions').all(),
      admissions: f.sql.prepare('SELECT * FROM cms_revision_admissions').all(),
      budget: f.sql.prepare('SELECT * FROM cms_revision_budget').all(),
      pointers: f.sql.prepare('SELECT * FROM cms_documents').all(),
    });
    const before = snapshot();
    doc.uiCopy.interrupted.en = 'B';
    const parts = splitCmsDocument(doc), manifest = metadata(parts);
    const replacement = await store.startSave(1, 'actor', manifest);
    assert.notEqual(replacement.id, interrupted.id);
    assert.equal(f.sql.prepare('SELECT state FROM cms_save_jobs WHERE id=?').get(interrupted.id).state, 'expired');
    assert.deepEqual(replacement.missing, [parts.findIndex(p => p.kind === 'uiCopy')]);
    await assert.rejects(store.putPart(interrupted.id, 'actor', interrupted.parts[0]), code('save_conflict'));
    await assert.rejects(store.finishSave(interrupted.id, 'actor'), code('save_conflict'));
    assert.deepEqual(snapshot(), before);
    const repolicy = await new Store(f.db, 'new-policy').startSave(1, 'actor', manifest);
    assert.notEqual(repolicy.id, replacement.id);
    assert.deepEqual(repolicy.missing, parts.map((_, i) => i));
    assert.equal(f.sql.prepare('SELECT state FROM cms_save_jobs WHERE id=?').get(replacement.id).state, 'expired');
    assert.deepEqual(snapshot(), before);
  } finally { f.close(); }
});

test('version-stale open jobs expire transactionally regardless of lease and stale requests cannot displace an eligible other actor', async () => {
  const Store = await load();
  const f = fixture();
  try {
    const manifest = metadata(splitCmsDocument(smallSeed()));
    const old = await new Store(f.db, 'test-policy').startSave(0, 'old-actor', manifest);
    f.sql.exec("UPDATE cms_documents SET version=1; UPDATE cms_save_jobs SET expires_at=CAST(strftime('%s','now') AS INTEGER)+999999");
    const broken = { ...f.db, async batch(statements) {
      statements.push(f.db.prepare("SELECT json('rollback proof')"));
      return f.db.batch(statements);
    } };
    await assert.rejects(new Store(broken, 'test-policy').startSave(1, 'new-actor', manifest), code('save_conflict'));
    assert.equal(f.sql.prepare('SELECT state FROM cms_save_jobs WHERE id=?').get(old.id).state, 'open');
    const next = await new Store(f.db, 'test-policy').startSave(1, 'new-actor', manifest);
    assert.notEqual(next.id, old.id);
    assert.equal(f.sql.prepare('SELECT state FROM cms_save_jobs WHERE id=?').get(old.id).state, 'expired');
    const before = f.sql.prepare('SELECT * FROM cms_save_jobs WHERE id=?').get(next.id);
    for (const version of [0, 1, 2]) {
      await assert.rejects(new Store(f.db, 'other-policy').startSave(version, 'old-actor', manifest), code('save_conflict'));
      assert.deepEqual(f.sql.prepare('SELECT * FROM cms_save_jobs WHERE id=?').get(next.id), before);
    }
    await assert.rejects(new Store(f.db, 'test-policy').putPart(next.id, 'old-actor', splitCmsDocument(smallSeed())[0]), code('save_conflict'));
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n, 0);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_validation_parts').get().n, 0);
  } finally { f.close(); }
});

test('admitted part progress renews the database inactivity lease, including immutable duplicate retries', async () => {
  const Store = await load();
  const now = { seconds: 1_800_000_000 }, f = fixture(now);
  try {
    const parts = splitCmsDocument(smallSeed()), store = new Store(f.db, 'test-policy');
    const job = await store.startSave(0, 'actor', metadata(parts));
    const expiry = () => f.sql.prepare('SELECT expires_at FROM cms_save_jobs WHERE id=?').get(job.id).expires_at;
    assert.equal(expiry(), now.seconds + 1800);
    now.seconds += 1799;
    await store.putPart(job.id, 'actor', parts[0]);
    assert.equal(expiry(), now.seconds + 1800);
    const cache = f.sql.prepare('SELECT * FROM cms_validation_parts').all();
    now.seconds += 1799;
    await store.putPart(job.id, 'actor', parts[0]);
    assert.equal(expiry(), now.seconds + 1800);
    assert.deepEqual(f.sql.prepare('SELECT * FROM cms_validation_parts').all(), cache);
    now.seconds += 1799;
    const resumed = await new Store(f.db, 'test-policy').startSave(0, 'actor', metadata(parts));
    assert.equal(resumed.id, job.id);
    assert.equal(expiry(), now.seconds + 1800);
    const beforeInvalid = expiry();
    now.seconds += 30;
    await assert.rejects(store.putPart(job.id, 'actor', { ...parts[1], summary: {} }), code('invalid_part'));
    assert.equal(expiry(), beforeInvalid);
    now.seconds = expiry();
    await assert.rejects(store.putPart(job.id, 'actor', parts[1]), code('save_conflict'));
    await assert.rejects(store.finishSave(job.id, 'actor'), code('save_conflict'));
    assert.equal(expiry(), now.seconds);
    const fresh = await store.startSave(0, 'actor', metadata(parts));
    assert.notEqual(fresh.id, job.id);
    assert.equal(f.sql.prepare('SELECT state FROM cms_save_jobs WHERE id=?').get(job.id).state, 'expired');
    assert.ok(!fresh.missing.includes(0));
  } finally { f.close(); }
});

// D1 serializes batches; do not overlap two BEGINs in the single-connection adapter.
function serializedDatabase(db) {
  let tail = Promise.resolve();
  return { ...db, batch(statements) {
    const pending = tail.then(() => db.batch(statements));
    tail = pending.catch(() => {});
    return pending;
  } };
}

test('concurrent identical Save starts recover one server-owned identity', async () => {
  const Store = await load(), f = fixture();
  try {
    const db = serializedDatabase(f.db), manifest = metadata(splitCmsDocument(smallSeed()));
    const [first, second] = await Promise.all([
      new Store(db, 'test-policy').startSave(0, 'actor', manifest),
      new Store(db, 'test-policy').startSave(0, 'actor', structuredClone(manifest)),
    ]);
    assert.deepEqual(first, second);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_save_jobs').get().n, 1);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n, 0);
  } finally { f.close(); }
});

test('concurrent changed Save starts cannot supersede an unseen winner', async () => {
  const Store = await load(), f = fixture();
  try {
    const db = serializedDatabase(f.db), store = new Store(db, 'test-policy');
    const initial = await stage(store);
    const snapshot = () => ({
      cache: f.sql.prepare('SELECT * FROM cms_validation_parts ORDER BY policy,kind,digest').all(),
      revisions: f.sql.prepare('SELECT * FROM cms_revisions').all(),
      admissions: f.sql.prepare('SELECT * FROM cms_revision_admissions').all(),
      budget: f.sql.prepare('SELECT * FROM cms_revision_budget').all(),
      pointers: f.sql.prepare('SELECT * FROM cms_documents').all(),
    });
    const before = snapshot();
    const attempts = ['B', 'C'].map(value => {
      const doc = smallSeed();
      doc.uiCopy = { concurrent: { en: value, fr: value, es: value } };
      return { manifest: metadata(splitCmsDocument(doc)) };
    });
    const outcomes = await Promise.allSettled(attempts.map(({ manifest }) => new Store(db, 'test-policy').startSave(0, 'actor', manifest)));
    const winners = outcomes.filter(result => result.status === 'fulfilled');
    const losers = outcomes.filter(result => result.status === 'rejected');
    assert.equal(winners.length, 1);
    assert.equal(losers.length, 1);
    assert.ok(code('save_conflict')(losers[0].reason));
    const current = f.sql.prepare("SELECT * FROM cms_save_jobs WHERE state='open'").get();
    assert.equal(current.id, winners[0].value.id);
    assert.notEqual(current.id, initial.id);
    assert.equal(f.sql.prepare('SELECT state FROM cms_save_jobs WHERE id=?').get(initial.id).state, 'expired');
    const winningManifest = JSON.parse(current.manifest);
    assert.deepEqual(await store.startSave(0, 'actor', winningManifest), winners[0].value);
    await assert.rejects(store.finishSave(initial.id, 'actor'), code('save_conflict'));
    assert.deepEqual(snapshot(), before);
  } finally { f.close(); }
});

test('a delayed part cannot shorten the lease renewed by another admitted part', async () => {
  const Store = await load(), now = { seconds: 1_800_000_000 }, f = fixture(now);
  try {
    const store = new Store(f.db, 'test-policy'), parts = splitCmsDocument(smallSeed());
    const job = await store.startSave(0, 'actor', metadata(parts));
    const racing = { ...f.db, async batch(statements) {
      now.seconds += 60;
      await store.putPart(job.id, 'actor', parts[1]);
      return f.db.batch(statements);
    } };
    await new Store(racing, 'test-policy').putPart(job.id, 'actor', parts[0]);
    assert.equal(f.sql.prepare('SELECT expires_at FROM cms_save_jobs WHERE id=?').get(job.id).expires_at, now.seconds + 1800);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_validation_parts').get().n, 2);
  } finally { f.close(); }
});

test('lease expiry during admission or suppressed renewal rolls back receipt admission atomically', async () => {
  const Store = await load();
  for (const fault of ['expiry-after-admission', 'suppressed-renewal']) {
    const now = { seconds: 1_800_000_000 }, f = fixture(now);
    try {
      const store = new Store(f.db, 'test-policy'), parts = splitCmsDocument(smallSeed());
      const job = await store.startSave(0, 'actor', metadata(parts));
      const before = f.sql.prepare('SELECT * FROM cms_save_jobs WHERE id=?').get(job.id);
      now.seconds += 1799;
      f.sql.exec(fault === 'expiry-after-admission'
        ? `CREATE TRIGGER lease_fault AFTER INSERT ON cms_validation_parts BEGIN UPDATE cms_save_jobs SET expires_at=0; END`
        : `CREATE TRIGGER lease_fault BEFORE UPDATE OF expires_at ON cms_save_jobs WHEN NEW.expires_at>OLD.expires_at BEGIN SELECT RAISE(IGNORE); END`);
      await assert.rejects(store.putPart(job.id, 'actor', parts[0]), code('save_conflict'), fault);
      assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_validation_parts').get().n, 0, fault);
      assert.deepEqual(f.sql.prepare('SELECT * FROM cms_save_jobs WHERE id=?').get(job.id), before, fault);
      assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n, 0, fault);
      f.sql.exec('DROP TRIGGER lease_fault');
      await store.putPart(job.id, 'actor', parts[0]);
      assert.equal(f.sql.prepare('SELECT expires_at FROM cms_save_jobs WHERE id=?').get(job.id).expires_at, now.seconds + 1800);
    } finally { f.close(); }
  }
});

test('put rejects stale jobs and transaction-time actor, policy, expiry or version changes without caching bytes', async () => {
  const Store = await load();
  for (const mutation of [
    "UPDATE cms_documents SET version=1 WHERE id=1",
    "UPDATE cms_save_jobs SET actor='other'",
    "UPDATE cms_save_jobs SET policy='other'",
    "UPDATE cms_save_jobs SET expires_at=0",
    "UPDATE cms_save_jobs SET state='expired'",
  ]) {
    const f = fixture();
    try {
      const parts = splitCmsDocument(smallSeed());
      const started = await new Store(f.db, 'test-policy').startSave(0, 'actor', metadata(parts));
      // Race after preflight but before the write. This must be checked INSIDE D1.
      const racing = { ...f.db, async batch(statements) { f.sql.exec(mutation); return f.db.batch(statements); } };
      await assert.rejects(new Store(racing, 'test-policy').putPart(started.id, 'actor', parts[0]), code('save_conflict'));
      assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_validation_parts').get().n, 0);
    } finally { f.close(); }
  }
  const f = fixture();
  try {
    const parts = splitCmsDocument(smallSeed());
    const store = new Store(f.db, 'test-policy');
    const job = await store.startSave(0, 'actor', metadata(parts));
    f.sql.exec('UPDATE cms_documents SET version=1 WHERE id=1');
    await assert.rejects(store.putPart(job.id, 'actor', parts[0]), code('save_conflict'));
  } finally { f.close(); }
});

test('64 MiB cache ceiling includes UTF-8 summary bytes, is atomic against a racing fill, and never updates duplicate receipts', async () => {
  const Store = await load();
  const f = fixture();
  try {
    const parts = splitCmsDocument(smallSeed());
    const store = new Store(f.db, 'test-policy');
    const job = await store.startSave(0, 'actor', metadata(parts));
    await store.putPart(job.id, 'actor', parts[0]);
    const original = { ...f.sql.prepare('SELECT * FROM cms_validation_parts').get() };
    const fill = () => f.sql.prepare(`INSERT INTO cms_validation_parts(policy,kind,digest,document_json,summary_json,document_bytes)
      SELECT 'other-policy','uiCopy',?,'1',json_quote(printf('%0*d',67108864-3-COALESCE((SELECT SUM(document_bytes+length(CAST(summary_json AS BLOB))) FROM cms_validation_parts),0),0)),1`)
      .run('e'.repeat(64));
    const racing = { ...f.db, async batch(statements) { fill(); return f.db.batch(statements); } };
    await assert.rejects(new Store(racing, 'test-policy').putPart(job.id, 'actor', parts[1]), code('cms_part_storage_budget'));
    assert.equal(f.sql.prepare('SELECT SUM(document_bytes+length(CAST(summary_json AS BLOB))) AS n FROM cms_validation_parts').get().n, 64 * 1024 * 1024);
    // A cache hit stays idempotent even when there is no room for another byte.
    await store.putPart(job.id, 'actor', parts[0]);
    assert.deepEqual({ ...f.sql.prepare('SELECT * FROM cms_validation_parts WHERE policy=?').get('test-policy') }, original);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_validation_parts').get().n, 2);
  } finally { f.close(); }
});

test('final SQL assertions abort native-byte drift, mismatched admission, suppressed pointer or job writes, and unexpected publication changes', async () => {
  const Store = await load();
  const { documentAssemblySql } = await import('../worker/cms-document-sql.ts');
  for (const fault of ['native-bytes', 'admission', 'pointer', 'job', 'published']) {
    const f = fixture();
    try {
      const store = new Store(f.db, 'test-policy');
      const job = await stage(store);
      const beforeBudget = { ...f.sql.prepare('SELECT * FROM cms_revision_budget').get() };
      const raw = f.sql.prepare(documentAssemblySql()).get(job.id).document;
      const broken = { ...f.db, async batch(statements) {
        if (fault === 'admission') statements[2] = f.db.prepare(`INSERT INTO cms_revision_admissions(revision,policy,digest,document_bytes,manifest)
          VALUES (1,'test-policy',?,1,'[]')`).bind(hash(raw));
        if (fault === 'pointer') statements[3] = f.db.prepare('SELECT 1');
        if (fault === 'job') statements[4] = f.db.prepare('SELECT 1');
        if (fault === 'published') statements.splice(5, 0, f.db.prepare('UPDATE cms_documents SET published_revision=1 WHERE id=1'));
        return f.db.batch(statements);
      }, prepare(query) {
        if (fault === 'native-bytes' && query.startsWith('INSERT INTO cms_revisions')) {
          query = query.replace(documentAssemblySql(), `SELECT document || ' ' AS document,document_bytes+1 AS document_bytes,part_count FROM (${documentAssemblySql()})`);
        }
        return f.db.prepare(query);
      } };
      await assert.rejects(new Store(broken, 'test-policy').finishSave(job.id, 'actor'), undefined, fault);
      assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n, 0, fault);
      assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revision_admissions').get().n, 0, fault);
      assert.deepEqual({ ...f.sql.prepare('SELECT * FROM cms_revision_budget').get() }, beforeBudget, fault);
      assert.deepEqual({ ...f.sql.prepare('SELECT version,draft_revision,published_revision FROM cms_documents').get() }, { version: 0, draft_revision: null, published_revision: null }, fault);
      assert.equal(f.sql.prepare('SELECT state FROM cms_save_jobs').get().state, 'open', fault);
    } finally { f.close(); }
  }
});

test('manifest arrays cannot substitute inherited serialization and nonzero null-pointer states cannot masquerade as empty CMS', async () => {
  const Store = await load();
  const f = fixture();
  try {
    const store = new Store(f.db, 'test-policy');
    const manifest = metadata(splitCmsDocument(smallSeed()));
    Object.setPrototypeOf(manifest, { map: Array.prototype.map, toJSON() { return []; } });
    await assert.rejects(store.startSave(0, 'actor', manifest), code('invalid_manifest'));
    f.sql.exec('UPDATE cms_documents SET version=1 WHERE id=1');
    await assert.rejects(store.readRawContent(), code('admission_required'));
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_save_jobs').get().n, 0);
  } finally { f.close(); }
});

test('cache receipt identity includes kind even when two valid singleton values have identical hashes', async () => {
  const Store = await load();
  const f = fixture();
  try {
    const doc = smallSeed();
    doc.legacy.siteSettings = structuredClone(doc.siteSettings);
    const parts = splitCmsDocument(doc);
    const manifest = metadata(parts);
    const site = parts.findIndex(p => p.kind === 'siteSettings');
    const legacy = parts.findIndex(p => p.kind === 'legacy.siteSettings');
    assert.equal(manifest[site].digest, manifest[legacy].digest);
    const store = new Store(f.db, 'test-policy');
    const first = await store.startSave(0, 'actor', manifest);
    await store.putPart(first.id, 'actor', parts[site]);
    f.sql.exec('UPDATE cms_save_jobs SET expires_at=0');
    const second = await store.startSave(0, 'actor', manifest);
    assert.ok(!second.missing.includes(site));
    assert.ok(second.missing.includes(legacy));
    await assert.rejects(store.finishSave(second.id, 'actor'), code('parts_missing'));
  } finally { f.close(); }
});

test('cached summaries are a synchronous snapshot of admitted bytes even if the caller mutates its part during async SHA', async () => {
  const Store = await load();
  const f = fixture();
  try {
    const doc = smallSeed();
    doc.pages[0].parentId = 'dangling-parent';
    const parts = splitCmsDocument(doc);
    const page = parts.find(p => p.kind === 'pages');
    const store = new Store(f.db, 'test-policy');
    const job = await store.startSave(0, 'actor', metadata(parts));
    const original = crypto.subtle.digest;
    for (const part of parts) {
      if (part === page) {
        try {
          crypto.subtle.digest = function (...args) {
            delete part.value.parentId;
            return original.apply(this, args);
          };
          await store.putPart(job.id, 'actor', part);
        } finally { crypto.subtle.digest = original; }
      } else await store.putPart(job.id, 'actor', part);
    }
    const cached = f.sql.prepare("SELECT document_json,summary_json FROM cms_validation_parts WHERE kind='pages'").get();
    assert.equal(JSON.parse(cached.document_json).parentId, 'dangling-parent');
    assert.equal(JSON.parse(cached.summary_json).parentId, 'dangling-parent');
    await assert.rejects(store.finishSave(job.id, 'actor'), code('invalid_document'));
  } finally { f.close(); }
});

test('oversized joined source bytes are rejected in SQL before any reference-summary materialization', async () => {
  const Store = await load();
  const f = fixture();
  try {
    const doc = smallSeed();
    doc.uiCopy = Object.fromEntries(Array.from({ length: 40 }, (_, index) => [`large${index}`, { en: 'x'.repeat(20000), fr: 'x'.repeat(20000), es: 'x'.repeat(20000) }]));
    const job = await stage(new Store(f.db, 'test-policy'), doc);
    const guarded = { ...f.db, prepare(query) {
      if (query.includes('p.summary_json')) throw new Error('must reject oversized source before materializing summaries');
      return f.db.prepare(query);
    } };
    await assert.rejects(new Store(guarded, 'test-policy').finishSave(job.id, 'actor'), code('document_too_large'));
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n, 0);
  } finally { f.close(); }
});

test('native JSON overhead is included: exactly 2,000,000 bytes passes and one extra byte fails even when raw part sum fits', async () => {
  const Store = await load();
  const f = fixture();
  try {
    const doc = smallSeed();
    doc.uiCopy = Object.fromEntries(Array.from({ length: 34 }, (_, index) => [`boundary${index}`, { en: '', fr: '', es: '' }]));
    let remaining = 2_000_001 - Buffer.byteLength(JSON.stringify(doc));
    let last;
    for (const copy of Object.values(doc.uiCopy)) for (const locale of ['en', 'fr', 'es']) {
      const n = Math.min(20000, remaining);
      copy[locale] = 'x'.repeat(n);
      remaining -= n;
      if (n) last = [copy, locale];
    }
    assert.equal(remaining, 0);
    assert.equal(Buffer.byteLength(JSON.stringify(doc)), 2_000_001);
    const parts = splitCmsDocument(doc);
    assert.ok(parts.filter(p => p.kind !== 'manifest').reduce((n, p) => n + Buffer.byteLength(JSON.stringify(p.value)), 0) <= 2_000_000);
    const store = new Store(f.db, 'test-policy');
    const over = await stage(store, doc);
    await assert.rejects(store.finishSave(over.id, 'actor'), code('document_too_large'));
    f.sql.exec('UPDATE cms_save_jobs SET expires_at=0');
    last[0][last[1]] = last[0][last[1]].slice(1);
    assert.equal(Buffer.byteLength(JSON.stringify(doc)), 2_000_000);
    const exact = await stage(store, doc);
    assert.deepEqual(await store.finishSave(exact.id, 'actor'), { version: 1, draftRevision: 1, published: false });
    assert.equal(f.sql.prepare('SELECT document_bytes FROM cms_revision_admissions').get().document_bytes, 2_000_000);
    assert.deepEqual((await (await store.readRawContent()).json()).document, doc);
  } finally { f.close(); }
});

const load = async () => {
  const module = await import('../worker/cms-staged-store.ts').catch(() => ({}));
  assert.equal(typeof module.StagedCmsStore, 'function', 'real staged store class must exist');
  return module.StagedCmsStore;
};

test('same-policy receipts reuse at different indices and uiCopy keys without mutating cache, history or published pointer', async () => {
  const Store = await load();
  const f = fixture();
  try {
    const doc = smallSeed();
    const a = { en: 'A', fr: 'A', es: 'A' }, b = { en: 'B', fr: 'B', es: 'B' };
    doc.uiCopy = { first: a, second: b };
    doc.navigation = [{ id: 'one', label: a, enabled: true, pageId: 'home' }, { id: 'two', label: b, enabled: true, pageId: 'home' }];
    const store = new Store(f.db, 'test-policy');
    const first = await stage(store, doc);
    await store.finishSave(first.id, 'actor');
    f.sql.exec('UPDATE cms_documents SET published_revision=1 WHERE id=1');
    const history = f.sql.prepare('SELECT document FROM cms_revisions WHERE version=1').get().document;
    const cache = f.sql.prepare('SELECT * FROM cms_validation_parts ORDER BY policy,kind,digest').all();
    doc.uiCopy = { renamed: b, changed: a };
    doc.navigation.reverse();
    const next = await stage(store, doc, 1);
    assert.deepEqual(next.missing, []);
    assert.deepEqual(await store.finishSave(next.id, 'actor'), { version: 2, draftRevision: 2, published: false });
    assert.deepEqual((await (await store.readRawContent()).json()).document, doc);
    assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents').get().published_revision, 1);
    assert.equal(f.sql.prepare('SELECT document FROM cms_revisions WHERE version=1').get().document, history);
    assert.deepEqual(f.sql.prepare('SELECT * FROM cms_validation_parts ORDER BY policy,kind,digest').all(), cache);
    assert.throws(() => f.sql.exec("UPDATE cms_validation_parts SET summary_json='{}'"));
    assert.throws(() => f.sql.exec('DELETE FROM cms_validation_parts'));
    const newPolicy = await new Store(f.db, 'different-policy').startSave(2, 'actor', metadata(next.parts));
    assert.deepEqual(newPolicy.missing, next.parts.map((_, index) => index));
  } finally { f.close(); }
});

test('one open site job, database-clock expiry and expected-version guards do not touch source state', async () => {
  const Store = await load();
  const f = fixture();
  const previousNow = Date.now;
  try {
    Date.now = () => 0;
    const store = new Store(f.db, 'test-policy');
    const manifest = metadata(splitCmsDocument(smallSeed()));
    await assert.rejects(store.startSave(1, 'actor', manifest), code('save_conflict'));
    await assert.rejects(store.startSave(-1, 'actor', manifest), code('invalid_version'));
    const one = await store.startSave(0, 'actor', manifest);
    await assert.rejects(store.startSave(0, 'other', manifest), code('save_conflict'));
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_save_jobs').get().n, 1);
    assert.equal(f.sql.prepare("SELECT expires_at>CAST(strftime('%s','now') AS INTEGER) AS live FROM cms_save_jobs").get().live, 1);
    f.sql.exec('UPDATE cms_save_jobs SET expires_at=0');
    await assert.rejects(store.finishSave(one.id, 'actor'), code('save_conflict'));
    const two = await store.startSave(0, 'actor', manifest);
    assert.notEqual(two.id, one.id);
    assert.equal(f.sql.prepare('SELECT state FROM cms_save_jobs WHERE id=?').get(one.id).state, 'expired');
    assert.equal(f.sql.prepare('SELECT version FROM cms_documents').get().version, 0);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n, 0);
  } finally { Date.now = previousNow; f.close(); }
});

test('part checker rejects forged hashes, client summaries, unsafe kinds and undeclared positions; missing receipts cannot finish', async () => {
  const Store = await load();
  const f = fixture();
  try {
    const store = new Store(f.db, 'test-policy');
    const parts = splitCmsDocument(smallSeed());
    const manifest = metadata(parts);
    manifest[0].digest = '0'.repeat(64);
    const job = await store.startSave(0, 'actor', manifest);
    await assert.rejects(store.putPart(job.id, 'actor', parts[0]), code('part_mismatch'));
    await assert.rejects(store.putPart(job.id, 'actor', { ...parts[1], summary: {} }), code('invalid_part'));
    await assert.rejects(store.putPart(job.id, 'actor', { ...parts[1], kind: '__proto__' }), code('invalid_part'));
    await assert.rejects(store.putPart(job.id, 'actor', { kind: 'uiCopy', index: 0, key: 'safe', value: { en: 'x', fr: 'x', es: 'x' } }), code('part_mismatch'));
    await assert.rejects(store.putPart(job.id, 'wrong-actor', parts[1]), code('save_conflict'));
    await assert.rejects(new Store(f.db, 'wrong-policy').putPart(job.id, 'actor', parts[1]), code('save_conflict'));
    await store.putPart(job.id, 'actor', parts[1]);
    const cache = f.sql.prepare('SELECT * FROM cms_validation_parts').all();
    await store.putPart(job.id, 'actor', parts[1]);
    assert.deepEqual(f.sql.prepare('SELECT * FROM cms_validation_parts').all(), cache);
    await assert.rejects(store.finishSave(job.id, 'actor'), code('parts_missing'));
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n, 0);
  } finally { f.close(); }
});

test('server reference summaries enforce dangling refs, duplicate IDs, attribution and exact count closure', async () => {
  const Store = await load();
  for (const fault of ['reference', 'duplicate', 'review', 'count']) {
    const f = fixture();
    try {
      const doc = smallSeed();
      if (fault === 'reference') doc.pages[0].parentId = 'does-not-exist';
      if (fault === 'duplicate') doc.pages.push({ ...doc.pages[0] });
      if (fault === 'review') doc.reviews = [{ id: 'review', author: 'A', title: 'T', quote: 'Q', date: '2026-10-20', url: 'https://example.test/review', source: 'tripadvisor', enabled: true }];
      const parts = splitCmsDocument(doc);
      if (fault === 'count') parts[0].value.pages++;
      const store = new Store(f.db, 'test-policy');
      const job = await store.startSave(0, 'actor', metadata(parts));
      for (const part of parts) await store.putPart(job.id, 'actor', part);
      await assert.rejects(store.finishSave(job.id, 'actor'), code('invalid_document'));
      assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n, 0);
      assert.equal(f.sql.prepare('SELECT version FROM cms_documents').get().version, 0);
    } finally { f.close(); }
  }
});

test('literal 2,000,000-byte whole-document and per-part limits remain enforced after field admission', async () => {
  const Store = await load();
  const { validateCmsPart, CMS_LIMITS } = await import('../src/cms/schema.ts');
  assert.equal(CMS_LIMITS.bytes, 2_000_000);
  const copy = { en: 'é'.repeat(20000), fr: 'é'.repeat(20000), es: 'é'.repeat(20000) };
  const f = fixture();
  try {
    const doc = smallSeed();
    doc.uiCopy = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`large${i}`, copy]));
    const store = new Store(f.db, 'test-policy');
    const job = await stage(store, doc);
    await assert.rejects(store.finishSave(job.id, 'actor'), code('document_too_large'));
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n, 0);
  } finally { f.close(); }
  const g = fixture();
  try {
    const doc = smallSeed();
    doc.pages[0].sections = [{ id: 'large', type: 'richText', enabled: true, variant: 'story', blocks: Array.from({ length: 20 }, () => ({ type: 'paragraph', text: copy })) }];
    const parts = splitCmsDocument(doc);
    const part = parts.find(p => p.kind === 'pages');
    assert.equal(validateCmsPart(part).valid, true);
    assert.ok(Buffer.byteLength(JSON.stringify(part.value)) > CMS_LIMITS.bytes);
    const store = new Store(g.db, 'test-policy');
    const job = await store.startSave(0, 'actor', metadata(parts));
    await assert.rejects(store.putPart(job.id, 'actor', part), code('part_too_large'));
    assert.equal(g.sql.prepare('SELECT COUNT(*) AS n FROM cms_validation_parts').get().n, 0);
  } finally { g.close(); }
});

test('finish rejects stale actors, policy, expiry or version at the transaction boundary and rolls back injected SQL failure including budget', async () => {
  const Store = await load();
  for (const fault of ['actor', 'policy', 'expiry', 'version', 'injection']) {
    const f = fixture();
    try {
      const job = await stage(new Store(f.db, 'test-policy'));
      const beforeBudget = { ...f.sql.prepare('SELECT * FROM cms_revision_budget').get() };
      const racing = { ...f.db, async batch(statements) {
        if (fault === 'actor') f.sql.exec("UPDATE cms_save_jobs SET actor='different'");
        if (fault === 'policy') f.sql.exec("UPDATE cms_save_jobs SET policy='different'");
        if (fault === 'expiry') f.sql.exec('UPDATE cms_save_jobs SET expires_at=0');
        if (fault === 'version') f.sql.exec('UPDATE cms_documents SET version=1 WHERE id=1');
        if (fault === 'injection') statements.splice(4, 0, f.db.prepare("SELECT json('injected private provider failure')"));
        return f.db.batch(statements);
      } };
      await assert.rejects(new Store(racing, 'test-policy').finishSave(job.id, 'actor'), code('save_conflict'));
      assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n, 0);
      assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revision_admissions').get().n, 0);
      assert.deepEqual({ ...f.sql.prepare('SELECT * FROM cms_revision_budget').get() }, beforeBudget);
      assert.equal(f.sql.prepare('SELECT state FROM cms_save_jobs').get().state, 'open');
    } finally { f.close(); }
  }
});

test('raw reads require matching policy admission and never parse/stringify full source in Worker paths', async () => {
  const Store = await load();
  const f = fixture();
  try {
    const store = new Store(f.db, 'test-policy');
    const job = await stage(store);
    const parse = JSON.parse, stringify = JSON.stringify;
    const guardParse = raw => { if (typeof raw === 'string' && raw.includes('"legacy":{')) throw new Error('full document parsed'); return parse(raw); };
    const guardStringify = value => { if (value?.legacy && value.schemaVersion === 1) throw new Error('full document stringified'); return stringify(value); };
    let content, revision;
    try {
      JSON.parse = guardParse; JSON.stringify = guardStringify;
      await store.finishSave(job.id, 'actor');
      content = await store.readRawContent();
      revision = await store.readRawRevision(1);
    } finally { JSON.parse = parse; JSON.stringify = stringify; }
    assert.equal(content.headers.get('Cache-Control'), 'no-store');
    assert.match(content.headers.get('Content-Type'), /^application\/json/);
    assert.deepEqual((await content.json()).document, smallSeed());
    assert.deepEqual((await revision.json()).document, smallSeed());
    await assert.rejects(new Store(f.db, 'different-policy').readRawContent(), code('admission_required'));
    await assert.rejects(new Store(f.db, 'different-policy').readRawRevision(1), code('admission_required'));
    await assert.rejects(store.readRawRevision(9), code('revision_not_found'));
    f.sql.exec(`INSERT INTO cms_revisions(version,document,kind,actor,created_at,source_revision) VALUES (2,'{}','draft','fixture','2026-10-20',NULL);
      UPDATE cms_documents SET version=2,draft_revision=2 WHERE id=1`);
    await assert.rejects(store.readRawContent(), code('admission_required'));
    await assert.rejects(store.readRawRevision(2), code('admission_required'));
  } finally { f.close(); }
});

test('original revision-count and byte-budget triggers stay enforced and provider failures stay constant', async () => {
  const Store = await load();
  for (const column of ['revision_count', 'document_bytes']) {
    const f = fixture();
    try {
      const store = new Store(f.db, 'test-policy');
      const job = await stage(store);
      f.sql.exec(`UPDATE cms_revision_budget SET ${column}=${column === 'revision_count' ? 1000 : 25165824} WHERE id=1`);
      await assert.rejects(store.finishSave(job.id, 'actor'), code('cms_revision_storage_budget'));
      assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n, 0);
      assert.equal(f.sql.prepare('SELECT state FROM cms_save_jobs').get().state, 'open');
    } finally { f.close(); }
  }
  const broken = { prepare() { throw new Error('private data provider message'); }, async batch() { throw new Error('private data provider message'); } };
  const store = new Store(broken, 'test-policy');
  const parts = splitCmsDocument(smallSeed());
  await assert.rejects(store.startSave(0, 'actor', metadata(parts)), code('cms_unavailable'));
  await assert.rejects(store.putPart('a'.repeat(32), 'actor', parts[0]), code('cms_unavailable'));
  await assert.rejects(store.finishSave('a'.repeat(32), 'actor'), code('cms_unavailable'));
  await assert.rejects(store.readRawContent(), code('cms_unavailable'));
  await assert.rejects(store.readRawRevision(1), code('cms_unavailable'));
});

test('full seed is admitted part by part, saved as native SQL bytes, and read via raw wrappers', async t => {
  const Store = await load();
  const f = fixture();
  try {
    const store = new Store(f.db, 'test-policy');
    assert.deepEqual(await (await store.readRawContent()).json(), { version: 0, draftRevision: null, publishedRevision: null, document: null });
    const source = createCmsSeed();
    const parts = splitCmsDocument(source);
    const manifest = metadata(parts);
    const start = await store.startSave(0, 'actor', manifest);
    assert.match(start.id, /^[a-f0-9]{32}$/);
    assert.deepEqual(start.missing, parts.map((_, index) => index));
    for (const part of parts) await store.putPart(start.id, 'actor', part);
    assert.deepEqual(await store.finishSave(start.id, 'actor'), { version: 1, draftRevision: 1, published: false });
    const raw = f.sql.prepare('SELECT document FROM cms_revisions WHERE version=1').get().document;
    assert.deepEqual(JSON.parse(raw), source);
    const admission = f.sql.prepare('SELECT * FROM cms_revision_admissions').get();
    assert.equal(admission.digest, hash(raw));
    assert.equal(admission.document_bytes, Buffer.byteLength(raw));
    assert.deepEqual(JSON.parse(admission.manifest), manifest);
    t.diagnostic(JSON.stringify({ seedParts: parts.length, nativeDocumentBytes: admission.document_bytes, nativeDocumentSha256: admission.digest }));
    assert.deepEqual(await (await store.readRawContent()).json(), { version: 1, draftRevision: 1, publishedRevision: null, document: source });
    const revision = await (await store.readRawRevision(1)).json();
    assert.equal(revision.version, 1);
    assert.equal(revision.kind, 'draft');
    assert.equal(revision.sourceRevision, null);
    assert.deepEqual(revision.document, source);
    assert.equal(f.sql.prepare('SELECT state FROM cms_save_jobs').get().state, 'committed');
    assert.equal(f.sql.prepare('SELECT revision_count FROM cms_revision_budget').get().revision_count, 1);
  } finally { f.close(); }
});

test('start rejects nonclosed, unknown, poisoned, sparse, duplicate, gapped and overlimit manifest metadata before any job writes', async () => {
  const Store = await load();
  const valid = metadata(splitCmsDocument(smallSeed()));
  const malformed = [
    valid.map((m, i) => i ? m : { ...m, receipt: 'client' }),
    valid.map((m, i) => i ? m : { ...m, digest: 'A'.repeat(64) }),
    valid.map((m, i) => i ? m : { ...m, kind: '__proto__' }),
    valid.map((m, i) => i ? m : { ...m, index: 1 }),
    valid.slice(1), [...valid, valid[0]],
    valid.map(m => m.kind === 'pages' ? { ...m, index: 1 } : m),
    valid.map(m => m.kind === 'theme' ? { ...m, key: 'unallowed' } : m),
    [...valid, { kind: 'uiCopy', index: 0, key: 'constructor', digest: 'a'.repeat(64) }],
    Array.from({ length: 10000 }, () => valid[0]),
    Object.assign([...valid], { provider: true }),
    [...valid, ,],
    valid.map((m, i) => i ? m : Object.defineProperty({ ...m }, 'digest', { get() { throw new Error('must not execute'); }, enumerable: true })),
  ];
  for (const manifest of malformed) {
    const f = fixture();
    try {
      await assert.rejects(new Store(f.db, 'test-policy').startSave(0, 'actor', manifest), code('invalid_manifest'));
      assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_save_jobs').get().n, 0);
    } finally { f.close(); }
  }
  for (const [actor, policy, expected] of [['', 'p', 'invalid_actor'], [123, 'p', 'invalid_actor'], ['actor', '', 'invalid_policy']]) {
    const f = fixture();
    try { await assert.rejects(new Store(f.db, policy).startSave(0, actor, valid), code(expected)); }
    finally { f.close(); }
  }
});
