import { validateCmsDocument } from '../src/cms/schema';
import { createCmsHandler, isCmsAdminPath, type CmsRoutesEnv } from './cms-routes';
import { publicSeoResponse } from './seo';
import { preparedPublicResponse } from './prepared-public';

interface KVNamespaceReader {
  get(key: string): Promise<string | null>;
}

export interface Env extends CmsRoutesEnv {
  CANONICAL_ORIGIN?: string;
  CMS_PROCESSING_MODE?: string;
  CMS_PUBLIC_DELIVERY_ORIGIN?: string;
  CMS_VALIDATION_POLICY?: string;
  CMS_RENDERER_ID?: string;
  CMS_ASSET_ID?: string;
  CMS_SLUG_REDIRECTS?: string;
  CMS_PUBLIC_RATE_LIMIT_REQUIRED?: string;
  CMS_PUBLIC_RATE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
  CMS_KV?: KVNamespaceReader;
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
}

type JsonRecord = Record<string, unknown>;

const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: blob:; font-src 'self'; connect-src 'self'; frame-src 'self' about:; frame-ancestors 'none'; base-uri 'self'; form-action 'none'; object-src 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

const cms = createCmsHandler({ validateDocument: validateCmsDocument });

function jsonResponse(data: unknown, status = 200, cacheControl = 'no-store'): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cacheControl,
      ...securityHeaders,
    },
  });
}

function publicCmsData(raw: string): JsonRecord {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid CMS data');
  }

  const { bookings: _privateBookings, ...publicData } = parsed as JsonRecord;
  return publicData;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    // Retired public locale requests must not reach document stores or SPA fallback.
    // Decode once before segment checks, including encoded locale/slash boundaries.
    let decodedPath = path;
    try { decodedPath = decodeURIComponent(path); } catch { /* Malformed paths retain normal routing. */ }
    const retiredNamespace = /^\/(?:admin|api|media|assets|images|fonts)(?:\/|$)/.test(decodedPath);
    const retiredLocalePath = /^\/ar(?:\/|$)/.test(decodedPath);
    const retiredSelector = ['lang', 'language'].some(key => url.searchParams.getAll(key).includes('ar'));
    const publicPage = !retiredNamespace && (retiredLocalePath || !/\.[^/]+$/.test(decodedPath));
    if (['GET', 'HEAD'].includes(request.method) && publicPage && (retiredLocalePath || retiredSelector)) {
      return new Response(request.method === 'HEAD' ? null : 'This language version is no longer available.', {
        status: 410,
        headers: { ...securityHeaders, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Strict-Transport-Security': 'max-age=31536000' },
      });
    }
    // Admin is always gated, including when D1 is absent, so writes and /admin
    // cannot fall through to assets. Public D1 routes replace KV only when CMS_DB exists.
    const admin = isCmsAdminPath(path);
    const staticAsset = /^\/(?:assets|images|fonts)(?:\/|$)/.test(path) || path === '/favicon.svg' || path === '/manifest.json';
    const dynamic = admin || path.startsWith('/api/') || path.startsWith('/media/upload-') || (Boolean(env.CMS_DB) && !staticAsset);
    if (env.CMS_PUBLIC_RATE_LIMIT_REQUIRED === 'true' && dynamic) {
      try {
        if (!env.CMS_PUBLIC_RATE_LIMITER) throw new Error();
        // Shared platform counter per Cloudflare location, not a global/billing cap. No IP/token key or logging.
        const admitted = await env.CMS_PUBLIC_RATE_LIMITER.limit({ key: 'cms-dynamic' });
        if (admitted.success !== true) {
          const response = jsonResponse({ error: 'cms_public_rate' }, 429);
          response.headers.set('Retry-After', '60');
          return response;
        }
      } catch {
        return jsonResponse({ error: 'cms_unavailable' }, 503);
      }
    }
    const publicCms = path === '/api/cms' || path === '/api/cms/document';
    if (env.CMS_PROCESSING_MODE === 'staged-v1' && !admin && !staticAsset && !path.startsWith('/media/upload-') && (!path.startsWith('/api/') || publicCms)) {
      if (['GET','HEAD'].includes(request.method) && env.CANONICAL_ORIGIN?.startsWith('https://') && url.origin === env.CANONICAL_ORIGIN.replace('https://','https://www.')) {
        return new Response(null,{status:301,headers:{...securityHeaders,'Strict-Transport-Security':'max-age=31536000','Cache-Control':'no-store',Location:`${env.CANONICAL_ORIGIN}${url.pathname}${url.search}`}});
      }
      const prepared = await preparedPublicResponse(request, env);
      const headers = new Headers(prepared.headers);
      for (const [name,value] of Object.entries(securityHeaders)) headers.set(name,value);
      headers.set('Strict-Transport-Security','max-age=31536000');
      return new Response(prepared.body,{status:prepared.status,headers});
    }
    if (admin || path.startsWith('/media/upload-') || (env.CMS_DB && publicCms)) {
      const cmsResponse = await cms(request, env);
      if (cmsResponse) return cmsResponse;
    }

    if (path === '/api/cms') {
      if (request.method !== 'GET') {
        const response = jsonResponse({ error: 'Method not allowed' }, 405);
        response.headers.set('Allow', 'GET');
        return response;
      }

      if (!env.CMS_KV) {
        return jsonResponse({ configured: false, message: 'CMS content is unavailable' }, 503);
      }

      try {
        const raw = await env.CMS_KV.get('fez_cms_data');
        if (!raw) {
          return jsonResponse({ configured: true, data: null }, 200, 'public, max-age=30, s-maxage=30');
        }

        return jsonResponse(publicCmsData(raw), 200, 'public, max-age=30, s-maxage=30');
      } catch {
        return jsonResponse({ error: 'CMS content is unavailable' }, 500);
      }
    }

    if (path.startsWith('/api/')) {
      return jsonResponse({ error: 'Not found' }, 404);
    }

    try {
      const seo = env.CMS_PROCESSING_MODE === 'staged-v1' ? null : await publicSeoResponse(request, env);
      if (seo) {
        for (const [name, value] of Object.entries(securityHeaders)) seo.headers.set(name, value);
        seo.headers.set('Strict-Transport-Security', 'max-age=31536000');
        return seo;
      }
    } catch {
      // A configured store failure is not permission to reveal legacy source content.
      return new Response('Published content is unavailable', { status: 503, headers: { ...securityHeaders, 'Cache-Control': 'no-store' } });
    }

    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      const headers = new Headers(assetResponse.headers);
      for (const [name, value] of Object.entries(securityHeaders)) {
        headers.set(name, value);
      }
      headers.set('Strict-Transport-Security', 'max-age=31536000');

      return new Response(assetResponse.body, {
        status: assetResponse.status,
        statusText: assetResponse.statusText,
        headers,
      });
    }

    return new Response('Not found', { status: 404, headers: securityHeaders });
  },
};
