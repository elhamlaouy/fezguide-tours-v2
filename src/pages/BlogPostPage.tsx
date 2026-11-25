import React from 'react';
import { Language } from '../types';
import { useCms } from '../context/CmsContext';
import { useApprovedContent } from '../cms/approved-content';
import { copyText } from '../cms/ui-copy';
import { responsiveImageProps } from '../cms/optimized-image';
import { ArticleBody } from '../cms/ArticleBody';
import { articleOverride } from '../cms/article-format';
import { InternalLink, usePagePath } from '../components/InternalLink';
import { projectBlogPost, visibleBlogPosts } from './blog-projection';
import { ArrowLeft } from 'lucide-react';

interface BlogPostPageProps {
  language: Language;
  /** Id of the blog post (equal to the id of its CMS page). */
  postId: string;
  onNavigate: (pageId: string) => void;
  onBookTour: (tourTitle?: string) => void;
}

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005F5A] rounded-sm';

/** One blog post as an ordinary page of its own (its own URL), rendered inside the normal site shell. */
export const BlogPostPage: React.FC<BlogPostPageProps> = ({ language, postId, onNavigate, onBookTour }) => {
  const { blogPosts } = useCms();
  const { document } = useApprovedContent();
  const pathFor = usePagePath();
  const record = visibleBlogPosts(document, blogPosts).find(post => post.id === postId);
  const page = document?.pages.find(page => page.id === postId);
  const post = record ? projectBlogPost(document, record) : null;
  const contentSection = page?.sections.find(section => section.id === 'content' && section.type === 'richText');
  // Formatted article text (per language) comes from the post itself; otherwise the page's own blocks, as before.
  const articleSource = !record ? undefined : !document ? record.content[language]
    : contentSection?.type === 'richText' && contentSection.enabled ? articleOverride(record, contentSection, language) : undefined;
  const cover = page?.sections.find(section => section.id === 'cover' && section.type === 'gallery');
  const coverAlt = cover?.type === 'gallery' ? cover.images[0]?.alt[language] ?? '' : post?.title[language] ?? '';
  const annotate = Boolean(document);
  const backLink = (
    <InternalLink href={pathFor('blog', language)} onNavigate={() => onNavigate('blog')} className={`inline-flex items-center gap-2 text-sm font-bold text-[#005F5A] hover:text-[#C84B31] transition-colors ${focusRing}`}>
      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      <span>{copyText(document, 'ui.blog.backToAll', language)}</span>
    </InternalLink>
  );

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-6" lang={language} dir="ltr" role="status">
        <h1 className="text-2xl font-extrabold text-[#1C2524]">{language === 'fr' ? 'Article introuvable' : language === 'es' ? 'Artículo no encontrado' : 'Article not found'}</h1>
        {backLink}
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 text-[#1C2524]" lang={language} dir="ltr">
      {backLink}

      {post.coverImage && (
        <img
          data-section-id={annotate && cover?.enabled ? 'cover' : undefined}
          data-section-type={annotate && cover?.enabled ? 'gallery' : undefined}
          {...responsiveImageProps(post.coverImage, '(min-width: 768px) 768px, 100vw', true)}
          alt={coverAlt}
          referrerPolicy="no-referrer"
          className="w-full aspect-[16/9] object-cover rounded-2xl bg-[#1C2524] shadow-xs"
        />
      )}

      <header className="space-y-3">
        <p className="text-xs uppercase font-bold tracking-wider text-[#C84B31]">
          {post.category[language]} · {post.readTime[language]}
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight text-balance">{post.title[language]}</h1>
        <div className="text-sm text-[#52605E] flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>{language === 'fr' ? 'Par' : language === 'es' ? 'Por' : 'By'} {post.author}</span>
          <span aria-hidden="true">·</span>
          <span>{post.date}</span>
        </div>
      </header>

      <div className="space-y-6" data-section-id={annotate && page?.sections.some(section => section.id === 'content' && section.enabled) ? 'content' : undefined} data-section-type={annotate ? 'richText' : undefined}>
        <p className="text-base sm:text-lg font-medium text-[#2A3735] leading-relaxed italic border-l-4 border-[#005F5A] pl-4">
          {post.excerpt[language]}
        </p>

        <ArticleBody text={articleSource ?? post.content[language]} plain={articleSource === undefined} language={language} document={document} />
      </div>

      {/* Author & Booking CTA */}
      <div className="pt-6 border-t border-[#E7E2DA] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-[#728280]">
          {copyText(document, 'ui.blog.writtenWith', language)}
        </div>
        <button
          type="button"
          onClick={() => onBookTour()}
          className={`py-2.5 px-5 bg-[#C84B31] hover:bg-[#B33D25] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer ${focusRing}`}
        >
          {copyText(document, 'ui.blog.bookTour', language)}
        </button>
      </div>

      <div>{backLink}</div>
    </article>
  );
};
