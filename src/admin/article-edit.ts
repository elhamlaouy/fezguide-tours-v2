// Blog article toolbar: pure text transforms (no DOM, no React). Offsets are textarea selection offsets.
// The syntax produced here is exactly the one documented by ARTICLE_SYNTAX in src/cms/article-format.ts.
import { isSafeCmsUrl, type CmsDocument } from '../cms/schema';
import type { Language } from '../types';

export type ArticleLineFormat = 'heading' | 'subheading' | 'bullets' | 'numbers' | 'quote';
export type ArticleInlineFormat = 'bold' | 'italic';
export interface ArticleEdit { text: string; start: number; end: number }

const LINE_PREFIX: Record<ArticleLineFormat, string> = { heading: '## ', subheading: '### ', bullets: '- ', numbers: '1. ', quote: '> ' };
const ANY_LINE_PREFIX = /^(?:#{2,3}[ \t]+|-[ \t]+|\d{1,3}[.)][ \t]+|>[ \t]?)/;

function clampRange(text: string, start: number, end: number): [number, number] {
  const low = Math.min(start, end), high = Math.max(start, end);
  return [Math.max(0, Math.min(text.length, low)), Math.max(0, Math.min(text.length, high))];
}
function lineKindOf(line: string): ArticleLineFormat | null {
  const t = line.trimStart();
  if (/^###[ \t]+/.test(t)) return 'subheading';
  if (/^##[ \t]+/.test(t)) return 'heading';
  if (/^-[ \t]+/.test(t)) return 'bullets';
  if (/^\d{1,3}[.)][ \t]+/.test(t)) return 'numbers';
  if (t.startsWith('>')) return 'quote';
  return null;
}
const bare = (line: string) => line.trimStart().replace(ANY_LINE_PREFIX, '');

/**
 * Heading / subheading / lists / quote apply to every line touched by the selection (or the line holding the cursor).
 * Using the same format again removes it. Blank lines inside a selection are left alone. A selection ends up around
 * the changed lines; a bare cursor stays at the same place in its text.
 */
export function applyArticleLineFormat(text: string, start: number, end: number, format: ArticleLineFormat): ArticleEdit {
  const [a, b] = clampRange(text, start, end);
  const from = text.lastIndexOf('\n', a - 1) + 1;
  const stopAt = b > a && text[b - 1] === '\n' ? b - 1 : b; // a selection ending right after a line break leaves the next line alone
  let to = text.indexOf('\n', stopAt);
  if (to === -1) to = text.length;
  const lines = text.slice(from, to).split('\n');
  const filled = lines.filter(line => line.trim());
  const remove = filled.length > 0 && filled.every(line => lineKindOf(line) === format);
  let n = 0;
  const changed = lines.map(line => {
    if (!line.trim()) return a === b && lines.length === 1 && !remove ? (format === 'numbers' ? '1. ' : LINE_PREFIX[format]) : line;
    return remove ? bare(line) : `${format === 'numbers' ? `${++n}. ` : LINE_PREFIX[format]}${bare(line)}`;
  });
  const joined = changed.join('\n');
  const next = text.slice(0, from) + joined + text.slice(to);
  if (a !== b) return { text: next, start: from, end: from + joined.length };
  const line = lines[0], after = changed[0];
  if (!line.trim()) { const caret = from + after.length; return { text: next, start: caret, end: caret }; }
  const body = bare(line).length;
  const shift = (after.length - body) - (line.length - body);
  const caret = Math.max(from + (after.length - body), a + shift);
  return { text: next, start: caret, end: caret };
}

const PLACEHOLDER = {
  bold: { en: 'bold text', fr: 'texte en gras', es: 'texto en negrita' },
  italic: { en: 'italic text', fr: 'texte en italique', es: 'texto en cursiva' },
} as const;

/**
 * Bold / italic wrap the selection, line by line and never around leading/trailing spaces (those would not render).
 * With no selection a placeholder is inserted and selected, so typing replaces it. Using it again on wrapped text
 * removes the markers.
 */
export function applyArticleInlineFormat(text: string, start: number, end: number, format: ArticleInlineFormat, language: Language = 'en'): ArticleEdit {
  const marker = format === 'bold' ? '**' : '*';
  const [a, b] = clampRange(text, start, end);
  if (a === b) {
    const word = PLACEHOLDER[format][language];
    return { text: `${text.slice(0, a)}${marker}${word}${marker}${text.slice(a)}`, start: a + marker.length, end: a + marker.length + word.length };
  }
  const selected = text.slice(a, b);
  const outer = text.slice(a - marker.length, a) === marker && text.slice(b, b + marker.length) === marker
    && (format === 'bold' ? text[a - 3] !== '*' && text[b + 2] !== '*' : text[a - 2] !== '*' && text[b + 1] !== '*');
  if (outer) return { text: text.slice(0, a - marker.length) + selected + text.slice(b + marker.length), start: a - marker.length, end: b - marker.length };
  const inner = selected.length > marker.length * 2 && selected.startsWith(marker) && selected.endsWith(marker) && !selected.includes('\n')
    && (format === 'bold' ? !selected.startsWith('***') : !selected.startsWith('**'));
  if (inner) { const plain = selected.slice(marker.length, -marker.length); return { text: text.slice(0, a) + plain + text.slice(b), start: a, end: a + plain.length }; }
  const wrapped = selected.split('\n').map(line => {
    const body = line.trim();
    if (!body) return line;
    const lead = line.slice(0, line.indexOf(body));
    return `${lead}${marker}${body}${marker}${line.slice(lead.length + body.length)}`;
  }).join('\n');
  return { text: text.slice(0, a) + wrapped + text.slice(b), start: a, end: a + wrapped.length };
}

/** Friendly check of an address typed by the owner. A bare "www.example.com" becomes "https://www.example.com". */
export function checkArticleLink(raw: string): { url: string; valid: boolean } {
  let url = raw.trim();
  if (/^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[/?#]\S*)?$/i.test(url) && !/^[a-z][a-z0-9+.-]*:/i.test(url)) url = `https://${url}`;
  return { url, valid: isSafeCmsUrl(url) };
}
const cleanLabel = (value: string, fallback: string) => value.replace(/[[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 300) || fallback;

/** Replaces the selection by `[text](address)`; the caret ends right after the link. */
export function insertArticleLink(text: string, start: number, end: number, url: string, label: string): ArticleEdit {
  const [a, b] = clampRange(text, start, end);
  const link = `[${cleanLabel(label, url)}](${url})`;
  return { text: text.slice(0, a) + link + text.slice(b), start: a + link.length, end: a + link.length };
}

/** Puts `![description](media:id)` alone on its own line (blank lines around it), after the line holding the selection end. */
export function insertArticlePhoto(text: string, start: number, end: number, mediaId: string, description: string): ArticleEdit {
  const [, b] = clampRange(text, start, end);
  const lineStart = text.lastIndexOf('\n', b - 1) + 1;
  let lineEnd = text.indexOf('\n', b);
  if (lineEnd === -1) lineEnd = text.length;
  const emptyLine = !text.slice(lineStart, lineEnd).trim();
  const at = emptyLine ? lineStart : lineEnd;
  const before = text.slice(0, at).replace(/\n+$/, '');
  const after = text.slice(emptyLine ? lineEnd : at).replace(/^\n+/, '');
  const line = `![${cleanLabel(description, 'Photo')}](media:${mediaId})`;
  const head = before ? `${before}\n\n` : '';
  const caret = head.length + line.length;
  return { text: `${head}${line}${after ? `\n\n${after}` : '\n'}`, start: caret, end: caret };
}

/** Today as YYYY-MM-DD in the editor's own time zone (what a date picker shows). */
export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
/** A date `<input type="date">` can show: YYYY-MM-DD, or the older "March 5, 2025" spelling converted. '' when neither. */
export function dateInputValue(stored: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(stored);
  const old = /^([A-Za-z]+) (\d{1,2}), (\d{4})$/.exec(stored);
  const month = old ? MONTHS.indexOf(old[1].toLowerCase()) + 1 : 0;
  const parts = iso ? [Number(iso[1]), Number(iso[2]), Number(iso[3])] : old && month ? [Number(old[3]), month, Number(old[2])] : null;
  if (!parts) return '';
  const [year, m, day] = parts;
  const probe = new Date(Date.UTC(year, m - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== day) return '';
  return `${String(year).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
export const isIsoDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value) && dateInputValue(value) === value;

/** New posts start from the Blog page's own hero photo (the address of its library row), when it has one. */
export function blogPageCover(document: CmsDocument): string | undefined {
  const hero = document.pages.find(page => page.id === 'blog')?.sections.find(section => section.type === 'hero');
  const mediaId = hero?.type === 'hero' ? hero.image?.mediaId : undefined;
  return mediaId ? document.media.find(item => item.id === mediaId)?.src : undefined;
}
/** Posts created in this editing session that still carry a placeholder cover (cleared when the owner picks one). */
export const coversToChoose = new Set<string>();

/** Draft uploads are private: the editor reads them through the admin media route (never persisted). */
export function adminMediaSrc(src: string): string {
  return /^\/media\/upload-[a-f0-9-]{36}\.(jpg|png|webp)$/.test(src) ? src.replace('/media/', '/api/admin/media/') : src;
}
