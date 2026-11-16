/**
 * A browser-local safety copy of the editor's unsaved document. It never replaces saving: it only lets the owner
 * get unsaved edits back after a crash, a closed tab or a version conflict. Every storage call is guarded, because
 * storage can be missing, full or blocked (private windows), and the editor must work without it.
 */
export const UNSAVED_COPY_KEY = 'fgt-cms-unsaved-v1';
/** Edits made while an older copy is still waiting for Restore / Discard. The older copy is never overwritten. */
export const PENDING_COPY_KEY = 'fgt-cms-unsaved-v1-pending';
/** Quiet time after the last edit before the copy is written. Writing serialises the whole document, so never per keystroke. */
export const UNSAVED_COPY_DELAY_MS = 1000;

export interface UnsavedCopy {
  /** Server version the copy was edited from. */
  baseVersion: number;
  savedAt: string;
  /** The document as JSON text, so it can be compared with the saved draft without parsing. */
  json: string;
}

function storage(): Storage | null {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function readUnsavedCopy(key: string = UNSAVED_COPY_KEY): UnsavedCopy | null {
  try {
    const raw = storage()?.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const { v, baseVersion, savedAt, json } = parsed as Record<string, unknown>;
    if (v !== 1 || typeof baseVersion !== 'number' || !Number.isSafeInteger(baseVersion) || typeof savedAt !== 'string' || typeof json !== 'string' || !json) return null;
    return { baseVersion, savedAt, json };
  } catch { return null; }
}

/** Returns false when the browser refused (quota, blocked storage); callers ignore it. */
export function writeUnsavedCopy(copy: UnsavedCopy, key: string = UNSAVED_COPY_KEY): boolean {
  try {
    const store = storage();
    if (!store) return false;
    store.setItem(key, JSON.stringify({ v: 1, ...copy }));
    return true;
  } catch { return false; }
}

/** Clears the main copy and, unless `keepPending`, the pending one too. */
export function clearUnsavedCopy(keepPending = false): void {
  try { storage()?.removeItem(UNSAVED_COPY_KEY); } catch { /* nothing to clear */ }
  if (!keepPending) clearPendingCopy();
}
export function clearPendingCopy(): void {
  try { storage()?.removeItem(PENDING_COPY_KEY); } catch { /* nothing to clear */ }
}
/** After the owner settles the older copy, edits written meanwhile become the main copy. */
export function promotePendingCopy(): void {
  const pending = readUnsavedCopy(PENDING_COPY_KEY);
  clearPendingCopy();
  if (pending) writeUnsavedCopy(pending);
}

/** "15 Nov 2026, 22:55" in the editor language, in the viewer's own time zone. */
export function formatWhen(iso: string, language: 'en' | 'fr' | 'es'): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const locale = language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-GB';
  try {
    const day = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
    const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
    return `${day}, ${time}`;
  } catch { return null; }
}
