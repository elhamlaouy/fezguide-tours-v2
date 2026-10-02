import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { UI_TEXT } from '../data/translations';
import { useCms } from '../context/CmsContext';
import { X, Calendar, Users, Phone, Mail, CheckCircle2, MessageCircle } from 'lucide-react';

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
  const { tours, addBooking, siteSettings } = useCms();
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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ref = addBooking({
      fullName,
      email,
      phone,
      tourId: initialTourId || 'custom',
      tourTitle: selectedTour,
      preferredDate: date,
      guestCount: guests,
      language: languagePreference,
      specialRequests,
    });
    setBookingRef(ref);
    setIsSubmitted(true);
  };

  const getWhatsAppMessage = () => {
    const text = encodeURIComponent(
      `Hello FezGuideTours! I would like to book a tour.\n` +
      `Tour: ${selectedTour}\n` +
      `Name: ${fullName || 'Guest'}\n` +
      `Date: ${date || 'Flexible'}\n` +
      `Guests: ${guests}\n` +
      `Language: ${languagePreference.toUpperCase()}\n` +
      `Notes: ${specialRequests || 'None'}`
    );
    return `https://wa.me/${siteSettings.whatsappNumber}?text=${text}`;
  };

  const resetAndClose = () => {
    setIsSubmitted(false);
    onClose();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
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
            <h3 className="text-xl font-bold text-[#1C2524]">
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
              <h3 className="text-xl font-extrabold text-[#1C2524]">
                {labels.title[language]}
              </h3>
              <p className="text-xs text-[#5D6B69] mt-1">
                {labels.subtitle[language]}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
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
                    onChange={(e) => setFullName(e.target.value)}
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
                    onChange={(e) => setPhone(e.target.value)}
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
                    onChange={(e) => setEmail(e.target.value)}
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
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
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
                    max="30"
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
