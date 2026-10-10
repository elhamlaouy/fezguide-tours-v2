export const PAGE_TEMPLATES = {
  'editorial-guide': {
    label: 'Editorial guide',
    use: 'Crumb, story sections, photos from the source, a button to one product page, then Tripadvisor.',
  },
  'product-experience': {
    label: 'Product page',
    use: 'The shared bookable page: gallery, facts, price, itinerary, and booking.',
  },
} as const;

export type PageTemplateId = keyof typeof PAGE_TEMPLATES;
