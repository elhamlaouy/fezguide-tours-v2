import assert from 'node:assert/strict';
import test from 'node:test';
import { register } from 'tsx/esm/api';
register();
const { default: worker } = await import('../worker/index.ts');
const env = { ACCESS_TEAM_DOMAIN: 'owner.cloudflareaccess.com', ACCESS_AUD: 'preview-audience', ACCESS_ALLOWED_EMAILS: 'owner@example.test', ASSETS: { async fetch() { return new Response('<main>owner editor</main>', {headers:{'Content-Type':'text/html'}}); } } };
const request = () => new Request('https://preview.example.test/admin');

test('platform-authenticated exact-app owner reaches editor without a legacy assertion header', async () => {
  const context = { access: { aud: 'preview-audience', async getIdentity() { return { user_uuid: 'verified-owner', email: 'owner@example.test' }; } } };
  const response = await worker.fetch(request(), env, context);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /owner editor/);
});

for (const [name, access] of [
  ['wrong audience', {aud:'another-app', async getIdentity(){throw Error('must not read wrong app identity');}}],
  ['missing audience', {async getIdentity(){return {id:'verified-owner',email:'owner@example.test'};}}],
  ['unapproved email', {aud:'preview-audience',async getIdentity(){return {id:'other',email:'attacker@example.test'};}}],
  ['missing stable subject', {aud:'preview-audience',async getIdentity(){return {email:'owner@example.test'};}}],
  ['oversized subject', {aud:'preview-audience',async getIdentity(){return {id:'x'.repeat(257),email:'owner@example.test'};}}],
  ['provider identity error', {aud:'preview-audience',async getIdentity(){throw Error('private provider details');}}],
  ['invalid identity shape', {aud:'preview-audience',async getIdentity(){return [];}}],
]) test(`platform Access fails closed for ${name}`, async () => {
  const response = await worker.fetch(request(), env, {access});
  assert.equal(response.status,401);
  assert.deepEqual(await response.json(),{error:'unauthorized'});
});

test('request and environment fields cannot impersonate trusted runtime Access',async()=>{
  const input = new Request('https://preview.example.test/admin?email=owner@example.test',{headers:{'X-Access-Aud':'preview-audience','Cf-Access-Authenticated-User-Email':'owner@example.test','X-Access-Subject':'verified-owner'}});
  input.access={aud:'preview-audience',async getIdentity(){return {id:'verified-owner',email:'owner@example.test'};}};
  assert.equal((await worker.fetch(input,{...env,access:input.access})).status,401);
});

test('platform owner identity preserves case-insensitive email and explicit stable subject allowlists',async()=>{
  const access={aud:'preview-audience',async getIdentity(){return {id:'verified-owner',email:'OWNER@EXAMPLE.TEST'};}};
  assert.equal((await worker.fetch(request(),env,{access})).status,200);
  assert.equal((await worker.fetch(request(),{...env,ACCESS_ALLOWED_EMAILS:undefined,ACCESS_ALLOWED_SUBJECTS:'verified-owner'},{access})).status,200);
});

test('temporary preview diagnostics expose booleans only and never authorize a forged token',async()=>{
  const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
  const token=`${encode({alg:'HS256',kid:'fake-key',typ:'JWT'})}.${encode({iss:'https://owner.cloudflareaccess.com',aud:['preview-audience'],exp:Math.floor(Date.now()/1000)+600,sub:'private-subject-marker',email:'owner@example.test'})}.AA`;
  const input=new Request('https://preview.example.test/admin',{headers:{'Cf-Access-Jwt-Assertion':token}});
  const response=await worker.fetch(input,{...env,CMS_AUTH_DIAGNOSTICS:'true'});
  assert.equal(response.status,401);
  const payload=await response.json();assert.equal(payload.probe.claimChecks.audience,true);assert.equal(payload.probe.claimChecks.emailApproved,true);
  assert.doesNotMatch(JSON.stringify(payload),/owner@example|private-subject|fake-key/);
});
