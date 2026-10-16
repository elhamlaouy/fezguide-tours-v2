import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'tsx/esm/api';
register();
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { validateCmsDocument } = await import('../src/cms/schema.ts');
const { GLOBAL_FIELDS, PAGE_FIELDS, SECTION_VARIANTS, sectionFields, blockFields, editorDefault, parseEditorImport, removeEditorPage, setEditorPath } = await import('../src/cms/editor-controls.ts');
const { editorLabel } = await import('../src/admin/editor-labels.ts');

function covered(value, spec, path) {
  assert.ok(spec, `No typed control for ${path}`);
  if (spec.type === 'object') {
    const fields = path.includes('.blocks.') ? blockFields(value.type).fields : spec.fields;
    for (const [key, child] of Object.entries(value)) covered(child, fields[key], `${path}.${key}`);
  } else if (spec.type === 'array') value.forEach((child, i) => covered(child, spec.item, `${path}.${i}`));
}
test('authoring metadata covers every canonical seed field; legacy is explicitly archival', () => {
  const seed = createCmsSeed();
  for (const [key, value] of Object.entries(seed)) {
    if (['schemaVersion', 'legacy', 'uiCopy', 'pages'].includes(key)) continue;
    covered(value, GLOBAL_FIELDS[key], key);
  }
  for (const page of seed.pages) {
    const { sections, ...fields } = page;
    covered(fields, PAGE_FIELDS, `pages.${page.id}`);
    for (const section of sections) covered(section, sectionFields(section.type), `pages.${page.id}.sections.${section.id}`);
  }
});
test('all fourteen discriminator families provide only approved variant choices', () => {
  const seed = createCmsSeed();
  assert.equal(Object.keys(SECTION_VARIANTS).length, 14);
  for (const [type, variants] of Object.entries(SECTION_VARIANTS)) {
    const spec = sectionFields(type);
    assert.deepEqual(spec.fields.variant.options, variants);
    const created = editorDefault(spec, seed); created.id = 'test'; created.type = type;
    for (const variant of variants) {
      const doc = structuredClone(seed); const home = doc.pages.find(p => p.id === 'home');
      if (type === 'cta' && variant === 'booking') {
        const page = doc.pages.find(p => p.kind === 'product');
        page.sections.push({ ...created, variant, productId: page.productId });
      } else home.sections.push({ ...created, variant });
      assert.equal(validateCmsDocument(doc).valid, true, `${type}:${variant}`);
    }
  }
});
test('optional numeric fields enum controls and reference selectors have complete metadata', () => {
  assert.deepEqual(Object.keys(GLOBAL_FIELDS.theme.fields).sort(), ['colors', 'font', 'fontScale', 'containerWidth', 'spacing', 'radius', 'buttonVariant', 'cardVariant'].sort());
  assert.equal(GLOBAL_FIELDS.theme.fields.fontScale.min, .8);
  assert.equal(GLOBAL_FIELDS.theme.fields.fontScale.max, 1.4);
  assert.equal(GLOBAL_FIELDS.theme.fields.containerWidth.min, 960);
  assert.equal(GLOBAL_FIELDS.media.item.fields.focalPoint.fields.x.max, 1);
  assert.equal(GLOBAL_FIELDS.products.item.fields.price.fields.amount.type, 'number');
  assert.equal(GLOBAL_FIELDS.products.item.fields.pageId.collection, 'pages');
  assert.equal(PAGE_FIELDS.fields.seo.fields.image.fields.mediaId.collection, 'media');
  assert.deepEqual(Object.keys(PAGE_FIELDS.fields.localeFallback.fields), ['en', 'fr']);
});
test('every control field and enum has an EN FR ES label', () => {
  const walk = spec => {
    for (const [key, child] of Object.entries(spec.fields ?? {})) {
      for (const language of ['en', 'fr', 'es']) assert.ok(editorLabel(key, language));
      walk(child);
    }
    if (spec.item) walk(spec.item);
    for (const choice of spec.options ?? []) for (const language of ['en', 'fr', 'es']) assert.ok(editorLabel(choice, language));
  };
  Object.values(GLOBAL_FIELDS).forEach(walk); walk(PAGE_FIELDS); Object.keys(SECTION_VARIANTS).forEach(type => walk(sectionFields(type)));
  assert.equal(editorLabel('containerWidth', 'fr'), 'Largeur du contenu (px)');
  assert.equal(editorLabel('noIndex', 'es'), 'Ocultar a buscadores');
});
test('bounded validated import preserves canonical URLs and cannot manufacture attributed reviews or remove home', () => {
  const seed = createCmsSeed();
  assert.deepEqual(parseEditorImport(JSON.stringify(seed), seed), seed);
  const altered = structuredClone(seed); altered.reviews[0].quote = 'Invented verification';
  assert.throws(() => parseEditorImport(JSON.stringify(altered), seed), /attribution records are read-only/);
  assert.throws(() => parseEditorImport('x'.repeat(2000001), seed), /byte limit/);
  assert.throws(() => parseEditorImport('{"__proto__":{}}', seed), /safe JSON/);
  const doc = structuredClone(seed); doc.media[0].src = '/api/admin/media/private.png';
  assert.throws(() => parseEditorImport(JSON.stringify(doc), seed), /unsafe URL/);
  const minimal = structuredClone(seed); minimal.navigation = []; minimal.footer.links = []; minimal.products = []; minimal.editorialEntries = []; minimal.legacy.tours = []; minimal.pages = [{ id: 'other', slug: 'other', kind: 'landing', enabled: true, title: { en: '', fr: '', es: '' }, seo: { title: { en: '', fr: '', es: '' }, description: { en: '', fr: '', es: '' } }, sections: [] }];
  assert.throws(() => parseEditorImport(JSON.stringify(minimal), seed), /home cannot be removed/);
});
test('page removal protects home and referenced graph, safely cleans link and card targets', () => {
  const seed = createCmsSeed();
  assert.throws(() => removeEditorPage(seed, 'home'), /home cannot be removed/);
  const product = seed.products[0];
  const hidden = removeEditorPage(seed, product.id);
  assert.equal(hidden.pages.find(p => p.id === product.id).enabled, false);
  assert.equal(hidden.products.length, seed.products.length);
  assert.equal(validateCmsDocument(hidden).valid, true);
  const doc = structuredClone(seed);
  const extra = { id: 'removable', slug: 'removable', kind: 'landing', enabled: true, title: { en: '', fr: '', es: '' }, seo: { title: { en: '', fr: '', es: '' }, description: { en: '', fr: '', es: '' } }, sections: [] };
  doc.pages.push(extra); doc.navigation.push({ id: 'removable-link', pageId: extra.id, enabled: true, label: extra.title });
  const home = doc.pages.find(p => p.id === 'home');
  home.sections.push({ id: 'removable-cards', type: 'cardGrid', variant: 'overview', enabled: true, cards: [{ id: 'card', pageId: extra.id, title: extra.title, description: extra.title }] });
  const removed = removeEditorPage(doc, extra.id);
  assert.equal(removed.pages.some(p => p.id === extra.id), false);
  assert.equal(removed.navigation.some(l => l.pageId === extra.id), false);
  assert.equal(removed.pages.find(p => p.id === 'home').sections.at(-1).cards[0].pageId, undefined);
  assert.equal(validateCmsDocument(removed).valid, true);
  assert.equal(doc.pages.some(p => p.id === extra.id), true, 'immutable operation');
});
test('structured path edits remove optional keys and preserve stable array identifiers', () => {
  const original = { pages: [{ id: 'home', seo: { canonical: 'https://example.com' } }] };
  const removed = setEditorPath(original, ['pages', 'home', 'seo', 'canonical'], undefined);
  assert.deepEqual(removed, { pages: [{ id: 'home', seo: {} }] });
  assert.equal(original.pages[0].seo.canonical, 'https://example.com');
});
