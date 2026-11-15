// API security suite: every rejected write must leave the content untouched.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeSuite } from './lib.mjs';

export async function run(ctx) {
  const s = makeSuite('api', ctx);
  const { check } = s;
  const call = (p, o = {}) => ctx.http(p, o);
  const base = await ctx.admin();
  const basePublic = await ctx.pubDoc();
  const V = base.version;
  console.log(`  baseline version ${V}, published revision ${base.publishedRevision}`);
  const json = { 'Content-Type': 'application/json' };
  const put = (body, headers = {}) => call('/api/admin/content/draft', { method: 'PUT', headers: { ...json, ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  const post = (p, body) => call(p, { method: 'POST', headers: json, body: JSON.stringify(body) });

  // Anonymous access is only meaningful in production: the local launcher injects a signed identity on purpose.
  const anon = { 'CF-Access-Client-Id': 'nobody.access' };
  if (ctx.production) {
    await check('anonymous editor page is sent to the Cloudflare login', async () => { const r = await ctx.http('/admin', { headers: anon, auth: false }); assert.equal(r.status, 302); assert.match(r.headers.get('location'), /cloudflareaccess\.com/); });
    await check('anonymous admin API is sent to the Cloudflare login', async () => { const r = await ctx.http('/api/admin/content', { headers: anon, auth: false }); assert.ok([302, 401, 403].includes(r.status), String(r.status)); });
  } else {
    s.skip_('anonymous editor page is sent to the Cloudflare login', 'production only');
    s.skip_('anonymous admin API is sent to the Cloudflare login', 'production only');
  }
  await check('authenticated read works', async () => { assert.equal(typeof base.document, 'object'); assert.ok(base.document.pages.length > 20, `only ${base.document.pages.length} pages`); });
  await check('cross-site write rejected (403)', async () => { const r = await put({ expectedVersion: V, document: base.document }, { Origin: 'https://evil.example' }); assert.equal(r.status, 403); });
  await check('wrong content type rejected (415)', async () => { const r = await put('x', { 'Content-Type': 'text/plain' }); assert.equal(r.status, 415); });
  await check('malformed JSON rejected (400)', async () => { const r = await put('{not json'); assert.equal(r.status, 400); });
  await check('unknown request fields rejected (400)', async () => { const r = await put({ expectedVersion: V, document: base.document, extra: 1 }); assert.equal(r.status, 400); });
  await check('invalid document rejected (422)', async () => { const r = await put({ expectedVersion: V, document: { schemaVersion: 1 } }); assert.equal(r.status, 422); });
  await check('script injection in a link rejected (422)', async () => { const d = structuredClone(base.document); d.navigation[0].href = 'javascript:alert(1)'; delete d.navigation[0].pageId; const r = await put({ expectedVersion: V, document: d }); assert.equal(r.status, 422); });
  await check('unknown/unsafe field rejected (422)', async () => { const d = structuredClone(base.document); d.pages[0].sections[0].html = '<script>alert(1)</script>'; const r = await put({ expectedVersion: V, document: d }); assert.equal(r.status, 422); });
  await check('stale writer rejected (409)', async () => { const r = await put({ expectedVersion: V - 1, document: base.document }); assert.equal(r.status, 409); });
  await check('stale publish rejected (409)', async () => { const r = await post('/api/admin/content/publish', { expectedVersion: V + 5 }); assert.equal(r.status, 409); });
  await check('rollback to missing revision rejected (404)', async () => { const r = await post('/api/admin/content/rollback', { expectedVersion: V, revision: 999999 }); assert.equal(r.status, 404); });
  await check('wrong method rejected (405)', async () => { const r = await call('/api/admin/content', { method: 'DELETE' }); assert.equal(r.status, 405); });
  await check('disguised upload (text named .jpg) rejected', async () => {
    const r = await call('/api/admin/media', { method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'X-Cms-Media-Metadata': JSON.stringify({ alt: { en: 'x', fr: 'x', es: 'x' } }) }, body: 'this is not an image' });
    assert.ok(r.status >= 400 && r.status < 500, String(r.status));
  });
  await check('validate endpoint accepts the current document', async () => { const r = await post('/api/admin/content/validate', { document: base.document }); assert.equal(r.status, 200); });
  await check('revision history readable', async () => { const r = await (await call('/api/admin/content/revisions')).json(); assert.ok(r.revisions.length >= 1, 'no revisions'); });
  await check('backup export works', async () => {
    const r = await call('/api/admin/recovery/backup');
    // The recovery bucket allows only 6 requests per hour per identity; a 429 proves the limiter works but leaves nothing to verify.
    if (r.status === 429) { s.warn('backup export rate-limited (6/hour recovery budget already used); content not verified'); return; }
    assert.equal(r.status, 200);
    const b = await r.json(); writeFileSync(join(ctx.out, 'backup-before-test.json'), JSON.stringify(b));
    assert.ok(JSON.stringify(b).length > 100000, 'backup suspiciously small');
  });
  await check('public API exposes no private fields', async () => { assert.ok(!/"bookings"|"actor"|draft_revision/.test(JSON.stringify(basePublic))); });
  await check('nothing changed after all rejected writes', async () => {
    const now = await ctx.admin(); assert.equal(now.version, V); assert.deepEqual(now.document, base.document);
  });
  // Last on purpose: the local miniflare proxy can drop the next pooled connection after an early 413 (unread body). Not a product issue; the retrying admin() below absorbs it.
  await check('oversized body rejected (413) and nothing changed', async () => {
    const r = await put('{"x":"' + 'a'.repeat(2_100_000) + '"}'); assert.equal(r.status, 413);
    const now = await ctx.admin(); assert.equal(now.version, V); assert.deepEqual(now.document, base.document);
  });
  return s;
}
