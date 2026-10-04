import React from 'react';
import { CustomPage, Language, PageId } from '../types';
import { UI_TEXT } from '../data/translations';
import { useCms } from '../context/CmsContext';
import { Calendar, Check, Compass, MessageCircle, ArrowLeft } from 'lucide-react';

interface CustomPageRendererProps {
  page: CustomPage;
  language: Language;
  onNavigate: (page: PageId) => void;
  onBookTour: (tourTitle: string) => void;
}

export const CustomPageRenderer: React.FC<CustomPageRendererProps> = ({
  page,
  language,
  onNavigate,
  onBookTour,
}) => {
  const { siteSettings } = useCms();
  const pageTitle = page.title[language] || page.title.en;
  const cleanNumber = (siteSettings.whatsappNumber || '212661234567').replace(/[^0-9]/g, '');


  return (
    <div className="space-y-12 pb-32">
      {/* Hero Banner */}
      <section className="relative bg-[#FAF8F5] py-12 sm:py-20 overflow-hidden">
        <img
          src={page.heroImage}
          alt={page.title[language] || page.title.en}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-85 object-center scale-[1.01]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FAF8F5] via-black/15 to-black/20" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/30 backdrop-blur-md rounded-3xl p-8 sm:p-12 shadow-xl border border-white/40 text-center space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C84B31] bg-white/70 px-3.5 py-1 rounded-full border border-white/50 backdrop-blur-xs shadow-xs">
              <Compass className="w-4 h-4 text-[#005F5A]" />
              <span>FezGuideTours Exclusive</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#005F5A] text-balance drop-shadow-xs">
              {page.title[language] || page.title.en}
            </h1>

            <p className="text-sm sm:text-base text-[#15201F] font-semibold max-w-2xl mx-auto leading-relaxed drop-shadow-xs">
              {page.subtitle[language] || page.subtitle.en}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-3 text-xs">
          <button
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-1.5 font-bold text-[#005F5A] hover:text-[#C84B31] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            <span>
              {language === 'ar' ? 'العودة للرئيسية' : language === 'fr' ? 'Retour à l’accueil' : 'Back to Home'}
            </span>
          </button>
        </div>

        {/* Prose Overview */}
        <div className="bg-white rounded-3xl border border-[#E7E2DA] p-8 sm:p-12 shadow-xs space-y-6">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C2524] tracking-tight">
            {language === 'ar' ? 'تفاصيل البرنامج' : language === 'fr' ? 'Détails du Programme' : 'About This Journey'}
          </h2>
          <p className="text-sm text-[#4E5B59] leading-relaxed whitespace-pre-line">
            {page.content[language] || page.content.en}
          </p>

          {/* Highlights */}
          {page.highlights && page.highlights[language] && page.highlights[language].length > 0 && (
            <div className="pt-6 border-t border-[#F2ECE4] space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">
                {UI_TEXT.common.highlights[language]}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {page.highlights[language].map((h, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-[#2A3735]">
                    <Check className="w-4 h-4 text-[#005F5A] shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action CTAs */}
          <div className="pt-6 flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={() => onBookTour(page.title[language] || page.title.en)}
              className="w-full sm:w-auto py-3 px-6 bg-[#C84B31] hover:bg-[#B33D25] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <Calendar className="w-4 h-4" />
              <span>{UI_TEXT.common.bookNow[language]}</span>
            </button>

            <a
              href={`https://wa.me/${cleanNumber}?text=${encodeURIComponent(
                language === 'ar'
                  ? `السلام عليكم ورحمة الله، أنا مهتم بتجربة "${pageTitle}" عبر FezGuideTours.`
                  : language === 'fr'
                  ? `Bonjour ! Je suis intéressé(e) par l'expérience "${pageTitle}" avec FezGuideTours.`
                  : `Hello! I'm interested in the "${pageTitle}" experience with FezGuideTours.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto py-3 px-6 border border-[#005F5A] text-[#005F5A] hover:bg-[#005F5A]/5 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              <span>{UI_TEXT.common.whatsappChat[language]}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

