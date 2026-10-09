export type Language = 'en' | 'fr' | 'ar';

export type StandardPageId = 'home' | 'fez' | 'day-trips' | 'food-tours' | 'travel-tips' | 'about' | 'blog' | 'admin';
export type PageId = StandardPageId | string;

export interface ItineraryStop {
  time?: string;
  title: Record<Language, string>;
  description: Record<Language, string>;
  badge?: Record<Language, string>;
}

export interface SectionPillar {
  id: string;
  pageId: StandardPageId | string;
  title: Record<Language, string>;
  subtitle: Record<Language, string>;
  shortDescription: Record<Language, string>;
  fullDescription: Record<Language, string>;
  highlights: Record<Language, string[]>;
  practicalInfo?: {
    duration?: Record<Language, string>;
    departure?: Record<Language, string>;
    groupSize?: Record<Language, string>;
    priceMAD?: number;
    priceEUR?: number;
    priceUSD?: number;
  };
  image: string;
  imageAlt: Record<Language, string>;
  actionType: 'view_more' | 'explore' | 'book_tour';
  published?: boolean;
  galleryImages?: string[];
  itinerary?: ItineraryStop[];
  included?: Record<Language, string[]>;
  excluded?: Record<Language, string[]>;
  whatToBring?: Record<Language, string[]>;
  meetingPointDetails?: Record<Language, string>;
}

export interface CustomPage {
  id: string;
  slug: string;
  title: Record<Language, string>;
  subtitle: Record<Language, string>;
  heroImage: string;
  content: Record<Language, string>;
  highlights: Record<Language, string[]>;
  showInNav: boolean;
  published: boolean;
  createdAt: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: Record<Language, string>;
  excerpt: Record<Language, string>;
  content: Record<Language, string>;
  coverImage: string;
  category: Record<Language, string>;
  author: string;
  date: string;
  readTime: Record<Language, string>;
  published: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  role: Record<Language, string>;
  bio: Record<Language, string>;
  languages: string[];
  experience: Record<Language, string>;
  licenseNumber?: string;
  avatarUrl: string;
}

export interface FaqItem {
  id: string;
  category: 'tours' | 'booking' | 'guides' | 'transport' | 'walking' | 'food' | 'daytrips' | 'general';
  question: Record<Language, string>;
  answer: Record<Language, string>;
}

export interface BookingInquiry {
  fullName: string;
  email: string;
  phone: string;
  tourId: string;
  tourTitle: string;
  preferredDate: string;
  guestCount: number;
  language: Language;
  specialRequests: string;
}

export interface BookingRecord extends BookingInquiry {
  id: string;
  createdAt: string;
  status: 'new' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

export interface SiteSettings {
  siteName: string;
  phoneNumber: string;
  whatsappNumber: string;
  email: string;
  address: Record<Language, string>;
  licenseBadge: Record<Language, string>;
  heroTagline: Record<Language, string>;
  heroTitle: Record<Language, string>;
  heroSubtitle: Record<Language, string>;
  heroImage?: string;
  socialInstagram?: string;
  socialFacebook?: string;
  socialTripadvisor?: string;
  googleMaps?: string;
}

