// Complete LOCAL Miniflare snapshot. Not a Cloudflare production backup command.
import { cp, mkdir, readdir, readFile, stat, lstat, access, rename, rm, mkdtemp, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { lockState } from './cms-preview-state.mjs';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function rejectSymlinkComponents(input) {
 let current=path.resolve(input);
 for (;;) {
  try {if((await lstat(current)).isSymbolicLink())throw Error('Snapshot refuses symlinks in path ancestry');}
  catch(error){if(error.code!=='ENOENT')throw error;}
  const parent=path.dirname(current);if(parent===current)break;current=parent;
 }
}
async function inventory(root,prefix='') {
 const directory=await lstat(path.join(root,prefix));
 if(directory.isSymbolicLink()||!directory.isDirectory())throw Error('Snapshot refuses symlinks or non-directory roots');
 const rows=[];
 for(const entry of await readdir(path.join(root,prefix),{withFileTypes:true})) {
  const name=prefix?`${prefix}/${entry.name}`:entry.name,absolute=path.join(root,name);
  if(entry.isDirectory())rows.push(...await inventory(root,name));
  else if(entry.isFile()) {const bytes=await readFile(absolute);rows.push({path:name,bytes:bytes.byteLength,sha256:digest(bytes)});}
  else throw Error('Snapshot refuses symlinks or special files');
 }
 return rows.sort((a,b)=>a.path.localeCompare(b.path));
}
async function mustNotExist(target){try{await access(target);throw Error('Target already exists; restore only into a new isolated directory');}catch(e){if(e.code!=='ENOENT')throw e;}}
export async function backupLocalState(state,target){
 state=path.resolve(state);target=path.resolve(target);
 await rejectSymlinkComponents(state);await rejectSymlinkComponents(target);
 if(target===state||target.startsWith(state+path.sep)||state.startsWith(target+path.sep))throw Error('Backup and state must not overlap');
 const unlock=await lockState(state);let stage;
 try{
  await mustNotExist(target);if(!(await lstat(state)).isDirectory())throw Error('State is not a directory');
  await mkdir(path.dirname(target),{recursive:true});stage=await mkdtemp(target+'.partial-');
  const before=await inventory(state);if(!before.length)throw Error('Refusing empty state backup');
  await cp(state,path.join(stage,'state'),{recursive:true});const files=await inventory(path.join(stage,'state'));
  if(JSON.stringify(before)!==JSON.stringify(files)||JSON.stringify(before)!==JSON.stringify(await inventory(state)))throw Error('State changed during snapshot; stop all Wrangler processes first');
  await writeFile(path.join(stage,'manifest.json'),JSON.stringify({format:'fez-cms-local-snapshot-v1',createdAt:new Date().toISOString(),files},null,2),{mode:0o600});
  await rename(stage,target);stage=null;return {snapshot:target,files:files.length};
 }finally{if(stage)await rm(stage,{recursive:true,force:true});await unlock();}
}
export async function restoreLocalState(snapshot,target){
 snapshot=path.resolve(snapshot);target=path.resolve(target);
 await rejectSymlinkComponents(snapshot);await rejectSymlinkComponents(path.join(snapshot,'manifest.json'));await rejectSymlinkComponents(path.join(snapshot,'state'));await rejectSymlinkComponents(target);
 if(target===snapshot||target.startsWith(snapshot+path.sep)||snapshot.startsWith(target+path.sep))throw Error('Restore and snapshot must not overlap');
 const unlock=await lockState(target);let stage;
 try{
  await mustNotExist(target);
  const manifest=JSON.parse(await readFile(path.join(snapshot,'manifest.json'),'utf8'));
  if(manifest.format!=='fez-cms-local-snapshot-v1'||!Array.isArray(manifest.files)||!manifest.files.length)throw Error('Invalid snapshot manifest');
  for(const f of manifest.files)if(typeof f.path!=='string'||f.path.startsWith('/')||f.path.split('/').some(p=>!p||p==='.'||p==='..')||f.path.includes('\\')||!Number.isSafeInteger(f.bytes)||f.bytes<0||!/^[a-f0-9]{64}$/.test(f.sha256))throw Error('Invalid snapshot entry');
  const source=path.join(snapshot,'state');
  if(JSON.stringify(await inventory(source))!==JSON.stringify(manifest.files))throw Error('Snapshot bytes do not match manifest');
  await mkdir(path.dirname(target),{recursive:true});stage=await mkdtemp(target+'.partial-');
  await cp(source,path.join(stage,'state'),{recursive:true});
  if(JSON.stringify(await inventory(path.join(stage,'state')))!==JSON.stringify(manifest.files))throw Error('Restore copy failed verification');
  await rename(path.join(stage,'state'),target);
  return {restored:target,files:manifest.files.length,isolated:true};
 }finally{if(stage)await rm(stage,{recursive:true,force:true});await unlock();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){
 const [action,source,target,...extra]=process.argv.slice(2);
 if(!['backup','restore'].includes(action)||!source||!target||extra.length)throw Error('Usage: node scripts/cms-local-backup.mjs backup STOPPED_STATE NEW_SNAPSHOT | restore SNAPSHOT NEW_ISOLATED_STATE');
 console.log(JSON.stringify(await (action==='backup'?backupLocalState:restoreLocalState)(source,target)));
}
