import React, { useState, useEffect } from 'react';
import { Language, PageId, SectionPillar } from '../types';
import { useCms } from '../context/CmsContext';
import { EXPERIENCE_EXTRAS, ExperienceExtraDetails } from '../data/experienceDetails';
import { TripadvisorReviewsSection } from '../components/TripadvisorReviewsSection';
import {
  Clock,
  Users,
  MapPin,
  Star,
  Check,
  X,
  ChevronRight,
  Calendar,
  ArrowLeft,
  Phone,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface ExperienceDetailPageProps {
  pillar: SectionPillar;
  language: Language;
  onNavigate: (page: PageId) => void;
  onSelectExperience: (pillar: SectionPillar) => void;
  onBookTour: (tourTitle: string) => void;
}

export const ExperienceDetailPage: React.FC<ExperienceDetailPageProps> = ({
  pillar,
  language,
  onNavigate,
  onSelectExperience,
  onBookTour,
}) => {
  const { tours, siteSettings } = useCms();
  // Find live tour from CMS store to reflect real-time edits
  const livePillar = tours.find((t) => t.id === pillar.id) || pillar;
  const extra: ExperienceExtraDetails | undefined = EXPERIENCE_EXTRAS[livePillar.id];

  // Gallery images list: prioritize custom gallery from CMS, then extras, then main image
  const galleryList =
    livePillar.galleryImages && livePillar.galleryImages.length > 0
      ? livePillar.galleryImages
      : extra?.galleryImages && extra.galleryImages.length > 0
      ? extra.galleryImages
      : [livePillar.image];

  const [activeImageIndex, setActiveImageIndex] = useState(0);


  // Scroll to top on experience change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveImageIndex(0);
  }, [pillar.id]);

  // Clean WhatsApp phone digits
  const rawNumber = siteSettings.whatsappNumber || '212719603009';
  const cleanNumber = rawNumber.replace(/[^0-9]/g, '');

  const openWhatsApp = () => {
    let text = '';
    if (language === 'ar') {
      text = `السلام عليكم ورحمة الله، أنا مهتم بحجز جولة "${pillar.title[language]}" عبر موقع FezGuideTours. هل يمكن تزويدي بالتواريخ المتاحة والترتيبات؟`;
    } else if (language === 'fr') {
      text = `Bonjour ! Je souhaite me renseigner sur la visite "${pillar.title[language]}" via FezGuideTours. Quelles sont vos disponibilités ?`;
    } else {
      text = `Hello Med! I am interested in booking "${pillar.title[language]}" via FezGuideTours. Could you please share availability and details?`;
    }
    window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  // Find related experiences in the same category or other top tours
  const relatedTours = tours
    .filter((t) => t.id !== pillar.id && t.published !== false)
    .slice(0, 3);

  // Parent Category Label for Breadcrumb
  const getCategoryNav = () => {
    switch (pillar.pageId) {
      case 'fez':
        return {
          id: 'fez' as PageId,
          label: language === 'ar' ? 'جولات فاس' : language === 'fr' ? 'Visites de Fès' : 'Fez Experiences',
        };
      case 'day-trips':
        return {
          id: 'day-trips' as PageId,
          label: language === 'ar' ? 'رحلات يومية' : language === 'fr' ? 'Excursions' : 'Day Trips',
        };
      case 'food-tours':
        return {
          id: 'food-tours' as PageId,
          label: language === 'ar' ? 'جولات الأكل' : language === 'fr' ? 'Tours Culinaires' : 'Food Tours',
        };
      case 'travel-tips':
        return {
          id: 'travel-tips' as PageId,
          label: language === 'ar' ? 'نصائح السفر' : language === 'fr' ? 'Conseils Voyage' : 'Travel Tips',
        };
      default:
        return {
          id: 'home' as PageId,
          label: language === 'ar' ? 'الرئيسية' : language === 'fr' ? 'Accueil' : 'Home',
        };
    }
  };

  const categoryNav = getCategoryNav();

  return (
    <div className="bg-[#FAF8F5] min-h-screen pb-32">
      {/* 1. Breadcrumbs & Quick Back Navigation */}
      <div className="bg-white border-b border-[#E7E2DA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between text-xs text-[#52605E]">
          <nav className="flex items-center gap-1.5 sm:gap-2 flex-wrap" aria-label="Breadcrumb">
            <button
              onClick={() => onNavigate('home')}
              className="hover:text-[#005F5A] transition-colors cursor-pointer"
            >
              {language === 'ar' ? 'الرئيسية' : language === 'fr' ? 'Accueil' : 'Home'}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-[#A5B2B0] rtl:rotate-180" />
            <button
              onClick={() => onNavigate(categoryNav.id)}
              className="hover:text-[#005F5A] font-medium transition-colors cursor-pointer"
            >
              {categoryNav.label}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-[#A5B2B0] rtl:rotate-180" />
            <span className="text-[#1C2524] font-bold truncate max-w-[200px] sm:max-w-md">
              {pillar.title[language]}
            </span>
          </nav>

          <button
            onClick={() => onNavigate(categoryNav.id)}
            className="flex items-center gap-1 text-[#005F5A] hover:text-[#004743] font-bold text-xs transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            <span>
              {language === 'ar' ? 'العودة للقائمة' : language === 'fr' ? 'Retour' : 'Back to list'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Main Experience Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 space-y-10">
        {/* Title Header & Badges */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-[#005F5A] tracking-tight text-balance leading-tight">
            {pillar.title[language]}
          </h1>

          <p className="text-sm sm:text-base text-[#52605E] max-w-3xl leading-relaxed">
            {pillar.shortDescription[language]}
          </p>
        </div>

        {/* 3. Hero Visual Asset & Interactive Gallery */}
        <div className="space-y-3">
          {/* Main Active Image Showcase */}
          <div className="relative aspect-16/9 sm:aspect-21/9 w-full rounded-3xl overflow-hidden bg-[#15201F] shadow-md border border-[#E7E2DA]">
            <img
              src={galleryList[activeImageIndex]}
              alt={pillar.imageAlt[language]}
              className="w-full h-full object-cover transition-opacity duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 flex items-center justify-between text-white text-xs sm:text-sm drop-shadow-md">
              <span className="font-semibold bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg">
                {pillar.imageAlt[language]}
              </span>
              <span className="font-medium bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg tabular-nums">
                {activeImageIndex + 1} / {galleryList.length}
              </span>
            </div>
          </div>

          {/* Thumbnails Strip */}
          {galleryList.length > 1 && (
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-none">
              {galleryList.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-20 sm:w-28 aspect-4/3 rounded-xl overflow-hidden shrink-0 transition-all border-2 cursor-pointer ${
                    activeImageIndex === idx
                      ? 'border-[#005F5A] ring-2 ring-[#005F5A]/20 scale-102'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  aria-label={`View photo ${idx + 1}`}
                >
                  <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4. Quick Specs Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-4 sm:p-6 bg-white rounded-2xl border border-[#E7E2DA] shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#005F5A]/10 text-[#005F5A] flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-[#718280] font-medium block">
                {language === 'ar' ? 'المدة الزمنية' : language === 'fr' ? 'Durée' : 'Duration'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#1C2524]">
                {pillar.practicalInfo?.duration?.[language] || '4 - 5 Hours'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C84B31]/10 text-[#C84B31] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-[#718280] font-medium block">
                {language === 'ar' ? 'نوع التجربة' : language === 'fr' ? 'Format' : 'Format'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#1C2524]">
                {pillar.practicalInfo?.groupSize?.[language] || 'Private Group Only'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00A896]/10 text-[#00A896] flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-[#718280] font-medium block">
                {language === 'ar' ? 'نقطة الانطلاق' : language === 'fr' ? 'Départ' : 'Meeting / Pickup'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#1C2524] truncate">
                {pillar.practicalInfo?.departure?.[language] || 'Bab Boujloud or Riad'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E07A5F]/10 text-[#E07A5F] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-[#718280] font-medium block">
                {language === 'ar' ? 'اللغات المتاحة' : language === 'fr' ? 'Langues' : 'Languages'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#1C2524]">
                English, Français and Español
              </span>
            </div>
          </div>
        </div>

        {/* 5. Two-Column Layout: Left Narrative & Details, Right Sticky Booking Box */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Main Left Column (70%) */}
          <div className="lg:col-span-8 space-y-12">
            {/* The Full Narrative / Overview from Drive */}
            <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2DA] shadow-xs space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">
                  {language === 'ar' ? 'عن هذه التجربة' : language === 'fr' ? 'Présentation' : 'Experience Overview'}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C2524]">
                  {language === 'ar'
                    ? 'القصة الكاملة والتفاصيل الحقيقية'
                    : language === 'fr'
                    ? 'L’histoire et l’immersion locale'
                    : 'The Living Story Behind the Experience'}
                </h2>
              </div>

              <div className="text-xs sm:text-sm text-[#445250] leading-relaxed space-y-4 whitespace-pre-line">
                {pillar.fullDescription[language]}
              </div>

              {/* Key Highlights Bullets */}
              {pillar.highlights[language].length > 0 && (
                <div className="pt-6 border-t border-[#F2ECE4] space-y-3">
                  <h3 className="text-sm font-bold text-[#1C2524]">
                    {language === 'ar' ? 'أبرز ما ستكتشفه في هذه الجولة:' : language === 'fr' ? 'Points forts de la visite :' : 'Highlights of This Experience:'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {pillar.highlights[language].map((hl, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA]/80">
                        <Check className="w-4 h-4 text-[#005F5A] shrink-0 mt-0.5" />
                        <span className="text-xs font-medium text-[#2C3836] leading-snug">{hl}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Detailed Step-by-Step Itinerary / Stops */}
            {(livePillar.itinerary && livePillar.itinerary.length > 0
              ? livePillar.itinerary
              : extra?.itinerary || []
            ).length > 0 && (
              <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2DA] shadow-xs space-y-6">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#C84B31]">
                    {language === 'ar' ? 'مسار الجولة ومحطاتها' : language === 'fr' ? 'Programme Détaillé' : 'Experience Itinerary'}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C2524]">
                    {language === 'ar'
                      ? 'خطوة بخطوة: ماذا ستعيش وتكتشف؟'
                      : language === 'fr'
                      ? 'Étape par étape : Ce que vous allez vivre'
                      : 'Step-by-Step Experience & Stops'}
                  </h2>
                </div>

                <div className="relative pl-6 rtl:pl-0 rtl:pr-6 border-l-2 rtl:border-l-0 rtl:border-r-2 border-[#005F5A]/20 space-y-8">
                  {(livePillar.itinerary && livePillar.itinerary.length > 0
                    ? livePillar.itinerary
                    : extra?.itinerary || []
                  ).map((stop, idx) => (
                    <div key={idx} className="relative space-y-1.5 group">
                      {/* Timeline Dot */}
                      <span className="absolute -left-[31px] rtl:-left-auto rtl:-right-[31px] top-1 w-4 h-4 rounded-full bg-white border-4 border-[#005F5A] group-hover:scale-125 transition-transform" />

                      <div className="flex flex-wrap items-center gap-2">
                        {stop.time && (
                          <span className="text-[11px] font-bold text-[#005F5A] bg-[#005F5A]/10 px-2 py-0.5 rounded-md">
                            {stop.time}
                          </span>
                        )}
                        {stop.badge && (
                          <span className="text-[10px] font-bold text-[#C84B31] bg-[#C84B31]/10 px-2 py-0.5 rounded-md">
                            {stop.badge[language] || stop.badge.en}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-[#1C2524]">
                        {stop.title[language] || stop.title.en}
                      </h3>

                      <p className="text-xs text-[#52605E] leading-relaxed">
                        {stop.description[language] || stop.description.en}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}


            {/* Inclusions & Exclusions */}
            {((livePillar.included && livePillar.included[language]?.length > 0) ||
              (extra?.included && extra.included[language]?.length > 0)) && (
              <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2DA] shadow-xs space-y-6">
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C2524]">
                  {language === 'ar' ? 'ما تشمله التجربة وما لا تشمله' : language === 'fr' ? 'Inclusions & Exclusions' : 'What is Included & Excluded'}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Included */}
                  <div className="p-5 rounded-2xl bg-[#F0F8F6] border border-[#D0EBE5] space-y-3">
                    <span className="text-xs font-bold text-[#005F5A] flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-[#005F5A]" />
                      {language === 'ar' ? 'مشمول في الحجز:' : language === 'fr' ? 'Inclus :' : 'Included in Tour:'}
                    </span>
                    <ul className="space-y-2">
                      {(livePillar.included && livePillar.included[language]?.length > 0
                        ? livePillar.included[language]
                        : extra?.included[language] || []
                      ).map((inc, i) => (
                        <li key={i} className="text-xs text-[#2A4843] flex items-start gap-2 leading-relaxed">
                          <Check className="w-3.5 h-3.5 text-[#00A896] shrink-0 mt-0.5" />
                          <span>{inc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Excluded */}
                  <div className="p-5 rounded-2xl bg-[#FFF6F4] border border-[#FBE3DC] space-y-3">
                    <span className="text-xs font-bold text-[#C84B31] flex items-center gap-1.5">
                      <X className="w-4 h-4 text-[#C84B31]" />
                      {language === 'ar' ? 'غير مشمول:' : language === 'fr' ? 'Non inclus :' : 'Not Included:'}
                    </span>
                    <ul className="space-y-2">
                      {(livePillar.excluded && livePillar.excluded[language]?.length > 0
                        ? livePillar.excluded[language]
                        : extra?.excluded[language] || []
                      ).map((exc, i) => (
                        <li key={i} className="text-xs text-[#6A3930] flex items-start gap-2 leading-relaxed">
                          <X className="w-3.5 h-3.5 text-[#C84B31] shrink-0 mt-0.5" />
                          <span>{exc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {/* Practical Advice & What to Bring */}
            {((livePillar.whatToBring && livePillar.whatToBring[language]?.length > 0) ||
              (extra?.whatToBring && extra.whatToBring[language]?.length > 0)) && (
              <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2DA] shadow-xs space-y-4">
                <h2 className="text-lg sm:text-xl font-bold text-[#1C2524] flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-[#005F5A]" />
                  <span>
                    {language === 'ar' ? 'نصائح عملية وما يجب إحضاره' : language === 'fr' ? 'Conseils pratiques & Ce qu’il faut apporter' : 'Practical Tips & What to Bring'}
                  </span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {(livePillar.whatToBring && livePillar.whatToBring[language]?.length > 0
                    ? livePillar.whatToBring[language]
                    : extra?.whatToBring[language] || []
                  ).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-xs text-[#445250]">
                      <span className="w-2 h-2 rounded-full bg-[#005F5A] shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}


            {/* Verified Traveler Testimonials */}
            {pillar.pageId !== 'day-trips' && extra?.reviews && extra.reviews.length > 0 && (
              <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2DA] shadow-xs space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">
                      {language === 'ar' ? 'تجارب الزوار' : language === 'fr' ? 'Avis Vérifiés' : 'Verified Reviews'}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C2524]">
                      {language === 'ar' ? 'ماذا يقول المسافرون عن هذه الجولة؟' : language === 'fr' ? 'Ce que nos voyageurs en disent' : 'What Travelers Say'}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1 text-[#E07A5F]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {extra.reviews.map((rev, idx) => (
                    <div key={idx} className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E7E2DA] space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-[#1C2524] block">{rev.author}</span>
                          <span className="text-[11px] text-[#718280]">{rev.location}</span>
                        </div>
                        <span className="text-[11px] text-[#718280]">{rev.date}</span>
                      </div>
                      <p className="text-xs text-[#445250] leading-relaxed italic">
                        "{rev.comment[language]}"
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sticky Right Sidebar (30%) */}
          <div className="lg:col-span-4 sticky top-20 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E7E2DA] shadow-lg space-y-6">
              {/* Pricing Box */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2DA] space-y-1">
                <span className="text-[11px] text-[#718280] uppercase tracking-wider font-semibold block">
                  {language === 'ar' ? 'السعر الشامل' : language === 'fr' ? 'Tarif Global' : 'All-Inclusive Rate'}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#005F5A] tabular-nums">
                    {pillar.practicalInfo?.priceMAD || 450} MAD
                  </span>
                  <span className="text-sm font-semibold text-[#718280] tabular-nums">
                    (~€{pillar.practicalInfo?.priceEUR || 42})
                  </span>
                </div>
                <p className="text-[11px] text-[#52605E]">
                  {language === 'ar'
                    ? 'سعر خاص للمجموعة بالكامل (حتى 6 أشخاص) · بدون تكاليف خفية'
                    : language === 'fr'
                    ? 'Tarif privé pour votre groupe entier (jusqu’à 6 pers.)'
                    : 'Private group pricing for your party · No hidden fees'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => onBookTour(pillar.title[language])}
                  className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-[#C84B31] hover:bg-[#B33D25] text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Calendar className="w-4 h-4" />
                  <span>
                    {language === 'ar' ? 'احجز هذه الجولة الآن' : language === 'fr' ? 'Réserver cette Visite' : 'Book This Experience'}
                  </span>
                </button>

                <button
                  onClick={openWhatsApp}
                  className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-[#25D366] hover:bg-[#20BD5A] text-white shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                  <span>
                    {language === 'ar' ? 'استفسر فوراً على واتساب' : language === 'fr' ? 'Question via WhatsApp' : 'Inquire on WhatsApp'}
                  </span>
                </button>
              </div>

              {/* Guarantees & Trust Factors */}
              <div className="space-y-2.5 pt-4 border-t border-[#F2ECE4]">
                <div className="flex items-center gap-2.5 text-xs text-[#445250]">
                  <Check className="w-4 h-4 text-[#00A896] shrink-0" />
                  <span>
                    {language === 'ar' ? 'جولة خاصة 100% لك ولمجموعتك' : language === 'fr' ? 'Visite 100% privée pour votre groupe' : '100% Private (Your party only)'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[#445250]">
                  <Check className="w-4 h-4 text-[#00A896] shrink-0" />
                  <span>
                    {language === 'ar' ? 'إلغاء مجاني حتى 24 ساعة قبل الموعد' : language === 'fr' ? 'Annulation gratuite jusqu’à 24h avant' : 'Free cancellation up to 24h before'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[#445250]">
                  <Check className="w-4 h-4 text-[#00A896] shrink-0" />
                  <span>
                    {language === 'ar' ? 'مرشدون معتمدون من وزارة السياحة' : language === 'fr' ? 'Guides officiels agréés par l’État' : 'Official Ministry-licensed guides'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[#445250]">
                  <Check className="w-4 h-4 text-[#00A896] shrink-0" />
                  <span>
                    {language === 'ar' ? 'لا عمولات ولا متاجر مفروضة' : language === 'fr' ? 'Zéro boutique ou arrêt forcé' : 'Zero tourist shop traps or kickbacks'}
                  </span>
                </div>
              </div>

              {/* Phone contact */}
              <div className="pt-2 text-center border-t border-[#F2ECE4]">
                <a
                  href={`tel:${rawNumber}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#005F5A] hover:underline"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{siteSettings.phoneNumber || '+212 719-603009'}</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Related Experiences Section */}
        {relatedTours.length > 0 && (
          <div className="pt-12 border-t border-[#E7E2DA] space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#C84B31]">
                  {language === 'ar' ? 'تجارب أخرى مميزة' : language === 'fr' ? 'Vous Aimerez Aussi' : 'More Experiences'}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C2524]">
                  {language === 'ar' ? 'اكتشف المزيد من جولات فاس' : language === 'fr' ? 'Complétez votre séjour à Fès' : 'You Might Also Like'}
                </h2>
              </div>
              <button
                onClick={() => onNavigate(categoryNav.id)}
                className="text-xs font-bold text-[#005F5A] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{language === 'ar' ? 'عرض الكل' : language === 'fr' ? 'Voir tout' : 'View all'}</span>
                <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedTours.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelectExperience(t)}
                  className="bg-white rounded-2xl border border-[#E7E2DA] overflow-hidden shadow-xs hover:shadow-md transition-all group cursor-pointer flex flex-col justify-between"
                >
                  <div className="relative aspect-16/10 w-full bg-[#1C2524] overflow-hidden">
                    <img
                      src={t.image}
                      alt={t.title[language]}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    {t.practicalInfo?.priceMAD && (
                      <span className="absolute bottom-2.5 right-2.5 text-[11px] font-bold text-white bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded-md">
                        {t.practicalInfo.priceMAD} MAD
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#C84B31] block">
                        {t.subtitle[language]}
                      </span>
                      <h3 className="font-bold text-sm text-[#1C2524] group-hover:text-[#005F5A] transition-colors line-clamp-1">
                        {t.title[language]}
                      </h3>
                      <p className="text-xs text-[#52605E] line-clamp-2">
                        {t.shortDescription[language]}
                      </p>
                    </div>
                    <div className="pt-2 flex items-center justify-between text-xs font-bold text-[#005F5A]">
                      <span>{language === 'ar' ? 'عرض التفاصيل' : language === 'fr' ? 'Voir détails' : 'View Details'}</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {pillar.pageId === 'day-trips' && (
          <TripadvisorReviewsSection language={language === 'fr' ? 'fr' : 'en'} />
        )}
      </div>

      {/* 5. Sticky Bottom Action Bar for Instant Booking & WhatsApp Inquiry */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E7E2DA] shadow-2xl py-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          {/* Experience Info (Desktop/Tablet) */}
          <div className="hidden sm:flex items-center gap-3 min-w-0">
            <span className="font-extrabold text-sm text-[#005F5A] truncate max-w-xs md:max-w-md">
              {pillar.title[language]}
            </span>
            {pillar.practicalInfo?.priceMAD && (
              <span className="text-xs font-bold text-[#C84B31] bg-[#FDF1EE] px-2.5 py-1 rounded-md border border-[#F6D5CD] shrink-0">
                {pillar.practicalInfo.priceMAD} MAD / {pillar.practicalInfo.priceEUR} €
              </span>
            )}
          </div>

          {/* Action Buttons: Book This Experience + Inquire on WhatsApp */}
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => onBookTour(pillar.title[language])}
              className="flex-1 sm:flex-initial py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl font-bold text-xs sm:text-sm bg-[#C84B31] hover:bg-[#B33D25] text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Calendar className="w-4 h-4" />
              <span>
                {language === 'ar' ? 'احجز هذه التجربة الآن' : language === 'fr' ? 'Réserver cette Visite' : 'Book This Experience'}
              </span>
            </button>

            <button
              onClick={openWhatsApp}
              className="flex-1 sm:flex-initial py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl font-bold text-xs sm:text-sm bg-[#25D366] hover:bg-[#20BD5A] text-white shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              <span>
                {language === 'ar' ? 'استفسر فوراً على واتساب' : language === 'fr' ? 'Question via WhatsApp' : 'Inquire on WhatsApp'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
