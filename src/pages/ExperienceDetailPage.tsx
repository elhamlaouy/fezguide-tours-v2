import React, { useState, useEffect, useRef } from 'react';
import { Language, PageId, SectionPillar } from '../types';
import { useCms } from '../context/CmsContext';
import { formatPrice } from '../cms/SectionRenderer';
import { businessContactHref } from '../cms/business-contact';
import { ApprovedSection, ApprovedSections, useApprovedContent } from '../cms/approved-content';
import { contentLanguage as pageLanguage, localizedText, resolveImage } from '../cms/render-utils';
import { responsiveImageProps } from '../cms/optimized-image';
import type { Localized } from '../cms/schema';
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
  pillar: sourcePillar,
  language,
  onNavigate,
  onSelectExperience,
  onBookTour,
}) => {
  const { tours, siteSettings } = useCms();
  const { document, page, section } = useApprovedContent(sourcePillar.id);
  const contentLanguage = page ? pageLanguage(page, language) : language;
  const read = (value?: Partial<Localized>) => value?.[contentLanguage] ?? localizedText(value, contentLanguage);
  const header = section('header', 'hero'), gallery = section('gallery', 'gallery'), facts = section('facts', 'practicalInfo'), overview = section('overview', 'richText'), highlights = section('highlights', 'richText'), included = section('included', 'inclusions'), bring = section('bring', 'richText'), booking = section('booking', 'cta'), related = section('related', 'cardGrid');
  const blockText = (blocks: NonNullable<typeof overview>['blocks']) => blocks.flatMap(block => block.type === 'list' ? block.items[contentLanguage] : [read(block.text)]).filter(Boolean);
  const pillar = document?.products.find(item => item.id === sourcePillar.id) ?? sourcePillar;
  const product = document?.products.find(item => item.id === pillar.id);
  const price = product ? formatPrice(product, language) : '';
  const equivalents = product ? (['MAD', 'EUR', 'USD'] as const).filter(currency => currency !== product.price?.currency).flatMap(currency => {
    const value = product.practicalInfo?.[`price${currency}`];
    return value === undefined ? [] : [currency === 'EUR' ? `≈ €${value}` : currency === 'USD' ? `≈ $${value}` : `≈ ${value} MAD`];
  }).join(' · ') : '';
  // Find live tour from CMS store to reflect real-time edits
  const livePillar = tours.find((t) => t.id === pillar.id) || pillar;
  const extra: ExperienceExtraDetails | undefined = document ? undefined : EXPERIENCE_EXTRAS[livePillar.id];

  const galleryImages = document ? gallery?.images.flatMap(image => { const resolved = resolveImage(document, image, contentLanguage); return resolved ? [resolved] : []; }) ?? [] : (livePillar.galleryImages?.length ? livePillar.galleryImages : extra?.galleryImages?.length ? extra.galleryImages : [livePillar.image]).map(src => ({ src, alt: read(livePillar.imageAlt), objectPosition: undefined, width: undefined, height: undefined }));
  const galleryList = galleryImages.map(image => image.src);
  const tourStops = document ? section('itinerary', 'itinerary')?.stops ?? [] : livePillar.itinerary?.length ? livePillar.itinerary : extra?.itinerary ?? [];
  const includedItems = document ? included?.included[contentLanguage] ?? [] : livePillar.included?.[language]?.length ? livePillar.included[language] : extra?.included[language] ?? [];
  const excludedItems = document ? included?.excluded[contentLanguage] ?? [] : livePillar.excluded?.[language]?.length ? livePillar.excluded[language] : extra?.excluded[language] ?? [];
  const bringItems = document ? blockText(bring?.blocks ?? []) : livePillar.whatToBring?.[language]?.length ? livePillar.whatToBring[language] : extra?.whatToBring[language] ?? [];
  const highlightItems = document ? blockText(highlights?.blocks ?? []) : livePillar.highlights[language];
  const whatsappLink = booking?.links.find(link => link.enabled && link.href?.includes('wa.me/'));
  const whatsappHref = document ? (whatsappLink?.href ? businessContactHref(document, whatsappLink.href) : undefined) : `https://wa.me/${siteSettings.whatsappNumber.replace(/\D/g, '')}`;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);


  // Scroll to top on experience change
  useEffect(() => {
    // Preview portals belong to the editor document's window; never scroll its parent shell.
    rootRef.current?.ownerDocument.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveImageIndex(0);
  }, [pillar.id]);

  const rawNumber = siteSettings.phoneNumber;
  const openWhatsApp = () => { if (whatsappHref) window.open(whatsappHref, '_blank', 'noopener,noreferrer'); };
  const relatedTours = document ? (related?.cards.flatMap(card => {
    const item = tours.find(item => item.id === card.pageId && item.published !== false);
    if (!item || !document.pages.some(page => page.id === item.id && page.enabled)) return [];
    const photo = card.image ? resolveImage(document, card.image, contentLanguage) : undefined;
    return [{ ...item, title: card.title, shortDescription: card.description, subtitle: card.badge ?? { en: '', fr: '', es: '' }, image: photo?.src ?? '', imageAlt: card.image?.alt ?? { en: '', fr: '', es: '' } }];
  }) ?? []) : tours.filter(item => item.id !== pillar.id && item.published !== false).slice(0, 3);

  // Parent Category Label for Breadcrumb
  const getCategoryNav = () => {
    switch (pillar.pageId) {
      case 'fez':
        return {
          id: 'fez' as PageId,
          label: language === 'es' ? "Visitas por Fez" : language === 'fr' ? 'Visites de Fès' : 'Fez Experiences',
        };
      case 'day-trips':
        return {
          id: 'day-trips' as PageId,
          label: language === 'es' ? "Excursiones de un día" : language === 'fr' ? 'Excursions' : 'Day Trips',
        };
      case 'food-tours':
        return {
          id: 'food-tours' as PageId,
          label: language === 'es' ? "Rutas gastronómicas" : language === 'fr' ? 'Tours Culinaires' : 'Food Tours',
        };
      case 'travel-tips':
        return {
          id: 'travel-tips' as PageId,
          label: language === 'es' ? "Consejos de viaje" : language === 'fr' ? 'Conseils Voyage' : 'Travel Tips',
        };
      default:
        return {
          id: 'home' as PageId,
          label: language === 'es' ? "Inicio" : language === 'fr' ? 'Accueil' : 'Home',
        };
    }
  };

  const categoryNav = getCategoryNav();
  const imageIndex = Math.min(activeImageIndex, Math.max(0, galleryImages.length - 1));
  const activeImage = galleryImages[imageIndex];

  return (
    <div ref={rootRef} className="bg-[#FAF8F5] min-h-screen pb-32">
      {/* 1. Breadcrumbs & Quick Back Navigation */}
      <div className="bg-white border-b border-[#E7E2DA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between text-xs text-[#52605E]">
          <nav className="flex items-center gap-1.5 sm:gap-2 flex-wrap" aria-label={language === 'es' ? "Ruta de navegación" : "Breadcrumb"}>
            <button
              onClick={() => onNavigate('home')}
              className="hover:text-[#005F5A] transition-colors cursor-pointer"
            >
              {language === 'es' ? "Inicio" : language === 'fr' ? 'Accueil' : 'Home'}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-[#A5B2B0]" />
            <button
              onClick={() => onNavigate(categoryNav.id)}
              className="hover:text-[#005F5A] font-medium transition-colors cursor-pointer"
            >
              {categoryNav.label}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-[#A5B2B0]" />
            <span className="text-[#1C2524] font-bold truncate max-w-[200px] sm:max-w-md">
              {document ? read(header?.title) : pillar.title[language]}
            </span>
          </nav>

          <button
            onClick={() => onNavigate(categoryNav.id)}
            className="flex items-center gap-1 text-[#005F5A] hover:text-[#004743] font-bold text-xs transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>
              {language === 'es' ? "Volver a la lista" : language === 'fr' ? 'Retour' : 'Back to list'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Main Experience Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 space-y-10">
        {/* Title Header & Badges */}
        <ApprovedSection id="header"><div className="space-y-3">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-[#005F5A] tracking-tight text-balance leading-tight">
            {document ? read(header?.title) : pillar.title[language]}
          </h1>

          <p className="text-sm sm:text-base text-[#52605E] max-w-3xl leading-relaxed">
            {document ? read(header?.description) : pillar.shortDescription[language]}
          </p>
        </div></ApprovedSection>

        {/* 3. Hero Visual Asset & Interactive Gallery */}
        <ApprovedSection id="gallery"><div className="space-y-3">
          {(() => {
            const fullFrame = /\/images\/(daytrip-(chefchaouen|custom|meknes|ifrane)|food-tasting-walk)\//.test(galleryList[imageIndex] || '');
            return (
          <div className={fullFrame
            ? 'relative w-full rounded-3xl overflow-hidden bg-[#15201F] shadow-md border border-[#E7E2DA] flex items-center justify-center'
            : 'relative aspect-16/9 sm:aspect-21/9 w-full rounded-3xl overflow-hidden bg-[#15201F] shadow-md border border-[#E7E2DA]'}>
            {activeImage && <img
              {...responsiveImageProps(activeImage.src ?? '', '(max-width: 768px) 92vw, 1200px', true)}
              width={activeImage?.width}
              height={activeImage?.height}
              style={{ objectPosition: activeImage?.objectPosition }}
              alt={activeImage?.alt ?? ''}
              className={fullFrame ? 'max-h-[72vh] w-auto max-w-full object-contain' : 'w-full h-full object-cover transition-opacity duration-300'}
            />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 flex items-center justify-between text-white text-xs sm:text-sm drop-shadow-md">
              <span className="font-semibold bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg">
                {activeImage?.alt}
              </span>
              <span className="font-medium bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg tabular-nums">
                {activeImageIndex + 1} / {galleryList.length}
              </span>
            </div>
          </div>
            );
          })()}

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
                  <img {...responsiveImageProps(img, "112px")} style={{ objectPosition: galleryImages[idx]?.objectPosition }} alt={language === 'es' ? "Miniatura" : "Thumbnail"} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div></ApprovedSection>

        {/* 4. Quick Specs Ribbon */}
        <ApprovedSection id="facts"><div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-4 sm:p-6 bg-white rounded-2xl border border-[#E7E2DA] shadow-xs">
          {(!document || facts?.items[0]) && (<div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#005F5A]/10 text-[#005F5A] flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-[#718280] font-medium block">
                {document ? read(facts?.items[0]?.title) : language === 'es' ? "Duración" : language === 'fr' ? 'Durée' : 'Duration'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#1C2524]">
                {document ? read(facts?.items[0]?.description) : pillar.practicalInfo?.duration?.[language] || (language === 'es' ? '4 - 5 horas' : '4 - 5 Hours')}
              </span>
            </div>
          </div>)}

          {(!document || facts?.items[1]) && (<div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C84B31]/10 text-[#C84B31] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-[#718280] font-medium block">
                {document ? read(facts?.items[1]?.title) : language === 'es' ? "Formato" : language === 'fr' ? 'Format' : 'Format'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#1C2524]">
                {document ? read(facts?.items[1]?.description) : pillar.practicalInfo?.groupSize?.[language] || (language === 'es' ? 'Solo vuestro grupo privado' : 'Private Group Only')}
              </span>
            </div>
          </div>)}

          {(!document || facts?.items[2]) && (<div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00A896]/10 text-[#00A896] flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-[#718280] font-medium block">
                {document ? read(facts?.items[2]?.title) : language === 'es' ? "Punto de encuentro / Recogida" : language === 'fr' ? 'Départ' : 'Meeting / Pickup'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#1C2524] truncate">
                {document ? read(facts?.items[2]?.description) : pillar.practicalInfo?.departure?.[language] || (language === 'es' ? 'Bab Boujloud o tu riad' : 'Bab Boujloud or Riad')}
              </span>
            </div>
          </div>)}

          {(!document || facts?.items[3]) && (<div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E07A5F]/10 text-[#E07A5F] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-[#718280] font-medium block">
                {document ? read(facts?.items[3]?.title) : language === 'es' ? "Idiomas" : language === 'fr' ? 'Langues' : 'Languages'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#1C2524]">
                {document ? read(facts?.items[3]?.description) : language === 'es' ? 'Inglés, francés y español' : 'English, Français and Español'}
              </span>
            </div>
          </div>)}
          {document && facts?.items.slice(4).map((fact, index) => <div key={index} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#005F5A]/10 text-[#005F5A] flex items-center justify-center shrink-0"><Clock className="w-5 h-5" /></div>
            <div><span className="text-[11px] text-[#718280] font-medium block">{read(fact.title)}</span><span className="text-xs sm:text-sm font-bold text-[#1C2524]">{read(fact.description)}</span></div>
          </div>)}
        </div></ApprovedSection>

        {/* 5. Two-Column Layout: Left Narrative & Details, Right Sticky Booking Box */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Main Left Column (70%) */}
          <div className="lg:col-span-8 space-y-12"><ApprovedSections>
            {/* The Full Narrative / Overview from Drive */}
            <ApprovedSection id="overview"><section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2DA] shadow-xs space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">
                  {document && section('overview', 'richText')?.eyebrow !== undefined ? read(section('overview', 'richText')?.eyebrow) : language === 'es' ? "Descripción de la experiencia" : language === 'fr' ? 'Présentation' : 'Experience Overview'}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C2524]">
                  {document && section('overview', 'richText')?.title !== undefined && read(section('overview', 'richText')?.title) !== read(header?.title) ? read(section('overview', 'richText')?.title) : language === 'es'
                    ? "La historia viva detrás de la experiencia"
                    : language === 'fr'
                    ? 'L’histoire et l’immersion locale'
                    : 'The Living Story Behind the Experience'}
                </h2>
              </div>

              <div className="text-xs sm:text-sm text-[#445250] leading-relaxed space-y-4 whitespace-pre-line">
                {document ? blockText(overview?.blocks ?? []).join('\n\n') : pillar.fullDescription[language]}
              </div>

              {/* Key Highlights Bullets */}
              {highlightItems.length > 0 && (
                <ApprovedSection id="highlights"><div className="pt-6 border-t border-[#F2ECE4] space-y-3">
                  <h3 className="text-sm font-bold text-[#1C2524]">
                    {document && highlights?.title !== undefined ? read(highlights.title) : language === 'es' ? "Lo más destacado de esta experiencia:" : language === 'fr' ? 'Points forts de la visite :' : 'Highlights of This Experience:'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {highlightItems.map((hl, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA]/80">
                        <Check className="w-4 h-4 text-[#005F5A] shrink-0 mt-0.5" />
                        <span className="text-xs font-medium text-[#2C3836] leading-snug">{hl}</span>
                      </div>
                    ))}
                  </div>
                </div></ApprovedSection>
              )}
            </section></ApprovedSection>

            {/* Detailed Step-by-Step Itinerary / Stops */}
            <ApprovedSection id="itinerary"><section hidden={!document && tourStops.length === 0} className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2DA] shadow-xs space-y-6">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#C84B31]">
                    {document && section('itinerary', 'itinerary')?.eyebrow !== undefined ? read(section('itinerary', 'itinerary')?.eyebrow) : language === 'es' ? "Itinerario de la experiencia" : language === 'fr' ? 'Programme Détaillé' : 'Experience Itinerary'}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C2524]">
                    {document && section('itinerary', 'itinerary')?.title !== undefined ? read(section('itinerary', 'itinerary')?.title) : language === 'es'
                      ? "La experiencia y sus paradas, paso a paso"
                      : language === 'fr'
                      ? 'Étape par étape : Ce que vous allez vivre'
                      : 'Step-by-Step Experience & Stops'}
                  </h2>
                </div>

                <div className="relative pl-6 border-l-2 border-[#005F5A]/20 space-y-8">
                  {tourStops.map((stop, idx) => (
                    <div key={idx} className="relative space-y-1.5 group">
                      {/* Timeline Dot */}
                      <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-4 border-[#005F5A] group-hover:scale-125 transition-transform" />

                      <div className="flex flex-wrap items-center gap-2">
                        {stop.time && (
                          <span className="text-[11px] font-bold text-[#005F5A] bg-[#005F5A]/10 px-2 py-0.5 rounded-md">
                            {stop.time}
                          </span>
                        )}
                        {stop.badge && (
                          <span className="text-[10px] font-bold text-[#C84B31] bg-[#C84B31]/10 px-2 py-0.5 rounded-md">
                            {read(stop.badge)}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-[#1C2524]">
                        {read(stop.title)}
                      </h3>

                      <p className="text-xs text-[#52605E] leading-relaxed">
                        {read(stop.description)}
                      </p>
                    </div>
                  ))}
                </div>
              </section></ApprovedSection>

            {/* Inclusions & Exclusions */}
            <ApprovedSection id="included"><section hidden={!document && includedItems.length === 0} className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2DA] shadow-xs space-y-6">
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C2524]">
                  {document && section('included', 'inclusions')?.title !== undefined && !['Included & Formats','Inclusions & Formats','Qué incluye y modalidades'].includes(read(section('included', 'inclusions')?.title)) ? read(section('included', 'inclusions')?.title) : language === 'es' ? "Qué está incluido y qué no" : language === 'fr' ? 'Inclusions & Exclusions' : 'What is Included & Excluded'}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Included */}
                  <div className="p-5 rounded-2xl bg-[#F0F8F6] border border-[#D0EBE5] space-y-3">
                    <span className="text-xs font-bold text-[#005F5A] flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-[#005F5A]" />
                      {language === 'es' ? "Incluido en la visita:" : language === 'fr' ? 'Inclus :' : 'Included in Tour:'}
                    </span>
                    <ul className="space-y-2">
                      {includedItems.map((inc, i) => (
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
                      {language === 'es' ? "No incluido:" : language === 'fr' ? 'Non inclus :' : 'Not Included:'}
                    </span>
                    <ul className="space-y-2">
                      {excludedItems.map((exc, i) => (
                        <li key={i} className="text-xs text-[#6A3930] flex items-start gap-2 leading-relaxed">
                          <X className="w-3.5 h-3.5 text-[#C84B31] shrink-0 mt-0.5" />
                          <span>{exc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section></ApprovedSection>

            {/* Practical Advice & What to Bring */}
            <ApprovedSection id="bring"><section hidden={!document && bringItems.length === 0} className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2DA] shadow-xs space-y-4">
                <h2 className="text-lg sm:text-xl font-bold text-[#1C2524] flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-[#005F5A]" />
                  <span>
                    {document && section('bring', 'richText')?.title !== undefined ? read(section('bring', 'richText')?.title) : language === 'es' ? "Consejos prácticos y qué llevar" : language === 'fr' ? 'Conseils pratiques & Ce qu’il faut apporter' : 'Practical Tips & What to Bring'}
                  </span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {bringItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-xs text-[#445250]">
                      <span className="w-2 h-2 rounded-full bg-[#005F5A] shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section></ApprovedSection>

            {/* Verified Traveler Testimonials */}
            {pillar.pageId !== 'day-trips' && pillar.pageId !== 'food-tours' && extra?.reviews && extra.reviews.length > 0 && (
              <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2DA] shadow-xs space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">
                      {language === 'es' ? "Opiniones verificadas" : language === 'fr' ? 'Avis Vérifiés' : 'Verified Reviews'}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C2524]">
                      {language === 'es' ? "Qué dicen los viajeros" : language === 'fr' ? 'Ce que nos voyageurs en disent' : 'What Travelers Say'}
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
          </ApprovedSections></div>

          {/* Sticky Right Sidebar (30%) */}
          <ApprovedSection id="booking"><div className="lg:col-span-4 sticky top-20 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E7E2DA] shadow-lg space-y-6">
              {/* Pricing Box */}
              <div data-price-product-id={product?.id} className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2DA] space-y-1">
                <span className="text-[11px] text-[#718280] uppercase tracking-wider font-semibold block">
                  {document && booking?.title !== undefined ? read(booking.title) : language === 'es' ? "Tarifa todo incluido" : language === 'fr' ? 'Tarif Global' : 'All-Inclusive Rate'}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#005F5A] tabular-nums">
                    {document ? price : `${pillar.practicalInfo?.priceMAD || 450} MAD`}
                  </span>
                  <span className="text-sm font-semibold text-[#718280] tabular-nums">
                    {document ? equivalents : `(~€${pillar.practicalInfo?.priceEUR || 42})`}
                  </span>
                </div>
                <p className="text-[11px] text-[#52605E]">
                  {document ? read(booking?.description) : language === 'es'
                    ? 'Precio privado para todo el grupo (hasta 6 personas) · Sin costes ocultos'
                    : language === 'fr'
                    ? 'Tarif privé pour votre groupe entier (jusqu’à 6 pers.)'
                    : 'Private group pricing for your party · No hidden fees'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  data-action="book" data-cms-product-id={product?.id} data-product-id={product?.id}
                  onClick={() => onBookTour(document ? read(header?.title) : pillar.title[language])}
                  className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-[#C84B31] hover:bg-[#B33D25] text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Calendar className="w-4 h-4" />
                  <span>
                    {language === 'es' ? "Reservar esta experiencia" : language === 'fr' ? 'Réserver cette Visite' : 'Book This Experience'}
                  </span>
                </button>

                <button
                  data-contact-action="whatsapp"
                  onClick={openWhatsApp}
                  className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-[#25D366] hover:bg-[#20BD5A] text-white shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                  <span>
                    {document ? read(whatsappLink?.label) : language === 'es' ? "Consultar por WhatsApp" : language === 'fr' ? 'Question via WhatsApp' : 'Inquire on WhatsApp'}
                  </span>
                </button>
              </div>

              {/* Guarantees & Trust Factors */}
              <div className="space-y-2.5 pt-4 border-t border-[#F2ECE4]">
                <div className="flex items-center gap-2.5 text-xs text-[#445250]">
                  <Check className="w-4 h-4 text-[#00A896] shrink-0" />
                  <span>
                    {language === 'es' ? 'Visita 100 % privada para ti y tu grupo' : language === 'fr' ? 'Visite 100% privée pour votre groupe' : '100% Private (Your party only)'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[#445250]">
                  <Check className="w-4 h-4 text-[#00A896] shrink-0" />
                  <span>
                    {document ? read(product?.cancellationPolicy) : language === 'es' ? 'Cancelación gratuita hasta 24 horas antes' : language === 'fr' ? 'Annulation gratuite jusqu’à 24h avant' : 'Free cancellation up to 24h before'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[#445250]">
                  <Check className="w-4 h-4 text-[#00A896] shrink-0" />
                  <span>
                    {language === 'es' ? 'Guías oficiales autorizados por el Ministerio de Turismo' : language === 'fr' ? 'Guides officiels agréés par l’État' : 'Official Ministry-licensed guides'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[#445250]">
                  <Check className="w-4 h-4 text-[#00A896] shrink-0" />
                  <span>
                    {language === 'es' ? 'Sin comisiones ni paradas obligatorias en tiendas' : language === 'fr' ? 'Zéro boutique ou arrêt forcé' : 'Zero tourist shop traps or kickbacks'}
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
          </div></ApprovedSection>
        </div>

        {/* 6. Related Experiences Section */}
        {relatedTours.length > 0 && (
          <ApprovedSection id="related"><div className="pt-12 border-t border-[#E7E2DA] space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#C84B31]">
                  {document && section('related', 'cardGrid')?.eyebrow !== undefined ? read(section('related', 'cardGrid')?.eyebrow) : language === 'es' ? "Más experiencias" : language === 'fr' ? 'Vous Aimerez Aussi' : 'More Experiences'}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C2524]">
                  {document && section('related', 'cardGrid')?.title !== undefined ? read(section('related', 'cardGrid')?.title) : language === 'es' ? "También os puede interesar" : language === 'fr' ? 'Complétez votre séjour à Fès' : 'You Might Also Like'}
                </h2>
              </div>
              <button
                onClick={() => onNavigate(categoryNav.id)}
                className="text-xs font-bold text-[#005F5A] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{language === 'es' ? "Ver todo" : language === 'fr' ? 'Voir tout' : 'View all'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedTours.map((t) => (
                <div
                  key={t.id}
                  data-product-id={t.id}
                  onClick={() => onSelectExperience(t)}
                  className="bg-white rounded-2xl border border-[#E7E2DA] overflow-hidden shadow-xs hover:shadow-md transition-all group cursor-pointer flex flex-col justify-between"
                >
                  <div className="relative aspect-16/10 w-full bg-[#1C2524] overflow-hidden">
                    <img
                      {...responsiveImageProps(t.image, "(min-width: 768px) 33vw, 92vw")}
                      alt={read(t.title)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    {(document ? Boolean(document.products.find(item => item.id === t.id)?.price) : t.practicalInfo?.priceMAD) && (
                      <span className="absolute bottom-2.5 right-2.5 text-[11px] font-bold text-white bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded-md">
                        {document ? formatPrice(document.products.find(item => item.id === t.id)!, language) : `${t.practicalInfo?.priceMAD} MAD`}
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#C84B31] block">
                        {read(t.subtitle)}
                      </span>
                      <h3 className="font-bold text-sm text-[#1C2524] group-hover:text-[#005F5A] transition-colors line-clamp-1">
                        {read(t.title)}
                      </h3>
                      <p className="text-xs text-[#52605E] line-clamp-2">
                        {read(t.shortDescription)}
                      </p>
                    </div>
                    <div className="pt-2 flex items-center justify-between text-xs font-bold text-[#005F5A]">
                      <span>{language === 'es' ? "Ver detalles" : language === 'fr' ? 'Voir détails' : 'View Details'}</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div></ApprovedSection>
        )}
        {(pillar.pageId === 'day-trips' || pillar.id === 'our-food-tours') && (
          <TripadvisorReviewsSection language={language} />
        )}
      </div>

      {/* 5. Sticky Bottom Action Bar for Instant Booking & WhatsApp Inquiry */}
      {(!document || booking?.enabled) && <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E7E2DA] shadow-2xl py-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          {/* Experience Info (Desktop/Tablet) */}
          <div className="hidden sm:flex items-center gap-3 min-w-0">
            <span className="font-extrabold text-sm text-[#005F5A] truncate max-w-xs md:max-w-md">
              {document ? read(header?.title) : pillar.title[language]}
            </span>
            {(document ? Boolean(price) : pillar.practicalInfo?.priceMAD) && (
              <span className="text-xs font-bold text-[#C84B31] bg-[#FDF1EE] px-2.5 py-1 rounded-md border border-[#F6D5CD] shrink-0">
                {document ? price : `${pillar.practicalInfo?.priceMAD} MAD / ${pillar.practicalInfo?.priceEUR} €`}
              </span>
            )}
          </div>

          {/* Action Buttons: Book This Experience + Inquire on WhatsApp */}
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
            <button
              data-action="book" data-cms-product-id={product?.id} data-product-id={product?.id}
              onClick={() => onBookTour(document ? read(header?.title) : pillar.title[language])}
              className="flex-1 sm:flex-initial py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl font-bold text-xs sm:text-sm bg-[#C84B31] hover:bg-[#B33D25] text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Calendar className="w-4 h-4" />
              <span>
                {language === 'es' ? "Reservar esta experiencia" : language === 'fr' ? 'Réserver cette Visite' : 'Book This Experience'}
              </span>
            </button>

            <button
              data-contact-action="whatsapp"
                  onClick={openWhatsApp}
              className="flex-1 sm:flex-initial py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl font-bold text-xs sm:text-sm bg-[#25D366] hover:bg-[#20BD5A] text-white shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              <span>
                {document ? read(whatsappLink?.label) : language === 'es' ? "Consultar por WhatsApp" : language === 'fr' ? 'Question via WhatsApp' : 'Inquire on WhatsApp'}
              </span>
            </button>
          </div>
        </div>
      </div>}
    </div>
  );
};
