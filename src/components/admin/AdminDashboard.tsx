import React, { useState } from 'react';
import { useCms } from '../../context/CmsContext';
import {
  SectionPillar,
  CustomPage,
  BlogPost,
  TeamMember,
  BookingRecord,
  Language,
} from '../../types';
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
} from 'lucide-react';

interface AdminDashboardProps {
  onClose: () => void;
  language: Language;
}

type AdminTab = 'tours' | 'pages' | 'blog' | 'team' | 'bookings' | 'settings';

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
}) => {
  const cms = useCms();
  const [activeTab, setActiveTab] = useState<AdminTab>('tours');
  const [tourFilter, setTourFilter] = useState<string>('all');

  // Edit / Create States
  const [editingTour, setEditingTour] = useState<SectionPillar | null>(null);
  const [editingPage, setEditingPage] = useState<CustomPage | null>(null);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [editingTeam, setEditingTeam] = useState<TeamMember | null>(null);

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
                      image: '/src/assets/images/real/fez_explore_medina_image1.jpg',
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

            {/* Tour Edit Drawer / Modal */}
            {editingTour && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
                <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E7E2DA] p-6 sm:p-8 my-8 space-y-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-4">
                    <h3 className="text-base font-extrabold text-[#1C2524]">
                      Edit Tour: {editingTour.title.en}
                    </h3>
                    <button
                      onClick={() => setEditingTour(null)}
                      className="p-1 text-[#728280] hover:text-[#1C2524]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-[#2A3735] mb-1">
                        Department / Page:
                      </label>
                      <select
                        value={editingTour.pageId}
                        onChange={(e) =>
                          setEditingTour({ ...editingTour, pageId: e.target.value as any })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5]"
                      >
                        <option value="fez">Fez</option>
                        <option value="day-trips">Day Trips from Fez</option>
                        <option value="food-tours">Food & Tasting Tours</option>
                        <option value="travel-tips">Travel Tips</option>
                      </select>
                    </div>

                    <div className="space-y-2 p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E2DA]">
                      <span className="font-bold text-[#005F5A] block">Titles (Multilingual)</span>
                      <div>
                        <span className="text-[10px] text-[#728280]">English:</span>
                        <input
                          type="text"
                          value={editingTour.title.en}
                          onChange={(e) =>
                            setEditingTour({
                              ...editingTour,
                              title: { ...editingTour.title, en: e.target.value },
                            })
                          }
                          className="w-full px-3 py-1.5 rounded-lg border border-[#D5CEC4] bg-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-[#728280]">Français:</span>
                        <input
                          type="text"
                          value={editingTour.title.fr}
                          onChange={(e) =>
                            setEditingTour({
                              ...editingTour,
                              title: { ...editingTour.title, fr: e.target.value },
                            })
                          }
                          className="w-full px-3 py-1.5 rounded-lg border border-[#D5CEC4] bg-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-[#728280]">العربية:</span>
                        <input
                          type="text"
                          value={editingTour.title.ar}
                          onChange={(e) =>
                            setEditingTour({
                              ...editingTour,
                              title: { ...editingTour.title, ar: e.target.value },
                            })
                          }
                          className="w-full px-3 py-1.5 rounded-lg border border-[#D5CEC4] bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E2DA]">
                      <span className="font-bold text-[#005F5A] block">Short Description</span>
                      <textarea
                        rows={2}
                        value={editingTour.shortDescription.en}
                        onChange={(e) =>
                          setEditingTour({
                            ...editingTour,
                            shortDescription: {
                              ...editingTour.shortDescription,
                              en: e.target.value,
                            },
                          })
                        }
                        placeholder="English description..."
                        className="w-full px-3 py-1.5 rounded-lg border border-[#D5CEC4] bg-white"
                      />
                      <textarea
                        rows={2}
                        value={editingTour.shortDescription.ar}
                        onChange={(e) =>
                          setEditingTour({
                            ...editingTour,
                            shortDescription: {
                              ...editingTour.shortDescription,
                              ar: e.target.value,
                            },
                          })
                        }
                        placeholder="الوصف بالعربية..."
                        className="w-full px-3 py-1.5 rounded-lg border border-[#D5CEC4] bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-[#2A3735] mb-1">Price (MAD):</label>
                        <input
                          type="number"
                          value={editingTour.practicalInfo?.priceMAD || 0}
                          onChange={(e) =>
                            setEditingTour({
                              ...editingTour,
                              practicalInfo: {
                                ...(editingTour.practicalInfo || {
                                  duration: { en: '', fr: '', ar: '' },
                                }),
                                priceMAD: parseInt(e.target.value) || 0,
                                priceEUR: Math.round((parseInt(e.target.value) || 0) / 10.8),
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#2A3735] mb-1">Duration (EN):</label>
                        <input
                          type="text"
                          value={editingTour.practicalInfo?.duration.en || '4 hours'}
                          onChange={(e) =>
                            setEditingTour({
                              ...editingTour,
                              practicalInfo: {
                                ...(editingTour.practicalInfo || { priceMAD: 0 }),
                                duration: {
                                  ...(editingTour.practicalInfo?.duration || { fr: '', ar: '' }),
                                  en: e.target.value,
                                },
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#2A3735] mb-1">Image Path/URL:</label>
                        <input
                          type="text"
                          value={editingTour.image}
                          onChange={(e) => setEditingTour({ ...editingTour, image: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[#E7E2DA]">
                    <button
                      onClick={() => {
                        askConfirm(
                          `Delete Tour "${editingTour.title.en}"?`,
                          'Are you sure you want to permanently delete this tour?',
                          () => {
                            cms.deleteTour(editingTour.id);
                            setEditingTour(null);
                            showToast('Tour deleted.');
                          }
                        );
                      }}
                      className="px-3 py-2 text-xs font-bold text-[#C84B31] hover:bg-red-50 rounded-xl cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Tour</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingTour(null)}
                        className="px-4 py-2 text-xs font-bold text-[#52605E] hover:bg-[#FAF8F5] rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          cms.updateTour(editingTour.id, editingTour);
                          setEditingTour(null);
                          showToast('Tour changes saved!');
                        }}
                        className="px-5 py-2.5 bg-[#005F5A] hover:bg-[#004A46] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CUSTOM PAGES */}
        {activeTab === 'pages' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#1C2524]">
                  Custom Standalone Pages Builder
                </h2>
                <p className="text-xs text-[#52605E]">
                  Create new pages (e.g. Sahara Desert, Cooking Classes, FAQ) and toggle whether they appear in the top navigation bar.
                </p>
              </div>

              <button
                onClick={() => {
                  const newPage: CustomPage = {
                    id: 'page-' + Date.now(),
                    slug: 'new-experience-' + Math.floor(Math.random() * 1000),
                    title: {
                      en: 'New Custom Experience',
                      fr: 'Nouvelle Expérience',
                      ar: 'صفحة جديدة ومخصصة',
                    },
                    subtitle: {
                      en: 'Tailored Fez Special',
                      fr: 'Programme Spécial Fès',
                      ar: 'برنامج سياحي مميز',
                    },
                    heroImage: '/src/assets/images/real/fez_explore_medina_image1.jpg',
                    content: {
                      en: 'Detailed content for this new custom page.',
                      fr: 'Contenu détaillé pour cette nouvelle page.',
                      ar: 'المحتوى والشرح الكامل لهذه الصفحة الجديدة.',
                    },
                    highlights: {
                      en: ['Private transport included', 'Professional licensed guide'],
                      fr: ['Transport privé inclus', 'Guide officiel agréé'],
                      ar: ['نقل خاص متضمن', 'مرشد سياحي معتمد'],
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

            {/* Custom Pages List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cms.customPages.map((page) => (
                <div
                  key={page.id}
                  className="bg-white rounded-2xl border border-[#E7E2DA] p-6 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-[#005F5A] bg-[#005F5A]/10 px-2 py-0.5 rounded-md">
                        /{page.slug}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          page.showInNav
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {page.showInNav ? 'Shown in Menu' : 'Hidden from Menu'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[#1C2524]">
                      {page.title.en} / {page.title.ar}
                    </h3>
                    <p className="text-xs text-[#52605E] line-clamp-2">
                      {page.content.en}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#F2ECE4]">
                    <span className="text-[11px] text-[#728280]">Created: {page.createdAt}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingPage(page)}
                        className="py-1 px-3 bg-[#FAF8F5] hover:bg-[#005F5A] text-[#005F5A] hover:text-white border border-[#D5CEC4] text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Edit Page
                      </button>
                      <button
                        onClick={() => {
                          askConfirm(
                            `Delete Page "${page.title[language] || page.title.en}"?`,
                            `This will permanently remove "/${page.slug}" from your website.`,
                            () => {
                              cms.deleteCustomPage(page.id);
                              showToast('Page deleted successfully.');
                            }
                          );
                        }}
                        className="p-1.5 text-[#728280] hover:text-[#C84B31] cursor-pointer"
                        title="Delete page"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Page Edit Modal */}
            {editingPage && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
                <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E7E2DA] p-6 sm:p-8 my-8 space-y-6 max-h-[90vh] overflow-y-auto text-xs">
                  <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-4">
                    <h3 className="text-base font-extrabold text-[#1C2524]">
                      Edit Custom Page: {editingPage.slug}
                    </h3>
                    <button onClick={() => setEditingPage(null)}>
                      <X className="w-5 h-5 text-[#728280]" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold mb-1">Page URL Slug:</label>
                      <input
                        type="text"
                        value={editingPage.slug}
                        onChange={(e) => setEditingPage({ ...editingPage, slug: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Show in Main Nav Menu?</label>
                      <select
                        value={editingPage.showInNav ? 'yes' : 'no'}
                        onChange={(e) =>
                          setEditingPage({ ...editingPage, showInNav: e.target.value === 'yes' })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5]"
                      >
                        <option value="yes">Yes (Visible in Navbar)</option>
                        <option value="no">No (Direct Link Only)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA]">
                    <span className="font-bold text-[#005F5A] block">Page Titles</span>
                    <input
                      type="text"
                      placeholder="Title in English"
                      value={editingPage.title.en}
                      onChange={(e) =>
                        setEditingPage({
                          ...editingPage,
                          title: { ...editingPage.title, en: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Titre en Français"
                      value={editingPage.title.fr}
                      onChange={(e) =>
                        setEditingPage({
                          ...editingPage,
                          title: { ...editingPage.title, fr: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white"
                    />
                    <input
                      type="text"
                      placeholder="العنوان بالعربية"
                      value={editingPage.title.ar}
                      onChange={(e) =>
                        setEditingPage({
                          ...editingPage,
                          title: { ...editingPage.title, ar: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white"
                    />
                  </div>

                  <div className="space-y-3 p-4 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA]">
                    <span className="font-bold text-[#005F5A] block">Content Body</span>
                    <textarea
                      rows={3}
                      placeholder="Content in English..."
                      value={editingPage.content.en}
                      onChange={(e) =>
                        setEditingPage({
                          ...editingPage,
                          content: { ...editingPage.content, en: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white"
                    />
                    <textarea
                      rows={3}
                      placeholder="المحتوى بالعربية..."
                      value={editingPage.content.ar}
                      onChange={(e) =>
                        setEditingPage({
                          ...editingPage,
                          content: { ...editingPage.content, ar: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[#E7E2DA]">
                    <button
                      onClick={() => {
                        askConfirm(
                          `Delete Page "${editingPage.title.en}"?`,
                          `Are you sure you want to permanently delete "/${editingPage.slug}"?`,
                          () => {
                            cms.deleteCustomPage(editingPage.id);
                            setEditingPage(null);
                            showToast('Page deleted.');
                          }
                        );
                      }}
                      className="px-3 py-2 font-bold text-[#C84B31] hover:bg-red-50 rounded-xl cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Page</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingPage(null)}
                        className="px-4 py-2 font-bold text-[#52605E]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          cms.updateCustomPage(editingPage.id, editingPage);
                          setEditingPage(null);
                          showToast('Custom page saved!');
                        }}
                        className="px-5 py-2.5 bg-[#005F5A] hover:bg-[#004A46] text-white font-bold rounded-xl cursor-pointer"
                      >
                        Save Page
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                    coverImage: '/src/assets/images/real/daytrip_chefchaouen_image1.jpg',
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

            {/* Blog Edit Modal */}
            {editingBlog && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
                <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E7E2DA] p-6 sm:p-8 my-8 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
                  <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-3">
                    <h3 className="text-base font-extrabold text-[#1C2524]">
                      Edit Article: {editingBlog.title.en}
                    </h3>
                    <button onClick={() => setEditingBlog(null)}>
                      <X className="w-5 h-5 text-[#728280]" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">Author Name:</label>
                      <input
                        type="text"
                        value={editingBlog.author}
                        onChange={(e) => setEditingBlog({ ...editingBlog, author: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Date:</label>
                      <input
                        type="date"
                        value={editingBlog.date}
                        onChange={(e) => setEditingBlog({ ...editingBlog, date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E2DA]">
                    <span className="font-bold text-[#005F5A]">Article Titles</span>
                    <input
                      type="text"
                      placeholder="Title in English"
                      value={editingBlog.title.en}
                      onChange={(e) =>
                        setEditingBlog({
                          ...editingBlog,
                          title: { ...editingBlog.title, en: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-[#D5CEC4] bg-white"
                    />
                    <input
                      type="text"
                      placeholder="العنوان بالعربية"
                      value={editingBlog.title.ar}
                      onChange={(e) =>
                        setEditingBlog({
                          ...editingBlog,
                          title: { ...editingBlog.title, ar: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-[#D5CEC4] bg-white"
                    />
                  </div>

                  <div className="space-y-2 p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E2DA]">
                    <span className="font-bold text-[#005F5A]">Full Article Content</span>
                    <textarea
                      rows={5}
                      placeholder="Full content in English..."
                      value={editingBlog.content.en}
                      onChange={(e) =>
                        setEditingBlog({
                          ...editingBlog,
                          content: { ...editingBlog.content, en: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#D5CEC4] bg-white"
                    />
                    <textarea
                      rows={5}
                      placeholder="المحتوى الكامل بالعربية..."
                      value={editingBlog.content.ar}
                      onChange={(e) =>
                        setEditingBlog({
                          ...editingBlog,
                          content: { ...editingBlog.content, ar: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#D5CEC4] bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#E7E2DA]">
                    <button
                      onClick={() => {
                        askConfirm(
                          `Delete Article "${editingBlog.title.en}"?`,
                          'Are you sure you want to permanently delete this article?',
                          () => {
                            cms.deleteBlogPost(editingBlog.id);
                            setEditingBlog(null);
                            showToast('Article deleted.');
                          }
                        );
                      }}
                      className="px-3 py-2 font-bold text-[#C84B31] hover:bg-red-50 rounded-xl cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Article</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingBlog(null)}
                        className="px-4 py-2 font-bold text-[#52605E]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          cms.updateBlogPost(editingBlog.id, editingBlog);
                          setEditingBlog(null);
                          showToast('Article saved!');
                        }}
                        className="px-5 py-2 bg-[#005F5A] hover:bg-[#004A46] text-white font-bold rounded-xl cursor-pointer"
                      >
                        Save Article
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                    avatarUrl: '/src/assets/images/real/about_us_image1.jpg',
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

            {/* Team Edit Modal */}
            {editingTeam && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
                <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#E7E2DA] p-6 space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-2">
                    <h3 className="text-base font-extrabold">Edit Guide: {editingTeam.name}</h3>
                    <button onClick={() => setEditingTeam(null)}>
                      <X className="w-5 h-5 text-[#728280]" />
                    </button>
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Full Name:</label>
                    <input
                      type="text"
                      value={editingTeam.name}
                      onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#D5CEC4] bg-[#FAF8F5]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Role (English):</label>
                    <input
                      type="text"
                      value={editingTeam.role.en}
                      onChange={(e) =>
                        setEditingTeam({
                          ...editingTeam,
                          role: { ...editingTeam.role, en: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-[#D5CEC4] bg-[#FAF8F5]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Ministerial License Number:</label>
                    <input
                      type="text"
                      value={editingTeam.licenseNumber || ''}
                      onChange={(e) =>
                        setEditingTeam({ ...editingTeam, licenseNumber: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-[#D5CEC4] bg-[#FAF8F5]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Bio (English):</label>
                    <textarea
                      rows={3}
                      value={editingTeam.bio.en}
                      onChange={(e) =>
                        setEditingTeam({
                          ...editingTeam,
                          bio: { ...editingTeam.bio, en: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-[#D5CEC4] bg-[#FAF8F5]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E2DA]">
                    <button
                      onClick={() => setEditingTeam(null)}
                      className="px-3 py-1.5 font-bold text-[#52605E]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        cms.updateTeamMember(editingTeam.id, editingTeam);
                        setEditingTeam(null);
                        showToast('Guide details saved!');
                      }}
                      className="px-4 py-1.5 bg-[#005F5A] text-white font-bold rounded-xl cursor-pointer"
                    >
                      Save Guide
                    </button>
                  </div>
                </div>
              </div>
            )}
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

        {/* TAB 6: SITE SETTINGS & BACKUP */}
        {activeTab === 'settings' && (
          <div className="bg-white p-8 rounded-3xl border border-[#E7E2DA] space-y-6 shadow-xs max-w-3xl">
            <div>
              <h2 className="text-lg font-extrabold text-[#1C2524]">
                Global Site Settings & Contact Coordinates
              </h2>
              <p className="text-xs text-[#52605E]">
                Update telephone numbers, WhatsApp contact, office location, and legal badges.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">Site Brand Name:</label>
                  <input
                    type="text"
                    value={cms.siteSettings.siteName}
                    onChange={(e) => cms.updateSiteSettings({ siteName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">Email Address:</label>
                  <input
                    type="email"
                    value={cms.siteSettings.email}
                    onChange={(e) => cms.updateSiteSettings({ email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">Phone Number Display:</label>
                  <input
                    type="text"
                    value={cms.siteSettings.phoneNumber}
                    onChange={(e) => cms.updateSiteSettings({ phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">WhatsApp Digits (for links):</label>
                  <input
                    type="text"
                    value={cms.siteSettings.whatsappNumber}
                    onChange={(e) => cms.updateSiteSettings({ whatsappNumber: e.target.value })}
                    placeholder="e.g. 212661234567"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#2A3735] mb-1">Office Address (English):</label>
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
                <label className="block font-bold text-[#2A3735] mb-1">العنوان بالعربية:</label>
                <input
                  type="text"
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

            <div className="pt-6 border-t border-[#E7E2DA] flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                onClick={() => {
                  askConfirm(
                    'Reset All Content to Factory Defaults?',
                    'This will restore all default tours, pages, and guides. Any custom additions will be cleared.',
                    () => {
                      cms.resetToDefaults();
                      showToast('Content reset to factory defaults.');
                    },
                    'Reset Everything'
                  );
                }}
                className="flex items-center gap-1.5 px-4 py-2 border border-[#C84B31] text-[#C84B31] hover:bg-[#C84B31]/10 text-xs font-bold rounded-xl cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Factory Defaults</span>
              </button>

              <button
                onClick={() => showToast('Settings saved successfully!')}
                className="px-6 py-2.5 bg-[#005F5A] hover:bg-[#004A46] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Save Settings
              </button>
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
