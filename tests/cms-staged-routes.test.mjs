import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { register } from 'tsx/esm/api';
import {fixtureUpload} from './fixtures/cms-upload.mjs';
register();
const { createCmsHandler } = await import('../worker/cms-routes.ts');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { splitCmsDocument } = await import('../src/cms/document-parts.ts');
const hash = value => createHash('sha256').update(value).digest('hex');
const ORIGIN = 'https://editor.example.test';
const NOW = 2_000_000_000;
// Synthetic signed Access identity; no alternate auth scheme or operational credentials.
const keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' }, true, ['sign','verify']);
const jwk = { ...await crypto.subtle.exportKey('jwk', keys.publicKey), kid: 'staged-contract', alg: 'RS256' };
const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
async function token(overrides = {}) {
  const input = `${b64({ alg: 'RS256', kid: jwk.kid })}.${b64({ iss: 'https://staged.cloudflareaccess.com', aud: ['staged'], sub: 'editor', exp: NOW+60, ...overrides })}`;
  return `${input}.${Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keys.privateKey, new TextEncoder().encode(input))).toString('base64url')}`;
}
function smallSeed() {
  const doc = createCmsSeed();
  for (const [key,value] of Object.entries(doc)) if (Array.isArray(value)) doc[key] = [];
  for (const [key,value] of Object.entries(doc.legacy)) if (Array.isArray(value)) doc.legacy[key] = [];
  doc.pages = [{ ...createCmsSeed().pages.find(page => page.id === 'home'), sections: [] }];
  doc.footer.links = []; doc.uiCopy = {};
  return doc;
}
for(const shellId of [undefined,'','bad','A'.repeat(64)]) test(`staged publication rejects invalid CMS_SHELL_ID ${String(shellId)}`,async()=>{
  const f=await fixture();
  try{
    await f.stage();
    const response=await f.call('/api/admin/content/preparations','POST',{expectedVersion:1,mode:'publish'},{},{CMS_SHELL_ID:shellId});
    assert.equal(response.status,503);
    assert.deepEqual(await response.json(),{error:'cms_unavailable'});
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_artifact_catalogs').get().n,0);
  }finally{f.close();}
});
async function fixture() {
  const sql = new DatabaseSync(':memory:');
  for (const file of ['0001_cms.sql','0002_media_budget.sql','0003_cms_release_safeguards.sql','0004_cms_prepared_publications.sql','0005_cms_recovery.sql','0006_cms_first_catalog_bootstrap.sql']) sql.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url),'utf8'));
  const queries = [];
  const statement = (query, values = []) => ({
    bind: (...args) => statement(query,args),
    async first() { queries.push(query); return sql.prepare(query).get(...values) ?? null; },
    async all() { queries.push(query); return { success:true, results:sql.prepare(query).all(...values) }; },
    async run() {
      queries.push(query);
      // D1 batch returns rows for SELECT guards/scalars as well as write metadata.
      if (/^\s*(SELECT|WITH)\b/i.test(query)) return {success:true,results:sql.prepare(query).all(...values),meta:{changes:0}};
      const result=sql.prepare(query).run(...values); return {success:true,meta:{changes:Number(result.changes)}};
    },
  });
  const db = { prepare:statement, async batch(statements) {
    sql.exec('BEGIN IMMEDIATE');
    try { const results=[]; for(const stmt of statements) results.push(await stmt.run()); sql.exec('COMMIT'); return results; }
    catch(error) { sql.exec('ROLLBACK'); throw error; }
  } };
  const shell='<html><head></head><body><div id="root"></div></body></html>';
  // Controlled R2 contract fake, NOT provider/native R2 evidence.
  const objects=new Map(); let reads=0;
  const bucket={
    async put(key,bytes,options) {
      if(objects.has(key)) return null;
      const object={bytes,etag:hash(bytes),version:'contract-v1',size:bytes.byteLength,httpMetadata:options.httpMetadata,customMetadata:options.customMetadata,checksums:{sha256:options.sha256}};
      objects.set(key,object); return object;
    },
    async head(key) { return objects.get(key)??null; },
    async get(key, options) { reads++; const object=objects.get(key); return object && (!options?.onlyIf || options.onlyIf.etagMatches === object.etag) ? {...object,key,body:new Response(object.bytes).body} : null; },
  };
  let validations=0;
  const handler=createCmsHandler({ validateDocument(value) { validations++; throw new Error('full source validator forbidden'); }, access:{now:()=>NOW*1000,fetch:async()=>Response.json({keys:[jwk]})} });
  const env={ ACCESS_TEAM_DOMAIN:'staged.cloudflareaccess.com',ACCESS_AUD:'staged',ACCESS_ALLOWED_SUBJECTS:'editor',CMS_DB:db,CMS_MEDIA:bucket,ASSETS:{fetch:async()=>new Response(shell,{headers:{'Content-Type':'text/html'}})},CMS_PROCESSING_MODE:'staged-v1',CMS_VALIDATION_POLICY:'routing-test-policy',CMS_RENDERER_ID:'routing-test-renderer',CMS_ASSET_ID:hash('complete-dist-manifest'),CMS_SHELL_ID:hash(shell),CANONICAL_ORIGIN:'https://www.example.test',CMS_PUBLIC_DELIVERY_ORIGIN:ORIGIN };
  const jwt=await token();
  const call=(path,method='GET',body,extra={},overrides={})=>handler(new Request(`${ORIGIN}${path}`,{method,headers:{'Cf-Access-Jwt-Assertion':jwt,...(body!==undefined?{'Content-Type':'application/json'}:{}),...extra},...(body!==undefined?{body:JSON.stringify(body)}:{})}),{...env,...overrides});
  const stage=async(doc=smallSeed())=>{
    const parts=splitCmsDocument(doc);
    const manifest=parts.map(({value,...part})=>({...part,digest:hash(JSON.stringify(value))}));
    const started=await call('/api/admin/content/save-jobs','POST',{expectedVersion:0,manifest});
    assert.equal(started.status,200,await started.clone().text());
    const job=await started.json();
    assert.deepEqual(job.missing,parts.map((_,index)=>index));
    for(const offset of job.missing) {
      const response=await call(`/api/admin/content/save-jobs/${job.id}/part`,'POST',{part:parts[offset]});
      assert.equal(response.status,200,await response.clone().text()); assert.deepEqual(await response.json(),{stored:true});
    }
    const committed=await call(`/api/admin/content/save-jobs/${job.id}/commit`,'POST',{});
    assert.equal(committed.status,200,await committed.clone().text());
    assert.deepEqual(await committed.json(),{version:1,draftRevision:1,published:false});
    return job;
  };
  return {sql,db,queries,handler,env,call,stage,jwt,objects,bucket,reads:()=>reads,validations:()=>validations,close:()=>sql.close()};
}

test('bootstrap preparation leaves public delivery on legacy content until an unchanged-pointer catalog is ready',async()=>{
  const f=await fixture();
  try{
    const {createCmsHandler}=await import('../worker/cms-routes.ts');
    const legacyHandler=createCmsHandler({validateDocument:value=>value,access:{now:()=>NOW*1000,fetch:async()=>Response.json({keys:[jwk]})}});
    const call=(path,method='GET',body,extra={},overrides={})=>legacyHandler(new Request(`${ORIGIN}${path}`,{
      method,headers:{'Cf-Access-Jwt-Assertion':f.jwt,...(body!==undefined?{'Content-Type':'application/json'}:{}),...extra},
      ...(body!==undefined?{body:JSON.stringify(body)}:{})
    }),{...f.env,...overrides});
    const doc=smallSeed();
    const mediaSrc='/media/upload-00000000-0000-4000-8000-000000000001.webp';
    doc.media=[{...createCmsSeed().media[0],id:'bootstrap-media',src:mediaSrc}];
    doc.pages[0].seo.image={mediaId:'bootstrap-media',alt:{en:'Fixture photo',fr:'Photo témoin',es:'Foto de prueba'}};
    const upload=fixtureUpload(mediaSrc);f.objects.set(upload.key,upload);
    await f.stage(doc);
    const source=f.sql.prepare('SELECT document FROM cms_revisions WHERE version=1').get().document;
    f.sql.prepare("INSERT INTO cms_revisions VALUES(2,?,'publish','editor','fixture-published',1)").run(source);
    f.sql.prepare(`INSERT INTO cms_revision_admissions(revision,policy,digest,document_bytes,manifest)
      SELECT 2,policy,digest,document_bytes,manifest FROM cms_revision_admissions WHERE revision=1`).run();
    f.sql.prepare('UPDATE cms_documents SET version=2,draft_revision=2,published_revision=2 WHERE id=1').run();
    const legacyEnv={CMS_PROCESSING_MODE:undefined,CMS_PREPARATION_MODE:'bootstrap-v1'};
    const before=await call('/api/cms/document','GET',undefined,{},legacyEnv);
    assert.equal(before.status,200,await before.clone().text());
    const original=await before.json();
    const crossSite=await call('/api/admin/content/preparations','POST',{expectedVersion:2,mode:'bootstrap'},
      {Origin:ORIGIN,'Sec-Fetch-Site':'cross-site'},legacyEnv);
    assert.equal(crossSite.status,403);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_artifact_catalogs').get().n,0);
    const start=await call('/api/admin/content/preparations','POST',{expectedVersion:2,mode:'bootstrap'},
      {Origin:ORIGIN,'Sec-Fetch-Site':'same-origin'},legacyEnv);
    assert.equal(start.status,200,await start.clone().text());
    let progress=await start.json();
    while(!progress.ready){
      const response=await call(`/api/admin/content/preparations/${progress.id}/advance`,'POST',{},
        {Origin:ORIGIN,'Sec-Fetch-Site':'same-origin'},legacyEnv);
      assert.equal(response.status,200,await response.clone().text());progress=await response.json();
    }
    const committed=await call(`/api/admin/content/preparations/${progress.id}/commit`,'POST',{},
      {Origin:ORIGIN,'Sec-Fetch-Site':'same-origin'},legacyEnv);
    assert.equal(committed.status,200,await committed.clone().text());
    assert.deepEqual(await committed.json(),{version:2,draftRevision:2,published:true,bootstrap:true});
    assert.deepEqual({...f.sql.prepare('SELECT version,draft_revision,published_revision FROM cms_documents').get()},
      {version:2,draft_revision:2,published_revision:2});
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n,2);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_publications').get().n,0);
    const stillLegacy=await call('/api/cms/document','GET',undefined,{},legacyEnv);
    assert.equal(stillLegacy.status,200);
    assert.deepEqual(await stillLegacy.json(),original,'bootstrap-only mode keeps the public route on the legacy reader');
    const prepared=await call('/api/cms/document','GET',undefined,{}, {CMS_PROCESSING_MODE:'staged-v1'});
    assert.equal(prepared.status,200,await prepared.clone().text());
    assert.equal((await prepared.json()).version,2);
    const mediaResponse=await call(mediaSrc,'GET',undefined,{}, {CMS_PROCESSING_MODE:'staged-v1'});
    assert.equal(mediaResponse.status,200,await mediaResponse.clone().text());
  }finally{f.close();}
});

test('K1 real client privately saves, publishes and rolls back a long article with bounded router queries',async()=>{
  const f=await fixture(),originalFetch=globalThis.fetch;
  try{
    const api=await import('../src/admin/admin-api.ts');
    const doc=smallSeed(),text='é'.repeat(20_000);
    doc.reviews=structuredClone(createCmsSeed().reviews);for(const review of doc.reviews)review.enabled=false;
    doc.pages[0].sections=[
      {id:'long-story',type:'richText',enabled:true,variant:'story',blocks:[{type:'paragraph',text:{en:text,fr:text,es:text}}]},
      {id:'reviews',type:'reviews',enabled:true,variant:'grid',reviewIds:doc.reviews.map(r=>r.id)},
    ];
    const {validateCmsDocument}=await import('../src/cms/schema.ts');assert.deepEqual(validateCmsDocument(doc).errors,[]);
    let maxQueries=0;
    globalThis.fetch=async(path,options={})=>{
      const before=f.queries.length;
      const response=await f.call(path,options.method??'GET',options.body===undefined?undefined:JSON.parse(options.body),{Origin:ORIGIN,'Sec-Fetch-Site':'same-origin'});
      if(path.endsWith('/advance')){const count=f.queries.length-before;maxQueries=Math.max(maxQueries,count);assert.ok(count<=50,`${count} binding statements in one router advance`);}
      return response;
    };
    const publicText=async()=>{const response=await f.call('/api/cms/document');assert.equal(response.status,200);return(await response.json()).document.pages[0].sections.find(s=>s.id==='long-story').blocks[0].text.en;};
    await api.loadAdminContent();await api.saveAdminDraft(0,doc);
    assert.equal((await f.call('/api/cms/document')).status,503);
    await api.publishAdminDraft(1);assert.equal(await publicText(),text);
    const original=f.sql.prepare('SELECT version,document FROM cms_revisions ORDER BY version').all();
    // Independent logical test window; native HTTP proof uses real quota-respecting pacing.
    f.sql.exec('UPDATE cms_request_budgets SET reset_at=0');
    doc.pages[0].sections[0].blocks[0].text.en='ß'.repeat(20_000);
    await api.saveAdminDraft(2,doc);assert.equal(await publicText(),text);
    await api.publishAdminDraft(3);assert.equal(await publicText(),doc.pages[0].sections[0].blocks[0].text.en);
    f.sql.exec('UPDATE cms_request_budgets SET reset_at=0');
    await api.rollbackAdminRevision(4,2);assert.equal(await publicText(),text);
    assert.deepEqual(f.sql.prepare('SELECT version,document FROM cms_revisions WHERE version<=2 ORDER BY version').all(),original);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_large_projection_work').get().n,0);
    assert.ok(maxQueries>20,'exercise the guarded native-work path');
    console.log(`[cms-long-article] max authenticated advance binding statements=${maxQueries}`);
  }finally{globalThis.fetch=originalFetch;f.close();}
});

test('F6 public media never serves a generation different from its verified publication receipt',async()=>{
  const f=await fixture();
  try {
    const src='/media/upload-00000000-0000-4000-8000-000000000001.webp';
    const object=fixtureUpload(src);f.objects.set(object.key,object);
    const doc=smallSeed();doc.media=[{...createCmsSeed().media[0],id:'managed',src}];
    doc.pages[0].seo.image={mediaId:'managed',alt:{en:'Image',fr:'Image',es:'Image'}};
    await f.stage(doc);
    let response=await f.call('/api/admin/content/preparations','POST',{expectedVersion:1,mode:'publish'});
    let progress=await response.json();
    while(!progress.ready){response=await f.call(`/api/admin/content/preparations/${progress.id}/advance`,'POST',{});assert.equal(response.status,200,await response.clone().text());progress=await response.json();}
    assert.equal((await f.call(`/api/admin/content/preparations/${progress.id}/commit`,'POST',{})).status,200);
    assert.equal((await f.call(src)).status,200);
    object.version='out-of-band-replacement';
    const changed=await f.call(src);
    assert.equal(changed.status,503,'same ETag is not enough when native object generation changes');
    assert.equal(await changed.text(),'{"error":"media_unavailable"}');
  }finally{f.close();}
});

test('F5 authenticated router pins server redirects through preparation, commit and public reads',async()=>{
  const f=await fixture();
  try {
    const doc=smallSeed();
    const mediaKey='upload-00000000-0000-4000-8000-000000000001.webp';
    doc.media=[{...createCmsSeed().media[0],src:`/media/${mediaKey}`}];
    const upload=fixtureUpload(doc.media[0].src);f.objects.set(upload.key,upload);
    doc.pages[0].seo.image={mediaId:doc.media[0].id,alt:{en:'Fixture',fr:'Fixture',es:'Fixture'}};
    f.env.CMS_SLUG_REDIRECTS='{"old-home":"home"}';
    await f.stage(doc);
    const first=await f.call('/api/admin/content/preparations','POST',{expectedVersion:1,mode:'publish'});
    assert.equal(first.status,200,await first.clone().text());
    let progress=await first.json();
    for(let i=0;i<30&&!progress.ready;i++) {
      const response=await f.call(`/api/admin/content/preparations/${progress.id}/advance`,'POST',{});
      assert.equal(response.status,200,await response.clone().text());progress=await response.json();
    }
    assert.equal(progress.ready,true);
    assert.equal(f.sql.prepare('SELECT canonical_path FROM cms_catalog_routes WHERE route_key=?').get('path:fr:old-home')?.canonical_path,'/fr');
    f.env.CMS_SLUG_REDIRECTS='{"old-home":"missing"}';
    assert.equal((await f.call(`/api/admin/content/preparations/${progress.id}/advance`,'POST',{})).status,409);
    assert.equal((await f.call(`/api/admin/content/preparations/${progress.id}/commit`,'POST',{})).status,409);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_publications').get().n,0);
    f.env.CMS_SLUG_REDIRECTS=' { "old-home" : "home" } ';
    const committed=await f.call(`/api/admin/content/preparations/${progress.id}/commit`,'POST',{});
    assert.equal(committed.status,200,await committed.clone().text());
    const {default:main}=await import('../worker/index.ts');
    const redirect=await main.fetch(new Request(ORIGIN+'/fr/old-home?lang=es&tag=a&tag=b'),f.env);
    assert.equal(redirect.status,308);assert.equal(redirect.headers.get('Location'),'/fr?tag=a&tag=b');
    assert.equal((await f.handler(new Request(ORIGIN+'/api/cms/document'),f.env)).status,200);
    const before=f.reads();
    await f.handler(new Request(ORIGIN+`/media/${mediaKey}`),f.env);
    assert.equal(f.reads(),before+1,'matching route identity reaches the verified controlled fixture object');
    f.env.CMS_SLUG_REDIRECTS='{"old-home":"missing"}';
    assert.equal((await f.handler(new Request(ORIGIN+'/api/cms/document'),f.env)).status,503);
    assert.equal((await f.handler(new Request(ORIGIN+`/media/${mediaKey}`),f.env)).status,404);
    assert.equal(f.reads(),before+1,'drift never reads an upload object');
    assert.equal(f.validations(),0);
  } finally {f.close();}
});

for(const mode of ['publish','rollback']) test(`F3 real client/router ${mode}: lost progress and rate-denied commit recover only on explicit invocation`,async()=>{
  const f=await fixture(), originalFetch=globalThis.fetch;
  try {
    await f.stage();
    const api=await import('../src/admin/admin-api.ts');
    const body={expectedVersion:1,mode,...(mode==='rollback'?{revision:1}:{})};
    const first=await (await f.call('/api/admin/content/preparations','POST',body)).json();
    assert.deepEqual(await (await f.call('/api/admin/content/preparations','POST',body)).json(),first);
    const baseline=f.sql.prepare('SELECT * FROM cms_documents').get();
    const source=f.sql.prepare('SELECT document FROM cms_revisions WHERE version=1').get().document;
    let dropAdvance=true,denyCommit=true,commits=0,advances=0,puts=0,lostReceipt;
    const put=f.bucket.put.bind(f.bucket);
    f.bucket.put=async(...args)=>{puts++;return put(...args);};
    const snapshot=()=>({
      catalog:f.sql.prepare('SELECT * FROM cms_artifact_catalogs WHERE id=?').get(first.id),
      entries:f.sql.prepare('SELECT * FROM cms_artifact_entries WHERE catalog_id=? ORDER BY path').all(first.id),
      reservations:f.sql.prepare('SELECT * FROM cms_artifact_reservations WHERE catalog_id=? ORDER BY path').all(first.id),
      documents:f.sql.prepare('SELECT * FROM cms_documents').get(),
      revisions:f.sql.prepare('SELECT * FROM cms_revisions ORDER BY version').all(),
    });
    globalThis.fetch=async(path,options={})=>{
      assert.equal(typeof path,'string');assert.ok(path.startsWith('/api/admin/'));
      if(path.endsWith('/commit')){
        commits++;
        if(denyCommit){
          denyCommit=false;
          f.sql.prepare("UPDATE cms_request_budgets SET used=60,reset_at=unixepoch()+60 WHERE actor='editor' AND bucket='write'").run();
        }
      }
      const response=await f.call(path,options.method??'GET',options.body===undefined?undefined:JSON.parse(options.body),{Origin:ORIGIN,'Sec-Fetch-Site':'same-origin'});
      if(path.endsWith('/preparations')&&response.ok)assert.equal((await response.clone().json()).id,first.id);
      if(path.endsWith('/advance')){
        advances++;
        const receipt=f.sql.prepare('SELECT * FROM cms_artifact_entries WHERE catalog_id=? ORDER BY path LIMIT 1').get(first.id);
        if(dropAdvance&&response.ok&&receipt){
          await response.arrayBuffer();dropAdvance=false;lostReceipt=receipt;
          throw new TypeError('controlled lost advance acknowledgement');
        }
      }
      return response;
    };
    await api.loadAdminContent();
    const invoke=()=>mode==='publish'?api.publishAdminDraft(1):api.rollbackAdminRevision(1,1);
    await assert.rejects(invoke(),error=>error.code==='staged_operation_failed'&&error.preserveDraft);
    assert.ok(lostReceipt);assert.equal(commits,0);
    assert.deepEqual(f.sql.prepare('SELECT * FROM cms_documents').get(),baseline);
    await assert.rejects(invoke(),error=>error.status===429&&error.code==='cms_request_rate'&&error.preserveDraft);
    assert.equal(commits,1,'commit is never automatically replayed');
    const ready=snapshot();assert.equal(ready.catalog.state,'ready');assert.deepEqual(ready.documents,baseline);
    assert.deepEqual(f.sql.prepare('SELECT * FROM cms_artifact_entries WHERE catalog_id=? AND path=?').get(first.id,lostReceipt.path),lostReceipt);
    f.sql.exec("UPDATE cms_request_budgets SET reset_at=0 WHERE actor='editor' AND bucket='write'");
    const resumed=await (await f.call('/api/admin/content/preparations','POST',body)).json();
    assert.equal(resumed.id,first.id);assert.equal(resumed.ready,true);assert.deepEqual(snapshot(),ready);
    const before={advances,puts};
    assert.deepEqual(await invoke(),{version:2,draftRevision:2,published:true});
    assert.deepEqual({advances,puts},before,'ready recovery does not re-advance or re-PUT');
    assert.equal(commits,2,'only the new explicit invocation commits');
    assert.equal(f.sql.prepare('SELECT document FROM cms_revisions WHERE version=1').get().document,source);
    assert.equal(f.sql.prepare('SELECT kind FROM cms_revisions WHERE version=2').get().kind,mode);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_publications').get().n,1);
  } finally {globalThis.fetch=originalFetch;f.close();}
});

test('real SQLite staged save routes persist admitted bytes and return raw revisions plus metadata-only history', async()=>{
  const f=await fixture();
  try {
    await f.stage();
    const stored=f.sql.prepare('SELECT document FROM cms_revisions WHERE version=1').get().document;
    const parse=JSON.parse;
    try {
      JSON.parse=(value,...args)=>{assert.notEqual(value,stored,'raw source must not be parsed');return parse(value,...args);};
      for(const path of ['/api/admin/content','/api/admin/content/revisions/1']) {
        const response=await f.call(path);
        assert.equal(response.status,200,await response.clone().text());
        const raw=await response.text();
        assert.ok(raw.startsWith('{"processing":"staged-v1",'));
        assert.ok(raw.includes('"document":'+stored), 'response preserves exact native source bytes');
      }
    } finally { JSON.parse=parse; }
    f.queries.length=0;
    const history=await f.call('/api/admin/content/revisions?limit=1&before=2');
    assert.equal(history.status,200);
    const rows=(await history.json()).revisions;
    assert.equal(rows.length,1); assert.equal(rows[0].version,1); assert.equal('document' in rows[0],false);
    assert.ok(f.queries.some(query=>/SELECT version, kind, actor, created_at, source_revision/.test(query)));
    assert.equal(f.validations(),0);
    assert.equal((await f.call('/api/admin/content/revisions?limit=101')).status,400);
    assert.equal((await f.call('/api/admin/content/revisions?limit=1&limit=2')).status,400);
  } finally { f.close(); }
});

test('staged mode rejects legacy whole-document writes and routes recovery through bounded handlers', async()=>{
  const f=await fixture();
  try {
    for(const [path,method] of [['draft','PUT'],['publish','POST'],['rollback','POST'],['validate','POST']]) {
      const request=new Request(`${ORIGIN}/api/admin/content/${path}`,{method,headers:{'Cf-Access-Jwt-Assertion':f.jwt,'Content-Type':'application/json'},body:'not-json'});
      const response=await f.handler(request,f.env);
      assert.equal(response.status,409,path); assert.equal(request.bodyUsed,false);
      assert.deepEqual(await response.json(),{error:'staged_required'});
    }
    f.env.CMS_MEDIA.list=async()=>({objects:[],truncated:false});
    const backup=await f.call('/api/admin/recovery/backup');assert.equal(backup.status,200);assert.equal((await backup.json()).format,'fez-cms-portable-v2');
    const orphan=await f.call('/api/admin/recovery/orphans');assert.equal(orphan.status,200);assert.deepEqual(await orphan.json().then(({dryRun,deleted,objects})=>({dryRun,deleted,objects})),{dryRun:true,deleted:0,objects:[]});
    const restore=await f.call('/api/admin/recovery/restore','POST',{expectedVersion:0,archiveDigest:'a'.repeat(64),revisionDigest:'b'.repeat(64)});assert.equal(restore.status,200,await restore.clone().text());const intent=await restore.json();assert.match(intent.id,/^[a-f0-9]{32}$/);assert.equal(f.sql.prepare('SELECT state FROM cms_restore_jobs WHERE id=?').get(intent.id).state,'open');
    assert.equal(f.validations(),0); assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM cms_revisions').get().n,0);
  } finally { f.close(); }
});

test('staged routes require real allowed JWTs and reject Origin or cross-site peers before DB/body work', async()=>{
  const f=await fixture();
  try {
    const routes=['/api/admin/content/save-jobs',`/api/admin/content/save-jobs/${'a'.repeat(32)}/part`,`/api/admin/content/save-jobs/${'a'.repeat(32)}/commit`,'/api/admin/content/preparations',`/api/admin/content/preparations/${'b'.repeat(32)}/advance`,`/api/admin/content/preparations/${'b'.repeat(32)}/commit`];
    const cold={...f.env,CMS_DB:{prepare(){assert.fail('denial must not touch DB');},batch(){assert.fail('denial must not charge');}}};
    for(const path of routes) for(const [headers,status] of [
      [{},401], [{'Cf-Access-Jwt-Assertion':await token({aud:['wrong']})},401],
      [{'Cf-Access-Jwt-Assertion':f.jwt,Origin:'https://other.example.test'},403],
      [{'Cf-Access-Jwt-Assertion':f.jwt,'Sec-Fetch-Site':'cross-site'},403],
    ]) {
      const request=new Request(`${ORIGIN}${path}`,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:'{}'});
      const response=await f.handler(request,cold);
      assert.equal(response.status,status,path); assert.equal(request.bodyUsed,false);
    }
  } finally { f.close(); }
});

test('streaming and declared body limits, JSON envelopes and durable rate limits precede staged work', async()=>{
  const f=await fixture();
  try {
    const path=`/api/admin/content/save-jobs/${'a'.repeat(32)}/commit`;
    for(const declared of [true,false]) {
      let cancelled=false;
      const body=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(4097));},cancel(){cancelled=true;}});
      const response=await f.handler(new Request(`${ORIGIN}${path}`,{method:'POST',headers:{'Cf-Access-Jwt-Assertion':f.jwt,'Content-Type':'application/json',...(declared?{'Content-Length':'4097'}:{})},body,duplex:'half'}),f.env);
      assert.equal(response.status,413); assert.equal(cancelled,true);
    }
    assert.equal((await f.call(path,'POST',{}, {'Content-Encoding':'gzip'})).status,415);
    assert.equal((await f.call(path,'POST',{}, {'Content-Type':'text/plain'})).status,415);
    assert.equal((await f.call(path,'POST',{expectedVersion:0})).status,400);
    assert.equal(f.sql.prepare("SELECT used FROM cms_request_budgets WHERE actor='editor' AND bucket='write'").get().used,5);
    f.sql.prepare("UPDATE cms_request_budgets SET used=60,reset_at=unixepoch()+60 WHERE actor='editor' AND bucket='write'").run();
    const request=new Request(`${ORIGIN}${path}`,{method:'POST',headers:{'Cf-Access-Jwt-Assertion':f.jwt,'Content-Type':'application/json'},body:'{}'});
    const denied=await f.handler(request,f.env);
    assert.equal(denied.status,429); assert.equal(denied.headers.get('Retry-After'),'60'); assert.equal(request.bodyUsed,false);
    assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM cms_save_jobs').get().n,0);
  } finally { f.close(); }
});

test('legacy default and unknown mode remain legacy; staged missing admissions fail closed without migration', async()=>{
  const f=await fixture();
  try {
    for(const mode of [undefined,'staged-v2']) {
      const response=await f.call('/api/admin/content','GET',undefined,{}, {CMS_PROCESSING_MODE:mode});
      assert.deepEqual(await response.json(),{version:0,draftRevision:null,publishedRevision:null,document:null});
      assert.equal((await f.call('/api/admin/content/save-jobs','POST',{}, {},{CMS_PROCESSING_MODE:mode})).status,404);
    }
    // Synthetic legacy owner row: deliberately unadmitted. The router may not bless or validate it.
    f.sql.prepare("INSERT INTO cms_revisions(version,document,kind,actor,created_at) VALUES(1,?,'draft','legacy','fixture')").run(JSON.stringify(smallSeed()));
    f.sql.exec('UPDATE cms_documents SET version=1,draft_revision=1');
    for(const path of ['/api/admin/content','/api/admin/content/revisions/1']) {
      const response=await f.call(path); assert.equal(response.status,409); assert.deepEqual(await response.json(),{error:'admission_required'});
    }
    assert.equal(f.validations(),0); assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM cms_revision_admissions').get().n,0);
  } finally { f.close(); }
});

test('server preparation, bounded advances and atomic commit use pinned catalog actor/config/version/mode', async()=>{
  const f=await fixture();
  try {
    await f.stage();
    for(const mode of ['publish','rollback']) {
      f.sql.exec("UPDATE cms_request_budgets SET reset_at=0"); // next durable window, not a router bypass
      const expectedVersion=mode==='publish'?1:2;
      const started=await f.call('/api/admin/content/preparations','POST',{expectedVersion,mode,...(mode==='rollback'?{revision:1}:{})});
      assert.equal(started.status,200,await started.clone().text());
      let progress=await started.json();
      const id=progress.id;
      assert.match(id,/^[a-f0-9]{32}$/);
      const bad=await f.call(`/api/admin/content/preparations/${id}/commit`,'POST',{expectedVersion:999,mode:'rollback',actor:'attacker',policy:'attacker'});
      assert.equal(bad.status,400,'commit never accepts client overrides');
      const foreign=await token({sub:'other'});
      const foreignCommit=await f.call(`/api/admin/content/preparations/${id}/commit`,'POST',{}, {'Cf-Access-Jwt-Assertion':foreign},{ACCESS_ALLOWED_SUBJECTS:'editor,other'});
      assert.equal(foreignCommit.status,409,'another valid editor cannot commit this catalog');
      const early=await f.call(`/api/admin/content/preparations/${id}/commit`,'POST',{});
      assert.equal(early.status,409,'building catalog cannot publish');
      for(let i=0;!progress.ready&&i<45;i++) {
        const response=await f.call(`/api/admin/content/preparations/${id}/advance`,'POST',{});
        assert.equal(response.status,200,await response.clone().text());
        progress=await response.json();
      }
      assert.equal(progress.ready,true);
      const drifted=await f.call(`/api/admin/content/preparations/${id}/commit`,'POST',{}, {},{CMS_RENDERER_ID:'changed-renderer'});
      assert.equal(drifted.status,409);
      const response=await f.call(`/api/admin/content/preparations/${id}/commit`,'POST',{});
      assert.equal(response.status,200,await response.clone().text());
      const result=await response.json();
      assert.deepEqual(result,{version:expectedVersion+1,draftRevision:expectedVersion+1,published:true});
      const revision=f.sql.prepare('SELECT kind,actor,source_revision FROM cms_revisions WHERE version=?').get(result.version);
      assert.deepEqual({...revision},{kind:mode,actor:'editor',source_revision:1});
      assert.equal(f.sql.prepare('SELECT catalog_id FROM cms_publications WHERE revision=?').get(result.version).catalog_id,id);
      assert.equal((await f.call(`/api/admin/content/preparations/${id}/commit`,'POST',{})).status,409);
      f.queries.length=0;
      const publicResponse=await f.call('/api/cms/document');
      assert.equal(publicResponse.status,200,await publicResponse.clone().text());
      assert.equal((await publicResponse.json()).version,result.version);
      assert.equal(f.queries.some(query=>/r\.document|public_json|plan_json/.test(query)),false,'public read uses only indexed artifact metadata');
      const head=await f.call('/api/cms/document','HEAD'); assert.equal(head.status,200); assert.equal(await head.text(),'');
      const wrongOrigin=await f.handler(new Request('https://untrusted.example.test/api/cms/document'),f.env);
      assert.equal(wrongOrigin.status,503);
      const missingConfig=await f.call('/api/cms/document','GET',undefined,{}, {CMS_ASSET_ID:undefined});
      assert.equal(missingConfig.status,503);
    }
    assert.equal(f.validations(),0);
  } finally { f.close(); }
});

test('staged public media uses active catalog scalars while private media stays JWT protected without parsing source', async()=>{
  const f=await fixture();
  try {
    const key='upload-12345678-1234-1234-1234-123456789abc.jpg';
    const privateKey='upload-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg';
    for(const name of [key,privateKey]) {const object=fixtureUpload(`/media/${name}`);f.objects.set(object.key,object);}
    const doc=smallSeed();
    doc.media=[{id:'visible-photo',src:`/media/${key}`,alt:{en:'Visible',fr:'Visible',es:'Visible'}}];
    doc.pages[0].seo.image={mediaId:'visible-photo',alt:{en:'Visible',fr:'Visible',es:'Visible'}};
    await f.stage(doc);
    const denied=await f.handler(new Request(`${ORIGIN}/api/admin/media/${privateKey}`),f.env);
    assert.equal(denied.status,401); assert.equal(f.reads(),0);
    const privateResponse=await f.call(`/api/admin/media/${privateKey}`); assert.equal(privateResponse.status,200); assert.equal(f.validations(),0);
    const beforeReads=f.reads();
    assert.equal((await f.call(`/media/${key}`)).status,404); assert.equal(f.reads(),beforeReads);
    const start=await f.call('/api/admin/content/preparations','POST',{expectedVersion:1,mode:'publish'});
    assert.equal(start.status,200,await start.clone().text());
    let progress=await start.json();
    for(let i=0;!progress.ready&&i<45;i++) {
      const response=await f.call(`/api/admin/content/preparations/${progress.id}/advance`,'POST',{});
      assert.equal(response.status,200,await response.clone().text()); progress=await response.json();
    }
    assert.equal(progress.ready,true);
    assert.equal((await f.call(`/api/admin/content/preparations/${progress.id}/commit`,'POST',{})).status,200);
    f.queries.length=0;
    const response=await f.handler(new Request(`${ORIGIN}/media/${key}`),f.env);
    assert.equal(response.status,200); assert.equal(response.headers.get('Content-Type'),'image/jpeg');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),f.objects.get(`uploads/${key}`).bytes);
    assert.ok(f.queries.some(query=>query.includes('cms_catalog_media')));
    assert.equal(f.queries.some(query=>/r\.document|public_json|plan_json/.test(query)),false);
    assert.equal((await f.call(`/media/${privateKey}`)).status,404);
    assert.equal((await f.call(`/media/${key}`,'GET',undefined,{}, {CMS_VALIDATION_POLICY:'changed-policy'})).status,404);
    const app=(await import('../worker/app.ts')).default;
    const served=await app.fetch(new Request(`${ORIGIN}/api/cms/document`),f.env);
    assert.equal(served.status,200); assert.equal((await served.json()).version,2);
    const publicCompatibility=await app.fetch(new Request(`${ORIGIN}/api/cms`),f.env);
    assert.equal(publicCompatibility.status,200); assert.ok((await publicCompatibility.json()).siteSettings);
    assert.equal(f.validations(),0);
  } finally { f.close(); }
});

test('app host keeps redirect and protected SPA but never clones published business HTML', async()=>{
  const f=await fixture();
  const {createAppHandler}=await import('../worker/app.ts');
  const app=createAppHandler({access:{now:()=>NOW*1000,fetch:async()=>Response.json({keys:[jwk]})}});
  try {
    const cold={...f.env,CMS_DB:{prepare(){assert.fail('unknown business paths must not query published artifacts');}}};
    for(const path of ['/en/home','/en/not-a-business-page','/sitemap.xml']) {
      const response=await app(new Request(`${ORIGIN}${path}`),cold);
      assert.equal(response.status,404,path); assert.match(response.headers.get('X-Robots-Tag'),/noindex/);
    }
    assert.equal((await app(new Request(ORIGIN+'/'),cold)).status,302);
    assert.equal((await app(new Request(ORIGIN+'/admin'),cold)).status,401);
    assert.equal((await app(new Request(ORIGIN+'/admin',{headers:{'Cf-Access-Jwt-Assertion':f.jwt}}),cold)).status,200);
  } finally {f.close();}
});

test('staged method gates and safe provider errors never expose internals or consume body on denial', async()=>{
  const f=await fixture();
  try {
    for(const path of ['/api/admin/content/save-jobs',`/api/admin/content/preparations/${'a'.repeat(32)}/advance`]) {
      const response=await f.call(path);
      assert.equal(response.status,405); assert.equal(response.headers.get('Allow'),'POST');
    }
    assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM cms_request_budgets WHERE actor='editor'").get().n,0);
    const broken={prepare(){throw new Error('PRIVATE PROVIDER URL/TOKEN/STACK');},async batch(){throw new Error('PRIVATE PROVIDER URL/TOKEN/STACK');}};
    for(const path of ['/api/admin/content','/api/cms/document']) {
      const response=await f.call(path,'GET',undefined,{}, {CMS_DB:broken});
      assert.equal(response.status,503); assert.equal((await response.text()).includes('PRIVATE'),false);
    }
    for(const [body,status] of [[{expectedVersion:0,manifest:[],actor:'attacker'},400],[{expectedVersion:0,manifest:[]},400],[{expectedVersion:0,mode:'publish',revision:1},400],[{expectedVersion:0,mode:'rollback'},400]]) {
      const path='manifest' in body?'/api/admin/content/save-jobs':'/api/admin/content/preparations';
      assert.equal((await f.call(path,'POST',body)).status,status);
    }
    for(const bindings of [
      {CMS_MEDIA:{put:f.bucket.put,get:f.bucket.get}},
      {CMS_MEDIA:{head:f.bucket.head,get:f.bucket.get}},
      {ASSETS:{}},
    ]) {
      const missingCapability=await f.call('/api/admin/content/preparations','POST',{expectedVersion:0,mode:'publish'}, {},bindings);
      assert.equal(missingCapability.status,503);
    }
    assert.equal((await f.call('/api/admin/content/save-jobs','POST',{}, {},{CMS_DB:undefined})).status,503);
  } finally { f.close(); }
});

test('staged raw content exposes processing metadata without calling the full-document validator', async()=>{
  const f=await fixture();
  try {
    const response=await f.call('/api/admin/content');
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{processing:'staged-v1',version:0,draftRevision:null,publishedRevision:null,document:null});
    assert.equal(f.validations(),0);
  } finally { f.close(); }
});
