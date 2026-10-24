import { CMS_PART_FIELDS, isCmsPartEnvelope, validateCmsPart, type CmsDocument, type CmsPart } from './schema';
export type { CmsPart } from './schema';

const kinds = Object.keys(CMS_PART_FIELDS);
const maxParts = 1 + Object.values(CMS_PART_FIELDS).reduce((total, spec) => total + spec.max, 0);
function invalid(): never { throw new Error('parts: invalid manifest, field closure, count, key or index'); }

/** Shallow JSON-container guard; values are admitted separately, never discarded by splitting. */
function container(value: unknown, keys?: string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) invalid();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some(k => typeof k !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(k)) ||
      Object.values(descriptors).some(d => !d.enumerable || d.get || d.set) ||
      (keys && (ownKeys.length !== keys.length || keys.some(k => !Object.hasOwn(descriptors, k))))) invalid();
}

/** Structural split, not admission. Validate every changed real part before persisting it. */
export function splitCmsDocument(doc: CmsDocument): CmsPart[] {
  const rootKeys = [...kinds.filter(k => !k.startsWith('legacy.')), 'legacy'];
  container(doc, rootKeys);
  container(doc.legacy, kinds.filter(k => k.startsWith('legacy.')).map(k => k.slice(7)));
  const parts: CmsPart[] = [];
  const counts: Record<string, number> = {};
  for (const kind of kinds) {
    const spec = CMS_PART_FIELDS[kind];
    const value = kind.startsWith('legacy.') ? doc.legacy[kind.slice(7) as keyof typeof doc.legacy] : doc[kind as keyof CmsDocument];
    if (kind === 'uiCopy') {
      container(value);
      counts[kind] = Object.keys(value).length;
      for (const [index, [key, item]] of Object.entries(value).entries()) parts.push({ kind, index, key, value: item });
    } else if (spec.collection) {
      if (!Array.isArray(value) || value.length > spec.max || Reflect.ownKeys(value).length !== value.length + 1) invalid();
      const descriptors = Object.getOwnPropertyDescriptors(value);
      if (Object.entries(descriptors).some(([key, d]) => key !== 'length' && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length || !d.enumerable || d.get || d.set))) invalid();
      counts[kind] = value.length;
      value.forEach((item, index) => parts.push({ kind, index, value: item }));
    } else {
      counts[kind] = 1;
      parts.push({ kind, index: 0, value });
    }
  }
  const manifest: CmsPart = { kind: 'manifest', index: 0, value: counts };
  if (!validateCmsPart(manifest).valid || parts.some(p => !isCmsPartEnvelope(p))) invalid();
  return [manifest, ...parts];
}

/**
 * Assemble admitted real parts OR trusted server-generated summaries. This checks only
 * structure: it deliberately does not run field schema on stripped reference summaries.
 * Final server acceptance still requires canonical UTF-8 byte accounting.
 */
export function assembleCmsDocument(parts: CmsPart[]): CmsDocument {
  if (!Array.isArray(parts) || parts.length > maxParts || Reflect.ownKeys(parts).length !== parts.length + 1) invalid();
  if (Object.entries(Object.getOwnPropertyDescriptors(parts)).some(([key, d]) => key !== 'length' && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= parts.length || !d.enumerable || d.get || d.set))) invalid();
  const manifests = parts.filter(p => isCmsPartEnvelope(p) && p.kind === 'manifest');
  if (manifests.length !== 1 || !validateCmsPart(manifests[0]).valid) invalid();
  const counts = manifests[0].value as Record<string, number>;
  if (parts.length !== 1 + Object.values(counts).reduce((total, count) => total + count, 0)) invalid();
  const groups = new Map(kinds.map(kind => [kind, new Map<number, CmsPart>()]));
  const copyKeys = new Set<string>();
  for (const part of parts) {
    if (!isCmsPartEnvelope(part)) invalid();
    if (part.kind === 'manifest') continue;
    const group = groups.get(part.kind)!;
    if (part.index >= counts[part.kind] || group.has(part.index)) invalid();
    if (part.kind === 'uiCopy') {
      if (copyKeys.has(part.key!)) invalid();
      copyKeys.add(part.key!);
    }
    group.set(part.index, part);
  }
  const root: Record<string, unknown> = {};
  const legacy: Record<string, unknown> = {};
  for (const kind of kinds) {
    const group = groups.get(kind)!;
    if (group.size !== counts[kind]) invalid();
    const ordered = Array.from({ length: counts[kind] }, (_, index) => group.get(index) ?? invalid());
    const value = kind === 'uiCopy' ? Object.fromEntries(ordered.map(part => [part.key!, part.value])) : CMS_PART_FIELDS[kind].collection ? ordered.map(part => part.value) : ordered[0].value;
    if (kind.startsWith('legacy.')) legacy[kind.slice(7)] = value;
    else root[kind] = value;
  }
  root.legacy = legacy;
  return root as unknown as CmsDocument;
}

const pick = (value: unknown, keys: string[]): Record<string, unknown> => {
  const record = value as Record<string, unknown>;
  return Object.fromEntries(keys.filter(key => Object.hasOwn(record, key)).map(key => [key, record[key]]));
};
const imageRef = (value: unknown) => pick(value, ['mediaId']);
const linkRef = (value: unknown) => pick(value, ['id', 'pageId', 'enabled']);
function sectionRef(value: unknown): object {
  const s = value as Record<string, unknown>;
  const summary = pick(s, ['id', 'type', 'enabled', 'variant', 'productId', 'productIds', 'reviewIds', 'faqIds', 'teamIds']);
  if (s.image !== undefined) summary.image = imageRef(s.image);
  if (Array.isArray(s.links)) summary.links = s.links.map(linkRef);
  if (Array.isArray(s.images)) summary.images = s.images.map(imageRef);
  if (Array.isArray(s.cards)) summary.cards = s.cards.map(card => ({ ...pick(card, ['id', 'pageId']), ...(card.image === undefined ? {} : { image: imageRef(card.image) }) }));
  return summary;
}

/** Only call on an admitted real part. Never accept client-authored summaries as admission. */
export function referenceSummary(part: CmsPart): CmsPart {
  const value = part.value as Record<string, unknown>;
  let summary: unknown;
  switch (part.kind) {
    case 'manifest': summary = { ...value }; break;
    case 'pages': {
      const seo = value.seo as Record<string, unknown>;
      summary = { ...pick(value, ['id', 'slug', 'kind', 'parentId', 'productId', 'localeFallback']),
        seo: { ...pick(seo, ['canonical']), ...(seo.image === undefined ? {} : { image: imageRef(seo.image) }) },
        sections: (value.sections as unknown[]).map(sectionRef) };
      break;
    }
    case 'navigation': summary = linkRef(value); break;
    case 'footer': summary = { links: (value.links as unknown[]).map(linkRef) }; break;
    case 'products': summary = pick(value, ['id', 'pageId', 'image', 'galleryImages']); break;
    case 'editorialEntries': summary = pick(value, ['id', 'pageId', 'productId']); break;
    case 'media': summary = pick(value, ['id', 'src', 'width', 'height']); break;
    case 'teamMembers': summary = pick(value, ['id', 'avatarUrl']); break;
    case 'blogPosts': summary = pick(value, ['id', 'coverImage']); break;
    case 'reviews': summary = pick(value, ['id', 'url']); break;
    case 'legacy.tours': summary = pick(value, ['id', 'pageId', 'kind', 'actionType']); break;
    case 'faqs': case 'legacy.customPages': case 'legacy.blogPosts': case 'legacy.teamMembers': case 'legacy.faqs': summary = pick(value, ['id']); break;
    case 'schemaVersion': summary = part.value; break;
    default: summary = {};
  }
  if (part.kind !== 'manifest' && value && typeof value === 'object') {
    summary = { ...summary as object, ...pick(value, ['id', 'pageId', 'parentId', 'productId', 'enabled', 'published']) };
  }
  return { ...part, value: summary };
}
