// Complete STOPPED LOCAL Miniflare state. Never a Cloudflare production backup command.
import {mkdir,readdir,readFile,lstat,access,rm,writeFile,open,readlink,statfs,realpath} from 'node:fs/promises';
import {constants} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const execFileAsync=promisify(execFile);
import {createHash} from 'node:crypto';
import path from 'node:path';
import {lockState} from './cms-preview-state.mjs';
const MAX_BYTES=2*1024*1024*1024,MAX_ENTRIES=100000,MAX_MANIFEST=8*1024*1024;
const PRIVATE_DIRECTORY=0o700,PRIVATE_FILE=0o600;
const fail=message=>{throw Error(message);};
async function rejectSymlinkComponents(input){
 for(let current=path.resolve(input);;current=path.dirname(current)){
  if(process.platform==='darwin'&&['/var','/tmp','/etc'].includes(current)){
   if(current===path.dirname(current))break;
   continue;
  }
  try{if((await lstat(current)).isSymbolicLink())fail('Snapshot refuses symlinks in path ancestry');}catch(e){if(e.code!=='ENOENT')throw e;}
  if(current===path.dirname(current))break;
 }
}
async function mustNotExist(target){try{await access(target);fail('Target already exists; restore only into a new isolated directory');}catch(e){if(e.code!=='ENOENT')throw e;}}
function distinct(source,target){if(source===target||target.startsWith(source+path.sep)||source.startsWith(target+path.sep))fail('Backup/restore paths must not overlap');}
// Cooperative launcher locks and an operator-stopped runtime remain mandatory.
// /proc is an additional BEST-EFFORT check: Linux can deny same-UID non-dumpable
// processes. It cannot establish global quiescence and is never a live-snapshot guarantee.
async function rejectOpenStateHandles(state){
 if(process.platform==='darwin'){
  try{state=await realpath(state);}catch{}
  // A visible self-held directory FD is a positive control: empty/partial scans
  // cannot silently establish stopped state. No shell, PATH lookup or sudo.
  const control=await open(state,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{
   let result;try{result=await execFileAsync('/usr/sbin/lsof',['-nP','-a','-u',String(process.getuid()),'-F0pfn'],{encoding:'utf8',timeout:15000,maxBuffer:16*1024*1024});}
   catch{fail('Stopped-state open-handle verification unavailable (lsof)');}
   if(result.stderr)fail('Stopped-state open-handle verification ambiguous (lsof diagnostics)');
   if(!/\0\n?$/.test(result.stdout))fail('Ambiguous lsof field termination');
   let pid,fd,named=false,visible=false;
   for(const field of result.stdout.split('\0')){
    const record=field.replace(/^\n/,'');
    if(record.startsWith('p')){
     if((pid!==undefined&&(fd===undefined||!named))||!/^p[1-9]\d*$/.test(record))fail('Ambiguous lsof process record');
     pid=Number(record.slice(1));if(!Number.isSafeInteger(pid))fail('Ambiguous lsof process record');fd=undefined;
    }
    else if(record.startsWith('f')){
     // -F f excludes access flags. Unknown/error FD types are unverifiable.
     if(!pid||(fd!==undefined&&!named)||!/^f(?:\d+|cwd|twd|rtd|txt|ltx|mem|mmap|pd|jld|tr|m86|v86|L\d+|M[\da-fA-F]+)$/.test(record))fail('Ambiguous lsof descriptor record');
     fd=record.slice(1);named=false;
    }
    else if(record.startsWith('n')){
     if(!pid||fd===undefined||named)fail('Ambiguous lsof name record');named=true;
     const file=record.slice(1).replace(/ \(deleted\)$/,'');
     if(pid===process.pid&&fd===String(control.fd)&&file===state){visible=true;continue;}
     if(file===state||file.startsWith(state+path.sep))fail('Open state handle detected; stop all native runtimes before backup/restore');
    }else if(record!=='')fail('Ambiguous lsof output');
   }
   if(fd===undefined||!named)fail('Ambiguous lsof incomplete file set');
   if(!visible)fail('Stopped-state open-handle verification unavailable (missing lsof control)');
  }finally{await control.close();}
  return;
 }
 if(process.platform!=='linux')fail('Stopped-state open-handle verification requires Linux or Darwin');
 for(const pid of await readdir('/proc')){
  if(!/^\d+$/.test(pid))continue;
  const processInfo=await lstat(`/proc/${pid}`).catch(e=>{if(['ENOENT','ESRCH'].includes(e.code))return null;throw e;});
  if(!processInfo||processInfo.uid!==process.getuid())continue;
  let fds;try{fds=await readdir(`/proc/${pid}/fd`);}catch(e){if(['ENOENT','ESRCH'].includes(e.code)||(['EACCES','EPERM'].includes(e.code)&&Number(pid)!==process.pid))continue;throw e;}
  for(const fd of fds){let file;try{file=await readlink(`/proc/${pid}/fd/${fd}`);}catch(e){if(['ENOENT','ESRCH','EACCES','EPERM'].includes(e.code))continue;throw e;}
   file=file.replace(/ \(deleted\)$/,'');if(file===state||file.startsWith(state+path.sep))fail('Open state handle detected; stop all native runtimes before backup/restore');
  }
 }
}
async function fileDigest(file){
 const fd=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{const info=await fd.stat();if(!info.isFile()||info.size>MAX_BYTES)fail('Snapshot size limit or non-regular file');
  const hash=createHash('sha256');let bytes=0;
  for await(const chunk of fd.createReadStream({autoClose:false,highWaterMark:65536})){bytes+=chunk.length;if(bytes>MAX_BYTES)fail('Snapshot size limit');hash.update(chunk);}
  const after=await fd.stat();if(bytes!==info.size||after.size!==info.size||after.mtimeMs!==info.mtimeMs||after.ctimeMs!==info.ctimeMs)fail('State changed during snapshot');
  return{bytes,sha256:hash.digest('hex')};
 }finally{await fd.close();}
}
async function inventory(root){
 const files=[],directories=[];let total=0;
 async function visit(prefix){const directory=await lstat(path.join(root,prefix));if(directory.isSymbolicLink()||!directory.isDirectory())fail('Snapshot refuses symlinks or non-directory roots');
  if(prefix)directories.push(prefix);
  for(const entry of await readdir(path.join(root,prefix),{withFileTypes:true})){
   const name=prefix?`${prefix}/${entry.name}`:entry.name;if(name.length>4096||name.split('/').length>128||files.length+directories.length>=MAX_ENTRIES)fail('Snapshot entry limit');
   if(entry.isDirectory())await visit(name);
   else if(entry.isFile()){const size=(await lstat(path.join(root,name))).size;total+=size;if(total>MAX_BYTES)fail('Snapshot size limit');files.push({path:name,...await fileDigest(path.join(root,name))});}
   else fail('Snapshot refuses symlinks or special files');
  }
 }
 await visit('');return{files:files.sort((a,b)=>a.path.localeCompare(b.path)),directories:directories.sort((a,b)=>a.localeCompare(b))};
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function relative(name){return typeof name==='string'&&name.length>0&&name.length<=4096&&!name.startsWith('/')&&!name.includes('\\')&&name.split('/').length<=128&&!name.split('/').some(p=>!p||p==='.'||p==='..');}
function validateManifest(value){
 if(!value||!['fez-cms-local-snapshot-v1','fez-cms-local-snapshot-v2'].includes(value.format)||!Array.isArray(value.files)||!value.files.length||value.files.length>MAX_ENTRIES)fail('Invalid snapshot manifest');
 const directories=value.format.endsWith('v2')?value.directories:[];
 if(!Array.isArray(directories)||directories.length+value.files.length>MAX_ENTRIES)fail('Invalid snapshot manifest');
 const names=new Set();let bytes=0;
 for(const f of value.files){if(!f||Object.keys(f).sort().join(',')!=='bytes,path,sha256'||!relative(f.path)||names.has(f.path)||!Number.isSafeInteger(f.bytes)||f.bytes<0||!/^[a-f0-9]{64}$/.test(f.sha256))fail('Invalid snapshot entry');names.add(f.path);bytes+=f.bytes;}
 for(const name of directories){if(!relative(name)||names.has(name))fail('Invalid snapshot directory');names.add(name);}
 const fileNames=new Set(value.files.map(f=>f.path));
 for(const name of names){let parent=path.posix.dirname(name);while(parent!=='.'){if(fileNames.has(parent))fail('Invalid snapshot file/directory collision');parent=path.posix.dirname(parent);}}
 if(bytes>MAX_BYTES)fail('Snapshot size limit');return{files:value.files,directories};
}
async function capacity(parent,contents){const info=await statfs(parent,{bigint:true});
 const block=info.bsize,required=contents.files.reduce((n,f)=>n+((BigInt(f.bytes)+block-1n)/block)*block,0n)+BigInt(contents.directories.length)*block+BigInt(MAX_MANIFEST+64*1024*1024);
 if(info.bavail*block<required)fail('Insufficient disk space for a verified snapshot copy');
}
async function copyPrivate(source,target,contents,existingExclusiveRoot=false){
 if(!existingExclusiveRoot)await mkdir(target,{mode:PRIVATE_DIRECTORY});
 const directories=new Set(contents.directories);
 for(const file of contents.files){let directory=path.posix.dirname(file.path);while(directory!=='.'){directories.add(directory);directory=path.posix.dirname(directory);}}
 for(const directory of [...directories].sort((a,b)=>a.split('/').length-b.split('/').length))await mkdir(path.join(target,directory),{mode:PRIVATE_DIRECTORY});
 for(const file of contents.files){const input=await open(path.join(source,file.path),constants.O_RDONLY|constants.O_NOFOLLOW);let output;
  try{if(!(await input.stat()).isFile())fail('Snapshot refuses special files');output=await open(path.join(target,file.path),constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,PRIVATE_FILE);
   let count=0;const hash=createHash('sha256');
   for await(const chunk of input.createReadStream({autoClose:false,highWaterMark:65536})){count+=chunk.length;if(count>file.bytes)fail('State changed during snapshot');hash.update(chunk);await output.writeFile(chunk);}
   if(count!==file.bytes||hash.digest('hex')!==file.sha256)fail('State changed during snapshot');await output.sync();
  }finally{await output?.close();await input.close();}
 }
}
export async function backupLocalState(state,target){
 state=path.resolve(state);target=path.resolve(target);distinct(state,target);await rejectSymlinkComponents(state);await rejectSymlinkComponents(target);
 const unlock=await lockState(state);let unlockTarget,created=false,complete=false;
 try{unlockTarget=await lockState(target);await mustNotExist(target);await rejectOpenStateHandles(state);
  const before=await inventory(state);if(!before.files.length)fail('Refusing empty state backup');await capacity(path.dirname(target),before);
  await mkdir(target,{mode:PRIVATE_DIRECTORY});created=true;await copyPrivate(state,path.join(target,'state'),before);
  const files=await inventory(path.join(target,'state'));if(!same(before,files)||!same(before,await inventory(state)))fail('State changed during snapshot; stop all Wrangler processes first');await rejectOpenStateHandles(state);
  const manifest=JSON.stringify({format:'fez-cms-local-snapshot-v2',createdAt:new Date().toISOString(),...files},null,2);if(Buffer.byteLength(manifest)>MAX_MANIFEST)fail('Snapshot manifest limit');
  await writeFile(path.join(target,'manifest.json'),manifest,{mode:PRIVATE_FILE,flag:'wx'});complete=true;return{snapshot:target,files:files.files.length,verified:true,localOnly:true};
 }finally{if(created&&!complete)await rm(target,{recursive:true,force:true});await unlockTarget?.();await unlock();}
}
export async function restoreLocalState(snapshot,target){
 snapshot=path.resolve(snapshot);target=path.resolve(target);distinct(snapshot,target);await rejectSymlinkComponents(snapshot);await rejectSymlinkComponents(target);await rejectSymlinkComponents(path.join(snapshot,'manifest.json'));await rejectSymlinkComponents(path.join(snapshot,'state'));
 const unlockSource=await lockState(path.join(snapshot,'state'));let unlockTarget,created=false,complete=false;
 try{unlockTarget=await lockState(target);await mustNotExist(target);await rejectOpenStateHandles(path.join(snapshot,'state'));
  const file=await open(path.join(snapshot,'manifest.json'),constants.O_RDONLY|constants.O_NOFOLLOW);let manifest;
  try{if(!(await file.stat()).isFile()||(await file.stat()).size>MAX_MANIFEST)fail('Invalid snapshot manifest');      const pieces=[];let bytes=0;for await(const chunk of file.createReadStream({autoClose:false,highWaterMark:65536})){bytes+=chunk.length;if(bytes>MAX_MANIFEST)fail('Invalid snapshot manifest');pieces.push(chunk);}manifest=JSON.parse(Buffer.concat(pieces,bytes).toString('utf8'));}finally{await file.close();}
  const contents=validateManifest(manifest),before=await inventory(path.join(snapshot,'state'));
  if(!same(before.files,contents.files)||(manifest.format.endsWith('v2')&&!same(before.directories,contents.directories)))fail('Snapshot bytes do not match manifest');await capacity(path.dirname(target),before);
  // Exclusive directory creation cannot replace a destination created by another caller.
  await mkdir(target,{mode:PRIVATE_DIRECTORY});created=true;
  await copyPrivate(path.join(snapshot,'state'),target,before,true);
  if(!same(await inventory(target),before)||!same(await inventory(path.join(snapshot,'state')),before))fail('Restore copy failed verification');await rejectOpenStateHandles(path.join(snapshot,'state'));
  complete=true;return{restored:target,files:before.files.length,isolated:true,verified:true,localOnly:true};
 }finally{if(created&&!complete)await rm(target,{recursive:true,force:true});await unlockTarget?.();await unlockSource();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){
 const [action,source,target,...extra]=process.argv.slice(2);if(!['backup','restore'].includes(action)||!source||!target||extra.length)fail('Usage: node scripts/cms-local-backup.mjs backup STOPPED_STATE NEW_SNAPSHOT | restore SNAPSHOT NEW_ISOLATED_STATE');
 console.log(JSON.stringify(await(action==='backup'?backupLocalState:restoreLocalState)(source,target)));
}
