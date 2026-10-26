import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {register} from 'tsx/esm/api';register();
const {createCmsHandler}=await import('../worker/cms-routes.ts');
const {createCmsSeed}=await import('../src/cms/seed.ts');
const hash=x=>createHash('sha256').update(x).digest('hex');
const origin='https://recovery.test',now=Math.floor(Date.now()/1000),issuer='https://recovery.cloudflareaccess.com';
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'recovery',alg:'RS256'};
async function jwt(sub='owner'){const b=x=>Buffer.from(JSON.stringify(x)).toString('base64url'),data=b({alg:'RS256',kid:jwk.kid})+'.'+b({iss:issuer,aud:['recovery'],sub,exp:now+3600});return data+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(data))).toString('base64url');}
async function fixture(){const sql=new DatabaseSync(':memory:');for(const name of ['0001_cms.sql','0002_media_budget.sql','0003_cms_release_safeguards.sql','0004_cms_prepared_publications.sql'])sql.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
 const migration=new URL('../migrations/0005_cms_recovery.sql',import.meta.url);if(existsSync(migration))sql.exec(readFileSync(migration,'utf8'));
 sql.exec(readFileSync(new URL('../migrations/0006_cms_first_catalog_bootstrap.sql',import.meta.url),'utf8'));
 sql.exec(readFileSync(new URL('../migrations/0007_cms_catalog_refreshes.sql',import.meta.url),'utf8'));
 const queries=[];const statement=(q,p=[])=>({bind:(...a)=>statement(q,a),async first(){queries.push(q);return sql.prepare(q).get(...p)??null;},async all(){queries.push(q);return{success:true,results:sql.prepare(q).all(...p)};},async run(){queries.push(q);if(/^\s*(SELECT|WITH)/i.test(q))return{success:true,results:sql.prepare(q).all(...p)};return{success:true,meta:{changes:Number(sql.prepare(q).run(...p).changes)}};}});
 const db={prepare:statement,async batch(list){sql.exec('BEGIN');try{const result=[];for(const s of list)result.push(await s.run());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 const objects=new Map(),bucket={async list({prefix='',limit=16,cursor}){const a=[...objects.values()].filter(o=>o.key.startsWith(prefix)),offset=Number(cursor??0);return{objects:a.slice(offset,offset+limit),truncated:offset+limit<a.length,...(offset+limit<a.length?{cursor:String(offset+limit)}:{})};},async head(key){return objects.get(key)??null;},async get(key){const o=objects.get(key);return o?{...o,body:new Blob([o.bytes]).stream()}:null;}};
 const handler=createCmsHandler({validateDocument(){throw Error('whole-document Worker validator forbidden');},access:{fetch:async()=>Response.json({keys:[jwk]})}});
 const env={CMS_DB:db,CMS_MEDIA:bucket,CMS_PROCESSING_MODE:'staged-v1',CMS_VALIDATION_POLICY:'recovery-policy',CANONICAL_ORIGIN:origin,ACCESS_TEAM_DOMAIN:'recovery.cloudflareaccess.com',ACCESS_AUD:'recovery',ACCESS_ALLOWED_SUBJECTS:'owner,peer'};
 const call=async(path,method='GET',body,sub='owner',headers={})=>handler(new Request(origin+path,{method,headers:{...(sub?{'Cf-Access-Jwt-Assertion':await jwt(sub)}:{}),...(!['GET','HEAD'].includes(method)?{Origin:origin,'Content-Type':'application/json'}:{}),...headers},...(body===undefined?{}:{body:body instanceof Blob?body:JSON.stringify(body)})}),env);
 const doc=createCmsSeed(),raw=JSON.stringify(doc,null,2)+'\n';sql.prepare("INSERT INTO cms_revisions VALUES(1,?,'draft','original','unchanged-time',NULL)").run(raw);sql.exec('UPDATE cms_documents SET version=1,draft_revision=1 WHERE id=1');
 return{sql,db,bucket,objects,env,call,doc,raw,queries};}
test('hosted authenticated backup returns one exact raw revision without whole-document validation',async()=>{const f=await fixture();try{
 assert.equal((await f.call('/api/admin/recovery/backup','GET',undefined,null)).status,401);
 const manifest=await f.call('/api/admin/recovery/backup');assert.equal(manifest.status,200,await manifest.clone().text());const meta=await manifest.json();assert.equal(meta.format,'fez-cms-portable-v2');assert.equal(meta.version,1);
 const response=await f.call('/api/admin/recovery/backup?revision=1&version=1');assert.equal(response.status,200);assert.equal(await response.text(),f.raw);assert.equal(response.headers.get('Cache-Control'),'no-store');
}finally{f.sql.close();}});
test('durable hosted restore resumes admitted parts and appends privately exactly once',async()=>{const f=await fixture();try{
 const doc=structuredClone(f.doc),{splitCmsDocument}=await import('../src/cms/document-parts.ts');for(const [k,v]of Object.entries(doc))if(Array.isArray(v))doc[k]=[];for(const[k,v]of Object.entries(doc.legacy))if(Array.isArray(v))doc.legacy[k]=[];doc.pages=[{...f.doc.pages.find(p=>p.id==='home'),sections:[]}];doc.footer.links=[];doc.uiCopy={};
 const parts=splitCmsDocument(doc),manifest=parts.map(({value,...m})=>({...m,digest:hash(JSON.stringify(value))}));
 const intent={expectedVersion:1,archiveDigest:'a'.repeat(64),revisionDigest:hash(f.raw)};
 const start=await f.call('/api/admin/recovery/restore','POST',intent);assert.equal(start.status,200,await start.clone().text());const job=await start.json();
 assert.equal((await f.call('/api/admin/recovery/restore/'+job.id,'GET',undefined,'peer')).status,409);
 const declaration=await f.call(`/api/admin/recovery/restore/${job.id}/manifest`,'POST',{manifest});assert.equal(declaration.status,200,await declaration.clone().text());
 assert.equal((await f.call(`/api/admin/recovery/restore/${job.id}/part`,'POST',{part:parts[0]})).status,200);
 const resumed=await f.call('/api/admin/recovery/restore','POST',intent);assert.equal((await resumed.json()).id,job.id);
 const missing=await (await f.call(`/api/admin/recovery/restore/${job.id}/manifest`,'POST',{manifest})).json();assert.equal(missing.missing.includes(0),false);
 for(const offset of missing.missing)assert.equal((await f.call(`/api/admin/recovery/restore/${job.id}/part`,'POST',{part:parts[offset]})).status,200);
 let ready;for(let n=0;n<parts.length+2;n++){const r=await f.call(`/api/admin/recovery/restore/${job.id}/advance`,'POST',{});assert.equal(r.status,200,await r.clone().text());ready=await r.json();if(ready.ready)break;}
 assert.equal(ready.ready,true);const committed=await f.call(`/api/admin/recovery/restore/${job.id}/commit`,'POST',{});assert.equal(committed.status,200,await committed.clone().text());assert.deepEqual(await committed.json(),{version:2,draftRevision:2,published:false});
 assert.equal(f.sql.prepare('SELECT published_revision FROM cms_documents').get().published_revision,null);assert.equal(f.sql.prepare('SELECT document FROM cms_revisions WHERE version=1').get().document,f.raw);
 const recovered=await (await f.call('/api/admin/recovery/restore','POST',intent)).json();assert.equal(recovered.result.version,2);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n,2);
}finally{f.sql.close();}});
test('expired recovery starts a fresh intent without reviving an expired lease',async()=>{const f=await fixture();try{const intent={expectedVersion:1,archiveDigest:'b'.repeat(64),revisionDigest:hash(f.raw)};const first=await(await f.call('/api/admin/recovery/restore','POST',intent)).json();f.sql.prepare('UPDATE cms_restore_jobs SET expires_at=0 WHERE id=?').run(first.id);const response=await f.call('/api/admin/recovery/restore','POST',intent);assert.equal(response.status,200,await response.clone().text());assert.notEqual((await response.json()).id,first.id);assert.equal(f.sql.prepare('SELECT state FROM cms_restore_jobs WHERE id=?').get(first.id).state,'expired');}finally{f.sql.close();}});
test('orphan inspection checks all immutable history in bounded requests and never deletes an object',async()=>{const f=await fixture();try{
 const key='upload-11111111-1111-4111-8111-111111111111.webp',bytes=new Uint8Array([1,2,3]);f.objects.set('uploads/'+key,{key:'uploads/'+key,etag:'e',version:'v',size:3,bytes,uploaded:new Date(0),httpMetadata:{contentType:'image/webp'},customMetadata:{uploadedAt:new Date(0).toISOString()}});
 const first=await f.call('/api/admin/recovery/orphans');assert.equal(first.status,200);const listing=await first.json(),fence=listing.fence,before=f.sql.prepare('SELECT document FROM cms_revisions').get().document;
 f.queries.length=0;const check=await f.call('/api/admin/recovery/orphans?'+new URLSearchParams({key:'uploads/'+key,fence}));assert.equal(check.status,200,await check.clone().text());const report=await check.json();assert.equal(report.complete,true);assert.equal(report.protected,false);assert.equal(report.deleted,0);assert.ok(f.queries.length<=8,`orphan check issued ${f.queries.length} statements`);assert.equal(f.objects.size,1);assert.equal(f.sql.prepare('SELECT document FROM cms_revisions').get().document,before);
}finally{f.sql.close();}});
test('hosted photo restore verifies bytes, writes a new private object and retains it as protected history',async()=>{const f=await fixture();try{
 const {fixtureUpload}=await import('./fixtures/cms-upload.mjs'),source='upload-44444444-4444-4444-8444-444444444444.webp',image=fixtureUpload('/media/'+source),bytes=new Uint8Array(image.bytes);
 f.bucket.put=async(key,value,options)=>{const content=new Uint8Array(value),digest=createHash('sha256').update(content).digest('hex'),version='restored-generation';f.objects.set(key,{key,bytes:content,size:content.length,etag:digest,version,uploaded:new Date(),httpMetadata:options.httpMetadata,customMetadata:options.customMetadata,checksums:{sha256:Uint8Array.from(Buffer.from(digest,'hex')).buffer}});};
 f.env.CMS_IMAGES={input:stream=>({output:async({format})=>{const original=new Uint8Array(await new Response(stream).arrayBuffer());return{response:()=>new Response(original,{headers:{'Content-Type':format}})};}})};
 const intent={expectedVersion:1,archiveDigest:'e'.repeat(64),revisionDigest:hash(f.raw)},start=await f.call('/api/admin/recovery/restore','POST',intent),id=(await start.json()).id;
 const headers={'Content-Type':'image/webp','X-CMS-Backup-Key':source,'X-CMS-Backup-SHA256':createHash('sha256').update(bytes).digest('hex')};const uploaded=await f.call(`/api/admin/recovery/restore/${id}/media`,'POST',new Blob([bytes],{type:'image/webp'}),'owner',headers);assert.equal(uploaded.status,200,await uploaded.clone().text());const {src}=await uploaded.json();assert.match(src,/^\/media\/upload-/);const repeat=await f.call(`/api/admin/recovery/restore/${id}/media`,'POST',new Blob([bytes],{type:'image/webp'}),'owner',headers);assert.deepEqual(await repeat.json(),{src});assert.equal(f.objects.size,1);assert.deepEqual([...f.objects.values()][0].bytes,bytes);
 f.sql.prepare("UPDATE cms_restore_jobs SET state='expired' WHERE id=?").run(id);const listing=await(await f.call('/api/admin/recovery/orphans')).json(),key='uploads/'+src.slice(7),check=await f.call('/api/admin/recovery/orphans?'+new URLSearchParams({key,fence:listing.fence}));assert.equal(check.status,200,await check.clone().text());assert.equal((await check.json()).protected,true);assert.equal(f.sql.prepare('SELECT document FROM cms_revisions WHERE version=1').get().document,f.raw);
}finally{f.sql.close();}});
test('hosted photo backup pins object generation and exports verified exact bytes',async()=>{const f=await fixture();try{
 const {fixtureUpload}=await import('./fixtures/cms-upload.mjs'),src='/media/upload-33333333-3333-4333-8333-333333333333.webp',object=fixtureUpload(src);object.uploaded=new Date('2026-10-21T00:00:00.000Z');f.objects.set(object.key,object);
 const inventory=await f.call('/api/admin/recovery/backup?inventory=1');assert.equal(inventory.status,200,await inventory.clone().text());const item=(await inventory.json()).objects[0];assert.equal(item.key,src.slice(7));assert.equal(item.generation,object.version);
 const response=await f.call('/api/admin/recovery/backup?'+new URLSearchParams({key:item.key,etag:item.etag,generation:item.generation}));assert.equal(response.status,200,await response.clone().text());assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[...object.bytes]);
 const changed=await f.call('/api/admin/recovery/backup?'+new URLSearchParams({key:item.key,etag:'wrong',generation:item.generation}));assert.equal(changed.status,409);
}finally{f.sql.close();}});
