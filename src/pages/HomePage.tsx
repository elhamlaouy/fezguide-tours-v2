import { businessContactHref } from '../cms/business-contact';
import { pagePath } from '../cms/routing';
import React from 'react';
import { Language, PageId, SectionPillar } from '../types';
import { UI_TEXT } from '../data/shared-ui';
import { useCms } from '../context/CmsContext';
import { ApprovedSection, ApprovedSections, useApprovedContent } from '../cms/approved-content';
import { visibleLink, resolveImage } from '../cms/render-utils';
import { authoredCardImageSizes, responsiveImageProps } from '../cms/optimized-image';
import { SectionCard } from '../components/SectionCard';
import { TripadvisorReviewsSection } from '../components/TripadvisorReviewsSection';
import {
  Compass,
  MapPin,
  UtensilsCrossed,
  HelpCircle,
  Users,
  ShieldCheck,
  Star,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';

interface HomePageProps {
  language: Language;
  onNavigate: (page: PageId) => void;
  onExplore: (pillar: SectionPillar) => void;
  onBookTour: (tourTitle: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  language,
  onNavigate,
  onExplore,
  onBookTour,
}) => {
  const { tours, siteSettings } = useCms();
  const { document, section } = useApprovedContent('home');
  const hero = section('hero', 'hero');
  const trust = section('trust', 'benefits');
  const quick = section('quick-navigation', 'cardGrid');
  const featured = section('featured', 'cardGrid');
  const benefits = section('why-choose-us', 'benefits');
  const contact = section('contact', 'contact');
  const blank = { en: '', fr: '', es: '' };
  const imageSource = (mediaId: string | undefined) => document && mediaId ? resolveImage(document, {mediaId, alt:blank}, language)?.src : undefined;
  const heroLinks = document ? (hero?.links ?? []).filter(link => visibleLink(document, link)) : [];
  const heroSource = document ? imageSource(hero?.image?.mediaId) : (siteSettings?.heroImage || '/images/real/about_us_image7.jpg');
  const tHero = UI_TEXT.hero;
  const tHomeNav = UI_TEXT.homeQuickNav;

  // Selected top featured tours from live CMS store
  const publishedTours = tours.filter((t) => t.published !== false);
  const featuredPillars: SectionPillar[] = document ? (featured?.cards ?? []).flatMap(card => {
    const target = publishedTours.find(tour => tour.id === card.pageId);
    if (!target) return [];
    return [{ ...target, title: card.title, subtitle: card.badge ?? blank, shortDescription: card.description,
      image: imageSource(card.image?.mediaId) ?? '', imageAlt: card.image?.alt ?? blank }];
  }) : publishedTours.filter((tour) => tour.id !== 'our-fez-tours').slice(0, 6);

  // Quick links to the five core sections.
  const quickSections = [
    {
      id: 'fez' as PageId,
      title: { en: 'Explore the Medina', fr: 'Explorer la Médina', es: 'Explora la medina' },
      desc: {
        en: 'Fes el-Bali walking tours, living artisan workshops, historic madrasas, and panoramic rooftop views.',
        fr: 'Ruelles piétonnes, ateliers d’artisans vivants, médersas historiques et panoramas sur les toits.',
        es: 'Paseos por Fez el-Bali, talleres artesanos en activo, madrasas históricas y vistas panorámicas de los tejados.',
      },
      icon: Compass,
      image: '/images/real/fez_explore_medina_image1.jpg',
      badge: { en: 'Living City', fr: 'Cité Vivante', es: 'Ciudad viva' },
    },
    {
      id: 'day-trips' as PageId,
      title: { en: 'Private Day Trips', fr: 'Excursions Privées', es: 'Excursiones privadas' },
      desc: {
        en: 'Chefchaouen, Meknes and Volubilis, and the mountains of the Middle Atlas.',
        fr: 'Chefchaouen, Meknès et Volubilis, et les montagnes du Moyen Atlas.',
        es: 'Chefchaouen, Mequinez y Volubilis, y las montañas del Atlas Medio.',
      },
      icon: MapPin,
      image: '/images/daytrip-chefchaouen/blue-alley.webp',
      badge: { en: 'Private Transport', fr: 'Transport Privé', es: 'Transporte privado' },
    },
    {
      id: 'food-tours' as PageId,
      title: { en: 'Food & Tasting Walks', fr: 'Tours Culinaires', es: 'Paseos gastronómicos' },
      desc: {
        en: 'An alley safari: warm Harcha, Baghrir, piping-hot Bissara soup, local cheeses, and mint tea.',
        fr: 'Safari gourmand : Harcha tiède, Baghrir au miel, Bissara fumante, fromages et thé à la menthe.',
        es: 'Sabores entre callejuelas: harcha recién hecha, baghrir, bissara caliente, quesos locales y té a la menta.',
      },
      icon: UtensilsCrossed,
      image: '/images/food-tasting-walk/wood-oven.webp',
      badge: { en: 'Street Food Safari', fr: 'Dégustations', es: 'Sabores de la calle' },
    },
    {
      id: 'travel-tips' as PageId,
      title: { en: 'Practical Travel Tips', fr: 'Conseils Pratiques', es: 'Consejos prácticos de viaje' },
      desc: {
        en: 'Getting around on foot, red Petit Taxis (10–20 MAD), cash in MAD, Friday prayer rhythm, and customs.',
        fr: 'Se déplacer à pied, petits taxis rouges (10–20 MAD), espèces, rythme du vendredi et coutumes.',
        es: 'Moverse a pie, taxis rojos (10–20 MAD), efectivo en dírhams, horarios de oración del viernes y costumbres locales.',
      },
      icon: HelpCircle,
      image: '/images/real/tips_getting_around_image1.jpg',
      badge: { en: 'Local Advice', fr: 'Conseils Locaux', es: 'Consejos locales' },
    },
    {
      id: 'about' as PageId,
      title: { en: 'About Us & Our Team', fr: 'À Propos & Équipe Locale', es: 'Quiénes somos y nuestro equipo' },
      desc: {
        en: 'Meet Med (Founder & Local Host), our licensed Medina guides, and trusted regional drivers.',
        fr: 'Rencontrez Med (fondateur & hôte local), nos guides agréés et nos chauffeurs de confiance.',
        es: 'Conoce a Med, fundador y anfitrión local, a nuestros guías acreditados de la medina y a nuestros conductores de confianza.',
      },
      icon: Users,
      image: '/images/real/about_us_image1.jpg',
      badge: { en: 'Local Team', fr: 'Équipe Locale', es: 'Equipo local' },
    },
  ];

  const whyChooseUs = [
    {
      title: { en: 'Born & Based in Fez', fr: 'Nés & Basés à Fès', es: 'De Fez y en Fez' },
      desc: {
        en: 'We live here, understand every corner, and navigate the Medina with natural local ease.',
        fr: 'Nous vivons ici et connaissons chaque recoin de la médina depuis notre enfance.',
        es: 'Vivimos aquí, conocemos cada rincón y nos movemos por la medina con la naturalidad de quienes son de Fez.',
      },
      icon: Compass,
    },
    {
      title: { en: 'Private & Personal Pacing', fr: 'Visites Privées & Sur Mesure', es: 'Visitas privadas a tu ritmo' },
      desc: {
        en: 'Dedicated only to you and your group. Move at your own relaxed pace without rushed tourist crowds.',
        fr: 'Exclusivement pour vous et vos compagnons. Visitez à votre rythme sans groupe imposé.',
        es: 'Solo para ti y tu grupo. Disfrutad a vuestro ritmo, sin prisas ni grupos turísticos impuestos.',
      },
      icon: ShieldCheck,
    },
    {
      title: { en: 'Comfortable Vehicles & Drivers', fr: 'Véhicules Confortables & Chauffeurs', es: 'Vehículos cómodos y conductores' },
      desc: {
        en: 'Modern air-conditioned transport for scenic day trips with trusted, punctual professional drivers.',
        fr: 'Flotte moderne et climatisée pour des excursions sécurisées avec chauffeurs prévenants.',
        es: 'Transporte moderno con aire acondicionado para las excursiones, con conductores profesionales, puntuales y de confianza.',
      },
      icon: Sparkles,
    },
  ];

  return (
    <div className="space-y-20 pb-16"><ApprovedSections>
      {/* 1. CINEMATIC HERO SECTION */}
      <ApprovedSection id="hero"><section className="relative min-h-[580px] lg:min-h-[660px] flex items-center justify-center bg-[#1C2524] overflow-hidden py-12 sm:py-16">
        {/* Background Image - 100% sharp and clear across the entire above-the-fold section */}
        {heroSource && <img
          {...responsiveImageProps(heroSource, '100vw', true)}
          fetchPriority="high"
          loading="eager"
          decoding="async"
          alt={document ? hero?.image?.alt[language] ?? '' : (language === 'es' ? 'Grupo de visitantes ante Bab Boujloud con un guía local oficial' : 'Authentic Fez Tour Group in front of Bab Boujloud with local licensed guide')}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />}
        {/* Subtle, uniform tint for contrast without any bottom blur or foggy fade */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Hero Card Container - Transparent light blur for photo visibility & crystal clear contrast */}
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="bg-white/30 backdrop-blur-md rounded-3xl p-8 sm:p-12 shadow-2xl border border-white/40 text-center space-y-6">
            {/* Tagline kicker */}
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#C84B31] bg-white/70 px-3.5 py-1 rounded-full border border-white/50 backdrop-blur-xs shadow-xs">
              <MapPin className="w-4 h-4 text-[#005F5A]" />
              <span>{document ? hero?.eyebrow?.[language] ?? '' : (siteSettings?.heroTagline?.[language] || tHero.tagline[language])}</span>
            </div>

            {/* Big Main Title - Logo Brand Green #005F5A */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-[#005F5A] max-w-3xl mx-auto text-balance drop-shadow-xs">
              {document ? hero?.title?.[language] ?? '' : (siteSettings?.heroTitle?.[language] || tHero.title[language])}
            </h1>

            {/* Subtitle - Sharp, high-contrast readable text */}
            <p className="text-base sm:text-lg text-[#15201F] font-semibold max-w-2xl mx-auto leading-relaxed drop-shadow-xs">
              {document ? hero?.description?.[language] ?? '' : (siteSettings?.heroSubtitle?.[language] || tHero.subtitle[language])}
            </p>

            {/* Action CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              {(!document || heroLinks[0]) && (<button
                onClick={() => heroLinks[0]?.pageId ? onNavigate(heroLinks[0].pageId!) : heroLinks[0]?.href ? window.location.assign(heroLinks[0].href!) : onNavigate('fez')}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#C84B31] hover:bg-[#B33D25] text-white font-bold text-sm rounded-xl shadow-lg ring-2 ring-white/30 transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <Compass className="w-4 h-4" />
                <span>{document ? heroLinks[0]?.label[language] ?? '' : tHero.ctaExplore[language]}</span>
              </button>)}
              {(!document || heroLinks[1]) && (<button
                onClick={() => heroLinks[1]?.pageId ? onNavigate(heroLinks[1].pageId!) : heroLinks[1]?.href ? window.location.assign(heroLinks[1].href!) : onNavigate('day-trips')}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#005F5A] hover:bg-[#004A46] text-white font-bold text-sm rounded-xl shadow-md ring-2 ring-white/30 transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4 text-[#E6F4F2]" />
                <span>{document ? heroLinks[1]?.label[language] ?? '' : tHero.ctaDayTrips[language]}</span>
              </button>)}
            </div>

            {/* Trust Row */}
            <ApprovedSection id="trust"><div className="pt-4 border-t border-white/30 flex flex-wrap items-center justify-center gap-5 sm:gap-8 text-xs font-bold text-[#15201F]">{document ? (trust?.items ?? []).map((item, index) => { const Icon = [ShieldCheck, Star, Clock][index] ?? ShieldCheck; return (<div key={index} className="flex items-center gap-1.5 bg-white/40 px-3 py-1 rounded-lg border border-white/30">
                <Icon className={`w-4 h-4 ${index === 1 ? 'text-[#E07A5F] fill-current' : 'text-[#005F5A]'}`} />
                <span>{item.title[language]}{item.description[language] && <span>{item.description[language]}</span>}</span>
              </div>); }) : (<>
              <div className="flex items-center gap-1.5 bg-white/40 px-3 py-1 rounded-lg border border-white/30">
                <ShieldCheck className="w-4 h-4 text-[#005F5A]" />
                <span>{language === 'es' ? "Autorizados por el Ministerio de Turismo #FEZ-2849" : "Ministry of Tourism Licensed #FEZ-2849"}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/40 px-3 py-1 rounded-lg border border-white/30">
                <Star className="w-4 h-4 text-[#E07A5F] fill-current" />
                <span>{language === 'es' ? '5.0 en Tripadvisor (82 opiniones)' : '5.0 on Tripadvisor (82 reviews)'}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/40 px-3 py-1 rounded-lg border border-white/30">
                <Clock className="w-4 h-4 text-[#005F5A]" />
                <span>{language === 'es' ? 'Asistencia por WhatsApp las 24 horas' : '24/7 WhatsApp Assistance'}</span>
              </div>
            </>)}</div></ApprovedSection>
          </div>
        </div>
      </section></ApprovedSection>

      {/* 2. THE 5 CORE DEPARTMENTS QUICK ACCESS (Fez, Day Trips, Food Tours, Travel Tips and About Us) */}
      <ApprovedSection id="quick-navigation"><section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#C84B31]">{document ? quick?.eyebrow?.[language] ?? '' : ("FezGuideTours Ecosystem")}</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#005F5A] tracking-tight">{document ? quick?.title?.[language] ?? '' : (tHomeNav.title[language])}</h2>
          <p className="text-xs sm:text-sm text-[#52605E] leading-relaxed">{document ? quick?.description?.[language] ?? '' : (tHomeNav.subtitle[language])}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(document ? (quick?.cards ?? []).filter(card => !card.pageId || document.pages.some(page => page.id === card.pageId && page.enabled)).map(card => ({
            id: card.pageId ?? card.id, title: card.title, desc: card.description, badge: card.badge ?? blank,
            image: imageSource(card.image?.mediaId), alt: card.image?.alt ?? blank,
            icon: quickSections.find(source => source.id === card.pageId)?.icon ?? Compass,
          })) : quickSections.map(card => ({ ...card, alt: card.title }))).map((sec) => {
            const Icon = sec.icon;
            return (
              <div
                key={sec.id}
                onClick={() => {
                  onNavigate(sec.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                role="button"
                tabIndex={0}
                className="group relative bg-white rounded-2xl border border-[#E7E2DA] overflow-hidden shadow-xs hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
              >
                {/* Visual Thumbnail */}
                <div className="relative h-44 w-full bg-[#1C2524] overflow-hidden">
                  <img
                    {...responsiveImageProps(sec.image ?? '', authoredCardImageSizes(sec.image ?? '', 'quick-navigation'))}
                    loading="lazy"
                    decoding="async"
                    alt={sec.alt[language]}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs text-[#005F5A] text-[11px] font-bold px-2.5 py-1 rounded-md shadow-xs">
                    {sec.badge[language]}
                  </div>
                  <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2 text-white">
                    <div className="p-2 rounded-lg bg-[#005F5A] text-white">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold drop-shadow-xs">
                      {sec.title[language]}
                    </h3>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <p className="text-xs text-[#52605E] leading-relaxed">
                    {sec.desc[language]}
                  </p>

                  <div className="pt-2 border-t border-[#F2ECE4] flex items-center justify-between text-xs font-bold text-[#005F5A] group-hover:text-[#C84B31] transition-colors">
                    <span>{UI_TEXT.common.explore[language]}</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section></ApprovedSection>

      {/* 3. FEATURED EXPERIENCES & TOURS */}
      <ApprovedSection id="featured"><section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 border-b border-[#E7E2DA] pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">{document ? featured?.eyebrow?.[language] ?? '' : ("Handcrafted Itineraries")}</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#005F5A] tracking-tight mt-1">{document ? featured?.title?.[language] ?? '' : ("Top Featured Medina Tours & Excursions")}</h2>
          </div>
          <button
            onClick={() => onNavigate('fez')}
            className="text-xs font-bold text-[#C84B31] hover:text-[#B33D25] flex items-center gap-1 cursor-pointer"
          >
            <span>{language === 'es' ? "Ver todas las visitas" : "View All Tours"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 6 Featured Tour Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredPillars.map((pillar) => (
            <SectionCard
              key={pillar.id}
              pillar={pillar}
              imageSizes={authoredCardImageSizes(pillar.image, 'home')}
              language={language}
              onExplore={onExplore}
              onBookTour={onBookTour}
            />
          ))}
        </div>
      </section></ApprovedSection>

      {/* 4. WHY CHOOSE FEZGUIDETOURS */}
      <ApprovedSection id="why-choose-us"><section className="bg-[#FAF8F5] py-16 border-y border-[#E7E2DA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C84B31]">{document ? benefits?.eyebrow?.[language] ?? '' : ("The Local Difference")}</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#005F5A] tracking-tight">{document ? benefits?.title?.[language] ?? '' : ("Why Discerning Travelers Choose Us")}</h2>
            <p className="text-xs sm:text-sm text-[#52605E]">{document ? benefits?.description?.[language] ?? '' : ("We eliminate the stress of the medina so you can savor every historical moment.")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(document ? (benefits?.items ?? []).map((item, index) => ({ title: item.title, desc: item.description, icon: whyChooseUs[index]?.icon ?? Compass })) : whyChooseUs).map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-white p-7 rounded-2xl border border-[#E7E2DA] shadow-xs space-y-3"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#005F5A]/10 text-[#005F5A] flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-[#1C2524]">
                    {item.title[language]}
                  </h3>
                  <p className="text-xs text-[#52605E] leading-relaxed">
                    {item.desc[language]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section></ApprovedSection>

      {/* 5. REAL TRIPADVISOR REVIEWS */}
      <ApprovedSection id="reviews"><TripadvisorReviewsSection language={language} /></ApprovedSection>

      {/* 6. CALL TO ACTION BANNER */}
      <ApprovedSection id="contact"><section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#005F5A] rounded-3xl p-8 sm:p-12 text-white text-center space-y-6 shadow-xl relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{document ? contact?.title?.[language] ?? '' : (language === 'es'
                ? "¿Listos para descubrir Fez con un guía local oficial?"
                : language === 'fr'
                ? 'Prêt à explorer Fès avec un guide officiel ?'
                : 'Ready to Explore Fez with an Official Local Guide?')}</h2>
            <p className="text-xs sm:text-sm text-[#D4ECE9] leading-relaxed">{document ? contact?.description?.[language] ?? '' : (language === 'es'
                ? "Reservad hoy en línea con cancelación flexible gratuita, o contactad directamente con nuestro equipo por WhatsApp para organizar una visita privada a medida."
                : language === 'fr'
                ? 'Réservez en ligne avec annulation flexible, ou écrivez-nous sur WhatsApp pour une visite sur mesure.'
                : 'Book online today with free flexible cancellation, or chat with our team directly on WhatsApp for custom private requests.')}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => onBookTour('Fez Medina & Heritage Tour')}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#C84B31] hover:bg-[#B33D25] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-colors cursor-pointer"
            >
              {UI_TEXT.common.bookNow[language]}
            </button>
            {document ? (contact?.links ?? []).filter(link => visibleLink(document, link)).map(link => (<a key={link.id}
              href={link.href ? businessContactHref(document, link.href) : link.pageId ? pagePath(document, link.pageId, language) : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-3.5 bg-white text-[#005F5A] hover:bg-[#FAF8F5] font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-colors"
            >{link.label[language]}</a>)) : (<a
              href={`https://wa.me/${(siteSettings.whatsappNumber || '212719603009').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                language === 'es'
                  ? 'Hola, me gustaría organizar una visita en Fez con vosotros a través de FezGuideTours.'
                  : language === 'fr'
                  ? "Bonjour FezGuideTours ! J'aimerais planifier une visite guidée à Fès."
                  : 'Hello FezGuideTours! I would like to plan a guided tour in Fez.'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-3.5 bg-white text-[#005F5A] hover:bg-[#FAF8F5] font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-colors"
            >
              {language === 'es'
                ? `Contactar por WhatsApp (${siteSettings.phoneNumber})`
                : language === 'fr'
                ? `WhatsApp (${siteSettings.phoneNumber})`
                : `WhatsApp Us (${siteSettings.phoneNumber})`}
            </a>)}
          </div>
        </div>
      </section></ApprovedSection>

    </ApprovedSections></div>
  );
};
