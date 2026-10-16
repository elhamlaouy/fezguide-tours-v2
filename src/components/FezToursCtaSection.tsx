import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Language } from '../types';

interface FezToursCtaSectionProps {
  language: Language;
  onExploreTours: () => void;
}

const copy = {
  en: {
    intro: 'Discover the Medina with someone who knows its streets, stories, traditions and hidden places. Walk beyond the famous landmarks, meet local people, taste traditional food and experience the everyday life of Fez.',
    lead: 'Explore our Fez tours and discover the city through local eyes.',
    cta: 'Explore Our Fez Tours',
    imageAlt: 'Local guide with visitors at a historic Fez monument',
  },
  fr: {
    intro: 'Découvrez la Médina avec quelqu’un qui connaît ses rues, ses histoires, ses traditions et ses lieux cachés. Allez au-delà des monuments célèbres, rencontrez les habitants, goûtez la cuisine traditionnelle et découvrez la vie quotidienne de Fès.',
    lead: 'Découvrez nos visites de Fès et la ville à travers les yeux des habitants.',
    cta: 'Découvrir nos visites de Fès',
    imageAlt: 'Guide local avec des visiteurs devant un monument historique de Fès',
  },
  es: {
    intro: 'Descubre la medina con alguien que conoce sus calles, sus historias, sus tradiciones y sus rincones escondidos. Ve más allá de los monumentos famosos, conoce a los vecinos, prueba la cocina tradicional y vive el día a día de Fez.',
    lead: 'Descubre nuestras visitas de Fez y conoce la ciudad de la mano de quienes viven aquí.',
    cta: 'Descubre nuestras visitas de Fez',
    imageAlt: 'Guía local con visitantes ante un monumento histórico de Fez',
  },
};

export const FezToursCtaSection: React.FC<FezToursCtaSectionProps> = ({ language, onExploreTours }) => {
  const text = copy[language];

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 overflow-hidden rounded-3xl bg-[#005F5A] text-white shadow-xl">
      <img
        src="/images/fez-medina/medina-14.jpg"
        alt={text.imageAlt}
        className="w-full h-full min-h-72 sm:min-h-96 lg:min-h-[28rem] object-cover"
        loading="lazy"
        decoding="async"
      />
      <div className="p-7 sm:p-10 lg:p-12 flex flex-col justify-center gap-5">
        <p className="text-base sm:text-lg leading-relaxed text-[#E6F4F2]">{text.intro}</p>
        <p className="text-xl sm:text-2xl font-extrabold leading-snug">{text.lead}</p>
        <button
          onClick={onExploreTours}
          className="w-full sm:w-fit inline-flex items-center justify-center gap-2 rounded-xl bg-[#C84B31] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#B33D25] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.98] transition-colors cursor-pointer"
        >
          {text.cta}
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
};
