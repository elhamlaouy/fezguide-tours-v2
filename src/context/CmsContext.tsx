import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  SectionPillar,
  CustomPage,
  BlogPost,
  TeamMember,
  BookingRecord,
  SiteSettings,
  BookingInquiry,
  FaqItem,
} from '../types';
import {
  FEZ_PILLARS,
  DAY_TRIPS_PILLARS,
  FOOD_TOURS_PILLARS,
  TRAVEL_TIPS_PILLARS,
  TEAM_MEMBERS,
  DEFAULT_SITE_SETTINGS,
  DEFAULT_BLOG_POSTS,
  DEFAULT_CUSTOM_PAGES,
  FAQ_ITEMS,
} from '../data/translations';
import { EXPERIENCE_EXTRAS } from '../data/experienceDetails';


interface CmsData {
  tours: SectionPillar[];
  customPages: CustomPage[];
  blogPosts: BlogPost[];
  teamMembers: TeamMember[];
  faqs: FaqItem[];
  bookings: BookingRecord[];
  siteSettings: SiteSettings;
}

interface CmsContextType extends CmsData {
  // Tour actions
  addTour: (tour: SectionPillar) => void;
  updateTour: (id: string, updated: Partial<SectionPillar>) => void;
  deleteTour: (id: string) => void;

  // Custom Page actions
  addCustomPage: (page: CustomPage) => void;
  updateCustomPage: (id: string, updated: Partial<CustomPage>) => void;
  deleteCustomPage: (id: string) => void;

  // Blog actions
  addBlogPost: (post: BlogPost) => void;
  updateBlogPost: (id: string, updated: Partial<BlogPost>) => void;
  deleteBlogPost: (id: string) => void;

  // Team actions
  addTeamMember: (member: TeamMember) => void;
  updateTeamMember: (id: string, updated: Partial<TeamMember>) => void;
  deleteTeamMember: (id: string) => void;

  // FAQ actions
  addFaq: (faq: FaqItem) => void;
  updateFaq: (id: string, updated: Partial<FaqItem>) => void;
  deleteFaq: (id: string) => void;
  reorderFaqs: (reordered: FaqItem[]) => void;

  // Booking actions
  addBooking: (inquiry: BookingInquiry) => string;
  updateBookingStatus: (id: string, status: BookingRecord['status'], notes?: string) => void;
  deleteBooking: (id: string) => void;

  // Settings
  updateSiteSettings: (settings: Partial<SiteSettings>) => void;

  // Cloud & Backup actions
  cloudSyncStatus: 'synced' | 'saving' | 'offline' | 'error' | 'not_configured';
  publishToCloud: () => Promise<{ success: boolean; message: string }>;
  loadFromCloud: () => Promise<void>;
  updateAdminPinGlobally: (currentPin: string, newPin: string) => Promise<{ success: boolean; message: string }>;
  exportBackup: () => void;
  importBackup: (jsonData: string) => boolean;
  resetToDefaults: () => void;
}

const STORAGE_KEY = 'fezguidetours_cms_store_v7';
const LEGACY_STORAGE_KEY = 'fezguidetours_cms_store_v6';

const sanitizeImagePath = (url: string | undefined): string => {
  if (!url) return '';
  return url.replace('/src/assets/images/', '/images/');
};

const sanitizeObjectImages = (obj: any): any => {
  if (!obj) return obj;
  if (typeof obj === 'string') return sanitizeImagePath(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObjectImages);
  if (typeof obj === 'object') {
    const updated: any = {};
    for (const key of Object.keys(obj)) {
      if (key === 'image' || key === 'coverImage' || key === 'avatarUrl' || key === 'heroImage') {
        updated[key] = sanitizeImagePath(obj[key]);
      } else if (key === 'galleryImages' && Array.isArray(obj[key])) {
        updated[key] = obj[key].map(sanitizeImagePath);
      } else {
        updated[key] = sanitizeObjectImages(obj[key]);
      }
    }
    return updated;
  }
  return obj;
};

const getInitialData = (): CmsData => {
  const initialTours: SectionPillar[] = [
    ...FEZ_PILLARS,
    ...DAY_TRIPS_PILLARS,
    ...FOOD_TOURS_PILLARS,
    ...TRAVEL_TIPS_PILLARS,
  ].map((p) => {
    const extra = EXPERIENCE_EXTRAS[p.id];
    return {
      ...p,
      published: true,
      galleryImages: extra?.galleryImages || [p.image],
      itinerary: extra?.itinerary || [],
      included: extra?.included || { en: [], fr: [], ar: [] },
      excluded: extra?.excluded || { en: [], fr: [], ar: [] },
      whatToBring: extra?.whatToBring || { en: [], fr: [], ar: [] },
      meetingPointDetails: extra?.meetingPointDetails || { en: '', fr: '', ar: '' },
    };
  });

  const defaultToursMap = new Map(initialTours.map((t) => [t.id, t]));

  const defaultData: CmsData = {
    tours: initialTours,
    customPages: DEFAULT_CUSTOM_PAGES,
    blogPosts: DEFAULT_BLOG_POSTS,
    teamMembers: TEAM_MEMBERS,
    faqs: FAQ_ITEMS,
    bookings: [
      {
        id: 'FGT-892415',
        createdAt: '2026-09-28T14:30:00Z',
        fullName: 'Sarah Jenkins',
        email: 'sarah.j@example.com',
        phone: '+44 7911 123456',
        tourId: 'fez-explore-medina',
        tourTitle: 'Explore the Medina',
        preferredDate: '2026-10-15',
        guestCount: 2,
        language: 'en',
        specialRequests: 'Interested in discovering authentic craftsmen workshops and panoramic sunset views.',
        status: 'confirmed',
      },
    ],
    siteSettings: DEFAULT_SITE_SETTINGS,
  };

  try {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (saved) {
      const parsed = sanitizeObjectImages(JSON.parse(saved));
      // Merge saved tours while preserving user-customized details, images, and itineraries
      const syncedTours = (parsed.tours || defaultData.tours).map((t: SectionPillar) => {
        const canonical = defaultToursMap.get(t.id);
        const cleanImg = sanitizeImagePath(t.image);
        return {
          ...(canonical || {}),
          ...t,
          image: cleanImg || canonical?.image || '',
          galleryImages: (t.galleryImages || canonical?.galleryImages || []).map(sanitizeImagePath),
          itinerary: t.itinerary || canonical?.itinerary || [],
          included: t.included || canonical?.included || { en: [], fr: [], ar: [] },
          excluded: t.excluded || canonical?.excluded || { en: [], fr: [], ar: [] },
          whatToBring: t.whatToBring || canonical?.whatToBring || { en: [], fr: [], ar: [] },
          meetingPointDetails: t.meetingPointDetails || canonical?.meetingPointDetails || { en: '', fr: '', ar: '' },
        };
      });



      return {
        tours: syncedTours,
        customPages: parsed.customPages || defaultData.customPages,
        blogPosts: parsed.blogPosts || defaultData.blogPosts,
        teamMembers: parsed.teamMembers || defaultData.teamMembers,
        faqs: parsed.faqs && parsed.faqs.length > 0 ? parsed.faqs : defaultData.faqs,
        bookings: parsed.bookings || defaultData.bookings,
        siteSettings: { ...defaultData.siteSettings, ...(parsed.siteSettings || {}) },
      };
    }
  } catch (e) {
    console.error('Error loading CMS data from localStorage:', e);
  }

  return defaultData;
};

const CmsContext = createContext<CmsContextType | undefined>(undefined);

export const CmsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<CmsData>(getInitialData);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'saving' | 'offline' | 'error' | 'not_configured'>('synced');

  // Load from Cloudflare KV API on initial mount (runs for every visitor anywhere in the world!)
  const loadFromCloud = async () => {
    try {
      const res = await fetch('/api/cms');
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.tours && Array.isArray(json.tours)) {
        const clean = sanitizeObjectImages(json);
        setData((prev) => ({
          ...prev,
          ...clean,
          siteSettings: { ...prev.siteSettings, ...(clean.siteSettings || {}) },
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
        setCloudSyncStatus('synced');
      } else if (json && json.configured === false) {
        setCloudSyncStatus('not_configured');
      }
    } catch {
      setCloudSyncStatus('offline');
    }
  };

  useEffect(() => {
    loadFromCloud();
  }, []);

  // Sync to localStorage whenever data changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving CMS data to localStorage:', e);
    }
  }, [data]);

  // Publish to Cloudflare KV database
  const publishToCloud = async (): Promise<{ success: boolean; message: string }> => {
    setCloudSyncStatus('saving');
    try {
      const storedPin = localStorage.getItem('fezguidetours_admin_pin') || '1234';
      const res = await fetch('/api/cms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Pin': storedPin,
        },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setCloudSyncStatus('synced');
        return {
          success: true,
          message: 'Saved to Cloudflare KV! All website visitors worldwide will now see your updates.',
        };
      }

      const err = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setCloudSyncStatus('error');
        return {
          success: false,
          message: 'Unauthorized: Invalid Admin PIN. Please verify your PIN.',
        };
      }

      setCloudSyncStatus('error');
      return {
        success: false,
        message: err.error || 'Failed to save to Cloudflare KV. Check if CMS_KV binding is configured in Cloudflare.',
      };
    } catch {
      setCloudSyncStatus('offline');
      return {
        success: false,
        message: 'Could not connect to Cloudflare API (offline or local preview mode). Changes saved in local browser.',
      };
    }
  };

  // Change Admin PIN globally
  const updateAdminPinGlobally = async (currentPin: string, newPin: string): Promise<{ success: boolean; message: string }> => {
    localStorage.setItem('fezguidetours_admin_pin', newPin.trim());

    try {
      const res = await fetch('/api/admin/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin: newPin.trim() }),
      });

      if (res.ok) {
        return { success: true, message: 'Admin PIN updated globally in Cloudflare KV! It is now active on all devices.' };
      }

      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        message: err.error || 'Updated in local browser, but could not sync to Cloudflare KV.',
      };
    } catch {
      return {
        success: true,
        message: 'Admin PIN updated in this browser. (Cloudflare KV not reachable in local mode).',
      };
    }
  };

  // Tours
  const addTour = (tour: SectionPillar) => {
    setData((prev) => ({
      ...prev,
      tours: [tour, ...prev.tours],
    }));
  };

  const updateTour = (id: string, updated: Partial<SectionPillar>) => {
    setData((prev) => ({
      ...prev,
      tours: prev.tours.map((t) => (t.id === id ? { ...t, ...updated } : t)),
    }));
  };

  const deleteTour = (id: string) => {
    setData((prev) => ({
      ...prev,
      tours: prev.tours.filter((t) => t.id !== id),
    }));
  };

  // Custom Pages
  const addCustomPage = (page: CustomPage) => {
    setData((prev) => ({
      ...prev,
      customPages: [...prev.customPages, page],
    }));
  };

  const updateCustomPage = (id: string, updated: Partial<CustomPage>) => {
    setData((prev) => ({
      ...prev,
      customPages: prev.customPages.map((p) => (p.id === id ? { ...p, ...updated } : p)),
    }));
  };

  const deleteCustomPage = (id: string) => {
    setData((prev) => ({
      ...prev,
      customPages: prev.customPages.filter((p) => p.id !== id),
    }));
  };

  // Blog Posts
  const addBlogPost = (post: BlogPost) => {
    setData((prev) => ({
      ...prev,
      blogPosts: [post, ...prev.blogPosts],
    }));
  };

  const updateBlogPost = (id: string, updated: Partial<BlogPost>) => {
    setData((prev) => ({
      ...prev,
      blogPosts: prev.blogPosts.map((b) => (b.id === id ? { ...b, ...updated } : b)),
    }));
  };

  const deleteBlogPost = (id: string) => {
    setData((prev) => ({
      ...prev,
      blogPosts: prev.blogPosts.filter((b) => b.id !== id),
    }));
  };

  // Team
  const addTeamMember = (member: TeamMember) => {
    setData((prev) => ({
      ...prev,
      teamMembers: [...prev.teamMembers, member],
    }));
  };

  const updateTeamMember = (id: string, updated: Partial<TeamMember>) => {
    setData((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.map((m) => (m.id === id ? { ...m, ...updated } : m)),
    }));
  };

  const deleteTeamMember = (id: string) => {
    setData((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.filter((m) => m.id !== id),
    }));
  };

  // FAQs
  const addFaq = (faq: FaqItem) => {
    setData((prev) => ({
      ...prev,
      faqs: [faq, ...prev.faqs],
    }));
  };

  const updateFaq = (id: string, updated: Partial<FaqItem>) => {
    setData((prev) => ({
      ...prev,
      faqs: prev.faqs.map((f) => (f.id === id ? { ...f, ...updated } : f)),
    }));
  };

  const deleteFaq = (id: string) => {
    setData((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((f) => f.id !== id),
    }));
  };

  const reorderFaqs = (reordered: FaqItem[]) => {
    setData((prev) => ({
      ...prev,
      faqs: reordered,
    }));
  };

  // Bookings
  const addBooking = (inquiry: BookingInquiry): string => {
    const bookingRef = 'FGT-' + Math.floor(100000 + Math.random() * 900000);
    const newRecord: BookingRecord = {
      ...inquiry,
      id: bookingRef,
      createdAt: new Date().toISOString(),
      status: 'new',
    };
    setData((prev) => ({
      ...prev,
      bookings: [newRecord, ...prev.bookings],
    }));
    return bookingRef;
  };

  const updateBookingStatus = (id: string, status: BookingRecord['status'], notes?: string) => {
    setData((prev) => ({
      ...prev,
      bookings: prev.bookings.map((b) =>
        b.id === id ? { ...b, status, ...(notes !== undefined ? { notes } : {}) } : b
      ),
    }));
  };

  const deleteBooking = (id: string) => {
    setData((prev) => ({
      ...prev,
      bookings: prev.bookings.filter((b) => b.id !== id),
    }));
  };

  // Settings
  const updateSiteSettings = (settings: Partial<SiteSettings>) => {
    setData((prev) => ({
      ...prev,
      siteSettings: { ...prev.siteSettings, ...settings },
    }));
  };

  // Backup & Restore
  const exportBackup = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fezguidetours-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importBackup = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed && (parsed.tours || parsed.customPages || parsed.siteSettings || parsed.faqs)) {
        setData({
          tours: parsed.tours || data.tours,
          customPages: parsed.customPages || data.customPages,
          blogPosts: parsed.blogPosts || data.blogPosts,
          teamMembers: parsed.teamMembers || data.teamMembers,
          faqs: parsed.faqs || data.faqs,
          bookings: parsed.bookings || data.bookings,
          siteSettings: parsed.siteSettings || data.siteSettings,
        });
        return true;
      }
    } catch (e) {
      console.error('Invalid backup JSON:', e);
    }
    return false;
  };

  const resetToDefaults = () => {
    localStorage.removeItem(STORAGE_KEY);
    const initialTours: SectionPillar[] = [
      ...FEZ_PILLARS.map((p) => ({ ...p, published: true })),
      ...DAY_TRIPS_PILLARS.map((p) => ({ ...p, published: true })),
      ...FOOD_TOURS_PILLARS.map((p) => ({ ...p, published: true })),
      ...TRAVEL_TIPS_PILLARS.map((p) => ({ ...p, published: true })),
    ];
    setData({
      tours: initialTours,
      customPages: DEFAULT_CUSTOM_PAGES,
      blogPosts: DEFAULT_BLOG_POSTS,
      teamMembers: TEAM_MEMBERS,
      faqs: FAQ_ITEMS,
      bookings: [],
      siteSettings: DEFAULT_SITE_SETTINGS,
    });
  };

  return (
    <CmsContext.Provider
      value={{
        ...data,
        addTour,
        updateTour,
        deleteTour,
        addCustomPage,
        updateCustomPage,
        deleteCustomPage,
        addBlogPost,
        updateBlogPost,
        deleteBlogPost,
        addTeamMember,
        updateTeamMember,
        deleteTeamMember,
        addFaq,
        updateFaq,
        deleteFaq,
        reorderFaqs,
        addBooking,
        updateBookingStatus,
        deleteBooking,
        updateSiteSettings,
        cloudSyncStatus,
        publishToCloud,
        loadFromCloud,
        updateAdminPinGlobally,
        exportBackup,
        importBackup,
        resetToDefaults,
      }}
    >
      {children}
    </CmsContext.Provider>
  );
};

export const useCms = (): CmsContextType => {
  const context = useContext(CmsContext);
  if (!context) {
    throw new Error('useCms must be used within a CmsProvider');
  }
  return context;
};
