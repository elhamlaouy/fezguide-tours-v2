import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { register } from 'tsx/esm/api';
register();
const root = new URL('../', import.meta.url);
const parse = file => JSON.parse(execFileSync('python3', ['-c', 'import json,sys,tomllib; print(json.dumps(tomllib.load(open(sys.argv[1],"rb"))))', fileURLToPath(new URL(file, root))], {encoding:'utf8'}));
const app=parse('wrangler.cms-live-app.toml'), pre=parse('wrangler.cms-live-preflight.toml'), pub=parse('wrangler.cms-live-public.toml');
const candidate=parse('wrangler.cms-candidate-app.toml');
const apex='https://fezguidetours.com', delivery='https://fezguidetours-cms-live-public.elhamlaouy.workers.dev';
const identities={CMS_VALIDATION_POLICY:'2921387c583aa835a808a3aeb3b969b6511b7b425dfeacca09b5cd474489f9ab',CMS_RENDERER_ID:'f9e780d5c93c76e5c96eee2fce233c305c3c6ae41b05b6c55e94692d558270e4',CMS_ASSET_ID:'14dd50bec26e04b1d39adf98649ab1e4d2a46778903ee375dccb8f645e190452',CMS_SHELL_ID:'c8aed5247dcdf9edebc366a786d56afa97b1d3cfd5476fcfa34ee20b8bd61230'};
test('live storage, entrypoints, aliases and canonical identities are explicit and isolated',()=>{
 for(const [config,main,dev] of [[app,'worker/app.ts',false],[pre,'worker/candidate-public.ts',true],[pub,'worker/index.ts',false]]){
  assert.equal(config.main,main);assert.equal(config.workers_dev,dev);assert.equal(config.preview_urls,false);
  assert.equal(config.name,config===app?'fezguidetours-cms-candidate-app':'fezguidetours-cms-live-public');
  assert.equal(config.account_id,'417f3820605485ace5bdbb9576452f42');assert.equal(config.compatibility_date,'2026-10-01');
  for(const key of ['route','env','previews','kv_namespaces','services','durable_objects'])assert.equal(config[key],undefined,key);
  assert.deepEqual(config.routes,config===app?[{pattern:'app.fezguidetours.com',custom_domain:true}]:undefined);
  assert.deepEqual(config.d1_databases,[{binding:'CMS_DB',database_name:'fezguidetours-cms-live-20261025',database_id:'90a8da61-ad2d-45a0-a9aa-483f337efc18',migrations_dir:'migrations'}]);
  assert.deepEqual(config.r2_buckets,[{binding:'CMS_MEDIA',bucket_name:'fezguidetours-cms-live-media-20261025'}]);
  assert.deepEqual(config.images,{binding:'CMS_IMAGES'});
  assert.deepEqual(config.assets,{...candidate.assets,not_found_handling:config===app?'single-page-application':'none'});
  assert.equal(config.vars.CANONICAL_ORIGIN,apex);assert.equal(config.vars.CMS_PUBLIC_DELIVERY_ORIGIN,config===pub?apex:delivery);
  assert.equal(config.vars.CMS_PROCESSING_MODE,'staged-v1');assert.equal(config.vars.CMS_PREPARATION_MODE,undefined);
  for(const [key,value] of Object.entries(identities)){assert.equal(config.vars[key],value);assert.equal(candidate.vars[key],value);}
 }
 for(const file of ['wrangler.toml','wrangler.cms-preview.toml','wrangler.cms-local.toml','wrangler.cms-candidate-app.toml','wrangler.cms-candidate-public.toml']){
  const old=parse(file);for(const cfg of [old,old.previews].filter(Boolean)){
   for(const db of cfg.d1_databases??[])assert.notEqual(db.database_id,app.d1_databases[0].database_id);
   for(const bucket of cfg.r2_buckets??[])assert.notEqual(bucket.bucket_name,app.r2_buckets[0].bucket_name);
   for(const limiter of cfg.ratelimits??[])assert.notEqual(limiter.namespace_id,'1866884045');
  }
 }
});
test('protected editor Access is exact; public has no Access or alternate editor aliases',()=>{
 for(const [key,value] of Object.entries({ACCESS_TEAM_DOMAIN:'delicate-forest-c939.cloudflareaccess.com',ACCESS_AUD:'fd4ff16b847e4719028d2c3f43834df2034356c623d3e9f8a210e8592b365ce6',ACCESS_ALLOWED_EMAILS:'elhamlaouy@gmail.com,fezguidetours1@gmail.com'})){assert.equal(app.vars[key],value);assert.equal(app.vars[key],candidate.vars[key]);}
 assert.deepEqual(Object.keys(app.vars).filter(k=>k.startsWith('ACCESS_')).sort(),['ACCESS_ALLOWED_EMAILS','ACCESS_AUD','ACCESS_TEAM_DOMAIN']);
 for(const config of [pre,pub]){
  assert.deepEqual(Object.keys(config.vars).filter(k=>k.startsWith('ACCESS_')),[]);
  assert.equal(config.vars.CMS_PUBLIC_RATE_LIMIT_REQUIRED,'true');
  assert.deepEqual(config.ratelimits,[{name:'CMS_PUBLIC_RATE_LIMITER',namespace_id:'1866884045',simple:{limit:600,period:60}}]);
 }
 assert.equal(app.ratelimits,undefined);assert.equal(app.vars.CMS_PUBLIC_RATE_LIMIT_REQUIRED,undefined);
});
test('real entrypoints enforce preflight/editor noindex without forcing final noindex',async()=>{
 for(const [config,noindex] of [[pre,true],[pub,false],[app,true]]){
  const handler=(await import(new URL(config.main,root))).default;
  const response=await handler.fetch(new Request((config===pub?apex:config===app?'https://app.fezguidetours.com':delivery)+'/'),{...config.vars});
  assert.equal(response.status,config===app?302:503);
  if(config===app)assert.equal(response.headers.get('Location'),'/admin');
  assert.equal(response.headers.get('X-Robots-Tag'),noindex?'noindex, nofollow':null);
 }
});

import { DatabaseSync } from 'node:sqlite';
async function fixture({published=true,admitted=true,contentType='text/html; charset=utf-8'}={}) {
  const { preparedPublicResponse }=await import('../worker/prepared-public.ts');
  const sql=new DatabaseSync(':memory:');
  for(const name of ['0001_cms.sql','0002_media_budget.sql','0003_cms_release_safeguards.sql','0004_cms_prepared_publications.sql','0005_cms_recovery.sql','0006_cms_first_catalog_bootstrap.sql']) sql.exec(readFileSync(new URL(`../migrations/${name}`,import.meta.url),'utf8'));
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

test('same sealed SQL catalog survives canonical-apex preflight delivery then final-apex delivery',async()=>{
 const f=await fixture();
 const {preparedPublicResponse}=await import('../worker/prepared-public.ts');
 try{
  const before=f.sql.prepare('SELECT * FROM cms_artifact_catalogs').all();
  for(const origin of [delivery,apex]){
   f.env.CMS_PUBLIC_DELIVERY_ORIGIN=origin;
   const response=await preparedPublicResponse(new Request(origin+'/'),f.env);
   assert.equal(response.status,200);assert.equal(await response.text(),f.body);
   const alias=await preparedPublicResponse(new Request(origin+'/home?utm_source=live'),f.env);
   assert.equal(alias.status,308);assert.equal(alias.headers.get('Location'),'/?utm_source=live');
  }
  assert.deepEqual(f.sql.prepare('SELECT * FROM cms_artifact_catalogs').all(),before);
  f.tamper({version:'wrong'});
  assert.equal((await preparedPublicResponse(new Request(apex+'/'),f.env)).status,503,'read metadata mismatch fails closed');
 }finally{f.close();}
});
