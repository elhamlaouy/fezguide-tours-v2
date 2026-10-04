import React, { useState, useEffect } from 'react';
import { TeamMember, Language } from '../../types';
import { ImagePickerField } from './ImagePickerField';
import {
  X,
  Save,
  Trash2,
  Users,
  Globe,
  Image as ImageIcon,
  ShieldCheck,
  Award,
  Plus,
  Settings,
  Eye,
  Sparkles,
  Languages,
} from 'lucide-react';

interface TeamEditorModalProps {
  member: TeamMember | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedMember: TeamMember) => void;
  onDelete: (memberId: string) => void;
}

type EditorSubTab = 'profile' | 'photo' | 'bio' | 'credentials';

const LANGUAGE_OPTIONS = [
  'Arabic',
  'English',
  'French',
  'Spanish',
  'German',
  'Italian',
  'Portuguese',
  'Japanese',
  'Chinese',
  'Korean',
  'Dutch',
  'Russian',
  'Turkish',
  'Berber',
  'Darija',
  'Hebrew',
  'Hindi',
  'Polish',
  'Swedish',
];

export const TeamEditorModal: React.FC<TeamEditorModalProps> = ({
  member,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState<EditorSubTab>('profile');
  const [formData, setFormData] = useState<TeamMember | null>(null);
  const [editLang, setEditLang] = useState<Language>('en');
  const [newLanguage, setNewLanguage] = useState('');

  useEffect(() => {
    if (member) {
      setFormData({ ...member });
      setActiveTab('profile');
      setEditLang('en');
      setNewLanguage('');
    } else {
      setFormData(null);
    }
  }, [member]);

  if (!isOpen || !formData) return null;

  const updateField = <K extends keyof TeamMember>(key: K, value: TeamMember[K]) => {
    setFormData((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updateLangField = (
    field: 'role' | 'bio' | 'experience',
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

  const addSpokenLanguage = (lang: string) => {
    if (lang && !formData.languages.includes(lang)) {
      updateField('languages', [...formData.languages, lang]);
    }
    setNewLanguage('');
  };

  const removeSpokenLanguage = (lang: string) => {
    updateField(
      'languages',
      formData.languages.filter((l) => l !== lang)
    );
  };

  const tabs: { id: EditorSubTab; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Profile & Identity', icon: Users },
    { id: 'photo', label: 'Portrait Photo', icon: ImageIcon },
    { id: 'bio', label: 'Bio & Translations', icon: Globe },
    { id: 'credentials', label: 'Credentials & Skills', icon: ShieldCheck },
  ];

  const langTabs: { lang: Language; label: string; flag: string }[] = [
    { lang: 'en', label: 'English', flag: '🇬🇧' },
    { lang: 'fr', label: 'Français', flag: '🇫🇷' },
    { lang: 'ar', label: 'العربية', flag: '🇲🇦' },
  ];

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
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#005F5A] flex items-center justify-center shrink-0">
              {formData.avatarUrl ? (
                <img
                  src={formData.avatarUrl}
                  alt={formData.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight">
                {formData.name || 'New Team Member'}
              </h2>
              <p className="text-[10px] text-[#9FB3B0]">
                {formData.role.en || 'Guide'} · {formData.licenseNumber ? `#${formData.licenseNumber}` : 'No license'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-[#9FB3B0] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
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
          {/* TAB: Profile & Identity */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block font-bold text-[#1C2524]">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white text-xs focus:outline-none focus:border-[#005F5A]"
                  placeholder="e.g. Youssef El Fassi"
                />
              </div>

              {/* Role / Title in 3 languages */}
              <div className="space-y-2 p-4 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA]">
                <span className="text-sm font-bold text-[#005F5A] flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  Role / Job Title (Trilingual)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {langTabs.map(({ lang, label, flag }) => (
                    <div key={lang} className="space-y-1">
                      <span className="text-[10px] text-[#728280]">
                        {flag} {label}
                      </span>
                      <input
                        type="text"
                        value={formData.role[lang]}
                        onChange={(e) => updateLangField('role', lang, e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#D5CEC4] bg-white text-xs"
                        placeholder={
                          lang === 'en'
                            ? 'e.g. Licensed Heritage Guide'
                            : lang === 'fr'
                            ? 'ex. Guide Patrimoine Agréé'
                            : 'مثال: مرشد معتمد للتراث'
                        }
                        dir={lang === 'ar' ? 'rtl' : 'ltr'}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Experience in 3 languages */}
              <div className="space-y-2 p-4 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA]">
                <span className="text-sm font-bold text-[#005F5A] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Experience Summary (Trilingual)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {langTabs.map(({ lang, label, flag }) => (
                    <div key={lang} className="space-y-1">
                      <span className="text-[10px] text-[#728280]">
                        {flag} {label}
                      </span>
                      <input
                        type="text"
                        value={formData.experience[lang]}
                        onChange={(e) => updateLangField('experience', lang, e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#D5CEC4] bg-white text-xs"
                        placeholder={
                          lang === 'en'
                            ? 'e.g. 12+ Years'
                            : lang === 'fr'
                            ? 'ex. 12+ ans'
                            : 'مثال: 12+ سنة'
                        }
                        dir={lang === 'ar' ? 'rtl' : 'ltr'}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Portrait Photo */}
          {activeTab === 'photo' && (
            <div className="space-y-5">
              <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA] space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#005F5A]">
                  <ImageIcon className="w-4 h-4" />
                  Guide Portrait / Avatar Photo
                </div>
                <p className="text-[11px] text-[#728280] leading-relaxed">
                  Official licensed guide photo displayed on the About Us page. Square photos (1:1) work best.
                </p>
                <ImagePickerField
                  label="Portrait Photo"
                  value={formData.avatarUrl || ''}
                  onChange={(newPath) => updateField('avatarUrl', newPath)}
                  aspectRatio="square"
                  helperText="Choose from local Fez photos or upload a custom image (auto-compressed to WebP)."
                />
              </div>

              {/* Live Preview Card */}
              {formData.avatarUrl && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-[#005F5A] uppercase">
                    Live Team Card Preview
                  </span>
                  <div className="bg-white rounded-3xl border border-[#E7E2DA] overflow-hidden shadow-xs max-w-xs">
                    <div className="relative aspect-square w-full bg-[#1C2524] overflow-hidden">
                      <img
                        src={formData.avatarUrl}
                        alt={formData.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4 text-white">
                        <h3 className="text-base font-bold drop-shadow-xs">
                          {formData.name || 'Guide Name'}
                        </h3>
                        <p className="text-[11px] text-[#E07A5F] font-semibold">
                          {formData.role.en || 'Role'}
                        </p>
                      </div>
                    </div>
                    <div className="p-5 space-y-3 text-xs">
                      <p className="text-[#52605E] leading-relaxed line-clamp-3">
                        {formData.bio.en || 'Bio text here...'}
                      </p>
                      <div className="pt-2 border-t border-[#F2ECE4] space-y-1 text-[11px]">
                        <div className="flex items-center gap-1.5 font-semibold text-[#005F5A]">
                          <Award className="w-3.5 h-3.5" />
                          <span>{formData.experience.en || 'Experience'}</span>
                        </div>
                        <div className="text-[#728280]">
                          Languages: {formData.languages.join(' · ') || '—'}
                        </div>
                        {formData.licenseNumber && (
                          <div className="text-[#005F5A] font-bold">
                            Badge #{formData.licenseNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: Bio & Translations */}
          {activeTab === 'bio' && (
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
                    {formData.bio[lang] && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </button>
                ))}
              </div>

              {/* Completion Indicator */}
              <div className="flex items-center gap-3 text-[10px]">
                {langTabs.map(({ lang, flag }) => {
                  const filled =
                    (formData.role[lang] ? 1 : 0) +
                    (formData.bio[lang] ? 1 : 0) +
                    (formData.experience[lang] ? 1 : 0);
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

              {/* Bio */}
              <div className="space-y-1.5">
                <label className="block font-bold text-[#1C2524]">
                  Biography ({langTabs.find((l) => l.lang === editLang)?.label})
                </label>
                <p className="text-[10px] text-[#728280]">
                  A personal biography highlighting the guide's background, passion, and expertise.
                </p>
                <textarea
                  rows={8}
                  value={formData.bio[editLang]}
                  onChange={(e) => updateLangField('bio', editLang, e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#D5CEC4] bg-white text-xs focus:outline-none focus:border-[#005F5A] leading-relaxed"
                  placeholder={
                    editLang === 'ar'
                      ? 'اكتب السيرة الذاتية هنا...'
                      : 'Write the guide\'s biography here...'
                  }
                  dir={editLang === 'ar' ? 'rtl' : 'ltr'}
                />
                <span className="text-[10px] text-[#728280]">
                  {formData.bio[editLang]?.length || 0} characters
                </span>
              </div>

              {/* Role (current lang quick access) */}
              <div className="space-y-1.5">
                <label className="block font-bold text-[#1C2524]">
                  Role / Title ({langTabs.find((l) => l.lang === editLang)?.label})
                </label>
                <input
                  type="text"
                  value={formData.role[editLang]}
                  onChange={(e) => updateLangField('role', editLang, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white text-xs focus:outline-none focus:border-[#005F5A]"
                  dir={editLang === 'ar' ? 'rtl' : 'ltr'}
                />
              </div>

              {/* Experience (current lang quick access) */}
              <div className="space-y-1.5">
                <label className="block font-bold text-[#1C2524]">
                  Experience ({langTabs.find((l) => l.lang === editLang)?.label})
                </label>
                <input
                  type="text"
                  value={formData.experience[editLang]}
                  onChange={(e) => updateLangField('experience', editLang, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white text-xs focus:outline-none focus:border-[#005F5A]"
                  dir={editLang === 'ar' ? 'rtl' : 'ltr'}
                />
              </div>
            </div>
          )}

          {/* TAB: Credentials & Skills */}
          {activeTab === 'credentials' && (
            <div className="space-y-5">
              {/* License Number */}
              <div className="p-5 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA] space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#005F5A]">
                  <ShieldCheck className="w-4 h-4" />
                  Ministerial License Number
                </div>
                <p className="text-[11px] text-[#728280] leading-relaxed">
                  Official tourism ministry license badge number. This is displayed publicly as a verification badge.
                </p>
                <input
                  type="text"
                  value={formData.licenseNumber || ''}
                  onChange={(e) => updateField('licenseNumber', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D5CEC4] bg-white text-xs focus:outline-none focus:border-[#005F5A] font-mono"
                  placeholder="e.g. FEZ-1234"
                />
                {formData.licenseNumber && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#005F5A]/10 rounded-lg border border-[#005F5A]/20">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#005F5A]" />
                    <span className="text-[11px] font-bold text-[#005F5A]">
                      License Badge: #{formData.licenseNumber}
                    </span>
                  </div>
                )}
              </div>

              {/* Languages Spoken */}
              <div className="p-5 bg-white rounded-2xl border border-[#E7E2DA] space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#1C2524]">
                  <Languages className="w-4 h-4 text-[#005F5A]" />
                  Languages Spoken
                </div>
                <p className="text-[11px] text-[#728280]">
                  Click to add languages the guide speaks fluently. Displayed on the About page card.
                </p>

                {/* Current languages */}
                <div className="flex flex-wrap gap-2">
                  {formData.languages.map((lang) => (
                    <span
                      key={lang}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#005F5A]/10 text-[#005F5A] text-[11px] font-bold rounded-full border border-[#005F5A]/20"
                    >
                      {lang}
                      <button
                        onClick={() => removeSpokenLanguage(lang)}
                        className="w-4 h-4 rounded-full bg-[#005F5A]/20 hover:bg-[#C84B31]/20 flex items-center justify-center text-[#005F5A] hover:text-[#C84B31] transition-colors cursor-pointer"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  {formData.languages.length === 0 && (
                    <span className="text-[11px] text-[#728280] italic">No languages added yet</span>
                  )}
                </div>

                {/* Add language quick select */}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#F2ECE4]">
                  {LANGUAGE_OPTIONS.filter((l) => !formData.languages.includes(l)).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => addSpokenLanguage(lang)}
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FAF8F5] text-[#52605E] hover:bg-[#005F5A] hover:text-white border border-[#E7E2DA] transition-colors cursor-pointer"
                    >
                      + {lang}
                    </button>
                  ))}
                </div>

                {/* Custom language input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newLanguage.trim()) {
                        addSpokenLanguage(newLanguage.trim());
                      }
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-[#D5CEC4] bg-[#FAF8F5] text-xs"
                    placeholder="Or type a custom language..."
                  />
                  <button
                    onClick={() => {
                      if (newLanguage.trim()) addSpokenLanguage(newLanguage.trim());
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#005F5A] text-white text-[11px] font-bold rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
              </div>

              {/* Credentials Summary */}
              <div className="p-5 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA] space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#005F5A]">
                  <Sparkles className="w-4 h-4" />
                  Credentials Summary
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-white rounded-xl p-3 border border-[#E7E2DA] space-y-1">
                    <span className="text-[10px] text-[#728280] uppercase font-bold">Name</span>
                    <div className="font-bold text-[#1C2524] text-xs truncate">
                      {formData.name || '—'}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-[#E7E2DA] space-y-1">
                    <span className="text-[10px] text-[#728280] uppercase font-bold">License</span>
                    <div className="font-bold text-[#1C2524] text-xs">
                      {formData.licenseNumber || '—'}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-[#E7E2DA] space-y-1">
                    <span className="text-[10px] text-[#728280] uppercase font-bold">Languages</span>
                    <div className="font-bold text-[#1C2524] text-xs">
                      {formData.languages.length} spoken
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-[#E7E2DA] space-y-1">
                    <span className="text-[10px] text-[#728280] uppercase font-bold">Experience</span>
                    <div className="font-bold text-[#1C2524] text-xs truncate">
                      {formData.experience.en || '—'}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-[#E7E2DA] space-y-1">
                    <span className="text-[10px] text-[#728280] uppercase font-bold">Bio (EN)</span>
                    <div className="font-bold text-[#1C2524] text-xs">
                      {formData.bio.en ? `${formData.bio.en.length} chars` : '—'}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-[#E7E2DA] space-y-1">
                    <span className="text-[10px] text-[#728280] uppercase font-bold">Photo</span>
                    <div className="font-bold text-[#1C2524] text-xs">
                      {formData.avatarUrl ? '✅ Set' : '❌ Missing'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-[#E7E2DA] p-4 sm:p-5 flex items-center justify-between shrink-0">
          <button
            onClick={() => onDelete(formData.id)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#C84B31] hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove Guide</span>
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
              <span>Save Guide</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
