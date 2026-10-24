import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

// Exercise the actual private function without exporting a production test hook.
const source=await readFile(new URL('../scripts/cms-local-backup.mjs',import.meta.url),'utf8');
const body=source.slice(source.indexOf('async function rejectOpenStateHandles('),source.indexOf('async function fileDigest('));
assert.ok(body.startsWith('async function rejectOpenStateHandles('));
const invoke=new Function('process','open','constants','execFileAsync','fail','path',`return (${body})('/state');`);
const control='p42\0f7\0n/state\0\n';
async function scan(stdout){
 let closed=0;
 try{return await invoke({platform:'darwin',pid:42,getuid:()=>501},async()=>({fd:7,close:async()=>{closed++;}}),{O_RDONLY:0,O_NOFOLLOW:1},async()=>({stdout,stderr:''}),message=>{throw Error(message);},path);}
 finally{assert.equal(closed,1,'control descriptor must always close');}
}

test('Darwin lsof rejects malformed sets after a visible positive control',async()=>{
 await scan(control);
 await scan(control+'p123\0fcwd\0n/unrelated\0ftxt\0n/bin/tool\0ftwd\0n/thread-dir\0\n');
 await scan(control+'p123\0f4\0n\0\n'); // Real lsof emits empty names for unnamed descriptors.
 for(const [name,tail] of [
  ['empty descriptor','p123\0f\0n/unrelated\0\n'],
  ['descriptor without name','p123\0f4\0\n'],
  ['process without files','p123\0\n'],
  ['unknown descriptor','p123\0fgarbage\0n/unrelated\0\n'],
  ['duplicate name','p123\0f4\0n/unrelated\0n/other\0\n'],
  ['unterminated name','p123\0f4\0n/unrelated'],
  ['new file before prior name','p123\0f4\0f5\0n/unrelated\0\n'],
  ['new process before prior name','p123\0f4\0p124\0f5\0n/unrelated\0\n'],
  ['invalid process','p0\0f4\0n/unrelated\0\n'],
 ])await assert.rejects(scan(control+tail),/Ambiguous lsof/,name);
});
