import assert from 'node:assert/strict';
import { test } from 'node:test';
import { register } from 'tsx/esm/api';
register();

// The obsolete mock catalog/table contract is replaced by real SQLite coverage in
// cms-prepared-reader.test.mjs. This file retains the offline renderer comparison.
test('app root redirects to the editor without touching content storage',async()=>{
  const app=await import('../worker/app.ts');
  const response=await app.default.fetch(new Request('https://app.fezguidetours.com/'),{
    CMS_DB:{prepare(){throw new Error('root must not query content');}},
    CMS_MEDIA:{get(){throw new Error('root must not query objects');}},
  });
  assert.equal(response.status,302);
  assert.equal(new URL(response.headers.get('Location'),'https://app.fezguidetours.com').pathname,'/admin');
});

test('offline full-render reference retains every localized route without source mutation',async()=>{
  const {createCmsSeed}=await import('../src/cms/seed.ts');
  const {pageLocaleAvailable}=await import('../src/cms/render-utils.ts');
  const {publicCmsDocument}=await import('../worker/cms-routes.ts');
  const {preparePublicRelease}=await import('../worker/prepare-public.ts');
  const source=createCmsSeed(),before=JSON.stringify(source);
  const shell='<html lang="en"><head><title>old</title></head><body><div id="root"></div></body></html>';
  const prepared=preparePublicRelease({revision:15,origin:'https://fezguidetours.com',shell,document:source});
  const projected=publicCmsDocument(source);
  const expected=projected.pages.reduce((count,page)=>count+['en','fr','es'].filter(language=>pageLocaleAvailable(projected,page,language)).length,0);
  assert.equal(Object.keys(prepared.catalog.routes).length,expected);
  assert.equal(prepared.catalog.routes['/'].status,200);
  assert.match(prepared.objects[prepared.catalog.routes['/'].key],/id="cms-published-document"/);
  assert.equal(JSON.stringify(source),before);
  assert.equal(prepared.catalog.origin,'https://fezguidetours.com');
  // This synchronous reference is NOT a Worker preparation endpoint or live proof.
});
