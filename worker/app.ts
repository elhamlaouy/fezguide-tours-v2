import { validateCmsDocument } from '../src/cms/schema';
import { createCmsHandler, isCmsAdminPath, type CmsHandlerOptions } from './cms-routes';
import type { Env } from './index';

const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: blob:; font-src 'self'; connect-src 'self'; frame-src 'self' about:; frame-ancestors 'none'; base-uri 'self'; form-action 'none'; object-src 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Robots-Tag': 'noindex, nofollow',
};
export function createAppHandler(options: Pick<CmsHandlerOptions, 'access'> = {}) {
  const cms = createCmsHandler({ validateDocument: validateCmsDocument, access: options.access });
  return async (request: Request, env: Env): Promise<Response> => {
    const path = new URL(request.url).pathname;
    if (path === '/' && ['GET', 'HEAD'].includes(request.method)) {
      return new Response(null, { status: 302, headers: { ...securityHeaders, Location: '/admin', 'Cache-Control': 'no-store' } });
    }
    const admin = isCmsAdminPath(path);
    const media = path.startsWith('/media/upload-');
    const api = path.startsWith('/api/');
    if (admin || media || api) {
      const response = await cms(request, env);
      if (response) {
        for (const [name, value] of Object.entries(securityHeaders)) response.headers.set(name, value);
        return response;
      }
      if (!admin) return new Response('Not found', { status: 404, headers: { ...securityHeaders, 'Cache-Control': 'no-store' } });
    }
    const staticAsset = /^\/(?:assets|images|fonts)(?:\/|$)/.test(path) || /^\/favicon(?:[./]|$)/.test(path);
    // Only the real CMS handler's authenticated editor-HTML null may reach the SPA.
    if (admin || staticAsset) {
      if (env.ASSETS) {
        const asset = await env.ASSETS.fetch(admin ? new Request(new URL('/', request.url), request) : request);
        const headers = new Headers(asset.headers);
        for (const [name, value] of Object.entries(securityHeaders)) headers.set(name, value);
        if (admin) headers.set('Cache-Control', 'no-store');
        return new Response(request.method === 'HEAD' ? null : asset.body, { status: asset.status, statusText: asset.statusText, headers });
      }
      return new Response('Not found', { status: 404, headers: { ...securityHeaders, 'Cache-Control': 'no-store' } });
    }
    // The editor hostname is not a second public business site. Only the explicit
    // published JSON/media APIs above can read prepared public artifacts here.
    return new Response('Not found', { status: 404, headers: { ...securityHeaders, 'Cache-Control': 'no-store' } });
  };
}

export default { fetch: createAppHandler() };
