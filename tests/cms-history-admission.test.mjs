import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {register} from 'tsx/esm/api';
register();
const {createCmsSeed}=await import('../src/cms/seed.ts');
const {StagedCmsStore}=await import('../worker/cms-staged-store.ts');
function seed(){const doc=createCmsSeed();for(const[k,v]of Object.entries(doc))if(Array.isArray(v))doc[k]=[];for(const[k,v]of Object.entries(doc.legacy))if(Array.isArray(v))doc.legacy[k]=[];doc.pages=[{...createCmsSeed().pages.find(p=>p.id==='home'),sections:[]}];doc.footer.links=[];doc.uiCopy={};return doc;}
function fixture(){
 const sql=new DatabaseSync(':memory:');for(const file of ['0001_cms.sql','0002_media_budget.sql','0003_cms_release_safeguards.sql','0004_cms_prepared_publications.sql','0005_cms_recovery.sql','0006_cms_first_catalog_bootstrap.sql'])sql.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'));
 const raw=JSON.stringify(seed(),null,2)+'\n';
 sql.prepare("INSERT INTO cms_revisions VALUES(1,?,'draft','historic-editor','original-time',NULL)").run(raw);
 sql.prepare("INSERT INTO cms_revisions VALUES(2,?,'publish','historic-editor','second-time',1)").run(raw);
 sql.exec("UPDATE cms_documents SET version=2,draft_revision=2,published_revision=2; INSERT INTO cms_upload_reservations VALUES('untouched','historic-editor',1,10,'stored','uploads/untouched.webp')");
 const queries=[];const stmt=(q,p=[])=>({bind:(...v)=>stmt(q,v),async first(){queries.push(q);return sql.prepare(q).get(...p)??null;},async all(){queries.push(q);return{success:true,results:sql.prepare(q).all(...p)};},async run(){queries.push(q);if(/^\s*(SELECT|WITH)/i.test(q))return{success:true,results:sql.prepare(q).all(...p)};return{success:true,meta:{changes:Number(sql.prepare(q).run(...p).changes)}};}});
 const db={prepare:stmt,async batch(stmts){sql.exec('BEGIN IMMEDIATE');try{const out=[];for(const s of stmts)out.push(await s.run());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 const original=()=>Object.fromEntries(['cms_documents','cms_revisions','cms_revision_budget','cms_upload_reservations','cms_request_budgets'].map(t=>[t,sql.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all()]));
 return{sql,db,raw,queries,original,close:()=>sql.close()};
}
test('an insertion-trigger pointer drift rolls back the whole admission batch',async()=>{
 const f=fixture();try{
  const {captureHistorySnapshot,admitHistory}=await import('../scripts/cms-admit-history.mjs');
  const snapshot=await captureHistorySnapshot(f.db),before=f.original();
  f.sql.exec('CREATE TRIGGER injected_drift AFTER INSERT ON cms_validation_parts BEGIN UPDATE cms_documents SET version=3; END');
  await assert.rejects(admitHistory(f.db,snapshot));
  assert.deepEqual(f.original(),before);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_validation_parts').get().n,0);
 }finally{f.close();}
});

test('the offline CLI creates only a new private admitted copy and never rewrites its snapshot',async()=>{
 const {mkdtempSync,writeFileSync,readFileSync,existsSync,statSync,rmSync}=await import('node:fs');
 const {execFileSync}=await import('node:child_process');const path=await import('node:path');
 const f=fixture(),dir=mkdtempSync(path.join(process.env.TMPDIR,'history-admission-cli-'));
 try{
  const {captureHistorySnapshot}=await import('../scripts/cms-admit-history.mjs');const snapshot=await captureHistorySnapshot(f.db);
  const source=path.join(dir,'source.json'),output=path.join(dir,'admitted');writeFileSync(source,JSON.stringify(snapshot),{mode:0o600});const before=readFileSync(source);
  execFileSync(process.execPath,['scripts/cms-admit-history.mjs','--snapshot',source,'--output-dir',output],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.ok(existsSync(path.join(output,'admitted-copy.sqlite')));assert.deepEqual(readFileSync(source),before);assert.equal(statSync(output).mode&0o777,0o700);assert.equal(statSync(path.join(output,'admitted-copy.sqlite')).mode&0o777,0o600);
  const copy=new DatabaseSync(path.join(output,'admitted-copy.sqlite'),{readOnly:true});try{assert.equal(copy.prepare('SELECT document FROM cms_revisions WHERE version=1').get().document,f.raw);assert.equal(copy.prepare('SELECT COUNT(*) AS n FROM cms_revision_admissions').get().n,2);}finally{copy.close();}
 }finally{f.close();rmSync(dir,{recursive:true,force:true});}
});

for(const mode of ['same-plan','policy-change','interrupted'])test(`admission resumes safely without rewriting original history: ${mode}`,async()=>{
 const f=fixture();try{
  const {captureHistorySnapshot,admitHistory,planHistoryAdmission,historyPolicy}=await import('../scripts/cms-admit-history.mjs');const snapshot=await captureHistorySnapshot(f.db),before=f.original();
  if(mode==='policy-change')f.sql.prepare("INSERT INTO cms_revision_admissions VALUES(1,'old-policy',?,1,'[]')").run('a'.repeat(64));
  if(mode==='interrupted'){let calls=0;const batch=f.db.batch;f.db.batch=async statements=>{if(++calls===3)throw Error('lost connection');return batch(statements);};await assert.rejects(admitHistory(f.db,snapshot));f.db.batch=batch;assert.ok(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_validation_parts').get().n>0);}
  await admitHistory(f.db,snapshot);const stable=f.sql.prepare('SELECT * FROM cms_validation_parts ORDER BY kind,digest').all();await admitHistory(f.db,snapshot);
  assert.deepEqual(f.sql.prepare('SELECT * FROM cms_validation_parts ORDER BY kind,digest').all(),stable);assert.deepEqual(f.original(),before);
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revision_admissions WHERE policy=?').get(historyPolicy).n,2);
  assert.equal(stable.length,planHistoryAdmission(snapshot).parts.length);
 }finally{f.close();}
});
for(const mode of ['bad-schema','dangling-reference','duplicate-key','stale-site','bad-budget'])test(`invalid or stale history is rejected before admission: ${mode}`,async()=>{
 const f=fixture();try{
  const {captureHistorySnapshot,admitHistory}=await import('../scripts/cms-admit-history.mjs');const snapshot=await captureHistorySnapshot(f.db);
  if(mode==='bad-schema'||mode==='dangling-reference'){const doc=JSON.parse(snapshot.revisions[1].document);if(mode==='bad-schema')doc.theme.font='unsupported';else doc.navigation=[{id:'missing-link',label:{en:'Missing',fr:'Missing',es:'Missing'},href:'/x',pageId:'absent',enabled:true}];snapshot.revisions[1].document=JSON.stringify(doc);snapshot.revisionBudget[0].document_bytes=snapshot.revisions.reduce((n,r)=>n+Buffer.byteLength(r.document),0);}
  if(mode==='duplicate-key'){snapshot.revisions[0].document=snapshot.revisions[0].document.replace('{','{"schemaVersion":999,');snapshot.revisionBudget[0].document_bytes=snapshot.revisions.reduce((n,r)=>n+Buffer.byteLength(r.document),0);}
  if(mode==='stale-site')f.sql.exec('UPDATE cms_documents SET published_revision=1');
  if(mode==='bad-budget')snapshot.revisionBudget[0].document_bytes++;
  const expected=mode==='stale-site'?'history_source_conflict':mode==='bad-budget'?'history_invalid_budget':'history_invalid_document';
  const before=f.original();await assert.rejects(admitHistory(f.db,snapshot),e=>e.code===expected);assert.deepEqual(f.original(),before);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_validation_parts').get().n,0);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revision_admissions').get().n,0);
 }finally{f.close();}
});
for(const table of ['cms_validation_parts','cms_revision_admissions'])test(`suppressed ${table} insertion cannot issue an incomplete admission`,async()=>{
 const f=fixture();try{
  const {captureHistorySnapshot,admitHistory}=await import('../scripts/cms-admit-history.mjs');const snapshot=await captureHistorySnapshot(f.db),before=f.original();f.sql.exec(`CREATE TRIGGER suppress_insert BEFORE INSERT ON ${table} BEGIN SELECT RAISE(IGNORE); END`);
  await assert.rejects(admitHistory(f.db,snapshot));assert.deepEqual(f.original(),before);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revision_admissions').get().n,0);
 }finally{f.close();}
});

for(const table of ['cms_validation_parts','cms_revision_admissions'])test(`a conflicting immutable ${table} receipt is rejected, never repaired`,async()=>{
 const f=fixture();try{
  const {captureHistorySnapshot,planHistoryAdmission,admitHistory,historyPolicy}=await import('../scripts/cms-admit-history.mjs');const snapshot=await captureHistorySnapshot(f.db),plan=planHistoryAdmission(snapshot),before=f.original();
  if(table==='cms_validation_parts'){const p=plan.parts[0];f.sql.prepare('INSERT INTO cms_validation_parts VALUES(?,?,?,?,?,?)').run(historyPolicy,p.kind,p.digest,'{}','{}',2);}
  else f.sql.prepare("INSERT INTO cms_revision_admissions VALUES(1,?, ?,1,'[]')").run(historyPolicy,'b'.repeat(64));
  const receipts=f.sql.prepare(`SELECT * FROM ${table}`).all();await assert.rejects(admitHistory(f.db,snapshot));assert.deepEqual(f.sql.prepare(`SELECT * FROM ${table}`).all(),receipts);assert.deepEqual(f.original(),before);
 }finally{f.close();}
});

test('CLI refuses symlink input, symlink output ancestry and existing destinations',async()=>{
 const fs=await import('node:fs'),path=await import('node:path'),{spawnSync}=await import('node:child_process');const f=fixture(),dir=fs.mkdtempSync(path.join(process.env.TMPDIR,'history-paths-'));
 try{
  const {captureHistorySnapshot}=await import('../scripts/cms-admit-history.mjs'),snapshot=await captureHistorySnapshot(f.db);
  const source=path.join(dir,'source.json');fs.writeFileSync(source,JSON.stringify(snapshot));fs.symlinkSync(source,path.join(dir,'source-link'));fs.symlinkSync(dir,path.join(dir,'parent-link'));fs.mkdirSync(path.join(dir,'existing'));fs.writeFileSync(path.join(dir,'existing','sentinel'),'untouched');
  for(const [input,output]of [[path.join(dir,'source-link'),path.join(dir,'bad-input')],[source,path.join(dir,'parent-link','bad-parent')],[source,path.join(dir,'existing')]]){
   const result=spawnSync(process.execPath,['scripts/cms-admit-history.mjs','--snapshot',input,'--output-dir',output],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.notEqual(result.status,0);
  }
  assert.equal(fs.existsSync(path.join(dir,'bad-input')),false);assert.equal(fs.existsSync(path.join(dir,'bad-parent')),false);assert.equal(fs.readFileSync(path.join(dir,'existing','sentinel'),'utf8'),'untouched');
 }finally{f.close();fs.rmSync(dir,{recursive:true,force:true});}
});

test('old retained history gains exact-byte current-policy admissions without changing any original table',async()=>{
 const f=fixture();try{
  const {captureHistorySnapshot,admitHistory,historyPolicy}=await import('../scripts/cms-admit-history.mjs');
  const store=new StagedCmsStore(f.db,historyPolicy);await assert.rejects(store.readRawContent(),e=>e.code==='admission_required');
  const before=f.original(),snapshot=await captureHistorySnapshot(f.db),result=await admitHistory(f.db,snapshot);
  assert.equal(result.admittedRevisions,2);assert.deepEqual(f.original(),before);
  assert.ok(f.queries.filter(q=>/^\s*(INSERT|UPDATE|DELETE)\b/i.test(q)).every(q=>/^\s*INSERT INTO cms_(validation_parts|revision_admissions)\b/i.test(q)),'operator apply writes only additive admission tables');
  const response=await store.readRawContent();assert.equal(response.status,200);assert.ok((await response.text()).endsWith(',"document":'+f.raw+'}'));
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_publications').get().n,0,'admission does not publish or forge prepared artifacts');
 }finally{f.close();}
});
