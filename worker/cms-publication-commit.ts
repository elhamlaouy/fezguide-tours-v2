import { CmsError, requireVersion, type CmsD1Database } from './cms-store';
import { redirectRendererId } from './cms-slug-redirects';

type Commit = {
  catalogId: string; expectedVersion: number; actor: string; mode: 'publish' | 'rollback';
  policy: string; renderer: string; assets: string; origin: string; redirects?: string;
};

/** Source bytes stay inside D1. SQL guards abort the whole batch, including trigger effects. */
export async function commitPreparedPublication(db: CmsD1Database, input: Commit) {
  requireVersion(input.expectedVersion);
  if (!/^[0-9a-f]{32}$/.test(input.catalogId) || !['publish','rollback'].includes(input.mode) ||
      !input.actor || input.actor.length>256 || [input.policy,input.renderer,input.assets,input.origin].some(v=>typeof v!=='string'||!v||v.length>512)) {
    throw new CmsError(400,'invalid_publication');
  }
  const version=input.expectedVersion+1;
  const eligible=`SELECT c.id FROM cms_artifact_catalogs c
    JOIN cms_revision_admissions a ON a.revision=c.source_revision AND a.policy=c.policy AND a.digest=c.source_digest
    JOIN cms_revisions r ON r.version=c.source_revision
    JOIN cms_documents d ON d.id=1
    WHERE c.id=? AND c.actor=? AND c.expected_version=? AND c.target_revision=?
      AND c.policy=? AND c.renderer=? AND c.assets=? AND c.origin=? AND c.mode=? AND c.state='ready' AND json_extract(c.plan_json,'$.uploadPolicy')=1
      AND c.expires_at>CAST(strftime('%s','now') AS INTEGER) AND d.version=c.expected_version
      AND NOT EXISTS(SELECT 1 FROM cms_catalog_bootstraps bootstrap WHERE bootstrap.catalog_id=c.id)
      AND NOT EXISTS(SELECT 1 FROM cms_catalog_refreshes f WHERE f.catalog_id=c.id)
      AND (c.mode='rollback' OR d.draft_revision=c.source_revision)
      AND length(CAST(r.document AS BLOB))=a.document_bytes
      AND (SELECT COUNT(*) FROM cms_artifact_entries WHERE catalog_id=c.id)=c.expected_entries
      AND (SELECT COUNT(*) FROM cms_catalog_upload_checks WHERE catalog_id=c.id)=COALESCE(json_array_length(c.plan_json,'$.uploads'),0)
      AND NOT EXISTS(SELECT 1 FROM cms_catalog_media m WHERE m.catalog_id=c.id AND NOT EXISTS(SELECT 1
        FROM cms_catalog_upload_checks u WHERE u.catalog_id=c.id AND u.media_key=m.media_key AND u.state='verified'))
      AND NOT EXISTS(SELECT 1 FROM cms_catalog_upload_checks u WHERE u.catalog_id=c.id AND u.state='verified' AND NOT EXISTS(SELECT 1
        FROM cms_catalog_media m WHERE m.catalog_id=c.id AND m.media_key=u.media_key))`;
  try {
    const renderer=await redirectRendererId(input.renderer,input.redirects);
    const values=[input.catalogId,input.actor,input.expectedVersion,version,input.policy,renderer,input.assets,input.origin,input.mode];
    const results=await db.batch([
      db.prepare(`SELECT CASE WHEN EXISTS(${eligible}) THEN 1 ELSE json('cms_publication_conflict') END`).bind(...values),
      db.prepare(`INSERT INTO cms_revisions(version,document,kind,actor,created_at,source_revision)
        SELECT ?,r.document,?,?,?,c.source_revision FROM cms_artifact_catalogs c
        JOIN cms_revisions r ON r.version=c.source_revision WHERE c.id=?`)
        .bind(version,input.mode,input.actor,new Date().toISOString(),input.catalogId),
      db.prepare('INSERT INTO cms_publications(revision,catalog_id) VALUES (?,?)').bind(version,input.catalogId),
      db.prepare(`UPDATE cms_documents SET version=?,draft_revision=?,published_revision=? WHERE id=1 AND version=?`)
        .bind(version,version,version,input.expectedVersion),
      db.prepare("UPDATE cms_artifact_catalogs SET state='published' WHERE id=? AND state='ready'").bind(input.catalogId),
      // Mint only an exact-byte copy of an existing immutable source admission.
      db.prepare(`INSERT INTO cms_revision_admissions(revision,policy,digest,document_bytes,manifest)
        SELECT ?,a.policy,a.digest,a.document_bytes,a.manifest FROM cms_artifact_catalogs c
        JOIN cms_revision_admissions a ON a.revision=c.source_revision AND a.policy=c.policy AND a.digest=c.source_digest
        WHERE c.id=?`).bind(version,input.catalogId),
      db.prepare(`SELECT CASE WHEN EXISTS(SELECT 1 FROM cms_documents d JOIN cms_publications p ON p.revision=d.published_revision
        WHERE d.id=1 AND d.version=? AND d.draft_revision=? AND p.catalog_id=?) THEN 1 ELSE json('cms_publication_incomplete') END`)
        .bind(version,version,input.catalogId),
    ]);
    if(results.length!==7||results.some(r=>!r.success)) throw new CmsError(503,'cms_unavailable');
  } catch(error) {
    if(error instanceof CmsError) throw error;
    if(error instanceof Error&&error.message.includes('cms_revision_storage_budget')) throw new CmsError(507,'cms_revision_storage_budget');
    // Only the transaction's known guards mean conflict; an outage is not a stale edit.
    if(error instanceof Error && /malformed JSON|cms_publication_(?:mismatch|conflict|incomplete)|cms_catalog_(?:sealed|incomplete)/.test(error.message)) throw new CmsError(409,'publication_conflict');
    throw new CmsError(503,'cms_unavailable');
  }
  return {version,draftRevision:version,published:true};
}



type RefreshCommit = Omit<Commit,'mode'> & { expectedPublishedRevision: number; expectedPreviousCatalogId: string; shell: string };
/** Strict single-use activation: no content, history, admission or publication writes. */
export async function commitPreparedRefresh(db: CmsD1Database, input: RefreshCommit) {
  requireVersion(input.expectedVersion); requireVersion(input.expectedPublishedRevision);
  if(!/^[a-f0-9]{64}$/.test(input.shell)||!/^[a-f0-9]{32}$/.test(input.catalogId)||!/^[a-f0-9]{32}$/.test(input.expectedPreviousCatalogId)||
    typeof input.actor!=='string'||!input.actor||input.actor.length>256||
    [input.policy,input.renderer,input.assets,input.origin].some(v=>typeof v!=='string'||!v||v.length>512))throw new CmsError(400,'invalid_publication');
  try {
    const renderer=await redirectRendererId(input.renderer,input.redirects);
    const eligible=`SELECT c.id FROM cms_catalog_refreshes f
      JOIN cms_artifact_catalogs c ON c.id=f.catalog_id AND c.mode='publish' AND c.target_revision=c.expected_version+1
        AND c.source_revision=f.revision AND c.expected_version=f.expected_version
        AND c.policy=f.policy AND c.renderer=f.renderer AND c.assets=f.assets AND c.origin=f.origin
      JOIN cms_documents d ON d.id=1 AND d.version=f.expected_version AND d.published_revision=f.revision AND d.draft_revision=f.draft_revision
      JOIN cms_publications p ON p.revision=f.revision AND p.catalog_id=f.previous_catalog_id
      JOIN cms_revision_admissions a ON a.revision=f.revision AND a.policy=f.policy AND a.digest=c.source_digest AND a.document_bytes=f.document_bytes
      JOIN cms_revisions r ON r.version=a.revision AND length(CAST(r.document AS BLOB))=f.document_bytes
      WHERE c.id=? AND c.actor=? AND c.expected_version=? AND f.revision=? AND f.previous_catalog_id=?
        AND c.policy=? AND c.renderer=? AND c.assets=? AND c.origin=? AND f.shell=? AND c.state=?
        AND c.expires_at>CAST(strftime('%s','now') AS INTEGER) AND c.public_json IS NOT NULL
        AND json_extract(c.plan_json,'$.uploadPolicy')=1 AND json_array_length(c.plan_json,'$.entries')=c.expected_entries
        AND NOT EXISTS(SELECT 1 FROM cms_catalog_bootstraps b WHERE b.catalog_id=c.id)
        AND NOT EXISTS(SELECT 1 FROM cms_publications existing WHERE existing.catalog_id=c.id)
        AND (SELECT COUNT(*) FROM cms_artifact_entries WHERE catalog_id=c.id)=c.expected_entries
        AND NOT EXISTS(SELECT 1 FROM json_each(c.plan_json,'$.entries') planned WHERE NOT EXISTS(
          SELECT 1 FROM cms_artifact_entries e JOIN cms_artifact_reservations reservation
            ON reservation.catalog_id=e.catalog_id AND reservation.path=e.path AND reservation.bytes=e.bytes AND reservation.state='stored'
          WHERE e.catalog_id=c.id AND e.path=json_extract(planned.value,'$.path')))
        AND (SELECT COUNT(*) FROM cms_artifact_reservations WHERE catalog_id=c.id)=c.expected_entries
        AND (SELECT COUNT(*) FROM cms_catalog_upload_checks WHERE catalog_id=c.id)=COALESCE(json_array_length(c.plan_json,'$.uploads'),0)
        AND NOT EXISTS(SELECT 1 FROM cms_catalog_media m WHERE m.catalog_id=c.id AND NOT EXISTS(
          SELECT 1 FROM cms_catalog_upload_checks u WHERE u.catalog_id=c.id AND u.media_key=m.media_key AND u.state='verified'))
        AND NOT EXISTS(SELECT 1 FROM cms_catalog_upload_checks u WHERE u.catalog_id=c.id AND u.state='verified' AND NOT EXISTS(
          SELECT 1 FROM cms_catalog_media m WHERE m.catalog_id=c.id AND m.media_key=u.media_key))`;
    const values=[input.catalogId,input.actor,input.expectedVersion,input.expectedPublishedRevision,input.expectedPreviousCatalogId,input.policy,renderer,input.assets,input.origin,input.shell];
    const results=await db.batch([
      db.prepare(`SELECT CASE WHEN EXISTS(${eligible}) THEN 1 ELSE json('cms_catalog_refresh_conflict') END`).bind(...values,'ready'),
      db.prepare("UPDATE cms_artifact_catalogs SET state='published' WHERE id=? AND state='ready'").bind(input.catalogId),
      // SQL assertion, not a post-commit JS check: suppressed updates and trigger pointer drift roll back everything.
      db.prepare(`SELECT CASE WHEN EXISTS(${eligible}) THEN 1 ELSE json('cms_catalog_refresh_incomplete') END`).bind(...values,'published'),
    ]);
    if(results.length!==3||results.some(result=>!result.success))throw new CmsError(503,'cms_unavailable');
    return {version:input.expectedVersion,publishedRevision:input.expectedPublishedRevision,published:true,refresh:true};
  } catch(error) {
    if(error instanceof CmsError)throw error;
    if(error instanceof Error&&/malformed JSON|cms_catalog_|cms_publication_/.test(error.message))throw new CmsError(409,'publication_conflict');
    throw new CmsError(503,'cms_unavailable');
  }
}

type BootstrapCommit = Omit<Commit,'mode'>;
/** Seal the first prepared public catalog against the existing pointer only. */
export async function commitPreparedBootstrap(db: CmsD1Database, input: BootstrapCommit) {
  requireVersion(input.expectedVersion);
  if (!/^[0-9a-f]{32}$/.test(input.catalogId) || !input.actor || input.actor.length>256 ||
      [input.policy,input.renderer,input.assets,input.origin].some(v=>typeof v!=='string'||!v||v.length>512)) {
    throw new CmsError(400,'invalid_publication');
  }
  try {
    const renderer=await redirectRendererId(input.renderer,input.redirects);
    const eligible=`SELECT c.id FROM cms_artifact_catalogs c
      JOIN cms_catalog_bootstraps b ON b.catalog_id=c.id AND b.revision=c.source_revision AND b.expected_version=c.expected_version
      JOIN cms_revision_admissions a ON a.revision=c.source_revision AND a.policy=c.policy AND a.digest=c.source_digest
      JOIN cms_revisions r ON r.version=c.source_revision
      JOIN cms_documents d ON d.id=1
      JOIN cms_revision_admissions active ON active.revision=d.published_revision AND active.policy=c.policy
        AND active.digest=c.source_digest AND active.document_bytes=a.document_bytes AND active.manifest=a.manifest
      WHERE c.id=? AND c.actor=? AND c.expected_version=? AND c.target_revision=c.expected_version+1
        AND c.policy=? AND c.renderer=? AND c.assets=? AND c.origin=? AND c.mode='publish'
        AND c.state IN ('ready','published') AND (c.state='published' OR c.expires_at>CAST(strftime('%s','now') AS INTEGER))
        AND c.expires_at>0 AND d.version=c.expected_version AND d.published_revision=b.revision
        AND NOT EXISTS(SELECT 1 FROM cms_publications p WHERE p.revision=b.revision)
        AND NOT EXISTS(SELECT 1 FROM cms_catalog_refreshes f WHERE f.catalog_id=c.id)
        AND length(CAST(r.document AS BLOB))=a.document_bytes
        AND (SELECT COUNT(*) FROM cms_artifact_entries WHERE catalog_id=c.id)=c.expected_entries
        AND (SELECT COUNT(*) FROM cms_catalog_upload_checks WHERE catalog_id=c.id)=COALESCE(json_array_length(c.plan_json,'$.uploads'),0)
        AND NOT EXISTS(SELECT 1 FROM cms_catalog_media m WHERE m.catalog_id=c.id AND NOT EXISTS(SELECT 1
          FROM cms_catalog_upload_checks u WHERE u.catalog_id=c.id AND u.media_key=m.media_key AND u.state='verified'))
        AND NOT EXISTS(SELECT 1 FROM cms_catalog_upload_checks u WHERE u.catalog_id=c.id AND u.state='verified' AND NOT EXISTS(SELECT 1
          FROM cms_catalog_media m WHERE m.catalog_id=c.id AND m.media_key=u.media_key))`;
    const values=[input.catalogId,input.actor,input.expectedVersion,input.policy,renderer,input.assets,input.origin];
    const results=await db.batch([
      db.prepare(`SELECT CASE WHEN EXISTS(${eligible}) THEN 1 ELSE json('cms_bootstrap_conflict') END`).bind(...values),
      db.prepare(`UPDATE cms_artifact_catalogs SET state='published' WHERE id=? AND state='ready'`).bind(input.catalogId),
      db.prepare(`SELECT d.version,d.draft_revision,d.published_revision FROM cms_documents d
        JOIN cms_catalog_bootstraps b ON b.revision=d.published_revision AND b.expected_version=d.version
        JOIN cms_artifact_catalogs c ON c.id=b.catalog_id AND c.state='published'
        WHERE d.id=1 AND c.id=? AND d.version=? AND c.source_revision=d.published_revision`)
        .bind(input.catalogId,input.expectedVersion),
    ]);
    if(results.length!==3||results.some(result=>!result.success))throw new CmsError(503,'cms_unavailable');
    const pointer=results[2].results?.[0] as {version:number;draft_revision:number|null;published_revision:number}|undefined;
    if(!pointer||pointer.version!==input.expectedVersion||pointer.published_revision===null)throw new CmsError(409,'publication_conflict');
    return {version:pointer.version,draftRevision:pointer.draft_revision,published:true,bootstrap:true};
  } catch(error) {
    if(error instanceof CmsError)throw error;
    if(error instanceof Error&&/malformed JSON|cms_bootstrap_|cms_catalog_/.test(error.message))throw new CmsError(409,'publication_conflict');
    throw new CmsError(503,'cms_unavailable');
  }
}
