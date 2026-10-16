// Real public CMS path, disposable D1/R2 state, default Lighthouse mobile settings. No owner state.
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { startPreview } from './cms-preview.mjs';
const scratch=process.env.TMPDIR;
if(!scratch)throw Error('TMPDIR required');
const state=await mkdtemp(path.join(scratch,'cms-performance-state-'));
let preview;
try {
  preview=await startPreview({port:9296,upstream:9297,inspector:9597,state});
  const response=await fetch(preview.url+'/api/admin/content');assert.equal(response.status,200);
  const html=await (await fetch(preview.url+'/')).text();assert.ok(html.includes('cms-published-document'));
  const output=path.join(scratch,'fez-continued-lighthouse.json');
  const child=spawn(process.execPath,['/home/ubuntu/.npm/_npx/ffe2131771d88588/node_modules/lighthouse/cli/index.js',preview.url+'/', '--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage --disable-gpu', '--only-categories=performance,accessibility,best-practices,seo','--output=json','--output-path='+output,'--quiet'],{env:{...process.env,CHROME_PATH:'/home/ubuntu/.cache/ms-playwright/chromium-1248/chrome-linux-arm64/chrome'},stdio:'inherit'});
  const code=await new Promise((resolve,reject)=>{child.once('exit',resolve);child.once('error',reject);});assert.equal(code,0);
  const report=JSON.parse(await readFile(output,'utf8'));
  console.log(JSON.stringify({report:output,scores:Object.fromEntries(Object.entries(report.categories).map(([k,v])=>[k,v.score*100])),metrics:Object.fromEntries(['largest-contentful-paint','total-blocking-time','cumulative-layout-shift','first-contentful-paint'].map(key=>[key,report.audits[key].numericValue]))},null,2));
} finally { if(preview)await preview.close();await rm(state,{recursive:true,force:true}); }
