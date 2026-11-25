#!/usr/bin/env node
// Offline live-document patch: adds the FAQ page and swaps the bespoke footer link for the FAQ link.
// No network, no Cloudflare. Reads a document JSON file, writes the patched JSON, prints the D1 SQL.
//
//   node scripts/live/add-faq-page.mjs <document.json> --out <patched.json> [--base 170] [--sql-out apply.sql]
//        [--rollback-out rollback.sql] [--now 2026-11-25T12:00:00.000Z]
//
// <document.json> is either the bare document or the {version, document} export. --base is the revision that is live
// (defaults to the export's "version"). The printed SQL only applies while cms_documents still points at that revision.
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { register } from 'tsx/esm/api';
register();
const { addFaqPageToDocument, buildApplySql, buildRollbackSql, RETENTION_PRUNE_SQL, LIVE_PATCH_ACTOR } = await import('../../src/cms/live-patches.ts');
const { validateCmsDocument } = await import('../../src/cms/schema.ts');
const { MAX_DOCUMENT_BYTES } = await import('../../worker/cms-store.ts');
const { withinByteLimit } = await import('../../src/cms/schema.ts');

const { values, positionals } = parseArgs({ allowPositionals: true, options: {
  out: { type: 'string' }, base: { type: 'string' }, 'sql-out': { type: 'string' }, 'rollback-out': { type: 'string' }, now: { type: 'string' },
} });
const [input] = positionals;
if (!input || !values.out) { console.error('usage: add-faq-page.mjs <document.json> --out <patched.json> [--base N] [--sql-out file] [--rollback-out file] [--now ISO]'); process.exit(2); }

const parsed = JSON.parse(readFileSync(input, 'utf8'));
const envelope = parsed && typeof parsed === 'object' && 'document' in parsed && 'version' in parsed;
const document = envelope ? parsed.document : parsed;
const base = Number(values.base ?? (envelope ? parsed.version : NaN));
if (!Number.isSafeInteger(base) || base < 1) { console.error('Give the live revision with --base N (the input has no "version").'); process.exit(2); }

const patched = addFaqPageToDocument(document);
const raw = JSON.stringify(patched);
// The same checks the Worker applies before it stores a revision: full schema validation and the stored-size limit.
const strict = validateCmsDocument(patched);
const asStored = validateCmsDocument(JSON.parse(raw), { parsedJson: true, sizeCheckedByCaller: true });
if (!strict.valid || !asStored.valid) { console.error(`Patched document is invalid:\n${[...strict.errors, ...asStored.errors].join('\n')}`); process.exit(1); }
if (!withinByteLimit(raw, MAX_DOCUMENT_BYTES)) { console.error(`Patched document exceeds ${MAX_DOCUMENT_BYTES} bytes`); process.exit(1); }
if (JSON.stringify(addFaqPageToDocument(patched)) !== raw) { console.error('Patch is not idempotent'); process.exit(1); }

const sqlOptions = { base, now: values.now ?? new Date().toISOString() };
const apply = buildApplySql(document, sqlOptions);
const rollback = buildRollbackSql(sqlOptions);
writeFileSync(values.out, raw);
if (values['sql-out']) writeFileSync(values['sql-out'], `${apply}\n`);
if (values['rollback-out']) writeFileSync(values['rollback-out'], `${rollback}\n`);

console.error(`Patched document: ${raw.length} bytes, ${patched.pages.length} pages (was ${document.pages.length}), written to ${values.out}`);
console.error(`New revision ${base + 1} (publish, actor ${LIVE_PATCH_ACTOR}); rollback would be revision ${base + 2}.`);
console.log(`-- APPLY: run both statements in ONE D1 call. No-op unless version = draft_revision = published_revision = ${base}.\n${apply}\n`);
console.log(`-- OPTIONAL after APPLY: the same retention prune the editor runs after each save.\n${RETENTION_PRUNE_SQL}\n`);
console.log(`-- ROLLBACK: run both statements in ONE D1 call. No-op unless the patch (revision ${base + 1}) is still live and unedited.\n${rollback}`);
