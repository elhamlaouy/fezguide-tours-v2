// Exercise the actual Cloudflare rate-limit binding in isolated local workerd, not a Map/stub.
import assert from 'node:assert/strict';
import { unstable_dev } from 'wrangler';
const worker = await unstable_dev('worker/index.ts', {config:'wrangler.toml',local:true,persist:false,ip:'127.0.0.1',port:9396,inspectorPort:9697,logLevel:'error',vars:{CMS_PUBLIC_RATE_LIMIT_REQUIRED:'true'},experimental:{disableExperimentalWarning:true,disableDevRegistry:true,watch:false}});
try {
  const statuses=[];
  for(let index=0;index<601;index++) {
    const response=await worker.fetch('/api/rate-proof-nonexistent');
    statuses.push(response.status);
    if(index<600)assert.equal(response.status,404,`admitted request ${index+1}`);
    else {assert.equal(response.status,429);assert.equal(response.headers.get('Retry-After'),'60');assert.deepEqual(await response.json(),{error:'cms_public_rate'});}
  }
  const staticAsset=await worker.fetch('/favicon.svg');assert.equal(staticAsset.status,200);assert.match(staticAsset.headers.get('Content-Type'),/image\/svg/);
  console.log(JSON.stringify({runtime:'isolated local Cloudflare workerd',binding:'CMS_PUBLIC_RATE_LIMITER',allowed:statuses.filter(s=>s===404).length,blocked:statuses.filter(s=>s===429).length,assetBypass:true,productionWrites:false,ownerStateUntouched:true,limitation:'counter is per Cloudflare location; emulator does not prove deployed multi-location enforcement or a global spend cap'}));
} finally {await worker.stop();}
