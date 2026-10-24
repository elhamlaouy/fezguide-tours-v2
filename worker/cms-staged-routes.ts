import type { CmsRoutesEnv } from './cms-routes';
import { StagedCmsStore, type CmsSaveManifestEntry } from './cms-staged-store';
import { CmsError, MAX_DOCUMENT_BYTES } from './cms-store';
import type { CmsPart } from '../src/cms/schema';
import { consumeCmsRequest } from './cms-request-budget';
import { PublicationPreparer } from './cms-publication-prepare';
import { commitPreparedBootstrap, commitPreparedPublication } from './cms-publication-commit';
import { MEDIA_KEY_PATTERN } from './media';
import { serveVerifiedUpload } from './cms-upload-verification';
import { preparedPublicResponse } from './prepared-public';
import { restoreResponse } from './cms-restore-staged';
import { recoveryRead } from './cms-staged-recovery';
import { redirectRendererId } from './cms-slug-redirects';

type Helpers = {
  json(value: unknown, status?: number, allow?: string): Response;
  requestJson(request: Request, maxBytes: number): Promise<Record<string, unknown>>;
  exactFields(value: Record<string, unknown>, fields: readonly string[]): void;
  queryNumber(value: string | null, fallback: number): number;
};

/** Called only after the existing JWT and write-origin gates. Null retains legacy routing. */
export async function stagedCmsResponse(request: Request, env: CmsRoutesEnv, actor: string | null, helpers: Helpers, bootstrapOnly=false): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  const bootstrapRoute=path==='/api/admin/content/preparations'||/^\/api\/admin\/content\/preparations\/[a-f0-9]{32}\/(?:advance|commit)$/.test(path);
  if(bootstrapOnly&&!bootstrapRoute)return null;
  if (path.startsWith('/api/admin/recovery/restore')) {
    if (!actor) throw new CmsError(401,'unauthorized');
    return await restoreResponse(request,env,actor,helpers) ?? helpers.json({error:'not_found'},404);
  }
  if (path === '/api/admin/recovery/backup' || path === '/api/admin/recovery/orphans') {
    if (!actor) throw new CmsError(401,'unauthorized');
    if (!env.CMS_VALIDATION_POLICY) throw new CmsError(503,'cms_unavailable');
    return recoveryRead(request,env,actor);
  }
  if (path === '/api/cms' || path === '/api/cms/document') return preparedPublicResponse(request, env);
  if (path.startsWith('/media/upload-')) {
    if (!['GET', 'HEAD'].includes(request.method)) return helpers.json({ error: 'method_not_allowed' }, 405, 'GET, HEAD');
    const key = path.slice('/media/'.length);
    if (!MEDIA_KEY_PATTERN.test(key)) throw new CmsError(404, 'not_found');
    if (!env.CMS_DB || !env.CMS_VALIDATION_POLICY || !env.CMS_RENDERER_ID || !env.CMS_ASSET_ID ||
        !env.CANONICAL_ORIGIN || !env.CMS_PUBLIC_DELIVERY_ORIGIN || url.origin !== env.CMS_PUBLIC_DELIVERY_ORIGIN) throw new CmsError(503, 'cms_unavailable');
    const renderer = await redirectRendererId(env.CMS_RENDERER_ID, env.CMS_SLUG_REDIRECTS);
    const allowed = await env.CMS_DB.prepare(`SELECT checks.receipt_json FROM cms_documents d
      LEFT JOIN cms_publications p ON p.revision=d.published_revision
      LEFT JOIN cms_catalog_bootstraps b ON b.revision=d.published_revision AND b.expected_version=d.version
      JOIN cms_artifact_catalogs c ON c.id=COALESCE(p.catalog_id,b.catalog_id)
        AND ((p.catalog_id IS NOT NULL AND c.target_revision=d.published_revision)
          OR (p.catalog_id IS NULL AND b.catalog_id IS NOT NULL AND c.source_revision=d.published_revision AND c.expected_version=d.version))
      JOIN cms_revision_admissions a ON a.revision=c.source_revision AND a.policy=c.policy AND a.digest=c.source_digest
      JOIN cms_revision_admissions active ON active.revision=d.published_revision AND active.policy=c.policy
        AND active.digest=c.source_digest AND active.document_bytes=a.document_bytes AND active.manifest=a.manifest
      JOIN cms_catalog_media m ON m.catalog_id=c.id AND m.media_key=?
      JOIN cms_catalog_upload_checks checks ON checks.catalog_id=c.id AND checks.media_key=m.media_key AND checks.state='verified'
      WHERE d.id=1 AND c.state='published' AND c.policy=? AND c.renderer=? AND c.assets=? AND c.origin=? LIMIT 1`)
      .bind(key, env.CMS_VALIDATION_POLICY, renderer, env.CMS_ASSET_ID, env.CANONICAL_ORIGIN).first<{receipt_json:string}>();
    if (!allowed) throw new CmsError(404, 'not_found');
    return serveVerifiedUpload(key,request,env.CMS_MEDIA as NonNullable<Parameters<typeof serveVerifiedUpload>[2]>,allowed.receipt_json);
  }
  const revision = /^\/api\/admin\/content\/revisions\/([1-9]\d{0,15})$/.exec(path);
  const job = /^\/api\/admin\/content\/save-jobs\/([a-f0-9]{32})\/(part|commit)$/.exec(path);
  const read = path === '/api/admin/content' || path === '/api/admin/content/revisions' || Boolean(revision);
  const save = path === '/api/admin/content/save-jobs' || Boolean(job);
  const preparation = /^\/api\/admin\/content\/preparations\/([a-f0-9]{32})\/(advance|commit)$/.exec(path);
  const publish = path === '/api/admin/content/preparations' || Boolean(preparation);
  const legacyMethods: Record<string, string> = {
    '/api/admin/content/draft': 'PUT', '/api/admin/content/publish': 'POST',
    '/api/admin/content/rollback': 'POST', '/api/admin/content/validate': 'POST',
  };
  const recoveryMethods: Record<string, string> = {
    '/api/admin/recovery/backup': 'GET', '/api/admin/recovery/orphans': 'GET', '/api/admin/recovery/restore': 'POST',
  };
  const blocked = legacyMethods[path] || recoveryMethods[path];
  if (!read && !save && !publish && !blocked) return null;
  const method = blocked || (read ? 'GET' : 'POST');
  if (request.method !== method) return helpers.json({ error: 'method_not_allowed' }, 405, method);
  if (!actor) throw new CmsError(401, 'unauthorized');
  if (!env.CMS_DB || !env.CMS_VALIDATION_POLICY) throw new CmsError(503, 'cms_unavailable');
  await consumeCmsRequest(env.CMS_DB, actor, recoveryMethods[path] ? 'recovery' : ['GET', 'HEAD'].includes(request.method) ? 'read' : 'write');
  if (blocked) throw new CmsError(409, recoveryMethods[path] ? 'staged_recovery_unavailable' : 'staged_required');
  if (publish) {
    const body = await helpers.requestJson(request, 4096);
    helpers.exactFields(body, preparation ? [] : body.mode === 'rollback' ? ['expectedVersion', 'mode', 'revision'] : ['expectedVersion', 'mode']);
    if (!preparation && (bootstrapOnly ? body.mode !== 'bootstrap' : body.mode !== 'publish' && body.mode !== 'rollback')) throw new CmsError(400, 'invalid_publication');
    if(bootstrapOnly&&preparation){
      const eligible=await env.CMS_DB!.prepare(`SELECT 1 FROM cms_catalog_bootstraps b JOIN cms_artifact_catalogs c ON c.id=b.catalog_id
        WHERE c.id=? AND c.actor=? AND c.state IN ('building','ready','published') AND b.revision=c.source_revision
          AND b.expected_version=c.expected_version`).bind(preparation[1],actor).first();
      if(!eligible)throw new CmsError(404,'not_found');
    }
    const config = {
      policy: env.CMS_VALIDATION_POLICY, renderer: env.CMS_RENDERER_ID!,
      assets: env.CMS_ASSET_ID!, shell: env.CMS_SHELL_ID!, origin: env.CANONICAL_ORIGIN!,
    };
    if (Object.values(config).some(value => typeof value !== 'string' || !value || value.length > 512) ||
        !/^[a-f0-9]{64}$/.test(config.assets) || !/^[a-f0-9]{64}$/.test(config.shell)) throw new CmsError(503, 'cms_unavailable');
    const renderer = await redirectRendererId(config.renderer, env.CMS_SLUG_REDIRECTS);
    const pinnedConfig = {...config, redirects: env.CMS_SLUG_REDIRECTS};
    if (preparation?.[2] === 'commit') {
      // Read only pinned scalar identity. The atomic SQL helper rechecks every guard
      // against the current pointer/admission, inside the publication transaction.
      const catalog = await env.CMS_DB.prepare(`SELECT c.expected_version,c.mode,
        EXISTS(SELECT 1 FROM cms_catalog_bootstraps b WHERE b.catalog_id=c.id AND b.revision=c.source_revision
          AND b.expected_version=c.expected_version) AS bootstrap
        FROM cms_artifact_catalogs c WHERE c.id=? AND c.actor=? AND c.policy=? AND c.renderer=? AND c.assets=? AND c.origin=?
          AND (c.state='ready' OR (c.state='published' AND EXISTS(SELECT 1 FROM cms_catalog_bootstraps b WHERE b.catalog_id=c.id)))
          AND (c.state='published' OR c.expires_at>CAST(strftime('%s','now') AS INTEGER))`)
        .bind(preparation[1], actor, config.policy, renderer, config.assets, config.origin)
        .first<{ expected_version: number; mode: 'publish' | 'rollback'; bootstrap: number }>();
      if (!catalog || (bootstrapOnly && catalog.bootstrap!==1)) throw new CmsError(409, 'publication_conflict');
      if(catalog.bootstrap===1)return helpers.json(await commitPreparedBootstrap(env.CMS_DB,{
        catalogId:preparation[1],actor,...pinnedConfig,expectedVersion:catalog.expected_version,
      }));
      return helpers.json(await commitPreparedPublication(env.CMS_DB, {
        catalogId: preparation[1], actor, ...pinnedConfig, expectedVersion: catalog.expected_version, mode: catalog.mode,
      }));
    }
    // Native R2 supplies head + conditional/checksummed put. The legacy media binding
    // type intentionally promises less; reject missing staged capability at runtime.
    const bucket = env.CMS_MEDIA as ConstructorParameters<typeof PublicationPreparer>[1] | undefined;
    if (!bucket || typeof bucket.head !== 'function' || typeof bucket.put !== 'function' ||
        !env.ASSETS || typeof env.ASSETS.fetch !== 'function') throw new CmsError(503, 'cms_unavailable');
    const preparer = new PublicationPreparer(env.CMS_DB, bucket, env.ASSETS, pinnedConfig);
    return helpers.json(preparation ? await preparer.advance(preparation[1], actor)
      : await preparer.start(body.expectedVersion as number, actor, body.mode as 'publish' | 'rollback' | 'bootstrap', body.revision as number | undefined));
  }
  const store = new StagedCmsStore(env.CMS_DB, env.CMS_VALIDATION_POLICY);
  if (path === '/api/admin/content/revisions') {
    if ([...url.searchParams.keys()].some(key => !['limit', 'before'].includes(key)) || url.searchParams.getAll('limit').length > 1 || url.searchParams.getAll('before').length > 1) throw new CmsError(400, 'invalid_pagination');
    const limit = helpers.queryNumber(url.searchParams.get('limit'), 50);
    const before = helpers.queryNumber(url.searchParams.get('before'), Number.MAX_SAFE_INTEGER);
    if (limit > 100) throw new CmsError(400, 'invalid_pagination');
    const result = await env.CMS_DB.prepare(`SELECT version, kind, actor, created_at, source_revision
      FROM cms_revisions WHERE version < ? ORDER BY version DESC LIMIT ?`).bind(before, limit).all();
    if (!result.success) throw new CmsError(503, 'cms_unavailable');
    return helpers.json({ revisions: result.results ?? [] });
  }
  if (save) {
    const body = await helpers.requestJson(request, job?.[2] === 'commit' ? 4096 : MAX_DOCUMENT_BYTES + 4096);
    helpers.exactFields(body, job ? job[2] === 'part' ? ['part'] : [] : ['expectedVersion', 'manifest']);
    if (!job) return helpers.json(await store.startSave(body.expectedVersion as number, actor, body.manifest as CmsSaveManifestEntry[]));
    if (job[2] === 'commit') return helpers.json(await store.finishSave(job[1], actor));
    await store.putPart(job[1], actor, body.part as CmsPart);
    return helpers.json({ stored: true });
  }
  const response = revision ? await store.readRawRevision(Number(revision[1])) : await store.readRawContent();
  // Prefix trusted raw JSON. Never parse, schema-validate or stringify the owner source.
  const headers = new Headers(helpers.json(null).headers);
  return new Response('{"processing":"staged-v1",' + (await response.text()).slice(1), { status: response.status, headers });
}
