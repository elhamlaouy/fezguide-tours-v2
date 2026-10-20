import type { CmsDocument, CmsImage, CmsPage, CmsSection, Localized } from './schema';
import { isSafeCmsUrl } from './schema';

const locales = ['en', 'fr', 'es'] as const;
const empty = (): Localized => ({ en: '', fr: '', es: '' });
const emptyList = (): Localized<string[]> => ({ en: [], fr: [], es: [] });
const changed = (before: unknown, after: unknown) => JSON.stringify(before) !== JSON.stringify(after);
const label = (en: string, fr: string, es: string): Localized => ({ en, fr, es });
function copy<T>(current: Localized<T> | undefined, before: Localized<T> | undefined, after: Localized<T> | undefined, blank: Localized<T>): Localized<T> {
  const result = { ...(current ?? blank) };
  for (const locale of locales) if (changed(before?.[locale], after?.[locale])) result[locale] = after?.[locale] ?? blank[locale];
  return result;
}
function image(document: CmsDocument, src: string, alt?: Localized): CmsImage | undefined {
  let media = document.media.find(item => item.src === src);
  if (!media && isSafeCmsUrl(src, true)) {
    let index = document.media.length + 1;
    while (document.media.some(item => item.id === `external-image-${index}`)) index++;
    media = { id: `external-image-${index}`, src, alt: alt ?? empty(), source: 'cms-external-image' };
    document.media.push(media);
  }
  return media ? { mediaId: media.id, alt: alt ?? media.alt } : undefined;
}
function sectionEdit<T extends CmsSection['type']>(page: CmsPage, id: string, fallback: Extract<CmsSection, { type: T }>, update: (section: Extract<CmsSection, { type: T }>) => CmsSection): CmsPage {
  const current = page.sections.find(section => section.id === id);
  // A different discriminator is an explicit custom block, not an entity binding.
  if (current && current.type !== fallback.type) return page;
  const next = update((current ?? fallback) as Extract<CmsSection, { type: T }>);
  return { ...page, sections: current ? page.sections.map(section => section === current ? next : section) : [...page.sections, next] };
}
function syncParagraphs(page: CmsPage, id: string, before: Localized | undefined, after: Localized | undefined): CmsPage {
  return sectionEdit(page, id, { id, type: 'richText', variant: 'panel', enabled: true, blocks: [] }, section => {
    // ponytail: non-paragraph formatting detaches this whole custom section; no implicit conversion across locales.
    if (section.blocks.some(block => block.type !== 'paragraph')) return section;
    const blocks = section.blocks.map(block => structuredClone(block));
    for (const locale of locales) {
      if (!changed(before?.[locale], after?.[locale])) continue;
      const paragraphs = (after?.[locale] ?? '').split(/\n\s*\n/).filter(Boolean);
      const count = Math.max(blocks.length, paragraphs.length);
      for (let index = 0; index < count; index++) {
        const block = blocks[index];
        blocks[index] = { type: 'paragraph', text: { ...(block && 'text' in block ? block.text : empty()), [locale]: paragraphs[index] ?? '' } };
      }
    }
    return { ...section, blocks };
  });
}
function syncList(page: CmsPage, id: string, before: Localized<string[]> | undefined, after: Localized<string[]> | undefined): CmsPage {
  return sectionEdit(page, id, { id, type: 'richText', variant: 'panel', enabled: true, blocks: [] }, section => {
    const index = section.blocks.findIndex(block => block.type === 'list');
    const block = index >= 0 ? section.blocks[index] : undefined;
    const next = { type: 'list' as const, items: copy(block?.type === 'list' ? block.items : undefined, before, after, emptyList()) };
    return { ...section, blocks: index < 0 ? [...section.blocks, next] : section.blocks.map((block, i) => i === index ? next : block) };
  });
}

/** Canonical string-backed image references; archives are deliberately independent. */
export function referencedMediaUrls(document: CmsDocument): Set<string> {
  return new Set([
    ...document.products.flatMap(product => [product.image, ...(product.galleryImages ?? [])]),
    ...document.blogPosts.map(post => post.coverImage),
    ...document.teamMembers.map(member => member.avatarUrl),
    document.siteSettings.heroImage,
  ].filter((src): src is string => Boolean(src)));
}

/** Authoring-time, last writer wins at the changed field/locale only. Imports and rendering never reapply source defaults. */
export function syncEntityEdits(before: CmsDocument, after: CmsDocument, options: { pricingOnly?: boolean } = {}): CmsDocument {
  // Stable library IDs identify source replacements; raw-URL consumers must follow them too.
  const replacements = new Map<string, string>();
  for (const media of after.media) {
    const previous = before.media.find(item => item.id === media.id);
    if (previous && previous.src !== media.src && isSafeCmsUrl(media.src, true)) replacements.set(previous.src, media.src);
  }
  const replace = (src: string) => replacements.get(src) ?? src;
  if (replacements.size) after = { ...after,
    products: after.products.map(product => ({ ...product, image: replace(product.image), ...(product.galleryImages ? { galleryImages: product.galleryImages.map(replace) } : {}) })),
    blogPosts: after.blogPosts.map(post => ({ ...post, coverImage: replace(post.coverImage) })),
    teamMembers: after.teamMembers.map(member => ({ ...member, avatarUrl: replace(member.avatarUrl) })),
    siteSettings: { ...after.siteSettings, ...(after.siteSettings.heroImage ? { heroImage: replace(after.siteSettings.heroImage) } : {}) },
  };
  // Register accepted author-entered image URLs in the canonical library, without mutating the prior draft.
  after = { ...after, media: [...after.media] };
  for (const product of after.products) {
    image(after, product.image, product.imageAlt);
    for (const src of product.galleryImages ?? []) image(after, src, product.imageAlt);
  }
  for (const post of after.blogPosts) image(after, post.coverImage, post.title);
  for (const member of after.teamMembers) if (member.avatarUrl) image(after, member.avatarUrl);
  if (after.siteSettings.heroImage) image(after, after.siteSettings.heroImage);
  after = { ...after, products: after.products.map(product => {
    const previous = before.products.find(item => item.id === product.id);
    const price = product.price;
    if (!price || !changed(previous?.price, price) || typeof price.amount !== 'number' || !Number.isFinite(price.amount) || price.amount < 0 || price.amount > 1000000) return product;
    const field = `price${price.currency}` as 'priceEUR' | 'priceMAD' | 'priceUSD';
    const priorField = previous?.price ? `price${previous.price.currency}` as typeof field : undefined;
    const priorMirror = priorField ? previous?.practicalInfo?.[priorField] : undefined;
    // An existing disagreement needs an explicit choice (a caller may supply the chosen mirror too).
    if (previous?.price && priorMirror !== undefined && priorMirror !== previous.price.amount && product.practicalInfo?.[field] !== price.amount) return product;
    return { ...product, practicalInfo: { ...product.practicalInfo, [field]: price.amount } };
  }) };
  let pages = after.pages;
  for (const product of after.products) {
    const previous = before.products.find(item => item.id === product.id);
    if (!changed(previous, product)) continue;
    pages = pages.map(page => {
      if (page.kind !== 'product' || page.productId !== product.id) return page;
      let next = page;
      if (changed(previous?.title, product.title)) {
        next = { ...next, title: copy(next.title, previous?.title, product.title, empty()) };
      }
      if (changed(previous?.title, product.title) || changed(previous?.shortDescription, product.shortDescription)) {
        next = sectionEdit(next, 'header', { id: 'header', type: 'hero', variant: 'minimal', enabled: true, links: [] }, section => ({ ...section,
          ...(changed(previous?.title, product.title) ? { title: copy(section.title, previous?.title, product.title, empty()) } : {}),
          ...(changed(previous?.shortDescription, product.shortDescription) ? { description: copy(section.description, previous?.shortDescription, product.shortDescription, empty()) } : {}),
        }));
      }
      for (const [field, id] of [['fullDescription', 'overview'], ['meetingPointDetails', 'meeting'], ['cancellationPolicy', 'cancel']] as const) {
        if (changed(previous?.[field], product[field])) next = syncParagraphs(next, id, previous?.[field], product[field]);
      }
      for (const [field, id] of [['highlights', 'highlights'], ['whatToBring', 'bring'], ['suitableFor', 'extra']] as const) {
        if (changed(previous?.[field], product[field])) next = syncList(next, id, previous?.[field], product[field]);
      }
      if (changed(previous?.itinerary, product.itinerary)) next = sectionEdit(next, 'itinerary', { id: 'itinerary', type: 'itinerary', variant: 'timeline', enabled: true, stops: [] }, section => ({ ...section, stops: product.itinerary ?? [] }));
      if (changed(previous?.included, product.included) || changed(previous?.excluded, product.excluded)) {
        next = sectionEdit(next, 'included', { id: 'included', type: 'inclusions', variant: 'columns', enabled: true, included: emptyList(), excluded: emptyList() }, section => ({ ...section,
          included: copy(section.included, previous?.included, product.included, emptyList()), excluded: copy(section.excluded, previous?.excluded, product.excluded, emptyList()),
        }));
      }
      // Library replacements already reach stable CmsImage IDs; do not reset owner-authored placements.
      if (changed(previous?.galleryImages?.map(replace), product.galleryImages)) next = sectionEdit(next, 'gallery', { id: 'gallery', type: 'gallery', variant: 'carousel', enabled: true, images: [] }, section => ({ ...section, images: (product.galleryImages ?? []).map(src => image(after, src, src === product.image ? product.imageAlt : undefined)).filter((item): item is CmsImage => Boolean(item)) }));
      const factFields = ['duration', 'groupSize', 'departure', 'priceMAD', 'priceEUR', 'priceUSD'] as const;
      const titles = [label('Duration', 'Durée', 'Duración'), label('Format', 'Format', 'Formato'), label('Meeting / Pickup', 'Départ', 'Punto de encuentro / Recogida'), label('Price (MAD)', 'Prix (MAD)', 'Precio (MAD)'), label('Price (EUR)', 'Prix (EUR)', 'Precio (EUR)'), label('Price (USD)', 'Prix (USD)', 'Precio (USD)')];
      const priceOnlyChange = (options.pricingOnly || changed(previous?.price, product.price)) && !factFields.slice(0, 3).some(field => changed(previous?.practicalInfo?.[field], product.practicalInfo?.[field]));
      if ((changed(previous?.price, product.price) || factFields.some(field => changed(previous?.practicalInfo?.[field], product.practicalInfo?.[field]))) && (!priceOnlyChange || next.sections.some(section => section.id === 'facts'))) {
        next = sectionEdit(next, 'facts', { id: 'facts', type: 'practicalInfo', variant: 'facts', enabled: true, items: [] }, section => {
          const items = section.items.slice();
          factFields.forEach((field, index) => {
            const old = previous?.practicalInfo?.[field]; const value = product.practicalInfo?.[field];
            const canonicalChanged = field === `price${product.price?.currency}` && changed(previous?.price, product.price);
            if (!changed(old, value) && !canonicalChanged) return;
            if (index >= 3 && (options.pricingOnly || changed(previous?.price, product.price))) {
              // Main-price edits update only established numeric rows; never invent facts or overwrite prose.
              const priorAmounts = [old, ...(field === `price${previous?.price?.currency}` ? [previous?.price?.amount] : [])].filter(value => typeof value === 'number');
              const numeric = items.map((item, slot) => ({ item, slot })).filter(({ item }) => locales.some(locale => item.title[locale] === titles[index][locale]) && priorAmounts.some(amount => locales.every(locale => item.description[locale] === `${amount} ${field.slice(5)}`)));
              for (const { slot } of numeric) items[slot] = { ...items[slot], description: value === undefined ? empty() : label(`${value} ${field.slice(5)}`, `${value} ${field.slice(5)}`, `${value} ${field.slice(5)}`) };
              return;
            }
            const oldDescription = typeof old === 'number' ? label(`${old} ${field.slice(5)}`, `${old} ${field.slice(5)}`, `${old} ${field.slice(5)}`) : old;
            // Match prior semantics, not owner-controlled order. If both title and value were customized, append instead of guessing.
            const descriptions = items.map((item, slot) => ({ item, slot })).filter(({ item }) => oldDescription && locales.some(locale => Boolean(oldDescription[locale])) && locales.every(locale => item.description[locale] === oldDescription[locale]));
            const semanticTitles = items.map((item, slot) => ({ item, slot })).filter(({ item }) => locales.some(locale => item.title[locale] === titles[index][locale]));
            let slot = semanticTitles.length === 1 ? semanticTitles[0].slot : descriptions.length === 1 ? descriptions[0].slot : -1;
            if (slot < 0) {
              if (value === undefined) return;
              slot = items.length;
              items.push({ title: titles[index], description: empty() });
            }
            items[slot] = { ...items[slot], description: typeof value === 'number' ? label(`${value} ${field.slice(5)}`, `${value} ${field.slice(5)}`, `${value} ${field.slice(5)}`) : copy(items[slot].description, typeof old === 'object' ? old : undefined, value, empty()) };
            if (index >= 3 && value === undefined) items[slot] = { ...items[slot], description: empty() };
          });
          return { ...section, items };
        });
      }
      return next;
    });
    pages = pages.map(page => ({ ...page, sections: page.sections.map(section => section.type !== 'cardGrid' ? section : { ...section, cards: section.cards.map(card => {
      if (card.pageId !== pages.find(page => page.kind === 'product' && page.productId === product.id)?.id) return card;
      return { ...card,
        title: copy(card.title, previous?.title, product.title, empty()), description: copy(card.description, previous?.shortDescription, product.shortDescription, empty()),
        ...(changed(previous?.subtitle, product.subtitle) ? { badge: copy(card.badge, previous?.subtitle, product.subtitle, empty()) } : {}),
        ...(changed(previous?.image ? replace(previous.image) : undefined, product.image) || changed(previous?.imageAlt, product.imageAlt) ? { image: image(after, product.image, product.imageAlt) } : {}),
      };
    }) }) }));
  }
  for (const post of after.blogPosts) {
    const previous = before.blogPosts.find(item => item.id === post.id);
    if (!changed(previous, post)) continue;
    pages = pages.map(page => {
      if (page.id !== post.id) return page;
      let next = page;
      if (changed(previous?.title, post.title)) next = { ...next, title: copy(next.title, previous?.title, post.title, empty()) };
      if (changed(previous?.slug, post.slug)) next = { ...next, slug: post.slug };
      if (changed(previous?.content, post.content)) next = syncParagraphs(next, 'content', previous?.content, post.content);
      if (changed(previous?.excerpt, post.excerpt)) next = syncParagraphs(next, 'excerpt', previous?.excerpt, post.excerpt);
      if (changed(previous?.coverImage ? replace(previous.coverImage) : undefined, post.coverImage) || changed(previous?.title, post.title)) {
        next = sectionEdit(next, 'cover', { id: 'cover', type: 'gallery', variant: 'story', enabled: true, images: [] }, section => {
          const cover = image(after, post.coverImage, post.title);
          return { ...section, images: cover ? [cover] : [] };
        });
      }
      return next;
    });
    pages = pages.map(page => ({ ...page, sections: page.sections.map(section => {
      if (section.type !== 'cardGrid') return section;
      let cards = section.cards.map(card => card.pageId !== post.id ? card : { ...card,
        title: copy(card.title, previous?.title, post.title, empty()), description: copy(card.description, previous?.excerpt, post.excerpt, empty()),
        ...(changed(previous?.coverImage ? replace(previous.coverImage) : undefined, post.coverImage) || changed(previous?.title, post.title) ? { image: image(after, post.coverImage, post.title) } : {}),
      });
      if (!previous && page.id === 'blog' && section.id === 'posts' && !cards.some(card => card.pageId === post.id)) cards = [...cards, { id: post.id, pageId: post.id, title: post.title, description: post.excerpt, image: image(after, post.coverImage, post.title) }];
      return { ...section, cards };
    }) }));
  }
  // Removed posts remain archival pages, but cannot leak stale listing/detail content.
  const removedPosts = new Set(before.blogPosts.filter(post => !after.blogPosts.some(item => item.id === post.id)).map(post => post.id));
  if (removedPosts.size) pages = pages.map(page => removedPosts.has(page.id) ? { ...page, enabled: false } : page);
  return pages === after.pages ? after : { ...after, pages };
}
