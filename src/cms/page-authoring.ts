import type { CmsDocument, CmsPage } from './schema';

/** Shared by New page / Copy and the existing Duplicate action. Caller validates the graph. */
export function copyEditorPage(document: CmsDocument, source: CmsPage, id: string): CmsDocument {
  const copy = structuredClone(source);
  copy.id = id;
  copy.slug = id;
  copy.enabled = false;
  delete copy.seo.canonical;
  const product = document.products.find(item => item.id === (source.productId ?? source.id));
  if (product) {
    copy.productId = id;
    copy.sections = copy.sections.map(section => section.type === 'cta' && section.productId === product.id ? { ...section, productId: id } : section);
  }
  return {
    ...document,
    products: product ? [...document.products, { ...structuredClone(product), id, published: false }] : document.products,
    pages: [...document.pages, copy],
  };
}
