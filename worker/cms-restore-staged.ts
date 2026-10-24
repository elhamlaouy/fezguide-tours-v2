import {CmsError,type CmsD1Database} from './cms-store';
import type {CmsRoutesEnv} from './cms-routes';
import {StagedCmsStore,type CmsSaveManifestEntry} from './cms-staged-store';
import {consumeCmsRequest} from './cms-request-budget';
import {boundedMediaBytes,inspectMedia,uploadMedia,MEDIA_KEY_PATTERN,MAX_MEDIA_BYTES} from './media';
import {uploadReceipt,type UploadReceipt,type UploadObject} from './cms-upload-verification';
import type {CmsPart} from '../src/cms/schema';
type Helpers={requestJson(r:Request,max:number):Promise<Record<string,unknown>>;exactFields(v:Record<string,unknown>,keys:readonly string[]):void};
type Job={id:string;actor:string;policy:string;expected_version:number;archive_digest:string;revision_digest:string;state:string;save_job_id:string|null;checked_parts:number;checked_media:number;expires_at:number;result_revision:number|null;live:number;current:number};
const json=(v:unknown)=>new Response(JSON.stringify(v),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function conflict():never {throw new CmsError(409,'restore_conflict');}
const sha=async(bytes:Uint8Array<ArrayBuffer>)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
const HASH=/^[a-f0-9]{64}$/;
async function batch(db:CmsD1Database,statements:ReturnType<CmsD1Database['prepare']>[]){try{const r=await db.batch(statements);if(r.length!==statements.length||r.some(x=>!x.success))conflict();}catch(e){if(e instanceof CmsError)throw e;conflict();}}
async function job(db:CmsD1Database,id:string,actor:string,policy:string){const j=await db.prepare(`SELECT r.*,r.expires_at>unixepoch() AS live,d.version AS current FROM cms_restore_jobs r JOIN cms_documents d ON d.id=1 WHERE r.id=? AND r.actor=? AND r.policy=?`).bind(id,actor,policy).first<Job>();if(!j)conflict();return j;}
function guard(db:CmsD1Database,j:Job){return db.prepare(`SELECT CASE WHEN EXISTS(SELECT 1 FROM cms_restore_jobs r JOIN cms_documents d ON d.id=1 AND d.version=r.expected_version WHERE r.id=? AND r.actor=? AND r.policy=? AND r.state='open' AND r.expires_at>unixepoch()) THEN 1 ELSE json('restore_conflict') END`).bind(j.id,j.actor,j.policy);}
async function renew(db:CmsD1Database,j:Job,statements:ReturnType<CmsD1Database['prepare']>[]=[]){await batch(db,[guard(db,j),...statements,db.prepare("UPDATE cms_restore_jobs SET expires_at=max(expires_at,unixepoch()+1800) WHERE id=? AND state='open' AND expires_at>unixepoch()").bind(j.id),...(j.save_job_id?[db.prepare("UPDATE cms_save_jobs SET expires_at=max(expires_at,unixepoch()+1800) WHERE id=? AND state='open' AND expires_at>unixepoch()").bind(j.save_job_id)]:[]),guard(db,j)]);}
export async function restoreResponse(request:Request,env:CmsRoutesEnv,actor:string,h:Helpers):Promise<Response|null>{
 const url=new URL(request.url),match=/^\/api\/admin\/recovery\/restore(?:\/([a-f0-9]{32})(?:\/(manifest|part|advance|commit|media))?)?$/.exec(url.pathname);
 if(!match)return null;if(url.search)throw new CmsError(400,'invalid_recovery_request');
 const db=env.CMS_DB,policy=env.CMS_VALIDATION_POLICY;if(!db||!policy||!env.CANONICAL_ORIGIN)throw new CmsError(503,'cms_unavailable');
 const [_,id,action]=match;const method=id&&!action?'GET':'POST';if(request.method!==method)throw new CmsError(405,'method_not_allowed');
 await consumeCmsRequest(db,actor,!id?'recovery':method==='GET'?'read':'write');
 if(!id){
  const body=await h.requestJson(request,4096);h.exactFields(body,['expectedVersion','archiveDigest','revisionDigest']);
  if(typeof body.expectedVersion!=='number'||!Number.isSafeInteger(body.expectedVersion)||Number(body.expectedVersion)<0||typeof body.archiveDigest!=='string'||!HASH.test(body.archiveDigest)||typeof body.revisionDigest!=='string'||!HASH.test(body.revisionDigest))throw new CmsError(400,'invalid_recovery_request');
  const old=await db.prepare(`SELECT id,state,result_revision,expires_at>unixepoch() AS live FROM cms_restore_jobs WHERE actor=? AND policy=? AND expected_version=? AND archive_digest=? AND revision_digest=? ORDER BY rowid DESC LIMIT 1`).bind(actor,policy,body.expectedVersion,body.archiveDigest,body.revisionDigest).first<{id:string;state:string;result_revision:number|null;live:number}>();
  if(old?.state==='committed')return json({id:old.id,result:{version:old.result_revision,draftRevision:old.result_revision,published:false}});
  const observed=await db.prepare("SELECT id,actor FROM cms_restore_jobs WHERE state='open'").first<{id:string;actor:string}>();const candidate=old?.state==='open'&&old.live?old.id:crypto.randomUUID().replaceAll('-','');
  await batch(db,[db.prepare("UPDATE cms_restore_jobs SET state='expired' WHERE state='open' AND (expires_at<=unixepoch() OR expected_version<>(SELECT version FROM cms_documents WHERE id=1))"),db.prepare("UPDATE cms_restore_jobs SET state='expired' WHERE id=? AND actor=? AND state='open' AND id<>?").bind(observed?.id??'',actor,candidate),db.prepare(`INSERT INTO cms_restore_jobs(id,actor,policy,expected_version,archive_digest,revision_digest,state,expires_at) SELECT ?,?,?,?,?,?,'open',unixepoch()+1800 WHERE NOT EXISTS(SELECT 1 FROM cms_restore_jobs WHERE state='open') AND (SELECT version FROM cms_documents WHERE id=1)=? AND (SELECT COUNT(*) FROM cms_restore_jobs)<1000`).bind(candidate,actor,policy,body.expectedVersion,body.archiveDigest,body.revisionDigest,body.expectedVersion)]);
  if(old&&old.id!==candidate)await batch(db,[db.prepare("INSERT INTO cms_restore_media(job_id,original_key,input_digest,target_src,receipt_json) SELECT ?,original_key,input_digest,target_src,receipt_json FROM cms_restore_media WHERE job_id=?").bind(candidate,old.id)]);
  const active=await job(db,candidate,actor,policy);if(!active.live||active.state!=='open'||active.current!==active.expected_version)conflict();return json({id:candidate});
 }
 const j=await job(db,id,actor,policy);
 if(!action)return json({id,state:j.state,result:j.state==='committed'?{version:j.result_revision,draftRevision:j.result_revision,published:false}:null});
 if(!j.live||j.state!=='open'||j.current!==j.expected_version)conflict();
 const store=new StagedCmsStore(db,policy);
 if(action==='media')return restoreMedia(request,env,j);
 const body=await h.requestJson(request,action==='part'?2004096:action==='manifest'?512000:4096);h.exactFields(body,action==='manifest'?['manifest']:action==='part'?['part']:[]);
 if(action==='manifest'){
  const save=await store.startSave(j.expected_version,actor,body.manifest as CmsSaveManifestEntry[]);
  if(j.save_job_id&&j.save_job_id!==save.id)conflict();
  await renew(db,j,[db.prepare("UPDATE cms_restore_jobs SET save_job_id=? WHERE id=? AND (save_job_id IS NULL OR save_job_id=?)").bind(save.id,id,save.id)]);return json({missing:save.missing});
 }
 if(!j.save_job_id)conflict();
 if(action==='part'){await store.putPart(j.save_job_id,actor,body.part as CmsPart);await renew(db,j);return json({stored:true});}
 if(action==='commit')return json(await store.finishSave(j.save_job_id,actor,id));
 const mapping=await db.prepare('SELECT target_src,receipt_json FROM cms_restore_media WHERE job_id=? ORDER BY original_key LIMIT 1 OFFSET ?').bind(id,j.checked_media).first<{target_src:string;receipt_json:string}>();
 if(mapping){const bucket=env.CMS_MEDIA as unknown as {head(key:string):Promise<UploadObject|null>};const receipt=uploadReceipt(mapping.target_src.slice(7),await bucket.head('uploads/'+mapping.target_src.slice(7)));if(JSON.stringify(receipt)!==mapping.receipt_json)throw new CmsError(409,'backup_media_changed');await renew(db,j,[db.prepare('UPDATE cms_restore_jobs SET checked_media=checked_media+1 WHERE id=? AND checked_media=?').bind(id,j.checked_media)]);return json({ready:false});}
 // One admitted part per invocation, kept in native SQL even for near-2MB prose.
 const part=await db.prepare(`SELECT CAST(m.key AS INTEGER) AS position,EXISTS(SELECT 1 FROM json_tree(p.document_json) v WHERE v.type='text' AND (substr(v.atom,1,14)='/media/upload-' OR substr(v.atom,1,length(?)+14)=?||'/media/upload-') AND NOT EXISTS(SELECT 1 FROM cms_restore_media rm WHERE rm.job_id=? AND (v.atom=rm.target_src OR v.atom=?||rm.target_src))) AS missing FROM cms_save_jobs s,json_each(s.manifest) m JOIN cms_validation_parts p ON p.policy=s.policy AND p.kind=json_extract(m.value,'$.kind') AND p.digest=json_extract(m.value,'$.digest') WHERE s.id=? AND CAST(m.key AS INTEGER)=?`).bind(env.CANONICAL_ORIGIN,env.CANONICAL_ORIGIN,id,env.CANONICAL_ORIGIN,j.save_job_id,j.checked_parts).first<{position:number;missing:number}>();
 const total=await db.prepare('SELECT json_array_length(manifest) AS n FROM cms_save_jobs WHERE id=?').bind(j.save_job_id).first<{n:number}>();
 if(!total)conflict();if(j.checked_parts===total.n)return json({ready:true});if(!part)throw new CmsError(409,'parts_missing');if(part.missing)throw new CmsError(422,'backup_media_missing');
 await renew(db,j,[db.prepare('UPDATE cms_restore_jobs SET checked_parts=checked_parts+1 WHERE id=? AND checked_parts=?').bind(id,j.checked_parts)]);return json({ready:j.checked_parts+1===total.n});
}
async function restoreMedia(request:Request,env:CmsRoutesEnv,j:Job){
 const db=env.CMS_DB!,key=request.headers.get('X-CMS-Backup-Key')??'',digest=request.headers.get('X-CMS-Backup-SHA256')??'';
 if(!MEDIA_KEY_PATTERN.test(key)||!HASH.test(digest))throw new CmsError(400,'invalid_recovery_request');
 const mime=key.endsWith('.jpg')?'image/jpeg':key.endsWith('.png')?'image/png':'image/webp';if(request.headers.get('Content-Type')!==mime||request.headers.has('Content-Encoding'))throw new CmsError(415,'unsupported_media_type');
 const input=await boundedMediaBytes(request.body,request.headers.get('Content-Length'));if(await sha(input)!==digest)throw new CmsError(422,'backup_media_hash');inspectMedia(input,mime);
 const bucket=env.CMS_MEDIA as unknown as {head(k:string):Promise<UploadObject|null>;get(k:string):Promise<UploadObject&{body:ReadableStream}|null>};if(!bucket)throw new CmsError(503,'media_unavailable');
 const existing=await db.prepare('SELECT * FROM cms_restore_media WHERE job_id=? AND original_key=?').bind(j.id,key).first<{input_digest:string;target_src:string;receipt_json:string}>();
 if(existing){if(existing.input_digest!==digest)conflict();if(JSON.stringify(uploadReceipt(existing.target_src.slice(7),await bucket.head('uploads/'+existing.target_src.slice(7))))!==existing.receipt_json)throw new CmsError(409,'backup_media_changed');return json({src:existing.target_src});}
 if(j.save_job_id)conflict();
 let target='/media/'+key;const present=await bucket.get('uploads/'+key);
 if(present){const bytes=await boundedMediaBytes(present.body,null);if(await sha(bytes)!==digest)throw new CmsError(409,'backup_media_conflict');}
 else{
  const upload=await uploadMedia(new Request(request.url,{method:'POST',headers:{'Content-Type':mime,'X-CMS-Metadata':encodeURIComponent(JSON.stringify({alt:{en:'Restored photo',fr:'Photo restaurée',es:'Foto restaurada'}}))},body:input}),env,{db,actor:j.actor});target=upload.media.src;
 }
 const receipt=uploadReceipt(target.slice(7),await bucket.head('uploads/'+target.slice(7)));
 await renew(db,j,[db.prepare(`INSERT INTO cms_restore_media(job_id,original_key,input_digest,target_src,receipt_json) SELECT ?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM cms_restore_media WHERE job_id=? AND original_key=?) AND (SELECT COUNT(*) FROM cms_restore_media WHERE job_id=?)<1000`).bind(j.id,key,digest,target,JSON.stringify(receipt),j.id,key,j.id)]);
 const stored=await db.prepare('SELECT target_src,receipt_json,input_digest FROM cms_restore_media WHERE job_id=? AND original_key=?').bind(j.id,key).first<{target_src:string;receipt_json:string;input_digest:string}>();if(!stored||stored.input_digest!==digest||stored.target_src!==target||stored.receipt_json!==JSON.stringify(receipt))conflict();return json({src:target});
}
