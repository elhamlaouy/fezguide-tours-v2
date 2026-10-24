import {CmsError,type CmsD1Database} from './cms-store';
import type {CmsRoutesEnv} from './cms-routes';
import {consumeCmsRequest} from './cms-request-budget';
import {MEDIA_KEY_PATTERN} from './media';
import {uploadReceipt,serveVerifiedUpload,type UploadObject} from './cms-upload-verification';
import type {PreparedPublicEnv} from './prepared-public';
type RecoveryBucket=NonNullable<PreparedPublicEnv['CMS_MEDIA']>&{head(key:string):Promise<UploadObject|null>};
const invalid=():never=>{throw new CmsError(400,'invalid_recovery_request');};
const json=(value:unknown)=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function number(value:string|null,fallback?:number){if(value===null&&fallback!==undefined)return fallback;if(value===null||!/^\d{1,16}$/.test(value)||!Number.isSafeInteger(Number(value)))return invalid();return Number(value);}
function query(url:URL,allowed:string[]){for(const key of url.searchParams.keys())if(!allowed.includes(key)||url.searchParams.getAll(key).length!==1)invalid();}
export async function recoveryRead(request:Request,env:CmsRoutesEnv,actor:string):Promise<Response|null>{
 const url=new URL(request.url),backup=url.pathname==='/api/admin/recovery/backup',orphan=url.pathname==='/api/admin/recovery/orphans';
 if(!backup&&!orphan)return null;if(request.method!=='GET')throw new CmsError(405,'method_not_allowed');
 const db=env.CMS_DB;if(!db)throw new CmsError(503,'cms_unavailable');
 await consumeCmsRequest(db,actor,url.search===''?'recovery':'read');
 query(url,backup?['version','revision','after','cursor','inventory','key','etag','generation']:['fence','key','cursor']);
 if(orphan)return orphanPage(url,env);
 const state=await db.prepare(`SELECT d.*,b.revision_count,b.document_bytes,unixepoch()*1000+999 AS cutoff FROM cms_documents d JOIN cms_revision_budget b ON b.id=d.id WHERE d.id=1`).first<Record<string,number|null>>();
 if(!state)throw new CmsError(503,'cms_unavailable');const version=number(url.searchParams.get('version'),Number(state.version));if(version>Number(state.version))invalid();
 if(url.searchParams.has('revision')){
  const revision=number(url.searchParams.get('revision'));if(revision<1||revision>version)invalid();
  const row=await db.prepare('SELECT * FROM cms_revisions WHERE version=?').bind(revision).first<{document:string;version:number;kind:string;actor:string;created_at:string;source_revision:number|null}>();
  if(!row)throw new CmsError(404,'revision_not_found');const {document,...metadata}=row;
  return new Response(document,{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-CMS-Revision':encodeURIComponent(JSON.stringify(metadata))}});
 }
 const bucket=env.CMS_MEDIA as unknown as RecoveryBucket;
 if(url.searchParams.has('key')){
  const key=url.searchParams.get('key')!;if(!MEDIA_KEY_PATTERN.test(key)||!bucket)invalid();
  const receipt=uploadReceipt(key,await bucket.head('uploads/'+key));
  if(receipt.etag!==url.searchParams.get('etag')||receipt.version!==url.searchParams.get('generation'))throw new CmsError(409,'backup_media_changed');
  return serveVerifiedUpload(key,request,bucket,JSON.stringify(receipt));
 }
 if(url.searchParams.has('inventory')){
  const list=env.CMS_MEDIA?.list;if(!list)throw new CmsError(503,'media_inventory_unavailable');
  const cursor=url.searchParams.get('cursor');if(cursor&&cursor.length>8192)invalid();
  const page=await list.call(env.CMS_MEDIA,{prefix:'uploads/',limit:16,...(cursor?{cursor}:{})});
  if(page.objects.length>16||(page.truncated&&(!page.cursor||page.cursor===cursor)))throw new CmsError(503,'media_inventory_unavailable');
  return json({objects:page.objects.map(item=>({key:item.key.slice(8),bytes:item.size,uploaded:item.uploaded,etag:(item as {etag?:string}).etag,generation:(item as {version?:string}).version})),cursor:page.truncated?page.cursor:null});
 }
 const after=number(url.searchParams.get('after'),0);
 const rows=await db.prepare('SELECT version,kind,actor,created_at,source_revision,length(CAST(document AS BLOB)) AS bytes FROM cms_revisions WHERE version>? AND version<=? ORDER BY version LIMIT 16').bind(after,version).all();
 if(!rows.success)throw new CmsError(503,'cms_unavailable');
 return json({format:'fez-cms-portable-v2',version,draftRevision:state.draft_revision,publishedRevision:state.published_revision,origin:env.CANONICAL_ORIGIN,cutoff:state.cutoff,revisions:rows.results??[],revisionCount:state.revision_count,documentBytes:state.document_bytes});
}
async function fence(db:CmsD1Database){
 const row=await db.prepare(`SELECT d.version,(SELECT COUNT(*) FROM cms_validation_parts) AS parts,(SELECT COUNT(*) FROM cms_upload_reservations) AS reservations,
 (SELECT COUNT(*) FROM cms_artifact_catalogs) AS catalogs,
 (SELECT COUNT(*) FROM cms_restore_jobs WHERE state='open' AND expires_at>unixepoch()) AS restores,
 EXISTS(SELECT 1 FROM cms_save_jobs WHERE state='open' AND expires_at>unixepoch()) OR EXISTS(SELECT 1 FROM cms_artifact_catalogs WHERE state IN ('building','ready') AND expires_at>unixepoch()) OR EXISTS(SELECT 1 FROM cms_upload_reservations WHERE state='pending') OR EXISTS(SELECT 1 FROM cms_restore_jobs WHERE state='open' AND expires_at>unixepoch()) AS busy FROM cms_documents d WHERE d.id=1`).first<{version:number;parts:number;reservations:number;catalogs:number;restores:number;busy:number}>();
 if(!row||row.busy)throw new CmsError(409,'recovery_busy');return JSON.stringify(row);
}
async function orphanPage(url:URL,env:CmsRoutesEnv){
 const db=env.CMS_DB!,before=await fence(db),key=url.searchParams.get('key');
 if(url.searchParams.has('fence')&&before!==url.searchParams.get('fence'))throw new CmsError(409,'recovery_source_conflict');
 if(!key){
  if(!env.CMS_MEDIA?.list)throw new CmsError(503,'media_inventory_unavailable');const cursor=url.searchParams.get('cursor');if(cursor&&cursor.length>8192)invalid();
  const page=await env.CMS_MEDIA.list({prefix:'',limit:16,...(cursor?{cursor}:{})});
  if(page.objects.length>16||(page.truncated&&(!page.cursor||page.cursor===cursor)))throw new CmsError(503,'media_inventory_unavailable');
  if(before!==await fence(db))throw new CmsError(409,'recovery_source_conflict');return json({fence:before,objects:page.objects,cursor:page.truncated?page.cursor:null,dryRun:true,deleted:0});
 }
 if(key.length>200)invalid();const upload=key.startsWith('uploads/')&&MEDIA_KEY_PATTERN.test(key.slice(8)),catalog=/^prepared\/v1\/([a-f0-9]{32})\/[a-f0-9]{64}$/.exec(key)?.[1];
 if(!upload&&!catalog)return json({complete:true,protected:true,deleted:0});
 const reserved=await db.prepare('SELECT EXISTS(SELECT 1 FROM cms_upload_reservations WHERE object_key=?) OR EXISTS(SELECT 1 FROM cms_artifact_entries WHERE object_key=?) OR EXISTS(SELECT 1 FROM cms_artifact_catalogs WHERE id=?) OR EXISTS(SELECT 1 FROM cms_restore_media WHERE target_src=?) AS protected').bind(key,key,catalog??'','/media/'+key.slice(8)).first<{protected:number}>();
 if(reserved?.protected)return json({complete:true,protected:true,deleted:0});
 const reference='/media/'+key.slice(8);
 const source=await db.prepare(`SELECT EXISTS(SELECT 1 FROM (SELECT document AS body FROM cms_revisions UNION ALL SELECT document_json AS body FROM cms_validation_parts) source,json_tree(source.body) node WHERE node.type='text' AND instr(node.atom,?)>0) AS protected`).bind(reference).first<{protected:number}>();
 if(before!==await fence(db))throw new CmsError(409,'recovery_source_conflict');
 return json({fence:before,complete:true,protected:Boolean(source?.protected),deleted:0});
}
