import { open, mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
export async function lockState(state) {
 const file = `${state}.lock`;
 await mkdir(path.dirname(file), {recursive:true});
 let lock;
 try { lock=await open(file,'wx',0o600); }
 catch(error) {
  if(error.code!=='EEXIST')throw error;
  const pid=await readFile(file,'utf8');
  // Fail closed even for a stale lock. Automatically unlinking stale locks races a
  // second launcher; remove it manually only after confirming the PID has exited.
  throw Error(`Preview state lock exists (${file}, PID ${pid}). Stop its launcher before backup/restore; inspect a stale PID before removing the lock.`);
 }
 await lock.writeFile(String(process.pid)); await lock.close();
 return ()=>rm(file,{force:true});
}
