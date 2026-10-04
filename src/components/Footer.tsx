import React from 'react';
import { Language, PageId } from '../types';
import { UI_TEXT } from '../data/translations';
import { Logo } from './Logo';
import { useCms } from '../context/CmsContext';
import { MapPin, Phone, Mail, Award, ShieldCheck, Heart, Lock } from 'lucide-react';

interface FooterProps {
  language: Language;
  onNavigate: (page: PageId) => void;
  onOpenAdmin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ language, onNavigate, onOpenAdmin }) => {
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

  return (
    <footer className="bg-[#15201F] text-[#D8E2E0] pt-14 pb-10 border-t border-[#233130]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-[#233130]">
          {/* Col 1: Brand & Mission */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white/95 px-3 py-2 rounded-xl inline-block shadow-sm">
              <Logo size="sm" onClick={() => onNavigate('home')} />
            </div>
            <p className="text-sm leading-relaxed text-[#A4B5B3] max-w-md">
              {t.aboutText[language]}
            </p>
            <div className="flex items-center gap-2 text-xs text-[#00A896] pt-1">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#E07A5F]" />
              <span>{siteSettings.licenseBadge[language] || t.trustBadges[language]}</span>
            </div>
          </div>

          {/* Col 2: Navigation Links to all pages + custom pages */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              {UI_TEXT.common.allDepartments[language]}
            </h4>
            <ul className="space-y-2 text-sm">
              {links.map((link) => (
                <li key={link.id}>
                  <button
                    onClick={() => {
                      onNavigate(link.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-[#B3C4C2] hover:text-white transition-colors cursor-pointer text-start"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
              {blogPosts.length > 0 && (
                <li>
                  <button
                    onClick={() => {
                      onNavigate('blog');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-[#00A896] hover:text-white transition-colors cursor-pointer text-start font-medium"
                  >
                    {language === 'ar' ? 'المدونة والمقالات' : 'Blog & Travel Stories'}
                  </button>
                </li>
              )}
              {customPages
                .filter((p) => p.published !== false)
                .map((cp) => (
                  <li key={cp.id}>
                    <button
                      onClick={() => {
                        onNavigate(cp.slug);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-[#B3C4C2] hover:text-white transition-colors cursor-pointer text-start truncate max-w-xs block"
                    >
                      {cp.title[language] || cp.title.en}
                    </button>
                  </li>
                ))}
            </ul>
          </div>

          {/* Col 3: Contact & Direct Inquiries */}
          <div className="lg:col-span-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              {t.contactTitle[language]}
            </h4>
            <div className="space-y-2.5 text-xs text-[#B3C4C2]">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#C84B31] shrink-0 mt-0.5" />
                <span>{siteSettings.address[language] || t.address[language]}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#00A896] shrink-0" />
                <a
                  href={`https://wa.me/${(siteSettings.whatsappNumber || '212661234567').replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors underline decoration-[#00A896]/50"
                >
                  {siteSettings.phoneNumber} (WhatsApp 24/7)
                </a>

              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#00A896] shrink-0" />
                <span>{siteSettings.email}</span>
              </div>
              <div className="flex items-center gap-2.5 pt-1 text-[#8EA19E]">
                <Award className="w-4 h-4 text-[#E07A5F] shrink-0" />
                <span>Ministry of Tourism Licensed Guides Collective</span>
              </div>
              {(siteSettings.socialInstagram || siteSettings.socialFacebook || siteSettings.socialTripadvisor) && (
                <div className="flex items-center gap-3 pt-2 border-t border-[#233130]/60">
                  {siteSettings.socialInstagram && (
                    <a
                      href={siteSettings.socialInstagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#00A896] hover:text-white transition-colors"
                    >
                      Instagram
                    </a>
                  )}
                  {siteSettings.socialFacebook && (
                    <a
                      href={siteSettings.socialFacebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#00A896] hover:text-white transition-colors"
                    >
                      Facebook
                    </a>
                  )}
                  {siteSettings.socialTripadvisor && (
                    <a
                      href={siteSettings.socialTripadvisor}
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
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8EA19E]">
          <p>{t.copyright[language]}</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span>Made with passion in Fez el-Bali</span>
              <Heart className="w-3.5 h-3.5 text-[#C84B31] fill-current" />
              <span>Morocco</span>
            </div>

            {onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1 text-[11px] text-[#728280] hover:text-[#CCD8D6] transition-colors cursor-pointer border border-[#2A3735] px-2 py-0.5 rounded-md"
              >
                <Lock className="w-3 h-3 text-[#00A896]" />
                <span>Admin CMS</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
