import { consumeCmsRequest } from './cms-request-budget';
import { exportBackup, restoreBackup, orphanDryRun, MAX_BACKUP_BYTES } from './cms-recovery';
import { MEDIA_KEY_PATTERN, uploadMedia, serveMedia, publishedMediaReferenced, type CmsMediaEnv } from './media';
import { createAccessVerifier, type AccessVerifierOptions, type CmsAccessEnv } from './cms-auth';
import { CmsError, CmsStore, MAX_DOCUMENT_BYTES, requireVersion, type CmsD1Database, type CmsDocumentValidator } from './cms-store';

import { stagedCmsResponse } from './cms-staged-routes';
export interface CmsRoutesEnv extends CmsAccessEnv, CmsMediaEnv {
  CMS_DB?: CmsD1Database;
  CMS_PROCESSING_MODE?: string;
  CMS_PREPARATION_MODE?: string;
  CMS_VALIDATION_POLICY?: string;
  CMS_RENDERER_ID?: string;
  CMS_SLUG_REDIRECTS?: string;
  CMS_ASSET_ID?: string;
  CMS_SHELL_ID?: string;
  CANONICAL_ORIGIN?: string;
  CMS_PUBLIC_DELIVERY_ORIGIN?: string;
  ASSETS?: { fetch(request: Request): Promise<Response> };
}
export interface CmsHandlerOptions { validateDocument: CmsDocumentValidator; access?: AccessVerifierOptions }
export const MAX_CMS_REQUEST_BYTES = MAX_DOCUMENT_BYTES + 4096;
import { createPublicProjectionContext, projectPublicValue, publicMediaReferences, keepPublicMedia } from './cms-projection-parts';
const DOCUMENT_FIELDS = ['schemaVersion', 'siteSettings', 'theme', 'navigation', 'footer', 'uiCopy', 'pages',
  'products', 'editorialEntries', 'blogPosts', 'teamMembers', 'faqs', 'media', 'reviews', 'legacy'] as const;
const LEGACY_FIELDS = ['tours', 'customPages', 'blogPosts', 'teamMembers', 'faqs', 'siteSettings'] as const;
function pick(value: object, fields: readonly string[]) {
  const result: Record<string, unknown> = {};
  for (const field of fields) if (Object.hasOwn(value, field)) result[field] = (value as Record<string, unknown>)[field];
  return result;
}
type PublicRecord = Record<string, unknown>;
const records = (value: unknown): PublicRecord[] => Array.isArray(value) ? value : [];
export function publicCmsDocument(value: object) {
  const result = pick(value, DOCUMENT_FIELDS);
  if (result.legacy && typeof result.legacy === 'object' && !Array.isArray(result.legacy)) result.legacy = pick(result.legacy, LEGACY_FIELDS);
  else delete result.legacy;
  const context = createPublicProjectionContext(result);
  const projected = projectPublicValue(result, context) as PublicRecord;
  // Keep the public media library, but exclude metadata used only by hidden content.
  if (Array.isArray(result.media)) {
    const originalIds = publicMediaReferences(result, context);
    const publicIds = publicMediaReferences(projected, context);
    projected.media = records(result.media).filter(record => keepPublicMedia(record.id, originalIds, publicIds));
  }
  return projected;
}
export function publicCmsCompatibility(value: object) {
  const legacy = (value as PublicRecord).legacy;
  // Reuse the full projection so compatibility copies cannot bypass canonical visibility.
  return publicCmsDocument(legacy && typeof legacy === 'object' && !Array.isArray(legacy)
    ? value : { legacy: pick(value, LEGACY_FIELDS) }).legacy;
}
function json(value: unknown, status = 200, allow?: string) {
  return new Response(JSON.stringify(value), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...(allow ? { Allow: allow } : {}),
  } });
}

async function requestJson(request: Request, maxBytes: number): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type');
  if (!contentType || !/^application\/json(?:\s*;\s*charset=utf-8)?\s*$/i.test(contentType)) throw new CmsError(415, 'unsupported_media_type');
  if (request.headers.has('content-encoding')) throw new CmsError(415, 'unsupported_encoding');
  const declared = request.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) {
    await request.body?.cancel();
    throw new CmsError(413, 'request_too_large');
  }
  if (!request.body) throw new CmsError(400, 'invalid_json');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) { await reader.cancel(); throw new CmsError(413, 'request_too_large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch { throw new CmsError(400, 'invalid_json'); }
}
function exactFields(value: Record<string, unknown>, fields: readonly string[]) {
  if (Object.keys(value).length !== fields.length || fields.some(field => !Object.hasOwn(value, field))) {
    throw new CmsError(400, 'invalid_request');
  }
}
function queryNumber(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  if (!/^[1-9]\d{0,15}$/.test(value) || !Number.isSafeInteger(Number(value))) throw new CmsError(400, 'invalid_pagination');
  return Number(value);
}
export function isCmsAdminPath(path: string) {
  // Assets may decode escaped slashes/characters; never let that bypass the guard.
  try { path = decodeURIComponent(path); } catch { return true; }
  return path === '/admin' || path.startsWith('/admin/') || path === '/api/admin' || path.startsWith('/api/admin/');
}

/** Return null for unrelated routes and authenticated admin HTML so the caller can serve assets.
 * Invoke BEFORE ASSETS or the legacy /api/cms handler. There is no legacy write fallback.
 * GET /api/admin/content; PUT .../draft {expectedVersion,document};
 * POST .../publish {expectedVersion}; POST .../rollback {expectedVersion,revision};
 * POST .../validate {document}; GET .../revisions[?limit=50&before=N]; GET .../revisions/N.
 * GET /api/cms returns the public compatibility object; /api/cms/document returns {version,document}.
 */
export function createCmsHandler(options: CmsHandlerOptions) {
  const verify = createAccessVerifier(options.access);
  return async (request: Request, env: CmsRoutesEnv): Promise<Response | null> => {
    const url = new URL(request.url);
    const path = url.pathname;
    const admin = isCmsAdminPath(path);
    const publicMedia = path.startsWith('/media/upload-');
    const publicRoute = path === '/api/cms' || path === '/api/cms/document';
    if (!admin && !publicRoute && !publicMedia) return null;
    const identity = admin ? await verify(request, env) : null;
    if (admin && !identity) return json({ error: 'unauthorized' }, 401);
    // JWTs are not readable by another origin; reject cookie-assisted cross-origin writes too.
    if (admin && !['GET', 'HEAD'].includes(request.method) && request.headers.has('origin') && request.headers.get('origin') !== url.origin) {
      return json({ error: 'forbidden_origin' }, 403);
    }
    if (path === '/admin' || path.startsWith('/admin/')) {
      return ['GET', 'HEAD'].includes(request.method) ? null : json({ error: 'method_not_allowed' }, 405, 'GET, HEAD');
    }
    // Custom metadata header prevents simple cross-origin form uploads; Fetch Metadata
    // additionally rejects cross-site browser writes even when Origin is omitted.
    const stagedWrite = (env.CMS_PROCESSING_MODE === 'staged-v1' || env.CMS_PREPARATION_MODE === 'bootstrap-v1') && admin && !['GET', 'HEAD'].includes(request.method);
    if (((path === '/api/admin/media' && request.method === 'POST') || stagedWrite) && request.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'forbidden_origin' }, 403);
    const mediaPrefix = publicMedia ? '/media/' : '/api/admin/media/';
    const mediaKey = path.startsWith(mediaPrefix) ? path.slice(mediaPrefix.length) : null;
    if (mediaKey !== null && !MEDIA_KEY_PATTERN.test(mediaKey)) return json({ error: 'not_found' }, 404);
    const fullStaged = env.CMS_PROCESSING_MODE === 'staged-v1';
    if (fullStaged || (env.CMS_PREPARATION_MODE === 'bootstrap-v1' && admin)) {
      try {
        const response = await stagedCmsResponse(request, env, identity?.subject ?? null, { json, requestJson, exactFields, queryNumber }, !fullStaged);
        if (response) return response;
      } catch (error) {
        const response = error instanceof CmsError ? json({ error: error.code }, error.status) : json({ error: 'cms_unavailable' }, 503);
        if (error instanceof CmsError && error.retryAfter) response.headers.set('Retry-After', String(error.retryAfter));
        return response;
      }
    }
    const revisionMatch = /^\/api\/admin\/content\/revisions\/([1-9]\d{0,15})$/.exec(path);
    const methods: Record<string, string> = {
      '/api/cms': 'GET', '/api/cms/document': 'GET', '/api/admin/content': 'GET',
      '/api/admin/content/draft': 'PUT', '/api/admin/content/publish': 'POST',
      '/api/admin/content/rollback': 'POST', '/api/admin/content/validate': 'POST',
      '/api/admin/content/revisions': 'GET', '/api/admin/media': 'POST',
      '/api/admin/recovery/backup': 'GET', '/api/admin/recovery/restore': 'POST', '/api/admin/recovery/orphans': 'GET',
    };
    const method = mediaKey !== null ? 'GET, HEAD' : revisionMatch ? 'GET' : methods[path];
    if (!method) return json({ error: 'not_found' }, 404);
    if (!method.split(', ').includes(request.method)) return json({ error: 'method_not_allowed' }, 405, method);
    if (!env.CMS_DB) return json({ error: 'cms_unavailable' }, 503);
    const store = new CmsStore(env.CMS_DB, options.validateDocument);
    try {
      // Authenticate/authorize/method-check first; charge attempts before body reads,
      // validation, revision queries, backup scans or object-store work. Public abuse
      // controls remain a separate platform/deployment concern.
      if (identity) await consumeCmsRequest(env.CMS_DB, identity.subject,
        path.startsWith('/api/admin/recovery/') ? 'recovery' : ['GET', 'HEAD'].includes(request.method) ? 'read' : 'write');
      if (path === '/api/admin/recovery/backup' || path === '/api/admin/recovery/orphans') await store.requireBoundedRecovery();
      if (path === '/api/admin/recovery/backup') return json(await exportBackup(env.CMS_DB, store, env.CMS_MEDIA));
      if (path === '/api/admin/recovery/orphans') return json(await orphanDryRun(env.CMS_DB, store, env.CMS_MEDIA));
      if (path === '/api/admin/recovery/restore') {
        const body = await requestJson(request, MAX_BACKUP_BYTES);
        exactFields(body, ['backup','revision','expectedVersion']);
        requireVersion(body.revision); requireVersion(body.expectedVersion);
        return json(await restoreBackup(store,env.CMS_MEDIA,body.backup,body.revision,body.expectedVersion,identity!.subject));
      }
      if (path === '/api/admin/media') return json(await uploadMedia(request, env, { db: env.CMS_DB, actor: identity!.subject }), 201);
      if (mediaKey !== null) {
        if (publicMedia) {
          const published = await store.readPublished();
          if (!published || !publishedMediaReferenced(publicCmsDocument(published.document), `/media/${mediaKey}`)) throw new CmsError(404, 'not_found');
        }
        return await serveMedia(mediaKey, request, env);
      }
      if (publicRoute) {
        const published = await store.readPublished();
        if (path === '/api/cms/document') return json({ version: published?.version ?? null,
          document: published ? publicCmsDocument(published.document) : null });
        return json(published ? publicCmsCompatibility(published.document) : { data: null });
      }
      if (path === '/api/admin/content') return json(await store.read());
      if (revisionMatch) return json(await store.readRevision(Number(revisionMatch[1])));
      if (path === '/api/admin/content/revisions') {
        if ([...url.searchParams.keys()].some(key => key !== 'limit' && key !== 'before') || url.searchParams.getAll('limit').length > 1 || url.searchParams.getAll('before').length > 1) {
          throw new CmsError(400, 'invalid_pagination');
        }
        return json({ revisions: await store.revisions(queryNumber(url.searchParams.get('limit'), 50),
          queryNumber(url.searchParams.get('before'), Number.MAX_SAFE_INTEGER)) });
      }
      const body = await requestJson(request, path.endsWith('/publish') || path.endsWith('/rollback') ? 4096 : MAX_CMS_REQUEST_BYTES);
      if (path.endsWith('/validate')) {
        exactFields(body, ['document']);
        store.validate(body.document);
        return json({ valid: true });
      }
      exactFields(body, path.endsWith('/draft') ? ['expectedVersion', 'document'] : path.endsWith('/rollback') ? ['expectedVersion', 'revision'] : ['expectedVersion']);
      requireVersion(body.expectedVersion);
      if (path.endsWith('/draft')) return json(await store.saveDraft(body.document, body.expectedVersion, identity!.subject));
      if (path.endsWith('/publish')) return json(await store.publish(body.expectedVersion, identity!.subject));
      requireVersion(body.revision);
      return json(await store.rollback(body.revision, body.expectedVersion, identity!.subject));
    } catch (error) {
      // Never echo document values, identities, JWTs, database/provider errors, or stack traces.
      const response = error instanceof CmsError ? json({ error: error.code }, error.status) : json({ error: 'cms_unavailable' }, 503);
      if (error instanceof CmsError && error.retryAfter) response.headers.set('Retry-After', String(error.retryAfter));
      return response;
    }
  };
}
