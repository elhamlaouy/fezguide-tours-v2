import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
const key=n=>`upload-${String(n).padStart(8,'0')}-1234-1234-1234-123456789012.png`;
function fixture(){const sql=new DatabaseSync(':memory:');for(const name of ['0001_cms.sql','0002_media_budget.sql','0003_cms_release_safeguards.sql','0004_cms_prepared_publications.sql','0005_cms_recovery.sql','0006_cms_first_catalog_bootstrap.sql'])sql.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
 const queries=[];const statement=(q,p=[])=>({bind:(...args)=>statement(q,args),async first(){queries.push(q);return sql.prepare(q).get(...p)??null;},async all(){queries.push(q);return{success:true,results:sql.prepare(q).all(...p)};}});
 const old=new Date('2020-01-01T00:00:00.000Z');const objects=Array.from({length:20},(_,i)=>({key:'uploads/'+key(i+1),size:3,uploaded:old,etag:'etag-'+i,version:'version-'+i}));
 return{sql,queries,db:{prepare:statement},objects,bucket:{async list({limit,cursor}){const offset=Number(cursor??0),page=objects.slice(offset,offset+limit);return{objects:page,truncated:offset+limit<objects.length,...(offset+limit<objects.length?{cursor:String(offset+limit)}:{})};}}};}
test('read-only paginated audit protects every retained revision, absolute/embedded URLs, cached drafts and reservations',async()=>{
 const {auditRecoveryObjects}=await import('../scripts/cms-recovery-inventory.mjs');const f=fixture();try{
  const document=JSON.stringify({hidden:`https://old-origin.test/media/${key(1)}?x=1`,body:`an embedded /media/${key(2)} reference`});
  f.sql.prepare("INSERT INTO cms_revisions VALUES(1,?,'draft','owner','unchanged',NULL)").run(document);f.sql.exec('UPDATE cms_documents SET version=1,draft_revision=1 WHERE id=1');
  const raw=JSON.stringify({src:'/media/'+key(3)});f.sql.prepare('INSERT INTO cms_validation_parts(policy,kind,digest,document_json,summary_json,document_bytes) VALUES(?,?,?,?,?,?)').run('test','page','a'.repeat(64),raw,'{}',Buffer.byteLength(raw));
  f.sql.prepare("INSERT INTO cms_upload_reservations VALUES('kept','owner',1,3,'released',?)").run('uploads/'+key(4));
  f.objects[4].uploaded=new Date('2026-10-22T00:00:00.000Z');
  const before=JSON.stringify(f.sql.prepare('SELECT * FROM cms_revisions').all());const result=await auditRecoveryObjects(f.db,f.bucket,new Date('2026-10-22T12:00:00Z'));
  assert.equal(result.complete,true);assert.equal(result.deleted,0);assert.equal(result.scanned,20);assert.equal(result.pages,2);assert.equal(result.protected,5);assert.equal(result.candidates.length,15);assert.deepEqual(result.candidates.map(x=>x.key),f.objects.slice(5).map(x=>x.key));
  assert.equal(before,JSON.stringify(f.sql.prepare('SELECT * FROM cms_revisions').all()));assert.ok(f.queries.every(q=>/^\s*(SELECT|WITH)\b/i.test(q)));
 }finally{f.sql.close();}
});
test('unknown namespaces and malformed timestamps are never cleanup candidates',async()=>{const {auditRecoveryObjects}=await import('../scripts/cms-recovery-inventory.mjs');const f=fixture();try{f.objects.splice(0,f.objects.length,{key:'unknown/private',size:4,uploaded:new Date(),version:'x',etag:'x'},{key:'uploads/'+key(99),size:3,uploaded:new Date('invalid'),version:'y',etag:'y'});const result=await auditRecoveryObjects(f.db,f.bucket);assert.equal(result.candidates.length,0);assert.equal(result.unknown,2);assert.equal(result.deleted,0);}finally{f.sql.close();}});
test('nonprogressing inventory and active save jobs fail closed without a partial cleanup plan',async()=>{const {auditRecoveryObjects}=await import('../scripts/cms-recovery-inventory.mjs');const f=fixture();try{
 await assert.rejects(auditRecoveryObjects(f.db,{async list(){return{objects:[],truncated:true,cursor:'same'};}}),/recovery_inventory_conflict/);
 f.sql.prepare("INSERT INTO cms_save_jobs(id,actor,expected_version,policy,manifest,state,expires_at) VALUES(?,'owner',0,'test','[]','open',unixepoch()+1800)").run('a'.repeat(32));await assert.rejects(auditRecoveryObjects(f.db,f.bucket),/recovery_busy/);
}finally{f.sql.close();}});
test('source pointer drift during a read-only audit invalidates its result',async()=>{const {auditRecoveryObjects}=await import('../scripts/cms-recovery-inventory.mjs');const f=fixture();try{const list=f.bucket.list;f.bucket.list=async options=>{const page=await list(options);if(!page.truncated)f.sql.exec('UPDATE cms_documents SET version=1 WHERE id=1');return page;};await assert.rejects(auditRecoveryObjects(f.db,f.bucket),/recovery_source_conflict/);}finally{f.sql.close();}});
