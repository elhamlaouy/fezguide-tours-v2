import React, { useState } from 'react';
import { Language, SectionPillar } from '../types';
import { UI_TEXT } from '../data/translations';
import { useCms } from '../context/CmsContext';
import { SectionCard } from '../components/SectionCard';
import { UtensilsCrossed, Coffee, Heart, Check, Sparkles, Flame } from 'lucide-react';

interface FoodToursPageProps {
  language: Language;
  onExplore: (pillar: SectionPillar) => void;
  onBookTour: (tourTitle: string) => void;
}

export const FoodToursPage: React.FC<FoodToursPageProps> = ({
  language,
  onExplore,
  onBookTour,
}) => {
  const { tours } = useCms();
  const [activeFilter, setActiveFilter] = useState<'all' | string>('all');

  const headers = {
    title: {
      en: 'Taste Fez Through Local Eyes — Food & Tasting Walks',
      fr: 'Goûtez Fès à Travers des Yeux Locaux — Balades Gourmandes',
      es: 'Saborea Fez de la mano de sus vecinos — Paseos gastronómicos',
    },
    subtitle: {
      en: 'To understand Fez, you should not only walk through its streets. You should taste them. Discover the smells, flavours, bakeries, and street foods of the Old Medina.',
      fr: 'Pour comprendre Fès, il faut la goûter ! Découvrez les arômes, les saveurs, les fours communaux et la street food authentique de la médina.',
      es: 'Para comprender Fez, no basta con recorrer sus calles: también hay que saborearlas. Descubre los aromas, los sabores, las panaderías y la comida callejera de la medina antigua.',
    },
  };

  const foodPillars = tours.filter((t) => t.pageId === 'food-tours' && t.published !== false);

  const filteredPillars =
    activeFilter === 'all'
      ? foodPillars
      : foodPillars.filter((p) => p.id === activeFilter);

  const whatYouTaste = [
    {
      name: { en: 'Harcha & Baghrir', fr: 'Harcha & Baghrir', es: 'Harcha y baghrir' },
      desc: {
        en: 'Warm semolina pan-bread and honeycomb thousand-hole pancakes served with wild honey and farm butter.',
        fr: 'Galette de semoule tiède et crêpes mille trous alvéolées au miel et beurre fondu.',
        es: 'Pan de sémola caliente y tortitas de mil agujeros, servidos con miel silvestre y mantequilla de granja.',
      },
    },
    {
      name: { en: 'Piping-Hot Bissara', fr: 'Bissara Fumante', es: 'Bissara bien caliente' },
      desc: {
        en: 'Velvety dried fava bean soup served in clay bowls with cold-pressed olive oil, cumin, and crusty bread.',
        fr: 'Onctueuse soupe de fèves au cumin, généreux filet d’huile d’olive vierge et pain frais.',
        es: 'Crema de habas secas en cuencos de barro, con aceite de oliva prensado en frío, comino y pan crujiente.',
      },
    },
    {
      name: { en: 'Fresh Crispy Sfenj', fr: 'Sfenj Chaud et Croustillant', es: 'Sfenj recién hechos y crujientes' },
      desc: {
        en: 'Traditional Moroccan doughnuts fried in bubbling oil right before your eyes and eaten piping hot.',
        fr: 'Beignets marocains traditionnels dorés à la minute sous vos yeux.',
        es: 'Buñuelos tradicionales marroquíes, fritos delante de ti y servidos bien calientes.',
      },
    },
    {
      name: { en: 'Local Cheeses & Sweets', fr: 'Fromages Locaux & Douceurs', es: 'Quesos locales y dulces' },
      desc: {
        en: 'Sweet and salty fresh goat cheeses, spiced walnuts, fresh juices, and delicate Chebakia pastries.',
        fr: 'Fromages de chèvre frais, noix épicées, jus de saison et douceurs artisanales (Chebakia).',
        es: 'Quesos frescos de cabra dulces y salados, nueces especiadas, zumos recién hechos y delicadas chebakias.',
      },
    },
  ];

  return (
    <div className="space-y-16 pb-20">
      {/* Header Banner */}
      <section className="relative bg-[#1C2524] py-12 sm:py-20 overflow-hidden">
        <img
          src="/images/food-tasting-walk/wood-oven.webp"
          alt={language === 'es' ? "Un panadero trabajando ante un horno de leña" : "A baker working at a wood-fired oven"}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/30 backdrop-blur-md rounded-3xl p-8 sm:p-12 shadow-xl border border-white/40 text-center space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C84B31] bg-white/70 px-3.5 py-1 rounded-full border border-white/50 backdrop-blur-xs shadow-xs">
              <UtensilsCrossed className="w-4 h-4 text-[#005F5A]" />
              <span>{language === 'es' ? "Paseos gastronómicos por la medina · Cocina de Fez · Zocos y panaderías" : "Medina Food Tasting Walks \u00b7 Fassi Gastronomy \u00b7 Souks & Bakeries"}</span>
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
        {/* Intro Highlight Box from Google Doc */}
        <div className="bg-white rounded-3xl border border-[#E7E2DA] p-8 sm:p-10 shadow-xs space-y-6">
          <div className="max-w-3xl space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">
              {language === 'es' ? "No es una cena de restaurante: es una ruta por los callejones" : 'Not a Sit-Down Dinner — An Alley Safari'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C2524] tracking-tight">
              {language === 'es'
                ? "Disfrutad de la comida en su entorno: las calles y la gente de Fez"
                : 'Experience Food Where It Belongs: Among the Streets & People of Fez'}
            </h2>
            <p className="text-xs sm:text-sm text-[#4E5B59] leading-relaxed">
              {language === 'es'
                ? "No es una visita en la que simplemente os sentáis a disfrutar de una gran comida en un restaurante. En su lugar, recorremos la medina antigua y hacemos paradas para descubrir y probar diferentes platos, aperitivos, dulces y especialidades locales, mientras aprendemos cómo se relacionan con la vida en Fez."
                : 'This is not simply a tour where you sit down for one large restaurant meal. Instead, we walk through the Old Medina and stop along the way to discover and taste different foods, snacks, sweets, and local specialities while learning how they are connected to life in Fez.'}
            </p>
          </div>

          {/* Tastings Grid Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[#F2ECE4]">
            {whatYouTaste.map((item, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2DA] space-y-1.5">
                <span className="text-xs font-bold text-[#005F5A] block">
                  {item.name[language]}
                </span>
                <p className="text-xs text-[#52605E] leading-relaxed">
                  {item.desc[language]}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Segmented Filter */}
        <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-white rounded-xl border border-[#E7E2DA] max-w-2xl mx-auto shadow-xs">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#005F5A] text-white shadow-xs'
                : 'text-[#445250] hover:text-[#005F5A]'
            }`}
          >
            {language === 'es' ? 'Todas las experiencias gastronómicas' : `All Food Experiences (${foodPillars.length})`}
          </button>
          {foodPillars.map((p) => (
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

        {/* Real Food Gallery from Google Drive */}
        <div className="space-y-6 pt-4">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C84B31]">
              {language === 'es' ? "Galería de gastronomía auténtica" : 'Authentic Food Gallery'}
            </span>
            <h3 className="text-2xl font-bold text-[#005F5A]">
              {language === 'es' ? "Sabores auténticos de la vida culinaria de Fez" : 'Real Flavours of Fassi Culinary Life'}
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                src: '/images/food-tasting-walk/pastries-tea.webp',
                title: language === 'es' ? "Dulces y té de la ruta de degustación" : 'Pastries and tea from the tasting walk',
              },
              {
                src: '/images/food-culture-life/tea-tray.webp',
                title: language === 'es' ? "Té y hospitalidad" : 'Tea and hospitality',
              },
              {
                src: '/images/food-markets-souks/spice-tins.webp',
                title: language === 'es' ? "Especias del mercado" : 'Market spices',
              },
              {
                src: '/images/food-traditional-fassi/pastilla.webp',
                title: language === 'es' ? "Pastela en la mesa" : 'Pastilla at the table',
              },
            ].map((img, idx) => (
              <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-[#E7E2DA] shadow-xs group bg-[#1C2524]">
                <img
                  src={img.src}
                  alt={img.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-2.5 left-3 right-3 text-white text-[11px] font-bold">
                  {img.title}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA Box */}
        <div className="bg-[#FAF8F5] rounded-3xl border border-[#E7E2DA] p-8 sm:p-12 text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">
            {language === 'es'
              ? "Venid con hambre y llevaos el sabor de Fez"
              : language === 'fr'
              ? 'Venez le ventre vide — repartez conquis par les saveurs de Fès'
              : 'Come Hungry — Leave with a Taste of Fez'}
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-[#005F5A]">
            {language === 'es'
              ? "Reservad vuestra ruta gastronómica privada por la medina"
              : language === 'fr'
              ? 'Réservez votre visite culinaire privée dans la médina'
              : 'Book Your Private Medina Food Tasting Walk'}
          </h3>
          <p className="text-xs sm:text-sm text-[#4E5B59] max-w-2xl mx-auto leading-relaxed">
            {language === 'es'
              ? "Una ruta gastronómica privada para vosotros y vuestro grupo. Las degustaciones dependen de lo que preparen las tiendas locales ese día."
              : language === 'fr'
              ? 'Une balade privée pour vous et votre groupe. Les dégustations suivent ce que les boutiques préparent ce jour-là.'
              : 'This is a private food walk for you and your group. The tastings follow what local shops are preparing that day.'}
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                const product = foodPillars.find((pillar) => pillar.id === 'our-food-tours');
                if (product) onExplore(product);
              }}
              className="py-3 px-8 bg-[#005F5A] hover:bg-[#004A46] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {language === 'es'
                ? "Reservad vuestra ruta privada de degustación"
                : language === 'fr'
                ? 'Réserver la visite culinaire'
                : 'Book Your Private Food Tasting Walk'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
