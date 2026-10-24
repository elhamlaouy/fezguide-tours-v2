import assert from 'node:assert/strict';
import { test } from 'node:test';
import { register } from 'tsx/esm/api';

register();
const app = await import('../worker/app.ts');
const ORIGIN = 'https://app.fezguidetours.com';
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: blob:; font-src 'self'; connect-src 'self'; frame-src 'self' about:; frame-ancestors 'none'; base-uri 'self'; form-action 'none'; object-src 'none'";

function assertSecurity(response) {
  assert.equal(response.headers.get('content-security-policy'), CSP);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.equal(response.headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()');
  assert.equal(response.headers.get('strict-transport-security'), 'max-age=31536000');
  assert.match(response.headers.get('x-robots-tag') ?? '', /\bnoindex\b/);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
}

function coldEnv() {
  const calls = [];
  return {
    calls,
    env: {
      CMS_DB: { prepare() { assert.fail('editor entry/static assets must not read the owner document or prepared catalog'); } },
      CMS_MEDIA: { get() { assert.fail('editor entry/static assets must not read public media'); } },
      ASSETS: { async fetch(request) {
        calls.push({ url: request.url, method: request.method });
        if (new URL(request.url).pathname === '/index.html' && request.redirect === 'manual') return new Response(null,{status:307,headers:{Location:'/'}});
        return new Response(request.method === 'HEAD' ? null : '<div id="root">synthetic editor shell</div>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
        });
      } },
    },
  };
}

// Synthetic keys/claims only; exercise createCmsHandler's actual RS256 verifier.
const NOW = 2_000_000_000;
const keyPair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...await crypto.subtle.exportKey('jwk', keyPair.publicKey), kid: 'app-fixture', alg: 'RS256', use: 'sig' };
const accessEnv = { ACCESS_TEAM_DOMAIN: 'app-fixture.cloudflareaccess.com', ACCESS_AUD: 'app-cms-fixture', ACCESS_ALLOWED_EMAILS: 'editor@example.test' };
const claims = { iss: 'https://app-fixture.cloudflareaccess.com', aud: ['app-cms-fixture'], exp: NOW + 60, nbf: NOW - 1, sub: 'synthetic-editor', email: 'editor@example.test' };
const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
async function signedToken(overrides = {}) {
  const input = `${b64({ alg: 'RS256', kid: jwk.kid })}.${b64({ ...claims, ...overrides })}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keyPair.privateKey, new TextEncoder().encode(input));
  return `${input}.${Buffer.from(signature).toString('base64url')}`;
}
function authenticatedApp() {
  let keyFetches = 0;
  assert.equal(typeof app.createAppHandler, 'function', 'a small factory must forward existing AccessVerifierOptions, not replace verification');
  const handler = app.createAppHandler({ access: { now: () => NOW * 1000, fetch: async (url, init) => {
    keyFetches++;
    assert.equal(url, 'https://app-fixture.cloudflareaccess.com/cdn-cgi/access/certs');
    assert.equal(init.redirect, 'manual');
    return Response.json({ keys: [jwk] });
  } } });
  return { handler, keyFetches: () => keyFetches };
}

test('signed allowlisted editor cold entry GET/HEAD serves the ASSETS SPA index only after real JWT verification', async () => {
  const { handler, keyFetches } = authenticatedApp();
  const { env, calls } = coldEnv();
  const token = await signedToken();
  for (const [path, method] of [['/admin', 'GET'], ['/admin/content?tab=pages', 'GET'], ['/admin', 'HEAD']]) {
    const response = await handler(new Request(`${ORIGIN}${path}`, { method, redirect:'manual', headers: { 'Cf-Access-Jwt-Assertion': token } }), { ...env, ...accessEnv });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
    assert.equal(response.headers.get('cache-control'), 'no-store', 'authenticated HTML must override asset cache headers');
    assertSecurity(response);
    assert.equal(await response.text(), method === 'HEAD' ? '' : '<div id="root">synthetic editor shell</div>');
  }
  assert.deepEqual(calls, [
    { url: `${ORIGIN}/`, method: 'GET' },
    { url: `${ORIGIN}/`, method: 'GET' },
    { url: `${ORIGIN}/`, method: 'HEAD' },
  ]);
  assert.equal(keyFetches(), 1, 'the real verifier caches the synthetic JWKS');
});

test('static CSS, images, fonts and favicon use ASSETS rather than the prepared public reader', async () => {
  const { env, calls } = coldEnv();
  env.ASSETS.fetch = async request => {
    calls.push({ url: request.url, method: request.method });
    return new Response(request.method === 'HEAD' ? null : 'body{color:navy}', {
      headers: { 'Content-Type': 'text/css', 'Cache-Control': 'public, max-age=31536000, immutable' },
    });
  };
  const paths = ['/assets/editor.css?v=1', '/assets', '/images/editor-logo.svg', '/images', '/fonts/editor.woff2', '/fonts', '/favicon', '/favicon.svg', '/favicon.ico'];
  for (const path of paths) {
    for (const method of ['GET', 'HEAD']) {
      const response = await app.default.fetch(new Request(`${ORIGIN}${path}`, { method }), env);
      assert.equal(response.status, 200, path);
      assert.equal(response.headers.get('content-type'), 'text/css');
      assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable');
      assertSecurity(response);
      assert.equal(await response.text(), method === 'HEAD' ? '' : 'body{color:navy}');
    }
  }
  assert.deepEqual(calls, paths.flatMap(path => ['GET', 'HEAD'].map(method => ({ url: `${ORIGIN}${path}`, method }))));
});

test('wrong audience, unapproved signed email and forged assertions cannot serve editor assets', async () => {
  const { handler, keyFetches } = authenticatedApp();
  const { env, calls } = coldEnv();
  const good = await signedToken();
  const parts = good.split('.');
  parts[1] = b64({ ...claims, sub: 'tampered-subject' });
  for (const token of [undefined, await signedToken({ aud: ['other-application'] }), await signedToken({ email: 'unapproved@example.test' }), parts.join('.')]) {
    for (const path of ['/admin', '/api/admin/content']) {
      const response = await handler(new Request(`${ORIGIN}${path}`, { headers: token ? { 'Cf-Access-Jwt-Assertion': token } : {} }), { ...env, ...accessEnv });
      assert.equal(response.status, 401, path);
      assert.deepEqual(await response.json(), { error: 'unauthorized' });
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assertSecurity(response);
    }
  }
  assert.equal(keyFetches(), 1, 'forged signature exercises cryptographic verification, unlike earlier claim denials');
  assert.deepEqual(calls, []);
});

test('malformed escapes and encoded admin paths fail closed before static assets', async () => {
  const { handler } = authenticatedApp();
  const { env, calls } = coldEnv();
  const token = await signedToken();
  for (const path of ['/%61dmin', '/admin%2fcontent', '/api%2fadmin/content', '/assets/%E0%A4%A', '/assets/%']) {
    for (const authenticated of [false, true]) {
      const response = await handler(new Request(`${ORIGIN}${path}`, { headers: authenticated ? { 'Cf-Access-Jwt-Assertion': token } : {} }), { ...env, ...accessEnv });
      assert.equal(response.status, authenticated ? 404 : 401, path);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assertSecurity(response);
    }
  }
  assert.deepEqual(calls, []);
});

test('same-origin admin writes still require JWTs and signed cross-origin writes remain forbidden', async () => {
  const { handler } = authenticatedApp();
  const { env, calls } = coldEnv();
  const token = await signedToken();
  const routes = [
    ['/api/admin/content/draft', 'PUT'], ['/api/admin/content/publish', 'POST'], ['/api/admin/content/rollback', 'POST'],
    ['/api/admin/content/validate', 'POST'], ['/api/admin/media', 'POST'], ['/api/admin/recovery/restore', 'POST'], ['/admin', 'POST'],
  ];
  for (const [path, method] of routes) {
    for (const authenticated of [false, true]) {
      const response = await handler(new Request(`${ORIGIN}${path}`, { method, headers: {
        Origin: authenticated ? 'https://untrusted.example.test' : ORIGIN,
        ...(authenticated ? { 'Cf-Access-Jwt-Assertion': token } : {}),
      } }), { ...env, ...accessEnv });
      assert.equal(response.status, authenticated ? 403 : 401, path);
      assert.deepEqual(await response.json(), { error: authenticated ? 'forbidden_origin' : 'unauthorized' });
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assertSecurity(response);
    }
  }
  const sameOrigin = await handler(new Request(`${ORIGIN}/admin`, { method: 'POST', headers: { Origin: ORIGIN, 'Cf-Access-Jwt-Assertion': token } }), { ...env, ...accessEnv });
  assert.equal(sameOrigin.status, 405, 'same-origin authentication does not authorize POSTing editor HTML');
  assert.equal(sameOrigin.headers.get('allow'), 'GET, HEAD');
  assertSecurity(sameOrigin);
  assert.deepEqual(calls, []);
});

test('missing ASSETS fails closed for authorized editor HTML and static assets without a public fallback', async () => {
  const { handler } = authenticatedApp();
  const { env } = coldEnv();
  delete env.ASSETS;
  const token = await signedToken();
  for (const path of ['/admin', '/assets/editor.css']) {
    const response = await handler(new Request(`${ORIGIN}${path}`, { headers: { 'Cf-Access-Jwt-Assertion': token } }), { ...env, ...accessEnv });
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assertSecurity(response);
  }
});

test('unknown API routes never fall through to SPA assets', async () => {
  const { env, calls } = coldEnv();
  const response = await app.default.fetch(new Request(`${ORIGIN}/api/not-a-cms-route`), env);
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assertSecurity(response);
  assert.deepEqual(calls, []);
});

test('anonymous root GET/HEAD redirects same-origin to the protected editor without reading public content', async () => {
  const { env, calls } = coldEnv();
  for (const method of ['GET', 'HEAD']) {
    const response = await app.default.fetch(new Request(`${ORIGIN}/?next=https://untrusted.example.test`, { method }), env);
    assert.equal(response.status, 302);
    assert.equal(new URL(response.headers.get('location'), ORIGIN).href, `${ORIGIN}/admin`);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assertSecurity(response);
    assert.equal(await response.text(), '');
    const denied = await app.default.fetch(new Request(new URL(response.headers.get('location'), ORIGIN)), env);
    assert.equal(denied.status, 401);
    assert.equal(denied.headers.get('cache-control'), 'no-store');
    assertSecurity(denied);
  }
  assert.deepEqual(calls, [], 'unauthenticated entry must never serve the SPA');
});
