import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,mkdir,writeFile,readFile,stat,rm,open,access,truncate,symlink} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {backupLocalState,restoreLocalState} from '../scripts/cms-local-backup.mjs';
import {lockState} from '../scripts/cms-preview-state.mjs';
async function fixture(run){const root=await mkdtemp(path.join(tmpdir(),'cms-step9-'));try{const state=path.join(root,'original');await mkdir(state,{mode:0o755});await mkdir(path.join(state,'nested'));await writeFile(path.join(state,'nested','private'),Buffer.from([0,1,2,255]),{mode:0o644});await run({root,state,snapshot:path.join(root,'snapshot'),target:path.join(root,'restore')});}finally{await rm(root,{recursive:true,force:true});}}
test('complete local snapshot and restored directories/files are private even from permissive source',()=>fixture(async f=>{
 await backupLocalState(f.state,f.snapshot);await restoreLocalState(f.snapshot,f.target);
 for(const name of [f.snapshot,path.join(f.snapshot,'state'),path.join(f.snapshot,'state/nested'),f.target,path.join(f.target,'nested')])assert.equal((await stat(name)).mode&0o777,0o700,name);
 for(const name of [path.join(f.snapshot,'manifest.json'),path.join(f.snapshot,'state/nested/private'),path.join(f.target,'nested/private')])assert.equal((await stat(name)).mode&0o777,0o600,name);
 assert.deepEqual(await readFile(path.join(f.target,'nested/private')),Buffer.from([0,1,2,255]));
}));
test('restore refuses snapshot state held by an active cooperative launcher',()=>fixture(async f=>{
 await backupLocalState(f.state,f.snapshot);const unlock=await lockState(path.join(f.snapshot,'state'));
 try{await assert.rejects(restoreLocalState(f.snapshot,f.target),/lock exists/);await assert.rejects(access(f.target),e=>e.code==='ENOENT');}finally{await unlock();}
}));
test('Linux and Darwin open state handles reject even when a native launcher did not acquire a lock',()=>fixture(async f=>{
 const handle=await open(path.join(f.state,'nested/private'),'r');try{await assert.rejects(backupLocalState(f.state,f.snapshot),/open state handle/i);await assert.rejects(access(f.snapshot),e=>e.code==='ENOENT');}finally{await handle.close();}
}));
test('uncooperative child handles block both backup and restore until the child stops',()=>fixture(async f=>{
 await backupLocalState(f.state,f.snapshot);
 for(const [state,target,operation] of [[f.state,path.join(f.root,'blocked-backup'),backupLocalState],[path.join(f.snapshot,'state'),f.target,()=>restoreLocalState(f.snapshot,f.target)]]){
  const child=spawn(process.execPath,['--input-type=module','-e',`import {open} from 'node:fs/promises';const fd=await open(process.argv[1],'r');console.log('ready');setInterval(()=>{},1000);`,path.join(state,'nested/private')],{stdio:['ignore','pipe','pipe']});
  try{await once(child.stdout,'data');await assert.rejects(operation(state,target),/open state handle/i);await assert.rejects(access(target),e=>e.code==='ENOENT');}
  finally{const ended=once(child,'exit');child.kill();await ended;}
 }
 await restoreLocalState(f.snapshot,f.target);
}));
test('Darwin lsof failures, diagnostics, malformed and empty scans fail closed',{skip:process.platform!=='darwin'},()=>fixture(async f=>{
 for(const [stdout,stderr,error] of [['','','missing'],['','warning',null],['','',''],['garbage\\0','',null]]){
  const code=`import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';cp.execFile=(file,args,options,callback)=>{callback(${error?'new Error("unavailable")':'null'},{stdout:${JSON.stringify(stdout)},stderr:${JSON.stringify(stderr)}});};syncBuiltinESMExports();const {backupLocalState}=await import('./scripts/cms-local-backup.mjs');try{await backupLocalState(process.argv[1],process.argv[2]);process.exitCode=2;}catch(e){if(!/verification unavailable|verification ambiguous|Ambiguous lsof/.test(e.message))throw e;}`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',code,f.state,f.snapshot],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);await assert.rejects(access(f.snapshot),e=>e.code==='ENOENT');
 }
}));
test('snapshot byte ceiling rejects a sparse oversized file before hashing or creating a destination',()=>fixture(async f=>{
 // No file contents are allocated by truncate. The implementation must reject before reading.
 await truncate(path.join(f.state,'nested/private'),3*1024*1024*1024);
 await assert.rejects(backupLocalState(f.state,f.snapshot),/snapshot size limit/i);await assert.rejects(access(f.snapshot),e=>e.code==='ENOENT');
}));
test('empty directories and dot-copy names survive exact isolated restore',()=>fixture(async f=>{
 await mkdir(path.join(f.state,'empty'));await mkdir(path.join(f.state,'.copy'));await writeFile(path.join(f.state,'.copy','data'),'private');
 await backupLocalState(f.state,f.snapshot);await restoreLocalState(f.snapshot,f.target);assert.equal((await stat(path.join(f.target,'empty'))).isDirectory(),true);assert.equal(await readFile(path.join(f.target,'.copy/data'),'utf8'),'private');
}));
test('legacy v1 snapshot still restores exact file bytes with private permissions',()=>fixture(async f=>{
 await backupLocalState(f.state,f.snapshot);const file=path.join(f.snapshot,'manifest.json'),manifest=JSON.parse(await readFile(file,'utf8'));manifest.format='fez-cms-local-snapshot-v1';delete manifest.directories;await writeFile(file,JSON.stringify(manifest));await restoreLocalState(f.snapshot,f.target);assert.deepEqual(await readFile(path.join(f.target,'nested/private')),Buffer.from([0,1,2,255]));
}));
test('invalid manifest paths, duplicate rows and unlisted files never create a restore destination',()=>fixture(async f=>{
 await backupLocalState(f.state,f.snapshot);const file=path.join(f.snapshot,'manifest.json'),original=JSON.parse(await readFile(file,'utf8'));
 for(const mutate of [m=>m.files.push(m.files[0]),m=>m.files[0].path='../outside',m=>m.directories.push(m.files[0].path)]){
  const manifest=structuredClone(original);mutate(manifest);await writeFile(file,JSON.stringify(manifest));await assert.rejects(restoreLocalState(f.snapshot,f.target),/Invalid snapshot/);await assert.rejects(access(f.target),e=>e.code==='ENOENT');
 }
 await writeFile(file,JSON.stringify(original));await writeFile(path.join(f.snapshot,'state','unlisted'),'tampered');await assert.rejects(restoreLocalState(f.snapshot,f.target),/manifest/);await assert.rejects(access(f.target),e=>e.code==='ENOENT');
}));
test('simultaneous backups cannot replace an existing snapshot or original state',()=>fixture(async f=>{
 const outcomes=await Promise.allSettled([backupLocalState(f.state,f.snapshot),backupLocalState(f.state,f.snapshot)]);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);await restoreLocalState(f.snapshot,f.target);assert.deepEqual(await readFile(path.join(f.state,'nested/private')),await readFile(path.join(f.target,'nested/private')));
}));
test('symlink manifest and oversize manifest are rejected before a restore destination exists',()=>fixture(async f=>{
 await backupLocalState(f.state,f.snapshot);const file=path.join(f.snapshot,'manifest.json');await truncate(file,8*1024*1024+1);await assert.rejects(restoreLocalState(f.snapshot,f.target),/Invalid snapshot manifest/);await assert.rejects(access(f.target),e=>e.code==='ENOENT');await rm(file);await symlink(path.join(f.state,'nested/private'),file);await assert.rejects(restoreLocalState(f.snapshot,f.target),/symlinks/);
}));
