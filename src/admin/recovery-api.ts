import {AdminApiError,type AdminWriteResult} from './admin-api';
import {CMS_LIMITS,type CmsDocument} from '../cms/schema';
import {splitCmsDocument} from '../cms/document-parts';
import {parseEditorImport} from '../cms/editor-controls';
const MAGIC=new TextEncoder().encode('FEZCMS2\n'),HEADER_LIMIT=1048576,FILE_LIMIT=8*1024*1024,TOTAL_LIMIT=282*1024*1024;
const KEY=/^upload-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpg|png|webp)$/;
function fail(code='backup_integrity'):never {throw new Error(code);}
export type RecoveryProgress=(message:string)=>void;
type Source={version:number;draftRevision:number|null;publishedRevision:number|null;origin:string};
export type BackupEntry={type:'revision'|'media';offset:number;bytes:number;digest:string;version?:number;kind?:string;actor?:string;created_at?:string;source_revision?:number|null;key?:string;contentType?:string};
type Header={format:'fez-cms-portable-v2';source:Source;entries:BackupEntry[]};
type InputEntry=Omit<BackupEntry,'offset'|'bytes'|'digest'>&{blob:Blob};
const hash=async(value:Blob)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await value.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
export async function packBackup(source:Source,input:InputEntry[]):Promise<Blob>{
 let offset=0;const entries:BackupEntry[]=[];for(const {blob,...meta}of input){if(blob.size>(meta.type==='revision'?CMS_LIMITS.bytes:FILE_LIMIT))fail();entries.push({...meta,offset,bytes:blob.size,digest:await hash(blob)});offset+=blob.size;if(offset>TOTAL_LIMIT)fail();}
 const header=new TextEncoder().encode(JSON.stringify({format:'fez-cms-portable-v2',source,entries}));if(header.length>HEADER_LIMIT)fail();const length=new Uint8Array(4);new DataView(length.buffer).setUint32(0,header.length);
 const result=new Blob([MAGIC,length,header,...input.map(e=>e.blob)],{type:'application/octet-stream'});await openBackup(result);return result;
}
export async function openBackup(file:Blob,onProgress?:RecoveryProgress){
 if(file.size> TOTAL_LIMIT+HEADER_LIMIT+12||file.size<12)fail();const prefix=new Uint8Array(await file.slice(0,12).arrayBuffer());if(MAGIC.some((b,i)=>prefix[i]!==b))fail();const length=new DataView(prefix.buffer).getUint32(8);if(length<1||length>HEADER_LIMIT||12+length>file.size)fail();
 const headerBlob=file.slice(12,12+length);let header:Header;try{header=JSON.parse(await headerBlob.text()) as Header;}catch{return fail();}
 if(header.format!=='fez-cms-portable-v2'||!header.source||!Number.isSafeInteger(header.source.version)||header.source.version<0||header.source.version>1000||typeof header.source.origin!=='string'||!/^https:\/\/[^/]+$/.test(header.source.origin)||!Array.isArray(header.entries)||header.entries.length>1500)fail();
 const versions=new Set<number>(),keys=new Set<string>();let offset=0,documentBytes=0,mediaBytes=0;
 for(const e of header.entries){
  if(!e||!Number.isSafeInteger(e.bytes)||e.bytes<1||e.offset!==offset||!Number.isSafeInteger(e.offset)||!/^([a-f0-9]{64})$/.test(e.digest))fail();
  if(e.type==='revision'){if(e.bytes>CMS_LIMITS.bytes||!Number.isSafeInteger(e.version)||e.version!<1||e.version!>header.source.version||versions.has(e.version!)||!['draft','publish','rollback'].includes(e.kind!)||typeof e.actor!=='string'||!e.actor||e.actor.length>256||typeof e.created_at!=='string')fail();versions.add(e.version!);documentBytes+=e.bytes;}
  else if(e.type==='media'){if(e.bytes>FILE_LIMIT||typeof e.key!=='string'||!KEY.test(e.key)||keys.has(e.key)||e.contentType!==(e.key.endsWith('.jpg')?'image/jpeg':e.key.endsWith('.png')?'image/png':'image/webp'))fail();keys.add(e.key);mediaBytes+=e.bytes;}else fail();
  offset+=e.bytes;if(offset>TOTAL_LIMIT||12+length+offset>file.size)fail();
 }
 if(versions.size!==header.source.version||Array.from({length:header.source.version},(_,i)=>i+1).some(v=>!versions.has(v))||versions.size>1000||keys.size>500||documentBytes>24*1024*1024||mediaBytes>256*1024*1024||12+length+offset!==file.size||[header.source.draftRevision,header.source.publishedRevision].some(v=>v!==null&&!versions.has(v))||header.entries.some(e=>e.type==='revision'&&e.source_revision!==null&&(!versions.has(e.source_revision!)||e.source_revision!>=e.version!)))fail();
 const body=(entry:BackupEntry)=>file.slice(12+length+entry.offset,12+length+entry.offset+entry.bytes,entry.contentType??'application/json');
 for(const [i,e]of header.entries.entries()){onProgress?.(`Verify ${i+1}/${header.entries.length}`);if(await hash(body(e))!==e.digest)fail();}
 return{header,body,digest:await hash(headerBlob)};
}
function network(){
 let reads=0,writes=0,readUntil=0,writeUntil=0;
 return async(path:string,method='GET',body?:object|Blob,headers:Record<string,string>={})=>{
  const write=method!=='GET';let count=write?writes:reads,until=write?writeUntil:readUntil;const cap=write?55:250;
  if(count>=cap&&Date.now()<until)await new Promise(r=>setTimeout(r,until-Date.now()));if(Date.now()>=until){count=0;until=Date.now()+60000;}count++;if(write){writes=count;writeUntil=until;}else{reads=count;readUntil=until;}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  try{const response=await fetch(path,{method,credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{...(body instanceof Blob?{'Content-Type':body.type}:body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:body instanceof Blob?body:JSON.stringify(body)}:{})});if(!response.ok){let code='request_failed';try{code=(await response.json()).error??code;}catch{}throw new AdminApiError(response.status,code,response.headers.get('Retry-After'),true);}return response;}finally{clearTimeout(timer);}
 };
}
async function bounded(response:Response,limit:number){const reader=response.body?.getReader();if(!reader)fail();let bytes=0;const pieces:Uint8Array<ArrayBuffer>[]=[];try{for(;;){const chunk=await reader!.read();if(chunk.done)break;bytes+=chunk.value.length;if(bytes>limit){await reader!.cancel();fail();}pieces.push(chunk.value);}}finally{reader!.releaseLock();}return new Blob(pieces);}
export async function downloadPortableBackup(onProgress?:RecoveryProgress){
 const send=network(),first=await(await send('/api/admin/recovery/backup')).json();if(first.format!=='fez-cms-portable-v2')fail('unsupported_recovery');const source:Source={version:first.version,draftRevision:first.draftRevision,publishedRevision:first.publishedRevision,origin:first.origin},inputs:InputEntry[]=[];
 let page=first,after=0;for(let n=0;n<64;n++){
  if(!Array.isArray(page.revisions)||page.revisions.length>16)fail();for(const row of page.revisions){if(!Number.isSafeInteger(row.version)||row.version<=after||row.version>source.version)fail();after=row.version;onProgress?.(`Backup revision ${after}`);const response=await send(`/api/admin/recovery/backup?version=${source.version}&revision=${after}`);const blob=await bounded(response,CMS_LIMITS.bytes);inputs.push({type:'revision',version:row.version,kind:row.kind,actor:row.actor,created_at:row.created_at,source_revision:row.source_revision,blob});}
  if(page.revisions.length<16)break;page=await(await send(`/api/admin/recovery/backup?version=${source.version}&after=${after}`)).json();if(n===63)fail();
 }
 let cursor:string|undefined;const seen=new Set<string>();for(let n=0;n<64;n++){
  const result=await(await send('/api/admin/recovery/backup?inventory=1'+(cursor?'&cursor='+encodeURIComponent(cursor):''))).json();if(!Array.isArray(result.objects)||result.objects.length>16)fail();
  for(const object of result.objects){if(new Date(object.uploaded).getTime()>first.cutoff)continue;if(typeof object.key!=='string'||!KEY.test(object.key)||!object.etag||!object.generation)fail();onProgress?.(`Backup photo ${inputs.filter(e=>e.type==='media').length+1}`);const blob=await bounded(await send('/api/admin/recovery/backup?'+new URLSearchParams({key:object.key,etag:object.etag,generation:object.generation})),FILE_LIMIT);if(blob.size!==object.bytes)fail();inputs.push({type:'media',key:object.key,contentType:object.key.endsWith('.jpg')?'image/jpeg':object.key.endsWith('.png')?'image/png':'image/webp',blob});}
  if(result.cursor===null)break;if(typeof result.cursor!=='string'||seen.has(result.cursor))fail();seen.add(result.cursor);cursor=result.cursor;if(n===63)fail();
 }
 return packBackup(source,inputs);
}
function imageKey(value:string,origin:string){try{if(!value.startsWith('/media/upload-')&&!value.startsWith(origin+'/media/upload-'))return null;const url=new URL(value,origin);const key=url.pathname.slice(7);return url.origin===origin&&KEY.test(key)?{key,suffix:url.search+url.hash}:null;}catch{return null;}}
export type PortableArchive=Awaited<ReturnType<typeof openBackup>>;
export async function restorePortableArchive(archive:PortableArchive,revision:number,expectedVersion:number,current:CmsDocument,onProgress?:RecoveryProgress):Promise<AdminWriteResult>{
 const entry=archive.header.entries.find(e=>e.type==='revision'&&e.version===revision);if(!entry)fail();let document=parseEditorImport(await archive.body(entry!).text(),current);
 const keys=new Set<string>();const walk=(value:unknown):void=>{if(typeof value==='string'){const image=imageKey(value,archive.header.source.origin);if(image)keys.add(image.key);}else if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')Object.values(value).forEach(walk);};walk(document);
 const files=[...keys].map(key=>{const e=archive.header.entries.find(e=>e.type==='media'&&e.key===key);if(!e)fail('backup_media_missing');return e!;});
 const send=network(),intent={expectedVersion,archiveDigest:archive.digest,revisionDigest:entry!.digest};
 const root='/api/admin/recovery/restore';const operation=await(await send(root,'POST',intent)).json();if(operation.result)return operation.result as AdminWriteResult;if(typeof operation.id!=='string'||!/^[a-f0-9]{32}$/.test(operation.id))fail();const path=root+'/'+operation.id;
 const sources=new Map<string,string>();for(const e of files){onProgress?.(`Restore photo ${sources.size+1}/${files.length}`);const mapped=await(await send(path+'/media','POST',archive.body(e),{'X-CMS-Backup-Key':e.key!,'X-CMS-Backup-SHA256':e.digest})).json();if(typeof mapped.src!=='string'||!mapped.src.startsWith('/media/')||!KEY.test(mapped.src.slice(7)))fail();sources.set(e.key!,mapped.src);}
 const remap=(value:unknown):unknown=>{if(typeof value==='string'){const image=imageKey(value,archive.header.source.origin);return image?sources.get(image.key)!+image.suffix:value;}if(Array.isArray(value))return value.map(remap);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,remap(v)]));return value;};document=parseEditorImport(JSON.stringify(remap(document)),current);
 const parts=splitCmsDocument(document),manifest=[];for(const{value,...m}of parts)manifest.push({...m,digest:await hash(new Blob([JSON.stringify(value)]))});
 const job=await(await send(path+'/manifest','POST',{manifest})).json();if(!Array.isArray(job.missing)||new Set(job.missing).size!==job.missing.length||job.missing.some((n:unknown)=>!Number.isSafeInteger(n)||Number(n)<0||Number(n)>=parts.length))fail();
 for(const n of job.missing){onProgress?.(`Restore part ${n+1}/${parts.length}`);await send(path+'/part','POST',{part:parts[n]});}
 let ready=false;for(let n=0;n<parts.length+files.length+2;n++){onProgress?.(`Verify restore ${n+1}/${parts.length+files.length+1}`);const r=await(await send(path+'/advance','POST',{})).json();if(r.ready===true){ready=true;break;}if(r.ready!==false)fail();}if(!ready)fail('restore_incomplete');
 // A lost/failed commit is ambiguous. Never resend it automatically; the exact
 // same explicit intent returns the durable result on a later user retry.
 const result=await(await send(path+'/commit','POST',{})).json();if(result.version!==expectedVersion+1||result.draftRevision!==result.version||result.published!==false)fail();return result;
}
export async function restorePortableBackup(file:Blob,revision:number,expectedVersion:number,current:CmsDocument,onProgress?:RecoveryProgress):Promise<AdminWriteResult>{return restorePortableArchive(await openBackup(file,onProgress),revision,expectedVersion,current,onProgress);}
export async function unusedFileReport(onProgress?:RecoveryProgress){
 const send=network(),seen=new Set<string>();let cursor:string|undefined,fence:string|undefined,scanned=0;const candidates:string[]=[];
 for(let page=0;page<2000;page++){
  const data=await(await send('/api/admin/recovery/orphans'+(cursor||fence?'?'+new URLSearchParams({...cursor?{cursor}:{},...fence?{fence}:{}}):''))).json();if(typeof data.fence!=='string'||fence&&fence!==data.fence||!Array.isArray(data.objects)||data.objects.length>16)fail();fence=data.fence;
  for(const object of data.objects){if(++scanned>20000)fail();onProgress?.(`Check stored file ${scanned}`);const uploaded=Date.parse(object.uploaded);if(!Number.isFinite(uploaded))fail();if(uploaded>Date.now()-7*24*3600*1000)continue;if(typeof object.key!=='string'||object.key.length>200)fail();const result=await(await send('/api/admin/recovery/orphans?'+new URLSearchParams({key:object.key,fence:fence!}))).json();if(result.complete!==true||result.deleted!==0||typeof result.protected!=='boolean')fail('orphan_report_incomplete');if(!result.protected)candidates.push(object.key);}
  if(data.cursor===null)return{dryRun:true,scanned,candidates,deleted:0};if(typeof data.cursor!=='string'||seen.has(data.cursor))fail();seen.add(data.cursor);cursor=data.cursor;
 }return fail();
}
