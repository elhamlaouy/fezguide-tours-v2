import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { register } from 'tsx/esm/api';
register();
const publicHandler = (await import('../worker/candidate-public.ts')).default;
const appHandler = (await import('../worker/app.ts')).default;

const root = new URL('../', import.meta.url);
const parse = file => JSON.parse(execFileSync('python3', ['-c', 'import json,sys,tomllib; print(json.dumps(tomllib.load(open(sys.argv[1],"rb"))))', fileURLToPath(new URL(file, root))], { encoding: 'utf8' }));
const app = parse('wrangler.cms-candidate-app.toml');
const pub = parse('wrangler.cms-candidate-public.toml');
const origin = 'https://fezguidetours-cms-candidate-public.elhamlaouy.workers.dev';
const editorOrigin = 'https://app.fezguidetours.com';

// Configuration/readback contract, not fresh provider or successful login proof.
test('isolated entrypoints, custom-only editor, assets and exact new resources', () => {
  for (const [config, role, main] of [[app, 'app', 'worker/app.ts'], [pub, 'public', 'worker/candidate-public.ts']]) {
    assert.equal(config.name, `fezguidetours-cms-candidate-${role}`);
    assert.equal(config.main, main);
    assert.equal(config.workers_dev, role === 'public');
    assert.equal(config.preview_urls, false);
    assert.equal(config.account_id, '417f3820605485ace5bdbb9576452f42');
    assert.equal(config.compatibility_date, '2026-10-01');
    for (const key of ['route', 'env', 'previews', 'kv_namespaces', 'services', 'durable_objects']) assert.equal(config[key], undefined, key);
    assert.deepEqual(config.routes, role === 'app' ? [{ pattern: 'app.fezguidetours.com', custom_domain: true }] : undefined);
    assert.deepEqual(config.d1_databases, [{ binding: 'CMS_DB', database_name: 'fezguidetours-cms-candidate-20261024', database_id: '8b82c07d-273d-459f-abc2-1dbb2f81e586', migrations_dir: 'migrations' }]);
    assert.deepEqual(config.r2_buckets, [{ binding: 'CMS_MEDIA', bucket_name: 'fezguidetours-cms-candidate-media-20261024' }]);
    assert.deepEqual(config.images, { binding: 'CMS_IMAGES' });
    assert.deepEqual(config.assets, { directory: './dist', binding: 'ASSETS', not_found_handling: role === 'app' ? 'single-page-application' : 'none', run_worker_first: ['/*', '!/assets/*', '!/images/*', '!/fonts/*', '!/favicon.svg'] });
    assert.equal(config.vars.CMS_PROCESSING_MODE, 'staged-v1');
    assert.equal(config.vars.CMS_PREPARATION_MODE, undefined);
    assert.equal(config.vars.CANONICAL_ORIGIN, origin);
    assert.equal(config.vars.CMS_PUBLIC_DELIVERY_ORIGIN, origin);
  }
});

test('both handlers pin exact recorded nonzero release identities without build artifacts', () => {
  const recorded = JSON.parse(readFileSync(new URL('docs/evidence/cms-completion-20261024/final-release-identity.json', root)));
  for (const key of ['CMS_VALIDATION_POLICY', 'CMS_RENDERER_ID', 'CMS_ASSET_ID', 'CMS_SHELL_ID']) {
    assert.match(recorded[key], /^[a-f0-9]{64}$/);
    assert.notEqual(recorded[key], '0'.repeat(64), key);
    assert.equal(app.vars[key], recorded[key], `app ${key}`);
    assert.equal(pub.vars[key], recorded[key], `public ${key}`);
  }
});

test('editor uses exact saved candidate audience and policy; public cannot authorize admin', () => {
  const saved = JSON.parse(readFileSync(new URL('docs/evidence/cms-completion-20261024/candidate-access-custom-host-readback.json', root))).access_readback;
  assert.equal(saved.success, true);
  assert.equal(saved.application_id, '757cd74c-101d-47bb-aac0-99282d693d1f');
  assert.deepEqual(saved.self_hosted_domains, ['app.fezguidetours.com']);
  assert.equal(saved.policy_count, 1);
  assert.equal(saved.policy.decision, 'allow');
  assert.deepEqual(saved.policy.include, [{ email: { email: 'elhamlaouy@gmail.com' } }, { email: { email: 'fezguidetours1@gmail.com' } }]);
  assert.deepEqual(saved.policy.exclude, []); assert.deepEqual(saved.policy.require, []);
  assert.equal(saved.session_duration, '24h'); assert.equal(saved.http_only_cookie_attribute, true);
  assert.equal(saved.options_preflight_bypass, false);
  assert.equal(app.vars.ACCESS_TEAM_DOMAIN, 'delicate-forest-c939.cloudflareaccess.com');
  assert.equal(app.vars.ACCESS_ALLOWED_EMAILS, 'elhamlaouy@gmail.com,fezguidetours1@gmail.com');
  assert.equal(app.vars.ACCESS_ALLOWED_SUBJECTS, undefined);
  assert.match(saved.aud, /^[a-f0-9]{64}$/); assert.notEqual(saved.aud, '0'.repeat(64));
  assert.equal(app.vars.ACCESS_AUD, saved.aud);
  const original = parse('wrangler.toml');
  assert.notEqual(app.vars.ACCESS_AUD, original.vars.ACCESS_AUD);
  assert.notEqual(app.vars.ACCESS_AUD, original.previews.vars.ACCESS_AUD);
  assert.deepEqual(Object.keys(pub.vars).filter(key => key.startsWith('ACCESS_')), []);
});

test('real handlers deny unsigned and wrong-audience signed admin before DB, media or assets', async () => {
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign']);
  const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const input = `${b64({ alg: 'RS256', kid: 'config-negative' })}.${b64({ iss: 'https://delicate-forest-c939.cloudflareaccess.com', aud: ['not-the-new-access-audience'], exp: Math.floor(Date.now() / 1000) + 60, sub: 'signed-only', email: 'elhamlaouy@gmail.com' })}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(input));
  const token = `${input}.${Buffer.from(signature).toString('base64url')}`;
  for (const [config, handler, host] of [[pub, publicHandler, origin], [app, appHandler, editorOrigin]]) {
    const env = { ...config.vars, CMS_DB: { prepare() { assert.fail('unauthorized store access'); } }, CMS_MEDIA: { get() { assert.fail('unauthorized media access'); } }, ASSETS: { fetch() { assert.fail('unauthorized asset fallback'); } }, CMS_PUBLIC_RATE_LIMITER: { async limit() { return { success: true }; } } };
    for (const path of ['/admin', '/api/admin/content']) for (const headers of [{}, { 'Cf-Access-Jwt-Assertion': token }]) {
      const response = await handler.fetch(new Request(host + path, { headers }), env);
      assert.equal(response.status, 401);
      assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
    }
  }
});

test('public dynamic handler requires separate approximate platform limiter', () => {
  assert.equal(pub.vars.CMS_PUBLIC_RATE_LIMIT_REQUIRED, 'true');
  assert.deepEqual(pub.ratelimits, [{ name: 'CMS_PUBLIC_RATE_LIMITER', namespace_id: '1866884043', simple: { limit: 600, period: 60 } }]);
  const namespace = Number(pub.ratelimits[0].namespace_id);
  assert.ok(Number.isInteger(namespace) && namespace > 0 && namespace <= 0xffffffff);
  for (const file of ['wrangler.toml', 'wrangler.cms-preview.toml']) {
    const config = parse(file);
    for (const bindings of [config.ratelimits, config.previews?.ratelimits]) for (const binding of bindings ?? []) assert.notEqual(binding.namespace_id, pub.ratelimits[0].namespace_id);
  }
  assert.equal(app.vars.CMS_PUBLIC_RATE_LIMIT_REQUIRED, undefined);
  assert.equal(app.ratelimits, undefined);
});
