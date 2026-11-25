import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { register } from 'tsx/esm/api';
register();
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { validateCmsDocument, withinByteLimit } = await import('../src/cms/schema.ts');
const { addFaqPageToDocument, buildApplySql, buildRollbackSql, RETENTION_PRUNE_SQL, BESPOKE_FOOTER_LINK_ID, LIVE_PATCH_ACTOR } = await import('../src/cms/live-patches.ts');
const { CmsStore, MAX_DOCUMENT_BYTES } = await import('../worker/cms-store.ts');

const MIGRATIONS = ['0004_cms_schema.sql', '0005_cms_media.sql', '0006_cms_budgets.sql', '0007_cms_revision_budget_300mb.sql', '0008_cms_revision_retention.sql'];
const BASE = 170;
const NOW = '2026-11-25T12:00:00.000Z';

/** The published document as it was before this change: no FAQ page, the bespoke link last in the footer. */
function liveShaped() {
  const document = createCmsSeed();
  document.pages = document.pages.filter(page => page.id !== 'faq');
  const bespoke = document.pages.find(page => page.id === 'page-bespoke-itinerary');
  document.footer.links = document.footer.links.filter(link => link.id !== 'footer-faq');
  document.footer.links.push({ id: BESPOKE_FOOTER_LINK_ID, pageId: bespoke.id, label: bespoke.title, enabled: true });
  return document;
}
// Optional: also prove everything against the real exported production document (FEZ_LIVE_BACKUP=/path/published-doc.json).
const backup = process.env.FEZ_LIVE_BACKUP && existsSync(process.env.FEZ_LIVE_BACKUP) ? JSON.parse(readFileSync(process.env.FEZ_LIVE_BACKUP, 'utf8')) : null;
const fixtures = [['seed-shaped live document', liveShaped(), BASE], ...(backup ? [['real production export', backup.document, backup.version]] : [])];

function scratch(document, base) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  for (const name of MIGRATIONS) sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
  const raw = JSON.stringify(document);
  // History as the real store leaves it: an older revision the base points back to, then the live one.
  sqlite.prepare("INSERT INTO cms_revisions VALUES (?, ?, 'draft', 'owner', ?, NULL)").run(base - 1, raw, '2026-11-24T10:00:00.000Z');
  sqlite.prepare("INSERT INTO cms_revisions VALUES (?, ?, 'publish', 'owner', ?, ?)").run(base, raw, '2026-11-24T11:00:00.000Z', base - 1);
  sqlite.prepare('UPDATE cms_documents SET version = ?, draft_revision = ?, published_revision = ? WHERE id = 1').run(base, base, base);
  return { sqlite, raw };
}
const pointers = sqlite => ({ ...sqlite.prepare('SELECT version, draft_revision AS draft, published_revision AS published FROM cms_documents WHERE id = 1').get() });
const revision = (sqlite, version) => sqlite.prepare('SELECT * FROM cms_revisions WHERE version = ?').get(version);
const budget = sqlite => ({ ...sqlite.prepare('SELECT revision_count AS count, document_bytes AS bytes FROM cms_revision_budget WHERE id = 1').get() });
const stored = (sqlite, version) => JSON.parse(revision(sqlite, version).document);

test('addFaqPageToDocument appends the FAQ page with every FAQ id and swaps the bespoke footer link in place', () => {
  const before = liveShaped();
  const frozen = structuredClone(before);
  const after = addFaqPageToDocument(before);
  assert.deepEqual(before, frozen, 'input is not mutated');
  assert.equal(after.pages.length, before.pages.length + 1);
  const page = after.pages.at(-1);
  assert.deepEqual([page.id, page.slug, page.kind, page.enabled], ['faq', 'faq', 'landing', true]);
  assert.deepEqual(page.sections.map(section => section.type), ['hero', 'faq', 'contact']);
  assert.deepEqual(page.sections[1].faqIds, before.faqs.map(faq => faq.id));
  assert.equal(page.sections[1].variant, 'accordion');
  assert.ok(after.media.some(media => media.id === page.sections[0].image.mediaId), 'hero photo comes from the document library');
  const last = after.footer.links.at(-1);
  assert.deepEqual(last, { id: 'footer-faq', pageId: 'faq', label: page.title, enabled: true });
  assert.equal(after.footer.links.length, before.footer.links.length);
  assert.ok(!after.footer.links.some(link => link.id === BESPOKE_FOOTER_LINK_ID || link.pageId === 'page-bespoke-itinerary'));
  assert.deepEqual(after.pages.find(item => item.id === 'page-bespoke-itinerary'), before.pages.find(item => item.id === 'page-bespoke-itinerary'), 'bespoke page stays');
  // Nothing else changes.
  const rest = value => { const copy = structuredClone(value); copy.pages = copy.pages.filter(item => item.id !== 'faq'); copy.footer.links.pop(); return copy; };
  assert.deepEqual(rest(after), rest(before));
  assert.deepEqual(after.footer.links.slice(0, -1), before.footer.links.slice(0, -1));
  assert.equal(validateCmsDocument(after).valid, true);
  assert.ok(withinByteLimit(JSON.stringify(after), MAX_DOCUMENT_BYTES));
});

test('addFaqPageToDocument is idempotent and respects an owner who already has the page or link', () => {
  const once = addFaqPageToDocument(liveShaped());
  assert.deepEqual(addFaqPageToDocument(once), once);
  // The seed already builds the FAQ page: patching a fresh seed changes nothing.
  const seed = createCmsSeed();
  assert.deepEqual(addFaqPageToDocument(seed), seed);
  // No bespoke link (owner removed it): the FAQ link is appended instead.
  const bare = liveShaped();
  bare.footer.links = bare.footer.links.filter(link => link.id !== BESPOKE_FOOTER_LINK_ID);
  assert.equal(addFaqPageToDocument(bare).footer.links.at(-1).id, 'footer-faq');
  // A document without the library photo still gets a valid page, just without a hero photo.
  const noPhoto = liveShaped();
  noPhoto.media = noPhoto.media.filter(media => media.src !== '/images/fez-medina/medina-14.jpg');
  noPhoto.pages.forEach(page => page.sections.forEach(section => { if (section.image?.mediaId && !noPhoto.media.some(media => media.id === section.image.mediaId)) delete section.image; if (section.images) section.images = section.images.filter(image => noPhoto.media.some(media => media.id === image.mediaId)); if (section.cards) section.cards.forEach(card => { if (card.image && !noPhoto.media.some(media => media.id === card.image.mediaId)) delete card.image; }); }));
  const patched = addFaqPageToDocument(noPhoto);
  assert.equal(patched.pages.at(-1).sections[0].image, undefined);
  // Someone else owns the address /faq: refuse instead of producing a colliding page.
  const taken = liveShaped();
  taken.pages.find(page => page.id === 'about').slug = 'faq';
  assert.throws(() => addFaqPageToDocument(taken), /already uses the web address/);
});

for (const [label, document, base] of fixtures) {
  test(`apply SQL on a scratch D1-shaped database equals the pure function (${label})`, () => {
    const { sqlite, raw } = scratch(document, base);
    try {
      const expected = addFaqPageToDocument(document);
      const sql = buildApplySql(document, { base, now: NOW });
      assert.ok(sql.length < 12_000, `SQL is small (${sql.length} bytes), not the whole document`);
      const budgetBefore = budget(sqlite);
      sqlite.exec(sql);
      assert.deepEqual(pointers(sqlite), { version: base + 1, draft: base + 1, published: base + 1 });
      const row = revision(sqlite, base + 1);
      assert.deepEqual([row.kind, row.actor, row.created_at, row.source_revision], ['publish', LIVE_PATCH_ACTOR, NOW, base]);
      assert.deepEqual(JSON.parse(row.document), expected, 'SQL result deep-equals the function result');
      assert.equal(validateCmsDocument(JSON.parse(row.document), { parsedJson: true, sizeCheckedByCaller: true }).valid, true);
      assert.equal(validateCmsDocument(JSON.parse(row.document)).valid, true);
      assert.ok(withinByteLimit(row.document, MAX_DOCUMENT_BYTES));
      assert.equal(revision(sqlite, base).document, raw, 'the base revision is untouched');
      // The budget triggers charged exactly one new revision; none fired an abort.
      assert.deepEqual(budget(sqlite), { count: budgetBefore.count + 1, bytes: budgetBefore.bytes + Buffer.byteLength(row.document) });
      // Re-running is a no-op.
      const snapshot = JSON.stringify([pointers(sqlite), sqlite.prepare('SELECT * FROM cms_revisions ORDER BY version').all(), budget(sqlite)]);
      sqlite.exec(sql);
      assert.equal(JSON.stringify([pointers(sqlite), sqlite.prepare('SELECT * FROM cms_revisions ORDER BY version').all(), budget(sqlite)]), snapshot);
    } finally { sqlite.close(); }
  });

  test(`apply SQL is guarded: stale base, unpublished draft, or an existing FAQ page change nothing (${label})`, () => {
    const sql = buildApplySql(document, { base, now: NOW });
    const untouched = (mutate) => {
      const { sqlite } = scratch(document, base);
      try {
        mutate(sqlite);
        const state = JSON.stringify([pointers(sqlite), sqlite.prepare('SELECT * FROM cms_revisions ORDER BY version').all()]);
        sqlite.exec(sql);
        assert.equal(JSON.stringify([pointers(sqlite), sqlite.prepare('SELECT * FROM cms_revisions ORDER BY version').all()]), state);
      } finally { sqlite.close(); }
    };
    // The owner saved a draft after the base: it must not be clobbered.
    untouched(sqlite => {
      sqlite.prepare("INSERT INTO cms_revisions VALUES (?, ?, 'draft', 'owner', ?, NULL)").run(base + 1, JSON.stringify(document), NOW);
      sqlite.prepare('UPDATE cms_documents SET version = ?, draft_revision = ? WHERE id = 1').run(base + 1, base + 1);
    });
    // Published moved on without the patch.
    untouched(sqlite => sqlite.prepare('UPDATE cms_documents SET version = ?, draft_revision = ?, published_revision = ?').run(base - 1, base - 1, base - 1));
    // draft_revision differs from published_revision at the same version.
    untouched(sqlite => sqlite.prepare('UPDATE cms_documents SET draft_revision = ?').run(base - 1));
    // The live document already has a /faq page (e.g. the owner created one): the patch refuses to collide with it.
    const { sqlite } = scratch(addFaqPageToDocument(document), base);
    try {
      const state = JSON.stringify([pointers(sqlite), sqlite.prepare('SELECT * FROM cms_revisions ORDER BY version').all()]);
      sqlite.exec(sql);
      assert.equal(JSON.stringify([pointers(sqlite), sqlite.prepare('SELECT * FROM cms_revisions ORDER BY version').all()]), state);
    } finally { sqlite.close(); }
  });

  test(`apply SQL appends the FAQ link when the bespoke link is already gone (${label})`, () => {
    const lean = structuredClone(document);
    lean.footer.links = lean.footer.links.filter(link => link.id !== BESPOKE_FOOTER_LINK_ID);
    const { sqlite } = scratch(lean, base);
    try {
      sqlite.exec(buildApplySql(lean, { base, now: NOW }));
      assert.deepEqual(stored(sqlite, base + 1), addFaqPageToDocument(lean));
      assert.equal(stored(sqlite, base + 1).footer.links.at(-1).id, 'footer-faq');
    } finally { sqlite.close(); }
  });

  test(`rollback SQL restores revision ${base} as a new rollback revision, guards owner edits, and is idempotent (${label})`, () => {
    const { sqlite, raw } = scratch(document, base);
    try {
      sqlite.exec(buildApplySql(document, { base, now: NOW }));
      const rollback = buildRollbackSql({ base, now: NOW });
      sqlite.exec(rollback);
      assert.deepEqual(pointers(sqlite), { version: base + 2, draft: base + 2, published: base + 2 });
      const row = revision(sqlite, base + 2);
      assert.deepEqual([row.kind, row.actor, row.source_revision], ['rollback', LIVE_PATCH_ACTOR, base]);
      assert.equal(row.document, raw, 'verbatim copy of the pre-patch document');
      assert.deepEqual(JSON.parse(row.document), document);
      assert.ok(revision(sqlite, base + 1), 'the patch revision stays in history');
      const state = JSON.stringify([pointers(sqlite), sqlite.prepare('SELECT * FROM cms_revisions ORDER BY version').all(), budget(sqlite)]);
      sqlite.exec(rollback);
      assert.equal(JSON.stringify([pointers(sqlite), sqlite.prepare('SELECT * FROM cms_revisions ORDER BY version').all(), budget(sqlite)]), state, 're-running is a no-op');
      // Applying again after a rollback is a no-op too (pointers moved on): a new base is required on purpose.
      sqlite.exec(buildApplySql(document, { base, now: NOW }));
      assert.equal(pointers(sqlite).version, base + 2);
    } finally { sqlite.close(); }
    // Rollback must not run over a later owner save.
    const edited = scratch(document, base);
    try {
      edited.sqlite.exec(buildApplySql(document, { base, now: NOW }));
      edited.sqlite.prepare("INSERT INTO cms_revisions VALUES (?, ?, 'draft', 'owner', ?, NULL)").run(base + 2, JSON.stringify({ ...document, extra: 1 }), NOW);
      edited.sqlite.prepare('UPDATE cms_documents SET version = ?, draft_revision = ? WHERE id = 1').run(base + 2, base + 2);
      const state = JSON.stringify([pointers(edited.sqlite), edited.sqlite.prepare('SELECT * FROM cms_revisions ORDER BY version').all()]);
      edited.sqlite.exec(buildRollbackSql({ base, now: NOW }));
      assert.equal(JSON.stringify([pointers(edited.sqlite), edited.sqlite.prepare('SELECT * FROM cms_revisions ORDER BY version').all()]), state);
    } finally { edited.sqlite.close(); }
  });

  test(`the real CmsStore reads the patched revision and keeps saving on top of it (${label})`, async () => {
    const { sqlite } = scratch(document, base);
    try {
      sqlite.exec(buildApplySql(document, { base, now: NOW }));
      const db = {
        prepare: (sql, values = []) => ({ bind: (...args) => db.prepare(sql, args),
          async first() { return sqlite.prepare(sql).get(...values) ?? null; },
          async all() { return { success: true, results: sqlite.prepare(sql).all(...values) }; },
          async run() { return { success: true, meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } }; }, sql, values }),
        async batch(statements) {
          sqlite.exec('BEGIN IMMEDIATE');
          try {
            const out = statements.map(({ sql, values }) => {
              const before = sqlite.prepare('SELECT total_changes() AS n').get().n;
              sqlite.prepare(sql).run(...values);
              return { success: true, meta: { changes: sqlite.prepare('SELECT total_changes() AS n').get().n - before } };
            });
            sqlite.exec('COMMIT'); return out;
          } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
        },
      };
      const store = new CmsStore(db, value => validateCmsDocument(value, { parsedJson: true, sizeCheckedByCaller: true }));
      const published = await store.readPublished();
      assert.equal(published.version, base + 1);
      assert.ok(published.document.pages.some(page => page.id === 'faq'));
      const draft = structuredClone(published.document);
      draft.pages.find(page => page.id === 'faq').title.en = 'FAQ';
      assert.equal((await store.saveDraft(draft, base + 1, 'owner')).version, base + 2, 'the editor can save on top of the patch (version CAS)');
      assert.equal((await store.publish(base + 2, 'owner')).version, base + 3);
    } finally { sqlite.close(); }
  });
}

test('the optional retention prune keeps the live, patch and base revisions and only trims old history', () => {
  const document = liveShaped();
  const { sqlite } = scratch(document, BASE);
  try {
    const tiny = JSON.stringify({ schemaVersion: 1, pages: [] });
    sqlite.exec('DROP TRIGGER cms_revisions_no_delete');
    for (let version = 1; version < BASE - 1; version += 1) sqlite.prepare("INSERT INTO cms_revisions VALUES (?, ?, 'draft', 'owner', ?, NULL)").run(version, tiny, NOW);
    sqlite.exec(readFileSync(new URL('../migrations/0008_cms_revision_retention.sql', import.meta.url), 'utf8'));
    sqlite.exec(buildApplySql(document, { base: BASE, now: NOW }));
    sqlite.exec(RETENTION_PRUNE_SQL);
    const versions = sqlite.prepare('SELECT version FROM cms_revisions ORDER BY version').all().map(row => row.version);
    assert.ok(versions.includes(BASE - 1) && versions.includes(BASE) && versions.includes(BASE + 1));
    assert.equal(Math.min(...versions), BASE + 1 - 99, 'newest 100 revisions kept');
    assert.deepEqual(pointers(sqlite), { version: BASE + 1, draft: BASE + 1, published: BASE + 1 });
  } finally { sqlite.close(); }
});

test('scripts/live/add-faq-page.mjs validates, writes the document and prints apply and rollback SQL that match the function', () => {
  const directory = mkdtempSync(join(tmpdir(), 'faq-patch-'));
  try {
    const document = liveShaped();
    const input = join(directory, 'in.json'); const out = join(directory, 'out.json');
    writeFileSync(input, JSON.stringify({ version: BASE, document }));
    const run = args => spawnSync(process.execPath, [new URL('../scripts/live/add-faq-page.mjs', import.meta.url).pathname, ...args], { encoding: 'utf8' });
    const result = run([input, '--out', out, '--now', NOW, '--sql-out', join(directory, 'apply.sql'), '--rollback-out', join(directory, 'rollback.sql')]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')), addFaqPageToDocument(document));
    assert.equal(readFileSync(join(directory, 'apply.sql'), 'utf8').trim(), buildApplySql(document, { base: BASE, now: NOW }));
    assert.equal(readFileSync(join(directory, 'rollback.sql'), 'utf8').trim(), buildRollbackSql({ base: BASE, now: NOW }));
    assert.ok(result.stdout.includes(buildApplySql(document, { base: BASE, now: NOW })));
    assert.ok(result.stdout.includes(buildRollbackSql({ base: BASE, now: NOW })));
    assert.match(result.stdout, /DELETE FROM cms_revisions/);
    assert.match(result.stderr, /New revision 171/);
    // The patched file is already patched: the script refuses to emit SQL for it.
    const again = run([out, '--out', join(directory, 'again.json'), '--base', String(BASE + 1)]);
    assert.notEqual(again.status, 0);
    assert.match(again.stderr, /nothing to apply/);
    // A bare document needs an explicit base.
    writeFileSync(join(directory, 'bare.json'), JSON.stringify(document));
    assert.equal(run([join(directory, 'bare.json'), '--out', join(directory, 'x.json')]).status, 2);
    assert.equal(run([join(directory, 'bare.json'), '--out', join(directory, 'x.json'), '--base', '170']).status, 0);
    // An invalid patched document is rejected before anything is printed.
    const broken = structuredClone(document); broken.faqs = [];
    broken.pages.push({ id: 'zz', slug: 'zz', kind: 'landing', enabled: true, title: { en: 'x', fr: 'x', es: 'x' }, seo: { title: { en: 'x', fr: 'x', es: 'x' }, description: { en: 'x', fr: 'x', es: 'x' } }, sections: [{ id: 's', type: 'faq', variant: 'list', enabled: true, faqIds: ['missing'] }] });
    writeFileSync(join(directory, 'broken.json'), JSON.stringify({ version: BASE, document: broken }));
    const rejected = run([join(directory, 'broken.json'), '--out', join(directory, 'y.json')]);
    assert.equal(rejected.status, 1);
    assert.equal(rejected.stdout, '');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
