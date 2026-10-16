import { CmsError, type CmsD1Database } from './cms-store';

export const CMS_REQUEST_LIMITS = {
  read: { identity: 300, site: 600, seconds: 60 },
  write: { identity: 60, site: 120, seconds: 60 },
  recovery: { identity: 6, site: 12, seconds: 3600 },
} as const;
export type CmsRequestBucket = keyof typeof CMS_REQUEST_LIMITS;
export const MAX_CMS_REQUEST_IDENTITIES = 256; // Active identity/bucket rows, not historical windows.

export async function consumeCmsRequest(db: CmsD1Database, actor: string, bucket: CmsRequestBucket) {
  if (!actor || actor.length > 256) throw new CmsError(400, 'invalid_actor');
  const limit = CMS_REQUEST_LIMITS[bucket];
  // Reuse the upload budget's conditional SQL admission, with D1 batch atomicity.
  // The identity charge is conditional on available global capacity; changes() then
  // charges the global row only for an admitted identity. No rejected request burns
  // another editor's global quota. All clocks come from the shared database.
  const results = await db.batch([
    db.prepare("DELETE FROM cms_request_budgets WHERE actor != '' AND reset_at <= unixepoch()"),
    db.prepare(`INSERT INTO cms_request_budgets (actor, bucket, reset_at, used)
      SELECT ?, ?, unixepoch() + ?, 1
      WHERE EXISTS (SELECT 1 FROM cms_request_budgets WHERE actor = '' AND bucket = ?
        AND (reset_at <= unixepoch() OR used < ?))
      AND (EXISTS (SELECT 1 FROM cms_request_budgets WHERE actor = ? AND bucket = ?)
        OR (SELECT COUNT(*) FROM cms_request_budgets WHERE actor != '') < ?)
      ON CONFLICT(actor, bucket) DO UPDATE SET
        used = CASE WHEN reset_at <= unixepoch() THEN 1 ELSE used + 1 END,
        reset_at = CASE WHEN reset_at <= unixepoch() THEN unixepoch() + ? ELSE reset_at END
      WHERE reset_at <= unixepoch() OR used < ?`)
      .bind(actor, bucket, limit.seconds, bucket, limit.site, actor, bucket,
        MAX_CMS_REQUEST_IDENTITIES, limit.seconds, limit.identity),
    db.prepare(`UPDATE cms_request_budgets SET
      used = CASE WHEN reset_at <= unixepoch() THEN 1 ELSE used + 1 END,
      reset_at = CASE WHEN reset_at <= unixepoch() THEN unixepoch() + ? ELSE reset_at END
      WHERE actor = '' AND bucket = ? AND changes() = 1`)
      .bind(limit.seconds, bucket),
  ]);
  if (results.length !== 3 || results.some(result => !result.success)) throw new CmsError(503, 'cms_unavailable');
  if (results[1].meta?.changes !== 1) throw new CmsError(429, 'cms_request_rate', limit.seconds);
  if (results[2].meta?.changes !== 1) throw new CmsError(503, 'cms_unavailable');
}
