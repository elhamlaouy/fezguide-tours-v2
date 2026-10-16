import assert from 'node:assert/strict';
import { test } from 'node:test';
test('preview trust boundary rejects rebinding, remote clients, cross-site reads and missing-origin writes',async()=>{
 const {previewRequestAllowed}=await import('../scripts/cms-preview.mjs');
 const request=(headers={},method='GET',remoteAddress='127.0.0.1',url='/admin')=>({headers:{host:'127.0.0.1:9196',...headers},method,socket:{remoteAddress},url});
 assert.equal(previewRequestAllowed(request(),9196),true);
 assert.equal(previewRequestAllowed(request({host:'evil.test:9196'}),9196),false);
 assert.equal(previewRequestAllowed(request({},'GET','192.168.1.1'),9196),false);
 assert.equal(previewRequestAllowed(request({'sec-fetch-site':'cross-site'}),9196),false);
 assert.equal(previewRequestAllowed(request({origin:'http://evil.test'}),9196),false);
 assert.equal(previewRequestAllowed(request({},'POST'),9196),false);
 assert.equal(previewRequestAllowed(request({origin:'http://127.0.0.1:9196'},'PUT'),9196),true);
 assert.equal(previewRequestAllowed(request({},'GET','127.0.0.1','http://evil.test/admin'),9196),false);
 const previous=process.env.CMS_PREVIEW_BROWSER_ORIGINS;
 try {
  process.env.CMS_PREVIEW_BROWSER_ORIGINS='http://127.0.0.1:64838';
  assert.equal(previewRequestAllowed(request({host:'127.0.0.1:64838',origin:'http://127.0.0.1:64838'},'POST'),9196),true);
  assert.equal(previewRequestAllowed(request({host:'127.0.0.1:64839'}),9196),false);
  assert.equal(previewRequestAllowed(request({host:'127.0.0.1:64838','sec-fetch-site':'cross-site'}),9196),false);
  assert.equal(previewRequestAllowed(request({host:'127.0.0.1:64838',origin:'https://evil.test'},'POST'),9196),false);
  process.env.CMS_PREVIEW_BROWSER_ORIGINS='http://evil.test:64838';
  assert.equal(previewRequestAllowed(request(),9196),false);
 }finally{if(previous===undefined)delete process.env.CMS_PREVIEW_BROWSER_ORIGINS;else process.env.CMS_PREVIEW_BROWSER_ORIGINS=previous;}

});
