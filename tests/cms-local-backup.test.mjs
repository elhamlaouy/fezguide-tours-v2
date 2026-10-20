import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, readFile, rm, access, symlink } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { backupLocalState,restoreLocalState } from '../scripts/cms-local-backup.mjs';
import { lockState } from '../scripts/cms-preview-state.mjs';
const scratch=tmpdir();
test('symlink snapshot roots and destination ancestors reject without touching owner state', async () => {
 const root=await mkdtemp(path.join(scratch,'cms-backup-ancestry-')),owner=path.join(root,'owner'),snapshot=path.join(root,'snapshot'),ownerAlias=path.join(root,'owner-alias'),snapshotAlias=path.join(root,'snapshot-alias');
 try {
  await mkdir(owner);await writeFile(path.join(owner,'original'),Buffer.from([4,5,6]));await backupLocalState(owner,snapshot);
  await symlink(owner,ownerAlias);await symlink(snapshot,snapshotAlias);
  await assert.rejects(restoreLocalState(snapshot,path.join(ownerAlias,'supposed-isolated')),/symlinks/);
  await assert.rejects(access(path.join(owner,'supposed-isolated')),error=>error.code==='ENOENT');
  await assert.rejects(restoreLocalState(snapshotAlias,path.join(root,'new-state')),/symlinks/);
  await assert.rejects(access(path.join(root,'new-state')),error=>error.code==='ENOENT');
  assert.deepEqual(await readFile(path.join(owner,'original')),Buffer.from([4,5,6]));
 } finally {await rm(root,{recursive:true,force:true});}
});

test('snapshot state root symlinks cannot produce a restore alias', async () => {
 const root=await mkdtemp(path.join(scratch,'cms-backup-root-')),state=path.join(root,'state'),snapshot=path.join(root,'snapshot'),target=path.join(root,'restore');
 try {
  await mkdir(state);await writeFile(path.join(state,'original'),Buffer.from([1,2,3]));
  await backupLocalState(state,snapshot);
  await rm(path.join(snapshot,'state'),{recursive:true});
  await symlink(state,path.join(snapshot,'state'));
  await assert.rejects(restoreLocalState(snapshot,target),/symlinks/);
  await assert.rejects(access(target),error=>error.code==='ENOENT');
  assert.deepEqual(await readFile(path.join(state,'original')),Buffer.from([1,2,3]));
 } finally {await rm(root,{recursive:true,force:true});}
});

test('local snapshot refuses live/overlapping state, verifies bytes, and corrupt restore leaves no destination',async()=>{
 const root=await mkdtemp(path.join(scratch,'cms-backup-test-')),state=path.join(root,'state'),snapshot=path.join(root,'snapshot'),restored=path.join(root,'restore');
 try{
  await mkdir(state);await writeFile(path.join(state,'sqlite-real-placeholder-bytes'),new Uint8Array([1,2,3]));
  const unlock=await lockState(state);
  await assert.rejects(backupLocalState(state,snapshot),/lock exists/);await unlock();
  await assert.rejects(backupLocalState(state,path.join(state,'nested')),/overlap/);
  const result=await backupLocalState(state,snapshot);assert.equal(result.files,1);
  await restoreLocalState(snapshot,restored);assert.deepEqual(await readFile(path.join(restored,'sqlite-real-placeholder-bytes')),Buffer.from([1,2,3]));
  await assert.rejects(restoreLocalState(snapshot,restored),/already exists/);
  await writeFile(path.join(snapshot,'state/sqlite-real-placeholder-bytes'),new Uint8Array([4]));
  const failed=path.join(root,'failed');await assert.rejects(restoreLocalState(snapshot,failed),/manifest/);await assert.rejects(access(failed),e=>e.code==='ENOENT');
  await symlink('/etc/hosts',path.join(state,'unsafe-link'));await assert.rejects(backupLocalState(state,path.join(root,'bad-snapshot')),/symlinks/);
 }finally{await rm(root,{recursive:true,force:true});}
});
