import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CmsDocument, CmsMedia } from '../cms/schema';
import type { Language } from '../types';
import { ArticleBody } from '../cms/ArticleBody';
import { ARTICLE_SYNTAX, ARTICLE_SYNTAX_ITEMS, articleMediaIds } from '../cms/article-format';
import {
  adminMediaSrc, applyArticleInlineFormat, applyArticleLineFormat, checkArticleLink, insertArticleLink, insertArticlePhoto, type ArticleEdit,
} from './article-edit';
import { blogCopy } from './blog-copy';
import { languageName } from './editor-workspace';
import { MediaPicker } from './MediaPicker';

/** The preview trails typing by this long, so keystrokes stay instant even on a phone. */
export const ARTICLE_PREVIEW_DELAY_MS = 200;
type ToolId = 'heading' | 'subheading' | 'bold' | 'italic' | 'bullets' | 'numbers' | 'quote' | 'link' | 'photo';
const TOOL_ORDER: readonly ToolId[] = ['heading', 'subheading', 'bold', 'italic', 'bullets', 'numbers', 'quote', 'link', 'photo'];
const HINT_KEY = { heading: 'hintHeading', subheading: 'hintSubheading', bold: 'hintBold', italic: 'hintItalic', bullets: 'hintBullets', numbers: 'hintNumbers', quote: 'hintQuote', link: 'hintLink', photo: 'hintPhoto' } as const;

function useTrailing<T>(value: T, delay: number, resetKey: string): T {
  const [state, setState] = useState({ key: resetKey, value });
  useEffect(() => {
    const timer = setTimeout(() => setState(previous => Object.is(previous.value, value) && previous.key === resetKey ? previous : { key: resetKey, value }), delay);
    return () => clearTimeout(timer);
  }, [value, resetKey, delay]);
  return state.key === resetKey ? state.value : value;
}

/** The formatted article as visitors will read it (the real ArticleBody), refreshed a moment after typing. */
const ArticlePreview = React.memo(function ArticlePreview({ text, locale, language, document }: { text: string; locale: Language; language: Language; document: CmsDocument }) {
  const t = blogCopy(language);
  const ids = useMemo(() => articleMediaIds(text), [text]);
  const signature = ids.map(id => { const media = document.media.find(item => item.id === id); return media ? `${id}|${media.src}|${media.alt[locale]}|${media.width ?? ''}|${media.height ?? ''}` : id; }).join('\n');
  const previewDocument = useMemo(() => ({ ...document, media: document.media.filter(item => ids.includes(item.id)).map(item => ({ ...item, src: adminMediaSrc(item.src) })) }) as CmsDocument,
    // Rebuilt only when a photo used by the article changes.
    [signature]);
  return <section className="cms-article-preview" aria-label={t.previewTitle} data-article-preview lang={locale}>
    <h4>{t.previewTitle}</h4>
    <p className="cms-article-preview-hint">{t.previewHint}</p>
    <div className="cms-article-preview-body">{text.trim() ? <ArticleBody text={text} language={locale} document={previewDocument} /> : <p className="cms-admin-note">{t.previewEmpty}</p>}</div>
  </section>;
});

export interface ArticleFieldProps {
  label: string; path: string;
  record: Record<string, unknown>;
  /** Language being edited, and the editor's interface language. */
  locale: Language; language: Language;
  document: CmsDocument;
  onChange: (next: Record<string, unknown>) => void;
  onMediaUploaded?: (media: CmsMedia) => void;
  onMediaBusy?: (busy: boolean) => void;
  /** Called when the owner starts working in the text, so the live preview can show this post's page. */
  onFocusText?: () => void;
}
export function ArticleField({ label, path, record, locale, language, document, onChange, onMediaUploaded, onMediaBusy, onFocusText }: ArticleFieldProps): React.JSX.Element {
  const t = blogCopy(language);
  const id = useId();
  const text = String(record[locale] ?? '');
  const area = useRef<HTMLTextAreaElement>(null);
  const saved = useRef({ start: 0, end: 0 });
  const latest = useRef({ text, record, locale });
  latest.current = { text, record, locale };
  const pending = useRef<(ArticleEdit) | null>(null);
  const [panel, setPanel] = useState<'link' | 'photo' | null>(null);
  const [link, setLink] = useState({ label: '', url: '', error: false });
  const [status, setStatus] = useState('');
  const urlInput = useRef<HTMLInputElement>(null);
  const labelInput = useRef<HTMLInputElement>(null);
  const preview = useTrailing(text, ARTICLE_PREVIEW_DELAY_MS, locale);

  useLayoutEffect(() => {
    const target = pending.current, el = area.current;
    if (!target || !el || el.value !== target.text) return;
    pending.current = null;
    el.focus({ preventScroll: true });
    el.setSelectionRange(target.start, target.end);
  });
  useEffect(() => {
    if (panel !== 'link') return;
    const input = (link.label ? urlInput : labelInput).current;
    input?.focus({ preventScroll: true });
    input?.closest('.cms-article-panel')?.scrollIntoView?.({ block: 'nearest' });
  }, [panel]);

  const remember = () => { const el = area.current; if (el) saved.current = { start: el.selectionStart, end: el.selectionEnd }; };
  const selection = () => {
    const el = area.current;
    if (el && el.ownerDocument.activeElement === el) return { start: el.selectionStart, end: el.selectionEnd };
    return saved.current;
  };
  const commit = (edit: ArticleEdit) => {
    pending.current = edit;
    saved.current = { start: edit.start, end: edit.end };
    onChange({ ...latest.current.record, [latest.current.locale]: edit.text });
    // The text may already be unchanged (nothing to do): still return the caret to the writing box.
    if (area.current && area.current.value === edit.text) { pending.current = null; area.current.focus({ preventScroll: true }); area.current.setSelectionRange(edit.start, edit.end); }
  };
  const closePanel = () => { setPanel(null); requestAnimationFrame(() => area.current?.focus({ preventScroll: true })); };
  const run = (tool: ToolId) => {
    const { start, end } = selection();
    const current = latest.current.text;
    setStatus('');
    if (tool === 'bold' || tool === 'italic') { commit(applyArticleInlineFormat(current, start, end, tool, latest.current.locale)); return; }
    if (tool === 'link') {
      saved.current = { start, end };
      const selected = current.slice(Math.min(start, end), Math.max(start, end));
      setLink({ label: /\n/.test(selected) ? '' : selected.trim(), url: '', error: false });
      setPanel(open => open === 'link' ? null : 'link');
      return;
    }
    if (tool === 'photo') { saved.current = { start, end }; setPanel(open => open === 'photo' ? null : 'photo'); return; }
    commit(applyArticleLineFormat(current, start, end, tool));
  };
  const submitLink = () => {
    const checked = checkArticleLink(link.url);
    if (!checked.valid) { setLink({ ...link, error: true }); urlInput.current?.focus(); return; }
    const { start, end } = saved.current;
    setPanel(null);
    commit(insertArticleLink(latest.current.text, start, end, checked.url, link.label.trim() || checked.url));
  };
  const insertPhoto = (media: CmsMedia) => {
    const { start, end } = saved.current;
    setPanel(null);
    commit(insertArticlePhoto(latest.current.text, start, end, media.id, media.alt[latest.current.locale] || media.alt.en || t.photoDescriptionFallback));
    setStatus(t.photoAdded);
  };

  const items = TOOL_ORDER.map(tool => ARTICLE_SYNTAX_ITEMS.find(item => item.id === tool)!);
  return <div className="cms-article-field" data-article-field={`${path}.${locale}`}>
    <label htmlFor={id}>{label} ({languageName(locale)})</label>
    <div className="cms-article-toolbar" role="toolbar" aria-label={t.toolbar}>
      {items.map(item => <button key={item.id} type="button" data-article-tool={item.id} aria-label={item.label[language]} title={t[HINT_KEY[item.id as ToolId]]}
        aria-expanded={item.id === 'link' || item.id === 'photo' ? panel === item.id : undefined}
        onMouseDown={event => event.preventDefault()} onClick={() => run(item.id as ToolId)}>
        {item.id === 'bold' ? <strong>{item.label[language]}</strong> : item.id === 'italic' ? <em>{item.label[language]}</em> : item.label[language]}
      </button>)}
    </div>
    {panel === 'link' && <div className="cms-article-panel" role="group" aria-label={t.linkInsert} data-article-link
      onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); closePanel(); } else if (event.key === 'Enter') { event.preventDefault(); submitLink(); } }}>
      <label>{t.linkText}<input ref={labelInput} name="article-link-text" value={link.label} onChange={event => setLink({ ...link, label: event.target.value })} /></label>
      <label>{t.linkAddress}<input ref={urlInput} name="article-link-address" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={link.url} placeholder="https://" aria-invalid={link.error} aria-describedby={`${id}-link-help`}
        onChange={event => setLink({ ...link, url: event.target.value, error: false })} /></label>
      <p id={`${id}-link-help`} className="cms-admin-note">{t.linkAddressHelp}</p>
      {link.error && <p role="alert" className="cms-admin-inline-error" data-article-link-error>{t.linkInvalid}</p>}
      <div className="cms-array-actions"><button type="button" name="insert-article-link" onClick={submitLink}>{t.linkInsert}</button><button type="button" onClick={closePanel}>{t.cancel}</button></div>
    </div>}
    {panel === 'photo' && <MediaPicker document={document} language={language} locale={locale} purpose="article-photo" onPick={insertPhoto} onClose={closePanel} onUploaded={onMediaUploaded} onUploadBusy={onMediaBusy} />}
    {status && <p role="status" className="cms-admin-note" data-article-status>{status}</p>}
    <textarea id={id} ref={area} data-path={`${path}.${locale}`} lang={locale} rows={14} value={text}
      onChange={event => { onChange({ ...record, [locale]: event.target.value }); saved.current = { start: event.target.selectionStart, end: event.target.selectionEnd }; }}
      onSelect={remember} onBlur={remember} onFocus={onFocusText}
      onKeyDown={event => {
        if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
        const key = event.key.toLowerCase();
        const tool = key === 'b' ? 'bold' : key === 'i' ? 'italic' : key === 'k' ? 'link' : null;
        if (tool) { event.preventDefault(); run(tool); }
      }} />
    <details className="cms-article-help" data-article-help><summary>{t.formattingHelp}</summary><pre lang={language}>{ARTICLE_SYNTAX[language]}</pre></details>
    <ArticlePreview text={preview} locale={locale} language={language} document={document} />
  </div>;
}
