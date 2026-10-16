import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { UI_TEXT } from '../data/translations';
import { useCms } from '../context/CmsContext';
import { localizedText, publicProduct, uiText } from '../cms/render-utils';
import { BOOKING_COPY } from '../cms/booking-copy';
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
  const { tours, siteSettings, publishedDocument } = useCms();
  const contact = publishedDocument?.siteSettings ?? siteSettings;
  const bookingText = (key: keyof typeof BOOKING_COPY): string => publishedDocument ? uiText(publishedDocument, `ui.booking.${key}`, language, BOOKING_COPY[key]) : localizedText(BOOKING_COPY[key], language);
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
  const availableTours = publishedDocument ? publishedDocument.products.filter(product => publicProduct(publishedDocument, product.id)) : tours.filter(tour => tour.published !== false);
  const allTours = availableTours.map(product => localizedText(product.title, language)).filter(Boolean);

  useEffect(() => {
    const initialProduct = publishedDocument && initialTourId ? publicProduct(publishedDocument, initialTourId) : undefined;
    const requestedTitle = initialProduct ? localizedText(initialProduct.title, language) : initialTourTitle;
    if (requestedTitle && (!publishedDocument || allTours.includes(requestedTitle))) {
      setSelectedTour(requestedTitle);
    } else if (!allTours.includes(selectedTour)) {
      setSelectedTour(allTours[0] ?? '');
    }
  }, [initialTourId, initialTourTitle, language, tours, publishedDocument]);

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
  const cleanNumber = (contact.whatsappNumber || '212719603009').replace(/[^0-9]/g, '');

  const resetAndClose = () => {
    setIsSubmitted(false);
    setValidationError(null);
    onClose();
  };

  const validateForm = (): boolean => {
    if (!fullName.trim()) {
      setValidationError(bookingText('errorName'));
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setValidationError(bookingText('errorEmail'));
      return false;
    }

    const phoneDigits = phone.replace(/[^0-9]/g, '');
    if (phoneDigits.length < 6) {
      setValidationError(bookingText('errorPhone'));
      return false;
    }

    if (!date) {
      setValidationError(bookingText('errorDate'));
      return false;
    }

    if (date < today) {
      setValidationError(bookingText('errorPastDate'));
      return false;
    }

    if (guests < 1 || guests > 50) {
      setValidationError(bookingText('errorGuests'));
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
    if (languagePreference === 'es') {
      text =
        `Hola, me gustaría confirmar una solicitud de reserva a través de ${contact.siteName}:\n` +
        `• Visita: ${selectedTour}\n` +
        `• Nombre: ${fullName || 'Invitado'}\n` +
        `• Fecha: ${date || 'Flexible'}\n` +
        `• Número de personas: ${guests}\n` +
        `• Idioma del guía: español\n` +
        `• Notas: ${specialRequests || 'Ninguna'}\n` +
        (bookingRef ? `• Referencia: ${bookingRef}` : '');
    } else if (languagePreference === 'fr') {
      text =
        `Bonjour ${contact.siteName} ! Je souhaite réserver une visite :\n` +
        `• Visite : ${selectedTour}\n` +
        `• Nom : ${fullName || 'Client'}\n` +
        `• Date : ${date || 'Flexible'}\n` +
        `• Personnes : ${guests}\n` +
        `• Langue : Français\n` +
        `• Notes : ${specialRequests || 'Aucune'}\n` +
        (bookingRef ? `• Réf dossier : ${bookingRef}` : '');
    } else {
      text =
        `Hello ${contact.siteName}! I would like to confirm a tour booking:\n` +
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
          aria-label={bookingText('closeModal')}
        >
          <X className="w-5 h-5" />
        </button>

        {isSubmitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-[#005F5A]/10 text-[#005F5A] rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 id="booking-modal-title" className="text-xl font-bold text-[#1C2524]">
              {bookingText('successTitle')}
            </h3>
            <p className="text-sm text-[#4A5755] leading-relaxed">
              {bookingText('successMsg')}
            </p>
            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E2DA] inline-block">
              <span className="text-xs text-[#728280] block">{bookingText('bookingRefLabel')}</span>
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
                <span>{bookingText('openWhatsApp')}</span>
              </a>
              <button
                onClick={resetAndClose}
                className="flex-1 py-3 px-4 border border-[#E7E2DA] hover:bg-[#FAF8F5] text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                {publishedDocument ? uiText(publishedDocument, 'ui.common.close', language, UI_TEXT.common.close) : UI_TEXT.common.close[language]}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h3 id="booking-modal-title" className="text-xl font-extrabold text-[#1C2524]">
                {bookingText('title')}
              </h3>
              <p className="text-xs text-[#5D6B69] mt-1">
                {bookingText('subtitle')}
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
                  {bookingText('tour')}
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
                    {bookingText('fullName')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder={bookingText('namePlaceholder')}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#D5CEC4] bg-[#FAF8F5] focus:outline-hidden focus:ring-2 focus:ring-[#005F5A]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">
                    {bookingText('phone')} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder={bookingText('phonePlaceholder')}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#D5CEC4] bg-[#FAF8F5] focus:outline-hidden focus:ring-2 focus:ring-[#005F5A]"
                  />
                </div>
              </div>

              {/* Email & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">
                    {bookingText('email')} *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder={bookingText('emailPlaceholder')}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#D5CEC4] bg-[#FAF8F5] focus:outline-hidden focus:ring-2 focus:ring-[#005F5A]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#2A3735] mb-1">
                    {bookingText('date')} *
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
                    {bookingText('guests')}
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
                    {bookingText('guideLang')}
                  </label>
                  <select
                    value={languagePreference}
                    onChange={(e) => setLanguagePreference(e.target.value as Language)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#D5CEC4] bg-[#FAF8F5] focus:outline-hidden focus:ring-2 focus:ring-[#005F5A]"
                  >
                    <option value="en">{bookingText('guideEnglish')}</option>
                    <option value="fr">{bookingText('guideFrench')}</option>
                    <option value="es">{bookingText('guideSpanish')}</option>
                  </select>
                </div>
              </div>

              {/* Special Requests */}
              <div>
                <label className="block font-bold text-[#2A3735] mb-1">
                  {bookingText('notes')}
                </label>
                <textarea
                  rows={2}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder={bookingText('notesPlaceholder')}
                  className="w-full px-3 py-2 rounded-lg border border-[#D5CEC4] bg-[#FAF8F5] focus:outline-hidden focus:ring-2 focus:ring-[#005F5A] resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 space-y-2.5">
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-[#C84B31] hover:bg-[#B33D25] text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer text-xs uppercase tracking-wide"
                >
                  {bookingText('submitBtn')}
                </button>

                <div className="text-center">
                  <a
                    href={getWhatsAppMessage()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-[#005F5A] hover:underline"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                    <span>{bookingText('instantWhatsApp')}</span>
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
