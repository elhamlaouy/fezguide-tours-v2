import React, { useEffect } from 'react';
import { SectionPillar, Language } from '../types';
import { UI_TEXT } from '../data/translations';
import { useCms } from '../context/CmsContext';
import { X, Check, Clock, MapPin, Users, Calendar, MessageCircle, ShieldCheck } from 'lucide-react';

interface DetailModalProps {
  pillar: SectionPillar | null;
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onBookNow: (tourTitle: string) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  pillar,
  isOpen,
  onClose,
  language,
  onBookNow,
}) => {
  const { siteSettings } = useCms();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !pillar) return null;

  const rawNumber = siteSettings.whatsappNumber || '212719603009';
  const cleanNumber = rawNumber.replace(/[^0-9]/g, '');
  const tourName = pillar.title[language] || (language === 'es' ? '' : pillar.title.en);

  const getWhatsAppMessage = () => {
    if (language === 'es') {
      return `Hola, me interesa la visita "${tourName}" de FezGuideTours. ¿Podéis indicarme las fechas disponibles?`;
    }
    if (language === 'fr') {
      return `Bonjour ! Je suis intéressé(e) par la visite "${tourName}" via FezGuideTours. Pourriez-vous me donner les disponibilités ?`;
    }
    return `Hello Med! I am interested in the "${tourName}" experience with FezGuideTours. Could you please share availability and details?`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E7E2DA] overflow-hidden my-8 text-[#1C2524]">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors cursor-pointer"
          aria-label={language === 'es' ? "Cerrar ventana" : "Close modal"}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Image with Scrim */}
        <div className="relative h-64 sm:h-72 w-full bg-[#1C2524]">
          <img
            src={pillar.image}
            alt={pillar.imageAlt[language]}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1C2524] via-[#1C2524]/40 to-transparent" />
          <div className="absolute bottom-4 left-6 right-6 text-white">
            <span className="text-xs uppercase tracking-wider font-bold text-[#E07A5F] block mb-1">
              {pillar.subtitle[language]}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {pillar.title[language]}
            </h2>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Practical Info Pill-free Metadata Row */}
          {pillar.practicalInfo && (
            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-[#52605E] pb-4 border-b border-[#E7E2DA]">
              {pillar.practicalInfo.duration && (
                <div className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-4 h-4 text-[#005F5A]" />
                  <span>{pillar.practicalInfo.duration[language]}</span>
                </div>
              )}
              {pillar.practicalInfo.departure && (
                <div className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-4 h-4 text-[#C84B31]" />
                  <span>{pillar.practicalInfo.departure[language]}</span>
                </div>
              )}
              {pillar.practicalInfo.groupSize && (
                <div className="flex items-center gap-1.5 font-medium">
                  <Users className="w-4 h-4 text-[#005F5A]" />
                  <span>{pillar.practicalInfo.groupSize[language]}</span>
                </div>
              )}
              {pillar.practicalInfo.priceMAD && (
                <div className="ms-auto font-bold text-sm text-[#005F5A] tabular-nums">
                  {UI_TEXT.common.fromPrice[language]} {pillar.practicalInfo.priceMAD} MAD (~{pillar.practicalInfo.priceEUR}€)
                </div>
              )}
            </div>
          )}

          {/* Detailed Prose Description */}
          <div className="space-y-3">
            <p className="text-sm text-[#2A3735] leading-relaxed whitespace-pre-line">
              {pillar.fullDescription[language]}
            </p>
          </div>

          {/* Highlights List */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#005F5A] mb-3">
              {UI_TEXT.common.highlights[language]}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {pillar.highlights[language].map((highlight, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-[#2A3735]">
                  <Check className="w-4 h-4 text-[#005F5A] shrink-0 mt-0.5" />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Official License Assurance */}
          <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E7E2DA] flex items-center gap-3 text-xs text-[#4A5755]">
            <ShieldCheck className="w-5 h-5 text-[#005F5A] shrink-0" />
            <span>
              {UI_TEXT.footer.trustBadges[language]}
            </span>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={() => {
                onClose();
                onBookNow(pillar.title[language]);
              }}
              className="w-full sm:flex-1 py-3 px-5 bg-[#C84B31] hover:bg-[#B33D25] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>{UI_TEXT.common.bookNow[language]}</span>
            </button>
            <a
              href={`https://wa.me/${cleanNumber}?text=${encodeURIComponent(getWhatsAppMessage())}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto py-3 px-5 border border-[#005F5A] text-[#005F5A] hover:bg-[#005F5A]/5 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
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
