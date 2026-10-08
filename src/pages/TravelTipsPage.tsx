import React, { useState } from 'react';
import { Language, SectionPillar } from '../types';
import { UI_TEXT } from '../data/translations';
import { useCms } from '../context/CmsContext';
import { SectionCard } from '../components/SectionCard';
import { HelpCircle, DollarSign, Compass, ShieldCheck, MapPin, Footprints, AlertCircle, Clock } from 'lucide-react';

interface TravelTipsPageProps {
  language: Language;
  onExplore: (pillar: SectionPillar) => void;
  onBookTour: (tourTitle: string) => void;
}

export const TravelTipsPage: React.FC<TravelTipsPageProps> = ({
  language,
  onExplore,
  onBookTour,
}) => {
  const { tours, siteSettings } = useCms();
  const [eurAmount, setEurAmount] = useState<number>(50);

  const madAmount = Math.round(eurAmount * 10.8);

  const travelTipsPillars = tours.filter((t) => t.pageId === 'travel-tips' && t.published !== false);

  const headers = {
    title: {
      en: 'Practical Travel Tips & Local Advice for Fez',
      fr: 'Conseils Pratiques & Informations Locales pour Fès',
      ar: 'نصائح السفر والإرشادات العملية لزيارة فاس',
    },
    subtitle: {
      en: 'A few simple things make your stay in Fez comfortable and stress-free. Practical advice on walking, red Petit Taxis, cash, and local customs from people who know the city.',
      fr: 'Quelques conseils simples pour un séjour serein et confortable. Astuces de marche, petits taxis rouges, espèces et coutumes par des locaux.',
      ar: 'تفاصيل عملية بسيطة تجعل إقامتك في فاس مريحة وخالية من المتاعب. إرشادات التنقل، التاكسي الأحمر، النقود، وعادات المدينة من أهلها.',
    },
  };

  const quickRules = [
    {
      title: { en: 'Always Carry Cash (MAD)', fr: 'Toujours avoir des Espèces (MAD)', ar: 'احتفظ بنقود بالدرهم المغربي دائماً' },
      desc: {
        en: 'Cards are accepted in modern hotels, but cash is essential for Medina souks, street snacks, and petit taxis.',
        fr: 'Les cartes sont acceptées en hôtel, mais le liquide est indispensable dans les souks et petits taxis.',
        ar: 'تُقبل البطاقات في الفنادق الكبرى، لكن النقود ضرورية في دكاكين فاس البالي ومأكولات الشارع والتاكسي.',
      },
    },
    {
      title: { en: 'Wear Comfortable Walking Shoes', fr: 'Chaussures de Marche Confortables', ar: 'حذاء مشي مريح مانع للانزلاق' },
      desc: {
        en: 'You will walk more than expected. Medieval cobblestones have slopes, steps, and uneven stones.',
        fr: 'Vous marcherez beaucoup : pavés médiévaux, ruelles en pente et marches.',
        ar: 'ستمشي لمسافات طويلة داخل فاس البالي؛ والأزقة المرصوفة بالحجارة تتطلب حذاءً مريحاً.',
      },
    },
    {
      title: { en: 'Red Petit Taxis (10–20 MAD)', fr: 'Petits Taxis Rouges (10–20 MAD)', ar: 'التاكسي الصغير الأحمر (10-20 درهم)' },
      desc: {
        en: 'Outside the pedestrian Medina walls, red taxis are cheap and metered. Ask to turn on the meter (compteur).',
        fr: 'À l’extérieur des remparts, les petits taxis rouges sont économiques et munis d’un compteur.',
        ar: 'خارج أسوار المدينة، سيارات التاكسي الأحمر وسيلة سهلة ورخيصة مع التأكد من تشغيل العداد.',
      },
    },
    {
      title: { en: 'Friday Prayer Rhythm', fr: 'Rythme du Vendredi', ar: 'خصوصية يوم الجمعة' },
      desc: {
        en: 'Friday is holy: many traditional shops pause between 12:00 PM and 3:30 PM for congregational prayer.',
        fr: 'Vendredi saint : de nombreuses échoppes ferment entre midi et 15h30 pour la prière.',
        ar: 'يوم الجمعة مميز: تغلق بعض الدكاكين الحرفية بين الظهر والعصر لأداء صلاة الجمعة.',
      },
    },
  ];

  return (
    <div className="space-y-16 pb-20">
      {/* Header Banner */}
      <section className="relative bg-[#1C2524] py-12 sm:py-20 overflow-hidden">
        <img
          src="/images/real/tips_plan_trip_image1.jpg"
          alt="Panoramic Fez View"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/30 backdrop-blur-md rounded-3xl p-8 sm:p-12 shadow-xl border border-white/40 text-center space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C84B31] bg-white/70 px-3.5 py-1 rounded-full border border-white/50 backdrop-blur-xs shadow-xs">
              <HelpCircle className="w-4 h-4 text-[#005F5A]" />
              <span>Local Practical Advice · Honest Tips · Getting Around</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#005F5A] text-balance drop-shadow-xs">
              {headers.title[language]}
            </h1>

            <p className="text-sm sm:text-base text-[#15201F] font-semibold max-w-2xl mx-auto leading-relaxed drop-shadow-xs">
              {headers.subtitle[language]}
            </p>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* 4 Golden Rules Box from Google Doc */}
        <div className="bg-white rounded-3xl border border-[#E7E2DA] p-8 sm:p-10 shadow-xs space-y-6">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">
              {language === 'ar' ? 'قواعد ذهبية لإقامة مريحة' : 'Essential Local Advice'}
            </span>
            <h2 className="text-2xl font-extrabold text-[#005F5A] tracking-tight">
              {language === 'ar'
                ? 'تفاصيل بسيطة تصنع فرقاً كبيراً في رحلتك'
                : 'A Few Local Tips Can Make a Big Difference'}
            </h2>
            <p className="text-xs sm:text-sm text-[#4E5B59] leading-relaxed">
              {language === 'ar'
                ? 'لا تحتاج إلى معرفة كل شيء قبل الوصول إلى فاس؛ فالصبر والاحترام والاستمتاع بوتيرة المدينة هو كل ما يلزمك.'
                : 'You do not need to know everything before you arrive. A little patience, respect, and curiosity will take you a long way.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[#F2ECE4]">
            {quickRules.map((rule, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2DA] space-y-2">
                <span className="font-bold text-xs text-[#005F5A] block">
                  {rule.title[language]}
                </span>
                <p className="text-xs text-[#52605E] leading-relaxed">
                  {rule.desc[language]}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {travelTipsPillars.map((pillar) => (
            <SectionCard
              key={pillar.id}
              pillar={pillar}
              language={language}
              onExplore={() => onExplore(pillar)}
              onBookTour={() => onBookTour(pillar.title[language])}
            />
          ))}
        </div>

        {/* Real Visual Tips Gallery */}
        <div className="space-y-4 pt-2">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">
              {language === 'ar' ? 'فاس في صور واقعية' : 'Visual Guide to Fez'}
            </span>
            <h3 className="text-xl font-bold text-[#1C2524]">
              {language === 'ar' ? 'مشاهد من يوميات فاس العتيقة' : 'Everyday Scenes & Practical Navigation'}
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                src: '/images/real/tips_getting_around_image1.jpg',
                title: language === 'ar' ? 'التاكسي الصغير الأحمر' : 'Red Petit Taxis',
              },
              {
                src: '/images/real/tips_plan_trip_image1.jpg',
                title: language === 'ar' ? 'مطلات بانورامية' : 'Medina Viewpoints',
              },
              {
                src: '/images/real/tips_practical_image1.jpg',
                title: language === 'ar' ? 'الضيافة والشاي المغربي' : 'Mint Tea Hospitality',
              },
              {
                src: '/images/real/fez_things_to_do_image1.jpg',
                title: language === 'ar' ? 'أسواق فاس وحرفها' : 'Crafts & Souks',
              },
            ].map((item, idx) => (
              <div key={idx} className="relative aspect-4/3 rounded-2xl overflow-hidden border border-[#E7E2DA] shadow-xs group bg-[#1C2524]">
                <img
                  src={item.src}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                <div className="absolute bottom-2.5 left-3 right-3 text-white text-[11px] font-bold">
                  {item.title}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Currency Converter & Gate Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Quick Currency Converter */}
          <div className="bg-white p-8 rounded-3xl border border-[#E7E2DA] shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#005F5A]/10 text-[#005F5A]">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1C2524]">
                  {language === 'ar' ? 'حاسبة العملة السريعة (يورو / درهم)' : 'Quick Currency Estimator'}
                </h3>
                <p className="text-xs text-[#52605E]">
                  {language === 'ar' ? 'سعر الصرف التقريبي: 1 يورو ≈ 10.8 درهم مغربي' : 'Approximate conversion: 1 EUR ≈ 10.8 MAD'}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-xs font-semibold text-[#445250] block">
                {language === 'ar' ? 'المبلغ باليورو (EUR):' : 'Amount in EUR:'}
              </label>
              <input
                type="number"
                min="5"
                max="5000"
                value={eurAmount}
                onChange={(e) => setEurAmount(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E7E2DA] text-sm focus:outline-hidden focus:border-[#005F5A]"
              />

              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] flex items-center justify-between">
                <span className="text-xs text-[#52605E] font-medium">
                  {language === 'ar' ? 'المعادل بالدرهم المغربي:' : 'Equivalent in MAD:'}
                </span>
                <span className="text-lg font-bold text-[#005F5A]">
                  ~{madAmount} MAD
                </span>
              </div>
            </div>
          </div>

          {/* Key Medina Gates Cheat Sheet */}
          <div className="bg-white p-8 rounded-3xl border border-[#E7E2DA] shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#C84B31]/10 text-[#C84B31]">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1C2524]">
                  {language === 'ar' ? 'أهم بوابات فاس للالتقاء والتاكسي' : 'Medina Gates Reference'}
                </h3>
                <p className="text-xs text-[#52605E]">
                  {language === 'ar' ? 'أماكن ركوب السيارات والتوصيل خارج دروب المشاة' : 'Where vehicles can reach you around the pedestrian zone'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA]">
                <span className="font-bold text-[#1C2524] block">Bab Boujloud</span>
                <span className="text-[#52605E] text-[11px]">The famous Blue Gate; main western hub.</span>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA]">
                <span className="font-bold text-[#1C2524] block">Bab Rcif</span>
                <span className="text-[#52605E] text-[11px]">Central access to lower medina & food souks.</span>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA]">
                <span className="font-bold text-[#1C2524] block">Place Batha</span>
                <span className="text-[#52605E] text-[11px]">Quiet taxi station near Batha museum and riads.</span>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA]">
                <span className="font-bold text-[#1C2524] block">Ain Azliten</span>
                <span className="text-[#52605E] text-[11px]">Accessible parking lot for northern riads.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Local Contact Banner */}
        <div className="bg-[#FAF8F5] rounded-3xl border border-[#E7E2DA] p-8 sm:p-12 text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">
            {language === 'ar'
              ? 'نحن هنا لمساعدتكم'
              : language === 'fr'
              ? 'Besoin de Conseils Locaux ?'
              : 'Need More Local Advice?'}
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-[#1C2524]">
            {language === 'ar'
              ? 'تخطيط رحلتك أسهل بكثير مع نصائح من أهل فاس'
              : language === 'fr'
              ? 'Voyagez avec des informations fiables. Explorez en toute sérénité.'
              : 'Travel with Useful Information. Explore with Confidence.'}
          </h3>
          <p className="text-xs sm:text-sm text-[#4E5B59] max-w-2xl mx-auto leading-relaxed">
            {language === 'ar'
              ? 'إذا كان لديك أي استفسار حول عادات المدينة، أفضل المسارات، أو تنظيم وقتك، لا تتردد في مراسلتنا وسنجيبك بكل سرور.'
              : language === 'fr'
              ? 'Une question sur votre séjour, les coutumes locales ou l’organisation de vos journées à Fès ? Contactez directement nos guides.'
              : 'If you have a question about your visit, places to see, local customs, or how to organize your time in Fez, feel free to contact us.'}
          </p>
          <div className="pt-2">
            <a
              href={`https://wa.me/${(siteSettings.whatsappNumber || '212719603009').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                language === 'ar'
                  ? 'السلام عليكم ورحمة الله، أنا بصدد التخطيط لزيارة فاس وأود الحصول على بعض النصائح والتوصيات.'
                  : language === 'fr'
                  ? 'Bonjour ! Je prépare mon séjour à Fès et j’aimerais recevoir quelques conseils de vos guides locaux.'
                  : 'Hello! I am planning a trip to Fez and would love some local advice.'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 py-3 px-8 bg-[#005F5A] hover:bg-[#004A46] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors"
            >
              <span>{UI_TEXT.common.whatsappChat[language]}</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
