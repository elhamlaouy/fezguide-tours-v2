// Local-only workerd/D1/asset integration proof. No remote resources or identity are used.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import net from 'node:net';
import path from 'node:path';
import { register } from 'tsx/esm/api';
register();
const { createCmsSeed } = await import('../src/cms/seed.ts');
const root = path.resolve(import.meta.dirname, '..');
const temporary = await mkdtemp(path.join(process.env.TMPDIR, 'cms-seo-runtime-'));
const config = path.join(temporary, 'wrangler.toml');
const persist = path.join(temporary, 'state');
const canonical = 'https://fezguidetours.elhamlaouy.workers.dev';
let child;
function run(args) {
  return new Promise((resolve, reject) => {
    const process = spawn('npx', ['--no-install', 'wrangler', ...args], { cwd: root, env: { ...globalThis.process.env, CI: '1', WRANGLER_SEND_METRICS: 'false' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; process.stdout.on('data', data => output += data); process.stderr.on('data', data => output += data);
    process.once('error', reject); process.once('exit', code => code === 0 ? resolve(output) : reject(Error(output)));
  });
}
async function port() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const value = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return value;
}
try {
  await writeFile(config, `name = "cms-seo-local-proof"\nmain = ${JSON.stringify(path.join(root, 'worker/index.ts'))}\ncompatibility_date = "2026-10-01"\nworkers_dev = false\n[assets]\ndirectory = ${JSON.stringify(path.join(root, 'dist'))}\nbinding = "ASSETS"\nnot_found_handling = "single-page-application"\nrun_worker_first = true\n[[d1_databases]]\nbinding = "CMS_DB"\ndatabase_name = "cms-seo-local-proof"\ndatabase_id = "00000000-0000-0000-0000-000000000000"\nmigrations_dir = ${JSON.stringify(path.join(root, 'migrations'))}\n`);
  await run(['d1', 'migrations', 'apply', 'cms-seo-local-proof', '--local', '--config', config, '--persist-to', persist]);
  const dbDir = path.join(persist, 'v3/d1/miniflare-D1DatabaseObject');
  const dbFile = path.join(dbDir, (await readdir(dbDir)).find(name => name.endsWith('.sqlite') && name !== 'metadata.sqlite'));
  const db = new DatabaseSync(dbFile);
  const document = createCmsSeed();
  document.pages.find(page => page.id === 'about').enabled = false;
  document.pages.find(page => page.id === 'about').seo.title.fr = 'HIDDEN-PAGE';
  const draft = structuredClone(document);
  draft.pages.find(page => page.id === 'our-fez-tours').seo.title.fr = 'PRIVATE-DRAFT';
  const insert = db.prepare("INSERT INTO cms_revisions(version,document,kind,actor,created_at,source_revision) VALUES(?,?,?,'local-proof','2026-10-12T00:00:00Z',NULL)");
  insert.run(1, JSON.stringify(document), 'publish'); insert.run(2, JSON.stringify(draft), 'draft');
  db.exec('UPDATE cms_documents SET version=2,draft_revision=2,published_revision=1 WHERE id=1; PRAGMA wal_checkpoint(TRUNCATE)'); db.close();
  const publicPort = await port(); const inspector = await port();
  child = spawn('npx', ['--no-install', 'wrangler', 'dev', '--local', '--config', config, '--persist-to', persist, '--ip', '127.0.0.1', '--port', String(publicPort), '--inspector-port', String(inspector), '--show-interactive-dev-session=false'], { cwd: root, detached: true, env: { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false' }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    let output = ''; const timer = setTimeout(() => reject(Error(output)), 120000);
    const take = data => { output += data; if (output.includes(`Ready on http://127.0.0.1:${publicPort}`)) { clearTimeout(timer); resolve(); } };
    child.stdout.on('data', take); child.stderr.on('data', take); child.once('error', reject); child.once('exit', code => { clearTimeout(timer); reject(Error(`workerd exited ${code}: ${output}`)); });
  });
  const base = `http://127.0.0.1:${publicPort}`;
  const response = await fetch(`${base}/fr/our-fez-tours`);
  const html = await response.text();
  assert.equal(response.status, 200, html.slice(0, 180));
  assert.match(html, /<html lang="fr"/);
  assert.equal((html.match(/<title>/g) ?? []).length, 1);
  assert.ok(html.includes(`rel="canonical" href="${canonical}/fr/our-fez-tours"`));
  assert.doesNotMatch(html, /PRIVATE-DRAFT|HIDDEN-PAGE/);
  const script = html.match(/src="(\/assets\/[^" ]+\.js)"/)[1];
  const asset = await fetch(base + script); assert.equal(asset.status, 200); assert.match(asset.headers.get('content-type'), /javascript/);
  for (const pathname of ['/about', '/fr/about', '/es/missing']) {
    const response = await fetch(base + pathname); assert.equal(response.status, 404, pathname); assert.match(await response.text(), /<h1>404/);
  }
  const redirect = await fetch(base + '/?experience=our-fez-tours&lang=es', { redirect: 'manual' });
  assert.equal(redirect.status, 308); assert.equal(redirect.headers.get('location'), '/es/our-fez-tours');
  const sitemap = await fetch(base + '/sitemap.xml'); assert.equal(sitemap.status, 200); assert.match(sitemap.headers.get('content-type'), /application\/xml/);
  const sitemapText = await sitemap.text(); assert.doesNotMatch(sitemapText, /\/about</);
  assert.match(await (await fetch(base + '/robots.txt')).text(), new RegExp(`Sitemap: ${canonical}/sitemap.xml`));
  assert.equal((await fetch(base + '/admin')).status, 401);
  const fallbackDb = new DatabaseSync(dbFile);
  fallbackDb.exec('UPDATE cms_documents SET published_revision=NULL WHERE id=1; PRAGMA wal_checkpoint(TRUNCATE)');
  fallbackDb.close();
  assert.equal((await (await fetch(base + '/api/cms/document')).json()).document, null);
  const fallback = await fetch(base + '/');
  const fallbackHtml = await fallback.text();
  assert.equal(fallback.status, 200);
  assert.match(fallbackHtml, /Authentic Fez Medina Tours/);
  assert.doesNotMatch(fallbackHtml, /id="cms-published-document"/);
  console.log(JSON.stringify({ ok: true, runtime: 'workerd + actual local D1 + built ASSETS', localeRoute: '/fr/our-fez-tours', metadataBeforeJs: true, assetStatus: asset.status, hiddenAndUnknownStatus: 404, legacyRedirectStatus: redirect.status, sitemap: true, robots: true, adminDenied: true, missingDocumentLegacyFallback: true, remote: false }));
} finally {
  if (child?.pid && child.exitCode === null) {
    const exited = new Promise(resolve => child.once('exit', resolve));
    try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
    await exited;
  }
  await rm(temporary, { recursive: true, force: true });
}
