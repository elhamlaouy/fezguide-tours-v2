import type { CmsPart } from '../src/cms/schema';

type PublicRecord = Record<string, unknown>;
const records = (value: unknown): PublicRecord[] => Array.isArray(value) ? value : [];
const hidden = (value: PublicRecord) => value.enabled === false || value.published === false;

export interface PublicProjectionContext {
  pageIds: Set<unknown>;
  productIds: Set<unknown>;
  reviewIds: Set<unknown>;
  mediaSources: Map<unknown, unknown>;
}

/** Trusted metadata only: all visibility flags/IDs/relations in canonical and legacy copies, plus media id/src. */
export function createPublicProjectionContext(summaryDocument: object): PublicProjectionContext {
  const result = summaryDocument as PublicRecord;
  const legacy = (result.legacy ?? {}) as PublicRecord;
  const pages = records(result.pages);
  const products = records(result.products);
  const copies = [...records(result.blogPosts), ...records(legacy.blogPosts), ...records(legacy.customPages), ...records(legacy.tours)];
  // A hidden entity remains hidden in every copy, even when its other flags disagree.
  // Products' pageId is often a category, not their detail page: never hide that category.
  const pageIds = new Set([...pages, ...products, ...copies].filter(hidden).map(record => record.id));
  const productIds = new Set([...products, ...records(legacy.tours)].filter(hidden).map(record => record.id));
  let changed = true;
  while (changed) {
    const size = pageIds.size + productIds.size;
    for (const page of pages) {
      if (pageIds.has(page.parentId) || productIds.has(page.productId)) pageIds.add(page.id);
    }
    for (const product of products) {
      if (pageIds.has(product.id) || pageIds.has(product.pageId)) productIds.add(product.id);
    }
    for (const copy of copies) {
      if (pageIds.has(copy.id) || pageIds.has(copy.pageId) || productIds.has(copy.id)) pageIds.add(copy.id);
    }
    changed = size !== pageIds.size + productIds.size;
  }
  return {
    pageIds, productIds,
    reviewIds: new Set(records(result.reviews).filter(hidden).map(record => record.id)),
    mediaSources: new Map(records(result.media).map(record => [record.src, record.id])),
  };
}

/** The single deep privacy policy shared by full and one-part projection. */
export function projectPublicValue(child: unknown, context: PublicProjectionContext, field = ''): unknown {
  const { pageIds, productIds, reviewIds } = context;
  if (Array.isArray(child)) {
    const ids = field === 'productIds' ? productIds : field === 'reviewIds' ? reviewIds : null;
    return child.filter(item => !ids?.has(item)).map(item => projectPublicValue(item, context, field)).filter(item => item !== undefined);
  }
  if (!child || typeof child !== 'object') return child;
  const record = child as PublicRecord;
  if (hidden(record) || pageIds.has(record.pageId) || productIds.has(record.productId) ||
    (['pages', 'tours', 'customPages', 'blogPosts'].includes(field) && pageIds.has(record.id)) ||
    (['products', 'tours'].includes(field) && productIds.has(record.id))) return undefined;
  return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, projectPublicValue(item, context, key)]));
}

/** References exclude EVERY object property named media, exactly as in the full document policy. */
export function publicMediaReferences(child: unknown, context: PublicProjectionContext, ids = new Set<unknown>()): Set<unknown> {
  if (Array.isArray(child)) child.forEach(item => publicMediaReferences(item, context, ids));
  else if (child && typeof child === 'object') {
    for (const [key, item] of Object.entries(child)) {
      if (key === 'media') continue;
      if (key === 'mediaId') ids.add(item);
      publicMediaReferences(item, context, ids);
    }
  } else if (context.mediaSources.has(child)) ids.add(context.mediaSources.get(child));
  return ids;
}

/** Do not discard unused library items; discard only references exclusive to private content. */
export function keepPublicMedia(id: unknown, originalReferenceUnion: ReadonlySet<unknown>, publicUnion: ReadonlySet<unknown>): boolean {
  return !originalReferenceUnion.has(id) || publicUnion.has(id);
}

export type PublicCmsPart = Omit<CmsPart, 'value'> & {
  value?: unknown;
  originalMediaIds: unknown[];
  publicMediaIds: unknown[];
};

/** Project only this admitted source part. No full-source parsing/cloning or context mutation. */
export function projectPublicPart(part: CmsPart, context: PublicProjectionContext): PublicCmsPart {
  // Full projection overwrites media with the original library after deep projection.
  // Neither a library item's src nor any of its metadata counts as a reference.
  if (part.kind === 'media' || part.kind === 'manifest') {
    return { ...part, originalMediaIds: [], publicMediaIds: [] };
  }
  const field = part.kind === 'uiCopy' ? part.key! : part.kind.replace(/^legacy\./, '');
  const value = projectPublicValue(part.value, context, field);
  const { value: _source, ...envelope } = part;
  return {
    ...envelope, ...(value === undefined ? {} : { value }),
    originalMediaIds: [...publicMediaReferences({ [field]: part.value }, context)],
    publicMediaIds: [...publicMediaReferences({ [field]: value }, context)],
  };
}
