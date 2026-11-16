// Rebuilds the full-size archive that every revision stored before slimming, so tests can prove that
// old documents keep validating, projecting and rendering exactly as before.
const PILLAR_KEYS = ['id', 'pageId', 'title', 'subtitle', 'shortDescription', 'fullDescription', 'highlights', 'practicalInfo', 'image', 'imageAlt',
  'actionType', 'published', 'galleryImages', 'itinerary', 'included', 'excluded', 'whatToBring', 'meetingPointDetails'];

export function withFullLegacy(document) {
  const value = structuredClone(document);
  value.legacy = {
    tours: value.legacy.tours.map(tour => {
      if ('title' in tour) return tour;
      const product = value.products.find(item => item.id === tour.id);
      return { ...Object.fromEntries(PILLAR_KEYS.filter(key => product[key] !== undefined).map(key => [key, structuredClone(product[key])])), ...tour };
    }),
    customPages: value.legacy.customPages,
    blogPosts: value.legacy.blogPosts ?? structuredClone(value.blogPosts),
    teamMembers: value.legacy.teamMembers ?? structuredClone(value.teamMembers),
    faqs: value.legacy.faqs ?? structuredClone(value.faqs),
    siteSettings: value.legacy.siteSettings ?? structuredClone(value.siteSettings),
  };
  return value;
}
