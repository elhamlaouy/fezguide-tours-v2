import React, { useState } from 'react';
import { Language, BlogPost } from '../types';
import { useCms } from '../context/CmsContext';
import { BookOpen, Calendar, Clock, User, ArrowRight, X, ChevronRight } from 'lucide-react';

interface BlogPageProps {
  language: Language;
  onBookTour: (tourTitle?: string) => void;
}

export const BlogPage: React.FC<BlogPageProps> = ({ language, onBookTour }) => {
  const { blogPosts } = useCms();
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const publishedPosts = blogPosts.filter((p) => p.published !== false);

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
      ar: 'مدونة فاس: قصص التراث، دليلك السياحي، وأسرار المدينة',
    },
    subtitle: {
      en: 'Articles and insider guides curated by licensed local historians and storytellers.',
      fr: 'Articles et secrets locaux rédigés par nos historiens et guides officiels.',
      ar: 'مقالات وأدلة حصرية يكتبها نخبة من المرشدين المعتمدين والمؤرخين المحليين.',
    },
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Header */}
      <section className="relative bg-[#FAF8F5] py-12 sm:py-20 overflow-hidden">
        <img
          src="/src/assets/images/real/fez_history_culture_image1.jpg"
          alt="Fez Travel Blog"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-85 object-center scale-[1.01]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FAF8F5] via-black/15 to-black/20" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/30 backdrop-blur-md rounded-3xl p-8 sm:p-12 shadow-xl border border-white/40 text-center space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C84B31] bg-white/70 px-3.5 py-1 rounded-full border border-white/50 backdrop-blur-xs shadow-xs">
              <BookOpen className="w-4 h-4 text-[#005F5A]" />
              <span>FezGuideTours Journal</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#005F5A] text-balance drop-shadow-xs">
              {header.title[language]}
            </h1>

            <p className="text-sm sm:text-base text-[#15201F] font-semibold max-w-2xl mx-auto leading-relaxed drop-shadow-xs">
              {header.subtitle[language]}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Category Filters */}
        {categories.length > 2 && (
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
                {cat === 'all' ? 'All Articles' : cat}
              </button>
            ))}
          </div>
        )}

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              className="bg-white rounded-2xl border border-[#E7E2DA] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              {/* Cover Image */}
              <div className="relative aspect-16/10 w-full bg-[#1C2524] overflow-hidden">
                <img
                  src={post.coverImage}
                  alt={post.title[language]}
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
                    {post.title[language]}
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

                  <button
                    onClick={() => setSelectedPost(post)}
                    className="text-xs font-bold text-[#005F5A] hover:text-[#C84B31] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>Read More</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Reader Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-[#E7E2DA] overflow-hidden my-8 text-[#1C2524]">
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors cursor-pointer"
              aria-label="Close article"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Image */}
            <div className="relative h-64 sm:h-80 w-full bg-[#1C2524]">
              <img
                src={selectedPost.coverImage}
                alt={selectedPost.title[language]}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
                <span className="text-xs uppercase font-bold text-[#E07A5F]">
                  {selectedPost.category[language]} · {selectedPost.readTime[language]}
                </span>
                <h1 className="text-xl sm:text-3xl font-extrabold leading-tight">
                  {selectedPost.title[language]}
                </h1>
                <div className="text-xs text-[#CCD8D6] flex items-center gap-4 pt-1">
                  <span>By {selectedPost.author}</span>
                  <span>·</span>
                  <span>{selectedPost.date}</span>
                </div>
              </div>
            </div>

            {/* Prose Content */}
            <div className="p-6 sm:p-10 space-y-6">
              <p className="text-base font-medium text-[#2A3735] leading-relaxed italic border-l-4 border-[#005F5A] pl-4">
                {selectedPost.excerpt[language]}
              </p>

              <div className="text-sm text-[#42504E] leading-relaxed whitespace-pre-line space-y-4">
                {selectedPost.content[language]}
              </div>

              {/* Author & Booking CTA */}
              <div className="pt-6 border-t border-[#E7E2DA] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-[#728280]">
                  Written with love by the certified guides of FezGuideTours.
                </div>
                <button
                  onClick={() => {
                    setSelectedPost(null);
                    onBookTour();
                  }}
                  className="py-2.5 px-5 bg-[#C84B31] hover:bg-[#B33D25] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Book a Tour in Fez
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
