import React, { useState, useEffect } from 'react';
import { SectionPillar, Language, ItineraryStop } from '../../types';
import { ImagePickerField } from './ImagePickerField';
import { GalleryManagerField } from './GalleryManagerField';
import {
  X,
  Save,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Check,
  MapPin,
  Clock,
  Users,
  DollarSign,
  Compass,
  Image as ImageIcon,
  ListPlus,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface TourEditorModalProps {
  tour: SectionPillar | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTour: SectionPillar) => void;
  onDelete: (tourId: string) => void;
}

type EditorSubTab = 'info' | 'media' | 'itinerary' | 'inclusions' | 'pricing';

export const TourEditorModal: React.FC<TourEditorModalProps> = ({
  tour,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState<EditorSubTab>('info');
  const [formData, setFormData] = useState<SectionPillar | null>(null);
  const [editLang, setEditLang] = useState<Language>('en');

  useEffect(() => {
    if (tour) {
      setFormData({
        ...tour,
        published: tour.published !== false,
        galleryImages: tour.galleryImages || (tour.image ? [tour.image] : []),
        itinerary: tour.itinerary || [],
        included: tour.included || { en: [], fr: [], ar: [] },
        excluded: tour.excluded || { en: [], fr: [], ar: [] },
        whatToBring: tour.whatToBring || { en: [], fr: [], ar: [] },
        meetingPointDetails: tour.meetingPointDetails || { en: '', fr: '', ar: '' },
      });
      setActiveTab('info');
      setEditLang('en');
    }
  }, [tour, isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !formData) return null;

  // Itinerary Stops Helper Functions
  const handleAddStop = () => {
    const newStop: ItineraryStop = {
      time: '10:00 AM',
      title: { en: 'New Historic Stop', fr: 'Nouvelle Étape', ar: 'محطة جديدة' },
      description: {
        en: 'Detailed narrative description of what travelers will experience at this stop.',
        fr: 'Description détaillée de ce que les voyageurs découvriront à cette étape.',
        ar: 'وصف تفصيلي لما سيستكشفه الزوار في هذه المحطة التراثية.',
      },
      badge: { en: 'Sightseeing', fr: 'Visite', ar: 'معلم سياحي' },
    };
    setFormData({
      ...formData,
      itinerary: [...(formData.itinerary || []), newStop],
    });
  };

  const handleUpdateStop = (index: number, updatedStop: Partial<ItineraryStop>) => {
    const current = [...(formData.itinerary || [])];
    current[index] = { ...current[index], ...updatedStop };
    setFormData({ ...formData, itinerary: current });
  };

  const handleRemoveStop = (index: number) => {
    const current = [...(formData.itinerary || [])];
    current.splice(index, 1);
    setFormData({ ...formData, itinerary: current });
  };

  const handleMoveStop = (index: number, direction: 'up' | 'down') => {
    const current = [...(formData.itinerary || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= current.length) return;
    const temp = current[index];
    current[index] = current[targetIdx];
    current[targetIdx] = temp;
    setFormData({ ...formData, itinerary: current });
  };

  // List Item Helper (Included / Excluded / What to Bring / Highlights)
  const handleAddListItem = (
    field: 'included' | 'excluded' | 'whatToBring' | 'highlights',
    lang: Language
  ) => {
    const list = formData[field] || { en: [], fr: [], ar: [] };
    const currentItems = list[lang] || [];
    setFormData({
      ...formData,
      [field]: {
        ...list,
        [lang]: [...currentItems, 'New item'],
      },
    });
  };

  const handleUpdateListItem = (
    field: 'included' | 'excluded' | 'whatToBring' | 'highlights',
    lang: Language,
    index: number,
    value: string
  ) => {
    const list = formData[field] || { en: [], fr: [], ar: [] };
    const currentItems = [...(list[lang] || [])];
    currentItems[index] = value;
    setFormData({
      ...formData,
      [field]: {
        ...list,
        [lang]: currentItems,
      },
    });
  };

  const handleRemoveListItem = (
    field: 'included' | 'excluded' | 'whatToBring' | 'highlights',
    lang: Language,
    index: number
  ) => {
    const list = formData[field] || { en: [], fr: [], ar: [] };
    const currentItems = (list[lang] || []).filter((_, idx) => idx !== index);
    setFormData({
      ...formData,
      [field]: {
        ...list,
        [lang]: currentItems,
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs overflow-y-auto text-[#1C2524]"
    >
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-[#E7E2DA] flex flex-col max-h-[92vh] overflow-hidden my-4">
        {/* Sticky Top Header */}
        <div className="px-6 py-4 border-b border-[#E7E2DA] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#005F5A] text-white flex items-center justify-center font-bold">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-[#1C2524] truncate max-w-md">
                  {formData.title[editLang] || formData.title.en}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-[#005F5A]/10 text-[#005F5A] font-mono text-[10px] font-bold">
                  {formData.id}
                </span>
              </div>
              <p className="text-[11px] text-[#728280]">
                Full tour customization with real-time site updates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live / Draft Toggle */}
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.published !== false}
                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                className="w-4 h-4 rounded text-[#005F5A] focus:ring-[#005F5A]"
              />
              <span className={formData.published !== false ? 'text-[#005F5A]' : 'text-amber-600'}>
                {formData.published !== false ? 'Published (Live)' : 'Draft (Hidden)'}
              </span>
            </label>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#728280] hover:text-[#1C2524] rounded-full hover:bg-[#F2ECE4] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 px-6 pt-2 border-b border-[#E7E2DA] bg-[#FAF8F5] overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-3 px-3 font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'info'
                ? 'border-[#005F5A] text-[#005F5A]'
                : 'border-transparent text-[#728280] hover:text-[#1C2524]'
            }`}
          >
            Basic Info & Text
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`pb-3 px-3 font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'media'
                ? 'border-[#005F5A] text-[#005F5A]'
                : 'border-transparent text-[#728280] hover:text-[#1C2524]'
            }`}
          >
            Cover & Gallery Photos
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('itinerary')}
            className={`pb-3 px-3 font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'itinerary'
                ? 'border-[#005F5A] text-[#005F5A]'
                : 'border-transparent text-[#728280] hover:text-[#1C2524]'
            }`}
          >
            <span>Itinerary Stops</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#005F5A]/15 text-[#005F5A] text-[10px]">
              {(formData.itinerary || []).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inclusions')}
            className={`pb-3 px-3 font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'inclusions'
                ? 'border-[#005F5A] text-[#005F5A]'
                : 'border-transparent text-[#728280] hover:text-[#1C2524]'
            }`}
          >
            Inclusions & Highlights
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`pb-3 px-3 font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'pricing'
                ? 'border-[#005F5A] text-[#005F5A]'
                : 'border-transparent text-[#728280] hover:text-[#1C2524]'
            }`}
          >
            Pricing & Logistics
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 text-xs space-y-6">
          {/* TAB 1: BASIC INFO & TEXT */}
          {activeTab === 'info' && (
            <div className="space-y-5">
              {/* Category & Action Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA]">
                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">
                    Website Section / Category:
                  </label>
                  <select
                    value={formData.pageId}
                    onChange={(e) => setFormData({ ...formData, pageId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white font-medium"
                  >
                    <option value="fez">Fez Medina & Heritage Tours</option>
                    <option value="day-trips">Day Trips (Chefchaouen, Volubilis, Ifrane)</option>
                    <option value="food-tours">Moroccan Food Tours & Tastings</option>
                    <option value="travel-tips">Travel Tips & Practical Advice</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">
                    Primary Action Type:
                  </label>
                  <select
                    value={formData.actionType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        actionType: e.target.value as SectionPillar['actionType'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white font-medium"
                  >
                    <option value="book_tour">Book Tour (Opens Booking Flow)</option>
                    <option value="explore">Explore Experience Details</option>
                    <option value="view_more">View More</option>
                  </select>
                </div>
              </div>

              {/* Language Switcher Bar */}
              <div className="flex items-center justify-between p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E7E2DA]">
                <span className="text-[11px] font-bold text-[#52605E]">
                  Editing Language Content:
                </span>
                <div className="flex items-center gap-1.5">
                  {(['en', 'fr', 'ar'] as Language[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setEditLang(l)}
                      className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                        editLang === l
                          ? 'bg-[#005F5A] text-white shadow-xs'
                          : 'bg-white text-[#52605E] hover:bg-[#F2ECE4]'
                      }`}
                    >
                      {l === 'en' ? 'English' : l === 'fr' ? 'Français' : 'العربية'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Multilingual Titles & Subtitles */}
              <div className="space-y-4 p-4 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA]">
                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">
                    Tour Title ({editLang.toUpperCase()}):
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title[editLang] || ''}
                    dir={editLang === 'ar' ? 'rtl' : 'ltr'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        title: { ...formData.title, [editLang]: e.target.value },
                      })
                    }
                    placeholder="e.g. Fez Medina Walking Tour"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white font-semibold text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">
                    Subtitle / Catchphrase ({editLang.toUpperCase()}):
                  </label>
                  <input
                    type="text"
                    value={formData.subtitle[editLang] || ''}
                    dir={editLang === 'ar' ? 'rtl' : 'ltr'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        subtitle: { ...formData.subtitle, [editLang]: e.target.value },
                      })
                    }
                    placeholder="e.g. Historic Alleys, Souks & Architectural Masterpieces"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">
                    Short Description / Card Teaser ({editLang.toUpperCase()}):
                  </label>
                  <textarea
                    rows={2}
                    value={formData.shortDescription[editLang] || ''}
                    dir={editLang === 'ar' ? 'rtl' : 'ltr'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shortDescription: {
                          ...formData.shortDescription,
                          [editLang]: e.target.value,
                        },
                      })
                    }
                    placeholder="Brief 2-sentence summary shown on category cards..."
                    className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">
                    Full Narrative Prose ({editLang.toUpperCase()}):
                  </label>
                  <textarea
                    rows={5}
                    value={formData.fullDescription[editLang] || ''}
                    dir={editLang === 'ar' ? 'rtl' : 'ltr'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fullDescription: {
                          ...formData.fullDescription,
                          [editLang]: e.target.value,
                        },
                      })
                    }
                    placeholder="Deep, rich narrative story shown on the dedicated tour details page..."
                    className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white font-normal leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MEDIA & GALLERY */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA]">
                <ImagePickerField
                  label="Primary Cover Photo"
                  value={formData.image}
                  onChange={(newPath) => setFormData({ ...formData, image: newPath })}
                  helperText="Primary photo shown on homepage cards, listings, and details top hero."
                />
              </div>

              <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA]">
                <GalleryManagerField
                  label="Tour Photo Gallery"
                  images={formData.galleryImages || []}
                  onChange={(updated) => setFormData({ ...formData, galleryImages: updated })}
                  helperText="Add multiple photos that visitors can swipe through on the tour details page."
                />
              </div>
            </div>
          )}

          {/* TAB 3: ITINERARY STOPS BUILDER */}
          {activeTab === 'itinerary' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[#1C2524]">
                    Step-by-Step Itinerary Stops ({formData.itinerary?.length || 0})
                  </h4>
                  <p className="text-[11px] text-[#728280]">
                    Build a timeline of key monuments, artisan workshops, and tasting stops.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddStop}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#005F5A] hover:bg-[#004A46] text-white font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Itinerary Stop</span>
                </button>
              </div>

              {(formData.itinerary || []).length === 0 ? (
                <div
                  onClick={handleAddStop}
                  className="border-2 border-dashed border-[#D5CEC4] hover:border-[#005F5A] rounded-2xl p-8 text-center bg-[#FAF8F5] hover:bg-[#F2ECE4]/40 transition-colors cursor-pointer space-y-2"
                >
                  <Clock className="w-8 h-8 mx-auto text-[#728280]" />
                  <p className="font-bold text-sm text-[#1C2524]">No itinerary stops added yet</p>
                  <p className="text-xs text-[#728280]">
                    Click here to add the first stop to this tour's timeline.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(formData.itinerary || []).map((stop, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA] space-y-3 relative group"
                    >
                      {/* Stop Header */}
                      <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#005F5A] text-white flex items-center justify-center font-bold text-xs">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-xs text-[#1C2524]">
                            Stop #{idx + 1}: {stop.title[editLang] || stop.title.en}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveStop(idx, 'up')}
                            className="p-1.5 text-[#52605E] hover:text-[#1C2524] disabled:opacity-30 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === (formData.itinerary || []).length - 1}
                            onClick={() => handleMoveStop(idx, 'down')}
                            className="p-1.5 text-[#52605E] hover:text-[#1C2524] disabled:opacity-30 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveStop(idx)}
                            className="p-1.5 text-red-600 hover:text-red-700 cursor-pointer"
                            title="Delete Stop"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Stop Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-[#2A3735] mb-1">Time / Timing:</label>
                          <input
                            type="text"
                            value={stop.time || ''}
                            onChange={(e) => handleUpdateStop(idx, { time: e.target.value })}
                            placeholder="e.g. 09:30 AM or 1 Hour"
                            className="w-full px-3 py-1.5 rounded-lg border border-[#D5CEC4] bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-[#2A3735] mb-1">
                            Badge / Theme Tag ({editLang.toUpperCase()}):
                          </label>
                          <input
                            type="text"
                            value={stop.badge?.[editLang] || ''}
                            dir={editLang === 'ar' ? 'rtl' : 'ltr'}
                            onChange={(e) =>
                              handleUpdateStop(idx, {
                                badge: {
                                  ...(stop.badge || { en: '', fr: '', ar: '' }),
                                  [editLang]: e.target.value,
                                },
                              })
                            }
                            placeholder="e.g. Architectural Icon or Tasting Stop"
                            className="w-full px-3 py-1.5 rounded-lg border border-[#D5CEC4] bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-[#2A3735] mb-1">
                          Stop Title ({editLang.toUpperCase()}):
                        </label>
                        <input
                          type="text"
                          value={stop.title[editLang] || ''}
                          dir={editLang === 'ar' ? 'rtl' : 'ltr'}
                          onChange={(e) =>
                            handleUpdateStop(idx, {
                              title: { ...stop.title, [editLang]: e.target.value },
                            })
                          }
                          placeholder="e.g. Chouara Tannery & Viewing Terrace"
                          className="w-full px-3 py-1.5 rounded-lg border border-[#D5CEC4] bg-white font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#2A3735] mb-1">
                          Stop Description ({editLang.toUpperCase()}):
                        </label>
                        <textarea
                          rows={2}
                          value={stop.description[editLang] || ''}
                          dir={editLang === 'ar' ? 'rtl' : 'ltr'}
                          onChange={(e) =>
                            handleUpdateStop(idx, {
                              description: { ...stop.description, [editLang]: e.target.value },
                            })
                          }
                          placeholder="What travelers will learn, see, and do at this stop..."
                          className="w-full px-3 py-1.5 rounded-lg border border-[#D5CEC4] bg-white leading-relaxed"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: INCLUSIONS, EXCLUSIONS & HIGHLIGHTS */}
          {activeTab === 'inclusions' && (
            <div className="space-y-6">
              {/* Highlights Manager */}
              <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#005F5A]">
                    Key Tour Highlights ({editLang.toUpperCase()})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddListItem('highlights', editLang)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#F2ECE4] border border-[#D5CEC4] rounded-lg font-bold text-[11px] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#005F5A]" />
                    <span>Add Highlight</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {(formData.highlights[editLang] || []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#005F5A] shrink-0" />
                      <input
                        type="text"
                        value={item}
                        dir={editLang === 'ar' ? 'rtl' : 'ltr'}
                        onChange={(e) =>
                          handleUpdateListItem('highlights', editLang, idx, e.target.value)
                        }
                        className="flex-1 px-3 py-1.5 rounded-lg border border-[#D5CEC4] bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveListItem('highlights', editLang, idx)}
                        className="p-1 text-red-600 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* What's Included */}
              <div className="p-4 bg-[#F0F8F6] rounded-2xl border border-[#D0EBE5] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#005F5A] flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    <span>What is Included ({editLang.toUpperCase()})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddListItem('included', editLang)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#E0F2EE] border border-[#A7D9CF] text-[#005F5A] rounded-lg font-bold text-[11px] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Included</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {(formData.included?.[editLang] || []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#00A896] shrink-0" />
                      <input
                        type="text"
                        value={item}
                        dir={editLang === 'ar' ? 'rtl' : 'ltr'}
                        onChange={(e) =>
                          handleUpdateListItem('included', editLang, idx, e.target.value)
                        }
                        className="flex-1 px-3 py-1.5 rounded-lg border border-[#A7D9CF] bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveListItem('included', editLang, idx)}
                        className="p-1 text-red-600 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* What's Excluded */}
              <div className="p-4 bg-[#FFF6F4] rounded-2xl border border-[#FBE3DC] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#C84B31] flex items-center gap-1.5">
                    <X className="w-4 h-4" />
                    <span>What is NOT Included ({editLang.toUpperCase()})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddListItem('excluded', editLang)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#FEEAE6] border border-[#F8C8BE] text-[#C84B31] rounded-lg font-bold text-[11px] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Excluded</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {(formData.excluded?.[editLang] || []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <X className="w-4 h-4 text-[#C84B31] shrink-0" />
                      <input
                        type="text"
                        value={item}
                        dir={editLang === 'ar' ? 'rtl' : 'ltr'}
                        onChange={(e) =>
                          handleUpdateListItem('excluded', editLang, idx, e.target.value)
                        }
                        className="flex-1 px-3 py-1.5 rounded-lg border border-[#F8C8BE] bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveListItem('excluded', editLang, idx)}
                        className="p-1 text-red-600 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* What to Bring */}
              <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#1C2524] flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-[#005F5A]" />
                    <span>What to Bring & Wear ({editLang.toUpperCase()})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddListItem('whatToBring', editLang)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#F2ECE4] border border-[#D5CEC4] rounded-lg font-bold text-[11px] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#005F5A]" />
                    <span>Add Tip</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {(formData.whatToBring?.[editLang] || []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#005F5A] shrink-0" />
                      <input
                        type="text"
                        value={item}
                        dir={editLang === 'ar' ? 'rtl' : 'ltr'}
                        onChange={(e) =>
                          handleUpdateListItem('whatToBring', editLang, idx, e.target.value)
                        }
                        className="flex-1 px-3 py-1.5 rounded-lg border border-[#D5CEC4] bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveListItem('whatToBring', editLang, idx)}
                        className="p-1 text-red-600 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PRICING, LOGISTICS & MEETING POINT */}
          {activeTab === 'pricing' && (
            <div className="space-y-5">
              {/* Pricing Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA]">
                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">
                    Price in Moroccan Dirhams (MAD):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={formData.practicalInfo?.priceMAD || 450}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          practicalInfo: {
                            ...(formData.practicalInfo || { duration: { en: '', fr: '', ar: '' } }),
                            priceMAD: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white font-mono font-bold text-base text-[#005F5A]"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-[#728280]">
                      MAD
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">
                    Approximate Price in Euros (€ EUR):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={formData.practicalInfo?.priceEUR || 42}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          practicalInfo: {
                            ...(formData.practicalInfo || { duration: { en: '', fr: '', ar: '' } }),
                            priceEUR: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white font-mono font-bold text-base text-[#005F5A]"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-[#728280]">
                      € EUR
                    </span>
                  </div>
                </div>
              </div>

              {/* Practical Logistics Row */}
              <div className="space-y-4 p-4 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA]">
                <h4 className="font-bold text-sm text-[#005F5A]">
                  Tour Logistics ({editLang.toUpperCase()})
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-[#2A3735] mb-1">
                      Duration:
                    </label>
                    <input
                      type="text"
                      value={formData.practicalInfo?.duration[editLang] || ''}
                      dir={editLang === 'ar' ? 'rtl' : 'ltr'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          practicalInfo: {
                            ...(formData.practicalInfo || { duration: { en: '', fr: '', ar: '' } }),
                            duration: {
                              ...(formData.practicalInfo?.duration || { en: '', fr: '', ar: '' }),
                              [editLang]: e.target.value,
                            },
                          },
                        })
                      }
                      placeholder="e.g. 4 Hours (Morning or Afternoon)"
                      className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#2A3735] mb-1">
                      Group Size Limit:
                    </label>
                    <input
                      type="text"
                      value={formData.practicalInfo?.groupSize?.[editLang] || ''}
                      dir={editLang === 'ar' ? 'rtl' : 'ltr'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          practicalInfo: {
                            ...(formData.practicalInfo || { duration: { en: '', fr: '', ar: '' } }),
                            groupSize: {
                              ...(formData.practicalInfo?.groupSize || { en: '', fr: '', ar: '' }),
                              [editLang]: e.target.value,
                            },
                          },
                        })
                      }
                      placeholder="e.g. Private (1 to 6 people)"
                      className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">
                    Departure / Pickup Point:
                  </label>
                  <input
                    type="text"
                    value={formData.practicalInfo?.departure?.[editLang] || ''}
                    dir={editLang === 'ar' ? 'rtl' : 'ltr'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        practicalInfo: {
                          ...(formData.practicalInfo || { duration: { en: '', fr: '', ar: '' } }),
                          departure: {
                            ...(formData.practicalInfo?.departure || { en: '', fr: '', ar: '' }),
                            [editLang]: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="e.g. Bab Boujloud or Direct Riad Pickup"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">
                    Meeting Point Detailed Directions & Instructions:
                  </label>
                  <textarea
                    rows={2}
                    value={formData.meetingPointDetails?.[editLang] || ''}
                    dir={editLang === 'ar' ? 'rtl' : 'ltr'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        meetingPointDetails: {
                          ...(formData.meetingPointDetails || { en: '', fr: '', ar: '' }),
                          [editLang]: e.target.value,
                        },
                      })
                    }
                    placeholder="Specific landmark directions, e.g. Inside Bab Boujloud archway next to Cafe Clock..."
                    className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white"
                  />
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Sticky Bottom Footer */}
        <div className="px-6 py-4 border-t border-[#E7E2DA] bg-[#FAF8F5] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onDelete(formData.id)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Tour</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-[#D5CEC4] hover:bg-white text-[#52605E] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-[#005F5A] hover:bg-[#004A46] text-white transition-colors cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Save Tour Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
