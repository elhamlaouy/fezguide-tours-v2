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
  assert.ok(csp);assert.match(csp,/script-src 'self' https:\/\/static\.cloudflareinsights\.com;/);assert.match(csp,/connect-src 'self' https:\/\/cloudflareinsights\.com;/);assert.doesNotMatch(csp,/script-src[^;]*unsafe-inline/);
  assert.match(csp,/frame-ancestors 'none'/);assert.match(csp,/object-src 'none'/);assert.match(csp,/form-action 'none'/);
  assert.equal(response.headers.get('X-Frame-Options'),'DENY');assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
 }
 const html=await worker.fetch(new Request('https://site.example/'),env);
 const headersFile=readFileSync(new URL('../public/_headers',import.meta.url),'utf8');
 assert.ok(headersFile.includes(`Content-Security-Policy: ${html.headers.get('Content-Security-Policy')}`));
});

test('editor-only hostname opens the editor and never serves a duplicate public site', async () => {
 const served=[];
 const env={CMS_EDITOR_HOSTS:'app.site.example',ASSETS:{fetch:async request=>{served.push(new URL(request.url).pathname);return new Response('asset',{headers:{'Content-Type':'text/plain'}});}}};
 for(const path of ['/','/fr','/day-trips','/es/about']){
  const response=await worker.fetch(new Request(`https://app.site.example${path}`),env);
  assert.equal(response.status,302,path);assert.equal(response.headers.get('Location'),'/admin');
  assert.equal(response.headers.get('X-Robots-Tag'),'noindex, nofollow');assert.equal(response.headers.get('X-Frame-Options'),'DENY');
 }
 const robots=await worker.fetch(new Request('https://app.site.example/robots.txt'),env);
 assert.equal(await robots.text(),'User-agent: *\nDisallow: /\n');
 for(const path of ['/assets/index.js','/images/a.jpg','/favicon.svg','/manifest.json']){
  const response=await worker.fetch(new Request(`https://app.site.example${path}`),env);assert.equal(response.status,200,path);
 }
 assert.equal((await worker.fetch(new Request('https://app.site.example/api/admin/content'),env)).status,401,'admin API still requires Access');
 const main=await worker.fetch(new Request('https://site.example/fr'),env);
 assert.notEqual(main.status,302,'the public domain is unaffected');
 const off=await worker.fetch(new Request('https://app.site.example/'),{ASSETS:env.ASSETS});
 assert.notEqual(off.status,302,'no editor host configured: unchanged behaviour');
});

test('missing file-like paths are a real 404, not the SPA index with 200 (no soft-404)', async () => {
 const html=()=>new Response('<!doctype html><html><body>App</body></html>',{headers:{'Content-Type':'text/html'}});
 const env={ASSETS:{fetch:async request=>new URL(request.url).pathname==='/manifest.json'?new Response('{}',{headers:{'Content-Type':'application/json'}}):html()}};
 for(const path of ['/.env','/wp-login.php','/old-photo.jpg','/backup.zip']){
  const response=await worker.fetch(new Request(`https://site.example${path}`),env);
  assert.equal(response.status,404,path);assert.equal(response.headers.get('X-Robots-Tag'),'noindex');
  assert.equal(response.headers.get('X-Frame-Options'),'DENY');assert.doesNotMatch(await response.text(),/App/);
 }
 assert.equal((await worker.fetch(new Request('https://site.example/manifest.json'),env)).status,200,'real files still serve');
 assert.equal((await worker.fetch(new Request('https://site.example/about'),env)).status,200,'extensionless routes keep the SPA fallback');
});

test('with not_found_handling "none" the worker serves the app shell for page routes only', async () => {
 const files={'/index.html':'<!doctype html><html><body>Shell</body></html>','/manifest.json':'{}'};
 const env={ASSETS:{fetch:async request=>{const p=new URL(request.url).pathname;return p in files?new Response(files[p],{headers:{'Content-Type':p==='/index.html'?'text/html':'application/json'}}):new Response(null,{status:404});}}};
 for(const path of ['/fr/about','/any-route','/']){
  const response=await worker.fetch(new Request(`https://site.example${path}`),env);
  assert.equal(response.status,200,path);assert.match(await response.text(),/Shell/);
 }
 for(const path of ['/media/foo','/.well-known/security.txt','/assets/old-chunk.js','/images/missing.jpg','/wp-login.php']){
  const response=await worker.fetch(new Request(`https://site.example${path}`),env);
  assert.equal(response.status,404,path);assert.doesNotMatch(await response.text(),/Shell/);
 }
 assert.equal((await worker.fetch(new Request('https://site.example/admin',{method:'POST'}),env)).status,401,'admin writes still need Access');
});
