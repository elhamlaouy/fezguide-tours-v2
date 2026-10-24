import type { MediaText, MediaUploadResult } from '../../worker/media';
import { CMS_LIMITS, CMS_PART_FIELDS, type CmsDocument } from '../cms/schema';
import { splitCmsDocument } from '../cms/document-parts';

export interface AdminProgress { phase: 'hash' | 'upload' | 'prepare' | 'commit' | 'retry'; done: number; total: number }
export type AdminProgressCallback = (progress: AdminProgress) => void;
let stagedProcessing = false;

export interface AdminContent {
  version: number;
  draftRevision: number | null;
  publishedRevision: number | null;
  document: CmsDocument | null;
}

export interface AdminRevision {
  version: number;
  kind: string;
  actor: string;
  created_at: string;
  source_revision: number | null;
}

export interface AdminWriteResult {
  version: number;
  draftRevision: number;
  published: boolean;
}

export class AdminApiError extends Error {
  constructor(readonly status: number, readonly code: string, readonly retryAfter: string | null = null, readonly preserveDraft = false) {
    super(code);
  }
}

async function request(path: string, method: string, body?: object | Blob, extraHeaders: Record<string, string> = {}, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const response = await globalThis.fetch(path, {
    method, signal,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': body instanceof Blob ? body.type : 'application/json' } : {}),
      ...extraHeaders,
    },
    ...(body ? { body: body instanceof Blob ? body : JSON.stringify(body) } : {}),
  });
  const raw = await response.text();
  let payload: Record<string, unknown> = {};
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) payload = parsed as Record<string, unknown>;
    } catch { /* status is the contract; ignore a non-JSON error body */ }
  }
  if (!response.ok) throw new AdminApiError(response.status, typeof payload.error === 'string' ? payload.error : 'request_failed', response.headers.get('Retry-After'));
  return payload;
}

function integer(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}

function operationId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{32}$/.test(value)) throw new AdminApiError(502, 'invalid_response');
  return value;
}

export async function loadAdminContent(): Promise<AdminContent> {
  const payload = await request('/api/admin/content', 'GET');
  const version = integer(payload.version);
  const document = payload.document;
  if (version === null || (document !== null && (!document || typeof document !== 'object' || Array.isArray(document)))) {
    throw new AdminApiError(502, 'invalid_response');
  }
  stagedProcessing = payload.processing === 'staged-v1';
  return {
    version,
    draftRevision: integer(payload.draftRevision),
    publishedRevision: integer(payload.publishedRevision),
    document: document as CmsDocument | null,
  };
}

export async function loadAdminRevisions(): Promise<AdminRevision[]> {
  const payload = await request('/api/admin/content/revisions', 'GET');
  if (!Array.isArray(payload.revisions)) return [];
  return payload.revisions.filter((item): item is AdminRevision => {
    const row = item as Partial<AdminRevision> | null;
    return !!row && typeof row.version === 'number' && typeof row.kind === 'string';
  });
}

function writeResult(payload: Record<string, unknown>): AdminWriteResult {
  const version = integer(payload.version);
  const draftRevision = integer(payload.draftRevision);
  if (version === null || draftRevision === null || typeof payload.published !== 'boolean') throw new AdminApiError(502, 'invalid_response');
  return { version, draftRevision, published: payload.published };
}

type StagedRequest = (path: string, body: object) => Promise<Record<string, unknown>>;
// Source schema, pinned SQL catalog ceiling and at most one upload check per media row.
const maxPreparationTotal = 1 + Object.values(CMS_PART_FIELDS).reduce((sum, field) => sum + field.max, 0) + 1000 + CMS_PART_FIELDS.media.max + 2 * CMS_LIMITS.bytes;
function stagedWriteResult(payload: Record<string, unknown>, expectedVersion: number, published: boolean): AdminWriteResult {
  const result = writeResult(payload);
  if (result.version !== expectedVersion + 1 || result.version < 1 || result.draftRevision !== result.version || result.published !== published) throw new AdminApiError(502, 'invalid_response');
  return result;
}

async function stagedOperation(onProgress: AdminProgressCallback | undefined, action: (send: StagedRequest, budget: (requests: number) => void) => Promise<AdminWriteResult>): Promise<AdminWriteResult> {
  let retries = 0;
  const startedAt = Date.now();
  let deadline = startedAt + 1800000;
  const budget = (requests: number) => {
    if (!Number.isSafeInteger(requests) || requests < 1 || requests > 3 * (maxPreparationTotal + 1) + 2) throw new AdminApiError(502, 'invalid_response');
    // Per request: 30s abort bound + conservative 60/min pacing; also reserve the
    // existing 32 contention retries and their at-most-60s Retry-After waits.
    deadline = Math.max(deadline, startedAt + (requests + 32) * 31000 + 32 * 60000 + 60000);
  };
  let windowEnds = 0;
  let writes = 0;
  const waitForBudget = async (wait: number) => {
    if (Date.now() + wait >= deadline) throw new AdminApiError(408, 'staged_operation_timeout');
    const waitingAt = Date.now();
    onProgress?.({ phase: 'retry', done: retries, total: 32 });
    await new Promise(resolve => setTimeout(resolve, wait));
    if (Date.now() >= deadline || Date.now() - waitingAt >= 1800000) throw new AdminApiError(408, 'staged_operation_timeout');
  };
  const send: StagedRequest = async (path, body) => {
    let consecutiveRetries = 0;
    for (;;) {
      if (Date.now() >= deadline) throw new AdminApiError(408, 'staged_operation_timeout');
      // D1 charges every write, including commit: leave the next window for request 61.
      // Local pacing is not authority; concurrent tabs/site contention can still return 429.
      if (writes >= 60 && Date.now() < windowEnds) await waitForBudget(windowEnds - Date.now());
      if (Date.now() >= windowEnds) { windowEnds = Date.now() + 60000; writes = 0; }
      writes++;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), Math.min(30000, deadline - Date.now()));
      try {
        const payload = await request(path, 'POST', body, {}, controller.signal);
        if (controller.signal.aborted || Date.now() >= deadline) throw new AdminApiError(408, 'staged_operation_timeout');
        // Admission precedes receipt, not dispatch; anchor pacing conservatively.
        if (writes === 1) windowEnds = Date.now() + 60000;
        return payload;
      }
      catch (error) {
        clearTimeout(timeout);
        if (controller.signal.aborted) throw new AdminApiError(408, 'staged_operation_timeout');
        // A commit may already have taken effect: never automatically resend it.
        // Six consecutive denials and 32 total retries bound contention, not document size.
        if (!(error instanceof AdminApiError) || error.status !== 429 || retries >= 32 || consecutiveRetries >= 6 || path.endsWith('/commit')) throw error;
        const header = error.retryAfter;
        const retryAt = header && !/^\d+(\.\d+)?$/.test(header) ? Date.parse(header) - Date.now() : Number(header) * 1000;
        const wait = Math.max(Math.min(60000, 250 * 2 ** consecutiveRetries++), Number.isFinite(retryAt) ? retryAt : 0);
        if (wait > 60000) throw error;
        retries++;
        await waitForBudget(wait);
      }
      finally { clearTimeout(timeout); }
    }
  };
  try { return await action(send, budget); }
  catch (error) {
    if (error instanceof AdminApiError) throw new AdminApiError(error.status, error.code, error.retryAfter, true);
    throw new AdminApiError(0, 'staged_operation_failed', null, true);
  }
}

export async function saveAdminDraft(expectedVersion: number, document: CmsDocument, onProgress?: AdminProgressCallback): Promise<AdminWriteResult> {
  if (stagedProcessing) return stagedOperation(onProgress, async (send, budget) => {
    // Detach every value before hashing yields; uploads must match this exact manifest.
    const parts = structuredClone(splitCmsDocument(document));
    budget(parts.length + 2); // start + each possible missing part + explicit commit
    const manifest = [];
    for (const { value, ...metadata } of parts) {
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)))), byte => byte.toString(16).padStart(2, '0')).join('');
      manifest.push({ ...metadata, digest });
      onProgress?.({ phase: 'hash', done: manifest.length, total: parts.length });
    }
    const job = await send('/api/admin/content/save-jobs', { expectedVersion, manifest });
    const id = operationId(job.id);
    const missing = job.missing;
    if (!Array.isArray(missing) || missing.length > parts.length || new Set(missing).size !== missing.length ||
        missing.some(index => integer(index) === null || index < 0 || index >= parts.length)) throw new AdminApiError(502, 'invalid_response');
    let done = 0;
    onProgress?.({ phase: 'upload', done, total: missing.length });
    for (const index of missing) {
      const stored = await send(`/api/admin/content/save-jobs/${id}/part`, { part: parts[index] });
      if (stored.stored !== true) throw new AdminApiError(502, 'invalid_response');
      onProgress?.({ phase: 'upload', done: ++done, total: missing.length });
    }
    onProgress?.({ phase: 'commit', done: 0, total: 1 });
    return stagedWriteResult(await send(`/api/admin/content/save-jobs/${id}/commit`, {}), expectedVersion, false);
  });
  return request('/api/admin/content/draft', 'PUT', { expectedVersion, document }).then(writeResult);
}

interface Preparation { id: string; ready: boolean; done: number; total: number }
function preparation(payload: Record<string, unknown>, previous?: Preparation): Preparation {
  const id = operationId(payload.id);
  const done = integer(payload.done);
  const total = integer(payload.total);
  if (typeof payload.ready !== 'boolean' || done === null || total === null || total < 1 || total > maxPreparationTotal || done < 0 || done > total ||
      (payload.ready && done !== total) || (previous && (previous.id !== id || previous.total !== total || done < previous.done))) {
    throw new AdminApiError(502, 'invalid_response');
  }
  return { id, ready: payload.ready, done, total };
}

async function prepareAdminWrite(expectedVersion: number, mode: 'publish' | 'rollback', revision?: number, onProgress?: AdminProgressCallback): Promise<AdminWriteResult> {
  return stagedOperation(onProgress, async (send, budget) => {
    let job = preparation(await send('/api/admin/content/preparations', { expectedVersion, mode, ...(revision === undefined ? {} : { revision }) }));
    // At most two stalled responses per integer progress unit, plus final sealing.
    const maxAdvances = 3 * (job.total - job.done + 1);
    budget(maxAdvances + 2);
    let advances = 0;
    let stalled = 0;
    onProgress?.({ phase: 'prepare', done: job.done, total: job.total });
    while (!job.ready) {
      if (advances++ >= maxAdvances || stalled >= 3) throw new AdminApiError(408, 'staged_operation_limit');
      const next = preparation(await send(`/api/admin/content/preparations/${job.id}/advance`, {}), job);
      stalled = next.done === job.done ? stalled + 1 : 0;
      job = next;
      onProgress?.({ phase: 'prepare', done: job.done, total: job.total });
      if (!job.ready && stalled > 0 && stalled < 3) await new Promise(resolve => setTimeout(resolve, 250 * 2 ** (stalled - 1)));
    }
    onProgress?.({ phase: 'commit', done: 0, total: 1 });
    return stagedWriteResult(await send(`/api/admin/content/preparations/${job.id}/commit`, {}), expectedVersion, true);
  });
}

export function publishAdminDraft(expectedVersion: number, onProgress?: AdminProgressCallback): Promise<AdminWriteResult> {
  if (stagedProcessing) return prepareAdminWrite(expectedVersion, 'publish', undefined, onProgress);
  return request('/api/admin/content/publish', 'POST', { expectedVersion }).then(writeResult);
}

export function rollbackAdminRevision(expectedVersion: number, revision: number, onProgress?: AdminProgressCallback): Promise<AdminWriteResult> {
  if (stagedProcessing) return prepareAdminWrite(expectedVersion, 'rollback', revision, onProgress);
  return request('/api/admin/content/rollback', 'POST', { expectedVersion, revision }).then(writeResult);
}

export async function uploadAdminMedia(file: File, metadata: { alt: MediaText; caption?: MediaText; title?: MediaText }, signal?: AbortSignal): Promise<MediaUploadResult> {
  const payload = await request('/api/admin/media', 'POST', file, { 'X-CMS-Metadata': encodeURIComponent(JSON.stringify(metadata)) }, signal);
  const media = payload.media as Partial<MediaUploadResult['media']> | undefined;
  const localized = (value: unknown): value is MediaText => !!value && typeof value === 'object' &&
    ['en', 'fr', 'es'].every(locale => typeof (value as Record<string, unknown>)[locale] === 'string') && Object.keys(value).length === 3;
  if (!media || typeof media.id !== 'string' || !/^upload-[a-f0-9-]{36}$/.test(media.id) ||
    typeof media.src !== 'string' || !new RegExp(`^/media/${media.id}\\.(jpg|png|webp)$`).test(media.src) ||
    payload.previewSrc !== media.src.replace('/media/', '/api/admin/media/') || !localized(media.alt) ||
    (media.caption !== undefined && !localized(media.caption)) || (payload.title !== undefined && !localized(payload.title)) ||
    typeof media.width !== 'number' || !Number.isSafeInteger(media.width) || media.width <= 0 ||
    typeof media.height !== 'number' || !Number.isSafeInteger(media.height) || media.height <= 0 || media.source !== 'cms-upload') {
    throw new AdminApiError(502, 'invalid_response');
  }
  return { media: media as MediaUploadResult['media'], previewSrc: payload.previewSrc as string,
    ...(payload.title === undefined ? {} : { title: payload.title as MediaText }) };
}
