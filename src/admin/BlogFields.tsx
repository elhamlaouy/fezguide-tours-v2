import React, { useEffect, useState } from 'react';
import type { CmsDocument, CmsMedia } from '../cms/schema';
import type { Language } from '../types';
import { adminMediaSrc, coversToChoose, dateInputValue, isIsoDate } from './article-edit';
import { blogCopy } from './blog-copy';
import { MediaPicker } from './MediaPicker';

/** The post date as a calendar picker. The stored value stays YYYY-MM-DD; an empty/partial entry never overwrites it. */
export function DateField({ label, path, value, language, onChange, trailing }: { label: string; path: string; value: string; language: Language; onChange: (next: string) => void; trailing?: React.ReactNode }): React.JSX.Element {
  const t = blogCopy(language);
  const shown = dateInputValue(value);
  const [raw, setRaw] = useState(shown);
  const [touched, setTouched] = useState(false);
  const [partial, setPartial] = useState(false); // a half-typed date is not an error until the field is left
  useEffect(() => setRaw(shown), [shown]);
  const problem = raw === '' && (shown === '' || touched || !partial);
  return <div className="cms-date-field">
    <label>{label}<input type="date" data-path={path} value={raw} aria-invalid={problem} aria-describedby={problem ? `${path}-date-problem` : undefined}
      onBlur={() => setTouched(true)}
      onChange={event => { const next = event.target.value; setRaw(next); setPartial(Boolean(event.target.validity?.badInput)); if (isIsoDate(next)) { setTouched(false); onChange(next); } }} /></label>
    {problem && <p id={`${path}-date-problem`} role="alert" className="cms-admin-inline-error" data-date-problem>{t.dateInvalid}{value ? ` ${t.dateKept}: ${value}.` : ''}</p>}
    {trailing}
  </div>;
}

/** The post's cover photo: a thumbnail, "Change photo" (library with thumbnails and search, or a new upload). */
export function CoverField({ label, path, value, postId, document, language, locale, onChange, onMediaUploaded, onMediaBusy, address, trailing }: {
  label: string; path: string; value: string; postId: string | undefined; document: CmsDocument; language: Language; locale: Language;
  onChange: (src: string) => void; onMediaUploaded?: (media: CmsMedia) => void; onMediaBusy?: (busy: boolean) => void;
  address: React.ReactNode; trailing?: React.ReactNode;
}): React.JSX.Element {
  const t = blogCopy(language);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const media = document.media.find(item => item.src === value);
  const name = media ? media.alt[locale] || media.alt.en || media.id : '';
  const needsChoice = postId !== undefined && coversToChoose.has(postId);
  const pick = (item: CmsMedia) => {
    if (postId) coversToChoose.delete(postId);
    onChange(item.src);
    setOpen(false); setDone(true);
  };
  return <div className="cms-cover-field" data-cover-field={path} data-cover-needs-choice={needsChoice ? '' : undefined}>
    <p className="cms-field-title" id={`${path}-cover-title`}>{label}</p>
    <div className="cms-cover-current" role="group" aria-labelledby={`${path}-cover-title`}>
      {value ? <img src={adminMediaSrc(value)} alt={name || t.coverCurrent} data-cover-thumb loading="lazy" decoding="async" /> : <span className="cms-cover-empty" aria-hidden="true" />}
      <div className="cms-cover-actions">
        <strong>{name || t.coverUnnamed}</strong>
        <button type="button" data-cover-change aria-expanded={open} onClick={() => { setOpen(current => !current); setDone(false); }}>{needsChoice ? t.coverChoose : t.coverChange}</button>
      </div>
    </div>
    {needsChoice && <p className="cms-admin-note" data-cover-prompt role="note">{t.coverChooseHelp}</p>}
    {done && <p role="status" className="cms-admin-note" data-cover-status>{t.coverUploadDone}</p>}
    {open && <MediaPicker document={document} language={language} locale={locale} purpose="cover" selectedSrc={value} onPick={pick} onClose={() => setOpen(false)} onUploaded={onMediaUploaded} onUploadBusy={onMediaBusy} />}
    {address}
    {trailing}
  </div>;
}
