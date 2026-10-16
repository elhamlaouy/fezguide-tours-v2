import React from 'react';
import { SectionPillar, Language } from '../types';
import { UI_TEXT } from '../data/translations';
import { Clock, Calendar, Compass } from 'lucide-react';

interface SectionCardProps {
  pillar: SectionPillar;
  language: Language;
  onExplore: (pillar: SectionPillar) => void;
  onBookTour: (tourTitle: string) => void;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  pillar,
  language,
  onExplore,
  onBookTour,
}) => {
  const isArticle = pillar.kind === 'article' || pillar.id === 'fez-explore-medina' || pillar.id === 'fez-history-landmarks' || pillar.id === 'fez-things-to-do';
  const isFezOverviewCard = pillar.pageId === 'fez' && (
    isArticle || pillar.id === 'our-fez-tours'
  );

  const getActionConfig = () => {
    const label = isFezOverviewCard
      ? isArticle
        ? language === 'fr' ? 'Lire le guide' : language === 'es' ? 'Leer la guía' : 'Read the Guide'
        : language === 'fr' ? 'Voir les détails de la visite' : language === 'es' ? 'Ver los detalles de la visita' : 'View Tour Details'
      : isArticle
      ? pillar.id === 'fez-history-landmarks'
        ? (language === 'es' ? 'Leer el relato' : language === 'fr' ? 'Lire le récit' : 'Read the Story')
        : pillar.id === 'fez-things-to-do'
          ? (language === 'es' ? 'Leer la guía' : language === 'fr' ? 'Lire le guide' : 'Read the Guide')
        : (language === 'es' ? 'Leer el artículo' : language === 'fr' ? 'Lire l’article' : 'Read the Article')
      : pillar.id === 'our-fez-tours'
      ? (language === 'es' ? 'Ver la visita y el precio' : language === 'fr' ? 'Voir la visite et le prix' : 'View Tour & Pricing')
      : (language === 'es' ? 'Ver los detalles y el itinerario' : language === 'fr' ? 'Voir détails & programme' : 'View Details & Itinerary');
    return {
      label,
      icon: Compass,
      action: () => onExplore(pillar),
    };
  };

  const actionCfg = getActionConfig();
  const IconComponent = actionCfg.icon;

  return (
    <div className={`group bg-white rounded-2xl border border-[#E7E2DA] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col h-full ${isFezOverviewCard ? 'fez-overview-card' : ''}`}>
      {/* Visual Asset Container - Clickable */}
      <div
        onClick={() => onExplore(pillar)}
        className="relative aspect-4/3 w-full bg-[#1C2524] overflow-hidden cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label={pillar.title[language]}
      >
        <img
          src={pillar.image}
          alt={pillar.imageAlt[language]}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        {/* Subtle Scrim gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

        {/* Price & Duration quiet overlay */}
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-white">
          {pillar.practicalInfo?.duration && (
            <span className="flex items-center gap-1 font-medium drop-shadow-xs">
              <Clock className="w-3.5 h-3.5 text-[#E07A5F]" />
              {pillar.practicalInfo.duration[language]}
            </span>
          )}
          {pillar.id === 'our-fez-tours' ? (
            <span className="font-bold drop-shadow-xs tabular-nums bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-md">
              €170 / {language === 'es' ? 'persona' : language === 'fr' ? 'personne' : 'person'}
            </span>
          ) : pillar.practicalInfo?.priceMAD ? (
            <span className="font-bold drop-shadow-xs tabular-nums bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-md">
              {UI_TEXT.common.fromPrice[language]} {pillar.practicalInfo.priceMAD} MAD
            </span>
          ) : null}
        </div>
      </div>

      {/* Card Body */}
      <div className={`p-5 sm:p-6 flex flex-col flex-1 gap-4 ${isFezOverviewCard ? '' : 'justify-between'}`}>
        <div
          onClick={() => onExplore(pillar)}
          className={`space-y-2 cursor-pointer ${isFezOverviewCard ? 'fez-overview-card-copy' : ''}`}
          role="button"
          tabIndex={0}
        >
          {/* Subtitle kicker (clean text, no pill) */}
          <span className={`text-[11px] font-bold uppercase tracking-wider text-[#C84B31] block ${isFezOverviewCard ? 'fez-overview-card-eyebrow' : ''}`}>
            {pillar.subtitle[language]}
          </span>

          <h3 className={`text-lg font-bold text-[#1C2524] leading-snug group-hover:text-[#005F5A] transition-colors ${isFezOverviewCard ? 'fez-overview-card-title' : ''}`}>
            {pillar.title[language]}
          </h3>

          <p className={`text-xs text-[#52605E] leading-relaxed ${isFezOverviewCard ? 'fez-overview-card-description' : 'line-clamp-3'}`}>
            {pillar.shortDescription[language]}
          </p>
        </div>

        {/* Highlights Preview */}
        {pillar.highlights[language].length > 0 && (
          <div className={`pt-2 border-t border-[#F2ECE4] ${isFezOverviewCard ? 'fez-overview-card-highlights' : ''}`}>
            <ul className="space-y-1">
              {pillar.highlights[language].slice(0, 2).map((h, i) => (
                <li key={i} className={`text-[11px] text-[#42504E] flex items-center gap-1.5 ${isFezOverviewCard ? 'items-start' : 'truncate'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full bg-[#005F5A]/70 shrink-0 ${isFezOverviewCard ? 'mt-1' : ''}`} />
                  <span className={isFezOverviewCard ? 'min-w-0 break-words leading-snug' : 'truncate'}>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Clear Action Button (View More / Explore / Book a Tour) */}
        <div className={`pt-2 ${isFezOverviewCard ? 'mt-auto grid grid-cols-1' : isArticle ? 'grid grid-cols-1' : 'flex items-center gap-2'}`}>
          <button
            onClick={actionCfg.action}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer bg-[#FAF8F5] hover:bg-[#005F5A] text-[#005F5A] hover:text-white border border-[#DCD5CB]"
          >
            <IconComponent className="w-3.5 h-3.5" />
            <span>{actionCfg.label}</span>
          </button>

          {/* Secondary Quick Action: If primary is explore, also allow quick booking */}
          {pillar.actionType !== 'book_tour' && !isArticle && (
            <button
              onClick={() => onBookTour(pillar.title[language])}
              title={UI_TEXT.common.bookNow[language]}
              className="p-2.5 rounded-xl border border-[#DCD5CB] text-[#52605E] hover:text-[#C84B31] hover:border-[#C84B31] hover:bg-[#FAF8F5] transition-colors cursor-pointer shrink-0"
              aria-label={language === 'es' ? "Reserva rápida" : "Quick Book"}
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
