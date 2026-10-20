import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { register } from 'tsx/esm/api';
register();
const { MEDIA_BUDGET, reserveUpload, releaseUpload, markUploadWrite, finishUpload } = await import('../worker/media-budget.ts');

function database() {
 const sqlite = new DatabaseSync(':memory:');
 for (const name of ['0001_cms.sql', '0002_media_budget.sql', '0003_cms_release_safeguards.sql']) sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
 const statement = (sql, values = []) => ({
  bind: (...args) => statement(sql, args),
  async first() { return sqlite.prepare(sql).get(...values) ?? null; },
  async run() { return { success: true, meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } }; },
 });
 return { sqlite, prepare: statement };
}
function releasedCount(db) { return db.sqlite.prepare("SELECT COUNT(*) AS count FROM cms_upload_reservations WHERE state='released'").get().count; }

test('released rows stay bounded over three expired upload windows', async t => {
 const db = database();
 let now = 1_000_000;
 t.mock.method(Date, 'now', () => now * 1000);
 try {
  const counts = [];
  for (let window = 0; window < 3; window++) {
   for (let attempt = 0; attempt < MEDIA_BUDGET.identityUploads; attempt++) await releaseUpload(db, await reserveUpload(db, 'owner', 100));
   counts.push(releasedCount(db));
   now += MEDIA_BUDGET.windowSeconds + 1;
  }
  t.diagnostic(`released rows per completed window: ${counts.join(', ')}; active bytes: ${db.sqlite.prepare("SELECT COALESCE(SUM(bytes),0) AS bytes FROM cms_upload_reservations WHERE state!='released'").get().bytes}`);
  assert.deepEqual(counts, [30, 30, 30]);
 } finally { db.sqlite.close(); }
});

test('cleanup removes at most 30 expired released rows per reservation, across actors', async t => {
 const db = database();
 const now = 1_000_000;
 t.mock.method(Date, 'now', () => now * 1000);
 try {
  const insert = db.sqlite.prepare("INSERT INTO cms_upload_reservations VALUES (?,?,?,0,'released',NULL)");
  for (let i = 0; i < 67; i++) insert.run(`old-${i}`, `old-owner-${i % 2}`, now - MEDIA_BUDGET.windowSeconds - 1);
  const remaining = [];
  for (let i = 0; i < 3; i++) {
   await releaseUpload(db, await reserveUpload(db, 'new-owner', 100));
   remaining.push(db.sqlite.prepare("SELECT COUNT(*) AS count FROM cms_upload_reservations WHERE id LIKE 'old-%'").get().count);
  }
  assert.deepEqual(remaining, [37, 7, 0]);
  assert.equal(releasedCount(db), 3, 'new charges survive every cleanup pass');
  t.diagnostic(`expired backlog: 67 -> ${remaining.join(' -> ')}; current released charges: ${releasedCount(db)}`);
 } finally { db.sqlite.close(); }
});

test('30 released attempts remain charged and attempt 31 is denied throughout the current window', async t => {
 const db = database();
 let now = 1_000_000;
 t.mock.method(Date, 'now', () => now * 1000);
 try {
  for (let i = 0; i < 30; i++) await releaseUpload(db, await reserveUpload(db, 'owner', 100));
  now += MEDIA_BUDGET.windowSeconds - 1;
  for (let i = 0; i < 3; i++) await assert.rejects(reserveUpload(db, 'owner', 100), e => e.status === 429 && e.code === 'media_upload_rate');
  assert.equal(releasedCount(db), 30);
  assert.equal(db.sqlite.prepare('SELECT SUM(bytes) AS bytes FROM cms_upload_reservations').get().bytes, 0);
  await releaseUpload(db, await reserveUpload(db, 'other-owner', 100));
  assert.equal(releasedCount(db), 31, 'a separate identity still has its own allowance');
  now += 2;
  await releaseUpload(db, await reserveUpload(db, 'owner', 100));
  assert.equal(releasedCount(db), 2, 'expired owner charges disappear; both current identity charges remain');
  t.diagnostic('30 released attempts allowed; next 3 denied with 429 media_upload_rate; fresh-window admission succeeds');
 } finally { db.sqlite.close(); }
});

test('cleanup retains the exact full-window boundary and deletes only after it', async t => {
 const db = database();
 let now = 1_000_000;
 t.mock.method(Date, 'now', () => now * 1000);
 try {
  const old = await reserveUpload(db, 'owner', 100);
  await releaseUpload(db, old);
  now += MEDIA_BUDGET.windowSeconds;
  const boundary = await reserveUpload(db, 'owner', 100);
  await releaseUpload(db, boundary);
  assert.equal(releasedCount(db), 2);
  assert.ok(db.sqlite.prepare('SELECT id FROM cms_upload_reservations WHERE id=?').get(old));
  now++;
  await releaseUpload(db, await reserveUpload(db, 'owner', 100));
  assert.equal(db.sqlite.prepare('SELECT id FROM cms_upload_reservations WHERE id=?').get(old), undefined);
  assert.ok(db.sqlite.prepare('SELECT id FROM cms_upload_reservations WHERE id=?').get(boundary));
  assert.equal(releasedCount(db), 2);
 } finally { db.sqlite.close(); }
});

test('expired pending, stored and ambiguous writes retain byte/object accounting and immutable image history', async t => {
 const db = database();
 let now = 1_000_000;
 t.mock.method(Date, 'now', () => now * 1000);
 try {
  await releaseUpload(db, await reserveUpload(db, 'owner', 100));
  const pending = await reserveUpload(db, 'owner', 100);
  const stored = await reserveUpload(db, 'owner', 100);
  await markUploadWrite(db, stored, 'uploads/historical.png');
  await finishUpload(db, stored, 'uploads/historical.png', 40);
  const ambiguous = await reserveUpload(db, 'owner', 100);
  await markUploadWrite(db, ambiguous, 'uploads/ambiguous.png');
  await releaseUpload(db, ambiguous);
  await releaseUpload(db, stored);
  // Defensive fixtures: a released label alone must not erase possible object/byte evidence.
  db.sqlite.prepare("INSERT INTO cms_upload_reservations VALUES ('released-key','owner',?,0,'released','uploads/uncertain.png')").run(now);
  db.sqlite.prepare("INSERT INTO cms_upload_reservations VALUES ('released-bytes','owner',?,17,'released',NULL)").run(now);
  const document = JSON.stringify({ media: [{ id: 'historical', src: '/media/historical.png' }], privateMedia: '/media/private.png' });
  db.sqlite.prepare("INSERT INTO cms_revisions VALUES (1,?,'publish','owner','2026-01-01T00:00:00Z',NULL)").run(document);
  db.sqlite.prepare("INSERT INTO cms_revisions VALUES (2,?,'draft','owner','2026-01-02T00:00:00Z',1)").run(document);
  db.sqlite.exec('UPDATE cms_documents SET version=2,published_revision=1,draft_revision=2 WHERE id=1');
  const history = () => ['cms_documents', 'cms_revisions', 'cms_revision_budget'].map(table => db.sqlite.prepare(`SELECT * FROM ${table} ORDER BY 1`).all());
  const beforeHistory = history();
  const retained = db.sqlite.prepare("SELECT * FROM cms_upload_reservations WHERE state!='released' OR object_key IS NOT NULL OR bytes>0 ORDER BY id").all();
  assert.equal(retained.length, 5);
  now += 3 * MEDIA_BUDGET.windowSeconds + 1;
  await assert.rejects(reserveUpload(db, 'other-owner', 1, { ...MEDIA_BUDGET, maxBytes: 240 }), e => e.status === 429 && e.code === 'media_storage_budget');
  await assert.rejects(reserveUpload(db, 'other-owner', 1, { ...MEDIA_BUDGET, maxObjects: 3 }), e => e.status === 429 && e.code === 'media_storage_budget');
  const active = db.sqlite.prepare("SELECT COUNT(*) AS objects,SUM(bytes) AS bytes FROM cms_upload_reservations WHERE state!='released'").get();
  assert.equal(active.objects, 3);
  assert.equal(active.bytes, 240);
  assert.equal(releasedCount(db), 2, 'only the two suspicious released rows remain');
  assert.deepEqual(db.sqlite.prepare('SELECT * FROM cms_upload_reservations ORDER BY id').all(), retained);
  const admitted = await reserveUpload(db, 'other-owner', 1, { ...MEDIA_BUDGET, maxBytes: 241, maxObjects: 4 });
  assert.deepEqual(db.sqlite.prepare('SELECT * FROM cms_upload_reservations WHERE id!=? ORDER BY id').all(admitted), retained);
  assert.deepEqual(history(), beforeHistory);
  assert.ok(retained.some(row => row.id === pending && row.object_key === null && row.bytes === 100));
  assert.ok(retained.some(row => row.id === stored && row.state === 'stored' && row.bytes === 40));
  assert.ok(retained.some(row => row.id === ambiguous && row.state === 'pending' && row.object_key === 'uploads/ambiguous.png' && row.bytes === 100));
  t.diagnostic(`retained before admission: ${active.objects} active objects / ${active.bytes} bytes, 2 suspicious released rows, ${beforeHistory[1].length} unchanged revisions; exact 241-byte/4-object admission succeeds`);
 } finally { db.sqlite.close(); }
});

test('an unsuccessful cleanup fails closed before admitting another reservation', async t => {
 const db = database();
 try {
  const unavailable = { prepare(sql) { return sql.startsWith('DELETE') ? { bind() { return { async run() { return { success: false }; } }; } } : db.prepare(sql); } };
  await assert.rejects(reserveUpload(unavailable, 'owner', 100), e => e.status === 503 && e.code === 'media_budget_unavailable');
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS count FROM cms_upload_reservations').get().count, 0);
 } finally { db.sqlite.close(); }
});
