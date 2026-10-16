import React, { useState } from 'react';
import { CMS_LIMITS, type CmsDocument } from '../cms/schema';
import { parseEditorImport } from '../cms/editor-controls';
import type { Language } from '../types';
import { editorLabel } from './editor-labels';

export function DraftTransfer({ document, language, disabled, onImport, onError, onBusyChange }: {
  document: CmsDocument; language: Language; disabled: boolean; onImport: (next: CmsDocument) => void;
  onError: (errors: string[]) => void; onBusyChange: (busy: boolean) => void;
}): React.JSX.Element {
  const [working, setWorking] = useState(false);
  const t = (key: string) => editorLabel(key, language);
  return <fieldset><legend>JSON</legend><p>{t('importHelp')}</p>
    <button type="button" name="export-draft" disabled={disabled || working} onClick={() => {
      const blob = new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a'); link.href = url; link.download = 'cms-draft.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }}>{t('export')}</button>
    <label>{t('import')}<input name="import-draft" type="file" accept=".json,application/json" disabled={disabled || working} onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
      setWorking(true); onBusyChange(true);
      try {
        if (file.size > CMS_LIMITS.bytes) throw new Error('document: exceeds byte limit');
        const next = parseEditorImport(await file.text(), document);
        if (window.confirm(t('importHelp'))) onImport(next);
      } catch (error) { onError((error instanceof Error ? error.message : 'document: invalid input').split('\n')); }
      finally { setWorking(false); onBusyChange(false); }
    }} /></label>
  </fieldset>;
}
