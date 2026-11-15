import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Language } from '../types';
import { InternalLink, usePagePath } from './InternalLink';

interface PageCrumbBarProps {
  language: Language;
  parentLabel: string;
  /** Page id/slug of the parent page; defaults to the Fez overview. */
  parentPageId?: string;
  currentTitle: string;
  onHome: () => void;
  onParent: () => void;
}

export const PageCrumbBar: React.FC<PageCrumbBarProps> = ({
  language,
  parentLabel,
  parentPageId = 'fez',
  currentTitle,
  onHome,
  onParent,
}) => {
  const pathFor = usePagePath();
  const homeHref = pathFor('home', language);
  const parentHref = pathFor(parentPageId, language);
  const home = language === 'es' ? "Inicio" : language === 'fr' ? 'Accueil' : 'Home';
  const back = language === 'es' ? "Volver a la lista" : language === 'fr' ? 'Retour' : 'Back to list';

  return (
    <div className="bg-white border-b border-[#E7E2DA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between text-xs text-[#52605E]">
        <nav className="flex items-center gap-1.5 sm:gap-2 flex-wrap" aria-label={language === 'es' ? "Ruta de navegación" : "Breadcrumb"}>
          <InternalLink href={homeHref} onNavigate={onHome} className="hover:text-[#005F5A] transition-colors cursor-pointer">
            {home}
          </InternalLink>
          <ChevronRight className="w-3.5 h-3.5 text-[#A5B2B0]" />
          <InternalLink href={parentHref} onNavigate={onParent} className="hover:text-[#005F5A] font-medium transition-colors cursor-pointer">
            {parentLabel}
          </InternalLink>
          <ChevronRight className="w-3.5 h-3.5 text-[#A5B2B0]" />
          <span aria-current="page" className="text-[#1C2524] font-bold truncate max-w-[200px] sm:max-w-md">{currentTitle}</span>
        </nav>
        <InternalLink
          href={parentHref}
          onNavigate={onParent}
          className="flex items-center gap-1 text-[#005F5A] hover:text-[#004743] font-bold text-xs transition-colors cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{back}</span>
        </InternalLink>
      </div>
    </div>
  );
};
