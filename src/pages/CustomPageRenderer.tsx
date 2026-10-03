import React, { useState } from 'react';
import { CustomPage, Language, PageId } from '../types';
import { UI_TEXT } from '../data/translations';
import { useCms } from '../context/CmsContext';
import { Calendar, Check, Compass, MessageCircle, ArrowLeft, Trash2 } from 'lucide-react';

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
  const { deleteCustomPage } = useCms();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleDelete = () => {
    deleteCustomPage(page.id);
    onNavigate('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
        {/* Navigation & Admin Bar */}
        <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-3 text-xs">
          <button
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-1.5 font-bold text-[#005F5A] hover:text-[#C84B31] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>
              {language === 'ar' ? 'العودة للرئيسية' : language === 'fr' ? 'Retour à l’accueil' : 'Back to Home'}
            </span>
          </button>

          {/* Direct Delete Page button */}
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#728280] hover:text-[#C84B31] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            title="Delete this custom page"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>
              {language === 'ar' ? 'حذف الصفحة' : language === 'fr' ? 'Supprimer la page' : 'Delete Page'}
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
              href={`https://wa.me/212661234567?text=${encodeURIComponent(
                `Hello! I'm interested in the "${page.title[language] || page.title.en}" experience with FezGuideTours.`
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

      {/* In-app Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full space-y-4 shadow-2xl border border-[#E7E2DA]">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-[#C84B31] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-[#1C2524]">
                {language === 'ar' ? 'تأكيد حذف الصفحة' : 'Delete Custom Page?'}
              </h3>
              <p className="text-xs text-[#52605E]">
                {language === 'ar'
                  ? `هل أنت متأكد من حذف صفحة "${page.title[language] || page.title.en}"؟ سيتم حذفها نهائياً من الموقع.`
                  : `Are you sure you want to permanently delete "/${page.slug}"?`}
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 py-2.5 px-3 border border-[#D5CEC4] rounded-xl text-xs font-bold text-[#52605E] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 px-3 bg-[#C84B31] hover:bg-[#B33D25] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                {language === 'ar' ? 'تأكيد الحذف' : 'Delete Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
