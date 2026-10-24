import publicWorker, { type Env } from './index';

// Preview-only entry point; production keeps the original public handler.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await publicWorker.fetch(request, env);
    const headers = new Headers(response.headers);
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
