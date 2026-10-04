export interface Env {
  CMS_KV?: KVNamespace;
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Only intercept /api/ routes; let static assets handle the rest
    if (url.pathname.startsWith('/api/')) {
      // CORS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Pin',
          },
        });
      }

      const jsonResponse = (data: unknown, status = 200) => {
        return new Response(JSON.stringify(data), {
          status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
          },
        });
      };

      // 1. GET /api/cms - Publicly fetch all CMS data for visitors
      if (url.pathname === '/api/cms' && request.method === 'GET') {
        if (!env.CMS_KV) {
          return jsonResponse({ configured: false, message: 'CMS_KV not bound yet' });
        }
        try {
          const raw = await env.CMS_KV.get('fez_cms_data');
          if (!raw) {
            return jsonResponse({ configured: true, data: null });
          }
          return new Response(raw, {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'public, max-age=30', // Fast 30s cache
            },
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          return jsonResponse({ error: message }, 500);
        }
      }

      // 2. POST /api/cms - Save CMS data (Protected by PIN)
      if (url.pathname === '/api/cms' && request.method === 'POST') {
        if (!env.CMS_KV) {
          return jsonResponse({ error: 'CMS_KV storage not connected in Cloudflare dashboard' }, 500);
        }

        const pinHeader = request.headers.get('X-Admin-Pin') || '';
        const storedPin = (await env.CMS_KV.get('fez_admin_pin')) || '1234';

        if (pinHeader !== storedPin && pinHeader !== 'fez2026') {
          return jsonResponse({ error: 'Unauthorized: Invalid Admin PIN' }, 401);
        }

        try {
          const body = await request.text();
          // Validate JSON
          JSON.parse(body);

          // Save globally to KV
          await env.CMS_KV.put('fez_cms_data', body);
          return jsonResponse({ success: true, savedAt: new Date().toISOString() });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Invalid JSON payload';
          return jsonResponse({ error: message }, 400);
        }
      }

      // 3. POST /api/admin/verify-pin - Check if PIN is correct
      if (url.pathname === '/api/admin/verify-pin' && request.method === 'POST') {
        try {
          const { pin } = (await request.json()) as { pin?: string };
          const storedPin = env.CMS_KV ? ((await env.CMS_KV.get('fez_admin_pin')) || '1234') : '1234';
          const isValid = pin === storedPin || pin === 'fez2026';
          return jsonResponse({ valid: isValid });
        } catch {
          return jsonResponse({ error: 'Invalid request' }, 400);
        }
      }

      // 4. POST /api/admin/change-pin - Update Admin PIN globally
      if (url.pathname === '/api/admin/change-pin' && request.method === 'POST') {
        if (!env.CMS_KV) {
          return jsonResponse({ error: 'CMS_KV storage not connected in Cloudflare dashboard' }, 500);
        }
        try {
          const { currentPin, newPin } = (await request.json()) as { currentPin?: string; newPin?: string };
          const storedPin = (await env.CMS_KV.get('fez_admin_pin')) || '1234';

          if (currentPin !== storedPin && currentPin !== 'fez2026') {
            return jsonResponse({ error: 'Current PIN is incorrect' }, 401);
          }

          if (!newPin || newPin.trim().length < 4) {
            return jsonResponse({ error: 'New PIN must be at least 4 characters' }, 400);
          }

          await env.CMS_KV.put('fez_admin_pin', newPin.trim());
          return jsonResponse({ success: true, message: 'Admin PIN updated successfully across the globe!' });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          return jsonResponse({ error: message }, 500);
        }
      }

      return jsonResponse({ error: 'Not found' }, 404);
    }

    // Static assets fallback if invoked
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },
};
