import test from 'node:test';
import assert from 'node:assert/strict';
import {access, readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {wranglerPath} from '../scripts/cms-preview.mjs';

const require=createRequire(import.meta.url);
async function withOverride(value,run) {
 const previous=process.env.CMS_PREVIEW_WRANGLER;
 if(value===undefined)delete process.env.CMS_PREVIEW_WRANGLER;
 else process.env.CMS_PREVIEW_WRANGLER=value;
 try {await run();}finally {
  if(previous===undefined)delete process.env.CMS_PREVIEW_WRANGLER;
  else process.env.CMS_PREVIEW_WRANGLER=previous;
 }
}

test('default resolves installed project-locked Wrangler and executes without an override',async()=>{
 await withOverride(undefined,async()=>{
  const manifest=require.resolve('wrangler/package.json');
  const pkg=JSON.parse(await readFile(manifest,'utf8'));
  const lock=JSON.parse(await readFile(new URL('../package-lock.json',import.meta.url),'utf8'));
  assert.equal(pkg.version,lock.packages['node_modules/wrangler'].version);
  const executable=await wranglerPath();
  assert.equal(executable,path.join(path.dirname(manifest),'bin/wrangler.js'));
  await access(executable);
  const output=execFileSync(process.execPath,[executable,'--version'],{
   encoding:'utf8',timeout:30000,
   env:{...process.env,CI:'1',WRANGLER_SEND_METRICS:'false'},
  });
  assert.match(output,new RegExp(pkg.version.replaceAll('.','\\.')));
 });
});

test('explicit valid override is returned unchanged',async()=>{
 const executable=require.resolve('wrangler/package.json');
 await withOverride(executable,async()=>assert.equal(await wranglerPath(),executable));
});

test('missing explicit override fails instead of falling back or installing',async()=>{
 const missing=path.join(import.meta.dirname,'__missing_wrangler_binary__.js');
 await withOverride(missing,async()=>{
  await assert.rejects(wranglerPath(),error=>error.code==='ENOENT'&&error.path===missing);
 });
});
