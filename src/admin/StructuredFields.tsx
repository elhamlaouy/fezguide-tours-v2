import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { TOUR_TABS, blockFields, editorDefault, isAdvancedEditorField, nextEditorId, setEditorPath, tourTabErrorCounts, type EditorField, type TourTabId } from '../cms/editor-controls';
import type { CmsDocument } from '../cms/schema';
import type { Language } from '../types';
import { editorLabel } from './editor-labels';
import { languageName, workspaceText } from './editor-workspace';
import { isLanguageKey, itemName, nestedItemLabel, numberedLabel, referenceName } from './editor-names';
import type { CmsMedia } from '../cms/schema';
import { ArticleField } from './ArticleField';
import { CoverField, DateField } from './BlogFields';

interface Props {
  spec: EditorField; value: unknown; path: string; document: CmsDocument;
  language: Language; locale: Language; onChange: (value: unknown) => void;
  onRemove?: (path: string, value: unknown) => void;
  onAdd?: (path: string) => boolean;
  onEditPrice?: (productId: string) => void;
  /** True inside an opened-on-demand "Advanced" disclosure, so it is never nested twice. */
  inAdvanced?: boolean;
  /** Explicit owner-facing label for this node only (used by the interface-text list). */
  label?: string;
  /** Validation errors (raw `path: message`), used only to flag tour tabs that hold an invalid field. */
  errors?: readonly string[];
  /** Adds an uploaded photo to the draft library (blog photo and cover pickers). Never saves or publishes. */
  onMediaUploaded?: (media: CmsMedia) => void;
  onMediaBusy?: (busy: boolean) => void;
  /** Lets the live preview follow the blog post being written. */
  onFocusPage?: (pageId: string) => void;
}
// Google shows ~60 title characters; " | Fez Guide Tours" (18) is appended automatically. Descriptions show ~155.
export const SEO_TITLE_LIMIT = 42;
export const SEO_DESCRIPTION_LIMIT = 155;
const SEO_HINTS = {
  title: {
    help: { en: 'Google shows about 60 characters. “ | Fez Guide Tours” is added automatically — do not type it.', fr: 'Google affiche environ 60 caractères. « | Fez Guide Tours » est ajouté automatiquement — ne le saisissez pas.', es: 'Google muestra unos 60 caracteres. « | Fez Guide Tours » se añade automáticamente: no lo escribas.' },
    empty: { en: 'Empty: Google will use the page title.', fr: 'Vide : Google utilisera le titre de la page.', es: 'Vacío: Google usará el título de la página.' },
  },
  description: {
    help: { en: 'Google shows about 155 characters. Write one or two sentences that make people want to click.', fr: 'Google affiche environ 155 caractères. Écrivez une ou deux phrases qui donnent envie de cliquer.', es: 'Google muestra unos 155 caracteres. Escribe una o dos frases que inviten a hacer clic.' },
    empty: { en: 'Empty: a summary is taken automatically from the page text.', fr: 'Vide : un résumé est pris automatiquement dans le texte de la page.', es: 'Vacío: se toma automáticamente un resumen del texto de la página.' },
  },
} as const;
/** Owner-facing label: list items are numbered from 1 and carry their own name; language leaves name the language. */
export function fieldLabel(path: string, value: unknown, spec: EditorField, document: CmsDocument, language: Language): string {
  const segments = path.split('.');
  const last = segments.at(-1) ?? '';
  if (/^\d+$/.test(last)) return nestedItemLabel(path, value, document, language) ?? numberedLabel(Number(last), spec.type === 'reference' ? referenceName(spec.collection, value, document, language) : itemName(value, language), language);
  if (isLanguageKey(last) && segments.length > 1) return `${editorLabel(segments.at(-2)!, language)} (${languageName(last as Language)})`;
  if (/^products\.[^.]+\.pageId$/.test(path)) return editorLabel('shownUnder', language);
  return editorLabel(last, language);
}
/** Performance: only fields whose own value or relevant library slice changed re-render while typing. */
const DOCUMENT_SLICES = ['media', 'products', 'reviews', 'faqs', 'teamMembers', 'blogPosts', 'editorialEntries', 'navigation'] as const;
const pagesSignatures = new WeakMap<object, string>();
function pagesSignature(pages: CmsDocument['pages']): string {
  let signature = pagesSignatures.get(pages);
  if (signature === undefined) {
    signature = pages.map(page => `${page.id}|${page.title?.en}|${page.title?.fr}|${page.title?.es}`).join('\n');
    pagesSignatures.set(pages, signature);
  }
  return signature;
}
function sameDocumentForField(a: CmsDocument, b: CmsDocument, path: string): boolean {
  if (a === b) return true;
  for (const key of DOCUMENT_SLICES) if (a[key] !== b[key]) return false;
  if (a.footer.links !== b.footer.links) return false;
  if (a.pages !== b.pages) {
    // Page titles/ids feed the page pickers; page bodies only matter to a product's bound prose notice.
    if (pagesSignature(a.pages) !== pagesSignature(b.pages)) return false;
    if (path === 'products' || path.startsWith('products.')) return false;
  }
  return true;
}
function samePropsIgnoringDocument(a: Props, b: Props): boolean {
  if (!sameDocumentForField(a.document, b.document, a.path)) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof Props>;
  for (const key of keys) if (key !== 'document' && !Object.is(a[key], b[key])) return false;
  return true;
}
type ChildHandler = (key: string | number, next: unknown) => void;
/** A per-key onChange that never changes identity, so memoized children are not invalidated by new closures. */
function useChildChange(handler: React.MutableRefObject<ChildHandler>) {
  const cache = useRef(new Map<string | number, (next: unknown) => void>());
  return useCallback((key: string | number) => {
    let fn = cache.current.get(key);
    if (!fn) { fn = next => handler.current(key, next); cache.current.set(key, fn); }
    return fn;
  }, [handler]);
}
const TOUR_TAB_LABELS: Record<TourTabId, string> = { basics: 'tourTabBasics', price: 'tourTabPrice', itinerary: 'tourTabItinerary', included: 'tourTabIncluded', photos: 'tourTabPhotos', policies: 'tourTabPolicies' };
/** Remembered for the rest of the editing session, so the next tour opens on the tab the owner was using. */
let lastTourTab: TourTabId = 'basics';
/** One group of a tour's fields at a time: only the active group is mounted. */
function TourTabs({ legend, dataPath, index, productId, language, errors, entries, renderField, advanced, trailing }: {
  legend: string; dataPath: string; index: number; productId: unknown; language: Language; errors?: readonly string[];
  entries: [string, EditorField][]; renderField: (entry: [string, EditorField]) => React.ReactNode; advanced: React.ReactNode; trailing: React.ReactNode;
}): React.JSX.Element {
  const [tab, setTab] = useState<TourTabId>(lastTourTab);
  const counts = tourTabErrorCounts(errors, index, productId);
  const group = TOUR_TABS.find(item => item.id === tab) ?? TOUR_TABS[0];
  const t = (key: string) => editorLabel(key, language);
  const inTab = entries.filter(([key]) => group.fields.includes(key)).sort((a, b) => group.fields.indexOf(a[0]) - group.fields.indexOf(b[0]));
  // The open tour's summary already shows its name: the legend stays for screen readers only.
  return <fieldset data-object={dataPath} data-tour-tabs=""><legend className="cms-sr-only">{legend}</legend>
    <div className="cms-tour-tabs" role="group" aria-label={t('tourTabs')}>{TOUR_TABS.map(item => {
      const count = counts[item.id] ?? 0;
      return <button key={item.id} type="button" data-tour-tab={item.id} aria-pressed={item.id === group.id} onClick={() => { lastTourTab = item.id; setTab(item.id); }}>{t(TOUR_TAB_LABELS[item.id])}{count > 0 && <span className="cms-tab-badge" data-tab-errors={count}>{count}<span className="cms-sr-only"> {t('tourTabErrors')}</span></span>}</button>;
    })}</div>
    <div className="cms-tour-panel" data-tour-panel={group.id}>{inTab.map(entry => renderField(entry))}</div>
    {advanced}{trailing}
  </fieldset>;
}
const LOCALIZED_LIST_ITEM_SPEC: EditorField = { type: 'array', item: { type: 'text' } };
/** Large collections render items lazily: a collapsed item mounts none of its fields until it is opened. */
const LAZY_COLLECTIONS = new Set(['products', 'blogPosts', 'teamMembers', 'faqs', 'media', 'editorialEntries', 'reviews']);
export const COLLECTION_PAGE_SIZE = 40;
function LazyItem({ summary, defaultOpen, path, children }: { summary: string; defaultOpen: boolean; path: string; children: React.ReactNode }): React.JSX.Element {
  const [open, setOpen] = useState(defaultOpen);
  return <details className="cms-lazy-item" data-lazy="" data-lazy-item={path} open={open} onToggle={event => setOpen(event.currentTarget.open)}><summary>{summary}</summary>{open ? children : null}</details>;
}
/** A `<details>` whose body is created only while it is open (and dropped when closed). */
export function LazyDetails({ summary, defaultOpen = false, children, ...rest }: { summary: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode } & Omit<React.DetailsHTMLAttributes<HTMLDetailsElement>, 'open' | 'onToggle'>): React.JSX.Element {
  const [open, setOpen] = useState(defaultOpen);
  return <details {...rest} data-lazy="" open={open} onToggle={event => setOpen(event.currentTarget.open)}><summary>{summary}</summary>{open ? children : null}</details>;
}
export const StructuredFields = memo(StructuredFieldsView, samePropsIgnoringDocument);
function StructuredFieldsView(props: Props): React.JSX.Element {
  const { spec, value, path, document, language, locale, onChange } = props;
  const handler = useRef<ChildHandler>(() => {});
  const childChange = useChildChange(handler);
  const [visibleCount, setVisibleCount] = useState(COLLECTION_PAGE_SIZE);
  const openOnMount = useRef<number | null>(null);
  const itemCount = Array.isArray(value) ? value.length : 0;
  useEffect(() => { if (openOnMount.current !== null && itemCount > openOnMount.current) openOnMount.current = null; });
  const label = props.label ?? fieldLabel(path, value, spec, document, language);
  const t = (key: string) => editorLabel(key, language);
  const shellLinkMatch = /^(navigation|footer\.links)\.(\d+)/.exec(path);
  const shellLink = shellLinkMatch ? (shellLinkMatch[1] === 'navigation' ? document.navigation : document.footer.links)[Number(shellLinkMatch[2])] : undefined;
  const labelAttributes = shellLink ? { [shellLinkMatch![1] === 'navigation' ? 'data-nav-label' : 'data-footer-label']: shellLink.id } : {};
  const pageAttributes = shellLink ? { [shellLinkMatch![1] === 'navigation' ? 'data-nav-target' : 'data-footer-page']: shellLink.id } : {};
  const pricePath = /^products\.([^.]+)\.(price$|practicalInfo\.price(?:EUR|MAD|USD)$)/.exec(path);
  if (props.onEditPrice && pricePath) {
    const product = /^\d+$/.test(pricePath[1]) ? document.products[Number(pricePath[1])] : document.products.find(item => item.id === pricePath[1]);
    return <div data-price-readonly={path} className="cms-price-summary"><p>{pricePath[2] === 'price' ? t('currentPrice') : label}: <strong>{typeof value === 'number' ? value : value && typeof value === 'object' ? `${(value as {amount: number}).amount} ${(value as {currency: string}).currency}${(value as {basis?: string}).basis ? ` / ${t((value as {basis: string}).basis)}` : ''}` : '—'}</strong></p><button type="button" data-open-pricing={product?.id} onClick={() => { if (product) props.onEditPrice?.(product.id); }}>{pricePath[2] === 'price' ? t('editPrice') : workspaceText('pricing', language)}</button><details><summary>{workspaceText('priceAdvanced', language)}</summary><pre>{JSON.stringify(value, null, 2) ?? '—'}</pre></details></div>;
  }
  if (spec.optional && value === undefined) return <div className="cms-optional"><button type="button" data-enable={path} onClick={() => onChange(editorDefault(spec, document))}>{t('enableField')}: {label}</button></div>;
  // A small, quiet text button (was a "Field options" disclosure on every optional field).
  const optionalRemove = spec.optional ? <div className="cms-field-options"><button type="button" data-unset={path} aria-label={`${t('remove')}: ${label}`} title={`${t('remove')}: ${label}`} onClick={() => onChange(undefined)}>{t('removeField')}</button></div> : null;
  if (spec.type === 'object') {
    const record = (value ?? {}) as Record<string, unknown>;
    const actual = path.includes('.blocks.') ? blockFields(String(record.type)).fields : spec.fields;
    handler.current = (key, next) => {
      if (key === 'type' && path.includes('.blocks.')) {
        const nextBlock = editorDefault(blockFields(String(next)), document) as Record<string, unknown>;
        const convertedText = record.text ?? (record.items ? Object.fromEntries(Object.entries(record.items as Record<string, string[]>).map(([locale, items]) => [locale, items.join('\n')])) : undefined);
        const convertedItems = record.items ?? (record.text ? Object.fromEntries(Object.entries(record.text as Record<string, string>).map(([locale, text]) => [locale, text ? [text] : []])) : undefined);
        onChange({ ...nextBlock, type: next, ...(convertedText && next !== 'list' ? { text: convertedText } : {}), ...(convertedItems && next === 'list' ? { items: convertedItems } : {}), ...(next === 'link' ? { href: record.href ?? '/' } : {}) });
      } else if ((key === 'pageId' || key === 'href') && Object.hasOwn(record, 'label')) {
        const nextRecord = setEditorPath(record, [key], next) as Record<string, unknown>;
        if (next !== undefined) delete nextRecord[key === 'pageId' ? 'href' : 'pageId'];
        onChange(nextRecord);
      } else onChange(setEditorPath(record, [String(key)], next));
    };
    const field = ([key, child]: [string, EditorField], inAdvanced: boolean) => <StructuredFields key={key} {...props} label={undefined} inAdvanced={inAdvanced} spec={child} value={record[key]} path={`${path}.${key}`} onChange={childChange(key)} />;
    const entries = Object.entries(actual ?? {});
    const advanced = props.inAdvanced ? [] : entries.filter(([key]) => isAdvancedEditorField(`${path}.${key}`));
    const primary = entries.filter(([key]) => !advanced.some(([other]) => other === key));
    const tourMatch = props.inAdvanced ? null : /^products\.(\d+)$/.exec(path);
    if (tourMatch) {
      const hideMirrors = (key: string, child: EditorField): EditorField => key === 'practicalInfo' && props.onEditPrice && child.fields
        ? { ...child, fields: Object.fromEntries(Object.entries(child.fields).filter(([name]) => !/^price(EUR|MAD|USD)$/.test(name))) } : child;
      return <TourTabs legend={label} dataPath={path} index={Number(tourMatch[1])} productId={record.id} language={language} errors={props.errors} entries={primary}
        renderField={([key, child]) => field([key, hideMirrors(key, child)], false)}
        advanced={advanced.length > 0 && <details className="cms-advanced" data-advanced={path}><summary>{t('advanced')}</summary>{advanced.map(entry => field(entry, true))}</details>} trailing={optionalRemove} />;
    }
    const named = /^(blogPosts|teamMembers|faqs|media|editorialEntries|reviews)\.\d+$/.test(path); // lazy rows show their name in the summary already
    return <fieldset data-object={path}><legend className={named ? 'cms-sr-only' : undefined}>{label}</legend>{primary.map(entry => field(entry, !!props.inAdvanced))}{advanced.length > 0 && <details className="cms-advanced" data-advanced={path}><summary>{t('advanced')}</summary>{advanced.map(entry => field(entry, true))}</details>}{optionalRemove}</fieldset>;
  }
  if (spec.type === 'localized' || spec.type === 'localizedList') {
    const record = (value ?? { en: spec.type === 'localized' ? '' : [], fr: spec.type === 'localized' ? '' : [], es: spec.type === 'localized' ? '' : [] }) as Record<string, unknown>;
    const binding = /^products\.([^.]+)\.(fullDescription|meetingPointDetails|cancellationPolicy)$/.exec(path);
    const product = binding ? document.products.find((item, index) => item.id === binding[1] || String(index) === binding[1]) : undefined;
    const sectionId = binding ? ({ fullDescription: 'overview', meetingPointDetails: 'meeting', cancellationPolicy: 'cancel' } as Record<string,string>)[binding[2]] : undefined;
    const bound = product ? document.pages.find(page => page.kind === 'product' && page.productId === product.id)?.sections.find(section => section.id === sectionId) : undefined;
    const custom = bound && (bound.type !== 'richText' || bound.blocks.some(block => block.type !== 'paragraph'));
    // Google result guidance for page SEO fields: live length counter in the editor's language.
    const seoKind = spec.type === 'localized' ? /^pages\.[^.]+\.seo\.(title|description)$/.exec(path)?.[1] as 'title' | 'description' | undefined : undefined;
    const seoLength = seoKind ? String(record[locale] ?? '').trim().length : 0;
    const seoLimit = seoKind === 'title' ? SEO_TITLE_LIMIT : SEO_DESCRIPTION_LIMIT;
    handler.current = (_key, next) => onChange({ ...record, [locale]: next });
    const seoHint = seoKind ? <p className={seoLength > seoLimit ? 'cms-admin-note cms-seo-counter is-warning' : 'cms-admin-note cms-seo-counter'} data-seo-counter={path} aria-live="polite">{seoLength}/{seoLimit} · {SEO_HINTS[seoKind][seoLength === 0 ? 'empty' : 'help'][language]}</p> : null;
    const article = spec.type === 'localized' ? /^blogPosts\.([^.]+)\.content$/.exec(path) : null;
    if (article) {
      const post = document.blogPosts.find((item, index) => item.id === article[1] || String(index) === article[1]);
      return <div><ArticleField label={label} path={path} record={record} locale={locale} language={language} document={document} onChange={onChange as (next: Record<string, unknown>) => void}
        onMediaUploaded={props.onMediaUploaded} onMediaBusy={props.onMediaBusy} onFocusText={post && props.onFocusPage ? () => props.onFocusPage?.(post.id) : undefined} />{optionalRemove}</div>;
    }
    return <div>{custom && <p className="cms-admin-note" data-projection-notice={path}>{t('customProseHelp')}</p>}{spec.type === 'localized' ? <label>{label} ({languageName(locale)}){shellLink && path.endsWith('.label') ? <input {...labelAttributes} data-path={`${path}.${locale}`} value={String(record[locale] ?? '')} onChange={event => onChange({ ...record, [locale]: event.target.value })} /> : <textarea data-path={`${path}.${locale}`} value={String(record[locale] ?? '')} onChange={event => onChange({ ...record, [locale]: event.target.value })} />}</label> : <StructuredFields {...props} label={undefined} spec={LOCALIZED_LIST_ITEM_SPEC} value={record[locale]} path={`${path}.${locale}`} onChange={childChange(locale)} />}{seoHint}{optionalRemove}</div>;
  }
  if (spec.type === 'array') {
    const items = Array.isArray(value) ? value : [];
    const itemSpec = spec.item!;
    const reviewRecords = path === 'reviews';
    const lazy = LAZY_COLLECTIONS.has(path);
    const create = () => {
      openOnMount.current = items.length;
      if (lazy) setVisibleCount(count => Math.max(count, items.length + 1));
      if (props.onAdd?.(path)) return;
      const next = itemSpec.type === 'reference' && itemSpec.collection ? document[itemSpec.collection].find(item => !items.includes(item.id))?.id : editorDefault(itemSpec, document);
      if (next && typeof next === 'object' && !Array.isArray(next) && Object.hasOwn(next, 'id')) {
        (next as Record<string, unknown>).id = nextEditorId(items);
        if (Object.hasOwn(next, 'href')) (next as Record<string, unknown>).href = '/';
        if (Object.hasOwn(next, 'label')) (next as Record<string, unknown>).pageId = document.pages[0]?.id;
      }
      onChange([...items, next]);
    };
    handler.current = (index, next) => onChange(items.map((item, i) => i === index ? next : item));
    const move = (i: number, delta: number) => { const next = [...items]; const [item] = next.splice(i, 1); next.splice(i + delta, 0, item); onChange(next); };
    const collection = itemSpec.collection;
    const itemLabel = (index: number, item: unknown) => fieldLabel(`${path}.${index}`, item, itemSpec, document, language);
    const limit = path === 'media' ? 1000 : path === 'editorialEntries' ? 150 : 100;
    const canAdd = !reviewRecords && items.length < limit && (!collection || document[collection].some(item => !items.includes(item.id)));
    const shown = lazy ? Math.min(items.length, visibleCount) : items.length;
    return <fieldset data-array={path}><legend>{label}</legend><ol>{items.slice(0, shown).map((item, index) => {
      const body = <>
        <StructuredFields {...props} label={undefined} spec={itemSpec} value={item} path={`${path}.${index}`} onChange={childChange(index)} />
        <div className="cms-array-actions">
          <button type="button" data-array-move={`${path}.${index}:up`} {...(path === 'footer.links' ? { 'data-footer-move': 'up', 'data-link': item.id } : {})} aria-label={`${t('up')}: ${itemLabel(index, item)}`} disabled={index === 0} onClick={() => move(index, -1)}>{t('up')}</button>
          <button type="button" data-array-move={`${path}.${index}:down`} {...(path === 'footer.links' ? { 'data-footer-move': 'down', 'data-link': item.id } : {})} aria-label={`${t('down')}: ${itemLabel(index, item)}`} disabled={index === items.length - 1} onClick={() => move(index, 1)}>{t('down')}</button>
          {!reviewRecords && <button type="button" data-array-remove={`${path}.${index}`} aria-label={`${t('remove')}: ${itemLabel(index, item)}`} onClick={() => {
            if (!window.confirm(t('confirmRemove'))) return;
            const next = items.filter((_, i) => i !== index);
            if (props.onRemove) props.onRemove(`${path}.${index}`, next); else onChange(next);
          }}>{t('remove')}</button>}
        </div>
      </>;
      return <li key={lazy && typeof item?.id === 'string' ? item.id : index} data-array-item={`${path}.${index}`} {...(path === 'navigation' ? { 'data-nav-link': item.id, 'data-nav-page': item.pageId ?? '' } : path === 'footer.links' ? { 'data-footer-link': item.id, 'data-link-page': item.pageId ?? '' } : {})}>
        {lazy ? <LazyItem summary={itemLabel(index, item)} path={`${path}.${index}`} defaultOpen={openOnMount.current === index}>{body}</LazyItem> : body}
      </li>;
    })}</ol>{shown < items.length && <button type="button" data-show-more={path} onClick={() => setVisibleCount(count => count + COLLECTION_PAGE_SIZE)}>{t('showMore')} ({items.length - shown})</button>}<button type="button" data-add={path} disabled={!canAdd} onClick={create}>{t('add')}: {label}</button>{optionalRemove}</fieldset>;
  }
  const inputPath = { 'data-path': path };
  if (spec.type === 'boolean') return <div><label className="cms-admin-check"><input {...inputPath} type="checkbox" checked={value === true} onChange={event => onChange(event.target.checked)} />{label}</label>{optionalRemove}</div>;
  if (spec.type === 'reference' || spec.type === 'enum') {
    const options = spec.type === 'reference' && spec.collection ? document[spec.collection].map(item => item.id) : [...(spec.options ?? [])];
    return <div><label>{label}<select {...inputPath} {...(path.endsWith('.pageId') ? pageAttributes : {})} value={String(value ?? '')} onChange={event => { if (options.includes(event.target.value)) onChange(event.target.value); }}>{!value && <option value="" disabled>{t('noValue')}</option>}{!options.includes(String(value ?? '')) && value ? <option value={String(value)}>{String(value)}</option> : null}{options.map(option => <option key={option} value={option}>{spec.type === 'enum' ? t(option) : (referenceName(spec.collection, option, document, language) || option)}</option>)}</select></label>{optionalRemove}</div>;
  }
  if (spec.type === 'number') return <div><label>{label}<input {...inputPath} type="number" min={spec.min} max={spec.max} step={spec.step} value={typeof value === 'number' ? value : ''} onChange={event => onChange(event.target.value === '' ? '' : Number(event.target.value))} /></label>{optionalRemove}</div>;
  if (spec.type === 'mediaUrl') {
    const known = document.media.some(m => m.src === value);
    const current = typeof value === 'string' && value ? value : '';
    const address = <label>{t('src')}<input {...inputPath} type="text" readOnly={spec.readonly} value={String(value ?? '')} onChange={event => onChange(event.target.value)} /></label>;
    const cover = /^blogPosts\.([^.]+)\.coverImage$/.exec(path);
    if (cover) {
      const post = document.blogPosts.find((item, index) => item.id === cover[1] || String(index) === cover[1]);
      return <CoverField label={label} path={path} value={current} postId={post?.id} document={document} language={language} locale={locale} onChange={onChange as (src: string) => void}
        onMediaUploaded={props.onMediaUploaded} onMediaBusy={props.onMediaBusy}
        address={<details className="cms-advanced"><summary>{t('advanced')}: {t('src')}</summary>{address}</details>} trailing={optionalRemove} />;
    }
    return <div className="cms-media-field"><label>{label}<select data-url-picker={path} value={known ? String(value) : current} onChange={event => { if (event.target.value) onChange(event.target.value); }}>{!current && <option value="">{t('noValue')}</option>}{current && !known && <option value={current}>{current}</option>}{document.media.map(media => <option key={media.id} value={media.src}>{media.alt[locale] || media.id}</option>)}</select></label>{props.inAdvanced ? address : <details className="cms-advanced"><summary>{t('advanced')}: {t('src')}</summary>{address}</details>}{optionalRemove}</div>;
  }
  if (/^blogPosts\.[^.]+\.date$/.test(path)) return <DateField label={label} path={path} value={String(value ?? '')} language={language} onChange={onChange as (next: string) => void} trailing={optionalRemove} />;
  return <div><label>{label}<input {...inputPath} type={path.startsWith('theme.colors.') ? 'color' : 'text'} readOnly={spec.readonly} value={String(value ?? '')} onChange={event => onChange(event.target.value)} /></label>{optionalRemove}</div>;
}
