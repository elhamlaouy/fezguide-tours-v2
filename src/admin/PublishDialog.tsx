import React, { useEffect, useRef } from 'react';
import type { ChangeSummary } from './change-summary';
import { safetyCopy } from './safety-copy';

export const PUBLISH_LIST_LIMIT = 12;

export interface PublishPreview {
  status: 'loading' | 'ready' | 'failed';
  /** Nothing has ever been published, so everything is new. */
  first: boolean;
  /** Edits not saved yet: Publish saves them first. */
  unsaved: boolean;
  summary: ChangeSummary | null;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Confirmation before going live: what visitors will see change. Modal, labelled, focus stays inside until closed. */
export function PublishDialog({ language, preview, onConfirm, onCancel }: { language: 'en' | 'fr' | 'es'; preview: PublishPreview; onConfirm: () => void; onCancel: () => void }): React.JSX.Element {
  const t = safetyCopy(language);
  const box = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    cancel.current?.focus();
    return () => { if (opener && typeof opener.focus === 'function') opener.focus(); };
  }, []);

  function keys(event: React.KeyboardEvent) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancelRef.current(); return; }
    if (event.key !== 'Tab' || !box.current) return;
    const items = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (!items.length) { event.preventDefault(); return; }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !box.current.contains(active))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (active === last || !box.current.contains(active))) { event.preventDefault(); first.focus(); }
  }

  const lines = preview.summary?.lines ?? [];
  const shown = lines.slice(0, PUBLISH_LIST_LIMIT);
  const hidden = lines.length - shown.length;
  const body = preview.status === 'loading' ? <p data-publish-loading>{t.publishLoading}</p>
    : preview.status === 'failed' ? <p className="cms-admin-alert" data-publish-failed>{t.publishFailed}</p>
      : preview.first ? <p data-publish-first>{t.publishFirst}</p>
        : lines.length === 0 ? <p data-publish-none>{t.publishNone}</p>
          : <>
            <p>{t.publishIntro}</p>
            <ul className="cms-publish-changes" data-publish-changes>
              {shown.map((line, index) => <li key={index} data-area={line.area}>{line.text}</li>)}
              {hidden > 0 && <li className="cms-publish-more" data-publish-more>{t.publishMore(hidden)}</li>}
            </ul>
          </>;

  return (
    <div className="cms-dialog-backdrop" data-publish-backdrop onMouseDown={event => { if (event.target === event.currentTarget) onCancel(); }}>
      <div ref={box} className="cms-dialog" role="dialog" aria-modal="true" aria-labelledby="cms-publish-title" aria-describedby="cms-publish-body" data-publish-dialog onKeyDown={keys}>
        <h2 id="cms-publish-title">{t.publishTitle}</h2>
        <div id="cms-publish-body" aria-live="polite">
          {body}
          {preview.unsaved && preview.status !== 'loading' && <p className="cms-admin-note" data-publish-saves>{t.publishSaves}</p>}
        </div>
        <div className="cms-dialog-actions">
          <button type="button" ref={cancel} name="cancel-publish" onClick={onCancel}>{t.cancel}</button>
          <button type="button" name="confirm-publish" className="cms-primary" disabled={preview.status === 'loading'} onClick={onConfirm}>{t.publish}</button>
        </div>
      </div>
    </div>
  );
}
