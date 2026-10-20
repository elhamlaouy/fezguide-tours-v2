import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Language, PageId } from '../types';
import { EditorialArticle } from '../data/editorialArticles';
import { PageCrumbBar } from './PageCrumbBar';
import { TripadvisorReviewsSection } from './TripadvisorReviewsSection';
import { useApprovedContent, ApprovedSection, ApprovedSections } from '../cms/approved-content';
import { contentLanguage, visibleLink } from '../cms/render-utils';
import { responsiveImageProps } from '../cms/optimized-image';
import { businessContactHref } from '../cms/business-contact';

export interface FezStoryImage { src: string; alt: string; width?: number; height?: number; objectPosition?: string }

/** Keep the approved story markup; only its content source changes in CMS mode. */
export function useFezEditorial(pageId: string, language: Language) {
  const { document, page, section } = useApprovedContent(pageId);
  const locale = page ? contentLanguage(page, language) : language;
  const story = (id: string, fallback: string) => document
    ? (section(id, 'richText')?.blocks ?? []).flatMap(block => block.type === 'list' ? block.items[locale] : [block.text[locale]]).join('\n\n')
    : fallback;
  const images = (id: string, fallback: FezStoryImage[]): FezStoryImage[] => document
    ? (section(id, 'gallery')?.images ?? []).flatMap(image => {
      const media = document.media.find(media => media.id === image.mediaId);
      return media ? [{ src: media.src, alt: image.alt[locale], width: media.width, height: media.height,
        objectPosition: media.focalPoint ? `${media.focalPoint.x * 100}% ${media.focalPoint.y * 100}%` : undefined }] : [];
    }) : fallback;
  const orderGroups = <T,>(items: T[], ids: (item: T) => string[]) => {
    if (!document) return items;
    const position = (item: T) => Math.min(...(page?.sections ?? []).flatMap((section, index) => section.enabled && ids(item).includes(section.id) ? [index] : []));
    return [...items].filter(item => Number.isFinite(position(item))).sort((a, b) => position(a) - position(b));
  };
  return { document, page, locale, section, story, images, orderGroups };
}

interface EditorialArticlePageProps {
  article: Omit<EditorialArticle, 'sections'> & { sections: (EditorialArticle['sections'][number] & { storyId?: string; photosId?: string })[] };
  language: Language;
  onBack: () => void;
  onNavigate: (page: PageId) => void;
  onOpenProduct: () => void;
}

const text = (value: Partial<Record<Language, string>> | undefined, language: Language) =>
  language === 'es' ? value?.es ?? '' : value?.[language] ?? value?.en ?? '';

export const EditorialArticlePage: React.FC<EditorialArticlePageProps> = ({
  article,
  language,
  onBack,
  onNavigate,
  onOpenProduct,
}) => {
  const { document, page } = useApprovedContent(article.id);
  const bodyLanguage = page ? contentLanguage(page, language) : language;
  const ctaSection = page?.sections.find(section => section.id === 'product-cta' && section.type === 'cta');
  const ctaLink = document && ctaSection?.type === 'cta' ? ctaSection.links.find(link => visibleLink(document, link)) : undefined;
  const ctaClass = 'w-full sm:w-fit inline-flex items-center justify-center gap-2 rounded-xl bg-[#C84B31] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#B33D25] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.98] transition-colors cursor-pointer';
  const parentLabel = article.parentLabel
    ? text(article.parentLabel, language)
    : language === 'es' ? 'Visitas gastronómicas' : language === 'fr' ? 'Tours culinaires' : 'Food Tours';

  return (
    <div className="bg-[#FAF8F5] pb-20">
      <PageCrumbBar
        language={language}
        parentLabel={parentLabel}
        currentTitle={text(article.title, language)}
        onHome={() => onNavigate('home')}
        onParent={onBack}
      />

      <article className="editorial-story-page max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 space-y-12 sm:space-y-16">
        <header className="max-w-3xl space-y-5">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#005F5A]">
            {text(article.title, language)}
          </h1>
        </header>

        {article.sections.map((section, index) => {
          const storyId = section.storyId ?? (!document ? `story-${index + 1}` : '');
          const photosId = section.photosId ?? (!document ? `photos-${index + 1}` : '');
          const storyVisible = !document || page?.sections.some(item => item.id === storyId && item.enabled) === true;
          const paragraphs = storyVisible ? section.paragraphs[bodyLanguage] ?? [] : [];
          const heading = storyVisible ? text(section.heading, bodyLanguage) : '';
          const storyContent = <>{heading && (
                <h2 className="max-w-3xl text-2xl sm:text-3xl font-extrabold tracking-tight text-[#005F5A]">{heading}</h2>
              )}
              {paragraphs.map((paragraph) => (
                <p key={paragraph} className="editorial-story-copy max-w-3xl text-sm sm:text-base leading-8 text-[#445250]">
                  {paragraph}
                </p>
              ))}</>;
          const photoContent = section.images.length > 0 ? (<div className={`grid gap-4 ${section.images.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                  {section.images.map((image) => {
                    const portrait = image.height > image.width;
                    return (
                      <div
                        key={image.src}
                        className={`overflow-hidden rounded-2xl border border-[#E7E2DA] bg-[#1C2524] shadow-sm flex items-center justify-center ${portrait ? 'max-h-[620px]' : 'aspect-4/3'}`}
                      >
                        <img
                          {...responsiveImageProps(image.src, 'min(1024px, calc(100vw - 2rem))', true)}
                          alt={text(image.alt, language)}
                          width={image.width}
                          height={image.height}
                          loading={index === 0 ? 'eager' : 'lazy'}
                          decoding="async"
                          className={portrait ? 'max-h-[620px] w-auto max-w-full object-contain' : 'w-full h-full object-cover'}
                        />
                      </div>
                    );
                  })}
                </div>) : null;
          const photosFirst = storyVisible && document && page && page.sections.findIndex(item => item.id === photosId && item.enabled) >= 0 && page.sections.findIndex(item => item.id === photosId) < page.sections.findIndex(item => item.id === storyId);
          if (photosFirst) return (
            <section key={storyId} className="space-y-7">
              {photoContent && <ApprovedSection id={photosId}>{photoContent}</ApprovedSection>}
              <ApprovedSection id={storyId}><div className="space-y-7">{storyContent}</div></ApprovedSection>
            </section>
          );
          return (
            <ApprovedSection key={storyId || photosId} id={storyVisible ? storyId : photosId}><section className="space-y-7">
              {storyContent}
              {photoContent && (storyVisible ? <ApprovedSection id={photosId}>{photoContent}</ApprovedSection> : photoContent)}
            </section></ApprovedSection>
          );
        })}

        {article.cta && (
        <ApprovedSection id="product-cta"><section className="grid grid-cols-1 lg:grid-cols-2 overflow-hidden rounded-3xl bg-[#005F5A] text-white shadow-xl">
          {article.cta.image && <img
            {...responsiveImageProps(article.cta.image, '(min-width: 1024px) 480px, calc(100vw - 2rem)', true)}
            alt={text(article.cta.imageAlt, language)}
            className="w-full h-full min-h-72 sm:min-h-96 lg:min-h-[28rem] object-cover"
            loading="lazy"
            decoding="async"
          />}
          <div className="p-7 sm:p-10 lg:p-12 flex flex-col justify-center gap-5">
            <p className="text-base sm:text-lg leading-relaxed text-[#E6F4F2]">{text(article.cta.intro, language)}</p>
            <p className="text-xl sm:text-2xl font-extrabold leading-snug">{text(article.cta.lead, language)}</p>
            {document ? (ctaLink ? (ctaLink.pageId ? <button onClick={() => ctaLink.pageId === article.productId ? onOpenProduct() : onNavigate(ctaLink.pageId!)} className={ctaClass}>{text(ctaLink.label, bodyLanguage)}<ArrowRight className="w-4 h-4" aria-hidden="true" /></button> : <a href={businessContactHref(document, ctaLink.href ?? '')} className={ctaClass}>{text(ctaLink.label, bodyLanguage)}<ArrowRight className="w-4 h-4" aria-hidden="true" /></a>) : null) : <button onClick={onOpenProduct} className={ctaClass}>
              {text(article.cta.button, language)}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>}
          </div>
        </section></ApprovedSection>
        )}

        {article.contact && (
          <ApprovedSection id="contact"><p className="max-w-3xl">
            <a
              href={document ? businessContactHref(document, article.contact.href) : article.contact.href}
              className="inline-flex items-center justify-center rounded-xl bg-[#005F5A] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#004A46]"
            >
              {text(article.contact.label, language)}
            </a>
          </p></ApprovedSection>
        )}

        <TripadvisorReviewsSection language={language} />
      </article>
    </div>
  );
};
