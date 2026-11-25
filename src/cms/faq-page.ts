// The FAQ page and its footer link, defined once. The seed (fresh databases) and the live-document patch
// (src/cms/live-patches.ts) both call these builders, so the two can never drift apart.
import type { CmsImage, CmsLink, CmsPage, Localized } from './schema';

export const FAQ_PAGE_ID = 'faq';
export const FAQ_FOOTER_LINK_ID = 'footer-faq';
/** Library photo for the FAQ hero. A document that lacks it simply gets a hero without a photo. */
export const FAQ_HERO_IMAGE_SRC = '/images/fez-medina/medina-14.jpg';

const copy = (en: string, fr: string, es: string): Localized => ({ en, fr, es });
const TITLE = copy('Frequently Asked Questions', 'Questions fréquentes', 'Preguntas frecuentes');

export function buildFaqPage({ faqIds, image }: { faqIds: string[]; image?: CmsImage }): CmsPage {
  return {
    id: FAQ_PAGE_ID, slug: FAQ_PAGE_ID, title: TITLE, kind: 'landing', enabled: true,
    seo: {
      // Titles stay within the editor's 42-character Google counter; descriptions within 155.
      title: copy('Fez Tour FAQ: Booking & Practical Help', 'FAQ visites de Fès : vos questions', 'FAQ de visitas en Fez: tus preguntas'),
      description: copy(
        'Answers to common questions about private tours in Fez: booking, guides, transport, walking, food and day trips with our local team.',
        'Réponses aux questions fréquentes sur nos visites privées à Fès : réservation, guides, transport, marche, cuisine et excursions.',
        'Respuestas a las preguntas más habituales sobre nuestras visitas privadas en Fez: reservas, guías, transporte, paseos, comida y excursiones.',
      ),
    },
    sections: [
      {
        id: 'hero', type: 'hero', variant: 'banner', enabled: true, title: TITLE,
        eyebrow: copy('Before You Book', 'Avant de réserver', 'Antes de reservar'),
        description: copy(
          'Clear answers about our private tours, guides, transport and day trips from Fez.',
          'Des réponses claires sur nos visites privées, nos guides, le transport et les excursions au départ de Fès.',
          'Respuestas claras sobre nuestras visitas privadas, guías, transporte y excursiones desde Fez.',
        ),
        ...(image ? { image } : {}), links: [],
      },
      { id: 'questions', type: 'faq', variant: 'accordion', enabled: true, faqIds: [...faqIds],
        title: copy('Answers to Your Questions', 'Les réponses à vos questions', 'Respuestas a tus preguntas') },
      {
        id: 'contact', type: 'contact', variant: 'banner', enabled: true,
        eyebrow: copy('Still Have a Question?', 'Une autre question ?', '¿Tienes otra pregunta?'),
        title: copy('Ask Us Directly', 'Posez-nous votre question', 'Pregúntanos directamente'),
        description: copy(
          'Cannot find your answer here? Message our team on WhatsApp and we will reply personally.',
          'Vous ne trouvez pas votre réponse ? Écrivez à notre équipe sur WhatsApp, nous vous répondrons personnellement.',
          '¿No encuentras tu respuesta? Escribe a nuestro equipo por WhatsApp y te responderemos personalmente.',
        ),
        links: [{ id: 'whatsapp', href: 'https://wa.me/212719603009', enabled: true, label: copy('Talk to Someone Who Knows Fez', 'Parlez à un local de Fès', 'Habla con alguien que conoce Fez') }],
      },
    ],
  };
}

export const buildFaqFooterLink = (page: Pick<CmsPage, 'id' | 'title'>): CmsLink => ({ id: FAQ_FOOTER_LINK_ID, pageId: page.id, label: page.title, enabled: true });
