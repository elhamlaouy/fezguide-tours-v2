#!/usr/bin/env node
// FezGuide end-to-end suite entry point. See README.md for usage.
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { canon, makeCtx, parseArgs } from './lib.mjs';

const USAGE = `Usage: node scripts/e2e/run.mjs [--base URL] [--suites api,editor,public,ssr] [--production] [--expect-ssr] [--allow-dirty] [--out DIR] [--headed]
Defaults: --base http://127.0.0.1:9196, suites api,editor,public (ssr only when requested). --expect-ssr adds the ssr suite.`;

let opts;
try { opts = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message + '\n' + USAGE); process.exit(2); }
if (opts.help) { console.log(USAGE); process.exit(0); }
if (opts.expectSsr && !opts.suites.includes('ssr')) opts.suites.push('ssr');
opts.out = resolve(opts.out || join(tmpdir(), `fezguide-e2e-${new Date().toISOString().replace(/[:.]/g, '-')}`));
if (opts.production && !process.env.E2E_ACCESS_CLIENT_ID) console.warn('WARNING: --production without E2E_ACCESS_CLIENT_ID; editor/admin requests will not carry an Access client id.');

const ctx = makeCtx(opts);
console.log(`FezGuide e2e  base=${opts.base}  suites=${opts.suites.join(',')}  production=${opts.production}  out=${opts.out}`);

const summary = { base: opts.base, production: opts.production, suites: {}, uploadedMedia: [], restore: null, out: opts.out };
let snapshot = null;
let restored = false;

async function restore() {
  if (!snapshot || restored) return;
  restored = true;
  const orig = snapshot.admin;
  const identical = async () => {
    const a = await ctx.admin(); const p = await ctx.pubDoc();
    return {
      a, p,
      ok: a.publishedRevision === a.version && JSON.stringify(a.document) === JSON.stringify(orig.document) && JSON.stringify(p.document) === JSON.stringify(snapshot.pub.document),
      equalIgnoringKeyOrder: canon(a.document) === canon(orig.document) && canon(p.document) === canon(snapshot.pub.document),
    };
  };
  try {
    let st = await identical();
    if (!st.ok) {
      console.log(`  restore: content differs from the start snapshot, rolling back to revision ${orig.publishedRevision} ...`);
      const r = await ctx.http('/api/admin/content/rollback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedVersion: st.a.version, revision: orig.publishedRevision }) });
      if (!r.ok) console.log(`  restore: rollback request returned ${r.status}`);
      st = await identical();
    }
    summary.restore = { identical: st.ok, identicalIgnoringKeyOrder: st.equalIgnoringKeyOrder, originalPublishedRevision: orig.publishedRevision, currentVersion: st.a.version, currentPublishedRevision: st.a.publishedRevision };
    console.log(st.ok ? `  PASS  [restore] published document is byte-identical to the start snapshot (revision now ${st.a.publishedRevision}, was ${orig.publishedRevision})` : `  FAIL  [restore] published document differs from the start snapshot (identical ignoring key order: ${st.equalIgnoringKeyOrder})`);
  } catch (e) {
    summary.restore = { identical: false, error: String(e.message || e) };
    console.log(`  FAIL  [restore] could not verify/restore: ${e.message}`);
  }
}

process.on('SIGINT', async () => { console.log('\nInterrupted, restoring content ...'); await restore(); process.exit(130); });

try {
  const needsSnapshot = opts.suites.includes('editor') || opts.suites.includes('api');
  if (needsSnapshot) {
    const admin = await ctx.admin(); const pub = await ctx.pubDoc();
    snapshot = { admin, pub };
    writeFileSync(join(opts.out, 'snapshot-admin.json'), JSON.stringify(admin));
    writeFileSync(join(opts.out, 'snapshot-public.json'), JSON.stringify(pub));
    const dirty = admin.version !== admin.publishedRevision || canon(admin.document) !== canon(pub.document);
    if (dirty && opts.suites.includes('editor') && !opts.allowDirty) {
      console.error(`ABORT: the editor draft (version ${admin.version}) differs from the published document (revision ${admin.publishedRevision}). That is unsaved owner work the editor suite would roll back. Re-run with --allow-dirty to proceed anyway (no writes were made).`);
      process.exit(3);
    }
    if (dirty) console.log('  note: draft differs from published (--allow-dirty); restore compares against the PUBLISHED revision.');
    console.log(`  snapshot: version ${admin.version}, published revision ${admin.publishedRevision}`);
  }
  const suites = [];
  for (const name of opts.suites) {
    console.log(`\n== ${name} ==`);
    try {
      const mod = await import(`./${name}.mjs`);
      suites.push(await mod.run(ctx));
    } catch (e) {
      console.log(`  FAIL  [${name}] suite crashed: ${e.stack || e.message}`);
      suites.push({ name, pass: 0, fail: 1, skip: 0, warnings: [], failures: [{ title: 'suite crashed', error: String(e.message) }] });
    }
  }
  for (const s of suites) summary.suites[s.name] = { pass: s.pass, fail: s.fail, skip: s.skip, warnings: s.warnings, failures: s.failures };
} finally {
  await restore();
  summary.uploadedMedia = [...new Set(ctx.uploads)];
}

console.log('\n== summary ==');
let failed = 0;
for (const [n, s] of Object.entries(summary.suites)) { failed += s.fail; console.log(`  ${n.padEnd(8)} ${s.pass} passed, ${s.fail} failed, ${s.skip} skipped, ${s.warnings.length} warnings`); }
if (summary.restore && !summary.restore.identical) failed++;
if (summary.uploadedMedia.length) console.log(`  uploaded media objects to delete from R2: ${summary.uploadedMedia.join(', ')}`);
writeFileSync(join(opts.out, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary));
console.log(failed ? `RESULT: FAILED (${failed})  artifacts in ${opts.out}` : `RESULT: ALL PASSED  artifacts in ${opts.out}`);
process.exit(failed ? 1 : 0);
