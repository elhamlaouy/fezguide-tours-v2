import React, { useState, useEffect } from 'react';
import { BlogPost, Language } from '../../types';
import { ImagePickerField } from './ImagePickerField';
import {
  X,
  Save,
  Trash2,
  BookOpen,
  Globe,
  Image as ImageIcon,
  Settings,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  User,
  Tag,
  FileText,
  Sparkles,
} from 'lucide-react';

interface BlogEditorModalProps {
  post: BlogPost | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPost: BlogPost) => void;
  onDelete: (postId: string) => void;
}

type EditorSubTab = 'details' | 'cover' | 'content' | 'publishing';

const BLOG_CATEGORIES = [
  { en: 'Heritage', fr: 'Patrimoine', ar: 'تراث' },
  { en: 'Culture', fr: 'Culture', ar: 'ثقافة' },
  { en: 'Food & Cuisine', fr: 'Gastronomie', ar: 'الطعام والمأكولات' },
  { en: 'Travel Tips', fr: 'Conseils de voyage', ar: 'نصائح السفر' },
  { en: 'Day Trips', fr: 'Excursions', ar: 'رحلات يومية' },
  { en: 'History', fr: 'Histoire', ar: 'تاريخ' },
  { en: 'Architecture', fr: 'Architecture', ar: 'هندسة معمارية' },
  { en: 'Local Life', fr: 'Vie locale', ar: 'الحياة المحلية' },
  { en: 'Craftsmanship', fr: 'Artisanat', ar: 'حرف يدوية' },
  { en: 'Spirituality', fr: 'Spiritualité', ar: 'روحانيات' },
];

export const BlogEditorModal: React.FC<BlogEditorModalProps> = ({
  post,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState<EditorSubTab>('details');
  const [formData, setFormData] = useState<BlogPost | null>(null);
  const [editLang, setEditLang] = useState<Language>('en');

  useEffect(() => {
    if (post) {
      setFormData({
        ...post,
        published: post.published !== false,
      });
      setActiveTab('details');
      setEditLang('en');
    } else {
      setFormData(null);
    }
  }, [post]);

  if (!isOpen || !formData) return null;

  const updateField = <K extends keyof BlogPost>(key: K, value: BlogPost[K]) => {
    setFormData((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updateLangField = (
    field: 'title' | 'excerpt' | 'content' | 'category' | 'readTime',
    lang: Language,
    value: string
  ) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            [field]: { ...prev[field], [lang]: value },
          }
        : prev
    );
  };

  const tabs: { id: EditorSubTab; label: string; icon: React.ElementType }[] = [
    { id: 'details', label: 'Article Details', icon: FileText },
    { id: 'cover', label: 'Cover Photo', icon: ImageIcon },
    { id: 'content', label: 'Content & Translations', icon: Globe },
    { id: 'publishing', label: 'Publishing', icon: Settings },
  ];

  const langTabs: { lang: Language; label: string; flag: string }[] = [
    { lang: 'en', label: 'English', flag: '🇬🇧' },
    { lang: 'fr', label: 'Français', flag: '🇫🇷' },
    { lang: 'ar', label: 'العربية', flag: '🇲🇦' },
  ];

  const charCount = (text: string) => text?.length || 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-[#E7E2DA] overflow-hidden my-8 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#15201F] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#005F5A] flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight">
                {formData.title.en || 'New Article'}
              </h2>
              <p className="text-[10px] text-[#9FB3B0]">
                Blog & Stories Editor · /{formData.slug}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateField('published', !formData.published)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                formData.published
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
              }`}
            >
              {formData.published ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
              {formData.published ? 'Published' : 'Draft'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-[#9FB3B0] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub Tabs */}
        <div className="bg-[#FAF8F5] px-4 sm:px-5 border-b border-[#E7E2DA] flex items-center gap-1 overflow-x-auto shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[11px] font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'border-[#005F5A] text-[#005F5A]'
                    : 'border-transparent text-[#728280] hover:text-[#1C2524]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
          {/* TAB: Article Details */}
          {activeTab === 'details' && (
            <div className="space-y-5">
              {/* Slug */}
              <div className="space-y-1.5">
                <label className="block font-bold text-[#1C2524]">
                  URL Slug <span className="text-[#728280] font-normal">(unique identifier)</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-[#728280] bg-[#FAF8F5] px-2.5 py-1.5 rounded-lg border border-[#E7E2DA]">
                    /blog/
                  </span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) =>
                      updateField(
                        'slug',
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, '-')
                          .replace(/-+/g, '-')
                      )
                    }
                    className="flex-1 px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white text-xs focus:outline-none focus:border-[#005F5A]"
                    placeholder="my-fez-article"
                  />
                </div>
              </div>

              {/* Author */}
              <div className="space-y-1.5">
                <label className="block font-bold text-[#1C2524] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#005F5A]" />
                  Author Name
                </label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => updateField('author', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white text-xs focus:outline-none focus:border-[#005F5A]"
                  placeholder="e.g. Youssef El Fassi"
                />
              </div>

              {/* Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-bold text-[#1C2524] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#005F5A]" />
                    Publication Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white text-xs focus:outline-none focus:border-[#005F5A]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-bold text-[#1C2524] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#005F5A]" />
                    Published Status
                  </label>
                  <button
                    onClick={() => updateField('published', !formData.published)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 justify-center ${
                      formData.published
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'bg-amber-50 border-amber-300 text-amber-700'
                    }`}
                  >
                    {formData.published ? (
                      <>
                        <Eye className="w-3.5 h-3.5" /> Published & Visible
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" /> Draft (Hidden)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Category Selector */}
              <div className="space-y-1.5">
                <label className="block font-bold text-[#1C2524] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#005F5A]" />
                  Category <span className="text-[#728280] font-normal">(auto-fills all 3 languages)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {BLOG_CATEGORIES.map((cat) => {
                    const isActive = formData.category.en === cat.en;
                    return (
                      <button
                        key={cat.en}
                        onClick={() =>
                          updateField('category', { en: cat.en, fr: cat.fr, ar: cat.ar })
                        }
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#005F5A] text-white shadow-xs'
                            : 'bg-[#FAF8F5] text-[#52605E] hover:bg-[#EFEAE2] border border-[#E7E2DA]'
                        }`}
                      >
                        {cat.en}
                      </button>
                    );
                  })}
                </div>
                {formData.category.en && (
                  <div className="flex items-center gap-3 text-[10px] text-[#728280] pt-1">
                    <span>🇬🇧 {formData.category.en}</span>
                    <span>🇫🇷 {formData.category.fr}</span>
                    <span>🇲🇦 {formData.category.ar}</span>
                  </div>
                )}
              </div>

              {/* Reading Time */}
              <div className="space-y-1.5">
                <label className="block font-bold text-[#1C2524] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#005F5A]" />
                  Reading Time
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {langTabs.map(({ lang, label, flag }) => (
                    <div key={lang} className="space-y-1">
                      <span className="text-[10px] text-[#728280]">
                        {flag} {label}
                      </span>
                      <input
                        type="text"
                        value={formData.readTime[lang]}
                        onChange={(e) => updateLangField('readTime', lang, e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#D5CEC4] bg-[#FAF8F5] text-xs"
                        placeholder={
                          lang === 'en'
                            ? '4 min read'
                            : lang === 'fr'
                            ? '4 min de lecture'
                            : '4 دقائق'
                        }
                        dir={lang === 'ar' ? 'rtl' : 'ltr'}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Cover Photo */}
          {activeTab === 'cover' && (
            <div className="space-y-5">
              <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA] space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#005F5A]">
                  <ImageIcon className="w-4 h-4" />
                  Cover Photo
                </div>
                <p className="text-[11px] text-[#728280] leading-relaxed">
                  Displayed as the article hero banner and blog card preview. Landscape images (16:10) work best.
                </p>
                <ImagePickerField
                  label="Article Cover Image"
                  value={formData.coverImage || ''}
                  onChange={(newPath) => updateField('coverImage', newPath)}
                  helperText="Choose from local Fez photos or upload a custom image (auto-compressed to WebP)."
                />
              </div>

              {/* Live Preview Card */}
              {formData.coverImage && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-[#005F5A] uppercase">Live Card Preview</span>
                  <div className="bg-white rounded-2xl border border-[#E7E2DA] overflow-hidden shadow-xs max-w-sm">
                    <div className="relative aspect-video w-full bg-[#1C2524] overflow-hidden">
                      <img
                        src={formData.coverImage}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 bg-[#005F5A] text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {formData.category.en || 'Category'}
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-center gap-2 text-[10px] text-[#728280]">
                        <span>{formData.date}</span>
                        <span>·</span>
                        <span>{formData.readTime.en}</span>
                      </div>
                      <h4 className="text-sm font-bold text-[#1C2524] line-clamp-2">
                        {formData.title.en || 'Article Title'}
                      </h4>
                      <p className="text-[11px] text-[#52605E] line-clamp-2">
                        {formData.excerpt.en || 'Brief teaser text...'}
                      </p>
                      <div className="text-[10px] text-[#728280] pt-1 border-t border-[#F2ECE4]">
                        By {formData.author || 'Author'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: Content & Translations */}
          {activeTab === 'content' && (
            <div className="space-y-5">
              {/* Language Picker */}
              <div className="flex items-center gap-2 p-1.5 bg-white rounded-xl border border-[#E7E2DA]">
                {langTabs.map(({ lang, label, flag }) => (
                  <button
                    key={lang}
                    onClick={() => setEditLang(lang)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      editLang === lang
                        ? 'bg-[#005F5A] text-white shadow-xs'
                        : 'text-[#728280] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <span>{flag}</span>
                    <span>{label}</span>
                    {formData.title[lang] && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </button>
                ))}
              </div>

              {/* Completion Indicator */}
              <div className="flex items-center gap-3 text-[10px]">
                {langTabs.map(({ lang, flag }) => {
                  const filled =
                    (formData.title[lang] ? 1 : 0) +
                    (formData.excerpt[lang] ? 1 : 0) +
                    (formData.content[lang] ? 1 : 0);
                  return (
                    <span
                      key={lang}
                      className={`px-2 py-0.5 rounded-full font-bold ${
                        filled === 3
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : filled > 0
                          ? 'bg-amber-50 text-amber-600 border border-amber-200'
                          : 'bg-[#FAF8F5] text-[#728280] border border-[#E7E2DA]'
                      }`}
                    >
                      {flag} {filled}/3 fields
                    </span>
                  );
                })}
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="block font-bold text-[#1C2524]">
                  Title ({langTabs.find((l) => l.lang === editLang)?.label})
                </label>
                <input
                  type="text"
                  value={formData.title[editLang]}
                  onChange={(e) => updateLangField('title', editLang, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white text-xs focus:outline-none focus:border-[#005F5A]"
                  placeholder={editLang === 'ar' ? 'عنوان المقال...' : 'Article title...'}
                  dir={editLang === 'ar' ? 'rtl' : 'ltr'}
                />
                <span className="text-[10px] text-[#728280]">{charCount(formData.title[editLang])} characters</span>
              </div>

              {/* Excerpt / Teaser */}
              <div className="space-y-1.5">
                <label className="block font-bold text-[#1C2524]">
                  Excerpt / Teaser ({langTabs.find((l) => l.lang === editLang)?.label})
                </label>
                <textarea
                  rows={3}
                  value={formData.excerpt[editLang]}
                  onChange={(e) => updateLangField('excerpt', editLang, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white text-xs focus:outline-none focus:border-[#005F5A] leading-relaxed"
                  placeholder={
                    editLang === 'ar'
                      ? 'ملخص مشوق للمقال يظهر في البطاقة...'
                      : 'Brief teaser shown on the blog card...'
                  }
                  dir={editLang === 'ar' ? 'rtl' : 'ltr'}
                />
                <span className="text-[10px] text-[#728280]">
                  {charCount(formData.excerpt[editLang])} characters · Recommended: 120–200
                </span>
              </div>

              {/* Full Article Body */}
              <div className="space-y-1.5">
                <label className="block font-bold text-[#1C2524]">
                  Full Article Body ({langTabs.find((l) => l.lang === editLang)?.label})
                </label>
                <p className="text-[10px] text-[#728280]">
                  Write the full narrative. Use paragraphs separated by blank lines for readability.
                </p>
                <textarea
                  rows={12}
                  value={formData.content[editLang]}
                  onChange={(e) => updateLangField('content', editLang, e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#D5CEC4] bg-white text-xs focus:outline-none focus:border-[#005F5A] leading-relaxed font-normal"
                  placeholder={
                    editLang === 'ar'
                      ? 'اكتب المحتوى الكامل للمقال هنا...\n\nاستخدم أسطر فارغة للفصل بين الفقرات.'
                      : 'Write the full article content here...\n\nUse blank lines to separate paragraphs.'
                  }
                  dir={editLang === 'ar' ? 'rtl' : 'ltr'}
                />
                <span className="text-[10px] text-[#728280]">
                  {charCount(formData.content[editLang])} characters ·{' '}
                  ~{Math.max(1, Math.ceil(charCount(formData.content[editLang]) / 1000))} min read
                </span>
              </div>
            </div>
          )}

          {/* TAB: Publishing */}
          {activeTab === 'publishing' && (
            <div className="space-y-5">
              {/* Publication Summary Card */}
              <div className="p-5 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA] space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#005F5A]">
                  <Sparkles className="w-4 h-4" />
                  Publication Summary
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white rounded-xl p-3 border border-[#E7E2DA] space-y-1">
                    <span className="text-[10px] text-[#728280] uppercase font-bold">Status</span>
                    <div
                      className={`font-bold ${
                        formData.published ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {formData.published ? '✅ Live' : '⏸ Draft'}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-[#E7E2DA] space-y-1">
                    <span className="text-[10px] text-[#728280] uppercase font-bold">Author</span>
                    <div className="font-bold text-[#1C2524] truncate">
                      {formData.author || '—'}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-[#E7E2DA] space-y-1">
                    <span className="text-[10px] text-[#728280] uppercase font-bold">Date</span>
                    <div className="font-bold text-[#1C2524]">{formData.date || '—'}</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-[#E7E2DA] space-y-1">
                    <span className="text-[10px] text-[#728280] uppercase font-bold">Category</span>
                    <div className="font-bold text-[#1C2524]">
                      {formData.category.en || '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Translation Completeness */}
              <div className="p-5 bg-white rounded-2xl border border-[#E7E2DA] space-y-4">
                <span className="text-sm font-bold text-[#1C2524]">Translation Completeness</span>
                <div className="space-y-3">
                  {langTabs.map(({ lang, label, flag }) => {
                    const fields = [
                      { name: 'Title', value: formData.title[lang] },
                      { name: 'Excerpt', value: formData.excerpt[lang] },
                      { name: 'Content', value: formData.content[lang] },
                      { name: 'Category', value: formData.category[lang] },
                      { name: 'Read Time', value: formData.readTime[lang] },
                    ];
                    const filled = fields.filter((f) => f.value && f.value.length > 0).length;
                    const percent = Math.round((filled / fields.length) * 100);
                    return (
                      <div key={lang} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#1C2524]">
                            {flag} {label}
                          </span>
                          <span className="text-[#728280] font-mono">
                            {filled}/{fields.length} fields · {percent}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#FAF8F5] rounded-full border border-[#E7E2DA] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              percent === 100
                                ? 'bg-emerald-500'
                                : percent > 50
                                ? 'bg-amber-400'
                                : 'bg-[#D5CEC4]'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {fields.map((f) => (
                            <span
                              key={f.name}
                              className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                                f.value && f.value.length > 0
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                  : 'bg-[#FAF8F5] text-[#A0AFA0] border border-[#E7E2DA]'
                              }`}
                            >
                              {f.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Toggle Published */}
              <div className="p-5 bg-white rounded-2xl border border-[#E7E2DA] flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-[#1C2524]">Publish This Article</span>
                  <p className="text-[11px] text-[#728280]">
                    When published, the article appears on the Blog page and is visible to visitors.
                  </p>
                </div>
                <button
                  onClick={() => updateField('published', !formData.published)}
                  className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                    formData.published ? 'bg-emerald-500' : 'bg-[#D5CEC4]'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                      formData.published ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-[#E7E2DA] p-4 sm:p-5 flex items-center justify-between shrink-0">
          <button
            onClick={() =>
              onDelete(formData.id)
            }
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#C84B31] hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Article</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#52605E] hover:bg-[#FAF8F5] rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (formData) onSave(formData);
              }}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#005F5A] hover:bg-[#004A46] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Article</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
