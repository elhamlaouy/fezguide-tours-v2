import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { register } from 'tsx/esm/api';
register();
function fixture(){
 const sqlite=new DatabaseSync(':memory:');for (const name of ['0001_cms.sql', '0002_media_budget.sql', '0003_cms_release_safeguards.sql']) sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
 const statement=(sql,values=[])=>({bind:(...args)=>statement(sql,args),async first(){return sqlite.prepare(sql).get(...values)??null;},async all(){return {success:true,results:sqlite.prepare(sql).all(...values)};},async run(){return {success:true,meta:{changes:Number(sqlite.prepare(sql).run(...values).changes)}};}});
 const db={prepare:statement,async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 const validate=v=>{if(v.schemaVersion!==1||!Array.isArray(v.pages))throw Error();return v;};
 return {sqlite,db,validate};
}
test('dry-run quarantine excludes uploads in ANY retained revision and preserves recent orphan originals',async()=>{
 const {orphanDryRun}=await import('../worker/cms-recovery.ts');const {CmsStore}=await import('../worker/cms-store.ts');
 const f=fixture(),store=new CmsStore(f.db,f.validate);
 const orphan='upload-87654321-1234-1234-1234-123456789012.png';
 const recent='upload-87654321-4321-1234-1234-123456789012.png';
 const old=new Date(Date.now()-8*24*3600*1000);
 const bucket={async list(){return {truncated:false,objects:[{key:`uploads/${key}`,size:3,uploaded:old},{key:`uploads/${orphan}`,size:4,uploaded:old},{key:`uploads/${recent}`,size:5,uploaded:new Date()}]};}};
 try{
  await store.saveDraft({schemaVersion:1,pages:[],media:[{src:`/media/${key}`}]},0,'owner');await store.publish(1,'owner');
  await store.saveDraft({schemaVersion:1,pages:[],media:[]},2,'owner');await store.publish(3,'owner');
  const result=await orphanDryRun(f.db,store,bucket);assert.deepEqual(result.candidates.map(o=>o.key),[`uploads/${orphan}`]);assert.equal(result.deleted,0);assert.equal(result.retainedKeys,1);
 }finally{f.sqlite.close();}
});
const key='upload-12345678-1234-1234-1234-123456789012.png';
test('backup checks all immutable revisions and media; missing/hash-mismatched restore writes nothing and valid restore stays draft',async()=>{
 const {exportBackup,restoreBackup}=await import('../worker/cms-recovery.ts');
 const {CmsStore}=await import('../worker/cms-store.ts');
 const f=fixture(),store=new CmsStore(f.db,f.validate),bytes=new Uint8Array([1,2,3]);
 let stored=bytes;const bucket={async get(){return stored?{body:new Blob([stored]).stream()}:null;}};
 try{
  await store.saveDraft({schemaVersion:1,pages:[],media:[{src:`/media/${key}`}]},0,'owner');await store.publish(1,'owner');
  const backup=await exportBackup(f.db,store,bucket);assert.equal(backup.revisions.length,2);assert.equal(backup.media.length,1);
  stored=null;await assert.rejects(restoreBackup(store,bucket,backup,1,2,'owner'),e=>e.code==='backup_media_missing');assert.equal((await store.read()).version,2);
  stored=new Uint8Array([4]);await assert.rejects(restoreBackup(store,bucket,backup,1,2,'owner'),e=>e.code==='backup_media_hash');assert.equal((await store.read()).version,2);
  stored=bytes;const corrupt=structuredClone(backup);corrupt.revisions[0].document.schemaVersion=2;await assert.rejects(restoreBackup(store,bucket,corrupt,1,2,'owner'));assert.equal((await store.read()).version,2);
  await restoreBackup(store,bucket,backup,1,2,'owner');const state=await store.read();assert.equal(state.version,3);assert.equal(state.publishedRevision,2);assert.equal(state.draftRevision,3);
 }finally{f.sqlite.close();}
});
