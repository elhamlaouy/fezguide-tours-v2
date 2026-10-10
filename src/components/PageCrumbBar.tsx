import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Language } from '../types';

interface PageCrumbBarProps {
  language: Language;
  parentLabel: string;
  currentTitle: string;
  onHome: () => void;
  onParent: () => void;
}

export const PageCrumbBar: React.FC<PageCrumbBarProps> = ({
  language,
  parentLabel,
  currentTitle,
  onHome,
  onParent,
}) => {
  const home = language === 'ar' ? 'الرئيسية' : language === 'fr' ? 'Accueil' : 'Home';
  const back = language === 'ar' ? 'العودة للقائمة' : language === 'fr' ? 'Retour' : 'Back to list';

  return (
    <div className="bg-white border-b border-[#E7E2DA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between text-xs text-[#52605E]">
        <nav className="flex items-center gap-1.5 sm:gap-2 flex-wrap" aria-label="Breadcrumb">
          <button onClick={onHome} className="hover:text-[#005F5A] transition-colors cursor-pointer">
            {home}
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-[#A5B2B0] rtl:rotate-180" />
          <button onClick={onParent} className="hover:text-[#005F5A] font-medium transition-colors cursor-pointer">
            {parentLabel}
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-[#A5B2B0] rtl:rotate-180" />
          <span className="text-[#1C2524] font-bold truncate max-w-[200px] sm:max-w-md">{currentTitle}</span>
        </nav>
        <button
          onClick={onParent}
          className="flex items-center gap-1 text-[#005F5A] hover:text-[#004743] font-bold text-xs transition-colors cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
          <span>{back}</span>
        </button>
      </div>
    </div>
  );
};
