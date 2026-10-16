import { CmsError, type CmsD1Database } from './cms-store';
export const MEDIA_BUDGET = { maxBytes: 256 * 1024 * 1024, maxObjects: 500, identityUploads: 30, windowSeconds: 3600 };
export async function reserveUpload(db: CmsD1Database, actor: string, bytes: number, limits = MEDIA_BUDGET): Promise<string> {
 if (!actor || actor.length > 256 || !Number.isSafeInteger(bytes) || bytes < 1) throw new CmsError(400, 'invalid_upload_reservation');
 const id = crypto.randomUUID(), now = Math.floor(Date.now() / 1000);
 // One conditional write is the authority: concurrent requests cannot both take the last slot.
 const result = await db.prepare(`INSERT INTO cms_upload_reservations(id,actor,created_at,bytes,state)
 SELECT ?,?,?,?,'pending' WHERE
 (SELECT COUNT(*) FROM cms_upload_reservations WHERE actor=? AND created_at>?) < ?
 AND (SELECT COALESCE(SUM(bytes),0) FROM cms_upload_reservations WHERE state!='released') + ? <= ?
 AND (SELECT COUNT(*) FROM cms_upload_reservations WHERE state!='released') < ?`)
 .bind(id,actor,now,bytes,actor,now-limits.windowSeconds,limits.identityUploads,bytes,limits.maxBytes,limits.maxObjects).run();
 if (!result.success) throw new CmsError(503, 'media_budget_unavailable');
 if (result.meta?.changes !== 1) {
  const rate = await db.prepare('SELECT COUNT(*) AS count FROM cms_upload_reservations WHERE actor=? AND created_at>?').bind(actor,now-limits.windowSeconds).first<{count:number}>();
  throw new CmsError(429, (rate?.count ?? 0) >= limits.identityUploads ? 'media_upload_rate' : 'media_storage_budget');
 }
 return id;
}
export async function markUploadWrite(db: CmsD1Database, id: string, key: string) {
 const result = await db.prepare(`UPDATE cms_upload_reservations SET object_key=? WHERE id=? AND state='pending' AND object_key IS NULL`).bind(key,id).run();
 if (!result.success || result.meta?.changes !== 1) throw new CmsError(503, 'media_budget_unavailable');
}
export async function finishUpload(db: CmsD1Database, id: string, key: string, bytes: number) {
 const result = await db.prepare(`UPDATE cms_upload_reservations SET state='stored',object_key=?,bytes=? WHERE id=? AND state='pending' AND bytes>=?`).bind(key,bytes,id,bytes).run();
 if (!result.success || result.meta?.changes !== 1) throw new CmsError(503, 'media_budget_unavailable');
}
export async function releaseUpload(db: CmsD1Database, id: string) {
 const result = await db.prepare(`UPDATE cms_upload_reservations SET state='released',bytes=0 WHERE id=? AND state='pending' AND object_key IS NULL`).bind(id).run();
 if (!result.success) throw new CmsError(503, 'media_budget_unavailable');
}
