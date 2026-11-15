// Plain-text article format for blog posts (stored in blogPosts[].content, one string per language).
// This module is pure (no React, no DOM) so the client renderer and the Worker snapshot share one parser.
//
// Safety model: the text is only ever parsed into a small typed tree (headings, paragraphs, lists, quotes,
// images, and bold/italic/link spans). No HTML is accepted, stored or produced from CMS text; every string is
// later rendered as a text node (React) or escaped (snapshot). Links must pass isSafeCmsUrl, photos are
// referenced by library id only. Parsing is a single linear pass with hard limits (see ARTICLE_LIMITS).
import type { Language } from '../types';
import type { CmsDocument } from './schema';
import { isSafeCmsUrl } from './schema';
import { resolveImage } from './render-utils';

export const ARTICLE_LIMITS = {
  /** Input beyond this many characters is ignored (CMS text fields are already capped at 20,000). */
  chars: 100_000,
  blocks: 1_500,
  listItems: 300,
  /** Maximum open bold/italic markers; deeper nesting stays literal text. */
  inlineDepth: 4,
  linkLabel: 1_000,
  linkUrl: 2_048,
} as const;

export type ArticleSpan =
  | { t: 'text'; text: string }
  | { t: 'strong'; children: ArticleSpan[] }
  | { t: 'em'; children: ArticleSpan[] }
  | { t: 'link'; href: string; children: ArticleSpan[] };

export type ArticleBlock =
  | { type: 'heading'; level: 2 | 3; spans: ArticleSpan[] }
  | { type: 'paragraph'; spans: ArticleSpan[] }
  | { type: 'list'; ordered: boolean; items: ArticleSpan[][] }
  | { type: 'quote'; spans: ArticleSpan[] }
  | { type: 'image'; mediaId: string; alt: string; caption?: string };

export interface Article {
  blocks: ArticleBlock[];
  /** False when the text is plain paragraphs only: renderers then keep the legacy plain-text layout. */
  formatted: boolean;
}

/** Same shape as the CMS media-library ids (schema `id`). */
export const ARTICLE_MEDIA_ID = /^[a-z0-9][a-z0-9-]{0,79}$/;
const IMAGE_LINE = /^!\[([^\]\n]{0,300})\]\(media:([a-z0-9][a-z0-9-]{0,79})(?: "([^"\n]{0,300})")?\)$/;
const HEADING_LINE = /^(#{2,3})[ \t]+(\S.*)$/;
const BULLET_LINE = /^-[ \t]+(\S.*)$/;
const NUMBER_LINE = /^\d{1,3}[.)][ \t]+(\S.*)$/;
const QUOTE_LINE = /^>[ \t]?(.*)$/;

const SYNTAX_CHAR = /[*[\\]/;
const isSpace = (ch: string | undefined) => ch === undefined || ch === ' ' || ch === '\t' || ch === '\n';

function pushText(list: ArticleSpan[], text: string) {
  if (!text) return;
  const last = list[list.length - 1];
  if (last?.t === 'text') last.text += text; else list.push({ t: 'text', text });
}
function pushSpans(list: ArticleSpan[], spans: ArticleSpan[]) {
  for (const span of spans) if (span.t === 'text') pushText(list, span.text); else list.push(span);
}

interface Frame { kind: 'strong' | 'em' | null; children: ArticleSpan[] }

/** Single pass with a bounded stack: unclosed markers fall back to literal text. `links: false` inside labels. */
function parseInline(src: string, state: { formatted: boolean }, links = true): ArticleSpan[] {
  if (!SYNTAX_CHAR.test(src)) return src ? [{ t: 'text', text: src }] : [];
  const stack: Frame[] = [{ kind: null, children: [] }];
  const top = () => stack[stack.length - 1];
  let buffer = '';
  const flush = () => { pushText(top().children, buffer); buffer = ''; };
  // Memoised scans keep unmatched '[' runs linear.
  let closeFrom = -1, closeAt = -1;
  let urlKey = -2, urlEnd = -1;
  const firstClose = (from: number) => {
    if (closeFrom !== -1 && from >= closeFrom && (closeAt === -1 ? true : from <= closeAt)) return closeAt;
    closeAt = src.indexOf(']', from); closeFrom = from; return closeAt;
  };
  const markerLiteral = (kind: 'strong' | 'em') => (kind === 'strong' ? '**' : '*');
  /** Close down to `index` (inclusive): frames above it never closed, so they dissolve into literal text. */
  const closeFrame = (index: number) => {
    while (stack.length - 1 > index) {
      const dead = stack.pop()!;
      pushText(top().children, markerLiteral(dead.kind!));
      pushSpans(top().children, dead.children);
    }
    const done = stack.pop()!;
    if (done.children.length) { top().children.push({ t: done.kind!, children: done.children }); state.formatted = true; }
    else pushText(top().children, markerLiteral(done.kind!).repeat(2)); // "****" and "** **" stay literal
  };
  const length = src.length;
  for (let i = 0; i < length;) {
    const ch = src[i];
    if (ch === '\\' && (src[i + 1] === '*' || src[i + 1] === '[')) { buffer += src[i + 1]; i += 2; state.formatted = true; continue; }
    if (ch === '[' && links) {
      const close = firstClose(i + 1);
      if (close !== -1 && close - i <= ARTICLE_LIMITS.linkLabel && src[close + 1] === '(') {
        if (urlKey !== close) {
          urlKey = close; urlEnd = -1;
          const limit = Math.min(length, close + 2 + ARTICLE_LIMITS.linkUrl + 1);
          for (let k = close + 2, depth = 0; k < limit; k++) {
            const c = src[k];
            if (c === '(') depth++;
            else if (c === ')') { if (depth === 0) { urlEnd = k; break; } depth--; }
            if (c === ' ' || c === '\t' || c === '\n') break;
          }
        }
        if (urlEnd !== -1) {
          const href = src.slice(close + 2, urlEnd);
          const label = src.slice(i + 1, close);
          if (label.trim()) {
            flush();
            const inner = parseInline(label, state, false);
            if (isSafeCmsUrl(href)) top().children.push({ t: 'link', href, children: inner });
            else pushSpans(top().children, inner); // unsafe destination: the label stays, as plain text
            state.formatted = true;
            i = urlEnd + 1;
            continue;
          }
        }
      }
    }
    if (ch === '*') {
      let end = i; while (src[end] === '*') end++;
      let run = end - i;
      while (run > 0) {
        const prev = src[i - 1];
        // '***' closing an inner italic closes that first; otherwise two or more stars are '**'.
        const kind: 'strong' | 'em' = run >= 3 && top().kind === 'em' && !isSpace(prev) ? 'em' : run >= 2 ? 'strong' : 'em';
        const size = kind === 'strong' ? 2 : 1;
        let open = -1;
        for (let s = stack.length - 1; s > 0; s--) if (stack[s].kind === kind) { open = s; break; }
        if (open > 0 && !isSpace(prev)) {
          flush();
          closeFrame(open);
        } else if (stack.length - 1 < ARTICLE_LIMITS.inlineDepth && !isSpace(src[i + size])) {
          flush();
          stack.push({ kind, children: [] });
        } else buffer += markerLiteral(kind);
        i += size; run -= size;
      }
      continue;
    }
    // Plain run: jump to the next character that can start syntax.
    let next = i + 1;
    while (next < length && src[next] !== '*' && src[next] !== '[' && src[next] !== '\\') next++;
    buffer += src.slice(i, next); i = next;
  }
  flush();
  while (stack.length > 1) {
    const dead = stack.pop()!;
    pushText(top().children, markerLiteral(dead.kind!));
    pushSpans(top().children, dead.children);
  }
  return stack[0].children;
}

/** Parse one article string. Linear time; never throws; unknown or unsafe syntax stays text. */
export function parseArticle(text: string | undefined | null): Article {
  const source = typeof text === 'string' ? text.slice(0, ARTICLE_LIMITS.chars) : '';
  const state = { formatted: false };
  const blocks: ArticleBlock[] = [];
  let paragraph: string[] = [];
  let quote: string[] | null = null;
  let list: { ordered: boolean; items: ArticleSpan[][] } | null = null;
  const add = (block: ArticleBlock) => { if (blocks.length < ARTICLE_LIMITS.blocks) blocks.push(block); };
  const endParagraph = () => { if (paragraph.length) add({ type: 'paragraph', spans: parseInline(paragraph.join('\n'), state) }); paragraph = []; };
  const endQuote = () => { if (quote) { const body = quote.join('\n').trim(); if (body) add({ type: 'quote', spans: parseInline(body, state) }); } quote = null; };
  const endList = () => { if (list?.items.length) add({ type: 'list', ordered: list.ordered, items: list.items }); list = null; };
  const endAll = () => { endParagraph(); endQuote(); endList(); };

  let start = 0;
  while (start <= source.length && blocks.length < ARTICLE_LIMITS.blocks) {
    let stop = source.indexOf('\n', start);
    if (stop === -1) stop = source.length;
    const line = source.slice(start, stop).replace(/\r$/, '');
    start = stop + 1;
    const trimmed = line.trim();
    if (!trimmed) { endAll(); continue; }
    const first = trimmed[0];
    const image = first === '!' ? IMAGE_LINE.exec(trimmed) : null;
    if (image) {
      endAll();
      add({ type: 'image', mediaId: image[2], alt: image[1].trim(), ...(image[3]?.trim() ? { caption: image[3].trim() } : {}) });
      state.formatted = true;
      continue;
    }
    const heading = first === '#' ? HEADING_LINE.exec(trimmed) : null;
    if (heading) {
      endAll();
      add({ type: 'heading', level: heading[1].length === 2 ? 2 : 3, spans: parseInline(heading[2].trim(), state) });
      state.formatted = true;
      continue;
    }
    const bullet = first === '-' ? BULLET_LINE.exec(trimmed) : null, number = bullet || first < '0' || first > '9' ? null : NUMBER_LINE.exec(trimmed);
    if (bullet || number) {
      const ordered = !bullet;
      endParagraph(); endQuote();
      if (list && list.ordered !== ordered) endList();
      if (!list) list = { ordered, items: [] };
      if (list.items.length < ARTICLE_LIMITS.listItems) list.items.push(parseInline((bullet ?? number)![1].trim(), state));
      state.formatted = true;
      continue;
    }
    const quoted = first === '>' ? QUOTE_LINE.exec(trimmed) : null;
    if (quoted) {
      endParagraph(); endList();
      (quote ??= []).push(quoted[1]);
      state.formatted = true;
      continue;
    }
    endQuote(); endList();
    paragraph.push(trimmed);
  }
  endAll();
  return { blocks, formatted: state.formatted };
}

/** Library ids of every photo line, in order, without duplicates (also unknown ids: callers resolve them). */
export function articleMediaIds(text: string | undefined | null): string[] {
  if (typeof text !== 'string' || !text.includes('](media:')) return [];
  const ids = new Set<string>();
  const source = text.slice(0, ARTICLE_LIMITS.chars);
  let start = 0, count = 0;
  while (start <= source.length && count++ < ARTICLE_LIMITS.blocks * 4) {
    let stop = source.indexOf('\n', start);
    if (stop === -1) stop = source.length;
    const match = IMAGE_LINE.exec(source.slice(start, stop).trim());
    if (match) ids.add(match[2]);
    start = stop + 1;
  }
  return [...ids];
}

/** Photo ids used by any language of a post's article text. */
export function postArticleMediaIds(content: Partial<Record<Language, string>> | undefined): string[] {
  return [...new Set((['en', 'fr', 'es'] as const).flatMap(language => articleMediaIds(content?.[language])))];
}

/** Plain text of spans (alt text, tests). */
export function spansText(spans: ArticleSpan[]): string {
  return spans.map(span => span.t === 'text' ? span.text : spansText(span.children)).join('');
}

export interface ArticleSyntaxItem { id: string; syntax: string; label: Record<Language, string>; example: string }
/** Machine-readable syntax list (for a toolbar). */
export const ARTICLE_SYNTAX_ITEMS: ArticleSyntaxItem[] = [
  { id: 'heading', syntax: '## ', example: '## Title', label: { en: 'Heading', fr: 'Titre', es: 'Título' } },
  { id: 'subheading', syntax: '### ', example: '### Subtitle', label: { en: 'Subheading', fr: 'Sous-titre', es: 'Subtítulo' } },
  { id: 'bullets', syntax: '- ', example: '- First\n- Second', label: { en: 'Bullet list', fr: 'Liste à puces', es: 'Lista con viñetas' } },
  { id: 'numbers', syntax: '1. ', example: '1. First\n2. Second', label: { en: 'Numbered list', fr: 'Liste numérotée', es: 'Lista numerada' } },
  { id: 'quote', syntax: '> ', example: '> A quote', label: { en: 'Quote', fr: 'Citation', es: 'Cita' } },
  { id: 'bold', syntax: '**text**', example: '**bold**', label: { en: 'Bold', fr: 'Gras', es: 'Negrita' } },
  { id: 'italic', syntax: '*text*', example: '*italic*', label: { en: 'Italic', fr: 'Italique', es: 'Cursiva' } },
  { id: 'link', syntax: '[text](https://…)', example: '[Book a tour](/our-fez-tours)', label: { en: 'Link', fr: 'Lien', es: 'Enlace' } },
  { id: 'photo', syntax: '![description](media:photo-id "caption")', example: '![The tannery](media:media-12 "Chouara tannery")', label: { en: 'Photo', fr: 'Photo', es: 'Foto' } },
];

/** Short, human help text shown next to the article editor, per language. */
export const ARTICLE_SYNTAX: Record<Language, string> = {
  en: [
    'Write normally; leave a blank line between paragraphs.',
    '## Heading        ### Subheading',
    '- bullet item     1. numbered item     > quote',
    '**bold**   *italic*',
    '[link text](https://example.com)  – also /page, mailto: and tel: links',
    '![photo description](media:photo-id "optional caption")  – a photo from your library, alone on its line',
    'No HTML is used. Unsafe links and unknown photos are shown as plain text or left out.',
  ].join('\n'),
  fr: [
    'Écrivez normalement ; laissez une ligne vide entre les paragraphes.',
    '## Titre        ### Sous-titre',
    '- élément à puce     1. élément numéroté     > citation',
    '**gras**   *italique*',
    '[texte du lien](https://example.com)  – aussi /page, mailto: et tel:',
    '![description de la photo](media:id-photo "légende facultative")  – une photo de votre bibliothèque, seule sur sa ligne',
    'Aucun HTML n’est utilisé. Les liens non sûrs et les photos inconnues sont affichés en texte simple ou ignorés.',
  ].join('\n'),
  es: [
    'Escribe con normalidad; deja una línea en blanco entre párrafos.',
    '## Título        ### Subtítulo',
    '- elemento con viñeta     1. elemento numerado     > cita',
    '**negrita**   *cursiva*',
    '[texto del enlace](https://example.com)  – también /página, mailto: y tel:',
    '![descripción de la foto](media:id-foto "pie opcional")  – una foto de tu biblioteca, sola en su línea',
    'No se usa HTML. Los enlaces no seguros y las fotos desconocidas se muestran como texto o se omiten.',
  ].join('\n'),
};

/**
 * The article text to show for a blog post page's `content` section in one language, or undefined when the
 * page must keep showing its section blocks exactly as before:
 *  - the post's own text has no article syntax (plain text is already mirrored into the section), or
 *  - the owner customised the section with non-paragraph blocks (a deliberate detached layout).
 * Formatted post text always wins, independently per language.
 */
export function articleOverride(post: { content: Partial<Record<Language, string>> } | undefined, section: { blocks: { type: string }[] } | undefined, language: Language): string | undefined {
  if (!post || section?.blocks.some(block => block.type !== 'paragraph')) return undefined;
  const text = post.content[language];
  return typeof text === 'string' && parseArticle(text).formatted ? text : undefined;
}

export const ARTICLE_IMAGE_SIZES ='(min-width: 48rem) 42rem, calc(100vw - 3rem)';

/** Resolves a `media:<id>` photo through the library (alt = description, caption only when written); undefined renders nothing. */
export function articleMedia(document: CmsDocument | null | undefined, mediaId: string, alt: string, caption: string | undefined, language: Language) {
  if (!document) return undefined;
  const text = (value: string) => ({ en: value, fr: value, es: value });
  return resolveImage(document, { mediaId, alt: text(alt), caption: text(caption ?? '') }, language);
}
