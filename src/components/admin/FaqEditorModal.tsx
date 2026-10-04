import React, { useState, useEffect } from 'react';
import { FaqItem, Language } from '../../types';
import {
  X,
  Save,
  Trash2,
  HelpCircle,
  Globe,
  Sparkles,
  Layers,
  ChevronDown,
  Check,
} from 'lucide-react';

interface FaqEditorModalProps {
  faq: FaqItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedFaq: FaqItem) => void;
  onDelete?: (faqId: string) => void;
}

const FAQ_CATEGORIES: { id: FaqItem['category']; label: { en: string; fr: string; ar: string } }[] = [
  { id: 'tours', label: { en: 'Tours & Experiences', fr: 'Visites & Expériences', ar: 'الجولات والتجارب' } },
  { id: 'booking', label: { en: 'Booking & Payment', fr: 'Réservation & Paiement', ar: 'الحجز والدفع' } },
  { id: 'guides', label: { en: 'Guides & Languages', fr: 'Guides & Langues', ar: 'المرشدون واللغات' } },
  { id: 'transport', label: { en: 'Transport & Transfers', fr: 'Transport & Transferts', ar: 'النقل والتوصيل' } },
  { id: 'walking', label: { en: 'Walking & Medina Pace', fr: 'Marche & Rythme', ar: 'المشي والمسارات' } },
  { id: 'food', label: { en: 'Food & Dietary Needs', fr: 'Alimentation & Régimes', ar: 'الطعام والحمية' } },
  { id: 'daytrips', label: { en: 'Day Trips & Excursions', fr: 'Excursions d’un jour', ar: 'الرحلات اليومية' } },
  { id: 'general', label: { en: 'General Travel Tips', fr: 'Conseils généraux', ar: 'نصائح عامة' } },
];

export const FaqEditorModal: React.FC<FaqEditorModalProps> = ({
  faq,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [activeLang, setActiveLang] = useState<Language>('en');
  const [formData, setFormData] = useState<FaqItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(true);

  useEffect(() => {
    if (faq) {
      setFormData({ ...faq });
    } else {
      setFormData({
        id: `faq-${Date.now()}`,
        category: 'tours',
        question: { en: '', fr: '', ar: '' },
        answer: { en: '', fr: '', ar: '' },
      });
    }
    setActiveLang('en');
    setPreviewOpen(true);
  }, [faq, isOpen]);

  if (!isOpen || !formData) return null;

  const isNew = !faq || !faq.id;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question.en.trim()) {
      alert('Please provide at least the English question.');
      return;
    }
    // Auto-fill missing FR/AR with EN if empty
    const sanitized: FaqItem = {
      ...formData,
      question: {
        en: formData.question.en.trim(),
        fr: formData.question.fr.trim() || formData.question.en.trim(),
        ar: formData.question.ar.trim() || formData.question.en.trim(),
      },
      answer: {
        en: formData.answer.en.trim(),
        fr: formData.answer.fr.trim() || formData.answer.en.trim(),
        ar: formData.answer.ar.trim() || formData.answer.en.trim(),
      },
    };
    onSave(sanitized);
  };

  const currentCategory = FAQ_CATEGORIES.find((c) => c.id === formData.category) || FAQ_CATEGORIES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-[#E7E2DA] p-6 sm:p-8 my-6 space-y-6 max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#005F5A]/10 text-[#005F5A] flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#1C2524]">
                {isNew ? 'Create New FAQ' : 'Edit FAQ Item'}
              </h3>
              <p className="text-[11px] text-[#728280]">
                Add or refine frequently asked travel questions across English, French, and Arabic.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#728280] hover:text-[#1C2524] rounded-xl hover:bg-[#FAF8F5] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6 flex-1">
          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-[#2A3735] mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#005F5A]" />
              <span>Category / Topic:</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value as FaqItem['category'] })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5CEC4] bg-[#FAF8F5] text-xs font-medium text-[#1C2524] focus:outline-none focus:border-[#005F5A]"
            >
              {FAQ_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label.en} ({cat.label.fr} — {cat.label.ar})
                </option>
              ))}
            </select>
          </div>

          {/* Multilingual Editor Tabs */}
          <div className="bg-[#FAF8F5] p-4 sm:p-5 rounded-2xl border border-[#E7E2DA] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-3">
              <span className="text-xs font-bold text-[#005F5A] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>Multilingual Translations</span>
              </span>

              {/* Language Switcher Buttons */}
              <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-[#E7E2DA]">
                {(['en', 'fr', 'ar'] as Language[]).map((lang) => {
                  const hasContent = !!formData.question[lang]?.trim();
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setActiveLang(lang)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeLang === lang
                          ? 'bg-[#005F5A] text-white shadow-xs'
                          : 'text-[#52605E] hover:bg-[#FAF8F5]'
                      }`}
                    >
                      <span className="uppercase">{lang}</span>
                      {hasContent && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            activeLang === lang ? 'bg-[#84E1BC]' : 'bg-[#005F5A]'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Language Input Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2A3735] mb-1">
                  Question ({activeLang.toUpperCase()}):
                </label>
                <input
                  type="text"
                  dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
                  value={formData.question[activeLang] || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      question: { ...formData.question, [activeLang]: e.target.value },
                    })
                  }
                  placeholder={
                    activeLang === 'ar'
                      ? 'مثال: هل يمكنني تعديل برنامج الجولة ليناسب اهتماماتي؟'
                      : activeLang === 'fr'
                      ? 'Ex: Est-il possible de personnaliser notre itinéraire ?'
                      : 'E.g., Can I customize my private tour itinerary?'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5CEC4] bg-white text-xs text-[#1C2524] focus:outline-none focus:border-[#005F5A]"
                  required={activeLang === 'en'}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2A3735] mb-1">
                  Answer ({activeLang.toUpperCase()}):
                </label>
                <textarea
                  rows={4}
                  dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
                  value={formData.answer[activeLang] || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      answer: { ...formData.answer, [activeLang]: e.target.value },
                    })
                  }
                  placeholder={
                    activeLang === 'ar'
                      ? 'اكتب الإجابة المفصلة هنا بكل وضوح...'
                      : activeLang === 'fr'
                      ? 'Rédigez la réponse détaillée ici...'
                      : 'Provide a clear, detailed, and reassuring response here...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5CEC4] bg-white text-xs text-[#1C2524] leading-relaxed focus:outline-none focus:border-[#005F5A]"
                />
              </div>
            </div>
          </div>

          {/* Live Visitor Preview */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-[#728280] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C84B31]" />
              <span>Live Website Accordion Preview ({activeLang.toUpperCase()})</span>
            </span>

            <div className="border border-[#E7E2DA] rounded-2xl overflow-hidden bg-white shadow-xs">
              <div
                onClick={() => setPreviewOpen(!previewOpen)}
                className="w-full p-4 text-left flex items-center justify-between gap-4 font-bold text-xs text-[#1C2524] bg-[#FAF8F5]/70 cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#005F5A]/10 text-[#005F5A]">
                    {currentCategory.label[activeLang] || currentCategory.label.en}
                  </span>
                  <span>{formData.question[activeLang] || '(Empty question title)'}</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-[#728280] transition-transform ${
                    previewOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
              {previewOpen && (
                <div
                  dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
                  className="px-4 py-3.5 text-xs text-[#52605E] leading-relaxed border-t border-[#F2ECE4] bg-white"
                >
                  {formData.answer[activeLang] || (
                    <span className="italic text-[#A0AFA0]">
                      No answer written yet in {activeLang.toUpperCase()}.
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E7E2DA]">
            {!isNew && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(formData.id)}
                className="px-3.5 py-2 text-xs font-bold text-[#C84B31] hover:bg-red-50 rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete FAQ</span>
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
                <span>Save FAQ</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
