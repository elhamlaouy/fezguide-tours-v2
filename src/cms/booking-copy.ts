import type { Localized } from './schema';

export const BOOKING_COPY = {
  "errorName": {
    "es": "Introducid vuestro nombre completo",
    "fr": "Veuillez saisir votre nom complet",
    "en": "Please enter your full name"
  },
  "errorEmail": {
    "es": "Introducid una dirección de correo electrónico válida",
    "fr": "Veuillez saisir une adresse e-mail valide",
    "en": "Please enter a valid email address"
  },
  "errorPhone": {
    "es": "Introducid un número de teléfono o WhatsApp válido con el prefijo internacional",
    "fr": "Veuillez saisir un numéro de téléphone/WhatsApp valide avec indicatif",
    "en": "Please enter a valid WhatsApp or phone number with country code"
  },
  "errorDate": {
    "es": "Seleccionad la fecha preferida para la visita",
    "fr": "Veuillez sélectionner une date",
    "en": "Please select a preferred date"
  },
  "errorPastDate": {
    "es": "No se puede elegir una fecha pasada. Seleccionad hoy o una fecha posterior.",
    "fr": "La date ne peut pas être dans le passé. Veuillez choisir aujourd’hui ou une date ultérieure.",
    "en": "Date cannot be in the past. Please choose today or a future date."
  },
  "errorGuests": {
    "es": "El número de participantes debe estar entre 1 y 50",
    "fr": "Le nombre de participants doit être compris entre 1 et 50",
    "en": "Guest count must be between 1 and 50"
  },
  "closeModal": {
    "en": "Close modal",
    "fr": "Fermer la fenêtre",
    "es": "Cerrar ventana"
  },
  "successTitle": {
    "en": "Inquiry prepared — not sent yet",
    "fr": "Demande préparée — pas encore envoyée",
    "es": "Solicitud preparada — aún no enviada"
  },
  "successMsg": {
    "en": "Nothing has been sent yet. Use the WhatsApp button below to send your inquiry. The guide will confirm availability and arrangements in the conversation.",
    "fr": "Aucune demande n’a encore été envoyée. Utilisez le bouton WhatsApp ci-dessous pour l’envoyer. Le guide confirmera les disponibilités et les modalités dans la conversation.",
    "es": "Todavía no se ha enviado ninguna solicitud. Usad el botón de WhatsApp de abajo para enviarla. El guía confirmará la disponibilidad y los detalles en la conversación."
  },
  "bookingRefLabel": {
    "en": "Inquiry Reference",
    "fr": "Référence du dossier",
    "es": "Referencia de la solicitud"
  },
  "openWhatsApp": {
    "en": "Open in WhatsApp",
    "fr": "Ouvrir dans WhatsApp",
    "es": "Abrir en WhatsApp"
  },
  "title": {
    "en": "Reserve Your Experience",
    "fr": "Réserver Votre Expérience",
    "es": "Reservad vuestra experiencia"
  },
  "subtitle": {
    "en": "Prepare your inquiry, then send it through WhatsApp. No payment is taken here.",
    "fr": "Préparez votre demande, puis envoyez-la sur WhatsApp. Aucun paiement n’est effectué ici.",
    "es": "Preparad vuestra solicitud y enviadla por WhatsApp. Aquí no se realiza ningún pago."
  },
  "tour": {
    "en": "Select Tour / Experience",
    "fr": "Choisir la Visite / Excursion",
    "es": "Seleccionad la visita o experiencia"
  },
  "fullName": {
    "en": "Full Name",
    "fr": "Nom Complet",
    "es": "Nombre completo"
  },
  "namePlaceholder": {
    "en": "e.g. Sarah Jenkins",
    "fr": "p. ex., Sarah Jenkins",
    "es": "p. ej., Sarah Jenkins"
  },
  "phone": {
    "en": "WhatsApp / Phone (with country code)",
    "fr": "WhatsApp / Téléphone (avec indicatif)",
    "es": "WhatsApp / Teléfono (con prefijo internacional)"
  },
  "phonePlaceholder": {
    "en": "+1 555 019 2834",
    "fr": "+1 555 019 2834",
    "es": "+1 555 019 2834"
  },
  "email": {
    "en": "Email Address",
    "fr": "Adresse Email",
    "es": "Correo electrónico"
  },
  "emailPlaceholder": {
    "en": "sarah@example.com",
    "fr": "sarah@example.com",
    "es": "sarah@example.com"
  },
  "date": {
    "en": "Preferred Date",
    "fr": "Date Souhaitée",
    "es": "Fecha preferida"
  },
  "guests": {
    "en": "Number of Guests",
    "fr": "Nombre de Personnes",
    "es": "Número de participantes"
  },
  "guideLang": {
    "en": "Guide Language",
    "fr": "Langue du Guide",
    "es": "Idioma del guía"
  },
  "guideEnglish": {
    "en": "English Guide",
    "fr": "Guide anglophone",
    "es": "Guía en inglés"
  },
  "guideFrench": {
    "en": "French Guide",
    "fr": "Guide francophone",
    "es": "Guía en francés"
  },
  "guideSpanish": {
    "en": "Spanish Guide",
    "fr": "Guide hispanophone",
    "es": "Guía en español"
  },
  "notes": {
    "en": "Special Requests or Hotel/Riad Name",
    "fr": "Demandes Spéciales ou Nom du Riad",
    "es": "Peticiones especiales o nombre del hotel o riad"
  },
  "notesPlaceholder": {
    "en": "Dietary requirements, Riad name for morning pickup...",
    "fr": "Régime alimentaire, nom du riad pour la prise en charge…",
    "es": "Necesidades alimentarias, nombre del riad para la recogida por la mañana…"
  },
  "submitBtn": {
    "en": "Prepare WhatsApp Inquiry",
    "fr": "Préparer la demande WhatsApp",
    "es": "Preparar solicitud para WhatsApp"
  },
  "instantWhatsApp": {
    "en": "Or Inquire Directly via WhatsApp",
    "fr": "Ou Réservez Directement sur WhatsApp",
    "es": "O consultad directamente por WhatsApp"
  }
} satisfies Record<string, Localized>;
