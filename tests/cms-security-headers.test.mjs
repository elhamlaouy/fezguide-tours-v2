import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'tsx/esm/api';
register();
const { default: worker } = await import('../worker/index.ts');

test('HTML and API responses enforce the tested non-inline-script CSP and framing policy', async () => {
 const env={ASSETS:{fetch:async()=>new Response('<!doctype html><html><body>Fixture</body></html>',{headers:{'Content-Type':'text/html'}})}};
 for(const path of ['/','/missing-page','/api/unknown']){
  const response=await worker.fetch(new Request(`https://site.example${path}`),env);
  const csp=response.headers.get('Content-Security-Policy');
  assert.ok(csp);assert.match(csp,/script-src 'self';/);assert.doesNotMatch(csp,/script-src[^;]*unsafe-inline/);
  assert.match(csp,/frame-ancestors 'none'/);assert.match(csp,/object-src 'none'/);assert.match(csp,/form-action 'none'/);
  assert.equal(response.headers.get('X-Frame-Options'),'DENY');assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
 }
 const html=await worker.fetch(new Request('https://site.example/'),env);
 const headersFile=readFileSync(new URL('../public/_headers',import.meta.url),'utf8');
 assert.ok(headersFile.includes(`Content-Security-Policy: ${html.headers.get('Content-Security-Policy')}`));
});
