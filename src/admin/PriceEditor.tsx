import React, { useEffect, useState } from 'react';
import type { CmsDocument, CmsProduct } from '../cms/schema';
import type { Language } from '../types';
import { localizedText } from '../cms/render-utils';
import { workspaceText } from './editor-workspace';

export const PRICE_CURRENCIES = ['EUR', 'MAD', 'USD'] as const;
type Currency = typeof PRICE_CURRENCIES[number];
type Price = NonNullable<CmsProduct['price']>;
export type PriceChange = { price: Price; equivalents: Partial<Record<Currency, number>> };
interface Props {
  document: CmsDocument; productId: string; language: Language; disabled?: boolean;
  onChange: (productId: string, change: PriceChange) => void;
  onPendingChange: (pending: boolean) => void;
}

/** A private form buffer: incomplete numbers never replace a valid public price. */
export function PriceEditor({ document, productId, language, disabled = false, onChange, onPendingChange }: Props) {
  const product = document.products.find(item => item.id === productId);
  const [amount, setAmount] = useState(String(product?.price?.amount ?? ''));
  const [currency, setCurrency] = useState<Currency>(product?.price?.currency ?? 'EUR');
  const [basis, setBasis] = useState<Price['basis']>(product?.price?.basis ?? 'person');
  const initialEstimates = () => Object.fromEntries(PRICE_CURRENCIES.map(item => [item, product?.practicalInfo?.[`price${item}`] === undefined ? undefined : String(product.practicalInfo[`price${item}`])])) as Partial<Record<Currency, string>>;
  const [estimates, setEstimates] = useState(initialEstimates);
  const [pending, setPending] = useState(false);
  const [estimatesPending, setEstimatesPending] = useState(false);
  const editedEstimates = React.useRef(new Set<Currency>());
  const [decision, setDecision] = useState('');
  const [conflictChoice, setConflictChoice] = useState(false);
  const openedPrice = React.useRef(product?.price);
  const t = (key: string) => workspaceText(key, language);
  useEffect(() => { onPendingChange(pending || estimatesPending); }, [pending, estimatesPending, onPendingChange]);
  useEffect(() => {
    if (pending || estimatesPending) return;
    setAmount(String(product?.price?.amount ?? '')); setCurrency(product?.price?.currency ?? 'EUR'); setBasis(product?.price?.basis ?? 'person'); setEstimates(initialEstimates());
  }, [product?.price, product?.practicalInfo, pending, estimatesPending]);
  if (!product) return null;
  const price = product.price ?? { amount: 0, currency: 'EUR' as const, basis: 'person' as const };
  const mirror = product.practicalInfo?.[`price${price.currency}`];
  const conflict = product.price && mirror !== undefined && mirror !== price.amount;
  const blocked = disabled || Boolean(conflict && !conflictChoice);
  const numberValid = (value: string) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1000000;
  const valid = numberValid(amount);
  const equivalents = Object.fromEntries(PRICE_CURRENCIES.filter(item => item !== currency && estimates[item] !== undefined).map(item => [item, Number(estimates[item])])) as Partial<Record<Currency, number>>;
  const savedEquivalents = Object.fromEntries(PRICE_CURRENCIES.filter(item => item !== currency && product.practicalInfo?.[`price${item}`] !== undefined).map(item => [item, product.practicalInfo![`price${item}`]])) as Partial<Record<Currency, number>>;
  const estimatesValid = decision === 'keep' || decision === 'remove' || (!estimatesPending && decision === '') || PRICE_CURRENCIES.every(item => item === currency || estimates[item] === undefined || numberValid(estimates[item]!));
  const commitMain = (nextAmount: string, nextCurrency: Currency, nextBasis: Price['basis'], force = false) => {
    if (disabled || (!force && blocked) || !numberValid(nextAmount)) { setPending(!numberValid(nextAmount)); return; }
    const kept = Object.fromEntries(PRICE_CURRENCIES.filter(item => item !== nextCurrency && product.practicalInfo?.[`price${item}`] !== undefined).map(item => [item, product.practicalInfo![`price${item}`]])) as Partial<Record<Currency, number>>;
    // The old base becomes a manual equivalent; retain its actual amount, never an FX calculation.
    if (estimatesPending && nextCurrency !== price.currency && !editedEstimates.current.has(price.currency)) setEstimates(current => ({ ...current, [price.currency]: String(price.amount) }));
    onChange(product.id, { price: { amount: Number(nextAmount), currency: nextCurrency, basis: nextBasis }, equivalents: kept });
    setPending(false);
  };
  // Detection is advisory only. Never replace prices inside arbitrary authored copy.
  const independentCopy = document.pages.filter(page => page.productId === product.id).flatMap(page => page.sections.filter(section => {
    const copy = JSON.stringify(section);
    return /[0-9]/.test(copy) && /(?:EUR|MAD|USD|€|\$)/.test(copy);
  }).map(section => `${localizedText(page.title, language) || page.id} · ${section.id}`));
  const needsReview = (Number(amount) !== price.amount || currency !== price.currency || basis !== price.basis) && (Object.keys(savedEquivalents).length > 0 || Object.keys(equivalents).length > 0);
  return <section className="cms-price-editor" data-price-editor={product.id} onChangeCapture={event => { if (disabled) event.stopPropagation(); }}>
    <h2>{t('pricing')}: {localizedText(product.title, language)}</h2>
    <p className="cms-admin-note">{t('pricingHelp')}</p>
    {independentCopy.length > 0 && <p className="cms-admin-note" data-price-copy-warning>{t('independentPriceCopy')}: {independentCopy.join(', ')}</p>}
    {conflict && <div data-price-conflict role="alert"><p>{t('priceConflict')}</p><p>{t('mainAmount')}: {price.amount} {price.currency} · {t('compatPrice')}: {mirror} {price.currency}</p><button type="button" name="use-main-price" disabled={disabled} onClick={() => { setAmount(String(price.amount)); setCurrency(price.currency); setConflictChoice(true); commitMain(String(price.amount), price.currency, basis, true); }}>{t('useMainPrice')}</button><button type="button" name="use-compat-price" disabled={disabled} onClick={() => { setAmount(String(mirror)); setCurrency(price.currency); setConflictChoice(true); commitMain(String(mirror), price.currency, basis, true); }}>{t('useCompatPrice')}</button></div>}
    <label>{t('mainAmount')}<input name="price-amount" disabled={blocked} type="number" min="0" max="1000000" step="any" value={amount} aria-invalid={!valid} onChange={event => { setAmount(event.target.value); commitMain(event.target.value, currency, basis); }} /></label>
    {!valid && <p role="alert">{t('priceInvalid')}</p>}
    <label>{t('priceCurrency')}<select name="price-currency" disabled={blocked} value={currency} onChange={event => { if (PRICE_CURRENCIES.includes(event.target.value as Currency)) { const next = event.target.value as Currency; setCurrency(next); commitMain(amount, next, basis); } }}>{PRICE_CURRENCIES.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
    <label>{t('priceBasis')}<select name="price-basis" disabled={blocked} value={basis} onChange={event => { if (['person','group','vehicle'].includes(event.target.value)) { const next = event.target.value as Price['basis']; setBasis(next); commitMain(amount, currency, next); } }}>{(['person','group','vehicle'] as const).map(item => <option key={item} value={item}>{t(`per-${item}`)}</option>)}</select></label>
    <p className="cms-admin-note">{t('sharedPrice')}: {document.pages.filter(page => page.productId === product.id || page.sections.some(section => section.type === 'productGrid' ? section.productIds.includes(product.id) : section.type === 'cta' && section.productId === product.id)).map(page => localizedText(page.title, language) || page.id).join(', ')}</p>
    <details><summary>{t('estimatedEquivalents')}</summary><p>{t('manualEquivalents')}</p>{PRICE_CURRENCIES.filter(item => item !== currency).map(item => <div key={item}>
      {estimates[item] === undefined ? <button type="button" data-add-price-estimate={item} disabled={disabled} onClick={() => { setEstimates(current => ({ ...current, [item]: '' })); setDecision('updated'); editedEstimates.current.add(item); setEstimatesPending(true); }}>{t('addEstimate')}: {item}</button> : <><label>{item}<input name={`price-estimate-${item}`} disabled={disabled} type="number" min="0" max="1000000" step="any" value={estimates[item]} aria-invalid={!numberValid(estimates[item]!)} onChange={event => { setEstimates(current => ({ ...current, [item]: event.target.value })); setDecision('updated'); editedEstimates.current.add(item); setEstimatesPending(true); }} /></label>{!numberValid(estimates[item]!) && <p role="alert">{t('priceInvalid')}</p>}<button type="button" data-remove-price-estimate={item} disabled={disabled} onClick={() => { setEstimates(current => ({ ...current, [item]: undefined })); setDecision('updated'); editedEstimates.current.add(item); setEstimatesPending(true); }}>{t('removeEstimate')}: {item}</button></>}
    </div>)}</details>
    {(needsReview || Object.keys(savedEquivalents).length > 0) && <label>{t('reviewEquivalents')}<select name="price-estimates-decision" disabled={disabled} value={decision} onChange={event => { setDecision(event.target.value); setEstimatesPending(true); }}><option value="">{t('choosePriceDecision')}</option><option value="keep">{t('keepEquivalents')}</option><option value="remove">{t('removeEquivalents')}</option><option value="updated">{t('updatedEquivalents')}</option></select></label>}
    <div className="cms-array-actions"><button type="button" name="apply-price" disabled={!valid || blocked || !estimatesValid} onClick={() => {
      if (blocked || !valid || !estimatesValid) return;
      onChange(product.id, { price: { amount: Number(amount), currency, basis }, equivalents: decision === 'remove' ? {} : decision === 'updated' || (estimatesPending && decision === '') ? equivalents : savedEquivalents }); setPending(false); setEstimatesPending(false); editedEstimates.current.clear(); setDecision(''); setConflictChoice(false);
    }}>{t('applyPrice')}</button><button type="button" name="cancel-price" disabled={disabled} onClick={() => {
      const price = estimatesPending ? product.price : openedPrice.current ?? product.price;
      const info = product.practicalInfo;
      if (!price) return;
      setAmount(String(price.amount)); setCurrency(price.currency); setBasis(price.basis);
      setEstimates(Object.fromEntries(PRICE_CURRENCIES.map(item => [item, info?.[`price${item}`] === undefined ? undefined : String(info[`price${item}`])])) as Partial<Record<Currency, string>>);
      setPending(false); setEstimatesPending(false); editedEstimates.current.clear(); setDecision(''); setConflictChoice(false);
      const kept = Object.fromEntries(PRICE_CURRENCIES.filter(item => item !== price.currency && info?.[`price${item}`] !== undefined).map(item => [item, info![`price${item}`]])) as Partial<Record<Currency, number>>;
      onChange(product.id, { price, equivalents: kept });
    }}>{t('cancelPrice')}</button></div>
  </section>;
}
