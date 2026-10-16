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
