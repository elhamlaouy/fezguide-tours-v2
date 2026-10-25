import React, { useState } from 'react';
import { Language, PageId } from '../types';
import { UI_TEXT } from '../data/shared-ui';
import { Logo } from './Logo';
import { businessContactHref } from '../cms/business-contact';
import { useCms } from '../context/CmsContext';
import type { CmsDocument, CmsLink } from '../cms/schema';
import { localizedText, uiText } from '../cms/render-utils';
import { isShellDocument, visibleShellLinks } from '../cms/public-document';
import { Globe, Menu, X, Calendar, Phone, Lock } from 'lucide-react';

function shellLinkActive(document: CmsDocument, link: CmsLink, currentPage: string, activeCategory?: string) {
  if (!link.pageId) return false;
  const page = document.pages.find((item) => item.id === link.pageId);
  return [link.pageId, page?.slug].some((id) => id === currentPage || id === activeCategory);
}

interface NavbarProps {
  currentPage: PageId;
  activeCategory?: PageId;
  language: Language;
  onNavigate: (page: PageId) => void;
  onLanguageChange: (lang: Language) => void;
  onOpenBooking: (tourId?: string, tourTitle?: string) => void;
  onOpenAdmin?: () => void;
  document?: CmsDocument | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  activeCategory,
  language,
  onNavigate,
  onLanguageChange,
  onOpenBooking,
  onOpenAdmin,
  document,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const { customPages, blogPosts, siteSettings } = useCms();

  const tNav = UI_TEXT.nav;

  // Base 6 core links
  const coreLinks: { id: PageId; label: string }[] = [
    { id: 'home', label: tNav.home[language] },
    { id: 'fez', label: tNav.fez[language] },
    { id: 'day-trips', label: tNav.dayTrips[language] },
    { id: 'food-tours', label: tNav.foodTours[language] },
    { id: 'travel-tips', label: tNav.travelTips[language] },
    { id: 'about', label: tNav.about[language] },
  ];

  // Additional dynamic links from CMS custom pages that have showInNav: true
  const dynamicNavPages = customPages
    .filter((p) => p.showInNav && p.published !== false && (language !== 'es' || Boolean(p.title.es)))
    .map((p) => ({
      id: p.slug,
      label: p.title[language] || (language === 'es' ? '' : p.title.en),
    }));

  // Blog link if blog posts exist
  const blogLink =
    blogPosts.length > 0
      ? [
          {
            id: 'blog',
            label: language === 'es' ? "Blog" : language === 'fr' ? 'Blog' : 'Blog',
          },
        ]
      : [];

  const allNavLinks = [...coreLinks, ...dynamicNavPages, ...blogLink];
  const cms = isShellDocument(document) ? document : null;
  const contact = cms?.siteSettings ?? siteSettings;
  const bookLabel = cms ? uiText(cms, 'ui.nav.bookTour', language, tNav.bookTour) : tNav.bookTour[language];
  const whatsappLabel = cms ? uiText(cms, 'ui.common.whatsappChat', language, UI_TEXT.common.whatsappChat) : UI_TEXT.common.whatsappChat[language];
  const shellLinks = cms
    ? visibleShellLinks(cms, cms.navigation, language).map((link) => ({
        key: link.id,
        pageId: link.pageId as PageId | undefined,
        href: link.pageId ? undefined : businessContactHref(cms, link.href ?? ''),
        label: localizedText(link.label, language),
        active: shellLinkActive(cms, link, currentPage, activeCategory),
      }))
    : allNavLinks.map((link) => ({
        key: link.id,
        pageId: link.id,
        href: undefined as string | undefined,
        label: link.label,
        active: currentPage === link.id || activeCategory === link.id,
      }));

  const handleLinkClick = (pageId: PageId) => {
    onNavigate(pageId);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const languagesList: { code: Language; label: string; short: string }[] = [
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'fr', label: 'Français', short: 'FR' },
    { code: 'es', label: 'Español', short: 'ES' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E7E2DA] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 max-[360px]:px-3 min-h-20 py-2 flex items-center justify-between gap-4 max-[360px]:gap-2">
        {/* Zone 1: Brand Wordmark / Logo */}
        <div className="flex min-w-0 items-center">
          <Logo brandName={contact.siteName} onClick={() => handleLinkClick('home')} size="md" className="min-w-0 max-[360px]:gap-1.5 max-lg:[&>div:last-child]:min-w-0 max-lg:[&>div:last-child]:whitespace-normal max-lg:[&>div:last-child]:[overflow-wrap:anywhere] max-lg:[&>div:last-child>span]:min-w-0" />
        </div>

        {/* Zone 2: Primary Nav Links (Single line, text with hover underlines) */}
        <nav className="hidden xl:flex shrink-0 items-center gap-6 xl:gap-7">
          {shellLinks.map((link) => {
            const className = `text-sm font-semibold transition-colors relative py-1 cursor-pointer whitespace-nowrap ${
              link.active ? 'text-[#005F5A]' : 'text-[#44504E] hover:text-[#005F5A]'
            }`;
            if (link.href) {
              const external = link.href.startsWith('https://');
              return (
                <a key={link.key} href={link.href} className={className} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                  {link.label}
                </a>
              );
            }
            return (
              <button
                key={link.key}
                onClick={() => link.pageId && handleLinkClick(link.pageId)}
                className={className}
              >
                {link.label}
                {link.active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#005F5A] rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1-2 Primary Actions + Language Selector + Admin Link */}
        <div className="flex shrink-0 items-center gap-2.5 sm:gap-3 max-[360px]:gap-2">
          {/* Language Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E7E2DA] text-xs font-semibold text-[#1C2524] hover:bg-[#F2ECE4] transition-colors cursor-pointer"
              aria-label={`${language.toUpperCase()} — ${language === 'es' ? 'Cambiar idioma' : language === 'fr' ? 'Changer de langue' : 'Change language'}`}
            >
              <Globe className="w-3.5 h-3.5 text-[#005F5A]" />
              <span>{languagesList.find((l) => l.code === language)?.short}</span>
            </button>

            {langMenuOpen && (
              <div
                className={`absolute ${
                  'right-0'
                } mt-2 w-32 bg-white rounded-lg shadow-lg border border-[#E7E2DA] py-1 z-50`}
              >
                {languagesList.map((langItem) => (
                  <button
                    key={langItem.code}
                    onClick={() => {
                      onLanguageChange(langItem.code);
                      setLangMenuOpen(false);
                    }}
                    className={`w-full text-start px-3 py-2 text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                      language === langItem.code
                        ? 'bg-[#005F5A]/10 text-[#005F5A] font-bold'
                        : 'text-[#1C2524] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <span>{langItem.label}</span>
                    <span className="text-[10px] text-[#697473]">{langItem.short}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Primary Action Button: Book a Tour */}
          <button
            onClick={() => onOpenBooking()}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#C84B31] hover:bg-[#B33D25] rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{bookLabel}</span>
          </button>

          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              title={language === 'es' ? "Panel de administración del CMS" : "CMS Admin Dashboard"}
              className="p-2 text-[#728280] hover:text-[#005F5A] hover:bg-[#F2ECE4] rounded-lg transition-colors cursor-pointer"
              aria-label={language === 'es' ? "Abrir la administración del CMS" : "Open Admin CMS"}
            >
              <Lock className="w-4 h-4" />
            </button>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-lg text-[#1C2524] hover:bg-[#F2ECE4] transition-colors cursor-pointer"
            aria-label={language === 'es' ? "Abrir o cerrar el menú de navegación" : "Toggle navigation menu"}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-[#E7E2DA] bg-[#FAF8F5] px-4 pt-3 pb-6 space-y-2 shadow-xl max-h-[80vh] overflow-y-auto">
          <div className="flex flex-col gap-1">
            {shellLinks.map((link) => {
              const className = `text-start px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                link.active ? 'bg-[#005F5A] text-white' : 'text-[#283533] hover:bg-[#EFE9E0]'
              }`;
              if (link.href) {
                const external = link.href.startsWith('https://');
                return (
                  <a key={link.key} href={link.href} className={className} onClick={() => setMobileMenuOpen(false)} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                    {link.label}
                  </a>
                );
              }
              return (
                <button
                  key={link.key}
                  onClick={() => link.pageId && handleLinkClick(link.pageId)}
                  className={className}
                >
                  {link.label}
                </button>
              );
            })}
          </div>

          {/* Mobile CTA */}
          <div className="pt-4 border-t border-[#E7E2DA] flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenBooking();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-white bg-[#C84B31] hover:bg-[#B33D25] rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>{bookLabel}</span>
            </button>
            <a
              href={`https://wa.me/${(contact.whatsappNumber || '212719603009').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                language === 'es'
                  ? "¡Hola! Me gustaría consultar vuestras visitas por Fez."
                  : language === 'fr'
                  ? 'Bonjour FezGuideTours ! J’aimerais me renseigner sur vos visites à Fès.'
                  : 'Hello FezGuideTours! I would like to inquire about a tour.'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-[#005F5A] border border-[#005F5A] rounded-lg hover:bg-[#005F5A]/5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>
                {whatsappLabel} ({contact.phoneNumber})
              </span>
            </a>

          </div>
        </div>
      )}
    </header>
  );
};
