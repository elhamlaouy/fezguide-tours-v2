import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { register } from 'tsx/esm/api';
register();

function fixture({legacy=false}={}) {
  const sql = new DatabaseSync(':memory:');
  for (const file of ['0001_cms.sql','0002_media_budget.sql','0003_cms_release_safeguards.sql','0004_cms_prepared_publications.sql','0005_cms_recovery.sql','0006_cms_first_catalog_bootstrap.sql']) sql.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url),'utf8'));
  const stmt = (query, args = []) => ({
    bind(...values) { return stmt(query, values); },
    async first() { return sql.prepare(query).get(...args) ?? null; },
    async all() { return { success: true, results: sql.prepare(query).all(...args) }; },
    async run() { const result = sql.prepare(query).run(...args); return { success: true, meta: { changes: Number(result.changes) } }; },
  });
  const db = { prepare: stmt, async batch(statements) {
    sql.exec('BEGIN IMMEDIATE');
    try { const results = []; for (const statement of statements) results.push(await statement.run()); sql.exec('COMMIT'); return results; }
    catch (error) { sql.exec('ROLLBACK'); throw error; }
  } };
  const raw = '{"schemaVersion":1,"fixture":"immutable admitted source"}';
  sql.prepare('INSERT INTO cms_revisions(version,document,kind,actor,created_at,source_revision) VALUES (1,?,\'draft\',\'fixture\',\'2026-10-20T00:00:00Z\',NULL)').run(raw);
  sql.exec('UPDATE cms_documents SET version=1,draft_revision=1 WHERE id=1');
  sql.prepare('INSERT INTO cms_revision_admissions(revision,policy,digest,document_bytes,manifest) VALUES (1,?,?,?,\'[]\')').run('fixture-policy','a'.repeat(64),Buffer.byteLength(raw));
  sql.prepare(`INSERT INTO cms_artifact_catalogs(id,actor,expected_version,target_revision,source_revision,source_digest,policy,renderer,assets,origin,state,expected_entries,expires_at)
    VALUES (?,'fixture',1,2,1,?,'fixture-policy','fixture-renderer','fixture-assets','https://www.example.test','building',1,4102444800)`).run('b'.repeat(32),'a'.repeat(64));
  sql.prepare(`INSERT INTO cms_artifact_entries(catalog_id,path,object_key,etag,object_version,digest,bytes,content_type,status)
    VALUES (?, '/', ?, 'fixture-etag','fixture-version',?,4,'text/html; charset=utf-8',200)`).run('b'.repeat(32),'prepared/v1/'+ 'b'.repeat(32) +'/home','c'.repeat(64));
  sql.prepare('UPDATE cms_artifact_catalogs SET plan_json=?').run(JSON.stringify(legacy?{}:{uploadPolicy:1,uploads:[]}));
  sql.prepare("UPDATE cms_artifact_catalogs SET state='ready' WHERE id=?").run('b'.repeat(32));
  return { sql, db, raw, close() { sql.close(); } };
}

test('F6 legacy ready catalogs cannot bypass the new upload verification policy',async()=>{
  const {commitPreparedPublication}=await import('../worker/cms-publication-commit.ts');
  const f=fixture({legacy:true});
  try {
    await assert.rejects(commitPreparedPublication(f.db,{catalogId:'b'.repeat(32),expectedVersion:1,actor:'fixture',mode:'publish',policy:'fixture-policy',renderer:'fixture-renderer',assets:'fixture-assets',origin:'https://www.example.test'}),error=>error.code==='publication_conflict');
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n,1);
  }finally{f.close();}
});

test('atomic publication copies admitted immutable bytes inside D1 and binds the ready catalog', async () => {
  const { commitPreparedPublication } = await import('../worker/cms-publication-commit.ts');
  const f = fixture();
  try {
    const result = await commitPreparedPublication(f.db, { catalogId:'b'.repeat(32), expectedVersion:1, actor:'fixture', mode:'publish', policy:'fixture-policy', renderer:'fixture-renderer', assets:'fixture-assets', origin:'https://www.example.test' });
    assert.deepEqual(result,{ version:2,draftRevision:2,published:true });
    assert.deepEqual({...f.sql.prepare('SELECT version,draft_revision,published_revision FROM cms_documents').get()}, {version:2,draft_revision:2,published_revision:2});
    assert.equal(f.sql.prepare('SELECT document FROM cms_revisions WHERE version=2').get().document,f.raw);
    assert.equal(f.sql.prepare('SELECT catalog_id FROM cms_publications WHERE revision=2').get().catalog_id,'b'.repeat(32));
    assert.equal(f.sql.prepare('SELECT document FROM cms_revisions WHERE version=1').get().document,f.raw);
  } finally { f.close(); }
});

test('stale or wrong-actor publication leaves every row and pointer unchanged', async () => {
  const { commitPreparedPublication } = await import('../worker/cms-publication-commit.ts');
  for (const extra of [{expectedVersion:0},{actor:'other'},{policy:'other'},{renderer:'other'},{assets:'other'},{origin:'https://other.example.test'}]) {
    const f=fixture();
    try {
      const before=f.sql.prepare('SELECT COUNT(*) AS count FROM cms_revisions').get().count;
      await assert.rejects(commitPreparedPublication(f.db,{catalogId:'b'.repeat(32),expectedVersion:1,actor:'fixture',mode:'publish',policy:'fixture-policy',renderer:'fixture-renderer',assets:'fixture-assets',origin:'https://www.example.test',...extra}));
      assert.equal(f.sql.prepare('SELECT COUNT(*) AS count FROM cms_revisions').get().count,before);
      assert.equal(f.sql.prepare('SELECT version FROM cms_documents').get().version,1);
      assert.equal(f.sql.prepare('SELECT COUNT(*) AS count FROM cms_publications').get().count,0);
    } finally { f.close(); }
  }
});

test('ready catalogs and their routing/media membership cannot be rewritten', () => {
  const f=fixture();
  try {
    assert.throws(()=>f.sql.prepare('UPDATE cms_artifact_catalogs SET origin=? WHERE id=?').run('https://other.example.test','b'.repeat(32)));
    assert.throws(()=>f.sql.prepare('INSERT INTO cms_catalog_routes(catalog_id,route_key,canonical_path) VALUES (?,?,?)').run('b'.repeat(32),'en:home','/'));
    assert.throws(()=>f.sql.prepare('INSERT INTO cms_catalog_media(catalog_id,media_key) VALUES (?,?)').run('b'.repeat(32),'upload-fixture.webp'));
  } finally { f.close(); }
});

test('a database outage is unavailable, not an invented edit conflict', async () => {
  const { commitPreparedPublication }=await import('../worker/cms-publication-commit.ts');
  const f=fixture();
  try {
    const broken={...f.db, async batch() { throw new Error('private provider outage'); }};
    await assert.rejects(commitPreparedPublication(broken,{catalogId:'b'.repeat(32),expectedVersion:1,actor:'fixture',mode:'publish',policy:'fixture-policy',renderer:'fixture-renderer',assets:'fixture-assets',origin:'https://www.example.test'}), error=>error.status===503&&error.code==='cms_unavailable');
  } finally { f.close(); }
});

test('failure after copying the source rolls back history, catalog association and budget', async () => {
  const { commitPreparedPublication }=await import('../worker/cms-publication-commit.ts');
  const f=fixture();
  try {
    const budget={...f.sql.prepare('SELECT * FROM cms_revision_budget').get()};
    const broken={...f.db, async batch(statements) {
      return f.db.batch([...statements.slice(0,3),f.db.prepare("SELECT json('injected failure')"),...statements.slice(3)]);
    }};
    await assert.rejects(commitPreparedPublication(broken,{catalogId:'b'.repeat(32),expectedVersion:1,actor:'fixture',mode:'publish',policy:'fixture-policy',renderer:'fixture-renderer',assets:'fixture-assets',origin:'https://www.example.test'}));
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS count FROM cms_revisions').get().count,1);
    assert.equal(f.sql.prepare('SELECT version FROM cms_documents').get().version,1);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS count FROM cms_publications').get().count,0);
    assert.deepEqual({...f.sql.prepare('SELECT * FROM cms_revision_budget').get()},budget);
    assert.equal(f.sql.prepare('SELECT state FROM cms_artifact_catalogs').get().state,'ready');
  } finally { f.close(); }
});
