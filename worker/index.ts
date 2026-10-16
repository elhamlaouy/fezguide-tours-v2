import { validateCmsDocument } from '../src/cms/schema';
import { createCmsHandler, isCmsAdminPath, type CmsRoutesEnv } from './cms-routes';
import type { PlatformAccess } from './cms-auth';
import { publicSeoResponse } from './seo';

interface KVNamespaceReader {
  get(key: string): Promise<string | null>;
}

export interface Env extends CmsRoutesEnv {
  CANONICAL_ORIGIN?: string;
  CMS_SLUG_REDIRECTS?: string;
  CMS_AUTH_DIAGNOSTICS?: string;
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
  async fetch(request: Request, env: Env, context?: { access?: PlatformAccess }): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    // Admin is always gated, including when D1 is absent, so writes and /admin
    // cannot fall through to assets. Public D1 routes replace KV only when CMS_DB exists.
    const admin = isCmsAdminPath(path);
    const staticAsset = /^\/(?:assets|images|fonts)(?:\/|$)/.test(path) || path === '/favicon.svg';
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
    if (admin || path.startsWith('/media/upload-') || (env.CMS_DB && publicCms)) {
      const cmsResponse = await cms(request, env, context?.access);
      // Temporary isolated-preview probe: booleans only, never tokens, cookies, IDs or claims.
      if (cmsResponse?.status === 401 && env.CMS_AUTH_DIAGNOSTICS === 'true') return jsonResponse({error:'unauthorized',probe:{platform:Boolean(context?.access),platformAudienceMatches:context?.access?.aud === env.ACCESS_AUD,assertion:request.headers.has('Cf-Access-Jwt-Assertion'),signedCookie:/(?:^|;\s*)CF_Authorization=/.test(request.headers.get('Cookie') ?? '')}},401);
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
      const seo = await publicSeoResponse(request, env);
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
