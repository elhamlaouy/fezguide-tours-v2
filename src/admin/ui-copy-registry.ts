import type { Language } from '../types';
import { UI_COPY_META } from '../cms/ui-copy';

export interface Texts { en: string; fr: string; es: string }
export interface UiCopyEntry { key: string; label: string; group: string; defaults: Texts }

const isText = (value: unknown): value is string => typeof value === 'string';
const isTexts = (value: unknown): value is Texts => !!value && typeof value === 'object'
  && isText((value as Texts).en) && isText((value as Texts).fr) && isText((value as Texts).es);
function pickText(value: unknown, language: Language): string {
  if (isText(value)) return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const candidate of [language, 'en', 'fr', 'es']) if (isText(record[candidate]) && String(record[candidate]).trim()) return String(record[candidate]);
  }
  return '';
}
function words(raw: string): string {
  const spaced = raw.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').trim().toLowerCase();
  return spaced ? spaced[0].toUpperCase() + spaced.slice(1) : raw;
}
/** `ui.common.bookNow` → "Book now". Used only when a registry entry carries no human label. */
export function humanizeUiCopyKey(key: string): string { return words(key.split('.').at(-1) ?? key); }
function groupOf(key: string): string {
  const parts = key.split('.');
  return words(parts.length > 2 ? parts[1] : parts.length > 1 ? parts[0] : 'other');
}
/**
 * Reads the shared registry defensively. An entry is either today's plain `{ en, fr, es }`, or
 * `{ label?, group?, defaults: { en, fr, es } }` (label/group may themselves be strings or EN/FR/ES objects).
 */
export function uiCopyRegistry(supported: Record<string, unknown>, language: Language): UiCopyEntry[] {
  const entries: UiCopyEntry[] = [];
  for (const [key, raw] of Object.entries(supported)) {
    const record = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const defaults = isTexts(record.defaults) ? record.defaults : isTexts(raw) ? raw : { en: '', fr: '', es: '' };
    // Human labels/groups come from the entry itself or from the shared metadata registry (UI_COPY_META).
    const meta = Object.hasOwn(UI_COPY_META, key) ? UI_COPY_META[key] : undefined;
    const label = pickText(record.label, language).trim() || pickText(meta?.label, language).trim() || humanizeUiCopyKey(key);
    const group = pickText(record.group, language).trim() || pickText(meta?.group, language).trim() || groupOf(key);
    entries.push({ key, label, group, defaults: { en: defaults.en, fr: defaults.fr, es: defaults.es } });
  }
  return entries;
}
export function uiCopyLabel(key: string, supported: Record<string, unknown>, language: Language): string {
  if (!Object.hasOwn(supported, key)) return humanizeUiCopyKey(key);
  return uiCopyRegistry({ [key]: supported[key] }, language)[0]?.label ?? humanizeUiCopyKey(key);
}
