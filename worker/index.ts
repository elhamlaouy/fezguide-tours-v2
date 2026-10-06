interface KVNamespaceReader {
  get(key: string): Promise<string | null>;
}

export interface Env {
  CMS_KV?: KVNamespaceReader;
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
}

type JsonRecord = Record<string, unknown>;

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

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

    if (url.pathname === '/api/cms') {
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

    if (url.pathname.startsWith('/api/')) {
      return jsonResponse({ error: 'Not found' }, 404);
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
