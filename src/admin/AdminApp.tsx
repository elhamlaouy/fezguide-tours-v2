import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LivePreview } from './LivePreview';
import { PriceEditor, PRICE_CURRENCIES, type PriceChange } from './PriceEditor';
import { validateCmsDocument, type CmsDocument, type CmsPage, type CmsSection } from '../cms/schema';
import {
  AdminApiError, loadAdminContent, loadAdminRevisions, publishAdminDraft, rollbackAdminRevision, saveAdminDraft,
  type AdminContent, type AdminRevision, type AdminWriteResult,
} from './admin-api';
import { MediaUpload } from './MediaUpload';
import { StructuredFields } from './StructuredFields';
import { DraftTransfer } from './DraftTransfer';
import { SUPPORTED_UI_COPY } from '../cms/ui-copy';
import { WORKSPACES, workspaceText, friendlySection, type Workspace, type EditorLayout } from './editor-workspace';
import { editorLabel, FRENCH_ADMIN_LABELS } from './editor-labels';
import { GLOBAL_FIELDS, PAGE_FIELDS, sectionFields, editorDefault, nextEditorId, setEditorPath, removeEditorPage } from '../cms/editor-controls';
import { syncEntityEdits } from '../cms/entity-projection';
import './admin.css';

const SPANISH_LABELS: Record<string, string> = {
  "Sign-in required": "Es necesario iniciar sesión",
  "Your admin session is missing or expired. Sign in through the site gate, then reload. This editor does not keep a PIN or access credential.": "Tu sesión de administración no existe o ha caducado. Inicia sesión a través del acceso del sitio y vuelve a cargar. Este editor no guarda ningún PIN ni credencial de acceso.",
  "Reload": "Volver a cargar",
  "Close": "Cerrar",
  "Loading draft…": "Cargando borrador…",
  "Content editor": "Editor de contenido",
  "Save draft": "Guardar borrador",
  "Publish": "Publicar",
  "No draft is stored yet.": "Todavía no hay ningún borrador guardado.",
  "Pages": "Páginas",
  "Language": "Idioma",
  "New page id": "Identificador de la nueva página",
  "Show in navigation": "Mostrar en la navegación",
  "Add page": "Añadir página",
  "Page enabled": "Página habilitada",
  "Page title": "Título de la página",
  "Enabled": "Habilitada",
  "Move up": "Subir",
  "Move down": "Bajar",
  "Duplicate": "Duplicar",
  "Remove": "Eliminar",
  "New section": "Nueva sección",
  "Add section": "Añadir sección",
  "This section has no text fields.": "Esta sección no tiene campos de texto.",
  "Media": "Imágenes",
  "No media in the library.": "No hay imágenes en la biblioteca.",
  "Theme": "Tema",
  "Font": "Tipografía",
  "Spacing": "Espaciado",
  "Radius": "Radio de las esquinas",
  "Navigation": "Navegación",
  "No navigation links.": "No hay enlaces de navegación.",
  "Page": "Página",
  "Label": "Etiqueta",
  "Footer links": "Enlaces del pie de página",
  "Revisions": "Revisiones",
  "Revision": "Revisión",
  "No revisions loaded.": "No se han cargado revisiones.",
  "Revision id": "Identificador de revisión",
  "Rollback": "Restaurar",
  "Unpublished page. This preview is not public.": "Página sin publicar. Esta vista previa no es pública.",
  "Version": "Versión",
  "Draft revision": "Revisión del borrador",
  "Published revision": "Revisión publicada",
  "none": "ninguna",
  " Unsaved changes.": " Cambios sin guardar.",
  " (unpublished)": " (sin publicar)",
  "text": "texto",
  "Saved revision": "Revisión guardada",
  "Rolled back as revision": "Restaurada como revisión",
  "Version conflict. Reloaded the current draft and did not overwrite it.": "Conflicto de versiones. Se ha vuelto a cargar el borrador actual sin sobrescribirlo.",
  "system": "sistema",
  "compact": "compacto",
  "comfortable": "cómodo",
  "generous": "amplio",
  "square": "rectas",
  "rounded": "redondeadas",
  "pill": "cápsula",
  "primary": "principal",
  "accent": "acento",
  "background": "fondo",
  "hero": "Cabecera",
  "richText": "Texto enriquecido",
  "cardGrid": "Cuadrícula de tarjetas",
  "productGrid": "Cuadrícula de experiencias",
  "gallery": "Galería",
  "benefits": "Ventajas",
  "cta": "Llamada a la acción",
  "reviews": "Opiniones",
  "faq": "Preguntas frecuentes",
  "team": "Equipo",
  "itinerary": "Itinerario",
  "inclusions": "Inclusiones",
  "practicalInfo": "Información práctica",
  "contact": "Contacto",
  "enabled": "habilitada",
  "title": "título",
  "eyebrow": "antetítulo",
  "description": "descripción",
  "links": "enlaces",
  "blocks": "bloques",
  "paragraph": "párrafo",
  "heading": "encabezado",
  "quote": "cita",
  "list": "lista",
  "items": "elementos",
  "cards": "tarjetas",
  "image": "imagen",
  "alt": "texto alternativo",
  "caption": "pie de foto",
  "badge": "etiqueta",
  "images": "imágenes",
  "stops": "paradas",
  "included": "incluido",
  "excluded": "no incluido",
  "draft": "borrador",
  "publish": "publicación",
  "rollback": "restauración"
};

const LOCALES = ['en', 'fr', 'es'] as const;
type Locale = typeof LOCALES[number];
const SECTION_TYPES = ['hero', 'richText', 'cardGrid', 'productGrid', 'gallery', 'benefits', 'cta', 'reviews', 'faq', 'team', 'itinerary', 'inclusions', 'practicalInfo', 'contact'] as const;
const FONTS = ['system', 'inter', 'noto-sans'] as const;
const SPACING = ['compact', 'comfortable', 'generous'] as const;
const RADII = ['square', 'rounded', 'pill'] as const;
const RESERVED_SLUGS = new Set(['admin', 'api', 'assets', 'media']);

export function editorError(error: string, language: Locale): string {
  if (language === 'en') return error;
  if (language === 'fr') {
    const separator = error.indexOf(': ');
    const path = separator < 0 ? '' : error.slice(0, separator);
    const message = separator < 0 ? error : error.slice(separator + 2);
    const explanations: Record<string, string> = {
      'invalid or oversized string': 'Texte non valide ou trop long', 'expected boolean': 'Choisissez oui ou non',
      'number out of range': 'Nombre hors de la plage autorisée', 'unsupported value': 'Valeur non prise en charge',
      'expected object': 'Objet de contenu requis', 'unknown field': 'Champ non pris en charge',
      'expected bounded array': 'Liste non valide ou trop longue', 'unsafe URL': 'Lien non sûr ou non pris en charge',
      'missing reference': 'Le contenu référencé n’existe pas. Retirez d’abord les références avant de supprimer',
      'duplicate identifier': 'Identifiant déjà utilisé', 'reserved slug': 'Identifiant réservé',
      'use a lowercase slug': 'Utilisez un identifiant en minuscules sans espaces', 'already used': 'Cet identifiant est déjà utilisé',
      'enter a revision id': 'Saisissez un identifiant de révision valide', 'exceeds byte limit': 'Le document dépasse la taille autorisée',
      'attribution records are read-only': 'Les textes et attributions des avis sont en lecture seule',
      'home cannot be removed': 'La page d’accueil ne peut pas être supprimée', 'invalid dictionary key': 'Clé de texte non valide ou déjà utilisée',
      'save_failed': 'L’enregistrement du brouillon a échoué', 'publish_failed': 'La publication a échoué', 'rollback_failed': 'La restauration a échoué',
    };
    const explanation = message.startsWith('unknown id ') ? `Image introuvable : ${message.slice(11)}` : explanations[message] ?? 'Contenu non valide. Vérifiez ce champ avant d’enregistrer';
    return path ? `${path}: ${explanation}` : explanation;
  }
  const separator = error.indexOf(': ');
  const path = separator < 0 ? '' : error.slice(0, separator);
  const message = separator < 0 ? error : error.slice(separator + 2);
  const explanations: Record<string, string> = {
    'invalid or oversized string': 'Texto no válido o demasiado largo',
    'expected boolean': 'Selecciona un valor de sí o no',
    'number out of range': 'Número fuera del intervalo permitido',
    'unsupported value': 'Valor no admitido',
    'expected object': 'Se requiere un objeto de contenido',
    'unknown field': 'Campo no admitido',
    'expected bounded array': 'Lista no válida o demasiado larga',
    'unsafe URL': 'Enlace no seguro o no admitido',
    'missing reference': 'No existe el contenido al que se hace referencia',
    'duplicate identifier': 'Identificador duplicado',
    'reserved slug': 'Identificador reservado',
    'use a lowercase slug': 'Usa un identificador en minúsculas, sin espacios',
    'already used': 'Este identificador ya está en uso',
    'enter a revision id': 'Introduce un identificador de revisión válido',
    'exceeds byte limit': 'El documento supera el tamaño permitido',
    'attribution records are read-only': 'El texto y la atribución de las reseñas son de solo lectura',
    'home cannot be removed': 'La página de inicio no se puede eliminar',
    'invalid dictionary key': 'Clave de texto no válida o ya utilizada',
    'save_failed': 'No se ha podido guardar el borrador',
    'publish_failed': 'No se ha podido publicar el borrador',
    'rollback_failed': 'No se ha podido restaurar la revisión',
    'unauthorized': 'Tu sesión ha caducado o no está autorizada',
    'version_conflict': 'Otra persona ha modificado el contenido. Vuelve a cargarlo',
    'invalid_document': 'El documento contiene campos no válidos',
  };
  const explanation = message.startsWith('unknown id ')
    ? `No existe la imagen ${message.slice('unknown id '.length)}`
    : explanations[message] ?? 'Contenido no válido. Revisa este campo antes de guardar';
  return path ? `${path}: ${explanation}` : explanation;
}

interface Notice { version: number; label: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function mapPage(document: CmsDocument, pageId: string, update: (page: CmsPage) => CmsPage): CmsDocument {
  return { ...document, pages: document.pages.map(page => page.id === pageId ? update(page) : page) };
}
function moveItem<T extends { id: string }>(items: T[], id: string, delta: -1 | 1): T[] {
  const index = items.findIndex(item => item.id === id);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= items.length) return items;
  const next = items.slice();
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}
function moveSection(document: CmsDocument, pageId: string, sectionId: string, delta: -1 | 1): CmsDocument {
  return mapPage(document, pageId, page => {
    const sections = moveItem(page.sections, sectionId, delta);
    return sections === page.sections ? page : { ...page, sections };
  });
}
function uniqueId(used: Iterable<string>, raw: string): string {
  const taken = new Set(used);
  const stem = raw.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'item';
  let id = stem;
  let n = 2;
  while (taken.has(id)) {
    const suffix = `-${n}`;
    id = `${stem.slice(0, 80 - suffix.length)}${suffix}`;
    n += 1;
    if (n > 10000) break;
  }
  return id;
}
function blankSection(type: CmsSection['type'], id: string): CmsSection {
  const title = { en: type, fr: type, es: SPANISH_LABELS[type] };
  const empty = { en: [] as string[], fr: [] as string[], es: [] as string[] };
  switch (type) {
    case 'hero': return { id, type, enabled: true, title, variant: 'banner', links: [] };
    case 'richText': return { id, type, enabled: true, title, variant: 'story', blocks: [{ type: 'paragraph', text: { en: '', fr: '', es: '' } }] };
    case 'cardGrid': return { id, type, enabled: true, title, variant: 'overview', cards: [] };
    case 'productGrid': return { id, type, enabled: true, title, variant: 'overview', productIds: [] };
    case 'gallery': return { id, type, enabled: true, title, variant: 'grid', images: [] };
    case 'benefits': return { id, type, enabled: true, title, variant: 'grid', items: [] };
    case 'cta': return { id, type, enabled: true, title, variant: 'banner', links: [] };
    case 'reviews': return { id, type, enabled: true, title, variant: 'grid', reviewIds: [] };
    case 'faq': return { id, type, enabled: true, title, variant: 'list', faqIds: [] };
    case 'team': return { id, type, enabled: true, title, variant: 'grid', teamIds: [] };
    case 'itinerary': return { id, type, enabled: true, title, variant: 'list', stops: [] };
    case 'inclusions': return { id, type, enabled: true, title, variant: 'list', included: empty, excluded: empty };
    case 'practicalInfo': return { id, type, enabled: true, title, variant: 'facts', items: [] };
    case 'contact': return { id, type, enabled: true, title, variant: 'banner', links: [] };
  }
}
function isSectionType(value: string): value is CmsSection['type'] {
  return (SECTION_TYPES as readonly string[]).includes(value);
}
function assignMedia(document: CmsDocument, pageId: string, sectionId: string, mediaId: string): CmsDocument {
  const media = document.media.find(item => item.id === mediaId);
  if (!media) return document;
  return mapPage(document, pageId, page => ({
    ...page,
    sections: page.sections.map(section => {
      if (section.id !== sectionId) return section;
      if (section.type === 'gallery') {
        const images = section.images.length
          ? section.images.map((image, index) => index === 0 ? { ...image, mediaId } : image)
          : [{ mediaId, alt: media.alt }];
        return { ...section, images };
      }
      if (section.type === 'cardGrid' && section.cards[0]) {
        return {
          ...section,
          cards: section.cards.map((card, index) => index === 0 ? { ...card, image: { mediaId, alt: card.image?.alt ?? media.alt, ...(card.image?.caption ? { caption: card.image.caption } : {}) } } : card),
        };
      }
      if (section.type === 'hero' || section.type === 'cta') {
        return { ...section, image: { mediaId, alt: section.image?.alt ?? media.alt, ...(section.image?.caption ? { caption: section.image.caption } : {}) } };
      }
      return section;
    }),
  }));
}
function selectedMediaId(section: CmsSection): string {
  if (section.type === 'gallery') return section.images[0]?.mediaId ?? '';
  if (section.type === 'cardGrid') return section.cards[0]?.image?.mediaId ?? '';
  if (section.type === 'hero' || section.type === 'cta') return section.image?.mediaId ?? '';
  return '';
}
function canPickMedia(section: CmsSection): boolean {
  return section.type === 'hero' || section.type === 'cta' || section.type === 'gallery' || (section.type === 'cardGrid' && section.cards.length > 0);
}
function unknownMediaIds(document: CmsDocument): string[] {
  const known = new Set(document.media.map(item => item.id));
  const found: string[] = [];
  const walk = (value: unknown) => {
    if (Array.isArray(value)) { value.forEach(walk); return; }
    if (!isRecord(value)) return;
    if (typeof value.mediaId === 'string' && value.mediaId && !known.has(value.mediaId) && !found.includes(value.mediaId)) found.push(value.mediaId);
    for (const child of Object.values(value)) walk(child);
  };
  walk(document);
  return found;
}
function isAllowed<T extends string>(value: string, allowed: readonly T[]): value is T {
  return (allowed as readonly string[]).includes(value);
}
// ponytail: PageRenderer hides unpublished pages; preview passes an enabled copy instead of a preview prop.
function previewModel(document: CmsDocument, page: CmsPage): { document: CmsDocument; page: CmsPage } {
  const visible = page.enabled ? page : { ...page, enabled: true };
  const products = page.productId && document.products.some(product => product.id === page.productId && product.published === false)
    ? document.products.map(product => product.id === page.productId ? { ...product, published: true } : product)
    : document.products;
  const blogPosts = document.blogPosts.some(post => post.id === page.id && !post.published)
    ? document.blogPosts.map(post => post.id === page.id ? { ...post, published: true } : post)
    : document.blogPosts;
  // Draft uploads are private even after reload. Never persist preview URLs.
  const media = document.media.map(item => /^\/media\/upload-[a-f0-9-]{36}\.(jpg|png|webp)$/.test(item.src)
    ? { ...item, src: item.src.replace('/media/', '/api/admin/media/') } : item);
  return { document: { ...document, products, blogPosts, media }, page: visible };
}
function labelOf(page: CmsPage, language: Locale): string {
  return page.title[language] || (language === 'es' ? page.slug : page.title.en || page.slug);
}
function sectionLabel(section: CmsSection, language: Locale): string {
  return section.title?.[language] || (language === 'es' ? section.type : section.title?.en || section.type);
}

export function AdminApp({ language, onClose }: { language: 'en' | 'fr' | 'es'; onClose: () => void }): React.JSX.Element {
  const translate = (label: string): string => language === 'es' ? SPANISH_LABELS[label] ?? label : language === 'fr' ? FRENCH_ADMIN_LABELS[label] ?? editorLabel(label, language) : label;
  const [status, setStatus] = useState<'loading' | 'unauthorized' | 'error' | 'ready'>('loading');
  const [draft, setDraft] = useState<CmsDocument | null>(null);
  const [version, setVersion] = useState(0);
  const [draftRevision, setDraftRevision] = useState<number | null>(null);
  const [publishedRevision, setPublishedRevision] = useState<number | null>(null);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [conflict, setConflict] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [revisions, setRevisions] = useState<AdminRevision[]>([]);
  const [rollbackId, setRollbackId] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewSize, setPreviewSize] = useState<'desktop' | 'mobile'>('desktop');
  const [workspace, setWorkspace] = useState<Workspace | 'pricing'>('sections');
  const [pricingProductId, setPricingProductId] = useState('');
  const [pricingPending, setPricingPending] = useState(false);
  const [layout, setLayout] = useState<EditorLayout>('split');
  const [editorWidth, setEditorWidth] = useState(40);
  const [pageSearch, setPageSearch] = useState('');
  const [photoSearch, setPhotoSearch] = useState('');
  const [photoLimit, setPhotoLimit] = useState(12);
  const [sectionPanel, setSectionPanel] = useState<'content' | 'photos' | 'layout' | 'advanced'>('content');
  const editorFocus = useRef<HTMLHeadingElement>(null);
  const w = (key: string) => workspaceText(key, language);
  const [newCopyKey, setNewCopyKey] = useState('');
  const [loadError, setLoadError] = useState('');
  const [locale, setLocale] = useState<Locale>(language);
  const [sectionType, setSectionType] = useState<CmsSection['type']>('hero');
  const [newPageId, setNewPageId] = useState('');
  const [showInNav, setShowInNav] = useState(false);
  const versionRef = useRef(0);
  const savedJson = useRef('');
  const draftRef = useRef<CmsDocument | null>(null);
  const busyRef = useRef(false);
  draftRef.current = draft;

  const applyContent = useCallback((payload: AdminContent) => {
    const next = payload.document ? structuredClone(payload.document) : null;
    versionRef.current = payload.version;
    savedJson.current = next ? JSON.stringify(next) : '';
    setVersion(payload.version);
    setDraftRevision(payload.draftRevision);
    setPublishedRevision(payload.publishedRevision);
    setDraft(next);
    setSelectedPageId(current => next?.pages.some(page => page.id === current) ? current : next?.pages[0]?.id ?? '');
    setStatus('ready');
  }, []);

  const rememberWrite = useCallback((result: AdminWriteResult, label: string) => {
    versionRef.current = result.version;
    setVersion(result.version);
    setDraftRevision(result.draftRevision);
    if (result.published) setPublishedRevision(result.version);
    setNotice({ version: result.version, label });
    setConflict('');
  }, []);

  const reload = useCallback(async () => {
    setStatus('loading');
    setLoadError('');
    try {
      applyContent(await loadAdminContent());
      setRevisions(await loadAdminRevisions().catch(() => []));
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) setStatus('unauthorized');
      else {
        setStatus('error');
        setLoadError(error instanceof AdminApiError ? error.code : 'load_failed');
      }
    }
  }, [applyContent]);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { setLocale(language); }, [language]);

  const failConflict = useCallback(async () => {
    setConflict('Version conflict. Reloaded the current draft and did not overwrite it.');
    setNotice(null);
    try { applyContent(await loadAdminContent()); }
    catch (error) {
      if (error instanceof AdminApiError && error.status === 401) setStatus('unauthorized');
    }
  }, [applyContent]);

  const persist = useCallback(async (): Promise<AdminWriteResult | null> => {
    const current = draftRef.current;
    if (!current) return null;
    const unknown = unknownMediaIds(current);
    const result = validateCmsDocument(current);
    if (unknown.length || !result.valid) {
      setErrors([...unknown.map(id => `media: unknown id ${id}`), ...(result.valid ? [] : result.errors)]);
      return null;
    }
    setErrors([]);
    if (JSON.stringify(result.document) === savedJson.current) {
      return { version: versionRef.current, draftRevision: versionRef.current, published: false };
    }
    try {
      const saved = await saveAdminDraft(versionRef.current, result.document);
      savedJson.current = JSON.stringify(result.document);
      rememberWrite(saved, 'Saved revision');
      return saved;
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 409) {
        await failConflict();
        return null;
      }
      setErrors([error instanceof AdminApiError ? error.code : 'save_failed']);
      return null;
    }
  }, [failConflict, rememberWrite]);

  async function run(action: () => Promise<void>) {
    if (busyRef.current || uploading || importing) return;
    busyRef.current = true;
    setBusy(true);
    try { await action(); }
    finally { busyRef.current = false; setBusy(false); }
  }
  function edit(update: (current: CmsDocument) => CmsDocument) {
    setDraft(current => current ? update(current) : current);
  }
  function changePrice(id: string, change: PriceChange) {
    if (busyRef.current || uploading || importing) return;
    edit(current => {
      const product = current.products.find(item => item.id === id);
      if (!product) return current;
      const practicalInfo = { ...product.practicalInfo };
      for (const currency of PRICE_CURRENCIES) {
        if (currency === change.price.currency) practicalInfo[`price${currency}`] = change.price.amount;
        else if (change.equivalents[currency] === undefined) delete practicalInfo[`price${currency}`];
        else practicalInfo[`price${currency}`] = change.equivalents[currency];
      }
      return syncEntityEdits(current, { ...current, products: current.products.map(item => item.id === id ? { ...item, price: change.price, practicalInfo } : item) }, { pricingOnly: true });
    });
  }
  function editPath(path: string, value: string) {
    edit(current => setEditorPath(current, path.split('.'), value) as CmsDocument);
  }
  function applyValidated(next: CmsDocument): boolean {
    const result = validateCmsDocument(next);
    if (!result.valid) { setErrors(result.errors); return false; }
    setDraft(result.document);
    setErrors([]);
    return true;
  }
  function addSection() {
    if (!draft || !page || !isSectionType(sectionType)) return;
    const id = uniqueId(page.sections.map(item => item.id), sectionType);
    if (!applyValidated(mapPage(draft, page.id, item => ({ ...item, sections: [...item.sections, blankSection(sectionType, id)] })))) return;
    setSelectedSectionId(id);
  }
  function duplicateSection(sectionId: string) {
    if (!draft || !page) return;
    const source = page.sections.find(item => item.id === sectionId);
    if (!source) return;
    const copy = structuredClone(source);
    copy.id = uniqueId(page.sections.map(item => item.id), `${source.id}-copy`);
    const next = mapPage(draft, page.id, item => {
      const index = item.sections.findIndex(section => section.id === sectionId);
      if (index < 0) return item;
      const sections = item.sections.slice();
      sections.splice(index + 1, 0, copy);
      return { ...item, sections };
    });
    if (!applyValidated(next)) return;
    setSelectedSectionId(copy.id);
  }
  function removeSection(sectionId: string) {
    if (!draft || !page) return;
    if (!applyValidated(mapPage(draft, page.id, item => ({ ...item, sections: item.sections.filter(section => section.id !== sectionId) })))) return;
    setSelectedSectionId(current => current === sectionId ? '' : current);
  }
  function addPage() {
    const current = draftRef.current;
    if (!current) return;
    const id = newPageId.trim();
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id) || id.length > 80) { setErrors(['page id: use a lowercase slug']); return; }
    if (RESERVED_SLUGS.has(id)) { setErrors(['page id: reserved slug']); return; }
    if (current.pages.some(item => item.id === id || item.slug === id)) { setErrors(['page id: already used']); return; }
    const title = { en: id, fr: id, es: id };
    const hero = blankSection('hero', 'hero');
    hero.title = title;
    const created: CmsPage = {
      id, slug: id, kind: 'landing', enabled: true, title,
      seo: { title, description: { en: '', fr: '', es: '' } },
      sections: [hero],
    };
    const navigation = showInNav
      ? [...current.navigation, { id: uniqueId(current.navigation.map(link => link.id), `nav-${id}`), pageId: id, label: title, enabled: true }]
      : current.navigation;
    if (!applyValidated({ ...current, pages: [...current.pages, created], navigation })) return;
    setSelectedPageId(id);
    setSelectedSectionId('hero');
    setNewPageId('');
    setShowInNav(false);
  }
  function pickMedia(sectionId: string, mediaId: string) {
    if (!draft || !page) return;
    if (!draft.media.some(item => item.id === mediaId)) { setErrors([`media: unknown id ${mediaId}`]); return; }
    applyValidated(assignMedia(draft, page.id, sectionId, mediaId));
  }
  function setThemeChoice<K extends 'font' | 'spacing' | 'radius'>(key: K, value: string, allowed: readonly CmsDocument['theme'][K][]) {
    if (!isAllowed(value, allowed)) return;
    edit(current => ({ ...current, theme: { ...current.theme, [key]: value } }));
  }

  function structuredEdit(path: string, value: unknown) {
    edit(current => {
      const next = setEditorPath(current, path.split('.'), value) as CmsDocument;
      // Product category and the matching detail-page parent are one relationship.
      if (path === 'products' || path.startsWith('products.')) {
        next.pages = next.pages.map(page => {
          const product = next.products.find(product => product.id === page.productId);
          return product ? { ...page, parentId: product.pageId } : page;
        });
        next.legacy = { ...next.legacy, tours: next.legacy.tours.map(tour => {
          const product = next.products.find(product => product.id === tour.id);
          return product ? { ...tour, pageId: product.pageId } : tour;
        }) };
      }
      return next;
    });
  }
  function removeStructured(path: string, value: unknown) {
    if (!draft) return;
    const parts = path.split('.');
    const arrayPath = parts.slice(0, -1).join('.');
    if (parts[0] === 'products' && parts.length === 2) {
      const product = draft.products[Number(parts[1])];
      if (!product) return;
      structuredEdit('products', draft.products.map(item => item.id === product.id ? { ...item, published: false } : item));
      edit(current => mapPage(current, product.id, page => ({ ...page, enabled: false })));
      setNotice({ version, label: editorLabel('hiddenReferenced', language) });
      return;
    }
    const next = setEditorPath(draft, arrayPath.split('.'), value) as CmsDocument;
    // Never remove referenced library/entities silently. Hide products; other references must be removed first.
    applyValidated(next);
  }
  function addEntity(path: string): boolean {
    if (!draft || !['products', 'editorialEntries', 'blogPosts', 'teamMembers', 'faqs', 'media'].includes(path)) return false;
    const key = path as 'products' | 'editorialEntries' | 'blogPosts' | 'teamMembers' | 'faqs' | 'media';
    const items = draft[key];
    const id = nextEditorId([...draft.pages, ...items], path === 'products' ? 'experience' : path === 'editorialEntries' ? 'article' : 'item');
    const item = editorDefault(GLOBAL_FIELDS[key].item!, draft) as Record<string, unknown>;
    item.id = id;
    if ('title' in item) item.title = { en: id, fr: id, es: id };
    if (key === 'blogPosts') { item.slug = id; item.author = ''; item.date = new Date().toISOString().slice(0, 10); item.published = false; }
    if (key === 'teamMembers') item.name = id;
    if (key === 'products') {
      item.kind = 'product'; item.actionType = 'book_tour'; item.published = false;
      item.pageId = page?.kind !== 'product' ? page?.id ?? draft.pages[0].id : draft.pages.find(p => p.kind !== 'product')?.id ?? draft.pages[0].id;
      const created: CmsPage = { id, slug: id, kind: 'product', enabled: false, parentId: String(item.pageId), productId: id, title: item.title as CmsPage['title'], seo: { title: item.title as CmsPage['title'], description: { en: '', fr: '', es: '' } }, sections: [] };
      applyValidated(syncEntityEdits(draft, { ...draft, products: [...draft.products, item as unknown as CmsDocument['products'][number]], pages: [...draft.pages, created] }));
    } else if (key === 'editorialEntries') {
      const created: CmsPage = { id, slug: id, kind: 'editorial', enabled: false, title: { en: id, fr: id, es: id }, seo: { title: { en: id, fr: id, es: id }, description: { en: '', fr: '', es: '' } }, sections: [blankSection('richText', 'story')] };
      item.pageId = id;
      applyValidated({ ...draft, editorialEntries: [...draft.editorialEntries, item as unknown as CmsDocument['editorialEntries'][number]], pages: [...draft.pages, created] });
    } else if (key === 'blogPosts') {
      const title = item.title as CmsPage['title'];
      const created: CmsPage = { id, slug: id, kind: 'editorial', enabled: false, title, ...(draft.pages.some(p => p.id === 'blog') ? { parentId: 'blog' } : {}), seo: { title, description: { en: '', fr: '', es: '' } }, sections: [blankSection('richText', 'content')], source: 'cms-blog' };
      applyValidated(syncEntityEdits(draft, { ...draft, blogPosts: [...draft.blogPosts, item as unknown as CmsDocument['blogPosts'][number]], pages: [...draft.pages, created] }));
    } else applyValidated({ ...draft, [key]: [...items, item] });
    return true;
  }
  function duplicatePage() {
    if (!draft || !page || !window.confirm(editorLabel('duplicatePage', language))) return;
    const id = nextEditorId(draft.pages, `${page.id}-copy`);
    const copy = structuredClone(page); copy.id = id; copy.slug = id; copy.enabled = false;
    delete copy.seo.canonical;
    const product = draft.products.find(item => item.id === page.id);
    if (product) { copy.productId = id; copy.sections = copy.sections.map(s => s.type === 'cta' && s.productId === product.id ? { ...s, productId: id } : s); }
    const products = product ? [...draft.products, { ...structuredClone(product), id, published: false }] : draft.products;
    if (applyValidated({ ...draft, products, pages: [...draft.pages, copy] })) { setSelectedPageId(id); setSelectedSectionId(''); }
  }
  function removePage() {
    if (!draft || !page || !window.confirm(`${editorLabel('confirmRemove', language)} ${editorLabel('hiddenReferenced', language)}`)) return;
    try {
      const next = removeEditorPage(draft, page.id);
      const retained = next.pages.some(p => p.id === page.id);
      if (applyValidated(next)) {
        if (!retained) { setSelectedPageId(next.pages[0].id); setSelectedSectionId(''); }
        else setNotice({ version, label: editorLabel('hiddenReferenced', language) });
      }
    } catch (error) { setErrors([error instanceof Error ? error.message : 'document: invalid input']); }
  }

  const page = draft?.pages.find(item => item.id === selectedPageId) ?? draft?.pages[0];
  const section = page?.sections.find(item => item.id === selectedSectionId) ?? page?.sections[0];
  const dirty = pricingPending || (draft ? JSON.stringify(draft) !== savedJson.current : false);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (dirty || uploading || importing || busy) { event.preventDefault(); event.returnValue = ''; } };
    const historyGuard = (event: Event) => {
      if (uploading || importing || busy || (dirty && !window.confirm(editorLabel('discard', language)))) event.preventDefault();
    };
    window.addEventListener('beforeunload', guard);
    window.addEventListener('cms-before-navigation', historyGuard);
    return () => { window.removeEventListener('beforeunload', guard); window.removeEventListener('cms-before-navigation', historyGuard); };
  }, [dirty, uploading, importing, busy, language]);
  const leave = () => { if (!uploading && !importing && !busy && (!dirty || window.confirm(editorLabel('discard', language)))) onClose(); };
  const preview = draft && page ? previewModel(draft, page) : null;
  const visiblePhotos = draft?.media.filter(item => `${item.alt[locale]} ${item.id}`.toLocaleLowerCase().includes(photoSearch.toLocaleLowerCase())) ?? [];
  const openPricing = (id: string) => {
    if (busyRef.current || uploading || importing) return;
    if (id !== pricingProductId && pricingPending && !window.confirm(editorLabel('discard', language))) return;
    if (id !== pricingProductId) setPricingPending(false);
    setPricingProductId(id); setWorkspace('pricing'); setLayout('split');
  };
  const choosePage = (id: string) => { setSelectedPageId(id); setSelectedSectionId(''); setWorkspace('sections'); setSectionPanel('content'); };
  const chooseSection = (id: string) => {
    setSelectedSectionId(id); setWorkspace('sections'); setSectionPanel('content');
    requestAnimationFrame(() => { editorFocus.current?.focus({ preventScroll: true }); editorFocus.current?.scrollIntoView?.({ block: 'nearest' }); });
  };


  if (status === 'unauthorized') {
    return (
      <section className="cms-admin" data-admin-status="unauthorized" lang={language} dir="ltr">
        <h1>{translate('Sign-in required')}</h1>
        <p>{translate('Your admin session is missing or expired. Sign in through the site gate, then reload. This editor does not keep a PIN or access credential.')}</p>
        <button type="button" onClick={() => { if (!dirty || window.confirm(editorLabel('discard', language))) void reload(); }}>{translate('Reload')}</button>
        <button type="button" onClick={leave}>{translate('Close')}</button>
      </section>
    );
  }
  if (status === 'loading' && !draft) {
    return <section className="cms-admin" data-admin-status="loading" aria-busy="true" lang={language} dir="ltr"><p>{translate('Loading draft…')}</p></section>;
  }
  if (status === 'error' && !draft) {
    return (
      <section className="cms-admin" data-admin-status="error" lang={language} dir="ltr">
        <p role="alert">{language === 'es' ? 'No se ha podido cargar el borrador' : 'The editor could not load the draft'} ({loadError}).</p>
        <button type="button" onClick={() => { if (!dirty || window.confirm(editorLabel('discard', language))) void reload(); }}>{translate('Reload')}</button>
        <button type="button" onClick={leave}>{translate('Close')}</button>
      </section>
    );
  }

  return (
    <section className="cms-admin" data-admin-status="ready" data-layout={layout} data-workspace={workspace} style={{ '--cms-editor-width': `${editorWidth}%` } as React.CSSProperties} lang={language} dir="ltr">
      <header className="cms-admin-bar">
        <div>
          <h1>{draft?.siteSettings.siteName || translate('Content editor')} <span className="cms-editor-badge">{translate('Content editor')}</span></h1>
          <p className="cms-version-details">{translate('Version')} {version}. {translate('Draft revision')} {draftRevision ?? translate('none')}. {translate('Published revision')} {publishedRevision ?? translate('none')}.{dirty ? translate(' Unsaved changes.') : ''}</p>
        </div>
        <div className="cms-admin-actions">
          <span className={dirty ? "cms-draft-state is-dirty" : "cms-draft-state"} role="status">{w(dirty ? 'unsaved' : 'saved')}</span>
          <button type="button" name="save-draft" disabled={busy || uploading || importing || pricingPending || !draft} onClick={() => void run(async () => { await persist(); })}>{translate('Save draft')}</button>
          <button type="button" name="publish" disabled={busy || uploading || importing || pricingPending || !draft} onClick={() => void run(async () => {
            const saved = await persist();
            if (!saved) return;
            try { rememberWrite(await publishAdminDraft(saved.version), 'Published revision'); }
            catch (error) {
              if (error instanceof AdminApiError && error.status === 409) await failConflict();
              else setErrors([error instanceof AdminApiError ? error.code : 'publish_failed']);
            }
          })}>{translate('Publish')}</button>
          <button type="button" onClick={leave}>{translate('Close')}</button>
        </div>
      </header>
      <div className="cms-workspace-toolbar">
        <label className="cms-page-picker">{w('pagePicker')}
          <select name="current-page" value={page?.id ?? ''} onChange={event => choosePage(event.target.value)}>
            {draft?.pages.map(item => <option key={item.id} value={item.id}>{item.id === 'home' ? ({ en: 'Home', fr: 'Accueil', es: 'Inicio' }[language]) : labelOf(item, language)}</option>)}
          </select>
        </label>
        {page?.productId && <button type="button" name="edit-page-pricing" onClick={() => openPricing(page.productId!)}>{w('pricing')}</button>}
        <div className="cms-view-switch" role="group" aria-label={w('preview')}>
          {(['split','editor','preview'] as const).map(mode => <button key={mode} type="button" name={`view-${mode}`} aria-pressed={layout === mode} onClick={() => setLayout(mode)}>{w(mode)}</button>)}
        </div>
        <label className="cms-space-control" hidden={layout !== 'split'}>{w('editorWidth')}<input name="editor-width" type="range" min="28" max="58" value={editorWidth} onChange={event => setEditorWidth(Number(event.target.value))} /></label>
      </div>
      <p className="cms-first-step">{w('intro')}</p>
      {pricingPending && <p className="cms-admin-notice" role="status">{w('pendingPrice')} <button type="button" name="return-to-pricing" onClick={() => { setWorkspace('pricing'); setLayout('split'); }}>{w('pricing')}</button></p>}
      {conflict && <p className="cms-admin-alert" data-admin-conflict role="alert">{translate(conflict)}</p>}
      {notice && <p className="cms-admin-notice" data-revision={notice.version}>{translate(notice.label)} {notice.version}</p>}
      {errors.length > 0 && <ul className="cms-admin-errors" data-field-errors role="alert">{errors.map(error => <li key={error}>{editorError(error, language)}</li>)}</ul>}
      {!draft || !page ? <p>{translate('No draft is stored yet.')}</p> : (
        <div className="cms-admin-layout">
          <div className="cms-work-panel">
          <nav className="cms-workspace-tabs" aria-label={translate('Content editor')}>
            {WORKSPACES.map(key => <button key={key} type="button" data-workspace-tab={key} aria-pressed={workspace === key} onClick={() => setWorkspace(key)}>{w(key)}</button>)}
          </nav>
          <details className="cms-pages-drawer"><summary>{w('allPages')}</summary>
          <label className="cms-page-search">{w('pageSearch')}<input name="page-search" value={pageSearch} onChange={event => setPageSearch(event.target.value)} /></label>
          <nav className="cms-admin-pages" aria-label={translate('Pages')}>
            {draft.pages.filter(item => labelOf(item, language).toLocaleLowerCase().includes(pageSearch.toLocaleLowerCase())).map(item => (
              <button type="button" key={item.id} data-page={item.id} aria-current={item.id === page.id ? 'page' : undefined} onClick={() => choosePage(item.id)}>
                {labelOf(item, language)}{item.enabled ? '' : translate(' (unpublished)')}
              </button>
            ))}
            <div className="cms-admin-create">
              <label>
                {translate('New page id')}
                <input name="new-page-id" value={newPageId} autoComplete="off" spellCheck={false} onChange={event => setNewPageId(event.target.value)} />
              </label>
              <label className="cms-admin-check">
                <input type="checkbox" name="show-in-navigation" checked={showInNav} onChange={event => setShowInNav(event.target.checked)} />
                {translate('Show in navigation')}
              </label>
              <button type="button" name="add-page" onClick={addPage}>{translate('Add page')}</button>
            </div>
          </nav>
          </details>
          <div className="cms-admin-editor">
            <div className="cms-workspace-heading"><h2>{w(workspace)}</h2><p>{w(`${workspace}Help`)}</p></div>
            <div className="cms-admin-tabs" role="tablist" aria-label={translate('Language')}>
              {LOCALES.map(lang => (
                <button type="button" key={lang} role="tab" data-locale={lang} aria-selected={locale === lang} onClick={() => setLocale(lang)}>{lang === 'es' ? 'Español (España)' : lang}</button>
              ))}
            </div>
            {pricingProductId && <div hidden={workspace !== 'pricing'}><PriceEditor key={pricingProductId} document={draft} productId={pricingProductId} language={language} disabled={busy || uploading || importing} onChange={changePrice} onPendingChange={setPricingPending} /></div>}
            <div className="cms-page-settings" hidden={workspace !== 'page'}>
            <label className="cms-admin-check">
              <input type="checkbox" data-flag="page-enabled" checked={page.enabled} onChange={event => edit(current => mapPage(current, page.id, item => ({ ...item, enabled: event.target.checked })))} />
              {translate('Page enabled')}
            </label>
            <label>
              {translate('Page title')} ({locale})
              <textarea data-path={`pages.${page.id}.title.${locale}`} value={page.title[locale]} onChange={event => editPath(`pages.${page.id}.title.${locale}`, event.target.value)} />
            </label>
            <StructuredFields spec={{ ...PAGE_FIELDS, fields: Object.fromEntries(Object.entries(PAGE_FIELDS.fields!).filter(([key]) => !['title', 'enabled'].includes(key))) }} value={page} path={`pages.${page.id}`} document={draft} language={language} locale={locale} onChange={value => structuredEdit(`pages.${page.id}`, value)} />
            <button type="button" name="duplicate-page" onClick={duplicatePage}>{editorLabel('duplicatePage', language)}</button>
            <button type="button" name="remove-page" disabled={page.id === 'home'} onClick={removePage}>{editorLabel('removePage', language)}</button>
            </div>
            <div className="cms-section-workspace" hidden={workspace !== 'sections'}>
            <label className="cms-section-picker">{w('sectionPicker')}
              <select name="current-section" value={section?.id ?? ''} onChange={event => chooseSection(event.target.value)}>
                {page.sections.map((item, index) => <option key={item.id} value={item.id}>{index + 1}. {item.title?.[locale] || friendlySection(item.type, language)}{!item.enabled ? ` · ${translate('Unpublished')}` : ''}</option>)}
              </select>
            </label>
            <div className="cms-section-stepper">
              <button type="button" name="previous-section" disabled={!section || page.sections.findIndex(item => item.id === section.id) < 1} onClick={() => { const index = page.sections.findIndex(item => item.id === section?.id); if (index > 0) chooseSection(page.sections[index - 1].id); }}>{w('previousPart')}</button>
              <button type="button" name="next-section" disabled={!section || page.sections.findIndex(item => item.id === section.id) >= page.sections.length - 1} onClick={() => { const index = page.sections.findIndex(item => item.id === section?.id); if (index >= 0 && index < page.sections.length - 1) chooseSection(page.sections[index + 1].id); }}>{w('nextPart')}</button>
            </div>
            {section && <div className="cms-focused-section">
              <p className="cms-current-part">{w('currentPart')}</p>
              <label className="cms-admin-check"><input type="checkbox" name="show-current-section" checked={section.enabled} onChange={event => edit(current => mapPage(current, page.id, currentPage => ({ ...currentPage, sections: currentPage.sections.map(candidate => candidate.id === section.id ? { ...candidate, enabled: event.target.checked } : candidate) })))} />{w('showSection')}</label>
              <h3 ref={editorFocus} tabIndex={-1}>{section.title?.[locale] || friendlySection(section.type, language)}</h3>
              <div className="cms-section-panels" role="group" aria-label={w('currentPart')}>
                {(['content','photos','layout','advanced'] as const).map(panel => <button key={panel} type="button" data-section-panel={panel} aria-pressed={sectionPanel === panel} onClick={() => setSectionPanel(panel)}>{w(`${panel}Tab`)}</button>)}
              </div>
              {(['content','photos','layout','advanced'] as const).map(panel => <div key={panel} data-section-fields={panel} hidden={sectionPanel !== panel}>
                {panel === 'photos' && ((section.type === 'hero' && section.variant === 'minimal') || (section.type === 'cta' && section.variant !== 'split')) && <p className="cms-admin-note">{w('variantPhotoHelp')}</p>}
                <StructuredFields spec={{ ...sectionFields(section.type), fields: Object.fromEntries(Object.entries(sectionFields(section.type).fields!).filter(([key]) => {
                  const group = ['id','type','enabled'].includes(key) ? 'advanced' : key === 'variant' ? 'layout' : ['image','images'].includes(key) ? 'photos' : 'content';
                  return group === panel;
                })) }} value={section} path={`pages.${page.id}.sections.${section.id}`} document={draft} language={language} locale={locale} onChange={value => structuredEdit(`pages.${page.id}.sections.${section.id}`, value)} onRemove={removeStructured} />
              </div>)}
            </div>}
            <details className="cms-section-outline"><summary>{w('sectionOrder')}</summary>
            <ol className="cms-admin-sections">
              {page.sections.map((item, index) => (
                <li key={item.id} data-selected={section?.id === item.id}>
                  <button type="button" data-section-tab={item.id} aria-current={section?.id === item.id ? 'true' : undefined} onClick={() => chooseSection(item.id)}>
                    <span className="cms-section-number">{index + 1}</span><span>{item.title?.[locale] || friendlySection(item.type, language)}<small>{friendlySection(item.type, language)}</small></span>
                  </button>
                  <details className="cms-section-tools"><summary>{w('sectionTools')}</summary>
                  <label className="cms-admin-check">
                    <input type="checkbox" data-flag="section-enabled" data-section={item.id} checked={item.enabled} onChange={event => edit(current => mapPage(current, page.id, currentPage => ({ ...currentPage, sections: currentPage.sections.map(candidate => candidate.id === item.id ? { ...candidate, enabled: event.target.checked } : candidate) })))} />
                    {translate('Enabled')}
                  </label>
                  <button type="button" data-move="up" data-section={item.id} disabled={index === 0} onClick={() => edit(current => moveSection(current, page.id, item.id, -1))}>{translate('Move up')}</button>
                  <button type="button" data-move="down" data-section={item.id} disabled={index === page.sections.length - 1} onClick={() => edit(current => moveSection(current, page.id, item.id, 1))}>{translate('Move down')}</button>
                  <button type="button" data-duplicate-section={item.id} onClick={() => duplicateSection(item.id)}>{translate('Duplicate')}</button>
                  <button type="button" data-remove-section={item.id} onClick={() => removeSection(item.id)}>{translate('Remove')}</button>
                  </details>
                </li>
              ))}
            </ol>
            </details>
            <details className="cms-add-section"><summary>{w('addSection')}</summary>
            <label>
              {translate('New section')}
              <select name="section-type" value={sectionType} onChange={event => { if (isSectionType(event.target.value)) setSectionType(event.target.value); }}>
                {SECTION_TYPES.map(type => <option key={type} value={type}>{friendlySection(type, language)}</option>)}
              </select>
            </label>
            <button type="button" name="add-section" onClick={addSection}>{translate('Add section')}</button>
            </details>
            </div>
            <div className="cms-photo-workspace" hidden={workspace !== 'photos' && !(workspace === 'sections' && sectionPanel === 'photos')}>
            {(workspace === 'photos' || (section && canPickMedia(section))) && (
              <details className="cms-photo-picker" open={workspace === 'photos'}>
                <summary>{w('replacePhoto')}</summary>
                <label>{w('photoSearch')}<input name="photo-search" value={photoSearch} onChange={event => { setPhotoSearch(event.target.value); setPhotoLimit(12); }} /></label>
                {draft.media.length === 0 ? <p>{translate('No media in the library.')}</p> : (
                  <ul className="cms-admin-media">
                    {visiblePhotos.slice(0, photoLimit).map(item => (
                      <li key={item.id}>
                        <button type="button" data-media-pick={item.id} aria-pressed={section ? selectedMediaId(section) === item.id : false} disabled={!section || !canPickMedia(section)} onClick={() => { if (section && canPickMedia(section)) pickMedia(section.id, item.id); }}>
                          <img src={/^\/media\/upload-[a-f0-9-]{36}\.(jpg|png|webp)$/.test(item.src) ? item.src.replace('/media/', '/api/admin/media/') : item.src} alt="" loading="lazy" />
                          <span>{item.alt[locale] || item.id}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {!visiblePhotos.length && <p>{w('noPhotos')}</p>}
                {visiblePhotos.length > photoLimit && <button type="button" onClick={() => setPhotoLimit(limit => limit + 12)}>{w('morePhotos')}</button>}
              </details>
            )}
            <MediaUpload
              key={`${page.id}:${section?.id ?? ''}`}
              language={language}
              editingLocale={locale}
              onBusyChange={setUploading}
              disabled={busy || importing || uploading || draft.media.length >= 1000}
              onUploaded={media => {
                edit(current => {
                  const next = { ...current, media: [...current.media.filter(item => item.id !== media.id), media] };
                  return section && canPickMedia(section) ? assignMedia(next, page.id, section.id, media.id) : next;
                });
              }}
            />
            </div>
            <div hidden={workspace !== 'appearance'}>
            <fieldset>
              <legend>{translate('Theme')}</legend>
              {(['primary', 'accent', 'background', 'text'] as const).map(key => (
                <label key={key}>
                  {translate(key)}
                  <input type="color" name={`theme-color-${key}`} value={/^#[0-9a-f]{6}$/i.test(draft.theme.colors[key]) ? draft.theme.colors[key].toLowerCase() : '#000000'} onChange={event => {
                    const value = event.target.value;
                    if (!/^#[0-9a-f]{6}$/i.test(value)) return;
                    edit(current => ({ ...current, theme: { ...current.theme, colors: { ...current.theme.colors, [key]: value } } }));
                  }} />
                </label>
              ))}
              <label>
                {translate('Font')}
                <select name="theme-font" value={draft.theme.font} onChange={event => setThemeChoice('font', event.target.value, FONTS)}>
                  {FONTS.map(font => <option key={font} value={font}>{font === 'system' ? translate(font) : font}</option>)}
                </select>
              </label>
              <label>
                {translate('Spacing')}
                <select name="theme-spacing" value={draft.theme.spacing} onChange={event => setThemeChoice('spacing', event.target.value, SPACING)}>
                  {SPACING.map(spacing => <option key={spacing} value={spacing}>{translate(spacing)}</option>)}
                </select>
              </label>
              <label>
                {translate('Radius')}
                <select name="theme-radius" value={draft.theme.radius} onChange={event => setThemeChoice('radius', event.target.value, RADII)}>
                  {RADII.map(radius => <option key={radius} value={radius}>{translate(radius)}</option>)}
                </select>
              </label>
            </fieldset>
            </div>
            <div className="cms-global-fields">
              {Object.entries(GLOBAL_FIELDS).map(([key, spec]) => <details key={key} hidden={key === 'theme' ? workspace !== 'appearance' : key === 'media' ? workspace !== 'photos' : ['siteSettings','navigation','footer'].includes(key) ? workspace !== 'settings' : workspace !== 'content'} open={key === 'theme' || key === 'siteSettings'}><summary>{editorLabel(key, language)}</summary>
                {key === 'reviews' && <p>{editorLabel('reviewHelp', language)}</p>}
                <StructuredFields spec={key === 'theme' ? { ...spec, fields: Object.fromEntries(Object.entries(spec.fields!).filter(([field]) => ['fontScale', 'containerWidth', 'buttonVariant', 'cardVariant'].includes(field))) } : key === 'siteSettings' ? { ...spec, fields: Object.fromEntries(Object.entries(spec.fields!).filter(([field]) => !['heroTitle','heroTagline','heroSubtitle','heroImage'].includes(field))) } : spec} value={draft[key as keyof CmsDocument]} path={key} document={draft} language={language} locale={locale} onChange={value => structuredEdit(key, value)} onRemove={removeStructured} onAdd={addEntity} onEditPrice={openPricing} />
                {key === 'siteSettings' && <details className="cms-legacy-settings"><summary>{w('legacyHero')}</summary><p>{w('legacyHeroHelp')}</p><dl>{(['heroTitle','heroTagline','heroSubtitle','heroImage'] as const).map(field => <div key={field}><dt>{editorLabel(field, language)}</dt><dd>{typeof draft.siteSettings[field] === 'string' ? draft.siteSettings[field] as string : (draft.siteSettings[field] as Record<string,string> | undefined)?.[locale]}</dd></div>)}</dl></details>}
              </details>)}
              <details hidden={workspace !== 'settings'}><summary>{editorLabel('uiCopy', language)} · {w('advancedTab')}</summary>
                {Object.entries({ ...SUPPORTED_UI_COPY, ...Object.fromEntries(Object.entries(draft.uiCopy).filter(([key]) => Object.hasOwn(SUPPORTED_UI_COPY, key))) }).map(([key, value]) => <div key={key}><code>{key}</code><StructuredFields spec={{ type: 'localized' }} value={value} path={`uiCopy.${key}`} document={draft} language={language} locale={locale} onChange={next => edit(current => ({ ...current, uiCopy: { ...current.uiCopy, [key]: next as CmsDocument['uiCopy'][string] } }))} />
                  <button type="button" data-remove-copy={key} onClick={() => { if (window.confirm(editorLabel('confirmRemove', language))) edit(current => ({ ...current, uiCopy: Object.fromEntries(Object.entries(current.uiCopy).filter(([id]) => id !== key)) })); }}>{w('resetCopy')}</button>
                </div>)}
                <details className="cms-unsupported-copy"><summary>{w('unsupportedCopy')}</summary>
                  <p>{w('unsupportedCopyHelp')}</p>
                  {Object.entries(draft.uiCopy).filter(([key]) => !Object.hasOwn(SUPPORTED_UI_COPY, key)).map(([key, value]) => <div key={key}><code>{key}</code><StructuredFields spec={{ type: 'localized' }} value={value} path={`uiCopy.${key}`} document={draft} language={language} locale={locale} onChange={next => edit(current => ({ ...current, uiCopy: { ...current.uiCopy, [key]: next as CmsDocument['uiCopy'][string] } }))} />
                    <button type="button" data-remove-copy={key} onClick={() => { if (window.confirm(editorLabel('confirmRemove', language))) edit(current => ({ ...current, uiCopy: Object.fromEntries(Object.entries(current.uiCopy).filter(([id]) => id !== key)) })); }}>{editorLabel('remove', language)}</button>
                  </div>)}
                <label>{editorLabel('newCopyKey', language)}<input name="new-copy-key" value={newCopyKey} onChange={event => setNewCopyKey(event.target.value)} /></label>
                <button type="button" name="add-copy" onClick={() => {
                  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,159}$/.test(newCopyKey) || ['constructor', 'prototype', '__proto__'].includes(newCopyKey) || Object.hasOwn(draft.uiCopy, newCopyKey)) { setErrors(['uiCopy: invalid dictionary key']); return; }
                  if (applyValidated({ ...draft, uiCopy: { ...draft.uiCopy, [newCopyKey]: { en: '', fr: '', es: '' } } })) setNewCopyKey('');
                }}>{editorLabel('add', language)}</button>
                </details>
              </details>
              <div hidden={workspace !== 'history'}><DraftTransfer document={draft} language={language} disabled={busy || uploading || importing || pricingPending} onBusyChange={setImporting} onError={setErrors} onImport={next => { applyValidated(next); }} /></div>

            </div>
            <fieldset hidden={workspace !== 'history'}>
              <legend>{translate('Revisions')}</legend>
              <ul>
                {revisions.map(revision => (
                  <li key={revision.version}>
                    <button type="button" onClick={() => setRollbackId(String(revision.version))}>{translate('Revision')} {revision.version} ({translate(revision.kind)})</button>
                  </li>
                ))}
                {revisions.length === 0 && <li>{translate('No revisions loaded.')}</li>}
              </ul>
              <label>
                {translate('Revision id')}
                <input name="rollback-revision" inputMode="numeric" value={rollbackId} onChange={event => setRollbackId(event.target.value)} />
              </label>
              <button type="button" name="rollback" disabled={busy || uploading || importing || pricingPending} onClick={() => void run(async () => {
                const revision = Number(rollbackId);
                if (!Number.isSafeInteger(revision) || revision < 1) {
                  setErrors(['revision: enter a revision id']);
                  return;
                }
                try {
                  const result = await rollbackAdminRevision(versionRef.current, revision);
                  rememberWrite(result, 'Rolled back as revision');
                  applyContent(await loadAdminContent());
                  setNotice({ version: result.version, label: 'Rolled back as revision' });
                } catch (error) {
                  if (error instanceof AdminApiError && error.status === 409) await failConflict();
                  else setErrors([error instanceof AdminApiError ? error.code : 'rollback_failed']);
                }
              })}>{translate('Rollback')}</button>
            </fieldset>
          </div>
          </div>
          <div className="cms-admin-preview">
            {!page.enabled && <p className="cms-admin-note">{translate('Unpublished page. This preview is not public.')}</p>}
            {preview && <LivePreview document={preview.document} page={preview.page} language={locale} selectedSectionId={section?.id} onSelectSection={id => { setLayout('split'); chooseSection(id); }} onEditPrice={openPricing} revealPrice={workspace === 'pricing'} onNavigate={choosePage} onLanguageChange={setLocale} device={previewSize} onDeviceChange={setPreviewSize} />}
          </div>
        </div>
      )}
    </section>
  );
}
