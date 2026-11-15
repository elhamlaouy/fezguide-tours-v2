import type { CmsDocument } from '../cms/schema';
import type { Language } from '../types';
import { editorLabel } from './editor-labels';

const LANGUAGES: readonly string[] = ['en', 'fr', 'es'];
const NAME_KEYS = ['title', 'name', 'label', 'question', 'alt'] as const;

export function languageIndex(language: Language): 0 | 1 | 2 { return language === 'fr' ? 1 : language === 'es' ? 2 : 0; }

function pick(value: unknown, preferred: Language): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const record = value as Record<string, unknown>;
  for (const language of [preferred, 'en', 'fr', 'es']) {
    const candidate = record[language];
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }
  return '';
}
function clip(value: string): string {
  const flat = value.replace(/\s+/g, ' ').trim();
  return flat.length > 60 ? `${flat.slice(0, 57)}…` : flat;
}
/** The owner-facing name of a list item (tour, post, team member, FAQ, link, card…) in the editor language. */
export function itemName(item: unknown, language: Language): string {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return '';
  const record = item as Record<string, unknown>;
  for (const key of NAME_KEYS) {
    const name = clip(pick(record[key], language));
    if (name) return name;
  }
  return '';
}
/** Name of a referenced library row (a tour id inside a section, a FAQ id, a photo id…). */
export function referenceName(collection: string | undefined, id: unknown, document: CmsDocument, language: Language): string {
  if (!collection || typeof id !== 'string') return '';
  const rows = (document as unknown as Record<string, unknown>)[collection];
  if (!Array.isArray(rows)) return '';
  const row = rows.find(item => (item as { id?: string } | undefined)?.id === id) as Record<string, unknown> | undefined;
  if (!row) return '';
  return itemName(row, language) || (collection === 'reviews' ? clip(pick(row.author, language)) : '');
}
/** "1. Chefchaouen Day Trip from Fez": lists count from 1 and carry the item's own name. */
export function numberedLabel(position: number, name: string, language: Language): string {
  return `${position + 1}. ${name || editorLabel('itemNumber', language)}`;
}
export function isLanguageKey(segment: string): boolean { return LANGUAGES.includes(segment); }
