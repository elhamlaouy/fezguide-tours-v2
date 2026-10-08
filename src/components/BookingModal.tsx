import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { UI_TEXT } from '../data/translations';
import { useCms } from '../context/CmsContext';
import { X, Calendar, Users, Phone, Mail, CheckCircle2, MessageCircle, AlertCircle } from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  initialTourId?: string;
  initialTourTitle?: string;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  language,
  initialTourId,
  initialTourTitle,
}) => {
  const { tours, siteSettings } = useCms();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedTour, setSelectedTour] = useState(initialTourTitle || '');
  const [date, setDate] = useState('');
  const [guests, setGuests] = useState(2);
  const [languagePreference, setLanguagePreference] = useState<Language>(language);
  const [specialRequests, setSpecialRequests] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Minimum allowed booking date is today
  const today = new Date().toISOString().split('T')[0];

  // Collect all available tours dynamically from CMS store
  const allTours = tours
    .filter((t) => t.published !== false)
    .map((p) => p.title[language] || p.title.en);

  useEffect(() => {
    if (initialTourTitle) {
      setSelectedTour(initialTourTitle);
    } else if (allTours.length > 0 && !selectedTour) {
      setSelectedTour(allTours[0]);
    }
  }, [initialTourTitle, language, tours]);

  useEffect(() => {
    setLanguagePreference(language);
  }, [language]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        resetAndClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  // Clean WhatsApp number removing non-digits
  const cleanNumber = (siteSettings.whatsappNumber || '212719603009').replace(/[^0-9]/g, '');

  const resetAndClose = () => {
    setIsSubmitted(false);
    setValidationError(null);
    onClose();
  };

  const validateForm = (): boolean => {
    if (!fullName.trim()) {
      setValidationError(
        language === 'ar'
          ? 'يرجى إدخال اسمكم الكامل'
          : language === 'fr'
          ? 'Veuillez saisir votre nom complet'
          : 'Please enter your full name'
      );
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setValidationError(
        language === 'ar'
          ? 'يرجى إدخال بريد إلكتروني صحيح'
          : language === 'fr'
          ? 'Veuillez saisir une adresse e-mail valide'
          : 'Please enter a valid email address'
      );
      return false;
    }

    const phoneDigits = phone.replace(/[^0-9]/g, '');
    if (phoneDigits.length < 6) {
      setValidationError(
        language === 'ar'
          ? 'يرجى إدخال رقم هاتف أو واتساب صحيح مع الرمز الدولي'
          : language === 'fr'
          ? 'Veuillez saisir un numéro de téléphone/WhatsApp valide avec indicatif'
          : 'Please enter a valid WhatsApp or phone number with country code'
      );
      return false;
    }

    if (!date) {
      setValidationError(
        language === 'ar'
          ? 'يرجى اختيار التاريخ المفضل للجولة'
          : language === 'fr'
          ? 'Veuillez sélectionner une date'
          : 'Please select a preferred date'
      );
      return false;
    }

    if (date < today) {
      setValidationError(
        language === 'ar'
          ? 'لا يمكن اختيار تاريخ في الماضي. يرجى اختيار تاريخ اليوم أو تاريخ لاحق.'
          : language === 'fr'
          ? 'La date ne peut pas être dans le passé. Veuillez choisir aujourd’hui ou une date ultérieure.'
          : 'Date cannot be in the past. Please choose today or a future date.'
      );
      return false;
    }

    if (guests < 1 || guests > 50) {
      setValidationError(
        language === 'ar'
          ? 'عدد المشاركين يجب أن يكون بين 1 و 50'
          : language === 'fr'
          ? 'Le nombre de participants doit être compris entre 1 et 50'
          : 'Guest count must be between 1 and 50'
      );
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const ref = `FGT-${crypto.getRandomValues(new Uint32Array(1))[0]
      .toString()
      .padStart(10, '0')
      .slice(-10)}`;
    setBookingRef(ref);
    setIsSubmitted(true);
  };

  const getWhatsAppMessage = () => {
    let text = '';
    if (languagePreference === 'ar') {
      text =
        `السلام عليكم ورحمة الله، أود تأكيد حجز جولة عبر FezGuideTours:\n` +
        `• الجولة: ${selectedTour}\n` +
        `• الاسم: ${fullName || 'ضيف'}\n` +
        `• التاريخ: ${date || 'مرن'}\n` +
        `• عدد الأشخاص: ${guests}\n` +
        `• لغة المرشد: العربية\n` +
        `• ملاحظات: ${specialRequests || 'لا توجد'}\n` +
        (bookingRef ? `• رقم المرجع: ${bookingRef}` : '');
    } else if (languagePreference === 'fr') {
      text =
        `Bonjour FezGuideTours ! Je souhaite réserver une visite :\n` +
        `• Visite : ${selectedTour}\n` +
        `• Nom : ${fullName || 'Client'}\n` +
        `• Date : ${date || 'Flexible'}\n` +
        `• Personnes : ${guests}\n` +
        `• Langue : Français\n` +
        `• Notes : ${specialRequests || 'Aucune'}\n` +
        (bookingRef ? `• Réf dossier : ${bookingRef}` : '');
    } else {
      text =
        `Hello FezGuideTours! I would like to confirm a tour booking:\n` +
        `• Tour: ${selectedTour}\n` +
        `• Name: ${fullName || 'Guest'}\n` +
        `• Date: ${date || 'Flexible'}\n` +
        `• Guests: ${guests}\n` +
        `• Language: ${languagePreference.toUpperCase()}\n` +
        `• Notes: ${specialRequests || 'None'}\n` +
        (bookingRef ? `• Ref: ${bookingRef}` : '');
    }

    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
  };

  const labels = {
    title: { en: 'Reserve Your Experience', fr: 'Réserver Votre Expérience', ar: 'احجز تجربتك السياحية' },
    subtitle: {
      en: 'No upfront payment required. Certified local guide confirmation within 2 hours.',
      fr: 'Aucun paiement immédiat requis. Confirmation par un guide officiel en moins de 2h.',
      ar: 'لا يلزم أي دفع مسبق. تأكيد الحجز بواسطة مرشد سياحي رسمي خلال ساعتين.',
    },
    fullName: { en: 'Full Name', fr: 'Nom Complet', ar: 'الاسم الكامل' },
    email: { en: 'Email Address', fr: 'Adresse Email', ar: 'البريد الإلكتروني' },
    phone: { en: 'WhatsApp / Phone (with country code)', fr: 'WhatsApp / Téléphone (avec indicatif)', ar: 'رقم الواتساب أو الهاتف (مع الرمز الدولي)' },
    tour: { en: 'Select Tour / Experience', fr: 'Choisir la Visite / Excursion', ar: 'اختر الجولة أو الرحلة' },
    date: { en: 'Preferred Date', fr: 'Date Souhaitée', ar: 'التاريخ المفضل' },
    guests: { en: 'Number of Guests', fr: 'Nombre de Personnes', ar: 'عدد المشاركين' },
    guideLang: { en: 'Guide Language', fr: 'Langue du Guide', ar: 'لغة المرشد المفضلة' },
    notes: { en: 'Special Requests or Hotel/Riad Name', fr: 'Demandes Spéciales ou Nom du Riad', ar: 'ملاحظات خاصة أو اسم الفندق/الرياض' },
    submitBtn: { en: 'Confirm Reservation Request', fr: 'Confirmer la Demande de Réservation', ar: 'تأكيد طلب الحجز' },
    instantWhatsApp: { en: 'Or Inquire Directly via WhatsApp', fr: 'Ou Réservez Directement sur WhatsApp', ar: 'أو تواصل فوراً عبر تطبيق واتساب' },
    successTitle: { en: 'Booking Request Received!', fr: 'Demande de Réservation Reçue !', ar: 'تم استلام طلب حجزك بنجاح!' },
    successMsg: {
      en: 'Our senior certified guide will contact you via WhatsApp and Email shortly with pickup details.',
      fr: 'Notre guide officiel vous contactera rapidement par WhatsApp et e-mail avec les détails de prise en charge.',
      ar: 'سيتواصل معك مرشدنا السياحي المعتمد عبر الواتساب والبريد الإلكتروني قريباً للتنسيق وموعد الانطلاق.',
    },
    bookingRefLabel: { en: 'Booking Reference', fr: 'Référence du dossier', ar: 'رقم مرجع الحجز' },
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) resetAndClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E7E2DA] p-6 sm:p-8 my-8 text-[#1C2524]">
        {/* Close Button */}
        <button
          onClick={resetAndClose}
          className="absolute top-4 right-4 p-2 text-[#728280] hover:text-[#1C2524] rounded-full hover:bg-[#F2ECE4] transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {isSubmitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-[#005F5A]/10 text-[#005F5A] rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 id="booking-modal-title" className="text-xl font-bold text-[#1C2524]">
              {labels.successTitle[language]}
            </h3>
            <p className="text-sm text-[#4A5755] leading-relaxed">
              {labels.successMsg[language]}
            </p>
            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E2DA] inline-block">
              <span className="text-xs text-[#728280] block">{labels.bookingRefLabel[language]}</span>
              <span className="text-lg font-mono font-bold text-[#005F5A]">{bookingRef}</span>
            </div>
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <a
                href={getWhatsAppMessage()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Open in WhatsApp</span>
              </a>
              <button
                onClick={resetAndClose}
                className="flex-1 py-3 px-4 border border-[#E7E2DA] hover:bg-[#FAF8F5] text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                {UI_TEXT.common.close[language]}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h3 id="booking-modal-title" className="text-xl font-extrabold text-[#1C2524]">
                {labels.title[language]}
              </h3>
              <p className="text-xs text-[#5D6B69] mt-1">
                {labels.subtitle[language]}
              </p>
            </div>

            {validationError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs" noValidate>
              {/* Tour Selection */}
              <div>
                <label className="block font-bold text-[#2A3735] mb-1">
                  {labels.tour[language]}
                </label>
                <select
                  value={selectedTour}
                  onChange={(e) => setSelectedTour(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-[#D5CEC4] bg-[#FAF8F5] text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#005F5A]"
                >
                  {allTours.map((title, idx) => (
                    <option key={idx} value={title}>
                      {title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">
                    {labels.fullName[language]} *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full px-3 py-2.5 rounded-lg border border-[#D5CEC4] bg-[#FAF8F5] focus:outline-hidden focus:ring-2 focus:ring-[#005F5A]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">
                    {labels.phone[language]} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="+1 555 019 2834"
                    className="w-full px-3 py-2.5 rounded-lg border border-[#D5CEC4] bg-[#FAF8F5] focus:outline-hidden focus:ring-2 focus:ring-[#005F5A]"
                  />
                </div>
              </div>

              {/* Email & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">
                    {labels.email[language]} *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="sarah@example.com"
                    className="w-full px-3 py-2.5 rounded-lg border border-[#D5CEC4] bg-[#FAF8F5] focus:outline-hidden focus:ring-2 focus:ring-[#005F5A]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">
                    {labels.date[language]} *
                  </label>
                  <input
                    type="date"
                    required
                    min={today}
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#D5CEC4] bg-[#FAF8F5] focus:outline-hidden focus:ring-2 focus:ring-[#005F5A]"
                  />
                </div>
              </div>

              {/* Guests & Guide Language */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">
                    {labels.guests[language]}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={guests}
                    onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#D5CEC4] bg-[#FAF8F5] focus:outline-hidden focus:ring-2 focus:ring-[#005F5A]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">
                    {labels.guideLang[language]}
                  </label>
                  <select
                    value={languagePreference}
                    onChange={(e) => setLanguagePreference(e.target.value as Language)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#D5CEC4] bg-[#FAF8F5] focus:outline-hidden focus:ring-2 focus:ring-[#005F5A]"
                  >
                    <option value="en">English Guide</option>
                    <option value="fr">Guide Francophone</option>
                    <option value="ar">مرشد باللغة العربية</option>
                  </select>
                </div>
              </div>

              {/* Special Requests */}
              <div>
                <label className="block font-bold text-[#2A3735] mb-1">
                  {labels.notes[language]}
                </label>
                <textarea
                  rows={2}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Dietary requirements, Riad name for morning pickup..."
                  className="w-full px-3 py-2 rounded-lg border border-[#D5CEC4] bg-[#FAF8F5] focus:outline-hidden focus:ring-2 focus:ring-[#005F5A] resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 space-y-2.5">
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-[#C84B31] hover:bg-[#B33D25] text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer text-xs uppercase tracking-wide"
                >
                  {labels.submitBtn[language]}
                </button>

                <div className="text-center">
                  <a
                    href={getWhatsAppMessage()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-[#005F5A] hover:underline"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                    <span>{labels.instantWhatsApp[language]}</span>
                  </a>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
