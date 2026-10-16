import React from 'react';
import { blockFields, editorDefault, nextEditorId, setEditorPath, type EditorField } from '../cms/editor-controls';
import type { CmsDocument } from '../cms/schema';
import type { Language } from '../types';
import { editorLabel } from './editor-labels';

interface Props {
  spec: EditorField; value: unknown; path: string; document: CmsDocument;
  language: Language; locale: Language; onChange: (value: unknown) => void;
  onRemove?: (path: string, value: unknown) => void;
  onAdd?: (path: string) => boolean;
}
export function StructuredFields(props: Props): React.JSX.Element {
  const { spec, value, path, document, language, locale, onChange } = props;
  const label = editorLabel(path.split('.').at(-1) ?? '', language);
  const t = (key: string) => editorLabel(key, language);
  const shellLinkMatch = /^(navigation|footer\.links)\.(\d+)/.exec(path);
  const shellLink = shellLinkMatch ? (shellLinkMatch[1] === 'navigation' ? document.navigation : document.footer.links)[Number(shellLinkMatch[2])] : undefined;
  const labelAttributes = shellLink ? { [shellLinkMatch![1] === 'navigation' ? 'data-nav-label' : 'data-footer-label']: shellLink.id } : {};
  const pageAttributes = shellLink ? { [shellLinkMatch![1] === 'navigation' ? 'data-nav-target' : 'data-footer-page']: shellLink.id } : {};
  if (spec.optional && value === undefined) return <div className="cms-optional"><button type="button" data-enable={path} onClick={() => onChange(editorDefault(spec, document))}>{t('enableField')}: {label}</button></div>;
  const optionalRemove = spec.optional ? <details className="cms-field-options"><summary>{t('fieldOptions')}</summary><button type="button" data-unset={path} onClick={() => onChange(undefined)}>{t('remove')}: {label}</button></details> : null;
  if (spec.type === 'object') {
    const record = (value ?? {}) as Record<string, unknown>;
    const actual = path.includes('.blocks.') ? blockFields(String(record.type)).fields : spec.fields;
    return <fieldset data-object={path}><legend>{label}</legend>{Object.entries(actual ?? {}).map(([key, child]) => <StructuredFields key={key} {...props} spec={child} value={record[key]} path={`${path}.${key}`} onChange={next => {
      if (key === 'type' && path.includes('.blocks.')) {
        const nextBlock = editorDefault(blockFields(String(next)), document) as Record<string, unknown>;
        const convertedText = record.text ?? (record.items ? Object.fromEntries(Object.entries(record.items as Record<string, string[]>).map(([locale, items]) => [locale, items.join('\n')])) : undefined);
        const convertedItems = record.items ?? (record.text ? Object.fromEntries(Object.entries(record.text as Record<string, string>).map(([locale, text]) => [locale, text ? [text] : []])) : undefined);
        onChange({ ...nextBlock, type: next, ...(convertedText && next !== 'list' ? { text: convertedText } : {}), ...(convertedItems && next === 'list' ? { items: convertedItems } : {}), ...(next === 'link' ? { href: record.href ?? '/' } : {}) });
      } else if ((key === 'pageId' || key === 'href') && Object.hasOwn(record, 'label')) {
        const nextRecord = setEditorPath(record, [key], next) as Record<string, unknown>;
        if (next !== undefined) delete nextRecord[key === 'pageId' ? 'href' : 'pageId'];
        onChange(nextRecord);
      } else onChange(setEditorPath(record, [key], next));
    }} />)}{optionalRemove}</fieldset>;
  }
  if (spec.type === 'localized' || spec.type === 'localizedList') {
    const record = (value ?? { en: spec.type === 'localized' ? '' : [], fr: spec.type === 'localized' ? '' : [], es: spec.type === 'localized' ? '' : [] }) as Record<string, unknown>;
    const binding = /^products\.([^.]+)\.(fullDescription|meetingPointDetails|cancellationPolicy)$/.exec(path);
    const product = binding ? document.products.find((item, index) => item.id === binding[1] || String(index) === binding[1]) : undefined;
    const sectionId = binding ? ({ fullDescription: 'overview', meetingPointDetails: 'meeting', cancellationPolicy: 'cancel' } as Record<string,string>)[binding[2]] : undefined;
    const bound = product ? document.pages.find(page => page.kind === 'product' && page.productId === product.id)?.sections.find(section => section.id === sectionId) : undefined;
    const custom = bound && (bound.type !== 'richText' || bound.blocks.some(block => block.type !== 'paragraph'));
    return <div>{custom && <p className="cms-admin-note" data-projection-notice={path}>{t('customProseHelp')}</p>}{spec.type === 'localized' ? <label>{label} ({locale}){shellLink && path.endsWith('.label') ? <input {...labelAttributes} data-path={`${path}.${locale}`} value={String(record[locale] ?? '')} onChange={event => onChange({ ...record, [locale]: event.target.value })} /> : <textarea data-path={`${path}.${locale}`} value={String(record[locale] ?? '')} onChange={event => onChange({ ...record, [locale]: event.target.value })} />}</label> : <StructuredFields {...props} spec={{ type: 'array', item: { type: 'text' } }} value={record[locale]} path={`${path}.${locale}`} onChange={next => onChange({ ...record, [locale]: next })} />}{optionalRemove}</div>;
  }
  if (spec.type === 'array') {
    const items = Array.isArray(value) ? value : [];
    const itemSpec = spec.item!;
    const reviewRecords = path === 'reviews';
    const create = () => {
      if (props.onAdd?.(path)) return;
      const next = itemSpec.type === 'reference' && itemSpec.collection ? document[itemSpec.collection].find(item => !items.includes(item.id))?.id : editorDefault(itemSpec, document);
      if (next && typeof next === 'object' && !Array.isArray(next) && Object.hasOwn(next, 'id')) {
        (next as Record<string, unknown>).id = nextEditorId(items);
        if (Object.hasOwn(next, 'href')) (next as Record<string, unknown>).href = '/';
        if (Object.hasOwn(next, 'label')) (next as Record<string, unknown>).pageId = document.pages[0]?.id;
      }
      onChange([...items, next]);
    };
    const move = (i: number, delta: number) => { const next = [...items]; const [item] = next.splice(i, 1); next.splice(i + delta, 0, item); onChange(next); };
    const collection = itemSpec.collection;
    const limit = path === 'media' ? 1000 : path === 'editorialEntries' ? 150 : 100;
    const canAdd = !reviewRecords && items.length < limit && (!collection || document[collection].some(item => !items.includes(item.id)));
    return <fieldset data-array={path}><legend>{label}</legend><ol>{items.map((item, index) => <li key={index} data-array-item={`${path}.${index}`} {...(path === 'navigation' ? { 'data-nav-link': item.id, 'data-nav-page': item.pageId ?? '' } : path === 'footer.links' ? { 'data-footer-link': item.id, 'data-link-page': item.pageId ?? '' } : {})}>
      <StructuredFields {...props} spec={itemSpec} value={item} path={`${path}.${index}`} onChange={next => onChange(items.map((item, i) => i === index ? next : item))} />
      <div className="cms-array-actions">
        <button type="button" data-array-move={`${path}.${index}:up`} {...(path === 'footer.links' ? { 'data-footer-move': 'up', 'data-link': item.id } : {})} aria-label={`${t('up')}: ${label} ${index + 1}`} disabled={index === 0} onClick={() => move(index, -1)}>{t('up')}</button>
        <button type="button" data-array-move={`${path}.${index}:down`} {...(path === 'footer.links' ? { 'data-footer-move': 'down', 'data-link': item.id } : {})} aria-label={`${t('down')}: ${label} ${index + 1}`} disabled={index === items.length - 1} onClick={() => move(index, 1)}>{t('down')}</button>
        {!reviewRecords && <button type="button" data-array-remove={`${path}.${index}`} aria-label={`${t('remove')}: ${label} ${index + 1}`} onClick={() => {
          if (!window.confirm(t('confirmRemove'))) return;
          const next = items.filter((_, i) => i !== index);
          if (props.onRemove) props.onRemove(`${path}.${index}`, next); else onChange(next);
        }}>{t('remove')}</button>}
      </div>
    </li>)}</ol><button type="button" data-add={path} disabled={!canAdd} onClick={create}>{t('add')}: {label}</button>{optionalRemove}</fieldset>;
  }
  const inputPath = { 'data-path': path };
  if (spec.type === 'boolean') return <div><label className="cms-admin-check"><input {...inputPath} type="checkbox" checked={value === true} onChange={event => onChange(event.target.checked)} />{label}</label>{optionalRemove}</div>;
  if (spec.type === 'reference' || spec.type === 'enum') {
    const options = spec.type === 'reference' && spec.collection ? document[spec.collection].map(item => item.id) : [...(spec.options ?? [])];
    return <div><label>{label}<select {...inputPath} {...(path.endsWith('.pageId') ? pageAttributes : {})} value={String(value ?? '')} onChange={event => { if (options.includes(event.target.value)) onChange(event.target.value); }}>{!value && <option value="" disabled>{t('noValue')}</option>}{!options.includes(String(value ?? '')) && value ? <option value={String(value)}>{String(value)}</option> : null}{options.map(option => <option key={option} value={option}>{spec.type === 'enum' ? t(option) : option}</option>)}</select></label>{optionalRemove}</div>;
  }
  if (spec.type === 'number') return <div><label>{label}<input {...inputPath} type="number" min={spec.min} max={spec.max} step={spec.step} value={typeof value === 'number' ? value : ''} onChange={event => onChange(event.target.value === '' ? undefined : Number(event.target.value))} /></label>{optionalRemove}</div>;
  return <div><label>{label}<input {...inputPath} type={path.startsWith('theme.colors.') ? 'color' : 'text'} readOnly={spec.readonly} value={String(value ?? '')} onChange={event => onChange(event.target.value)} /></label>{spec.type === 'mediaUrl' && <label>{t('mediaId')}<select data-url-picker={path} value={document.media.some(m => m.src === value) ? String(value) : ''} onChange={event => { if (event.target.value) onChange(event.target.value); }}><option value="">{t('noValue')}</option>{document.media.map(media => <option key={media.id} value={media.src}>{media.alt[locale] || media.id}</option>)}</select></label>}{optionalRemove}</div>;
}
