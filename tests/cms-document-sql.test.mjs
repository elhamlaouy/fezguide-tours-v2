import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { register } from 'tsx/esm/api';
register();

test('F4 assembly enumerates each manifest once and uses complete receipt-key lookups',async()=>{
  const {documentAssemblySql,projectedDocumentSql}=await import('../worker/cms-document-sql.ts');
  const db=new DatabaseSync(':memory:');
  try{
    for(const file of ['0001_cms.sql','0002_media_budget.sql','0003_cms_release_safeguards.sql','0004_cms_prepared_publications.sql','0005_cms_recovery.sql','0006_cms_first_catalog_bootstrap.sql','0007_cms_catalog_refreshes.sql'])db.exec(readFileSync(new URL(`../migrations/${file}`,import.meta.url),'utf8'));
    for(const [query,table] of [[documentAssemblySql(),'cms_validation_parts'],[projectedDocumentSql(),'cms_projection_cache']]){
      const plan=db.prepare('EXPLAIN QUERY PLAN '+query).all('fixture').map(row=>row.detail);
      assert.equal(plan.filter(line=>line.startsWith('SCAN m VIRTUAL TABLE')).length,1,'one manifest enumeration, not one per assembled field');
      const lookup=plan.find(line=>line.includes('SEARCH p USING INDEX sqlite_autoindex_'+table));
      assert.ok(lookup?.includes('kind=? AND digest=?'),'receipt lookup must be keyed by kind/digest, not scan every receipt under the policy');
    }
  }finally{db.close();}
});

test('native SQL reconstructs all document fields without parsing source bodies in the Worker', async () => {
  const { documentAssemblySql }=await import('../worker/cms-document-sql.ts');
  const { createCmsSeed }=await import('../src/cms/seed.ts');
  const source=createCmsSeed();
  const db=new DatabaseSync(':memory:');
  try {
    for(const file of ['0001_cms.sql','0002_media_budget.sql','0003_cms_release_safeguards.sql','0004_cms_prepared_publications.sql','0005_cms_recovery.sql','0006_cms_first_catalog_bootstrap.sql','0007_cms_catalog_refreshes.sql']) db.exec(readFileSync(new URL(`../migrations/${file}`,import.meta.url),'utf8'));
    const manifest=[];
    let counter=0;
    const add=(kind,index,value,key)=>{
      const digest=(++counter).toString(16).padStart(64,'0');
      manifest.push({kind,index,digest,...(key===undefined?{}:{key})});
      const raw=JSON.stringify(value);
      db.prepare('INSERT INTO cms_validation_parts(policy,kind,digest,document_json,summary_json,document_bytes) VALUES (?,?,?,?,?,?)').run('fixture',kind,digest,raw,raw,Buffer.byteLength(raw));
    };
    for(const [kind,value] of Object.entries(source)) {
      if(kind==='legacy') { for(const [name,list] of Object.entries(value)) Array.isArray(list)?list.forEach((row,index)=>add(`legacy.${name}`,index,row)):add(`legacy.${name}`,0,list); }
      else if(kind==='uiCopy') Object.entries(value).forEach(([key,copy],index)=>add(kind,index,copy,key));
      else if(Array.isArray(value)) value.forEach((row,index)=>add(kind,index,row));
      else add(kind,0,value);
    }
    db.prepare("INSERT INTO cms_save_jobs(id,actor,expected_version,policy,manifest,state,expires_at) VALUES (?,'fixture',0,'fixture',?,'open',4102444800)").run('a'.repeat(32),JSON.stringify(manifest));
    const row=db.prepare(documentAssemblySql()).get('a'.repeat(32));
    assert.deepEqual(JSON.parse(row.document),source);
    assert.equal(row.document_bytes,Buffer.byteLength(row.document));
    assert.equal(row.part_count,manifest.length);
    const { projectedDocumentSql }=await import('../worker/cms-document-sql.ts');
    const { createPublicProjectionContext,projectPublicPart }=await import('../worker/cms-projection-parts.ts');
    const { publicCmsDocument }=await import('../worker/cms-routes.ts');
    db.prepare("INSERT INTO cms_revisions(version,document,kind,actor,created_at) VALUES (1,?,'draft','fixture','2026-10-20T00:00:00Z')").run(row.document);
    db.prepare('INSERT INTO cms_revision_admissions(revision,policy,digest,document_bytes,manifest) VALUES (1,?,?,?,?)').run('fixture','d'.repeat(64),row.document_bytes,JSON.stringify(manifest));
    db.prepare(`INSERT INTO cms_artifact_catalogs(id,actor,expected_version,target_revision,source_revision,source_digest,policy,renderer,assets,origin,context_digest,state,expected_entries,expires_at)
      VALUES (?,'fixture',1,2,1,?,'fixture','renderer','assets','https://example.test',?,'building',1,4102444800)`).run('b'.repeat(32),'d'.repeat(64),'c'.repeat(64));
    const context=createPublicProjectionContext(source);
    for(const item of manifest) {
      const value=JSON.parse(db.prepare('SELECT document_json FROM cms_validation_parts WHERE policy=? AND kind=? AND digest=?').get('fixture',item.kind,item.digest).document_json);
      const projected=projectPublicPart({...item,value},context);
      db.prepare('INSERT INTO cms_projection_cache(policy,context_digest,kind,digest,part_key,public_json,original_refs,public_refs) VALUES (?,?,?,?,?,?,?,?)').run('fixture','c'.repeat(64),item.kind,item.digest,item.key??'',Object.hasOwn(projected,'value')?JSON.stringify(projected.value):null,JSON.stringify(projected.originalMediaIds),JSON.stringify(projected.publicMediaIds));
    }
    const publicRow=db.prepare(projectedDocumentSql()).get('b'.repeat(32));
    assert.deepEqual(JSON.parse(publicRow.document),publicCmsDocument(source));
    assert.equal(publicRow.document_bytes,Buffer.byteLength(publicRow.document));
  } finally { db.close(); }
});
