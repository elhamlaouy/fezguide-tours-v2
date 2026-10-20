import type { PublicCmsData } from './CmsContext';
import type { SectionPillar } from '../types';
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
    included: extra?.included || { en: [], fr: [], es: [] },
    excluded: extra?.excluded || { en: [], fr: [], es: [] },
    whatToBring: extra?.whatToBring || { en: [], fr: [], es: [] },
    meetingPointDetails: extra?.meetingPointDetails || { en: '', fr: '', es: '' },
  };
});

const PROTECTED_FEZ_TOUR_IDS = new Set(['fez-explore-medina', 'fez-history-landmarks', 'fez-things-to-do', 'our-fez-tours']);
const PROTECTED_SOURCE_TOUR_IDS = new Set([...PROTECTED_FEZ_TOUR_IDS, 'daytrip-chefchaouen', 'daytrip-custom', 'daytrip-meknes', 'daytrip-ifrane', 'food-tasting-walk', 'food-culture-life', 'food-markets-souks', 'food-traditional-fassi', 'our-food-tours', 'tips-plan-trip', 'tips-getting-around', 'tips-practical']);
const protectedFezTours = initialTours.filter((tour) => PROTECTED_SOURCE_TOUR_IDS.has(tour.id));

const mergeProtectedFezTours = (remoteTours: SectionPillar[]): SectionPillar[] => {
  const protectedById = new Map(protectedFezTours.map((tour) => [tour.id, tour]));
  const merged = remoteTours.map((tour) => protectedById.get(tour.id) || tour);
  const remoteIds = new Set(remoteTours.map((tour) => tour.id));
  return [...merged, ...protectedFezTours.filter((tour) => !remoteIds.has(tour.id))];
};

export const defaultData: PublicCmsData = {
  tours: initialTours,
  customPages: DEFAULT_CUSTOM_PAGES,
  blogPosts: DEFAULT_BLOG_POSTS,
  teamMembers: TEAM_MEMBERS,
  faqs: FAQ_ITEMS,
  siteSettings: DEFAULT_SITE_SETTINGS,
};

export function mergeLegacyPublicData(current: PublicCmsData, value: unknown): PublicCmsData {
  const payload = sanitizeObjectImages(value) as Partial<PublicCmsData>;
  return {
    tours: Array.isArray(payload.tours) ? mergeProtectedFezTours(payload.tours) : current.tours,
    customPages: Array.isArray(payload.customPages) ? payload.customPages : current.customPages,
    blogPosts: Array.isArray(payload.blogPosts) ? payload.blogPosts : current.blogPosts,
    teamMembers: Array.isArray(payload.teamMembers) ? payload.teamMembers : current.teamMembers,
    faqs: Array.isArray(payload.faqs) ? payload.faqs : current.faqs,
    siteSettings: payload.siteSettings ? { ...current.siteSettings, ...payload.siteSettings,
      phoneNumber: DEFAULT_SITE_SETTINGS.phoneNumber, whatsappNumber: DEFAULT_SITE_SETTINGS.whatsappNumber,
      email: DEFAULT_SITE_SETTINGS.email, googleMaps: DEFAULT_SITE_SETTINGS.googleMaps,
    } : current.siteSettings,
  };
}
