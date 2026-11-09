// Phase 1 rebuild tests: the new migrations (0004-0006) and the rebuilt
// validator (src/cms/schema.ts). Run with the repo test suite:
//   node --test --test-concurrency=1 tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { register } from 'tsx/esm/api';
register();

const { validateCmsDocument, checkPriceAgreement, CMS_LIMITS } = await import('../src/cms/schema.ts');

const OLD_MIGRATIONS = ['0001_cms.sql', '0002_media_budget.sql', '0003_cms_release_safeguards.sql'];
const NEW_MIGRATIONS = ['0004_cms_schema.sql', '0005_cms_media.sql', '0006_cms_budgets.sql'];

function migrate(sqlite, names) {
  for (const name of names) sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
}

function tables(sqlite) {
  return sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r => r.name);
}
function triggers(sqlite) {
  return sqlite.prepare("SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name").all().map(r => r.name);
}

test('new migrations apply cleanly to an empty database', () => {
  const sqlite = new DatabaseSync(':memory:');
  try {
    migrate(sqlite, [...OLD_MIGRATIONS, ...NEW_MIGRATIONS]);
    for (const table of ['cms_revisions', 'cms_documents', 'cms_upload_reservations', 'cms_revision_budget', 'cms_request_budgets']) {
      assert.ok(tables(sqlite).includes(table), `missing ${table}`);
    }
    for (const trigger of ['cms_revisions_no_update', 'cms_revisions_no_delete', 'cms_revisions_budget_check', 'cms_revisions_budget_charge']) {
      assert.ok(triggers(sqlite).includes(trigger), `missing ${trigger}`);
    }
    const docRow = sqlite.prepare('SELECT id, version FROM cms_documents').get();
    assert.equal(docRow.id, 1); assert.equal(docRow.version, 0);
    const budgetRow = sqlite.prepare('SELECT id, revision_count, document_bytes FROM cms_revision_budget').get();
    assert.equal(budgetRow.id, 1); assert.equal(budgetRow.revision_count, 0); assert.equal(budgetRow.document_bytes, 0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM cms_request_budgets WHERE actor=''").get().n, 3);
  } finally { sqlite.close(); }
});

test('new migrations reset a database that already has the old schema (prod-like)', () => {
  const sqlite = new DatabaseSync(':memory:');
  try {
    migrate(sqlite, OLD_MIGRATIONS);
    sqlite.prepare("INSERT INTO cms_revisions (version, document, kind, actor, created_at) VALUES (1, '{\"schemaVersion\":1}', 'draft', 'owner', '2026-11-09')").run();
    migrate(sqlite, NEW_MIGRATIONS);
    // The reset drops pre-rebuild history: the v2 databases hold no published content yet.
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM cms_revisions').get().n, 0);
    const docRow = sqlite.prepare('SELECT id, version FROM cms_documents').get();
    assert.equal(docRow.id, 1); assert.equal(docRow.version, 0);
    const budgetRow2 = sqlite.prepare('SELECT revision_count, document_bytes FROM cms_revision_budget').get();
    assert.equal(budgetRow2.revision_count, 0); assert.equal(budgetRow2.document_bytes, 0);
  } finally { sqlite.close(); }
});

test('revisions are append-only', () => {
  const sqlite = new DatabaseSync(':memory:');
  try {
    migrate(sqlite, [...OLD_MIGRATIONS, ...NEW_MIGRATIONS]);
    sqlite.prepare("INSERT INTO cms_revisions (version, document, kind, actor, created_at) VALUES (1, '{}', 'draft', 'owner', '2026-11-09')").run();
    assert.throws(() => sqlite.prepare("UPDATE cms_revisions SET kind='publish' WHERE version=1").run(), /immutable/);
    assert.throws(() => sqlite.prepare('DELETE FROM cms_revisions WHERE version=1').run(), /immutable/);
  } finally { sqlite.close(); }
});

test('budget triggers enforce the 1,000-revision and 24 MiB caps', () => {
  const sqlite = new DatabaseSync(':memory:');
  try {
    migrate(sqlite, [...OLD_MIGRATIONS, ...NEW_MIGRATIONS]);
    const insert = sqlite.prepare("INSERT INTO cms_revisions (version, document, kind, actor, created_at) VALUES (?, '{}', 'draft', 'owner', '2026-11-09')");
    for (let version = 1; version <= 1000; version++) insert.run(version);
    assert.equal(sqlite.prepare('SELECT revision_count FROM cms_revision_budget').get().revision_count, 1000);
    assert.throws(() => insert.run(1001), /cms_revision_storage_budget/);
  } finally { sqlite.close(); }
});

test('a single document over 24 MiB is refused by the budget trigger', () => {
  const sqlite = new DatabaseSync(':memory:');
  try {
    migrate(sqlite, [...OLD_MIGRATIONS, ...NEW_MIGRATIONS]);
    const big = JSON.stringify({ padding: 'x'.repeat(25 * 1024 * 1024) });
    assert.throws(
      () => sqlite.prepare('INSERT INTO cms_revisions (version, document, kind, actor, created_at) VALUES (1, ?, ?, ?, ?)').run(big, 'draft', 'owner', '2026-11-09'),
      /cms_revision_storage_budget/,
    );
  } finally { sqlite.close(); }
});

// -- validator ---------------------------------------------------------------

const text = (en = '') => ({ en, fr: en, es: en });
const siteSettings = () => ({
  siteName: 'Test', phoneNumber: '+212719603009', whatsappNumber: '212719603009',
  email: 'test@example.com', address: text('Address'), licenseBadge: text('Licence'),
  heroTagline: text('Tagline'), heroTitle: text('Title'), heroSubtitle: text('Subtitle'),
});
const minimalDoc = () => ({
  schemaVersion: 1,
  siteSettings: siteSettings(),
  theme: { colors: { primary: '#005F5A', accent: '#C84B31', background: '#FAF8F5', text: '#1C2524' }, font: 'system', fontScale: 1, containerWidth: 1280, spacing: 'comfortable', radius: 'rounded', buttonVariant: 'solid', cardVariant: 'outlined' },
  navigation: [], footer: { text: text('Footer'), links: [] }, uiCopy: {},
  pages: [{ id: 'home', slug: 'home', kind: 'landing', enabled: true, title: text('Home'), seo: { title: text('Home'), description: text('Description') }, sections: [] }],
  products: [], editorialEntries: [], blogPosts: [], teamMembers: [], faqs: [], media: [], reviews: [],
  legacy: { tours: [], customPages: [], blogPosts: [], teamMembers: [], faqs: [], siteSettings: siteSettings() },
});

test('rebuilt validator accepts a minimal valid document without changing it', () => {
  const input = minimalDoc();
  const before = structuredClone(input);
  const result = validateCmsDocument(input);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.deepEqual(result.document, before);
  assert.deepEqual(input, before);
});

test('rebuilt validator rejects an oversized document by UTF-8 bytes, not characters', () => {
  const input = minimalDoc();
  input.uiCopy = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`copy-${i}`, text('ن'.repeat(10_000))]));
  assert.equal(validateCmsDocument(input).valid, false);
});

test('rebuilt validator caps diagnostics at 100 errors with useful paths', () => {
  const input = minimalDoc();
  input.uiCopy = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`bad-${i}`, { en: 7, fr: 8, es: 9 }]));
  const result = validateCmsDocument(input);
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, CMS_LIMITS.errors);
  assert.match(result.errors[0], /document\.uiCopy\.bad-0\.en:/);
});

test('rebuilt validator rejects cyclic input and prototype-pollution keys without throwing', () => {
  const cyclic = minimalDoc();
  cyclic.legacy = cyclic;
  assert.equal(validateCmsDocument(cyclic).valid, false);
  const polluted = minimalDoc();
  polluted.uiCopy = JSON.parse('{"__proto__":{"en":"a","fr":"a","es":"a"}}');
  assert.equal(validateCmsDocument(polluted).valid, false);
});

test('seed prices agree with their practicalInfo mirrors, and a disagreement is flagged', async () => {
  const { createCmsSeed } = await import('../src/cms/seed.ts');
  const seed = createCmsSeed();
  assert.deepEqual(checkPriceAgreement(seed), []);
  assert.equal(validateCmsDocument(seed).valid, true);
  const conflict = structuredClone(seed);
  conflict.products.find(p => p.id === 'our-fez-tours').practicalInfo.priceEUR = 203;
  const errors = checkPriceAgreement(conflict);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /products\.our-fez-tours\.price: disagrees with practicalInfo priceEUR/);
  // A missing mirror in another currency is allowed, not an error.
  const noUsd = structuredClone(seed);
  assert.equal(noUsd.products.find(p => p.id === 'daytrip-chefchaouen').practicalInfo.priceUSD, undefined);
  assert.deepEqual(checkPriceAgreement(noUsd), []);
});
