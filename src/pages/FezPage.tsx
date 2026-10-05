import React, { useState } from 'react';
import { Language, SectionPillar } from '../types';
import { UI_TEXT } from '../data/translations';
import { useCms } from '../context/CmsContext';
import { SectionCard } from '../components/SectionCard';
import { Compass, MapPin, Eye, ShieldCheck, Camera, Sparkles } from 'lucide-react';

interface FezPageProps {
  language: Language;
  onExplore: (pillar: SectionPillar) => void;
  onBookTour: (tourTitle: string) => void;
}

export const FezPage: React.FC<FezPageProps> = ({
  language,
  onExplore,
  onBookTour,
}) => {
  const { tours } = useCms();
  const [activeFilter, setActiveFilter] = useState<'all' | string>('all');

  const pageHeaders = {
    title: {
      en: 'Explore the Medina of Fez — Through Local Eyes',
      fr: 'Explorer la Médina de Fès — À Travers des Yeux Locaux',
      ar: 'استكشف فاس العتيقة — بعيون أبنائها المحليين',
    },
    subtitle: {
      en: 'The Medina of Fez is not a museum. People still live and work here every day. Discover historic gates, hidden workshops, living traditions, and panoramic viewpoints.',
      fr: 'La Médina de Fès n’est pas un musée : les habitants y vivent et travaillent chaque jour. Découvrez ses portes historiques, ses ateliers vivants et ses panoramas.',
      ar: 'فاس البالي ليست مجرد متحف، بل مدينة تنبض بالروح والحياة اليومية. اكتشف أبوابها التاريخية، ورشات الحرفيين، الأسواق العتيقة، والمطلات البانورامية.',
    },
  };

  const fezPillars = tours.filter((t) => t.pageId === 'fez' && t.published !== false);

  const filteredPillars =
    activeFilter === 'all'
      ? fezPillars
      : fezPillars.filter((p) => p.id === activeFilter);

  return (
    <div className="space-y-16 pb-20">
      {/* Header Banner */}
      <section className="relative bg-[#1C2524] py-12 sm:py-20 overflow-hidden">
        <img
          src="/images/real/fez_explore_medina_image1.jpg"
          alt="Medina of Fez gates and rooftops"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/30 backdrop-blur-md rounded-3xl p-8 sm:p-12 shadow-xl border border-white/40 text-center space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C84B31] bg-white/70 px-3.5 py-1 rounded-full border border-white/50 backdrop-blur-xs shadow-xs">
              <Compass className="w-4 h-4 text-[#005F5A]" />
              <span>Fes el-Bali · Fes Jdid & Mellah · Living Heritage</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#005F5A] text-balance drop-shadow-xs">
              {pageHeaders.title[language]}
            </h1>

            <p className="text-sm sm:text-base text-[#15201F] font-semibold max-w-2xl mx-auto leading-relaxed drop-shadow-xs">
              {pageHeaders.subtitle[language]}
            </p>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Narrative Introduction from Google Drive */}
        <div className="bg-white rounded-3xl border border-[#E7E2DA] p-6 sm:p-10 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm text-[#4E5B59] leading-relaxed">
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2DA] space-y-2">
              <span className="font-bold text-[#005F5A] block uppercase text-xs tracking-wider">
                {language === 'ar' ? 'فاس البالي' : 'Fes el-Bali (Old Medina)'}
              </span>
              <p>
                {language === 'ar'
                  ? 'القلب التاريخي للمدينة بدروبه الضيقة الخالية من السيارات، وأسواره العتيقة وورشات الصناع التقليديين المستمرة منذ قرون.'
                  : 'The historic heart of Fez, known for its narrow pedestrian streets, traditional souks, historic buildings, and authentic craftsman workshops.'}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2DA] space-y-2">
              <span className="font-bold text-[#005F5A] block uppercase text-xs tracking-wider">
                {language === 'ar' ? 'فاس الجديد والملاح' : 'Fes Jdid & Mellah'}
              </span>
              <p>
                {language === 'ar'
                  ? 'الحي التاريخي المرتبط بالقصر الملكي العريق والتراث اليهودي المغربي بعمارته الخشبية المميزة.'
                  : 'An important historic area connected to the Royal Palace and the centuries-old Jewish heritage of Fez with distinctive wooden balconies.'}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2DA] space-y-2">
              <span className="font-bold text-[#005F5A] block uppercase text-xs tracking-wider">
                {language === 'ar' ? 'المدينة الجديدة والإطلالات' : 'New City & Viewpoints'}
              </span>
              <p>
                {language === 'ar'
                  ? 'مطلات بانورامية تكشف روعة مآذن المدينة من الأعلى، ومقاهي المدينة الجديدة التي تمنح تجربة متكاملة ليلاً.'
                  : 'Panoramic hillside viewpoints over the rooftops and minarets of the Medina, and lively New City cafés to experience Fez at night.'}
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Segmented Filter Control */}
        <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-white rounded-xl border border-[#E7E2DA] max-w-2xl mx-auto shadow-xs">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#005F5A] text-white shadow-xs'
                : 'text-[#445250] hover:text-[#005F5A]'
            }`}
          >
            {language === 'ar' ? 'جميع التجارب' : `All Experiences (${fezPillars.length})`}
          </button>
          {fezPillars.map((p) => (
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

        {/* Experiences Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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

        {/* Authentic Medina Photo Gallery */}
        <div className="space-y-6 pt-6">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C84B31]">
              {language === 'ar' ? 'من قلب الحدث' : 'Living Heritage Gallery'}
            </span>
            <h3 className="text-2xl font-bold text-[#005F5A]">
              {language === 'ar' ? 'مشاهد ولقطات حقيقية من فاس' : 'Real Scenes From the Streets of Fez'}
            </h3>
            <p className="text-xs text-[#52605E]">
              {language === 'ar'
                ? 'صور أصيلة لورشات الحرفيين، وأبواب فاس، والتفاصيل المعمارية التي لا تراها في الكتيبات السياحية'
                : 'Authentic photos of craftsman workshops, gates, and quiet corners.'}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                src: '/images/real/fez_explore_medina_image2.jpg',
                alt: 'Narrow Medina passage',
                caption: language === 'ar' ? 'دروب فاس الهادئة' : 'Quiet Medina lanes',
              },
              {
                src: '/images/real/fez_history_culture_image2.jpg',
                alt: 'Madrasa woodwork and plaster carving',
                caption: language === 'ar' ? 'نقوش خشب الأرز والجبس' : 'Carved cedar & plaster',
              },
              {
                src: '/images/real/fez_things_to_do_image2.jpg',
                alt: 'Master craftsmen workshop',
                caption: language === 'ar' ? 'حرفيون في ورشاتهم' : 'Artisans at work',
              },
              {
                src: '/images/real/fez_explore_medina_image4.jpg',
                alt: 'Panoramic rooftop view',
                caption: language === 'ar' ? 'إطلالة من الأعلى' : 'Panoramic rooftops',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="group relative aspect-4/3 rounded-2xl overflow-hidden border border-[#E7E2DA] shadow-xs bg-[#1C2524]"
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-2.5 left-3 right-3 text-white text-[11px] font-semibold">
                  {item.caption}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Local Guiding Bottom Banner */}
        <div className="bg-[#FAF8F5] rounded-3xl border border-[#E7E2DA] p-8 sm:p-12 text-center space-y-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-[#005F5A]/10 text-[#005F5A] mx-auto">
            <Eye className="w-8 h-8 text-[#005F5A]" />
          </div>
          <div className="max-w-2xl mx-auto space-y-3">
            <h3 className="text-xl sm:text-2xl font-bold text-[#1C2524]">
              {language === 'ar'
                ? 'استكشف فاس برفقة من يعرف أزقتها، قصصها وخفاياها'
                : language === 'fr'
                ? 'Découvrez la médina avec un guide qui en connaît chaque ruelle et secret'
                : 'Discover the Medina with Someone Who Knows Its Streets and Stories'}
            </h3>
            <p className="text-xs sm:text-sm text-[#4E5B59] leading-relaxed">
              {language === 'ar'
                ? 'تجاوز المعالم المزدحمة المعتادة، التقي بأهل المدينة وتذوق مأكولاتها الشعبية واستمتع بنبض الحياة اليومية. مرحباً بكم في فاس.'
                : language === 'fr'
                ? 'Allez au-delà des sentiers battus, rencontrez les artisans locaux, dégustez les spécialités de Fès et vivez une immersion authentique.'
                : 'Walk beyond the famous landmarks, meet local people, taste traditional food and experience everyday life. Our local guides ensure an effortless, memorable journey.'}
            </p>
          </div>
          <div>
            <button
              onClick={() => onBookTour('Custom Medina Exploration')}
              className="py-3 px-8 bg-[#005F5A] hover:bg-[#004A46] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {language === 'ar'
                ? 'احجز جولتك في فاس العتيقة'
                : language === 'fr'
                ? 'Découvrir nos visites de Fès'
                : 'Explore Our Fez Medina Tours'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
