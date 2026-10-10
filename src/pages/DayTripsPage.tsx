import React, { useState } from 'react';
import { Language, SectionPillar } from '../types';
import { UI_TEXT } from '../data/translations';
import { useCms } from '../context/CmsContext';
import { SectionCard } from '../components/SectionCard';
import { MapPin, Car, ShieldCheck, Clock, Users, Sparkles, Navigation } from 'lucide-react';

interface DayTripsPageProps {
  language: Language;
  onExplore: (pillar: SectionPillar) => void;
  onBookTour: (tourTitle: string) => void;
}

export const DayTripsPage: React.FC<DayTripsPageProps> = ({
  language,
  onExplore,
  onBookTour,
}) => {
  const { tours } = useCms();
  const [activeFilter, setActiveFilter] = useState<'all' | string>('all');

  const headers = {
    title: {
      en: 'Private Day Trips & Excursions Beyond Fez',
      fr: 'Excursions Privées d’une Journée au Départ de Fès',
      ar: 'رحلات يومية واستكشافية خاصة انطلاقاً من فاس',
    },
    subtitle: {
      en: 'Discover Chefchaouen, Meknes with Volubilis and Moulay Idriss, and the mountains beyond Fez.',
      fr: 'Découvrez Chefchaouen, Meknès avec Volubilis et Moulay Idriss, et les montagnes au-delà de Fès.',
      ar: 'اكتشفوا شفشاون، ومكناس مع وليلي ومولاي إدريس، والجبال خارج فاس.',
    },
  };

  const dayTripPillars = tours.filter((t) => t.pageId === 'day-trips' && t.published !== false);

  const filteredPillars =
    activeFilter === 'all'
      ? dayTripPillars
      : dayTripPillars.filter((p) => p.id === activeFilter);

  return (
    <div className="space-y-16 pb-20">
      {/* Header Banner */}
      <section className="relative bg-[#1C2524] py-12 sm:py-20 overflow-hidden">
        <img
          src="/images/daytrip-chefchaouen/blue-alley.webp"
          alt="Chefchaouen Blue City"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/30 backdrop-blur-md rounded-3xl p-8 sm:p-12 shadow-xl border border-white/40 text-center space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C84B31] bg-white/70 px-3.5 py-1 rounded-full border border-white/50 backdrop-blur-xs shadow-xs">
              <MapPin className="w-4 h-4 text-[#005F5A]" />
              <span>Chefchaouen · Volubilis & Meknes · Middle Atlas & Ifrane</span>
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
        {/* Core Promises Bar from Drive Text */}
        <div className="bg-white rounded-3xl border border-[#E7E2DA] p-6 sm:p-8 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[#005F5A]/10 text-[#005F5A] shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C2524]">
                  {language === 'ar' ? 'رحلات خاصة بالكامل' : '100% Private Excursions'}
                </h4>
                <p className="text-xs text-[#52605E] mt-0.5">
                  {language === 'ar' ? 'لك ولمجموعتك فقط بدون غرباء' : 'Only for you and your travelling companions'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[#005F5A]/10 text-[#005F5A] shrink-0">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C2524]">
                  {language === 'ar' ? 'سيارات سياحية مكيفة' : 'Comfortable Vehicles'}
                </h4>
                <p className="text-xs text-[#52605E] mt-0.5">
                  {language === 'ar' ? 'سيارات حديثة ومريحة مع سائق محترف' : 'Modern, air-conditioned fleet with trusted drivers'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[#005F5A]/10 text-[#005F5A] shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C2524]">
                  {language === 'ar' ? 'مرونة تامة في التوقيت' : 'Flexible Timing'}
                </h4>
                <p className="text-xs text-[#52605E] mt-0.5">
                  {language === 'ar' ? 'توقف لالتقاط الصور والغداء دون استعجال' : 'Stop for tea, photos, or lunch at your own pace'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[#005F5A]/10 text-[#005F5A] shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C2524]">
                  {language === 'ar' ? 'سائق أو سائق + مرشد' : 'Driver or Driver + Guide'}
                </h4>
                <p className="text-xs text-[#52605E] mt-0.5">
                  {language === 'ar' ? 'اختر مستوى الاستكشاف الذي تفضله' : 'Travel independently or add a local licensed guide'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Filter */}
        <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-white rounded-xl border border-[#E7E2DA] max-w-2xl mx-auto shadow-xs">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#005F5A] text-white shadow-xs'
                : 'text-[#445250] hover:text-[#005F5A]'
            }`}
          >
            {language === 'ar' ? 'جميع الرحلات اليومية' : `All Day Trips (${dayTripPillars.length})`}
          </button>
          {dayTripPillars.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveFilter(p.id)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeFilter === p.id
                  ? 'bg-[#005F5A] text-white shadow-xs'
                  : 'text-[#445250] hover:text-[#005F5A]'
              }`}
            >
              {p.title[language]}
            </button>
          ))}
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredPillars.map((pillar) => (
            <SectionCard
              key={pillar.id}
              pillar={pillar}
              language={language}
              onExplore={() => onExplore(pillar)}
              onBookTour={() => onBookTour(pillar.title[language])}
            />
          ))}
        </div>

        {/* Scenic Gallery from Google Drive */}
        <div className="space-y-6 pt-4">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C84B31]">
              {language === 'ar' ? 'روائع الطبيعة والتاريخ' : 'Scenic Landscapes & Heritage'}
            </span>
            <h3 className="text-2xl font-bold text-[#005F5A]">
              {language === 'ar' ? 'ما ستراه خلال رحلاتك خارج فاس' : 'What You Discover Beyond the City'}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-[#E7E2DA] overflow-hidden shadow-xs">
              <div className="aspect-4/3 relative bg-[#1C2524]">
                <img
                  src="/images/daytrip-chefchaouen/blue-alley.webp"
                  alt="Chefchaouen alleys"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 space-y-1">
                <h4 className="font-bold text-sm text-[#1C2524]">
                  {language === 'ar' ? 'شفشاون وجبال الريف' : 'Chefchaouen & Rif Mountains'}
                </h4>
                <p className="text-xs text-[#52605E]">
                  {language === 'ar' ? 'ساحة وطاء الحمام، القصبة، ومنبع رأس الماء' : 'Plaza Uta el-Hammam, the historic Kasbah, and Ras El Maa.'}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E7E2DA] overflow-hidden shadow-xs">
              <div className="aspect-4/3 relative bg-[#1C2524]">
                <img
                  src="/images/daytrip-meknes/bab-mansour.webp"
                  alt="Bab Mansour in Meknes"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 space-y-1">
                <h4 className="font-bold text-sm text-[#1C2524]">
                  {language === 'ar' ? 'آثار وليلي ومكناس الإسماعيلية' : 'Roman Volubilis & Meknes'}
                </h4>
                <p className="text-xs text-[#52605E]">
                  {language === 'ar' ? 'فسيفساء رومانية أثرية، بلدة زرهون، وباب المنصور الضخم' : 'Ancient Roman mosaics, Moulay Idriss pilgrimage town, and Bab Mansour.'}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E7E2DA] overflow-hidden shadow-xs">
              <div className="aspect-4/3 relative bg-[#1C2524]">
                <img
                  src="/images/daytrip-ifrane/mountain-countryside.webp"
                  alt="Middle Atlas mountains beyond Fez"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 space-y-1">
                <h4 className="font-bold text-sm text-[#1C2524]">
                  {language === 'ar' ? 'إفران والأطلس المتوسط' : 'Ifrane & Middle Atlas'}
                </h4>
                <p className="text-xs text-[#52605E]">
                  {language === 'ar' ? 'حدائق خضراء، تمثال الأسد الحجري، ومناظر جبلية خارج فاس' : 'Green spaces, the stone lion, and mountain landscapes beyond Fez.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Itinerary Callout */}
        <div className="bg-[#FAF8F5] rounded-3xl border border-[#E7E2DA] p-8 sm:p-12 text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">
            {language === 'ar'
              ? 'رحلات مخصصة بالكامل'
              : language === 'fr'
              ? 'Itinéraires Sur Mesure'
              : 'Custom Itineraries'}
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-[#1C2524]">
            {language === 'ar'
              ? 'هل لديك وجهة محددة ترغب في زيارتها؟'
              : language === 'fr'
              ? 'Une envie particulière ? Créez votre excursion sur mesure'
              : 'Have Somewhere Specific in Mind? Design Your Own Day'}
          </h3>
          <p className="text-xs sm:text-sm text-[#4E5B59] max-w-2xl mx-auto leading-relaxed">
            {language === 'ar'
              ? 'أخبرنا بما تود استكشافه وسنساعدك في تخطيط مسار مريح انطلاقاً من فاس. سيارة مريحة، مواعيد مرنة، وسائق محترف أو سائق مع مرشد محلي.'
              : language === 'fr'
              ? 'Indiquez-nous vos envies et nous concevrons un itinéraire confortable au départ de Fès. Véhicule climatisé, horaires flexibles et guide privé.'
              : 'Tell us what you would like to see and we can help you create a comfortable itinerary from Fez. Private vehicle, flexible schedule, and travel with driver only or driver + guide.'}
          </p>
          <div className="pt-2">
            <button
              onClick={() => onBookTour('Custom Private Day Trip')}
              className="py-3 px-8 bg-[#005F5A] hover:bg-[#004A46] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {language === 'ar'
                ? 'صمم رحلتك الخاصة الآن'
                : language === 'fr'
                ? 'Personnaliser mon excursion'
                : 'Tell Us What You Would Like to Discover'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
