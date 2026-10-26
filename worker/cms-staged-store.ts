import type { AdminWriteResult } from '../src/admin/admin-api';
import { CMS_LIMITS, CMS_PART_FIELDS, isCmsPartEnvelope, validateCmsPart, validateCmsRelationships, type CmsPart } from '../src/cms/schema';
import { assembleCmsDocument, referenceSummary } from '../src/cms/document-parts';
import { documentAssemblySql } from './cms-document-sql';
import { CmsError, requireVersion, type CmsD1Database, type CmsD1Result } from './cms-store';

export type CmsSaveManifestEntry = { kind: string; index: number; key?: string; digest: string };
type Job = { id: string; actor: string; expected_version: number; policy: string; manifest: string; state: string; live: number; renew_at: number; published_revision: number | null };
const clock = "CAST(strftime('%s','now') AS INTEGER)";
const maxParts = 1 + Object.values(CMS_PART_FIELDS).reduce((sum, field) => sum + field.max, 0);
function actorCheck(actor: string) {
  if (typeof actor !== 'string' || !actor || actor.length > 256) throw new CmsError(400, 'invalid_actor');
}
function manifestCheck(input: unknown): asserts input is CmsSaveManifestEntry[] {
  try {
    if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype || input.length > maxParts || Reflect.ownKeys(input).length !== input.length + 1) throw new Error();
    if (Object.entries(Object.getOwnPropertyDescriptors(input)).some(([key, d]) => key !== 'length' && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= input.length || !d.enumerable || d.get || d.set))) throw new Error();
    const counts = Object.fromEntries(Object.keys(CMS_PART_FIELDS).map(kind => [kind, 0]));
    const parts = input.map(entry => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry) || ![Object.prototype, null].includes(Object.getPrototypeOf(entry))) throw new Error();
      const descriptors = Object.getOwnPropertyDescriptors(entry);
      if (Reflect.ownKeys(entry).some(key => typeof key !== 'string' || !['kind', 'index', 'key', 'digest'].includes(key)) ||
          Object.values(descriptors).some(d => !d.enumerable || d.get || d.set) ||
          !['kind', 'index', 'digest'].every(key => Object.hasOwn(descriptors, key))) throw new Error();
      const { digest: hash, ...metadata } = entry;
      const part = { ...metadata, value: null };
      if (typeof hash !== 'string' || !/^[0-9a-f]{64}$/.test(hash) || !isCmsPartEnvelope(part)) throw new Error();
      if (part.kind !== 'manifest') counts[part.kind]++;
      return part;
    });
    // The declared count part is admitted later. Here the same assembler enforces
    // singleton closure, contiguous indices, duplicate keys, and aggregate limits.
    assembleCmsDocument(parts.map(part => part.kind === 'manifest' ? { ...part, value: counts } : part));
  } catch { throw new CmsError(400, 'invalid_manifest'); }
}
const encode = (value: string) => new TextEncoder().encode(value);
async function digest(raw: string): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encode(raw))), b => b.toString(16).padStart(2, '0')).join('');
}
function failure(error: unknown): never {
  if (error instanceof CmsError) throw error;
  if (error instanceof Error && error.message.includes('cms_revision_storage_budget')) throw new CmsError(507, 'cms_revision_storage_budget');
  if (error instanceof Error && /malformed JSON|UNIQUE constraint failed: cms_save_jobs/.test(error.message)) throw new CmsError(409, 'save_conflict');
  throw new CmsError(503, 'cms_unavailable');
}
function successful(results: CmsD1Result[], count: number) {
  if (results.length !== count || results.some(r => !r.success)) throw new CmsError(503, 'cms_unavailable');
}

/** Authenticated router owns identity, rate charging and request-body limits. */
export class StagedCmsStore {
  constructor(private db: CmsD1Database, private policy: string) {}

  async startSave(expectedVersion: number, actor: string, manifest: CmsSaveManifestEntry[]): Promise<{ id: string; missing: number[] }> {
    requireVersion(expectedVersion);
    actorCheck(actor);
    if (typeof this.policy !== 'string' || !this.policy || this.policy.length > 512) throw new CmsError(400, 'invalid_policy');
    manifestCheck(manifest);
    const id = crypto.randomUUID().replaceAll('-', '');
    const rawManifest = JSON.stringify(manifest);
    try {
      // Supersede only the job observed by this explicit start. A competing start
      // that replaces it first wins; this request cannot expire the unseen winner.
      const observed = await this.db.prepare("SELECT id FROM cms_save_jobs WHERE state='open'").first<{ id: string }>();
      successful(await this.db.batch([
        this.db.prepare(`UPDATE cms_save_jobs SET state='expired' WHERE state='open'
          AND (expires_at<=${clock} OR expected_version<>(SELECT version FROM cms_documents WHERE id=1))`),
        this.db.prepare(`SELECT CASE WHEN EXISTS(SELECT 1 FROM cms_documents WHERE id=1 AND version=?) THEN 1 ELSE json('save_conflict') END`).bind(expectedVersion),
        this.db.prepare(`UPDATE cms_save_jobs SET state='expired' WHERE id=? AND state='open' AND actor=?
          AND expected_version=? AND (policy<>? OR manifest<>?)`)
          .bind(observed?.id ?? null, actor, expectedVersion, this.policy, rawManifest),
        this.db.prepare(`INSERT INTO cms_save_jobs(id,actor,expected_version,policy,manifest,state,expires_at)
          SELECT ?,?,?,?,?,'open',${clock}+1800 WHERE NOT EXISTS(SELECT 1 FROM cms_save_jobs WHERE state='open')`)
          .bind(id, actor, expectedVersion, this.policy, rawManifest),
        this.db.prepare(`UPDATE cms_save_jobs SET expires_at=${clock}+1800 WHERE state='open' AND expires_at>${clock}
          AND actor=? AND expected_version=? AND policy=? AND manifest=?`)
          .bind(actor, expectedVersion, this.policy, rawManifest),
        this.db.prepare(`SELECT CASE WHEN EXISTS(SELECT 1 FROM cms_save_jobs WHERE state='open' AND expires_at>${clock}
          AND actor=? AND expected_version=? AND policy=? AND manifest=?) THEN 1 ELSE json('save_conflict') END`)
          .bind(actor, expectedVersion, this.policy, rawManifest),
      ]), 6);
      // One guarded read returns the current identity and fresh cache offsets; a
      // concurrent commit/supersession must never look like an empty missing list.
      const result = await this.db.prepare(`SELECT j.id,(SELECT json_group_array(CAST(m.key AS INTEGER)) FROM json_each(j.manifest) m
        WHERE NOT EXISTS(SELECT 1 FROM cms_validation_parts p WHERE p.policy=j.policy
          AND p.kind=json_extract(m.value,'$.kind') AND p.digest=json_extract(m.value,'$.digest'))) AS missing
        FROM cms_save_jobs j JOIN cms_documents d ON d.id=1 AND d.version=j.expected_version
        WHERE j.state='open' AND j.expires_at>${clock} AND j.actor=? AND j.expected_version=? AND j.policy=? AND j.manifest=?`)
        .bind(actor, expectedVersion, this.policy, rawManifest).first<{ id: string; missing: string }>();
      if (!result) throw new CmsError(409, 'save_conflict');
      return { id: result.id, missing: JSON.parse(result.missing) };
    } catch (error) { failure(error); }
  }

  private async job(id: string, actor: string): Promise<Job> {
    const job = await this.db.prepare(`SELECT j.*,d.published_revision,j.expires_at>${clock} AS live,${clock}+1800 AS renew_at FROM cms_save_jobs j
      JOIN cms_documents d ON d.id=1 AND d.version=j.expected_version WHERE j.id=?`).bind(id).first<Job>();
    if (!job || job.actor !== actor || job.policy !== this.policy || job.state !== 'open' || !job.live) throw new CmsError(409, 'save_conflict');
    return job;
  }

  async putPart(jobId: string, actor: string, part: CmsPart): Promise<void> {
    try {
      const job = await this.job(jobId, actor);
      if (!validateCmsPart(part).valid) throw new CmsError(422, 'invalid_part');
      // Snapshot envelope and derived summary before the first async hash yields.
      // Callers cannot make a cached summary disagree with its admitted raw bytes.
      part = { ...part };
      const raw = JSON.stringify(part.value);
      const bytes = encode(raw).byteLength;
      if (bytes > CMS_LIMITS.bytes) throw new CmsError(413, 'part_too_large');
      const summary = JSON.stringify(referenceSummary(part).value);
      const hash = await digest(raw);
      const declared = (JSON.parse(job.manifest) as CmsSaveManifestEntry[]).some(m => m.kind === part.kind && m.index === part.index && m.key === part.key && m.digest === hash);
      if (!declared) throw new CmsError(422, 'part_mismatch');
      successful(await this.db.batch([
        this.db.prepare(`SELECT CASE WHEN EXISTS(SELECT 1 FROM cms_save_jobs j JOIN cms_documents d ON d.id=1
          WHERE j.id=? AND j.actor=? AND j.policy=? AND j.state='open' AND j.expires_at>${clock}
          AND j.manifest=? AND j.expected_version=? AND d.version=j.expected_version) THEN 1 ELSE json('save_conflict') END`)
          .bind(jobId, actor, this.policy, job.manifest, job.expected_version),
        this.db.prepare(`INSERT INTO cms_validation_parts(policy,kind,digest,document_json,summary_json,document_bytes)
          SELECT ?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM cms_validation_parts WHERE policy=? AND kind=? AND digest=?)
          AND COALESCE((SELECT SUM(document_bytes+length(CAST(summary_json AS BLOB))) FROM cms_validation_parts),0)+?<=67108864`)
          .bind(this.policy, part.kind, hash, raw, summary, bytes, this.policy, part.kind, hash, bytes + encode(summary).byteLength),
        // Renew only after actual admission (including an immutable cache hit).
        // The timestamp comes from the database clock, never from the client.
        this.db.prepare(`UPDATE cms_save_jobs SET expires_at=max(expires_at,?) WHERE id=? AND actor=? AND policy=? AND state='open'
          AND expires_at>${clock} AND manifest=? AND expected_version=(SELECT version FROM cms_documents WHERE id=1)
          AND EXISTS(SELECT 1 FROM cms_validation_parts WHERE policy=? AND kind=? AND digest=?)`)
          .bind(job.renew_at, jobId, actor, this.policy, job.manifest, this.policy, part.kind, hash),
        // A missing receipt is reported as the storage-budget error below. A stale,
        // suppressed or racing lease write must instead roll back the whole batch.
        this.db.prepare(`SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM cms_validation_parts WHERE policy=? AND kind=? AND digest=?)
          OR EXISTS(SELECT 1 FROM cms_save_jobs j JOIN cms_documents d ON d.id=1 AND d.version=j.expected_version
            WHERE j.id=? AND j.actor=? AND j.policy=? AND j.state='open' AND j.expires_at>${clock}
              AND j.manifest=? AND j.expected_version=? AND j.expires_at>=?)
          THEN 1 ELSE json('save_conflict') END`)
          .bind(this.policy, part.kind, hash, jobId, actor, this.policy, job.manifest, job.expected_version, job.renew_at),
      ]), 4);
      // The guarded INSERT is the only cache write. A cap miss changes no row;
      // exact duplicates need no space and are never UPDATEd/REPLACEd.
      const cached = await this.db.prepare('SELECT 1 AS present FROM cms_validation_parts WHERE policy=? AND kind=? AND digest=?')
        .bind(this.policy, part.kind, hash).first();
      if (!cached) throw new CmsError(507, 'cms_part_storage_budget');
    } catch (error) { failure(error); }
  }

  async finishSave(jobId: string, actor: string, recoveryId?: string): Promise<AdminWriteResult> {
    try {
      const job = await this.job(jobId, actor);
      const manifest = JSON.parse(job.manifest) as CmsSaveManifestEntry[];
      // Reject missing/obviously oversized expanded source using scalars before
      // materializing any summaries. Exclude the count part (not source content).
      const budget = await this.db.prepare(`SELECT COUNT(*) AS part_count,
        COALESCE(SUM(CASE WHEN p.kind='manifest' THEN 0 ELSE p.document_bytes END),0) AS source_bytes
        FROM cms_save_jobs j,json_each(j.manifest) m JOIN cms_validation_parts p ON p.policy=j.policy
        AND p.kind=json_extract(m.value,'$.kind') AND p.digest=json_extract(m.value,'$.digest') WHERE j.id=?`)
        .bind(jobId).first<{ part_count: number; source_bytes: number }>();
      if (!budget) throw new CmsError(503, 'cms_unavailable');
      if (budget.part_count !== manifest.length) throw new CmsError(409, 'parts_missing');
      if (budget.source_bytes > CMS_LIMITS.bytes) throw new CmsError(413, 'document_too_large');
      const summaries = await this.db.prepare(`SELECT json_extract(m.value,'$.kind') AS kind,json_extract(m.value,'$.index') AS position,
        json_extract(m.value,'$.key') AS field_key,p.summary_json FROM cms_save_jobs j,json_each(j.manifest) m
        JOIN cms_validation_parts p ON p.policy=j.policy AND p.kind=json_extract(m.value,'$.kind') AND p.digest=json_extract(m.value,'$.digest')
        WHERE j.id=? ORDER BY CAST(m.key AS INTEGER)`).bind(jobId)
        .all<{ kind: string; position: number; field_key: string | null; summary_json: string }>();
      if (!summaries.success) throw new CmsError(503, 'cms_unavailable');
      if (summaries.results?.length !== manifest.length) throw new CmsError(409, 'parts_missing');
      try {
        const small = assembleCmsDocument(summaries.results.map(row => ({ kind: row.kind, index: row.position,
          ...(row.field_key === null ? {} : { key: row.field_key }), value: JSON.parse(row.summary_json) })));
        if (validateCmsRelationships(small).length) throw new Error();
      } catch { throw new CmsError(422, 'invalid_document'); }
      const assembled = await this.db.prepare(documentAssemblySql()).bind(jobId).first<{ document: string; document_bytes: number; part_count: number }>();
      if (!assembled || assembled.part_count !== manifest.length) throw new CmsError(409, 'parts_missing');
      if (assembled.document_bytes > CMS_LIMITS.bytes) throw new CmsError(413, 'document_too_large');
      const hash = await digest(assembled.document);
      const version = job.expected_version + 1;
      successful(await this.db.batch([
        ...(recoveryId ? [this.db.prepare(`SELECT CASE WHEN EXISTS(SELECT 1 FROM cms_restore_jobs r JOIN cms_save_jobs s ON s.id=r.save_job_id
          WHERE r.id=? AND r.actor=? AND r.policy=? AND r.expected_version=? AND r.state='open' AND r.expires_at>unixepoch()
          AND s.id=? AND r.checked_parts=json_array_length(s.manifest)
          AND r.checked_media=(SELECT COUNT(*) FROM cms_restore_media WHERE job_id=r.id)) THEN 1 ELSE json('restore_incomplete') END`)
          .bind(recoveryId,actor,this.policy,job.expected_version,jobId)] : []),
        this.db.prepare(`SELECT CASE WHEN EXISTS(SELECT 1 FROM cms_save_jobs j JOIN cms_documents d ON d.id=1
          WHERE j.id=? AND j.actor=? AND j.policy=? AND j.state='open' AND j.expires_at>${clock}
          AND j.manifest=? AND j.expected_version=? AND d.version=j.expected_version) THEN 1 ELSE json('save_conflict') END`)
          .bind(jobId, actor, this.policy, job.manifest, job.expected_version),
        // Bind the already-native string only as an exact-byte equality guard. It
        // is never parsed/stringified; a second SQL assembly must match the hash input.
        this.db.prepare(`INSERT INTO cms_revisions(version,document,kind,actor,created_at,source_revision)
          SELECT ?,document,'draft',?,strftime('%Y-%m-%dT%H:%M:%fZ','now'),NULL FROM (${documentAssemblySql()})
          WHERE document_bytes=? AND document_bytes<=? AND part_count=? AND document=?`)
          .bind(version, actor, jobId, assembled.document_bytes, CMS_LIMITS.bytes, manifest.length, assembled.document),
        this.db.prepare(`INSERT INTO cms_revision_admissions(revision,policy,digest,document_bytes,manifest) VALUES (?,?,?,?,?)`)
          .bind(version, this.policy, hash, assembled.document_bytes, job.manifest),
        this.db.prepare('UPDATE cms_documents SET version=?,draft_revision=? WHERE id=1 AND version=?').bind(version, version, job.expected_version),
        this.db.prepare("UPDATE cms_save_jobs SET state='committed',result_revision=? WHERE id=? AND state='open'").bind(version, jobId),
        this.db.prepare(`SELECT CASE WHEN EXISTS(SELECT 1 FROM cms_documents d JOIN cms_save_jobs j ON j.result_revision=d.draft_revision
          JOIN cms_revision_admissions a ON a.revision=d.draft_revision AND a.policy=j.policy
          JOIN cms_revisions r ON r.version=d.draft_revision
          WHERE d.id=1 AND d.version=? AND d.draft_revision=? AND d.published_revision IS ?
          AND j.id=? AND j.state='committed' AND j.actor=? AND j.policy=? AND j.manifest=? AND j.expected_version=?
          AND a.digest=? AND a.manifest=j.manifest AND a.document_bytes=? AND a.document_bytes=length(CAST(r.document AS BLOB))
          AND r.kind='draft' AND r.actor=j.actor AND r.source_revision IS NULL)
          THEN 1 ELSE json('save_incomplete') END`)
          .bind(version, version, job.published_revision, jobId, actor, this.policy, job.manifest, job.expected_version, hash, assembled.document_bytes),
        ...(recoveryId ? [this.db.prepare("UPDATE cms_restore_jobs SET state='committed',result_revision=? WHERE id=? AND state='open'").bind(version,recoveryId),
          this.db.prepare("SELECT CASE WHEN EXISTS(SELECT 1 FROM cms_restore_jobs WHERE id=? AND state='committed' AND result_revision=? AND save_job_id=?) THEN 1 ELSE json('restore_incomplete') END").bind(recoveryId,version,jobId)] : []),
      ]), 6 + (recoveryId ? 3 : 0));
      return { version, draftRevision: version, published: false };
    } catch (error) { failure(error); }
  }

  /** Each result is scalar metadata plus at most one fixed-size BLOB slice. */
  async readBounded(params: URLSearchParams, revision?: number): Promise<Response> {
    const mode = params.get('read');
    const allowed = mode === 'meta' ? ['read'] : mode === 'verify' ? ['read', 'pin'] : mode === 'slice' ? ['read', 'pin', 'part'] : [];
    if (!allowed.length || [...params.keys()].some(key => !allowed.includes(key) || params.getAll(key).length !== 1) || allowed.some(key => !params.has(key))) throw new CmsError(400, 'invalid_read');
    const pin = params.get('pin');
    const part = params.get('part');
    if (mode !== 'meta' && !/^[a-f0-9]{64}$/.test(pin!)) throw new CmsError(400, 'invalid_read');
    if (mode === 'slice' && (!/^[1-9]\d{0,2}$/.test(part!) || Number(part) > Math.ceil(CMS_LIMITS.bytes / 32768))) throw new CmsError(400, 'invalid_read');
    if (revision !== undefined) { requireVersion(revision); if (revision < 1) throw new CmsError(400, 'invalid_read'); }
    try {
      // These immutable identities suffice without returning the potentially large manifest:
      // PK(revision,policy), cms_admission_immutable_{update,delete}, and revision
      // no_update/no_delete triggers are installed by migrations 0001/0004.
      const row = await this.db.prepare(`SELECT ${revision === undefined ? 'd.version,d.draft_revision,d.published_revision,' : ''}
        r.version AS revision,r.kind,r.created_at,r.source_revision,a.digest,a.document_bytes,
        length(CAST(r.document AS BLOB)) AS actual_bytes
        ${mode === 'slice' ? ',substr(CAST(r.document AS BLOB),?,32768) AS chunk' : ''}
        FROM ${revision === undefined ? 'cms_documents d LEFT JOIN cms_revisions r ON r.version=d.draft_revision' : 'cms_revisions r'}
        LEFT JOIN cms_revision_admissions a ON a.revision=r.version AND a.policy=?
        WHERE ${revision === undefined ? 'd.id=1' : 'r.version=?'}`)
        .bind(...(mode === 'slice' ? [(Number(part) - 1) * 32768 + 1] : []), this.policy, ...(revision === undefined ? [] : [revision]))
        .first<{ version: number; draft_revision: number | null; published_revision: number | null; revision: number | null; kind: string; created_at: string; source_revision: number | null; digest: string | null; document_bytes: number | null; actual_bytes: number | null; chunk?: number[] | Uint8Array | ArrayBuffer }>();
      if (!row) throw new CmsError(revision === undefined ? 503 : 404, revision === undefined ? 'cms_unavailable' : 'revision_not_found');
      const empty = revision === undefined && row.version === 0 && row.draft_revision === null && row.published_revision === null;
      if (!empty && (row.revision === null || row.digest === null || row.document_bytes !== row.actual_bytes)) throw new CmsError(409, 'admission_required');
      if (!empty && (!Number.isSafeInteger(row.document_bytes) || row.document_bytes! < 1 || row.document_bytes! > CMS_LIMITS.bytes || !/^[a-f0-9]{64}$/.test(row.digest!))) throw new CmsError(503, 'cms_unavailable');
      const metadata = { processing: 'staged-v1', readProtocol: 'bounded-v1',
        ...(revision === undefined ? { version: row.version, draftRevision: row.draft_revision, publishedRevision: row.published_revision }
          : { version: row.revision, kind: row.kind, createdAt: row.created_at, sourceRevision: row.source_revision }),
        revision: row.revision, policy: this.policy, digest: empty ? null : row.digest, bytes: empty ? 0 : row.document_bytes, sliceBytes: 32768 };
      const identity = await digest(JSON.stringify(metadata));
      if (mode !== 'meta' && pin !== identity) throw new CmsError(409, 'read_conflict');
      if (mode === 'slice') {
        if (empty || Number(part) > Math.ceil(row.document_bytes! / 32768)) throw new CmsError(400, 'invalid_read');
        const chunk = row.chunk instanceof ArrayBuffer ? new Uint8Array(row.chunk) : new Uint8Array(row.chunk!);
        if (chunk.byteLength !== Math.min(32768, row.document_bytes! - (Number(part) - 1) * 32768)) throw new CmsError(503, 'cms_unavailable');
        return new Response(chunk, { headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store' } });
      }
      return this.response(JSON.stringify({ ...metadata, pin: identity }));
    } catch (error) { failure(error); }
  }

  async readRawContent(): Promise<Response> {
    try {
      const row = await this.db.prepare(`SELECT d.version,d.draft_revision,d.published_revision,r.document,a.revision AS admitted
        FROM cms_documents d LEFT JOIN cms_revisions r ON r.version=d.draft_revision
        LEFT JOIN cms_revision_admissions a ON a.revision=r.version AND a.policy=? AND a.document_bytes=length(CAST(r.document AS BLOB)) WHERE d.id=1`)
        .bind(this.policy).first<{ version: number; draft_revision: number | null; published_revision: number | null; document: string | null; admitted: number | null }>();
      if (!row) throw new CmsError(503, 'cms_unavailable');
      const uninitialized = row.version === 0 && row.draft_revision === null && row.published_revision === null;
      if (!uninitialized && row.admitted === null) throw new CmsError(409, 'admission_required');
      const metadata = JSON.stringify({ version: row.version, draftRevision: row.draft_revision, publishedRevision: row.published_revision });
      return this.response(metadata.slice(0, -1) + ',"document":' + (row.document ?? 'null') + '}');
    } catch (error) { failure(error); }
  }

  async readRawRevision(version: number): Promise<Response> {
    requireVersion(version);
    try {
      const row = await this.db.prepare(`SELECT r.*,a.revision AS admitted FROM cms_revisions r LEFT JOIN cms_revision_admissions a
        ON a.revision=r.version AND a.policy=? AND a.document_bytes=length(CAST(r.document AS BLOB)) WHERE r.version=?`)
        .bind(this.policy, version).first<{ version: number; kind: string; created_at: string; source_revision: number | null; document: string; admitted: number | null }>();
      if (!row) throw new CmsError(404, 'revision_not_found');
      if (row.admitted === null) throw new CmsError(409, 'admission_required');
      const metadata = JSON.stringify({ version: row.version, kind: row.kind, createdAt: row.created_at, sourceRevision: row.source_revision });
      return this.response(metadata.slice(0, -1) + ',"document":' + row.document + '}');
    } catch (error) { failure(error); }
  }

  private response(raw: string): Response {
    return new Response(raw, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
}
