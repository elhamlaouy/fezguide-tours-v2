import React from 'react';
import { ArrowLeft, Calendar, MessageCircle } from 'lucide-react';
import { Language } from '../types';
import { useCms } from '../context/CmsContext';

interface OurFezToursPageProps {
  language: Language;
  onBack: () => void;
  onBookTour: (tourTitle: string) => void;
}

const copy = {
  en: {
    title: 'Our Fez Tours',
    eyebrow: 'Discover Fez Through Local Eyes',
    intro: 'Discover the Medina with someone who knows its streets, stories, traditions and hidden places. Walk beyond the famous landmarks, meet local people, taste traditional food and experience the everyday life of Fez.',
    body: 'Explore our Fez tours and discover the city through local eyes.',
    priceLabel: 'Tour price',
    perPerson: 'per person',
    estimate: 'Estimated equivalents. Exchange rates vary.',
    book: 'Book Our Fez Tour',
    whatsapp: 'Ask on WhatsApp',
    back: 'Back to Fez',
  },
  fr: {
    title: 'Nos Visites de Fès',
    eyebrow: 'Découvrez Fès à Travers des Yeux Locaux',
    intro: 'Découvrez la Médina avec quelqu’un qui connaît ses rues, ses histoires, ses traditions et ses lieux cachés. Allez au-delà des monuments célèbres, rencontrez les habitants, goûtez la cuisine traditionnelle et vivez le quotidien de Fès.',
    body: 'Explorez nos visites de Fès et découvrez la ville à travers des yeux locaux.',
    priceLabel: 'Prix de la visite',
    perPerson: 'par personne',
    estimate: 'Équivalents estimatifs. Les taux de change varient.',
    book: 'Réserver Notre Visite de Fès',
    whatsapp: 'Demander sur WhatsApp',
    back: 'Retour à Fès',
  },
};

export const OurFezToursPage: React.FC<OurFezToursPageProps> = ({ language, onBack, onBookTour }) => {
  const { siteSettings } = useCms();
  const text = language === 'fr' ? copy.fr : copy.en;
  const fallbackEnglish = language === 'ar';
  const whatsappNumber = (siteSettings.whatsappNumber || '212719603009').replace(/[^0-9]/g, '');
  const whatsappText = language === 'fr'
    ? 'Bonjour Fez Guide Tours ! Je souhaite réserver votre visite de Fès à 170 € par personne. Pouvez-vous me communiquer les disponibilités ?'
    : 'Hello Fez Guide Tours! I would like to book your Fez tour at €170 per person. Could you share availability?';

  return (
    <div className="bg-[#FAF8F5] pb-24" dir={fallbackEnglish ? 'ltr' : undefined}>
      <div className="border-b border-[#E7E2DA] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button onClick={onBack} className="inline-flex items-center gap-2 text-xs font-bold text-[#005F5A] hover:text-[#C84B31] cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> {text.back}
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-7 space-y-5">
            <div className="overflow-hidden rounded-3xl border border-[#E7E2DA] bg-[#1C2524] shadow-lg">
              <img src="/images/fez-medina/medina-14.jpg" alt="Guide with visitors at a historic Fez monument" className="w-full aspect-16/10 object-cover" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <img src="/images/fez-medina/medina-01.jpg" alt="Traditional Fez Medina market lane" className="w-full aspect-4/3 rounded-2xl border border-[#E7E2DA] object-cover" />
              <img src="/images/fez-medina/medina-12.jpg" alt="Panoramic view over Fez" className="w-full aspect-4/3 rounded-2xl border border-[#E7E2DA] object-cover" />
            </div>
          </div>

          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-7 rounded-3xl border border-[#E7E2DA] bg-white p-7 sm:p-9 shadow-lg">
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#C84B31]">{text.eyebrow}</span>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#005F5A]">{text.title}</h1>
              <p className="text-sm sm:text-base leading-relaxed text-[#445250]">{text.intro}</p>
              <p className="text-sm font-bold text-[#1C2524]">{text.body}</p>
            </div>

            <div className="rounded-2xl border border-[#D0EBE5] bg-[#F0F8F6] p-5 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#52605E]">{text.priceLabel}</span>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <strong className="text-4xl font-extrabold text-[#005F5A]">€170</strong>
                <span className="text-sm font-bold text-[#445250]">{text.perPerson}</span>
              </div>
              <p className="text-sm font-semibold text-[#52605E]">≈ 1,900 MAD · ≈ $191</p>
              <p className="text-[11px] text-[#718280]">{text.estimate}</p>
            </div>

            <div className="space-y-3">
              <button onClick={() => onBookTour(text.title)} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#C84B31] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#B33D25] transition-colors cursor-pointer">
                <Calendar className="w-4 h-4" /> {text.book}
              </button>
              <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noopener noreferrer" className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#20BD5A] transition-colors">
                <MessageCircle className="w-4 h-4" /> {text.whatsapp}
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
