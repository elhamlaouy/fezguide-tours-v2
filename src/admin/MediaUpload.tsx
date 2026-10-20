import { useEffect, useId, useRef, useState } from 'react';
import type { CmsMedia } from '../cms/schema';
import type { MediaLocale, MediaText, MediaUploadResult } from '../../worker/media';
import { AdminApiError, uploadAdminMedia } from './admin-api';

const COPY = {
  en: { heading: 'Upload a photo', details: 'Optional title & caption', locale: 'Photo language', file: 'JPEG, PNG or WebP photo', limits: 'Maximum 8 MiB, 12 million pixels, 8192 pixels per side. Animated images are not accepted.', alt: 'Alternative text', title: 'Title (optional)', caption: 'Caption (optional)', upload: 'Upload photo', busy: 'Uploading…', success: 'Photo uploaded to your draft library. Save the draft and publish to make it public.', failure: 'Upload failed. Check the photo and try again.', denied: 'Your editor session expired or is not authorized. Sign in again.', unavailable: 'Photo storage or image validation is not configured. Contact the site administrator.', large: 'The photo exceeds the upload limit.', invalid: 'Choose a valid JPEG, PNG or WebP photo within the limits.', preview: 'Uploaded photo preview', select: 'Use this photo' },
  fr: { heading: 'Ajouter une photo', details: 'Titre et légende facultatifs', locale: 'Langue de la photo', file: 'Photo JPEG, PNG ou WebP', limits: 'Maximum 8 Mio, 12 millions de pixels, 8192 pixels par côté. Les images animées sont refusées.', alt: 'Texte alternatif', title: 'Titre (facultatif)', caption: 'Légende (facultative)', upload: 'Ajouter la photo', busy: 'Envoi en cours…', success: 'Photo ajoutée à la bibliothèque du brouillon. Enregistrez puis publiez pour la rendre publique.', failure: 'Échec de l’envoi. Vérifiez la photo puis réessayez.', denied: 'Votre session a expiré ou n’est pas autorisée. Reconnectez-vous.', unavailable: 'Le stockage ou la validation des photos n’est pas configuré. Contactez l’administrateur.', large: 'La photo dépasse la limite autorisée.', invalid: 'Choisissez une photo JPEG, PNG ou WebP valide respectant les limites.', preview: 'Aperçu de la photo ajoutée', select: 'Utiliser cette photo' },
  es: { heading: 'Subir una foto', details: 'Título y descripción opcionales', locale: 'Idioma de la foto', file: 'Foto JPEG, PNG o WebP', limits: 'Máximo 8 MiB, 12 millones de píxeles, 8192 píxeles por lado. No se admiten imágenes animadas.', alt: 'Texto alternativo', title: 'Título (opcional)', caption: 'Descripción (opcional)', upload: 'Subir foto', busy: 'Subiendo…', success: 'Foto añadida a la biblioteca del borrador. Guarda y publica para hacerla pública.', failure: 'La subida falló. Comprueba la foto e inténtalo de nuevo.', denied: 'Tu sesión ha caducado o no está autorizada. Vuelve a iniciar sesión.', unavailable: 'El almacenamiento o la validación de fotos no está configurado. Contacta con el administrador.', large: 'La foto supera el límite permitido.', invalid: 'Elige una foto JPEG, PNG o WebP válida dentro de los límites.', preview: 'Vista previa de la foto subida', select: 'Usar esta foto' },
} as const;
const empty = (): MediaText => ({ en: '', fr: '', es: '' });
const LANGUAGES: Record<MediaLocale, string> = { en: 'English', fr: 'Français', es: 'Español' };

export interface MediaUploadProps {
  language?: MediaLocale;
  disabled?: boolean;
  editingLocale?: MediaLocale;
  onBusyChange?(busy: boolean): void;
  /** Insert media into the in-memory draft. Uploading never saves or publishes the document. */
  onUploaded(media: CmsMedia, result: MediaUploadResult): void;
  /** Optional: select the uploaded ID in the current image editor. */
  onSelect?(mediaId: string): void;
}

export function MediaUpload({ language = 'en', editingLocale = language, disabled = false, onUploaded, onSelect, onBusyChange }: MediaUploadProps) {
  const id = useId();
  const copy = COPY[language];
  const [activeLocale, setActiveLocale] = useState<MediaLocale>(editingLocale);
  useEffect(() => setActiveLocale(editingLocale), [editingLocale]);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState<MediaText>(empty);
  const [title, setTitle] = useState<MediaText>(empty);
  const [caption, setCaption] = useState<MediaText>(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MediaUploadResult | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => () => { controller.current?.abort(); onBusyChange?.(false); }, [onBusyChange]);

  async function upload() {
    if (!file || busy || disabled) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError(copy.invalid); return; }
    if (file.size > 8 * 1024 * 1024) { setError(copy.large); return; }
    setBusy(true); setError(''); setResult(null);
    const operation = new AbortController(); controller.current = operation;
    try {
      const uploaded = await uploadAdminMedia(file, { alt,
        ...(Object.values(title).some(Boolean) ? { title } : {}), ...(Object.values(caption).some(Boolean) ? { caption } : {}) }, operation.signal);
      if (operation.signal.aborted) return;
      setResult(uploaded);
      onUploaded(uploaded.media, uploaded);
      onSelect?.(uploaded.media.id);
    } catch (failure) {
      if (!operation.signal.aborted) setError(failure instanceof AdminApiError
        ? [401, 403].includes(failure.status) ? copy.denied : failure.status === 503 ? copy.unavailable : failure.status === 413 ? copy.large : failure.status === 422 || failure.status === 415 ? copy.invalid : copy.failure
        : copy.failure);
    } finally { if (!operation.signal.aborted) setBusy(false); }
  }

  return <fieldset className="cms-admin-upload" disabled={disabled || busy} aria-busy={busy}>
    <legend>{copy.heading}</legend>
    <p id={`${id}-limits`}>{copy.limits}</p>
    <label htmlFor={`${id}-file`}>{copy.file}</label>
    <input id={`${id}-file`} type="file" accept="image/jpeg,image/png,image/webp" aria-describedby={`${id}-limits`}
      onChange={event => { setFile(event.currentTarget.files?.[0] ?? null); setError(''); setResult(null); }} />
    <div className="cms-admin-tabs" role="group" aria-label={copy.locale}>{(['en','fr','es'] as const).map(locale => <button key={locale} type="button" aria-pressed={activeLocale === locale} onClick={() => setActiveLocale(locale)}>{LANGUAGES[locale]}</button>)}</div>
    {([language, ...(['en', 'fr', 'es'] as const).filter(locale => locale !== language)]).map(locale => <fieldset key={locale} lang={locale} hidden={activeLocale !== locale}>
      <legend>{LANGUAGES[locale]}</legend>
      <label>{copy.alt}<input maxLength={500} value={alt[locale]} onChange={event => setAlt({ ...alt, [locale]: event.currentTarget.value })} /></label>
      <details><summary>{copy.details}</summary>
      <label>{copy.title}<input maxLength={500} value={title[locale]} onChange={event => setTitle({ ...title, [locale]: event.currentTarget.value })} /></label>
      <label>{copy.caption}<textarea maxLength={2000} value={caption[locale]} onChange={event => setCaption({ ...caption, [locale]: event.currentTarget.value })} /></label>
      </details>
    </fieldset>)}
    <button type="button" name="upload-photo" disabled={!file || busy || disabled} onClick={() => void upload()}>{busy ? copy.busy : copy.upload}</button>
    {error && <p role="alert">{error}</p>}
    {result && <div>
      <p role="status">{copy.success}</p>
      <img src={result.previewSrc} alt={result.media.alt[language] || copy.preview} width={result.media.width} height={result.media.height}
        style={{ maxWidth: '100%', height: 'auto' }} />
      {onSelect && <button type="button" onClick={() => onSelect(result.media.id)}>{copy.select}</button>}
    </div>}
  </fieldset>;
}
