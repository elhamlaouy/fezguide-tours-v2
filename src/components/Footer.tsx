import React from 'react';
import { Language, PageId } from '../types';
import { UI_TEXT } from '../data/translations';
import { Logo } from './Logo';
import { businessContactHref } from '../cms/business-contact';
import { useCms } from '../context/CmsContext';
import type { CmsDocument } from '../cms/schema';
import { localizedText, uiText } from '../cms/render-utils';
import { footerShellLinks, isShellDocument } from '../cms/public-document';
import { MapPin, Phone, Mail, Award, ShieldCheck, Heart, Lock } from 'lucide-react';

interface FooterProps {
  language: Language;
  onNavigate: (page: PageId) => void;
  onOpenAdmin?: () => void;
  document?: CmsDocument | null;
}

export const Footer: React.FC<FooterProps> = ({ language, onNavigate, onOpenAdmin, document }) => {
  const t = UI_TEXT.footer;
  const tNav = UI_TEXT.nav;
  const { siteSettings, customPages, blogPosts } = useCms();

  const links: { id: PageId; label: string }[] = [
    { id: 'home', label: tNav.home[language] },
    { id: 'fez', label: tNav.fez[language] },
    { id: 'day-trips', label: tNav.dayTrips[language] },
    { id: 'food-tours', label: tNav.foodTours[language] },
    { id: 'travel-tips', label: tNav.travelTips[language] },
    { id: 'about', label: tNav.about[language] },
  ];
  const cms = isShellDocument(document) ? document : null;
  const contact = cms?.siteSettings ?? siteSettings;
  const aboutText = cms ? (localizedText(cms.footer.text, language) || t.aboutText[language]) : t.aboutText[language];
  const departmentsLabel = cms ? uiText(cms, 'ui.common.allDepartments', language, UI_TEXT.common.allDepartments) : UI_TEXT.common.allDepartments[language];
  const contactTitle = cms ? uiText(cms, 'ui.footer.contactTitle', language, t.contactTitle) : t.contactTitle[language];
  const copyright = cms ? uiText(cms, 'ui.footer.copyright', language, t.copyright) : t.copyright[language];
  const openPage = (pageId: PageId) => {
    onNavigate(pageId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#15201F] text-[#D8E2E0] pt-14 pb-10 border-t border-[#233130]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-[#233130]">
          {/* Col 1: Brand & Mission */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white/95 px-3 py-2 rounded-xl inline-block shadow-sm">
              <Logo brandName={contact.siteName} size="sm" onClick={() => onNavigate('home')} />
            </div>
            <p className="text-sm leading-relaxed text-[#A4B5B3] max-w-md">
              {aboutText}
            </p>
            <div className="flex items-center gap-2 text-xs text-[#00A896] pt-1">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#E07A5F]" />
              <span>{contact.licenseBadge[language] || t.trustBadges[language]}</span>
            </div>
          </div>

          {/* Col 2: Navigation Links to all pages + custom pages */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              {departmentsLabel}
            </h3>
            <ul className="space-y-2 text-sm">
              {cms ? footerShellLinks(cms, language).map((link) => (
                <li key={link.id}>
                  {link.pageId ? (
                    <button
                      onClick={() => openPage(link.pageId as PageId)}
                      className="text-[#B3C4C2] hover:text-white transition-colors cursor-pointer text-start"
                    >
                      {localizedText(link.label, language)}
                    </button>
                  ) : (
                    <a
                      href={cms ? businessContactHref(cms, link.href ?? '') : link.href}
                      className="text-[#B3C4C2] hover:text-white transition-colors cursor-pointer text-start"
                      {...(link.href?.startsWith('https://') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      {localizedText(link.label, language)}
                    </a>
                  )}
                </li>
              )) : (
                <>
              {links.map((link) => (
                <li key={link.id}>
                  <button
                    onClick={() => openPage(link.id)}
                    className="text-[#B3C4C2] hover:text-white transition-colors cursor-pointer text-start"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
              {blogPosts.length > 0 && (
                <li>
                  <button
                    onClick={() => openPage('blog')}
                    className="text-[#00A896] hover:text-white transition-colors cursor-pointer text-start font-medium"
                  >
                    {language === 'es' ? "Blog y relatos de viaje" : 'Blog & Travel Stories'}
                  </button>
                </li>
              )}
              {customPages
                .filter((p) => p.published !== false && (language !== 'es' || Boolean(p.title.es)))
                .map((cp) => (
                  <li key={cp.id}>
                    <button
                      onClick={() => openPage(cp.slug)}
                      className="text-[#B3C4C2] hover:text-white transition-colors cursor-pointer text-start truncate max-w-xs block"
                    >
                      {cp.title[language] || (language === 'es' ? '' : cp.title.en)}
                    </button>
                  </li>
                ))}
                </>
              )}
            </ul>
          </div>

          {/* Col 3: Contact & Direct Inquiries */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              {contactTitle}
            </h3>
            <div className="space-y-2.5 text-xs text-[#B3C4C2]">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#C84B31] shrink-0 mt-0.5" />
                {contact.googleMaps ? (
                  <a
                    href={contact.googleMaps}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors underline decoration-[#C84B31]/50"
                  >
                    {contact.address[language] || t.address[language]}
                  </a>
                ) : (
                  <span>{contact.address[language] || t.address[language]}</span>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#00A896] shrink-0" />
                <a
                  href={`https://wa.me/${(contact.whatsappNumber || '212719603009').replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors underline decoration-[#00A896]/50"
                >
                  {contact.phoneNumber} (WhatsApp 24/7)
                </a>

              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#00A896] shrink-0" />
                <a
                  href={`mailto:${contact.email}`}
                  className="hover:text-white transition-colors underline decoration-[#00A896]/50"
                >
                  {contact.email}
                </a>
              </div>
              <div className="flex items-center gap-2.5 pt-1 text-[#8EA19E]">
                <Award className="w-4 h-4 text-[#E07A5F] shrink-0" />
                <span>{language === 'es' ? "Colectivo de guías autorizados por el Ministerio de Turismo" : "Ministry of Tourism Licensed Guides Collective"}</span>
              </div>
              {(contact.socialInstagram || contact.socialFacebook || contact.socialTripadvisor) && (
                <div className="flex items-center gap-3 pt-2 border-t border-[#233130]/60">
                  {contact.socialInstagram && (
                    <a
                      href={contact.socialInstagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#00A896] hover:text-white transition-colors"
                    >
                      Instagram
                    </a>
                  )}
                  {contact.socialFacebook && (
                    <a
                      href={contact.socialFacebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#00A896] hover:text-white transition-colors"
                    >
                      Facebook
                    </a>
                  )}
                  {contact.socialTripadvisor && (
                    <a
                      href={contact.socialTripadvisor}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#00A896] hover:text-white transition-colors"
                    >
                      TripAdvisor
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col lg:flex-row items-center justify-between gap-4 text-xs text-[#8EA19E]">
          <p className="text-center lg:text-start">{copyright}</p>

          <a
            href="https://atlastactics.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[#8EA19E] hover:text-white transition-colors"
          >
            <span>{language === 'es' ? "Con la tecnología de" : "Powered By"}</span>
            <img
              src="/assets/brand/atlas-mark-white.webp"
              alt=""
              width="20"
              height="22"
              loading="lazy"
              className="w-5 h-[22px] object-contain opacity-80"
            />
            <span className="font-semibold">Atlas Tactics</span>
          </a>

          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1">
              <span>{language === 'es' ? "Hecho con pasión en Fez el-Bali" : "Made with passion in Fez el-Bali"}</span>
              <Heart className="w-3.5 h-3.5 text-[#C84B31] fill-current" />
              <span>{language === 'es' ? "Marruecos" : "Morocco"}</span>
            </div>

            {onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1 text-[11px] text-[#728280] hover:text-[#CCD8D6] transition-colors cursor-pointer border border-[#2A3735] px-2 py-0.5 rounded-md"
              >
                <Lock className="w-3 h-3 text-[#00A896]" />
                <span>{language === 'es' ? "Administración del CMS" : "Admin CMS"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
