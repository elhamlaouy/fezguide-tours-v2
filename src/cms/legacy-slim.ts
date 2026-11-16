import type { SectionPillar } from '../types';
import type { CmsDocument, CmsLegacy, SlimLegacyTour } from './schema';

const hidden = (value: { published?: boolean }) => (value as { enabled?: boolean }).enabled === false || value.published === false;

function slimTour(tour: SectionPillar): SlimLegacyTour {
  return { id: tour.id, pageId: tour.pageId, actionType: 'book_tour', ...(tour.kind === 'product' ? { kind: 'product' as const } : {}), ...(tour.published !== undefined ? { published: tour.published } : {}) };
}

/**
 * Removes archive data that nothing reads. Readers of `legacy` (approved-data, editor-controls,
 * worker/seo, worker/cms-routes) need: tour ids/order, tour pageId/classification/hidden flag, the full
 * editorial tour cards (fallback and pass-through fields) and custom pages. Everything else is dropped:
 * - bookable tours are always canonical products (schema-enforced) and are never read beyond the above;
 * - teamMembers / faqs have no visibility flag and canonical copies drive every renderer;
 * - siteSettings is never read from the archive when a published document exists;
 * - blogPosts are dropped unless a copy is hidden (a hidden copy hides the page in the public projection).
 * Pure and idempotent; the result still validates and every public projection is unchanged.
 */
export function slimLegacy(document: CmsDocument): CmsLegacy {
  const { legacy, products } = document;
  const productIds = new Set(products.map(product => product.id));
  const result: CmsLegacy = {
    tours: legacy.tours.map(tour => 'title' in tour && tour.actionType === 'book_tour' && productIds.has(tour.id) ? slimTour(tour) : tour),
    customPages: legacy.customPages,
  };
  if (legacy.blogPosts?.some(hidden)) result.blogPosts = legacy.blogPosts;
  return result;
}

/** The editor's save form of a document: identical content, minimal archive. */
export function slimCmsDocument(document: CmsDocument): CmsDocument {
  const legacy = slimLegacy(document);
  return JSON.stringify(legacy) === JSON.stringify(document.legacy) ? document : { ...document, legacy };
}
