import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { register } from 'tsx/esm/api';
import {fixtureUpload} from './fixtures/cms-upload.mjs';
register();
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { splitCmsDocument } = await import('../src/cms/document-parts.ts');
const { StagedCmsStore } = await import('../worker/cms-staged-store.ts');
const hash = value => createHash('sha256').update(value).digest('hex');
const shell = '<!doctype html><html lang="en"><head><title>Authored</title><script type="module" src="/assets/authored.js"></script></head><body><div id="root"></div></body></html>';
const config = { shell:hash(shell), policy:'prepare-test-v1', renderer:'current-authored-renderer-v1', assets:hash('complete-dist-manifest'), origin:'https://fezguidetours.com' };
const code = expected => error => error.code === expected && error.message === expected;
async function load() {
  const module = await import('../worker/cms-publication-prepare.ts').catch(() => ({}));
  assert.equal(typeof module.PublicationPreparer,'function','real PublicationPreparer must exist');
  return module.PublicationPreparer;
}
function seed() {
  const document = createCmsSeed();
  for (const [key,value] of Object.entries(document)) if (Array.isArray(value)) document[key]=[];
  for (const [key,value] of Object.entries(document.legacy)) if (Array.isArray(value)) document.legacy[key]=[];
  document.pages=[{...createCmsSeed().pages.find(page=>page.id==='home'), title:{en:'Home',fr:'Accueil',es:'Inicio'}, sections:[]}];
  document.footer.links=[];
  document.uiCopy={};
  return document;
}
async function fixture(document=seed(),trace=()=>{},populateUploads=true,policy=config.policy) {
  const sql=new DatabaseSync(':memory:');
  for (const file of ['0001_cms.sql','0002_media_budget.sql','0003_cms_release_safeguards.sql','0004_cms_prepared_publications.sql','0005_cms_recovery.sql','0006_cms_first_catalog_bootstrap.sql','0007_cms_catalog_refreshes.sql']) sql.exec(readFileSync(new URL(`../migrations/${file}`,import.meta.url),'utf8'));
  const reads=[];
  let assemblies=0;
  sql.function('observed_projection',value=>{ assemblies++; return value; });
  const statement=(query,args=[])=>({
    bind(...values) { return statement(query,values); },
    async first() { const row=sql.prepare(query).get(...args)??null; reads.push({query,row}); return row; },
    async all() { const rows=sql.prepare(query).all(...args); reads.push({query,rows}); return {success:true,results:rows}; },
    async run() {
      const before=sql.prepare('SELECT total_changes() AS n').get().n;
      const stmt=sql.prepare(query);
      const results=stmt.columns().length?stmt.all(...args):undefined;
      if(!results) stmt.run(...args);
      const changes=sql.prepare('SELECT total_changes() AS n').get().n-before;
      return {success:true,results,meta:{changes}};
    },
  });
  let batches=Promise.resolve();
  const db={prepare(query) {
    // Count actual subquery evaluation, not preparation of an already-short-circuited UPDATE.
    return statement(query.replace('SET public_json=(SELECT document FROM (','SET public_json=(SELECT observed_projection(document) FROM ('));
  },batch(statements) {
    const result=batches.then(async()=>{
      sql.exec('BEGIN IMMEDIATE');
      try { const results=[]; for(const stmt of statements) results.push(await stmt.run()); sql.exec('COMMIT'); return results; }
      catch(error) { sql.exec('ROLLBACK'); throw error; }
    });
    batches=result.catch(()=>{});
    return result;
  }};
  const parts=splitCmsDocument(document);
  const save=new StagedCmsStore(db,policy);
  const started=await save.startSave(0,'actor',parts.map(({value,...part})=>({...part,digest:hash(JSON.stringify(value))})));
  for(const i of started.missing) { await save.putPart(started.id,'actor',parts[i]); reads.length=0; if(i%200===0)trace(`admitted ${i+1}/${parts.length}`); }
  trace('assembling saved source');
  await save.finishSave(started.id,'actor');
  reads.length=0;
  const objects=new Map();
  if(populateUploads) for(const media of document.media) if(/^\/media\/upload-[a-f0-9-]{36}\.(jpg|png|webp)$/.test(media.src)) {
    const object=fixtureUpload(media.src);objects.set(object.key,object);
  }
  const writes=[];
  const bucket={async head(key) { return objects.get(key)??null; },async put(key,body,options) {
    assert.equal(sql.prepare("SELECT state FROM cms_artifact_reservations WHERE catalog_id=? AND path=(SELECT path FROM cms_artifact_reservations WHERE catalog_id=? AND state='pending' LIMIT 1)").get(key.split('/')[2],key.split('/')[2])?.state,'pending','reservation precedes R2 PUT');
    writes.push({key,body,options});
    if(options.onlyIf?.etagDoesNotMatch==='*'&&objects.has(key)) return null;
    const bytes=Buffer.from(body);
    assert.equal(Buffer.from(options.sha256).toString('hex'),hash(bytes),'native SHA-256 supplied to R2');
    const object={key,etag:hash(bytes),version:`controlled-r2-${writes.length}`,size:bytes.length,httpMetadata:options.httpMetadata,customMetadata:options.customMetadata,checksums:{sha256:Uint8Array.from(Buffer.from(hash(bytes),'hex')).buffer},bytes};
    objects.set(key,object);
    return object;
  }};
  const assets={async fetch(request) { assert.equal(new URL(request.url).pathname,'/index.html'); return new Response(shell,{headers:{'Content-Type':'text/html'}}); }};
  return {sql,db,reads,parts,document,bucket,assets,objects,writes,get assemblies(){return assemblies;},close(){sql.close();}};
}

async function finish(preparer,progress) {
  for(let i=0;i<200&&!progress.ready;i++) progress=await preparer.advance(progress.id,'actor');
  assert.equal(progress.ready,true);return progress;
}
const {commitPreparedBootstrap,commitPreparedPublication,commitPreparedRefresh}=await import('../worker/cms-publication-commit.ts');
const {preparedPublicResponse}=await import('../worker/prepared-public.ts');
function commit(id,version,cfg=config){return {catalogId:id,expectedVersion:version,actor:'actor',mode:'publish',...cfg};}
function originalRows(f){return f.sql.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(({name})=>({name,rows:f.sql.prepare(`SELECT * FROM ${name}`).all()}));}
function assertOriginalRows(f,before){for(const {name,rows} of before){const after=new Set(f.sql.prepare(`SELECT * FROM ${name}`).all().map(row=>JSON.stringify(row)));for(const row of rows)assert.ok(after.has(JSON.stringify(row)),`original ${name} row unchanged`);}}
function snapshot(f){return ['cms_documents','cms_revisions','cms_publications'].map(table=>f.sql.prepare(`SELECT * FROM ${table} ORDER BY 1`).all());}
async function publicRead(f,cfg,path='/api/cms/document'){
  return preparedPublicResponse(new Request(cfg.origin+path),{CMS_DB:f.db,CMS_MEDIA:{async get(key){const o=f.objects.get(key);return o?{...o,body:new Response(o.bytes).body}:null;}},CANONICAL_ORIGIN:cfg.origin,CMS_PUBLIC_DELIVERY_ORIGIN:cfg.origin,CMS_VALIDATION_POLICY:cfg.policy,CMS_RENDERER_ID:cfg.renderer,CMS_ASSET_ID:cfg.assets});
}


async function publishedFixture(document){
  const f=await fixture(document),Preparer=await load(),preparer=new Preparer(f.db,f.bucket,f.assets,config);
  const original=await finish(preparer,await preparer.start(1,'actor','publish'));
  await commitPreparedPublication(f.db,commit(original.id,1));
  const cfg={...config,renderer:'refresh-renderer-v2'};
  return {...f,Preparer,original,cfg,preparer:new Preparer(f.db,f.bucket,f.assets,cfg)};
}
test('refresh status denies changed shell identity',async()=>{
  const f=await publishedFixture();try{
    const progress=await f.preparer.startRefresh(2,'actor',2,f.original.id);
    const changed=new f.Preparer(f.db,f.bucket,f.assets,{...f.cfg,shell:hash('different shell')});
    await assert.rejects(changed.status(progress.id,'actor'),code('publication_conflict'));
  }finally{f.close();}
});


function refreshInput(f,id,version=2){return {...commit(id,version,f.cfg),expectedPublishedRevision:2,expectedPreviousCatalogId:f.original.id};}
async function privateSave(f,version,title){
  const doc=structuredClone(f.document);doc.pages[0].title.en=title;
  const parts=splitCmsDocument(doc),store=new StagedCmsStore(f.db,config.policy);
  const job=await store.startSave(version,'actor',parts.map(({value,...part})=>({...part,digest:hash(JSON.stringify(value))})));
  for(const i of job.missing)await store.putPart(job.id,'actor',parts[i]);
  return store.finishSave(job.id,'actor');
}
for(const [field,value] of [['actor','other'],['expectedVersion',1],['expectedPublishedRevision',1],['expectedPreviousCatalogId','f'.repeat(32)],['policy','different'],['renderer','different'],['assets',hash('different')],['origin','https://different.example'],['shell',hash('different')]])test(`refresh commit rejects ${field} drift`,async()=>{
  const f=await publishedFixture();try{
    const ready=await finish(f.preparer,await f.preparer.startRefresh(2,'actor',2,f.original.id));
    const before=snapshot(f);
    await assert.rejects(commitPreparedRefresh(f.db,{...refreshInput(f,ready.id),[field]:value}),code('publication_conflict'));
    assert.deepEqual(snapshot(f),before);assert.equal(f.sql.prepare('SELECT state FROM cms_artifact_catalogs WHERE id=?').get(ready.id).state,'ready');
    assert.equal((await publicRead(f,config)).status,200);
  }finally{f.close();}
});
for(const drift of ['version','draft_revision','published_revision','expiry'])test(`refresh progress and commit reject live ${drift} drift`,async()=>{
  const f=await publishedFixture();try{
    let progress=await f.preparer.startRefresh(2,'actor',2,f.original.id);
    if(drift==='expiry')f.sql.prepare('UPDATE cms_artifact_catalogs SET expires_at=0 WHERE id=?').run(progress.id);
    else f.sql.exec(`UPDATE cms_documents SET ${drift}=${drift==='version'?3:1} WHERE id=1`);
    const before=snapshot(f);
    await assert.rejects(f.preparer.advance(progress.id,'actor'),code('publication_conflict'));
    await assert.rejects(commitPreparedRefresh(f.db,refreshInput(f,progress.id)),code('publication_conflict'));
    assert.deepEqual(snapshot(f),before);assert.equal(f.writes.filter(w=>w.key.includes(progress.id)).length,0);
  }finally{f.close();}
});
test('normal and bootstrap commits cannot consume a ready refresh and repeated refresh commit is a strict conflict',async()=>{
 const f=await publishedFixture();try{
   const ready=await finish(f.preparer,await f.preparer.startRefresh(2,'actor',2,f.original.id));const before=snapshot(f);
   await assert.rejects(commitPreparedPublication(f.db,commit(ready.id,2,f.cfg)),code('publication_conflict'));
   await assert.rejects(commitPreparedBootstrap(f.db,commit(ready.id,2,f.cfg)),code('publication_conflict'));
   assert.deepEqual(snapshot(f),before);
   await commitPreparedRefresh(f.db,refreshInput(f,ready.id));
   await assert.rejects(commitPreparedRefresh(f.db,refreshInput(f,ready.id)),code('publication_conflict'));
   assert.deepEqual(snapshot(f),before);
 }finally{f.close();}
});
for(const kind of ['suppressed','pointer-drift'])test(`refresh activation transaction rolls back ${kind}`,async()=>{
 const f=await publishedFixture();try{
   const ready=await finish(f.preparer,await f.preparer.startRefresh(2,'actor',2,f.original.id));
   f.sql.exec(kind==='suppressed'?`CREATE TRIGGER suppress_refresh BEFORE UPDATE OF state ON cms_artifact_catalogs WHEN NEW.id='${ready.id}' AND NEW.state='published' BEGIN SELECT RAISE(IGNORE); END;`:
    `CREATE TRIGGER drift_refresh AFTER UPDATE OF state ON cms_artifact_catalogs WHEN NEW.id='${ready.id}' AND NEW.state='published' BEGIN UPDATE cms_documents SET draft_revision=1 WHERE id=1; END;`);
   const before=snapshot(f);
   await assert.rejects(commitPreparedRefresh(f.db,refreshInput(f,ready.id)),code('publication_conflict'));
   assert.deepEqual(snapshot(f),before);assert.equal(f.sql.prepare('SELECT state FROM cms_artifact_catalogs WHERE id=?').get(ready.id).state,'ready');
   assert.equal((await publicRead(f,config)).status,200);assert.equal((await publicRead(f,f.cfg)).status,503);
 }finally{f.close();}
});
test('post-PUT pointer race keeps reservation charged but rolls back artifact receipt and never activates',async()=>{
 const f=await publishedFixture();try{
   const originalPut=f.bucket.put;let raced=false;
   f.bucket.put=async(...args)=>{const result=await originalPut(...args);if(!raced){raced=true;f.sql.exec('UPDATE cms_documents SET draft_revision=1 WHERE id=1');}return result;};
   let progress=await f.preparer.startRefresh(2,'actor',2,f.original.id);
   await assert.rejects(finish(f.preparer,progress),code('publication_conflict'));
   assert.equal(raced,true);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_artifact_entries WHERE catalog_id=?').get(progress.id).n,0);
   assert.equal(f.sql.prepare('SELECT state FROM cms_artifact_reservations WHERE catalog_id=?').get(progress.id).state,'pending');
   assert.equal((await publicRead(f,config)).status,200);assert.equal((await publicRead(f,f.cfg)).status,503);
 }finally{f.close();}
});
test('asynchronous planning binds original observed draft pointer',async()=>{
 const f=await publishedFixture();try{
   const summaries=f.preparer.summaries.bind(f.preparer);let raced=false;
   f.preparer.summaries=async(...args)=>{const result=await summaries(...args);raced=true;f.sql.exec('UPDATE cms_documents SET draft_revision=1 WHERE id=1');return result;};
   await assert.rejects(f.preparer.startRefresh(2,'actor',2,f.original.id),code('publication_conflict'));
   assert.equal(raced,true);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_catalog_refreshes').get().n,0);
   assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM cms_artifact_catalogs WHERE state IN ('building','ready')").get().n,0);
 }finally{f.close();}
});
test('refresh marker and original publication mappings are immutable',async()=>{
 const f=await publishedFixture();try{
   const progress=await f.preparer.startRefresh(2,'actor',2,f.original.id);
   for(const table of ['cms_catalog_refreshes','cms_publications','cms_revision_admissions']){
    assert.throws(()=>f.sql.exec(`UPDATE ${table} SET ${table==='cms_revision_admissions'?'revision=revision':'catalog_id=catalog_id'}`),/immutable/);
    assert.throws(()=>f.sql.exec(`DELETE FROM ${table}`),/immutable/);
   }
   assert.equal((await f.preparer.startRefresh(2,'actor',2,f.original.id)).id,progress.id,'same exact intent resumes');
   assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_catalog_refreshes').get().n,1);
 }finally{f.close();}
});
test('missing admission and incorrect admitted raw byte length fail before any refresh intent',async()=>{
 const f=await publishedFixture();try{
   const badPolicy='incorrect-raw-length';
   f.sql.prepare(`INSERT INTO cms_revision_admissions SELECT revision,?,digest,document_bytes+1,manifest FROM cms_revision_admissions WHERE revision=2 AND policy=?`).run(badPolicy,config.policy);
   for(const policy of ['missing-admission',badPolicy]){
    const preparer=new f.Preparer(f.db,f.bucket,f.assets,{...f.cfg,policy});
    await assert.rejects(preparer.startRefresh(2,'actor',2,f.original.id),code('publication_conflict'));
   }
   assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_catalog_refreshes').get().n,0);
 }finally{f.close();}
});
test('private Save retains refreshed publication; subsequent Publish and Rollback do not reuse stale refresh',async()=>{
 const f=await publishedFixture();try{
   const ready=await finish(f.preparer,await f.preparer.startRefresh(2,'actor',2,f.original.id));
   await commitPreparedRefresh(f.db,refreshInput(f,ready.id));const original=snapshot(f);
   await privateSave(f,2,'PRIVATE LATER');
   let response=await publicRead(f,f.cfg);assert.equal(response.status,200);let body=await response.json();assert.equal(body.version,2);assert.equal(body.document.pages[0].title.en,'Home');
   const published=await finish(f.preparer,await f.preparer.start(3,'actor','publish'));
   await commitPreparedPublication(f.db,commit(published.id,3,f.cfg));
   response=await publicRead(f,f.cfg);body=await response.json();assert.equal(body.version,4);assert.equal(body.document.pages[0].title.en,'PRIVATE LATER');
   const rollback=await finish(f.preparer,await f.preparer.start(4,'actor','rollback',2));
   await commitPreparedPublication(f.db,{...commit(rollback.id,4,f.cfg),mode:'rollback'});
   response=await publicRead(f,f.cfg);body=await response.json();assert.equal(body.version,5);assert.equal(body.document.pages[0].title.en,'Home');
   assert.deepEqual(f.sql.prepare('SELECT * FROM cms_publications WHERE revision=2').all(),original[2]);
   assert.equal((await publicRead(f,config)).status,503,'old release cannot use a refresh for another published pointer');
 }finally{f.close();}
});


test('refresh building identity cannot be rewritten after its immutable marker',async()=>{
 const f=await publishedFixture();try{
   const progress=await f.preparer.startRefresh(2,'actor',2,f.original.id);
   for(const assignment of ["actor='other'","renderer='other'","source_revision=1","context_digest='"+hash('other')+"'","plan_json='{}'"])
     assert.throws(()=>f.sql.prepare(`UPDATE cms_artifact_catalogs SET ${assignment} WHERE id=?`).run(progress.id),/cms_catalog_refresh_identity/);
   assert.equal((await f.preparer.status(progress.id,'actor')).ready,false);
 }finally{f.close();}
});


test('public uploaded media and every artifact select only the exact published refresh release',async()=>{
 const document=seed(),src='/media/upload-00000000-0000-4000-8000-000000000001.webp';
 document.media=[{...createCmsSeed().media[0],id:'refresh-photo',src}];
 document.pages[0].seo.image={mediaId:'refresh-photo',alt:{en:'Fixture',fr:'Témoin',es:'Prueba'}};
 const f=await publishedFixture(document);try{
   const {stagedCmsResponse}=await import('../worker/cms-staged-routes.ts');
   const media=async cfg=>{
    f.reads.length=0;
    const db={...f.db,prepare:query=>f.db.prepare(query.replace('SELECT checks.receipt_json','SELECT c.id AS selected,checks.receipt_json'))};
    const response=await stagedCmsResponse(new Request(cfg.origin+src),{CMS_DB:db,CMS_VALIDATION_POLICY:cfg.policy,CMS_RENDERER_ID:cfg.renderer,CMS_ASSET_ID:cfg.assets,CANONICAL_ORIGIN:cfg.origin,CMS_PUBLIC_DELIVERY_ORIGIN:cfg.origin,CMS_MEDIA:{async get(key){const o=f.objects.get(key);return o?{...o,body:new Response(o.bytes).body}:null;}}},null,{});
    return {response,selected:f.reads.find(read=>read.query.includes('AS selected'))?.row?.selected};
   };
   const ready=await finish(f.preparer,await f.preparer.startRefresh(2,'actor',2,f.original.id));
   await assert.rejects(media(f.cfg),code('not_found'));
   assert.equal((await media(config)).selected,f.original.id);
   await commitPreparedRefresh(f.db,refreshInput(f,ready.id));
   const result=await media(f.cfg);assert.equal(result.selected,ready.id);assert.equal(result.response.status,200);
   assert.equal(hash(Buffer.from(await result.response.arrayBuffer())),hash(f.objects.get('uploads/'+src.slice(7)).bytes));
   assert.equal((await media(config)).selected,f.original.id);
   for(const cfg of [{...f.cfg,renderer:'wrong'},{...f.cfg,assets:hash('wrong')},{...f.cfg,policy:'missing'},{...f.cfg,origin:'https://wrong.example'}]){
    await assert.rejects(media(cfg),code('not_found'));assert.equal((await publicRead(f,cfg)).status,503);
   }
   await privateSave(f,2,'UNPUBLISHED PHOTO DRAFT');
   assert.equal((await media(f.cfg)).selected,ready.id);
   const response=await publicRead(f,f.cfg);assert.equal((await response.json()).version,2);
   const published=await finish(f.preparer,await f.preparer.start(3,'actor','publish'));
   await commitPreparedPublication(f.db,commit(published.id,3,f.cfg));
   assert.equal((await media(f.cfg)).selected,published.id);
   const rollback=await finish(f.preparer,await f.preparer.start(4,'actor','rollback',2));
   await commitPreparedPublication(f.db,{...commit(rollback.id,4,f.cfg),mode:'rollback'});
   assert.equal((await media(f.cfg)).selected,rollback.id);
 }finally{f.close();}
});
test('ordinary HTTP preparation actions never expose refresh progression or commit',async()=>{
 const f=await publishedFixture();try{
   const {stagedCmsResponse}=await import('../worker/cms-staged-routes.ts');
   const progress=await f.preparer.startRefresh(2,'actor',2,f.original.id);
   const env={CMS_DB:f.db,CMS_MEDIA:f.bucket,ASSETS:f.assets,CMS_VALIDATION_POLICY:f.cfg.policy,CMS_RENDERER_ID:f.cfg.renderer,CMS_ASSET_ID:f.cfg.assets,CMS_SHELL_ID:f.cfg.shell,CANONICAL_ORIGIN:f.cfg.origin};
   const helpers={requestJson:async request=>request.json(),exactFields:(body,fields)=>assert.deepEqual(Object.keys(body).sort(),fields.sort()),json:Response.json};
   for(const action of ['advance','commit'])await assert.rejects(stagedCmsResponse(new Request(f.cfg.origin+`/api/admin/content/preparations/${progress.id}/${action}`,{method:'POST',body:'{}'}),env,'actor',helpers),code('publication_conflict'));
   await assert.rejects(stagedCmsResponse(new Request(f.cfg.origin+'/api/admin/content/preparations',{method:'POST',body:JSON.stringify({expectedVersion:2,mode:'refresh'})}),env,'actor',helpers),code('invalid_publication'));
   assert.equal(f.sql.prepare('SELECT state FROM cms_artifact_catalogs WHERE id=?').get(progress.id).state,'building');
 }finally{f.close();}
});


for(const [version,revision,prior] of [[1,2,null],[2,1,null],[2,2,'f'.repeat(32)]])test(`refresh start pins expected version ${version}, revision ${revision}, prior ${prior??'original'}`,async()=>{
 const f=await publishedFixture();try{
  const before=snapshot(f);await assert.rejects(f.preparer.startRefresh(version,'actor',revision,prior??f.original.id),code('publication_conflict'));
  assert.deepEqual(snapshot(f),before);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_catalog_refreshes').get().n,0);
 }finally{f.close();}
});
for(const drift of ['lease'])test(`ready refresh commit fails closed on ${drift} drift`,async()=>{
 const f=await publishedFixture();try{
  const ready=await finish(f.preparer,await f.preparer.startRefresh(2,'actor',2,f.original.id));
  if(drift==='lease'){
   const expiry=f.sql.prepare('SELECT expires_at FROM cms_artifact_catalogs WHERE id=?').get(ready.id).expires_at;
   f.sql.function('strftime',(_format,_time)=>String(expiry+1));
  }
  const before=snapshot(f);
  await assert.rejects(commitPreparedRefresh(f.db,refreshInput(f,ready.id)),code('publication_conflict'));
  assert.deepEqual(snapshot(f),before);assert.equal((await publicRead(f,config)).status,200);
  assert.equal((await publicRead(f,f.cfg)).status,503);
 }finally{f.close();}
});
test('a second immutable exact-release intent cannot publish a competing refresh mapping',async()=>{
 const f=await publishedFixture();try{
  const ready=await finish(f.preparer,await f.preparer.startRefresh(2,'actor',2,f.original.id));
  await commitPreparedRefresh(f.db,refreshInput(f,ready.id));
  const second=await finish(f.preparer,await f.preparer.startRefresh(2,'actor',2,f.original.id));
  assert.notEqual(second.id,ready.id);
  await assert.rejects(commitPreparedRefresh(f.db,refreshInput(f,second.id)),code('publication_conflict'));
  assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM cms_catalog_refreshes f JOIN cms_artifact_catalogs c ON c.id=f.catalog_id AND c.state='published'").get().n,1);
  assert.equal((await publicRead(f,f.cfg)).status,200);
 }finally{f.close();}
});


test('suppressed stored reservation prevents sealing and retains old serving release',async()=>{
 const f=await publishedFixture();try{
  const progress=await f.preparer.startRefresh(2,'actor',2,f.original.id);
  f.sql.exec(`CREATE TRIGGER suppress_stored BEFORE UPDATE OF state ON cms_artifact_reservations WHEN NEW.catalog_id='${progress.id}' AND NEW.state='stored' BEGIN SELECT RAISE(IGNORE); END;`);
  const before=snapshot(f);
  await assert.rejects(finish(f.preparer,progress),code('publication_conflict'));
  assert.deepEqual(snapshot(f),before);
  assert.equal(f.sql.prepare('SELECT state FROM cms_artifact_catalogs WHERE id=?').get(progress.id).state,'building');
  assert.equal((await publicRead(f,config)).status,200);assert.equal((await publicRead(f,f.cfg)).status,503);
 }finally{f.close();}
});

test('ordinary start rejects refresh as a mode before database access',async()=>{
  const Preparer=await load();let reads=0;
  const preparer=new Preparer({prepare(){reads++;throw Error('must not access db');}},null,null,config);
  await assert.rejects(preparer.start(1,'actor','refresh',1),code('invalid_publication'));
  assert.equal(reads,0);
});

test('refresh activates already published source without changing original logical rows or exposing private draft',async()=>{
  // Synthetic real-SQLite fixture only.
  const f=await fixture();try{
    const Preparer=await load(),old=new Preparer(f.db,f.bucket,f.assets,config);
    const original=await finish(old,await old.start(1,'actor','publish'));
    await commitPreparedPublication(f.db,commit(original.id,1));
    const store=new StagedCmsStore(f.db,config.policy),draft=structuredClone(f.document);draft.pages[0].title.en='PRIVATE DRAFT';
    const parts=splitCmsDocument(draft),job=await store.startSave(2,'actor',parts.map(({value,...part})=>({...part,digest:hash(JSON.stringify(value))})));
    for(const i of job.missing)await store.putPart(job.id,'actor',parts[i]);await store.finishSave(job.id,'actor');
    const before=snapshot(f),allOriginal=originalRows(f),cfg={...config,renderer:'refresh-renderer-v2'},preparer=new Preparer(f.db,f.bucket,f.assets,cfg);
    assert.equal(typeof preparer.startRefresh,'function','server-only refresh must exist');
    const ready=await finish(preparer,await preparer.startRefresh(3,'actor',2,original.id));
    assert.equal((await publicRead(f,cfg)).status,503,'ready must not serve');
    await commitPreparedRefresh(f.db,{...commit(ready.id,3,cfg),expectedPublishedRevision:2,expectedPreviousCatalogId:original.id});
    assert.deepEqual(snapshot(f),before);assertOriginalRows(f,allOriginal);
    const response=await publicRead(f,cfg);assert.equal(response.status,200);
    const body=await response.json();assert.equal(body.version,2);assert.equal(body.document.pages[0].title.en,'Home');
    assert.equal((await publicRead(f,config)).status,200,'old release retains its original mapping');
    for(const path of ['/','/fr','/es','/api/cms','/robots.txt','/sitemap.xml'])assert.equal((await publicRead(f,cfg,path)).status,200,path);
  }finally{f.close();}
});
