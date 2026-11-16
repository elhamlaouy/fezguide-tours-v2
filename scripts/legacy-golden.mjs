#!/usr/bin/env node
// Golden proof for archive slimming against a real stored document.
//   node scripts/legacy-golden.mjs <put.json|document.json> [--save-outputs <file>] [--compare-outputs <file>]
// Accepts either a bare CMS document or a PUT body ({ document }). Never modifies the input file.
// 1. Renders the whole site from the stored (unslimmed) document and from slimCmsDocument(document) and
//    requires every output to be byte-identical.
// 2. --save-outputs writes a digest per output (run it on an older checkout to capture the pre-change
//    baseline); --compare-outputs compares this checkout against such a file.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { register } from 'tsx/esm/api';
register();
const { renderSite, compareSites, compatibilityJson } = await import('./legacy-golden-lib.mjs');
const { validateCmsDocument } = await import('../src/cms/schema.ts');
const args = process.argv.slice(2);
const flag = name => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
const input = args.find(arg => !arg.startsWith('--') && arg !== flag('--save-outputs') && arg !== flag('--compare-outputs'));
if (!input) { console.error('usage: legacy-golden.mjs <document.json> [--save-outputs f] [--compare-outputs f]'); process.exit(2); }
const parsed = JSON.parse(readFileSync(input, 'utf8'));
const stored = parsed.document ?? parsed;
const bytes = value => Buffer.byteLength(JSON.stringify(value));
const digest = text => createHash('sha256').update(text).digest('hex');
let failed = false;
const report = (ok, message) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${message}`); if (!ok) failed = true; };

const validation = validateCmsDocument(stored, { parsedJson: true });
report(validation.valid, `stored document validates${validation.valid ? '' : `: ${validation.errors.slice(0, 3).join('; ')}`}`);
const savedOutputs = flag('--save-outputs');
const baseline = flag('--compare-outputs');

if (validation.valid) {
  const { slimCmsDocument } = await import('../src/cms/legacy-slim.ts');
  const slim = slimCmsDocument(stored);
  const slimValidation = validateCmsDocument(slim, { parsedJson: true });
  report(slimValidation.valid, 'slimmed document validates');
  console.log(`size  stored ${bytes(stored)} B -> slim ${bytes(slim)} B (saved ${bytes(stored) - bytes(slim)} B, ${(100 * (1 - bytes(slim) / bytes(stored))).toFixed(1)}%); legacy ${bytes(stored.legacy)} B -> ${bytes(slim.legacy)} B`);
  const before = await renderSite(stored);
  const after = await renderSite(slim);
  const differing = compareSites(before, after);
  report(differing.length === 0, `stored vs slim: ${before.size} outputs (public pages x EN/FR/ES, sitemap, robots, head/JSON-LD, SSR body, bootstrap, client data and render), ${differing.length} differ${differing.length ? `: ${differing.slice(0, 10).join(', ')}` : ''}`);
  const compat = compatibilityJson(stored) === compatibilityJson(slim);
  console.log(`info  /api/cms compatibility payload (not used while a published document exists) identical: ${compat}`);
  if (savedOutputs) {
    writeFileSync(savedOutputs, JSON.stringify(Object.fromEntries([...before].map(([key, value]) => [key, digest(value)]))));
    console.log(`wrote ${before.size} digests to ${savedOutputs}`);
  }
  if (baseline) {
    const expected = JSON.parse(readFileSync(baseline, 'utf8'));
    const differs = [...before].filter(([key, value]) => expected[key] !== digest(value)).map(([key]) => key);
    const missing = Object.keys(expected).filter(key => !before.has(key));
    report(!differs.length && !missing.length, `this checkout vs baseline digests: ${differs.length} differ, ${missing.length} missing${differs.length ? `: ${differs.slice(0, 10).join(', ')}` : ''}`);
  }
}
process.exit(failed ? 1 : 0);
