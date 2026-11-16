import type { AdminRevision } from './admin-api';
import { safetyCopy } from './safety-copy';
import { formatWhen } from './unsaved-copy';

export interface RevisionView { when: string; what: string; who: string; version: number; live: boolean; current: boolean }

/** The editor's email, "Automated test" for a service token, and a plain "Editor" for an opaque account id. */
export function whoDid(actor: string, language: 'en' | 'fr' | 'es'): string {
  const t = safetyCopy(language);
  if (actor.startsWith('service:')) return t.whoTest;
  if (/^[^\s@]+@[^\s@]+$/.test(actor)) return actor;
  return t.whoEditor;
}

export function describeRevision(revision: AdminRevision, language: 'en' | 'fr' | 'es', draftRevision: number | null, publishedRevision: number | null): RevisionView {
  const t = safetyCopy(language);
  const what = revision.kind === 'publish' ? t.actPublished
    : revision.kind === 'rollback' ? t.actRolledBack(typeof revision.source_revision === 'number' ? revision.source_revision : null)
      : t.actSaved;
  return {
    when: formatWhen(revision.created_at, language) ?? t.historyWhenUnknown,
    what,
    who: whoDid(typeof revision.actor === 'string' ? revision.actor : '', language),
    version: revision.version,
    live: revision.version === publishedRevision,
    current: revision.version === draftRevision,
  };
}
