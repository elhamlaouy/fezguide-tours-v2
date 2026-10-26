import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
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

test('lean publication read omits duplicate legacy except compatibility and preserves complete artifacts',async()=>{
  const {rewriteRouteHtml}=await import('../worker/seo.ts');
  const {resolveRoute}=await import('../src/cms/routing.ts');
  const f=await fixture();
  try {
    const Preparer=await load(),preparer=new Preparer(f.db,f.bucket,f.assets,config);
    const ready=await finish(preparer,await preparer.start(1,'actor','publish'));
    const catalog=await preparer.catalog(ready.id,'actor');
    const plan=JSON.parse(catalog.plan_json);
    const raw=f.sql.prepare('SELECT public_json FROM cms_artifact_catalogs WHERE id=?').get(ready.id).public_json;
    const document=JSON.parse(raw);
    for(const entry of plan.entries){
      f.reads.length=0;
      const actual=await preparer.render(catalog,entry);
      const reads=f.reads.filter(read=>read.query.includes('SELECT public_json'));
      if(entry.type!=='robots'){
        assert.equal(reads.length,1);
        assert.equal(Object.hasOwn(reads[0].row,'legacy_json'),entry.type==='compatibility','noncompatibility must not return full legacy');
      }
      let expected;
      if(entry.type==='document') expected={body:`{"version":2,"document":${raw}}`,contentType:'application/json; charset=utf-8'};
      else if(entry.type==='compatibility') expected={body:f.sql.prepare("SELECT json_extract(public_json,'$.legacy') AS value FROM cms_artifact_catalogs WHERE id=?").get(ready.id).value,contentType:'application/json; charset=utf-8'};
      else if(entry.type==='robots') expected={body:`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${config.origin}/sitemap.xml\n`,contentType:'text/plain; charset=utf-8'};
      else if(entry.type==='sitemap') expected={body:`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"><url><loc>${config.origin}/</loc><xhtml:link rel="alternate" hreflang="en" href="${config.origin}/"/><xhtml:link rel="alternate" hreflang="fr" href="${config.origin}/fr"/><xhtml:link rel="alternate" hreflang="es" href="${config.origin}/es"/></url><url><loc>${config.origin}/fr</loc><xhtml:link rel="alternate" hreflang="en" href="${config.origin}/"/><xhtml:link rel="alternate" hreflang="fr" href="${config.origin}/fr"/><xhtml:link rel="alternate" hreflang="es" href="${config.origin}/es"/></url><url><loc>${config.origin}/es</loc><xhtml:link rel="alternate" hreflang="en" href="${config.origin}/"/><xhtml:link rel="alternate" hreflang="fr" href="${config.origin}/fr"/><xhtml:link rel="alternate" hreflang="es" href="${config.origin}/es"/></url></urlset>`,contentType:'application/xml; charset=utf-8'};
      else expected={body:rewriteRouteHtml(shell,document,entry.type==='404'?{language:entry.language,pageId:'not-found'}:resolveRoute(new URL(entry.path,config.origin),document),config.origin),contentType:'text/html; charset=utf-8'};
      assert.deepEqual(actual,expected,entry.path);
    }
  }finally{f.close();}
});

for(const type of ['html','404','sitemap','document','compatibility']) for(const input of [null,'','{broken']) test(`lean publication ${type} preserves SQLite failure and sanitized advance for ${JSON.stringify(input)}`,async()=>{
  const f=await fixture(),probe=new DatabaseSync(':memory:');
  try{
    probe.exec('CREATE TABLE cms_artifact_catalogs(id TEXT,public_json TEXT)');
    const Preparer=await load(),normal=new Preparer(f.db,f.bucket,f.assets,config);
    let progress=await normal.start(1,'actor','publish');
    progress=await normal.advance(progress.id,'actor');
    probe.prepare('INSERT INTO cms_artifact_catalogs VALUES(?,?)').run(progress.id,input);
    const old=probe.prepare("SELECT public_json,json_extract(public_json,'$.legacy') AS legacy_json FROM cms_artifact_catalogs WHERE id=?");
    if(input===null)assert.equal(old.get(progress.id).public_json,null);
    else assert.throws(()=>old.get(progress.id),/malformed JSON/);
    let failedRead=false,rechecks=0;
    const db={prepare(query){
      if(query.startsWith('SELECT public_json')) return {bind(...args){return {async first(){failedRead=true;return probe.prepare(query).get(...args);}};}};
      if(failedRead&&query.includes(' AS live'))rechecks++;
      return f.db.prepare(query);
    },batch:statements=>f.db.batch(statements)};
    const preparer=new Preparer(db,f.bucket,f.assets,config),render=preparer.render.bind(preparer);
    preparer.render=(catalog)=>render(catalog,{type,path:'/',language:'en'});
    await assert.rejects(preparer.advance(progress.id,'actor'),error=>code('publication_conflict')(error)&&error.status===409);
    assert.equal(failedRead,true);
    assert.equal(rechecks,1,'SQL malformed JSON must retain concurrent-ready eligibility recheck');
    assert.equal(f.writes.length,0);
    assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents').get().published_revision,null);
  }finally{probe.close();f.close();}
});

for(const ready of [false,true]) test(`lean publication malformed SQL recheck ${ready?'recovers concurrently ready catalog':'denies expired catalog'}`,async()=>{
  const f=await fixture(),probe=new DatabaseSync(':memory:');
  try{
    probe.exec("CREATE TABLE cms_artifact_catalogs(id TEXT,public_json TEXT)");
    const Preparer=await load(),normal=new Preparer(f.db,f.bucket,f.assets,config);
    let progress=await normal.start(1,'actor','publish');progress=await normal.advance(progress.id,'actor');
    probe.prepare('INSERT INTO cms_artifact_catalogs VALUES(?,?)').run(progress.id,'');
    let injected=false;
    const db={prepare(query){
      if(query.startsWith('SELECT public_json'))return {bind(...args){return {async first(){
        injected=true;
        try{return probe.prepare(query).get(...args);}catch(error){
          if(ready)await finish(normal,progress);
          else f.sql.prepare('UPDATE cms_artifact_catalogs SET expires_at=0 WHERE id=?').run(progress.id);
          throw error;
        }
      }};}};
      return f.db.prepare(query);
    },batch:statements=>f.db.batch(statements)};
    const result=new Preparer(db,f.bucket,f.assets,config).advance(progress.id,'actor');
    if(ready)assert.equal((await result).ready,true);else await assert.rejects(result,code('publication_conflict'));
    assert.equal(injected,true);
    assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents').get().published_revision,null);
  }finally{probe.close();f.close();}
});

async function finish(preparer,progress) {
  for(let i=0;i<200&&!progress.ready;i++) progress=await preparer.advance(progress.id,'actor');
  assert.equal(progress.ready,true,'automatic preparation must reach ready with real artifact receipts');
  return progress;
}

test('status reads eligibility and exact progress in one database snapshot',async()=>{
  const f=await fixture();
  try {
    const Preparer=await load(),preparer=new Preparer(f.db,f.bucket,f.assets,config);
    const started=await preparer.start(1,'actor','publish');
    f.reads.length=0;
    assert.deepEqual(await preparer.status(started.id,'actor'),started);
    assert.equal(f.reads.length,1,'one guarded SQL snapshot, not separate eligibility and count requests');
  }finally{f.close();}
});

for(const phase of ['before-large-projection','final-fresh-status']) test(`status retains ${phase} expiry recheck`,async()=>{
  const f=await fixture();
  try {
    const Preparer=await load(),preparer=new Preparer(f.db,f.bucket,f.assets,config);
    let progress=await preparer.start(1,'actor','publish');
    progress=await preparer.advance(progress.id,'actor'); // admit the small projection before an artifact advance
    const beforeWrites=f.writes.length;
    let catalogReads=0;
    const wrap=(statement,query)=>({
      bind(...values){return wrap(statement.bind(...values),query);},
      async first(...args){
        if(query.includes(' AS live')&&query.includes(' AS bootstrap')){
          catalogReads++;
          if(catalogReads===(phase==='before-large-projection'?2:4)) f.sql.prepare('UPDATE cms_artifact_catalogs SET expires_at=0 WHERE id=?').run(progress.id);
        }
        return statement.first(...args);
      },
      all(...args){return statement.all(...args);},
      run(...args){return statement.run(...args);},
    });
    const db={prepare(query){return wrap(f.db.prepare(query),query);},batch(statements){return f.db.batch(statements);}};
    await assert.rejects(new Preparer(db,f.bucket,f.assets,config).advance(progress.id,'actor'),code('publication_conflict'));
    assert.ok(catalogReads>=(phase==='before-large-projection'?2:4),'original eligibility point reached; fail-closed catch may recheck again');
    assert.equal(f.writes.length-beforeWrites,phase==='before-large-projection'?0:1);
    assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents WHERE id=1').get().published_revision,null);
  }finally{f.close();}
});

for(const invalid of ['actor','expiry','renderer','policy']) test(`single status snapshot denies changed ${invalid}`,async()=>{
  const f=await fixture();
  try {
    const Preparer=await load(),preparer=new Preparer(f.db,f.bucket,f.assets,config);
    const started=await preparer.start(1,'actor','publish');
    if(invalid==='expiry')f.sql.prepare('UPDATE cms_artifact_catalogs SET expires_at=0 WHERE id=?').run(started.id);
    const changed={...config,...(invalid==='renderer'?{renderer:'different-renderer'}:{}),...(invalid==='policy'?{policy:'different-policy'}:{})};
    await assert.rejects(new Preparer(f.db,f.bucket,f.assets,changed).status(started.id,invalid==='actor'?'wrong-actor':'actor'),code('publication_conflict'));
  }finally{f.close();}
});

test('actual release-derived complete-dist identity prepares, commits and serves anonymous HTML and JSON',async(t)=>{
  const {computeReleaseIdentity}=await import('../scripts/cms-release-identity.mjs');
  // Generic prebuild tests need no dist; the parent can opt into current built bytes.
  let root=fileURLToPath(new URL('../',import.meta.url));
  if(process.env.CMS_ACTUAL_RELEASE_TEST!=='1') {
    root=await mkdtemp(join(tmpdir(),'cms-publication-release-'));
    t.after(()=>rm(root,{recursive:true,force:true}));
    for(const dir of ['src/cms','worker','dist/assets'])await mkdir(join(root,dir),{recursive:true});
    for(const [path,body] of Object.entries({'src/cms/schema.ts':'predicate','src/main.ts':'renderer','worker/index.ts':'worker','package.json':'{}','package-lock.json':'{}','vite.config.ts':'config','tsconfig.json':'{}','index.html':shell,'dist/index.html':shell,'dist/assets/authored.js':'export default 1'}))await writeFile(join(root,path),body);
  }
  const release=await computeReleaseIdentity(root);
  const actualShell=readFileSync(join(root,'dist/index.html'));
  const pinned={policy:release.CMS_VALIDATION_POLICY,renderer:release.CMS_RENDERER_ID,assets:release.CMS_ASSET_ID,shell:release.CMS_SHELL_ID,origin:config.origin};
  assert.notEqual(pinned.assets,hash(actualShell));
  const f=await fixture(seed(),undefined,true,pinned.policy);
  try {
    const Preparer=await load();
    const assets={fetch:async()=>new Response(actualShell,{headers:{'Content-Type':'text/html'}})};
    const ready=await finish(new Preparer(f.db,f.bucket,assets,pinned),await new Preparer(f.db,f.bucket,assets,pinned).start(1,'actor','publish'));
    assert.equal(f.sql.prepare('SELECT assets FROM cms_artifact_catalogs WHERE id=?').get(ready.id).assets,release.CMS_ASSET_ID);
    const {commitPreparedPublication}=await import('../worker/cms-publication-commit.ts');
    await commitPreparedPublication(f.db,{...pinned,catalogId:ready.id,actor:'actor',mode:'publish',expectedVersion:1});
    const {preparedPublicResponse}=await import('../worker/prepared-public.ts');
    const env={CMS_DB:f.db,CMS_MEDIA:{async get(key){const o=f.objects.get(key);return o?{...o,body:new Response(o.bytes).body}:null;}},CMS_VALIDATION_POLICY:pinned.policy,CMS_RENDERER_ID:pinned.renderer,CMS_ASSET_ID:pinned.assets,CANONICAL_ORIGIN:pinned.origin,CMS_PUBLIC_DELIVERY_ORIGIN:pinned.origin};
    for(const path of ['/','/api/cms/document']) {
      const response=await preparedPublicResponse(new Request(pinned.origin+path),env);
      assert.equal(response.status,200);
      const body=await response.text();
      if(path==='/')assert.match(body,/id="root"/);else assert.equal(JSON.parse(body).version,2);
    }
  }finally{f.close();}
});

for(const shellId of [undefined,'','not-a-digest','A'.repeat(64),'0'.repeat(63)]) test(`invalid explicit shell identity ${String(shellId)} fails closed`,async()=>{
  const f=await fixture();
  try {
    const Preparer=await load();
    await assert.rejects(new Preparer(f.db,f.bucket,f.assets,{...config,shell:shellId}).start(1,'actor','publish'),code('invalid_publication'));
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_artifact_catalogs').get().n,0);
    assert.equal(f.writes.length,0);
  }finally{f.close();}
});

for(const mode of ['publish','rollback']) test(`F6 ${mode} refuses a referenced upload missing from actual upload storage`,async()=>{
  const Preparer=await load();
  const document=seed();
  document.media=[{...createCmsSeed().media[0],id:'managed',src:'/media/upload-00000000-0000-4000-8000-000000000001.webp'}];
  document.pages[0].seo.image={mediaId:'managed',alt:{en:'Fixture',fr:'Fixture',es:'Fixture'}};
  const f=await fixture(document,undefined,false);
  try {
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    const progress=await preparer.start(1,'actor',mode,mode==='rollback'?1:undefined);
    await assert.rejects(finish(preparer,progress),code('upload_verification_failed'));
    assert.equal(f.sql.prepare('SELECT state FROM cms_artifact_catalogs WHERE id=?').get(progress.id).state,'building');
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_catalog_media').get().n,0);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_publications').get().n,0);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n,1);
  } finally {f.close();}
});

test('F6 upload checks are bounded, resumable, immutable and omit unreferenced uploads',async()=>{
  const Preparer=await load();
  const document=seed();
  document.media=Array.from({length:32},(_,i)=>({...createCmsSeed().media[0],id:`managed-${i}`,src:`/media/upload-00000000-0000-4000-8000-${String(i).padStart(12,'0')}.webp`}));
  document.pages[0].sections=[{id:'gallery',type:'gallery',enabled:true,variant:'grid',images:document.media.slice(0,31).map(m=>({mediaId:m.id,alt:{en:'Image',fr:'Image',es:'Image'}}))}];
  const f=await fixture(document);
  try {
    f.objects.delete(`uploads/${document.media[31].src.slice(7)}`);
    let heads=0;const head=f.bucket.head.bind(f.bucket);
    f.bucket.head=async key=>{if(key.startsWith('uploads/'))heads++;return head(key);};
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    let progress=await preparer.start(1,'actor','publish');
    const initialTotal=progress.total;
    while(!progress.ready){const before=heads;progress=await preparer.advance(progress.id,'actor');assert.ok(heads-before<=1);}
    assert.equal(progress.total,initialTotal);
    assert.equal(heads,31);
    assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM cms_catalog_upload_checks WHERE state='verified'").get().n,31);
    assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM cms_catalog_upload_checks WHERE state='unused'").get().n,1);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_catalog_media').get().n,31);
    assert.deepEqual(await preparer.start(1,'actor','publish'),progress);assert.equal(heads,31);
    assert.throws(()=>f.sql.exec("UPDATE cms_catalog_upload_checks SET receipt_json='{}'"),/cms_upload_check_immutable/);
    assert.throws(()=>f.sql.exec('DELETE FROM cms_catalog_upload_checks'),/cms_upload_check_immutable/);
  }finally{f.close();}
});

test('F6 invalid native object identity and metadata cannot become verified receipts',async()=>{
  const Preparer=await load();
  const mutations=[{etag:7},{version:7},{key:'uploads/wrong.webp'},{size:0},{size:8*1024*1024+1},{httpMetadata:{contentType:'text/html'}},{customMetadata:{}},{customMetadata:{uploadedAt:'2026-02-30T00:00:00.000Z'}},{checksums:{sha256:new ArrayBuffer(1)}}];
  for(const mutation of mutations){
    const document=seed();document.media=[{...createCmsSeed().media[0],id:'managed',src:'/media/upload-00000000-0000-4000-8000-000000000001.webp'}];
    document.pages[0].seo.image={mediaId:'managed',alt:{en:'Image',fr:'Image',es:'Image'}};
    const f=await fixture(document);
    try {
      const object=f.objects.get('uploads/'+document.media[0].src.slice(7));Object.assign(object,mutation);
      const preparer=new Preparer(f.db,f.bucket,f.assets,config),progress=await preparer.start(1,'actor','publish');
      await assert.rejects(finish(preparer,progress),code('upload_verification_failed'));
      assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_catalog_upload_checks').get().n,0);
      assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_publications').get().n,0);
    }finally{f.close();}
  }
});

test('F6 commit cannot publish a catalog whose verified upload receipt is missing',async()=>{
  const Preparer=await load();const {commitPreparedPublication}=await import('../worker/cms-publication-commit.ts');
  const document=seed();document.media=[{...createCmsSeed().media[0],id:'managed',src:'/media/upload-00000000-0000-4000-8000-000000000001.webp'}];
  document.pages[0].seo.image={mediaId:'managed',alt:{en:'Image',fr:'Image',es:'Image'}};
  const f=await fixture(document);
  try {
    const preparer=new Preparer(f.db,f.bucket,f.assets,config),ready=await finish(preparer,await preparer.start(1,'actor','publish'));
    // Adversarial storage damage after immutable sealing, not an application deletion route.
    f.sql.exec('DROP TRIGGER cms_upload_check_immutable_delete; DELETE FROM cms_catalog_upload_checks');
    await assert.rejects(commitPreparedPublication(f.db,{...config,catalogId:ready.id,actor:'actor',mode:'publish',expectedVersion:1}),code('publication_conflict'));
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n,1);
    assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents').get().published_revision,null);
  }finally{f.close();}
});

test('F6 sealing cannot silently omit verified upload membership',async()=>{
  const Preparer=await load();
  const document=seed();document.media=[{...createCmsSeed().media[0],id:'managed',src:'/media/upload-00000000-0000-4000-8000-000000000001.webp'}];
  document.pages[0].seo.image={mediaId:'managed',alt:{en:'Image',fr:'Image',es:'Image'}};
  const f=await fixture(document);
  try {
    f.sql.exec('CREATE TRIGGER suppress_media BEFORE INSERT ON cms_catalog_media BEGIN SELECT RAISE(IGNORE); END');
    const preparer=new Preparer(f.db,f.bucket,f.assets,config),progress=await preparer.start(1,'actor','publish');
    await assert.rejects(finish(preparer,progress),code('publication_conflict'));
    assert.equal(f.sql.prepare('SELECT state FROM cms_artifact_catalogs WHERE id=?').get(progress.id).state,'building');
  }finally{f.close();}
});

test('F6 unregistered managed URLs cannot bypass file verification',async()=>{
  const Preparer=await load();
  const document=seed();document.siteSettings.heroImage='/media/upload-00000000-0000-4000-8000-000000000001.webp';
  const f=await fixture(document);
  try {
    const preparer=new Preparer(f.db,f.bucket,f.assets,config),progress=await preparer.start(1,'actor','publish');
    await assert.rejects(finish(preparer,progress),code('upload_verification_failed'));
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_publications').get().n,0);
  }finally{f.close();}
});

test('F6 expiry while awaiting upload HEAD cannot insert a receipt or revive the job',async()=>{
  const Preparer=await load();
  const document=seed();document.media=[{...createCmsSeed().media[0],id:'managed',src:'/media/upload-00000000-0000-4000-8000-000000000001.webp'}];
  document.pages[0].seo.image={mediaId:'managed',alt:{en:'Image',fr:'Image',es:'Image'}};
  const f=await fixture(document);
  try {
    const preparer=new Preparer(f.db,f.bucket,f.assets,config),progress=await preparer.start(1,'actor','publish');
    const head=f.bucket.head.bind(f.bucket);f.bucket.head=async key=>{const object=await head(key);if(key.startsWith('uploads/'))f.sql.prepare('UPDATE cms_artifact_catalogs SET expires_at=0 WHERE id=?').run(progress.id);return object;};
    await assert.rejects(finish(preparer,progress),code('publication_conflict'));
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_catalog_upload_checks').get().n,0);
    assert.equal(f.sql.prepare('SELECT expires_at FROM cms_artifact_catalogs WHERE id=?').get(progress.id).expires_at,0);
  }finally{f.close();}
});

test('F6 referenced invalid managed keys are rejected before upload storage access',async()=>{
  const Preparer=await load();
  for(const src of ['/media/upload-short.webp','/media/upload-00000000-0000-4000-8000-000000000001.avif']){
    const document=seed();document.media=[{...createCmsSeed().media[0],id:'managed',src}];
    document.pages[0].seo.image={mediaId:'managed',alt:{en:'Image',fr:'Image',es:'Image'}};
    const f=await fixture(document);
    try{
      let heads=0;const head=f.bucket.head.bind(f.bucket);f.bucket.head=async key=>{if(key.startsWith('uploads/'))heads++;return head(key);};
      const preparer=new Preparer(f.db,f.bucket,f.assets,config),progress=await preparer.start(1,'actor','publish');
      await assert.rejects(finish(preparer,progress),code('upload_verification_failed'));assert.equal(heads,0);
    }finally{f.close();}
  }
});

test('F6 registered canonical absolute upload URLs retain literal content and verify the same storage key',async()=>{
  const Preparer=await load();
  const relative='/media/upload-00000000-0000-4000-8000-000000000001.webp';
  const document=seed();document.media=[{...createCmsSeed().media[0],id:'managed',src:config.origin+relative+'?v=1'}];
  document.pages[0].seo.image={mediaId:'managed',alt:{en:'Image',fr:'Image',es:'Image'}};
  const f=await fixture(document);
  try{
    const object=fixtureUpload(relative);f.objects.set(object.key,object);
    const preparer=new Preparer(f.db,f.bucket,f.assets,config),progress=await finish(preparer,await preparer.start(1,'actor','publish'));
    assert.equal(f.sql.prepare('SELECT media_key FROM cms_catalog_media WHERE catalog_id=?').get(progress.id).media_key,relative.slice(7));
    assert.equal(JSON.parse(f.sql.prepare('SELECT public_json FROM cms_artifact_catalogs WHERE id=?').get(progress.id).public_json).media[0].src,document.media[0].src);
  }finally{f.close();}
});

test('K1 a schema-valid long article projects without returning oversized text to the Worker',async()=>{
  const Preparer=await load();
  const {validateCmsDocument}=await import('../src/cms/schema.ts');
  const {publicCmsDocument}=await import('../worker/cms-routes.ts');
  const document=seed();
  const text='é'.repeat(20_000);
  document.pages[0].sections=[{id:'long-story',type:'richText',enabled:true,variant:'story',blocks:[{type:'paragraph',text:{en:text,fr:text,es:text}}]}];
  assert.equal(validateCmsDocument(document).valid,true);
  const f=await fixture(document);
  try {
    assert.ok(Buffer.byteLength(JSON.stringify(document.pages[0]))>32768);
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    let progress=await preparer.start(1,'actor','publish');
    for(let n=0;!progress.ready&&n<200;n++){
      f.reads.length=0;progress=await preparer.advance(progress.id,'actor');
      for(const read of f.reads)for(const row of read.rows??[])if(Object.hasOwn(row,'document_json'))assert.ok(Buffer.byteLength(row.document_json)<=32768);
    }
    assert.equal(progress.ready,true);
    const actual=JSON.parse(f.sql.prepare('SELECT public_json FROM cms_artifact_catalogs WHERE id=?').get(progress.id).public_json);
    assert.deepEqual(actual,publicCmsDocument(document));
    assert.equal(actual.pages[0].sections[0].blocks[0].text.en,text);
  }finally{f.close();}
});

test('K1 native pruning matches the privacy oracle across hidden siblings, ID arrays and media references',async()=>{
  const Preparer=await load();const {publicCmsDocument}=await import('../worker/cms-routes.ts');
  const document=seed(),base=createCmsSeed();
  document.media=[{id:'public',src:'/images/public.webp',alt:{en:'Image',fr:'Image',es:'Image'}},{id:'private',src:'/images/private.webp',alt:{en:'Private',fr:'Private',es:'Private'}}];
  document.reviews=structuredClone(base.reviews.slice(0,2));document.reviews[1].enabled=false;
  const copy={en:'é\\n"\\\\</script>'.repeat(1000),fr:'texte',es:'texto'};
  copy.fr=copy.en;copy.es=copy.en;
  document.pages[0].sections=[
    {id:'hidden-first',type:'richText',enabled:false,variant:'story',blocks:[{type:'paragraph',text:{en:'/images/private.webp',fr:'/media/upload-missing.webp',es:'private'}}]},
    {id:'long-story',type:'richText',enabled:true,variant:'story',blocks:[{type:'paragraph',text:copy}]},
    {id:'hidden-middle',type:'richText',enabled:false,variant:'story',blocks:[]},
    {id:'image',type:'gallery',enabled:true,variant:'grid',images:[{mediaId:'public',alt:{en:'Image',fr:'Image',es:'Image'}}]},
    {id:'reviews',type:'reviews',enabled:true,variant:'grid',reviewIds:document.reviews.map(r=>r.id)},
    {id:'hidden-last',type:'richText',enabled:false,variant:'story',blocks:[]},
  ];
  const f=await fixture(document);
  try {
    const source=f.sql.prepare('SELECT document FROM cms_revisions WHERE version=1').get().document;
    const preparer=new Preparer(f.db,f.bucket,f.assets,config),progress=await finish(preparer,await preparer.start(1,'actor','publish'));
    assert.deepEqual(JSON.parse(f.sql.prepare('SELECT public_json FROM cms_artifact_catalogs WHERE id=?').get(progress.id).public_json),publicCmsDocument(document));
    assert.equal(f.sql.prepare('SELECT document FROM cms_revisions WHERE version=1').get().document,source);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_large_projection_work').get().n,0);
  }finally{f.close();}
});

test('K1 a suppressed cursor update rolls back the entire metadata batch',async()=>{
  const Preparer=await load(),document=seed();
  document.pages[0].sections=[{id:'story',type:'richText',enabled:true,variant:'story',blocks:Array.from({length:15},()=>({type:'paragraph',text:{en:'a'.repeat(2000),fr:'b'.repeat(2000),es:'c'.repeat(2000)}}))}];
  const f=await fixture(document);
  try{
    f.sql.exec('CREATE TRIGGER suppress_cursor BEFORE UPDATE OF processed ON cms_large_projection_work BEGIN SELECT RAISE(IGNORE); END');
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);let progress=await preparer.start(1,'actor','publish');
    await assert.rejects(async()=>{for(let n=0;n<10;n++)progress=await preparer.advance(progress.id,'actor');},code('publication_conflict'));
    assert.equal(f.sql.prepare('SELECT processed FROM cms_large_projection_work').get().processed,0);
    assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM cms_projection_cache WHERE kind='pages'").get().n,0);
  }finally{f.close();}
});

for(const fault of ['prune','managed-url','media-key-managed-url'])test(`K1 ${fault} fault cannot admit a partial oversized projection`,async()=>{
  const Preparer=await load(),document=seed(),copy={en:'é'.repeat(20_000),fr:'é'.repeat(20_000),es:'é'.repeat(20_000)};
  if(fault.includes('managed-url'))copy.en='/media/upload-missing.webp';
  document.pages[0].sections=[{id:'story',type:'richText',enabled:true,variant:'story',blocks:[{type:'paragraph',text:copy}]},
    {id:'hidden',type:'richText',enabled:false,variant:'story',blocks:[]}];
  if(fault==='media-key-managed-url'){document.uiCopy.media=copy;document.pages[0].sections=[];}
  const f=await fixture(document);
  try{
    if(fault==='prune')f.sql.exec('CREATE TRIGGER suppress_prune BEFORE UPDATE OF public_json ON cms_large_projection_work BEGIN SELECT RAISE(IGNORE); END');
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);let progress=await preparer.start(1,'actor','publish');
    await assert.rejects(async()=>{for(let n=0;n<20;n++)progress=await preparer.advance(progress.id,'actor');},code(fault==='prune'?'publication_conflict':'upload_verification_failed'));
    assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM cms_projection_cache WHERE kind=? AND part_key=?").get(fault==='media-key-managed-url'?'uiCopy':'pages',fault==='media-key-managed-url'?'media':'').n,0);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_publications').get().n,0);
  }finally{f.close();}
});

test('K1 source-index pruning is independent of opaque JSON node IDs, including indexes 9 and 10',async()=>{
  const Preparer=await load(),document=seed();
  document.pages[0].sections=Array.from({length:25},(_,i)=>({id:`story-${i}`,type:'richText',enabled:i%2===0,variant:'story',blocks:[]}));
  document.pages[0].sections[2].blocks=[{type:'paragraph',text:{en:'é'.repeat(20_000),fr:'é'.repeat(20_000),es:'é'.repeat(20_000)}}];
  const f=await fixture(document);
  try{
    const prepare=f.db.prepare;let remapped=0;
    f.db.prepare=query=>{if(query.includes('json_tree(v.document_json) j WHERE w.policy=')){remapped++;query=query.replace('SELECT j.id,j.parent,j.key','SELECT -j.id AS id,CASE WHEN j.parent IS NULL THEN NULL ELSE -j.parent END AS parent,j.key');}return prepare(query);};
    const preparer=new Preparer(f.db,f.bucket,f.assets,config),progress=await finish(preparer,await preparer.start(1,'actor','publish'));
    assert.ok(remapped>0,'the real SQL executed with opaque IDs deliberately reversed');
    const {publicCmsDocument}=await import('../worker/cms-routes.ts');
    assert.deepEqual(JSON.parse(f.sql.prepare('SELECT public_json FROM cms_artifact_catalogs WHERE id=?').get(progress.id).public_json),publicCmsDocument(document));
  }finally{f.close();}
});

test('F5 configured historical slugs become prepared path and query routes',async()=>{
  const Preparer=await load();
  const document=seed();
  document.pages.push({...document.pages[0],id:'stable-about',slug:'new-about',seo:{...document.pages[0].seo,canonical:'/preferred-about'}});
  const f=await fixture(document);
  try {
    const aliases=Object.fromEntries([['old-about','stable-about'],...Array.from({length:99},(_,i)=>[`historical-${i}`,'home'])]);
    const preparer=new Preparer(f.db,f.bucket,f.assets,{...config,redirects:JSON.stringify(aliases)});
    await finish(preparer,await preparer.start(1,'actor','publish'));
    assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM cms_catalog_routes WHERE route_key LIKE '%:historical-%'").get().n,99*3*2,'maximum configured aliases remain finite route facts, not extra artifacts');
    for(const language of ['en','fr','es']) for(const type of ['path','query']) {
      const row=f.sql.prepare('SELECT canonical_path FROM cms_catalog_routes WHERE route_key=?').get(`${type}:${language}:old-about`);
      assert.equal(row?.canonical_path,`${language==='en'?'':`/${language}`}/preferred-about`);
    }
    assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents').get().published_revision,null);
  } finally {f.close();}
});

for(const mode of ['publish','rollback']) test(`F5 ${mode} preparation identity pins normalized redirects and rejects changed mappings`,async()=>{
  const Preparer=await load();
  const document=seed();
  document.pages.push({...document.pages[0],id:'about',slug:'about'});
  const f=await fixture(document);
  try {
    const original={...config,redirects:'{"old-about":"about","old-home":"home"}'};
    const first=new Preparer(f.db,f.bucket,f.assets,original);
    const ready=await finish(first,await first.start(1,'actor',mode,mode==='rollback'?1:undefined));
    const changed=new Preparer(f.db,f.bucket,f.assets,{...config,redirects:'{"old-about":"home","old-home":"home"}'});
    await assert.rejects(changed.advance(ready.id,'actor'),code('publication_conflict'));
    const reordered=new Preparer(f.db,f.bucket,f.assets,{...config,redirects:'{ "old-home": "home", "old-about": "about" }'});
    assert.deepEqual(await reordered.start(1,'actor',mode,mode==='rollback'?1:undefined),ready);
    const replacement=await changed.start(1,'actor',mode,mode==='rollback'?1:undefined);
    assert.notEqual(replacement.id,ready.id);
    assert.equal(f.sql.prepare('SELECT state FROM cms_artifact_catalogs WHERE id=?').get(ready.id).state,'expired');
    assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents').get().published_revision,null);
  } finally {f.close();}
});

for(const mode of ['publish','rollback']) test(`F5 ${mode} commits configured aliases and serves publication-bound redirects`,async()=>{
  const Preparer=await load();
  const {commitPreparedPublication}=await import('../worker/cms-publication-commit.ts');
  const {preparedPublicResponse}=await import('../worker/prepared-public.ts');
  const document=seed();
  document.pages.push({...document.pages[0],id:'about',slug:'new-about'});
  const f=await fixture(document);
  try {
    const pinned={...config,redirects:'{"old-about":"about"}'};
    const preparer=new Preparer(f.db,f.bucket,f.assets,pinned);
    const ready=await finish(preparer,await preparer.start(1,'actor',mode,mode==='rollback'?1:undefined));
    await assert.rejects(commitPreparedPublication(f.db,{...pinned,redirects:'{"old-about":"home"}',catalogId:ready.id,actor:'actor',mode,expectedVersion:1}),code('publication_conflict'));
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_publications').get().n,0);
    await commitPreparedPublication(f.db,{...pinned,catalogId:ready.id,actor:'actor',mode,expectedVersion:1});
    let gets=0;
    const env={CMS_DB:f.db,CMS_MEDIA:{async get(key){gets++;const o=f.objects.get(key);return o?{...o,body:new ReadableStream({start(c){c.enqueue(o.bytes);c.close();}})}:null;}},
      CMS_VALIDATION_POLICY:config.policy,CMS_RENDERER_ID:config.renderer,CMS_ASSET_ID:config.assets,CANONICAL_ORIGIN:config.origin,CMS_PUBLIC_DELIVERY_ORIGIN:config.origin,CMS_SLUG_REDIRECTS:pinned.redirects};
    for(const [path,location] of [['/old-about?utm_source=old','/new-about?utm_source=old'],['/fr/old-about?lang=es&tour=home&tag=a&tag=b','/fr/new-about?tag=a&tag=b'],['/?experience=old-about&page=home&language=es&x=1','/es/new-about?x=1']]) {
      const response=await preparedPublicResponse(new Request(config.origin+path),env);
      assert.equal(response.status,308);assert.equal(response.headers.get('Location'),location);
    }
    assert.equal(gets,0,'redirects do not fetch any artifact or private source');
    assert.equal((await preparedPublicResponse(new Request(config.origin+'/new-about'),env)).status,200);
    const before=gets;
    env.CMS_SLUG_REDIRECTS='{"old-about":"home"}';
    assert.equal((await preparedPublicResponse(new Request(config.origin+'/old-about'),env)).status,503);
    assert.equal(gets,before,'configuration drift is rejected before object reads');
  } finally {f.close();}
});

test('F5 staged aliases preserve legacy precedence, selector cleanup and public-target visibility',async()=>{
  const Preparer=await load();
  const {commitPreparedPublication}=await import('../worker/cms-publication-commit.ts');
  const {preparedPublicResponse}=await import('../worker/prepared-public.ts');
  const {publicSeoResponse}=await import('../worker/seo.ts');
  const document=seed();
  const home=document.pages[0];
  document.pages.push({...home,id:'stable-about',slug:'tour',seo:{...home.seo,canonical:'/preferred-about'}},
    {...home,id:'tour',slug:'second'},
    {...home,id:'hidden',slug:'hidden',enabled:false},
    {...home,id:'english-only',slug:'english-only',title:{en:'English',fr:'',es:''}});
  const redirects=JSON.stringify({'old-about':'stable-about','old-hidden':'hidden','old-missing':'missing','old-english':'english-only',tour:'home',home:'stable-about',constructor:'stable-about','loop-a':'loop-b','loop-b':'loop-a'});
  const f=await fixture(document);
  try {
    const preparer=new Preparer(f.db,f.bucket,f.assets,{...config,redirects});
    const ready=await finish(preparer,await preparer.start(1,'actor','publish'));
    await commitPreparedPublication(f.db,{...config,redirects,catalogId:ready.id,actor:'actor',mode:'publish',expectedVersion:1});
    const env={CMS_DB:f.db,CMS_MEDIA:{async get(key){const o=f.objects.get(key);return o?{...o,body:new Response(o.bytes).body}:null;}},ASSETS:f.assets,
      CMS_VALIDATION_POLICY:config.policy,CMS_RENDERER_ID:config.renderer,CMS_ASSET_ID:config.assets,CANONICAL_ORIGIN:config.origin,CMS_PUBLIC_DELIVERY_ORIGIN:config.origin,CMS_SLUG_REDIRECTS:redirects};
    for(const path of ['/old-about?utm=a&tag=b&tag=c','/en/old-about?language=fr','/fr/old-about?lang=es','/?page=old-about&language=fr&lang=es','/?experience=old-about&tour=home&page=home&lang=fr','/?experience=&tour=old-about&page=home','/?page=tour','/tour','/constructor','/fr/old-english','/old-about?redirects=ignored&CMS_SLUG_REDIRECTS=ignored','/old-about?page=home&tour=home&lang=de']) {
      const request=new Request(config.origin+path);
      const first=f.reads.length;
      const staged=await preparedPublicResponse(request,env);
      assert.equal(f.reads.length,first+1,'one point lookup per visitor');
      const legacy=await publicSeoResponse(request,env);
      assert.equal(staged.status,308,path);assert.equal(staged.status,legacy.status,path);
      assert.equal(staged.headers.get('Location'),legacy.headers.get('Location'),path);
      assert.equal(staged.headers.get('Cache-Control'),'no-store');
    }
    for(const path of ['/old-hidden','/old-missing','/es/old-english','/loop-a','/loop-b','/toString','/unknown?redirects=%7B%22unknown%22%3A%22home%22%7D']) {
      assert.equal((await preparedPublicResponse(new Request(config.origin+path),env)).status,404,path);
    }
    assert.equal((await preparedPublicResponse(new Request(config.origin+'/'),env)).status,200,'configured home alias never overrides a real page');
    const invalid={...env,CMS_SLUG_REDIRECTS:'[]'};
    const before=f.reads.length;
    assert.equal((await preparedPublicResponse(new Request(config.origin+'/old-about'),invalid)).status,503);
    assert.equal(f.reads.length,before,'invalid server configuration fails before SQL');
  } finally {f.close();}
});

test('automatic preparation assembles the exact public projection in SQL and stores one verified authored artifact per advance',async()=>{
  const Preparer=await load();
  const document=seed();
  const media=(name,n)=>({...createCmsSeed().media[0],id:name,src:`/media/upload-00000000-0000-4000-8000-${String(n).padStart(12,'0')}.webp`});
  document.media=[media('visible',1),media('hidden',2),media('unused',3)];
  document.pages[0].seo.image={mediaId:'visible',alt:{en:'Image',fr:'Image',es:'Imagen'}};
  document.pages.push({...document.pages[0],id:'article-id',slug:'old-slug',title:{en:'Article',fr:'Article',es:''},seo:{...document.pages[0].seo,canonical:'/preferred',noIndex:true}});
  document.pages.push({...document.pages[0],id:'private',slug:'private',enabled:false,seo:{...document.pages[0].seo,image:{mediaId:'hidden',alt:{en:'Private',fr:'Privé',es:'Privado'}}}});
  const f=await fixture(document);
  try {
    const {publicCmsDocument}=await import('../worker/cms-routes.ts');
    const {rewriteRouteHtml}=await import('../worker/seo.ts');
    const {resolveRoute}=await import('../src/cms/routing.ts');
    const expected=publicCmsDocument(document);
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    let progress=await preparer.start(1,'actor','publish');
    for(let i=0;i<60&&!progress.ready;i++) {
      const before=f.writes.length;
      progress=await preparer.advance(progress.id,'actor');
      assert(f.writes.length-before<=1,'at most one rendered artifact in each advance');
    }
    assert.equal(progress.ready,true);
    assert.equal(progress.done,progress.total);
    const catalog=f.sql.prepare('SELECT * FROM cms_artifact_catalogs').get();
    assert.deepEqual(JSON.parse(catalog.public_json),expected);
    const entries=f.sql.prepare('SELECT * FROM cms_artifact_entries ORDER BY path').all();
    assert.deepEqual(entries.map(entry=>entry.path),['/','@404:en','@404:es','@404:fr','/api/cms','/api/cms/document','/es','/fr','/fr/preferred','/preferred','/robots.txt','/sitemap.xml'].sort());
    assert.equal(entries.length,catalog.expected_entries);
    for(const entry of entries) {
      assert.equal(entry.object_key,`prepared/v1/${progress.id}/${hash(entry.path)}`);
      const object=f.objects.get(entry.object_key);
      assert.equal(entry.etag,object.etag);
      assert.equal(entry.object_version,object.version);
      assert.equal(entry.bytes,object.size);
      assert.equal(entry.digest,hash(object.bytes));
      assert.equal(entry.content_type,object.httpMetadata.contentType);
      if(entry.status===200&&entry.content_type.startsWith('text/html')) assert.equal(object.bytes.toString(),rewriteRouteHtml(shell,expected,resolveRoute(new URL(entry.path,config.origin),expected),config.origin));
    }
    const body=path=>f.objects.get(entries.find(entry=>entry.path===path).object_key).bytes.toString();
    assert.deepEqual(JSON.parse(body('/api/cms/document')),{version:2,document:expected});
    assert.deepEqual(JSON.parse(body('/api/cms')),expected.legacy);
    assert(!body('/sitemap.xml').includes('preferred'),'noIndex extracted from the admitted page part');
    assert(body('/robots.txt').includes('Sitemap: https://fezguidetours.com/sitemap.xml'));
    assert.deepEqual(f.sql.prepare('SELECT media_key FROM cms_catalog_media').all().map(row=>row.media_key),['upload-00000000-0000-4000-8000-000000000001.webp']);
    const routes=f.sql.prepare('SELECT route_key,canonical_path FROM cms_catalog_routes').all();
    for(const key of ['path:en:article-id','path:en:old-slug','path:en:preferred','query:en:article-id']) assert.equal(routes.find(route=>route.route_key===key)?.canonical_path,'/preferred');
    const puts=f.writes.length;
    assert.deepEqual(await preparer.advance(progress.id,'actor'),progress);
    assert.equal(f.writes.length,puts);
    assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents').get().published_revision,null);
    assert(!f.reads.some(({row,rows})=>[row,...rows??[]].some(value=>value&&Object.hasOwn(value,'document'))));
    assert.throws(()=>f.sql.prepare('UPDATE cms_artifact_catalogs SET public_json=\'{}\'').run());
  } finally { f.close(); }
});

test('path and query aliases keep actual slug/id precedence, locale availability and exact discovery keys',async()=>{
  const Preparer=await load();
  const document=seed();
  const page=(id,slug)=>({...structuredClone(document.pages[0]),id,slug,title:{en:id,fr:id,es:''}});
  document.pages.push(page('article','story'),page('story','article'));
  const fallback=page('fallback','fallback');
  fallback.localeFallback={en:'es',fr:'en'};
  document.pages.push(fallback);
  const f=await fixture(document);
  try {
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    const done=await finish(preparer,await preparer.start(1,'actor','publish'));
    const routes=f.sql.prepare('SELECT route_key,canonical_path FROM cms_catalog_routes WHERE catalog_id=?').all(done.id);
    const route=key=>routes.find(row=>row.route_key===key)?.canonical_path;
    assert.equal(route('path:en:article'),'/article');
    assert.equal(route('query:en:article'),'/story');
    assert.equal(route('path:fr:story'),'/fr/story');
    assert.equal(route('query:fr:story'),'/fr/article');
    assert.equal(route('path:es:story'),undefined);
    for(const language of ['en','fr','es']) for(const type of ['path','query']) assert.equal(route(`${type}:${language}:fallback`),undefined);
    const entries=f.sql.prepare('SELECT * FROM cms_artifact_entries').all();
    const body=path=>f.objects.get(entries.find(row=>row.path===path).object_key).bytes.toString();
    assert(!entries.some(row=>/fallback|\/es\/(?:article|story)/.test(row.path)));
    for(const [language,title] of [['en','Page not found'],['fr','Page introuvable'],['es','Página no encontrada']]) {
      const entry=entries.find(row=>row.path===`@404:${language}`);
      assert.equal(entry.status,404);
      assert(body(entry.path).includes(`<html lang="${language}"`));
      assert(body(entry.path).includes(title));
      assert(body(entry.path).includes('content="noindex,follow"'));
      assert(!body(entry.path).includes('rel="canonical"'));
      assert.equal(JSON.parse(body(entry.path).match(/id="cms-published-document" type="application\/json">([\s\S]*?)<\/script>/)[1]).scope.pageId,null);
    }
    const sitemap=body('/sitemap.xml');
    assert.equal((sitemap.match(/<url>/g)??[]).length,7);
    assert(!sitemap.includes('/fallback')); assert(!sitemap.includes('/es/article')); assert(!sitemap.includes('/es/story'));
    for(const path of ['/','/fr','/es','/article','/story','/fr/article','/fr/story']) assert(sitemap.includes(`<loc>${config.origin}${path}</loc>`));
    assert.equal(body('/robots.txt'),`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${config.origin}/sitemap.xml\n`);
    assert.deepEqual(entries.filter(row=>!row.content_type.startsWith('text/html')).map(row=>row.path).sort(),['/api/cms','/api/cms/document','/robots.txt','/sitemap.xml']);
  } finally { f.close(); }
});

test('complete public seed saves, projects, renders and seals with actual SQLite and controlled R2',async t=>{
  const Preparer=await load();
  const f=await fixture(createCmsSeed());
  try {
    const {publicCmsDocument}=await import('../worker/cms-routes.ts');
    const {rewriteRouteHtml}=await import('../worker/seo.ts');
    const {resolveRoute}=await import('../src/cms/routing.ts');
    const expected=publicCmsDocument(f.document);
    const before=f.sql.prepare('SELECT * FROM cms_documents').get();
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    let progress=await preparer.start(1,'actor','publish');
    let calls=0,maxParts=0,maxBytes=0;
    while(!progress.ready&&calls<200) {
      f.reads.length=0;
      const puts=f.writes.length;
      progress=await preparer.advance(progress.id,'actor');
      const projected=f.reads.flatMap(read=>read.rows??[]).filter(row=>Object.hasOwn(row,'document_json'));
      const bytes=projected.reduce((sum,row)=>sum+Buffer.byteLength(row.document_json),0);
      maxParts=Math.max(maxParts,projected.length); maxBytes=Math.max(maxBytes,bytes);
      assert(projected.length<=40); assert(bytes<=32768);
      assert(f.writes.length-puts<=1);
      if(projected.length) assert.equal(f.writes.length,puts);
      calls++;
    }
    assert.equal(progress.ready,true);
    assert.equal(progress.done,progress.total);
    const catalog=f.sql.prepare('SELECT * FROM cms_artifact_catalogs WHERE id=?').get(progress.id);
    assert.deepEqual(JSON.parse(catalog.public_json),expected);
    const entries=f.sql.prepare('SELECT * FROM cms_artifact_entries WHERE catalog_id=?').all(progress.id);
    const body=path=>f.objects.get(entries.find(entry=>entry.path===path).object_key).bytes.toString();
    for(const entry of entries) {
      const object=f.objects.get(entry.object_key);
      assert.equal(entry.digest,hash(object.bytes));
      assert.equal(entry.etag,object.etag); assert.equal(entry.object_version,object.version);
      assert.equal(entry.bytes,object.size); assert.equal(entry.content_type,object.httpMetadata.contentType);
      assert.match(entry.object_key,new RegExp(`^prepared/v1/${progress.id}/[a-f0-9]{64}$`));
      if(entry.content_type.startsWith('text/html')) {
        const route=entry.status===404?{language:entry.path.slice(5),pageId:'not-found'}:resolveRoute(new URL(entry.path,config.origin),expected);
        assert.equal(body(entry.path),rewriteRouteHtml(shell,expected,route,config.origin));
      }
    }
    assert.deepEqual(JSON.parse(body('/api/cms/document')),{version:2,document:expected});
    assert.deepEqual(JSON.parse(body('/api/cms')),expected.legacy);
    assert.equal(f.assemblies,1,'native public assembly executes once, not once per render');
    assert.equal(entries.length,catalog.expected_entries);
    assert.equal(f.objects.size,entries.length);
    assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM cms_artifact_reservations WHERE state='stored'").get().n,entries.length);
    assert.deepEqual(f.sql.prepare('SELECT * FROM cms_documents').get(),before);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n,1);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_publications').get().n,0);
    t.diagnostic(JSON.stringify({sourceBytes:Buffer.byteLength(JSON.stringify(f.document)),parts:f.parts.length,
      largestPart:Math.max(...f.parts.map(part=>Buffer.byteLength(JSON.stringify(part.value)))),calls,maxParts,maxBytes,
      entries:entries.length,routes:f.sql.prepare('SELECT COUNT(*) AS n FROM cms_catalog_routes').get().n,assemblies:f.assemblies}));
  } finally { f.close(); }
});

test('advance projects at most 32 KiB and 40 real admitted parts, preserving omitted-part references',async()=>{
  const Preparer=await load();
  const document=seed();
  document.media=[{...createCmsSeed().media[0],id:'secret-media'}];
  document.pages.push({...document.pages[0],id:'secret',slug:'secret',enabled:false,seo:{...document.pages[0].seo,image:{mediaId:'secret-media',alt:{en:'Private',fr:'Privé',es:'Privado'}}}});
  for(let i=0;i<65;i++) document.uiCopy[`test${i}`]={en:'a'.repeat(1000),fr:'b'.repeat(1000),es:'c'.repeat(1000)};
  const f=await fixture(document);
  try {
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    let progress=await preparer.start(1,'actor','publish');
    let previous=0;
    while(progress.done<f.parts.length) {
      f.reads.length=0;
      progress=await preparer.advance(progress.id,'actor');
      const values=f.reads.flatMap(read=>read.rows??[]).filter(row=>Object.hasOwn(row,'document_json'));
      assert(values.length<=40);
      assert(values.reduce((sum,row)=>sum+Buffer.byteLength(row.document_json),0)<=32768);
      assert(progress.done>previous);
      previous=progress.done;
    }
    const omitted=f.sql.prepare("SELECT * FROM cms_projection_cache WHERE kind='pages' AND public_json IS NULL").get();
    assert.deepEqual(JSON.parse(omitted.original_refs),['secret-media']);
    assert.deepEqual(JSON.parse(omitted.public_refs),[]);
    const media=f.sql.prepare("SELECT * FROM cms_projection_cache WHERE kind='media'").get();
    assert.deepEqual(JSON.parse(media.original_refs),[]);
    assert.deepEqual(JSON.parse(media.public_refs),[]);
    assert.equal(f.writes.length,0,'projection advancement never renders an artifact in the same call');
  } finally { f.close(); }
});

test('K1 large localized UI copy is projected natively rather than read into the Worker',async()=>{
  const Preparer=await load();
  const document=seed();
  document.uiCopy.oversized={en:'x'.repeat(11000),fr:'é'.repeat(11000),es:'y'.repeat(11000)};
  const f=await fixture(document);
  try {
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    let progress=await preparer.start(1,'actor','publish');
    const beforeOversized=f.parts.findIndex(part=>part.kind==='uiCopy'&&part.key==='oversized');
    while(progress.done<beforeOversized) progress=await preparer.advance(progress.id,'actor');
    f.reads.length=0;
    progress=await preparer.advance(progress.id,'actor');
    assert.ok(progress.done>0);
    assert.ok(f.sql.prepare("SELECT work_units FROM cms_projection_cache WHERE kind='uiCopy' AND part_key='oversized'").get().work_units>0);
    assert(!f.reads.flatMap(read=>read.rows??[]).some(row=>row.document_json?.includes('é')));
    assert.equal(f.writes.length,0);
    assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents').get().published_revision,null);
  } finally { f.close(); }
});

test('a stored-but-unacknowledged immutable R2 object is recovered by exact metadata readback without another PUT',async()=>{
  const Preparer=await load();
  const f=await fixture();
  try {
    const put=f.bucket.put.bind(f.bucket);
    let ambiguous=true;
    f.bucket.put=async(...args)=>{ const receipt=await put(...args); if(ambiguous) { ambiguous=false; throw new Error('PRIVATE transport response lost'); } return receipt; };
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    let progress=await preparer.start(1,'actor','publish');
    while(progress.done<f.parts.length) progress=await preparer.advance(progress.id,'actor');
    await assert.rejects(preparer.advance(progress.id,'actor'),code('cms_unavailable'));
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_artifact_entries').get().n,0);
    assert.equal(f.sql.prepare('SELECT state FROM cms_artifact_reservations').get().state,'pending');
    progress=await preparer.advance(progress.id,'actor');
    assert.equal(progress.done,f.parts.length+1);
    assert.equal(f.writes.length,1);
    await finish(preparer,progress);
    assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents').get().published_revision,null);
  } finally { f.close(); }
});

test('reservation success uses direct SQLite changes rather than trigger-inclusive D1 metadata',async()=>{
  const Preparer=await load();
  const f=await fixture();
  try {
    f.sql.exec(`CREATE TABLE reservation_audit(n INTEGER);
      CREATE TRIGGER reservation_audit_insert AFTER INSERT ON cms_artifact_reservations BEGIN INSERT INTO reservation_audit VALUES (1); END;
      CREATE TRIGGER reservation_audit_update AFTER UPDATE ON cms_artifact_reservations BEGIN INSERT INTO reservation_audit VALUES (1); END;`);
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    let progress=await preparer.start(1,'actor','publish');
    while(progress.done<f.parts.length) progress=await preparer.advance(progress.id,'actor');
    progress=await preparer.advance(progress.id,'actor');
    assert.equal(progress.done,f.parts.length+1);
    assert.equal(f.writes.length,1);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM reservation_audit').get().n,2);
  } finally { f.close(); }
});

test('three ambiguous failed PUT attempts exhaust a durable reservation, never undercounting or changing publication',async()=>{
  const Preparer=await load();
  const f=await fixture();
  try {
    let attempts=0;
    // BEFORE INSERT can write even when the UPSERT's WHERE prevents its update.
    f.sql.exec(`CREATE TABLE attempt_audit(n INTEGER);
      CREATE TRIGGER attempt_audit BEFORE INSERT ON cms_artifact_reservations BEGIN INSERT INTO attempt_audit VALUES (1); END;`);
    f.bucket.put=async()=>{attempts++;throw new Error('PRIVATE R2 outage');};
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    let progress=await preparer.start(1,'actor','publish');
    while(progress.done<f.parts.length) progress=await preparer.advance(progress.id,'actor');
    for(let i=0;i<3;i++) await assert.rejects(preparer.advance(progress.id,'actor'),code('cms_unavailable'));
    await assert.rejects(preparer.advance(progress.id,'actor'),code('artifact_attempts_exhausted'));
    assert.equal(attempts,3);
    assert.deepEqual({...f.sql.prepare('SELECT attempts,state FROM cms_artifact_reservations').get()},{attempts:3,state:'pending'});
    assert.equal(f.sql.prepare('SELECT state FROM cms_artifact_catalogs').get().state,'building');
    assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents').get().published_revision,null);
  } finally { f.close(); }
});

test('the real 512 MiB reservation ceiling blocks R2 before writing and returns a non-echo budget error',async()=>{
  const Preparer=await load();
  const f=await fixture();
  try {
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    let progress=await preparer.start(1,'actor','publish');
    while(progress.done<f.parts.length) progress=await preparer.advance(progress.id,'actor');
    let remaining=512*1024*1024;
    for(let i=0;remaining;i++) {
      const bytes=Math.min(4000000,remaining); remaining-=bytes;
      f.sql.prepare("INSERT INTO cms_artifact_reservations(catalog_id,path,bytes,state,attempts) VALUES (?,?,?,'pending',1)").run(progress.id,`charged-${i}`,bytes);
    }
    await assert.rejects(preparer.advance(progress.id,'actor'),code('cms_artifact_storage_budget'));
    assert.equal(f.writes.length,0);
    assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents').get().published_revision,null);
  } finally { f.close(); }
});

test('privacy context ignores unrelated text edits and reuses all unchanged admitted part projections',async()=>{
  const Preparer=await load();
  const f=await fixture();
  try {
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    let first=await preparer.start(1,'actor','publish');
    while(first.done<f.parts.length) first=await preparer.advance(first.id,'actor');
    const before=f.sql.prepare('SELECT context_digest FROM cms_artifact_catalogs WHERE id=?').get(first.id).context_digest;
    const updated=structuredClone(f.document);
    updated.pages[0].title.en='An unrelated text edit';
    const parts=splitCmsDocument(updated);
    const store=new StagedCmsStore(f.db,config.policy);
    const save=await store.startSave(1,'actor',parts.map(({value,...part})=>({...part,digest:hash(JSON.stringify(value))})));
    for(const i of save.missing) await store.putPart(save.id,'actor',parts[i]);
    await store.finishSave(save.id,'actor');
    const second=await preparer.start(2,'actor','publish');
    assert.equal(f.sql.prepare('SELECT context_digest FROM cms_artifact_catalogs WHERE id=?').get(second.id).context_digest,before);
    assert.equal(second.done,f.parts.length-1);
    assert.equal(f.sql.prepare('SELECT state FROM cms_artifact_catalogs WHERE id=?').get(first.id).state,'expired');
    await assert.rejects(preparer.advance(first.id,'actor'),code('publication_conflict'));
    await finish(preparer,second);
  } finally { f.close(); }
});

test('rollback chooses its admitted historical source rather than the current saved draft and keeps the pointer untouched',async()=>{
  const Preparer=await load();
  const f=await fixture();
  try{
    const newer=structuredClone(f.document);
    newer.pages[0].title.en='Newer draft';
    const parts=splitCmsDocument(newer);
    const store=new StagedCmsStore(f.db,config.policy);
    const save=await store.startSave(1,'actor',parts.map(({value,...part})=>({...part,digest:hash(JSON.stringify(value))})));
    for(const i of save.missing) await store.putPart(save.id,'actor',parts[i]);
    await store.finishSave(save.id,'actor');
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    const start=await preparer.start(2,'actor','rollback',1);
    await finish(preparer,start);
    const row=f.sql.prepare('SELECT source_revision,target_revision,public_json FROM cms_artifact_catalogs').get();
    assert.equal(row.source_revision,1);
    assert.equal(row.target_revision,3);
    assert.equal(JSON.parse(row.public_json).pages[0].title.en,'Home');
    assert.equal(f.sql.prepare('SELECT draft_revision FROM cms_documents').get().draft_revision,2);
    assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents').get().published_revision,null);
  } finally { f.close(); }
});

test('bootstrap prepares the existing published revision without publishing or moving pointers',async()=>{
  const Preparer=await load();
  const f=await fixture();
  try{
    f.sql.prepare('UPDATE cms_documents SET published_revision=1 WHERE id=1').run();
    const draft=structuredClone(f.document);
    draft.pages[0].title.en='Private newer draft';
    const parts=splitCmsDocument(draft);
    const store=new StagedCmsStore(f.db,config.policy);
    const save=await store.startSave(1,'actor',parts.map(({value,...part})=>({...part,digest:hash(JSON.stringify(value))})));
    for(const i of save.missing) await store.putPart(save.id,'actor',parts[i]);
    await store.finishSave(save.id,'actor');
    const before=f.sql.prepare('SELECT version,draft_revision,published_revision FROM cms_documents').get();
    assert.deepEqual({...before},{version:2,draft_revision:2,published_revision:1});
    const revisions=f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n;
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    const ready=await finish(preparer,await preparer.start(2,'actor','bootstrap'));
    const catalog=f.sql.prepare('SELECT mode,expected_version,target_revision,source_revision,public_json FROM cms_artifact_catalogs WHERE id=?').get(ready.id);
    assert.deepEqual({...catalog,public_json:undefined},{mode:'publish',expected_version:2,target_revision:3,source_revision:1,public_json:undefined});
    assert.equal(JSON.parse(catalog.public_json).pages[0].title.en,'Home','bootstrap serves published bytes, never the private draft');
    assert.equal(f.sql.prepare('SELECT revision FROM cms_catalog_bootstraps WHERE catalog_id=?').get(ready.id).revision,1);
    assert.deepEqual({...f.sql.prepare('SELECT version,draft_revision,published_revision FROM cms_documents').get()},{...before});
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n,revisions);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_publications').get().n,0);
    const {commitPreparedBootstrap,commitPreparedPublication}=await import('../worker/cms-publication-commit.ts');
    await assert.rejects(commitPreparedPublication(f.db,{catalogId:ready.id,actor:'actor',expectedVersion:2,...config,mode:'publish'}),code('publication_conflict'));
    const published=await commitPreparedBootstrap(f.db,{catalogId:ready.id,actor:'actor',expectedVersion:2,...config});
    assert.deepEqual(published,{version:2,draftRevision:2,published:true,bootstrap:true});
    assert.deepEqual({...f.sql.prepare('SELECT version,draft_revision,published_revision FROM cms_documents').get()},{...before},'commit leaves all legacy pointers untouched');
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n,revisions,'commit appends no revision');
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_publications').get().n,0,'bootstrap does not create a future-revision publication');
    assert.equal(f.sql.prepare("SELECT state FROM cms_artifact_catalogs WHERE id=?").get(ready.id).state,'published');
    const {preparedPublicResponse}=await import('../worker/prepared-public.ts');
    const response=await preparedPublicResponse(new Request('https://fezguidetours.com/api/cms/document'),{
      CMS_DB:f.db,CMS_MEDIA:{async get(key){const object=f.objects.get(key);return object?{...object,body:new Blob([object.bytes]).stream()}:null;}},
      CANONICAL_ORIGIN:config.origin,CMS_PUBLIC_DELIVERY_ORIGIN:config.origin,CMS_VALIDATION_POLICY:config.policy,
      CMS_RENDERER_ID:config.renderer,CMS_ASSET_ID:config.assets,
    });
    assert.equal(response.status,200,'first prepared catalog serves the already-published revision');
    const publicDocument=await response.json();
    assert.equal(publicDocument.version,1);
    assert.equal(publicDocument.document.pages[0].title.en,'Home');
  }finally{f.close();}
});

test('expiry, wrong actor, stale version and server identity mismatch fail closed before projection or R2',async()=>{
  const Preparer=await load();
  for(const mutate of [
    f=>f.sql.exec('UPDATE cms_artifact_catalogs SET expires_at=0'),
    f=>f.sql.exec('UPDATE cms_documents SET version=2'),
    f=>{ f.actor='other'; },
    f=>{ f.config={...config,policy:'other'}; },
    f=>{ f.config={...config,renderer:'other'}; },
    f=>{ f.config={...config,assets:'f'.repeat(64)}; },
    f=>{ f.config={...config,origin:'https://editor.invalid'}; },
  ]) {
    const f=await fixture();
    try {
      const preparer=new Preparer(f.db,f.bucket,f.assets,config);
      const progress=await preparer.start(1,'actor','publish');
      mutate(f);
      const caller=new Preparer(f.db,f.bucket,f.assets,f.config??config);
      await assert.rejects(caller.advance(progress.id,f.actor??'actor'),code('publication_conflict'));
      assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_projection_cache').get().n,0);
      assert.equal(f.writes.length,0);
      assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents').get().published_revision,null);
    } finally { f.close(); }
  }
});

test('template SHA mismatch never accepts client HTML or creates an object receipt',async()=>{
  const Preparer=await load();
  const f=await fixture();
  try {
    const assets={async fetch() { return new Response(shell+'<!--different deployment-->',{headers:{'Content-Type':'text/html'}}); }};
    const preparer=new Preparer(f.db,f.bucket,assets,config);
    let progress=await preparer.start(1,'actor','publish');
    while(progress.done<f.parts.length) progress=await preparer.advance(progress.id,'actor');
    await assert.rejects(preparer.advance(progress.id,'actor'),code('assets_mismatch'));
    assert.equal(f.writes.length,0);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_artifact_entries').get().n,0);
  } finally { f.close(); }
});

test('R2 HEAD identity, MIME, size, checksum and server metadata are verified before persisting a receipt',async()=>{
  const Preparer=await load();
  for(const change of [
    object=>({...object,etag:'wrong-etag'}),
    object=>({...object,etag:''}),
    object=>({...object,version:'wrong-version'}),
    object=>({...object,version:''}),
    object=>({...object,size:1}),
    object=>({...object,httpMetadata:{contentType:'text/plain'}}),
    object=>({...object,checksums:{}}),
    object=>({...object,checksums:{sha256:new ArrayBuffer(32)}}),
    object=>({...object,customMetadata:{...object.customMetadata,digest:'f'.repeat(64)}}),
    object=>({...object,customMetadata:{...object.customMetadata,path:'/wrong'}}),
    object=>({...object,customMetadata:{...object.customMetadata,catalog:'f'.repeat(32)}}),
    ()=>null,
  ]) {
    const f=await fixture();
    try {
      const head=f.bucket.head.bind(f.bucket);
      f.bucket.head=async key=>{const object=await head(key);return object?change(object):null;};
      const preparer=new Preparer(f.db,f.bucket,f.assets,config);
      let progress=await preparer.start(1,'actor','publish');
      while(progress.done<f.parts.length) progress=await preparer.advance(progress.id,'actor');
      await assert.rejects(preparer.advance(progress.id,'actor'),code('artifact_verification_failed'));
      assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_artifact_entries').get().n,0);
      assert.equal(f.sql.prepare('SELECT state FROM cms_artifact_reservations').get().state,'pending');
      assert.equal(f.sql.prepare('SELECT state FROM cms_artifact_catalogs').get().state,'building');
    } finally { f.close(); }
  }
});

test('expiry during R2 PUT leaves a charged orphan but cannot create a receipt or ready catalog',async()=>{
  const Preparer=await load();
  const f=await fixture();
  try {
    const put=f.bucket.put.bind(f.bucket);
    f.bucket.put=async(...args)=>{ const receipt=await put(...args); f.sql.exec('UPDATE cms_artifact_catalogs SET expires_at=0'); return receipt; };
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    let progress=await preparer.start(1,'actor','publish');
    while(progress.done<f.parts.length) progress=await preparer.advance(progress.id,'actor');
    await assert.rejects(preparer.advance(progress.id,'actor'),code('publication_conflict'));
    assert.equal(f.objects.size,1);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_artifact_entries').get().n,0);
    assert.equal(f.sql.prepare('SELECT state FROM cms_artifact_reservations').get().state,'pending');
    assert.equal(f.sql.prepare('SELECT state FROM cms_artifact_catalogs').get().state,'building');
    assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents').get().published_revision,null);
  } finally { f.close(); }
});

test('overlapping automatic advances are idempotent through the final sealing race with D1-wrapped SQLite errors',async()=>{
  const Preparer=await load();
  const f=await fixture();
  try {
    const wrapped={...f.db,async batch(statements) {
      try { return await f.db.batch(statements); }
      catch(error) { throw new Error(`D1_ERROR: ${error.message}: SQLITE_ERROR`); }
    }};
    const preparer=new Preparer(wrapped,f.bucket,f.assets,config);
    let progress=await preparer.start(1,'actor','publish');
    for(let i=0;i<50&&!progress.ready;i++) {
      const results=await Promise.all([preparer.advance(progress.id,'actor'),preparer.advance(progress.id,'actor')]);
      progress=results.find(result=>result.ready)??results[1];
    }
    assert.equal(progress.ready,true);
    assert.equal(f.objects.size,f.sql.prepare('SELECT expected_entries FROM cms_artifact_catalogs').get().expected_entries);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_artifact_entries').get().n,f.objects.size);
    assert.equal(f.assemblies,1);
    assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents').get().published_revision,null);
  } finally { f.close(); }
});

test('a publication cannot admit a missing receipt or a future/unadmitted revision',async()=>{
  const Preparer=await load();
  const f=await fixture();
  try {
    const raw=JSON.stringify(f.document);
    f.sql.prepare("INSERT INTO cms_revisions(version,document,kind,actor,created_at) VALUES (2,?,'draft','actor','2026-10-20T00:00:00Z')").run(raw);
    f.sql.exec('UPDATE cms_documents SET version=2,draft_revision=2');
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    await assert.rejects(preparer.start(2,'actor','publish'),code('publication_conflict'));
    await assert.rejects(preparer.start(1,'actor','rollback',2),code('publication_conflict'));
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_artifact_catalogs').get().n,0);
    assert.equal(f.writes.length,0);
  } finally { f.close(); }
});

test('even a valid admission for a future revision is rejected as a publication conflict',async()=>{
  const Preparer=await load();
  const f=await fixture();
  try {
    f.sql.exec(`INSERT INTO cms_revisions(version,document,kind,actor,created_at)
      SELECT 2,document,kind,actor,created_at FROM cms_revisions WHERE version=1;
      INSERT INTO cms_revision_admissions(revision,policy,digest,document_bytes,manifest)
      SELECT 2,policy,digest,document_bytes,manifest FROM cms_revision_admissions WHERE revision=1;`);
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    await assert.rejects(preparer.start(1,'actor','rollback',2),code('publication_conflict'));
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_artifact_catalogs').get().n,0);
    assert.equal(f.writes.length,0);
  } finally { f.close(); }
});

test('transaction-time version races abort projection writes and retain the previous publication pointer',async()=>{
  const Preparer=await load();
  const f=await fixture();
  try {
    const start=await new Preparer(f.db,f.bucket,f.assets,config).start(1,'actor','publish');
    const racing={...f.db,async batch(statements) { f.sql.exec('UPDATE cms_documents SET version=2');return f.db.batch(statements); }};
    await assert.rejects(new Preparer(racing,f.bucket,f.assets,config).advance(start.id,'actor'),code('publication_conflict'));
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_projection_cache').get().n,0);
    assert.equal(f.writes.length,0);
    assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents').get().published_revision,null);
  } finally { f.close(); }
});

test('the 40-part ceiling is enforced even when all source values are tiny',async()=>{
  const Preparer=await load();
  const document=seed();
  for(let i=0;i<70;i++) document.uiCopy[`tiny${i}`]={en:'a',fr:'b',es:'c'};
  const f=await fixture(document);
  try {
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    const start=await preparer.start(1,'actor','publish');
    const next=await preparer.advance(start.id,'actor');
    assert.equal(next.done,40);
    assert.equal(f.reads.flatMap(read=>read.rows??[]).filter(row=>Object.hasOwn(row,'document_json')).length,40);
  } finally { f.close(); }
});

test('upload membership admits only exact supported upload keys referenced by actual public content',async()=>{
  const Preparer=await load();
  const document=seed();
  const uuid='00000000-0000-4000-8000-000000000001';
  const sources=[`/media/upload-${uuid}.avif`,`/media/upload-${uuid}.jpeg`,`/media/upload-${uuid}.gif`,
    `/media/upload-${uuid.toUpperCase().replace('4000','ABCD')}.webp`,`/media/upload-short.webp`,
    `/media/upload-${uuid}/nested.webp`,...['jpg','png','webp'].map(ext=>`/media/upload-${uuid}.${ext}`)];
  document.media=sources.map((src,i)=>({...createCmsSeed().media[0],id:`upload-${i}`,src}));
  document.pages[0].sections=[{id:'upload-gallery',type:'gallery',enabled:true,variant:'grid',
    images:document.media.slice(-3).map(media=>({mediaId:media.id,alt:{en:'Image',fr:'Image',es:'Imagen'}}))}];
  const f=await fixture(document);
  try {
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    await finish(preparer,await preparer.start(1,'actor','publish'));
    assert.deepEqual(f.sql.prepare('SELECT media_key FROM cms_catalog_media ORDER BY media_key').all().map(row=>row.media_key),
      ['jpg','png','webp'].map(ext=>`upload-${uuid}.${ext}`));
  } finally { f.close(); }
});

test('F4 projection missing-part lookup uses the full immutable receipt key',async()=>{
  const Preparer=await load(),f=await fixture();
  try{
    const preparer=new Preparer(f.db,f.bucket,f.assets,config),job=await preparer.start(1,'actor','publish');
    await preparer.advance(job.id,'actor');
    const query=f.reads.find(read=>read.query.includes('ROW_NUMBER() OVER')).query;
    const lookups=f.sql.prepare('EXPLAIN QUERY PLAN '+query).all(job.id,config.policy)
      .map(row=>row.detail).filter(detail=>detail.includes('SEARCH v USING INDEX sqlite_autoindex_cms_validation_parts'));
    assert.ok(lookups.length>0);
    assert.ok(lookups.every(detail=>detail.includes('kind=? AND digest=?')),'no policy-wide receipt scan per manifest record');
  }finally{f.close();}
});

test('F4 actual admitted cardinality fixture produces 457 artifacts in 536 bounded advances',async t=>{
  const {cardinalityDocument}=await import('./fixtures/cms-cardinality.mjs');
  const began=performance.now();
  const trace=stage=>console.info(`[cms-cardinality] ${Math.round(performance.now()-began)}ms ${stage}`);
  const Preparer=await load(),f=await fixture(cardinalityDocument(),trace);
  trace('saved source; starting preparation');
  try{
    const before=f.sql.prepare('SELECT * FROM cms_documents').get();
    const original=f.sql.prepare('SELECT document FROM cms_revisions WHERE version=1').get().document;
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    let progress=await preparer.start(1,'actor','publish'),advances=0,maxParts=0,maxBytes=0;
    const plan=JSON.parse(f.sql.prepare('SELECT plan_json FROM cms_artifact_catalogs WHERE id=?').get(progress.id).plan_json);
    assert.equal(f.parts.length,3156);assert.equal(plan.entries.length,457);
    assert.equal(progress.total,3613);
    while(!progress.ready){
      assert.ok(++advances<=536);
      f.reads.length=0;
      progress=await preparer.advance(progress.id,'actor');
      if(advances%40===0)trace(`prepared ${advances}/536; units ${progress.done}/${progress.total}`);
      for(const {query,rows} of f.reads)if(query.includes('m.running_bytes<=32768')&&rows){
        const bytes=rows.reduce((n,row)=>n+Buffer.byteLength(row.document_json),0);
        maxParts=Math.max(maxParts,rows.length);maxBytes=Math.max(maxBytes,bytes);
        assert.ok(rows.length<=40&&bytes<=32768);
      }
    }
    assert.equal(advances,536);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_artifact_entries WHERE catalog_id=?').get(progress.id).n,457);
    assert.equal(f.sql.prepare('SELECT document FROM cms_revisions WHERE version=1').get().document,original);
    assert.deepEqual(f.sql.prepare('SELECT * FROM cms_documents').get(),before,'preparation remains private');
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_publications').get().n,0);
    t.diagnostic(JSON.stringify({sourceParts:f.parts.length,entries:plan.entries.length,advances,maxParts,maxBytes,sourceBytes:Buffer.byteLength(original)}));
  }finally{f.close();}
});

test('F4 failed or expired preparation renewal rolls back newly projected receipts',async()=>{
  const Preparer=await load();
  for(const fault of ['expiry','suppressed']){
    const f=await fixture();
    try{
      const now={seconds:f.sql.prepare('SELECT unixepoch() AS n').get().n};
      f.sql.function('strftime',(format,value)=>{assert.equal(value,'now');return format==='%s'?String(now.seconds):new Date(now.seconds*1000).toISOString();});
      const preparer=new Preparer(f.db,f.bucket,f.assets,config),job=await preparer.start(1,'actor','publish');
      const before=f.sql.prepare('SELECT * FROM cms_artifact_catalogs WHERE id=?').get(job.id);
      now.seconds+=3599;
      f.sql.exec(fault==='expiry'
        ? "CREATE TRIGGER lease_fault AFTER INSERT ON cms_projection_cache BEGIN UPDATE cms_artifact_catalogs SET expires_at=0 WHERE state='building'; END"
        : "CREATE TRIGGER lease_fault BEFORE UPDATE OF expires_at ON cms_artifact_catalogs WHEN NEW.expires_at>OLD.expires_at BEGIN SELECT RAISE(IGNORE); END");
      await assert.rejects(preparer.advance(job.id,'actor'),code('publication_conflict'));
      assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_projection_cache').get().n,0);
      assert.deepEqual(f.sql.prepare('SELECT * FROM cms_artifact_catalogs WHERE id=?').get(job.id),before);
      assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents').get().published_revision,null);
      f.sql.exec('DROP TRIGGER lease_fault');
      assert.ok((await preparer.advance(job.id,'actor')).done>0);
    }finally{f.close();}
  }
});

test('F4 active preparation renews its guarded database inactivity lease and seals with a fresh immutable lease',async()=>{
  const Preparer=await load(), f=await fixture();
  try {
    const now={seconds:f.sql.prepare('SELECT unixepoch() AS n').get().n};
    f.sql.function('strftime',(format,value)=>{
      assert.equal(value,'now');return format==='%s'?String(now.seconds):new Date(now.seconds*1000).toISOString();
    });
    const began=now.seconds,preparer=new Preparer(f.db,f.bucket,f.assets,config);
    let progress=await preparer.start(1,'actor','publish'),advances=0;
    while(!progress.ready){
      assert.ok(++advances<30);
      now.seconds+=3599;
      progress=await preparer.advance(progress.id,'actor');
      assert.ok(f.sql.prepare('SELECT expires_at FROM cms_artifact_catalogs WHERE id=?').get(progress.id).expires_at>=now.seconds+3600,'each admitted batch/artifact extends the live lease');
    }
    assert.ok(now.seconds-began>3600,'active work can legitimately outlast its initial lease');
    const sealed=f.sql.prepare('SELECT * FROM cms_artifact_catalogs WHERE id=?').get(progress.id);
    now.seconds+=30;
    assert.deepEqual(await preparer.start(1,'actor','publish'),progress);
    assert.deepEqual(f.sql.prepare('SELECT * FROM cms_artifact_catalogs WHERE id=?').get(progress.id),sealed,'ready resumption must not rewrite sealed expiry');
    assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents').get().published_revision,null);
  }finally{f.close();}
});

test('F3 lost start acknowledgement recovers the same actor-bound job from a new preparer, including concurrent identical starts',async()=>{
  const Preparer=await load();
  const f=await fixture();
  try {
    const before=f.sql.prepare('SELECT * FROM cms_documents').get();
    const lost=await new Preparer(f.db,f.bucket,f.assets,config).start(1,'actor','publish');
    const results=await Promise.all(Array.from({length:4},()=>new Preparer(f.db,f.bucket,f.assets,config).start(1,'actor','publish')));
    for(const progress of results) assert.deepEqual(progress,lost);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_artifact_catalogs').get().n,1);
    assert.deepEqual(f.sql.prepare('SELECT * FROM cms_documents').get(),before);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n,1);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_publications').get().n,0);
    assert.equal(f.writes.length,0);
  } finally { f.close(); }
});

test('F3 explicit later rollback choice supersedes only the same actors uncommitted preparation without removing charges or history',async()=>{
  const Preparer=await load();
  const f=await fixture();
  try {
    const newer=structuredClone(f.document);
    newer.pages[0].title.en='Later saved draft';
    const parts=splitCmsDocument(newer);
    const store=new StagedCmsStore(f.db,config.policy);
    const save=await store.startSave(1,'actor',parts.map(({value,...part})=>({...part,digest:hash(JSON.stringify(value))})));
    for(const i of save.missing) await store.putPart(save.id,'actor',parts[i]);
    await store.finishSave(save.id,'actor');
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    const old=await finish(preparer,await preparer.start(2,'actor','publish'));
    const before=f.sql.prepare('SELECT * FROM cms_documents').get();
    const history=f.sql.prepare('SELECT * FROM cms_revisions ORDER BY version').all();
    const receipts=f.sql.prepare('SELECT * FROM cms_artifact_entries WHERE catalog_id=? ORDER BY path').all(old.id);
    const charges=f.sql.prepare('SELECT * FROM cms_artifact_reservations WHERE catalog_id=? ORDER BY path').all(old.id);
    const objects=[...f.objects];
    const rollback=await new Preparer(f.db,f.bucket,f.assets,config).start(2,'actor','rollback',1);
    assert.notEqual(rollback.id,old.id);
    assert.equal(f.sql.prepare('SELECT state FROM cms_artifact_catalogs WHERE id=?').get(old.id).state,'expired');
    const row=f.sql.prepare('SELECT mode,source_revision,target_revision FROM cms_artifact_catalogs WHERE id=?').get(rollback.id);
    assert.deepEqual({...row},{mode:'rollback',source_revision:1,target_revision:3});
    await assert.rejects(preparer.advance(old.id,'actor'),code('publication_conflict'));
    assert.deepEqual(await preparer.start(2,'actor','rollback',1),rollback);
    const changed=await preparer.start(2,'actor','rollback',2);
    assert.notEqual(changed.id,rollback.id,'a different explicit historical source is a different intent');
    await assert.rejects(preparer.advance(rollback.id,'actor'),code('publication_conflict'));
    assert.deepEqual(f.sql.prepare('SELECT * FROM cms_artifact_entries WHERE catalog_id=? ORDER BY path').all(old.id),receipts);
    assert.deepEqual(f.sql.prepare('SELECT * FROM cms_artifact_reservations WHERE catalog_id=? ORDER BY path').all(old.id),charges);
    assert.deepEqual([...f.objects],objects);
    assert.deepEqual(f.sql.prepare('SELECT * FROM cms_documents').get(),before);
    assert.deepEqual(f.sql.prepare('SELECT * FROM cms_revisions ORDER BY version').all(),history);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_publications').get().n,0);
  } finally { f.close(); }
});

test('F3 concurrent cold identical starts create one eligible job in real serialized SQL transactions',async()=>{
  const Preparer=await load();
  const f=await fixture();
  try {
    const results=await Promise.all(Array.from({length:5},()=>new Preparer(f.db,f.bucket,f.assets,config).start(1,'actor','publish')));
    for(const result of results) assert.deepEqual(result,results[0]);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_artifact_catalogs').get().n,1);
  } finally { f.close(); }
});

test('F3 an older start cannot supersede an unseen ready winner before its transaction',async()=>{
  const Preparer=await load(), f=await fixture();
  try {
    let winner,snapshot;
    const capture=()=>({
      catalogs:f.sql.prepare('SELECT * FROM cms_artifact_catalogs ORDER BY id').all(),
      entries:f.sql.prepare('SELECT * FROM cms_artifact_entries ORDER BY catalog_id,path').all(),
      reservations:f.sql.prepare('SELECT * FROM cms_artifact_reservations ORDER BY catalog_id,path').all(),
      documents:f.sql.prepare('SELECT * FROM cms_documents').all(),
      revisions:f.sql.prepare('SELECT * FROM cms_revisions ORDER BY version').all(),
    });
    const racing={...f.db,async batch(statements){
      if(!winner){
        const next=new Preparer(f.db,f.bucket,f.assets,config);
        winner=await finish(next,await next.start(1,'actor','rollback',1));
        snapshot=capture();
      }
      return f.db.batch(statements);
    }};
    // Its planning started before the newer intent became ready. It cannot cancel
    // that unseen intent just because both requests share the same actor/version.
    await assert.rejects(new Preparer(racing,f.bucket,f.assets,config).start(1,'actor','publish'),code('publication_conflict'));
    assert.equal(winner.ready,true);
    assert.deepEqual(capture(),snapshot);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_artifact_catalogs').get().n,1);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_publications').get().n,0);
  } finally { f.close(); }
});

test('F3 interrupted advance recovers projection and an unacknowledged R2 object through explicit start without repeated PUT',async()=>{
  const Preparer=await load();
  const f=await fixture();
  try {
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    let progress=await preparer.start(1,'actor','publish');
    progress=await preparer.advance(progress.id,'actor');
    const restarted=new Preparer(f.db,f.bucket,f.assets,config);
    assert.deepEqual(await restarted.start(1,'actor','publish'),progress);
    while(progress.done<f.parts.length) progress=await restarted.advance(progress.id,'actor');
    const put=f.bucket.put.bind(f.bucket);
    f.bucket.put=async(...args)=>{await put(...args);throw new Error('lost advance acknowledgement');};
    await assert.rejects(restarted.advance(progress.id,'actor'),code('cms_unavailable'));
    assert.equal(f.writes.length,1);
    const pending=f.sql.prepare('SELECT * FROM cms_artifact_reservations').get();
    progress=await new Preparer(f.db,f.bucket,f.assets,config).start(1,'actor','publish');
    assert.equal(progress.done,f.parts.length);
    f.bucket.put=put;
    progress=await restarted.advance(progress.id,'actor');
    assert.equal(progress.done,f.parts.length+1);
    assert.equal(f.writes.length,1);
    assert.equal(f.sql.prepare('SELECT attempts FROM cms_artifact_reservations WHERE catalog_id=? AND path=?').get(pending.catalog_id,pending.path).attempts,1);
    await finish(restarted,progress);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_publications').get().n,0);
  } finally { f.close(); }
});

test('F3 ready explicit restart after actual precommit rate denial keeps sealed objects and receipts without any PUT or publication',async()=>{
  const Preparer=await load();
  const {consumeCmsRequest}=await import('../worker/cms-request-budget.ts');
  const f=await fixture();
  try {
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    const ready=await finish(preparer,await preparer.start(1,'actor','publish'));
    const before=f.sql.prepare('SELECT * FROM cms_documents').get();
    const catalog=f.sql.prepare('SELECT * FROM cms_artifact_catalogs').get();
    const entries=f.sql.prepare('SELECT * FROM cms_artifact_entries ORDER BY path').all();
    const reservations=f.sql.prepare('SELECT * FROM cms_artifact_reservations ORDER BY path').all();
    const objects=[...f.objects];
    const puts=f.writes.length;
    // Same durable SQL limiter/order as the router: denial occurs before commit admission.
    f.sql.exec("INSERT INTO cms_request_budgets(actor,bucket,reset_at,used) VALUES ('actor','write',unixepoch()+60,60)");
    await assert.rejects(consumeCmsRequest(f.db,'actor','write'),error=>error.status===429&&error.code==='cms_request_rate');
    // A later explicit action, after the rate window; not a speculative commit retry.
    f.sql.exec("UPDATE cms_request_budgets SET reset_at=0 WHERE actor='actor'");
    await consumeCmsRequest(f.db,'actor','write');
    const restarted=new Preparer(f.db,f.bucket,f.assets,config);
    assert.deepEqual(await restarted.start(1,'actor','publish'),ready);
    assert.deepEqual(await restarted.advance(ready.id,'actor'),ready);
    assert.equal(f.writes.length,puts);
    assert.deepEqual(f.sql.prepare('SELECT * FROM cms_artifact_catalogs').get(),catalog,'ready catalog remains fully sealed, lease not extended');
    assert.deepEqual(f.sql.prepare('SELECT * FROM cms_artifact_entries ORDER BY path').all(),entries);
    assert.deepEqual(f.sql.prepare('SELECT * FROM cms_artifact_reservations ORDER BY path').all(),reservations);
    assert.deepEqual([...f.objects],objects);
    assert.deepEqual(f.sql.prepare('SELECT * FROM cms_documents').get(),before);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n,1);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_publications').get().n,0);
    assert.throws(()=>f.sql.prepare("UPDATE cms_artifact_catalogs SET plan_json='{}' WHERE id=?").run(ready.id));
  } finally { f.close(); }
});

test('F3 server-only config changes supersede the same actor but never grant another actor takeover',async()=>{
  const Preparer=await load();
  for(const changed of [{renderer:'next-renderer'},{assets:'f'.repeat(64)},{origin:'https://next.example.test'},{policy:'next-policy'}]) {
    const f=await fixture();
    try {
      const preparer=new Preparer(f.db,f.bucket,f.assets,config);
      const old=await preparer.start(1,'actor','publish');
      if(changed.policy) {
        // Trusted fixture admission under a second SERVER policy, never a client payload.
        f.sql.prepare('INSERT INTO cms_revision_admissions SELECT revision,?,digest,document_bytes,manifest FROM cms_revision_admissions WHERE revision=1 AND policy=?').run(changed.policy,config.policy);
        f.sql.prepare('INSERT INTO cms_validation_parts SELECT ?,kind,digest,document_json,summary_json,document_bytes FROM cms_validation_parts WHERE policy=?').run(changed.policy,config.policy);
      }
      const caller=new Preparer(f.db,f.bucket,f.assets,{...config,...changed});
      const snapshot=f.sql.prepare('SELECT * FROM cms_artifact_catalogs').get();
      await assert.rejects(caller.start(1,'other','publish'),code('publication_conflict'));
      assert.deepEqual(f.sql.prepare('SELECT * FROM cms_artifact_catalogs').get(),snapshot);
      const fresh=await caller.start(1,'actor','publish');
      assert.notEqual(fresh.id,old.id);
      assert.equal(f.sql.prepare('SELECT state FROM cms_artifact_catalogs WHERE id=?').get(old.id).state,'expired');
      await assert.rejects(preparer.advance(old.id,'actor'),code('publication_conflict'));
      assert.deepEqual(await caller.start(1,'actor','publish'),fresh);
      await assert.rejects(caller.start(1,'other','rollback',1),code('publication_conflict'));
      assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_artifact_catalogs').get().n,2);
      assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_publications').get().n,0);
      assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents').get().published_revision,null);
      assert.equal(f.writes.length,0);
    } finally { f.close(); }
  }
});

test('F3 start rechecks version and current draft inside SQL before expiring or superseding an old intent',async()=>{
  const Preparer=await load();
  for(const mutation of ['UPDATE cms_documents SET version=2','UPDATE cms_documents SET draft_revision=NULL']) {
    const f=await fixture();
    try {
      const preparer=new Preparer(f.db,f.bucket,f.assets,config);
      const old=await preparer.start(1,'actor','publish');
      const oldRow=f.sql.prepare('SELECT * FROM cms_artifact_catalogs').get();
      let raced=false;
      const racing={...f.db,async batch(statements) {
        if(!raced) { raced=true; f.sql.exec(mutation); }
        return f.db.batch(statements);
      }};
      await assert.rejects(new Preparer(racing,f.bucket,f.assets,{...config,renderer:'new'}).start(1,'actor','publish'),code('publication_conflict'));
      assert.deepEqual(f.sql.prepare('SELECT * FROM cms_artifact_catalogs').get(),oldRow,'failed start rolls back expiry/supersession');
      await assert.rejects(preparer.advance(old.id,'actor'),code('publication_conflict'));
      if(mutation.includes('version')) {
        const fresh=await preparer.start(2,'actor','publish');
        assert.notEqual(fresh.id,old.id);
        assert.equal(f.sql.prepare('SELECT state FROM cms_artifact_catalogs WHERE id=?').get(old.id).state,'expired');
      }
      assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n,1);
      assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_publications').get().n,0);
      assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents').get().published_revision,null);
      assert.equal(f.writes.length,0);
    } finally { f.close(); }
  }
});

test('F3 database expiry creates a new intent without reviving the expired job or resetting its pending orphan charge',async()=>{
  const Preparer=await load();
  const f=await fixture();
  try {
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    let old=await preparer.start(1,'actor','publish');
    while(old.done<f.parts.length) old=await preparer.advance(old.id,'actor');
    const put=f.bucket.put.bind(f.bucket);
    f.bucket.put=async(...args)=>{await put(...args);throw new Error('lost ack');};
    await assert.rejects(preparer.advance(old.id,'actor'),code('cms_unavailable'));
    const reservation=f.sql.prepare('SELECT * FROM cms_artifact_reservations').get();
    const expires=f.sql.prepare('SELECT expires_at FROM cms_artifact_catalogs').get().expires_at;
    f.sql.function('strftime',(format,value)=>{
      assert.equal(value,'now');
      return format==='%s'?String(expires):new Date(expires*1000).toISOString();
    });
    await assert.rejects(preparer.advance(old.id,'actor'),code('publication_conflict'));
    const fresh=await preparer.start(1,'actor','publish');
    assert.notEqual(fresh.id,old.id);
    assert.equal(f.sql.prepare('SELECT state FROM cms_artifact_catalogs WHERE id=?').get(old.id).state,'expired');
    await assert.rejects(preparer.advance(old.id,'actor'),code('publication_conflict'));
    assert.deepEqual(f.sql.prepare('SELECT * FROM cms_artifact_reservations WHERE catalog_id=?').get(old.id),reservation);
    assert.equal(f.objects.size,1);
    assert.equal(f.writes.length,1);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_publications').get().n,0);
  } finally { f.close(); }
});

test('F3 supersession during R2 PUT leaves a charged orphan and cannot acknowledge or seal the old job',async()=>{
  const Preparer=await load();
  const f=await fixture();
  try {
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    let old=await preparer.start(1,'actor','publish');
    while(old.done<f.parts.length) old=await preparer.advance(old.id,'actor');
    const put=f.bucket.put.bind(f.bucket);
    let replacement;
    f.bucket.put=async(...args)=>{
      const receipt=await put(...args);
      replacement=await preparer.start(1,'actor','rollback',1);
      return receipt;
    };
    await assert.rejects(preparer.advance(old.id,'actor'),code('publication_conflict'));
    assert.notEqual(replacement.id,old.id);
    assert.equal(f.sql.prepare('SELECT state FROM cms_artifact_catalogs WHERE id=?').get(old.id).state,'expired');
    assert.equal(f.sql.prepare('SELECT state FROM cms_artifact_reservations WHERE catalog_id=?').get(old.id).state,'pending');
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_artifact_entries WHERE catalog_id=?').get(old.id).n,0);
    assert.equal(f.objects.size,1);
    assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents').get().published_revision,null);
  } finally { f.close(); }
});

test('F3 supersession immediately before final sealing cannot revive the old catalog or lose its stored charges',async()=>{
  const Preparer=await load();
  const f=await fixture();
  try {
    let replacement;
    const racing={...f.db,prepare(query) {
      const stmt=f.db.prepare(query);
      if(query.includes("SET state='ready'")) {
        stmt.sealing=true;
        const bind=stmt.bind;
        stmt.bind=(...values)=>Object.assign(bind(...values),{sealing:true});
      }
      return stmt;
    },async batch(statements) {
      if(statements.some(stmt=>stmt.sealing)) replacement=await new Preparer(f.db,f.bucket,f.assets,config).start(1,'actor','rollback',1);
      return f.db.batch(statements);
    }};
    const preparer=new Preparer(racing,f.bucket,f.assets,config);
    let old=await preparer.start(1,'actor','publish');
    await assert.rejects(async()=>{
      for(let i=0;i<100&&!old.ready;i++) old=await preparer.advance(old.id,'actor');
    },code('publication_conflict'));
    assert(replacement);
    assert.equal(f.sql.prepare('SELECT state FROM cms_artifact_catalogs WHERE id=?').get(old.id).state,'expired');
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_catalog_routes WHERE catalog_id=?').get(old.id).n,0);
    const entries=f.sql.prepare('SELECT COUNT(*) AS n FROM cms_artifact_entries WHERE catalog_id=?').get(old.id).n;
    assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM cms_artifact_reservations WHERE catalog_id=? AND state='stored'").get(old.id).n,entries);
    assert.equal(f.objects.size,entries);
    await assert.rejects(preparer.advance(old.id,'actor'),code('publication_conflict'));
    assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents').get().published_revision,null);
  } finally { f.close(); }
});

test('F3 a committed job is never replayed by stale start and a fresh explicit version is required for a new intent',async()=>{
  const Preparer=await load();
  const {commitPreparedPublication}=await import('../worker/cms-publication-commit.ts');
  const f=await fixture();
  try {
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    const ready=await finish(preparer,await preparer.start(1,'actor','publish'));
    await commitPreparedPublication(f.db,{catalogId:ready.id,expectedVersion:1,actor:'actor',mode:'publish',...config});
    const documents=f.sql.prepare('SELECT * FROM cms_documents').get();
    const history=f.sql.prepare('SELECT * FROM cms_revisions ORDER BY version').all();
    const publications=f.sql.prepare('SELECT * FROM cms_publications').all();
    const published=f.sql.prepare('SELECT * FROM cms_artifact_catalogs WHERE id=?').get(ready.id);
    const puts=f.writes.length;
    await assert.rejects(new Preparer(f.db,f.bucket,f.assets,config).start(1,'actor','publish'),code('publication_conflict'));
    await assert.rejects(preparer.advance(ready.id,'actor'),code('publication_conflict'));
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_artifact_catalogs').get().n,1);
    // A genuinely new explicit owner action at the now-current version can prepare,
    // but start still does not commit or synthesize a new publication/history row.
    const next=await preparer.start(2,'actor','publish');
    assert.notEqual(next.id,ready.id);
    assert.deepEqual(f.sql.prepare('SELECT * FROM cms_artifact_catalogs WHERE id=?').get(ready.id),published);
    assert.deepEqual(f.sql.prepare('SELECT * FROM cms_documents').get(),documents);
    assert.deepEqual(f.sql.prepare('SELECT * FROM cms_revisions ORDER BY version').all(),history);
    assert.deepEqual(f.sql.prepare('SELECT * FROM cms_publications').all(),publications);
    assert.equal(f.writes.length,puts);
  } finally { f.close(); }
});

test('start binds an admitted saved draft, actor, DB clock and deployment without touching publication or reading source bytes',async()=>{
  const Preparer=await load();
  const f=await fixture();
  try {
    const preparer=new Preparer(f.db,f.bucket,f.assets,config);
    const progress=await preparer.start(1,'actor','publish');
    assert.match(progress.id,/^[a-f0-9]{32}$/);
    assert.equal(progress.ready,false);
    assert.equal(progress.done,0);
    assert.equal(progress.total,f.parts.length+10);
    assert.deepEqual(await preparer.status(progress.id,'actor'),progress);
    const catalog=f.sql.prepare('SELECT * FROM cms_artifact_catalogs').get();
    assert.equal(catalog.source_revision,1);
    assert.equal(catalog.expected_version,1);
    assert.equal(catalog.target_revision,2);
    assert.equal(catalog.actor,'actor');
    assert.equal(catalog.origin,'https://fezguidetours.com');
    assert.equal(catalog.context_digest.length,64);
    assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents').get().published_revision,null);
    assert.equal(f.writes.length,0);
    assert(!f.reads.some(({row,rows})=>[row,...rows??[]].some(value=>value&&Object.hasOwn(value,'document'))),'private source document never crosses SQL boundary');
    await assert.rejects(preparer.start(1,'other','publish'),code('publication_conflict'));
    await assert.rejects(preparer.status(progress.id,'other'),code('publication_conflict'));
  } finally { f.close(); }
});
