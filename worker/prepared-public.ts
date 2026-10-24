import type { CmsD1Database } from './cms-store';
import { redirectRendererId } from './cms-slug-redirects';

export interface PreparedObject {
  key?: string; version?: string; etag?: string; size?: number;
  body?: ReadableStream | null;
  checksums?: { sha256?: ArrayBuffer | ArrayBufferView };
  httpMetadata?: { contentType?: string };
}
export interface PreparedPublicEnv {
  CMS_DB?: CmsD1Database;
  CMS_MEDIA?: { get(key: string, options?: { onlyIf: { etagMatches: string } }): Promise<PreparedObject | null> };
  CANONICAL_ORIGIN?: string;
  CMS_PUBLIC_DELIVERY_ORIGIN?: string;
  CMS_VALIDATION_POLICY?: string;
  CMS_RENDERER_ID?: string;
  CMS_SLUG_REDIRECTS?: string;
  CMS_ASSET_ID?: string;
}
interface Entry {
  revision: number; document_version: number; target_revision: number; expected_version: number; source_revision: number; source_digest: string;
  id: string; policy: string; renderer: string; assets: string; origin: string; state: string; bootstrap: number;
  canonical_path: string | null; path: string; object_key: string; etag: string;
  object_version: string; digest: string; bytes: number; content_type: string; status: number;
}
const types=new Set(['text/html; charset=utf-8','application/json; charset=utf-8','application/xml; charset=utf-8','text/plain; charset=utf-8']);
const hash=/^[a-f0-9]{64}$/;
const unavailable=()=>new Response('Published content is unavailable',{status:503,headers:{'Cache-Control':'no-store','Content-Type':'text/plain; charset=utf-8','X-Content-Type-Options':'nosniff'}});
function hex(value:ArrayBuffer|ArrayBufferView|undefined) {
  if(!value)return '';
  const bytes=ArrayBuffer.isView(value)?new Uint8Array(value.buffer,value.byteOffset,value.byteLength):new Uint8Array(value);
  return bytes.length===32?Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''):'';
}

/** One published-entry lookup. Never select or process the private source document. */
export const PREPARED_LOOKUP=`SELECT d.published_revision AS revision,d.version AS document_version,c.id,c.target_revision,c.expected_version,c.source_revision,c.source_digest,
  (b.catalog_id IS NOT NULL) AS bootstrap,c.policy,c.renderer,c.assets,c.origin,c.state,f.canonical_path,
  e.path,e.object_key,e.etag,e.object_version,e.digest,e.bytes,e.content_type,e.status
  FROM cms_documents d LEFT JOIN cms_publications p ON p.revision=d.published_revision
  LEFT JOIN cms_catalog_bootstraps b ON b.revision=d.published_revision AND b.expected_version=d.version
  JOIN cms_artifact_catalogs c ON c.id=COALESCE(p.catalog_id,b.catalog_id)
    AND ((p.catalog_id IS NOT NULL AND c.target_revision=d.published_revision)
      OR (p.catalog_id IS NULL AND b.catalog_id IS NOT NULL AND c.source_revision=d.published_revision AND c.expected_version=d.version))
  JOIN cms_revision_admissions a ON a.revision=c.source_revision AND a.policy=c.policy AND a.digest=c.source_digest
  JOIN cms_revision_admissions active ON active.revision=d.published_revision AND active.policy=c.policy
    AND active.digest=c.source_digest AND active.document_bytes=a.document_bytes AND active.manifest=a.manifest
  LEFT JOIN cms_catalog_routes f ON f.catalog_id=c.id AND f.route_key=?
  JOIN cms_artifact_entries e ON e.catalog_id=c.id AND e.path=COALESCE(?,f.canonical_path,?)
  WHERE d.id=1 AND c.state='published' AND c.policy=? AND c.renderer=? AND c.assets=? AND c.origin=?`;

export async function preparedPublicResponse(request:Request,env:PreparedPublicEnv):Promise<Response> {
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD','Cache-Control':'no-store'}});
  let object:PreparedObject|null=null;
  try {
    const url=new URL(request.url);
    if(!env.CMS_DB||!env.CMS_MEDIA||!env.CANONICAL_ORIGIN||!env.CMS_PUBLIC_DELIVERY_ORIGIN||!env.CMS_VALIDATION_POLICY||!env.CMS_RENDERER_ID||!env.CMS_ASSET_ID)return unavailable();
    if(url.origin!==env.CMS_PUBLIC_DELIVERY_ORIGIN||new URL(env.CANONICAL_ORIGIN).origin!==env.CANONICAL_ORIGIN)return unavailable();
    const renderer=await redirectRendererId(env.CMS_RENDERER_ID,env.CMS_SLUG_REDIRECTS);
    const segments=url.pathname.split('/').filter(Boolean),prefix=segments[0];
    const prefixed=['en','fr','es'].includes(prefix),queryLanguage=url.searchParams.get('lang')??url.searchParams.get('language');
    const language=prefixed?prefix:queryLanguage==='fr'||queryLanguage==='es'?queryLanguage:'en';
    const pathKey=segments.slice(prefixed?1:0).join('/');
    const experienceId=!pathKey?(url.searchParams.get('experience')||url.searchParams.get('tour')||undefined):undefined;
    const queryPage=!pathKey?url.searchParams.get('page'):null;
    const key=pathKey||experienceId||queryPage||'home';
    const routingKey=`${pathKey?'path':'query'}:${language}:${key.length<=80?key:'@unknown'}`;
    const direct=['/api/cms','/api/cms/document','/robots.txt','/sitemap.xml'].includes(url.pathname)?url.pathname:null;
    const row=await env.CMS_DB.prepare(PREPARED_LOOKUP).bind(routingKey,direct,`@404:${language}`,env.CMS_VALIDATION_POLICY,renderer,env.CMS_ASSET_ID,env.CANONICAL_ORIGIN).first<Entry>();
    const bootstrap=row?.bootstrap===1;
    if(!row||(!bootstrap&&row.revision!==row.target_revision)||
      (bootstrap&&(row.revision!==row.source_revision||row.document_version!==row.expected_version||row.target_revision!==row.expected_version+1))||
      !Number.isSafeInteger(row.revision)||row.revision<1||!Number.isSafeInteger(row.source_revision)||
      (bootstrap?row.source_revision!==row.revision:row.source_revision>=row.revision)||
      !/^[a-f0-9]{32}$/.test(row.id)||!hash.test(row.source_digest)||!hash.test(row.digest)||row.origin!==env.CANONICAL_ORIGIN||
      row.policy!==env.CMS_VALIDATION_POLICY||row.renderer!==renderer||row.assets!==env.CMS_ASSET_ID||row.state!=='published'||
      !row.object_key.startsWith(`prepared/v1/${row.id}/`)||row.object_key.length>200||![200,404].includes(row.status)||
      !Number.isSafeInteger(row.bytes)||row.bytes<1||row.bytes>4_000_000||!types.has(row.content_type)||
      typeof row.etag!=='string'||!row.etag||row.etag.length>128||typeof row.object_version!=='string'||!row.object_version||row.object_version.length>128)return unavailable();
    const expectedType=direct?.startsWith('/api/')?'application/json; charset=utf-8':direct==='/sitemap.xml'?'application/xml; charset=utf-8':direct==='/robots.txt'?'text/plain; charset=utf-8':'text/html; charset=utf-8';
    const expectedPath=direct??row.canonical_path??`@404:${language}`;
    if(row.path!==expectedPath||row.content_type!==expectedType||row.status!==(expectedPath.startsWith('@404:')?404:200))return unavailable();
    if(!direct&&row.canonical_path&&(url.pathname!==row.canonical_path||experienceId||queryPage||queryLanguage)) {
      if(!/^\/(?!\/)[a-z0-9\/%-]*$/.test(row.canonical_path))return unavailable();
      const search=new URLSearchParams(url.search);
      for(const name of ['experience','tour','page','lang','language'])search.delete(name);
      return new Response(null,{status:308,headers:{Location:`${row.canonical_path}${search.size?'?'+search:''}${url.hash}`,'Cache-Control':'no-store'}});
    }
    object=await env.CMS_MEDIA.get(row.object_key,{onlyIf:{etagMatches:row.etag}});
    if(!object||!object.body||object.key!==row.object_key||object.etag!==row.etag||object.version!==row.object_version||object.size!==row.bytes||
       hex(object.checksums?.sha256)!==row.digest||object.httpMetadata?.contentType!==row.content_type) {
      await object?.body?.cancel().catch(()=>{});
      return unavailable();
    }
    if(request.method==='HEAD')await object.body.cancel().catch(()=>{});
    return new Response(request.method==='HEAD'?null:object.body,{status:row.status,headers:{
      'Content-Type':row.content_type,'Content-Length':String(row.bytes),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
    }});
  } catch {
    await object?.body?.cancel().catch(()=>{});
    return unavailable();
  }
}
