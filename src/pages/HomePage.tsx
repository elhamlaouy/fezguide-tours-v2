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
      image: '/src/assets/images/real/fez_explore_medina_image1.jpg',
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
      image: '/src/assets/images/real/daytrip_chefchaouen_image1.jpg',
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
      image: '/src/assets/images/real/food_tasting_walk_image1.jpg',
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
      image: '/src/assets/images/real/tips_getting_around_image1.jpg',
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
      image: '/src/assets/images/real/about_us_image1.jpg',
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

  const testimonials = [
    {
      quote: {
        en: 'Youssef was extraordinary! He guided our family through the Fez medina and the Chouara tannery with such warmth and deep historical knowledge. Truly the highlight of our Morocco holiday.',
        fr: 'Youssef a été extraordinaire ! Il a guidé notre famille à travers la médina et les tanneries avec une bienveillance et une culture impressionnantes. Le meilleur moment de notre voyage.',
        ar: 'كانت جولتنا مع يوسف استثنائية بكل المقاييس! شرحه لتاريخ فاس وتفاصيل دار الدباغ شوارة كان ممتعاً وموثقاً. أفضل تجربة عشناها في المغرب.',
      },
      author: 'David & Clara Miller',
      location: 'London, UK · Fez Medina Walking Tour',
      rating: 5,
    },
    {
      quote: {
        en: 'The Chefchaouen day trip was seamless. Comfortable Mercedes vehicle, polite driver Hassan, and we had plenty of time for photos without being rushed. Highly recommended!',
        fr: 'L’excursion à Chefchaouen s’est déroulée à merveille. Véhicule Mercedes très confortable, chauffeur Hassan très prévenant. Nous avons adoré chaque instant.',
        ar: 'رحلة شفشاون كانت مريحة ومنظمة للغاية. السيارة حديثة ومكيفة والسائق حسن كان في قمة الاحترام واللباقة. ننصح بهم بشدة!',
      },
      author: 'Marie-Laure Dupont',
      location: 'Lyon, France · Chefchaouen Day Trip',
      rating: 5,
    },
  ];

  return (
    <div className="space-y-20 pb-16">
      {/* 1. CINEMATIC HERO SECTION */}
      <section className="relative min-h-[560px] lg:min-h-[640px] flex items-center justify-center bg-[#15201F] text-white overflow-hidden">
        {/* Background Image with Scrim */}
        <img
          src="/src/assets/images/real/about_us_image7.jpg"
          alt="Authentic Fez Tour Group in front of Bab Boujloud with local licensed guide"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-40 object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#15201F] via-[#15201F]/40 to-transparent" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-6">
          {/* Subtle Tagline kicker (No pill) */}
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#E07A5F]">
            <MapPin className="w-3.5 h-3.5 text-[#00A896]" />
            <span>{tHero.tagline[language]}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight max-w-4xl mx-auto text-balance">
            {tHero.title[language]}
          </h1>

          <p className="text-base sm:text-lg text-[#CCD8D6] max-w-2xl mx-auto leading-relaxed">
            {tHero.subtitle[language]}
          </p>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('fez')}
              className="w-full sm:w-auto px-7 py-3.5 bg-[#C84B31] hover:bg-[#B33D25] text-white font-bold text-sm rounded-xl shadow-lg transition-transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <Compass className="w-4 h-4" />
              <span>{tHero.ctaExplore[language]}</span>
            </button>
            <button
              onClick={() => onNavigate('day-trips')}
              className="w-full sm:w-auto px-7 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl border border-white/20 backdrop-blur-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4 text-[#00A896]" />
              <span>{tHero.ctaDayTrips[language]}</span>
            </button>
          </div>

          {/* Trust Row */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[#9BB1AF]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#00A896]" />
              <span>Ministry of Tourism Licensed #FEZ-2849</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-[#E07A5F] fill-current" />
              <span>5.0 Star Rated (320+ Verified Reviews)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#00A896]" />
              <span>24/7 WhatsApp Assistance</span>
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
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C2524] tracking-tight">
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
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C2524] tracking-tight mt-1">
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
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C2524] tracking-tight">
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

      {/* 5. TRAVELER TESTIMONIALS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">
            Verified Guest Reviews
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C2524] tracking-tight">
            Memories Made in Fez
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E7E2DA] shadow-xs space-y-4"
            >
              <div className="flex items-center gap-1 text-[#E07A5F]">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-xs sm:text-sm text-[#384644] italic leading-relaxed">
                "{t.quote[language]}"
              </p>
              <div className="pt-2 border-t border-[#F2ECE4]">
                <h4 className="text-xs font-bold text-[#1C2524]">{t.author}</h4>
                <p className="text-[11px] text-[#728280]">{t.location}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. CALL TO ACTION BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#005F5A] rounded-3xl p-8 sm:p-12 text-white text-center space-y-6 shadow-xl relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Ready to Explore Fez with an Official Local Guide?
            </h2>
            <p className="text-xs sm:text-sm text-[#D4ECE9] leading-relaxed">
              Book online today with free flexible cancellation, or chat with our team directly on WhatsApp for custom private requests.
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
              href="https://wa.me/212661234567?text=Hello%20FezGuideTours,%20I%20would%20like%20to%20plan%20a%20tour"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-3.5 bg-white text-[#005F5A] hover:bg-[#FAF8F5] font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-colors"
            >
              WhatsApp Us (+212 661-234567)
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
