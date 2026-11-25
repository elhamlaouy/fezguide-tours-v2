// One-off, reviewable patches for the ALREADY-PUBLISHED document. The seed only builds fresh databases; it never
// alters a live one, so a content change that must reach production ships as: (1) a pure document function here,
// (2) SQL that applies the same change inside D1 with json functions (no 700 KB literal), and (3) its rollback.
// scripts/live/add-faq-page.mjs wraps this module; tests prove function and SQL produce the identical document.
import type { CmsDocument, CmsImage, CmsLink } from './schema';
import { buildFaqFooterLink, buildFaqPage, FAQ_FOOTER_LINK_ID, FAQ_HERO_IMAGE_SRC, FAQ_PAGE_ID } from './faq-page';

export const BESPOKE_FOOTER_LINK_ID = 'footer-page-bespoke-itinerary';
export const LIVE_PATCH_ACTOR = 'claude-assistant';

/**
 * Adds the FAQ page (all of the document's own FAQ ids) and swaps the bespoke footer link for the FAQ link, in place.
 * Pure and idempotent: a document that already has the FAQ page / FAQ footer link is left unchanged for that part.
 * Nothing else is touched. The bespoke page itself stays published.
 */
export function addFaqPageToDocument(document: CmsDocument): CmsDocument {
  const next = structuredClone(document);
  if (!next.pages.some(page => page.id === FAQ_PAGE_ID)) {
    if (next.pages.some(page => page.slug === FAQ_PAGE_ID)) throw new Error(`Another page already uses the web address "${FAQ_PAGE_ID}"`);
    const media = next.media.find(item => item.src === FAQ_HERO_IMAGE_SRC);
    const image: CmsImage | undefined = media ? { mediaId: media.id, alt: structuredClone(media.alt) } : undefined;
    next.pages.push(buildFaqPage({ faqIds: next.faqs.map(faq => faq.id), image }));
  }
  const links = next.footer.links;
  if (!links.some(link => link.id === FAQ_FOOTER_LINK_ID || link.pageId === FAQ_PAGE_ID)) {
    const link = buildFaqFooterLink(next.pages.find(page => page.id === FAQ_PAGE_ID)!);
    const at = links.findIndex(item => item.id === BESPOKE_FOOTER_LINK_ID);
    if (at >= 0) links[at] = link; else links.push(link);
  }
  return next;
}

export interface PatchSqlOptions {
  /** Revision that is live now (draft = published = version). The patch becomes revision base + 1. */
  base: number;
  actor?: string;
  /** ISO timestamp stored as created_at. */
  now?: string;
}
const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;
const asRevision = (value: number) => { if (!Number.isSafeInteger(value) || value < 1) throw new Error('base revision must be a positive integer'); return value; };
const pointerGuard = (alias: string, version: number) => `${alias}.id = 1 AND ${alias}.version = ${version} AND ${alias}.draft_revision = ${version} AND ${alias}.published_revision = ${version}`;

/**
 * Apply statements (run both in ONE D1 call). Guarded: they do nothing unless cms_documents still points at `base` for
 * version, draft and published (no newer save, no unpublished draft), and the FAQ page/link are not already there.
 * Mirrors CmsStore.append: a 'publish' revision numbered base + 1, then the pointer move checked against the same base.
 */
export function buildApplySql(document: CmsDocument, options: PatchSqlOptions): string {
  const base = asRevision(options.base);
  const patched = addFaqPageToDocument(document);
  const page = patched.pages.find(item => item.id === FAQ_PAGE_ID)!;
  const link: CmsLink | undefined = patched.footer.links.find(item => item.id === FAQ_FOOTER_LINK_ID);
  if (!link || document.pages.some(item => item.id === FAQ_PAGE_ID) || document.footer.links.some(item => item.id === FAQ_FOOTER_LINK_ID || item.pageId === FAQ_PAGE_ID)) {
    throw new Error('This document already has the FAQ page or footer link: nothing to apply');
  }
  const actor = literal(options.actor ?? LIVE_PATCH_ACTOR);
  const next = base + 1;
  return `INSERT INTO cms_revisions (version, document, kind, actor, created_at, source_revision)
SELECT ${next},
  json_set(
    json_insert(r.document, '$.pages[#]', json(${literal(JSON.stringify(page))})),
    COALESCE((SELECT '$.footer.links[' || MIN(j.key) || ']' FROM json_each(r.document, '$.footer.links') j WHERE json_extract(j.value, '$.id') = '${BESPOKE_FOOTER_LINK_ID}'), '$.footer.links[#]'),
    json(${literal(JSON.stringify(link))})),
  'publish', ${actor}, ${literal(options.now ?? new Date().toISOString())}, ${base}
FROM cms_documents d JOIN cms_revisions r ON r.version = d.published_revision
WHERE ${pointerGuard('d', base)}
  AND NOT EXISTS (SELECT 1 FROM json_each(r.document, '$.pages') p WHERE json_extract(p.value, '$.id') = '${FAQ_PAGE_ID}' OR json_extract(p.value, '$.slug') = '${FAQ_PAGE_ID}')
  AND NOT EXISTS (SELECT 1 FROM json_each(r.document, '$.footer.links') l WHERE json_extract(l.value, '$.id') = '${FAQ_FOOTER_LINK_ID}' OR json_extract(l.value, '$.pageId') = '${FAQ_PAGE_ID}')
  AND EXISTS (SELECT 1 FROM cms_revision_budget WHERE id = 1);
UPDATE cms_documents SET version = ${next}, draft_revision = ${next}, published_revision = ${next}
WHERE ${pointerGuard('cms_documents', base)}
  AND EXISTS (SELECT 1 FROM cms_revisions WHERE version = ${next} AND source_revision = ${base} AND kind = 'publish' AND actor = ${actor});`;
}

/**
 * Rollback statements (one D1 call). Same shape as CmsStore.rollback: a NEW immutable 'rollback' revision (base + 2) holding a
 * verbatim copy of revision `base`, pointers moved to it. Guarded so it only runs while the patch (base + 1) is still the live,
 * unedited revision: any later owner save makes it a no-op instead of discarding their work.
 */
export function buildRollbackSql(options: PatchSqlOptions): string {
  const base = asRevision(options.base);
  const patch = base + 1;
  const next = base + 2;
  const actor = literal(options.actor ?? LIVE_PATCH_ACTOR);
  return `INSERT INTO cms_revisions (version, document, kind, actor, created_at, source_revision)
SELECT ${next}, b.document, 'rollback', ${actor}, ${literal(options.now ?? new Date().toISOString())}, ${base}
FROM cms_documents d JOIN cms_revisions p ON p.version = d.published_revision JOIN cms_revisions b ON b.version = ${base}
WHERE ${pointerGuard('d', patch)}
  AND p.source_revision = ${base} AND p.kind = 'publish' AND p.actor = ${actor}
  AND EXISTS (SELECT 1 FROM cms_revision_budget WHERE id = 1);
UPDATE cms_documents SET version = ${next}, draft_revision = ${next}, published_revision = ${next}
WHERE ${pointerGuard('cms_documents', patch)}
  AND EXISTS (SELECT 1 FROM cms_revisions WHERE version = ${next} AND source_revision = ${base} AND kind = 'rollback' AND actor = ${actor});`;
}

/** Optional: the exact retention prune CmsStore runs after every save (keeps the newest 100 revisions). */
export const RETENTION_PRUNE_SQL = `DELETE FROM cms_revisions
WHERE version <= (SELECT version FROM cms_documents WHERE id = 1) - 100
  AND version NOT IN (SELECT draft_revision FROM cms_documents WHERE id = 1 AND draft_revision IS NOT NULL)
  AND version NOT IN (SELECT published_revision FROM cms_documents WHERE id = 1 AND published_revision IS NOT NULL)
  AND version NOT IN (SELECT source_revision FROM cms_revisions WHERE source_revision IS NOT NULL);`;
