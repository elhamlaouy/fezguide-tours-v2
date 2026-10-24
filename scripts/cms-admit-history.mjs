// Offline operator tooling only. Never import into a Worker or expose as an editor endpoint.
import {createHash} from 'node:crypto';
import {readFileSync,lstatSync,mkdirSync,openSync,closeSync,writeFileSync,constants,fstatSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {isDeepStrictEqual} from 'node:util';
import {register} from 'tsx/esm/api';
register();
const {CMS_LIMITS,validateCmsDocument,validateCmsPart,validateCmsRelationships}=await import('../src/cms/schema.ts');
const {splitCmsDocument,assembleCmsDocument,referenceSummary}=await import('../src/cms/document-parts.ts');
const {MAX_REVISION_COUNT,MAX_REVISION_DOCUMENT_BYTES}=await import('../worker/cms-store.ts');
const hash=raw=>createHash('sha256').update(raw).digest('hex');
export const historyPolicy=hash(readFileSync(new URL('../src/cms/schema.ts',import.meta.url)));
const fail=code=>{throw Object.assign(new Error(code),{code});};
function record(value,keys){
 if(!value||typeof value!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('history_invalid_snapshot');
 const descriptors=Object.getOwnPropertyDescriptors(value);
 if(Reflect.ownKeys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(descriptors,k))||Object.values(descriptors).some(d=>d.get||d.set||!d.enumerable))fail('history_invalid_snapshot');
}
const integer=v=>Number.isSafeInteger(v)&&v>=0;
export async function captureHistorySnapshot(db){
 const get=async sql=>{const result=await db.prepare(sql).all();if(!result.success||!result.results)fail('history_unavailable');return result.results;};
 return JSON.parse(JSON.stringify({documents:await get('SELECT * FROM cms_documents ORDER BY id'),revisions:await get('SELECT * FROM cms_revisions ORDER BY version'),revisionBudget:await get('SELECT * FROM cms_revision_budget ORDER BY id')}));
}
export function planHistoryAdmission(input){
 record(input,['documents','revisions','revisionBudget']);
 for(const rows of Object.values(input))if(!Array.isArray(rows)||Reflect.ownKeys(rows).length!==rows.length+1||Object.values(Object.getOwnPropertyDescriptors(rows)).some(d=>d.get||d.set))fail('history_invalid_snapshot');
 if(input.documents.length!==1||input.revisionBudget.length!==1||input.revisions.length>MAX_REVISION_COUNT)fail('history_invalid_snapshot');
 record(input.documents[0],['id','version','draft_revision','published_revision']);
 record(input.revisionBudget[0],['id','revision_count','document_bytes']);
 for(const r of input.revisions)record(r,['version','document','kind','actor','created_at','source_revision']);
 const snapshot=JSON.parse(JSON.stringify(input)),site=snapshot.documents[0],budget=snapshot.revisionBudget[0],rows=snapshot.revisions;
 if(site.id!==1||!integer(site.version)||budget.id!==1||!integer(budget.revision_count)||!integer(budget.document_bytes))fail('history_invalid_snapshot');
 const versions=new Set(rows.map(r=>r.version));
 if(versions.size!==rows.length||rows.some((r,i)=>!integer(r.version)||r.version===0||(i>0&&r.version<=rows[i-1].version)||r.version>site.version||!['draft','publish','rollback'].includes(r.kind)||typeof r.actor!=='string'||!r.actor||r.actor.length>256||typeof r.created_at!=='string'||typeof r.document!=='string'||(r.source_revision!==null&&(!versions.has(r.source_revision)||r.source_revision>=r.version))))fail('history_invalid_snapshot');
 if(site.version!==(rows.at(-1)?.version??0)||[site.draft_revision,site.published_revision].some(v=>v!==null&&!versions.has(v))||(!rows.length&&(site.draft_revision!==null||site.published_revision!==null))||(rows.length&&site.draft_revision===null))fail('history_invalid_snapshot');
 const bytes=rows.reduce((n,r)=>n+Buffer.byteLength(r.document),0);
 if(bytes!==budget.document_bytes||rows.length!==budget.revision_count||bytes>MAX_REVISION_DOCUMENT_BYTES)fail('history_invalid_budget');
 const parser=new DatabaseSync(':memory:'),unique=new Map(),admissions=[];
 try{for(const row of rows){
   if(Buffer.byteLength(row.document)>CMS_LIMITS.bytes)fail('history_invalid_document');
   let doc;
   try{
    // JSON.parse overwrites duplicate keys while SQLite can resolve their first occurrence.
    if(parser.prepare('SELECT 1 FROM json_tree(?) GROUP BY parent,key HAVING COUNT(*)>1 LIMIT 1').get(row.document))fail('history_invalid_document');
    doc=JSON.parse(row.document);
   }catch{fail('history_invalid_document');}
   if(!validateCmsDocument(doc).valid)fail('history_invalid_document');
   const parts=splitCmsDocument(doc);
   if(parts.some(p=>!validateCmsPart(p).valid)||validateCmsRelationships(assembleCmsDocument(parts.map(referenceSummary))).length)fail('history_invalid_document');
   const manifest=parts.map(({value,...metadata})=>{
    const raw=JSON.stringify(value),digest=hash(raw),summary=JSON.stringify(referenceSummary({...metadata,value}).value);
    const receipt={kind:metadata.kind,digest,raw,summary,bytes:Buffer.byteLength(raw),source:row.version};
    const key=JSON.stringify([metadata.kind,digest]);
    if(unique.has(key)&&!isDeepStrictEqual({...unique.get(key),source:0},{...receipt,source:0}))fail('history_part_conflict');
    unique.set(key,unique.get(key)??receipt);return{...metadata,digest};
   });
   admissions.push({revision:row.version,digest:hash(row.document),bytes:Buffer.byteLength(row.document),manifest:JSON.stringify(manifest)});
 }}finally{parser.close();}
 return{policy:historyPolicy,snapshot,parts:[...unique.values()],admissions};
}
function sourceGuard(db,plan,version){
 const site=plan.snapshot.documents[0],budget=plan.snapshot.revisionBudget[0],row=plan.snapshot.revisions.find(r=>r.version===version);
 return db.prepare(`SELECT CASE WHEN (SELECT COUNT(*) FROM cms_documents)=1 AND EXISTS(SELECT 1 FROM cms_documents WHERE id=1 AND version=? AND draft_revision IS ? AND published_revision IS ?)
  AND (SELECT COUNT(*) FROM cms_revisions)=? AND (SELECT COUNT(*) FROM cms_revision_budget)=1 AND EXISTS(SELECT 1 FROM cms_revision_budget WHERE id=1 AND revision_count=? AND document_bytes=?)
  AND EXISTS(SELECT 1 FROM cms_revisions WHERE version=? AND kind=? AND actor=? AND created_at=? AND source_revision IS ? AND CAST(document AS BLOB)=CAST(? AS BLOB))
  THEN 1 ELSE json('history_admission_conflict') END`).bind(site.version,site.draft_revision,site.published_revision,plan.snapshot.revisions.length,budget.revision_count,budget.document_bytes,row.version,row.kind,row.actor,row.created_at,row.source_revision,row.document);
}
async function batch(db,statements){const result=await db.batch(statements);if(result.length!==statements.length||result.some(r=>!r.success))fail('history_admission_conflict');}
export function historySnapshotFromExport(input){
 if(!input?.result)return input;
 if(input.success!==true||!Array.isArray(input.errors)||input.errors.length||!Array.isArray(input.result)||input.result.length!==5||input.result.some(r=>r.success!==true||!Array.isArray(r.results)))fail('history_invalid_snapshot');
 return{documents:input.result[0].results,revisions:input.result[1].results,revisionBudget:input.result[3].results};
}
function sqliteBinding(sql){
 const statement=(q,p=[])=>({bind:(...args)=>statement(q,args),async first(){return sql.prepare(q).get(...p)??null;},async all(){return{success:true,results:sql.prepare(q).all(...p)};},async run(){if(/^\s*(SELECT|WITH)\b/i.test(q))return{success:true,results:sql.prepare(q).all(...p)};return{success:true,meta:{changes:Number(sql.prepare(q).run(...p).changes)}};}});
 return{prepare:statement,async batch(statements){sql.exec('BEGIN IMMEDIATE');try{const results=[];for(const s of statements)results.push(await s.run());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}};
}
function noSymlinkAncestors(file){
 for(let current=path.resolve(file);;current=path.dirname(current)){const stat=lstatSync(current);if(stat.isSymbolicLink())fail('history_unsafe_path');if(current===path.dirname(current))break;}
}
async function cli(args){
 if(args.length===1&&args[0]==='--help'){console.log('node scripts/cms-admit-history.mjs --snapshot PRIVATE_JSON --output-dir NEW_PRIVATE_DIRECTORY\nCreates a history-only admitted SQLite simulation. Never writes the input or a live database.');return;}
 if(args.length!==4||args[0]!=='--snapshot'||args[2]!=='--output-dir')fail('history_invalid_arguments');
 const source=path.resolve(args[1]),directory=path.resolve(args[3]);noSymlinkAncestors(source);noSymlinkAncestors(path.dirname(directory));
 const fd=openSync(source,constants.O_RDONLY|constants.O_NOFOLLOW);let bytes;
 try{const info=fstatSync(fd);if(!info.isFile()||info.size>64*1024*1024)fail('history_invalid_snapshot');bytes=readFileSync(fd);}finally{closeSync(fd);}
 let input;try{input=historySnapshotFromExport(JSON.parse(bytes.toString('utf8')));}catch{fail('history_invalid_snapshot');}
 const plan=planHistoryAdmission(input); // Validate ALL history before creating the output.
 mkdirSync(directory,{mode:0o700});
 const file=path.join(directory,'admitted-copy.sqlite');closeSync(openSync(file,'wx',0o600));
 const sql=new DatabaseSync(file);
 try{
  for(const migration of ['0001_cms.sql','0002_media_budget.sql','0003_cms_release_safeguards.sql','0004_cms_prepared_publications.sql','0005_cms_recovery.sql','0006_cms_first_catalog_bootstrap.sql'])sql.exec(readFileSync(new URL('../migrations/'+migration,import.meta.url),'utf8'));
  // Only this newly created, exclusive simulation receives original-table writes.
  const insert=sql.prepare('INSERT INTO cms_revisions(version,document,kind,actor,created_at,source_revision) VALUES(?,?,?,?,?,?)');
  for(const r of plan.snapshot.revisions)insert.run(r.version,r.document,r.kind,r.actor,r.created_at,r.source_revision);
  const site=plan.snapshot.documents[0];sql.prepare('UPDATE cms_documents SET version=?,draft_revision=?,published_revision=? WHERE id=1').run(site.version,site.draft_revision,site.published_revision);
  const result=await admitHistory(sqliteBinding(sql),plan.snapshot);
  const report={...result,scope:'new local history-only simulation; not a complete backup, transfer or deployment',sourceFileSha256:hash(bytes),remoteWrites:false,ownerStateModified:false};
  writeFileSync(path.join(directory,'verification.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify(report,null,2));
 }finally{sql.close();}
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)cli(process.argv.slice(2)).catch(error=>{console.error(error?.code?.startsWith('history_')?error.code:'history_simulation_failed');process.exitCode=1;});

export async function admitHistory(db,input){
 // Rebuild from raw source every invocation; caller-authored receipt/plan JSON is never authority.
 const plan=planHistoryAdmission(input);
 if(!isDeepStrictEqual(await captureHistorySnapshot(db),plan.snapshot))fail('history_source_conflict');
 try{
  for(const p of plan.parts)await batch(db,[sourceGuard(db,plan,p.source),
   db.prepare(`INSERT INTO cms_validation_parts(policy,kind,digest,document_json,summary_json,document_bytes)
    SELECT ?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM cms_validation_parts WHERE policy=? AND kind=? AND digest=?)
    AND COALESCE((SELECT SUM(document_bytes+length(CAST(summary_json AS BLOB))) FROM cms_validation_parts),0)+?<=67108864`)
    .bind(plan.policy,p.kind,p.digest,p.raw,p.summary,p.bytes,plan.policy,p.kind,p.digest,p.bytes+Buffer.byteLength(p.summary)),
   db.prepare(`SELECT CASE WHEN EXISTS(SELECT 1 FROM cms_validation_parts WHERE policy=? AND kind=? AND digest=? AND document_json=? AND summary_json=? AND document_bytes=?) THEN 1 ELSE json('history_admission_conflict') END`)
    .bind(plan.policy,p.kind,p.digest,p.raw,p.summary,p.bytes),sourceGuard(db,plan,p.source)]);
  for(const a of plan.admissions)await batch(db,[sourceGuard(db,plan,a.revision),
   db.prepare(`SELECT CASE WHEN (SELECT COUNT(*) FROM json_each(?) m JOIN cms_validation_parts p ON p.policy=? AND p.kind=json_extract(m.value,'$.kind') AND p.digest=json_extract(m.value,'$.digest'))=json_array_length(?) THEN 1 ELSE json('history_admission_conflict') END`)
    .bind(a.manifest,plan.policy,a.manifest),
   db.prepare(`INSERT INTO cms_revision_admissions(revision,policy,digest,document_bytes,manifest) SELECT ?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM cms_revision_admissions WHERE revision=? AND policy=?)`)
    .bind(a.revision,plan.policy,a.digest,a.bytes,a.manifest,a.revision,plan.policy),
   db.prepare(`SELECT CASE WHEN EXISTS(SELECT 1 FROM cms_revision_admissions WHERE revision=? AND policy=? AND digest=? AND document_bytes=? AND manifest=?) THEN 1 ELSE json('history_admission_conflict') END`)
    .bind(a.revision,plan.policy,a.digest,a.bytes,a.manifest),sourceGuard(db,plan,a.revision)]);
  if(!isDeepStrictEqual(await captureHistorySnapshot(db),plan.snapshot))fail('history_source_conflict');
 }catch(error){if(error?.code?.startsWith('history_'))throw error;fail('history_admission_conflict');}
 return{policy:plan.policy,admittedRevisions:plan.admissions.length,uniqueParts:plan.parts.length,originalSnapshotSha256:hash(JSON.stringify(plan.snapshot)),originalRowsUnchanged:true};
}
