// Local-only synthetic signed-Access integration. No remote resources or auth bypass.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { register } from 'tsx/esm/api';
register();
const root=path.resolve(import.meta.dirname,'..');
const scratch=process.env.TMPDIR ?? '/home/ubuntu/.hermes/profiles/website-builder/cache/scratch';
const temporary=await mkdtemp(path.join(scratch,'cms-media-'));
const persist=path.join(temporary,'state');
const wrangler=['npx','--yes','wrangler@4.149.0'];
const fixtures={"png": "iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAIAAAASFvFNAAAAFUlEQVR4nGNcpRHAwMDAwMDAxAADABT6ASa2hsqRAAAAAElFTkSuQmCC", "jpeg": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAMDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDkqKKKk+3P/9k=", "webp": "UklGRjQAAABXRUJQVlA4ICgAAABwAQCdASoDAAIAAUAmJaACdAFAAAD+8Pn4qf/XAf/84D//nAfw1AAA"};
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'local-media-proof',alg:'RS256',use:'sig'};
const now=Math.floor(Date.now()/1000);
const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
async function signedToken(claims={}){
 const data=`${b64({alg:'RS256',kid:jwk.kid})}.${b64({iss:'https://fixture.cloudflareaccess.com',aud:['cms-local-media'],sub:'fixture-editor',exp:now+600,...claims})}`;
 return `${data}.${Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(data))).toString('base64url')}`;
}
function run(args){return new Promise((resolve,reject)=>{
 const child=spawn(wrangler[0],[...wrangler.slice(1),...args],{cwd:root,env:{...process.env,CI:'1',WRANGLER_SEND_METRICS:'false'},stdio:['ignore','pipe','pipe']});let output='';
 child.stdout.on('data',b=>{output+=b;});child.stderr.on('data',b=>{output+=b;});child.on('error',reject);child.on('exit',code=>code===0?resolve(output):reject(Error(`${args.join(' ')} exited ${code}\n${output.slice(-4000)}`)));
});}
function freePort(){return new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});}
const servers=[];
async function start(config){
 const port=await freePort(),inspector=await freePort();
 const child=spawn(wrangler[0],[...wrangler.slice(1),'dev','--config',config,'--local','--ip','127.0.0.1','--port',String(port),'--inspector-port',String(inspector),'--persist-to',persist,'--show-interactive-dev-session=false'],{cwd:root,detached:true,env:{...process.env,CI:'1',WRANGLER_SEND_METRICS:'false'},stdio:['ignore','pipe','pipe']});servers.push(child);
 let output='';let check=()=>{};const take=b=>{output+=b;if(output.length>100000)output=output.slice(-50000);check();};child.stdout.on('data',take);child.stderr.on('data',take);
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(`Wrangler readiness timeout\n${output.slice(-5000)}`)),300000);check=()=>{if(/Ready on http:\/\/127\.0\.0\.1:\d+/.test(output)){clearTimeout(timer);resolve();}};child.once('error',reject);child.once('exit',code=>{clearTimeout(timer);reject(Error(`Wrangler exited ${code}\n${output.slice(-5000)}`));});check();});
 const base=`http://127.0.0.1:${port}`;assert.equal((await fetch(`${base}/api/cms/document`)).status,200);
 return {base,child};
}
async function stop(child){if(child.exitCode!==null)return;const exited=new Promise(resolve=>child.once('exit',resolve));try{process.kill(-child.pid,'SIGTERM');}catch{child.kill('SIGTERM');}await exited;}
try{
 // The only changed seam is the existing AccessVerifierOptions.fetch test seam, returning
 // a synthetic trusted JWKS. Every HTTP request still requires a valid RSA signature,
 // exact issuer/audience, unexpired claims and the configured allowlisted subject.
 const entry=path.join(temporary,'signed-fixture-worker.ts');
 await writeFile(entry,`import {createCmsHandler} from ${JSON.stringify(path.join(root,'worker/cms-routes.ts'))};\nimport {validateCmsDocument} from ${JSON.stringify(path.join(root,'src/cms/schema.ts'))};\nconst handler=createCmsHandler({validateDocument:validateCmsDocument,access:{fetch:async()=>Response.json({keys:[${JSON.stringify(jwk)}]})}});\nexport default {async fetch(request,env){return await handler(request,env)??new Response('Not found',{status:404});}};\n`);
 const original=(await readFile(path.join(root,'wrangler.cms-local.toml'),'utf8')).replace(/\[assets\][\s\S]*?(?=\[\[d1_databases\]\])/, '');
 const config=path.join(temporary,'wrangler.toml');
 // Scratch configuration cannot deploy (no real D1/R2 IDs). Paths are absolute because
 // Wrangler resolves main, assets and migrations relative to the scratch configuration.
 await writeFile(config,original.replace('main = "worker/index.ts"',`main = ${JSON.stringify(entry)}`).replace('directory = "./dist"',`directory = ${JSON.stringify(path.join(root,'dist'))}`).replace('migrations_dir = "migrations"',`migrations_dir = ${JSON.stringify(path.join(root,'migrations'))}`)+`\n[vars]\nACCESS_TEAM_DOMAIN = "fixture.cloudflareaccess.com"\nACCESS_AUD = "cms-local-media"\nACCESS_ALLOWED_SUBJECTS = "fixture-editor"\n`);
 await run(['d1','migrations','apply','fez-cms-local','--local','--config',config,'--persist-to',persist]);
 const {base,child}=await start(config);
 const jwt=await signedToken();
 const call=(pathname,method='GET',body,headers={},auth=true)=>fetch(`${base}${pathname}`,{method,headers:{...(auth?{'Cf-Access-Jwt-Assertion':jwt}:{}),...headers},...(body===undefined?{}:{body})});
 const alt={en:'Local photo',fr:'Photo locale',es:'Foto local'};
 const upload=(format,data=Buffer.from(fixtures[format],'base64'),headers={},auth=true)=>call('/api/admin/media','POST',data,{'Content-Type':`image/${format}`,'X-CMS-Metadata':encodeURIComponent(JSON.stringify({alt})),...headers},auth);
 assert.equal((await upload('png',undefined,{},false)).status,401);
 assert.equal((await upload('png',undefined,{'Cf-Access-Jwt-Assertion':await signedToken({sub:'unapproved'})})).status,401);
 assert.equal((await upload('png',undefined,{Origin:'https://cross-site.test'})).status,403);
 const uploaded=[];
 for(const format of ['png','jpeg','webp']){
  const response=await upload(format);assert.equal(response.status,201,await response.clone().text());const result=await response.json();uploaded.push(result);
  assert.equal(result.media.width,3);assert.equal(result.media.height,2);
  const preview=await call(result.previewSrc);assert.equal(preview.status,200);assert.equal(preview.headers.get('cache-control'),'no-store');assert.equal(preview.headers.get('x-content-type-options'),'nosniff');assert.ok((await preview.arrayBuffer()).byteLength>20);
  assert.equal((await call(result.previewSrc,'GET',undefined,{},false)).status,401);assert.equal((await call(result.media.src,'GET',undefined,{},false)).status,404);
 }
 // Regression: offline Images/Sharp tolerated this JPEG with no scan entropy and
 // returned a re-encoded blank image. Reject it explicitly before calling the decoder.
 const jpeg=Buffer.from(fixtures.jpeg,'base64'),sos=jpeg.indexOf(Buffer.from([255,218]));
 const emptyScan=Buffer.concat([jpeg.subarray(0,sos+2+jpeg.readUInt16BE(sos+2)),Buffer.from([255,217])]);
 assert.equal((await upload('jpeg',emptyScan)).status,422);
 // Invalid quantization-table precision passes container/dimension preflight; the
 // real decoder must reject it, rather than accepting a header-only lookalike.
 const corrupt=Buffer.from(fixtures.jpeg,'base64');corrupt[corrupt.indexOf(Buffer.from([255,219]))+4]=0xff;
 const {inspectMedia}=await import('../worker/media.ts');inspectMedia(corrupt,'image/jpeg');
 assert.equal((await upload('jpeg',corrupt)).status,422);
 assert.equal((await upload('png',Buffer.from('<svg/>'))).status,422);
 assert.equal((await upload('png',Buffer.alloc(8*1024*1024+1),{'Content-Length':String(8*1024*1024+1)})).status,413);
 const {validateCmsDocument}=await import('../src/cms/schema.ts');
 // Small explicit synthetic document: unrelated locale-data edits cannot invalidate the
 // media/storage proof, but the real schema validates this exact upload result.
 const siteSettings={siteName:'Local media proof',phoneNumber:'+1234567890',whatsappNumber:'1234567890',email:'fixture@example.test',address:alt,licenseBadge:alt,heroTagline:alt,heroTitle:alt,heroSubtitle:alt};
 const media=uploaded[0].media;
 const doc={schemaVersion:1,siteSettings,theme:{colors:{primary:'#113333',accent:'#775533',background:'#ffffff',text:'#222222'},font:'system',fontScale:1,containerWidth:1200,spacing:'comfortable',radius:'rounded',buttonVariant:'solid',cardVariant:'outlined'},navigation:[],footer:{text:alt,links:[]},uiCopy:{},pages:[{id:'home',slug:'home',kind:'landing',enabled:true,title:alt,seo:{title:alt,description:alt},sections:[{id:'hero',type:'hero',variant:'banner',enabled:true,links:[],image:{mediaId:media.id,alt}}]}],products:[],editorialEntries:[],blogPosts:[],teamMembers:[],faqs:[],media:[media],reviews:[],legacy:{tours:[],customPages:[],blogPosts:[],teamMembers:[],faqs:[],siteSettings}};
 assert.equal(validateCmsDocument(doc).valid,true,JSON.stringify(validateCmsDocument(doc)));
 async function jsonCall(pathname,payload){const response=await call(pathname,pathname.endsWith('/draft')?'PUT':'POST',JSON.stringify(payload),{'Content-Type':'application/json'});assert.equal(response.status,200,await response.clone().text());return response.json();}
 await jsonCall('/api/admin/content/draft',{expectedVersion:0,document:doc});assert.equal((await call(media.src,'GET',undefined,{},false)).status,404);
 await jsonCall('/api/admin/content/publish',{expectedVersion:1});assert.equal((await call(media.src,'GET',undefined,{},false)).status,200);
 const hide=structuredClone(doc);hide.pages.find(page=>page.id==='home').enabled=false;await jsonCall('/api/admin/content/draft',{expectedVersion:2,document:hide});await jsonCall('/api/admin/content/publish',{expectedVersion:3});assert.equal((await call(media.src,'GET',undefined,{},false)).status,404);
 await jsonCall('/api/admin/content/rollback',{expectedVersion:4,revision:2});assert.equal((await call(media.src,'GET',undefined,{},false)).status,200);assert.equal((await call(uploaded[1].previewSrc)).status,200);
 await stop(child);
 // Restart the real production entry with NO verifier seam. Reads use the same persisted
 // local R2/D1 state; private routes remain fail-closed without operational Access config.
 const productionConfig=path.join(temporary,'production.toml');await writeFile(productionConfig,original.replace('main = "worker/index.ts"',`main = ${JSON.stringify(path.join(root,'worker/index.ts'))}`).replace('directory = "./dist"',`directory = ${JSON.stringify(path.join(root,'dist'))}`).replace('migrations_dir = "migrations"',`migrations_dir = ${JSON.stringify(path.join(root,'migrations'))}`));
 const production=await start(productionConfig);
 const read=await fetch(`${production.base}${media.src}`);assert.equal(read.status,200);assert.ok((await read.arrayBuffer()).byteLength>20);
 for(const [pathname,method] of [['/api/admin/media','POST'],[uploaded[1].previewSrc,'GET']])assert.equal((await fetch(`${production.base}${pathname}`,{method})).status,401);
 assert.equal((await fetch(`${production.base}${uploaded[1].media.src}`)).status,404);
 console.log(JSON.stringify({ok:true,wrangler:'4.149.0',formats:['png','jpeg','webp'],realLocalR2WriteRead:true,realImagesDecode:true,corruptJpegDenied:true,signedAccessWithSyntheticJwks:true,productionEntryNoSeamRead:true,draftsPrivate:true,publicationAndRollback:true,remoteResourcesCreated:false,operationalAccessIssuerHttpUnproven:true}));
}finally{
 for(const child of servers){if(child.exitCode===null){try{process.kill(-child.pid,'SIGTERM');}catch{child.kill('SIGTERM');}}}
 await new Promise(resolve=>setTimeout(resolve,500));
 for(const child of servers)if(child.exitCode===null&&child.pid){try{process.kill(-child.pid,'SIGKILL');}catch{}}
 await rm(temporary,{recursive:true,force:true});
}
