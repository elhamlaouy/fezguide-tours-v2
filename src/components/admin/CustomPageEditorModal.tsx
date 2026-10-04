import React, { useState, useEffect } from 'react';
import { CustomPage, Language } from '../../types';
import { ImagePickerField } from './ImagePickerField';
import {
  X,
  Save,
  Trash2,
  FileText,
  Globe,
  Sparkles,
  Check,
  Plus,
  Compass,
  Eye,
  Link as LinkIcon,
  Menu,
} from 'lucide-react';

interface CustomPageEditorModalProps {
  page: CustomPage | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPage: CustomPage) => void;
  onDelete?: (pageId: string) => void;
  onPreview?: (slug: string) => void;
}

type PageEditorTab = 'info' | 'media' | 'content' | 'highlights';

export const CustomPageEditorModal: React.FC<CustomPageEditorModalProps> = ({
  page,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onPreview,
}) => {
  const [activeTab, setActiveTab] = useState<PageEditorTab>('info');
  const [activeLang, setActiveLang] = useState<Language>('en');
  const [formData, setFormData] = useState<CustomPage | null>(null);

  useEffect(() => {
    if (page) {
      setFormData({
        ...page,
        subtitle: page.subtitle || { en: '', fr: '', ar: '' },
        highlights: page.highlights || { en: [], fr: [], ar: [] },
        published: page.published !== false,
        showInNav: !!page.showInNav,
      });
      setActiveTab('info');
      setActiveLang('en');
    }
  }, [page, isOpen]);

  if (!isOpen || !formData) return null;

  const isNew = !page?.createdAt;

  // Auto clean slug helper
  const handleSlugChange = (val: string) => {
    const cleaned = val
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-');
    setFormData({ ...formData, slug: cleaned });
  };

  // Highlights handlers
  const addHighlight = () => {
    const updated = {
      en: [...(formData.highlights?.en || []), 'New highlight in English'],
      fr: [...(formData.highlights?.fr || []), 'Nouveau point fort en Français'],
      ar: [...(formData.highlights?.ar || []), 'ميزة جديدة بالعربية'],
    };
    setFormData({ ...formData, highlights: updated });
  };

  const updateHighlight = (index: number, lang: Language, value: string) => {
    const list = [...(formData.highlights?.[lang] || [])];
    list[index] = value;
    setFormData({
      ...formData,
      highlights: {
        ...formData.highlights,
        [lang]: list,
      },
    });
  };

  const removeHighlight = (index: number) => {
    setFormData({
      ...formData,
      highlights: {
        en: (formData.highlights?.en || []).filter((_, i) => i !== index),
        fr: (formData.highlights?.fr || []).filter((_, i) => i !== index),
        ar: (formData.highlights?.ar || []).filter((_, i) => i !== index),
      },
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.slug.trim()) {
      alert('Please provide a URL slug (e.g. desert-tours)');
      return;
    }
    if (!formData.title.en.trim()) {
      alert('Please provide at least the English title.');
      return;
    }

    const sanitized: CustomPage = {
      ...formData,
      slug: formData.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
      title: {
        en: formData.title.en.trim(),
        fr: formData.title.fr.trim() || formData.title.en.trim(),
        ar: formData.title.ar.trim() || formData.title.en.trim(),
      },
      subtitle: {
        en: formData.subtitle.en.trim(),
        fr: formData.subtitle.fr.trim() || formData.subtitle.en.trim(),
        ar: formData.subtitle.ar.trim() || formData.subtitle.en.trim(),
      },
      content: {
        en: formData.content.en.trim(),
        fr: formData.content.fr.trim() || formData.content.en.trim(),
        ar: formData.content.ar.trim() || formData.content.en.trim(),
      },
    };
    onSave(sanitized);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-[#E7E2DA] p-6 sm:p-8 my-6 space-y-6 max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E2DA] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#005F5A]/10 text-[#005F5A] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-[#1C2524]">
                  {isNew ? 'Create New Custom Page' : formData.title.en || 'Edit Custom Page'}
                </h3>
                <span className="text-[11px] font-mono text-[#005F5A] bg-[#005F5A]/10 px-2 py-0.5 rounded-md">
                  /{formData.slug || 'slug'}
                </span>
              </div>
              <p className="text-[11px] text-[#728280]">
                Build bespoke landing pages with trilingual text, hero covers, and automatic navigation menu linking.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {onPreview && formData.slug && (
              <button
                type="button"
                onClick={() => onPreview(formData.slug)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D5CEC4] text-[#005F5A] hover:bg-[#FAF8F5] text-xs font-bold transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-[#728280] hover:text-[#1C2524] rounded-xl hover:bg-[#FAF8F5] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[#E7E2DA] overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'info' as PageEditorTab, label: 'Page Details & URL' },
            { id: 'media' as PageEditorTab, label: 'Hero Cover Image' },
            { id: 'content' as PageEditorTab, label: 'Article / Body Prose' },
            { id: 'highlights' as PageEditorTab, label: `Highlights (${formData.highlights?.en?.length || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#005F5A] text-white shadow-xs'
                  : 'bg-[#FAF8F5] text-[#52605E] hover:bg-[#EFEAE2] border border-[#E7E2DA]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSave} className="space-y-6 flex-1">
          {/* TAB 1: DETAILS & URL SLUG */}
          {activeTab === 'info' && (
            <div className="space-y-5">
              {/* Slug & Settings Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA]">
                <div>
                  <label className="block text-xs font-bold text-[#2A3735] mb-1 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-[#005F5A]" />
                    <span>Page URL Slug:</span>
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-white border border-r-0 border-[#D5CEC4] rounded-l-xl text-xs font-mono text-[#728280]">
                      /
                    </span>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="e.g. sahara-desert-excursions"
                      className="w-full px-3 py-2 rounded-r-xl border border-[#D5CEC4] bg-white text-xs font-mono text-[#1C2524] focus:outline-none focus:border-[#005F5A]"
                      required
                    />
                  </div>
                  <span className="text-[10px] text-[#728280] mt-1 block">
                    Use lowercase letters, numbers, and hyphens.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2A3735] mb-1 flex items-center gap-1.5">
                    <Menu className="w-3.5 h-3.5 text-[#005F5A]" />
                    <span>Top Navigation Menu:</span>
                  </label>
                  <select
                    value={formData.showInNav ? 'yes' : 'no'}
                    onChange={(e) =>
                      setFormData({ ...formData, showInNav: e.target.value === 'yes' })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white text-xs text-[#1C2524] focus:outline-none focus:border-[#005F5A]"
                  >
                    <option value="yes">Visible in Top Navbar & Mobile Menu</option>
                    <option value="no">Hidden (Accessible via Direct Link / Footer)</option>
                  </select>
                  <span className="text-[10px] text-[#728280] mt-1 block">
                    Choose whether this page appears directly in the site header.
                  </span>
                </div>
              </div>

              {/* Multilingual Titles */}
              <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA] space-y-4">
                <span className="text-xs font-bold text-[#005F5A] flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Multilingual Titles & Subtitles</span>
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#52605E] mb-1">
                      Title (English):
                    </label>
                    <input
                      type="text"
                      value={formData.title.en}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          title: { ...formData.title, en: e.target.value },
                        })
                      }
                      placeholder="e.g. Bespoke Private Journeys from Fez"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D5CEC4] bg-white text-xs text-[#1C2524] focus:outline-none focus:border-[#005F5A]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#52605E] mb-1">
                      Title (Français):
                    </label>
                    <input
                      type="text"
                      value={formData.title.fr}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          title: { ...formData.title, fr: e.target.value },
                        })
                      }
                      placeholder="Ex: Voyages Sur Mesure au départ de Fès"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D5CEC4] bg-white text-xs text-[#1C2524] focus:outline-none focus:border-[#005F5A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#52605E] mb-1">
                      Title (العربية):
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={formData.title.ar}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          title: { ...formData.title, ar: e.target.value },
                        })
                      }
                      placeholder="مثال: رحلات خاصة مصممة حسب الطلب من فاس"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D5CEC4] bg-white text-xs text-[#1C2524] focus:outline-none focus:border-[#005F5A]"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#E7E2DA]">
                  <div>
                    <label className="block text-[11px] font-bold text-[#52605E] mb-1">
                      Subtitle / Tagline (English):
                    </label>
                    <input
                      type="text"
                      value={formData.subtitle?.en || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          subtitle: { ...(formData.subtitle || { fr: '', ar: '' }), en: e.target.value },
                        })
                      }
                      placeholder="e.g. Tailor-Made Multiday Routes & Specialized Cultural Visits"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D5CEC4] bg-white text-xs text-[#1C2524] focus:outline-none focus:border-[#005F5A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#52605E] mb-1">
                      Subtitle / Tagline (Français):
                    </label>
                    <input
                      type="text"
                      value={formData.subtitle?.fr || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          subtitle: { ...(formData.subtitle || { en: '', ar: '' }), fr: e.target.value },
                        })
                      }
                      placeholder="Ex: Circuits personnalisés de plusieurs jours et visites thématiques"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D5CEC4] bg-white text-xs text-[#1C2524] focus:outline-none focus:border-[#005F5A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#52605E] mb-1">
                      Subtitle / Tagline (العربية):
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={formData.subtitle?.ar || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          subtitle: { ...(formData.subtitle || { en: '', fr: '' }), ar: e.target.value },
                        })
                      }
                      placeholder="مثال: مسارات متعددة الأيام وبرامج ثقافية مخصصة"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D5CEC4] bg-white text-xs text-[#1C2524] focus:outline-none focus:border-[#005F5A]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HERO COVER IMAGE */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              <ImagePickerField
                label="Page Top Hero Cover Photo"
                value={formData.heroImage || '/images/real/daytrip_custom_image1.jpg'}
                onChange={(newPath) => setFormData({ ...formData, heroImage: newPath })}
                helperText="High-resolution banner photo displayed across the cinematic top header of this page."
              />

              {/* Hero Banner Mockup */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[#728280] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#005F5A]" />
                  <span>Banner Live Preview</span>
                </span>
                <div className="relative rounded-2xl overflow-hidden min-h-[220px] flex items-center justify-center p-6 border border-[#E7E2DA]">
                  <img
                    src={formData.heroImage || '/images/real/daytrip_custom_image1.jpg'}
                    alt="Page Hero Preview"
                    className="absolute inset-0 w-full h-full object-cover opacity-85"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-black/30" />
                  <div className="relative z-10 max-w-lg mx-auto bg-white/40 backdrop-blur-md rounded-2xl p-6 border border-white/50 text-center space-y-2 shadow-lg">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/80 text-[#C84B31]">
                      <Compass className="w-3.5 h-3.5 text-[#005F5A]" />
                      <span>FezGuideTours Exclusive</span>
                    </span>
                    <h3 className="text-lg font-extrabold text-[#005F5A]">
                      {formData.title.en || 'Your Page Title'}
                    </h3>
                    <p className="text-xs text-[#15201F] font-semibold leading-relaxed">
                      {formData.subtitle?.en || 'Your Page Subtitle & Overview'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROSE & CONTENT */}
          {activeTab === 'content' && (
            <div className="space-y-4">
              {/* Language Switcher */}
              <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-3">
                <span className="text-xs font-bold text-[#005F5A] flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Editing Article Body Prose:</span>
                </span>
                <div className="flex items-center gap-1 p-1 bg-[#FAF8F5] rounded-xl border border-[#E7E2DA]">
                  {(['en', 'fr', 'ar'] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setActiveLang(lang)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all uppercase cursor-pointer ${
                        activeLang === lang
                          ? 'bg-[#005F5A] text-white shadow-xs'
                          : 'text-[#52605E] hover:bg-white'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2A3735] mb-1.5">
                  Content Article ({activeLang.toUpperCase()}):
                </label>
                <textarea
                  rows={9}
                  dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
                  value={formData.content[activeLang] || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      content: { ...formData.content, [activeLang]: e.target.value },
                    })
                  }
                  placeholder={
                    activeLang === 'ar'
                      ? 'اكتب تفاصيل البرنامج، المسارات، المحطات المقترحة، وكل ما يحتاجه الزائر...'
                      : activeLang === 'fr'
                      ? 'Rédigez la présentation détaillée, les étapes recommandées, et tous les conseils utiles...'
                      : 'Write a comprehensive, engaging description of this experience. Paragraph line breaks will be preserved cleanly on the page.'
                  }
                  className="w-full px-4 py-3 rounded-2xl border border-[#D5CEC4] bg-[#FAF8F5] text-xs text-[#1C2524] leading-relaxed focus:outline-none focus:border-[#005F5A]"
                />
                <span className="text-[10px] text-[#728280] mt-1 block">
                  Paragraph breaks will render cleanly as separate blocks on the published page.
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: HIGHLIGHTS BUILDER */}
          {activeTab === 'highlights' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#1C2524]">
                    Page Key Highlights & Features
                  </h4>
                  <p className="text-[11px] text-[#728280]">
                    Bullet points displayed in a feature grid at the bottom of the page.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addHighlight}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#005F5A] hover:bg-[#004A46] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Highlight</span>
                </button>
              </div>

              {/* Highlights List */}
              <div className="space-y-3">
                {((formData.highlights?.en || []).length === 0) ? (
                  <div className="text-center py-8 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA] p-6 text-xs text-[#728280]">
                    No highlights added yet. Click "Add Highlight" above to create bullet features.
                  </div>
                ) : (
                  formData.highlights.en.map((_, index) => (
                    <div
                      key={index}
                      className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA] space-y-2"
                    >
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-[11px] font-bold text-[#005F5A] flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Feature #{index + 1}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeHighlight(index)}
                          className="p-1 text-[#728280] hover:text-[#C84B31] transition-colors cursor-pointer"
                          title="Remove highlight"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={formData.highlights.en[index] || ''}
                          onChange={(e) => updateHighlight(index, 'en', e.target.value)}
                          placeholder="Highlight in English..."
                          className="px-3 py-1.5 rounded-xl border border-[#D5CEC4] bg-white text-xs text-[#1C2524]"
                        />
                        <input
                          type="text"
                          value={formData.highlights.fr?.[index] || ''}
                          onChange={(e) => updateHighlight(index, 'fr', e.target.value)}
                          placeholder="Point fort en Français..."
                          className="px-3 py-1.5 rounded-xl border border-[#D5CEC4] bg-white text-xs text-[#1C2524]"
                        />
                        <input
                          type="text"
                          dir="rtl"
                          value={formData.highlights.ar?.[index] || ''}
                          onChange={(e) => updateHighlight(index, 'ar', e.target.value)}
                          placeholder="ميزة بالعربية..."
                          className="px-3 py-1.5 rounded-xl border border-[#D5CEC4] bg-white text-xs text-[#1C2524]"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E7E2DA]">
            {!isNew && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(formData.id)}
                className="px-3.5 py-2 text-xs font-bold text-[#C84B31] hover:bg-red-50 rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Page</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-[#52605E] hover:bg-[#FAF8F5] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#005F5A] hover:bg-[#004A46] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Save Custom Page</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
