import React, { useState, useEffect } from 'react';
import { Language, PageId, SectionPillar } from '../types';
import { useCms } from '../context/CmsContext';
import { MessageCircle, X, Send, Clock, CheckCircle2, ChevronUp } from 'lucide-react';

interface FloatingWhatsAppButtonProps {
  language: Language;
  currentPage: PageId;
  activePillar?: SectionPillar | null;
}

export const FloatingWhatsAppButton: React.FC<FloatingWhatsAppButtonProps> = ({
  language,
  currentPage,
  activePillar,
}) => {
  const { siteSettings, tours } = useCms();
  const [isOpen, setIsOpen] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [customNote, setCustomNote] = useState('');

  // Clean WhatsApp phone digits
  const rawNumber = siteSettings.whatsappNumber || '212661234567';
  const cleanNumber = rawNumber.replace(/[^0-9]/g, '');

  // Determine current contextual title
  const getContextTitle = () => {
    if (activePillar) {
      return activePillar.title[language] || activePillar.title.en;
    }
    switch (currentPage) {
      case 'fez':
        return language === 'ar' ? 'جولات فاس العتيقة' : language === 'fr' ? 'Visites de Fès' : 'Fez Medina Tours';
      case 'day-trips':
        return language === 'ar' ? 'الرحلات اليومية الخاصة' : language === 'fr' ? 'Excursions d’un jour' : 'Day Trips from Fez';
      case 'food-tours':
        return language === 'ar' ? 'جولات الأكل والتذوق الفاسي' : language === 'fr' ? 'Tours culinaires' : 'Fez Food & Tasting Tours';
      case 'travel-tips':
        return language === 'ar' ? 'نصائح السفر وإرشادات فاس' : language === 'fr' ? 'Conseils de voyage' : 'Travel Tips & Advice';
      case 'about':
        return language === 'ar' ? 'فريق المرشدين المحليين' : language === 'fr' ? 'Équipe locale' : 'About Our Guiding Team';
      case 'home':
      default:
        return language === 'ar' ? 'جولات فاس الخاصة' : language === 'fr' ? 'Visites privées de Fès' : 'Authentic Fez Tours';
    }
  };

  const contextTitle = getContextTitle();

  // Quick preset inquiry templates
  const quickInquiries = [
    {
      label: {
        en: 'Check dates & availability',
        fr: 'Vérifier disponibilités',
        ar: 'التحقق من التواريخ المتاحة',
      },
      text: {
        en: `Hello Med! I would like to check availability for "${contextTitle}". Which dates work best?`,
        fr: `Bonjour Med ! J'aimerais vérifier vos disponibilités pour "${contextTitle}". Quelles sont les dates possibles ?`,
        ar: `السلام عليكم، أود الاستفسار عن التواريخ المتاحة لجولة "${contextTitle}".`,
      },
    },
    {
      label: {
        en: 'Custom private itinerary',
        fr: 'Circuit privé sur mesure',
        ar: 'برنامج خاص لمجموعتي',
      },
      text: {
        en: `Hello! We are looking for a tailored private tour for our group in Fez. Could you suggest an itinerary?`,
        fr: `Bonjour ! Nous recherchons une visite privée personnalisée pour notre groupe à Fès. Pouvez-vous nous conseiller ?`,
        ar: `مرحباً، نرغب في تنظيم جولة خاصة ومخصصة لعائلتنا/مجموعتنا في فاس. هل يمكنكم اقتراح برنامج مناسب؟`,
      },
    },
    {
      label: {
        en: 'Riad pickup & transport question',
        fr: 'Prise en charge au riad',
        ar: 'التوصيل من الرياض والنقل',
      },
      text: {
        en: `Hello! I have a question regarding pickup at our riad/hotel in Fez for "${contextTitle}".`,
        fr: `Bonjour ! J'ai une question concernant la prise en charge à notre riad à Fès pour "${contextTitle}".`,
        ar: `السلام عليكم، لدي استفسار بخصوص التوصيل من مقر إقامتنا بالرياض لجولة "${contextTitle}".`,
      },
    },
  ];

  // Show a gentle preview badge 4 seconds after page load (once per session)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasPrompted && !isOpen) {
        setShowTooltip(true);
        setHasPrompted(true);
      }
    }, 4500);

    return () => clearTimeout(timer);
  }, [hasPrompted, isOpen]);

  // Construct target WhatsApp URL
  const buildWhatsAppUrl = (messageText?: string) => {
    let text = messageText;
    if (!text) {
      if (customNote.trim()) {
        text = customNote.trim();
      } else {
        if (language === 'ar') {
          text = `السلام عليكم ورحمة الله، أتواصل معكم عبر موقع FezGuideTours للاستفسار عن: "${contextTitle}". هل يمكن تزويدي بمزيد من التفاصيل والأسعار؟`;
        } else if (language === 'fr') {
          text = `Bonjour ! Je vous contacte via FezGuideTours au sujet de : "${contextTitle}". Pourriez-vous me donner plus de détails et tarifs ?`;
        } else {
          text = `Hello! I am browsing FezGuideTours and would like to inquire in real-time about "${contextTitle}". Could you please share more details and availability?`;
        }
      }
    }
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
  };

  const handleOpenWhatsApp = (customText?: string) => {
    const url = buildWhatsAppUrl(customText);
    window.open(url, '_blank', 'noopener,noreferrer');
    setShowTooltip(false);
  };

  return (
    <div
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end rtl:right-auto rtl:left-5 rtl:sm:left-6 rtl:items-start select-none"
      aria-label="Contact guide on WhatsApp"
    >
      {/* 1. Gentle Unobtrusive Proactive Tooltip */}
      {showTooltip && !isOpen && (
        <div className="mb-3 animate-bounce-subtle max-w-[280px] sm:max-w-xs bg-white text-[#1C2524] p-3 rounded-2xl shadow-xl border border-[#E7E2DA] flex items-start gap-2.5 relative">
          <button
            onClick={() => setShowTooltip(false)}
            className="absolute top-2 right-2 text-[#8E9F9D] hover:text-[#1C2524] p-1 transition-colors"
            aria-label="Close tooltip"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-[#005F5A] border border-[#005F5A]/20">
            <img
              src="/images/real/about_us_image1.jpg"
              alt="Med Local Guide"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="pr-4 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#005F5A]">
              <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
              <span>
                {language === 'ar'
                  ? 'مرشد محلي متصل الآن'
                  : language === 'fr'
                  ? 'Guide local en ligne'
                  : 'Local Guide Online'}
              </span>
            </div>
            <p className="text-xs text-[#445250] leading-snug">
              {language === 'ar'
                ? `هل لديك سؤال حول "${contextTitle}"؟ تواصل معي مباشرة عبر واتساب!`
                : language === 'fr'
                ? `Une question sur "${contextTitle}" ? Échangez directement avec un guide !`
                : `Have a quick question about "${contextTitle}"? Ask a local guide on WhatsApp!`}
            </p>
            <button
              onClick={() => {
                setShowTooltip(false);
                setIsOpen(true);
              }}
              className="mt-1 text-[11px] font-bold text-[#25D366] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{language === 'ar' ? 'ابدأ المحادثة' : language === 'fr' ? 'Discuter' : 'Chat now'}</span>
              <ChevronUp className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Interactive Quick Inquiry Card (Expandable) */}
      {isOpen && (
        <div className="mb-3 w-[calc(100vw-2.5rem)] sm:w-96 bg-white rounded-3xl shadow-2xl border border-[#E7E2DA] overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* Card Header (WhatsApp & Fez identity) */}
          <div className="bg-[#005F5A] text-white p-4 sm:p-5 relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/30 bg-[#1C2524] shadow-xs">
                  <img
                    src="/images/real/about_us_image1.jpg"
                    alt="Med & Local Team"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#25D366] border-2 border-[#005F5A]" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm leading-none">Med & Fez Guides</h3>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00A896]" />
                </div>
                <p className="text-[11px] text-[#D8E6E4] mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#25D366]" />
                  <span>
                    {language === 'ar'
                      ? 'متاح الآن · يرد خلال دقائق'
                      : language === 'fr'
                      ? 'En ligne · Réponse en quelques minutes'
                      : 'Online now · Replies in minutes'}
                  </span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Close WhatsApp card"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Context Banner */}
          <div className="bg-[#FAF8F5] px-4 py-2.5 border-b border-[#E7E2DA] text-[11px] text-[#52605E] flex items-center justify-between">
            <span className="truncate">
              {language === 'ar' ? 'الاستفسار الحالي:' : language === 'fr' ? 'Votre sélection :' : 'Inquiry Context:'}{' '}
              <strong className="text-[#005F5A]">{contextTitle}</strong>
            </span>
          </div>

          {/* Card Body */}
          <div className="p-4 sm:p-5 space-y-4 text-xs">
            {/* Friendly Note */}
            <div className="p-3 rounded-2xl bg-[#E8F5E9] text-[#1B5E20] border border-[#C8E6C9] leading-relaxed">
              <p>
                {language === 'ar'
                  ? 'مرحباً بك في فاس! أنا والزملاء هنا للإجابة عن أي استفسار حول الجولات، المواقيت، أو ترتيب رحلات خاصة لعائلتك.'
                  : language === 'fr'
                  ? 'Marhaban ! Nous sommes à votre disposition pour toute question sur nos circuits, tarifs ou programmes sur mesure.'
                  : 'Marhaban! We are here to answer your questions about tour details, flexible timings, or crafting custom itineraries.'}
              </p>
            </div>

            {/* Quick Inquiry Templates */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-[#718280] uppercase tracking-wider block">
                {language === 'ar' ? 'استفسارات سريعة مقترحة:' : language === 'fr' ? 'Questions fréquentes :' : 'Quick Questions:'}
              </span>
              <div className="space-y-1.5">
                {quickInquiries.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleOpenWhatsApp(q.text[language])}
                    className="w-full text-left rtl:text-right p-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F2ECE4] text-[#1C2524] transition-colors border border-[#E7E2DA] flex items-center justify-between group cursor-pointer"
                  >
                    <span className="text-xs font-semibold group-hover:text-[#005F5A] transition-colors">
                      {q.label[language]}
                    </span>
                    <Send className="w-3 h-3 text-[#718280] group-hover:text-[#25D366] transition-colors shrink-0 ms-2" />
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Custom Message Input */}
            <div className="space-y-1.5 pt-1">
              <textarea
                rows={2}
                placeholder={
                  language === 'ar'
                    ? 'اكتب سؤالك الخاص هنا...'
                    : language === 'fr'
                    ? 'Écrivez votre message personnalisé ici...'
                    : 'Type your custom question here...'
                }
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-[#E7E2DA] bg-[#FAF8F5] focus:bg-white focus:outline-hidden focus:border-[#25D366] transition-colors resize-none"
              />
            </div>

            {/* Main Action Button */}
            <button
              onClick={() => handleOpenWhatsApp()}
              className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {/* WhatsApp Official SVG Logo */}
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              <span>
                {language === 'ar'
                  ? 'محادثة فورية على واتساب'
                  : language === 'fr'
                  ? 'Discuter sur WhatsApp'
                  : 'Start WhatsApp Chat'}
              </span>
            </button>

            <p className="text-[10px] text-center text-[#718280]">
              {language === 'ar'
                ? 'تواصل مباشر مع فريقنا في فاس · لا وسطاء · رد فوري'
                : language === 'fr'
                ? 'Discussion directe avec nos guides · Sans intermédiaire'
                : 'Direct chat with native guides · No middleman · Fast response'}
            </p>
          </div>
        </div>
      )}

      {/* 3. Floating Action Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setShowTooltip(false);
        }}
        className={`group relative flex items-center gap-2.5 p-3.5 sm:px-4 sm:py-3.5 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer active:scale-95 ${
          isOpen
            ? 'bg-[#15201F] text-white hover:bg-[#233130]'
            : 'bg-[#25D366] text-white hover:bg-[#20BD5A]'
        }`}
        aria-expanded={isOpen}
        aria-label="Contact guide on WhatsApp"
        title="Contact a local guide on WhatsApp"
      >
        {/* Pulsing Presence Ring when closed */}
        {!isOpen && (
          <span className="absolute -inset-1 rounded-full bg-[#25D366]/40 animate-ping opacity-75 pointer-events-none" />
        )}

        {/* WhatsApp Icon */}
        <div className="relative">
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
          </svg>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-white border-2 border-[#25D366]" />
        </div>

        {/* Label on desktop screens */}
        <span className="hidden sm:inline font-bold text-xs tracking-tight">
          {isOpen
            ? language === 'ar'
              ? 'إغلاق'
              : language === 'fr'
              ? 'Fermer'
              : 'Close'
            : language === 'ar'
            ? 'تواصل عبر واتساب'
            : language === 'fr'
            ? 'Contact WhatsApp'
            : 'Chat on WhatsApp'}
        </span>
      </button>
    </div>
  );
};
