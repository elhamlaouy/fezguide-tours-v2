import { UI_TEXT } from '../data/shared-ui';
import type { Localized } from './schema';
import { BOOKING_COPY } from './booking-copy';

export const FLOATING_COPY = {
 contact: { en: 'Contact guide on WhatsApp', fr: 'Contacter le guide sur WhatsApp', es: 'Contactar con el guía por WhatsApp' },
 title: { en: 'Med & Fez Guides', fr: 'Med et les guides de Fès', es: 'Med y los guías de Fez' },
 responseStatus: { en: 'Send your question on WhatsApp', fr: 'Envoyez votre question sur WhatsApp', es: 'Envía tu consulta por WhatsApp' },
 closeCard: { en: 'Close WhatsApp card', fr: 'Fermer la fenêtre WhatsApp', es: 'Cerrar tarjeta de WhatsApp' },
 context: { en: 'Inquiry Context:', fr: 'Votre sélection :', es: 'Motivo de la consulta:' },
 welcome: { en: 'Marhaban! We are here to answer your questions about tour details, flexible timings, or crafting custom itineraries.', fr: 'Marhaban ! Nous sommes à votre disposition pour toute question sur nos circuits, tarifs ou programmes sur mesure.', es: '¡Marhaban! Estamos aquí para responder a vuestras preguntas sobre las visitas, los horarios flexibles y los itinerarios a medida.' },
 quickQuestions: { en: 'Quick Questions:', fr: 'Questions fréquentes :', es: 'Consultas rápidas:' },
 notePlaceholder: { en: 'Type your custom question here...', fr: 'Écrivez votre message personnalisé ici...', es: 'Escribid aquí vuestra pregunta...' },
 startChat: { en: 'Start WhatsApp Chat', fr: 'Discuter sur WhatsApp', es: 'Iniciar conversación en WhatsApp' },
 footer: { en: 'Direct chat with local guides · No middleman', fr: 'Discussion directe avec nos guides · Sans intermédiaire', es: 'Contacto directo con guías locales · Sin intermediarios' },
 availability: { en: 'Check dates & availability', fr: 'Vérifier disponibilités', es: 'Consultar fechas y disponibilidad' },
 customItinerary: { en: 'Custom private itinerary', fr: 'Circuit privé sur mesure', es: 'Itinerario privado a medida' },
 pickup: { en: 'Riad pickup & transport question', fr: 'Prise en charge au riad', es: 'Consulta sobre recogida en el riad y transporte' },
} satisfies Record<string, Localized>;

/** Only keys with real consumers belong in the normal editor. Unknown legacy keys remain explicitly advanced. */
export const SUPPORTED_UI_COPY: Record<string, Localized> = {
 'ui.common.allDepartments': UI_TEXT.common.allDepartments,
 'ui.common.close': UI_TEXT.common.close,
 'ui.common.whatsappChat': UI_TEXT.common.whatsappChat,
 'ui.common.bookNow': UI_TEXT.common.bookNow,
 'ui.nav.bookTour': UI_TEXT.nav.bookTour,
 'ui.footer.contactTitle': UI_TEXT.footer.contactTitle,
 'ui.footer.copyright': UI_TEXT.footer.copyright,
 'TripadvisorReviewsSection.label.3': { en: 'Read on Tripadvisor', fr: 'Lire sur Tripadvisor', es: 'Leer en Tripadvisor' },
 'TripadvisorReviewsSection.text.1': { en: 'Tripadvisor traveler reviews', fr: 'Avis Tripadvisor', es: 'Opiniones de viajeros en Tripadvisor' },
 'ui.renderer.included': { en: 'Included', fr: 'Inclus', es: 'Incluido' },
 'ui.renderer.excluded': { en: 'Not included', fr: 'Non inclus', es: 'No incluido' },
 ...Object.fromEntries(Object.entries(BOOKING_COPY).map(([key,value]) => [`ui.booking.${key}`, value])),
 ...Object.fromEntries(Object.entries(FLOATING_COPY).map(([key,value]) => [`ui.floating.${key}`, value])),
};
