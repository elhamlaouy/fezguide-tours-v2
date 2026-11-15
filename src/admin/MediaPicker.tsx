import React, { useEffect, useRef, useState } from 'react';
import type { CmsDocument, CmsMedia } from '../cms/schema';
import type { Language } from '../types';
import { MediaUpload } from './MediaUpload';
import { adminMediaSrc } from './article-edit';
import { blogCopy } from './blog-copy';

const PAGE = 12;
export interface MediaPickerProps {
  document: CmsDocument;
  /** Editor interface language and the language being edited (photo descriptions). */
  language: Language; locale: Language;
  /** Identifies where the picker is used (data attribute for tests/automation). */
  purpose: string;
  selectedSrc?: string;
  onPick: (media: CmsMedia) => void;
  onClose: () => void;
  /** Adds an uploaded photo to the draft library (never saves or publishes). */
  onUploaded?: (media: CmsMedia) => void;
  onUploadBusy?: (busy: boolean) => void;
  uploadDisabled?: boolean;
}
/** The photo library as thumbnails with search, plus "Upload a new photo". Used for article photos and the cover photo. */
export function MediaPicker({ document, language, locale, purpose, selectedSrc, onPick, onClose, onUploaded, onUploadBusy, uploadDisabled }: MediaPickerProps): React.JSX.Element {
  const t = blogCopy(language);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const search = useRef<HTMLInputElement>(null);
  const uploaded = useRef<CmsMedia | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  useEffect(() => { search.current?.focus({ preventScroll: true }); search.current?.closest('.cms-media-picker')?.scrollIntoView?.({ block: 'nearest' }); }, []);
  const needle = query.trim().toLocaleLowerCase();
  const matches = document.media.filter(item => !needle || `${item.alt[locale]} ${item.alt.en} ${item.id}`.toLocaleLowerCase().includes(needle));
  return <div className="cms-media-picker" role="group" aria-label={t.photoTitle} data-media-picker={purpose} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
    <div className="cms-media-picker-bar">
      <label>{t.photoSearch}<input ref={search} type="search" name="picker-search" value={query} onChange={event => { setQuery(event.target.value); setLimit(PAGE); }} /></label>
      <button type="button" data-picker-close onClick={onClose}>{t.close}</button>
    </div>
    {matches.length === 0 ? <p className="cms-admin-note">{t.photoNone}</p> : <ul className="cms-admin-media cms-media-picker-grid">
      {matches.slice(0, limit).map(item => <li key={item.id}>
        <button type="button" data-picker-media={item.id} aria-pressed={selectedSrc === item.src} aria-label={item.alt[locale] || item.alt.en || item.id} onClick={() => onPick(item)}>
          <img src={adminMediaSrc(item.src)} alt="" loading="lazy" decoding="async" />
          <span>{item.alt[locale] || item.alt.en || item.id}</span>
        </button>
      </li>)}
    </ul>}
    {matches.length > limit && <button type="button" data-picker-more onClick={() => setLimit(count => count + PAGE)}>{t.photoMore}</button>}
    {onUploaded && <details className="cms-media-picker-upload" data-picker-upload open={uploadOpen} onToggle={event => setUploadOpen(event.currentTarget.open)}><summary>{t.photoUpload}</summary>{uploadOpen ? <MediaUpload language={language} editingLocale={locale} disabled={uploadDisabled} onBusyChange={onUploadBusy}
        onUploaded={media => { uploaded.current = media; onUploaded(media); }}
        onSelect={id => { if (uploaded.current?.id === id) onPick(uploaded.current); }} /> : null}
    </details>}
  </div>;
}
