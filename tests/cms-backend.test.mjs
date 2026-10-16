import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { register } from 'tsx/esm/api';
register();

// Execute the handler's actual SQL against SQLite, with D1's transactional batch semantics.
function database() {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of ['0001_cms.sql', '0002_media_budget.sql', '0003_cms_release_safeguards.sql']) sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
  const statement = (sql, values = []) => ({
    bind: (...args) => statement(sql, args),
    async first() { return sqlite.prepare(sql).get(...values) ?? null; },
    async all() { return { results: sqlite.prepare(sql).all(...values), success: true }; },
    async run() { const result = sqlite.prepare(sql).run(...values); return { success: true, meta: { changes: Number(result.changes) } }; },
  });
  return {
    sqlite,
    prepare: statement,
    async batch(statements) {
      sqlite.exec('BEGIN IMMEDIATE');
      try { const results = []; for (const stmt of statements) results.push(await stmt.run()); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
}
const validate = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.schemaVersion !== 'number' || !Array.isArray(value.pages)) throw new Error('Invalid document');
  return value;
};
const document = (title) => ({ schemaVersion: 1, pages: [{ id: 'home', title }] });

// All keys and claims are synthetic; no operational token or identity is used.
const keyPair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...await crypto.subtle.exportKey('jwk', keyPair.publicKey), kid: 'fixture', alg: 'RS256', use: 'sig' };
const NOW = 2_000_000_000;
const accessEnv = { ACCESS_TEAM_DOMAIN: 'fixture.cloudflareaccess.com', ACCESS_AUD: 'cms-fixture', ACCESS_ALLOWED_SUBJECTS: 'editor' };
const baseClaims = { iss: 'https://fixture.cloudflareaccess.com', aud: ['cms-fixture'], exp: NOW + 60, nbf: NOW - 1, sub: 'editor', email: 'editor@example.test' };
const b64 = (value) => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
async function signedToken(claims = {}, header = {}, signingKey = keyPair.privateKey) {
  const input = `${b64({ alg: 'RS256', kid: 'fixture', ...header })}.${b64({ ...baseClaims, ...claims })}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', signingKey, new TextEncoder().encode(input));
  return `${input}.${Buffer.from(signature).toString('base64url')}`;
}
function accessRequest(token) { return new Request('https://example.test/api/admin/content', { headers: token ? { 'Cf-Access-Jwt-Assertion': token } : {} }); }

test('Access verifies RS256 header assertions and configured allowed identity', async () => {
  const { createAccessVerifier } = await import('../worker/cms-auth.ts');
  let fetches = 0;
  const verify = createAccessVerifier({ now: () => NOW * 1000, fetch: async (url, init) => {
    fetches++;
    assert.equal(url, 'https://fixture.cloudflareaccess.com/cdn-cgi/access/certs');
    assert.equal(init.redirect, 'manual');
    return Response.json({ keys: [jwk] });
  } });
  const token = await signedToken();
  assert.deepEqual(await verify(accessRequest(token), accessEnv), { subject: 'editor', email: 'editor@example.test' });
  assert.deepEqual(await verify(accessRequest(token), accessEnv), { subject: 'editor', email: 'editor@example.test' });
  assert.equal(fetches, 1);
  assert.equal(await verify(accessRequest(token), {}), null);
  assert.equal(await verify(accessRequest(), accessEnv), null);
});

test('Access rejects redirecting JWKS responses without following Location or retry storms', async () => {
  const { createAccessVerifier } = await import('../worker/cms-auth.ts');
  const token = await signedToken();
  for (const status of [301, 302, 303, 307, 308]) {
    let fetches = 0;
    const verify = createAccessVerifier({ now: () => NOW * 1000, fetch: async (url, init) => {
      fetches++;
      assert.equal(url, 'https://fixture.cloudflareaccess.com/cdn-cgi/access/certs');
      assert.equal(init.redirect, 'manual');
      return new Response(null, { status, headers: { Location: 'https://untrusted.example.test/keys' } });
    } });
    assert.equal(await verify(accessRequest(token), accessEnv), null);
    assert.equal(await verify(accessRequest(token), accessEnv), null);
    assert.equal(fetches, 1, 'redirect failures must be cached, never followed');
  }
});

test('CMS API denies anonymous writes and publishes only allowlisted content', async () => {
  const { createCmsHandler } = await import('../worker/cms-routes.ts');
  const db = database();
  try {
    const handler = createCmsHandler({ validateDocument: validate, access: { now: () => NOW * 1000, fetch: async () => Response.json({ keys: [jwk] }) } });
    const env = { ...accessEnv, CMS_DB: db };
    const token = await signedToken();
    const call = (path, method = 'GET', body, authenticated = true) => handler(new Request(`https://example.test${path}`, {
      method, headers: { ...(authenticated ? { 'Cf-Access-Jwt-Assertion': token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }), env);
    assert.equal((await call('/api/admin/content/draft', 'PUT', { expectedVersion: 0, document: document('first') }, false)).status, 401);
    assert.equal((await call('/api/admin/content/draft', 'PUT', { expectedVersion: 0, document: { ...document('first'), bookings: [{ email: 'private@example.test' }], secret: 'private' } })).status, 200);
    assert.deepEqual(await (await call('/api/cms/document', 'GET', undefined, false)).json(), { version: null, document: null });
    assert.equal((await call('/api/admin/content/publish', 'POST', { expectedVersion: 1 })).status, 200);
    const output = await (await call('/api/cms/document', 'GET', undefined, false)).json();
    assert.deepEqual(output, { version: 2, document: document('first') });
    assert.equal((await call('/api/admin/content/draft', 'PUT', { expectedVersion: 0, document: document('stale') })).status, 409);
    const response = await call('/api/admin/content', 'GET');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json()).version, 2);
  } finally { db.sqlite.close(); }
});

test('anonymous public routes exclude hidden records, references and legacy copies with the real schema', async () => {
  const { validateCmsDocument } = await import('../src/cms/schema.ts');
  const { createCmsSeed } = await import('../src/cms/seed.ts');
  const { db, call, handler, env } = await apiFixture(validateCmsDocument);
  try {
    const seed = createCmsSeed();
    const privateCopy = { en: 'PRIVATE-RECORD-SENTINEL', fr: 'PRIVATE-RECORD-SENTINEL', es: 'PRIVATE-RECORD-SENTINEL' };
    const home = seed.pages.find(page => page.id === 'home');
    const product = seed.products[0];
    product.published = false;
    product.fullDescription = privateCopy;
    // Publication flags are independent across normalized and compatibility copies.
    const productPage = seed.pages.find(page => page.productId === product.id);
    productPage.title = privateCopy;
    seed.legacy.tours.find(tour => tour.id === product.id).fullDescription = privateCopy;
    const editorial = seed.pages.find(page => page.kind === 'editorial' && seed.legacy.tours.some(tour => tour.id === page.id));
    editorial.enabled = false;
    editorial.title = privateCopy;
    seed.legacy.tours.find(tour => tour.id === editorial.id).fullDescription = privateCopy;
    const post = seed.blogPosts[0];
    post.published = false;
    post.content = privateCopy;
    seed.pages.find(page => page.id === post.id).title = privateCopy;
    seed.legacy.blogPosts.find(copy => copy.id === post.id).content = privateCopy;
    const custom = { id: 'private-custom', slug: 'private-custom', title: privateCopy, subtitle: privateCopy,
      heroImage: '/images/private-custom.jpg', content: privateCopy, highlights: { en: [], fr: [], es: [] },
      showInNav: true, published: false, createdAt: '2026-10-10' };
    seed.legacy.customPages.push(custom);
    seed.pages.push({ id: custom.id, slug: custom.slug, kind: 'landing', enabled: true, title: privateCopy,
      seo: { title: privateCopy, description: privateCopy }, sections: [] });
    seed.navigation.push({ id: custom.id, pageId: custom.id, enabled: true, label: privateCopy });
    seed.footer.links.push({ id: 'private-footer', pageId: editorial.id, enabled: true, label: privateCopy });
    home.sections.push({ id: 'private-card', type: 'cardGrid', variant: 'overview', enabled: true,
      cards: [{ id: 'private-card', pageId: productPage.id, title: privateCopy, description: privateCopy }] });
    home.sections.push({ id: 'private-cta', type: 'cta', variant: 'banner', enabled: true,
      productId: product.id, title: privateCopy, links: [] });
    home.sections.push({ id: 'private-products', type: 'productGrid', variant: 'overview', enabled: true,
      productIds: [product.id, seed.products[1].id] });
    home.sections.push({ id: 'private-section', type: 'richText', variant: 'panel', enabled: false,
      blocks: [{ type: 'paragraph', text: privateCopy }] });
    seed.navigation.push({ id: 'disabled-link', href: 'https://example.test', label: privateCopy, enabled: false });
    seed.reviews[0].enabled = false;
    seed.reviews[0].quote = privateCopy.en;
    // Private-only media metadata must not leak from a disabled page/section either.
    seed.media.push({ id: 'private-media', src: '/images/private.jpg', alt: privateCopy });
    editorial.seo.image = { mediaId: 'private-media', alt: privateCopy };
    const valid = validateCmsDocument(seed);
    assert.equal(valid.valid, true, valid.errors.join('; '));
    assert.equal((await call('/api/admin/content/draft', 'PUT', { expectedVersion: 0, document: seed })).status, 200);
    assert.equal((await call('/api/admin/content/publish', 'POST', { expectedVersion: 1 })).status, 200);
    const anonymous = async path => {
      const response = await handler(new Request(`https://example.test${path}`), env);
      assert.equal(response.status, 200);
      const body = await response.text();
      assert.equal(body.includes(privateCopy.en), false, `${path} leaked a hidden record or copied reference`);
      return JSON.parse(body);
    };
    const projected = (await anonymous('/api/cms/document')).document;
    const compatibility = await anonymous('/api/cms');
    assert.deepEqual(compatibility, projected.legacy, 'both public routes use the same visibility projection');
    for (const id of [productPage.id, editorial.id, post.id, custom.id]) {
      assert.equal(projected.pages.some(page => page.id === id), false, id);
      assert.equal(projected.editorialEntries.some(entry => entry.pageId === id), false, id);
    }
    assert.equal(projected.products.some(copy => copy.id === product.id), false);
    assert.deepEqual(projected.pages.find(page => page.id === 'home').sections.find(section => section.id === 'private-products').productIds,
      [seed.products[1].id], 'product grids keep only published references in order');
    assert.equal(compatibility.tours.some(copy => copy.id === product.id || copy.id === editorial.id), false);
    assert.equal(projected.blogPosts.some(copy => copy.id === post.id), false);
    assert.equal(compatibility.blogPosts.some(copy => copy.id === post.id), false);
    assert.equal(compatibility.customPages.some(copy => copy.id === custom.id), false);
    assert.equal(projected.media.some(copy => copy.id === 'private-media'), false);
    assert.equal(projected.reviews.some(copy => copy.id === seed.reviews[0].id), false);
    assert.equal(projected.pages.some(page => page.id === 'home'), true);
    assert.equal(projected.products.some(copy => copy.id === seed.products[1].id), true);
    assert.equal(validateCmsDocument(projected).valid, true, 'public projection keeps schema-valid references');
    assert.deepEqual((await (await call('/api/admin/content')).json()).document, seed, 'admin/storage keep hidden records unchanged');
    assert.ok(db.sqlite.prepare('SELECT document FROM cms_revisions WHERE version = 2').get().document.includes(privateCopy.en));
  } finally { db.sqlite.close(); }
});

test('public visibility follows either canonical or legacy flags without changing published defaults', async () => {
  const { validateCmsDocument } = await import('../src/cms/schema.ts');
  const { createCmsSeed } = await import('../src/cms/seed.ts');
  const { publicCmsDocument, publicCmsCompatibility } = await import('../worker/cms-routes.ts');
  const seed = createCmsSeed();
  const product = seed.products[0];
  const productPage = seed.pages.find(page => page.productId === product.id);
  const tour = seed.legacy.tours.find(copy => copy.id === product.id);
  const post = seed.blogPosts[0];
  const hiddenCases = [
    value => { value.legacy.tours.find(copy => copy.id === tour.id).published = false; },
    value => { value.pages.find(page => page.id === productPage.id).enabled = false; },
    value => { value.legacy.blogPosts.find(copy => copy.id === post.id).published = false; },
    value => { value.pages.find(page => page.id === post.id).enabled = false; },
  ];
  for (const [index, hide] of hiddenCases.entries()) {
    const value = structuredClone(seed);
    hide(value);
    const projected = publicCmsDocument(value);
    assert.deepEqual(publicCmsCompatibility(value), projected.legacy);
    assert.equal(validateCmsDocument(projected).valid, true);
    if (index < 2) {
      assert.equal(projected.products.some(copy => copy.id === product.id), false);
      assert.equal(projected.legacy.tours.some(copy => copy.id === product.id), false);
      assert.equal(projected.pages.some(page => page.id === productPage.id), false);
      assert.ok(projected.pages.some(page => page.id === product.pageId), 'a hidden product does not hide its category');
    } else {
      assert.equal(projected.blogPosts.some(copy => copy.id === post.id), false);
      assert.equal(projected.legacy.blogPosts.some(copy => copy.id === post.id), false);
      assert.equal(projected.pages.some(page => page.id === post.id), false);
    }
  }
  // published is optional for products/tours; absence is public, not a forced false/default.
  delete product.published;
  delete tour.published;
  product.title = { en: 'Edited public product', fr: 'Produit public modifié', es: 'منتج عام' };
  assert.equal(validateCmsDocument(seed).valid, true);
  assert.deepEqual(publicCmsDocument(seed), seed, 'published data, locale/order and optional flags stay intact');
  assert.deepEqual(publicCmsCompatibility(seed), seed.legacy);
});

test('D1 draft save is versioned and remains private until publication', async () => {
  const { CmsStore } = await import('../worker/cms-store.ts');
  const db = database();
  try {
    const store = new CmsStore(db, validate);
    assert.equal((await store.read()).version, 0);
    assert.equal(await store.readPublished(), null);
    const saved = await store.saveDraft(document('first'), 0, 'editor');
    assert.equal(saved.version, 1);
    assert.deepEqual((await store.read()).document, document('first'));
    assert.equal(await store.readPublished(), null);
    const published = await store.publish(1, 'editor');
    assert.equal(published.version, 2);
    assert.deepEqual((await store.readPublished()).document, document('first'));
    await store.saveDraft(document('second'), 2, 'editor');
    assert.deepEqual((await store.readPublished()).document, document('first'));
  } finally { db.sqlite.close(); }
});

test('Access denies forged, expired, malformed and unapproved assertions', async () => {
  const { createAccessVerifier } = await import('../worker/cms-auth.ts');
  let fetches = 0;
  const verify = createAccessVerifier({ now: () => NOW * 1000, fetch: async () => { fetches++; return Response.json({ keys: [jwk] }); } });
  for (const claims of [{ exp: NOW }, { exp: '9999999999' }, { nbf: NOW + 1 }, { nbf: '0' }, { iss: 'https://other.cloudflareaccess.com' }, { aud: ['wrong'] }, { aud: ['cms-fixture', 1] }, { sub: 'unapproved' }, { sub: '' }]) {
    assert.equal(await verify(accessRequest(await signedToken(claims)), accessEnv), null, JSON.stringify(claims));
  }
  for (const header of [{ alg: 'none' }, { alg: 'HS256' }, { crit: ['unknown'] }, { kid: '' }]) {
    assert.equal(await verify(accessRequest(await signedToken({}, header)), accessEnv), null);
  }
  for (const token of ['invalid', 'a.b.c', 'x'.repeat(16385)]) assert.equal(await verify(accessRequest(token), accessEnv), null);
  assert.equal(fetches, 0, 'claims/configuration rejection must not fetch keys');
  const token = await signedToken();
  const parts = token.split('.');
  parts[1] = b64({ ...baseClaims, email: 'tampered@example.test' });
  assert.equal(await verify(accessRequest(parts.join('.')), accessEnv), null);
  const other = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  assert.equal(await verify(accessRequest(await signedToken({}, {}, other.privateKey)), accessEnv), null);
  assert.equal(await verify(new Request('https://example.test', { headers: { Authorization: `Bearer ${token}`, 'X-Admin-Pin': 'fixture' } }), accessEnv), null);
  for (const team of ['https://attacker.test', 'fixture.cloudflareaccess.com/other', 'https://fixture.cloudflareaccess.com@attacker.test', 'http://fixture.cloudflareaccess.com', 'https://fixture.cloudflareaccess.com:443']) {
    assert.equal(await verify(accessRequest(token), { ...accessEnv, ACCESS_TEAM_DOMAIN: team }), null);
  }
  assert.equal(await verify(accessRequest(token), { ...accessEnv, ACCESS_ALLOWED_SUBJECTS: '', ACCESS_ALLOWED_EMAILS: '' }), null);
  assert.equal(fetches, 1);
});

test('Access rechecks claim time after JWKS and signature verification', async () => {
  const { createAccessVerifier } = await import('../worker/cms-auth.ts');
  for (const elapsed of [0, 500, 1000, 2000]) {
    let time = NOW * 1000;
    let fetches = 0;
    const verify = createAccessVerifier({ now: () => time, fetch: async () => {
      fetches++;
      time += elapsed;
      return Response.json({ keys: [jwk] });
    } });
    const identity = await verify(accessRequest(await signedToken({ exp: NOW + 1 })), accessEnv);
    assert.equal(fetches, 1, 'the synthetic signature must exercise key retrieval');
    assert.deepEqual(identity, elapsed < 1000 ? { subject: 'editor', email: 'editor@example.test' } : null,
      `token expires during verification after ${elapsed}ms`);
  }
  // Cached keys still require a fresh time check immediately after crypto verification.
  let reads = 0;
  let advance = false;
  const cached = createAccessVerifier({ now: () => (advance && ++reads > 2 ? NOW + 2 : NOW) * 1000,
    fetch: async () => Response.json({ keys: [jwk] }) });
  assert.ok(await cached(accessRequest(await signedToken()), accessEnv));
  advance = true;
  assert.equal(await cached(accessRequest(await signedToken({ exp: NOW + 1 })), accessEnv), null);
  // A clock moving backwards may make an initially valid nbf invalid at completion.
  let time = NOW * 1000;
  const backwards = createAccessVerifier({ now: () => time, fetch: async () => {
    time -= 2000;
    return Response.json({ keys: [jwk] });
  } });
  assert.equal(await backwards(accessRequest(await signedToken({ nbf: NOW })), accessEnv), null);
});

test('Access JWKS fetching is bounded, cached and fails closed', async () => {
  const { createAccessVerifier } = await import('../worker/cms-auth.ts');
  let time = NOW * 1000;
  let fetches = 0;
  const verify = createAccessVerifier({ now: () => time, fetch: async () => { fetches++; return Response.json({ keys: [jwk] }); } });
  const good = await signedToken({ exp: NOW + 1000 });
  await Promise.all(Array.from({ length: 8 }, () => verify(accessRequest(good), accessEnv)));
  assert.equal(fetches, 1, 'simultaneous verification shares a fetch');
  for (let i = 0; i < 8; i++) assert.equal(await verify(accessRequest(await signedToken({}, { kid: `unknown-${i}` })), accessEnv), null);
  assert.equal(fetches, 1, 'unknown kids cannot trigger a refresh storm');
  time += 301000;
  assert.ok(await verify(accessRequest(good), accessEnv));
  assert.equal(fetches, 2);
  let cancelled = false;
  const oversized = createAccessVerifier({ now: () => NOW * 1000, fetch: async () => new Response(new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(40000)); }, cancel() { cancelled = true; },
  })) });
  assert.equal(await oversized(accessRequest(good), accessEnv), null);
  assert.equal(cancelled, true);
  for (const response of [new Response('unavailable', { status: 503 }), Response.json({ keys: [] }), Response.json({ keys: Array(17).fill(jwk) }), Response.json({ keys: [jwk, jwk] }), Response.json({ keys: [{ ...jwk, d: 'private-key' }] })]) {
    const unavailable = createAccessVerifier({ now: () => NOW * 1000, fetch: async () => response });
    assert.equal(await unavailable(accessRequest(good), accessEnv), null);
  }
  let failures = 0;
  const failing = createAccessVerifier({ now: () => NOW * 1000, fetch: async () => { failures++; throw new Error('provider detail'); } });
  assert.equal(await failing(accessRequest(good), accessEnv), null);
  assert.equal(await failing(accessRequest(good), accessEnv), null);
  assert.equal(failures, 1);
});

test('Access JWKS timeout fails closed even when a fetcher ignores abort', async () => {
  const { createAccessVerifier } = await import('../worker/cms-auth.ts');
  let signal;
  const verify = createAccessVerifier({ now: () => NOW * 1000, fetch: async (_url, init) => { signal = init.signal; return new Promise(() => {}); } });
  assert.equal(await verify(accessRequest(await signedToken()), accessEnv), null);
  assert.equal(signal.aborted, true);
});

test('Access allows only configured signed email identity when subject is not allowlisted', async () => {
  const { createAccessVerifier } = await import('../worker/cms-auth.ts');
  const verify = createAccessVerifier({ now: () => NOW * 1000, fetch: async () => Response.json({ keys: [jwk] }) });
  assert.ok(await verify(accessRequest(await signedToken()), { ...accessEnv, ACCESS_ALLOWED_SUBJECTS: '', ACCESS_ALLOWED_EMAILS: 'EDITOR@example.test' }));
  assert.equal(await verify(accessRequest(await signedToken({ email: 'unknown@example.test' })), { ...accessEnv, ACCESS_ALLOWED_SUBJECTS: '', ACCESS_ALLOWED_EMAILS: 'editor@example.test' }), null);
});

test('late stale writer changes no rows, draft or published pointer', async () => {
  const { CmsStore } = await import('../worker/cms-store.ts');
  const db = database();
  try {
    let release, entered;
    const gate = new Promise(resolve => { release = resolve; });
    const reached = new Promise(resolve => { entered = resolve; });
    const delayed = { prepare: db.prepare, async batch(statements) { entered(); await gate; return db.batch(statements); } };
    const loser = new CmsStore(delayed, validate).saveDraft(document('loser'), 0, 'second-editor');
    const conflict = assert.rejects(loser, error => error.status === 409);
    await reached;
    const winner = new CmsStore(db, validate);
    await winner.saveDraft(document('winner'), 0, 'first-editor');
    await winner.publish(1, 'first-editor');
    const before = db.sqlite.prepare('SELECT * FROM cms_revisions ORDER BY version').all();
    release();
    await conflict;
    assert.deepEqual(db.sqlite.prepare('SELECT * FROM cms_revisions ORDER BY version').all(), before);
    assert.equal((await winner.read()).version, 2);
    assert.deepEqual((await winner.read()).document, document('winner'));
    assert.deepEqual((await winner.readPublished()).document, document('winner'));
  } finally { db.sqlite.close(); }
});

test('rollback publishes an exact immutable revision and rejects stale publication', async () => {
  const { CmsStore } = await import('../worker/cms-store.ts');
  const db = database();
  try {
    const store = new CmsStore(db, validate);
    await assert.rejects(store.publish(0, 'editor'), error => error.status === 409);
    await store.saveDraft(document('first'), 0, 'editor');
    await store.publish(1, 'editor');
    await store.saveDraft(document('second'), 2, 'editor');
    await assert.rejects(store.publish(2, 'editor'), error => error.status === 409);
    await store.publish(3, 'editor');
    await store.rollback(2, 4, 'editor');
    assert.equal((await store.readPublished()).version, 5);
    assert.deepEqual((await store.readPublished()).document, document('first'));
    assert.deepEqual((await store.readRevision(4)).document, document('second'));
    assert.equal((await store.readRevision(5)).sourceRevision, 2);
    assert.deepEqual((await store.revisions(2, 5)).map(row => row.version), [4, 3]);
    assert.equal((await store.revisions()).length, 5);
    assert.throws(() => db.sqlite.exec("UPDATE cms_revisions SET document = '{}' WHERE version = 1"), /immutable/);
    assert.throws(() => db.sqlite.exec('DELETE FROM cms_revisions WHERE version = 1'), /immutable/);
    await assert.rejects(store.rollback(999, 5, 'editor'), error => error.status === 404);
    await assert.rejects(store.rollback(2, 0, 'editor'), error => error.status === 409);
    assert.equal((await store.read()).version, 5);
  } finally { db.sqlite.close(); }
});

test('a failed batch rolls back the revision insert as well as the pointer update', async () => {
  const { CmsStore } = await import('../worker/cms-store.ts');
  const db = database();
  try {
    db.sqlite.exec("CREATE TRIGGER fail_cms_write BEFORE UPDATE ON cms_documents BEGIN SELECT RAISE(ABORT, 'injected failure'); END;");
    const store = new CmsStore(db, validate);
    await assert.rejects(store.saveDraft(document('first'), 0, 'editor'));
    assert.equal((await store.read()).version, 0);
    assert.equal((await store.revisions()).length, 0);
    assert.equal(await store.readPublished(), null);
  } finally { db.sqlite.close(); }
});

test('store rejects invalid versions, documents and pagination before mutation', async () => {
  const { CmsStore, MAX_DOCUMENT_BYTES } = await import('../worker/cms-store.ts');
  const db = database();
  try {
    const store = new CmsStore(db, validate);
    for (const version of [-1, 0.1, '0', null, Number.MAX_SAFE_INTEGER]) await assert.rejects(store.saveDraft(document('first'), version, 'editor'), error => error.status === 400);
    await assert.rejects(store.saveDraft(null, 0, 'editor'), error => error.status === 422);
    await assert.rejects(store.saveDraft(document('x'.repeat(MAX_DOCUMENT_BYTES)), 0, 'editor'), error => error.status === 413);
    await assert.rejects(store.saveDraft(document('first'), 0, ''), error => error.status === 400);
    await assert.rejects(store.revisions(101), error => error.status === 400);
    assert.equal((await store.read()).version, 0);
    const resultValidator = new CmsStore(db, value => ({ valid: true, document: validate(value), errors: [] }));
    assert.equal((await resultValidator.saveDraft(document('first'), 0, 'editor')).version, 1);
    await assert.rejects(new CmsStore(db, () => ({ valid: false, errors: ['private submitted value'] })).saveDraft(document('invalid'), 1, 'editor'), error => error.status === 422 && error.message === 'invalid_document');
  } finally { db.sqlite.close(); }
});

async function apiFixture(validateDocument = validate) {
  const { createCmsHandler } = await import('../worker/cms-routes.ts');
  const db = database();
  const token = await signedToken();
  const handler = createCmsHandler({ validateDocument, access: { now: () => NOW * 1000, fetch: async () => Response.json({ keys: [jwk] }) } });
  const env = { ...accessEnv, CMS_DB: db };
  const headers = { 'Cf-Access-Jwt-Assertion': token, 'Content-Type': 'application/json' };
  const call = (path, method = 'GET', body, extraHeaders = {}) => handler(new Request(`https://example.test${path}`, {
    method, headers: { ...headers, ...extraHeaders }, ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  }), env);
  return { db, handler, env, token, headers, call };
}

test('API method/media/schema guards reject before database changes and keep errors generic', async () => {
  const fixture = await apiFixture();
  const { call, db, handler, token } = fixture;
  try {
    const wrongMethod = await call('/api/admin/content/draft', 'POST', {});
    assert.equal(wrongMethod.status, 405);
    assert.equal(wrongMethod.headers.get('allow'), 'PUT');
    for (const contentType of ['text/plain', 'application/jsonp', 'application/json; charset=iso-8859-1']) assert.equal((await call('/api/admin/content/draft', 'PUT', {}, { 'Content-Type': contentType })).status, 415);
    assert.equal((await call('/api/admin/content/draft', 'PUT', {}, { 'Content-Encoding': 'gzip' })).status, 415);
    for (const body of ['{invalid', '[]', 'null']) assert.equal((await call('/api/admin/content/draft', 'PUT', body)).status, 400);
    assert.equal((await call('/api/admin/content/draft', 'PUT', { expectedVersion: 0, document: null })).status, 422);
    assert.equal((await call('/api/admin/content/draft', 'PUT', { expectedVersion: 0, document: document('first'), unexpected: true })).status, 400);
    assert.equal((await call('/api/admin/content/draft', 'PUT', { expectedVersion: '0', document: document('first') })).status, 400);
    assert.equal((await call('/api/admin/content/publish', 'POST', { expectedVersion: 0 }, { Origin: 'https://attacker.test' })).status, 403);
    assert.equal((await call('/api/admin/content/revisions?limit=101')).status, 400);
    assert.equal((await call('/api/admin/content/revisions?limit=1&limit=2')).status, 400);
    assert.equal((await call('/api/admin/content/revisions?extra=1')).status, 400);
    assert.equal((await call('/api/admin/content/revisions/999')).status, 404);
    assert.equal((await call('/api/admin/content/unknown')).status, 404);
    const missing = await handler(accessRequest(token), accessEnv);
    assert.equal(missing.status, 503);
    assert.deepEqual(await missing.json(), { error: 'cms_unavailable' });
    const failed = await handler(accessRequest(token), { ...accessEnv, CMS_DB: { prepare() { throw new Error('private SQL detail'); } } });
    assert.equal(failed.status, 503);
    assert.deepEqual(await failed.json(), { error: 'cms_unavailable' });
    assert.equal(db.sqlite.prepare('SELECT version FROM cms_documents').get().version, 0);
  } finally { db.sqlite.close(); }
});

test('API streamed body limits cancel oversized input before storage', async () => {
  const { MAX_CMS_REQUEST_BYTES } = await import('../worker/cms-routes.ts');
  const { db, handler, env, headers } = await apiFixture();
  try {
    let cancelled = false;
    let chunks = 0;
    const stream = new ReadableStream({ pull(controller) { chunks++; controller.enqueue(new Uint8Array(65536)); }, cancel() { cancelled = true; } });
    const response = await handler(new Request('https://example.test/api/admin/content/draft', { method: 'PUT', headers, body: stream, duplex: 'half' }), env);
    assert.equal(response.status, 413);
    assert.equal(cancelled, true);
    assert.ok(chunks < Math.ceil(MAX_CMS_REQUEST_BYTES / 65536) + 3);
    assert.equal(db.sqlite.prepare('SELECT version FROM cms_documents').get().version, 0);
    const declared = await handler(new Request('https://example.test/api/admin/content/draft', { method: 'PUT', headers: { ...headers, 'Content-Length': `${MAX_CMS_REQUEST_BYTES + 1}` }, body: '{}' }), env);
    assert.equal(declared.status, 413);
    const malformedUtf8 = await handler(new Request('https://example.test/api/admin/content/draft', { method: 'PUT', headers, body: new Uint8Array([0xff]) }), env);
    assert.equal(malformedUtf8.status, 400);
  } finally { db.sqlite.close(); }
});

test('API publishes and rolls back exact revisions with private history and compatible public reads', async () => {
  const { call, db, handler, env } = await apiFixture();
  try {
    const first = { ...document('first'), legacy: { tours: [], customPages: [], blogPosts: [], teamMembers: [], faqs: [], siteSettings: { companyName: 'Fixture' }, bookings: [{ secret: 'private' }], accessToken: 'private' } };
    assert.equal((await call('/api/admin/content/validate', 'POST', { document: first })).status, 200);
    await call('/api/admin/content/draft', 'PUT', { expectedVersion: 0, document: first });
    await call('/api/admin/content/publish', 'POST', { expectedVersion: 1 });
    const published = await (await call('/api/cms')).json();
    assert.deepEqual(Object.keys(published).sort(), ['blogPosts', 'customPages', 'faqs', 'siteSettings', 'teamMembers', 'tours']);
    assert.equal(JSON.stringify(published).includes('private'), false);
    await call('/api/admin/content/draft', 'PUT', { expectedVersion: 2, document: document('second') });
    assert.equal((await (await call('/api/cms/document')).json()).document.pages[0].title, 'first');
    await call('/api/admin/content/publish', 'POST', { expectedVersion: 3 });
    assert.equal((await call('/api/admin/content/rollback', 'POST', { expectedVersion: 4, revision: 2 })).status, 200);
    assert.equal((await (await call('/api/cms/document')).json()).document.pages[0].title, 'first');
    assert.equal((await (await call('/api/admin/content/revisions?limit=2')).json()).revisions.length, 2);
    assert.equal((await (await call('/api/admin/content/revisions/4')).json()).document.pages[0].title, 'second');
    assert.equal((await handler(new Request('https://example.test/api/admin/content/revisions'), env)).status, 401);
    assert.equal(await handler(new Request('https://example.test/unrelated'), env), null);
  } finally { db.sqlite.close(); }
});

test('admin pages and encoded admin paths are denied before asset fallback', async () => {
  const { db, handler, env, headers } = await apiFixture();
  try {
    for (const path of ['/admin', '/admin/editor', '/api/admin/unknown', '/admin%2Feditor', '/%61dmin']) {
      const response = await handler(new Request(`https://example.test${path}`), env);
      assert.equal(response?.status, 401, path);
    }
    assert.equal(await handler(new Request('https://example.test/admin', { headers }), env), null);
  } finally { db.sqlite.close(); }
});

test('two authenticated API clients cannot overwrite a winner after a delayed batch', async () => {
  const { db, handler, env, headers, call } = await apiFixture();
  try {
    let release, entered;
    const gate = new Promise(resolve => { release = resolve; });
    const reached = new Promise(resolve => { entered = resolve; });
    const delayed = { prepare: db.prepare, async batch(statements) { entered(); await gate; return db.batch(statements); } };
    const loser = handler(new Request('https://example.test/api/admin/content/draft', {
      method: 'PUT', headers, body: JSON.stringify({ expectedVersion: 0, document: document('loser') }),
    }), { ...env, CMS_DB: delayed });
    await reached;
    assert.equal((await call('/api/admin/content/draft', 'PUT', { expectedVersion: 0, document: document('winner') })).status, 200);
    assert.equal((await call('/api/admin/content/publish', 'POST', { expectedVersion: 1 })).status, 200);
    const before = db.sqlite.prepare('SELECT * FROM cms_revisions ORDER BY version').all();
    release();
    assert.equal((await loser).status, 409);
    assert.deepEqual(db.sqlite.prepare('SELECT * FROM cms_revisions ORDER BY version').all(), before);
    assert.equal((await (await call('/api/admin/content')).json()).document.pages[0].title, 'winner');
    assert.equal((await (await call('/api/cms/document')).json()).document.pages[0].title, 'winner');
  } finally { db.sqlite.close(); }
});

test('real schema validation rejects private content before any revision is written', async () => {
  const { validateCmsDocument } = await import('../src/cms/schema.ts');
  const { createCmsSeed } = await import('../src/cms/seed.ts');
  const { db, call } = await apiFixture(validateCmsDocument);
  try {
    const seed = createCmsSeed();
    assert.equal((await call('/api/admin/content/validate', 'POST', { document: seed })).status, 200);
    const unsafe = { ...seed, bookings: [{ email: 'private@example.test' }] };
    const rejected = await call('/api/admin/content/draft', 'PUT', { expectedVersion: 0, document: unsafe });
    assert.equal(rejected.status, 422);
    assert.deepEqual(await rejected.json(), { error: 'invalid_document' });
    assert.equal(db.sqlite.prepare('SELECT count(*) AS count FROM cms_revisions').get().count, 0);
    assert.equal((await call('/api/admin/content/draft', 'PUT', { expectedVersion: 0, document: seed })).status, 200);
    assert.equal((await call('/api/admin/content/publish', 'POST', { expectedVersion: 1 })).status, 200);
    assert.deepEqual((await (await call('/api/cms/document')).json()).document, seed);
  } finally { db.sqlite.close(); }
});

test('validation endpoint enforces the same document byte cap as saving', async () => {
  const { MAX_DOCUMENT_BYTES } = await import('../worker/cms-store.ts');
  const { db, call } = await apiFixture();
  try { assert.equal((await call('/api/admin/content/validate', 'POST', { document: document('x'.repeat(MAX_DOCUMENT_BYTES)) })).status, 413); }
  finally { db.sqlite.close(); }
});

test('validation endpoint rejects a malformed successful validator result', async () => {
  const { db, call } = await apiFixture(() => ({ valid: true }));
  try { assert.equal((await call('/api/admin/content/validate', 'POST', { document: document('first') })).status, 422); }
  finally { db.sqlite.close(); }
});
