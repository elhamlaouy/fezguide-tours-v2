import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { register } from 'tsx/esm/api';
register();
function database() {
 const sqlite=new DatabaseSync(':memory:');
 for(const name of ['0001_cms.sql','0002_media_budget.sql','0003_cms_release_safeguards.sql']) sqlite.exec(readFileSync(new URL(`../migrations/${name}`,import.meta.url),'utf8'));
 const statement=(sql,values=[])=>({bind:(...args)=>statement(sql,args),async first(){return sqlite.prepare(sql).get(...values)??null;},async all(){return {success:true,results:sqlite.prepare(sql).all(...values)};},async run(){return {success:true,meta:{changes:Number(sqlite.prepare(sql).run(...values).changes)}};}});
 return {sqlite,prepare:statement};
}
test('R2-intent reservations stay conservative and retain the exact key after ambiguous writes',async()=>{
 const {reserveUpload,markUploadWrite,releaseUpload}=await import('../worker/media-budget.ts');
 const db=database();try{
  const id=await reserveUpload(db,'owner',100,{maxBytes:100,maxObjects:1,identityUploads:30,windowSeconds:3600});
  await markUploadWrite(db,id,'uploads/known.png');await releaseUpload(db,id);
  const row=db.sqlite.prepare('SELECT object_key,bytes,state FROM cms_upload_reservations').get();assert.equal(row.object_key,'uploads/known.png');assert.equal(row.bytes,100);assert.equal(row.state,'pending');
 }finally{db.sqlite.close();}
});
test('failed reservations release bytes but preserve durable per-identity attempt rate',async()=>{
 const {reserveUpload,releaseUpload}=await import('../worker/media-budget.ts');
 const db=database();
 try {
  const limits={maxBytes:100,maxObjects:1,identityUploads:2,windowSeconds:3600};
  for(let i=0;i<2;i++) await releaseUpload(db,await reserveUpload(db,'editor',100,limits));
  await assert.rejects(reserveUpload(db,'editor',100,limits),e=>e.code==='media_upload_rate');
  assert.equal(db.sqlite.prepare('SELECT SUM(bytes) AS bytes FROM cms_upload_reservations').get().bytes,0);
  assert.ok(await reserveUpload(db,'other',100,limits));
 } finally {db.sqlite.close();}
});
test('durable storage reservation admits only one concurrent final slot and charges orphan uploads',async()=>{
 const {reserveUpload,finishUpload,releaseUpload}=await import('../worker/media-budget.ts');
 const db=database();
 try {
  const limits={maxBytes:100,maxObjects:1,identityUploads:2,windowSeconds:3600};
  const results=await Promise.allSettled([reserveUpload(db,'editor',100,limits),reserveUpload(db,'editor',100,limits)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const winner=results.find(r=>r.status==='fulfilled').value;
  await finishUpload(db,winner,'uploads/orphan.png',40);
  await assert.rejects(reserveUpload(db,'other',1,limits),e=>e.code==='media_storage_budget');
  await releaseUpload(db,winner);
  assert.equal(db.sqlite.prepare('SELECT bytes FROM cms_upload_reservations').get().bytes,40,'completed uploads cannot release storage');
 } finally {db.sqlite.close();}
});

test('migration 0007 raises the revision storage cap to 300 MiB on the v2 schema', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { readFileSync } = await import('node:fs');
  const sqlite = new DatabaseSync(':memory:');
  for (const name of ['0004_cms_schema.sql', '0005_cms_media.sql', '0006_cms_budgets.sql', '0007_cms_revision_budget_300mb.sql']) sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
  const insert = (v, bytes) => sqlite.prepare("INSERT INTO cms_revisions (version, document, kind, actor, created_at) VALUES (?, ?, 'draft', 'test', 'now')").run(v, JSON.stringify({ x: 'a'.repeat(bytes) }));
  // 40 revisions of ~650 KB (~26 MB) used to be refused after ~37.
  for (let v = 1; v <= 40; v++) insert(v, 650_000);
  assert.equal(sqlite.prepare('SELECT revision_count FROM cms_revision_budget').get().revision_count, 40);
  sqlite.prepare('UPDATE cms_revision_budget SET document_bytes = ?').run(314572800 - 100);
  assert.throws(() => insert(41, 1000), /cms_revision_storage_budget/, 'the new cap still fails closed');
});

test('revision retention (migration 0008): storage stays bounded, history and pointers stay safe', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { readFileSync } = await import('node:fs');
  const { CmsStore, REVISION_RETENTION } = await import('../worker/cms-store.ts');
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const name of ['0004_cms_schema.sql', '0005_cms_media.sql', '0006_cms_budgets.sql', '0007_cms_revision_budget_300mb.sql', '0008_cms_revision_retention.sql']) sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
  const statement = (sql, values = []) => ({ bind: (...args) => statement(sql, args),
    async first() { return sqlite.prepare(sql).get(...values) ?? null; }, async all() { return { success: true, results: sqlite.prepare(sql).all(...values) }; },
    async run() { return { success: true, meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } }; } });
  const db = { prepare: statement, async batch(list) { sqlite.exec('BEGIN'); try { const out = []; for (const s of list) out.push(await s.run()); sqlite.exec('COMMIT'); return out; } catch (e) { sqlite.exec('ROLLBACK'); throw e; } } };
  const store = new CmsStore(db, v => v);
  const doc = n => ({ schemaVersion: 1, pages: [{ id: 'home', n }], pad: 'x'.repeat(5000) });
  let version = 0;
  version = (await store.saveDraft(doc(0), version, 'owner')).version;
  version = (await store.publish(version, 'owner')).version;            // v2 publishes v1
  const keepPublished = version;
  for (let i = 1; i <= 130; i++) version = (await store.saveDraft(doc(i), version, 'owner')).version;
  const rows = sqlite.prepare('SELECT version, source_revision FROM cms_revisions ORDER BY version').all();
  assert.ok(rows.length <= REVISION_RETENTION + 3, `kept ${rows.length} revisions`);
  const versions = new Set(rows.map(r => r.version));
  assert.ok(versions.has(keepPublished), 'the published revision is never pruned, however old');
  assert.ok(versions.has(1), 'a revision referenced by a kept one (publish source) is kept');
  for (let v = version - REVISION_RETENTION + 1; v <= version; v++) assert.ok(versions.has(v), `recent revision ${v} kept`);
  const budget = sqlite.prepare('SELECT revision_count, document_bytes FROM cms_revision_budget').get();
  const actual = sqlite.prepare('SELECT COUNT(*) n, SUM(length(CAST(document AS BLOB))) b FROM cms_revisions').get();
  assert.equal(budget.revision_count, actual.n); assert.equal(budget.document_bytes, actual.b, 'budget stays exact');
  assert.throws(() => sqlite.prepare('DELETE FROM cms_revisions WHERE version = ?').run(version), /immutable/, 'recent revisions cannot be deleted');
  assert.throws(() => sqlite.prepare('UPDATE cms_revisions SET actor = ? WHERE version = ?').run('x', version), /immutable/, 'revisions are still never updated');
  const state = await store.read(); assert.equal(state.version, version); assert.equal(state.publishedRevision, keepPublished);
  await store.rollback(keepPublished, version, 'owner');   // old published revision can still be restored
});
