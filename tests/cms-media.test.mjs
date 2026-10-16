import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { crc32 } from 'node:zlib';
import { register } from 'tsx/esm/api';
register();
const { createCmsHandler } = await import('../worker/cms-routes.ts');
const { CmsStore } = await import('../worker/cms-store.ts');
const { boundedMediaBytes, MAX_MEDIA_BYTES } = await import('../worker/media.ts');
test('byte-limit rejection survives already-closed or failing stream cancellation', async () => {
  await assert.rejects(boundedMediaBytes(new ReadableStream({ cancel() { throw new Error('stream closed'); } }), String(MAX_MEDIA_BYTES + 1)), error => error.status === 413 && error.code === 'media_too_large');
  await assert.rejects(boundedMediaBytes(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(MAX_MEDIA_BYTES + 1)); }, cancel() { throw new Error('stream closed'); } }), null), error => error.status === 413 && error.code === 'media_too_large');
});
const fixtures = {"png": "iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAIAAAASFvFNAAAAFUlEQVR4nGNcpRHAwMDAwMDAxAADABT6ASa2hsqRAAAAAElFTkSuQmCC", "jpeg": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAMDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDkqKKKk+3P/9k=", "webp": "UklGRjQAAABXRUJQVlA4ICgAAABwAQCdASoDAAIAAUAmJaACdAFAAAD+8Pn4qf/XAf/84D//nAfw1AAA"};
const bytes = format => Buffer.from(fixtures[format], 'base64');
const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...await crypto.subtle.exportKey('jwk', pair.publicKey), kid: 'media-fixture', alg: 'RS256', use: 'sig' };
const now = 2_000_000_000;
const envAuth = { ACCESS_TEAM_DOMAIN: 'fixture.cloudflareaccess.com', ACCESS_AUD: 'cms-fixture', ACCESS_ALLOWED_SUBJECTS: 'editor' };
const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
async function token(claims = {}) {
 const data = `${b64({alg:'RS256',kid:jwk.kid})}.${b64({iss:'https://fixture.cloudflareaccess.com',aud:['cms-fixture'],exp:now+60,sub:'editor',...claims})}`;
 return `${data}.${Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(data))).toString('base64url')}`;
}
const alt = { en:'Photo',fr:'Photo',es:'Foto' };
function db() {
 const sqlite = new DatabaseSync(':memory:'); for (const name of ['0001_cms.sql', '0002_media_budget.sql', '0003_cms_release_safeguards.sql']) sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
 const statement = (sql,values=[]) => ({bind:(...v)=>statement(sql,v),async first(){return sqlite.prepare(sql).get(...values)??null;},async all(){return {success:true,results:sqlite.prepare(sql).all(...values)};},async run(){return {success:true,meta:{changes:Number(sqlite.prepare(sql).run(...values).changes)}};}});
 return {sqlite,prepare:statement,async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
}
async function fixture() {
 const database=db(), objects=new Map(); let puts=0;
 const bucket={async put(key,value,options){puts++;objects.set(key,{body:new Uint8Array(value),httpMetadata:options.httpMetadata});},async get(key){const item=objects.get(key);return item?{...item,body:new Blob([item.body]).stream()}:null;}};
 // Deliberate deterministic re-encoder double. The smoke test exercises the real Images decoder.
 const images={input(stream){return {async output(options){const body=await new Response(stream).arrayBuffer();return {response:()=>new Response(body,{headers:{'Content-Type':options.format}})};}};}};
 const env={...envAuth,CMS_DB:database,CMS_MEDIA:bucket,CMS_IMAGES:images};
 const handler=createCmsHandler({validateDocument:value=>value,access:{now:()=>now*1000,fetch:async()=>Response.json({keys:[jwk]})}});
 const jwt=await token();
 const call=(path,method='GET',body,headers={},auth=true)=>handler(new Request(`https://example.test${path}`,{method,headers:{...(auth?{'Cf-Access-Jwt-Assertion':jwt}:{}),...headers},...(body===undefined?{}:{body,duplex:'half'})}),env);
 const upload=(format='png',data=bytes(format),metadata={alt},headers={},auth=true)=>call('/api/admin/media','POST',data,{'Content-Type':`image/${format}`,'X-CMS-Metadata':encodeURIComponent(JSON.stringify(metadata)),...headers},auth);
 return {database,objects,env,call,upload,puts:()=>puts,store:new CmsStore(database,value=>value)};
}

test('uploads authenticate signed Access identity before side effects, CSRF and method guards',async()=>{
 const f=await fixture();try{
 assert.equal((await f.upload('png',undefined,undefined,{},false)).status,401);
 assert.equal((await f.upload('png',undefined,undefined,{'Cf-Access-Jwt-Assertion':await token({sub:'not-allowed'})})).status,401);
 assert.equal((await f.upload('png',undefined,undefined,{'Cf-Access-Jwt-Assertion':await token({exp:now})})).status,401);
 assert.equal((await f.upload('png',undefined,undefined,{Origin:'https://evil.test'})).status,403);
 assert.equal((await f.upload('png',undefined,undefined,{'Sec-Fetch-Site':'cross-site'})).status,403);
 assert.equal((await f.call('/api/admin/media','GET')).status,405);
 assert.equal(f.puts(),0);
 delete f.env.CMS_MEDIA; assert.equal((await f.upload()).status,503);
 }finally{f.database.sqlite.close();}
});
test('PNG JPEG WebP upload returns safe localized CmsMedia with private preview, never publishes implicitly',async()=>{
 const f=await fixture();try{
 const ids=[];
 for(const format of ['png','jpeg','webp']){
 const r=await f.upload(format,undefined,{alt,title:{en:'Title',fr:'Titre',es:'Título'},caption:alt},{Origin:'https://example.test'});assert.equal(r.status,201,await r.clone().text());
 const result=await r.json();ids.push(result.media.id);assert.deepEqual(result.media.alt,alt);assert.equal(result.media.width,3);assert.equal(result.media.height,2);assert.match(result.media.src,/^\/media\/upload-[a-f0-9-]+\.(png|jpg|webp)$/);assert.equal(result.media.title,undefined);
 const preview=await f.call(result.previewSrc);assert.equal(preview.status,200);assert.equal(preview.headers.get('cache-control'),'no-store');assert.equal(preview.headers.get('x-content-type-options'),'nosniff');assert.deepEqual(Buffer.from(await preview.arrayBuffer()),bytes(format));
 assert.equal((await f.call(result.previewSrc,'GET',undefined,{},false)).status,401);
 assert.equal((await f.call(result.media.src,'GET',undefined,{},false)).status,404);
 }
 assert.equal(new Set(ids).size,3);assert.equal(f.puts(),3);assert.equal((await f.store.read()).version,0);
 }finally{f.database.sqlite.close();}
});
test('magic, containers, metadata, dimensions and byte bounds fail before R2 writes',async()=>{
 const f=await fixture();try{
 for(const [format,data] of [['png',bytes('jpeg')],['png',Buffer.from('<svg/>')],['jpeg',Buffer.from('<html/>')],['png',bytes('png').subarray(0,30)],['webp',bytes('webp').subarray(0,20)],['jpeg',bytes('jpeg').subarray(0,100)],['png',Buffer.concat([bytes('png'),Buffer.from('<html/>')])]])assert.equal((await f.upload(format,data)).status,422);
 assert.equal((await f.upload('gif',Buffer.from('GIF89a'))).status,415);
 for(const metadata of [{alt:{en:'only'}},{alt:{...alt,ar:'no'}},{alt,title:{...alt,en:'x'.repeat(501)}},{alt:{...alt,en:'<script>'}},{alt,caption:{...alt,en:'x'.repeat(2001)}},{alt,filename:'../../evil.svg'}])assert.equal((await f.upload('png',undefined,metadata)).status,422);
 const jpeg=bytes('jpeg'),sos=jpeg.indexOf(Buffer.from([255,218]));
 const emptyScan=Buffer.concat([jpeg.subarray(0,sos+2+jpeg.readUInt16BE(sos+2)),Buffer.from([255,217])]);
 assert.equal((await f.upload('jpeg',emptyScan)).status,422,'a decoder may tolerate missing JPEG entropy; preflight must reject it');
 for(const [width,height] of [[20000,2],[4000,4000],[0,2]]){
  const giant=bytes('png');giant.writeUInt32BE(width,16);giant.writeUInt32BE(height,20);giant.writeUInt32BE(crc32(giant.subarray(12,29)),29);
  assert.equal((await f.upload('png',giant)).status,422,'valid CRC must not bypass dimension/pixel limits');
 }
 const webp=bytes('webp'),canvas=Buffer.alloc(18);canvas.write('VP8X');canvas.writeUInt32LE(10,4);canvas.writeUIntLE(19999,12,3);canvas.writeUIntLE(19999,15,3);
 const bomb=Buffer.concat([webp.subarray(0,12),canvas,webp.subarray(12)]);bomb.writeUInt32LE(bomb.length-8,4);assert.equal((await f.upload('webp',bomb)).status,422);
 assert.equal((await f.upload('png',undefined,undefined,{'Content-Encoding':'gzip'})).status,415);
 assert.equal((await f.upload('png',undefined,undefined,{'Content-Length':String(8*1024*1024+1)})).status,413);
 let cancelled=false;const stream=new ReadableStream({pull(c){c.enqueue(new Uint8Array(1024*1024));},cancel(){cancelled=true;}});
 assert.equal((await f.upload('png',stream)).status,413);assert.equal(cancelled,true);assert.equal(f.puts(),0);
 const images=f.env.CMS_IMAGES;delete f.env.CMS_IMAGES;assert.equal((await f.upload()).status,503);f.env.CMS_IMAGES={input(){return{async output(){throw Error('decoder rejected corruption');}};}};assert.equal((await f.upload()).status,422);assert.equal(f.puts(),0);f.env.CMS_IMAGES=images;
 }finally{f.database.sqlite.close();}
});
test('public images require live visible references, publication and rollback retain objects',async()=>{
 const f=await fixture();try{
 const {media,previewSrc}=await (await f.upload()).json();
 const doc={schemaVersion:1,pages:[{id:'home',enabled:true,sections:[{enabled:true,image:{mediaId:media.id,alt}}]}],media:[media]};
 await f.store.saveDraft(doc,0,'editor');assert.equal((await f.call(media.src,'GET',undefined,{},false)).status,404);
 await f.store.publish(1,'editor');assert.equal((await f.call(media.src,'GET',undefined,{},false)).status,200);
 const hide=structuredClone(doc);hide.pages[0].enabled=false;await f.store.saveDraft(hide,2,'editor');await f.store.publish(3,'editor');assert.equal((await f.call(media.src,'GET',undefined,{},false)).status,404);assert.equal((await f.call(previewSrc)).status,200);
 await f.store.rollback(2,4,'editor');assert.equal((await f.call(media.src,'GET',undefined,{},false)).status,200);assert.equal(f.objects.size,1);
 const unused={schemaVersion:1,pages:[],media:[media]};await f.store.saveDraft(unused,5,'editor');await f.store.publish(6,'editor');assert.equal((await f.call(media.src,'GET',undefined,{},false)).status,404);
 assert.equal((await f.call('/media/upload-%2e%2e%2fobjects')).status,404);assert.equal(await f.call('/api/media'),null);
 }finally{f.database.sqlite.close();}
});

test('upload API sends raw bytes and encoded localized metadata, never a user filename or JWT', async () => {
 const {uploadAdminMedia,AdminApiError}=await import('../src/admin/admin-api.ts');
 const f=await fixture(),original=globalThis.fetch;
 try {
  let observed;
  globalThis.fetch=async(pathname,options)=>{observed={pathname,options};return f.call(pathname,options.method,options.body,options.headers);};
  const file=new File([bytes('png')],'../../disguised.svg',{type:'image/png'});
  const result=await uploadAdminMedia(file,{alt:{...alt,es:'Fotografía 📷'}});
  assert.equal(result.media.alt.es,'Fotografía 📷');assert.equal(observed.pathname,'/api/admin/media');assert.equal(observed.options.credentials,'same-origin');assert.equal(observed.options.cache,'no-store');assert.equal(observed.options.body,file);
  assert.equal(observed.options.headers['Cf-Access-Jwt-Assertion'],undefined);assert.equal(observed.options.headers['Content-Type'],'image/png');assert.equal(JSON.parse(decodeURIComponent(observed.options.headers['X-CMS-Metadata'])).alt.es,'Fotografía 📷');assert.equal(f.puts(),1);
  globalThis.fetch=async()=>Response.json({error:'unauthorized'},{status:401});await assert.rejects(uploadAdminMedia(file,{alt}),e=>e instanceof AdminApiError&&e.status===401);
  globalThis.fetch=async()=>Response.json({media:{...result.media,src:'https://evil.test/x'},previewSrc:result.previewSrc});await assert.rejects(uploadAdminMedia(file,{alt}),e=>e.code==='invalid_response');
 } finally {globalThis.fetch=original;f.database.sqlite.close();}
});

test('standalone upload UI renders en/fr/es and integrates uploaded media + selection callbacks', async () => {
 const {Window}=await import('happy-dom');
 const window=new Window({url:'https://example.test/admin'});
 const restore=new Map();
 for(const [key,value] of Object.entries({window,document:window.document,navigator:window.navigator,HTMLElement:window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true})){
  restore.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
 }
 const React=await import('react');const {createRoot}=await import('react-dom/client');const {renderToStaticMarkup}=await import('react-dom/server');const {MediaUpload}=await import('../src/admin/MediaUpload.tsx');
 const f=await fixture(),original=globalThis.fetch;const host=window.document.createElement('div');window.document.body.append(host);const root=createRoot(host);
 try{
  for(const [language,label] of [['en','Upload a photo'],['fr','Ajouter une photo'],['es','Subir una foto']]){
   const html=renderToStaticMarkup(React.createElement(MediaUpload,{language,onUploaded(){}}));assert.ok(html.includes(label));assert.ok(html.includes('accept="image/jpeg,image/png,image/webp"'));assert.equal((html.match(/maxLength="500"/g)??[]).length,6);
  }
  let inserted,selected,finish;const finished=new Promise(resolve=>{finish=resolve;});globalThis.fetch=async(pathname,options)=>f.call(pathname,options.method,options.body,options.headers);
  await React.act(async()=>root.render(React.createElement(MediaUpload,{language:'es',onUploaded(media,result){inserted={media,result};finish();},onSelect(id){selected=id;}})));
  const input=host.querySelector('input[type=file]');Object.defineProperty(input,'files',{value:[new File([bytes('png')],'test.png',{type:'image/png'})],configurable:true});
  await React.act(async()=>input.dispatchEvent(new window.Event('change',{bubbles:true})));
  assert.equal(host.querySelector('[name=upload-photo]').disabled,false,'file selection enables upload');
  await React.act(async()=>{host.querySelector('[name=upload-photo]').click();let timer;try{await Promise.race([finished,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(host.innerHTML)),20000);})]);}finally{clearTimeout(timer);}});
  assert.ok(inserted,'upload must reach callback');assert.equal(selected,inserted.media.id);assert.equal(host.querySelector('img').getAttribute('src'),inserted.result.previewSrc);assert.ok(host.querySelector('[role=status]').textContent.includes('borrador'));assert.equal(f.puts(),1);
 } finally{
  await React.act(async()=>root.unmount());globalThis.fetch=original;f.database.sqlite.close();await window.happyDOM.close();
  for(const [key,descriptor] of restore){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
 }
});
