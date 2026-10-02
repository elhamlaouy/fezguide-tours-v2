import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  SectionPillar,
  CustomPage,
  BlogPost,
  TeamMember,
  BookingRecord,
  SiteSettings,
  BookingInquiry,
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
} from '../data/translations';

interface CmsData {
  tours: SectionPillar[];
  customPages: CustomPage[];
  blogPosts: BlogPost[];
  teamMembers: TeamMember[];
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

  // Booking actions
  addBooking: (inquiry: BookingInquiry) => string;
  updateBookingStatus: (id: string, status: BookingRecord['status'], notes?: string) => void;
  deleteBooking: (id: string) => void;

  // Settings
  updateSiteSettings: (settings: Partial<SiteSettings>) => void;

  // Backup & Restore
  exportBackup: () => void;
  importBackup: (jsonData: string) => boolean;
  resetToDefaults: () => void;
}

const STORAGE_KEY = 'fezguidetours_cms_store_v2';

const getInitialData = (): CmsData => {
  const initialTours: SectionPillar[] = [
    ...FEZ_PILLARS.map((p) => ({ ...p, published: true })),
    ...DAY_TRIPS_PILLARS.map((p) => ({ ...p, published: true })),
    ...FOOD_TOURS_PILLARS.map((p) => ({ ...p, published: true })),
    ...TRAVEL_TIPS_PILLARS.map((p) => ({ ...p, published: true })),
  ];

  const defaultData: CmsData = {
    tours: initialTours,
    customPages: DEFAULT_CUSTOM_PAGES,
    blogPosts: DEFAULT_BLOG_POSTS,
    teamMembers: TEAM_MEMBERS,
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
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        tours: parsed.tours || defaultData.tours,
        customPages: parsed.customPages || defaultData.customPages,
        blogPosts: parsed.blogPosts || defaultData.blogPosts,
        teamMembers: parsed.teamMembers || defaultData.teamMembers,
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

  // Sync to localStorage whenever data changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving CMS data to localStorage:', e);
    }
  }, [data]);

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
      if (parsed && (parsed.tours || parsed.customPages || parsed.siteSettings)) {
        setData({
          tours: parsed.tours || data.tours,
          customPages: parsed.customPages || data.customPages,
          blogPosts: parsed.blogPosts || data.blogPosts,
          teamMembers: parsed.teamMembers || data.teamMembers,
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
        addBooking,
        updateBookingStatus,
        deleteBooking,
        updateSiteSettings,
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
