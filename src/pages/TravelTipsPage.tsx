import { businessContactHref } from '../cms/business-contact';
import { pagePath } from '../cms/routing';
import React, { useState } from 'react';
import { Language, SectionPillar } from '../types';
import { UI_TEXT } from '../data/shared-ui';
import { useCms } from '../context/CmsContext';
import { ApprovedSection, ApprovedSections, useApprovedContent } from '../cms/approved-content';
import { visibleLink } from '../cms/render-utils';
import { responsiveImageProps } from '../cms/optimized-image';
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
  const { document, section } = useApprovedContent('travel-tips');
  const currency = section('currency-estimator', 'practicalInfo');
  const gates = section('medina-gates', 'practicalInfo');
  const contact = section('contact', 'contact');
  const hero = section('hero', 'hero');
  const overview = section('overview', 'cardGrid');
  const gallery = section('gallery', 'gallery');
  const benefits = section('quick-rules', 'benefits');
  const introduction = section('introduction', 'richText');
  const blank = { en: '', fr: '', es: '' };
  const imageSource = (mediaId: string | undefined) => document?.media.find(media => media.id === mediaId)?.src;
  const [eurAmount, setEurAmount] = useState<number>(50);

  const madAmount = Math.round(eurAmount * 10.8);

  const travelTipsPillars: SectionPillar[] = document ? (overview?.cards ?? []).flatMap(card => {
    const target = tours.find(tour => tour.id === card.pageId && tour.published !== false);
    if (!target) return [];
    return [{ ...target, title: card.title, subtitle: card.badge ?? blank, shortDescription: card.description,
      image: imageSource(card.image?.mediaId) ?? '', imageAlt: card.image?.alt ?? blank }];
  }) : tours.filter((t) => t.pageId === 'travel-tips' && t.published !== false);

  const headers = {
    title: {
      en: 'Practical Travel Tips & Local Advice for Fez',
      fr: 'Conseils Pratiques & Informations Locales pour Fès',
      es: "Consejos prácticos de viaje y recomendaciones locales para Fez",
    },
    subtitle: {
      en: 'A few simple things make your stay in Fez comfortable and stress-free. Practical advice on walking, red Petit Taxis, cash, and local customs from people who know the city.',
      fr: 'Quelques conseils simples pour un séjour serein et confortable. Astuces de marche, petits taxis rouges, espèces et coutumes par des locaux.',
      es: "Unos pocos detalles sencillos harán que vuestra estancia en Fez sea cómoda y sin preocupaciones. Consejos para caminar, utilizar los pequeños taxis rojos, llevar efectivo y conocer las costumbres locales, de la mano de quienes conocen la ciudad.",
    },
  };

  const quickRules = [
    {
      title: { en: 'Always Carry Cash (MAD)', fr: 'Toujours avoir des Espèces (MAD)', es: "Llevad siempre efectivo (MAD)" },
      desc: {
        en: 'Cards are accepted in modern hotels, but cash is essential for Medina souks, street snacks, and petit taxis.',
        fr: 'Les cartes sont acceptées en hôtel, mais le liquide est indispensable dans les souks et petits taxis.',
        es: "En los hoteles modernos se aceptan tarjetas, pero el efectivo es imprescindible en los zocos de la medina, los puestos de comida y los pequeños taxis.",
      },
    },
    {
      title: { en: 'Wear Comfortable Walking Shoes', fr: 'Chaussures de Marche Confortables', es: "Llevad calzado cómodo para caminar" },
      desc: {
        en: 'You will walk more than expected. Medieval cobblestones have slopes, steps, and uneven stones.',
        fr: 'Vous marcherez beaucoup : pavés médiévaux, ruelles en pente et marches.',
        es: "Caminaréis más de lo que imagináis. El empedrado medieval tiene pendientes, escalones y piedras irregulares.",
      },
    },
    {
      title: { en: 'Red Petit Taxis (10–20 MAD)', fr: 'Petits Taxis Rouges (10–20 MAD)', es: "Pequeños taxis rojos (10–20 MAD)" },
      desc: {
        en: 'Outside the pedestrian Medina walls, red taxis are cheap and metered. Ask to turn on the meter (compteur).',
        fr: 'À l’extérieur des remparts, les petits taxis rouges sont économiques et munis d’un compteur.',
        es: "Fuera de las murallas de la medina peatonal, los taxis rojos son económicos y llevan taxímetro. Pedid que lo enciendan (compteur).",
      },
    },
    {
      title: { en: 'Friday Prayer Rhythm', fr: 'Rythme du Vendredi', es: "El ritmo de la oración del viernes" },
      desc: {
        en: 'Friday is holy: many traditional shops pause between 12:00 PM and 3:30 PM for congregational prayer.',
        fr: 'Vendredi saint : de nombreuses échoppes ferment entre midi et 15h30 pour la prière.',
        es: "El viernes es un día sagrado: muchas tiendas tradicionales cierran de 12:00 a 15:30 para la oración comunitaria.",
      },
    },
  ];

  return (
    <div className="space-y-16 pb-20">
      {/* Header Banner */}
      <ApprovedSection id="hero"><section className="relative bg-[#1C2524] py-12 sm:py-20 overflow-hidden">
        {(!document || hero?.image) && (<img
          {...responsiveImageProps((document ? imageSource(hero?.image?.mediaId) : ("/images/tips-getting-around/bab-boujloud-night.webp")) ?? '', '100vw', true)}
          alt={document ? hero?.image?.alt[language] ?? '' : (language === 'es' ? "Bab Boujloud de noche" : "Bab Boujloud at night")}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />)}
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/30 backdrop-blur-md rounded-3xl p-8 sm:p-12 shadow-xl border border-white/40 text-center space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C84B31] bg-white/70 px-3.5 py-1 rounded-full border border-white/50 backdrop-blur-xs shadow-xs">
              <HelpCircle className="w-4 h-4 text-[#005F5A]" />
              <span>{document ? hero?.eyebrow?.[language] ?? '' : (language === 'es' ? "Consejos prácticos locales · Recomendaciones sinceras · Cómo moverse" : "Local Practical Advice \u00b7 Honest Tips \u00b7 Getting Around")}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#005F5A] text-balance drop-shadow-xs">{document ? hero?.title?.[language] ?? '' : (headers.title[language])}</h1>

            <p className="text-sm sm:text-base text-[#15201F] font-semibold max-w-2xl mx-auto leading-relaxed drop-shadow-xs">{document ? hero?.description?.[language] ?? '' : (headers.subtitle[language])}</p>
          </div>
        </div>
      </section></ApprovedSection>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12"><ApprovedSections>
        {/* 4 Golden Rules Box from Google Doc */}
        <div className="bg-white rounded-3xl border border-[#E7E2DA] p-8 sm:p-10 shadow-xs space-y-6"><ApprovedSections>
          <ApprovedSection id="introduction"><div className="max-w-2xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">{document ? introduction?.eyebrow?.[language] ?? '' : (language === 'es' ? "Consejos locales esenciales" : 'Essential Local Advice')}</span>
            <h2 className="text-2xl font-extrabold text-[#005F5A] tracking-tight">{document ? introduction?.title?.[language] ?? '' : (language === 'es'
                ? "Unos pocos consejos locales pueden marcar la diferencia"
                : 'A Few Local Tips Can Make a Big Difference')}</h2>
            {document ? (introduction?.blocks ?? []).map((block, index) => (<p key={index} className="text-xs sm:text-sm text-[#4E5B59] leading-relaxed">{'text' in block ? block.text[language] : block.items[language].join('\n')}</p>)) : (<p className="text-xs sm:text-sm text-[#4E5B59] leading-relaxed">
              {language === 'es'
                ? "No necesitáis saberlo todo antes de llegar. Un poco de paciencia, respeto y curiosidad os ayudará mucho."
                : 'You do not need to know everything before you arrive. A little patience, respect, and curiosity will take you a long way.'}
            </p>)}
          </div></ApprovedSection>

          <ApprovedSection id="quick-rules"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[#F2ECE4]">
            {(document ? (benefits?.items ?? []).map(item => ({ title: item.title, desc: item.description })) : quickRules).map((rule, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2DA] space-y-2">
                <span className="font-bold text-xs text-[#005F5A] block">
                  {rule.title[language]}
                </span>
                <p className="text-xs text-[#52605E] leading-relaxed">
                  {rule.desc[language]}
                </p>
              </div>
            ))}
          </div></ApprovedSection>
        </ApprovedSections></div>

        {/* 3 Pillars Grid */}
        <ApprovedSection id="overview"><div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {travelTipsPillars.map((pillar) => (
            <SectionCard
              key={pillar.id}
              pillar={pillar}
              language={language}
              onExplore={() => onExplore(pillar)}
              onBookTour={() => onBookTour(pillar.title[language])}
            />
          ))}
        </div></ApprovedSection>

        {/* Real Visual Tips Gallery */}
        <ApprovedSection id="gallery"><div className="space-y-4 pt-2">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">{document && gallery?.eyebrow !== undefined ? gallery.eyebrow[language] : (language === 'es' ? "Guía visual de Fez" : 'Visual Guide to Fez')}</span>
            <h3 className="text-xl font-bold text-[#1C2524]">{document ? gallery?.title?.[language] ?? '' : (language === 'es' ? "Escenas cotidianas y orientación práctica" : 'Everyday Scenes & Practical Navigation')}</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(document ? (gallery?.images ?? []).map(image => ({ src: imageSource(image.mediaId), title: image.caption?.[language] ?? '', alt: image.alt[language] })) : [
              {
                src: '/images/tips-getting-around/city-gate.webp',
                title: language === 'es' ? "Una puerta de la ciudad" : 'A city gate',
              },
              {
                src: '/images/tips-plan-trip/medina-view.webp',
                title: language === 'es' ? "Vista de la medina" : 'A view over the Medina',
              },
              {
                src: '/images/tips-practical/spice-shop.webp',
                title: language === 'es' ? "Una tienda de especias" : 'A spice shop',
              },
              {
                src: '/images/tips-getting-around/hexagonal-sign.webp',
                title: language === 'es' ? "Un letrero de una calle de la medina" : 'A Medina street sign',
              },
            ]).map((item, idx) => (
              <div key={idx} className="relative aspect-4/3 rounded-2xl overflow-hidden border border-[#E7E2DA] shadow-xs group bg-[#1C2524]">
                <img
                  src={item.src}
                  alt={'alt' in item ? item.alt : item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                <div className="absolute bottom-2.5 left-3 right-3 text-white text-[11px] font-bold">
                  {item.title}
                </div>
              </div>
            ))}
          </div>
        </div></ApprovedSection>

        {/* Interactive Currency Converter & Gate Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8"><ApprovedSections>
          {/* Quick Currency Converter */}
          <ApprovedSection id="currency-estimator"><div className="bg-white p-8 rounded-3xl border border-[#E7E2DA] shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#005F5A]/10 text-[#005F5A]">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1C2524]">
                  {document ? currency?.title?.[language] ?? '' : (language === 'es' ? "Conversor rápido de moneda" : 'Quick Currency Estimator')}
                </h3>
                <p className="text-xs text-[#52605E]">
                  {document ? currency?.items[0]?.description[language] ?? '' : (language === 'es' ? "Conversión aproximada: 1 EUR ≈ 10.8 MAD" : 'Approximate conversion: 1 EUR ≈ 10.8 MAD')}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-xs font-semibold text-[#445250] block">
                {document ? currency?.items[0]?.title[language] ?? '' : (language === 'es' ? "Importe en EUR:" : 'Amount in EUR:')}
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
                  {document ? currency?.items[1]?.title[language] ?? '' : (language === 'es' ? "Equivalente en MAD:" : 'Equivalent in MAD:')}
                </span>
                <span className="text-lg font-bold text-[#005F5A]">
                  ~{madAmount} MAD
                </span>
              </div>
            </div>
          </div></ApprovedSection>

          {/* Key Medina Gates Cheat Sheet */}
          <ApprovedSection id="medina-gates"><div className="bg-white p-8 rounded-3xl border border-[#E7E2DA] shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#C84B31]/10 text-[#C84B31]">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1C2524]">
                  {document ? gates?.title?.[language] ?? '' : (language === 'es' ? "Referencia de las puertas de la medina" : 'Medina Gates Reference')}
                </h3>
                <p className="text-xs text-[#52605E]">
                  {document ? gates?.description?.[language] ?? '' : (language === 'es' ? "Puntos junto a la zona peatonal a los que pueden llegar los vehículos" : 'Where vehicles can reach you around the pedestrian zone')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">{document ? (gates?.items ?? []).map((item, index) => (
              <div key={index} className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA]">
                <span className="font-bold text-[#1C2524] block">{item.title[language]}</span>
                <span className="text-[#52605E] text-[11px]">{item.description[language]}</span>
              </div>
            )) : (<>
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA]">
                <span className="font-bold text-[#1C2524] block">Bab Boujloud</span>
                <span className="text-[#52605E] text-[11px]">{language === 'es' ? "La famosa Puerta Azul, principal acceso occidental." : "The famous Blue Gate; main western hub."}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA]">
                <span className="font-bold text-[#1C2524] block">Bab Rcif</span>
                <span className="text-[#52605E] text-[11px]">{language === 'es' ? "Acceso central a la parte baja de la medina y los zocos de comida." : "Central access to lower medina & food souks."}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA]">
                <span className="font-bold text-[#1C2524] block">Place Batha</span>
                <span className="text-[#52605E] text-[11px]">{language === 'es' ? "Parada de taxis tranquila cerca del museo Batha y los riads." : "Quiet taxi station near Batha museum and riads."}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA]">
                <span className="font-bold text-[#1C2524] block">Ain Azliten</span>
                <span className="text-[#52605E] text-[11px]">{language === 'es' ? "Aparcamiento accesible para los riads del norte." : "Accessible parking lot for northern riads."}</span>
              </div></>)}
            </div>
          </div></ApprovedSection>
        </ApprovedSections></div>

        {/* Local Contact Banner */}
        <ApprovedSection id="contact"><div className="bg-[#FAF8F5] rounded-3xl border border-[#E7E2DA] p-8 sm:p-12 text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#005F5A]">{document ? contact?.eyebrow?.[language] ?? '' : (language === 'es'
              ? "¿Necesitáis más consejos locales?"
              : language === 'fr'
              ? 'Besoin de Conseils Locaux ?'
              : 'Need More Local Advice?')}
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-[#1C2524]">{document ? contact?.title?.[language] ?? '' : (language === 'es'
              ? "Viajad con información útil. Explorad con confianza."
              : language === 'fr'
              ? 'Voyagez avec des informations fiables. Explorez en toute sérénité.'
              : 'Travel with Useful Information. Explore with Confidence.')}
          </h3>
          <p className="text-xs sm:text-sm text-[#4E5B59] max-w-2xl mx-auto leading-relaxed">{document ? contact?.description?.[language] ?? '' : (language === 'es'
              ? "Si tenéis alguna pregunta sobre vuestra visita, los lugares de interés, las costumbres locales o cómo organizar vuestro tiempo en Fez, no dudéis en contactarnos."
              : language === 'fr'
              ? 'Une question sur votre séjour, les coutumes locales ou l’organisation de vos journées à Fès ? Contactez directement nos guides.'
              : 'If you have a question about your visit, places to see, local customs, or how to organize your time in Fez, feel free to contact us.')}
          </p>
          <div className="pt-2">
{document ? (contact?.links ?? []).filter(link => visibleLink(document, link)).map(link => (            <a key={link.id}
              href={link.href ? businessContactHref(document, link.href) : link.pageId ? pagePath(document, link.pageId, language) : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 py-3 px-8 bg-[#005F5A] hover:bg-[#004A46] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors"
            >
              <span>{link.label[language]}</span>
            </a>)) : (            <a
              href={`https://wa.me/${(siteSettings.whatsappNumber || '212719603009').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                language === 'es'
                  ? 'Hola, estoy preparando un viaje a Fez y me gustaría recibir algunos consejos y recomendaciones.'
                  : language === 'fr'
                  ? 'Bonjour ! Je prépare mon séjour à Fès et j’aimerais recevoir quelques conseils de vos guides locaux.'
                  : 'Hello! I am planning a trip to Fez and would love some local advice.'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 py-3 px-8 bg-[#005F5A] hover:bg-[#004A46] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors"
            >
              <span>{UI_TEXT.common.whatsappChat[language]}</span>
            </a>)}
          </div>
        </div></ApprovedSection>

      </ApprovedSections></div>
    </div>
  );
};
