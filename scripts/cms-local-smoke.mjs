import { spawn } from 'node:child_process';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import net from 'node:net';
import path from 'node:path';
import os from 'node:os';
import { register } from 'tsx/esm/api';

register();
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { validateCmsDocument } = await import('../src/cms/schema.ts');

const root = path.resolve(import.meta.dirname, '..');
const scratch = process.env.TMPDIR ?? os.tmpdir();
const wrangler = ['npx', '--yes', 'wrangler@4.149.0'];
const SENTINEL = 'DRAFT-SENTINEL-NOT-PUBLIC';
const config = 'wrangler.cms-local.toml';

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function run(args, persist) {
  return new Promise((resolve, reject) => {
    const child = spawn(wrangler[0], [...wrangler.slice(1), ...args], {
      cwd: root,
      env: { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    const take = (chunk) => {
      output += chunk.toString();
      if (output.length > 200_000) output = output.slice(-100_000);
    };
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`${args.join(' ')} exited ${code}\n${output.slice(-4000)}`));
    });
  });
}

function hasKey(value, key) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(item => hasKey(item, key));
  return Object.hasOwn(value, key) || Object.values(value).some(item => hasKey(item, key));
}

async function startDev(persist, port, inspector) {
  const child = spawn(wrangler[0], [
    ...wrangler.slice(1), 'dev', '--config', config, '--local', '--ip', '127.0.0.1',
    '--port', String(port), '--inspector-port', String(inspector), '--persist-to', persist,
    '--show-interactive-dev-session=false',
  ], {
    cwd: root,
    detached: true,
    env: { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  const take = (chunk) => {
    output += chunk.toString();
    if (output.length > 200_000) output = output.slice(-100_000);
  };
  child.stdout.on('data', take);
  child.stderr.on('data', take);
  let settled = false;
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`wrangler dev did not become ready\n${output.slice(-4000)}`));
    }, 90_000);
    const check = () => {
      if (settled || !/Ready on http:\/\/127\.0\.0\.1:\d+/.test(output)) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    child.stdout.on('data', check);
    child.stderr.on('data', check);
    child.on('exit', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`wrangler dev exited ${code}\n${output.slice(-4000)}`));
    });
    check();
  });
  return { child, ready };
}

function stop(child) {
  if (!child?.pid || child.exitCode !== null) return;
  try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
}

async function localDb(persist) {
  const dir = path.join(persist, 'v3/d1/miniflare-D1DatabaseObject');
  const name = (await readdir(dir)).find(file => file.endsWith('.sqlite') && file !== 'metadata.sqlite');
  if (!name) throw new Error('local D1 sqlite file was not created');
  const db = new DatabaseSync(path.join(dir, name));
  db.exec('PRAGMA foreign_keys = ON');
  return db;
}

function seed(persist, published, draft) {
  return localDb(persist).then(db => {
    try {
      const insert = db.prepare(`INSERT INTO cms_revisions (version, document, kind, actor, created_at, source_revision)
        VALUES (?, ?, ?, 'local-smoke', ?, NULL)`);
      insert.run(1, JSON.stringify(published), 'publish', '2026-10-10T00:00:00.000Z');
      insert.run(2, JSON.stringify(draft), 'draft', '2026-10-10T00:00:01.000Z');
      const updated = db.prepare('UPDATE cms_documents SET version = 2, draft_revision = 2, published_revision = 1 WHERE id = 1 AND version = 0').run();
      if (Number(updated.changes) !== 1) throw new Error('published pointer was not seeded');
      db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    } finally { db.close(); }
  });
}

function pointAt(persist, revision) {
  return localDb(persist).then(db => {
    try {
      const updated = db.prepare('UPDATE cms_documents SET published_revision = ? WHERE id = 1').run(revision);
      if (Number(updated.changes) !== 1) throw new Error('published pointer did not move');
      db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    } finally { db.close(); }
  });
}

const persist = await mkdtemp(path.join(scratch, 'cms-local-'));
const servers = [];
try {
  const seedDoc = createCmsSeed();
  const valid = validateCmsDocument(seedDoc);
  if (!valid.valid) throw new Error(`seed invalid: ${valid.errors.slice(0, 3).join('; ')}`);
  const draft = structuredClone(seedDoc);
  draft.siteSettings.heroTitle = { ...draft.siteSettings.heroTitle, en: SENTINEL };
  draft.legacy.siteSettings.heroTitle = { ...draft.legacy.siteSettings.heroTitle, en: SENTINEL };
  draft.uiCopy['ui.footer.copyright'] = { ...draft.uiCopy['ui.footer.copyright'], en: SENTINEL };
  if (!validateCmsDocument(draft).valid) throw new Error('draft fixture invalid');

  await run(['d1', 'migrations', 'apply', 'fez-cms-local', '--local', '--config', config, '--persist-to', persist], persist);
  await seed(persist, seedDoc, draft);

  const port = await freePort();
  const inspector = await freePort();
  const dev = await startDev(persist, port, inspector);
  servers.push(dev.child);
  await dev.ready;
  const base = `http://127.0.0.1:${port}`;

  async function get(pathname, method = 'GET') {
    const response = await fetch(`${base}${pathname}`, { method });
    const text = await response.text();
    return { status: response.status, type: response.headers.get('content-type'), text };
  }

  const denied = [];
  for (const [pathname, method] of [
    ['/admin', 'GET'], ['/admin/', 'GET'], ['/api/admin/content', 'GET'],
    ['/api/admin/content/draft', 'PUT'], ['/api/admin/content/publish', 'POST'],
  ]) {
    const response = await get(pathname, method);
    if (response.status !== 401 || !response.type?.includes('application/json') || response.text.includes('<html')) {
      throw new Error(`${method} ${pathname} was not denied: ${response.status} ${response.type} ${response.text.slice(0, 180)}`);
    }
    denied.push(`${method} ${pathname}`);
  }

  const compatibility = await get('/api/cms');
  const document = await get('/api/cms/document');
  if (compatibility.status !== 200 || document.status !== 200) throw new Error(`public read failed: ${compatibility.status} ${document.status}`);
  const publicJson = JSON.parse(document.text);
  const legacy = JSON.parse(compatibility.text);
  if (document.text.includes(SENTINEL) || compatibility.text.includes(SENTINEL)) throw new Error('draft sentinel leaked into public JSON');
  if (!publicJson.document?.uiCopy?.['ui.footer.copyright']?.en?.includes('FezGuideTours')) throw new Error('published document lost the footer copyright');
  if (hasKey(publicJson, 'bookings') || hasKey(legacy, 'bookings')) throw new Error('public JSON contained bookings');
  if (!Array.isArray(legacy.tours) || legacy.tours.length < 1) throw new Error('public compatibility tours missing');

  const beforeWrite = document.text;
  const write = await get('/api/admin/content/draft', 'PUT');
  if (write.status !== 401) throw new Error(`anonymous write was not denied: ${write.status}`);
  const afterWrite = await get('/api/cms/document');
  if (afterWrite.text !== beforeWrite) throw new Error('anonymous write changed public output');

  const home = await get('/');
  if (home.status !== 200 || !home.type?.includes('text/html')) throw new Error(`public site was not served: ${home.status} ${home.type}`);
  const script = home.text.match(/\/assets\/index-[^"]+\.js/)?.[0];
  if (!script) throw new Error('public index did not reference its script');
  const bundle = await get(script);
  if (!bundle.text.includes('Atlas Tactics')) throw new Error('served public bundle lost the Atlas footer');

  stop(dev.child);
  await new Promise((resolve) => dev.child.once('exit', resolve));
  await pointAt(persist, 2);
  const port2 = await freePort();
  const inspector2 = await freePort();
  const dev2 = await startDev(persist, port2, inspector2);
  servers.push(dev2.child);
  await dev2.ready;
  const changed = await fetch(`http://127.0.0.1:${port2}/api/cms/document`);
  const changedText = await changed.text();
  if (changed.status !== 200 || !changedText.includes(SENTINEL)) {
    throw new Error(`published pointer did not change public output: ${changed.status} ${changedText.slice(0, 180)}`);
  }

  console.log(JSON.stringify({
    ok: true,
    wrangler: '4.149.0',
    denied,
    publicRead: true,
    draftPrivate: true,
    anonymousWriteUnchanged: true,
    publishedPointerChangesOutput: true,
    atlasFooter: true,
    bookingsAbsent: true,
    authenticatedHttpUnproven: ['draft save', 'publish endpoint', 'stale 409'],
  }));
} finally {
  for (const child of servers) stop(child);
  await new Promise((resolve) => setTimeout(resolve, 500));
  for (const child of servers) {
    if (child.exitCode === null && child.pid) {
      try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already gone */ }
    }
  }
  await rm(persist, { recursive: true, force: true });
}
