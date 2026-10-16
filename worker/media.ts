import { CmsError, type CmsD1Database } from './cms-store';
import { reserveUpload, markUploadWrite, finishUpload, releaseUpload } from './media-budget';

export const MAX_MEDIA_BYTES = 8 * 1024 * 1024;
export const MAX_MEDIA_PIXELS = 12_000_000;
export const MAX_MEDIA_DIMENSION = 8192;
export type MediaLocale = 'en' | 'fr' | 'es';
export type MediaText = Record<MediaLocale, string>;
export interface UploadedCmsMedia {
  id: string; src: string; alt: MediaText; caption?: MediaText; width: number; height: number; source: string;
}
export interface MediaUploadResult { media: UploadedCmsMedia; previewSrc: string; title?: MediaText }
// Structural platform types, as with the D1 adapter. No Cloudflare dependency in the frontend.
export interface CmsMediaBucket {
  list?(options: { prefix: string; limit: number; cursor?: string }): Promise<{ objects: { key: string; size: number; uploaded: Date }[]; truncated: boolean; cursor?: string }>;
  put(key: string, value: Uint8Array, options: { httpMetadata: { contentType: string }; customMetadata: Record<string, string> }): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>;
}
export interface CmsImages {
  input(stream: ReadableStream): { output(options: { format: string; quality: number; anim: false }): Promise<{ response(): Response }> };
}
export interface CmsMediaEnv { CMS_MEDIA?: CmsMediaBucket; CMS_IMAGES?: CmsImages }
export const MEDIA_KEY_PATTERN = /^upload-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(?:jpg|png|webp)$/;
function invalid(): never { throw new CmsError(422, 'invalid_image'); }
const textAt = (bytes: Uint8Array, start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));

export async function boundedMediaBytes(body: ReadableStream<Uint8Array> | null, declared: string | null): Promise<Uint8Array<ArrayBuffer>> {
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_MEDIA_BYTES)) {
    // Cancellation may reject when the runtime has already closed the HTTP stream.
    // The enforced byte limit must still produce the intended client error.
    await body?.cancel().catch(() => {}); throw new CmsError(413, 'media_too_large');
  }
  if (!body) invalid();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_MEDIA_BYTES) { await reader.cancel().catch(() => {}); throw new CmsError(413, 'media_too_large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  return value >>> 0;
});
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}
function dimensions(width: number, height: number) {
  if (!width || !height || width > MAX_MEDIA_DIMENSION || height > MAX_MEDIA_DIMENSION || width * height > MAX_MEDIA_PIXELS) invalid();
}
/** Preflight sizes before invoking the real Images decoder. Header sniffing alone is NOT decoding. */
export function inspectMedia(bytes: Uint8Array, mime: string): { width: number; height: number; extension: string } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0, height = 0;
  const extension = mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : 'webp';
  try {
    if (mime === 'image/png') {
      if (textAt(bytes, 0, 8) !== '\x89PNG\r\n\x1a\n') invalid();
      let offset = 8, ihdr = false, data = false, ended = false;
      while (offset + 12 <= bytes.length) {
        const length = view.getUint32(offset), kind = textAt(bytes, offset + 4, offset + 8), end = offset + 12 + length;
        if (end > bytes.length || ended || !/^[a-zA-Z]{4}$/.test(kind)) invalid();
        if (view.getUint32(end - 4) !== crc32(bytes.subarray(offset + 4, end - 4))) invalid();
        if (!ihdr && kind !== 'IHDR') invalid();
        if (kind === 'IHDR') {
          if (ihdr || length !== 13) invalid();
          ihdr = true; width = view.getUint32(offset + 8); height = view.getUint32(offset + 12);
        }
        if (kind === 'IDAT') data = true;
        if (kind === 'acTL' || kind === 'fcTL' || kind === 'fdAT') invalid();
        if (kind === 'IEND') { if (length !== 0 || !data) invalid(); ended = true; }
        offset = end;
      }
      if (!ended || offset !== bytes.length) invalid();
    } else if (mime === 'image/jpeg') {
      if (view.getUint16(0) !== 0xffd8 || view.getUint16(bytes.length - 2) !== 0xffd9) invalid();
      let offset = 2, scan = false;
      while (offset < bytes.length - 2) {
        if (bytes[offset++] !== 0xff) invalid();
        while (bytes[offset] === 0xff) offset++;
        const marker = bytes[offset++];
        if (marker === 0xd9 || marker === 0xd8 || marker === 0x00) invalid();
        const length = view.getUint16(offset);
        if (length < 2 || offset + length > bytes.length - 2) invalid();
        if ([0xc0, 0xc1, 0xc2].includes(marker)) {
          if (width || length < 8 || bytes[offset + 2] !== 8) invalid();
          height = view.getUint16(offset + 3); width = view.getUint16(offset + 5);
        }
        offset += length;
        if (marker === 0xda) { scan = true; break; }
      }
      if (!scan || offset >= bytes.length - 2) invalid();
    } else if (mime === 'image/webp') {
      if (textAt(bytes, 0, 4) !== 'RIFF' || textAt(bytes, 8, 12) !== 'WEBP' || view.getUint32(4, true) + 8 !== bytes.length) invalid();
      let offset = 12, image = false, canvasWidth = 0, canvasHeight = 0;
      while (offset + 8 <= bytes.length) {
        const kind = textAt(bytes, offset, offset + 4), length = view.getUint32(offset + 4, true), start = offset + 8;
        const end = start + length + (length & 1);
        if (end > bytes.length || (length & 1 && bytes[end - 1] !== 0)) invalid();
        if (kind === 'ANIM' || kind === 'ANMF') invalid();
        if (kind === 'VP8X') {
          if (length !== 10 || offset !== 12 || canvasWidth || (bytes[start] & 2)) invalid();
          const u24 = (position: number) => bytes[position] | (bytes[position + 1] << 8) | (bytes[position + 2] << 16);
          canvasWidth = u24(start + 4) + 1; canvasHeight = u24(start + 7) + 1;
          dimensions(canvasWidth, canvasHeight);
        }
        if (kind === 'VP8 ' || kind === 'VP8L') {
          if (image) invalid(); image = true;
          if (kind === 'VP8 ') {
            if (length < 10 || (bytes[start] & 1) || textAt(bytes, start + 3, start + 6) !== '\x9d\x01\x2a') invalid();
            width = view.getUint16(start + 6, true) & 0x3fff; height = view.getUint16(start + 8, true) & 0x3fff;
          } else {
            if (length < 5 || bytes[start] !== 0x2f) invalid();
            const packed = view.getUint32(start + 1, true);
            width = (packed & 0x3fff) + 1; height = ((packed >>> 14) & 0x3fff) + 1;
          }
        }
        offset = end;
      }
      if (!image || offset !== bytes.length || (canvasWidth && (canvasWidth !== width || canvasHeight !== height))) invalid();
    } else invalid();
  } catch { invalid(); }
  dimensions(width, height);
  return { width, height, extension };
}

function metadata(header: string | null): { alt: MediaText; caption?: MediaText; title?: MediaText } {
  try {
    if (!header || header.length > 24576) throw new Error();
    const decoded = decodeURIComponent(header);
    if (new TextEncoder().encode(decoded).byteLength > 8192) throw new Error();
    const value: unknown = JSON.parse(decoded);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    const input = value as Record<string, unknown>;
    if (Object.keys(input).some(key => !['alt', 'caption', 'title'].includes(key))) throw new Error();
    const localized = (item: unknown, max: number): MediaText => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error();
      const record = item as Record<string, unknown>;
      if (Object.keys(record).length !== 3 || !['en', 'fr', 'es'].every(key => typeof record[key] === 'string' && (record[key] as string).length <= max && !/[<>\x00-\x1f\x7f]/.test(record[key] as string))) throw new Error();
      return { en: record.en as string, fr: record.fr as string, es: record.es as string };
    };
    return { alt: localized(input.alt, 500), ...(input.caption === undefined ? {} : { caption: localized(input.caption, 2000) }),
      ...(input.title === undefined ? {} : { title: localized(input.title, 500) }) };
  } catch { throw new CmsError(422, 'invalid_media_metadata'); }
}

export async function uploadMedia(request: Request, env: CmsMediaEnv, budget?: { db: CmsD1Database; actor: string }): Promise<MediaUploadResult> {
  if (!env.CMS_MEDIA || !env.CMS_IMAGES) throw new CmsError(503, 'media_unavailable');
  const mime = request.headers.get('content-type') ?? '';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime) || request.headers.has('content-encoding')) throw new CmsError(415, 'unsupported_media_type');
  const meta = metadata(request.headers.get('x-cms-metadata'));
  const reservation = budget ? await reserveUpload(budget.db, budget.actor, MAX_MEDIA_BYTES) : null;
  let writeStarted = false;
  try {
  const input = await boundedMediaBytes(request.body, request.headers.get('content-length'));
  inspectMedia(input, mime);
  let output: Uint8Array<ArrayBuffer>;
  try {
    // Decode and re-encode, not just magic-byte validation. This also strips user filenames,
    // EXIF/location data, trailing payloads and other ancillary metadata from stored photos.
    const image = await env.CMS_IMAGES.input(new Blob([input]).stream()).output({ format: mime, quality: 85, anim: false });
    const response = image.response();
    if (!response.ok || response.headers.get('content-type') !== mime) invalid();
    output = await boundedMediaBytes(response.body, response.headers.get('content-length'));
  } catch (error) { if (error instanceof CmsError) throw error; invalid(); }
  const { width, height, extension } = inspectMedia(output, mime);
  const id = `upload-${crypto.randomUUID()}`, key = `${id}.${extension}`;
  const media: UploadedCmsMedia = { id, src: `/media/${key}`, alt: meta.alt, ...(meta.caption ? { caption: meta.caption } : {}), width, height, source: 'cms-upload' };
  // Once R2 has been called, a transport error is ambiguous. Keep the reservation
  // until an operator reconciles it; never undercount a possibly stored orphan.
  if (budget && reservation) await markUploadWrite(budget.db, reservation, `uploads/${key}`);
  writeStarted = true;
  await env.CMS_MEDIA.put(`uploads/${key}`, output, { httpMetadata: { contentType: mime }, customMetadata: { uploadedAt: new Date().toISOString() } });
  if (budget && reservation) await finishUpload(budget.db, reservation, `uploads/${key}`, output.byteLength);
  return { media, previewSrc: `/api/admin/media/${key}`, ...(meta.title ? { title: meta.title } : {}) };
  } finally {
    if (budget && reservation && !writeStarted) await releaseUpload(budget.db, reservation);
  }
}

/** A library row alone does not make an upload public: a visible published image must use it. */
export function publishedMediaReferenced(document: object, src: string): boolean {
  const record = document as Record<string, unknown>;
  const entry = Array.isArray(record.media) ? record.media.find(item => item && item.src === src) : null;
  if (!entry) return false;
  function referenced(value: unknown): boolean {
    if (value === src) return true;
    if (Array.isArray(value)) return value.some(referenced);
    if (!value || typeof value !== 'object') return false;
    return Object.entries(value).some(([key, item]) => key !== 'media' && (key === 'mediaId' ? item === entry.id : referenced(item)));
  }
  return referenced(document);
}

export async function serveMedia(key: string, request: Request, env: CmsMediaEnv): Promise<Response> {
  if (!env.CMS_MEDIA) throw new CmsError(503, 'media_unavailable');
  const object = await env.CMS_MEDIA.get(`uploads/${key}`);
  if (!object) throw new CmsError(404, 'not_found');
  const mime = key.endsWith('.jpg') ? 'image/jpeg' : key.endsWith('.png') ? 'image/png' : 'image/webp';
  if (object.httpMetadata?.contentType !== mime) throw new CmsError(503, 'media_unavailable');
  // Public reads also recheck publication on every request, including after rollback/unpublish.
  return new Response(request.method === 'HEAD' ? null : object.body, { headers: { 'Content-Type': mime, 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin', 'Content-Disposition': 'inline' } });
}
