// Structural D1 types keep this module independent of Cloudflare global declarations.
export interface CmsD1Result<T = Record<string, unknown>> {
  success: boolean;
  results?: T[];
  meta?: { changes?: number };
}
export interface CmsD1Statement {
  bind(...values: (string | number | null)[]): CmsD1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<CmsD1Result<T>>;
  run(): Promise<CmsD1Result>;
}
export interface CmsD1Database {
  prepare(sql: string): CmsD1Statement;
  // D1 batch executes all statements atomically and rolls back on any failure.
  batch(statements: CmsD1Statement[]): Promise<CmsD1Result[]>;
}
export type CmsDocument = object;
// Accept a validated document or the schema module's discriminated result.
// The injected validator must reject unknown/private fields and unsafe content.
export type CmsDocumentValidator = (value: unknown) => CmsDocument | { valid: boolean; document?: CmsDocument };
export const MAX_DOCUMENT_BYTES = 2_000_000;
// Kept in sync with migration 0003; includes all retained immutable revisions.
export const MAX_REVISION_COUNT = 1000;
export const MAX_REVISION_DOCUMENT_BYTES = 24 * 1024 * 1024;

export class CmsError extends Error {
  constructor(public status: number, public code: string, public retryAfter?: number) { super(code); }
}
interface StateRow {
  version: number;
  draft_revision: number | null;
  published_revision: number | null;
  document: string | null;
}
interface RevisionRow {
  version: number;
  document: string;
  kind: 'draft' | 'publish' | 'rollback';
  actor: string;
  created_at: string;
  source_revision: number | null;
}
export function requireVersion(value: unknown): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) >= Number.MAX_SAFE_INTEGER) {
    throw new CmsError(400, 'invalid_version');
  }
}

export class CmsStore {
  constructor(private db: CmsD1Database, private validateDocument: CmsDocumentValidator) {}

  validate(value: unknown): CmsDocument {
    try {
      let result = this.validateDocument(value);
      if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error();
      if ('valid' in result) {
        const validation = result as { valid: boolean; document?: object };
        if (validation.valid !== true || !validation.document || typeof validation.document !== 'object' || Array.isArray(validation.document)) throw new Error();
        result = validation.document;
      }
      if (new TextEncoder().encode(JSON.stringify(result)).byteLength > MAX_DOCUMENT_BYTES) {
        throw new CmsError(413, 'document_too_large');
      }
      return result;
    } catch (error) {
      if (error instanceof CmsError) throw error;
      throw new CmsError(422, 'invalid_document');
    }
  }

  async read() {
    const row = await this.db.prepare(`SELECT d.version, d.draft_revision, d.published_revision, r.document
      FROM cms_documents d LEFT JOIN cms_revisions r ON r.version = d.draft_revision WHERE d.id = 1`).first<StateRow>();
    if (!row) throw new CmsError(503, 'cms_unavailable');
    return { version: row.version, draftRevision: row.draft_revision, publishedRevision: row.published_revision,
      document: row.document === null ? null : this.validate(JSON.parse(row.document)) };
  }

  async readPublished() {
    const row = await this.db.prepare(`SELECT r.version, r.document FROM cms_documents d
      JOIN cms_revisions r ON r.version = d.published_revision WHERE d.id = 1`).first<{ version: number; document: string }>();
    return row ? { version: row.version, document: this.validate(JSON.parse(row.document)) } : null;
  }

  async revisions(limit = 50, before = Number.MAX_SAFE_INTEGER) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger(before) || before < 1) {
      throw new CmsError(400, 'invalid_pagination');
    }
    const result = await this.db.prepare(`SELECT version, kind, actor, created_at, source_revision
      FROM cms_revisions WHERE version < ? ORDER BY version DESC LIMIT ?`).bind(before, limit).all<Omit<RevisionRow, 'document'>>();
    if (!result.success) throw new CmsError(503, 'cms_unavailable');
    return result.results ?? [];
  }

  async readRevision(version: number) {
    requireVersion(version);
    const row = await this.db.prepare('SELECT * FROM cms_revisions WHERE version = ?').bind(version).first<RevisionRow>();
    if (!row) throw new CmsError(404, 'revision_not_found');
    return { version: row.version, kind: row.kind, createdAt: row.created_at, sourceRevision: row.source_revision,
      document: this.validate(JSON.parse(row.document)) };
  }

  async requireBoundedRecovery() {
    // Check the durable aggregate BEFORE legacy export/orphan code materializes rows.
    const budget = await this.db.prepare('SELECT revision_count, document_bytes FROM cms_revision_budget WHERE id = 1')
      .first<{ revision_count: number; document_bytes: number }>();
    if (!budget) throw new CmsError(503, 'cms_unavailable');
    if (budget.revision_count > MAX_REVISION_COUNT || budget.document_bytes > MAX_REVISION_DOCUMENT_BYTES) {
      throw new CmsError(413, 'backup_too_large');
    }
  }

  async saveDraft(document: unknown, expectedVersion: number, actor: string) {
    return this.append(this.validate(document), expectedVersion, actor, 'draft', null);
  }

  async publish(expectedVersion: number, actor: string) {
    requireVersion(expectedVersion);
    const state = await this.read();
    if (state.version !== expectedVersion) throw new CmsError(409, 'version_conflict');
    if (!state.document) throw new CmsError(409, 'draft_missing');
    return this.append(state.document, expectedVersion, actor, 'publish', state.draftRevision);
  }

  async rollback(revision: number, expectedVersion: number, actor: string) {
    requireVersion(expectedVersion);
    const source = await this.readRevision(revision);
    // Rollback intentionally publishes a new immutable copy of the selected revision.
    return this.append(source.document, expectedVersion, actor, 'rollback', revision);
  }

  private async append(document: CmsDocument, expectedVersion: number, actor: string,
    kind: RevisionRow['kind'], source: number | null) {
    requireVersion(expectedVersion);
    if (typeof actor !== 'string' || actor.length < 1 || actor.length > 256) throw new CmsError(400, 'invalid_actor');
    const raw = JSON.stringify(document);
    if (new TextEncoder().encode(raw).byteLength > MAX_DOCUMENT_BYTES) throw new CmsError(413, 'document_too_large');
    const version = expectedVersion + 1;
    // Both statements check the same version inside one D1 transaction. No preflight
    // read or temporary uniqueness claim can permit a stale writer to change a pointer.
    const results = await this.db.batch([
      this.db.prepare(`INSERT INTO cms_revisions (version, document, kind, actor, created_at, source_revision)
        SELECT ?, ?, ?, ?, ?, ? FROM cms_documents WHERE id = 1 AND version = ?
        AND EXISTS (SELECT 1 FROM cms_revision_budget WHERE id = 1)`)
        .bind(version, raw, kind, actor, new Date().toISOString(), source, expectedVersion),
      this.db.prepare(`UPDATE cms_documents SET version = ?, draft_revision = ?,
        published_revision = CASE WHEN ? = 'draft' THEN published_revision ELSE ? END
        WHERE id = 1 AND version = ? AND EXISTS (SELECT 1 FROM cms_revisions WHERE version = ?)`)
        .bind(version, version, kind, version, expectedVersion, version),
    ]).catch(error => {
      // SQLite/D1 wraps trigger errors. Do not expose the rest of the provider message.
      if (error instanceof Error && error.message.includes('cms_revision_storage_budget')) {
        throw new CmsError(507, 'cms_revision_storage_budget');
      }
      throw error;
    });
    if (results.length !== 2 || results.some(result => !result.success)) throw new CmsError(503, 'cms_unavailable');
    // D1 includes the budget trigger's UPDATE in INSERT changes; stale SELECTs still change zero rows.
    if ((results[0].meta?.changes ?? 0) < 1 || results[1].meta?.changes !== 1) throw new CmsError(409, 'version_conflict');
    return { version, draftRevision: version, published: kind !== 'draft' };
  }
}
