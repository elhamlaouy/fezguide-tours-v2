import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import type { Language } from '../types';
import type { CmsDocument, CmsPage } from '../cms/schema';
import { localizedText, themeStyle } from '../cms/render-utils';
import { approvedThemeActive } from '../cms/approved-content';
import { PageRenderer } from '../cms/PageRenderer';
import { formatPrice } from '../cms/SectionRenderer';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { CmsPreviewProvider } from '../context/CmsContext';
import './live-preview.css';
import { workspaceText } from './editor-workspace';

export interface LivePreviewProps {
  document: CmsDocument;
  page: CmsPage;
  language: Language;
  selectedSectionId?: string;
  onSelectSection: (id: string) => void;
  onEditPrice?: (productId: string) => void;
  revealPrice?: boolean;
  onNavigate: (pageId: string) => void;
  onLanguageChange?: (language: Language) => void;
  device: 'desktop' | 'mobile';
  onDeviceChange: (device: 'desktop' | 'mobile') => void;
}

const LABELS = {
  en: { preview: 'Live preview', desktop: 'Desktop', mobile: 'Mobile', select: 'Select sections', browse: 'Browse preview', hint: 'Click a section to edit it', safe: 'Links stay inside this preview. Contact and booking actions are disabled.', fit: 'Fit', edit: 'Edit section', sections: ['Hero', 'Rich text', 'Cards', 'Experiences', 'Gallery', 'Benefits', 'Call to action', 'Reviews', 'FAQ', 'Team', 'Itinerary', 'Inclusions', 'Practical information', 'Contact'] },
  fr: { preview: 'Aperçu en direct', desktop: 'Ordinateur', mobile: 'Mobile', select: 'Sélectionner les sections', browse: 'Parcourir l’aperçu', hint: 'Cliquez sur une section pour la modifier', safe: 'Les liens restent dans l’aperçu. Les actions de contact et de réservation sont désactivées.', fit: 'Ajusté', edit: 'Modifier la section', sections: ['En-tête', 'Texte', 'Cartes', 'Expériences', 'Galerie', 'Avantages', 'Appel à l’action', 'Avis', 'Questions fréquentes', 'Équipe', 'Itinéraire', 'Inclus', 'Informations pratiques', 'Contact'] },
  es: { preview: 'Vista previa en directo', desktop: 'Ordenador', mobile: 'Móvil', select: 'Seleccionar secciones', browse: 'Explorar vista previa', hint: 'Haz clic en una sección para editarla', safe: 'Los enlaces permanecen en la vista previa. Las acciones de contacto y reserva están desactivadas.', fit: 'Ajustado', edit: 'Editar sección', sections: ['Cabecera', 'Texto', 'Tarjetas', 'Experiencias', 'Galería', 'Ventajas', 'Llamada a la acción', 'Opiniones', 'Preguntas frecuentes', 'Equipo', 'Itinerario', 'Inclusiones', 'Información práctica', 'Contacto'] },
};
const SECTION_TYPES = ['hero', 'richText', 'cardGrid', 'productGrid', 'gallery', 'benefits', 'cta', 'reviews', 'faq', 'team', 'itinerary', 'inclusions', 'practicalInfo', 'contact'];

// Static editor-only rules: no draft values are serialized into HTML, CSS, or URLs.
const FRAME_CSS = `
  .cms-preview-price-edit { display: inline-block; margin: 6px 0; padding: 6px 10px; background: #005f5a; color: white; border: 1px solid #fff; border-radius: 5px; font: 600 13px/1.4 system-ui,sans-serif; cursor: pointer; }
  .cms-preview-price-edit:focus-visible { outline: 3px solid #427dce; outline-offset: 2px; }
  html { margin: 0; scroll-behavior: auto !important; overflow-y: auto; }
  body { margin: 0; min-width: 0; }
  .cms-preview-select [data-section-id] { position: relative; cursor: pointer; outline-offset: -3px; }
  .cms-preview-select [data-section-id]:hover,
  .cms-preview-select [data-section-id]:focus-visible { outline: 3px solid #427dce; }
  .cms-preview-select [data-cms-preview-selected="true"] { outline: 3px solid #005f5a; }
  .cms-preview-select [data-section-id]:is(:hover, :focus-visible, [data-cms-preview-selected="true"])::after {
    content: attr(data-cms-preview-label); position: absolute; left: 8px; top: 8px; z-index: 100;
    max-width: calc(100% - 16px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    padding: 6px 10px; border-radius: 5px; background: #005f5a; color: white;
    font: 600 13px/1.4 system-ui, sans-serif; pointer-events: none; box-shadow: 0 2px 8px #0003;
  }
`;

export function LivePreview({ document: model, page, language, selectedSectionId, onSelectSection, onEditPrice, revealPrice = false, onNavigate, onLanguageChange, device, onDeviceChange }: LivePreviewProps) {
  const labels = LABELS[language];
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 520 });
  const [selecting, setSelecting] = useState(true);
  const viewportWidth = device === 'mobile' ? 390 : (size.width > 0 ? Math.min(1280, Math.max(320, Math.round(size.width))) : 1280);
  const scale = size.width > 0 ? Math.min(1, size.width / viewportWidth) : 1;
  const frameHeight = scale > 0 ? Math.ceil(size.height / scale) : size.height;
  const pageProduct = page.productId ? model.products.find(item => item.id === page.productId) : undefined;
  const priceLabel = pageProduct ? formatPrice(pageProduct, language) : '';

  const initializeFrame = useCallback(() => {
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    if (!doc || doc.getElementById('cms-preview-root')) return;
    const meta = doc.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1';
    const style = doc.createElement('style');
    style.textContent = FRAME_CSS;
    style.dataset.cmsPreviewFrame = '';
    doc.head.append(meta, style);
    const target = doc.createElement('div');
    target.id = 'cms-preview-root';
    doc.body.append(target);
    setMount(target);
  }, []);

  useLayoutEffect(initializeFrame, [initializeFrame]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = (width: number, height: number) => {
      if (width > 0) setSize({ width, height: height > 0 ? height : 520 });
    };
    const rect = viewport.getBoundingClientRect();
    measure(rect.width, rect.height);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => measure(entry.contentRect.width, entry.contentRect.height));
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!mount) return;
    const source = iframeRef.current!.ownerDocument;
    const target = mount.ownerDocument;
    const copyStyles = () => {
      target.head.querySelectorAll('[data-cms-preview-source]').forEach(node => node.remove());
      for (const node of source.head.querySelectorAll('style, link[rel="stylesheet"]')) {
        if (node.tagName === 'LINK' && new URL((node as HTMLLinkElement).href, source.baseURI).origin !== source.location.origin) continue;
        const copy = node.cloneNode(true) as HTMLElement;
        if (copy.tagName === 'LINK') (copy as HTMLLinkElement).href = new URL((node as HTMLLinkElement).href, source.baseURI).href;
        copy.dataset.cmsPreviewSource = '';
        target.head.insertBefore(copy, target.head.querySelector('[data-cms-preview-frame]'));
      }
    };
    copyStyles();
    const Observer = source.defaultView?.MutationObserver;
    if (!Observer) return;
    const observer = new Observer(copyStyles);
    observer.observe(source.head, { childList: true, subtree: true, characterData: true, attributes: true });
    return () => observer.disconnect();
  }, [mount]);

  useLayoutEffect(() => {
    if (!mount) return;
    const doc = mount.ownerDocument;
    doc.documentElement.lang = language;
    doc.title = `${labels.preview} — ${labels[device]}`;
    for (const element of mount.querySelectorAll<HTMLElement>('[data-section-id]')) {
      const section = page.sections.find(item => item.id === element.dataset.sectionId);
      if (!section) continue;
      const title = localizedText(section.title, language) || labels.sections[SECTION_TYPES.indexOf(section.type)] || section.type;
      element.dataset.cmsPreviewLabel = `${labels.edit}: ${title}`;
      element.dataset.cmsPreviewSelected = String(section.id === selectedSectionId);
      if (selecting) element.tabIndex = 0;
      else element.removeAttribute('tabindex');
    }
  }, [mount, page, language, labels, device, selectedSectionId, selecting]);

  useLayoutEffect(() => {
    if (!mount || !selecting || !onEditPrice) return;
    const buttons: HTMLButtonElement[] = [];
    for (const element of mount.querySelectorAll<HTMLElement>('[data-price-product-id]')) {
      const id = element.dataset.priceProductId;
      if (!id || !model.products.some(product => product.id === id)) continue;
      const button = mount.ownerDocument.createElement('button');
      button.type = 'button'; button.dataset.editPrice = id;
      button.className = 'cms-preview-price-edit';
      button.textContent = workspaceText('editPrice', language);
      // Keep shortcuts outside product-card buttons: no nested interactive controls.
      (element.closest('button') ?? element).after(button);
      buttons.push(button);
    }
    return () => buttons.forEach(button => button.remove());
  }, [mount, page, model, language, selecting, onEditPrice]);

  useLayoutEffect(() => {
    const stage = viewportRef.current;
    const frame = iframeRef.current;
    if (!stage || !frame) return;
    const onWheel = (event: WheelEvent) => {
      const view = frame.contentWindow;
      if (!view) return;
      view.scrollBy(0, event.deltaY);
      event.preventDefault();
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [mount]);

  // Follow a chosen part once; a pricing edit reveals the price instead of leaving it below the fold.
  useLayoutEffect(() => {
    if (!mount || revealPrice || !selectedSectionId) return;
    const selected = [...mount.querySelectorAll<HTMLElement>('[data-section-id]')].find(element => element.dataset.sectionId === selectedSectionId);
    const view = mount.ownerDocument.defaultView;
    if (selected && view) view.scrollTo({ top: Math.max(0, selected.getBoundingClientRect().top + view.scrollY - 80), behavior: 'auto' });
  }, [mount, selectedSectionId, page.id, device, revealPrice]);

  useLayoutEffect(() => {
    if (!mount || !revealPrice) return;
    const price = mount.querySelector<HTMLElement>('[data-price-product-id]');
    const view = mount.ownerDocument.defaultView;
    if (price && view) view.scrollTo({ top: Math.max(0, price.getBoundingClientRect().top + view.scrollY - 24), behavior: 'auto' });
  }, [mount, revealPrice, page.id, priceLabel]);

  const selectSection = (event: MouseEvent | KeyboardEvent) => {
    const target = event.target as Element;
    const section = target.closest?.<HTMLElement>('[data-section-id]');
    if (!selecting) {
      // Browse can exercise internal navigation and accordions, never external destinations.
      if (target.closest?.('a, form, [data-contact-action], [data-action="book"]')) { event.preventDefault(); event.stopPropagation(); }
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const priceId = target.closest?.<HTMLElement>('[data-edit-price], [data-price-product-id]')?.dataset;
    const productId = priceId?.editPrice ?? priceId?.priceProductId;
    if (productId && onEditPrice && model.products.some(product => product.id === productId)) { onEditPrice(productId); return; }
    const id = section?.dataset.sectionId;
    if (id && page.sections.some(item => item.id === id)) onSelectSection(id);
  };

  const navigate = (pageId: string) => {
    if (!selecting && model.pages.some(item => item.id === pageId)) onNavigate(pageId);
  };

  return <section className="cms-live-preview" data-preview data-preview-size={device} aria-label={labels.preview}>
    <div className="cms-live-preview-toolbar">
      <div className="cms-live-preview-title"><span className="cms-live-preview-dot" aria-hidden="true" />{labels.preview}</div>
      <div className="cms-live-preview-devices" role="group" aria-label={labels.preview}>
        {(['desktop', 'mobile'] as const).map(value => <button type="button" name={`preview-${value}`} key={value} aria-pressed={device === value} onClick={() => onDeviceChange(value)}>{labels[value]}</button>)}
      </div>
      <span className="cms-live-preview-scale">{viewportWidth}px · {labels.fit}{scale > 0 ? ` ${Math.round(scale * 100)}%` : ''}</span>
      {priceLabel ? <strong className="cms-live-preview-price" data-preview-price>{priceLabel}</strong> : null}
    </div>
    <div className="cms-live-preview-tools">
      <div className="cms-live-preview-modes" role="group" aria-label={labels.preview}>
        <button type="button" name="preview-select" aria-pressed={selecting} onClick={() => setSelecting(true)}>{labels.select}</button>
        <button type="button" name="preview-browse" aria-pressed={!selecting} onClick={() => setSelecting(false)}>{labels.browse}</button>
      </div>
      <p className="cms-live-preview-hint">{selecting ? labels.hint : labels.safe}</p>
    </div>
    <div className="cms-live-preview-stage">
      <div className="cms-live-preview-viewport" ref={viewportRef}>
        <div className="cms-live-preview-fitted" style={{ width: scale ? viewportWidth * scale : '100%', height: '100%' }}>
          <iframe ref={iframeRef} title={`${labels.preview} — ${labels[device]}`} sandbox="allow-same-origin" onLoad={initializeFrame} width={viewportWidth} height={frameHeight} style={{ width: viewportWidth, height: frameHeight, transform: `scale(${scale})` }} />
        </div>
      </div>
    </div>
    {mount && createPortal(<div data-cms-site data-cms-themed={String(approvedThemeActive(model.theme))} data-button-variant={model.theme.buttonVariant} data-card-variant={model.theme.cardVariant} className={selecting ? 'cms-preview-select' : 'cms-preview-browse'} style={themeStyle(model.theme)} onClickCapture={selectSection} onAuxClickCapture={selectSection} onSubmitCapture={event => event.preventDefault()} onKeyDownCapture={event => {
      if (selecting && (event.key === 'Enter' || event.key === ' ')) selectSection(event);
    }}>
      <CmsPreviewProvider document={model}>
        <Navbar document={model} currentPage={page.id} activeCategory={page.parentId} language={language} onNavigate={navigate} onLanguageChange={next => onLanguageChange?.(next)} onOpenBooking={() => {}} />
        <PageRenderer document={model} page={page} language={language} onNavigate={navigate} onBook={() => {}} />
        <Footer document={model} language={language} onNavigate={navigate} />
      </CmsPreviewProvider>
    </div>, mount)}
  </section>;
}
