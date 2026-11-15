// Shared helpers for the FezGuide end-to-end suite. See README.md.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

export function parseArgs(argv) {
  const o = { base: 'http://127.0.0.1:9196', suites: ['api', 'editor', 'public'], production: false, expectSsr: false, allowDirty: false, out: null, headed: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => { if (i + 1 >= argv.length) throw new Error(`Missing value for ${a}`); return argv[++i]; };
    if (a === '--base') o.base = val().replace(/\/+$/, '');
    else if (a === '--suites') o.suites = val().split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--out') o.out = val();
    else if (a === '--production') o.production = true;
    else if (a === '--expect-ssr') o.expectSsr = true;
    else if (a === '--allow-dirty') o.allowDirty = true;
    else if (a === '--headed') o.headed = true;
    else if (a === '--help' || a === '-h') o.help = true;
    else throw new Error(`Unknown argument ${a}`);
  }
  for (const s of o.suites) if (!['api', 'editor', 'public', 'ssr'].includes(s)) throw new Error(`Unknown suite ${s}`);
  return o;
}

/** Stable JSON (sorted keys) for comparisons that must ignore key order. */
export function canon(v) {
  return JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x));
}

export function loadPlaywright() {
  const tries = [() => createRequire(import.meta.url)('playwright')];
  tries.push(() => createRequire(execSync('npm root -g', { encoding: 'utf8' }).trim() + '/')('playwright'));
  for (const t of tries) { try { return t(); } catch { /* next */ } }
  throw new Error('Playwright not found. Install it, or run with NODE_PATH=$(npm root -g).');
}

export function makeCtx(opts) {
  const baseUrl = new URL(opts.base);
  const clientId = process.env.E2E_ACCESS_CLIENT_ID || '';
  const ctx = {
    ...opts,
    baseUrl,
    clientId,
    uploads: [],
    wroteSomething: false,
    failShot: null, // set by browser suites: async (name) => void
    accessHeaders() { return opts.production && clientId ? { 'CF-Access-Client-Id': clientId } : {}; },
    /** fetch against the site. Adds the Access id header (production) and a same-origin Origin on writes. Never follows redirects unless asked. */
    async http(pathOrUrl, init = {}) {
      const url = new URL(pathOrUrl, baseUrl);
      const sameHost = url.host === baseUrl.host;
      const headers = { ...(sameHost && init.auth !== false ? ctx.accessHeaders() : {}), ...(init.headers || {}) };
      const method = (init.method || 'GET').toUpperCase();
      if (sameHost && method !== 'GET' && method !== 'HEAD' && !Object.keys(headers).some(h => h.toLowerCase() === 'origin')) headers.Origin = baseUrl.origin;
      const { auth: _a, ...rest } = init;
      return fetch(url, { redirect: 'manual', ...rest, method, headers });
    },
    /** GET JSON with a few retries on 5xx / dropped connections (the local stack can drop one pooled socket). */
    async getJson(p, init = {}) {
      let last;
      for (let i = 0; i < 5; i++) {
        try { const r = await ctx.http(p, init); if (r.ok) return await r.json(); last = new Error(`GET ${p} -> ${r.status}`); if (r.status < 500) break; } catch (e) { last = e; }
        await sleep(400);
      }
      throw last;
    },
    admin: () => ctx.getJson('/api/admin/content'),
    pubDoc: () => ctx.getJson('/api/cms/document', { auth: false }),
    async html(p) { const r = await ctx.http(p, { headers: { Accept: 'text/html' }, auth: false }); return { status: r.status, text: await r.text() }; },
    async sitemapUrls() {
      const r = await ctx.http('/sitemap.xml', { auth: false }); const xml = await r.text();
      return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
    },
  };
  mkdirSync(opts.out, { recursive: true });
  return ctx;
}

/** Minimal suite runner: prints PASS / FAIL / SKIP / WARN lines as it goes. */
export function makeSuite(name, ctx) {
  const s = { name, pass: 0, fail: 0, skip: 0, warnings: [], failures: [] };
  const msg = e => String(e?.message ?? e).replace(/\s+/g, ' ').slice(0, 700);
  s.check = async (title, fn) => {
    s.current = title;
    try { await fn(); s.pass++; console.log(`  PASS  [${name}] ${title}`); return true; }
    catch (e) {
      s.fail++; s.failures.push({ title, error: msg(e) });
      console.log(`  FAIL  [${name}] ${title}\n        ${msg(e)}`);
      if (ctx.failShot) await ctx.failShot(`${name}-${s.fail}`).catch(() => {});
      return false;
    }
  };
  s.skip_ = (title, why) => { s.skip++; console.log(`  SKIP  [${name}] ${title} (${why})`); };
  s.warn = text => { s.warnings.push(text); console.log(`  WARN  [${name}] ${text}`); };
  return s;
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Run fn over items with limited concurrency. */
export async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}
