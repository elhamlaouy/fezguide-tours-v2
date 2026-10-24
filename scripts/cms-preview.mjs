// Local-only signed preview. This file is NEVER part of the production Worker bundle.
import { createServer, request as httpRequest } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { lockState } from './cms-preview-state.mjs';
const root=path.resolve(import.meta.dirname,'..');
const issuer='https://local-preview.cloudflareaccess.com',audience='cms-owner-local-preview',subject='local-preview-owner';
export function previewRequestAllowed(req,port) {
 const hosts=[`127.0.0.1:${port}`,`localhost:${port}`],origins=hosts.map(h=>`http://${h}`);
 // Explicit desktop SSH-forwarded browser origins only; never accept arbitrary Host or forwarded headers.
 for(const raw of (process.env.CMS_PREVIEW_BROWSER_ORIGINS??'').split(',').filter(Boolean)) {
  try {
   const origin=new URL(raw);
   if(origin.protocol!=='http:'||!['127.0.0.1','localhost'].includes(origin.hostname)||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||!origin.port)return false;
   hosts.push(origin.host);origins.push(origin.origin);
  }catch{return false;}
 }
 if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||!hosts.includes(req.headers.host))return false;
 if(typeof req.url!=='string'||!req.url.startsWith('/')||req.url.startsWith('//')||req.url.includes('\\'))return false;
 if(req.headers.origin!==undefined&&!origins.includes(req.headers.origin))return false;
 if(req.headers['sec-fetch-site']!==undefined&&!['same-origin','none'].includes(req.headers['sec-fetch-site']))return false;
 if(['iframe','frame','object','embed'].includes(req.headers['sec-fetch-dest']))return false;
 return ['GET','HEAD'].includes(req.method)||origins.includes(req.headers.origin);
}
export async function wranglerPath() {
 if(process.env.CMS_PREVIEW_WRANGLER){await access(process.env.CMS_PREVIEW_WRANGLER);return process.env.CMS_PREVIEW_WRANGLER;}
 const require=createRequire(import.meta.url);
 try {
  // Wrangler exports its manifest, but not the bin/wrangler.js subpath.
  const executable=path.join(path.dirname(require.resolve('wrangler/package.json')),'bin/wrangler.js');
  await access(executable);
  return executable;
 }catch{}
 const cache=path.join(os.homedir(),'.npm','_npx');
 for(const dir of await readdir(cache).catch(()=>[])) {
  const candidate=path.join(cache,dir,'node_modules/wrangler');
  try {const pkg=JSON.parse(await readFile(path.join(candidate,'package.json'),'utf8'));if(pkg.version==='4.149.0')return path.join(candidate,'bin/wrangler.js');}catch{}
 }
 throw Error('Wrangler 4.149.0 is not installed/cached. Install it first, or set CMS_PREVIEW_WRANGLER to its bin/wrangler.js. This launcher never installs packages.');
}
function command(executable,args) {
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[executable,...args],{cwd:root,env:{...process.env,CI:'1',WRANGLER_SEND_METRICS:'false'},stdio:['ignore','pipe','pipe']});let output='';
  child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(`Local Wrangler command failed (${code})\n${output.slice(-4000)}`)));
 });
}
export async function startPreview({port=9196,upstream=9197,inspector=9497,state=path.join(root,'.wrangler/cms-owner-preview'),assetsDirectory=path.join(root,'dist')}={}) {
 for(const p of [port,upstream,inspector])if(!Number.isInteger(p)||p<1024||p>65535)throw Error('Invalid loopback port');
 if(new Set([port,upstream,inspector]).size!==3)throw Error('Preview ports must be distinct');
 state=path.resolve(state);
 assetsDirectory=path.resolve(assetsDirectory);
 await access(path.join(assetsDirectory,'index.html'));
 const unlock=await lockState(state);let temporary,child,server;
 let closed=false;
 async function close(){
  if(closed)return;closed=true;
  if(server)await new Promise(resolve=>server.close(resolve));
  if(child&&child.exitCode===null){const exit=new Promise(resolve=>child.once('exit',resolve));try{process.kill(-child.pid,'SIGTERM');}catch{child.kill('SIGTERM');}await exit;}
  if(temporary)await rm(temporary,{recursive:true,force:true});
  await unlock();
 }
 try {
  const wrangler=await wranglerPath();
  const scratch=process.env.TMPDIR??path.join(os.homedir(),'.hermes/profiles/website-builder/cache/scratch');
  temporary=await mkdtemp(path.join(scratch,'cms-owner-preview-'));
  const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
  const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:crypto.randomUUID(),alg:'RS256',use:'sig'};
  const b64=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
  async function token(){const now=Math.floor(Date.now()/1000),data=`${b64({alg:'RS256',typ:'JWT',kid:jwk.kid})}.${b64({iss:issuer,aud:[audience],sub:subject,nbf:now-1,exp:now+60})}`;return `${data}.${Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(data))).toString('base64url')}`;}
  const entry=path.join(temporary,'local-signed-worker.ts');
  // Only the existing trusted-JWKS fetch test seam changes. The unchanged Access
  // verifier still enforces algorithm, RSA signature, issuer, audience, expiry and subject.
  await writeFile(entry,`import {createCmsHandler,isCmsAdminPath} from ${JSON.stringify(path.join(root,'worker/cms-routes.ts'))};\nimport {validateCmsDocument} from ${JSON.stringify(path.join(root,'src/cms/schema.ts'))};\nimport productionWorker from ${JSON.stringify(path.join(root,'worker/index.ts'))};\nconst handler=createCmsHandler({validateDocument:validateCmsDocument,access:{fetch:async(url)=>url===${JSON.stringify(`${issuer}/cdn-cgi/access/certs`)}?Response.json({keys:[${JSON.stringify(jwk)}]}):new Response(null,{status:404})}});\nexport default {async fetch(request,env){return await handler(request,env)??(isCmsAdminPath(new URL(request.url).pathname)?env.ASSETS.fetch(request):productionWorker.fetch(request,env));}};\n`);
  const template=await readFile(path.join(root,'wrangler.cms-preview.toml'),'utf8');
  const config=path.join(temporary,'wrangler.toml');
  await writeFile(config,template.replace('main = "worker/index.ts"',`main = ${JSON.stringify(entry)}`).replace('directory = "./dist"',`directory = ${JSON.stringify(assetsDirectory)}`).replace('migrations_dir = "migrations"',`migrations_dir = ${JSON.stringify(path.join(root,'migrations'))}`)+`\n[vars]\nACCESS_TEAM_DOMAIN = "local-preview.cloudflareaccess.com"\nACCESS_AUD = ${JSON.stringify(audience)}\nACCESS_ALLOWED_SUBJECTS = ${JSON.stringify(subject)}\n`);
  await command(wrangler,['d1','migrations','apply','fez-cms-preview','--local','--config',config,'--persist-to',state]);
  child=spawn(process.execPath,[wrangler,'dev','--local','--config',config,'--ip','127.0.0.1','--port',String(upstream),'--inspector-port',String(inspector),'--persist-to',state,'--show-interactive-dev-session=false'],{cwd:root,detached:true,env:{...process.env,CI:'1',WRANGLER_SEND_METRICS:'false'},stdio:['ignore','pipe','pipe']});
  let output='',readyCheck=()=>{};const take=b=>{output=(output+b).slice(-20000);readyCheck();};child.stdout.on('data',take);child.stderr.on('data',take);
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(`Local Wrangler readiness timeout\n${output.slice(-4000)}`)),180000);readyCheck=()=>{if(output.includes(`Ready on http://127.0.0.1:${upstream}`)){clearTimeout(timer);resolve();}};child.once('error',reject);child.once('exit',code=>{clearTimeout(timer);reject(Error(`Local Wrangler exited ${code}\n${output.slice(-4000)}`));});readyCheck();});
  const backend=`http://127.0.0.1:${upstream}`;
  async function internal(pathname,method='GET',body){const response=await fetch(backend+pathname,{method,headers:{'Cf-Access-Jwt-Assertion':await token(),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});if(!response.ok)throw Error(`Preview startup ${pathname}: ${response.status} ${await response.text()}`);return response.json();}
  if((await fetch(backend+'/api/admin/content')).status!==401)throw Error('Anonymous upstream did not fail closed');
  const content=await internal('/api/admin/content');
  if(content.version===0&&content.document===null){
   const {register}=await import('tsx/esm/api');register();
   const {createCmsSeed}=await import(pathToFileURL(path.join(root,'src/cms/seed.ts')).href);
   const saved=await internal('/api/admin/content/draft','PUT',{expectedVersion:0,document:createCmsSeed()});
   await internal('/api/admin/content/publish','POST',{expectedVersion:saved.version});
  }
  server=createServer(async(req,res)=>{
   if(!previewRequestAllowed(req,port)){res.writeHead(403,{'Content-Type':'text/plain','Cache-Control':'no-store'});res.end('Loopback preview request rejected');req.resume();return;}
   if(!['GET','HEAD','POST','PUT'].includes(req.method)){res.writeHead(405);res.end();return;}
   const headers={...req.headers,host:`127.0.0.1:${upstream}`};
   for(const key of Object.keys(headers))if(key==='authorization'||key==='cookie'||key.startsWith('cf-access-')||key.startsWith('x-forwarded-')||key==='forwarded')delete headers[key];
   if(headers.origin)headers.origin=backend;
   try {
    if(/^\/(?:admin(?:\/|$)|api\/admin(?:\/|$))/.test(decodeURIComponent(req.url.split('?')[0])))headers['cf-access-jwt-assertion']=await token();
    const proxy=httpRequest({hostname:'127.0.0.1',port:upstream,path:req.url,method:req.method,headers},incoming=>{
     const safeHeaders={...incoming.headers,'cache-control':'no-store','x-frame-options':'DENY','cross-origin-resource-policy':'same-origin'};
     delete safeHeaders['set-cookie'];delete safeHeaders['cf-access-jwt-assertion'];
     res.writeHead(incoming.statusCode,safeHeaders);incoming.pipe(res);
    });
    proxy.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end('Local worker unavailable');});
    req.on('aborted',()=>proxy.destroy());req.pipe(proxy);
   }catch{res.writeHead(400);res.end('Invalid preview request');req.resume();}
  });
  server.requestTimeout=60000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  const health=await fetch(`http://127.0.0.1:${port}/api/admin/content`);
  if(!health.ok)throw Error(`Signed loopback proxy failed health check: ${health.status}`);
  return {url:`http://127.0.0.1:${port}`,state,close,child};
 }catch(error){await close();throw error;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)) {
 const options={};
 for(let i=2;i<process.argv.length;i+=2){const flag=process.argv[i],value=process.argv[i+1];if(!['--port','--upstream','--inspector','--state'].includes(flag)||!value)throw Error('Usage: node scripts/cms-preview.mjs [--port 9196 --upstream 9197 --inspector 9497 --state PATH]');options[flag.slice(2)]=flag==='--state'?value:Number(value);}
 const preview=await startPreview(options);
 console.log(JSON.stringify({ready:true,editor:`${preview.url}/admin`,public:preview.url,state:preview.state,syntheticLocalIdentity:true,realD1R2Images:true,remote:false}));
 let stopping=false;const stop=async()=>{if(stopping)return;stopping=true;await preview.close();process.exit(0);};
 process.once('SIGINT',stop);process.once('SIGTERM',stop);
 preview.child.once('exit',async()=>{if(!stopping){await stop();}});
}
