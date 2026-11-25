import React, { useState } from 'react';
import { Language } from '../types';
import { useCms } from '../context/CmsContext';
import { ApprovedSection, useApprovedContent } from '../cms/approved-content';
import { copyText } from '../cms/ui-copy';
import { responsiveImageProps } from '../cms/optimized-image';
import { InternalLink, usePagePath } from '../components/InternalLink';
import { blogImageSource, projectBlogPost, visibleBlogPosts } from './blog-projection';
import { BookOpen, Calendar, Clock, User, ArrowRight } from 'lucide-react';

interface BlogPageProps {
  language: Language;
  onNavigate: (pageId: string) => void;
}

export const BlogPage: React.FC<BlogPageProps> = ({ language, onNavigate }) => {
  const { blogPosts } = useCms();
  const { document, section } = useApprovedContent('blog');
  const hero = section('hero', 'hero');
  const postsSection = section('posts', 'cardGrid');
  const imageSource = (mediaId: string | undefined) => blogImageSource(document, mediaId);
  const pathFor = usePagePath();
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const canonicalPosts = visibleBlogPosts(document, blogPosts);
  const publishedPosts = document ? (postsSection?.cards ?? []).flatMap(card => {
    const record = canonicalPosts.find(post => post.id === card.pageId);
    if (!record) return [];
    return [{ ...projectBlogPost(document, record), title: card.title, excerpt: card.description, coverImage: imageSource(card.image?.mediaId) ?? '', coverAlt: card.image?.alt[language] ?? '' }];
  }) : canonicalPosts.map(post => ({ ...post, coverAlt: post.title[language] }));

  const categories = [
    'all',
    ...Array.from(new Set(publishedPosts.map((p) => p.category[language]))),
  ];

  const filteredPosts =
    activeCategory === 'all'
      ? publishedPosts
      : publishedPosts.filter((p) => p.category[language] === activeCategory);

  const header = {
    title: {
      en: 'Fez Travel Stories, Heritage & Guides',
      fr: 'Récits de Voyage, Patrimoine & Guides de Fès',
      es: 'Blog de Fez: historias de su patrimonio, guías y secretos de la ciudad',
    },
    subtitle: {
      en: 'Articles and insider guides curated by licensed local historians and storytellers.',
      fr: 'Articles et secrets locaux rédigés par nos historiens et guides officiels.',
      es: 'Artículos y guías exclusivos escritos por guías oficiales e historiadores locales.',
    },
  };

  return (
    <div className="space-y-16 pb-20" lang={language} dir="ltr">
      {/* Hero Header */}
      <ApprovedSection id="hero"><section className="relative bg-[#1C2524] py-12 sm:py-20 overflow-hidden">
        {(!document || hero?.image) && (<img
          {...responsiveImageProps((document ? imageSource(hero?.image?.mediaId) : ("/images/real/fez_history_culture_image1.jpg")) ?? '', '100vw', true)}
          alt={document ? hero?.image?.alt[language] ?? '' : (language === 'es' ? "Blog de viajes de Fez" : "Fez Travel Blog")}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />)}
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/30 backdrop-blur-md rounded-3xl p-8 sm:p-12 shadow-xl border border-white/40 text-center space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C84B31] bg-white/70 px-3.5 py-1 rounded-full border border-white/50 backdrop-blur-xs shadow-xs">
              <BookOpen className="w-4 h-4 text-[#005F5A]" />
              <span>{document ? hero?.eyebrow?.[language] ?? '' : (language === 'es' ? "Diario de FezGuideTours" : "FezGuideTours Journal")}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#005F5A] text-balance drop-shadow-xs">{document ? hero?.title?.[language] ?? '' : (header.title[language])}</h1>

            <p className="text-sm sm:text-base text-[#15201F] font-semibold max-w-2xl mx-auto leading-relaxed drop-shadow-xs">{document ? hero?.description?.[language] ?? '' : (header.subtitle[language])}</p>
          </div>
        </div>
      </section></ApprovedSection>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Category Filters */}
        {(!document || postsSection?.enabled) && categories.length > 2 && (
          <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-white rounded-xl border border-[#E7E2DA] max-w-xl mx-auto shadow-xs">
            {categories.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer capitalize ${
                  activeCategory === cat
                    ? 'bg-[#005F5A] text-white shadow-xs'
                    : 'text-[#445250] hover:text-[#005F5A]'
                }`}
              >
                {cat === 'all' ? copyText(document, 'ui.blog.allArticles', language) : cat}
              </button>
            ))}
          </div>
        )}

        {/* Posts Grid */}
        <ApprovedSection id="posts"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              className="relative bg-white rounded-2xl border border-[#E7E2DA] overflow-hidden shadow-xs hover:shadow-md focus-within:shadow-md transition-all flex flex-col justify-between group"
            >
              {/* Cover Image */}
              <div className="relative aspect-16/10 w-full bg-[#1C2524] overflow-hidden">
                <img
                  {...responsiveImageProps(post.coverImage, '(min-width: 1024px) 33vw, 100vw', true)}
                  alt={post.coverAlt}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-[#005F5A] text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-xs">
                  {post.category[language]}
                </div>
              </div>

              {/* Body */}
              <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 text-[11px] text-[#728280]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#005F5A]" />
                      {post.date}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#005F5A]" />
                      {post.readTime[language]}
                    </span>
                  </div>

                  <h2 className="text-base sm:text-lg font-bold text-[#1C2524] group-hover:text-[#005F5A] transition-colors leading-snug">
                    <InternalLink
                      href={pathFor(post.id, language)}
                      onNavigate={() => onNavigate(post.id)}
                      className="after:absolute after:inset-0 after:z-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005F5A] rounded-sm"
                    >
                      {post.title[language]}
                    </InternalLink>
                  </h2>

                  <p className="text-xs text-[#52605E] leading-relaxed line-clamp-3">
                    {post.excerpt[language]}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#F2ECE4] flex items-center justify-between">
                  <span className="text-[11px] text-[#42504E] flex items-center gap-1.5 font-medium">
                    <User className="w-3.5 h-3.5 text-[#C84B31]" />
                    {post.author}
                  </span>

                  <InternalLink
                    href={pathFor(post.id, language)}
                    onNavigate={() => onNavigate(post.id)}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="text-xs font-bold text-[#005F5A] group-hover:text-[#C84B31] flex items-center gap-1 transition-colors"
                  >
                    <span>
                      {copyText(document, 'ui.blog.readMore', language)}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </InternalLink>

                </div>
              </div>
            </article>
          ))}
        </div></ApprovedSection>
      </div>

    </div>
  );
};
