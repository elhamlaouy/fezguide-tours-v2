import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Compass,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
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
    overviewLabel: 'Experience Overview',
    overviewTitle: 'The Living Story Behind the Experience',
    priceLabel: 'Tour price',
    perPerson: 'per person',
    estimate: 'Estimated equivalents. Exchange rates vary.',
    book: 'Book Our Fez Tour',
    whatsapp: 'Ask on WhatsApp',
    back: 'Back to Fez',
    privateTour: '100% Private Tour',
    rating: '5.0 (82 reviews)',
    durationLabel: 'Duration',
    duration: '4–5 Hours',
    formatLabel: 'Format',
    format: 'Private Walking Tour',
    pickupLabel: 'Meeting / Pickup',
    pickup: '7:00 AM from Fez (Hotel / Riad)',
    languagesLabel: 'Languages',
    languages: 'English, Français, العربية',
    galleryLabel: 'Our Fez tour photos',
    viewPhoto: 'View photo',
    detailsLabel: 'Tour details',
  },
  fr: {
    title: 'Nos Visites de Fès',
    eyebrow: 'Découvrez Fès à Travers des Yeux Locaux',
    intro: 'Découvrez la Médina avec quelqu’un qui connaît ses rues, ses histoires, ses traditions et ses lieux cachés. Allez au-delà des monuments célèbres, rencontrez les habitants, goûtez la cuisine traditionnelle et vivez le quotidien de Fès.',
    body: 'Explorez nos visites de Fès et découvrez la ville à travers des yeux locaux.',
    overviewLabel: 'Présentation',
    overviewTitle: 'L’histoire vivante de cette expérience',
    priceLabel: 'Prix de la visite',
    perPerson: 'par personne',
    estimate: 'Équivalents estimatifs. Les taux de change varient.',
    book: 'Réserver Notre Visite de Fès',
    whatsapp: 'Demander sur WhatsApp',
    back: 'Retour à Fès',
    privateTour: 'Visite 100% privée',
    rating: '5,0 (82 avis)',
    durationLabel: 'Durée',
    duration: '4 à 5 heures',
    formatLabel: 'Format',
    format: 'Visite privée à pied',
    pickupLabel: 'Départ / Prise en charge',
    pickup: '7h00 à Fès (Hôtel / Riad)',
    languagesLabel: 'Langues',
    languages: 'English, Français, العربية',
    galleryLabel: 'Photos de nos visites de Fès',
    viewPhoto: 'Voir la photo',
    detailsLabel: 'Informations sur la visite',
  },
};

const galleryImages = [
  {
    src: '/images/fez-medina/medina-14.jpg',
    alt: {
      en: 'Guide with visitors at a historic Fez monument',
      fr: 'Guide et visiteurs devant un monument historique de Fès',
    },
  },
  {
    src: '/images/fez-medina/medina-01.jpg',
    alt: {
      en: 'Traditional Fez Medina market lane',
      fr: 'Allée de marché traditionnelle dans la médina de Fès',
    },
  },
  {
    src: '/images/fez-medina/medina-12.jpg',
    alt: {
      en: 'Panoramic view over Fez',
      fr: 'Vue panoramique sur Fès',
    },
  },
];

export const OurFezToursPage: React.FC<OurFezToursPageProps> = ({ language, onBack, onBookTour }) => {
  const { siteSettings } = useCms();
  const text = language === 'fr' ? copy.fr : copy.en;
  const contentLanguage = language === 'fr' ? 'fr' : 'en';
  const fallbackEnglish = language === 'ar';
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const whatsappNumber = (siteSettings.whatsappNumber || '212719603009').replace(/[^0-9]/g, '');
  const whatsappText = language === 'fr'
    ? 'Bonjour Fez Guide Tours ! Je souhaite réserver votre visite de Fès à 170 € par personne. Pouvez-vous me communiquer les disponibilités ?'
    : 'Hello Fez Guide Tours! I would like to book your Fez tour at €170 per person. Could you share availability?';
  const activeImage = galleryImages[activeImageIndex];

  return (
    <div className="bg-[#FAF8F5] min-h-screen pb-24" dir={fallbackEnglish ? 'ltr' : undefined}>
      <div className="border-b border-[#E7E2DA] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#005F5A] hover:text-[#C84B31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005F5A] focus-visible:ring-offset-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> {text.back}
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 space-y-8 sm:space-y-10">
        <header className="space-y-3">
          <div id="our-fez-tour-tags" className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#C84B31] bg-[#FDF1EE] px-3 py-1 rounded-md border border-[#F6D5CD]">
              <Compass className="w-3.5 h-3.5 text-[#C84B31]" /> {text.eyebrow}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#005F5A] bg-[#E6F4F2] px-3 py-1 rounded-md border border-[#B3E0DA]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#005F5A]" /> {text.privateTour}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8B6508] bg-[#FFF9E6] px-3 py-1 rounded-md border border-[#FBE39D]">
              <Star className="w-3.5 h-3.5 fill-[#E07A5F] text-[#E07A5F]" /> {text.rating}
            </span>
          </div>

          <h1 id="our-fez-tour-title" className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-[#005F5A] tracking-tight leading-tight text-balance">
            {text.title}
          </h1>
          <p className="text-sm sm:text-base text-[#52605E] max-w-3xl leading-relaxed">{text.body}</p>
        </header>

        <section id="our-fez-tour-gallery" aria-label={text.galleryLabel} className="space-y-3">
          <div className="relative aspect-16/9 sm:aspect-21/9 w-full rounded-3xl overflow-hidden bg-[#15201F] shadow-md border border-[#E7E2DA]">
            <img
              src={activeImage.src}
              alt={activeImage.alt[contentLanguage]}
              className="w-full h-full object-cover transition-opacity duration-300"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 flex items-center justify-between gap-3 text-white text-xs sm:text-sm drop-shadow-md">
              <span className="min-w-0 font-semibold bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg">{activeImage.alt[contentLanguage]}</span>
              <span className="shrink-0 font-medium bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg tabular-nums">
                {activeImageIndex + 1} / {galleryImages.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-none" aria-label={text.galleryLabel}>
            {galleryImages.map((image, index) => (
              <button
                key={image.src}
                type="button"
                onClick={() => setActiveImageIndex(index)}
                aria-label={`${text.viewPhoto} ${index + 1}`}
                aria-current={activeImageIndex === index ? 'true' : undefined}
                className={`relative w-20 sm:w-28 aspect-4/3 rounded-xl overflow-hidden shrink-0 transition-all border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005F5A] focus-visible:ring-offset-2 cursor-pointer ${
                  activeImageIndex === index
                    ? 'border-[#005F5A] ring-2 ring-[#005F5A]/20'
                    : 'border-transparent opacity-70 hover:opacity-100 active:scale-[0.97]'
                }`}
              >
                <img src={image.src} alt="" className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </section>

        <section
          id="our-fez-tour-details"
          aria-label={text.detailsLabel}
          className="grid grid-cols-1 min-[480px]:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 p-5 sm:p-6 bg-white rounded-2xl border border-[#E7E2DA] shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#005F5A]/10 text-[#005F5A] flex items-center justify-center shrink-0"><Clock className="w-5 h-5" /></div>
            <div><span className="text-[11px] text-[#718280] font-medium block">{text.durationLabel}</span><span className="text-xs sm:text-sm font-bold text-[#1C2524]">{text.duration}</span></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C84B31]/10 text-[#C84B31] flex items-center justify-center shrink-0"><Users className="w-5 h-5" /></div>
            <div><span className="text-[11px] text-[#718280] font-medium block">{text.formatLabel}</span><span className="text-xs sm:text-sm font-bold text-[#1C2524]">{text.format}</span></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00A896]/10 text-[#00A896] flex items-center justify-center shrink-0"><MapPin className="w-5 h-5" /></div>
            <div className="min-w-0"><span className="text-[11px] text-[#718280] font-medium block">{text.pickupLabel}</span><span className="text-xs sm:text-sm font-bold text-[#1C2524]">{text.pickup}</span></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E07A5F]/10 text-[#E07A5F] flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5" /></div>
            <div><span className="text-[11px] text-[#718280] font-medium block">{text.languagesLabel}</span><span className="text-xs sm:text-sm font-bold text-[#1C2524]">{text.languages}</span></div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          <section id="our-fez-tour-overview" className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2DA] shadow-sm space-y-5">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">{text.overviewLabel}</span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C2524]">{text.overviewTitle}</h2>
            </div>
            <p className="text-sm text-[#445250] leading-relaxed">{text.intro}</p>
          </section>

          <aside id="our-fez-tour-booking" className="lg:col-span-4 lg:sticky lg:top-24 bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2DA] shadow-sm space-y-5">
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
              <button
                onClick={() => onBookTour(text.title)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#C84B31] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#B33D25] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005F5A] focus-visible:ring-offset-2 transition-colors cursor-pointer"
              >
                <Calendar className="w-4 h-4" /> {text.book}
              </button>
              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#20BD5A] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005F5A] focus-visible:ring-offset-2 transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> {text.whatsapp}
              </a>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};
