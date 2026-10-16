import {
  DEFAULT_SITE_SETTINGS, DEFAULT_CUSTOM_PAGES, DEFAULT_BLOG_POSTS, TEAM_MEMBERS, FAQ_ITEMS,
  FEZ_PILLARS, DAY_TRIPS_PILLARS, FOOD_TOURS_PILLARS, TRAVEL_TIPS_PILLARS, UI_TEXT,
} from '../data/translations';
import { EXPERIENCE_EXTRAS } from '../data/experienceDetails';
import { EDITORIAL_ARTICLES } from '../data/editorialArticles';
import { PROJECT_MEDIA_LIBRARY } from '../data/projectMediaLibrary';
import type { SectionPillar, Language, ItineraryStop } from '../types';
import { validateCmsDocument } from './schema';
import { SUPPORTED_UI_COPY } from './ui-copy';
import type { CmsDocument, CmsPage, CmsSection, CmsProduct, CmsImage, CmsMedia, CmsLink, CmsReview, Localized } from './schema';
function text(neutral: '' | 'Med'): Localized;
function text(en: string, fr: string, es: string): Localized;
function text(en: string, fr?: string, es?: string): Localized {
  if (en && en !== 'Med' && !es?.trim()) throw new Error(`Missing explicit Spanish seed copy: ${en}`);
  return { en, fr: fr ?? en, es: es ?? en };
}
const languages: Language[] = ['en', 'fr', 'es'];
const imagePath = (src: string) => src.replace('/src/assets/images/', '/images/');
const emptyList = (): Localized<string[]> => ({ en: [], fr: [], es: [] });
const pageLink = (id: string, pageId: string, label: Localized): CmsLink => ({ id, pageId, label, enabled: true });
const externalLink = (id: string, href: string, label: Localized): CmsLink => ({ id, href, label, enabled: true });

/**
 * Deterministic migration of the approved source release, not an old KV snapshot.
 * Returns detached public JSON. Validation never reapplies source protections to later edits.
 * UI-only source strings live in uiCopy; public compatibility records live in legacy.
 */
import { pageDescription } from './seo';

export function createCmsSeed(): CmsDocument {
  const media: CmsMedia[] = [];
  const byPath = new Map<string, CmsMedia>();
  const photo = (src: string, alt = text(''), width?: number, height?: number, caption?: Localized): CmsImage => {
    src = imagePath(src);
    let entry = byPath.get(src);
    if (!entry) {
      entry = { id: `media-${media.length + 1}`, src, alt, source: 'approved-source-release' };
      byPath.set(src, entry); media.push(entry);
    }
    if (width !== undefined) entry.width = width;
    if (height !== undefined) entry.height = height;
    if (!entry.alt.en && alt.en) entry.alt = alt;
    return { mediaId: entry.id, alt, ...(caption ? { caption } : {}) };
  };
  const rich = (id: string, paragraphs: Localized[], title?: Localized, variant: 'story' | 'panel' = 'story'): CmsSection => ({
    id, type: 'richText', enabled: true, variant, ...(title ? { title } : {}), blocks: paragraphs.map(text => ({ type: 'paragraph', text })),
  });
  const gallery = (id: string, images: CmsImage[], variant: 'grid' | 'carousel' | 'story' = 'story'): CmsSection => ({ id, type: 'gallery', enabled: true, variant, images });
  const page = (id: string, title: Localized, kind: CmsPage['kind'], sections: CmsSection[], description = text('')): CmsPage => ({
    id, slug: id, title, kind, enabled: true, seo: { title, description }, sections,
  });
  const reviews: CmsReview[] = SOURCE_REVIEWS.map((review, index) => ({ ...review, id: `tripadvisor-${index + 1}`, source: 'tripadvisor', enabled: true }));
  const reviewSection = (): CmsSection => ({ id: 'reviews', type: 'reviews', variant: 'marquee', enabled: true, reviewIds: reviews.map(r => r.id), title: text('Real stories from travelers in Fez', 'De vrais avis de voyageurs à Fès', 'Historias reales de viajeros en Fez') });
  const fezCta = (): CmsSection => ({
    id: 'fez-tours-cta', type: 'cta', variant: 'split', enabled: true, productId: 'our-fez-tours',
    description: FEZ_CTA.intro, title: FEZ_CTA.lead,
    image: photo('/images/fez-medina/medina-14.jpg', FEZ_CTA.imageAlt),
    links: [pageLink('explore-fez-tour', 'our-fez-tours', FEZ_CTA.cta)],
  });
  const tours: SectionPillar[] = [...FEZ_PILLARS, ...DAY_TRIPS_PILLARS, ...FOOD_TOURS_PILLARS, ...TRAVEL_TIPS_PILLARS].map(pillar => {
    const extra = EXPERIENCE_EXTRAS[pillar.id];
    return {
      ...pillar, image: imagePath(pillar.image), published: true,
      galleryImages: (extra?.galleryImages || [pillar.image]).map(imagePath),
      itinerary: extra?.itinerary || [], included: extra?.included || emptyList(), excluded: extra?.excluded || emptyList(),
      whatToBring: extra?.whatToBring || emptyList(), meetingPointDetails: extra?.meetingPointDetails || text(''),
    };
  });
  const products: CmsProduct[] = tours.filter(p => p.actionType === 'book_tour' && p.kind !== 'article').map(pillar => ({
    ...pillar, kind: 'product', actionType: 'book_tour', cancellationPolicy: EXPERIENCE_EXTRAS[pillar.id]?.cancellationPolicy || text(''),
    suitableFor: EXPERIENCE_EXTRAS[pillar.id]?.suitableFor || emptyList(),
    ...(pillar.practicalInfo?.priceEUR !== undefined ? { price: { amount: pillar.practicalInfo.priceEUR, currency: 'EUR', basis: pillar.id === 'our-fez-tours' ? 'person' : pillar.pageId === 'day-trips' ? 'vehicle' : 'group' } as const } : {}),
  }));
  const cards = (id: string, pillars: SectionPillar[], variant: 'overview' | 'featured' = 'overview'): CmsSection => ({
    id, type: 'cardGrid', variant, enabled: true, cards: pillars.map(p => ({ id: p.id, title: p.title, description: p.shortDescription, image: photo(p.image, p.imageAlt), pageId: p.id, badge: p.subtitle })),
  });
  const benefits = (id: string, items: { title: Localized; description: Localized }[], variant: 'grid' | 'strip' = 'grid'): CmsSection => ({ id, type: 'benefits', variant, enabled: true, items });
  const homeCopy = LANDING_COPY.home;
  const pages: CmsPage[] = [page('home', DEFAULT_SITE_SETTINGS.heroTitle, 'landing', [
    { id: 'hero', type: 'hero', variant: 'banner', enabled: true, title: DEFAULT_SITE_SETTINGS.heroTitle, description: DEFAULT_SITE_SETTINGS.heroSubtitle, eyebrow: DEFAULT_SITE_SETTINGS.heroTagline, image: photo(DEFAULT_SITE_SETTINGS.heroImage!, text('Authentic Fez Tour Group in front of Bab Boujloud with local licensed guide', 'Authentic Fez Tour Group in front of Bab Boujloud with local licensed guide', "Grupo de visitantes ante Bab Boujloud con un guía local oficial")), links: [pageLink('explore', 'fez', UI_TEXT.hero.ctaExplore), pageLink('day-trips', 'day-trips', UI_TEXT.hero.ctaDayTrips)] },
    benefits('trust', [
      { title: text('Ministry of Tourism Licensed #FEZ-2849', 'Ministry of Tourism Licensed #FEZ-2849', "Autorizados por el Ministerio de Turismo #FEZ-2849"), description: text('') },
      { title: text('5.0 on Tripadvisor (82 reviews)', '5.0 on Tripadvisor (82 reviews)', '5.0 en Tripadvisor (82 opiniones)'), description: text('') },
      { title: text('24/7 WhatsApp Assistance', '24/7 WhatsApp Assistance', 'Asistencia por WhatsApp las 24 horas'), description: text('') },
    ], 'strip'),
    { id: 'quick-navigation', type: 'cardGrid', variant: 'overview', enabled: true, eyebrow: text('FezGuideTours Ecosystem', 'FezGuideTours Ecosystem', 'El universo de FezGuideTours'), title: UI_TEXT.homeQuickNav.title, description: UI_TEXT.homeQuickNav.subtitle, cards: HOME_QUICK_CARDS.map(c => ({ id: c.id, pageId: c.id, title: c.title, description: c.desc, badge: c.badge, image: photo(c.image, c.title) })) },
    { ...cards('featured', tours.filter(t => t.id !== 'our-fez-tours').slice(0, 6), 'featured'), eyebrow: text('Handcrafted Itineraries', 'Handcrafted Itineraries', 'Itinerarios diseñados con cuidado'), title: text('Top Featured Medina Tours & Excursions', 'Top Featured Medina Tours & Excursions', 'Visitas por la medina y excursiones destacadas') },
    { ...benefits('why-choose-us', HOME_BENEFITS.map(i => ({ title: i.title, description: i.desc }))), eyebrow: text('The Local Difference', 'The Local Difference', 'La diferencia de lo local'), title: text('Why Discerning Travelers Choose Us', 'Why Discerning Travelers Choose Us', 'Por qué nos eligen los viajeros exigentes'), description: text('We eliminate the stress of the medina so you can savor every historical moment.', 'We eliminate the stress of the medina so you can savor every historical moment.', 'Os ahorramos las preocupaciones de la medina para que disfrutéis de cada momento de su historia.') },
    reviewSection(),
    { id: 'contact', type: 'contact', variant: 'banner', enabled: true, title: homeCopy[0], description: homeCopy[1], links: [externalLink('whatsapp', 'https://wa.me/212719603009', UI_TEXT.common.whatsappChat)] },
  ], DEFAULT_SITE_SETTINGS.heroSubtitle)];

  for (const category of CATEGORY_SEEDS) {
    const categoryTours = tours.filter(t => t.pageId === category.id);
    const sections: CmsSection[] = [{ id: 'hero', type: 'hero', variant: 'banner', enabled: true, title: category.title, description: category.subtitle, eyebrow: category.badge, image: photo(category.image, category.alt), links: [] }];
    if (category.id === 'fez') sections.push(benefits('introduction', LANDING_COPY.fez.slice(0, 6).filter((_, i) => i % 2 === 0).map((title, i) => ({ title, description: LANDING_COPY.fez[i * 2 + 1] }))));
    if (category.id === 'day-trips') sections.push(benefits('promises', LANDING_COPY.dayTrips.slice(0, 8).filter((_, i) => i % 2 === 0).map((title, i) => ({ title, description: LANDING_COPY.dayTrips[i * 2 + 1] })), 'strip'));
    if (category.id === 'food-tours') {
      sections.push({ ...rich('introduction', [LANDING_COPY.foodTours[2]], LANDING_COPY.foodTours[1], 'panel'), eyebrow: LANDING_COPY.foodTours[0] });
      sections.push(benefits('tastings', FOOD_TASTINGS.map(i => ({ title: i.name, description: i.desc }))));
    }
    if (category.id === 'travel-tips') {
      sections.push({ ...rich('introduction', [LANDING_COPY.travelTips[2]], LANDING_COPY.travelTips[1], 'panel'), eyebrow: LANDING_COPY.travelTips[0] });
      sections.push(benefits('quick-rules', TRAVEL_RULES.map(i => ({ title: i.title, description: i.desc }))));
    }
    sections.push(cards('overview', categoryTours));
    if (category.id === 'fez') sections.push(fezCta());
    const images = CATEGORY_GALLERIES[category.id].map(i => photo(i.src, i.alt, undefined, undefined, i.caption));
    sections.push({ ...gallery('gallery', images, 'grid'), title: category.galleryTitle });
    if (category.id === 'day-trips') sections.push({ id: 'custom-itinerary', type: 'cta', variant: 'banner', enabled: true, productId: 'daytrip-custom', eyebrow: LANDING_COPY.dayTrips[16], title: LANDING_COPY.dayTrips[17], description: LANDING_COPY.dayTrips[18], links: [pageLink('custom', 'daytrip-custom', LANDING_COPY.dayTrips[19])] });
    if (category.id === 'food-tours') sections.push({ id: 'food-tour-cta', type: 'cta', variant: 'banner', enabled: true, productId: 'our-food-tours', eyebrow: LANDING_COPY.foodTours[5], title: LANDING_COPY.foodTours[6], description: LANDING_COPY.foodTours[7], links: [pageLink('food-tour', 'our-food-tours', LANDING_COPY.foodTours[8])] });
    if (category.id === 'travel-tips') {
      sections.push({ id: 'currency-estimator', type: 'practicalInfo', variant: 'panel', enabled: true, title: LANDING_COPY.travelTips[5], items: [{ title: LANDING_COPY.travelTips[7], description: LANDING_COPY.travelTips[6] }, { title: LANDING_COPY.travelTips[8], description: text('') }] });
      sections.push({ id: 'medina-gates', type: 'practicalInfo', variant: 'panel', enabled: true, title: LANDING_COPY.travelTips[9], description: LANDING_COPY.travelTips[10], items: MEDINA_GATES });
      sections.push({ id: 'contact', type: 'contact', variant: 'banner', enabled: true, eyebrow: LANDING_COPY.travelTips[11], title: LANDING_COPY.travelTips[12], description: LANDING_COPY.travelTips[13], links: [externalLink('whatsapp', 'https://wa.me/212719603009', UI_TEXT.common.whatsappChat)] });
    }
    pages.push(page(category.id, category.title, category.id === 'travel-tips' ? 'editorial' : 'landing', sections, category.subtitle));
  }

  for (const story of FEZ_STORIES) {
    const sections: CmsSection[] = [rich('introduction', [story.paragraphs[0]])];
    if (story.id === 'fez-explore-medina') {
      for (const [index, group] of story.imageGroups.entries()) {
        sections.push(gallery(`gallery-${index + 1}`, group.map(i => photo(i.src, i.alt, i.width, i.height))));
        if (story.paragraphs[index + 1]) sections.push(rich(`story-${index + 1}`, [story.paragraphs[index + 1]]));
      }
    } else {
      if (story.id === 'fez-history-landmarks') sections.push(gallery('gallery-1', story.imageGroups[0].map(i => photo(i.src, i.alt, i.width, i.height))));
      for (let index = 1; index < story.paragraphs.length; index++) {
        sections.push(rich(`story-${index}`, [story.paragraphs[index]]));
        const imageIndex = story.id === 'fez-history-landmarks' ? story.imageAfter[index] : index;
        if (imageIndex !== null && imageIndex !== undefined && story.imageGroups[imageIndex - 1]) sections.push(gallery(`gallery-${imageIndex}`, story.imageGroups[imageIndex - 1].map(i => photo(i.src, i.alt, i.width, i.height))));
      }
    }
    sections.push(fezCta(), reviewSection());
    pages.push({ ...page(story.id, story.title, 'editorial', sections, story.paragraphs[0]), parentId: 'fez', source: story.source });
  }

  for (const article of EDITORIAL_ARTICLES) {
    const sections: CmsSection[] = [];
    for (const [index, source] of article.sections.entries()) {
      const count = Math.max(...languages.map(l => source.paragraphs[l].length));
      sections.push(rich(`story-${index + 1}`, Array.from({ length: count }, (_, i) => ({ en: source.paragraphs.en[i] || '', fr: source.paragraphs.fr[i] || '', es: source.paragraphs.es[i] || '' })), source.heading));
      if (source.images.length) sections.push(gallery(`photos-${index + 1}`, source.images.map(i => photo(i.src, i.alt, i.width, i.height))));
    }
    if (article.cta && article.productId) sections.push({ id: 'product-cta', type: 'cta', variant: 'split', enabled: true, productId: article.productId, title: article.cta.lead, description: article.cta.intro, image: photo(article.cta.image, article.cta.imageAlt), links: [pageLink('product', article.productId, article.cta.button)] });
    if (article.contact) sections.push({ id: 'contact', type: 'contact', variant: 'banner', enabled: true, links: [externalLink('contact', article.contact.href, article.contact.label)] });
    // Reviews are present on the source editorial renderer, including travel tips.
    sections.push(reviewSection());
    const parentId = article.id.startsWith('tips-') ? 'travel-tips' : 'food-tours';
    pages.push({ ...page(article.id, article.title, 'editorial', sections), parentId, source: `src/data/${parentId === 'travel-tips' ? 'tipArticles' : 'editorialArticles'}.ts` });
  }

  for (const product of products) {
    if (product.id === 'our-fez-tours') {
      const field = (key: keyof typeof FEZ_PRODUCT_COPY.en): Localized => text(String(FEZ_PRODUCT_COPY.en[key]), String(FEZ_PRODUCT_COPY.fr[key]), String(FEZ_PRODUCT_COPY.es[key]));
      const paragraphs = (key: 'overview' | 'meeting' | 'extra' | 'included' | 'excluded'): Localized[] => FEZ_PRODUCT_COPY.en[key].map((en, i) => text(en, FEZ_PRODUCT_COPY.fr[key][i], FEZ_PRODUCT_COPY.es[key][i]));
      product.title = field('title'); product.fullDescription = text(FEZ_PRODUCT_COPY.en.overview.join('\n\n'), FEZ_PRODUCT_COPY.fr.overview.join('\n\n'), FEZ_PRODUCT_COPY.es.overview.join('\n\n'));
      product.galleryImages = FEZ_PRODUCT_IMAGES.map(i => i.src); product.included = { en: FEZ_PRODUCT_COPY.en.included, fr: FEZ_PRODUCT_COPY.fr.included, es: FEZ_PRODUCT_COPY.es.included };
      product.excluded = { en: FEZ_PRODUCT_COPY.en.excluded, fr: FEZ_PRODUCT_COPY.fr.excluded, es: FEZ_PRODUCT_COPY.es.excluded };
      product.itinerary = FEZ_PRODUCT_STOPS; product.cancellationPolicy = field('cancel'); product.suitableFor = { en: FEZ_PRODUCT_COPY.en.extra, fr: FEZ_PRODUCT_COPY.fr.extra, es: FEZ_PRODUCT_COPY.es.extra };
      product.meetingPointDetails = text(FEZ_PRODUCT_COPY.en.meeting.join('\n\n'), FEZ_PRODUCT_COPY.fr.meeting.join('\n\n'), FEZ_PRODUCT_COPY.es.meeting.join('\n\n'));
      product.practicalInfo = { ...product.practicalInfo, duration: field('duration'), groupSize: field('format'), departure: field('pickup') };
      const sections: CmsSection[] = [
        { id: 'header', type: 'hero', variant: 'minimal', enabled: true, title: field('title'), description: field('lead'), links: [] },
        { ...gallery('gallery', FEZ_PRODUCT_IMAGES.map(i => photo(i.src, i.alt, i.width, i.height)), 'carousel'), title: field('galleryLabel') },
        { id: 'facts', type: 'practicalInfo', variant: 'facts', enabled: true, title: field('detailsLabel'), items: ['duration', 'format', 'pickup', 'languages'].map(key => ({ title: field(`${key}Label` as keyof typeof FEZ_PRODUCT_COPY.en), description: field(key as keyof typeof FEZ_PRODUCT_COPY.en) })) },
        { ...rich('overview', paragraphs('overview'), field('overviewTitle'), 'panel'), eyebrow: field('overviewLabel') },
        { id: 'included', type: 'inclusions', variant: 'columns', enabled: true, title: field('includedTitle'), eyebrow: field('includedLabel'), included: product.included, excluded: product.excluded },
        { ...rich('meeting', paragraphs('meeting'), field('meetingTitle'), 'panel'), eyebrow: field('meetingLabel') },
        { id: 'itinerary', type: 'itinerary', variant: 'timeline', enabled: true, title: field('itineraryTitle'), eyebrow: field('itineraryLabel'), stops: FEZ_PRODUCT_STOPS },
        { id: 'extra', type: 'richText', variant: 'panel', enabled: true, title: field('extraTitle'), eyebrow: field('extraLabel'), blocks: [{ type: 'list', items: product.suitableFor }] },
        { ...rich('cancel', [field('cancel')], field('cancelTitle'), 'panel'), eyebrow: field('cancelLabel') },
        { id: 'booking', type: 'cta', variant: 'booking', enabled: true, productId: product.id, title: field('priceLabel'), description: field('estimate'), links: [externalLink('whatsapp', 'https://wa.me/212719603009', field('whatsapp'))] },
        reviewSection(),
      ];
      pages.push({ ...page(product.id, product.title, 'product', sections, field('lead')), parentId: 'fez', productId: product.id, source: 'src/pages/OurFezToursPage.tsx' });
    } else {
      const sections: CmsSection[] = [
        { id: 'header', type: 'hero', variant: 'minimal', enabled: true, title: product.title, description: product.shortDescription, links: [] },
        gallery('gallery', product.galleryImages!.map(src => photo(src, src === product.image ? product.imageAlt : text(''))), 'carousel'),
        { id: 'facts', type: 'practicalInfo', variant: 'facts', enabled: true, items: [
          { title: text('Duration', 'Durée', 'Duración'), description: product.practicalInfo?.duration || text('4 - 5 Hours', '4 - 5 Hours', '4 - 5 horas') },
          { title: text('Format', 'Format', 'Formato'), description: product.practicalInfo?.groupSize || text('Private Group Only', 'Private Group Only', 'Solo vuestro grupo privado') },
          { title: text('Meeting / Pickup', 'Départ', 'Punto de encuentro / Recogida'), description: product.practicalInfo?.departure || text('Bab Boujloud or Riad', 'Bab Boujloud or Riad', "Bab Boujloud o tu riad") },
          { title: text('Languages', 'Langues', 'Idiomas'), description: text('English, Français and Español', 'English, Français and Español', 'Inglés, francés y español') },
        ] },
        rich('overview', [product.fullDescription], product.title, 'panel'),
        { id: 'highlights', type: 'richText', variant: 'panel', enabled: true, title: UI_TEXT.common.highlights, blocks: [{ type: 'list', items: product.highlights }] },
        { id: 'itinerary', type: 'itinerary', variant: 'timeline', enabled: true, stops: product.itinerary! },
        { id: 'included', type: 'inclusions', variant: 'columns', enabled: true, title: UI_TEXT.common.included, included: product.included!, excluded: product.excluded! },
        { id: 'bring', type: 'richText', variant: 'panel', enabled: true, blocks: [{ type: 'list', items: product.whatToBring! }] },
        { id: 'booking', type: 'cta', variant: 'booking', enabled: true, productId: product.id, links: [externalLink('whatsapp', 'https://wa.me/212719603009', UI_TEXT.common.whatsappChat)] },
        { ...cards('related', tours.filter(t => t.id !== product.id).slice(0, 3), 'featured'), eyebrow: text('More Experiences', 'Vous Aimerez Aussi', 'Más experiencias'), title: text('You Might Also Like', 'Complétez votre séjour à Fès', 'También os puede interesar') },
        reviewSection(),
      ];
      pages.push({ ...page(product.id, product.title, 'product', sections, product.shortDescription), parentId: product.pageId, productId: product.id, source: 'src/data/translations.ts + src/data/experienceDetails.ts' });
    }
  }

  const aboutSections: CmsSection[] = [rich('introduction', ABOUT_PARAGRAPHS.slice(0, 4), ABOUT_HEADINGS[0])];
  aboutSections.push({ id: 'med', type: 'richText', variant: 'story', enabled: true, title: ABOUT_HEADINGS[1], blocks: [
    { type: 'heading', text: text('Med') }, { type: 'paragraph', text: ABOUT_HEADINGS[2] }, { type: 'paragraph', text: ABOUT_PARAGRAPHS[4] },
  ] });
  aboutSections.push(gallery('med-photo', [photo(ABOUT_IMAGES[0].src, ABOUT_IMAGES[0].alt, ABOUT_IMAGES[0].width, ABOUT_IMAGES[0].height)]));
  aboutSections.push(rich('guides', [ABOUT_PARAGRAPHS[5]], ABOUT_HEADINGS[3]), gallery('guides-photos', ABOUT_IMAGES.slice(1, 5).map(i => photo(i.src, i.alt, i.width, i.height)), 'grid'));
  aboutSections.push(rich('drivers', [ABOUT_PARAGRAPHS[6]], ABOUT_HEADINGS[4]), gallery('drivers-photos', ABOUT_IMAGES.slice(5).map(i => photo(i.src, i.alt, i.width, i.height)), 'grid'));
  aboutSections.push(rich('why', ABOUT_PARAGRAPHS.slice(7), ABOUT_HEADINGS[5]));
  pages.push({ ...page('about', text('About Us & Our Team', 'À propos et notre équipe', "Quiénes somos y nuestro equipo"), 'editorial', aboutSections, ABOUT_PARAGRAPHS[0]), source: 'src/pages/AboutPage.tsx' });

  const customPages = DEFAULT_CUSTOM_PAGES.map(p => ({ ...p, heroImage: imagePath(p.heroImage) }));
  const blogPosts = DEFAULT_BLOG_POSTS.map(p => ({ ...p, coverImage: imagePath(p.coverImage) }));
  const teamMembers = TEAM_MEMBERS.map(p => ({ ...p, avatarUrl: imagePath(p.avatarUrl) }));
  for (const custom of customPages) pages.push({ ...page(custom.id, custom.title, 'landing', [
    { id: 'hero', type: 'hero', variant: 'banner', enabled: true, title: custom.title, description: custom.subtitle, image: photo(custom.heroImage, custom.title), links: [] },
    rich('content', [custom.content]), { id: 'highlights', type: 'richText', variant: 'panel', enabled: true, blocks: [{ type: 'list', items: custom.highlights }] },
  ], custom.subtitle), slug: custom.slug, enabled: custom.published, source: 'src/data/translations.ts' });
  pages.push({ ...page('blog', text('Blog', 'Blog', 'Blog'), 'landing', [
    { id: 'hero', type: 'hero', variant: 'banner', enabled: true,
      title: text('Fez Travel Stories, Heritage & Guides', 'Récits de Voyage, Patrimoine & Guides de Fès', "Blog de Fez: historias de su patrimonio, guías y secretos de la ciudad"),
      description: text('Articles and insider guides curated by licensed local historians and storytellers.', 'Articles et secrets locaux rédigés par nos historiens et guides officiels.', "Artículos y guías exclusivos escritos por guías oficiales e historiadores locales."),
      eyebrow: text('FezGuideTours Journal', 'FezGuideTours Journal', 'Diario de FezGuideTours'), image: photo('/images/real/fez_history_culture_image1.jpg', text('Fez Travel Blog', 'Fez Travel Blog', 'Blog de viajes de Fez')), links: [],
    },
    { id: 'posts', type: 'cardGrid', variant: 'overview', enabled: true, cards: blogPosts.filter(p => p.published !== false).map(p => ({ id: p.id, pageId: p.id, title: p.title, description: p.excerpt, image: photo(p.coverImage, p.title) })) },
  ]), source: 'src/pages/BlogPage.tsx' });
  for (const post of blogPosts) pages.push({ ...page(post.id, post.title, 'editorial', [gallery('cover', [photo(post.coverImage, post.title)]), rich('content', [post.content])], post.excerpt), slug: post.slug, parentId: 'blog', enabled: post.published, source: 'src/data/translations.ts' });
  for (const member of teamMembers) photo(member.avatarUrl, text(member.name, member.name, member.name));
  for (const item of PROJECT_MEDIA_LIBRARY) photo(item.path, text(item.name, item.name, MEDIA_LIBRARY_SPANISH[item.name]));
  for (const item of SOURCE_PHOTOS) photo(item, text(''));

  const navigation: CmsLink[] = [
    pageLink('home', 'home', UI_TEXT.nav.home), pageLink('fez', 'fez', UI_TEXT.nav.fez), pageLink('day-trips', 'day-trips', UI_TEXT.nav.dayTrips),
    pageLink('food-tours', 'food-tours', UI_TEXT.nav.foodTours), pageLink('travel-tips', 'travel-tips', UI_TEXT.nav.travelTips), pageLink('about', 'about', UI_TEXT.nav.about),
    ...customPages.filter(p => p.showInNav).map(p => pageLink(`nav-${p.id}`, p.id, p.title)),
    ...(blogPosts.length ? [pageLink('blog', 'blog', text('Blog', 'Blog', 'Blog'))] : []),
  ];
  const uiCopy: Record<string, Localized> = Object.fromEntries(Object.entries(SUPPORTED_UI_COPY).map(([key, fallback]) => [key, SHARED_UI_COPY[key] ?? fallback]));
  const document: CmsDocument = {
    schemaVersion: 1, siteSettings: DEFAULT_SITE_SETTINGS,
    theme: { colors: { primary: '#005F5A', accent: '#C84B31', background: '#FAF8F5', text: '#1C2524' }, font: 'system', fontScale: 1, containerWidth: 1280, spacing: 'comfortable', radius: 'rounded', buttonVariant: 'solid', cardVariant: 'outlined' },
    navigation, footer: { text: UI_TEXT.footer.aboutText, links: [
      ...navigation.slice(0, 6),
      ...(blogPosts.length ? [pageLink('blog', 'blog', text('Blog & Travel Stories', 'Blog & Travel Stories', 'Blog y relatos de viaje'))] : []),
      ...customPages.filter(p => p.published !== false).map(p => pageLink(`footer-${p.id}`, p.id, p.title)),
    ] }, uiCopy,
    pages, products, editorialEntries: pages.filter(p => p.kind === 'editorial').map(p => ({ id: p.id, pageId: p.id, source: p.source || 'src/data/translations.ts', ...(p.id.startsWith('food-') ? { productId: 'our-food-tours' } : p.id.startsWith('fez-') ? { productId: 'our-fez-tours' } : {}) })),
    blogPosts, teamMembers, faqs: FAQ_ITEMS, media, reviews,
    legacy: { tours, customPages, blogPosts, teamMembers, faqs: FAQ_ITEMS, siteSettings: DEFAULT_SITE_SETTINGS },
  };
  const detached = structuredClone(document);
  for (const page of detached.pages) for (const language of languages) {
    if (!page.seo.description[language].trim()) page.seo.description[language] = pageDescription(detached, page, language);
  }
  const result = validateCmsDocument(detached);
  if (!result.valid) throw new Error(`Invalid CMS source seed: ${result.errors.join('; ')}`);
  return detached;
}

// Static source-page fixtures follow. These preserve approved component-local copy
// without importing React components (and without requiring Node/fs in the Worker).
const LANDING_COPY: Record<"home" | "fez" | "dayTrips" | "foodTours" | "travelTips", Localized[]> = {
  "home": [
    {
      "en": "Ready to Explore Fez with an Official Local Guide?",
      "fr": "Prêt à explorer Fès avec un guide officiel ?",
      "es": "¿Listos para descubrir Fez con un guía local oficial?"
    },
    {
      "en": "Book online today with free flexible cancellation, or chat with our team directly on WhatsApp for custom private requests.",
      "fr": "Réservez en ligne avec annulation flexible, ou écrivez-nous sur WhatsApp pour une visite sur mesure.",
      "es": "Reservad hoy en línea con cancelación flexible gratuita, o contactad directamente con nuestro equipo por WhatsApp para organizar una visita privada a medida."
    }
  ],
  "fez": [
    {
      "en": "Fes el-Bali (Old Medina)",
      "fr": "Fes el-Bali (Old Medina)",
      "es": "Fes el-Bali (medina antigua)"
    },
    {
      "en": "The historic heart of Fez, known for its narrow pedestrian streets, traditional souks, historic buildings, and authentic craftsman workshops.",
      "fr": "The historic heart of Fez, known for its narrow pedestrian streets, traditional souks, historic buildings, and authentic craftsman workshops.",
      "es": "El corazón histórico de Fez, conocido por sus estrechas calles peatonales, sus zocos tradicionales, sus edificios históricos y sus auténticos talleres artesanales."
    },
    {
      "en": "Fes Jdid & Mellah",
      "fr": "Fes Jdid & Mellah",
      "es": "Fes Jdid y el Mellah"
    },
    {
      "en": "An important historic area connected to the Royal Palace and the centuries-old Jewish heritage of Fez with distinctive wooden balconies.",
      "fr": "An important historic area connected to the Royal Palace and the centuries-old Jewish heritage of Fez with distinctive wooden balconies.",
      "es": "Una importante zona histórica vinculada al Palacio Real y al patrimonio judío centenario de Fez, con sus característicos balcones de madera."
    },
    {
      "en": "New City & Viewpoints",
      "fr": "New City & Viewpoints",
      "es": "Ciudad Nueva y miradores"
    },
    {
      "en": "Panoramic hillside viewpoints over the rooftops and minarets of the Medina, and lively New City cafés to experience Fez at night.",
      "fr": "Panoramic hillside viewpoints over the rooftops and minarets of the Medina, and lively New City cafés to experience Fez at night.",
      "es": "Miradores en las colinas con vistas a los tejados y minaretes de la medina, y animadas cafeterías de la Ciudad Nueva para disfrutar de Fez por la noche."
    },
    {
      "en": "Living Heritage Gallery",
      "fr": "Living Heritage Gallery",
      "es": "Galería del patrimonio vivo"
    },
    {
      "en": "Real Scenes From the Streets of Fez",
      "fr": "Real Scenes From the Streets of Fez",
      "es": "Escenas reales de las calles de Fez"
    },
    {
      "en": "Authentic photos of craftsman workshops, gates, and quiet corners.",
      "fr": "Authentic photos of craftsman workshops, gates, and quiet corners.",
      "es": "Fotografías auténticas de talleres artesanales, puertas y rincones tranquilos."
    }
  ],
  "dayTrips": [
    {
      "en": "100% Private Excursions",
      "fr": "100% Private Excursions",
      "es": "Excursiones 100 % privadas"
    },
    {
      "en": "Only for you and your travelling companions",
      "fr": "Only for you and your travelling companions",
      "es": "Solo para vosotros y vuestros compañeros de viaje"
    },
    {
      "en": "Comfortable Vehicles",
      "fr": "Comfortable Vehicles",
      "es": "Vehículos cómodos"
    },
    {
      "en": "Modern, air-conditioned fleet with trusted drivers",
      "fr": "Modern, air-conditioned fleet with trusted drivers",
      "es": "Flota moderna con aire acondicionado y conductores de confianza"
    },
    {
      "en": "Flexible Timing",
      "fr": "Flexible Timing",
      "es": "Horarios flexibles"
    },
    {
      "en": "Stop for tea, photos, or lunch at your own pace",
      "fr": "Stop for tea, photos, or lunch at your own pace",
      "es": "Parad a tomar té, hacer fotos o comer a vuestro ritmo"
    },
    {
      "en": "Driver or Driver + Guide",
      "fr": "Driver or Driver + Guide",
      "es": "Conductor o conductor y guía"
    },
    {
      "en": "Travel independently or add a local licensed guide",
      "fr": "Travel independently or add a local licensed guide",
      "es": "Viajad por vuestra cuenta o añadid un guía local oficial"
    },
    {
      "en": "Scenic Landscapes & Heritage",
      "fr": "Scenic Landscapes & Heritage",
      "es": "Paisajes y patrimonio"
    },
    {
      "en": "What You Discover Beyond the City",
      "fr": "What You Discover Beyond the City",
      "es": "Lo que descubriréis más allá de la ciudad"
    },
    {
      "en": "Chefchaouen & Rif Mountains",
      "fr": "Chefchaouen & Rif Mountains",
      "es": "Chefchaouen y las montañas del Rif"
    },
    {
      "en": "Plaza Uta el-Hammam, the historic Kasbah, and Ras El Maa.",
      "fr": "Plaza Uta el-Hammam, the historic Kasbah, and Ras El Maa.",
      "es": "La plaza Uta el-Hammam, la histórica kasbah y Ras El Maa."
    },
    {
      "en": "Roman Volubilis & Meknes",
      "fr": "Roman Volubilis & Meknes",
      "es": "La Volubilis romana y Meknes"
    },
    {
      "en": "Ancient Roman mosaics, Moulay Idriss pilgrimage town, and Bab Mansour.",
      "fr": "Ancient Roman mosaics, Moulay Idriss pilgrimage town, and Bab Mansour.",
      "es": "Antiguos mosaicos romanos, la ciudad de peregrinación de Moulay Idriss y Bab Mansour."
    },
    {
      "en": "Ifrane & Middle Atlas",
      "fr": "Ifrane & Middle Atlas",
      "es": "Ifrane y el Atlas Medio"
    },
    {
      "en": "Green spaces, the stone lion, and mountain landscapes beyond Fez.",
      "fr": "Green spaces, the stone lion, and mountain landscapes beyond Fez.",
      "es": "Espacios verdes, el león de piedra y paisajes de montaña más allá de Fez."
    },
    {
      "en": "Custom Itineraries",
      "fr": "Itinéraires Sur Mesure",
      "es": "Itinerarios a medida"
    },
    {
      "en": "Have Somewhere Specific in Mind? Design Your Own Day",
      "fr": "Une envie particulière ? Créez votre excursion sur mesure",
      "es": "¿Tenéis un destino concreto en mente? Diseñad vuestro propio día"
    },
    {
      "en": "Tell us what you would like to see and we can help you create a comfortable itinerary from Fez. Private vehicle, flexible schedule, and travel with driver only or driver + guide.",
      "fr": "Indiquez-nous vos envies et nous concevrons un itinéraire confortable au départ de Fès. Véhicule climatisé, horaires flexibles et guide privé.",
      "es": "Contadnos qué os gustaría ver y os ayudaremos a crear un itinerario cómodo desde Fez. Vehículo privado, horario flexible y viaje con conductor o con conductor y guía."
    },
    {
      "en": "Tell Us What You Would Like to Discover",
      "fr": "Personnaliser mon excursion",
      "es": "Contadnos qué os gustaría descubrir"
    }
  ],
  "foodTours": [
    {
      "en": "Not a Sit-Down Dinner — An Alley Safari",
      "fr": "Not a Sit-Down Dinner — An Alley Safari",
      "es": "No es una cena de restaurante: es una ruta por los callejones"
    },
    {
      "en": "Experience Food Where It Belongs: Among the Streets & People of Fez",
      "fr": "Experience Food Where It Belongs: Among the Streets & People of Fez",
      "es": "Disfrutad de la comida en su entorno: las calles y la gente de Fez"
    },
    {
      "en": "This is not simply a tour where you sit down for one large restaurant meal. Instead, we walk through the Old Medina and stop along the way to discover and taste different foods, snacks, sweets, and local specialities while learning how they are connected to life in Fez.",
      "fr": "This is not simply a tour where you sit down for one large restaurant meal. Instead, we walk through the Old Medina and stop along the way to discover and taste different foods, snacks, sweets, and local specialities while learning how they are connected to life in Fez.",
      "es": "No es una visita en la que simplemente os sentáis a disfrutar de una gran comida en un restaurante. En su lugar, recorremos la medina antigua y hacemos paradas para descubrir y probar diferentes platos, aperitivos, dulces y especialidades locales, mientras aprendemos cómo se relacionan con la vida en Fez."
    },
    {
      "en": "Authentic Food Gallery",
      "fr": "Authentic Food Gallery",
      "es": "Galería de gastronomía auténtica"
    },
    {
      "en": "Real Flavours of Fassi Culinary Life",
      "fr": "Real Flavours of Fassi Culinary Life",
      "es": "Sabores auténticos de la vida culinaria de Fez"
    },
    {
      "en": "Come Hungry — Leave with a Taste of Fez",
      "fr": "Venez le ventre vide — repartez conquis par les saveurs de Fès",
      "es": "Venid con hambre y llevaos el sabor de Fez"
    },
    {
      "en": "Book Your Private Medina Food Tasting Walk",
      "fr": "Réservez votre visite culinaire privée dans la médina",
      "es": "Reservad vuestra ruta gastronómica privada por la medina"
    },
    {
      "en": "This is a private food walk for you and your group. The tastings follow what local shops are preparing that day.",
      "fr": "Une balade privée pour vous et votre groupe. Les dégustations suivent ce que les boutiques préparent ce jour-là.",
      "es": "Una ruta gastronómica privada para vosotros y vuestro grupo. Las degustaciones dependen de lo que preparen las tiendas locales ese día."
    },
    {
      "en": "Book Your Private Food Tasting Walk",
      "fr": "Réserver la visite culinaire",
      "es": "Reservad vuestra ruta privada de degustación"
    }
  ],
  "travelTips": [
    {
      "en": "Essential Local Advice",
      "fr": "Essential Local Advice",
      "es": "Consejos locales esenciales"
    },
    {
      "en": "A Few Local Tips Can Make a Big Difference",
      "fr": "A Few Local Tips Can Make a Big Difference",
      "es": "Unos pocos consejos locales pueden marcar la diferencia"
    },
    {
      "en": "You do not need to know everything before you arrive. A little patience, respect, and curiosity will take you a long way.",
      "fr": "You do not need to know everything before you arrive. A little patience, respect, and curiosity will take you a long way.",
      "es": "No necesitáis saberlo todo antes de llegar. Un poco de paciencia, respeto y curiosidad os ayudará mucho."
    },
    {
      "en": "Visual Guide to Fez",
      "fr": "Visual Guide to Fez",
      "es": "Guía visual de Fez"
    },
    {
      "en": "Everyday Scenes & Practical Navigation",
      "fr": "Everyday Scenes & Practical Navigation",
      "es": "Escenas cotidianas y orientación práctica"
    },
    {
      "en": "Quick Currency Estimator",
      "fr": "Quick Currency Estimator",
      "es": "Conversor rápido de moneda"
    },
    {
      "en": "Approximate conversion: 1 EUR ≈ 10.8 MAD",
      "fr": "Approximate conversion: 1 EUR ≈ 10.8 MAD",
      "es": "Conversión aproximada: 1 EUR ≈ 10.8 MAD"
    },
    {
      "en": "Amount in EUR:",
      "fr": "Amount in EUR:",
      "es": "Importe en EUR:"
    },
    {
      "en": "Equivalent in MAD:",
      "fr": "Equivalent in MAD:",
      "es": "Equivalente en MAD:"
    },
    {
      "en": "Medina Gates Reference",
      "fr": "Medina Gates Reference",
      "es": "Referencia de las puertas de la medina"
    },
    {
      "en": "Where vehicles can reach you around the pedestrian zone",
      "fr": "Where vehicles can reach you around the pedestrian zone",
      "es": "Puntos junto a la zona peatonal a los que pueden llegar los vehículos"
    },
    {
      "en": "Need More Local Advice?",
      "fr": "Besoin de Conseils Locaux ?",
      "es": "¿Necesitáis más consejos locales?"
    },
    {
      "en": "Travel with Useful Information. Explore with Confidence.",
      "fr": "Voyagez avec des informations fiables. Explorez en toute sérénité.",
      "es": "Viajad con información útil. Explorad con confianza."
    },
    {
      "en": "If you have a question about your visit, places to see, local customs, or how to organize your time in Fez, feel free to contact us.",
      "fr": "Une question sur votre séjour, les coutumes locales ou l’organisation de vos journées à Fès ? Contactez directement nos guides.",
      "es": "Si tenéis alguna pregunta sobre vuestra visita, los lugares de interés, las costumbres locales o cómo organizar vuestro tiempo en Fez, no dudéis en contactarnos."
    }
  ]
};

const HOME_QUICK_CARDS = [
  {
    "id": "fez",
    "title": {
      "en": "Explore the Medina",
      "fr": "Explorer la Médina",
      "es": "Explora la medina"
    },
    "desc": {
      "en": "Fes el-Bali walking tours, living artisan workshops, historic madrasas, and panoramic rooftop views.",
      "fr": "Ruelles piétonnes, ateliers d’artisans vivants, médersas historiques et panoramas sur les toits.",
      "es": "Paseos por Fez el-Bali, talleres artesanos en activo, madrasas históricas y vistas panorámicas de los tejados."
    },
    "image": "/images/real/fez_explore_medina_image1.jpg",
    "badge": {
      "en": "Living City",
      "fr": "Cité Vivante",
      "es": "Ciudad viva"
    }
  },
  {
    "id": "day-trips",
    "title": {
      "en": "Private Day Trips",
      "fr": "Excursions Privées",
      "es": "Excursiones privadas"
    },
    "desc": {
      "en": "Chefchaouen, Meknes and Volubilis, and the mountains of the Middle Atlas.",
      "fr": "Chefchaouen, Meknès et Volubilis, et les montagnes du Moyen Atlas.",
      "es": "Chefchaouen, Mequinez y Volubilis, y las montañas del Atlas Medio."
    },
    "image": "/images/daytrip-chefchaouen/blue-alley.webp",
    "badge": {
      "en": "Private Transport",
      "fr": "Transport Privé",
      "es": "Transporte privado"
    }
  },
  {
    "id": "food-tours",
    "title": {
      "en": "Food & Tasting Walks",
      "fr": "Tours Culinaires",
      "es": "Paseos gastronómicos"
    },
    "desc": {
      "en": "An alley safari: warm Harcha, Baghrir, piping-hot Bissara soup, local cheeses, and mint tea.",
      "fr": "Safari gourmand : Harcha tiède, Baghrir au miel, Bissara fumante, fromages et thé à la menthe.",
      "es": "Sabores entre callejuelas: harcha recién hecha, baghrir, bissara caliente, quesos locales y té a la menta."
    },
    "image": "/images/food-tasting-walk/wood-oven.webp",
    "badge": {
      "en": "Street Food Safari",
      "fr": "Dégustations",
      "es": "Sabores de la calle"
    }
  },
  {
    "id": "travel-tips",
    "title": {
      "en": "Practical Travel Tips",
      "fr": "Conseils Pratiques",
      "es": "Consejos prácticos de viaje"
    },
    "desc": {
      "en": "Getting around on foot, red Petit Taxis (10–20 MAD), cash in MAD, Friday prayer rhythm, and customs.",
      "fr": "Se déplacer à pied, petits taxis rouges (10–20 MAD), espèces, rythme du vendredi et coutumes.",
      "es": "Moverse a pie, taxis rojos (10–20 MAD), efectivo en dírhams, horarios de oración del viernes y costumbres locales."
    },
    "image": "/images/real/tips_getting_around_image1.jpg",
    "badge": {
      "en": "Local Advice",
      "fr": "Conseils Locaux",
      "es": "Consejos locales"
    }
  },
  {
    "id": "about",
    "title": {
      "en": "About Us & Our Team",
      "fr": "À Propos & Équipe Locale",
      "es": "Quiénes somos y nuestro equipo"
    },
    "desc": {
      "en": "Meet Med (Founder & Local Host), our licensed Medina guides, and trusted regional drivers.",
      "fr": "Rencontrez Med (fondateur & hôte local), nos guides agréés et nos chauffeurs de confiance.",
      "es": "Conoce a Med, fundador y anfitrión local, a nuestros guías acreditados de la medina y a nuestros conductores de confianza."
    },
    "image": "/images/real/about_us_image1.jpg",
    "badge": {
      "en": "Local Team",
      "fr": "Équipe Locale",
      "es": "Equipo local"
    }
  }
];

const HOME_BENEFITS = [
  {
    "title": {
      "en": "Born & Based in Fez",
      "fr": "Nés & Basés à Fès",
      "es": "De Fez y en Fez"
    },
    "desc": {
      "en": "We live here, understand every corner, and navigate the Medina with natural local ease.",
      "fr": "Nous vivons ici et connaissons chaque recoin de la médina depuis notre enfance.",
      "es": "Vivimos aquí, conocemos cada rincón y nos movemos por la medina con la naturalidad de quienes son de Fez."
    }
  },
  {
    "title": {
      "en": "Private & Personal Pacing",
      "fr": "Visites Privées & Sur Mesure",
      "es": "Visitas privadas a tu ritmo"
    },
    "desc": {
      "en": "Dedicated only to you and your group. Move at your own relaxed pace without rushed tourist crowds.",
      "fr": "Exclusivement pour vous et vos compagnons. Visitez à votre rythme sans groupe imposé.",
      "es": "Solo para ti y tu grupo. Disfrutad a vuestro ritmo, sin prisas ni grupos turísticos impuestos."
    }
  },
  {
    "title": {
      "en": "Comfortable Vehicles & Drivers",
      "fr": "Véhicules Confortables & Chauffeurs",
      "es": "Vehículos cómodos y conductores"
    },
    "desc": {
      "en": "Modern air-conditioned transport for scenic day trips with trusted, punctual professional drivers.",
      "fr": "Flotte moderne et climatisée pour des excursions sécurisées avec chauffeurs prévenants.",
      "es": "Transporte moderno con aire acondicionado para las excursiones, con conductores profesionales, puntuales y de confianza."
    }
  }
];

const FOOD_TASTINGS = [
  {
    "name": {
      "en": "Harcha & Baghrir",
      "fr": "Harcha & Baghrir",
      "es": "Harcha y baghrir"
    },
    "desc": {
      "en": "Warm semolina pan-bread and honeycomb thousand-hole pancakes served with wild honey and farm butter.",
      "fr": "Galette de semoule tiède et crêpes mille trous alvéolées au miel et beurre fondu.",
      "es": "Pan de sémola caliente y tortitas de mil agujeros, servidos con miel silvestre y mantequilla de granja."
    }
  },
  {
    "name": {
      "en": "Piping-Hot Bissara",
      "fr": "Bissara Fumante",
      "es": "Bissara bien caliente"
    },
    "desc": {
      "en": "Velvety dried fava bean soup served in clay bowls with cold-pressed olive oil, cumin, and crusty bread.",
      "fr": "Onctueuse soupe de fèves au cumin, généreux filet d’huile d’olive vierge et pain frais.",
      "es": "Crema de habas secas en cuencos de barro, con aceite de oliva prensado en frío, comino y pan crujiente."
    }
  },
  {
    "name": {
      "en": "Fresh Crispy Sfenj",
      "fr": "Sfenj Chaud et Croustillant",
      "es": "Sfenj recién hechos y crujientes"
    },
    "desc": {
      "en": "Traditional Moroccan doughnuts fried in bubbling oil right before your eyes and eaten piping hot.",
      "fr": "Beignets marocains traditionnels dorés à la minute sous vos yeux.",
      "es": "Buñuelos tradicionales marroquíes, fritos delante de ti y servidos bien calientes."
    }
  },
  {
    "name": {
      "en": "Local Cheeses & Sweets",
      "fr": "Fromages Locaux & Douceurs",
      "es": "Quesos locales y dulces"
    },
    "desc": {
      "en": "Sweet and salty fresh goat cheeses, spiced walnuts, fresh juices, and delicate Chebakia pastries.",
      "fr": "Fromages de chèvre frais, noix épicées, jus de saison et douceurs artisanales (Chebakia).",
      "es": "Quesos frescos de cabra dulces y salados, nueces especiadas, zumos recién hechos y delicadas chebakias."
    }
  }
];

const TRAVEL_RULES = [
  {
    "title": {
      "en": "Always Carry Cash (MAD)",
      "fr": "Toujours avoir des Espèces (MAD)",
      "es": "Llevad siempre efectivo (MAD)"
    },
    "desc": {
      "en": "Cards are accepted in modern hotels, but cash is essential for Medina souks, street snacks, and petit taxis.",
      "fr": "Les cartes sont acceptées en hôtel, mais le liquide est indispensable dans les souks et petits taxis.",
      "es": "En los hoteles modernos se aceptan tarjetas, pero el efectivo es imprescindible en los zocos de la medina, los puestos de comida y los pequeños taxis."
    }
  },
  {
    "title": {
      "en": "Wear Comfortable Walking Shoes",
      "fr": "Chaussures de Marche Confortables",
      "es": "Llevad calzado cómodo para caminar"
    },
    "desc": {
      "en": "You will walk more than expected. Medieval cobblestones have slopes, steps, and uneven stones.",
      "fr": "Vous marcherez beaucoup : pavés médiévaux, ruelles en pente et marches.",
      "es": "Caminaréis más de lo que imagináis. El empedrado medieval tiene pendientes, escalones y piedras irregulares."
    }
  },
  {
    "title": {
      "en": "Red Petit Taxis (10–20 MAD)",
      "fr": "Petits Taxis Rouges (10–20 MAD)",
      "es": "Pequeños taxis rojos (10–20 MAD)"
    },
    "desc": {
      "en": "Outside the pedestrian Medina walls, red taxis are cheap and metered. Ask to turn on the meter (compteur).",
      "fr": "À l’extérieur des remparts, les petits taxis rouges sont économiques et munis d’un compteur.",
      "es": "Fuera de las murallas de la medina peatonal, los taxis rojos son económicos y llevan taxímetro. Pedid que lo enciendan (compteur)."
    }
  },
  {
    "title": {
      "en": "Friday Prayer Rhythm",
      "fr": "Rythme du Vendredi",
      "es": "El ritmo de la oración del viernes"
    },
    "desc": {
      "en": "Friday is holy: many traditional shops pause between 12:00 PM and 3:30 PM for congregational prayer.",
      "fr": "Vendredi saint : de nombreuses échoppes ferment entre midi et 15h30 pour la prière.",
      "es": "El viernes es un día sagrado: muchas tiendas tradicionales cierran de 12:00 a 15:30 para la oración comunitaria."
    }
  }
];

const FEZ_PRODUCT_COPY = {
  "en": {
    "title": "Explore Fez Medina with Private Local Guide",
    "lead": "A private walking tour through the UNESCO-listed Medina, with a local guide and only your group.",
    "overviewLabel": "Overview",
    "overviewTitle": "Discover the soul of Fez",
    "overview": [
      "Walk the UNESCO-listed Medina with a private local guide. It is one of the most intact old cities still lived in today. You will move through hidden alleys, grand monuments, working souks, and crafts that are still made by hand.",
      "The route takes in Al-Qarawiyyin University, the busy Talaa Kebira, the carved courts of Bou Inania and Al-Attarine, and the dye pits of the Chouara Tannery. Your guide explains the history, the habits of the quarter, and the working day around you.",
      "Because the tour is private, the pace follows you. History, architecture, shopping, photography, or simply the atmosphere — the guide can lean toward what you care about."
    ],
    "includedLabel": "What's Included",
    "includedTitle": "Included and not included",
    "includedHeading": "Included",
    "excludedHeading": "Not included",
    "included": [
      "Bottled water",
      "Licensed private local guide",
      "Time for photos and short breaks",
      "Private walking tour — only your group"
    ],
    "excluded": [
      "Entrance fees to museums or monuments",
      "Food and personal expenses",
      "Bou Inania Madrasa ticket — €2 per person",
      "Al-Attarine Madrasa ticket — €2 per person",
      "Nejjarine Museum ticket — €2 per person"
    ],
    "meetingLabel": "Meeting and Pickup",
    "meetingTitle": "Where you start",
    "meeting": [
      "Start at Bab Boujloud, Batha Square, or Rcif Street. Arrive 10 minutes early. Your guide will be waiting, sometimes with a sign, sometimes in traditional dress.",
      "Staying inside the Medina? Ask in advance and the guide can meet you at your riad or hotel. Staying outside? We can arrange a ride or walk you in from the meeting point.",
      "The walk ends back at the meeting point."
    ],
    "itineraryLabel": "Itinerary",
    "itineraryTitle": "The Medina walk",
    "passBy": "Pass by",
    "free": "Ticket free",
    "notIncluded": "Ticket not included",
    "extraLabel": "Additional Info",
    "extraTitle": "Good to know",
    "extra": [
      "You receive confirmation when you book",
      "Not wheelchair accessible",
      "Stroller accessible",
      "Service animals allowed",
      "Near public transportation",
      "Not suitable for serious heart or medical conditions",
      "Most travelers can take part",
      "Private tour — only your group participates"
    ],
    "cancelLabel": "Cancellation Policy",
    "cancelTitle": "Cancel up to 24 hours before",
    "cancel": "Cancel up to 24 hours before the tour for a full refund.",
    "priceLabel": "Tour price",
    "perPerson": "per person",
    "estimate": "Estimated equivalents. Exchange rates vary.",
    "book": "Book this tour",
    "whatsapp": "Ask on WhatsApp",
    "back": "Back to Fez",
    "durationLabel": "Duration",
    "duration": "3–5 hours",
    "formatLabel": "Format",
    "format": "Private Walking Tour",
    "pickupLabel": "Meeting / Pickup",
    "pickup": "Bab Boujloud, Batha or Rcif",
    "languagesLabel": "Languages",
    "languages": "English, Français and Español",
    "galleryLabel": "Fez Medina walking tour photos",
    "viewPhoto": "View photo",
    "detailsLabel": "Tour details"
  },
  "fr": {
    "title": "Explorez la médina de Fès avec un guide local privé",
    "lead": "Une visite à pied privée dans la médina classée UNESCO, avec un guide local et uniquement votre groupe.",
    "overviewLabel": "Présentation",
    "overviewTitle": "Découvrir l’âme de Fès",
    "overview": [
      "Parcourez la médina classée UNESCO avec un guide local privé. C’est l’une des vieilles villes les plus intactes encore habitées. Ruelles cachées, monuments, souks vivants et métiers encore pratiqués à la main.",
      "Le parcours passe par l’université Al-Qarawiyyin, la Talaa Kebira, les cours sculptées de Bou Inania et Al-Attarine, puis les cuves de la tannerie Chouara. Le guide raconte l’histoire, les habitudes du quartier et la journée qui se déroule autour de vous.",
      "La visite est privée : le rythme vous suit. Histoire, architecture, achats, photo, ou simplement l’atmosphère — le guide s’adapte à ce qui vous intéresse."
    ],
    "includedLabel": "Ce qui est inclus",
    "includedTitle": "Inclus et non inclus",
    "includedHeading": "Inclus",
    "excludedHeading": "Non inclus",
    "included": [
      "Eau en bouteille",
      "Guide local privé et agréé",
      "Temps pour les photos et de courtes pauses",
      "Visite à pied privée — uniquement votre groupe"
    ],
    "excluded": [
      "Droits d’entrée des musées et monuments",
      "Repas et dépenses personnelles",
      "Billet de la médersa Bou Inania — 2 € par personne",
      "Billet de la médersa Al-Attarine — 2 € par personne",
      "Billet du musée Nejjarine — 2 € par personne"
    ],
    "meetingLabel": "Rendez-vous et prise en charge",
    "meetingTitle": "Où commence la visite",
    "meeting": [
      "Départ à Bab Boujloud, à la place Batha ou rue Rcif. Arrivez 10 minutes en avance. Le guide vous attend, parfois avec une pancarte, parfois en tenue traditionnelle.",
      "Vous logez dans la médina ? Prévenez-nous : le guide peut vous retrouver au riad ou à l’hôtel. Vous logez à l’extérieur ? Nous pouvons organiser un transfert ou vous guider jusqu’au point de rendez-vous.",
      "La visite se termine au point de départ."
    ],
    "itineraryLabel": "Itinéraire",
    "itineraryTitle": "La marche dans la médina",
    "passBy": "Passage",
    "free": "Entrée libre",
    "notIncluded": "Billet non inclus",
    "extraLabel": "Informations utiles",
    "extraTitle": "À savoir",
    "extra": [
      "Confirmation envoyée au moment de la réservation",
      "Non accessible en fauteuil roulant",
      "Accessible avec une poussette",
      "Animaux d’assistance acceptés",
      "Proche des transports",
      "Déconseillé en cas de problème cardiaque ou médical grave",
      "La plupart des voyageurs peuvent participer",
      "Visite privée — uniquement votre groupe"
    ],
    "cancelLabel": "Annulation",
    "cancelTitle": "Annulez jusqu’à 24 heures avant",
    "cancel": "Annulation jusqu’à 24 heures avant la visite pour un remboursement intégral.",
    "priceLabel": "Prix de la visite",
    "perPerson": "par personne",
    "estimate": "Équivalents estimatifs. Les taux de change varient.",
    "book": "Réserver cette visite",
    "whatsapp": "Demander sur WhatsApp",
    "back": "Retour à Fès",
    "durationLabel": "Durée",
    "duration": "3 à 5 heures",
    "formatLabel": "Format",
    "format": "Visite privée à pied",
    "pickupLabel": "Départ / Prise en charge",
    "pickup": "Bab Boujloud, Batha ou Rcif",
    "languagesLabel": "Langues",
    "languages": "English, Français and Español",
    "galleryLabel": "Photos de la visite à pied dans la médina",
    "viewPhoto": "Voir la photo",
    "detailsLabel": "Informations sur la visite"
  },
  "es": {
    "title": "Explora la medina de Fez con un guía local privado",
    "lead": "Una visita privada a pie por la medina declarada Patrimonio Mundial por la UNESCO, con un guía local y solo tu grupo.",
    "overviewLabel": "Presentación",
    "overviewTitle": "Descubre el alma de Fez",
    "overview": [
      "Recorre la medina declarada Patrimonio Mundial por la UNESCO con un guía local privado. Es una de las ciudades antiguas mejor conservadas que siguen habitadas hoy. Pasearás por callejuelas escondidas, grandes monumentos y zocos llenos de vida, donde los artesanos siguen elaborando sus piezas a mano.",
      "El recorrido incluye la Universidad Al-Qarawiyyin, la animada Talaa Kebira, los patios tallados de Bou Inania y Al-Attarine y las cubetas de tinte de la curtiduría Chouara. Tu guía te explica la historia, las costumbres del barrio y la jornada de trabajo que transcurre a tu alrededor.",
      "Al ser una visita privada, el ritmo se adapta a ti. Historia, arquitectura, compras, fotografía o simplemente disfrutar del ambiente: el guía puede orientar el paseo hacia lo que más te interese."
    ],
    "includedLabel": "Qué incluye",
    "includedTitle": "Incluido y no incluido",
    "includedHeading": "Incluido",
    "excludedHeading": "No incluido",
    "included": [
      "Agua embotellada",
      "Guía local privado y acreditado",
      "Tiempo para hacer fotos y pequeñas pausas",
      "Visita privada a pie: solo tu grupo"
    ],
    "excluded": [
      "Entradas a museos y monumentos",
      "Comida y gastos personales",
      "Entrada a la madrasa Bou Inania: 2 € por persona",
      "Entrada a la madrasa Al-Attarine: 2 € por persona",
      "Entrada al Museo Nejjarine: 2 € por persona"
    ],
    "meetingLabel": "Punto de encuentro y recogida",
    "meetingTitle": "Dónde empieza la visita",
    "meeting": [
      "El punto de partida es Bab Boujloud, la plaza Batha o la calle Rcif. Llega 10 minutos antes. Tu guía te estará esperando, a veces con un cartel y otras con ropa tradicional.",
      "¿Te alojas dentro de la medina? Solicítalo con antelación y el guía podrá encontrarte en tu riad u hotel. Si te alojas fuera, podemos organizar un traslado o acompañarte a pie desde el punto de encuentro.",
      "El paseo termina de nuevo en el punto de encuentro."
    ],
    "itineraryLabel": "Itinerario",
    "itineraryTitle": "El paseo por la medina",
    "passBy": "De paso",
    "free": "Entrada gratuita",
    "notIncluded": "Entrada no incluida",
    "extraLabel": "Información adicional",
    "extraTitle": "Conviene saber",
    "extra": [
      "Recibirás la confirmación al reservar",
      "No accesible en silla de ruedas",
      "Accesible con carrito de bebé",
      "Se admiten animales de asistencia",
      "Cerca del transporte público",
      "No recomendado en caso de problemas cardíacos o médicos graves",
      "La mayoría de los viajeros pueden participar",
      "Visita privada: solo participa tu grupo"
    ],
    "cancelLabel": "Política de cancelación",
    "cancelTitle": "Cancela hasta 24 horas antes",
    "cancel": "Cancela hasta 24 horas antes de la visita para recibir un reembolso completo.",
    "priceLabel": "Precio de la visita",
    "perPerson": "por persona",
    "estimate": "Equivalencias aproximadas. Los tipos de cambio varían.",
    "book": "Reserva esta visita",
    "whatsapp": "Consulta por WhatsApp",
    "back": "Volver a Fez",
    "durationLabel": "Duración",
    "duration": "3–5 horas",
    "formatLabel": "Modalidad",
    "format": "Visita privada a pie",
    "pickupLabel": "Encuentro / Recogida",
    "pickup": "Bab Boujloud, Batha o Rcif",
    "languagesLabel": "Idiomas",
    "languages": "Inglés, francés y español",
    "galleryLabel": "Fotos de la visita a pie por la medina de Fez",
    "viewPhoto": "Ver foto",
    "detailsLabel": "Detalles de la visita"
  }
};

const FEZ_PRODUCT_IMAGES = [
  {
    "src": "/images/our-fez-tours/01.webp",
    "width": 1200,
    "height": 1600,
    "alt": {
      "en": "Guide and visitors in front of an ornate tiled gate in Fez",
      "fr": "Guide et visiteurs devant une porte ornée de zellige à Fès",
      "es": "Guía y visitantes ante una puerta de Fez decorada con azulejos"
    }
  },
  {
    "src": "/images/our-fez-tours/02.webp",
    "width": 1536,
    "height": 2048,
    "alt": {
      "en": "Visitors walking a narrow alley in the Fez Medina",
      "fr": "Visiteurs dans une ruelle étroite de la médina de Fès",
      "es": "Visitantes recorriendo un callejón estrecho de la medina de Fez"
    }
  },
  {
    "src": "/images/our-fez-tours/03.webp",
    "width": 1200,
    "height": 1600,
    "alt": {
      "en": "Carved brass door with a geometric star pattern",
      "fr": "Porte en laiton ciselé au motif d’étoile géométrique",
      "es": "Puerta de latón labrado con un motivo geométrico de estrella"
    }
  },
  {
    "src": "/images/our-fez-tours/04.webp",
    "width": 1200,
    "height": 1600,
    "alt": {
      "en": "Travelers in a carved courtyard in Fez",
      "fr": "Voyageurs dans une cour sculptée à Fès",
      "es": "Viajeros en un patio de Fez con decoración tallada"
    }
  },
  {
    "src": "/images/our-fez-tours/05.webp",
    "width": 1200,
    "height": 1600,
    "alt": {
      "en": "Carpet showroom with visitors seated under hanging rugs",
      "fr": "Salon de tapis, visiteurs assis sous des tapis suspendus",
      "es": "Exposición de alfombras con visitantes sentados bajo alfombras colgadas"
    }
  },
  {
    "src": "/images/our-fez-tours/06.webp",
    "width": 1200,
    "height": 1600,
    "alt": {
      "en": "A guide unrolling a carpet for seated visitors",
      "fr": "Un guide déroule un tapis devant des visiteurs assis",
      "es": "Un guía desenrollando una alfombra ante los visitantes sentados"
    }
  },
  {
    "src": "/images/our-fez-tours/07.webp",
    "width": 1200,
    "height": 1600,
    "alt": {
      "en": "Two travelers wearing scarves in a textile shop",
      "fr": "Deux voyageurs en écharpes dans une boutique de tissus",
      "es": "Dos viajeros con pañuelos en una tienda de tejidos"
    }
  },
  {
    "src": "/images/our-fez-tours/08.webp",
    "width": 1200,
    "height": 1600,
    "alt": {
      "en": "Busy covered souk lane in the Fez Medina",
      "fr": "Allée couverte et animée d’un souk dans la médina de Fès",
      "es": "Calle cubierta y animada de un zoco de la medina de Fez"
    }
  }
];

const FEZ_PRODUCT_STOPS: ItineraryStop[] = [
  {
    "title": {
      "en": "Bab Boujloud",
      "fr": "Bab Boujloud",
      "es": "Bab Boujloud"
    },
    "description": {
      "en": "Iconic entrance to the old city.",
      "fr": "Entrée emblématique de la vieille ville.",
      "es": "Entrada emblemática a la ciudad antigua."
    },
    "time": "5 min",
    "badge": {
      "en": "Ticket free",
      "fr": "Entrée libre",
      "es": "Entrada gratuita"
    }
  },
  {
    "title": {
      "en": "Bou Inania Medersa",
      "fr": "Bou Inania Medersa",
      "es": "Madrasa Bou Inania"
    },
    "description": {
      "en": "A 14th-century Islamic school with carved plaster, wood, and zellige.",
      "fr": "École islamique du XIVe siècle, plâtre sculpté, bois et zellige.",
      "es": "Escuela islámica del siglo XIV con yeso y madera tallados y zellige."
    },
    "time": "20 min",
    "badge": {
      "en": "Ticket not included",
      "fr": "Billet non inclus",
      "es": "Entrada no incluida"
    }
  },
  {
    "title": {
      "en": "Rue Talaa Kebira",
      "fr": "Rue Talaa Kebira",
      "es": "Calle Talaa Kebira"
    },
    "description": {
      "en": "One of the main streets of the Medina, full of shops and daily life. Pass by.",
      "fr": "Une des rues principales de la médina, boutiques et vie quotidienne. Passage.",
      "es": "Una de las calles principales de la medina, llena de tiendas y vida cotidiana. Visita de paso."
    },
    "time": "",
    "badge": {
      "en": "Pass by",
      "fr": "Passage",
      "es": "De paso"
    }
  },
  {
    "title": {
      "en": "Al-Qarawiyyin Mosque and University",
      "fr": "Al-Qarawiyyin Mosque and University",
      "es": "Mezquita y Universidad Al-Qarawiyyin"
    },
    "description": {
      "en": "The world’s oldest existing university.",
      "fr": "La plus ancienne université encore existante.",
      "es": "La universidad más antigua del mundo que sigue existiendo."
    },
    "time": "15 min",
    "badge": {
      "en": "Ticket free",
      "fr": "Entrée libre",
      "es": "Entrada gratuita"
    }
  },
  {
    "title": {
      "en": "Al-Attarine Madrasa",
      "fr": "Al-Attarine Madrasa",
      "es": "Madrasa Al-Attarine"
    },
    "description": {
      "en": "A Marinid masterpiece beside the Qarawiyyin.",
      "fr": "Chef-d’œuvre mérinide à côté de la Qarawiyyin.",
      "es": "Una obra maestra meriní junto a la Qarawiyyin."
    },
    "time": "20 min",
    "badge": {
      "en": "Ticket not included",
      "fr": "Billet non inclus",
      "es": "Entrada no incluida"
    }
  },
  {
    "title": {
      "en": "Chouara Tannery",
      "fr": "Chouara Tannery",
      "es": "Curtiduría Chouara"
    },
    "description": {
      "en": "The open-air leather tannery.",
      "fr": "La tannerie de cuir à ciel ouvert.",
      "es": "La curtiduría de cuero al aire libre."
    },
    "time": "30 min",
    "badge": {
      "en": "Ticket free",
      "fr": "Entrée libre",
      "es": "Entrada gratuita"
    }
  },
  {
    "title": {
      "en": "Nejjarine Museum",
      "fr": "Nejjarine Museum",
      "es": "Museo Nejjarine"
    },
    "description": {
      "en": "Museum of wooden arts and crafts, in a restored funduq.",
      "fr": "Musée des arts du bois, dans un fondouk restauré.",
      "es": "Museo de las artes y oficios de la madera, situado en un funduq restaurado."
    },
    "time": "20 min",
    "badge": {
      "en": "Ticket not included",
      "fr": "Billet non inclus",
      "es": "Entrada no incluida"
    }
  },
  {
    "title": {
      "en": "Place Seffarine",
      "fr": "Place Seffarine",
      "es": "Plaza Seffarine"
    },
    "description": {
      "en": "The square of the copper and metal workers.",
      "fr": "La place des dinandiers et des métaux.",
      "es": "La plaza de los artesanos del cobre y del metal."
    },
    "time": "15 min",
    "badge": {
      "en": "Ticket free",
      "fr": "Entrée libre",
      "es": "Entrada gratuita"
    }
  },
  {
    "title": {
      "en": "Zaouia of Moulay Idriss II",
      "fr": "Zaouia of Moulay Idriss II",
      "es": "Zauía de Moulay Idriss II"
    },
    "description": {
      "en": "A sacred place for locals. Non-Muslims view it from outside.",
      "fr": "Lieu sacré pour les habitants. Les non-musulmans le voient de l’extérieur.",
      "es": "Un lugar sagrado para los habitantes. Los no musulmanes lo contemplan desde fuera."
    },
    "time": "5 min",
    "badge": {
      "en": "Ticket free",
      "fr": "Entrée libre",
      "es": "Entrada gratuita"
    }
  }
];

const FEZ_CTA = {
  "intro": {
    "en": "Discover the Medina with someone who knows its streets, stories, traditions and hidden places. Walk beyond the famous landmarks, meet local people, taste traditional food and experience the everyday life of Fez.",
    "fr": "Découvrez la Médina avec quelqu’un qui connaît ses rues, ses histoires, ses traditions et ses lieux cachés. Allez au-delà des monuments célèbres, rencontrez les habitants, goûtez la cuisine traditionnelle et découvrez la vie quotidienne de Fès.",
    "es": "Descubre la medina con alguien que conoce sus calles, sus historias, sus tradiciones y sus rincones escondidos. Ve más allá de los monumentos famosos, conoce a los vecinos, prueba la cocina tradicional y vive el día a día de Fez."
  },
  "lead": {
    "en": "Explore our Fez tours and discover the city through local eyes.",
    "fr": "Découvrez nos visites de Fès et la ville à travers les yeux des habitants.",
    "es": "Descubre nuestras visitas de Fez y conoce la ciudad de la mano de quienes viven aquí."
  },
  "cta": {
    "en": "Explore Our Fez Tours",
    "fr": "Découvrir nos visites de Fès",
    "es": "Descubre nuestras visitas de Fez"
  },
  "imageAlt": {
    "en": "Local guide with visitors at a historic Fez monument",
    "fr": "Guide local avec des visiteurs devant un monument historique de Fès",
    "es": "Guía local con visitantes ante un monumento histórico de Fez"
  }
};

const FEZ_STORIES: { id: string; title: Localized; paragraphs: Localized[]; source: string; imageGroups: { src: string; alt: Localized; width?: number; height?: number }[][]; imageAfter: (number | null)[] }[] = [
  {
    "id": "fez-explore-medina",
    "title": {
      "en": "Explore the Medina",
      "fr": "Explorer la Médina",
      "es": "Explora la medina"
    },
    "paragraphs": [
      {
        "en": "Before exploring the Medina, it helps to understand Fez itself. For local people, the Medina is more than simply the old part of the city. It is a place connected to our history, traditions, families and everyday life. When we say “the Medina,” we are talking about the historic and traditional heart of Fez — a place that has kept its character through generations.",
        "fr": "Avant d’explorer la Médina, il est utile de comprendre Fès elle-même. Pour les habitants, la Médina est bien plus que la vieille partie de la ville. C’est un lieu lié à notre histoire, à nos traditions, à nos familles et à notre vie quotidienne. Lorsque nous parlons de « la Médina », nous parlons du cœur historique et traditionnel de Fès — un lieu qui a conservé son caractère au fil des générations.",
        "es": "Antes de adentrarte en la medina, conviene conocer un poco la propia Fez. Para quienes vivimos aquí, la medina es mucho más que el casco antiguo. Es un lugar ligado a nuestra historia, nuestras tradiciones, nuestras familias y nuestra vida cotidiana. Cuando hablamos de «la medina», nos referimos al corazón histórico y tradicional de Fez: un lugar que ha conservado su carácter a lo largo de generaciones."
      },
      {
        "en": "Fez has different areas, each with its own character. Fes el-Bali is the Old Medina, known for its narrow streets, traditional souks, historic buildings and local workshops. Fes Jdid and the Mellah form another important historic part of the city, connected to the Royal Palace and the Jewish heritage of Fez. The New City shows another side of Fez, with modern streets, cafés, restaurants and everyday city life.",
        "fr": "Fès se compose de différents quartiers, chacun avec son propre caractère. Fès el-Bali est l’ancienne Médina, connue pour ses ruelles étroites, ses souks traditionnels, ses bâtiments historiques et ses ateliers locaux. Fès Jdid et le Mellah forment une autre partie historique importante de la ville, liée au Palais Royal et au patrimoine juif de Fès. La Ville Nouvelle montre un autre visage de Fès, avec ses rues modernes, ses cafés, ses restaurants et sa vie quotidienne.",
        "es": "Fez tiene distintas zonas, cada una con su propia personalidad. Fez el-Bali es la medina antigua, conocida por sus callejuelas, sus zocos tradicionales, sus edificios históricos y sus talleres artesanos. Fez Jdid y el Mellah forman otro núcleo histórico importante, vinculado al Palacio Real y al patrimonio judío de la ciudad. La ciudad nueva muestra otra cara de Fez, con avenidas modernas, cafeterías, restaurantes y la vida diaria de una ciudad actual."
      },
      {
        "en": "The Medina of Fez is not a museum. People still live and work here every day. Craftsmen work in traditional workshops, shopkeepers open their stores, local people buy food and bread, and traditional crafts continue to be part of everyday life. As you walk through the Medina, you are not only looking at history. You are watching a living part of Fez.",
        "fr": "La Médina de Fès n’est pas un musée. Des personnes y vivent et y travaillent encore chaque jour. Les artisans travaillent dans leurs ateliers traditionnels, les commerçants ouvrent leurs boutiques, les habitants achètent leur nourriture et leur pain, et les métiers traditionnels continuent de faire partie de la vie quotidienne. En parcourant la Médina, vous ne regardez pas seulement l’histoire. Vous observez une partie vivante de Fès.",
        "es": "La medina de Fez no es un museo. Aquí se sigue viviendo y trabajando todos los días. Los artesanos trabajan en sus talleres tradicionales, los comerciantes abren sus tiendas y los vecinos compran alimentos y pan. Los oficios de siempre siguen formando parte del día a día. Al recorrer la medina, no solo contemplas la historia: observas una parte viva de Fez."
      },
      {
        "en": "The Medina is famous for its historic gates, narrow streets, traditional souks and maze-like passages. Once you enter through one of its gates, the atmosphere quickly changes. The lanes become narrower and you begin to discover workshops, small shops, residential areas and hidden corners. You can walk through the Medina many times and still discover something new.",
        "fr": "La Médina est célèbre pour ses portes historiques, ses rues étroites, ses souks traditionnels et ses passages en forme de labyrinthe. Dès que vous franchissez l’une de ses portes, l’atmosphère change rapidement. Les ruelles se resserrent et vous commencez à découvrir des ateliers, de petites boutiques, des quartiers résidentiels et des coins cachés. Vous pouvez parcourir la Médina de nombreuses fois et toujours découvrir quelque chose de nouveau.",
        "es": "La medina es famosa por sus puertas históricas, sus calles estrechas, sus zocos y sus pasadizos laberínticos. Al cruzar una de sus puertas, el ambiente cambia enseguida. Las calles se estrechan y empiezas a descubrir talleres, pequeñas tiendas, zonas residenciales y rincones escondidos. Puedes recorrer la medina muchas veces y seguir encontrando algo nuevo."
      },
      {
        "en": "There is a difference between simply walking through the Medina and understanding what you are seeing. A local guide can help you discover the history behind the buildings, understand traditional crafts, find less-known places and experience the Medina beyond the usual tourist route. Our goal is not only to show you the famous landmarks, but to help you notice the small details that make Fez what it is.",
        "fr": "Il y a une différence entre simplement marcher dans la Médina et comprendre ce que l’on voit. Un guide local peut vous aider à découvrir l’histoire des bâtiments, à comprendre les métiers traditionnels, à trouver des lieux moins connus et à vivre la Médina au-delà des circuits touristiques habituels. Notre objectif n’est pas seulement de vous montrer les monuments célèbres, mais de vous aider à remarquer les petits détails qui font de Fès ce qu’elle est.",
        "es": "No es lo mismo pasear por la medina que comprender lo que estás viendo. Un guía local puede explicarte la historia de los edificios, acercarte a los oficios tradicionales, enseñarte lugares menos conocidos y ayudarte a descubrir la medina más allá del recorrido turístico habitual. Nuestro objetivo no es únicamente mostrarte los monumentos famosos, sino ayudarte a apreciar los pequeños detalles que hacen de Fez lo que es."
      },
      {
        "en": "Exploring the Medina is also about tasting it. Traditional food, local markets, spices, bakeries and small food shops are all part of everyday life in Fez. For many visitors, discovering the Medina means experiencing its food as well as its history and culture.",
        "fr": "Explorer la Médina, c’est aussi la goûter. La cuisine traditionnelle, les marchés locaux, les épices, les boulangeries et les petites boutiques alimentaires font tous partie de la vie quotidienne à Fès. Pour de nombreux visiteurs, découvrir la Médina signifie vivre sa cuisine autant que son histoire et sa culture.",
        "es": "Explorar la medina también significa saborearla. La cocina tradicional, los mercados locales, las especias, las panaderías y las pequeñas tiendas de comida forman parte de la vida cotidiana de Fez. Para muchos viajeros, descubrir la medina consiste en conocer su gastronomía tanto como su historia y su cultura."
      },
      {
        "en": "After spending time inside the narrow streets of the Medina, it is worth looking at Fez from above. From a panoramic viewpoint, you can see the rooftops, minarets, historic walls and the landscape surrounding the city. It gives you a completely different perspective and helps you understand the size and character of the Medina.",
        "fr": "Après avoir passé du temps dans les ruelles étroites de la Médina, il vaut la peine de regarder Fès d’en haut. Depuis un point de vue panoramique, vous pouvez voir les toits, les minarets, les remparts historiques et le paysage qui entoure la ville. Cela offre une perspective complètement différente et aide à comprendre la taille et le caractère de la Médina.",
        "es": "Después de pasar un rato en las estrechas calles de la medina, merece la pena contemplar Fez desde arriba. Desde un mirador panorámico puedes ver los tejados, los minaretes, las murallas históricas y el paisaje que rodea la ciudad. Es una perspectiva completamente distinta, que permite entender mejor las dimensiones y el carácter de la medina."
      },
      {
        "en": "Exploring Fez does not have to end when you leave the Medina. At night, the New City offers a different atmosphere, with cafés, restaurants, modern streets and the lights of the city. After discovering the traditional side of Fez during the day, experiencing the New City at night allows you to see another side of the same city.",
        "fr": "Explorer Fès ne doit pas forcément s’arrêter lorsque vous quittez la Médina. La nuit, la Ville Nouvelle offre une atmosphère différente, avec ses cafés, ses restaurants, ses rues modernes et les lumières de la ville. Après avoir découvert le côté traditionnel de Fès pendant la journée, découvrir la Ville Nouvelle le soir permet de voir un autre visage de la même ville.",
        "es": "La visita a Fez no tiene por qué terminar al salir de la medina. Por la noche, la ciudad nueva ofrece un ambiente diferente, con cafeterías, restaurantes, calles modernas y luces urbanas. Después de conocer el lado tradicional de Fez durante el día, pasear por la ciudad nueva al anochecer te permite descubrir otra faceta de la misma ciudad."
      }
    ],
    "source": "src/pages/MedinaArticlePage.tsx",
    "imageGroups": [
      [
        {
          "src": "/images/fez-medina/medina-01.jpg",
          "alt": {
            "en": "Traditional Fez Medina market lane with Moroccan flags",
            "fr": "Traditional Fez Medina market lane with Moroccan flags",
            "es": "Callejuela de un mercado tradicional de la medina de Fez con banderas marroquíes"
          }
        }
      ],
      [
        {
          "src": "/images/fez-medina/medina-02.jpg",
          "alt": {
            "en": "Street in the modern city of Fez",
            "fr": "Street in the modern city of Fez",
            "es": "Calle de la zona moderna de Fez"
          }
        },
        {
          "src": "/images/fez-medina/medina-03.jpg",
          "alt": {
            "en": "Public square and everyday life in Fez",
            "fr": "Public square and everyday life in Fez",
            "es": "Plaza pública y vida cotidiana en Fez"
          }
        }
      ],
      [
        {
          "src": "/images/fez-medina/medina-04.jpg",
          "alt": {
            "en": "Craftsman working in a traditional Fez workshop",
            "fr": "Craftsman working in a traditional Fez workshop",
            "es": "Artesano trabajando en un taller tradicional de Fez"
          }
        },
        {
          "src": "/images/fez-medina/medina-05.jpg",
          "alt": {
            "en": "Artisan shaping metal by hand in Fez",
            "fr": "Artisan shaping metal by hand in Fez",
            "es": "Artesano dando forma al metal a mano en Fez"
          }
        },
        {
          "src": "/images/fez-medina/medina-06.jpg",
          "alt": {
            "en": "Artisans working together in a Fez workshop",
            "fr": "Artisans working together in a Fez workshop",
            "es": "Artesanos trabajando juntos en un taller de Fez"
          }
        },
        {
          "src": "/images/fez-medina/medina-07.jpg",
          "alt": {
            "en": "Local leather craftsman in the Medina",
            "fr": "Local leather craftsman in the Medina",
            "es": "Artesano local del cuero en la medina"
          }
        }
      ],
      [
        {
          "src": "/images/fez-medina/medina-08.jpg",
          "alt": {
            "en": "Historic gate at the entrance to the Fez Medina",
            "fr": "Historic gate at the entrance to the Fez Medina",
            "es": "Puerta histórica a la entrada de la medina de Fez"
          }
        },
        {
          "src": "/images/fez-medina/medina-09.jpg",
          "alt": {
            "en": "Narrow market passage inside the Fez Medina",
            "fr": "Narrow market passage inside the Fez Medina",
            "es": "Pasaje comercial estrecho dentro de la medina de Fez"
          }
        }
      ],
      [
        {
          "src": "/images/fez-medina/medina-10.jpg",
          "alt": {
            "en": "Historic architecture and courtyard in Fez",
            "fr": "Historic architecture and courtyard in Fez",
            "es": "Arquitectura histórica y patio en Fez"
          }
        }
      ],
      [
        {
          "src": "/images/fez-medina/medina-11.jpg",
          "alt": {
            "en": "Traditional bakery and local food in Fez",
            "fr": "Traditional bakery and local food in Fez",
            "es": "Panadería tradicional y comida local en Fez"
          }
        }
      ],
      [
        {
          "src": "/images/fez-medina/medina-12.jpg",
          "alt": {
            "en": "Panoramic view over the rooftops of Fez",
            "fr": "Panoramic view over the rooftops of Fez",
            "es": "Vista panorámica de los tejados de Fez"
          }
        }
      ],
      [
        {
          "src": "/images/fez-medina/medina-13.jpg",
          "alt": {
            "en": "Fountain and city lights in the New City of Fez at night",
            "fr": "Fountain and city lights in the New City of Fez at night",
            "es": "Fuente y luces de la Ciudad Nueva de Fez por la noche"
          }
        }
      ]
    ],
    "imageAfter": []
  },
  {
    "id": "fez-history-landmarks",
    "title": {
      "en": "History, Culture & Landmarks",
      "fr": "Histoire, culture et monuments",
      "es": "Historia, cultura y monumentos"
    },
    "paragraphs": [
      {
        "en": "Fez is one of the oldest and most important cities in Morocco, and its history is still part of everyday life. When you walk through the old streets, visit a traditional workshop, enter a madrasa or pass through one of the historic gates, you are not simply visiting an old place — you are seeing a city that has been living and changing for generations.",
        "fr": "Fès est l’une des villes les plus anciennes et les plus importantes du Maroc, et son histoire fait toujours partie de la vie quotidienne. En parcourant les vieilles rues, en visitant un atelier traditionnel, en entrant dans une médersa ou en franchissant une porte historique, vous ne visitez pas simplement un lieu ancien : vous découvrez une ville qui vit et évolue depuis des générations.",
        "es": "Fez es una de las ciudades más antiguas e importantes de Marruecos, y su historia sigue formando parte de la vida cotidiana. Cuando recorres sus calles antiguas, visitas un taller tradicional, entras en una madrasa o cruzas una de sus puertas históricas, no estás simplemente visitando un lugar del pasado: estás descubriendo una ciudad que lleva generaciones viviendo y transformándose."
      },
      {
        "en": "Fez was founded in the 9th century and grew over the centuries into an important centre of religion, education, trade and craftsmanship. It also became one of Morocco’s former capitals, which is why Fez is known as one of the country’s four imperial cities.",
        "fr": "Fès a été fondée au IXe siècle et est devenue, au fil des siècles, un important centre religieux, éducatif, commercial et artisanal. Elle fut également l’une des anciennes capitales du Maroc, ce qui explique pourquoi Fès est connue comme l’une des quatre villes impériales du pays.",
        "es": "Fez se fundó en el siglo IX y, con el paso de los siglos, se convirtió en un importante centro religioso, educativo, comercial y artesanal. También fue una de las antiguas capitales de Marruecos, de ahí que se conozca como una de las cuatro ciudades imperiales del país."
      },
      {
        "en": "One of the most important parts of Fez’s history is its tradition of learning. The city became known for religious and academic education, with mosques, madrasas and places of study attracting students and scholars from different parts of Morocco and beyond.",
        "fr": "La tradition du savoir est l’un des aspects les plus importants de l’histoire de Fès. La ville s’est fait connaître pour son enseignement religieux et académique. Ses mosquées, ses médersas et ses lieux d’étude ont accueilli des étudiants et des érudits venus de différentes régions du Maroc et d’ailleurs.",
        "es": "Uno de los aspectos más importantes de la historia de Fez es su tradición de conocimiento. La ciudad alcanzó gran prestigio por la enseñanza religiosa y académica: sus mezquitas, madrasas y centros de estudio atraían a estudiantes y eruditos de distintas regiones de Marruecos y de otros lugares."
      },
      {
        "en": "But the culture of Fez is not only found in books and monuments. It can also be seen in the work of local craftsmen. Zellige, traditional woodwork, leather, metalwork, weaving and other crafts have been part of life in Fez for generations. While walking through the Medina, you can still see craftsmen working in small workshops and using traditional techniques.",
        "fr": "Mais la culture de Fès ne se trouve pas seulement dans les livres et les monuments. Elle se voit aussi dans le travail des artisans locaux. Le zellige, le travail traditionnel du bois, du cuir et du métal, le tissage et d’autres métiers font partie de la vie à Fès depuis des générations. Dans la Médina, on peut encore voir des artisans travailler dans de petits ateliers avec des techniques traditionnelles.",
        "es": "Pero la cultura de Fez no se encuentra solo en los libros y los monumentos. También se ve en el trabajo de los artesanos locales. El zellige, la carpintería tradicional, el cuero, la metalistería, el tejido y otros oficios forman parte de la vida de Fez desde hace generaciones. Al pasear por la medina todavía puedes observar a los artesanos trabajando en pequeños talleres con técnicas tradicionales."
      },
      {
        "en": "Food is another important part of the culture of Fez. Traditional recipes, spices, bread, sweets and family cooking traditions are deeply connected to everyday life. Visiting the city is therefore not only about seeing its architecture — it is also about tasting and experiencing the local culture.",
        "fr": "La cuisine est un autre aspect important de la culture de Fès. Les recettes traditionnelles, les épices, le pain, les pâtisseries et les traditions culinaires familiales sont profondément liées à la vie quotidienne. Visiter la ville, ce n’est donc pas seulement admirer son architecture : c’est aussi goûter et découvrir la culture locale.",
        "es": "La gastronomía es otra parte esencial de la cultura de Fez. Las recetas tradicionales, las especias, el pan, los dulces y las costumbres culinarias familiares están profundamente vinculados al día a día. Por eso, visitar la ciudad no consiste únicamente en admirar su arquitectura: también implica probar y conocer su cultura local."
      },
      {
        "en": "Fez is also a city where different parts of its history can be seen side by side. The Mellah and Fes Jdid preserve an important part of the city’s Jewish heritage, with places such as the historic synagogues, cemetery and traditional Jewish architecture. The area also reflects the relationship between the old city, the royal history of Fez and the communities that have shaped the city over time.",
        "fr": "À Fès, différentes périodes de l’histoire se côtoient. Le Mellah et Fès Jdid préservent une part importante du patrimoine juif de la ville, avec des synagogues historiques, un cimetière et une architecture juive traditionnelle. Le quartier reflète aussi les liens entre la vieille ville, l’histoire royale de Fès et les communautés qui l’ont façonnée au fil du temps.",
        "es": "En Fez se pueden contemplar distintas etapas de su historia unas junto a otras. El Mellah y Fez Jdid conservan una parte importante del patrimonio judío de la ciudad, con sus sinagogas históricas, su cementerio y su arquitectura judía tradicional. La zona también refleja la relación entre la ciudad antigua, la historia de la monarquía en Fez y las comunidades que han dado forma a la ciudad con el tiempo."
      },
      {
        "en": "The historic landmarks of Fez help you understand this story more clearly. Bab Boujloud, known as the Blue Gate, is one of the most recognisable entrances to the old Medina and a natural starting point for discovering the historic city.",
        "fr": "Les monuments historiques de Fès permettent de mieux comprendre cette histoire. Bab Boujloud, surnommée la Porte Bleue, est l’une des entrées les plus reconnaissables de l’ancienne Médina et un point de départ naturel pour découvrir la ville historique.",
        "es": "Los monumentos históricos de Fez ayudan a comprender mejor ese relato. Bab Boujloud, conocida como la Puerta Azul, es una de las entradas más reconocibles de la medina antigua y un punto de partida natural para descubrir la ciudad histórica."
      },
      {
        "en": "Inside the Medina, Bou Inania Madrasa shows the beauty of traditional Moroccan architecture, with detailed zellige, carved wood, plasterwork and a design that reflects the importance of education and religion in the city.",
        "fr": "Au cœur de la Médina, la médersa Bou Inania révèle la beauté de l’architecture marocaine traditionnelle, avec ses zelliges détaillés, son bois sculpté, ses stucs et un plan qui témoigne de l’importance de l’éducation et de la religion dans la ville.",
        "es": "Dentro de la medina, la madrasa Bou Inania muestra la belleza de la arquitectura tradicional marroquí, con sus delicados mosaicos de zellige, su madera tallada, sus trabajos de yesería y un diseño que refleja la importancia de la educación y la religión en la ciudad."
      },
      {
        "en": "Al Quaraouiyine is another important part of Fez’s history and its long tradition of learning. Around it, you can discover streets and neighbourhoods that have remained connected to the intellectual and religious life of the city.",
        "fr": "Al Quaraouiyine occupe également une place importante dans l’histoire de Fès et dans sa longue tradition du savoir. Dans les rues et les quartiers alentour, on découvre des lieux toujours liés à la vie intellectuelle et religieuse de la ville.",
        "es": "Al Quaraouiyine ocupa también un lugar fundamental en la historia de Fez y en su larga tradición de conocimiento. A su alrededor puedes descubrir calles y barrios que siguen vinculados a la vida intelectual y religiosa de la ciudad."
      },
      {
        "en": "Al-Attarine Madrasa is another example of the architectural detail found throughout the Medina. Its decoration gives visitors a closer look at the craftsmanship that made Fez famous.",
        "fr": "La médersa Al-Attarine est un autre exemple des détails architecturaux que l’on trouve dans toute la Médina. Son décor permet d’observer de près le savoir-faire qui a rendu Fès célèbre.",
        "es": "La madrasa Al-Attarine es otro ejemplo del cuidado arquitectónico que se encuentra por toda la medina. Su decoración permite apreciar de cerca la destreza de los artesanos que hicieron famosa a Fez."
      },
      {
        "en": "The Chouara Tanneries show another side of the city’s traditional craftsmanship. Leather production has been part of Fez’s identity for centuries, and the tanneries remain one of the places where visitors can see this traditional work.",
        "fr": "Les tanneries Chouara révèlent une autre facette de l’artisanat traditionnel de la ville. Le travail du cuir fait partie de l’identité de Fès depuis des siècles, et les tanneries restent l’un des lieux où les visiteurs peuvent observer ce savoir-faire.",
        "es": "Las curtidurías Chouara muestran otra faceta de los oficios tradicionales de la ciudad. La producción de cuero forma parte de la identidad de Fez desde hace siglos, y las curtidurías siguen siendo uno de los lugares donde los visitantes pueden observar este trabajo tradicional."
      },
      {
        "en": "The Nejjarine area and its traditional woodworking heritage offer another glimpse into the craftsmanship of the Medina. Walking through these streets, you begin to understand that the historic buildings and the traditional crafts are closely connected.",
        "fr": "Le quartier Nejjarine et son héritage du travail traditionnel du bois offrent un autre aperçu de l’artisanat de la Médina. En parcourant ses rues, on comprend peu à peu que les bâtiments historiques et les métiers traditionnels sont étroitement liés.",
        "es": "La zona de Nejjarine y su tradición de trabajo de la madera ofrecen otra mirada al patrimonio artesanal de la medina. Al recorrer estas calles, empiezas a comprender que los edificios históricos y los oficios tradicionales están estrechamente relacionados."
      },
      {
        "en": "What makes Fez different is that these landmarks are not isolated monuments. They are surrounded by streets, shops, homes, workshops, cafés and markets where people continue to live and work. History is not separated from everyday life here — it is part of it.",
        "fr": "Ce qui distingue Fès, c’est que ses monuments ne sont pas isolés. Ils sont entourés de rues, de boutiques, de maisons, d’ateliers, de cafés et de marchés où les habitants continuent de vivre et de travailler. Ici, l’histoire ne se sépare pas de la vie quotidienne : elle en fait partie.",
        "es": "Lo que distingue a Fez es que estos monumentos no están aislados. Los rodean calles, tiendas, viviendas, talleres, cafeterías y mercados donde la gente sigue viviendo y trabajando. Aquí, la historia no está separada de la vida cotidiana: forma parte de ella."
      },
      {
        "en": "This is why exploring Fez with a local guide can give you a different experience. A landmark may look beautiful from the outside, but knowing why it was built, what happened around it and how local people see it can make the place much more meaningful.",
        "fr": "C’est pourquoi découvrir Fès avec un guide local peut offrir une expérience différente. Un monument peut être beau vu de l’extérieur, mais savoir pourquoi il a été construit, ce qui s’est passé autour de lui et comment les habitants le perçoivent peut lui donner beaucoup plus de sens.",
        "es": "Por eso, explorar Fez con un guía local puede ofrecerte una experiencia diferente. Un monumento puede resultar hermoso desde fuera, pero saber por qué se construyó, qué ocurrió a su alrededor y cómo lo perciben los vecinos hace que el lugar cobre mucho más sentido."
      },
      {
        "en": "When you visit Fez, take your time. Look beyond the famous monuments, notice the details in the architecture, listen to the sounds of the workshops, taste the local food and watch how everyday life continues around you.",
        "fr": "Lors de votre visite à Fès, prenez votre temps. Regardez au-delà des monuments célèbres, remarquez les détails de l’architecture, écoutez les bruits des ateliers, goûtez la cuisine locale et observez la vie quotidienne qui se poursuit autour de vous.",
        "es": "Cuando visites Fez, tómate tu tiempo. Mira más allá de los monumentos famosos, fíjate en los detalles de la arquitectura, escucha los sonidos de los talleres, prueba la comida local y observa cómo continúa la vida cotidiana a tu alrededor."
      },
      {
        "en": "Fez is not a city where history is only found in museums. You can feel it in the streets, the buildings, the crafts, the food and the people.",
        "fr": "À Fès, l’histoire ne se trouve pas uniquement dans les musées. On la ressent dans les rues, les bâtiments, l’artisanat, la cuisine et les habitants.",
        "es": "Fez no es una ciudad donde la historia se encuentre únicamente en los museos. Se percibe en las calles, los edificios, los oficios, la gastronomía y las personas."
      }
    ],
    "source": "src/pages/HistoryCultureArticlePage.tsx",
    "imageGroups": [
      [
        {
          "src": "/images/fez-history/history-01.jpg",
          "alt": {
            "en": "Narrow alley in the old Medina of Fez",
            "fr": "Ruelle étroite dans l’ancienne Médina de Fès",
            "es": "Callejón estrecho de la medina antigua de Fez"
          },
          "width": 1080,
          "height": 1440
        }
      ],
      [
        {
          "src": "/images/fez-history/history-02.jpg",
          "alt": {
            "en": "Panoramic view over the city of Fez",
            "fr": "Vue panoramique sur la ville de Fès",
            "es": "Vista panorámica de la ciudad de Fez"
          },
          "width": 800,
          "height": 533
        }
      ],
      [
        {
          "src": "/images/fez-history/history-03.jpg",
          "alt": {
            "en": "Zellige and carved details in a historic Fez courtyard",
            "fr": "Zellige et détails sculptés dans une cour historique de Fès",
            "es": "Zellige y detalles tallados en un patio histórico de Fez"
          },
          "width": 1365,
          "height": 1820
        }
      ],
      [
        {
          "src": "/images/fez-history/history-04.jpg",
          "alt": {
            "en": "Traditional goods displayed in a Fez Medina market stall",
            "fr": "Produits traditionnels dans un étal de la Médina de Fès",
            "es": "Productos tradicionales expuestos en un puesto de la medina de Fez"
          },
          "width": 975,
          "height": 1300
        }
      ],
      [
        {
          "src": "/images/fez-history/history-05.jpg",
          "alt": {
            "en": "Covered market lane inside the Medina of Fez",
            "fr": "Rue commerçante couverte dans la Médina de Fès",
            "es": "Calle comercial cubierta dentro de la medina de Fez"
          },
          "width": 1536,
          "height": 2048
        }
      ],
      [
        {
          "src": "/images/fez-history/history-06.jpg",
          "alt": {
            "en": "Historic buildings along a street in Fez",
            "fr": "Bâtiments historiques le long d’une rue de Fès",
            "es": "Edificios históricos en una calle de Fez"
          },
          "width": 1536,
          "height": 2048
        }
      ],
      [
        {
          "src": "/images/fez-history/history-07.jpg",
          "alt": {
            "en": "Bab Boujloud, the Blue Gate of Fez, lit at night",
            "fr": "Bab Boujloud, la Porte Bleue de Fès, illuminée la nuit",
            "es": "Bab Boujloud, la Puerta Azul de Fez, iluminada por la noche"
          },
          "width": 1364,
          "height": 908
        }
      ],
      [
        {
          "src": "/images/fez-history/history-08.jpg",
          "alt": {
            "en": "Tiled courtyard and carved arches in a Fez madrasa",
            "fr": "Cour carrelée et arches sculptées dans une médersa de Fès",
            "es": "Patio con azulejos y arcos tallados en una madrasa de Fez"
          },
          "width": 800,
          "height": 1067
        }
      ],
      [
        {
          "src": "/images/fez-history/history-09.jpg",
          "alt": {
            "en": "Ornate arched passage in the historic Medina of Fez",
            "fr": "Passage voûté orné dans la Médina historique de Fès",
            "es": "Pasaje abovedado y ornamentado en la medina histórica de Fez"
          },
          "width": 800,
          "height": 1200
        }
      ],
      [
        {
          "src": "/images/fez-history/history-10.jpg",
          "alt": {
            "en": "Traditional dye vats at the Chouara Tanneries",
            "fr": "Cuves de teinture traditionnelles des tanneries Chouara",
            "es": "Cubas tradicionales de teñido en las curtidurías Chouara"
          },
          "width": 975,
          "height": 1300
        }
      ],
      [
        {
          "src": "/images/fez-history/history-11.jpg",
          "alt": {
            "en": "Historic square and architecture in the Nejjarine area",
            "fr": "Place historique et architecture du quartier Nejjarine",
            "es": "Plaza histórica y arquitectura de la zona de Nejjarine"
          },
          "width": 1733,
          "height": 1300
        }
      ],
      [
        {
          "src": "/images/fez-history/history-12.jpg",
          "alt": {
            "en": "Historic entrance and tower in the Medina of Fez",
            "fr": "Entrée historique et tour dans la Médina de Fès",
            "es": "Entrada histórica y torre en la medina de Fez"
          },
          "width": 800,
          "height": 1067
        }
      ],
      [
        {
          "src": "/images/fez-history/history-13.jpg",
          "alt": {
            "en": "Visitors walking through a historic arcade in Fez",
            "fr": "Visiteurs traversant une galerie historique à Fès",
            "es": "Visitantes recorriendo una galería histórica de Fez"
          },
          "width": 975,
          "height": 1300
        }
      ],
      [
        {
          "src": "/images/fez-history/history-14.jpg",
          "alt": {
            "en": "Everyday scene on a street in the Medina of Fez",
            "fr": "Scène de vie quotidienne dans une rue de la Médina de Fès",
            "es": "Escena cotidiana en una calle de la medina de Fez"
          },
          "width": 975,
          "height": 1300
        }
      ]
    ],
    "imageAfter": [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      null,
      10,
      11,
      12,
      13,
      null,
      14
    ]
  },
  {
    "id": "fez-things-to-do",
    "title": {
      "en": "Things to Do in Fez",
      "fr": "Que faire à Fès",
      "es": "Qué hacer en Fez"
    },
    "paragraphs": [
      {
        "en": "There is much more to do in Fez than simply visiting its famous monuments. The city is best experienced by walking through its streets, meeting local people, discovering traditional crafts, tasting local food and taking time to enjoy the different sides of the city.",
        "fr": "À Fès, les activités ne se limitent pas à la visite des monuments célèbres. La ville se découvre en parcourant ses rues, en rencontrant les habitants, en découvrant l’artisanat traditionnel, en goûtant la cuisine locale et en prenant le temps d’apprécier ses différentes facettes.",
        "es": "En Fez hay mucho más que hacer que visitar sus monumentos famosos. La mejor manera de conocer la ciudad es recorrer sus calles, hablar con los vecinos, descubrir los oficios tradicionales, probar la comida local y tomarse el tiempo necesario para disfrutar de sus distintas facetas."
      },
      {
        "en": "Start by exploring the Old Medina of Fez. Walk through its narrow streets, discover the traditional souks, visit historic places and take your time to notice the details around you. Every part of the Medina has its own atmosphere, and sometimes the best experiences are found away from the main tourist streets.",
        "fr": "Commencez par explorer l’ancienne médina de Fès. Parcourez ses ruelles étroites, découvrez les souks traditionnels, visitez des lieux historiques et prenez le temps d’observer les détails. Chaque partie de la médina a sa propre atmosphère, et les meilleures expériences se trouvent parfois à l’écart des principales rues touristiques.",
        "es": "Empieza por explorar la medina antigua de Fez. Recorre sus callejuelas, descubre los zocos tradicionales, visita lugares históricos y detente a observar los detalles que te rodean. Cada zona de la medina tiene su propio ambiente, y a veces las mejores experiencias se encuentran lejos de las calles más turísticas."
      },
      {
        "en": "Discover the traditional crafts of Fez by visiting local workshops and watching craftsmen at work. You can see skills such as zellige, leatherwork, woodwork, metalwork and other traditional crafts that have been part of the city’s identity for generations.",
        "fr": "Découvrez l’artisanat traditionnel de Fès en visitant les ateliers locaux et en observant les artisans au travail. Vous pourrez voir des savoir-faire comme le zellige, le travail du cuir, du bois, du métal et d’autres métiers qui font partie de l’identité de la ville depuis des générations.",
        "es": "Descubre los oficios tradicionales de Fez visitando talleres locales y observando a los artesanos mientras trabajan. Podrás conocer técnicas como el zellige, el trabajo del cuero, la carpintería, la metalistería y otros oficios que forman parte de la identidad de la ciudad desde hace generaciones."
      },
      {
        "en": "Take time to explore the local souks and markets. You can find spices, traditional Moroccan products, handmade items, food and everyday products used by local people. The souks are not only places for shopping; they are also part of the daily life of the Medina.",
        "fr": "Prenez le temps de découvrir les souks et marchés locaux. Vous y trouverez des épices, des produits marocains traditionnels, des articles faits main, de la nourriture et des produits du quotidien. Les souks ne sont pas seulement des lieux de shopping : ils font aussi partie de la vie quotidienne de la médina.",
        "es": "Dedica tiempo a recorrer los zocos y mercados locales. Encontrarás especias, productos tradicionales marroquíes, piezas hechas a mano, alimentos y artículos de uso diario. Los zocos no son solo lugares donde comprar: también forman parte de la vida cotidiana de la medina."
      },
      {
        "en": "Food is another important part of experiencing Fez. Taste traditional Moroccan dishes, discover local ingredients and explore the flavours of the Medina. For visitors who want a deeper experience, a local food tasting tour is a great way to discover Fez through its food and everyday culture.",
        "fr": "La cuisine est un autre aspect important de l’expérience de Fès. Goûtez aux plats marocains traditionnels, découvrez les ingrédients locaux et explorez les saveurs de la médina. Pour aller plus loin, une visite de dégustation culinaire avec un guide local est une belle manière de découvrir Fès à travers sa cuisine et sa vie quotidienne.",
        "es": "La gastronomía es otra parte importante de la experiencia de Fez. Prueba platos tradicionales marroquíes, descubre los ingredientes locales y explora los sabores de la medina. Si quieres profundizar, un paseo de degustación con un guía local es una buena manera de conocer Fez a través de su cocina y de su cultura cotidiana."
      },
      {
        "en": "Take a moment to discover the historic Mellah and Fes Jdid. Explore the streets around the Jewish quarter, see its distinctive architecture and learn more about the Jewish heritage that forms an important part of the history of Fez.",
        "fr": "Prenez le temps de découvrir le Mellah historique et Fès Jdid. Explorez les rues autour du quartier juif, observez son architecture distinctive et apprenez-en davantage sur l’héritage juif, qui occupe une place importante dans l’histoire de Fès.",
        "es": "Reserva un momento para descubrir el Mellah histórico y Fez Jdid. Recorre las calles del barrio judío, observa su arquitectura característica y conoce mejor el patrimonio judío, que constituye una parte importante de la historia de Fez."
      },
      {
        "en": "For a different perspective, look for one of the panoramic viewpoints around Fez. Seeing the Medina from above allows you to appreciate its rooftops, minarets, walls and surrounding landscape in a completely different way.",
        "fr": "Pour changer de perspective, recherchez l’un des points de vue panoramiques autour de Fès. Depuis les hauteurs, les toits, les minarets, les remparts et le paysage alentour se dévoilent autrement.",
        "es": "Para cambiar de perspectiva, busca uno de los miradores panorámicos que rodean Fez. Contemplar la medina desde arriba te permite apreciar sus tejados, minaretes, murallas y el paisaje que la rodea de una manera completamente distinta."
      },
      {
        "en": "And when the day comes to an end, discover Fez at night. Head towards the New City, enjoy a café or restaurant, walk through the modern streets and experience the city after sunset.",
        "fr": "À la fin de la journée, découvrez Fès la nuit. Rendez-vous dans la Ville Nouvelle, profitez d’un café ou d’un restaurant, promenez-vous dans les rues modernes et découvrez la ville après le coucher du soleil.",
        "es": "Y, al terminar el día, descubre Fez de noche. Acércate a la ciudad nueva, disfruta de una cafetería o un restaurante, pasea por sus calles modernas y conoce el ambiente de la ciudad después de la puesta de sol."
      },
      {
        "en": "Whether you have one day or several days in Fez, the best way to experience the city is to combine its history with its everyday life. Walk, taste, explore, meet local people and take time to discover the places that make Fez different.",
        "fr": "Que vous ayez un ou plusieurs jours à Fès, le mieux est de mêler son histoire à la vie quotidienne. Marchez, goûtez, explorez, rencontrez les habitants et prenez le temps de découvrir ce qui rend Fès différente.",
        "es": "Tanto si dispones de un día como de varios, la mejor forma de conocer Fez es combinar su historia con su vida cotidiana. Camina, prueba, explora, conoce a los vecinos y date tiempo para descubrir los lugares que hacen que Fez sea diferente."
      }
    ],
    "source": "src/pages/ThingsToDoArticlePage.tsx",
    "imageGroups": [
      [
        {
          "src": "/images/fez-things-to-do/things-01.jpg",
          "alt": {
            "en": "Busy souk lane in the old Medina of Fez",
            "fr": "Allée animée d’un souk dans l’ancienne médina de Fès",
            "es": "Calle animada de un zoco en la medina antigua de Fez"
          },
          "width": 800,
          "height": 1200
        }
      ],
      [
        {
          "src": "/images/fez-things-to-do/things-02.jpg",
          "alt": {
            "en": "Artisan working in a traditional workshop in Fez",
            "fr": "Artisan travaillant dans un atelier traditionnel à Fès",
            "es": "Artesano trabajando en un taller tradicional de Fez"
          },
          "width": 800,
          "height": 1067
        }
      ],
      [
        {
          "src": "/images/fez-things-to-do/things-03.jpg",
          "alt": {
            "en": "Colorful goods hanging over a narrow market lane in Fez",
            "fr": "Marchandises colorées suspendues au-dessus d’une ruelle commerçante à Fès",
            "es": "Mercancías de colores colgadas sobre una calle comercial estrecha de Fez"
          },
          "width": 978,
          "height": 1300
        }
      ],
      [
        {
          "src": "/images/fez-things-to-do/things-04.jpg",
          "alt": {
            "en": "Glasses of drinks on a table in Fez",
            "fr": "Verres de boissons posés sur une table à Fès",
            "es": "Vasos con bebidas sobre una mesa en Fez"
          },
          "width": 1536,
          "height": 2048
        }
      ],
      [
        {
          "src": "/images/fez-things-to-do/things-05.jpg",
          "alt": {
            "en": "Traditional street and doorway with laundry in Fez",
            "fr": "Rue traditionnelle et porte avec du linge étendu à Fès",
            "es": "Calle y puerta tradicionales con ropa tendida en Fez"
          },
          "width": 800,
          "height": 1067
        }
      ],
      [
        {
          "src": "/images/fez-things-to-do/things-06.jpg",
          "alt": {
            "en": "View over densely packed rooftops in Fez",
            "fr": "Vue sur les toits serrés de Fès",
            "es": "Vista de los tejados apiñados de Fez"
          },
          "width": 800,
          "height": 533
        }
      ],
      [
        {
          "src": "/images/fez-things-to-do/things-07.jpg",
          "alt": {
            "en": "Outdoor café terrace lit at night in Fez",
            "fr": "Terrasse de café en plein air éclairée la nuit à Fès",
            "es": "Terraza de una cafetería al aire libre iluminada por la noche en Fez"
          },
          "width": 1080,
          "height": 1350
        }
      ],
      [
        {
          "src": "/images/fez-things-to-do/things-08.jpg",
          "alt": {
            "en": "Visitors posing at a decorated entrance in Fez",
            "fr": "Visiteurs posant devant une entrée décorée à Fès",
            "es": "Visitantes posando ante una entrada decorada en Fez"
          },
          "width": 2048,
          "height": 1536
        }
      ]
    ],
    "imageAfter": []
  }
];

const SOURCE_REVIEWS = [
  {
    "author": "Mathilde H",
    "title": "A very professional guide",
    "quote": "An interesting visit in the medina and the souk with a guide who allows you to get your bearings well and have interesting information about the places",
    "date": "October 4, 2026",
    "url": "https://www.tripadvisor.com/ShowUserReviews-g293733-d34669370-r1080469998-Fez_Medina_Walking_Tour-Fez_Fez_Meknes.html"
  },
  {
    "author": "Andi",
    "title": "Totally recommend! Highly rate and great guide.",
    "quote": "We had a fabulous tour with Momo - he was so friendly, so informative, answered our many many many questions, took us all around the Medina (great to have a guide to do this) and 100% respected our request to not “go shopping”. A wonderful guide in Fez and totally recommend!",
    "date": "October 2, 2026",
    "url": "https://www.tripadvisor.com/ShowUserReviews-g293733-d34678534-r1080241908-Private_Fez_Medina_Walking_Tour_with_a_Local_Guide-Fez_Fez_Meknes.html"
  },
  {
    "author": "Roam14564840921",
    "title": "Nice tour with abdul",
    "quote": "We enjoyed our tour , the guide was amazing and went out of his way to make our trip memorable.",
    "date": "October 1, 2026",
    "url": "https://www.tripadvisor.com/ShowUserReviews-g293733-d34090533-r1080073259-Fez_Food_Tasting_Walking_Tour-Fez_Fez_Meknes.html"
  },
  {
    "author": "mike",
    "title": "Best Guide",
    "quote": "Rashid was a fantastic guide. We were out for 5 hours and learned and saw so much. An excellent day altogether",
    "date": "September 25, 2026",
    "url": "https://www.tripadvisor.com/ShowUserReviews-g293733-d34669370-r1079291850-Fez_Medina_Walking_Tour-Fez_Fez_Meknes.html"
  },
  {
    "author": "Pamela B",
    "title": "Best ambassador for Moroccan culture",
    "quote": "My spouse and I spent the day in Fes with a price guide named Arbi, and it was absolutely outstanding. He took us through the Fes Medina and as an inquisitive person, I was delighted that he was so willing to share his incredible knowledge of the country, city, the Medina, and the workers who create beautiful leather, embroidery, carpets, blankets, and so much more.",
    "date": "September 23, 2026",
    "url": "https://www.tripadvisor.com/ShowUserReviews-g293733-d34683134-r1079032546-Fez_Old_City_Medina_Tour-Fez_Fez_Meknes.html"
  },
  {
    "author": "Tara U",
    "title": "Amazing Day in an even more amazing place!",
    "quote": "This was the most amazing day!!! Arabi was so good to us. His knowledge of Fes and its Medina is second to none. If you want a historic tour that goes at whatever pace you set, he the guide for you! I highly recommend Arabi and the Fez Medina walking tour!",
    "date": "September 23, 2026",
    "url": "https://www.tripadvisor.com/ShowUserReviews-g293733-d34669370-r1079031217-Fez_Medina_Walking_Tour-Fez_Fez_Meknes.html"
  }
];

const ABOUT_PARAGRAPHS: Localized[] = [
  {
    "en": "We are a small local team based in Fez.",
    "fr": "Nous sommes une petite équipe locale basée à Fès.",
    "es": "Somos un pequeño equipo local afincado en Fez."
  },
  {
    "en": "We created Fez Guide Tours to share our city with travellers and help them discover Fez in a simple, comfortable and personal way.",
    "fr": "Nous avons créé Fez Guide Tours pour partager notre ville avec les voyageurs et les aider à découvrir Fès de façon simple, confortable et personnelle.",
    "es": "Creamos Fez Guide Tours para compartir nuestra ciudad con los viajeros y ayudarles a descubrir Fez de una manera sencilla, cómoda y personal."
  },
  {
    "en": "We know the streets of the Medina, the different areas of the city, the local food, traditions and everyday life.",
    "fr": "Nous connaissons les rues de la médina, les différents quartiers, la cuisine locale, les traditions et la vie quotidienne.",
    "es": "Conocemos las calles de la medina, los distintos barrios de la ciudad, la comida local, las tradiciones y la vida cotidiana."
  },
  {
    "en": "Our goal is simple: to help you enjoy Fez and discover the city through local eyes.",
    "fr": "Notre but est simple : vous aider à profiter de Fès et à découvrir la ville à travers des yeux locaux.",
    "es": "Nuestro objetivo es sencillo: ayudaros a disfrutar de Fez y descubrir la ciudad a través de los ojos de sus habitantes."
  },
  {
    "en": "Med is based in Fez and works closely with travellers, local guides and partners to organize tours and experiences around the city.",
    "fr": "Med est basé à Fès. Il travaille avec les voyageurs, les guides locaux et les partenaires pour organiser les visites et les expériences dans la ville.",
    "es": "Med vive en Fez y colabora estrechamente con viajeros, guías locales y colaboradores para organizar visitas y experiencias en la ciudad."
  },
  {
    "en": "We work with local guides who know Fez, its history, culture and Medina. They are here to share their knowledge, answer your questions and help you enjoy your time in the city.",
    "fr": "Nous travaillons avec des guides locaux qui connaissent Fès, son histoire, sa culture et sa médina. Ils partagent ce qu’ils savent, répondent à vos questions et vous aident à profiter de la ville.",
    "es": "Trabajamos con guías locales que conocen Fez, su historia, su cultura y su medina. Comparten sus conocimientos, responden a vuestras preguntas y os ayudan a disfrutar de vuestro tiempo en la ciudad."
  },
  {
    "en": "For day trips, transfers and other experiences, we work with trusted local drivers and partners. They help us make your experience comfortable, organized and enjoyable.",
    "fr": "Pour les excursions, les transferts et les autres expériences, nous travaillons avec des chauffeurs et des partenaires locaux de confiance. Ils aident à rendre l’expérience confortable, organisée et agréable.",
    "es": "Para las excursiones de un día, los traslados y otras experiencias, trabajamos con conductores y colaboradores locales de confianza. Nos ayudan a ofreceros una experiencia cómoda, organizada y agradable."
  },
  {
    "en": "We believe that the best way to discover Fez is not only by visiting its famous places, but also by seeing how the city really lives.",
    "fr": "Nous pensons que la meilleure façon de découvrir Fès n’est pas seulement de visiter ses lieux célèbres, mais aussi de voir comment la ville vit vraiment.",
    "es": "Creemos que la mejor manera de descubrir Fez no es solo visitar sus lugares famosos, sino también ver cómo vive realmente la ciudad."
  },
  {
    "en": "We want to welcome you to our city, share what we know and help you create good memories in Fez.",
    "fr": "Nous voulons vous accueillir dans notre ville, partager ce que nous savons et vous aider à garder de bons souvenirs à Fès.",
    "es": "Queremos daros la bienvenida a nuestra ciudad, compartir lo que sabemos y ayudaros a crear buenos recuerdos de Fez."
  },
  {
    "en": "Welcome to Fez. See the city through local eyes.",
    "fr": "Bienvenue à Fès. Voyez la ville à travers des yeux locaux.",
    "es": "Bienvenidos a Fez. Conoced la ciudad a través de los ojos de sus habitantes."
  }
];

const ABOUT_HEADINGS: Localized[] = [
  {
    "en": "About Us",
    "fr": "À propos",
    "es": "Sobre nosotros"
  },
  {
    "en": "Meet Our Team",
    "fr": "Notre équipe",
    "es": "Conoced a nuestro equipo"
  },
  {
    "en": "Founder & Local Host",
    "fr": "Fondateur et hôte local",
    "es": "Fundador y anfitrión local"
  },
  {
    "en": "Our Local Guides",
    "fr": "Nos guides locaux",
    "es": "Nuestros guías locales"
  },
  {
    "en": "Our Drivers & Local Partners",
    "fr": "Nos chauffeurs et partenaires locaux",
    "es": "Nuestros conductores y colaboradores locales"
  },
  {
    "en": "Why We Do It",
    "fr": "Pourquoi nous le faisons",
    "es": "Por qué lo hacemos"
  }
];

const ABOUT_IMAGES = [
  {
    "src": "/images/about/med.webp",
    "alt": {
      "en": "Med with a visitor in a Fez workshop",
      "fr": "Med with a visitor in a Fez workshop",
      "es": "Med con un visitante en un taller de Fez"
    },
    "width": 1440,
    "height": 1440
  },
  {
    "src": "/images/about/guides-01.webp",
    "alt": {
      "en": "A group with a local guide at a Fez gate",
      "fr": "A group with a local guide at a Fez gate",
      "es": "Un grupo con un guía local ante una puerta de Fez"
    },
    "width": 1600,
    "height": 1200
  },
  {
    "src": "/images/about/guides-02.webp",
    "alt": {
      "en": "A guide walking with visitors in a Medina lane",
      "fr": "A guide walking with visitors in a Medina lane",
      "es": "Un guía paseando con visitantes por una calle de la medina"
    },
    "width": 1536,
    "height": 2048
  },
  {
    "src": "/images/about/guides-03.webp",
    "alt": {
      "en": "A guide with a group at a historic doorway",
      "fr": "A guide with a group at a historic doorway",
      "es": "Un guía con un grupo ante una puerta histórica"
    },
    "width": 2048,
    "height": 1536
  },
  {
    "src": "/images/about/guides-04.webp",
    "alt": {
      "en": "A guide explaining a map to visitors",
      "fr": "A guide explaining a map to visitors",
      "es": "Un guía explicando un mapa a los visitantes"
    },
    "width": 975,
    "height": 1300
  },
  {
    "src": "/images/about/drivers-01.webp",
    "alt": {
      "en": "A local partner at a mountain viewpoint",
      "fr": "A local partner at a mountain viewpoint",
      "es": "Un colaborador local en un mirador de montaña"
    },
    "width": 800,
    "height": 600
  },
  {
    "src": "/images/about/drivers-02.webp",
    "alt": {
      "en": "Three men from the local team outdoors",
      "fr": "Three men from the local team outdoors",
      "es": "Tres hombres del equipo local al aire libre"
    },
    "width": 800,
    "height": 600
  },
  {
    "src": "/images/about/drivers-03.webp",
    "alt": {
      "en": "A group with a local partner in the mountains",
      "fr": "A group with a local partner in the mountains",
      "es": "Un grupo con un colaborador local en las montañas"
    },
    "width": 800,
    "height": 600
  },
  {
    "src": "/images/about/drivers-04.webp",
    "alt": {
      "en": "Travellers with a local partner in a vehicle",
      "fr": "Travellers with a local partner in a vehicle",
      "es": "Viajeros con un colaborador local en un vehículo"
    },
    "width": 750,
    "height": 421
  },
  {
    "src": "/images/about/drivers-05.webp",
    "alt": {
      "en": "Local partners seated together in Fez",
      "fr": "Local partners seated together in Fez",
      "es": "Colaboradores locales sentados juntos en Fez"
    },
    "width": 800,
    "height": 593
  }
];

const CATEGORY_SEEDS = [
  {
    "id": "fez",
    "title": {
      "en": "Explore the Medina of Fez — Through Local Eyes",
      "fr": "Explorer la Médina de Fès — À Travers des Yeux Locaux",
      "es": "Explorad la medina de Fez a través de los ojos de sus habitantes"
    },
    "subtitle": {
      "en": "The Medina of Fez is not a museum. People still live and work here every day. Discover historic gates, hidden workshops, living traditions, and panoramic viewpoints.",
      "fr": "La Médina de Fès n’est pas un musée : les habitants y vivent et travaillent chaque jour. Découvrez ses portes historiques, ses ateliers vivants et ses panoramas.",
      "es": "La medina de Fez no es un museo. La gente sigue viviendo y trabajando aquí cada día. Descubrid puertas históricas, talleres escondidos, tradiciones vivas y miradores panorámicos."
    },
    "image": "/images/real/fez_explore_medina_image1.jpg",
    "alt": text('Medina of Fez gates and rooftops', 'Medina of Fez gates and rooftops', 'Puertas y tejados de la medina de Fez'),
    "badge": text('Fes el-Bali · Fes Jdid & Mellah · Living Heritage', 'Fes el-Bali · Fes Jdid & Mellah · Living Heritage', 'Fes el-Bali · Fes Jdid y Mellah · Patrimonio vivo'),
    "galleryTitle": {
      "en": "Real Scenes From the Streets of Fez",
      "fr": "Real Scenes From the Streets of Fez",
      "es": "Escenas reales de las calles de Fez"
    }
  },
  {
    "id": "day-trips",
    "title": {
      "en": "Private Day Trips & Excursions Beyond Fez",
      "fr": "Excursions Privées d’une Journée au Départ de Fès",
      "es": "Excursiones privadas de un día más allá de Fez"
    },
    "subtitle": {
      "en": "Discover Chefchaouen, Meknes with Volubilis and Moulay Idriss, and the mountains beyond Fez.",
      "fr": "Découvrez Chefchaouen, Meknès avec Volubilis et Moulay Idriss, et les montagnes au-delà de Fès.",
      "es": "Descubrid Chefchaouen, Meknes con Volubilis y Moulay Idriss, y las montañas más allá de Fez."
    },
    "image": "/images/daytrip-chefchaouen/blue-alley.webp",
    "alt": text('Chefchaouen Blue City', 'Chefchaouen Blue City', 'Chefchaouen, la ciudad azul'),
    "badge": text('Chefchaouen · Volubilis & Meknes · Middle Atlas & Ifrane', 'Chefchaouen · Volubilis & Meknes · Middle Atlas & Ifrane', 'Chefchaouen · Volubilis y Meknes · Atlas Medio e Ifrane'),
    "galleryTitle": {
      "en": "What You Discover Beyond the City",
      "fr": "What You Discover Beyond the City",
      "es": "Lo que descubriréis más allá de la ciudad"
    }
  },
  {
    "id": "food-tours",
    "title": {
      "en": "Taste Fez Through Local Eyes — Food & Tasting Walks",
      "fr": "Goûtez Fès à Travers des Yeux Locaux — Balades Gourmandes",
      "es": "Saborea Fez de la mano de sus vecinos — Paseos gastronómicos"
    },
    "subtitle": {
      "en": "To understand Fez, you should not only walk through its streets. You should taste them. Discover the smells, flavours, bakeries, and street foods of the Old Medina.",
      "fr": "Pour comprendre Fès, il faut la goûter ! Découvrez les arômes, les saveurs, les fours communaux et la street food authentique de la médina.",
      "es": "Para comprender Fez, no basta con recorrer sus calles: también hay que saborearlas. Descubre los aromas, los sabores, las panaderías y la comida callejera de la medina antigua."
    },
    "image": "/images/food-tasting-walk/wood-oven.webp",
    "alt": text('A baker working at a wood-fired oven', 'A baker working at a wood-fired oven', "Un panadero trabajando ante un horno de leña"),
    "badge": text('Medina Food Tasting Walks · Fassi Gastronomy · Souks & Bakeries', 'Medina Food Tasting Walks · Fassi Gastronomy · Souks & Bakeries', "Paseos gastronómicos por la medina · Cocina de Fez · Zocos y panaderías"),
    "galleryTitle": {
      "en": "Real Flavours of Fassi Culinary Life",
      "fr": "Real Flavours of Fassi Culinary Life",
      "es": "Sabores auténticos de la vida culinaria de Fez"
    }
  },
  {
    "id": "travel-tips",
    "title": {
      "en": "Practical Travel Tips & Local Advice for Fez",
      "fr": "Conseils Pratiques & Informations Locales pour Fès",
      "es": "Consejos prácticos de viaje y recomendaciones locales para Fez"
    },
    "subtitle": {
      "en": "A few simple things make your stay in Fez comfortable and stress-free. Practical advice on walking, red Petit Taxis, cash, and local customs from people who know the city.",
      "fr": "Quelques conseils simples pour un séjour serein et confortable. Astuces de marche, petits taxis rouges, espèces et coutumes par des locaux.",
      "es": "Unos pocos detalles sencillos harán que vuestra estancia en Fez sea cómoda y sin preocupaciones. Consejos para caminar, utilizar los pequeños taxis rojos, llevar efectivo y conocer las costumbres locales, de la mano de quienes conocen la ciudad."
    },
    "image": "/images/tips-getting-around/bab-boujloud-night.webp",
    "alt": text('Bab Boujloud at night', 'Bab Boujloud at night', "Bab Boujloud de noche"),
    "badge": text('Local Practical Advice · Honest Tips · Getting Around', 'Local Practical Advice · Honest Tips · Getting Around', 'Consejos prácticos locales · Recomendaciones sinceras · Cómo moverse'),
    "galleryTitle": {
      "en": "Everyday Scenes & Practical Navigation",
      "fr": "Everyday Scenes & Practical Navigation",
      "es": "Escenas cotidianas y orientación práctica"
    }
  }
];

const CATEGORY_GALLERIES: Record<string, { src: string; alt: Localized; caption: Localized }[]> = {
  "fez": [
    {
      "src": "/images/real/fez_explore_medina_image2.jpg",
      "alt": {
        "en": "Narrow Medina passage",
        "fr": "Narrow Medina passage",
        "es": "Pasaje estrecho de la medina"
      },
      "caption": {
        "en": "Quiet Medina lanes",
        "fr": "Quiet Medina lanes",
        "es": "Calles tranquilas de la medina"
      }
    },
    {
      "src": "/images/real/fez_history_culture_image2.jpg",
      "alt": {
        "en": "Madrasa woodwork and plaster carving",
        "fr": "Madrasa woodwork and plaster carving",
        "es": "Carpintería y yeso tallado de una madrasa"
      },
      "caption": {
        "en": "Carved cedar & plaster",
        "fr": "Carved cedar & plaster",
        "es": "Cedro y yeso tallados"
      }
    },
    {
      "src": "/images/real/fez_things_to_do_image2.jpg",
      "alt": {
        "en": "Master craftsmen workshop",
        "fr": "Master craftsmen workshop",
        "es": "Taller de maestros artesanos"
      },
      "caption": {
        "en": "Artisans at work",
        "fr": "Artisans at work",
        "es": "Artesanos trabajando"
      }
    },
    {
      "src": "/images/real/fez_explore_medina_image4.jpg",
      "alt": {
        "en": "Panoramic rooftop view",
        "fr": "Panoramic rooftop view",
        "es": "Vista panorámica desde una azotea"
      },
      "caption": {
        "en": "Panoramic rooftops",
        "fr": "Panoramic rooftops",
        "es": "Panorámica de los tejados"
      }
    }
  ],
  "day-trips": [
    {
      "src": "/images/daytrip-chefchaouen/blue-alley.webp",
      "alt": {
        "en": "Chefchaouen alleys",
        "fr": "Chefchaouen alleys",
        "es": "Callejuelas de Chefchaouen"
      },
      "caption": {
        "en": "Chefchaouen & Rif Mountains",
        "fr": "Chefchaouen & Rif Mountains",
        "es": "Chefchaouen y las montañas del Rif"
      }
    },
    {
      "src": "/images/daytrip-meknes/bab-mansour.webp",
      "alt": {
        "en": "Bab Mansour in Meknes",
        "fr": "Bab Mansour in Meknes",
        "es": "Bab Mansour en Meknes"
      },
      "caption": {
        "en": "Roman Volubilis & Meknes",
        "fr": "Roman Volubilis & Meknes",
        "es": "La Volubilis romana y Meknes"
      }
    },
    {
      "src": "/images/daytrip-ifrane/mountain-countryside.webp",
      "alt": {
        "en": "Middle Atlas mountains beyond Fez",
        "fr": "Middle Atlas mountains beyond Fez",
        "es": "Montañas del Atlas Medio más allá de Fez"
      },
      "caption": {
        "en": "Ifrane & Middle Atlas",
        "fr": "Ifrane & Middle Atlas",
        "es": "Ifrane y el Atlas Medio"
      }
    }
  ],
  "food-tours": [
    {
      "src": "/images/food-tasting-walk/pastries-tea.webp",
      "alt": {
        "en": "Pastries and tea from the tasting walk",
        "fr": "Pastries and tea from the tasting walk",
        "es": "Dulces y té de la ruta de degustación"
      },
      "caption": {
        "en": "Pastries and tea from the tasting walk",
        "fr": "Pastries and tea from the tasting walk",
        "es": "Dulces y té de la ruta de degustación"
      }
    },
    {
      "src": "/images/food-culture-life/tea-tray.webp",
      "alt": {
        "en": "Tea and hospitality",
        "fr": "Tea and hospitality",
        "es": "Té y hospitalidad"
      },
      "caption": {
        "en": "Tea and hospitality",
        "fr": "Tea and hospitality",
        "es": "Té y hospitalidad"
      }
    },
    {
      "src": "/images/food-markets-souks/spice-tins.webp",
      "alt": {
        "en": "Market spices",
        "fr": "Market spices",
        "es": "Especias del mercado"
      },
      "caption": {
        "en": "Market spices",
        "fr": "Market spices",
        "es": "Especias del mercado"
      }
    },
    {
      "src": "/images/food-traditional-fassi/pastilla.webp",
      "alt": {
        "en": "Pastilla at the table",
        "fr": "Pastilla at the table",
        "es": "Pastela en la mesa"
      },
      "caption": {
        "en": "Pastilla at the table",
        "fr": "Pastilla at the table",
        "es": "Pastela en la mesa"
      }
    }
  ],
  "travel-tips": [
    {
      "src": "/images/tips-getting-around/city-gate.webp",
      "alt": {
        "en": "A city gate",
        "fr": "A city gate",
        "es": "Una puerta de la ciudad"
      },
      "caption": {
        "en": "A city gate",
        "fr": "A city gate",
        "es": "Una puerta de la ciudad"
      }
    },
    {
      "src": "/images/tips-plan-trip/medina-view.webp",
      "alt": {
        "en": "A view over the Medina",
        "fr": "A view over the Medina",
        "es": "Vista de la medina"
      },
      "caption": {
        "en": "A view over the Medina",
        "fr": "A view over the Medina",
        "es": "Vista de la medina"
      }
    },
    {
      "src": "/images/tips-practical/spice-shop.webp",
      "alt": {
        "en": "A spice shop",
        "fr": "A spice shop",
        "es": "Una tienda de especias"
      },
      "caption": {
        "en": "A spice shop",
        "fr": "A spice shop",
        "es": "Una tienda de especias"
      }
    },
    {
      "src": "/images/tips-getting-around/hexagonal-sign.webp",
      "alt": {
        "en": "A Medina street sign",
        "fr": "A Medina street sign",
        "es": "Un letrero de una calle de la medina"
      },
      "caption": {
        "en": "A Medina street sign",
        "fr": "A Medina street sign",
        "es": "Un letrero de una calle de la medina"
      }
    }
  ]
};

const MEDINA_GATES = [
  {
    "title": {
      "en": "Bab Boujloud",
      "fr": "Bab Boujloud",
      "es": "Bab Boujloud"
    },
    "description": {
      "en": "The famous Blue Gate; main western hub.",
      "fr": "The famous Blue Gate; main western hub.",
      "es": "La famosa Puerta Azul, principal acceso occidental."
    }
  },
  {
    "title": {
      "en": "Bab Rcif",
      "fr": "Bab Rcif",
      "es": "Bab Rcif"
    },
    "description": {
      "en": "Central access to lower medina & food souks.",
      "fr": "Central access to lower medina & food souks.",
      "es": "Acceso central a la parte baja de la medina y los zocos de comida."
    }
  },
  {
    "title": {
      "en": "Place Batha",
      "fr": "Place Batha",
      "es": "Plaza Batha"
    },
    "description": {
      "en": "Quiet taxi station near Batha museum and riads.",
      "fr": "Quiet taxi station near Batha museum and riads.",
      "es": "Parada de taxis tranquila cerca del museo Batha y los riads."
    }
  },
  {
    "title": {
      "en": "Ain Azliten",
      "fr": "Ain Azliten",
      "es": "Ain Azliten"
    },
    "description": {
      "en": "Accessible parking lot for northern riads.",
      "fr": "Accessible parking lot for northern riads.",
      "es": "Aparcamiento accesible para los riads del norte."
    }
  }
];

// Shared controls, form feedback and navigation labels only. Business narratives,
// product policies, photo metadata and review records belong to their CMS entities.
const SHARED_UI_COPY: Record<string, Localized> = {
  "TripadvisorReviewsSection.label.1": {
    "en": "Real stories from travelers in Fez",
    "fr": "De vrais avis de voyageurs à Fès",
    "es": "Historias reales de viajeros en Fez"
  },
  "TripadvisorReviewsSection.label.2": {
    "en": "Verified reviews published on the official Fez Guide Tours Tripadvisor page.",
    "fr": "Avis authentiques publiés sur la page Tripadvisor officielle de Fez Guide Tours.",
    "es": "Opiniones verificadas publicadas en la página oficial de Fez Guide Tours en Tripadvisor."
  },
  "TripadvisorReviewsSection.label.3": {
    "en": "Read on Tripadvisor",
    "fr": "Lire sur Tripadvisor",
    "es": "Leer en Tripadvisor"
  },
  "TripadvisorReviewsSection.text.1": {
    "en": "Tripadvisor traveler reviews",
    "fr": "Tripadvisor traveler reviews",
    "es": "Opiniones de viajeros en Tripadvisor"
  },
  "TripadvisorReviewsSection.text.2": {
    "en": "Tripadvisor",
    "fr": "Tripadvisor",
    "es": "Tripadvisor"
  },
  "TripadvisorReviewsSection.text.5": {
    "en": "De vrais avis de voyageurs à Fès",
    "fr": "De vrais avis de voyageurs à Fès",
    "es": "Historias reales de viajeros en Fez"
  },
  "TripadvisorReviewsSection.text.6": {
    "en": "Avis authentiques publiés sur la page Tripadvisor officielle de Fez Guide Tours.",
    "fr": "Avis authentiques publiés sur la page Tripadvisor officielle de Fez Guide Tours.",
    "es": "Opiniones auténticas publicadas en la página oficial de Fez Guide Tours en Tripadvisor."
  },
  "TripadvisorReviewsSection.text.7": {
    "en": "Lire sur Tripadvisor",
    "fr": "Lire sur Tripadvisor",
    "es": "Leer en Tripadvisor"
  },
  "TripadvisorReviewsSection.text.9": {
    "en": "Real stories from travelers in Fez",
    "fr": "Real stories from travelers in Fez",
    "es": "Historias reales de viajeros en Fez"
  },
  "TripadvisorReviewsSection.text.10": {
    "en": "Verified reviews published on the official Fez Guide Tours Tripadvisor page.",
    "fr": "Verified reviews published on the official Fez Guide Tours Tripadvisor page.",
    "es": "Opiniones verificadas publicadas en la página oficial de Fez Guide Tours en Tripadvisor."
  },
  "TripadvisorReviewsSection.text.11": {
    "en": "Read on Tripadvisor",
    "fr": "Read on Tripadvisor",
    "es": "Leer en Tripadvisor"
  },
  "FloatingWhatsAppButton.copy.1": {
    "en": "Check dates & availability",
    "fr": "Vérifier disponibilités",
    "es": "Consultar fechas y disponibilidad"
  },
  "FloatingWhatsAppButton.copy.2": {
    "en": "Custom private itinerary",
    "fr": "Circuit privé sur mesure",
    "es": "Itinerario privado a medida"
  },
  "FloatingWhatsAppButton.copy.3": {
    "en": "Hello! We are looking for a tailored private tour for our group in Fez. Could you suggest an itinerary?",
    "fr": "Bonjour ! Nous recherchons une visite privée personnalisée pour notre groupe à Fès. Pouvez-vous nous conseiller ?",
    "es": "¡Hola! Buscamos una visita privada a medida para nuestro grupo en Fez. ¿Podéis proponernos un itinerario?"
  },
  "FloatingWhatsAppButton.copy.4": {
    "en": "Riad pickup & transport question",
    "fr": "Prise en charge au riad",
    "es": "Consulta sobre recogida en el riad y transporte"
  },
  "FloatingWhatsAppButton.label.1": {
    "en": "Local Guide Online",
    "fr": "Guide local en ligne",
    "es": "Guía local en línea"
  },
  "FloatingWhatsAppButton.label.2": {
    "en": "Chat now",
    "fr": "Discuter",
    "es": "Chatear ahora"
  },
  "FloatingWhatsAppButton.label.3": {
    "en": "Online now · Replies in minutes",
    "fr": "En ligne · Réponse en quelques minutes",
    "es": "En línea ahora · Respuesta en minutos"
  },
  "FloatingWhatsAppButton.label.4": {
    "en": "Inquiry Context:",
    "fr": "Votre sélection :",
    "es": "Motivo de la consulta:"
  },
  "FloatingWhatsAppButton.label.5": {
    "en": "Marhaban! We are here to answer your questions about tour details, flexible timings, or crafting custom itineraries.",
    "fr": "Marhaban ! Nous sommes à votre disposition pour toute question sur nos circuits, tarifs ou programmes sur mesure.",
    "es": "¡Marhaban! Estamos aquí para responder a vuestras preguntas sobre las visitas, los horarios flexibles y los itinerarios a medida."
  },
  "FloatingWhatsAppButton.label.6": {
    "en": "Quick Questions:",
    "fr": "Questions fréquentes :",
    "es": "Consultas rápidas:"
  },
  "FloatingWhatsAppButton.label.7": {
    "en": "Type your custom question here...",
    "fr": "Écrivez votre message personnalisé ici...",
    "es": "Escribid aquí vuestra pregunta..."
  },
  "FloatingWhatsAppButton.label.8": {
    "en": "Start WhatsApp Chat",
    "fr": "Discuter sur WhatsApp",
    "es": "Iniciar conversación en WhatsApp"
  },
  "FloatingWhatsAppButton.label.9": {
    "en": "Direct chat with native guides · No middleman · Fast response",
    "fr": "Discussion directe avec nos guides · Sans intermédiaire",
    "es": "Contacto directo con guías locales · Sin intermediarios · Respuesta rápida"
  },
  "FloatingWhatsAppButton.text.1": {
    "en": "Contact guide on WhatsApp",
    "fr": "Contact guide on WhatsApp",
    "es": "Contactar con el guía por WhatsApp"
  },
  "FloatingWhatsAppButton.text.2": {
    "en": "Close tooltip",
    "fr": "Close tooltip",
    "es": "Cerrar aviso"
  },
  "FloatingWhatsAppButton.text.4": {
    "en": "Med Local Guide",
    "fr": "Med Local Guide",
    "es": "Med, guía local"
  },
  "FloatingWhatsAppButton.text.5": {
    "en": "Med & Local Team",
    "fr": "Med & Local Team",
    "es": "Med y el equipo local"
  },
  "FloatingWhatsAppButton.text.6": {
    "en": "Close WhatsApp card",
    "fr": "Close WhatsApp card",
    "es": "Cerrar tarjeta de WhatsApp"
  },
  "FloatingWhatsAppButton.text.7": {
    "en": "Med & Fez Guides",
    "fr": "Med & Fez Guides",
    "es": "Med y los guías de Fez"
  },
  "FloatingWhatsAppButton.text.8": {
    "en": "جولات فاس العتيقة",
    "fr": "جولات فاس العتيقة",
    "es": "Visitas por la medina antigua de Fez"
  },
  "FloatingWhatsAppButton.text.9": {
    "en": "Visites de Fès",
    "fr": "Visites de Fès",
    "es": "Visitas por Fez"
  },
  "FloatingWhatsAppButton.text.10": {
    "en": "الرحلات اليومية الخاصة",
    "fr": "الرحلات اليومية الخاصة",
    "es": "Excursiones privadas de un día"
  },
  "FloatingWhatsAppButton.text.11": {
    "en": "Excursions d’un jour",
    "fr": "Excursions d’un jour",
    "es": "Excursiones de un día"
  },
  "FloatingWhatsAppButton.text.12": {
    "en": "جولات الأكل والتذوق الفاسي",
    "fr": "جولات الأكل والتذوق الفاسي",
    "es": "Rutas gastronómicas y de degustación por Fez"
  },
  "FloatingWhatsAppButton.text.13": {
    "en": "Tours culinaires",
    "fr": "Tours culinaires",
    "es": "Rutas gastronómicas"
  },
  "FloatingWhatsAppButton.text.14": {
    "en": "نصائح السفر وإرشادات فاس",
    "fr": "نصائح السفر وإرشادات فاس",
    "es": "Consejos de viaje y recomendaciones para Fez"
  },
  "FloatingWhatsAppButton.text.15": {
    "en": "Conseils de voyage",
    "fr": "Conseils de voyage",
    "es": "Consejos de viaje"
  },
  "FloatingWhatsAppButton.text.16": {
    "en": "فريق المرشدين المحليين",
    "fr": "فريق المرشدين المحليين",
    "es": "Equipo de guías locales"
  },
  "FloatingWhatsAppButton.text.17": {
    "en": "Équipe locale",
    "fr": "Équipe locale",
    "es": "Equipo local"
  },
  "FloatingWhatsAppButton.text.18": {
    "en": "جولات فاس الخاصة",
    "fr": "جولات فاس الخاصة",
    "es": "Visitas privadas por Fez"
  },
  "FloatingWhatsAppButton.text.19": {
    "en": "Visites privées de Fès",
    "fr": "Visites privées de Fès",
    "es": "Visitas privadas por Fez"
  },
  "FloatingWhatsAppButton.text.20": {
    "en": "مرشد محلي متصل الآن",
    "fr": "مرشد محلي متصل الآن",
    "es": "Guía local en línea"
  },
  "FloatingWhatsAppButton.text.21": {
    "en": "Guide local en ligne",
    "fr": "Guide local en ligne",
    "es": "Guía local en línea"
  },
  "FloatingWhatsAppButton.text.22": {
    "en": "ابدأ المحادثة",
    "fr": "ابدأ المحادثة",
    "es": "Iniciar conversación"
  },
  "FloatingWhatsAppButton.text.23": {
    "en": "Discuter",
    "fr": "Discuter",
    "es": "Chatear"
  },
  "FloatingWhatsAppButton.text.24": {
    "en": "متاح الآن · يرد خلال دقائق",
    "fr": "متاح الآن · يرد خلال دقائق",
    "es": "Disponible ahora · Respuesta en minutos"
  },
  "FloatingWhatsAppButton.text.25": {
    "en": "En ligne · Réponse en quelques minutes",
    "fr": "En ligne · Réponse en quelques minutes",
    "es": "En línea · Respuesta en unos minutos"
  },
  "FloatingWhatsAppButton.text.26": {
    "en": "الاستفسار الحالي:",
    "fr": "الاستفسار الحالي:",
    "es": "Consulta actual:"
  },
  "FloatingWhatsAppButton.text.27": {
    "en": "Votre sélection :",
    "fr": "Votre sélection :",
    "es": "Vuestra selección:"
  },
  "FloatingWhatsAppButton.text.28": {
    "en": "مرحباً بك في فاس! أنا والزملاء هنا للإجابة عن أي استفسار حول الجولات، المواقيت، أو ترتيب رحلات خاصة لعائلتك.",
    "fr": "مرحباً بك في فاس! أنا والزملاء هنا للإجابة عن أي استفسار حول الجولات، المواقيت، أو ترتيب رحلات خاصة لعائلتك.",
    "es": "¡Bienvenidos a Fez! Mis compañeros y yo estamos aquí para responder a vuestras preguntas sobre las visitas, los horarios y las excursiones privadas para vuestra familia."
  },
  "FloatingWhatsAppButton.text.29": {
    "en": "Marhaban ! Nous sommes à votre disposition pour toute question sur nos circuits, tarifs ou programmes sur mesure.",
    "fr": "Marhaban ! Nous sommes à votre disposition pour toute question sur nos circuits, tarifs ou programmes sur mesure.",
    "es": "¡Marhaban! Estamos a vuestra disposición para cualquier pregunta sobre nuestras visitas, tarifas o itinerarios a medida."
  },
  "FloatingWhatsAppButton.text.30": {
    "en": "استفسارات سريعة مقترحة:",
    "fr": "استفسارات سريعة مقترحة:",
    "es": "Consultas rápidas sugeridas:"
  },
  "FloatingWhatsAppButton.text.31": {
    "en": "Questions fréquentes :",
    "fr": "Questions fréquentes :",
    "es": "Preguntas frecuentes:"
  },
  "FloatingWhatsAppButton.text.32": {
    "en": "اكتب سؤالك الخاص هنا...",
    "fr": "اكتب سؤالك الخاص هنا...",
    "es": "Escribid aquí vuestra pregunta..."
  },
  "FloatingWhatsAppButton.text.33": {
    "en": "Écrivez votre message personnalisé ici...",
    "fr": "Écrivez votre message personnalisé ici...",
    "es": "Escribid aquí vuestro mensaje personalizado..."
  },
  "FloatingWhatsAppButton.text.34": {
    "en": "محادثة فورية على واتساب",
    "fr": "محادثة فورية على واتساب",
    "es": "Conversación inmediata por WhatsApp"
  },
  "FloatingWhatsAppButton.text.35": {
    "en": "Discuter sur WhatsApp",
    "fr": "Discuter sur WhatsApp",
    "es": "Chatear por WhatsApp"
  },
  "FloatingWhatsAppButton.text.36": {
    "en": "تواصل مباشر مع فريقنا في فاس · لا وسطاء · رد فوري",
    "fr": "تواصل مباشر مع فريقنا في فاس · لا وسطاء · رد فوري",
    "es": "Contacto directo con nuestro equipo en Fez · Sin intermediarios · Respuesta inmediata"
  },
  "FloatingWhatsAppButton.text.37": {
    "en": "Discussion directe avec nos guides · Sans intermédiaire",
    "fr": "Discussion directe avec nos guides · Sans intermédiaire",
    "es": "Contacto directo con nuestros guías · Sin intermediarios"
  },
  "FloatingWhatsAppButton.text.38": {
    "en": "إغلاق",
    "fr": "إغلاق",
    "es": "Cerrar"
  },
  "FloatingWhatsAppButton.text.39": {
    "en": "Fermer",
    "fr": "Fermer",
    "es": "Cerrar"
  },
  "FloatingWhatsAppButton.text.40": {
    "en": "تواصل عبر واتساب",
    "fr": "تواصل عبر واتساب",
    "es": "Contactar por WhatsApp"
  },
  "FloatingWhatsAppButton.text.41": {
    "en": "Contact WhatsApp",
    "fr": "Contact WhatsApp",
    "es": "Contacto por WhatsApp"
  },
  "FloatingWhatsAppButton.text.42": {
    "en": "Local Guide Online",
    "fr": "Local Guide Online",
    "es": "Guía local en línea"
  },
  "FloatingWhatsAppButton.text.43": {
    "en": "Chat now",
    "fr": "Chat now",
    "es": "Chatear ahora"
  },
  "FloatingWhatsAppButton.text.44": {
    "en": "Online now · Replies in minutes",
    "fr": "Online now · Replies in minutes",
    "es": "En línea ahora · Respuesta en minutos"
  },
  "FloatingWhatsAppButton.text.45": {
    "en": "Inquiry Context:",
    "fr": "Inquiry Context:",
    "es": "Motivo de la consulta:"
  },
  "FloatingWhatsAppButton.text.46": {
    "en": "Marhaban! We are here to answer your questions about tour details, flexible timings, or crafting custom itineraries.",
    "fr": "Marhaban! We are here to answer your questions about tour details, flexible timings, or crafting custom itineraries.",
    "es": "¡Marhaban! Estamos aquí para responder a vuestras preguntas sobre las visitas, los horarios flexibles y los itinerarios a medida."
  },
  "FloatingWhatsAppButton.text.47": {
    "en": "Quick Questions:",
    "fr": "Quick Questions:",
    "es": "Consultas rápidas:"
  },
  "FloatingWhatsAppButton.text.48": {
    "en": "Type your custom question here...",
    "fr": "Type your custom question here...",
    "es": "Escribid aquí vuestra pregunta..."
  },
  "FloatingWhatsAppButton.text.49": {
    "en": "Start WhatsApp Chat",
    "fr": "Start WhatsApp Chat",
    "es": "Iniciar conversación en WhatsApp"
  },
  "FloatingWhatsAppButton.text.50": {
    "en": "Direct chat with native guides · No middleman · Fast response",
    "fr": "Direct chat with native guides · No middleman · Fast response",
    "es": "Contacto directo con guías locales · Sin intermediarios · Respuesta rápida"
  },
  "FloatingWhatsAppButton.text.52": {
    "en": "Chat on WhatsApp",
    "fr": "Chat on WhatsApp",
    "es": "Chatear por WhatsApp"
  },
  "BookingModal.copy.1": {
    "en": "Reserve Your Experience",
    "fr": "Réserver Votre Expérience",
    "es": "Reservad vuestra experiencia"
  },
  "BookingModal.copy.2": {
    "en": "No upfront payment required. Certified local guide confirmation within 2 hours.",
    "fr": "Aucun paiement immédiat requis. Confirmation par un guide officiel en moins de 2h.",
    "es": "No se requiere pago por adelantado. Confirmación de un guía local oficial en un plazo de 2 horas."
  },
  "BookingModal.copy.3": {
    "en": "Full Name",
    "fr": "Nom Complet",
    "es": "Nombre completo"
  },
  "BookingModal.copy.4": {
    "en": "Email Address",
    "fr": "Adresse Email",
    "es": "Correo electrónico"
  },
  "BookingModal.copy.5": {
    "en": "WhatsApp / Phone (with country code)",
    "fr": "WhatsApp / Téléphone (avec indicatif)",
    "es": "WhatsApp / Teléfono (con prefijo internacional)"
  },
  "BookingModal.copy.6": {
    "en": "Select Tour / Experience",
    "fr": "Choisir la Visite / Excursion",
    "es": "Seleccionad la visita o experiencia"
  },
  "BookingModal.copy.7": {
    "en": "Preferred Date",
    "fr": "Date Souhaitée",
    "es": "Fecha preferida"
  },
  "BookingModal.copy.8": {
    "en": "Number of Guests",
    "fr": "Nombre de Personnes",
    "es": "Número de participantes"
  },
  "BookingModal.copy.9": {
    "en": "Guide Language",
    "fr": "Langue du Guide",
    "es": "Idioma del guía"
  },
  "BookingModal.copy.10": {
    "en": "Special Requests or Hotel/Riad Name",
    "fr": "Demandes Spéciales ou Nom du Riad",
    "es": "Peticiones especiales o nombre del hotel o riad"
  },
  "BookingModal.copy.11": {
    "en": "Confirm Reservation Request",
    "fr": "Confirmer la Demande de Réservation",
    "es": "Confirmar solicitud de reserva"
  },
  "BookingModal.copy.12": {
    "en": "Or Inquire Directly via WhatsApp",
    "fr": "Ou Réservez Directement sur WhatsApp",
    "es": "O consultad directamente por WhatsApp"
  },
  "BookingModal.copy.13": {
    "en": "Booking Request Received!",
    "fr": "Demande de Réservation Reçue !",
    "es": "¡Solicitud de reserva recibida!"
  },
  "BookingModal.copy.14": {
    "en": "Our senior certified guide will contact you via WhatsApp and Email shortly with pickup details.",
    "fr": "Notre guide officiel vous contactera rapidement par WhatsApp et e-mail avec les détails de prise en charge.",
    "es": "Nuestro guía oficial con experiencia os contactará pronto por WhatsApp y correo electrónico con los detalles de la recogida."
  },
  "BookingModal.copy.15": {
    "en": "Booking Reference",
    "fr": "Référence du dossier",
    "es": "Referencia de la reserva"
  },
  "BookingModal.text.1": {
    "en": "Close modal",
    "fr": "Close modal",
    "es": "Cerrar ventana"
  },
  "BookingModal.text.2": {
    "en": "Open in WhatsApp",
    "fr": "Open in WhatsApp",
    "es": "Abrir en WhatsApp"
  },
  "BookingModal.text.3": {
    "en": "English Guide",
    "fr": "English Guide",
    "es": "Guía en inglés"
  },
  "BookingModal.text.4": {
    "en": "Guide Francophone",
    "fr": "Guide Francophone",
    "es": "Guía en francés"
  },
  "BookingModal.text.5": {
    "en": "مرشد باللغة العربية",
    "fr": "مرشد باللغة العربية",
    "es": "Guía en español"
  },
  "BookingModal.text.6": {
    "en": "يرجى إدخال اسمكم الكامل",
    "fr": "يرجى إدخال اسمكم الكامل",
    "es": "Introducid vuestro nombre completo"
  },
  "BookingModal.text.7": {
    "en": "Veuillez saisir votre nom complet",
    "fr": "Veuillez saisir votre nom complet",
    "es": "Introducid vuestro nombre completo"
  },
  "BookingModal.text.8": {
    "en": "يرجى إدخال بريد إلكتروني صحيح",
    "fr": "يرجى إدخال بريد إلكتروني صحيح",
    "es": "Introducid una dirección de correo electrónico válida"
  },
  "BookingModal.text.9": {
    "en": "Veuillez saisir une adresse e-mail valide",
    "fr": "Veuillez saisir une adresse e-mail valide",
    "es": "Introducid una dirección de correo electrónico válida"
  },
  "BookingModal.text.10": {
    "en": "يرجى إدخال رقم هاتف أو واتساب صحيح مع الرمز الدولي",
    "fr": "يرجى إدخال رقم هاتف أو واتساب صحيح مع الرمز الدولي",
    "es": "Introducid un número de teléfono o WhatsApp válido con el prefijo internacional"
  },
  "BookingModal.text.11": {
    "en": "Veuillez saisir un numéro de téléphone/WhatsApp valide avec indicatif",
    "fr": "Veuillez saisir un numéro de téléphone/WhatsApp valide avec indicatif",
    "es": "Introducid un número de teléfono o WhatsApp válido con el prefijo internacional"
  },
  "BookingModal.text.12": {
    "en": "يرجى اختيار التاريخ المفضل للجولة",
    "fr": "يرجى اختيار التاريخ المفضل للجولة",
    "es": "Seleccionad la fecha preferida para la visita"
  },
  "BookingModal.text.13": {
    "en": "Veuillez sélectionner une date",
    "fr": "Veuillez sélectionner une date",
    "es": "Seleccionad una fecha"
  },
  "BookingModal.text.14": {
    "en": "لا يمكن اختيار تاريخ في الماضي. يرجى اختيار تاريخ اليوم أو تاريخ لاحق.",
    "fr": "لا يمكن اختيار تاريخ في الماضي. يرجى اختيار تاريخ اليوم أو تاريخ لاحق.",
    "es": "No se puede elegir una fecha pasada. Seleccionad hoy o una fecha posterior."
  },
  "BookingModal.text.15": {
    "en": "La date ne peut pas être dans le passé. Veuillez choisir aujourd’hui ou une date ultérieure.",
    "fr": "La date ne peut pas être dans le passé. Veuillez choisir aujourd’hui ou une date ultérieure.",
    "es": "La fecha no puede estar en el pasado. Seleccionad hoy o una fecha posterior."
  },
  "BookingModal.text.16": {
    "en": "عدد المشاركين يجب أن يكون بين 1 و 50",
    "fr": "عدد المشاركين يجب أن يكون بين 1 و 50",
    "es": "El número de participantes debe estar entre 1 y 50"
  },
  "BookingModal.text.17": {
    "en": "Le nombre de participants doit être compris entre 1 et 50",
    "fr": "Le nombre de participants doit être compris entre 1 et 50",
    "es": "El número de participantes debe estar entre 1 y 50"
  },
  "BookingModal.text.18": {
    "en": "احجز تجربتك السياحية",
    "fr": "احجز تجربتك السياحية",
    "es": "Reservad vuestra experiencia turística"
  },
  "BookingModal.text.19": {
    "en": "الاسم الكامل",
    "fr": "الاسم الكامل",
    "es": "Nombre completo"
  },
  "BookingModal.text.20": {
    "en": "البريد الإلكتروني",
    "fr": "البريد الإلكتروني",
    "es": "Correo electrónico"
  },
  "BookingModal.text.21": {
    "en": "رقم الواتساب أو الهاتف (مع الرمز الدولي)",
    "fr": "رقم الواتساب أو الهاتف (مع الرمز الدولي)",
    "es": "Número de WhatsApp o teléfono (con prefijo internacional)"
  },
  "BookingModal.text.22": {
    "en": "اختر الجولة أو الرحلة",
    "fr": "اختر الجولة أو الرحلة",
    "es": "Seleccionad la visita o excursión"
  },
  "BookingModal.text.23": {
    "en": "التاريخ المفضل",
    "fr": "التاريخ المفضل",
    "es": "Fecha preferida"
  },
  "BookingModal.text.24": {
    "en": "عدد المشاركين",
    "fr": "عدد المشاركين",
    "es": "Número de participantes"
  },
  "BookingModal.text.25": {
    "en": "لغة المرشد المفضلة",
    "fr": "لغة المرشد المفضلة",
    "es": "Idioma preferido del guía"
  },
  "BookingModal.text.26": {
    "en": "ملاحظات خاصة أو اسم الفندق/الرياض",
    "fr": "ملاحظات خاصة أو اسم الفندق/الرياض",
    "es": "Peticiones especiales o nombre del hotel o riad"
  },
  "BookingModal.text.27": {
    "en": "تأكيد طلب الحجز",
    "fr": "تأكيد طلب الحجز",
    "es": "Confirmar solicitud de reserva"
  },
  "BookingModal.text.28": {
    "en": "أو تواصل فوراً عبر تطبيق واتساب",
    "fr": "أو تواصل فوراً عبر تطبيق واتساب",
    "es": "O contactad directamente por WhatsApp"
  },
  "BookingModal.text.29": {
    "en": "تم استلام طلب حجزك بنجاح!",
    "fr": "تم استلام طلب حجزك بنجاح!",
    "es": "¡Hemos recibido vuestra solicitud de reserva!"
  },
  "BookingModal.text.30": {
    "en": "رقم مرجع الحجز",
    "fr": "رقم مرجع الحجز",
    "es": "Referencia de la reserva"
  },
  "Navbar.text.1": {
    "en": "Change language",
    "fr": "Change language",
    "es": "Cambiar idioma"
  },
  "Navbar.text.2": {
    "en": "Open Admin CMS",
    "fr": "Open Admin CMS",
    "es": "Abrir la administración del CMS"
  },
  "Navbar.text.3": {
    "en": "Toggle navigation menu",
    "fr": "Toggle navigation menu",
    "es": "Abrir o cerrar el menú de navegación"
  },
  "Navbar.text.5": {
    "en": "المدونة",
    "fr": "المدونة",
    "es": "Blog"
  },
  "Navbar.text.6": {
    "en": "Blog",
    "fr": "Blog",
    "es": "Blog"
  },
  "Navbar.text.8": {
    "en": "السلام عليكم ورحمة الله، أود الاستفسار عن جولاتكم السياحية في فاس.",
    "fr": "السلام عليكم ورحمة الله، أود الاستفسار عن جولاتكم السياحية في فاس.",
    "es": "¡Hola! Me gustaría consultar vuestras visitas por Fez."
  },
  "Navbar.text.9": {
    "en": "Bonjour FezGuideTours ! J’aimerais me renseigner sur vos visites à Fès.",
    "fr": "Bonjour FezGuideTours ! J’aimerais me renseigner sur vos visites à Fès.",
    "es": "¡Hola, FezGuideTours! Me gustaría recibir información sobre vuestras visitas por Fez."
  },
  "Navbar.text.11": {
    "en": "عربي",
    "fr": "عربي",
    "es": "Español"
  },
  "Footer.label.1": {
    "en": "Blog & Travel Stories",
    "fr": "Blog & Travel Stories",
    "es": "Blog y relatos de viaje"
  },
  "Footer.text.1": {
    "en": "Powered By Atlas Tactics",
    "fr": "Powered By Atlas Tactics",
    "es": "Desarrollado por Atlas Tactics"
  },
  "Footer.text.3": {
    "en": "Ministry of Tourism Licensed Guides Collective",
    "fr": "Ministry of Tourism Licensed Guides Collective",
    "es": "Colectivo de guías autorizados por el Ministerio de Turismo"
  },
  "Footer.text.4": {
    "en": "Powered By",
    "fr": "Powered By",
    "es": "Con la tecnología de"
  },
  "Footer.text.5": {
    "en": "Atlas Tactics",
    "fr": "Atlas Tactics",
    "es": "Atlas Tactics"
  },
  "Footer.text.6": {
    "en": "Made with passion in Fez el-Bali",
    "fr": "Made with passion in Fez el-Bali",
    "es": "Hecho con pasión en Fez el-Bali"
  },
  "Footer.text.7": {
    "en": "Morocco",
    "fr": "Morocco",
    "es": "Marruecos"
  },
  "Footer.text.8": {
    "en": "Admin CMS",
    "fr": "Admin CMS",
    "es": "Administración del CMS"
  },
  "Footer.text.9": {
    "en": "المدونة والمقالات",
    "fr": "المدونة والمقالات",
    "es": "Blog y artículos"
  },
  "Footer.text.11": {
    "en": "Blog & Travel Stories",
    "fr": "Blog & Travel Stories",
    "es": "Blog y relatos de viaje"
  },
  "ExperienceDetailPage.label.1": {
    "en": "Home",
    "fr": "Accueil",
    "es": "Inicio"
  },
  "ExperienceDetailPage.label.2": {
    "en": "Back to list",
    "fr": "Retour",
    "es": "Volver a la lista"
  },
  "ExperienceDetailPage.label.3": {
    "en": "Duration",
    "fr": "Durée",
    "es": "Duración"
  },
  "ExperienceDetailPage.label.4": {
    "en": "Format",
    "fr": "Format",
    "es": "Modalidad"
  },
  "ExperienceDetailPage.label.5": {
    "en": "Meeting / Pickup",
    "fr": "Départ",
    "es": "Encuentro / Recogida"
  },
  "ExperienceDetailPage.label.6": {
    "en": "Languages",
    "fr": "Langues",
    "es": "Idiomas"
  },
  "ExperienceDetailPage.label.7": {
    "en": "Experience Overview",
    "fr": "Présentation",
    "es": "Descripción de la experiencia"
  },
  "ExperienceDetailPage.label.8": {
    "en": "The Living Story Behind the Experience",
    "fr": "L’histoire et l’immersion locale",
    "es": "La historia viva detrás de la experiencia"
  },
  "ExperienceDetailPage.label.9": {
    "en": "Highlights of This Experience:",
    "fr": "Points forts de la visite :",
    "es": "Lo más destacado de esta experiencia:"
  },
  "ExperienceDetailPage.label.10": {
    "en": "Experience Itinerary",
    "fr": "Programme Détaillé",
    "es": "Itinerario de la experiencia"
  },
  "ExperienceDetailPage.label.11": {
    "en": "Step-by-Step Experience & Stops",
    "fr": "Étape par étape : Ce que vous allez vivre",
    "es": "La experiencia y sus paradas, paso a paso"
  },
  "ExperienceDetailPage.label.12": {
    "en": "What is Included & Excluded",
    "fr": "Inclusions & Exclusions",
    "es": "Qué está incluido y qué no"
  },
  "ExperienceDetailPage.label.13": {
    "en": "Included in Tour:",
    "fr": "Inclus :",
    "es": "Incluido en la visita:"
  },
  "ExperienceDetailPage.label.14": {
    "en": "Not Included:",
    "fr": "Non inclus :",
    "es": "No incluido:"
  },
  "ExperienceDetailPage.label.15": {
    "en": "Practical Tips & What to Bring",
    "fr": "Conseils pratiques & Ce qu’il faut apporter",
    "es": "Consejos prácticos y qué llevar"
  },
  "ExperienceDetailPage.label.16": {
    "en": "Verified Reviews",
    "fr": "Avis Vérifiés",
    "es": "Opiniones verificadas"
  },
  "ExperienceDetailPage.label.17": {
    "en": "What Travelers Say",
    "fr": "Ce que nos voyageurs en disent",
    "es": "Qué dicen los viajeros"
  },
  "ExperienceDetailPage.label.18": {
    "en": "All-Inclusive Rate",
    "fr": "Tarif Global",
    "es": "Tarifa todo incluido"
  },
  "ExperienceDetailPage.label.20": {
    "en": "Book This Experience",
    "fr": "Réserver cette Visite",
    "es": "Reservar esta experiencia"
  },
  "ExperienceDetailPage.label.21": {
    "en": "Inquire on WhatsApp",
    "fr": "Question via WhatsApp",
    "es": "Consultar por WhatsApp"
  },
  "ExperienceDetailPage.label.26": {
    "en": "More Experiences",
    "fr": "Vous Aimerez Aussi",
    "es": "Más experiencias"
  },
  "ExperienceDetailPage.label.27": {
    "en": "You Might Also Like",
    "fr": "Complétez votre séjour à Fès",
    "es": "También os puede interesar"
  },
  "ExperienceDetailPage.label.28": {
    "en": "View all",
    "fr": "Voir tout",
    "es": "Ver todo"
  },
  "ExperienceDetailPage.label.29": {
    "en": "View Details",
    "fr": "Voir détails",
    "es": "Ver detalles"
  },
  "ExperienceDetailPage.label.31": {
    "en": "Book This Experience",
    "fr": "Réserver cette Visite",
    "es": "Reservar esta experiencia"
  },
  "ExperienceDetailPage.label.32": {
    "en": "Inquire on WhatsApp",
    "fr": "Question via WhatsApp",
    "es": "Consultar por WhatsApp"
  },
  "ExperienceDetailPage.text.1": {
    "en": "Breadcrumb",
    "fr": "Breadcrumb",
    "es": "Ruta de navegación"
  },
  "ExperienceDetailPage.text.2": {
    "en": "Thumbnail",
    "fr": "Thumbnail",
    "es": "Miniatura"
  },
  "ExperienceDetailPage.text.3": {
    "en": "جولات فاس",
    "fr": "جولات فاس",
    "es": "Visitas por Fez"
  },
  "ExperienceDetailPage.text.4": {
    "en": "Visites de Fès",
    "fr": "Visites de Fès",
    "es": "Visitas por Fez"
  },
  "ExperienceDetailPage.text.5": {
    "en": "رحلات يومية",
    "fr": "رحلات يومية",
    "es": "Excursiones de un día"
  },
  "ExperienceDetailPage.text.6": {
    "en": "Excursions",
    "fr": "Excursions",
    "es": "Excursiones"
  },
  "ExperienceDetailPage.text.7": {
    "en": "جولات الأكل",
    "fr": "جولات الأكل",
    "es": "Rutas gastronómicas"
  },
  "ExperienceDetailPage.text.8": {
    "en": "Tours Culinaires",
    "fr": "Tours Culinaires",
    "es": "Rutas gastronómicas"
  },
  "ExperienceDetailPage.text.9": {
    "en": "نصائح السفر",
    "fr": "نصائح السفر",
    "es": "Consejos de viaje"
  },
  "ExperienceDetailPage.text.10": {
    "en": "Conseils Voyage",
    "fr": "Conseils Voyage",
    "es": "Consejos de viaje"
  },
  "ExperienceDetailPage.text.11": {
    "en": "الرئيسية",
    "fr": "الرئيسية",
    "es": "Inicio"
  },
  "ExperienceDetailPage.text.12": {
    "en": "Accueil",
    "fr": "Accueil",
    "es": "Inicio"
  },
  "ExperienceDetailPage.text.13": {
    "en": "العودة للقائمة",
    "fr": "العودة للقائمة",
    "es": "Volver a la lista"
  },
  "ExperienceDetailPage.text.14": {
    "en": "Retour",
    "fr": "Retour",
    "es": "Volver"
  },
  "ExperienceDetailPage.text.15": {
    "en": "المدة الزمنية",
    "fr": "المدة الزمنية",
    "es": "Duración"
  },
  "ExperienceDetailPage.text.16": {
    "en": "Durée",
    "fr": "Durée",
    "es": "Duración"
  },
  "ExperienceDetailPage.text.17": {
    "en": "نوع التجربة",
    "fr": "نوع التجربة",
    "es": "Tipo de experiencia"
  },
  "ExperienceDetailPage.text.18": {
    "en": "Format",
    "fr": "Format",
    "es": "Modalidad"
  },
  "ExperienceDetailPage.text.19": {
    "en": "نقطة الانطلاق",
    "fr": "نقطة الانطلاق",
    "es": "Punto de salida"
  },
  "ExperienceDetailPage.text.20": {
    "en": "Départ",
    "fr": "Départ",
    "es": "Salida"
  },
  "ExperienceDetailPage.text.21": {
    "en": "اللغات المتاحة",
    "fr": "اللغات المتاحة",
    "es": "Idiomas disponibles"
  },
  "ExperienceDetailPage.text.22": {
    "en": "Langues",
    "fr": "Langues",
    "es": "Idiomas"
  },
  "ExperienceDetailPage.text.23": {
    "en": "عن هذه التجربة",
    "fr": "عن هذه التجربة",
    "es": "Sobre esta experiencia"
  },
  "ExperienceDetailPage.text.24": {
    "en": "Présentation",
    "fr": "Présentation",
    "es": "Presentación"
  },
  "ExperienceDetailPage.text.25": {
    "en": "القصة الكاملة والتفاصيل الحقيقية",
    "fr": "القصة الكاملة والتفاصيل الحقيقية",
    "es": "La historia completa y los detalles reales"
  },
  "ExperienceDetailPage.text.26": {
    "en": "L’histoire et l’immersion locale",
    "fr": "L’histoire et l’immersion locale",
    "es": "Historia e inmersión local"
  },
  "ExperienceDetailPage.text.27": {
    "en": "أبرز ما ستكتشفه في هذه الجولة:",
    "fr": "أبرز ما ستكتشفه في هذه الجولة:",
    "es": "Lo más destacado de esta visita:"
  },
  "ExperienceDetailPage.text.28": {
    "en": "Points forts de la visite :",
    "fr": "Points forts de la visite :",
    "es": "Lo más destacado de la visita:"
  },
  "ExperienceDetailPage.text.29": {
    "en": "مسار الجولة ومحطاتها",
    "fr": "مسار الجولة ومحطاتها",
    "es": "Ruta y paradas de la visita"
  },
  "ExperienceDetailPage.text.30": {
    "en": "Programme Détaillé",
    "fr": "Programme Détaillé",
    "es": "Programa detallado"
  },
  "ExperienceDetailPage.text.31": {
    "en": "خطوة بخطوة: ماذا ستعيش وتكتشف؟",
    "fr": "خطوة بخطوة: ماذا ستعيش وتكتشف؟",
    "es": "Paso a paso: ¿qué vais a vivir y descubrir?"
  },
  "ExperienceDetailPage.text.32": {
    "en": "Étape par étape : Ce que vous allez vivre",
    "fr": "Étape par étape : Ce que vous allez vivre",
    "es": "Paso a paso: lo que vais a vivir"
  },
  "ExperienceDetailPage.text.33": {
    "en": "ما تشمله التجربة وما لا تشمله",
    "fr": "ما تشمله التجربة وما لا تشمله",
    "es": "Qué incluye la experiencia y qué no"
  },
  "ExperienceDetailPage.text.34": {
    "en": "Inclusions & Exclusions",
    "fr": "Inclusions & Exclusions",
    "es": "Inclusiones y exclusiones"
  },
  "ExperienceDetailPage.text.35": {
    "en": "مشمول في الحجز:",
    "fr": "مشمول في الحجز:",
    "es": "Incluido en la reserva:"
  },
  "ExperienceDetailPage.text.36": {
    "en": "Inclus :",
    "fr": "Inclus :",
    "es": "Incluido:"
  },
  "ExperienceDetailPage.text.37": {
    "en": "غير مشمول:",
    "fr": "غير مشمول:",
    "es": "No incluido:"
  },
  "ExperienceDetailPage.text.38": {
    "en": "Non inclus :",
    "fr": "Non inclus :",
    "es": "No incluido:"
  },
  "ExperienceDetailPage.text.39": {
    "en": "نصائح عملية وما يجب إحضاره",
    "fr": "نصائح عملية وما يجب إحضاره",
    "es": "Consejos prácticos y qué llevar"
  },
  "ExperienceDetailPage.text.40": {
    "en": "Conseils pratiques & Ce qu’il faut apporter",
    "fr": "Conseils pratiques & Ce qu’il faut apporter",
    "es": "Consejos prácticos y qué llevar"
  },
  "ExperienceDetailPage.text.41": {
    "en": "تجارب الزوار",
    "fr": "تجارب الزوار",
    "es": "Experiencias de los visitantes"
  },
  "ExperienceDetailPage.text.42": {
    "en": "Avis Vérifiés",
    "fr": "Avis Vérifiés",
    "es": "Opiniones verificadas"
  },
  "ExperienceDetailPage.text.43": {
    "en": "ماذا يقول المسافرون عن هذه الجولة؟",
    "fr": "ماذا يقول المسافرون عن هذه الجولة؟",
    "es": "¿Qué dicen los viajeros sobre esta visita?"
  },
  "ExperienceDetailPage.text.44": {
    "en": "Ce que nos voyageurs en disent",
    "fr": "Ce que nos voyageurs en disent",
    "es": "Qué dicen nuestros viajeros"
  },
  "ExperienceDetailPage.text.45": {
    "en": "السعر الشامل",
    "fr": "السعر الشامل",
    "es": "Precio todo incluido"
  },
  "ExperienceDetailPage.text.46": {
    "en": "Tarif Global",
    "fr": "Tarif Global",
    "es": "Tarifa global"
  },
  "ExperienceDetailPage.text.49": {
    "en": "احجز هذه الجولة الآن",
    "fr": "احجز هذه الجولة الآن",
    "es": "Reservad esta visita ahora"
  },
  "ExperienceDetailPage.text.50": {
    "en": "Réserver cette Visite",
    "fr": "Réserver cette Visite",
    "es": "Reservar esta visita"
  },
  "ExperienceDetailPage.text.51": {
    "en": "استفسر فوراً على واتساب",
    "fr": "استفسر فوراً على واتساب",
    "es": "Consultar ahora por WhatsApp"
  },
  "ExperienceDetailPage.text.52": {
    "en": "Question via WhatsApp",
    "fr": "Question via WhatsApp",
    "es": "Consulta por WhatsApp"
  },
  "ExperienceDetailPage.text.61": {
    "en": "تجارب أخرى مميزة",
    "fr": "تجارب أخرى مميزة",
    "es": "Más experiencias especiales"
  },
  "ExperienceDetailPage.text.62": {
    "en": "Vous Aimerez Aussi",
    "fr": "Vous Aimerez Aussi",
    "es": "También os puede interesar"
  },
  "ExperienceDetailPage.text.63": {
    "en": "اكتشف المزيد من جولات فاس",
    "fr": "اكتشف المزيد من جولات فاس",
    "es": "Descubrid más visitas por Fez"
  },
  "ExperienceDetailPage.text.64": {
    "en": "Complétez votre séjour à Fès",
    "fr": "Complétez votre séjour à Fès",
    "es": "Completad vuestra estancia en Fez"
  },
  "ExperienceDetailPage.text.65": {
    "en": "عرض الكل",
    "fr": "عرض الكل",
    "es": "Ver todo"
  },
  "ExperienceDetailPage.text.66": {
    "en": "Voir tout",
    "fr": "Voir tout",
    "es": "Ver todo"
  },
  "ExperienceDetailPage.text.67": {
    "en": "عرض التفاصيل",
    "fr": "عرض التفاصيل",
    "es": "Ver detalles"
  },
  "ExperienceDetailPage.text.68": {
    "en": "Voir détails",
    "fr": "Voir détails",
    "es": "Ver detalles"
  },
  "ExperienceDetailPage.text.70": {
    "en": "احجز هذه التجربة الآن",
    "fr": "احجز هذه التجربة الآن",
    "es": "Reservad esta experiencia ahora"
  },
  "ExperienceDetailPage.text.72": {
    "en": "Home",
    "fr": "Home",
    "es": "Inicio"
  },
  "ExperienceDetailPage.text.73": {
    "en": "Back to list",
    "fr": "Back to list",
    "es": "Volver a la lista"
  },
  "ExperienceDetailPage.text.76": {
    "en": "Duration",
    "fr": "Duration",
    "es": "Duración"
  },
  "ExperienceDetailPage.text.77": {
    "en": "Meeting / Pickup",
    "fr": "Meeting / Pickup",
    "es": "Encuentro / Recogida"
  },
  "ExperienceDetailPage.text.78": {
    "en": "Languages",
    "fr": "Languages",
    "es": "Idiomas"
  },
  "ExperienceDetailPage.text.79": {
    "en": "Experience Overview",
    "fr": "Experience Overview",
    "es": "Descripción de la experiencia"
  },
  "ExperienceDetailPage.text.80": {
    "en": "The Living Story Behind the Experience",
    "fr": "The Living Story Behind the Experience",
    "es": "La historia viva detrás de la experiencia"
  },
  "ExperienceDetailPage.text.81": {
    "en": "Highlights of This Experience:",
    "fr": "Highlights of This Experience:",
    "es": "Lo más destacado de esta experiencia:"
  },
  "ExperienceDetailPage.text.82": {
    "en": "Experience Itinerary",
    "fr": "Experience Itinerary",
    "es": "Itinerario de la experiencia"
  },
  "ExperienceDetailPage.text.83": {
    "en": "Step-by-Step Experience & Stops",
    "fr": "Step-by-Step Experience & Stops",
    "es": "La experiencia y sus paradas, paso a paso"
  },
  "ExperienceDetailPage.text.84": {
    "en": "What is Included & Excluded",
    "fr": "What is Included & Excluded",
    "es": "Qué está incluido y qué no"
  },
  "ExperienceDetailPage.text.85": {
    "en": "Included in Tour:",
    "fr": "Included in Tour:",
    "es": "Incluido en la visita:"
  },
  "ExperienceDetailPage.text.86": {
    "en": "Not Included:",
    "fr": "Not Included:",
    "es": "No incluido:"
  },
  "ExperienceDetailPage.text.87": {
    "en": "Practical Tips & What to Bring",
    "fr": "Practical Tips & What to Bring",
    "es": "Consejos prácticos y qué llevar"
  },
  "ExperienceDetailPage.text.88": {
    "en": "Verified Reviews",
    "fr": "Verified Reviews",
    "es": "Opiniones verificadas"
  },
  "ExperienceDetailPage.text.89": {
    "en": "What Travelers Say",
    "fr": "What Travelers Say",
    "es": "Qué dicen los viajeros"
  },
  "ExperienceDetailPage.text.90": {
    "en": "All-Inclusive Rate",
    "fr": "All-Inclusive Rate",
    "es": "Tarifa todo incluido"
  },
  "ExperienceDetailPage.text.92": {
    "en": "Book This Experience",
    "fr": "Book This Experience",
    "es": "Reservar esta experiencia"
  },
  "ExperienceDetailPage.text.93": {
    "en": "Inquire on WhatsApp",
    "fr": "Inquire on WhatsApp",
    "es": "Consultar por WhatsApp"
  },
  "ExperienceDetailPage.text.98": {
    "en": "More Experiences",
    "fr": "More Experiences",
    "es": "Más experiencias"
  },
  "ExperienceDetailPage.text.99": {
    "en": "You Might Also Like",
    "fr": "You Might Also Like",
    "es": "También os puede interesar"
  },
  "ExperienceDetailPage.text.100": {
    "en": "View all",
    "fr": "View all",
    "es": "Ver todo"
  },
  "ExperienceDetailPage.text.101": {
    "en": "View Details",
    "fr": "View Details",
    "es": "Ver detalles"
  }
};

// Media-library labels are descriptive copy, not locale-neutral filenames.
const MEDIA_LIBRARY_SPANISH: Record<string, string> = {
  'Fez Medina Panoramic Skyline': 'Panorámica del perfil de la medina de Fez',
  'Chouara Tannery Dye Vats': 'Cubas de teñido de la curtiduría Chouara',
  'Chefchaouen Blue Pearl Medina': 'Medina de Chefchaouen, la perla azul',
  'Volubilis Roman Mosaic Ruins': 'Ruinas y mosaicos romanos de Volubilis',
  'Moroccan Medina Street Tasting': 'Degustación de comida callejera en una medina marroquí',
  'Bab Boujloud Blue Gate Exterior': 'Exterior de Bab Boujloud, la Puerta Azul',
  'Al-Qarawiyyin Courtyard & Tiles': 'Patio y azulejos de Al-Qarawiyyin',
  'Bou Inania Medersa Woodwork': 'Carpintería de la madrasa Bou Inania',
  'Chouara Tannery Traditional Leather': 'Cuero tradicional de la curtiduría Chouara',
  'Attarine Souk Spice Pyramids': 'Pirámides de especias en el zoco Attarine',
  'Nejjarine Museum of Wooden Arts': 'Museo Nejjarine de las Artes de la Madera',
  'Seffarine Copper Brass Artisan Square': 'Plaza Seffarine de los artesanos del cobre y el latón',
  'Fez Medina Labyrinth Alleys': 'Callejones laberínticos de la medina de Fez',
  'Marinid Tombs Panoramic Sunset View': 'Vista panorámica al atardecer desde las tumbas meriníes',
  'Fassi Mosaic Zellige Tile Master': 'Maestro de mosaicos zellige de Fez',
  'Royal Palace Seven Golden Brass Gates': 'Las siete puertas doradas de latón del Palacio Real',
  'Mellah Historic Jewish Quarter': 'El Mellah, histórico barrio judío',
  'Medina Communal Bakery & Wood Oven': 'Panadería comunitaria y horno de leña de la medina',
  'Al-Attarine Medersa Ornate Archways': 'Arcos ornamentados de la madrasa Al-Attarine',
  'Medina Bread & Craft Alley Walk': 'Paseo por los callejones del pan y la artesanía en la medina',
  'Souk Attarine Perfumes & Herbs': 'Perfumes y hierbas del zoco Attarine',
  'Ancient Fez Heritage & Architecture': 'Patrimonio y arquitectura de la Fez antigua',
  'Islamic Geometric Zellige Masterpiece': 'Obra maestra de zellige con geometría islámica',
  'Historic Medina Cedar Lattice Windows': 'Ventanas históricas de celosía de cedro en la medina',
  'Ancient Fez Library Archives': 'Archivos de una antigua biblioteca de Fez',
  'Courtyard Fountain in Traditional Riad': 'Fuente del patio de un riad tradicional',
  'Spiritual Sufi Zawiya Sanctuary': 'Santuario espiritual de una zauía sufí',
  'Medina Shopping in Souk Talaa': 'Compras en el zoco Talaa de la medina',
  'Traditional Hammam Steam Ritual': 'Ritual de vapor en un hammam tradicional',
  'Pottery & Ceramics Workshop Kilns': 'Hornos de un taller de alfarería y cerámica',
  'Carpet Weaving Cooperative Loom': 'Telar de una cooperativa de alfombras',
  'Leather Goods & Slippers Babouche': 'Artículos de cuero y babuchas',
  'Fez Botanical Garden Jnan Sbil': 'Jardín botánico Jnan Sbil de Fez',
  'Borj Nord Arms Museum Fortress': 'Fortaleza y Museo de Armas de Borj Nord',
  'Rooftop Mint Tea Ceremony View': 'Ceremonia del té a la menta con vistas desde una azotea',
  'Chefchaouen Blue Medina Stairway': 'Escalera de la medina azul de Chefchaouen',
  'Volubilis Triumphal Arch of Caracalla': 'Arco de triunfo de Caracalla en Volubilis',
  'Moulay Idriss Zerhoun Hilltop Town': 'Moulay Idriss Zerhoun, ciudad sobre una colina',
  'Bab El-Mansour Grand Imperial Gate': 'Bab El-Mansour, gran puerta imperial',
  'Heri es-Souani Royal Granaries': 'Graneros reales de Heri es-Souani',
  'Meknes Imperial Basin Agdal': 'Estanque imperial de Agdal en Meknes',
  'Ifrane Mountain Chalet Architecture': 'Arquitectura de chalés de montaña en Ifrane',
  'Middle Atlas Cedar Forest & Macaques': 'Bosque de cedros y macacos del Atlas Medio',
  'Azrou Barbary Cedar Tree Trail': 'Sendero de cedros y macacos de Berbería en Azrou',
  'Private Luxury Day Trip Vehicle': 'Vehículo privado de lujo para una excursión de un día',
  'Fresh Medina Street Pastilla & Briouats': 'Pastela y briouats recién hechos en las calles de la medina',
  'Royal Fassi Lamb Tagine with Prunes': 'Tayín real de cordero de Fez con ciruelas pasas',
  'Medina Olive Barrels & Preserved Lemons': 'Barriles de aceitunas y limones en conserva en la medina',
  'Traditional Mint Tea Pouring Art': 'El arte tradicional de servir el té a la menta',
  'Seven Vegetable Couscous Friday Dish': 'Cuscús de siete verduras, plato del viernes',
  'Moroccan Mezze Salad Spread': 'Surtido de ensaladas y entrantes marroquíes',
  'Warm Harcha, Msemen & Honey': 'Harcha y msemen templados con miel',
  'Ras El Hanout & Pure Saffron Threads': 'Ras el hanout y hebras de azafrán puro',
  'Clay Pot Tagine Simmering on Charcoal': 'Tayín de barro cocinándose lentamente sobre carbón',
  'Fassi Couscous with Caramelized Onions': 'Cuscús de Fez con cebolla caramelizada',
  'Medina Street Tagine Tasting Walk': 'Ruta de degustación de tayines por las calles de la medina',
  'Grand Fassi Feast Dinner Table': 'Mesa de un gran banquete de Fez',
  'Mohammed Benali - Senior Historian Guide': 'Mohammed Benali, guía historiador con amplia experiencia',
  'Fatima Zahra - Heritage & Architecture Guide': 'Fatima Zahra, guía de patrimonio y arquitectura',
  'Youssef El Fassi - Medina & Souks Guide': 'Youssef El Fassi, guía de la medina y los zocos',
  'Amina Mansouri - Culinary Expert & Food Guide': 'Amina Mansouri, experta culinaria y guía gastronómica',
  'Guide with Travelers at Bab Boujloud': 'Guía con viajeros en Bab Boujloud',
  'Guide Explaining Zellige Tiles Craft': 'Guía explicando la artesanía de los azulejos zellige',
  'Private Medina Walking Group with Guide': 'Grupo privado recorriendo la medina a pie con un guía',
  'Official Guides Association Briefing': 'Reunión informativa de la asociación de guías oficiales',
  'Licensed Guide Welcoming Guests at Riad': 'Guía oficial dando la bienvenida a los visitantes en un riad',
  'Chefchaouen Guided Walk Portrait': 'Retrato durante una visita guiada a pie por Chefchaouen',
  'Medina Walking Tips & Navigation': 'Consejos para caminar y orientarse por la medina',
  'Best Seasons & Weather for Fez': 'Mejores épocas y clima para visitar Fez',
  'Petit Taxi & Airport Transfers Fez': 'Pequeños taxis y traslados al aeropuerto de Fez',
};

const SOURCE_PHOTOS = [
  "/images/about/drivers-01.webp",
  "/images/about/drivers-02.webp",
  "/images/about/drivers-03.webp",
  "/images/about/drivers-04.webp",
  "/images/about/drivers-05.webp",
  "/images/about/guides-01.webp",
  "/images/about/guides-02.webp",
  "/images/about/guides-03.webp",
  "/images/about/guides-04.webp",
  "/images/about/med.webp",
  "/images/daytrip-chefchaouen/blue-alley.webp",
  "/images/daytrip-ifrane/mountain-countryside.webp",
  "/images/daytrip-meknes/bab-mansour.webp",
  "/images/fez-history/history-01.jpg",
  "/images/fez-medina/medina-01.jpg",
  "/images/fez-medina/medina-02.jpg",
  "/images/fez-medina/medina-03.jpg",
  "/images/fez-medina/medina-04.jpg",
  "/images/fez-medina/medina-05.jpg",
  "/images/fez-medina/medina-06.jpg",
  "/images/fez-medina/medina-07.jpg",
  "/images/fez-medina/medina-08.jpg",
  "/images/fez-medina/medina-09.jpg",
  "/images/fez-medina/medina-10.jpg",
  "/images/fez-medina/medina-11.jpg",
  "/images/fez-medina/medina-12.jpg",
  "/images/fez-medina/medina-13.jpg",
  "/images/fez-medina/medina-14.jpg",
  "/images/food-culture-life/tea-tray.webp",
  "/images/food-markets-souks/spice-tins.webp",
  "/images/food-tasting-walk/pastries-tea.webp",
  "/images/food-tasting-walk/wood-oven.webp",
  "/images/food-traditional-fassi/pastilla.webp",
  "/images/our-fez-tours/01.webp",
  "/images/our-fez-tours/02.webp",
  "/images/our-fez-tours/03.webp",
  "/images/our-fez-tours/04.webp",
  "/images/our-fez-tours/05.webp",
  "/images/our-fez-tours/06.webp",
  "/images/our-fez-tours/07.webp",
  "/images/our-fez-tours/08.webp",
  "/images/real/about_us_image1.jpg",
  "/images/real/fez_explore_medina_image1.jpg",
  "/images/real/fez_explore_medina_image2.jpg",
  "/images/real/fez_explore_medina_image4.jpg",
  "/images/real/fez_history_culture_image1.jpg",
  "/images/real/fez_history_culture_image2.jpg",
  "/images/real/fez_things_to_do_image2.jpg",
  "/images/real/tips_getting_around_image1.jpg",
  "/images/tips-getting-around/bab-boujloud-night.webp",
  "/images/tips-getting-around/city-gate.webp",
  "/images/tips-getting-around/hexagonal-sign.webp",
  "/images/tips-plan-trip/medina-view.webp",
  "/images/tips-practical/spice-shop.webp"
];
