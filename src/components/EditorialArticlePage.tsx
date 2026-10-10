import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Language, PageId } from '../types';
import { EditorialArticle } from '../data/editorialArticles';
import { PageCrumbBar } from './PageCrumbBar';
import { TripadvisorReviewsSection } from './TripadvisorReviewsSection';

interface EditorialArticlePageProps {
  article: EditorialArticle;
  language: Language;
  onBack: () => void;
  onNavigate: (page: PageId) => void;
  onOpenProduct: () => void;
}

const text = (value: Partial<Record<Language, string>> | undefined, language: Language) =>
  value?.[language] || value?.en || '';

export const EditorialArticlePage: React.FC<EditorialArticlePageProps> = ({
  article,
  language,
  onBack,
  onNavigate,
  onOpenProduct,
}) => {
  const bodyLanguage: Language = language === 'ar' ? 'en' : language;
  const parentLabel = language === 'ar' ? 'جولات الأكل' : language === 'fr' ? 'Tours culinaires' : 'Food Tours';

  return (
    <div className="bg-[#FAF8F5] pb-20" dir={language === 'ar' ? 'ltr' : undefined}>
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
          const paragraphs = section.paragraphs[bodyLanguage] || section.paragraphs.en;
          const heading = text(section.heading, bodyLanguage);
          return (
            <section key={index} className="space-y-7">
              {heading && (
                <h2 className="max-w-3xl text-2xl sm:text-3xl font-extrabold tracking-tight text-[#005F5A]">{heading}</h2>
              )}
              {paragraphs.map((paragraph) => (
                <p key={paragraph} className="editorial-story-copy max-w-3xl text-sm sm:text-base leading-8 text-[#445250]">
                  {paragraph}
                </p>
              ))}
              {section.images.length > 0 && (
                <div className={`grid gap-4 ${section.images.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                  {section.images.map((image) => {
                    const portrait = image.height > image.width;
                    return (
                      <div
                        key={image.src}
                        className={`overflow-hidden rounded-2xl border border-[#E7E2DA] bg-[#1C2524] shadow-sm flex items-center justify-center ${portrait ? 'max-h-[620px]' : 'aspect-4/3'}`}
                      >
                        <img
                          src={image.src}
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
                </div>
              )}
            </section>
          );
        })}

        <section className="grid grid-cols-1 lg:grid-cols-2 overflow-hidden rounded-3xl bg-[#005F5A] text-white shadow-xl">
          <img
            src={article.cta.image}
            alt={text(article.cta.imageAlt, language)}
            className="w-full h-full min-h-72 sm:min-h-96 lg:min-h-[28rem] object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="p-7 sm:p-10 lg:p-12 flex flex-col justify-center gap-5">
            <p className="text-base sm:text-lg leading-relaxed text-[#E6F4F2]">{text(article.cta.intro, language)}</p>
            <p className="text-xl sm:text-2xl font-extrabold leading-snug">{text(article.cta.lead, language)}</p>
            <button
              onClick={onOpenProduct}
              className="w-full sm:w-fit inline-flex items-center justify-center gap-2 rounded-xl bg-[#C84B31] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#B33D25] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.98] transition-colors cursor-pointer"
            >
              {text(article.cta.button, language)}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </section>

        <TripadvisorReviewsSection language={language === 'fr' ? 'fr' : 'en'} />
      </article>
    </div>
  );
};
