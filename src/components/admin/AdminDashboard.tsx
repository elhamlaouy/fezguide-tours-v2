import React, { useState } from 'react';
import { useCms } from '../../context/CmsContext';
import {
  SectionPillar,
  CustomPage,
  BlogPost,
  TeamMember,
  BookingRecord,
  Language,
  FaqItem,
} from '../../types';
import { ImagePickerField } from './ImagePickerField';
import { GalleryManagerField } from './GalleryManagerField';
import { TourEditorModal } from './TourEditorModal';
import { FaqEditorModal } from './FaqEditorModal';
import { CustomPageEditorModal } from './CustomPageEditorModal';
import { BlogEditorModal } from './BlogEditorModal';
import { TeamEditorModal } from './TeamEditorModal';

import {
  Compass,
  FileText,
  BookOpen,
  Users,
  Inbox,
  Settings,
  Plus,
  Trash2,
  Edit3,
  Download,
  Upload,
  Check,
  X,
  Eye,
  ExternalLink,
  MessageCircle,
  RotateCcw,
  Save,
  Globe,
  ArrowLeft,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  Search,
  Share2,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';

interface AdminDashboardProps {
  onClose: () => void;
  language: Language;
  onNavigate?: (page: any) => void;
}

type AdminTab = 'tours' | 'pages' | 'blog' | 'team' | 'faqs' | 'bookings' | 'settings';

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onClose,
  language,
  onNavigate,
}) => {
  const cms = useCms();
  const [activeTab, setActiveTab] = useState<AdminTab>('tours');
  const [tourFilter, setTourFilter] = useState<string>('all');

  // Edit / Create States
  const [editingTour, setEditingTour] = useState<SectionPillar | null>(null);
  const [editingPage, setEditingPage] = useState<CustomPage | null>(null);
  const [pageSearchQuery, setPageSearchQuery] = useState<string>('');
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [editingTeam, setEditingTeam] = useState<TeamMember | null>(null);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [isCreatingFaq, setIsCreatingFaq] = useState<boolean>(false);
  const [faqCategoryFilter, setFaqCategoryFilter] = useState<string>('all');
  const [faqSearchQuery, setFaqSearchQuery] = useState<string>('');
  const [settingsHeroLang, setSettingsHeroLang] = useState<Language>('en');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // In-app modal confirmation dialog (replaces window.confirm completely)
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const askConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmLabel = 'Delete'
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmLabel,
      onConfirm,
    });
  };

  // Helper for JSON import
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          const success = cms.importBackup(text);
          if (success) {
            showToast('Backup restored successfully!');
          } else {
            showToast('Failed to import backup: invalid format');
          }
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F1EB] text-[#1C2524] flex flex-col">
      {/* Top Bar with Prominent Back Button */}
      <header className="sticky top-0 z-30 bg-[#15201F] text-white px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-[#2A3735] shadow-md">
        <div className="flex items-center gap-3">
          {/* Unmissable Primary Back Button */}
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-[#005F5A] text-white text-xs font-bold transition-all cursor-pointer border border-white/20 shadow-xs group"
            title="Return to the live FezGuideTours website"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Live Website</span>
          </button>

          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-white/20">
            <div className="w-7 h-7 rounded-lg bg-[#005F5A] flex items-center justify-center font-bold text-white text-xs">
              CMS
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight">
                Management Portal
              </h1>
              <p className="text-[10px] text-[#9FB3B0]">
                Tours, Custom Pages, Blogs & Bookings
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => cms.exportBackup()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-[#CCD8D6] transition-colors cursor-pointer"
            title="Download JSON Backup"
          >
            <Download className="w-3.5 h-3.5 text-[#00A896]" />
            <span className="hidden md:inline">Export Backup</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-[#CCD8D6] transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-[#E07A5F]" />
            <span className="hidden md:inline">Import Backup</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#C84B31] hover:bg-[#B33D25] text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit to Live Site</span>
            <span className="sm:hidden">Exit</span>
          </button>
        </div>
      </header>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#005F5A] text-white text-xs font-bold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-[#84E1BC]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-[#E7E2DA]">
          {[
            { id: 'tours', label: 'Tours & Sections', count: cms.tours.length, icon: Compass },
            { id: 'pages', label: 'Custom Pages', count: cms.customPages.length, icon: FileText },
            { id: 'blog', label: 'Blog & Articles', count: cms.blogPosts.length, icon: BookOpen },
            { id: 'team', label: 'Team & Guides', count: cms.teamMembers.length, icon: Users },
            { id: 'faqs', label: 'FAQs & Questions', count: (cms.faqs || []).length, icon: HelpCircle },
            {
              id: 'bookings',
              label: 'Bookings Inbox',
              count: cms.bookings.filter((b) => b.status === 'new').length,
              badgeHighlight: true,
              icon: Inbox,
            },
            { id: 'settings', label: 'Site Settings', count: null, icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as AdminTab);
                  setEditingTour(null);
                  setEditingPage(null);
                  setEditingBlog(null);
                  setEditingTeam(null);
                  setEditingFaq(null);
                  setIsCreatingFaq(false);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#005F5A] text-white shadow-xs'
                    : 'bg-white text-[#52605E] hover:bg-[#EFEAE2] border border-[#E7E2DA]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : tab.badgeHighlight && tab.count > 0
                        ? 'bg-[#C84B31] text-white'
                        : 'bg-[#FAF8F5] text-[#52605E]'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: TOURS & SECTIONS */}
        {activeTab === 'tours' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#1C2524]">
                  Manage Tours & Experiences
                </h2>
                <p className="text-xs text-[#52605E]">
                  Modify titles, pricing, durations, descriptions, and media across the core departments.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={tourFilter}
                  onChange={(e) => setTourFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white text-xs font-medium"
                >
                  <option value="all">All Departments</option>
                  <option value="fez">Fez Medina</option>
                  <option value="day-trips">Day Trips</option>
                  <option value="food-tours">Food & Tasting</option>
                  <option value="travel-tips">Travel Tips</option>
                </select>

                <button
                  onClick={() => {
                    const newTour: SectionPillar = {
                      id: 'custom-tour-' + Date.now(),
                      pageId: tourFilter !== 'all' ? (tourFilter as any) : 'fez',
                      title: { en: 'New Fez Experience', fr: 'Nouvelle Expérience', ar: 'تجربة جديدة' },
                      subtitle: { en: 'Custom Experience', fr: 'Expérience sur mesure', ar: 'تجربة مخصصة' },
                      shortDescription: {
                        en: 'Brief description of this new experience.',
                        fr: 'Description courte de cette visite.',
                        ar: 'وصف قصير لهذه الجولة الجديدة.',
                      },
                      fullDescription: {
                        en: 'Full detailed itinerary and inclusions for this tour.',
                        fr: 'Itinéraire détaillé et informations complètes.',
                        ar: 'الشرح الكامل والتفاصيل والمسار المتبع.',
                      },
                      highlights: {
                        en: ['Highlight 1', 'Highlight 2'],
                        fr: ['Point fort 1', 'Point fort 2'],
                        ar: ['محطة 1', 'محطة 2'],
                      },
                      practicalInfo: {
                        duration: { en: '3 hours', fr: '3 heures', ar: '3 ساعات' },
                        departure: { en: 'Bab Boujloud', fr: 'Bab Boujloud', ar: 'باب بوجلود' },
                        priceMAD: 450,
                        priceEUR: 42,
                      },
                      image: '/images/real/fez_explore_medina_image1.jpg',
                      imageAlt: { en: 'Tour image', fr: 'Image visite', ar: 'صورة الجولة' },
                      actionType: 'book_tour',
                      published: true,
                    };
                    cms.addTour(newTour);
                    setEditingTour(newTour);
                    showToast('New tour created! Edit details below.');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#005F5A] hover:bg-[#004A46] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Tour</span>
                </button>
              </div>
            </div>

            {/* Tours Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cms.tours
                .filter((t) => tourFilter === 'all' || t.pageId === tourFilter)
                .map((tour) => (
                  <div
                    key={tour.id}
                    className="bg-white rounded-2xl border border-[#E7E2DA] overflow-hidden shadow-xs flex flex-col justify-between"
                  >
                    <div className="relative h-40 bg-[#1C2524]">
                      <img
                        src={tour.image}
                        alt={tour.title[language] || tour.title.en}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-bold text-white uppercase">
                        {tour.pageId}
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 text-white">
                        <h4 className="text-sm font-bold truncate">
                          {tour.title[language] || tour.title.en}
                        </h4>
                      </div>
                    </div>

                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <p className="text-xs text-[#52605E] line-clamp-2">
                        {tour.shortDescription[language] || tour.shortDescription.en}
                      </p>

                      <div className="flex items-center justify-between text-xs text-[#728280] pt-2 border-t border-[#F2ECE4]">
                        <span>{tour.practicalInfo?.priceMAD || 0} MAD</span>
                        <span>{tour.practicalInfo?.duration[language] || 'Flexible'}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => setEditingTour(tour)}
                          className="flex-1 py-1.5 px-3 bg-[#FAF8F5] hover:bg-[#005F5A] text-[#005F5A] hover:text-white border border-[#D5CEC4] text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => {
                            askConfirm(
                              `Delete Tour "${tour.title[language] || tour.title.en}"?`,
                              'Are you sure you want to delete this tour experience?',
                              () => {
                                cms.deleteTour(tour.id);
                                showToast('Tour deleted.');
                              }
                            );
                          }}
                          className="p-1.5 rounded-lg border border-[#E7E2DA] text-[#728280] hover:text-[#C84B31] hover:border-[#C84B31] transition-colors cursor-pointer"
                          title="Delete tour"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Full Tour & Itinerary Editor Modal */}
            <TourEditorModal
              tour={editingTour}
              isOpen={!!editingTour}
              onClose={() => setEditingTour(null)}
              onSave={(updatedTour) => {
                cms.updateTour(updatedTour.id, updatedTour);
                setEditingTour(null);
                showToast('Tour and itinerary details saved!');
              }}
              onDelete={(tourId) => {
                askConfirm(
                  `Delete Tour?`,
                  'Are you sure you want to permanently delete this tour?',
                  () => {
                    cms.deleteTour(tourId);
                    setEditingTour(null);
                    showToast('Tour deleted.');
                  }
                );
              }}
            />
          </div>
        )}

        {/* TAB 2: CUSTOM PAGES */}
        {activeTab === 'pages' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#1C2524]">
                  Custom Standalone Pages Builder ({cms.customPages.length})
                </h2>
                <p className="text-xs text-[#52605E]">
                  Create bespoke pages (e.g. Sahara Desert, Cooking Classes, Bespoke Journeys) with hero banners, body prose, and navigation menu visibility.
                </p>
              </div>

              <button
                onClick={() => {
                  const newPage: CustomPage = {
                    id: 'page-' + Date.now(),
                    slug: 'bespoke-experience-' + Math.floor(100 + Math.random() * 900),
                    title: {
                      en: 'New Custom Experience',
                      fr: 'Nouvelle Expérience Personnalisée',
                      ar: 'تجربة سياحية مخصصة جديدة',
                    },
                    subtitle: {
                      en: 'Tailored Fez Special Itinerary',
                      fr: 'Programme Spécial Fès sur Mesure',
                      ar: 'مسار مميز ومخصص من فاس',
                    },
                    heroImage: '/images/real/daytrip_custom_image1.jpg',
                    content: {
                      en: 'Comprehensive description and details for this tailored private experience in Fez and surrounding regions.',
                      fr: 'Description complète et détaillée de cette expérience privée à Fès et ses environs.',
                      ar: 'شرح وتفاصيل وافية لهذه التجربة السياحية الخاصة في فاس والمناطق المجاورة.',
                    },
                    highlights: {
                      en: ['Private air-conditioned transport', 'Certified local Medina guide', 'Flexible schedule & custom stops'],
                      fr: ['Transport climatisé privé', 'Guide officiel agréé', 'Horaires flexibles & arrêts sur mesure'],
                      ar: ['نقل خاص ومكيف حديث', 'مرشد محلي معتمد', 'مرونة كاملة في المواعيد والمسار'],
                    },
                    showInNav: true,
                    published: true,
                    createdAt: new Date().toISOString().slice(0, 10),
                  };
                  cms.addCustomPage(newPage);
                  setEditingPage(newPage);
                  showToast('New Custom Page created! Fill out details.');
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#005F5A] hover:bg-[#004A46] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Page</span>
              </button>
            </div>

            {/* Search Box */}
            <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E7E2DA]">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-[#728280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={pageSearchQuery}
                  onChange={(e) => setPageSearchQuery(e.target.value)}
                  placeholder="Search custom pages by title or slug..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5] text-xs text-[#1C2524] focus:outline-none focus:border-[#005F5A]"
                />
              </div>

              <span className="text-[11px] text-[#728280] font-mono">
                {cms.customPages.filter((p) => p.showInNav).length} shown in main menu
              </span>
            </div>

            {/* Custom Pages Grid */}
            {(() => {
              const filtered = cms.customPages.filter((p) => {
                if (!pageSearchQuery.trim()) return true;
                const query = pageSearchQuery.toLowerCase();
                return (
                  p.slug.toLowerCase().includes(query) ||
                  p.title.en.toLowerCase().includes(query) ||
                  p.title.fr.toLowerCase().includes(query) ||
                  p.title.ar.includes(query) ||
                  (p.subtitle?.en && p.subtitle.en.toLowerCase().includes(query))
                );
              });

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-12 bg-white rounded-3xl border border-[#E7E2DA] p-8 space-y-3">
                    <FileText className="w-8 h-8 text-[#A0AFA0] mx-auto" />
                    <p className="text-sm font-bold text-[#1C2524]">No custom pages found</p>
                    <p className="text-xs text-[#728280]">
                      Try adjusting your search query or click "Create New Page" to add one.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filtered.map((page) => (
                    <div
                      key={page.id}
                      className="bg-white rounded-3xl border border-[#E7E2DA] overflow-hidden shadow-xs hover:border-[#005F5A]/40 transition-all flex flex-col justify-between"
                    >
                      {/* Top Banner Thumbnail */}
                      <div className="relative h-32 w-full overflow-hidden bg-[#FAF8F5]">
                        <img
                          src={page.heroImage || '/images/real/daytrip_custom_image1.jpg'}
                          alt={page.title.en}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold text-white bg-black/50 backdrop-blur-xs px-2.5 py-0.5 rounded-lg border border-white/20">
                            /{page.slug}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs ${
                              page.showInNav
                                ? 'bg-emerald-500 text-white'
                                : 'bg-black/50 text-white/80 backdrop-blur-xs border border-white/20'
                            }`}
                          >
                            {page.showInNav ? 'Shown in Navbar' : 'Direct Link Only'}
                          </span>
                        </div>
                        <div className="absolute bottom-2.5 left-3.5 right-3.5">
                          <h3 className="text-sm font-extrabold text-white truncate drop-shadow-xs">
                            {page.title.en}
                          </h3>
                        </div>
                      </div>

                      {/* Content Overview */}
                      <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-[#005F5A]">
                            {page.subtitle?.en || page.subtitle?.fr || page.subtitle?.ar || 'Bespoke Experience'}
                          </p>
                          <p className="text-xs text-[#52605E] line-clamp-2 leading-relaxed">
                            {page.content.en || page.content.fr || page.content.ar}
                          </p>

                          <div className="flex items-center gap-1.5 pt-1 text-[10px] text-[#728280]">
                            <span className={page.title.en ? 'text-[#005F5A] font-bold' : 'text-[#D5CEC4]'}>EN</span>
                            <span>•</span>
                            <span className={page.title.fr ? 'text-[#005F5A] font-bold' : 'text-[#D5CEC4]'}>FR</span>
                            <span>•</span>
                            <span className={page.title.ar ? 'text-[#005F5A] font-bold' : 'text-[#D5CEC4]'}>AR</span>
                            {page.highlights?.en && page.highlights.en.length > 0 && (
                              <span className="ml-2 bg-[#FAF8F5] border border-[#E7E2DA] px-2 py-0.5 rounded-md font-mono">
                                {page.highlights.en.length} highlights
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-3 border-t border-[#F2ECE4] text-xs">
                          <span className="text-[11px] text-[#728280]">
                            Created: {page.createdAt || 'Recent'}
                          </span>

                          <div className="flex items-center gap-2">
                            {onNavigate && (
                              <button
                                type="button"
                                onClick={() => onNavigate(page.slug)}
                                className="p-1.5 text-[#52605E] hover:text-[#005F5A] hover:bg-[#FAF8F5] rounded-xl border border-[#E7E2DA] transition-colors cursor-pointer"
                                title="View live page on website"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setEditingPage(page)}
                              className="flex items-center gap-1.5 py-1 px-3 bg-[#005F5A] hover:bg-[#004A46] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit Page</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                askConfirm(
                                  `Delete Page "${page.title.en}"?`,
                                  `Are you sure you want to permanently delete "/${page.slug}"?`,
                                  () => {
                                    cms.deleteCustomPage(page.id);
                                    showToast('Page deleted.');
                                  }
                                );
                              }}
                              className="p-1.5 text-[#728280] hover:text-[#C84B31] hover:bg-red-50 rounded-xl border border-[#E7E2DA] transition-colors cursor-pointer"
                              title="Delete page"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Custom Page Editor Modal */}
            <CustomPageEditorModal
              page={editingPage}
              isOpen={!!editingPage}
              onClose={() => setEditingPage(null)}
              onSave={(updatedPage) => {
                cms.updateCustomPage(updatedPage.id, updatedPage);
                setEditingPage(null);
                showToast('Custom page saved successfully!');
              }}
              onDelete={(pageId) => {
                askConfirm(
                  'Delete Custom Page?',
                  'Are you sure you want to permanently delete this page?',
                  () => {
                    cms.deleteCustomPage(pageId);
                    setEditingPage(null);
                    showToast('Page deleted.');
                  }
                );
              }}
              onPreview={(slug) => {
                if (onNavigate) {
                  onNavigate(slug);
                }
              }}
            />
          </div>
        )}

        {/* TAB 3: BLOG & ARTICLES */}
        {activeTab === 'blog' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#1C2524]">
                  Blog & Stories Manager
                </h2>
                <p className="text-xs text-[#52605E]">
                  Publish articles, travel guides, and heritage stories with multilingual translations.
                </p>
              </div>

              <button
                onClick={() => {
                  const newBlog: BlogPost = {
                    id: 'blog-' + Date.now(),
                    slug: 'fez-story-' + Math.floor(Math.random() * 1000),
                    title: {
                      en: 'New Fez Medina Article',
                      fr: 'Nouvel Article sur Fès',
                      ar: 'مقال جديد عن فاس',
                    },
                    excerpt: {
                      en: 'A brief teaser for the blog card.',
                      fr: 'Résumé court pour la carte du blog.',
                      ar: 'ملخص مشوق للمقال يظهر في البطاقة.',
                    },
                    content: {
                      en: 'Full narrative and details of the article...',
                      fr: 'Contenu complet et histoire détaillée...',
                      ar: 'المحتوى الكامل والقصة المفصلة...',
                    },
                    coverImage: '/images/real/daytrip_chefchaouen_image1.jpg',
                    category: { en: 'Heritage', fr: 'Patrimoine', ar: 'تراث' },
                    author: 'Youssef El Fassi',
                    date: new Date().toISOString().slice(0, 10),
                    readTime: { en: '4 min read', fr: '4 min de lecture', ar: '4 دقائق' },
                    published: true,
                  };
                  cms.addBlogPost(newBlog);
                  setEditingBlog(newBlog);
                  showToast('New article created! Edit content.');
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#005F5A] hover:bg-[#004A46] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Write Article</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cms.blogPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white rounded-2xl border border-[#E7E2DA] p-5 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase text-[#005F5A]">
                      {post.category.en} · {post.date}
                    </span>
                    <h3 className="text-sm font-bold text-[#1C2524] line-clamp-2">
                      {post.title.en}
                    </h3>
                    <p className="text-xs text-[#52605E] line-clamp-2">
                      {post.excerpt.en}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#F2ECE4]">
                    <span className="text-[11px] text-[#728280]">{post.author}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingBlog(post)}
                        className="py-1 px-3 bg-[#FAF8F5] hover:bg-[#005F5A] text-[#005F5A] hover:text-white border border-[#D5CEC4] text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          askConfirm(
                            `Delete Article "${post.title.en}"?`,
                            'Are you sure you want to permanently delete this article?',
                            () => {
                              cms.deleteBlogPost(post.id);
                              showToast('Article deleted.');
                            }
                          );
                        }}
                        className="p-1.5 text-[#728280] hover:text-[#C84B31] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Full Blog Editor Modal */}
            <BlogEditorModal
              post={editingBlog}
              isOpen={!!editingBlog}
              onClose={() => setEditingBlog(null)}
              onSave={(updatedPost) => {
                cms.updateBlogPost(updatedPost.id, updatedPost);
                setEditingBlog(null);
                showToast('Article saved successfully!');
              }}
              onDelete={(postId) => {
                askConfirm(
                  'Delete Article?',
                  'Are you sure you want to permanently delete this article?',
                  () => {
                    cms.deleteBlogPost(postId);
                    setEditingBlog(null);
                    showToast('Article deleted.');
                  }
                );
              }}
            />
          </div>
        )}

        {/* TAB 4: TEAM & GUIDES */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#1C2524]">
                  Team & Licensed Guides Management
                </h2>
                <p className="text-xs text-[#52605E]">
                  Manage guide bios, official ministerial license numbers, and language proficiencies.
                </p>
              </div>

              <button
                onClick={() => {
                  const newMember: TeamMember = {
                    id: 'guide-' + Date.now(),
                    name: 'New Guide / Driver',
                    role: { en: 'Certified Guide', fr: 'Guide Agréé', ar: 'مرشد معتمد' },
                    bio: {
                      en: 'Passionate native guide born in Fez.',
                      fr: 'Guide passionné natif de Fès.',
                      ar: 'مرشد سياحي من أبناء فاس العتيقة.',
                    },
                    languages: ['Arabic', 'English', 'French'],
                    experience: { en: '8+ Years', fr: '8+ ans', ar: '8+ سنوات' },
                    licenseNumber: 'FEZ-' + Math.floor(1000 + Math.random() * 9000),
                    avatarUrl: '/images/real/about_us_image1.jpg',
                  };
                  cms.addTeamMember(newMember);
                  setEditingTeam(newMember);
                  showToast('New team member added!');
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#005F5A] hover:bg-[#004A46] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Guide</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {cms.teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-white rounded-2xl border border-[#E7E2DA] p-5 shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#1C2524]">
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="text-sm font-bold text-[#1C2524]">{member.name}</h3>
                    <p className="text-[11px] text-[#C84B31] font-semibold">{member.role.en}</p>
                    <p className="text-xs text-[#52605E] line-clamp-2">{member.bio.en}</p>
                    {member.licenseNumber && (
                      <span className="text-[10px] text-[#005F5A] font-bold block">
                        Badge #{member.licenseNumber}
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#F2ECE4] flex items-center justify-between">
                    <button
                      onClick={() => setEditingTeam(member)}
                      className="py-1 px-3 bg-[#FAF8F5] hover:bg-[#005F5A] text-[#005F5A] hover:text-white border border-[#D5CEC4] text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        askConfirm(
                          `Remove Guide "${member.name}"?`,
                          'Are you sure you want to remove this team member from the About page?',
                          () => {
                            cms.deleteTeamMember(member.id);
                            showToast('Team member removed.');
                          }
                        );
                      }}
                      className="p-1.5 text-[#728280] hover:text-[#C84B31] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Full Team Editor Modal */}
            <TeamEditorModal
              member={editingTeam}
              isOpen={!!editingTeam}
              onClose={() => setEditingTeam(null)}
              onSave={(updatedMember) => {
                cms.updateTeamMember(updatedMember.id, updatedMember);
                setEditingTeam(null);
                showToast('Guide details saved successfully!');
              }}
              onDelete={(memberId) => {
                askConfirm(
                  'Remove Team Member?',
                  'Are you sure you want to remove this guide from the team?',
                  () => {
                    cms.deleteTeamMember(memberId);
                    setEditingTeam(null);
                    showToast('Team member removed.');
                  }
                );
              }}
            />
          </div>
        )}

        {/* TAB: FAQS & QUESTIONS */}
        {activeTab === 'faqs' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#1C2524]">
                  Manage FAQs & Answers ({cms.faqs.length})
                </h2>
                <p className="text-xs text-[#52605E]">
                  Create, translate, reorder, or edit all traveller questions displayed in the About Us accordion.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingFaq({
                    id: `faq-${Date.now()}`,
                    category: 'tours',
                    question: { en: '', fr: '', ar: '' },
                    answer: { en: '', fr: '', ar: '' },
                  });
                  setIsCreatingFaq(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#005F5A] hover:bg-[#004A46] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add FAQ</span>
              </button>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E7E2DA]">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                {[
                  { id: 'all', label: 'All Topics' },
                  { id: 'tours', label: 'Tours' },
                  { id: 'booking', label: 'Booking' },
                  { id: 'guides', label: 'Guides' },
                  { id: 'transport', label: 'Transport' },
                  { id: 'walking', label: 'Walking' },
                  { id: 'food', label: 'Food' },
                  { id: 'daytrips', label: 'Day Trips' },
                  { id: 'general', label: 'General' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setFaqCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      faqCategoryFilter === cat.id
                        ? 'bg-[#005F5A] text-white'
                        : 'bg-[#FAF8F5] text-[#52605E] hover:bg-[#EFEAE2] border border-[#E7E2DA]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative shrink-0 md:w-64">
                <Search className="w-3.5 h-3.5 text-[#728280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={faqSearchQuery}
                  onChange={(e) => setFaqSearchQuery(e.target.value)}
                  placeholder="Search questions or answers..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5] text-xs text-[#1C2524] focus:outline-none focus:border-[#005F5A]"
                />
              </div>
            </div>

            {/* FAQ List */}
            {(() => {
              const filtered = (cms.faqs || []).filter((f) => {
                const matchCategory =
                  faqCategoryFilter === 'all' || f.category === faqCategoryFilter;
                const matchSearch =
                  !faqSearchQuery.trim() ||
                  f.question.en.toLowerCase().includes(faqSearchQuery.toLowerCase()) ||
                  f.question.fr.toLowerCase().includes(faqSearchQuery.toLowerCase()) ||
                  f.question.ar.includes(faqSearchQuery) ||
                  f.answer.en.toLowerCase().includes(faqSearchQuery.toLowerCase()) ||
                  f.answer.fr.toLowerCase().includes(faqSearchQuery.toLowerCase()) ||
                  f.answer.ar.includes(faqSearchQuery);
                return matchCategory && matchSearch;
              });

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-12 bg-white rounded-3xl border border-[#E7E2DA] p-8 space-y-3">
                    <HelpCircle className="w-8 h-8 text-[#A0AFA0] mx-auto" />
                    <p className="text-sm font-bold text-[#1C2524]">No FAQs found</p>
                    <p className="text-xs text-[#728280]">
                      Try changing your category filter or search query, or click "Add FAQ" to create one.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {filtered.map((item) => {
                    const originalIndex = cms.faqs.findIndex((f) => f.id === item.id);
                    const canMoveUp = originalIndex > 0;
                    const canMoveDown = originalIndex < cms.faqs.length - 1;

                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-2xl border border-[#E7E2DA] p-4 sm:p-5 shadow-xs hover:border-[#005F5A]/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        {/* Left: Reorder arrows & Content */}
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          {/* Reordering Buttons */}
                          <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                            <button
                              type="button"
                              disabled={!canMoveUp}
                              onClick={() => {
                                if (!canMoveUp) return;
                                const reordered = [...cms.faqs];
                                const temp = reordered[originalIndex - 1];
                                reordered[originalIndex - 1] = reordered[originalIndex];
                                reordered[originalIndex] = temp;
                                cms.reorderFaqs(reordered);
                              }}
                              className={`p-1 rounded-md border text-xs cursor-pointer ${
                                canMoveUp
                                  ? 'border-[#D5CEC4] text-[#52605E] hover:bg-[#FAF8F5] hover:text-[#005F5A]'
                                  : 'border-[#F2ECE4] text-[#D5CEC4] cursor-not-allowed'
                              }`}
                              title="Move up in order"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={!canMoveDown}
                              onClick={() => {
                                if (!canMoveDown) return;
                                const reordered = [...cms.faqs];
                                const temp = reordered[originalIndex + 1];
                                reordered[originalIndex + 1] = reordered[originalIndex];
                                reordered[originalIndex] = temp;
                                cms.reorderFaqs(reordered);
                              }}
                              className={`p-1 rounded-md border text-xs cursor-pointer ${
                                canMoveDown
                                  ? 'border-[#D5CEC4] text-[#52605E] hover:bg-[#FAF8F5] hover:text-[#005F5A]'
                                  : 'border-[#F2ECE4] text-[#D5CEC4] cursor-not-allowed'
                              }`}
                              title="Move down in order"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Content */}
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#005F5A]/10 text-[#005F5A]">
                                {item.category}
                              </span>
                              <span className="text-[10px] font-mono text-[#A0AFA0]">
                                #{originalIndex + 1}
                              </span>
                              <div className="flex items-center gap-1 text-[10px] text-[#728280]">
                                <span className={item.question.en ? 'text-[#005F5A] font-bold' : 'text-[#D5CEC4]'}>EN</span>
                                <span>•</span>
                                <span className={item.question.fr ? 'text-[#005F5A] font-bold' : 'text-[#D5CEC4]'}>FR</span>
                                <span>•</span>
                                <span className={item.question.ar ? 'text-[#005F5A] font-bold' : 'text-[#D5CEC4]'}>AR</span>
                              </div>
                            </div>

                            <h4 className="text-xs sm:text-sm font-bold text-[#1C2524] truncate">
                              {item.question.en || item.question.fr || item.question.ar}
                            </h4>

                            <p className="text-xs text-[#52605E] line-clamp-2 leading-relaxed">
                              {item.answer.en || item.answer.fr || item.answer.ar}
                            </p>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 self-end md:self-center shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-[#F2ECE4]">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingFaq(item);
                              setIsCreatingFaq(false);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D5CEC4] text-[#005F5A] hover:bg-[#FAF8F5] text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              askConfirm(
                                `Delete FAQ?`,
                                `Are you sure you want to permanently delete "${item.question.en.slice(0, 50)}..."?`,
                                () => {
                                  cms.deleteFaq(item.id);
                                  showToast('FAQ deleted.');
                                }
                              );
                            }}
                            className="p-1.5 rounded-xl border border-[#E7E2DA] text-[#728280] hover:text-[#C84B31] hover:border-[#C84B31] transition-colors cursor-pointer"
                            title="Delete FAQ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* FAQ Editor Modal */}
            <FaqEditorModal
              faq={editingFaq}
              isOpen={!!editingFaq || isCreatingFaq}
              onClose={() => {
                setEditingFaq(null);
                setIsCreatingFaq(false);
              }}
              onSave={(updated) => {
                if (isCreatingFaq) {
                  cms.addFaq(updated);
                  showToast('New FAQ created!');
                } else {
                  cms.updateFaq(updated.id, updated);
                  showToast('FAQ updated!');
                }
                setEditingFaq(null);
                setIsCreatingFaq(false);
              }}
              onDelete={(id) => {
                askConfirm('Delete FAQ?', 'Are you sure you want to permanently delete this FAQ item?', () => {
                  cms.deleteFaq(id);
                  setEditingFaq(null);
                  setIsCreatingFaq(false);
                  showToast('FAQ deleted.');
                });
              }}
            />
          </div>
        )}

        {/* TAB 5: BOOKINGS INBOX */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-extrabold text-[#1C2524]">
                Customer Bookings & Inquiries ({cms.bookings.length})
              </h2>
              <p className="text-xs text-[#52605E]">
                Review inbound reservations, update status, and initiate instant WhatsApp responses.
              </p>
            </div>

            {cms.bookings.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-[#E7E2DA] text-center space-y-2">
                <Inbox className="w-10 h-10 text-[#728280] mx-auto opacity-50" />
                <h3 className="text-sm font-bold text-[#1C2524]">No booking inquiries yet</h3>
                <p className="text-xs text-[#728280]">
                  When guests reserve tours through the site, their inquiries will appear here.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-[#E7E2DA] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#FAF8F5] text-[#52605E] uppercase text-[10px] font-bold border-b border-[#E7E2DA]">
                      <tr>
                        <th className="px-4 py-3">Ref ID</th>
                        <th className="px-4 py-3">Guest</th>
                        <th className="px-4 py-3">Tour</th>
                        <th className="px-4 py-3">Date & Guests</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2ECE4]">
                      {cms.bookings.map((booking) => {
                        const whatsappLink = `https://wa.me/${booking.phone.replace(
                          /[^0-9]/g,
                          ''
                        )}?text=${encodeURIComponent(
                          `Hello ${booking.fullName}! This is FezGuideTours following up on your reservation for "${booking.tourTitle}" on ${booking.preferredDate}.`
                        )}`;

                        return (
                          <tr key={booking.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-[#005F5A]">
                              {booking.id}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-[#1C2524] block">
                                {booking.fullName}
                              </span>
                              <span className="text-[11px] text-[#728280] block">
                                {booking.phone}
                              </span>
                              <span className="text-[11px] text-[#728280] block">
                                {booking.email}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-[#1C2524] max-w-xs truncate">
                              {booking.tourTitle}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold block">{booking.preferredDate}</span>
                              <span className="text-[11px] text-[#728280]">
                                {booking.guestCount} Guest(s) · {booking.language.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={booking.status}
                                onChange={(e) =>
                                  cms.updateBookingStatus(
                                    booking.id,
                                    e.target.value as BookingRecord['status']
                                  )
                                }
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                                  booking.status === 'confirmed'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : booking.status === 'completed'
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                <option value="new">New</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <a
                                  href={whatsappLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-lg transition-colors"
                                  title="WhatsApp Client"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  onClick={() => {
                                    askConfirm(
                                      `Delete Booking "${booking.id}"?`,
                                      `Are you sure you want to delete the reservation request from ${booking.fullName}?`,
                                      () => {
                                        cms.deleteBooking(booking.id);
                                        showToast('Booking deleted.');
                                      }
                                    );
                                  }}
                                  className="p-1.5 text-[#728280] hover:text-[#C84B31] rounded-lg cursor-pointer"
                                  title="Delete record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: SITE SETTINGS, HERO BANNER & BACKUP */}
        {activeTab === 'settings' && (
          <div className="space-y-8 max-w-4xl">
            {/* Header */}
            <div>
              <h2 className="text-lg font-extrabold text-[#1C2524]">
                Global Site Settings & Homepage Customizer
              </h2>
              <p className="text-xs text-[#52605E]">
                Customize your homepage hero banner, contact coordinates, social media links, and export full backups.
              </p>
            </div>

            {/* CARD 1: HOMEPAGE HERO BANNER & VISUAL COVER */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E7E2DA] space-y-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E2DA] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#005F5A]/10 text-[#005F5A] flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#1C2524]">
                      Homepage Hero Banner Customizer
                    </h3>
                    <p className="text-[11px] text-[#728280]">
                      The prominent top section travellers see when landing on FezGuideTours.com.
                    </p>
                  </div>
                </div>

                {/* Trilingual Switcher for Hero Texts */}
                <div className="flex items-center gap-1 p-1 bg-[#FAF8F5] rounded-xl border border-[#E7E2DA] self-start sm:self-auto">
                  {(['en', 'fr', 'ar'] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setSettingsHeroLang(lang)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all uppercase cursor-pointer ${
                        settingsHeroLang === lang
                          ? 'bg-[#005F5A] text-white shadow-xs'
                          : 'text-[#52605E] hover:bg-white'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hero Image Field */}
              <div>
                <ImagePickerField
                  label="Hero Background Photo"
                  value={cms.siteSettings.heroImage || '/images/real/about_us_image7.jpg'}
                  onChange={(newPath) => cms.updateSiteSettings({ heroImage: newPath })}
                  helperText="Primary high-resolution photo displayed across the full-width cinematic hero section."
                />
              </div>

              {/* Multilingual Text Inputs */}
              <div className="space-y-4 p-4 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA]">
                <div>
                  <label className="block text-xs font-bold text-[#2A3735] mb-1">
                    Tagline Kicker Badge ({settingsHeroLang.toUpperCase()}):
                  </label>
                  <input
                    type="text"
                    dir={settingsHeroLang === 'ar' ? 'rtl' : 'ltr'}
                    value={cms.siteSettings.heroTagline?.[settingsHeroLang] || ''}
                    onChange={(e) =>
                      cms.updateSiteSettings({
                        heroTagline: {
                          ...cms.siteSettings.heroTagline,
                          [settingsHeroLang]: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. Fez Guide Tours — Discover the City Through Local Eyes"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white text-xs text-[#1C2524] focus:outline-none focus:border-[#005F5A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2A3735] mb-1">
                    Main Headline / Title ({settingsHeroLang.toUpperCase()}):
                  </label>
                  <input
                    type="text"
                    dir={settingsHeroLang === 'ar' ? 'rtl' : 'ltr'}
                    value={cms.siteSettings.heroTitle?.[settingsHeroLang] || ''}
                    onChange={(e) =>
                      cms.updateSiteSettings({
                        heroTitle: {
                          ...cms.siteSettings.heroTitle,
                          [settingsHeroLang]: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. Discover Fez in a Simple, Comfortable and Personal Way"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white text-xs font-bold text-[#1C2524] focus:outline-none focus:border-[#005F5A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2A3735] mb-1">
                    Hero Subtitle / Description ({settingsHeroLang.toUpperCase()}):
                  </label>
                  <textarea
                    rows={3}
                    dir={settingsHeroLang === 'ar' ? 'rtl' : 'ltr'}
                    value={cms.siteSettings.heroSubtitle?.[settingsHeroLang] || ''}
                    onChange={(e) =>
                      cms.updateSiteSettings({
                        heroSubtitle: {
                          ...cms.siteSettings.heroSubtitle,
                          [settingsHeroLang]: e.target.value,
                        },
                      })
                    }
                    placeholder="Describe your authentic experience in Fez..."
                    className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white text-xs text-[#1C2524] leading-relaxed focus:outline-none focus:border-[#005F5A]"
                  />
                </div>
              </div>

              {/* Hero Live Mini-Mockup Preview */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[#728280] uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#005F5A]" />
                  <span>Homepage Live Hero Preview ({settingsHeroLang.toUpperCase()})</span>
                </span>
                <div className="relative rounded-2xl overflow-hidden min-h-[220px] flex items-center justify-center p-6 border border-[#E7E2DA]">
                  <img
                    src={cms.siteSettings.heroImage || '/images/real/about_us_image7.jpg'}
                    alt="Hero Preview"
                    className="absolute inset-0 w-full h-full object-cover opacity-85"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-black/30" />
                  <div className="relative z-10 max-w-lg mx-auto bg-white/40 backdrop-blur-md rounded-2xl p-5 border border-white/50 text-center space-y-2 shadow-lg">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/80 text-[#C84B31]">
                      {cms.siteSettings.heroTagline?.[settingsHeroLang] || 'Fez Guide Tours'}
                    </span>
                    <h3 className="text-base sm:text-lg font-extrabold text-[#005F5A] leading-snug">
                      {cms.siteSettings.heroTitle?.[settingsHeroLang] || 'Discover Fez in a Personal Way'}
                    </h3>
                    <p className="text-xs text-[#15201F] font-medium line-clamp-2 leading-relaxed">
                      {cms.siteSettings.heroSubtitle?.[settingsHeroLang] || 'Authentic Medina tours and day trips.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: BRAND IDENTITY & CONTACT COORDINATES */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E7E2DA] space-y-6 shadow-xs">
              <div className="flex items-center gap-2.5 border-b border-[#E7E2DA] pb-4">
                <div className="w-9 h-9 rounded-xl bg-[#005F5A]/10 text-[#005F5A] flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#1C2524]">
                    Brand Identity & Contact Coordinates
                  </h3>
                  <p className="text-[11px] text-[#728280]">
                    Phone numbers, WhatsApp gateway, email, and security PIN.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">Site Brand Name:</label>
                  <input
                    type="text"
                    value={cms.siteSettings.siteName}
                    onChange={(e) => cms.updateSiteSettings({ siteName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5] text-xs text-[#1C2524] focus:outline-none focus:border-[#005F5A]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">Email Address:</label>
                  <input
                    type="email"
                    value={cms.siteSettings.email}
                    onChange={(e) => cms.updateSiteSettings({ email: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5] text-xs text-[#1C2524] focus:outline-none focus:border-[#005F5A]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">Phone Number Display:</label>
                  <input
                    type="text"
                    value={cms.siteSettings.phoneNumber}
                    onChange={(e) => cms.updateSiteSettings({ phoneNumber: e.target.value })}
                    placeholder="+212 661-234567"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5] text-xs text-[#1C2524] focus:outline-none focus:border-[#005F5A]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">
                    WhatsApp Digits (used in chat links):
                  </label>
                  <input
                    type="text"
                    value={cms.siteSettings.whatsappNumber}
                    onChange={(e) =>
                      cms.updateSiteSettings({
                        whatsappNumber: e.target.value.replace(/[^0-9]/g, ''),
                      })
                    }
                    placeholder="e.g. 212661234567"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5] text-xs text-[#1C2524] font-mono focus:outline-none focus:border-[#005F5A]"
                  />
                  <span className="text-[10px] text-[#728280] mt-0.5 block">
                    Numbers only (no plus, spaces or dashes). E.g. 212661234567
                  </span>
                </div>
                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">Admin Dashboard PIN:</label>
                  <input
                    type="text"
                    defaultValue={localStorage.getItem('fezguidetours_admin_pin') || '1234'}
                    onChange={(e) => {
                      if (e.target.value.trim()) {
                        localStorage.setItem('fezguidetours_admin_pin', e.target.value.trim());
                      }
                    }}
                    placeholder="e.g. 1234"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5] text-xs font-mono tracking-wider text-[#1C2524] focus:outline-none focus:border-[#005F5A]"
                  />
                  <span className="text-[10px] text-[#728280] mt-0.5 block">
                    Saved in browser memory. Fallback master PIN: fez2026
                  </span>
                </div>
              </div>

              {/* Social Profiles */}
              <div className="space-y-3 pt-3 border-t border-[#E7E2DA]">
                <span className="text-xs font-bold text-[#005F5A] flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Social Profiles & Online Links</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-medium text-[#52605E] mb-1">Instagram URL:</label>
                    <input
                      type="url"
                      value={cms.siteSettings.socialInstagram || ''}
                      onChange={(e) =>
                        cms.updateSiteSettings({ socialInstagram: e.target.value })
                      }
                      placeholder="https://instagram.com/..."
                      className="w-full px-3 py-1.5 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5] text-xs text-[#1C2524] focus:outline-none focus:border-[#005F5A]"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#52605E] mb-1">Facebook URL:</label>
                    <input
                      type="url"
                      value={cms.siteSettings.socialFacebook || ''}
                      onChange={(e) =>
                        cms.updateSiteSettings({ socialFacebook: e.target.value })
                      }
                      placeholder="https://facebook.com/..."
                      className="w-full px-3 py-1.5 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5] text-xs text-[#1C2524] focus:outline-none focus:border-[#005F5A]"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#52605E] mb-1">TripAdvisor URL:</label>
                    <input
                      type="url"
                      value={cms.siteSettings.socialTripadvisor || ''}
                      onChange={(e) =>
                        cms.updateSiteSettings({ socialTripadvisor: e.target.value })
                      }
                      placeholder="https://tripadvisor.com/..."
                      className="w-full px-3 py-1.5 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5] text-xs text-[#1C2524] focus:outline-none focus:border-[#005F5A]"
                    />
                  </div>
                </div>
              </div>

              {/* Office Address & Badges */}
              <div className="space-y-3 pt-3 border-t border-[#E7E2DA] text-xs">
                <span className="font-bold text-[#005F5A] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Physical Office & Meeting Addresses</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-[#52605E] mb-1">Address (English):</label>
                    <input
                      type="text"
                      value={cms.siteSettings.address.en}
                      onChange={(e) =>
                        cms.updateSiteSettings({
                          address: { ...cms.siteSettings.address, en: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5]"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#52605E] mb-1">العنوان بالعربية:</label>
                    <input
                      type="text"
                      dir="rtl"
                      value={cms.siteSettings.address.ar}
                      onChange={(e) =>
                        cms.updateSiteSettings({
                          address: { ...cms.siteSettings.address, ar: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block font-medium text-[#52605E] mb-1">
                    Official Certification / Trust Badge (EN):
                  </label>
                  <input
                    type="text"
                    value={cms.siteSettings.licenseBadge?.en || ''}
                    onChange={(e) =>
                      cms.updateSiteSettings({
                        licenseBadge: { ...cms.siteSettings.licenseBadge, en: e.target.value },
                      })
                    }
                    placeholder="e.g. Local Native Hosts & Certified Medina Guides"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5]"
                  />
                </div>
              </div>
            </div>

            {/* CARD 3: BACKUP, RESTORE & DATA INTEGRITY */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E7E2DA] space-y-6 shadow-xs">
              <div className="flex items-center gap-2.5 border-b border-[#E7E2DA] pb-4">
                <div className="w-9 h-9 rounded-xl bg-[#005F5A]/10 text-[#005F5A] flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#1C2524]">
                    Cloudflare Static Persistence & JSON Backups
                  </h3>
                  <p className="text-[11px] text-[#728280]">
                    Download a full JSON snapshot of all your tours, custom pages, FAQs, and guides.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Export Backup Card */}
                <div className="p-4 rounded-2xl border border-[#E7E2DA] bg-[#FAF8F5] space-y-2">
                  <h4 className="text-xs font-bold text-[#1C2524] flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-[#005F5A]" />
                    <span>Download JSON Backup</span>
                  </h4>
                  <p className="text-[11px] text-[#728280] leading-relaxed">
                    Saves all tours, itineraries, FAQs, blog articles, and settings as a portable JSON file to your device.
                  </p>
                  <button
                    type="button"
                    onClick={cms.exportBackup}
                    className="mt-2 w-full py-2 px-3 bg-[#005F5A] hover:bg-[#004A46] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Backup Now</span>
                  </button>
                </div>

                {/* Import Backup Card */}
                <div className="p-4 rounded-2xl border border-[#E7E2DA] bg-[#FAF8F5] space-y-2">
                  <h4 className="text-xs font-bold text-[#1C2524] flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-[#C84B31]" />
                    <span>Restore from Backup</span>
                  </h4>
                  <p className="text-[11px] text-[#728280] leading-relaxed">
                    Select a previously downloaded `.json` backup file to instantly reload all website data.
                  </p>
                  <label className="mt-2 w-full py-2 px-3 border border-[#D5CEC4] bg-white hover:bg-[#FAF8F5] text-[#1C2524] text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-[#C84B31]" />
                    <span>Choose Backup File</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Danger Zone: Factory Reset */}
              <div className="pt-4 border-t border-[#E7E2DA] flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => {
                    askConfirm(
                      'Reset All Content to Factory Defaults?',
                      'This will restore all default tours, pages, FAQs, and guides. Any custom additions will be cleared.',
                      () => {
                        cms.resetToDefaults();
                        showToast('Content reset to factory defaults.');
                      },
                      'Reset Everything'
                    );
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 border border-[#C84B31] text-[#C84B31] hover:bg-[#C84B31]/10 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Factory Defaults</span>
                </button>

                <button
                  type="button"
                  onClick={() => showToast('All settings and hero changes saved!')}
                  className="px-6 py-2.5 bg-[#005F5A] hover:bg-[#004A46] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save All Settings</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Universal In-App Confirmation Modal (Zero window.confirm, 100% works in any sandbox or iframe) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full space-y-4 shadow-2xl border border-[#E7E2DA]">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-[#C84B31] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-[#1C2524]">{confirmModal.title}</h3>
              <p className="text-xs text-[#52605E] leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 px-3 border border-[#D5CEC4] rounded-xl text-xs font-bold text-[#52605E] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const action = confirmModal.onConfirm;
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                  action();
                }}
                className="flex-1 py-2.5 px-3 bg-[#C84B31] hover:bg-[#B33D25] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                {confirmModal.confirmLabel || 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
