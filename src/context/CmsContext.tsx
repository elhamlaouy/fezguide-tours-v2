import React, { createContext, useContext, useEffect, useState } from 'react';
import { BlogPost, CustomPage, FaqItem, SectionPillar, SiteSettings, TeamMember } from '../types';
import {
  DAY_TRIPS_PILLARS,
  DEFAULT_BLOG_POSTS,
  DEFAULT_CUSTOM_PAGES,
  DEFAULT_SITE_SETTINGS,
  FAQ_ITEMS,
  FEZ_PILLARS,
  FOOD_TOURS_PILLARS,
  TEAM_MEMBERS,
  TRAVEL_TIPS_PILLARS,
} from '../data/translations';
import { EXPERIENCE_EXTRAS } from '../data/experienceDetails';

interface PublicCmsData {
  tours: SectionPillar[];
  customPages: CustomPage[];
  blogPosts: BlogPost[];
  teamMembers: TeamMember[];
  faqs: FaqItem[];
  siteSettings: SiteSettings;
}

const sanitizeImagePath = (url: string | undefined): string => {
  if (!url) return '';
  return url.replace('/src/assets/images/', '/images/');
};

const sanitizeObjectImages = (value: unknown): any => {
  if (!value) return value;
  if (typeof value === 'string') return sanitizeImagePath(value);
  if (Array.isArray(value)) return value.map(sanitizeObjectImages);
  if (typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const cleaned: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(source)) {
      if (key === 'image' || key === 'coverImage' || key === 'avatarUrl' || key === 'heroImage') {
        cleaned[key] = sanitizeImagePath(typeof child === 'string' ? child : undefined);
      } else if (key === 'galleryImages' && Array.isArray(child)) {
        cleaned[key] = child.map((item) => sanitizeImagePath(typeof item === 'string' ? item : undefined));
      } else {
        cleaned[key] = sanitizeObjectImages(child);
      }
    }
    return cleaned;
  }
  return value;
};

const initialTours: SectionPillar[] = [
  ...FEZ_PILLARS,
  ...DAY_TRIPS_PILLARS,
  ...FOOD_TOURS_PILLARS,
  ...TRAVEL_TIPS_PILLARS,
].map((pillar) => {
  const extra = EXPERIENCE_EXTRAS[pillar.id];
  return {
    ...pillar,
    published: true,
    galleryImages: extra?.galleryImages || [pillar.image],
    itinerary: extra?.itinerary || [],
    included: extra?.included || { en: [], fr: [], ar: [] },
    excluded: extra?.excluded || { en: [], fr: [], ar: [] },
    whatToBring: extra?.whatToBring || { en: [], fr: [], ar: [] },
    meetingPointDetails: extra?.meetingPointDetails || { en: '', fr: '', ar: '' },
  };
});

const defaultData: PublicCmsData = {
  tours: initialTours,
  customPages: DEFAULT_CUSTOM_PAGES,
  blogPosts: DEFAULT_BLOG_POSTS,
  teamMembers: TEAM_MEMBERS,
  faqs: FAQ_ITEMS,
  siteSettings: DEFAULT_SITE_SETTINGS,
};

const CmsContext = createContext<PublicCmsData | undefined>(undefined);

export const CmsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<PublicCmsData>(defaultData);

  useEffect(() => {
    const controller = new AbortController();

    const loadPublicContent = async () => {
      try {
        const response = await fetch('/api/cms', {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        if (!response.ok) return;

        const payload = sanitizeObjectImages(await response.json()) as Partial<PublicCmsData>;
        setData((current) => ({
          tours: Array.isArray(payload.tours) ? payload.tours : current.tours,
          customPages: Array.isArray(payload.customPages) ? payload.customPages : current.customPages,
          blogPosts: Array.isArray(payload.blogPosts) ? payload.blogPosts : current.blogPosts,
          teamMembers: Array.isArray(payload.teamMembers) ? payload.teamMembers : current.teamMembers,
          faqs: Array.isArray(payload.faqs) ? payload.faqs : current.faqs,
          siteSettings: payload.siteSettings
            ? { ...current.siteSettings, ...payload.siteSettings }
            : current.siteSettings,
        }));
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    };

    void loadPublicContent();
    return () => controller.abort();
  }, []);

  return <CmsContext.Provider value={data}>{children}</CmsContext.Provider>;
};

export const useCms = (): PublicCmsData => {
  const context = useContext(CmsContext);
  if (!context) {
    throw new Error('useCms must be used within a CmsProvider');
  }
  return context;
};
