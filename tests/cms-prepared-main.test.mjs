import assert from 'node:assert/strict';
import {test} from 'node:test';
import {register} from 'tsx/esm/api';
register();
const main=(await import('../worker/index.ts')).default;

// Entry-point contract test. Reader SQL semantics are covered separately against SQLite.
async function fixture() {
  const body='<main>sealed artifact</main>',bytes=new TextEncoder().encode(body),sha256=await crypto.subtle.digest('SHA-256',bytes);
  const id='b'.repeat(32),key=`prepared/v1/${id}/home`;
  let assets=0,queries=0;
  const row={revision:2,target_revision:2,source_revision:1,source_digest:'a'.repeat(64),id,policy:'policy',renderer:'renderer',assets:'assets',origin:'https://fezguidetours.com',state:'published',canonical_path:'/',path:'/',object_key:key,etag:'etag',object_version:'version',digest:Buffer.from(sha256).toString('hex'),bytes:bytes.byteLength,content_type:'text/html; charset=utf-8',status:200};
  const env={CMS_PROCESSING_MODE:'staged-v1',CMS_VALIDATION_POLICY:'policy',CMS_RENDERER_ID:'renderer',CMS_ASSET_ID:'assets',CANONICAL_ORIGIN:'https://fezguidetours.com',CMS_PUBLIC_DELIVERY_ORIGIN:'https://fezguidetours.com',
    CMS_DB:{prepare(sql){assert.match(sql,/cms_publications/,'staged page must not enter full-document SQL');return{bind(){return{async first(){queries++;return row;}}}};}},
    CMS_MEDIA:{async get(){return{key,etag:'etag',version:'version',size:bytes.byteLength,checksums:{sha256},httpMetadata:{contentType:row.content_type},body:new ReadableStream({start(c){c.enqueue(bytes);c.close();}})};}},
    ASSETS:{async fetch(){assets++;return new Response('static asset');}},
  };
  return{env,body,counts:()=>({assets,queries})};
}

test('staged main HTML uses the prepared reader, never legacy SEO or static fallback',async()=>{
  const f=await fixture(),r=await main.fetch(new Request('https://fezguidetours.com/'),f.env);
  assert.equal(r.status,200);assert.equal(await r.text(),f.body);assert.deepEqual(f.counts(),{assets:0,queries:1});
  assert.equal(r.headers.get('X-Content-Type-Options'),'nosniff');assert.ok(r.headers.get('Content-Security-Policy'));
});

test('staged main canonicalizes only the exact www public alias before content reads',async()=>{
  const f=await fixture();
  const r=await main.fetch(new Request('https://www.fezguidetours.com/fr/tour?utm_source=test'),f.env);
  assert.equal(r.status,301);assert.equal(r.headers.get('Location'),'https://fezguidetours.com/fr/tour?utm_source=test');
  assert.deepEqual(f.counts(),{assets:0,queries:0});
  const wrong=await main.fetch(new Request('https://other.example/'),f.env);
  assert.equal(wrong.status,503);assert.equal(wrong.headers.get('Location'),null);
});

test('staged assets bypass document processing and a missing artifact never falls back to them',async()=>{
  const f=await fixture();
  const asset=await main.fetch(new Request('https://fezguidetours.com/assets/index.js'),f.env);
  assert.equal(asset.status,200);assert.equal(await asset.text(),'static asset');assert.deepEqual(f.counts(),{assets:1,queries:0});
  const manifest=await main.fetch(new Request('https://fezguidetours.com/manifest.json'),f.env);
  assert.equal(manifest.status,200);assert.equal(await manifest.text(),'static asset');assert.deepEqual(f.counts(),{assets:2,queries:0});
  f.env.CMS_MEDIA.get=async()=>null;
  assert.equal((await main.fetch(new Request('https://fezguidetours.com/'),f.env)).status,503);
  assert.deepEqual(f.counts(),{assets:2,queries:1});
});

test('legacy default keeps its static path and public rate denial runs before staged processing',async()=>{
  const f=await fixture();delete f.env.CMS_PROCESSING_MODE;delete f.env.CMS_DB;
  const legacy=await main.fetch(new Request('https://fezguidetours.com/'),f.env);
  assert.equal(await legacy.text(),'static asset');
  const limited=await fixture();limited.env.CMS_PUBLIC_RATE_LIMIT_REQUIRED='true';
  limited.env.CMS_PUBLIC_RATE_LIMITER={async limit(){return{success:false};}};
  const denied=await main.fetch(new Request('https://fezguidetours.com/'),limited.env);
  assert.equal(denied.status,429);assert.deepEqual(limited.counts(),{assets:0,queries:0});
});

test('candidate entry preserves prepared HTML and HEAD while adding only preview indexing protection',async()=>{
  const candidate=(await import('../worker/candidate-public.ts')).default;
  for(const method of ['GET','HEAD']) {
    const originalFixture=await fixture(),candidateFixture=await fixture();
    const request=()=>new Request('https://fezguidetours.com/',{method});
    const original=await main.fetch(request(),originalFixture.env);
    const preview=await candidate.fetch(request(),candidateFixture.env);
    assert.equal(original.status,200);assert.equal(preview.status,200);
    const expectedHeaders=new Headers(original.headers);
    assert.equal(expectedHeaders.get('X-Robots-Tag'),null);
    expectedHeaders.set('X-Robots-Tag','noindex, nofollow');
    assert.deepEqual([...preview.headers],[...expectedHeaders]);
    if(method==='HEAD')assert.equal(preview.body,null);
    assert.equal(await preview.text(),await original.text());
    assert.deepEqual(originalFixture.counts(),{assets:0,queries:1});
    assert.deepEqual(candidateFixture.counts(),{assets:0,queries:1});
  }
});
