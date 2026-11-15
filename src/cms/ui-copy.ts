import { UI_TEXT } from '../data/shared-ui';
import type { CmsDocument, Localized } from './schema';
import type { Language } from '../types';
import { localizedText, uiText } from './render-utils';
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

/**
 * Registry entry for an owner-editable interface text: stable `key`, a human `label` and `group` (EN/FR/ES, shown
 * in the editor list) and `defaults`, which are exactly the text visitors saw before the key existed.
 * `SUPPORTED_UI_COPY` (key -> defaults) is derived from this list, so the document seed and the editor see every key.
 * A value may contain the placeholder `{count}` where noted in its label; it is replaced by an automatic number.
 */
export interface UiCopyEntry { key: string; label: Localized; group: Localized; defaults: Localized }
const L = (en: string, fr: string, es: string): Localized => ({ en, fr, es });
const GROUPS = {
 reviews: L('Tripadvisor reviews', 'Avis Tripadvisor', 'Opiniones de Tripadvisor'),
 trust: L('Tour page trust points', 'Points de confiance des pages de visite', 'Puntos de confianza de las visitas'),
 gallery: L('Page galleries', 'Galeries des pages', 'Galerías de las páginas'),
 buttons: L('Buttons and links', 'Boutons et liens', 'Botones y enlaces'),
 filters: L('Listing filters', 'Filtres des listes', 'Filtros de los listados'),
 blog: L('Blog reader', 'Lecteur du blog', 'Lector del blog'),
 footer: L('Footer', 'Pied de page', 'Pie de página'),
} as const;
const entry = (key: string, group: keyof typeof GROUPS, label: Localized, defaults: Localized): UiCopyEntry => ({ key, label, group: GROUPS[group], defaults });
const same = (value: string) => L(value, value, value);

export const HARDCODED_UI_COPY: UiCopyEntry[] = [
 entry('ui.reviews.ratingBadge', 'reviews', L('Rating line above the reviews', 'Ligne de note au-dessus des avis', 'Línea de valoración sobre las opiniones'), same('Tripadvisor · 5.0 / 5')),
 entry('ui.reviews.readAll', 'reviews', L('Link to all Tripadvisor reviews (includes the review count)', 'Lien vers tous les avis Tripadvisor (avec le nombre d’avis)', 'Enlace a todas las opiniones de Tripadvisor (con el número de opiniones)'), L('Read all 82 reviews on Tripadvisor', 'Lire les 82 avis sur Tripadvisor', 'Leer las 82 opiniones en Tripadvisor')),
 entry('ui.trust.private', 'trust', L('Trust point: private tour', 'Point de confiance : visite privée', 'Punto de confianza: visita privada'), L('100% Private (Your party only)', 'Visite 100% privée pour votre groupe', 'Visita 100 % privada para ti y tu grupo')),
 entry('ui.trust.licensed', 'trust', L('Trust point: licensed guides', 'Point de confiance : guides agréés', 'Punto de confianza: guías autorizados'), L('Official Ministry-licensed guides', 'Guides officiels agréés par l’État', 'Guías oficiales autorizados por el Ministerio de Turismo')),
 entry('ui.trust.noShops', 'trust', L('Trust point: no shop stops', 'Point de confiance : pas de boutiques', 'Punto de confianza: sin tiendas'), L('Zero tourist shop traps or kickbacks', 'Zéro boutique ou arrêt forcé', 'Sin comisiones ni paradas obligatorias en tiendas')),
 entry('ui.gallery.fez.eyebrow', 'gallery', L('Fez page gallery: small heading', 'Page Fès, galerie : petit titre', 'Página Fez, galería: antetítulo'), L('Living Heritage Gallery', 'Living Heritage Gallery', 'Galería del patrimonio vivo')),
 entry('ui.gallery.fez.description', 'gallery', L('Fez page gallery: caption', 'Page Fès, galerie : légende', 'Página Fez, galería: leyenda'), L('Authentic photos of craftsman workshops, gates, and quiet corners.', 'Authentic photos of craftsman workshops, gates, and quiet corners.', 'Fotografías auténticas de talleres artesanales, puertas y rincones tranquilos.')),
 entry('ui.gallery.dayTrips.eyebrow', 'gallery', L('Day Trips page gallery: small heading', 'Page Excursions, galerie : petit titre', 'Página Excursiones, galería: antetítulo'), L('Scenic Landscapes & Heritage', 'Scenic Landscapes & Heritage', 'Paisajes y patrimonio')),
 entry('ui.gallery.dayTrips.caption1', 'gallery', L('Day Trips gallery: caption of photo 1', 'Excursions, galerie : légende de la photo 1', 'Excursiones, galería: leyenda de la foto 1'), L('Plaza Uta el-Hammam, the historic Kasbah, and Ras El Maa.', 'Plaza Uta el-Hammam, the historic Kasbah, and Ras El Maa.', 'La plaza Uta el-Hammam, la histórica kasbah y Ras El Maa.')),
 entry('ui.gallery.dayTrips.caption2', 'gallery', L('Day Trips gallery: caption of photo 2', 'Excursions, galerie : légende de la photo 2', 'Excursiones, galería: leyenda de la foto 2'), L('Ancient Roman mosaics, Moulay Idriss pilgrimage town, and Bab Mansour.', 'Ancient Roman mosaics, Moulay Idriss pilgrimage town, and Bab Mansour.', 'Antiguos mosaicos romanos, la ciudad de peregrinación de Moulay Idriss y Bab Mansour.')),
 entry('ui.gallery.dayTrips.caption3', 'gallery', L('Day Trips gallery: caption of photo 3', 'Excursions, galerie : légende de la photo 3', 'Excursiones, galería: leyenda de la foto 3'), L('Green spaces, the stone lion, and mountain landscapes beyond Fez.', 'Green spaces, the stone lion, and mountain landscapes beyond Fez.', 'Espacios verdes, el león de piedra y paisajes de montaña más allá de Fez.')),
 entry('ui.gallery.food.eyebrow', 'gallery', L('Food Tours page gallery: small heading', 'Page Tours culinaires, galerie : petit titre', 'Página Rutas gastronómicas, galería: antetítulo'), L('Authentic Food Gallery', 'Authentic Food Gallery', 'Galería de gastronomía auténtica')),
 entry('ui.gallery.tips.eyebrow', 'gallery', L('Travel Tips page gallery: small heading', 'Page Conseils, galerie : petit titre', 'Página Consejos, galería: antetítulo'), L('Visual Guide to Fez', 'Visual Guide to Fez', 'Guía visual de Fez')),
 entry('ui.card.readGuide', 'buttons', L('Card button: Read the Guide', 'Bouton de carte : Lire le guide', 'Botón de tarjeta: Leer la guía'), L('Read the Guide', 'Lire le guide', 'Leer la guía')),
 entry('ui.card.viewTour', 'buttons', L('Card button: View Tour Details', 'Bouton de carte : Voir les détails de la visite', 'Botón de tarjeta: Ver los detalles de la visita'), L('View Tour Details', 'Voir les détails de la visite', 'Ver los detalles de la visita')),
 entry('ui.card.readArticle', 'buttons', L('Card button: Read the Article', 'Bouton de carte : Lire l’article', 'Botón de tarjeta: Leer el artículo'), L('Read the Article', 'Lire l’article', 'Leer el artículo')),
 entry('ui.card.viewDetailsItinerary', 'buttons', L('Card button: View Details & Itinerary', 'Bouton de carte : Voir détails & programme', 'Botón de tarjeta: Ver los detalles y el itinerario'), L('View Details & Itinerary', 'Voir détails & programme', 'Ver los detalles y el itinerario')),
 entry('ui.card.viewDetails', 'buttons', L('Related tour card link: View Details', 'Lien des cartes de visites liées : Voir détails', 'Enlace de visitas relacionadas: Ver detalles'), L('View Details', 'Voir détails', 'Ver detalles')),
 entry('ui.home.viewAllTours', 'buttons', L('Home page link: View All Tours', 'Lien de l’accueil : Voir toutes les visites', 'Enlace de inicio: Ver todas las visitas'), L('View All Tours', 'View All Tours', 'Ver todas las visitas')),
 entry('ui.page.backHome', 'buttons', L('Link: Back to Home', 'Lien : Retour à l’accueil', 'Enlace: Volver al inicio'), L('Back to Home', 'Retour à l’accueil', 'Volver al inicio')),
 entry('ui.filter.allExperiences', 'filters', L('Fez page filter: all ({count} is the automatic number)', 'Page Fès, filtre « tout » ({count} = nombre automatique)', 'Página Fez, filtro «todas» ({count} = número automático)'), L('All Experiences ({count})', 'All Experiences ({count})', 'Todas las experiencias')),
 entry('ui.filter.allDayTrips', 'filters', L('Day Trips page filter: all ({count} is the automatic number)', 'Page Excursions, filtre « tout » ({count} = nombre automatique)', 'Página Excursiones, filtro «todas» ({count} = número automático)'), L('All Day Trips ({count})', 'All Day Trips ({count})', 'Todas las excursiones de un día')),
 entry('ui.filter.allFood', 'filters', L('Food Tours page filter: all ({count} is the automatic number)', 'Page Tours culinaires, filtre « tout » ({count} = nombre automatique)', 'Página Rutas gastronómicas, filtro «todas» ({count} = número automático)'), L('All Food Experiences ({count})', 'All Food Experiences ({count})', 'Todas las experiencias gastronómicas')),
 entry('ui.editorial.foodToursCrumb', 'filters', L('Food article breadcrumb: parent label', 'Fil d’Ariane des articles gastronomiques : parent', 'Ruta de los artículos gastronómicos: padre'), L('Food Tours', 'Tours culinaires', 'Visitas gastronómicas')),
 entry('ui.blog.allArticles', 'blog', L('Blog filter: All Articles', 'Filtre du blog : Tous les articles', 'Filtro del blog: Todos los artículos'), L('All Articles', 'Tous les articles', 'Todos los artículos')),
 entry('ui.blog.readMore', 'blog', L('Blog card link: Read More', 'Lien des cartes du blog : Lire la suite', 'Enlace de las tarjetas del blog: Leer más'), L('Read More', 'Lire la suite', 'Leer más')),
 entry('ui.blog.writtenWith', 'blog', L('Blog reader footer: sign-off', 'Pied du lecteur du blog : signature', 'Pie del lector del blog: firma'), L('Written with love by the certified guides of FezGuideTours.', 'Rédigé avec passion par les guides certifiés de FezGuideTours.', 'Escrito con pasión por los guías oficiales de FezGuideTours.')),
 entry('ui.blog.bookTour', 'blog', L('Blog reader footer: booking button', 'Pied du lecteur du blog : bouton de réservation', 'Pie del lector del blog: botón de reserva'), L('Book a Tour in Fez', 'Réserver une visite', 'Reserva una visita en Fez')),
 entry('ui.footer.whatsappSuffix', 'footer', L('Footer: text after the phone number', 'Pied de page : texte après le numéro', 'Pie de página: texto tras el teléfono'), same('(WhatsApp 24/7)')),
];

/** Group/label metadata for the editor list, keyed like `SUPPORTED_UI_COPY`. */
export const UI_COPY_META: Record<string, { label: Localized; group: Localized }> = Object.fromEntries(HARDCODED_UI_COPY.map(item => [item.key, { label: item.label, group: item.group }]));

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
 ...Object.fromEntries(HARDCODED_UI_COPY.map(item => [item.key, item.defaults])),
 ...Object.fromEntries(Object.entries(BOOKING_COPY).map(([key,value]) => [`ui.booking.${key}`, value])),
 ...Object.fromEntries(Object.entries(FLOATING_COPY).map(([key,value]) => [`ui.floating.${key}`, value])),
};

/**
 * Owner-editable text with the shipped wording as default. `{name}` placeholders (for example the automatic `{count}`)
 * are replaced from `vars`; values are plain text and are never interpreted as HTML.
 */
export function copyText(document: CmsDocument | null | undefined, key: string, language: Language, vars?: Record<string, string | number>): string {
  const fallback = SUPPORTED_UI_COPY[key];
  const value = document ? uiText(document, key, language, fallback) : localizedText(fallback, language);
  return vars ? value.replace(/\{(\w+)\}/g, (match, name: string) => Object.hasOwn(vars, name) ? String(vars[name]) : match) : value;
}
