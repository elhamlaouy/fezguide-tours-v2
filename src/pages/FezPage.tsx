import React, { useState } from 'react';
import { Language, SectionPillar } from '../types';
import { UI_TEXT } from '../data/translations';
import { useCms } from '../context/CmsContext';
import { SectionCard } from '../components/SectionCard';
import { FezToursCtaSection } from '../components/FezToursCtaSection';
import { Compass } from 'lucide-react';

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
      es: "Explorad la medina de Fez a través de los ojos de sus habitantes",
    },
    subtitle: {
      en: 'The Medina of Fez is not a museum. People still live and work here every day. Discover historic gates, hidden workshops, living traditions, and panoramic viewpoints.',
      fr: 'La Médina de Fès n’est pas un musée : les habitants y vivent et travaillent chaque jour. Découvrez ses portes historiques, ses ateliers vivants et ses panoramas.',
      es: "La medina de Fez no es un museo. La gente sigue viviendo y trabajando aquí cada día. Descubrid puertas históricas, talleres escondidos, tradiciones vivas y miradores panorámicos.",
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
          alt={language === 'es' ? "Puertas y tejados de la medina de Fez" : "Medina of Fez gates and rooftops"}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/30 backdrop-blur-md rounded-3xl p-8 sm:p-12 shadow-xl border border-white/40 text-center space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C84B31] bg-white/70 px-3.5 py-1 rounded-full border border-white/50 backdrop-blur-xs shadow-xs">
              <Compass className="w-4 h-4 text-[#005F5A]" />
              <span>{language === 'es' ? "Fes el-Bali · Fes Jdid y Mellah · Patrimonio vivo" : "Fes el-Bali \u00b7 Fes Jdid & Mellah \u00b7 Living Heritage"}</span>
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
                {language === 'es' ? "Fes el-Bali (medina antigua)" : 'Fes el-Bali (Old Medina)'}
              </span>
              <p>
                {language === 'es'
                  ? "El corazón histórico de Fez, conocido por sus estrechas calles peatonales, sus zocos tradicionales, sus edificios históricos y sus auténticos talleres artesanales."
                  : 'The historic heart of Fez, known for its narrow pedestrian streets, traditional souks, historic buildings, and authentic craftsman workshops.'}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2DA] space-y-2">
              <span className="font-bold text-[#005F5A] block uppercase text-xs tracking-wider">
                {language === 'es' ? "Fes Jdid y el Mellah" : 'Fes Jdid & Mellah'}
              </span>
              <p>
                {language === 'es'
                  ? "Una importante zona histórica vinculada al Palacio Real y al patrimonio judío centenario de Fez, con sus característicos balcones de madera."
                  : 'An important historic area connected to the Royal Palace and the centuries-old Jewish heritage of Fez with distinctive wooden balconies.'}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2DA] space-y-2">
              <span className="font-bold text-[#005F5A] block uppercase text-xs tracking-wider">
                {language === 'es' ? "Ciudad Nueva y miradores" : 'New City & Viewpoints'}
              </span>
              <p>
                {language === 'es'
                  ? "Miradores en las colinas con vistas a los tejados y minaretes de la medina, y animadas cafeterías de la Ciudad Nueva para disfrutar de Fez por la noche."
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
            {language === 'es' ? 'Todas las experiencias' : `All Experiences (${fezPillars.length})`}
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
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

        <FezToursCtaSection
          language={language}
          onExploreTours={() => {
            const fezTours = fezPillars.find((pillar) => pillar.id === 'our-fez-tours');
            if (fezTours) onExplore(fezTours);
          }}
        />

        {/* Authentic Medina Photo Gallery */}
        <div className="space-y-6 pt-6">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C84B31]">
              {language === 'es' ? "Galería del patrimonio vivo" : 'Living Heritage Gallery'}
            </span>
            <h3 className="text-2xl font-bold text-[#005F5A]">
              {language === 'es' ? "Escenas reales de las calles de Fez" : 'Real Scenes From the Streets of Fez'}
            </h3>
            <p className="text-xs text-[#52605E]">
              {language === 'es'
                ? "Fotografías auténticas de talleres artesanales, puertas y rincones tranquilos."
                : 'Authentic photos of craftsman workshops, gates, and quiet corners.'}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                src: '/images/real/fez_explore_medina_image2.jpg',
                alt: language === 'es' ? 'Pasadizo estrecho de la medina' : 'Narrow Medina passage',
                caption: language === 'es' ? "Calles tranquilas de la medina" : 'Quiet Medina lanes',
              },
              {
                src: '/images/real/fez_history_culture_image2.jpg',
                alt: language === 'es' ? 'Madera y yeso tallados en una madraza' : 'Madrasa woodwork and plaster carving',
                caption: language === 'es' ? "Cedro y yeso tallados" : 'Carved cedar & plaster',
              },
              {
                src: '/images/real/fez_things_to_do_image2.jpg',
                alt: language === 'es' ? 'Taller de maestros artesanos' : 'Master craftsmen workshop',
                caption: language === 'es' ? "Artesanos trabajando" : 'Artisans at work',
              },
              {
                src: '/images/real/fez_explore_medina_image4.jpg',
                alt: language === 'es' ? 'Vista panorámica de los tejados' : 'Panoramic rooftop view',
                caption: language === 'es' ? "Panorámica de los tejados" : 'Panoramic rooftops',
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


      </div>
    </div>
  );
};
