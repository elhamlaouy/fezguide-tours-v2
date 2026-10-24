// TRUSTED LOCAL OPERATOR DIAGNOSTIC ONLY. Never import into a Worker.
// Read-only advice, not a deletion capability or a future-safe deletion token.
import {createHash} from 'node:crypto';
const fail=code=>{throw Object.assign(new Error(code),{code});};
const MEDIA=/^uploads\/upload-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(?:jpg|png|webp)$/;
const PREPARED=/^prepared\/v1\/([a-f0-9]{32})\/[a-f0-9]{64}$/;
const PAGE=16,MAX_OBJECTS=20000,MAX_PAGES=2000;
async function rows(db,q){const r=await db.prepare(q).all();if(!r.success||!Array.isArray(r.results))fail('recovery_unavailable');return r.results;}
async function quietFingerprint(db){
 const busy=await db.prepare(`SELECT EXISTS(SELECT 1 FROM cms_save_jobs WHERE state='open' AND expires_at>unixepoch())
  OR EXISTS(SELECT 1 FROM cms_artifact_catalogs WHERE state IN ('building','ready') AND expires_at>unixepoch())
  OR EXISTS(SELECT 1 FROM cms_upload_reservations WHERE state='pending') AS busy`).first();
 if(!busy||busy.busy)fail('recovery_busy');
 const hash=createHash('sha256');
 // Core revision bodies are immutable; pin their inventory/metadata, pointers and
 // budgets, and every relevant mutable ledger. Never return owner text to JS here.
 for(const query of [
  'SELECT * FROM cms_documents ORDER BY id','SELECT * FROM cms_revision_budget ORDER BY id',
  'SELECT version,kind,actor,created_at,source_revision,length(CAST(document AS BLOB)) AS bytes FROM cms_revisions ORDER BY version',
  'SELECT * FROM cms_upload_reservations ORDER BY id',
  'SELECT id,state,source_revision,target_revision,expected_version FROM cms_artifact_catalogs ORDER BY id',
  'SELECT policy,kind,digest,document_bytes FROM cms_validation_parts ORDER BY policy,kind,digest',
 ])hash.update(JSON.stringify(await rows(db,query)));
 return hash.digest('hex');
}
async function protectedObject(db,key){
 if(MEDIA.test(key)){
  const reference='/media/'+key.slice('uploads/'.length);
  // Native JSON traversal protects hidden fields, every retained revision,
  // absolute URLs and embedded prose. Overprotection is deliberate.
  const found=await db.prepare(`SELECT EXISTS(SELECT 1 FROM cms_revisions r,json_tree(r.document) j WHERE j.type='text' AND instr(j.atom,?)>0)
   OR EXISTS(SELECT 1 FROM cms_validation_parts p,json_tree(p.document_json) j WHERE j.type='text' AND instr(j.atom,?)>0)
   OR EXISTS(SELECT 1 FROM cms_upload_reservations WHERE object_key=?) AS protected`).bind(reference,reference,key).first();
  if(!found)fail('recovery_unavailable');return Boolean(found.protected);
 }
 const catalog=PREPARED.exec(key)?.[1];
 if(catalog){const found=await db.prepare(`SELECT EXISTS(SELECT 1 FROM cms_artifact_catalogs WHERE id=?)
  OR EXISTS(SELECT 1 FROM cms_artifact_entries WHERE object_key=?) AS protected`).bind(catalog,key).first();if(!found)fail('recovery_unavailable');return Boolean(found.protected);}
 return true;
}
export async function auditRecoveryObjects(db,bucket,now=new Date()){
 if(!bucket||typeof bucket.list!=='function'||!Number.isFinite(now.getTime()))fail('recovery_inventory_unavailable');
 const before=await quietFingerprint(db),cutoff=now.getTime()-7*24*3600*1000;
 const candidates=[],cursors=new Set(),keys=new Set();let cursor,pages=0,protectedCount=0,unknown=0;
 do{
  if(++pages>MAX_PAGES)fail('recovery_inventory_limit');
  const page=await bucket.list({prefix:'',limit:PAGE,...(cursor?{cursor}:{})});
  if(!Array.isArray(page.objects)||page.objects.length>PAGE||typeof page.truncated!=='boolean')fail('recovery_inventory_conflict');
  for(const object of page.objects){
   if(typeof object.key!=='string'||object.key.length>4096||keys.has(object.key))fail('recovery_inventory_conflict');keys.add(object.key);if(keys.size>MAX_OBJECTS)fail('recovery_inventory_limit');
   const date=object.uploaded instanceof Date?object.uploaded:new Date(object.uploaded);
   if((!MEDIA.test(object.key)&&!PREPARED.test(object.key))||!Number.isFinite(date.getTime())||!Number.isSafeInteger(object.size)||object.size<0||typeof object.version!=='string'||!object.version||typeof object.etag!=='string'||!object.etag){unknown++;continue;}
   if(date.getTime()>=cutoff||await protectedObject(db,object.key)){protectedCount++;continue;}
   candidates.push({key:object.key,bytes:object.size,uploaded:date.toISOString(),version:object.version,etag:object.etag});
  }
  if(page.truncated){if(typeof page.cursor!=='string'||!page.cursor||page.cursor.length>8192||cursors.has(page.cursor))fail('recovery_inventory_conflict');cursors.add(page.cursor);cursor=page.cursor;}else cursor=undefined;
 }while(cursor);
 if(await quietFingerprint(db)!==before)fail('recovery_source_conflict');
 return{complete:true,dryRun:true,scope:'local operator advice; not a hosted endpoint, deletion approval or durable deletion token',quarantineDays:7,scanned:keys.size,pages,protected:protectedCount,unknown,candidates,deleted:0,sourceFingerprint:before};
}
