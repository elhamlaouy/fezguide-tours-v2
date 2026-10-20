import { Suspense } from 'react';
import { CmsPreviewProvider } from '../context/CmsContext';
import type { Language } from '../types';
import type { CmsDocument, CmsPage } from './schema';
import { blogMetadata, contentLanguage, isPublicPage, localizedText, themeStyle } from './render-utils';
import { SectionRenderer, visibleBookingProduct } from './SectionRenderer';
import { approvedPage, approvedSectionIds } from './ApprovedPageRenderer';
import { ApprovedContentProvider } from './approved-content';
import './cms-renderer.css';

export interface PageRendererProps {
  document: CmsDocument;
  page: CmsPage;
  language: Language;
  onNavigate: (pageId: string) => void;
  onBook: (productId: string) => void;
}

const KIND_CLASS = {
  editorial: 'cms-kind-editorial',
  product: 'cms-kind-product',
  landing: 'cms-kind-landing',
} as const;

/** Public page view. Uses the document as given — never reloads source defaults over edits. */
// ponytail: unpublished pages render nothing; add a preview prop when the editor must show drafts.
export function PageRenderer({ document, page, language, onNavigate, onBook }: PageRendererProps) {
  if (!isPublicPage(document, page)) return null;
  const lang = contentLanguage(page, language);
  const approved = approvedPage({document, page, language:lang, onNavigate, onBook});
  if (approved !== undefined) {
    const originalIds = new Set(approvedSectionIds(page));
    const additional = page.sections.filter(section => section.enabled && !originalIds.has(section.id) && (section.type !== 'cta' || section.variant !== 'booking' || visibleBookingProduct(document, page, section)));
    return <CmsPreviewProvider document={document}><ApprovedContentProvider document={document} page={page} language={lang}><Suspense fallback={<p role="status" style={{minHeight:'100svh'}}>{lang === 'fr' ? 'Chargement…' : lang === 'es' ? 'Cargando…' : 'Loading…'}</p>}>{approved}</Suspense>{additional.length > 0 && <article className="cms-page" lang={lang} style={themeStyle(document.theme)}>{additional.map(section => <SectionRenderer key={section.id} document={document} page={page} section={section} language={lang} titleTag="h2" onNavigate={onNavigate} onBook={onBook} />)}</article>}</ApprovedContentProvider></CmsPreviewProvider>;
  }
  const sections = page.sections.filter(section =>
    section.enabled && (section.type !== 'cta' || section.variant !== 'booking' || visibleBookingProduct(document, page, section)));
  const hero = sections.find(section => section.type === 'hero' && localizedText(section.title, lang));

  return (<>

    <article className={`cms-page ${KIND_CLASS[page.kind] ?? 'cms-kind-landing'}`} lang={lang} dir="ltr" style={themeStyle(document.theme)} data-card-variant={document.theme.cardVariant === 'flat' ? 'flat' : 'outlined'} data-button-variant={document.theme.buttonVariant === 'outline' ? 'outline' : 'solid'}>
      {!hero && <header className="cms-page-header"><h1>{localizedText(page.title, lang)}</h1>{blogMetadata(document, page.id, lang) && <p className="cms-meta">{blogMetadata(document, page.id, lang)}</p>}</header>}
      {sections.map((section, index) => (
        <SectionRenderer
          key={`${section.id}-${index}`}
          document={document}
          page={page}
          section={section}
          language={lang}
          titleTag={section === hero ? 'h1' : 'h2'}
          onNavigate={onNavigate}
          onBook={onBook}
        />
      ))}
    </article>
  </>);
}
