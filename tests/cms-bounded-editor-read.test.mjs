import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {register} from 'tsx/esm/api';
register();
const {StagedCmsStore}=await import('../worker/cms-staged-store.ts');
const hash=x=>createHash('sha256').update(x).digest('hex');
function fixture(){
 const sql=new DatabaseSync(':memory:');
 for(const name of ['0001_cms.sql','0002_media_budget.sql','0003_cms_release_safeguards.sql','0004_cms_prepared_publications.sql','0005_cms_recovery.sql','0006_cms_first_catalog_bootstrap.sql','0007_cms_catalog_refreshes.sql'])sql.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
 const rows=[],queries=[];
 const stmt=(q,v=[])=>({bind:(...v)=>stmt(q,v),async first(){queries.push(q);const r=sql.prepare(q).get(...v)??null;rows.push(r);return r;}});
 const db={prepare:stmt};
 const store=new StagedCmsStore(db,'bounded-policy');
 const raw=JSON.stringify({text:'a'.repeat(32755)+'🌍é漢'.repeat(10000)});
 sql.prepare("INSERT INTO cms_revisions VALUES(1,?,'draft','actor','created',NULL)").run(raw);
 sql.prepare('INSERT INTO cms_revision_admissions VALUES(1,?,?,?,?)').run('bounded-policy',hash(raw),Buffer.byteLength(raw),'[]');
 sql.exec('UPDATE cms_documents SET version=1,draft_revision=1');
 return{sql,db,rows,queries,store,raw};
}
test('empty CMS returns null without chunks and historical reads require admission and actual source length',async()=>{
 const f=fixture();try{
 const meta=new URLSearchParams('read=meta');
 f.sql.exec('UPDATE cms_documents SET version=0,draft_revision=NULL,published_revision=NULL');
 const m=await(await f.store.readBounded(meta)).json();assert.equal(m.bytes,0);assert.equal(m.digest,null);assert.equal(m.revision,null);
 await assert.rejects(f.store.readBounded(new URLSearchParams({read:'slice',pin:m.pin,part:'1'})),e=>e.code==='invalid_read');
 assert.deepEqual(await(await f.store.readBounded(new URLSearchParams({read:'verify',pin:m.pin}))).json(),m);
 await assert.rejects(new StagedCmsStore(f.db,'wrong-policy').readBounded(meta,1),e=>e.code==='admission_required');
 f.sql.exec('DROP TRIGGER cms_admission_immutable_update');
 f.sql.exec('UPDATE cms_revision_admissions SET document_bytes=document_bytes+1');
 await assert.rejects(f.store.readBounded(meta,1),e=>e.code==='admission_required');
 }finally{f.sql.close();}
});

test('admission identity drift is detected by an old pin even for equal-length bytes',async()=>{
 const f=fixture();try{
 const m=await(await f.store.readBounded(new URLSearchParams('read=meta'))).json();
 // Adversarial schema bypass: ordinary API SQL cannot mutate either immutable row.
 f.sql.exec('DROP TRIGGER cms_admission_immutable_update');
 f.sql.prepare('UPDATE cms_revision_admissions SET digest=?').run(hash('changed'));
 await assert.rejects(f.store.readBounded(new URLSearchParams({read:'verify',pin:m.pin})),e=>e.code==='read_conflict');
 await assert.rejects(f.store.readBounded(new URLSearchParams({read:'slice',pin:m.pin,part:'1'})),e=>e.code==='read_conflict');
 }finally{f.sql.close();}
});

test('immutable migrations protect admission identity without returning manifests',()=>{
 const f=fixture();try{
 for(const q of ["UPDATE cms_revision_admissions SET manifest='[{}]'",'DELETE FROM cms_revision_admissions',"UPDATE cms_revisions SET document='{}'",'DELETE FROM cms_revisions'])assert.throws(()=>f.sql.exec(q),/immutable/);
 }finally{f.sql.close();}
});

test('strict queries reject unknown, duplicate, missing, zero, negative, overflow and invalid pin before SQL',async()=>{
 const f=fixture();try{
 for(const query of ['read=meta&x=1','read=meta&read=meta','read=no','read=slice','read=verify&pin=ABC','read=meta&pin='+hash('x'),...['0','-1','01','1.0','1e1','63','9007199254740993'].map(part=>'read=slice&pin='+hash('x')+'&part='+part),'read=slice&pin='+hash('x')+'&part=1&part=1']){
 const count=f.queries.length;await assert.rejects(f.store.readBounded(new URLSearchParams(query)),e=>e.code==='invalid_read');assert.equal(f.queries.length,count,query);
 }
 }finally{f.sql.close();}
});

test('current pin detects every pointer change while historical metadata stays independent',async()=>{
 const f=fixture();try{
 const params=new URLSearchParams('read=meta');
 const m=await(await f.store.readBounded(params)).json(),h=await(await f.store.readBounded(params,1)).json();
 assert.equal(h.createdAt,'created');assert.equal(h.sourceRevision,null);assert.equal(h.kind,'draft');assert.equal('draftRevision' in h,false);
 for(const change of ['version=2','published_revision=1','draft_revision=NULL']){
 f.sql.exec('UPDATE cms_documents SET '+change);
 for(const read of ['verify','slice'])await assert.rejects(f.store.readBounded(new URLSearchParams({read,pin:m.pin,...(read==='slice'?{part:'1'}:{})})),e=>['read_conflict','admission_required'].includes(e.code));
 assert.deepEqual(await(await f.store.readBounded(new URLSearchParams({read:'verify',pin:h.pin}),1)).json(),h);
 f.sql.exec('UPDATE cms_documents SET version=1,draft_revision=1,published_revision=NULL');
 }
 await assert.rejects(new StagedCmsStore(f.db,'other').readBounded(params),e=>e.code==='admission_required');
 await assert.rejects(f.store.readBounded(params,2),e=>e.code==='revision_not_found');
 }finally{f.sql.close();}
});

test('browser rejects impossible pointers before requesting any slices',async()=>{
 const {loadAdminContent}=await import('../src/admin/admin-api.ts');
 const original=globalThis.fetch;let calls=0;
 try{
 globalThis.fetch=async()=>{calls++;return Response.json({processing:'staged-v1',readProtocol:'bounded-v1',version:1,draftRevision:2,publishedRevision:null,revision:2,policy:'p',digest:hash('{}'),bytes:2,sliceBytes:32768,pin:hash('pin')});};
 await assert.rejects(loadAdminContent(),e=>e.code==='invalid_response');assert.equal(calls,1);
 }finally{globalThis.fetch=original;}
});

const api=await import('../src/admin/admin-api.ts');
test('read deadline rejects a late legacy response without accepting stale success',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 globalThis.fetch=async()=>{t.mock.timers.tick(180000);return Response.json({version:1,draftRevision:1,publishedRevision:null,document:{}});};
 await assert.rejects(api.loadAdminContent(),e=>e.status===408&&e.code==='read_timeout');
});

const originalFetch=globalThis.fetch;
test.afterEach(()=>{globalThis.fetch=originalFetch;});
function browserFixture(raw,change={}){
 const bytes=Buffer.isBuffer(raw)?raw:Buffer.from(raw),calls=[];
 const metadata={processing:'staged-v1',readProtocol:'bounded-v1',version:1,draftRevision:1,publishedRevision:null,revision:1,policy:'p',digest:hash(bytes),bytes:bytes.length,sliceBytes:32768,pin:hash('pin'),...change};
 globalThis.fetch=async(path,options)=>{
 calls.push({path,options});const query=new URL(path,'https://editor.test').searchParams;
 if(query.get('read')==='meta')return Response.json(metadata);
 if(query.get('read')==='verify')return Response.json(metadata);
 const offset=(Number(query.get('part'))-1)*32768;
 return new Response(bytes.subarray(offset,offset+32768),{headers:{'Content-Type':'application/octet-stream'}});
 };
 return{metadata,calls};
}
test('browser assembles Unicode boundary slices and verifies raw digest, with no preliminary full read',async()=>{
 const document={text:'a'.repeat(32755)+'🌍é漢'.repeat(10000)};
 const f=browserFixture(JSON.stringify(document));
 assert.deepEqual((await api.loadAdminContent()).document,document);
 assert.ok(f.calls[0].path.endsWith('?read=meta'));assert.ok(f.calls.at(-1).path.includes('read=verify'));
 for(const c of f.calls){assert.equal(c.options.credentials,'same-origin');assert.equal(c.options.cache,'no-store');assert.ok(c.options.signal);}
});
for(const change of [{bytes:2000001},{bytes:-1},{bytes:1.5},{sliceBytes:65536},{digest:'A'.repeat(64)},{pin:'bad'},{policy:''},{readProtocol:'unknown'},{document:{}},{publishedRevision:2}])test('browser refuses malformed metadata without fallback '+JSON.stringify(change),async()=>{
 const f=browserFixture('{}',change);await assert.rejects(api.loadAdminContent(),e=>e.code==='invalid_response');assert.equal(f.calls.length,1);
});
for(const status of [403,409,429,503])test('browser never downgrades denied bounded read '+status,async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({error:'denied'},{status});};
 await assert.rejects(api.loadAdminContent(),e=>e.status===status&&e.code==='denied');assert.equal(calls,1);
});
test('browser accepts legacy on the same opt-in response without a second full request',async()=>{
 let calls=0;globalThis.fetch=async(path)=>{calls++;assert.equal(path,'/api/admin/content?read=meta');return Response.json({version:1,draftRevision:1,publishedRevision:null,document:{legacy:true}});};
 assert.deepEqual((await api.loadAdminContent()).document,{legacy:true});assert.equal(calls,1);
});
for(const fault of ['digest','utf8','json','short','oversize','declared','final'])test('browser rejects '+fault+' without returning partial content or retrying',async()=>{
 const f=browserFixture(fault==='utf8'?Buffer.from([123,34,97,34,58,34,255,34,125]):fault==='json'?'not-json':'{}',fault==='digest'?{digest:hash('wrong')}:{});
 const fetch=globalThis.fetch;let cancelled=false;
 globalThis.fetch=async(path,options)=>{
 if(path.includes('read=verify')&&fault==='final')return Response.json({...f.metadata,publishedRevision:1});
 if(path.includes('read=slice')){
 if(fault==='short')return new Response('{',{headers:{'Content-Type':'application/octet-stream'}});
 if(fault==='oversize'||fault==='declared')return new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(32769));},cancel(){cancelled=true;throw new Error('cancel failed');}}),{headers:{'Content-Type':'application/octet-stream',...(fault==='declared'?{'Content-Length':'32769'}:{})}});
 }
 return fetch(path,options);
 };
 await assert.rejects(api.loadAdminContent(),e=>e.code==='invalid_response');
 if(fault==='oversize'||fault==='declared')assert.equal(cancelled,true);
});

test('bounded admitted metadata and binary slices preserve raw Unicode without full source results',async()=>{
 const f=fixture();try{
 const m=await(await f.store.readBounded(new URLSearchParams('read=meta'))).json();
 assert.equal(m.readProtocol,'bounded-v1');assert.equal(m.bytes,Buffer.byteLength(f.raw));assert.equal(m.digest,hash(f.raw));assert.equal(m.sliceBytes,32768);
 const chunks=[];for(let part=1;part<=Math.ceil(m.bytes/32768);part++){
 const r=await f.store.readBounded(new URLSearchParams({read:'slice',pin:m.pin,part:String(part)}));
 assert.equal(r.headers.get('Cache-Control'),'no-store');assert.equal(r.headers.get('Content-Type'),'application/octet-stream');
 chunks.push(Buffer.from(await r.arrayBuffer()));
 }
 assert.equal(Buffer.concat(chunks).toString(),f.raw);
 assert.deepEqual(await(await f.store.readBounded(new URLSearchParams({read:'verify',pin:m.pin}))).json(),m);
 assert.ok(f.rows.every(r=>!r||!Object.values(r).includes(f.raw)));
 assert.ok(f.rows.every(r=>!r||Object.values(r).every(v=>!(v instanceof Uint8Array)||v.length<=32768)));
 }finally{f.sql.close();}
});
