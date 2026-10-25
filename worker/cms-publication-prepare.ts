import type { CmsDocument, CmsPart } from '../src/cms/schema';
import { assembleCmsDocument } from '../src/cms/document-parts';
import { pageLocaleAvailable } from '../src/cms/render-utils';
import { pagePath, preferredSlug, resolveRoute } from '../src/cms/routing';
import { CmsError, requireVersion, type CmsD1Database, type CmsD1Statement } from './cms-store';
import { createPublicProjectionContext, projectPublicPart, projectPublicValue, type PublicProjectionContext } from './cms-projection-parts';
import { projectedDocumentSql } from './cms-document-sql';
import {LARGE_NODES_SQL,largeRefsSql} from './cms-large-projection';
import { rewriteRouteHtml } from './seo';
import { uploadReceipt, managedUploadKey, requireKnownUploadReferences } from './cms-upload-verification';
import { MEDIA_KEY_PATTERN } from './media';
import { slugRedirects, redirectRendererId } from './cms-slug-redirects';

type Config = { policy: string; renderer: string; assets: string; shell: string; origin: string; redirects?: string };
type Progress = { id: string; ready: boolean; done: number; total: number };
type Language = 'en' | 'fr' | 'es';
type Context = { projectionPolicy:2; uploadPolicy: 1; pageIds: unknown[]; productIds: unknown[]; reviewIds: unknown[]; mediaSources: unknown[][] };
type Entry = { path: string; type: 'html' | '404' | 'sitemap' | 'robots' | 'compatibility' | 'document'; language?: Language };
type Plan = { nodes:number; uploadPolicy:1; context: Context; parts: number; entries: Entry[]; routes: { key: string; path: string }[]; uploads?: {id:string;src:string;key:string}[] };
type Catalog = { id: string; actor: string; expected_version: number; target_revision: number; source_revision: number; source_digest: string;
  policy: string; renderer: string; assets: string; origin: string; context_digest: string; state: string; plan_json: string; live: number; renew_at: number; bootstrap: number };
type Summary = { kind: string; position: number; field_key: string | null; summary_json: string; title_json: string | null; no_index: number | null };
type Assets = { fetch(request: Request): Promise<Response> };
type StoredObject = { key?: string; etag: string; version: string; size: number; httpMetadata?: { contentType?: string }; customMetadata?: Record<string,string>; checksums?: { sha256?: ArrayBuffer } };
type Bucket = { put(key: string, bytes: Uint8Array, options: { onlyIf: { etagDoesNotMatch: string }; sha256: ArrayBuffer; httpMetadata: { contentType: string }; customMetadata: Record<string,string> }): Promise<StoredObject | null>; head(key: string): Promise<StoredObject | null> };
const clock = "CAST(strftime('%s','now') AS INTEGER)";
const languages = ['en','fr','es'] as const;
const encode = (value: string) => new TextEncoder().encode(value);
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join('');
const digest = async (raw: string) => hex(await crypto.subtle.digest('SHA-256',encode(raw)));
function conflict(): never { throw new CmsError(409,'publication_conflict'); }
function failure(error: unknown): never {
  if (error instanceof CmsError) throw error;
  if(error instanceof Error&&error.message.includes('cms_unknown_upload'))throw new CmsError(422,'upload_verification_failed');
  if (error instanceof Error && error.message.includes('cms_artifact_storage_budget')) throw new CmsError(507,'cms_artifact_storage_budget');
  if (error instanceof Error && error.message.includes('cms_projection_cache_budget')) throw new CmsError(507,'cms_projection_cache_budget');
  if (error instanceof Error && /malformed JSON|cms_catalog_|cms_bootstrap_|UNIQUE constraint failed: cms_artifact_catalogs/.test(error.message)) conflict();
  throw new CmsError(503,'cms_unavailable');
}
function actorCheck(actor: string) { if (typeof actor !== 'string' || !actor || actor.length>256) throw new CmsError(400,'invalid_actor'); }
function serializeContext(context: PublicProjectionContext): Context {
  const sorted = (values: Iterable<unknown>) => [...values].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return { projectionPolicy:2, uploadPolicy:1, pageIds:sorted(context.pageIds), productIds:sorted(context.productIds), reviewIds:sorted(context.reviewIds),
    mediaSources:[...context.mediaSources].sort((a,b)=>JSON.stringify(a[0]).localeCompare(JSON.stringify(b[0]))) };
}
function makePlan(document: CmsDocument, context: Context, parts: number, origin: string, aliases: Readonly<Record<string,string>>): Plan {
  const entries: Entry[]=[];
  const routes=new Map<string,string>();
  for (const page of document.pages) for (const language of languages) {
    if (!pageLocaleAvailable(document,page,language)) continue;
    const path=pagePath(document,page.id,language);
    // Resolve collisions using the actual routing precedence, never manifest order guesses.
    if (resolveRoute(new URL(path,origin),document).page?.id===page.id && !entries.some(entry=>entry.path===path)) entries.push({path,type:'html',language});
  }
  const keys=new Set(['home',...document.pages.flatMap(page=>[page.id,page.slug,preferredSlug(page)]),...Object.keys(aliases)]);
  for (const language of languages) for (const key of keys) for (const type of ['path','query'] as const) {
    const url=new URL(type==='path'?`/${language}/${encodeURIComponent(key)}`:'/',origin);
    if (type==='query') { url.searchParams.set('page',key); url.searchParams.set('lang',language); }
    const route=resolveRoute(url,document);
    const target=route.page ?? document.pages.find(page=>Object.hasOwn(aliases,key)&&page.id===aliases[key]&&pageLocaleAvailable(document,page,language));
    if (target) routes.set(`${type}:${language}:${key}`,pagePath(document,target.id,language));
  }
  for (const language of languages) entries.push({path:`@404:${language}`,type:'404',language});
  entries.push({path:'/sitemap.xml',type:'sitemap'},{path:'/robots.txt',type:'robots'},
    {path:'/api/cms',type:'compatibility'},{path:'/api/cms/document',type:'document'});
  if(entries.length>1000) throw new CmsError(413,'publication_too_large');
  return {nodes:0,uploadPolicy:1,context,parts,entries,routes:[...routes].map(([key,path])=>({key,path})),
    uploads:document.media.flatMap(({id,src})=>{const key=managedUploadKey(src,origin);return key===null?[]:[{id,src,key}];})};
}

/** Server-only preparation. It never changes the published pointer or accepts client HTML/receipts. */
export class PublicationPreparer {
  constructor(private db: CmsD1Database, private bucket: Bucket, private assetsBinding: Assets, private config: Config) {}

  private async configuration() {
    const {policy,renderer,assets,shell,origin}=this.config;
    if ([policy,renderer,assets,shell,origin].some(value=>typeof value!=='string'||!value||value.length>512) ||
      !/^[a-f0-9]{64}$/.test(assets) || !/^[a-f0-9]{64}$/.test(shell) || new URL(origin).origin!==origin || !origin.startsWith('https://')) throw new CmsError(400,'invalid_publication');
    return redirectRendererId(renderer,this.config.redirects);
  }
  private async batch(statements: CmsD1Statement[]) {
    const results=await this.db.batch(statements);
    if (results.length!==statements.length || results.some(result=>!result.success)) throw new CmsError(503,'cms_unavailable');
    return results;
  }
  private async summaries(revision: number): Promise<CmsDocument> {
    const result=await this.db.prepare(`SELECT json_extract(m.value,'$.kind') AS kind,json_extract(m.value,'$.index') AS position,
      json_extract(m.value,'$.key') AS field_key,p.summary_json,
      CASE WHEN p.kind='pages' THEN json_extract(p.document_json,'$.title') END AS title_json,
      CASE WHEN p.kind='pages' THEN json_extract(p.document_json,'$.seo.noIndex') END AS no_index
      FROM cms_revision_admissions a CROSS JOIN json_each(a.manifest) m CROSS JOIN cms_validation_parts p ON p.policy=a.policy
        AND p.kind=json_extract(m.value,'$.kind') AND p.digest=json_extract(m.value,'$.digest')
      WHERE a.revision=? AND a.policy=? ORDER BY CAST(m.key AS INTEGER)`).bind(revision,this.config.policy).all<Summary>();
    if(!result.success) throw new CmsError(503,'cms_unavailable');
    const parts=(result.results??[]).map(row=>{
      const value=JSON.parse(row.summary_json);
      if(row.kind==='pages') { value.title=JSON.parse(row.title_json!); value.seo={...value.seo,noIndex:Boolean(row.no_index)}; }
      return {kind:row.kind,index:row.position,...(row.field_key===null?{}:{key:row.field_key}),value};
    });
    try { return assembleCmsDocument(parts); } catch { conflict(); }
  }
  async start(expectedVersion: number, actor: string, mode: 'publish' | 'rollback' | 'bootstrap', revision?: number): Promise<Progress> {
    try {
      requireVersion(expectedVersion); actorCheck(actor); const renderer=await this.configuration();
      const bootstrap=mode==='bootstrap';
      if(!['publish','rollback','bootstrap'].includes(mode) || (mode!=='rollback' && revision!==undefined)) throw new CmsError(400,'invalid_publication');
      if(mode==='rollback') requireVersion(revision);
      const catalogMode=bootstrap?'publish':mode;
      const source=await this.db.prepare(`SELECT a.revision,a.digest,json_array_length(a.manifest) AS parts,
        COALESCE((SELECT SUM((SELECT COUNT(*) FROM json_tree(v.document_json))) FROM json_each(a.manifest) m
          JOIN cms_validation_parts v ON v.policy=a.policy AND v.kind=json_extract(m.value,'$.kind') AND v.digest=json_extract(m.value,'$.digest')
          WHERE v.document_bytes>32768),0) AS nodes FROM cms_documents d
        JOIN cms_revisions r ON r.version=CASE WHEN ?='publish' THEN d.draft_revision WHEN ?='bootstrap' THEN d.published_revision ELSE ? END
        JOIN cms_revision_admissions a ON a.revision=r.version AND a.policy=? AND a.document_bytes=length(CAST(r.document AS BLOB))
        WHERE d.id=1 AND d.version=? AND r.version<=d.version
          AND (?='rollback' OR (?='bootstrap' AND d.published_revision=r.version
            AND NOT EXISTS(SELECT 1 FROM cms_publications p WHERE p.revision=r.version)
            AND NOT EXISTS(SELECT 1 FROM cms_catalog_bootstraps b JOIN cms_artifact_catalogs existing ON existing.id=b.catalog_id
              WHERE b.revision=r.version AND existing.state='published')) OR (?='publish' AND d.draft_revision=r.version))`)
        .bind(mode,mode,revision??null,this.config.policy,expectedVersion,mode,mode,mode)
        .first<{revision:number;digest:string;parts:number;nodes:number}>();
      if(!source) conflict();
      // Observe before asynchronous planning: an older start must not supersede
      // an unseen preparation created while that planning was in flight.
      const observed=await this.db.prepare("SELECT id FROM cms_artifact_catalogs WHERE state IN ('building','ready')").first<{id:string}>();
      const summary=await this.summaries(source.revision);
      const context=createPublicProjectionContext(summary);
      const serialized=serializeContext(context);
      const contextDigest=await digest(JSON.stringify(serialized));
      const projected=projectPublicValue(summary,context) as CmsDocument;
      const plan=makePlan(projected,serialized,source.parts,this.config.origin,slugRedirects(this.config.redirects));
      plan.nodes=source.nodes;
      const id=crypto.randomUUID().replaceAll('-','');
      const {policy,assets,origin}=this.config;
      const bootstrapIdentity=bootstrap
        ? `AND EXISTS(SELECT 1 FROM cms_catalog_bootstraps b WHERE b.catalog_id=cms_artifact_catalogs.id AND b.revision=? AND b.expected_version=?)`
        : `AND NOT EXISTS(SELECT 1 FROM cms_catalog_bootstraps b WHERE b.catalog_id=cms_artifact_catalogs.id)`;
      const identity=`actor=? AND mode=? AND expected_version=? AND source_revision=? AND source_digest=?
        AND policy=? AND renderer=? AND assets=? AND origin=? AND context_digest=? ${bootstrapIdentity}`;
      const values=[actor,catalogMode,expectedVersion,source.revision,source.digest,policy,renderer,assets,origin,contextDigest];
      const identityValues=bootstrap?[...values,source.revision,expectedVersion]:values;
      const results=await this.batch([
        this.db.prepare(`SELECT CASE WHEN EXISTS(SELECT 1 FROM cms_documents d
          JOIN cms_revisions r ON r.version=? AND r.version<=d.version
          JOIN cms_revision_admissions a ON a.revision=r.version AND a.policy=? AND a.digest=?
            AND a.document_bytes=length(CAST(r.document AS BLOB))
          WHERE d.id=1 AND d.version=? AND (?='rollback'
            OR (?='bootstrap' AND d.published_revision=a.revision
              AND NOT EXISTS(SELECT 1 FROM cms_publications p WHERE p.revision=a.revision)
              AND NOT EXISTS(SELECT 1 FROM cms_catalog_bootstraps b JOIN cms_artifact_catalogs existing ON existing.id=b.catalog_id
                WHERE b.revision=a.revision AND existing.state='published'))
            OR (?='publish' AND d.draft_revision=a.revision)))
          THEN 1 ELSE json('publication_conflict') END`).bind(source.revision,policy,source.digest,expectedVersion,mode,mode,mode),
        this.db.prepare(`UPDATE cms_artifact_catalogs SET state='expired' WHERE state IN ('building','ready') AND
          (expires_at<=${clock} OR expected_version<>(SELECT version FROM cms_documents WHERE id=1))`),
        // start is an explicit owner action, not a commit retry. Keep receipts and
        // reservations charged; only this actor may supersede its uncommitted intent.
        this.db.prepare(`UPDATE cms_artifact_catalogs SET state='expired'
          WHERE id=? AND state IN ('building','ready') AND actor=? AND NOT(${identity})
            AND NOT EXISTS(SELECT 1 FROM cms_publications p WHERE p.catalog_id=cms_artifact_catalogs.id)`).bind(observed?.id??null,actor,...identityValues),
        this.db.prepare(`SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM cms_artifact_catalogs
          WHERE state IN ('building','ready') AND NOT(${identity})) THEN 1 ELSE json('publication_conflict') END`).bind(...identityValues),
        this.db.prepare(`INSERT INTO cms_artifact_catalogs(id,actor,mode,expected_version,target_revision,source_revision,source_digest,
          policy,renderer,assets,origin,context_digest,state,expected_entries,plan_json,expires_at)
          SELECT ?,?,?,?,?,?,?,?,?,?,?,?,'building',?,?,${clock}+3600
          WHERE NOT EXISTS(SELECT 1 FROM cms_artifact_catalogs WHERE state IN ('building','ready'))`)
          .bind(id,actor,catalogMode,expectedVersion,expectedVersion+1,source.revision,source.digest,policy,renderer,assets,origin,contextDigest,plan.entries.length,JSON.stringify(plan)),
        this.db.prepare(`INSERT OR IGNORE INTO cms_catalog_bootstraps(catalog_id,revision,expected_version)
          SELECT id,source_revision,expected_version FROM cms_artifact_catalogs WHERE id=? AND ?='bootstrap' AND state='building'`)
          .bind(id,mode),
        this.db.prepare(`SELECT id FROM cms_artifact_catalogs WHERE state IN ('building','ready') AND ${identity}`).bind(...identityValues),
      ]);
      const selected=results[results.length-1].results?.[0]?.id;
      if(typeof selected!=='string') conflict();
      return this.status(selected,actor);
    } catch(error) { failure(error); }
  }
  private async catalog(id: string, actor: string, progress = false): Promise<Catalog> {
    actorCheck(actor); const renderer=await this.configuration();
    if(typeof id!=='string'||!/^[a-f0-9]{32}$/.test(id)) throw new CmsError(400,'invalid_publication');
    const {policy,assets,origin}=this.config;
    const row=await this.db.prepare(`SELECT ${progress ? `(SELECT COUNT(*) FROM cms_artifact_entries WHERE catalog_id=c.id)+
        (SELECT COUNT(*) FROM cms_catalog_upload_checks WHERE catalog_id=c.id)+
        (SELECT COALESCE(SUM(COALESCE((SELECT p.work_units FROM cms_projection_cache p WHERE p.policy=c.policy AND p.context_digest=c.context_digest
          AND p.kind=json_extract(m.value,'$.kind') AND p.digest=json_extract(m.value,'$.digest') AND p.part_key=COALESCE(json_extract(m.value,'$.key'),'')),
          (SELECT w.processed FROM cms_large_projection_work w WHERE w.policy=c.policy AND w.context_digest=c.context_digest
          AND w.kind=json_extract(m.value,'$.kind') AND w.digest=json_extract(m.value,'$.digest') AND w.part_key=COALESCE(json_extract(m.value,'$.key'),'')),0)),0)
          FROM json_each(a.manifest) m)+
        (SELECT COUNT(*) FROM json_each(a.manifest) m WHERE EXISTS(${this.cacheExists})) AS count,` : ''}c.id,c.actor,c.expected_version,c.target_revision,c.source_revision,c.source_digest,c.policy,c.renderer,c.assets,
      c.origin,c.context_digest,c.state,c.plan_json,c.expires_at>${clock} AS live,${clock}+3600 AS renew_at,
      EXISTS(SELECT 1 FROM cms_catalog_bootstraps b WHERE b.catalog_id=c.id AND b.revision=c.source_revision AND b.expected_version=c.expected_version) AS bootstrap
      FROM cms_artifact_catalogs c
      JOIN cms_documents d ON d.id=1 AND d.version=c.expected_version
      JOIN cms_revision_admissions a ON a.revision=c.source_revision AND a.policy=c.policy AND a.digest=c.source_digest
      JOIN cms_revisions r ON r.version=a.revision AND length(CAST(r.document AS BLOB))=a.document_bytes
      WHERE c.id=? AND c.actor=? AND c.policy=? AND c.renderer=? AND c.assets=? AND c.origin=?
        AND (c.mode='rollback' OR d.draft_revision=c.source_revision OR (d.published_revision=c.source_revision
          AND EXISTS(SELECT 1 FROM cms_catalog_bootstraps b WHERE b.catalog_id=c.id AND b.revision=c.source_revision AND b.expected_version=c.expected_version)))`)
      .bind(id,actor,policy,renderer,assets,origin).first<Catalog>();
    if(!row||!row.live||!['building','ready'].includes(row.state)) conflict();
    return row;
  }
  private guard(catalog: Catalog, minimumExpiry = 0): CmsD1Statement {
    const {policy,assets,origin}=this.config;
    const renderer=catalog.renderer;
    return this.db.prepare(`SELECT CASE WHEN EXISTS(SELECT 1 FROM cms_artifact_catalogs c
      JOIN cms_documents d ON d.id=1 AND d.version=c.expected_version
      JOIN cms_revision_admissions a ON a.revision=c.source_revision AND a.policy=c.policy AND a.digest=c.source_digest
      WHERE c.id=? AND c.actor=? AND c.policy=? AND c.renderer=? AND c.assets=? AND c.origin=? AND c.context_digest=?
        AND c.state='building' AND c.expires_at>${clock} AND c.expires_at>=? AND (c.mode='rollback' OR d.draft_revision=c.source_revision
          OR (d.published_revision=c.source_revision AND EXISTS(SELECT 1 FROM cms_catalog_bootstraps b
            WHERE b.catalog_id=c.id AND b.revision=c.source_revision AND b.expected_version=c.expected_version))))
      THEN 1 ELSE json('publication_conflict') END`).bind(catalog.id,catalog.actor,policy,renderer,assets,origin,catalog.context_digest,minimumExpiry);
  }
  private renew(catalog: Catalog): CmsD1Statement[] {
    // Only a still-live admitted progress transaction may extend the inactivity
    // lease. Delayed requests cannot shorten newer progress or revive expiry.
    return [this.db.prepare(`UPDATE cms_artifact_catalogs SET expires_at=max(expires_at,?)
      WHERE id=? AND state='building' AND expires_at>${clock}`).bind(catalog.renew_at,catalog.id),
      this.guard(catalog,catalog.renew_at)];
  }
  private cacheExists = `SELECT 1 FROM cms_projection_cache p WHERE p.policy=c.policy AND p.context_digest=c.context_digest
    AND p.kind=json_extract(m.value,'$.kind') AND p.digest=json_extract(m.value,'$.digest') AND p.part_key=COALESCE(json_extract(m.value,'$.key'),'')`;

  async advance(id: string, actor: string): Promise<Progress> {
    try {
      const catalog=await this.catalog(id,actor);
      if(catalog.state==='ready') return this.status(id,actor);
      const plan=JSON.parse(catalog.plan_json) as Plan;
      if(await digest(JSON.stringify(plan.context))!==catalog.context_digest) conflict();
      const missing=await this.db.prepare(`WITH missing AS (
        SELECT json_extract(m.value,'$.kind') AS kind,json_extract(m.value,'$.index') AS position,
          json_extract(m.value,'$.key') AS field_key,json_extract(m.value,'$.digest') AS digest,
          SUM(v.document_bytes) OVER (ORDER BY CAST(m.key AS INTEGER)) AS running_bytes,
          ROW_NUMBER() OVER (ORDER BY CAST(m.key AS INTEGER)) AS ordinal
        FROM cms_artifact_catalogs c JOIN cms_revision_admissions a ON a.revision=c.source_revision AND a.policy=c.policy AND a.digest=c.source_digest
        CROSS JOIN json_each(a.manifest) m CROSS JOIN cms_validation_parts v ON v.policy=c.policy AND v.kind=json_extract(m.value,'$.kind') AND v.digest=json_extract(m.value,'$.digest')
        WHERE c.id=? AND NOT EXISTS(${this.cacheExists})
      ) SELECT m.kind,m.position,m.field_key,m.digest,v.document_json FROM missing m JOIN cms_validation_parts v
        ON v.policy=? AND v.kind=m.kind AND v.digest=m.digest WHERE m.running_bytes<=32768 AND m.ordinal<=40 ORDER BY m.ordinal`)
        .bind(id,catalog.policy).all<{kind:string;position:number;field_key:string|null;digest:string;document_json:string}>();
      if(!missing.success) throw new CmsError(503,'cms_unavailable');
      if(missing.results?.length) {
        const context: PublicProjectionContext={pageIds:new Set(plan.context.pageIds),productIds:new Set(plan.context.productIds),
          reviewIds:new Set(plan.context.reviewIds),mediaSources:new Map(plan.context.mediaSources as [unknown,unknown][])};
        const statements=[this.guard(catalog)];
        for(const row of missing.results) {
          if(await digest(row.document_json)!==row.digest) conflict();
          const part: CmsPart={kind:row.kind,index:row.position,...(row.field_key===null?{}:{key:row.field_key}),value:JSON.parse(row.document_json)};
          const projected=projectPublicPart(part,context);
          if(part.kind!=='media')requireKnownUploadReferences(projected.value,context.mediaSources,catalog.origin);
          statements.push(this.db.prepare(`INSERT OR IGNORE INTO cms_projection_cache(policy,context_digest,kind,digest,part_key,public_json,original_refs,public_refs)
            VALUES (?,?,?,?,?,?,?,?)`).bind(catalog.policy,catalog.context_digest,row.kind,row.digest,row.field_key??'',
            projected.value===undefined?null:JSON.stringify(projected.value),JSON.stringify(projected.originalMediaIds),JSON.stringify(projected.publicMediaIds)));
        }
        await this.batch([...statements,...this.renew(catalog)]);
        return this.status(id,actor);
      }
      const progress=await this.status(id,actor);
      if(await this.largeProjection(catalog,plan))return this.status(id,actor);
      await this.batch([this.guard(catalog),
        this.db.prepare(`SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM cms_revision_admissions a,json_each(a.manifest) m
          JOIN cms_artifact_catalogs c ON c.source_revision=a.revision AND c.policy=a.policy AND c.source_digest=a.digest
          WHERE c.id=? AND NOT EXISTS(${this.cacheExists})) THEN 1 ELSE json('publication_conflict') END`).bind(id),
        this.db.prepare(`UPDATE cms_artifact_catalogs SET public_json=(SELECT document FROM (${projectedDocumentSql()}))
          WHERE id=? AND public_json IS NULL`).bind(id,id),
      ]);
      if(await this.checkUpload(catalog)) return this.status(id,actor);
      const next=await this.db.prepare(`SELECT json_extract(e.value,'$.path') AS path,json_extract(e.value,'$.type') AS type,
        json_extract(e.value,'$.language') AS language FROM cms_artifact_catalogs c,json_each(c.plan_json,'$.entries') e
        WHERE c.id=? AND NOT EXISTS(SELECT 1 FROM cms_artifact_entries a WHERE a.catalog_id=c.id AND a.path=json_extract(e.value,'$.path'))
        ORDER BY CAST(e.key AS INTEGER) LIMIT 1`).bind(id).first<Entry>();
      if(next) {
        const content=await this.render(catalog,next);
        await this.store(catalog,next,content.body,content.contentType);
      }
      const after=await this.status(id,actor);
      if(after.done===after.total) await this.seal(catalog);
      return this.status(id,actor);
    } catch(error) {
      // A concurrent advance may have sealed exactly this actor/config/source while
      // our building-only guard waited. Re-read eligibility; stale jobs still fail.
      if(error instanceof Error && /publication_conflict|malformed JSON|cms_catalog_sealed/.test(error.message)) {
        try { const current=await this.status(id,actor); if(current.ready) return current; } catch { /* preserve the original sanitized failure */ }
      }
      failure(error);
    }
  }

  private async render(catalog: Catalog, entry: Entry): Promise<{body:string;contentType:string}> {
    const origin=catalog.origin;
    if(entry.type==='robots') return {body:`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`,contentType:'text/plain; charset=utf-8'};
    const row=await this.db.prepare(`SELECT public_json,json_extract(public_json,'$.legacy') AS legacy_json FROM cms_artifact_catalogs WHERE id=?`)
      .bind(catalog.id).first<{public_json:string;legacy_json:string}>();
    if(!row?.public_json) conflict();
    if(entry.type==='document') return {body:`{"version":${catalog.bootstrap?catalog.source_revision:catalog.target_revision},"document":${row.public_json}}`,contentType:'application/json; charset=utf-8'};
    if(entry.type==='compatibility') return {body:row.legacy_json,contentType:'application/json; charset=utf-8'};
    const document=JSON.parse(row.public_json) as CmsDocument;
    if(entry.type==='sitemap') {
      const urls=document.pages.filter(page=>!page.seo.noIndex).flatMap(page=>languages.filter(language=>pageLocaleAvailable(document,page,language)).map(language=>{
        const alternates=languages.filter(lang=>pageLocaleAvailable(document,page,lang)).map(lang=>`<xhtml:link rel="alternate" hreflang="${lang}" href="${origin}${pagePath(document,page.id,lang)}"/>`).join('');
        return `<url><loc>${origin}${pagePath(document,page.id,language)}</loc>${alternates}</url>`;
      })).join('');
      return {body:`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`,contentType:'application/xml; charset=utf-8'};
    }
    const asset=await this.assetsBinding.fetch(new Request(new URL('/index.html',origin),{headers:{Accept:'text/html'}}));
    if(!asset.ok||!asset.headers.get('Content-Type')?.includes('text/html')) throw new CmsError(503,'assets_unavailable');
    const bytes=await asset.arrayBuffer();
    if(hex(await crypto.subtle.digest('SHA-256',bytes))!==this.config.shell) throw new CmsError(409,'assets_mismatch');
    const shell=new TextDecoder().decode(bytes);
    const route=entry.type==='404'?{language:entry.language!,pageId:'not-found'}:resolveRoute(new URL(entry.path,origin),document);
    if(entry.type==='html'&&(!route.page||route.redirect)) conflict();
    return {body:rewriteRouteHtml(shell,document,route,origin),contentType:'text/html; charset=utf-8'};
  }
  private async store(catalog: Catalog, entry: Entry, body: string, contentType: string) {
    const bytes=encode(body);
    if(bytes.byteLength<1||bytes.byteLength>4000000) throw new CmsError(413,'publication_too_large');
    const checksum=await crypto.subtle.digest('SHA-256',bytes);
    const hash=hex(checksum);
    const key=`prepared/v1/${catalog.id}/${await digest(entry.path)}`;
    const metadata={catalog:catalog.id,path:entry.path,digest:hash};
    const previous=await this.bucket.head(key);
    // Reserve BEFORE a possible external write; ambiguous failures retain their full charge.
    const reserve=previous
      ? this.db.prepare(`INSERT OR IGNORE INTO cms_artifact_reservations(catalog_id,path,bytes,state,attempts) VALUES (?,?,?,'pending',1)`)
      : this.db.prepare(`INSERT INTO cms_artifact_reservations(catalog_id,path,bytes,state,attempts) VALUES (?,?,?,'pending',1)
          ON CONFLICT(catalog_id,path) DO UPDATE SET attempts=attempts+1 WHERE state='pending' AND attempts<3 AND bytes=excluded.bytes`);
    // D1 meta.changes includes trigger writes; changes() records only this reservation
    // INSERT/UPSERT, inside the same atomic batch as its eligibility guard.
    const reserved=await this.db.batch([this.guard(catalog),reserve.bind(catalog.id,entry.path,bytes.byteLength),
      this.db.prepare('SELECT changes() AS reserved')]);
    if(reserved.length!==3||reserved.some(result=>!result.success)) throw new CmsError(503,'cms_unavailable');
    if(!previous&&reserved[2].results?.[0]?.reserved!==1) throw new CmsError(503,'artifact_attempts_exhausted');
    const written=previous??await this.bucket.put(key,bytes,{onlyIf:{etagDoesNotMatch:'*'},sha256:checksum,
      httpMetadata:{contentType},customMetadata:metadata});
    // A PUT acknowledgment is not a readback. Conditional collisions also require exact verification.
    const object=await this.bucket.head(key);
    if(!object||!object.etag||object.etag.length>128||!object.version||object.version.length>128||object.size!==bytes.byteLength ||
      object.httpMetadata?.contentType!==contentType || !object.checksums?.sha256 || hex(object.checksums.sha256)!==hash ||
      Object.entries(metadata).some(([name,value])=>object.customMetadata?.[name]!==value) ||
      (written&&(written.etag!==object.etag||written.version!==object.version))) throw new CmsError(503,'artifact_verification_failed');
    await this.batch([this.guard(catalog),
      this.db.prepare(`INSERT OR IGNORE INTO cms_artifact_entries(catalog_id,path,object_key,etag,object_version,digest,bytes,content_type,status)
        VALUES (?,?,?,?,?,?,?,?,?)`).bind(catalog.id,entry.path,key,object.etag,object.version,hash,object.size,contentType,entry.type==='404'?404:200),
      this.db.prepare(`SELECT CASE WHEN EXISTS(SELECT 1 FROM cms_artifact_entries WHERE catalog_id=? AND path=? AND object_key=? AND etag=?
        AND object_version=? AND digest=? AND bytes=? AND content_type=? AND status=?) THEN 1 ELSE json('publication_conflict') END`)
        .bind(catalog.id,entry.path,key,object.etag,object.version,hash,object.size,contentType,entry.type==='404'?404:200),
      this.db.prepare(`UPDATE cms_artifact_reservations SET state='stored' WHERE catalog_id=? AND path=? AND bytes=? AND state='pending'`)
        .bind(catalog.id,entry.path,object.size),
      ...this.renew(catalog),
    ]);
  }
  private async largeProjection(catalog:Catalog,plan:Plan):Promise<boolean> {
    const part=await this.db.prepare(`SELECT v.kind,v.digest,COALESCE(json_extract(m.value,'$.key'),'') AS part_key
      FROM cms_artifact_catalogs c JOIN cms_revision_admissions a ON a.revision=c.source_revision AND a.policy=c.policy AND a.digest=c.source_digest
      CROSS JOIN json_each(a.manifest) m JOIN cms_validation_parts v ON v.policy=c.policy AND v.kind=json_extract(m.value,'$.kind') AND v.digest=json_extract(m.value,'$.digest')
      WHERE c.id=? AND v.document_bytes>32768 AND NOT EXISTS(${this.cacheExists}) ORDER BY CAST(m.key AS INTEGER) LIMIT 1`)
      .bind(catalog.id).first<{kind:string;digest:string;part_key:string}>();
    if(!part)return false;
    const keys=[catalog.policy,catalog.context_digest,part.kind,part.digest,part.part_key];
    const match='policy=? AND context_digest=? AND kind=? AND digest=? AND part_key=?';
    await this.batch([this.guard(catalog),this.db.prepare(`INSERT OR IGNORE INTO cms_large_projection_work(policy,context_digest,kind,digest,part_key,public_json,total)
      SELECT ?,?,?,?,?,document_json,(SELECT COUNT(*) FROM json_tree(document_json)) FROM cms_validation_parts v WHERE v.policy=? AND v.kind=? AND v.digest=?
      AND NOT EXISTS(SELECT 1 FROM cms_projection_cache p WHERE p.policy=v.policy AND p.context_digest=? AND p.kind=v.kind AND p.digest=v.digest AND p.part_key=?)`)
      .bind(...keys,catalog.policy,part.kind,part.digest,catalog.context_digest,part.part_key)]);
    const state=await this.db.prepare(`SELECT cursor,processed,total FROM cms_large_projection_work WHERE ${match}`).bind(...keys)
      .first<{cursor:string;processed:number;total:number}>();
    if(!state)conflict();
    const field=part.kind==='uiCopy'?part.part_key:part.kind.replace(/^legacy\./,'');
    const result=await this.db.prepare(LARGE_NODES_SQL).bind(...keys,field,state.cursor)
      .all<{fullkey:string;type:string;summary:string|null;sortkey:string;field:string;value:string|null}>();
    if(!result.success)throw new CmsError(503,'cms_unavailable');
    const nodes=result.results??[];
    // Twelve nodes leave room for direct-change guards and router quota queries.
    if(!nodes.length||nodes.length>12||encode(JSON.stringify(nodes)).byteLength>32768)conflict();
    const context:PublicProjectionContext={pageIds:new Set(plan.context.pageIds),productIds:new Set(plan.context.productIds),
      reviewIds:new Set(plan.context.reviewIds),mediaSources:new Map(plan.context.mediaSources as [unknown,unknown][])};
    const statements=[this.guard(catalog),this.db.prepare(`SELECT CASE WHEN EXISTS(SELECT 1 FROM cms_large_projection_work
      WHERE ${match} AND cursor=? AND processed=?) THEN 1 ELSE json('publication_conflict') END`).bind(...keys,state.cursor,state.processed)];
    if(part.kind!=='media'&&part.kind!=='manifest')for(const node of nodes){
      const removed=node.type==='object'?projectPublicValue(JSON.parse(node.summary!),context,node.field)===undefined:
        node.field==='productIds'?context.productIds.has(node.value):node.field==='reviewIds'?context.reviewIds.has(node.value):false;
      if(removed)statements.push(this.db.prepare(`UPDATE cms_large_projection_work SET public_json=json_remove(public_json,?) WHERE ${match}`).bind(node.fullkey,...keys),
        this.db.prepare("SELECT CASE WHEN changes()=1 THEN 1 ELSE json('publication_conflict') END"));
    }
    statements.push(this.db.prepare(`UPDATE cms_large_projection_work SET cursor=?,processed=processed+? WHERE ${match}`)
      .bind(nodes[nodes.length-1].sortkey,nodes.length,...keys));
    statements.push(this.db.prepare(`SELECT CASE WHEN EXISTS(SELECT 1 FROM cms_large_projection_work WHERE ${match}
      AND cursor=? AND processed=?) THEN 1 ELSE json('publication_conflict') END`).bind(...keys,nodes[nodes.length-1].sortkey,state.processed+nodes.length));
    if(state.processed+nodes.length===state.total){
      const noRefs=part.kind==='media'||part.kind==='manifest'||field==='media';
      const refs=(raw:string)=>noRefs?"'[]'":field==='mediaId'?`json_insert(${largeRefsSql(raw)},'$[#]',json(${raw}))`:largeRefsSql(raw);
      const original=refs('v.document_json');
      const projected=refs('w.public_json');
      statements.push(this.db.prepare(`INSERT OR IGNORE INTO cms_projection_cache(policy,context_digest,kind,digest,part_key,public_json,original_refs,public_refs,work_units)
        SELECT w.policy,w.context_digest,w.kind,w.digest,w.part_key,w.public_json,${original},${projected},w.total
        FROM cms_large_projection_work w JOIN cms_validation_parts v ON v.policy=w.policy AND v.kind=w.kind AND v.digest=w.digest
        JOIN cms_artifact_catalogs c ON c.id=? WHERE w.policy=? AND w.context_digest=? AND w.kind=? AND w.digest=? AND w.part_key=? AND w.processed=w.total`)
        .bind(catalog.id,...keys));
      statements.push(this.db.prepare(`SELECT CASE WHEN EXISTS(SELECT 1 FROM cms_projection_cache p JOIN cms_large_projection_work w
        ON p.policy=w.policy AND p.context_digest=w.context_digest AND p.kind=w.kind AND p.digest=w.digest AND p.part_key=w.part_key
        WHERE w.policy=? AND w.context_digest=? AND w.kind=? AND w.digest=? AND w.part_key=? AND p.work_units=w.total AND p.public_json IS w.public_json)
        THEN 1 ELSE json('publication_conflict') END`).bind(...keys));
      statements.push(this.db.prepare(`DELETE FROM cms_large_projection_work WHERE ${match}`).bind(...keys),
        this.db.prepare("SELECT CASE WHEN changes()=1 THEN 1 ELSE json('publication_conflict') END"));
    }
    await this.batch([...statements,...this.renew(catalog)]);
    return true;
  }

  private async checkUpload(catalog: Catalog): Promise<boolean> {
    const next=await this.db.prepare(`SELECT CAST(u.key AS INTEGER) AS position,json_extract(u.value,'$.key') AS media_key,
      EXISTS(SELECT 1 FROM cms_revision_admissions a CROSS JOIN json_each(a.manifest) m
        CROSS JOIN cms_projection_cache p ON p.policy=c.policy AND p.context_digest=c.context_digest AND p.kind=json_extract(m.value,'$.kind')
          AND p.digest=json_extract(m.value,'$.digest') AND p.part_key=COALESCE(json_extract(m.value,'$.key'),'')
        CROSS JOIN json_each(p.public_refs) refs
        WHERE a.revision=c.source_revision AND a.policy=c.policy AND a.digest=c.source_digest AND refs.value=json_extract(u.value,'$.id')) AS used
      FROM cms_artifact_catalogs c CROSS JOIN json_each(c.plan_json,'$.uploads') u WHERE c.id=? AND NOT EXISTS(
        SELECT 1 FROM cms_catalog_upload_checks checks WHERE checks.catalog_id=c.id AND checks.position=CAST(u.key AS INTEGER))
      ORDER BY CAST(u.key AS INTEGER) LIMIT 1`).bind(catalog.id).first<{position:number;media_key:string;used:number}>();
    if(!next)return false;
    const key=next.media_key;
    if(next.used&&!MEDIA_KEY_PATTERN.test(key))throw new CmsError(422,'upload_verification_failed');
    // Exactly one candidate and at most one R2 HEAD per advance. Upload bytes were
    // decoded/re-encoded by uploadMedia; legacy SHA absence is not a guessed digest.
    const receipt=next.used?uploadReceipt(key,await this.bucket.head(`uploads/${key}`)):null;
    await this.batch([this.guard(catalog),
      this.db.prepare(`SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM cms_catalog_upload_checks WHERE catalog_id=? AND media_key=?
        AND state='verified' AND ? IS NOT NULL AND receipt_json IS NOT ?) THEN 1 ELSE json('publication_conflict') END`)
        .bind(catalog.id,key,receipt?JSON.stringify(receipt):null,receipt?JSON.stringify(receipt):null),
      this.db.prepare(`INSERT OR IGNORE INTO cms_catalog_upload_checks(catalog_id,position,media_key,state,receipt_json)
        VALUES (?,?,?,?,?)`).bind(catalog.id,next.position,key,receipt?'verified':'unused',receipt?JSON.stringify(receipt):null),
      this.db.prepare(`SELECT CASE WHEN EXISTS(SELECT 1 FROM cms_catalog_upload_checks WHERE catalog_id=? AND position=?
        AND media_key=? AND state=? AND receipt_json IS ?) THEN 1 ELSE json('publication_conflict') END`)
        .bind(catalog.id,next.position,key,receipt?'verified':'unused',receipt?JSON.stringify(receipt):null),
      ...this.renew(catalog),
    ]);
    return true;
  }
  private async seal(catalog: Catalog) {
    await this.batch([this.guard(catalog),
      this.db.prepare(`SELECT CASE WHEN EXISTS(SELECT 1 FROM cms_artifact_catalogs c WHERE c.id=? AND c.public_json IS NOT NULL
        AND json_array_length(c.plan_json,'$.entries')=c.expected_entries
        AND NOT EXISTS(SELECT 1 FROM json_each(c.plan_json,'$.entries') p WHERE NOT EXISTS(SELECT 1 FROM cms_artifact_entries e
          JOIN cms_artifact_reservations r ON r.catalog_id=e.catalog_id AND r.path=e.path AND r.bytes=e.bytes AND r.state='stored'
          WHERE e.catalog_id=c.id AND e.path=json_extract(p.value,'$.path')))) THEN 1 ELSE json('publication_conflict') END`).bind(catalog.id),
      this.db.prepare(`INSERT OR IGNORE INTO cms_catalog_routes(catalog_id,route_key,canonical_path)
        SELECT c.id,json_extract(r.value,'$.key'),json_extract(r.value,'$.path') FROM cms_artifact_catalogs c,json_each(c.plan_json,'$.routes') r WHERE c.id=?`).bind(catalog.id),
      this.db.prepare(`INSERT OR IGNORE INTO cms_catalog_media(catalog_id,media_key)
        SELECT catalog_id,media_key FROM cms_catalog_upload_checks WHERE catalog_id=? AND state='verified'`).bind(catalog.id),
      this.db.prepare(`UPDATE cms_artifact_catalogs SET state='ready',expires_at=max(expires_at,${clock}+3600) WHERE id=? AND state='building'`).bind(catalog.id),
    ]);
  }

  async status(id: string, actor: string): Promise<Progress> {
    try {
      const catalog=await this.catalog(id,actor,true);
      const plan=JSON.parse(catalog.plan_json) as Plan;
      const row=catalog as Catalog & {count:number};
      return {id,ready:catalog.state==='ready',done:row!.count,total:plan.parts+plan.entries.length+(plan.uploads?.length??0)+(plan.nodes??0)};
    } catch(error) { failure(error); }
  }
}
