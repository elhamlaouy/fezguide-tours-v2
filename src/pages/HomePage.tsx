import React from 'react';
import { Language, PageId, SectionPillar } from '../types';
import { UI_TEXT } from '../data/translations';
import { useCms } from '../context/CmsContext';
import { SectionCard } from '../components/SectionCard';
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
  const tHero = UI_TEXT.hero;
  const tHomeNav = UI_TEXT.homeQuickNav;

  // Selected top featured tours from live CMS store
  const publishedTours = tours.filter((t) => t.published !== false);
  const featuredPillars: SectionPillar[] = publishedTours.slice(0, 6);

  // The 5 quick links to other sections as requested in the user prompt:
  // "ومنها الزائر يقدر يوصل بسهولة لـ Fez و Day Trips و Food Tours و Travel Tips و About Us"
  const quickSections = [
    {
      id: 'fez' as PageId,
      title: { en: 'Explore the Medina', fr: 'Explorer la Médina', ar: 'استكشاف فاس البالي والمدينة' },
      desc: {
        en: 'Fes el-Bali walking tours, living artisan workshops, historic madrasas, and panoramic rooftop views.',
        fr: 'Ruelles piétonnes, ateliers d’artisans vivants, médersas historiques et panoramas sur les toits.',
        ar: 'جولات مشي في فاس البالي، ورشات الحرفيين، المدارس التاريخية، والمطلات البانورامية الساحرة.',
      },
      icon: Compass,
      image: '/images/real/fez_explore_medina_image1.jpg',
      badge: { en: 'Living City', fr: 'Cité Vivante', ar: 'مدينة حية' },
    },
    {
      id: 'day-trips' as PageId,
      title: { en: 'Private Day Trips', fr: 'Excursions Privées', ar: 'رحلات يومية خاصة' },
      desc: {
        en: 'Chefchaouen Blue City, ancient Roman Volubilis & Meknes, and Ifrane Middle Atlas cedar forests.',
        fr: 'Chefchaouen la bleue, ruines romaines de Volubilis & Meknès, et forêts de cèdres d’Ifrane.',
        ar: 'شفشاون الزرقاء في جبال الريف، آثار وليلي ومكناس، وإفران وغابات الأرز الأطلسي.',
      },
      icon: MapPin,
      image: '/images/real/daytrip_chefchaouen_image1.jpg',
      badge: { en: 'Private Transport', fr: 'Transport Privé', ar: 'نقل خاص مريح' },
    },
    {
      id: 'food-tours' as PageId,
      title: { en: 'Food & Tasting Walks', fr: 'Tours Culinaires', ar: 'جولات الأكل والتذوق الشعبي' },
      desc: {
        en: 'An alley safari: warm Harcha, Baghrir, piping-hot Bissara soup, local cheeses, and mint tea.',
        fr: 'Safari gourmand : Harcha tiède, Baghrir au miel, Bissara fumante, fromages et thé à la menthe.',
        ar: 'تذوق أكلات الشارع: الحرشة، البغرير، حساء البيصارة الساخن، أجبان الجبل والشاي بالنعناع.',
      },
      icon: UtensilsCrossed,
      image: '/images/real/food_medina_walk.jpg',
      badge: { en: 'Street Food Safari', fr: 'Dégustations', ar: 'تذوق أصيل' },
    },
    {
      id: 'travel-tips' as PageId,
      title: { en: 'Practical Travel Tips', fr: 'Conseils Pratiques', ar: 'نصائح وإرشادات السفر' },
      desc: {
        en: 'Getting around on foot, red Petit Taxis (10–20 MAD), cash in MAD, Friday prayer rhythm, and customs.',
        fr: 'Se déplacer à pied, petits taxis rouges (10–20 MAD), espèces, rythme du vendredi et coutumes.',
        ar: 'التنقل مشياً، سيارات التاكسي الأحمر، النقود، خصوصية يوم الجمعة وآداب الزيارة.',
      },
      icon: HelpCircle,
      image: '/images/real/tips_getting_around_image1.jpg',
      badge: { en: 'Local Advice', fr: 'Conseils Locaux', ar: 'إرشادات عملية' },
    },
    {
      id: 'about' as PageId,
      title: { en: 'About Us & Our Team', fr: 'À Propos & Équipe Locale', ar: 'من نحن وفريقنا المحلي' },
      desc: {
        en: 'Meet Med (Founder & Local Host), our licensed Medina guides, and trusted regional drivers.',
        fr: 'Rencontrez Med (fondateur & hôte local), nos guides agréés et nos chauffeurs de confiance.',
        ar: 'تعرف على المؤسس والمضيف المحلي (Med)، مرشدينا المعتمدين وسائقينا الموثوقين.',
      },
      icon: Users,
      image: '/images/real/about_us_image1.jpg',
      badge: { en: 'Local Team', fr: 'Équipe Locale', ar: 'فريق محلي' },
    },
  ];

  const whyChooseUs = [
    {
      title: { en: 'Born & Based in Fez', fr: 'Nés & Basés à Fès', ar: 'أبناء فاس وسكانها' },
      desc: {
        en: 'We live here, understand every corner, and navigate the Medina with natural local ease.',
        fr: 'Nous vivons ici et connaissons chaque recoin de la médina depuis notre enfance.',
        ar: 'نعيش في فاس ونعرف كل زقاق وحومة، ونتنقل في دروب فاس بأريحية عفوية.',
      },
      icon: Compass,
    },
    {
      title: { en: 'Private & Personal Pacing', fr: 'Visites Privées & Sur Mesure', ar: 'تجارب خاصة وشخصية' },
      desc: {
        en: 'Dedicated only to you and your group. Move at your own relaxed pace without rushed tourist crowds.',
        fr: 'Exclusivement pour vous et vos compagnons. Visitez à votre rythme sans groupe imposé.',
        ar: 'خاصة لك ولمجموعتك فقط، لتستمتعوا برحلتكم بالوتيرة التي تريحكم دون أي استعجال.',
      },
      icon: ShieldCheck,
    },
    {
      title: { en: 'Comfortable Vehicles & Drivers', fr: 'Véhicules Confortables & Chauffeurs', ar: 'سيارات مريحة وسائقون موثوقون' },
      desc: {
        en: 'Modern air-conditioned transport for scenic day trips with trusted, punctual professional drivers.',
        fr: 'Flotte moderne et climatisée pour des excursions sécurisées avec chauffeurs prévenants.',
        ar: 'سيارات سياحية حديثة ومكيفة لرحلات اليوم الواحد مع سائقين محترفين وملتزمين.',
      },
      icon: Sparkles,
    },
  ];

  const tripadvisorListing = 'https://www.tripadvisor.com/Attraction_Review-g293733-d33349838-Reviews-Fez_Guide_Tours-Fez_Fez_Meknes.html';
  const tripadvisorReviews = [
    {
      author: 'Mathilde H',
      title: 'A very professional guide',
      quote: 'An interesting visit in the medina and the souk with a guide who allows you to get your bearings well and have interesting information about the places',
      date: 'October 4, 2026',
      url: 'https://www.tripadvisor.com/ShowUserReviews-g293733-d34669370-r1080469998-Fez_Medina_Walking_Tour-Fez_Fez_Meknes.html',
    },
    {
      author: 'Andi',
      title: 'Totally recommend! Highly rate and great guide.',
      quote: 'We had a fabulous tour with Momo - he was so friendly, so informative, answered our many many many questions, took us all around the Medina (great to have a guide to do this) and 100% respected our request to not “go shopping”. A wonderful guide in Fez and totally recommend!',
      date: 'October 2, 2026',
      url: 'https://www.tripadvisor.com/ShowUserReviews-g293733-d34678534-r1080241908-Private_Fez_Medina_Walking_Tour_with_a_Local_Guide-Fez_Fez_Meknes.html',
    },
    {
      author: 'Roam14564840921',
      title: 'Nice tour with abdul',
      quote: 'We enjoyed our tour , the guide was amazing and went out of his way to make our trip memorable.',
      date: 'October 1, 2026',
      url: 'https://www.tripadvisor.com/ShowUserReviews-g293733-d34090533-r1080073259-Fez_Food_Tasting_Walking_Tour-Fez_Fez_Meknes.html',
    },
    {
      author: 'mike',
      title: 'Best Guide',
      quote: 'Rashid was a fantastic guide. We were out for 5 hours and learned and saw so much. An excellent day altogether',
      date: 'September 25, 2026',
      url: 'https://www.tripadvisor.com/ShowUserReviews-g293733-d34669370-r1079291850-Fez_Medina_Walking_Tour-Fez_Fez_Meknes.html',
    },
    {
      author: 'Pamela B',
      title: 'Best ambassador for Moroccan culture',
      quote: 'My spouse and I spent the day in Fes with a price guide named Arbi, and it was absolutely outstanding. He took us through the Fes Medina and as an inquisitive person, I was delighted that he was so willing to share his incredible knowledge of the country, city, the Medina, and the workers who create beautiful leather, embroidery, carpets, blankets, and so much more.',
      date: 'September 23, 2026',
      url: 'https://www.tripadvisor.com/ShowUserReviews-g293733-d34683134-r1079032546-Fez_Old_City_Medina_Tour-Fez_Fez_Meknes.html',
    },
    {
      author: 'Tara U',
      title: 'Amazing Day in an even more amazing place!',
      quote: 'This was the most amazing day!!! Arabi was so good to us. His knowledge of Fes and its Medina is second to none. If you want a historic tour that goes at whatever pace you set, he the guide for you! I highly recommend Arabi and the Fez Medina walking tour!',
      date: 'September 23, 2026',
      url: 'https://www.tripadvisor.com/ShowUserReviews-g293733-d34669370-r1079031217-Fez_Medina_Walking_Tour-Fez_Fez_Meknes.html',
    },
  ];

  return (
    <div className="space-y-20 pb-16">
      {/* 1. CINEMATIC HERO SECTION */}
      <section className="relative min-h-[580px] lg:min-h-[660px] flex items-center justify-center bg-[#1C2524] overflow-hidden py-12 sm:py-16">
        {/* Background Image - 100% sharp and clear across the entire above-the-fold section */}
        <img
          src={siteSettings?.heroImage || '/images/real/about_us_image7.jpg'}
          alt="Authentic Fez Tour Group in front of Bab Boujloud with local licensed guide"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Subtle, uniform tint for contrast without any bottom blur or foggy fade */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Hero Card Container - Transparent light blur for photo visibility & crystal clear contrast */}
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="bg-white/30 backdrop-blur-md rounded-3xl p-8 sm:p-12 shadow-2xl border border-white/40 text-center space-y-6">
            {/* Tagline kicker */}
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#C84B31] bg-white/70 px-3.5 py-1 rounded-full border border-white/50 backdrop-blur-xs shadow-xs">
              <MapPin className="w-4 h-4 text-[#005F5A]" />
              <span>{siteSettings?.heroTagline?.[language] || tHero.tagline[language]}</span>
            </div>

            {/* Big Main Title - Logo Brand Green #005F5A */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-[#005F5A] max-w-3xl mx-auto text-balance drop-shadow-xs">
              {siteSettings?.heroTitle?.[language] || tHero.title[language]}
            </h1>

            {/* Subtitle - Sharp, high-contrast readable text */}
            <p className="text-base sm:text-lg text-[#15201F] font-semibold max-w-2xl mx-auto leading-relaxed drop-shadow-xs">
              {siteSettings?.heroSubtitle?.[language] || tHero.subtitle[language]}
            </p>

            {/* Action CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => onNavigate('fez')}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#C84B31] hover:bg-[#B33D25] text-white font-bold text-sm rounded-xl shadow-lg ring-2 ring-white/30 transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <Compass className="w-4 h-4" />
                <span>{tHero.ctaExplore[language]}</span>
              </button>
              <button
                onClick={() => onNavigate('day-trips')}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#005F5A] hover:bg-[#004A46] text-white font-bold text-sm rounded-xl shadow-md ring-2 ring-white/30 transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4 text-[#E6F4F2]" />
                <span>{tHero.ctaDayTrips[language]}</span>
              </button>
            </div>

            {/* Trust Row */}
            <div className="pt-4 border-t border-white/30 flex flex-wrap items-center justify-center gap-5 sm:gap-8 text-xs font-bold text-[#15201F]">
              <div className="flex items-center gap-1.5 bg-white/40 px-3 py-1 rounded-lg border border-white/30">
                <ShieldCheck className="w-4 h-4 text-[#005F5A]" />
                <span>Ministry of Tourism Licensed #FEZ-2849</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/40 px-3 py-1 rounded-lg border border-white/30">
                <Star className="w-4 h-4 text-[#E07A5F] fill-current" />
                <span>5.0 on Tripadvisor (82 reviews)</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/40 px-3 py-1 rounded-lg border border-white/30">
                <Clock className="w-4 h-4 text-[#005F5A]" />
                <span>24/7 WhatsApp Assistance</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE 5 CORE DEPARTMENTS QUICK ACCESS (User requirement: ومنها الزائر يقدر يوصل بسهولة لـ Fez و Day Trips و Food Tours و Travel Tips و About Us) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#C84B31]">
            FezGuideTours Ecosystem
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#005F5A] tracking-tight">
            {tHomeNav.title[language]}
          </h2>
          <p className="text-xs sm:text-sm text-[#52605E] leading-relaxed">
            {tHomeNav.subtitle[language]}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickSections.map((sec) => {
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
                    src={sec.image}
                    alt={sec.title[language]}
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
      </section>

      {/* 3. FEATURED EXPERIENCES & TOURS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 border-b border-[#E7E2DA] pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">
              Handcrafted Itineraries
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#005F5A] tracking-tight mt-1">
              Top Featured Medina Tours & Excursions
            </h2>
          </div>
          <button
            onClick={() => onNavigate('fez')}
            className="text-xs font-bold text-[#C84B31] hover:text-[#B33D25] flex items-center gap-1 cursor-pointer"
          >
            <span>View All Tours</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 6 Featured Tour Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredPillars.map((pillar) => (
            <SectionCard
              key={pillar.id}
              pillar={pillar}
              language={language}
              onExplore={onExplore}
              onBookTour={onBookTour}
            />
          ))}
        </div>
      </section>

      {/* 4. WHY CHOOSE FEZGUIDETOURS */}
      <section className="bg-[#FAF8F5] py-16 border-y border-[#E7E2DA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C84B31]">
              The Local Difference
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#005F5A] tracking-tight">
              Why Discerning Travelers Choose Us
            </h2>
            <p className="text-xs sm:text-sm text-[#52605E]">
              We eliminate the stress of the medina so you can savor every historical moment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {whyChooseUs.map((item, idx) => {
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
      </section>

      {/* 5. REAL TRIPADVISOR REVIEWS */}
      <section id="tripadvisor-reviews" className="space-y-8 overflow-hidden">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">
            Tripadvisor · 5.0 / 5
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#005F5A] tracking-tight">
            {language === 'ar' ? 'آراء حقيقية من مسافري فاس' : language === 'fr' ? 'De vrais avis de voyageurs à Fès' : 'Real stories from travelers in Fez'}
          </h2>
          <p className="text-xs sm:text-sm text-[#52605E] leading-relaxed px-4">
            {language === 'ar' ? 'تقييمات حقيقية منشورة على صفحة Fez Guide Tours الرسمية في Tripadvisor.' : language === 'fr' ? 'Avis authentiques publiés sur la page Tripadvisor officielle de Fez Guide Tours.' : 'Verified reviews published on the official Fez Guide Tours Tripadvisor page.'}
          </p>
        </div>

        <div className="tripadvisor-marquee" tabIndex={0} aria-label="Tripadvisor traveler reviews">
          <div className="tripadvisor-track">
            {[tripadvisorReviews, tripadvisorReviews].map((reviews, copyIndex) => (
              <div className="tripadvisor-set" key={copyIndex}>
                {reviews.map((review) => {
                  const duplicate = copyIndex === 1;
                  return (
                    <a
                      key={`${copyIndex}-${review.url}`}
                      className="tripadvisor-card"
                      href={review.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      tabIndex={duplicate ? -1 : 0}
                      aria-hidden={duplicate}
                      dir="ltr"
                    >
                      <div className="tripadvisor-card-head">
                        <span className="tripadvisor-avatar" aria-hidden="true">{review.author.charAt(0).toUpperCase()}</span>
                        <span className="tripadvisor-author"><strong>{review.author}</strong><small>Tripadvisor · {review.date}</small></span>
                        <svg className="tripadvisor-mark" viewBox="0 0 48 28" aria-label="Tripadvisor" role="img"><circle cx="14" cy="15" r="9"/><circle cx="34" cy="15" r="9"/><circle cx="14" cy="15" r="3"/><circle cx="34" cy="15" r="3"/><path d="M20 9h8M24 9l-5-6h10z"/></svg>
                      </div>
                      <div className="tripadvisor-bubbles" aria-label="5 out of 5 bubbles" role="img">{[0, 1, 2, 3, 4].map((bubble) => <span key={bubble} />)}</div>
                      <h3>{review.title}</h3>
                      <p>“{review.quote}”</p>
                      <span className="tripadvisor-read">Read on Tripadvisor <ArrowRight aria-hidden="true" /></span>
                    </a>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="text-center">
          <a href={tripadvisorListing} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-[#005F5A] hover:text-[#C84B31] transition-colors">Read all 82 reviews on Tripadvisor <ArrowRight className="w-4 h-4" /></a>
        </div>
      </section>

      {/* 6. CALL TO ACTION BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#005F5A] rounded-3xl p-8 sm:p-12 text-white text-center space-y-6 shadow-xl relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {language === 'ar'
                ? 'جاهز لاكتشاف فاس برفقة مرشد سياحي معتمد؟'
                : language === 'fr'
                ? 'Prêt à explorer Fès avec un guide officiel ?'
                : 'Ready to Explore Fez with an Official Local Guide?'}
            </h2>
            <p className="text-xs sm:text-sm text-[#D4ECE9] leading-relaxed">
              {language === 'ar'
                ? 'احجز عبر الموقع مع إمكانية الإلغاء المرن، أو تواصل معنا مباشرة عبر واتساب لترتيب جولة مخصصة لك.'
                : language === 'fr'
                ? 'Réservez en ligne avec annulation flexible, ou écrivez-nous sur WhatsApp pour une visite sur mesure.'
                : 'Book online today with free flexible cancellation, or chat with our team directly on WhatsApp for custom private requests.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => onBookTour('Fez Medina & Heritage Tour')}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#C84B31] hover:bg-[#B33D25] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-colors cursor-pointer"
            >
              {UI_TEXT.common.bookNow[language]}
            </button>
            <a
              href={`https://wa.me/${(siteSettings.whatsappNumber || '212661234567').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                language === 'ar'
                  ? 'السلام عليكم ورحمة الله، أود التنسيق معكم لحجز جولة في فاس عبر FezGuideTours'
                  : language === 'fr'
                  ? "Bonjour FezGuideTours ! J'aimerais planifier une visite guidée à Fès."
                  : 'Hello FezGuideTours! I would like to plan a guided tour in Fez.'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-3.5 bg-white text-[#005F5A] hover:bg-[#FAF8F5] font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-colors"
            >
              {language === 'ar'
                ? `تواصل عبر واتساب (${siteSettings.phoneNumber})`
                : language === 'fr'
                ? `WhatsApp (${siteSettings.phoneNumber})`
                : `WhatsApp Us (${siteSettings.phoneNumber})`}
            </a>
          </div>
        </div>
      </section>

    </div>
  );
};
