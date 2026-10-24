import { createCmsSeed } from '../../src/cms/seed.ts';

// Portable, schema-valid small-value fixture; no retained owner content.
export function cardinalityDocument() {
  const doc = createCmsSeed();
  for (const [key, value] of Object.entries(doc)) if (Array.isArray(value)) doc[key] = [];
  for (const [key, value] of Object.entries(doc.legacy)) if (Array.isArray(value)) doc.legacy[key] = [];
  const text = { en: 'Text', fr: 'Texte', es: 'Texto' };
  doc.footer.links = [];
  doc.pages = Array.from({ length: 150 }, (_, index) => ({
    id: index ? `page-${index}` : 'home', slug: index ? `page-${index}` : 'home',
    kind: 'landing', enabled: true, title: { ...text },
    seo: { title: { ...text }, description: { ...text } }, sections: [],
  }));
  doc.media = Array.from({ length: 1000 }, (_, index) => ({
    id: `media-${index}`, src: `https://example.test/image-${index}.webp`, alt: { ...text },
  }));
  doc.uiCopy = Object.fromEntries(Array.from({ length: 2000 }, (_, index) => [`copy.${index}`, { ...text }]));
  return doc;
}
