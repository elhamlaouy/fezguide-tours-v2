import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { register } from 'tsx/esm/api';
register();

async function fixture({published=true,admitted=true,contentType='text/html; charset=utf-8'}={}) {
  const { preparedPublicResponse }=await import('../worker/prepared-public.ts');
  const sql=new DatabaseSync(':memory:');
  for(const name of ['0001_cms.sql','0002_media_budget.sql','0003_cms_release_safeguards.sql','0004_cms_prepared_publications.sql','0005_cms_recovery.sql','0006_cms_first_catalog_bootstrap.sql','0007_cms_catalog_refreshes.sql']) sql.exec(readFileSync(new URL(`../migrations/${name}`,import.meta.url),'utf8'));
  const id='b'.repeat(32), sourceDigest='a'.repeat(64), body='<main>prepared public page</main>';
  const bytes=new TextEncoder().encode(body), checksum=await crypto.subtle.digest('SHA-256',bytes), digest=Buffer.from(checksum).toString('hex');
  const raw='{"fixture":"admitted immutable document"}';
  sql.prepare("INSERT INTO cms_revisions(version,document,kind,actor,created_at) VALUES (1,?,'draft','fixture','2026-10-20T00:00:00Z')").run(raw);
  sql.prepare('INSERT INTO cms_revision_admissions(revision,policy,digest,document_bytes,manifest) VALUES (1,?,?,?,?)').run('policy',sourceDigest,Buffer.byteLength(raw),'[]');
  sql.prepare(`INSERT INTO cms_artifact_catalogs(id,actor,expected_version,target_revision,source_revision,source_digest,policy,renderer,assets,origin,state,expected_entries,expires_at)
    VALUES (?,'fixture',1,2,1,?,'policy','renderer','assets','https://fezguidetours.com','building',4,4102444800)`).run(id,sourceDigest);
  for(const path of ['/', '@404:en','@404:fr','/api/cms/document']) {
    sql.prepare(`INSERT INTO cms_artifact_entries(catalog_id,path,object_key,etag,object_version,digest,bytes,content_type,status) VALUES (?,?,?,?,?,?,?,?,?)`).run(id,path,`prepared/v1/${id}/${encodeURIComponent(path)}`,'etag','version',digest,bytes.byteLength,contentType,path.startsWith('@')?404:200);
  }
  for(const lang of ['en','fr']) {
    sql.prepare('INSERT INTO cms_catalog_routes(catalog_id,route_key,canonical_path) VALUES (?,?,?)').run(id,`query:${lang}:home`,'/');
    sql.prepare('INSERT INTO cms_catalog_routes(catalog_id,route_key,canonical_path) VALUES (?,?,?)').run(id,`path:${lang}:home`,'/');
  }
  sql.prepare("UPDATE cms_artifact_catalogs SET state='ready' WHERE id=?").run(id);
  sql.prepare("INSERT INTO cms_revisions(version,document,kind,actor,created_at,source_revision) VALUES (2,?,'publish','fixture','2026-10-20T00:00:00Z',1)").run(raw);
  sql.prepare('INSERT INTO cms_publications(revision,catalog_id) VALUES (2,?)').run(id);
  if(admitted)sql.prepare('INSERT INTO cms_revision_admissions(revision,policy,digest,document_bytes,manifest) VALUES (2,?,?,?,?)').run('policy',sourceDigest,Buffer.byteLength(raw),'[]');
  if(published)sql.prepare("UPDATE cms_artifact_catalogs SET state='published' WHERE id=?").run(id);
  sql.exec('UPDATE cms_documents SET version=2,draft_revision=2,published_revision=2');
  const calls={db:0,get:0,consumed:0};
  let tamper={};
  const statement=(query,args=[])=>({bind(...values){return statement(query,values);}, async first(){calls.db++;return sql.prepare(query).get(...args)??null;}});
  const env={CMS_DB:{prepare:statement},CMS_MEDIA:{async get(key,options){
    calls.get++;
    assert.equal(options.onlyIf.etagMatches,'etag');
    return { key,etag:'etag',version:'version',size:bytes.byteLength,checksums:{sha256:checksum},httpMetadata:{contentType},
      body:new ReadableStream({pull(controller){calls.consumed++;controller.enqueue(bytes);controller.close();}}, {highWaterMark:0}),...tamper};
  }},CMS_VALIDATION_POLICY:'policy',CMS_RENDERER_ID:'renderer',CMS_ASSET_ID:'assets',CANONICAL_ORIGIN:'https://fezguidetours.com',CMS_PUBLIC_DELIVERY_ORIGIN:'https://fezguidetours.com'};
  return {sql,env,calls,body,serve:(path='/',method='GET')=>preparedPublicResponse(new Request(`https://fezguidetours.com${path}`,{method}),env),tamper(value){tamper=value;},close(){sql.close();}};
}

test('actual SQL point lookup streams current prepared bytes without consuming the body first',async()=>{
  const f=await fixture();try {
    const r=await f.serve();assert.equal(r.status,200);assert.equal(f.calls.db,1);assert.equal(f.calls.get,1);assert.equal(f.calls.consumed,0);
    assert.equal(await r.text(),f.body);
  }finally{f.close();}
});

test('unknown paths select a prepared localized404 and aliases preserve non-routing query values',async()=>{
  const f=await fixture();try {
    assert.equal((await f.serve('/fr/unknown')).status,404);
    const alias=await f.serve('/home?utm_source=test&page=ignored');
    assert.equal(alias.status,308);assert.equal(alias.headers.get('Location'),'/?utm_source=test');
  }finally{f.close();}
});

test('native storage identity mismatches fail closed before body delivery',async()=>{
  for(const value of [{etag:'other'},{version:'other'},{size:1},{key:'uploads/private.webp'},{checksums:{}},{httpMetadata:{contentType:'image/png'}}]) {
    const f=await fixture();try {f.tamper(value);const r=await f.serve();assert.equal(r.status,503);assert.equal(await r.text(),'Published content is unavailable');}finally{f.close();}
  }
});

test('wrong deployment policy never reads a private source document',async()=>{
  for(const field of ['CMS_VALIDATION_POLICY','CMS_RENDERER_ID','CMS_ASSET_ID','CANONICAL_ORIGIN']){
    const f=await fixture();try{f.env[field]='other';assert.equal((await f.serve()).status,503);assert.equal(f.calls.get,0);}finally{f.close();}
  }
});

test('only a fully committed publication with matching target admission is served',async()=>{
  for(const options of [{published:false},{admitted:false}]) {
    const f=await fixture(options);try{assert.equal((await f.serve()).status,503);assert.equal(f.calls.get,0);}finally{f.close();}
  }
});

test('artifact MIME is bound to the requested endpoint, not merely an allowed MIME',async()=>{
  const json=await fixture({contentType:'application/json; charset=utf-8'});
  try{assert.equal((await json.serve('/')).status,503);}finally{json.close();}
  const html=await fixture();
  try{assert.equal((await html.serve('/api/cms/document')).status,503);}finally{html.close();}
});

test('HEAD verifies stored identity but does not consume an object body',async()=>{
  const f=await fixture();try{
    const response=await f.serve('/','HEAD');assert.equal(response.status,200);assert.equal(await response.text(),'');assert.equal(f.calls.consumed,0);
    assert.equal(Number(response.headers.get('Content-Length')),Buffer.byteLength(f.body));
  }finally{f.close();}
});

test('missing objects, database errors, wrong delivery origins and unsupported methods fail closed',async()=>{
  const f=await fixture();try{
    f.tamper({body:null});assert.equal((await f.serve()).status,503);
    const count=f.calls.db;assert.equal((await f.serve('/','POST')).status,405);assert.equal(f.calls.db,count);
    f.env.CMS_PUBLIC_DELIVERY_ORIGIN='https://other.example';assert.equal((await f.serve()).status,503);assert.equal(f.calls.db,count);
    f.env.CMS_PUBLIC_DELIVERY_ORIGIN='https://fezguidetours.com';f.env.CMS_DB.prepare=()=>{throw new Error('private database detail');};
    const outage=await f.serve();assert.equal(outage.status,503);assert.equal(await outage.text(),'Published content is unavailable');
  }finally{f.close();}
});
