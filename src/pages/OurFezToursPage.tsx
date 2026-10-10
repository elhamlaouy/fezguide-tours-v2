import React, { useState } from 'react';
import {
  Calendar,
  Check,
  Clock,
  MapPin,
  MessageCircle,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { Language, PageId } from '../types';
import { useCms } from '../context/CmsContext';
import { TripadvisorReviewsSection } from '../components/TripadvisorReviewsSection';
import { PageCrumbBar } from '../components/PageCrumbBar';

interface OurFezToursPageProps {
  language: Language;
  onBack: () => void;
  onNavigate: (page: PageId) => void;
  onBookTour: (tourTitle: string) => void;
}

const copy = {
  en: {
    title: 'Explore Fez Medina with Private Local Guide',
    lead: 'A private walking tour through the UNESCO-listed Medina, with a local guide and only your group.',
    overviewLabel: 'Overview',
    overviewTitle: 'Discover the soul of Fez',
    overview: [
      'Walk the UNESCO-listed Medina with a private local guide. It is one of the most intact old cities still lived in today. You will move through hidden alleys, grand monuments, working souks, and crafts that are still made by hand.',
      'The route takes in Al-Qarawiyyin University, the busy Talaa Kebira, the carved courts of Bou Inania and Al-Attarine, and the dye pits of the Chouara Tannery. Your guide explains the history, the habits of the quarter, and the working day around you.',
      'Because the tour is private, the pace follows you. History, architecture, shopping, photography, or simply the atmosphere — the guide can lean toward what you care about.',
    ],
    includedLabel: "What's Included",
    includedTitle: 'Included and not included',
    includedHeading: 'Included',
    excludedHeading: 'Not included',
    included: [
      'Bottled water',
      'Licensed private local guide',
      'Time for photos and short breaks',
      'Private walking tour — only your group',
    ],
    excluded: [
      'Entrance fees to museums or monuments',
      'Food and personal expenses',
      'Bou Inania Madrasa ticket — €2 per person',
      'Al-Attarine Madrasa ticket — €2 per person',
      'Nejjarine Museum ticket — €2 per person',
    ],
    meetingLabel: 'Meeting and Pickup',
    meetingTitle: 'Where you start',
    meeting: [
      'Start at Bab Boujloud, Batha Square, or Rcif Street. Arrive 10 minutes early. Your guide will be waiting, sometimes with a sign, sometimes in traditional dress.',
      'Staying inside the Medina? Ask in advance and the guide can meet you at your riad or hotel. Staying outside? We can arrange a ride or walk you in from the meeting point.',
      'The walk ends back at the meeting point.',
    ],
    itineraryLabel: 'Itinerary',
    itineraryTitle: 'The Medina walk',
    passBy: 'Pass by',
    free: 'Ticket free',
    notIncluded: 'Ticket not included',
    extraLabel: 'Additional Info',
    extraTitle: 'Good to know',
    extra: [
      'You receive confirmation when you book',
      'Not wheelchair accessible',
      'Stroller accessible',
      'Service animals allowed',
      'Near public transportation',
      'Not suitable for serious heart or medical conditions',
      'Most travelers can take part',
      'Private tour — only your group participates',
    ],
    cancelLabel: 'Cancellation Policy',
    cancelTitle: 'Cancel up to 24 hours before',
    cancel: 'Cancel up to 24 hours before the tour for a full refund.',
    priceLabel: 'Tour price',
    perPerson: 'per person',
    estimate: 'Estimated equivalents. Exchange rates vary.',
    book: 'Book this tour',
    whatsapp: 'Ask on WhatsApp',
    back: 'Back to Fez',
    durationLabel: 'Duration',
    duration: '3–5 hours',
    formatLabel: 'Format',
    format: 'Private Walking Tour',
    pickupLabel: 'Meeting / Pickup',
    pickup: 'Bab Boujloud, Batha or Rcif',
    languagesLabel: 'Languages',
    languages: 'English, Français and Español',
    galleryLabel: 'Fez Medina walking tour photos',
    viewPhoto: 'View photo',
    detailsLabel: 'Tour details',
  },
  fr: {
    title: 'Explorez la médina de Fès avec un guide local privé',
    lead: 'Une visite à pied privée dans la médina classée UNESCO, avec un guide local et uniquement votre groupe.',
    overviewLabel: 'Présentation',
    overviewTitle: 'Découvrir l’âme de Fès',
    overview: [
      'Parcourez la médina classée UNESCO avec un guide local privé. C’est l’une des vieilles villes les plus intactes encore habitées. Ruelles cachées, monuments, souks vivants et métiers encore pratiqués à la main.',
      'Le parcours passe par l’université Al-Qarawiyyin, la Talaa Kebira, les cours sculptées de Bou Inania et Al-Attarine, puis les cuves de la tannerie Chouara. Le guide raconte l’histoire, les habitudes du quartier et la journée qui se déroule autour de vous.',
      'La visite est privée : le rythme vous suit. Histoire, architecture, achats, photo, ou simplement l’atmosphère — le guide s’adapte à ce qui vous intéresse.',
    ],
    includedLabel: 'Ce qui est inclus',
    includedTitle: 'Inclus et non inclus',
    includedHeading: 'Inclus',
    excludedHeading: 'Non inclus',
    included: [
      'Eau en bouteille',
      'Guide local privé et agréé',
      'Temps pour les photos et de courtes pauses',
      'Visite à pied privée — uniquement votre groupe',
    ],
    excluded: [
      'Droits d’entrée des musées et monuments',
      'Repas et dépenses personnelles',
      'Billet de la médersa Bou Inania — 2 € par personne',
      'Billet de la médersa Al-Attarine — 2 € par personne',
      'Billet du musée Nejjarine — 2 € par personne',
    ],
    meetingLabel: 'Rendez-vous et prise en charge',
    meetingTitle: 'Où commence la visite',
    meeting: [
      'Départ à Bab Boujloud, à la place Batha ou rue Rcif. Arrivez 10 minutes en avance. Le guide vous attend, parfois avec une pancarte, parfois en tenue traditionnelle.',
      'Vous logez dans la médina ? Prévenez-nous : le guide peut vous retrouver au riad ou à l’hôtel. Vous logez à l’extérieur ? Nous pouvons organiser un transfert ou vous guider jusqu’au point de rendez-vous.',
      'La visite se termine au point de départ.',
    ],
    itineraryLabel: 'Itinéraire',
    itineraryTitle: 'La marche dans la médina',
    passBy: 'Passage',
    free: 'Entrée libre',
    notIncluded: 'Billet non inclus',
    extraLabel: 'Informations utiles',
    extraTitle: 'À savoir',
    extra: [
      'Confirmation envoyée au moment de la réservation',
      'Non accessible en fauteuil roulant',
      'Accessible avec une poussette',
      'Animaux d’assistance acceptés',
      'Proche des transports',
      'Déconseillé en cas de problème cardiaque ou médical grave',
      'La plupart des voyageurs peuvent participer',
      'Visite privée — uniquement votre groupe',
    ],
    cancelLabel: 'Annulation',
    cancelTitle: 'Annulez jusqu’à 24 heures avant',
    cancel: 'Annulation jusqu’à 24 heures avant la visite pour un remboursement intégral.',
    priceLabel: 'Prix de la visite',
    perPerson: 'par personne',
    estimate: 'Équivalents estimatifs. Les taux de change varient.',
    book: 'Réserver cette visite',
    whatsapp: 'Demander sur WhatsApp',
    back: 'Retour à Fès',
    durationLabel: 'Durée',
    duration: '3 à 5 heures',
    formatLabel: 'Format',
    format: 'Visite privée à pied',
    pickupLabel: 'Départ / Prise en charge',
    pickup: 'Bab Boujloud, Batha ou Rcif',
    languagesLabel: 'Langues',
    languages: 'English, Français and Español',
    galleryLabel: 'Photos de la visite à pied dans la médina',
    viewPhoto: 'Voir la photo',
    detailsLabel: 'Informations sur la visite',
  },
};

const galleryImages = [
  { src: '/images/our-fez-tours/01.webp', width: 1200, height: 1600, alt: { en: 'Guide and visitors in front of an ornate tiled gate in Fez', fr: 'Guide et visiteurs devant une porte ornée de zellige à Fès' } },
  { src: '/images/our-fez-tours/02.webp', width: 1536, height: 2048, alt: { en: 'Visitors walking a narrow alley in the Fez Medina', fr: 'Visiteurs dans une ruelle étroite de la médina de Fès' } },
  { src: '/images/our-fez-tours/03.webp', width: 1200, height: 1600, alt: { en: 'Carved brass door with a geometric star pattern', fr: 'Porte en laiton ciselé au motif d’étoile géométrique' } },
  { src: '/images/our-fez-tours/04.webp', width: 1200, height: 1600, alt: { en: 'Travelers in a carved courtyard in Fez', fr: 'Voyageurs dans une cour sculptée à Fès' } },
  { src: '/images/our-fez-tours/05.webp', width: 1200, height: 1600, alt: { en: 'Carpet showroom with visitors seated under hanging rugs', fr: 'Salon de tapis, visiteurs assis sous des tapis suspendus' } },
  { src: '/images/our-fez-tours/06.webp', width: 1200, height: 1600, alt: { en: 'A guide unrolling a carpet for seated visitors', fr: 'Un guide déroule un tapis devant des visiteurs assis' } },
  { src: '/images/our-fez-tours/07.webp', width: 1200, height: 1600, alt: { en: 'Two travelers wearing scarves in a textile shop', fr: 'Deux voyageurs en écharpes dans une boutique de tissus' } },
  { src: '/images/our-fez-tours/08.webp', width: 1200, height: 1600, alt: { en: 'Busy covered souk lane in the Fez Medina', fr: 'Allée couverte et animée d’un souk dans la médina de Fès' } },
];

const itinerary = [
  { title: 'Bab Boujloud', en: 'Iconic entrance to the old city.', fr: 'Entrée emblématique de la vieille ville.', time: '5 min', ticket: 'free' },
  { title: 'Bou Inania Medersa', en: 'A 14th-century Islamic school with carved plaster, wood, and zellige.', fr: 'École islamique du XIVe siècle, plâtre sculpté, bois et zellige.', time: '20 min', ticket: 'paid' },
  { title: 'Rue Talaa Kebira', en: 'One of the main streets of the Medina, full of shops and daily life. Pass by.', fr: 'Une des rues principales de la médina, boutiques et vie quotidienne. Passage.', time: '', ticket: 'pass' },
  { title: 'Al-Qarawiyyin Mosque and University', en: 'The world’s oldest existing university.', fr: 'La plus ancienne université encore existante.', time: '15 min', ticket: 'free' },
  { title: 'Al-Attarine Madrasa', en: 'A Marinid masterpiece beside the Qarawiyyin.', fr: 'Chef-d’œuvre mérinide à côté de la Qarawiyyin.', time: '20 min', ticket: 'paid' },
  { title: 'Chouara Tannery', en: 'The open-air leather tannery.', fr: 'La tannerie de cuir à ciel ouvert.', time: '30 min', ticket: 'free' },
  { title: 'Nejjarine Museum', en: 'Museum of wooden arts and crafts, in a restored funduq.', fr: 'Musée des arts du bois, dans un fondouk restauré.', time: '20 min', ticket: 'paid' },
  { title: 'Place Seffarine', en: 'The square of the copper and metal workers.', fr: 'La place des dinandiers et des métaux.', time: '15 min', ticket: 'free' },
  { title: 'Zaouia of Moulay Idriss II', en: 'A sacred place for locals. Non-Muslims view it from outside.', fr: 'Lieu sacré pour les habitants. Les non-musulmans le voient de l’extérieur.', time: '5 min', ticket: 'free' },
];

export const OurFezToursPage: React.FC<OurFezToursPageProps> = ({ language, onBack, onNavigate, onBookTour }) => {
  const { siteSettings } = useCms();
  const text = language === 'fr' ? copy.fr : copy.en;
  const contentLanguage = language === 'fr' ? 'fr' : 'en';
  const fallbackEnglish = language === 'ar';
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const whatsappNumber = (siteSettings.whatsappNumber || '212719603009').replace(/[^0-9]/g, '');
  const whatsappText = language === 'fr'
    ? 'Bonjour Fez Guide Tours ! Je souhaite réserver la visite privée de la médina de Fès à 170 € par personne. Pouvez-vous me communiquer les disponibilités ?'
    : 'Hello Fez Guide Tours! I would like to book the private Fez Medina walking tour at €170 per person. Could you share availability?';
  const activeImage = galleryImages[activeImageIndex];
  const ticketLabel = (ticket: string) => ticket === 'paid' ? text.notIncluded : ticket === 'pass' ? text.passBy : text.free;

  return (
    <div className="bg-[#FAF8F5] min-h-screen pb-24" dir={fallbackEnglish ? 'ltr' : undefined}>
      <PageCrumbBar
        language={language}
        parentLabel={language === 'ar' ? 'فاس' : language === 'fr' ? 'Fès' : 'Fez'}
        currentTitle={text.title}
        onHome={() => onNavigate('home')}
        onParent={onBack}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 space-y-8 sm:space-y-10">
        <header className="space-y-3">
          <h1 id="our-fez-tour-title" className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-[#005F5A] tracking-tight leading-tight text-balance">
            {text.title}
          </h1>
          <p className="text-sm sm:text-base text-[#52605E] max-w-3xl leading-relaxed">{text.lead}</p>
        </header>

        <section id="our-fez-tour-gallery" aria-label={text.galleryLabel} className="space-y-3">
          <div className="relative w-full rounded-3xl overflow-hidden bg-[#15201F] shadow-md border border-[#E7E2DA] flex items-center justify-center">
            <img
              src={activeImage.src}
              alt={activeImage.alt[contentLanguage]}
              width={activeImage.width}
              height={activeImage.height}
              className="max-h-[72vh] w-auto max-w-full object-contain"
              loading="eager"
            />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 text-white text-xs sm:text-sm">
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
                className={`relative w-16 sm:w-20 aspect-[3/4] rounded-xl overflow-hidden shrink-0 transition-all border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005F5A] focus-visible:ring-offset-2 cursor-pointer ${
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
          <div className="lg:col-span-8 space-y-8">
            <section id="our-fez-tour-overview" className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2DA] shadow-sm space-y-5">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">{text.overviewLabel}</span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C2524]">{text.overviewTitle}</h2>
              </div>
              {text.overview.map((paragraph) => (
                <p key={paragraph} className="text-sm text-[#445250] leading-relaxed">{paragraph}</p>
              ))}
            </section>

            <section id="our-fez-tour-included" className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2DA] shadow-sm space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">{text.includedLabel}</span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C2524]">{text.includedTitle}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-[#F0F8F6] border border-[#D0EBE5] space-y-3">
                  <span className="text-xs font-bold text-[#005F5A] flex items-center gap-1.5"><Check className="w-4 h-4" /> {text.includedHeading}</span>
                  <ul className="space-y-2">
                    {text.included.map((item) => (
                      <li key={item} className="text-xs text-[#2A4843] flex items-start gap-2 leading-relaxed"><Check className="w-3.5 h-3.5 text-[#00A896] shrink-0 mt-0.5" /> {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-5 rounded-2xl bg-[#FFF6F4] border border-[#FBE3DC] space-y-3">
                  <span className="text-xs font-bold text-[#C84B31] flex items-center gap-1.5"><X className="w-4 h-4" /> {text.excludedHeading}</span>
                  <ul className="space-y-2">
                    {text.excluded.map((item) => (
                      <li key={item} className="text-xs text-[#5C3A32] flex items-start gap-2 leading-relaxed"><X className="w-3.5 h-3.5 text-[#C84B31] shrink-0 mt-0.5" /> {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section id="our-fez-tour-meeting" className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2DA] shadow-sm space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">{text.meetingLabel}</span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C2524]">{text.meetingTitle}</h2>
              </div>
              {text.meeting.map((paragraph) => (
                <p key={paragraph} className="text-sm text-[#445250] leading-relaxed">{paragraph}</p>
              ))}
            </section>

            <section id="our-fez-tour-itinerary" className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2DA] shadow-sm space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">{text.itineraryLabel}</span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C2524]">{text.itineraryTitle}</h2>
              </div>
              <ol className="relative pl-6 border-l-2 border-[#005F5A]/20 space-y-7">
                {itinerary.map((stop, index) => (
                  <li key={stop.title} className="relative space-y-1.5">
                    <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-4 border-[#005F5A]" />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-[#005F5A] bg-[#005F5A]/10 px-2 py-0.5 rounded-md">{index + 1}</span>
                      {stop.time && <span className="text-[11px] font-bold text-[#52605E]">{stop.time}</span>}
                      <span className="text-[10px] font-bold text-[#C84B31] bg-[#C84B31]/10 px-2 py-0.5 rounded-md">{ticketLabel(stop.ticket)}</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#1C2524]">{stop.title}</h3>
                    <p className="text-xs text-[#52605E] leading-relaxed">{contentLanguage === 'fr' ? stop.fr : stop.en}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section id="our-fez-tour-extra" className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2DA] shadow-sm space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">{text.extraLabel}</span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C2524]">{text.extraTitle}</h2>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {text.extra.map((item) => (
                  <li key={item} className="text-xs text-[#445250] leading-relaxed">{item}</li>
                ))}
              </ul>
            </section>

            <section id="our-fez-tour-cancel" className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2DA] shadow-sm space-y-3">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">{text.cancelLabel}</span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C2524]">{text.cancelTitle}</h2>
              </div>
              <p className="text-sm text-[#445250] leading-relaxed">{text.cancel}</p>
            </section>
          </div>

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

        <TripadvisorReviewsSection language={language === 'fr' ? 'fr' : 'en'} />
      </main>
    </div>
  );
};
