// Real issuer + native workerd fetch/crypto. No owner token: the assertion below is intentionally forged.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { unstable_dev } from 'wrangler';
const root=path.resolve(import.meta.dirname,'..');
const config=await readFile(path.join(root,'wrangler.toml'),'utf8');
const team=/^ACCESS_TEAM_DOMAIN = "([a-z0-9-]+\.cloudflareaccess\.com)"/m.exec(config)?.[1];
assert.ok(team,'exact configured Access issuer required');
const issuer=`https://${team}`;
const discovery=await fetch(`${issuer}/cdn-cgi/access/certs`,{redirect:'manual',signal:AbortSignal.timeout(10000)});
assert.equal(discovery.status,200,'do not follow issuer redirects');
const certs=await discovery.json();assert.ok(certs.keys?.[0]?.kid);
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const assertion=`${encode({alg:'RS256',typ:'JWT',kid:certs.keys[0].kid})}.${encode({iss:issuer,aud:['native-runtime-proof'],sub:'synthetic-owner',email:'owner@example.test',exp:Math.floor(Date.now()/1000)+600})}.AA`;
const temporary=await mkdtemp(path.join(tmpdir(),'cms-access-native-'));let worker;
try{
 const entry=path.join(temporary,'proof.ts');
 await writeFile(entry,`import {createAccessVerifier} from ${JSON.stringify(path.join(root,'worker/cms-auth.ts'))};
let fetches=0,signatureChecks=0,status=null;
const platformFetch=globalThis.fetch;
globalThis.fetch=async(...args)=>{fetches++;const response=await platformFetch(...args);status=response.status;return response;};
const platformVerify=crypto.subtle.verify.bind(crypto.subtle);
crypto.subtle.verify=async(...args)=>{signatureChecks++;return platformVerify(...args);};
const verify=createAccessVerifier();
export default {async fetch(request){
 const {assertion}=await request.json();
 const input=new Request('https://example.test/admin',{headers:{'Cf-Access-Jwt-Assertion':assertion}});
 const identity=await verify(input,{ACCESS_TEAM_DOMAIN:${JSON.stringify(team)},ACCESS_AUD:'native-runtime-proof',ACCESS_ALLOWED_EMAILS:'owner@example.test'});
 return Response.json({authorized:Boolean(identity),fetches,status,signatureChecks});
}};`);
 const localConfig=path.join(temporary,'wrangler.toml');
 await writeFile(localConfig,`name="cms-access-native-proof"\nmain=${JSON.stringify(entry)}\ncompatibility_date="2026-10-01"\n`);
 worker=await unstable_dev(entry,{config:localConfig,local:true,persist:false,ip:'127.0.0.1',port:9398,inspectorPort:9698,logLevel:'error',experimental:{disableExperimentalWarning:true,disableDevRegistry:true,watch:false}});
 const results=[];
 for(const expectedChecks of [1,2]){
  const response=await worker.fetch('/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({assertion})});assert.equal(response.status,200);
  const result=await response.json();results.push(result);
  assert.equal(result.status,200,'native workerd must retrieve real JWKS without following redirects');
  assert.equal(result.signatureChecks,expectedChecks,'real native crypto must inspect each forged signature');
  assert.equal(result.authorized,false,'forged signatures must never authenticate');
  assert.equal(result.fetches,1,'repeat verification reuses the bounded key cache');
 }
 console.log(JSON.stringify({ok:true,scope:'isolated native local workerd; actual configured public JWKS; forged fixture only',results,ownerTokensUsed:false,remoteWrites:false},null,2));
}finally{if(worker)await worker.stop();await rm(temporary,{recursive:true,force:true});}
