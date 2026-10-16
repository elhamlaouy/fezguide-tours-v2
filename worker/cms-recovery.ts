import { CmsError, CmsStore, requireVersion, type CmsD1Database } from './cms-store';
import { boundedMediaBytes, MEDIA_KEY_PATTERN, type CmsMediaBucket } from './media';
export const MAX_BACKUP_BYTES = 32 * 1024 * 1024;
const MAX_REVISIONS = 1000;
interface BackupRevision { version: number; kind: string; actor: string; createdAt: string; sourceRevision: number | null; document: object; sha256: string }
interface BackupMedia { key: string; bytes: number; sha256: string }
interface CmsBackup { format: 'fez-cms-backup-v1'; state: { version: number; draftRevision: number | null; publishedRevision: number | null }; revisions: BackupRevision[]; media: BackupMedia[] }
const invalid = (): never => { throw new CmsError(422, 'invalid_backup'); };
async function hash(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
}
const documentHash = (doc: object) => hash(new TextEncoder().encode(JSON.stringify(doc)));
export function retainedUploadKeys(documents: object[]): Set<string> {
 const keys = new Set<string>();
 function visit(value: unknown) {
  if (typeof value === 'string' && value.startsWith('/media/upload-')) {
   const key = value.slice('/media/'.length);
   if (!MEDIA_KEY_PATTERN.test(key)) invalid();
   keys.add(key);
  } else if (Array.isArray(value)) value.forEach(visit);
  else if (value && typeof value === 'object') Object.values(value).forEach(visit);
 }
 documents.forEach(visit);
 return keys;
}
async function mediaDigest(bucket: CmsMediaBucket, key: string): Promise<BackupMedia> {
 const object = await bucket.get(`uploads/${key}`);
 if (!object) throw new CmsError(422, 'backup_media_missing');
 const bytes = await boundedMediaBytes(object.body, null);
 return { key, bytes: bytes.byteLength, sha256: await hash(bytes) };
}
export async function exportBackup(db: CmsD1Database, store: CmsStore, bucket?: CmsMediaBucket): Promise<CmsBackup> {
 const state = await store.read();
 const rows = await db.prepare('SELECT * FROM cms_revisions WHERE version <= ? ORDER BY version LIMIT ?').bind(state.version, MAX_REVISIONS + 1)
 .all<{version:number; document:string; kind:string; actor:string; created_at:string; source_revision:number|null}>();
 if (!rows.success) throw new CmsError(503, 'cms_unavailable');
 if ((rows.results?.length ?? 0) > MAX_REVISIONS) throw new CmsError(413, 'backup_too_large');
 const revisions: BackupRevision[] = [];
 let length = 0;
 for (const row of rows.results ?? []) {
  const document = store.validate(JSON.parse(row.document));
  length += new TextEncoder().encode(JSON.stringify(document)).byteLength;
  if (length > MAX_BACKUP_BYTES - 1024 * 1024) throw new CmsError(413, 'backup_too_large');
  revisions.push({version:row.version,kind:row.kind,actor:row.actor,createdAt:row.created_at,sourceRevision:row.source_revision,document,sha256:await documentHash(document)});
 }
 const keys = retainedUploadKeys(revisions.map(r => r.document));
 if (keys.size && !bucket) throw new CmsError(503, 'media_unavailable');
 const media: BackupMedia[] = [];
 for (const key of [...keys].sort()) media.push(await mediaDigest(bucket!, key));
 return {format:'fez-cms-backup-v1',state:{version:state.version,draftRevision:state.draftRevision,publishedRevision:state.publishedRevision},revisions,media};
}
export async function restoreBackup(store: CmsStore, bucket: CmsMediaBucket | undefined, value: unknown, revision: number, expectedVersion: number, actor: string) {
 requireVersion(revision); requireVersion(expectedVersion);
 const backup = value as CmsBackup;
 if (!backup || backup.format !== 'fez-cms-backup-v1' || !backup.state || !Array.isArray(backup.revisions) || !Array.isArray(backup.media) || backup.revisions.length > MAX_REVISIONS) invalid();
 requireVersion(backup.state.version);
 const documents: object[] = [], versions = new Set<number>();
 let chosen: object | undefined;
 for (const row of backup.revisions) {
  if (!row || !Number.isSafeInteger(row.version) || row.version < 1 || row.version > backup.state.version || versions.has(row.version) ||
   !['draft','publish','rollback'].includes(row.kind) || typeof row.actor !== 'string' || row.actor.length < 1 || row.actor.length > 256 || typeof row.createdAt !== 'string') invalid();
  versions.add(row.version);
  const doc = store.validate(row.document);
  if (await documentHash(doc) !== row.sha256) invalid();
  documents.push(doc);
  if (row.version === revision) chosen = doc;
 }
 if (versions.size !== backup.state.version || !chosen || [backup.state.draftRevision,backup.state.publishedRevision].some(v=>v!==null&&!versions.has(v))) invalid();
 for (const row of backup.revisions) if (row.sourceRevision !== null && (!versions.has(row.sourceRevision) || row.sourceRevision >= row.version)) invalid();
 const keys = retainedUploadKeys(documents), seen = new Set<string>();
 if (keys.size && !bucket) throw new CmsError(503, 'media_unavailable');
 for (const entry of backup.media) {
  if (!entry || !keys.has(entry.key) || seen.has(entry.key) || !Number.isSafeInteger(entry.bytes) || entry.bytes < 1 || !/^[a-f0-9]{64}$/.test(entry.sha256)) invalid();
  seen.add(entry.key);
  const actual = await mediaDigest(bucket!,entry.key);
  if (actual.sha256 !== entry.sha256 || actual.bytes !== entry.bytes) throw new CmsError(422, 'backup_media_hash');
 }
 if (seen.size !== keys.size) invalid();
 // Validation and immutable-object hash checks finish before the single draft write.
 // Never restore publication authority from the caller's backup.
 return store.saveDraft(chosen,expectedVersion,actor);
}
export async function orphanDryRun(db: CmsD1Database, store: CmsStore, bucket?: CmsMediaBucket) {
 if (!bucket?.list) throw new CmsError(503,'media_inventory_unavailable');
 const rows = await db.prepare('SELECT document FROM cms_revisions ORDER BY version LIMIT ?').bind(MAX_REVISIONS + 1).all<{document:string}>();
 if (!rows.success || (rows.results?.length ?? 0) > MAX_REVISIONS) throw new CmsError(413,'backup_too_large');
 const retained = retainedUploadKeys((rows.results ?? []).map(row=>store.validate(JSON.parse(row.document))));
 const objects = [], cutoff = Date.now() - 7 * 24 * 3600 * 1000;
 let cursor: string | undefined;
 do {
  const page = await bucket.list({prefix:'uploads/',limit:1000,...(cursor?{cursor}:{})});
  objects.push(...page.objects);
  if (objects.length > 1000) throw new CmsError(413,'inventory_too_large');
  cursor = page.truncated ? page.cursor : undefined;
  if (page.truncated && !cursor) throw new CmsError(503,'media_inventory_unavailable');
 } while(cursor);
 return {dryRun:true,quarantineDays:7,retainedKeys:retained.size,candidates:objects.filter(o=>MEDIA_KEY_PATTERN.test(o.key.slice(8))&&!retained.has(o.key.slice(8))&&new Date(o.uploaded).getTime()<cutoff)
 .map(o=>({key:o.key,bytes:o.size,uploaded:o.uploaded})),deleted:0};
}
