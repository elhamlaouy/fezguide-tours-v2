import type { MediaText, MediaUploadResult } from '../../worker/media';
import type { CmsDocument } from '../cms/schema';

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
  constructor(readonly status: number, readonly code: string) {
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
  if (!response.ok) throw new AdminApiError(response.status, typeof payload.error === 'string' ? payload.error : 'request_failed');
  return payload;
}

function integer(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}

export async function loadAdminContent(): Promise<AdminContent> {
  const payload = await request('/api/admin/content', 'GET');
  const version = integer(payload.version);
  const document = payload.document;
  if (version === null || (document !== null && (!document || typeof document !== 'object' || Array.isArray(document)))) {
    throw new AdminApiError(502, 'invalid_response');
  }
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

export function saveAdminDraft(expectedVersion: number, document: CmsDocument): Promise<AdminWriteResult> {
  return request('/api/admin/content/draft', 'PUT', { expectedVersion, document }).then(writeResult);
}

export function publishAdminDraft(expectedVersion: number): Promise<AdminWriteResult> {
  return request('/api/admin/content/publish', 'POST', { expectedVersion }).then(writeResult);
}

export function rollbackAdminRevision(expectedVersion: number, revision: number): Promise<AdminWriteResult> {
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
