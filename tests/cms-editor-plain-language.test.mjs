import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { register } from 'tsx/esm/api';
register();
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { SUPPORTED_UI_COPY } = await import('../src/cms/ui-copy.ts');
const { API_ERROR_MESSAGES, describeEditorError, describeFieldPath, friendlyApiError } = await import('../src/admin/editor-errors.ts');
const { itemName, numberedLabel, referenceName } = await import('../src/admin/editor-names.ts');
const { uiCopyRegistry, uiCopyLabel, humanizeUiCopyKey } = await import('../src/admin/ui-copy-registry.ts');
const { editorLabel } = await import('../src/admin/editor-labels.ts');
const { languageName, workspaceText } = await import('../src/admin/editor-workspace.ts');
const { isAdvancedEditorField, HIDDEN_EDITOR_COLLECTIONS, FALLBACK_ONLY_SITE_SETTINGS } = await import('../src/cms/editor-controls.ts');
const { fieldLabel } = await import('../src/admin/StructuredFields.tsx');

const LANGS = ['en', 'fr', 'es'];

test('every error code the worker can return has a friendly EN/FR/ES message (no raw codes shown)', () => {
  const codes = new Set();
  for (const file of readdirSync(new URL('../worker/', import.meta.url)).filter(name => name.endsWith('.ts'))) {
    const source = readFileSync(new URL(`../worker/${file}`, import.meta.url), 'utf8');
    for (const match of source.matchAll(/(?:CmsError\(\s*\d+\s*,\s*|error:\s*)'([a-z][a-z0-9_]*)'/g)) codes.add(match[1]);
  }
  assert.ok(codes.has('cms_revision_storage_budget') && codes.has('version_conflict') && codes.size > 25, `found ${codes.size} codes`);
  for (const code of codes) {
    assert.ok(Object.hasOwn(API_ERROR_MESSAGES, code), `no friendly message for ${code}`);
    for (const language of LANGS) {
      const text = friendlyApiError(code, language);
      assert.ok(text.length > 20 && !text.includes(code) && !/[a-z]+_[a-z_]+/.test(text), `${code}/${language}: ${text}`);
    }
  }
  for (const code of ['network_error', 'save_failed', 'publish_failed', 'rollback_failed', 'load_failed', 'request_failed', 'invalid_response']) assert.ok(API_ERROR_MESSAGES[code], code);
});

test('storage-budget, session and network errors tell the owner what happened and what to do, in three languages', () => {
  assert.match(friendlyApiError('cms_revision_storage_budget', 'en'), /history is full.*changes are still here.*contact support/i);
  assert.match(friendlyApiError('cms_revision_storage_budget', 'fr'), /historique.*plein.*toujours là/i);
  assert.match(friendlyApiError('cms_revision_storage_budget', 'es'), /historial.*lleno.*siguen aquí/i);
  assert.equal(friendlyApiError('unauthorized', 'en'), 'Your session expired — sign in again in a new tab, then click Save again. Your changes are still here.');
  assert.match(friendlyApiError('network_error', 'en'), /internet connection/);
  assert.match(friendlyApiError('network_error', 'fr'), /connexion internet/);
  assert.match(friendlyApiError('network_error', 'es'), /conexión a internet/);
  // Unknown codes never leak either.
  assert.doesNotMatch(friendlyApiError('some_new_code', 'en'), /some_new_code/);
  const described = describeEditorError('cms_revision_storage_budget', 'en');
  assert.equal(described.code, 'cms_revision_storage_budget');
  assert.doesNotMatch(described.text, /cms_revision_storage_budget/);
});

test('field validation paths are described in words: page → section → field → language', () => {
  const doc = createCmsSeed();
  const home = doc.pages.find(page => page.id === 'home');
  const hero = home.sections.find(section => section.id === 'hero');
  const text = describeFieldPath('pages.home.sections.hero.title.en', doc, 'en');
  assert.equal(text, `Page “${home.title.en}” › Section “${hero.title.en}” › Title › English`);
  assert.equal(describeFieldPath('pages.home.seo.description.fr', doc, 'fr'), `Page “${home.title.fr}” › Référencement et partage › Description › Français`);
  assert.match(describeFieldPath('document.pages[0].title.es', doc, 'es'), /^Página “.+” › Título › Español$/);
  assert.equal(describeFieldPath('document.theme.fontScale', doc, 'en'), 'Theme › Font scale');
  const product = doc.products[0];
  assert.equal(describeFieldPath('products.0.shortDescription.en', doc, 'en'), `Tours & experiences › 1. ${itemName(product, 'en')} › ${editorLabel('shortDescription', 'en')} › English`);
  const error = describeEditorError('document.pages[0].title.es: invalid or oversized string', 'en', doc);
  assert.match(error.text, /^Page “.+” › Title › Español: This text is not valid or is too long\.$/);
  assert.equal(error.code, 'document.pages[0].title.es: invalid or oversized string');
  assert.doesNotMatch(error.text, /document\.pages/);
  assert.match(describeEditorError('uiCopy: invalid dictionary key', 'es').text, /^Textos de la interfaz: /);
  assert.match(describeEditorError('page id: use a lowercase slug', 'fr').text, /^Adresse de la nouvelle page: /);
  assert.match(describeEditorError('media: unknown id gate', 'en').text, /^Photo descriptions: Photo not found in the library: gate$/);
});

test('list items are numbered from 1 and carry the item name (tour, post, team, FAQ, link, card)', () => {
  const doc = createCmsSeed();
  const product = doc.products[0];
  assert.equal(numberedLabel(0, 'Chefchaouen Day Trip from Fez', 'en'), '1. Chefchaouen Day Trip from Fez');
  assert.equal(numberedLabel(2, '', 'fr'), '3. Élément');
  assert.equal(fieldLabel('products.0', product, { type: 'object' }, doc, 'en'), `1. ${product.title.en}`);
  assert.equal(fieldLabel('products.1', doc.products[1], { type: 'object' }, doc, 'fr'), `2. ${doc.products[1].title.fr}`);
  assert.equal(fieldLabel('teamMembers.0', doc.teamMembers[0], { type: 'object' }, doc, 'en'), `1. ${doc.teamMembers[0].name}`);
  assert.equal(fieldLabel('faqs.0', doc.faqs[0], { type: 'object' }, doc, 'en').startsWith('1. '), true);
  assert.equal(fieldLabel('navigation.0', doc.navigation[0], { type: 'object' }, doc, 'en'), `1. ${doc.navigation[0].label.en}`);
  assert.equal(fieldLabel('blogPosts.0', doc.blogPosts[0], { type: 'object' }, doc, 'en'), `1. ${itemName(doc.blogPosts[0], 'en')}`);
  const card = doc.pages.flatMap(page => page.sections).find(section => section.type === 'cardGrid').cards[0];
  assert.equal(itemName(card, 'en'), card.title.en.replace(/\s+/g, ' ').slice(0, 60));
  // Reference lists show the referenced tour's name, not its id.
  assert.equal(fieldLabel('pages.home.sections.x.productIds.0', product.id, { type: 'reference', collection: 'products' }, doc, 'en'), `1. ${itemName(product, 'en')}`);
  assert.equal(referenceName('products', product.id, doc, 'en'), itemName(product, 'en'));
  assert.equal(fieldLabel('x.highlights.en', [], { type: 'array' }, doc, 'en').endsWith('(English)'), true);
});

test('labels are renamed for non-technical owners in EN, FR and ES', () => {
  const expectations = {
    products: ['Tours & experiences', 'Visites et expériences', 'Visitas y experiencias'],
    reviews: ['Tripadvisor reviews (show/hide and order)', 'Avis Tripadvisor (afficher/masquer et ordre)', 'Reseñas de Tripadvisor (mostrar/ocultar y orden)'],
    excerpt: ['Short summary', 'Résumé court', 'Resumen breve'],
    content: ['Article text', 'Texte de l’article', 'Texto del artículo'],
    published: ['Show on website', 'Afficher sur le site', 'Mostrar en el sitio web'],
  };
  for (const [key, labels] of Object.entries(expectations)) LANGS.forEach((language, index) => assert.equal(editorLabel(key, language), labels[index], `${key}/${language}`));
  assert.match(editorLabel('slug', 'en'), /^Web address \(after fezguidetours\.com\/\)$/);
  assert.match(editorLabel('alt', 'en'), /^Photo description \(for Google & screen readers\)$/);
  assert.equal(editorLabel('imageAlt', 'en'), editorLabel('alt', 'en'));
  assert.deepEqual(LANGS.map(language => languageName(language)), ['English', 'Français', 'Español']);
  assert.equal(workspaceText('statePublished', 'en'), 'Published — up to date');
  assert.equal(workspaceText('stateDraft', 'en'), 'Draft saved, not published yet');
  assert.equal(workspaceText('stateUnsaved', 'en'), 'Unsaved changes');
});

test('technical fields are classified Advanced; photo content and web addresses stay primary', () => {
  for (const path of ['pages.home.id', 'pages.home.kind', 'pages.home.parentId', 'pages.home.productId', 'pages.home.localeFallback', 'pages.home.source', 'pages.home.seo.canonical',
    'products.0.id', 'products.0.kind', 'products.0.actionType', 'blogPosts.0.id', 'media.0.source', 'reviews.0.source', 'navigation.0.id', 'siteSettings.heroImage']) {
    assert.equal(isAdvancedEditorField(path), true, path);
  }
  for (const path of ['pages.home.slug', 'pages.home.title', 'products.0.pageId', 'products.0.image', 'products.0.galleryImages', 'blogPosts.0.slug', 'siteSettings.email', 'pages.home.sections.hero.id', 'pages.home.sections.hero.title']) {
    assert.equal(isAdvancedEditorField(path), false, path);
  }
});

test('editorial entries and fallback-only hero settings are hidden; heroImage stays because SEO reads it', () => {
  assert.deepEqual([...HIDDEN_EDITOR_COLLECTIONS], ['editorialEntries']);
  assert.deepEqual([...FALLBACK_ONLY_SITE_SETTINGS].sort(), ['heroSubtitle', 'heroTagline', 'heroTitle']);
  const source = readFileSync(new URL('../src/cms/seo.ts', import.meta.url), 'utf8');
  assert.match(source, /settings\.heroImage/, 'seo.ts consumes heroImage, so it must remain editable');
  // heroTitle/Tagline/Subtitle are only read in the no-document fallback branch of the homepage.
  const home = readFileSync(new URL('../src/pages/HomePage.tsx', import.meta.url), 'utf8');
  for (const field of ['heroTitle', 'heroTagline', 'heroSubtitle']) {
    const lines = home.split('\n').filter(line => line.includes(`siteSettings?.${field}`));
    assert.ok(lines.length > 0 && lines.every(line => /document \?/.test(line)), `${field} must only be a fallback`);
  }
});

test('interface text registry lists every supported key with its human label and default text', () => {
  const entries = uiCopyRegistry(SUPPORTED_UI_COPY, 'en');
  assert.deepEqual(entries.map(entry => entry.key), Object.keys(SUPPORTED_UI_COPY));
  for (const entry of entries) {
    assert.ok(entry.label && entry.label !== entry.key && !entry.label.includes('.'), `label for ${entry.key}: ${entry.label}`);
    for (const language of LANGS) assert.equal(typeof entry.defaults[language], 'string');
  }
  assert.equal(humanizeUiCopyKey('ui.common.bookNow'), 'Book now');
  assert.equal(uiCopyLabel('ui.common.bookNow', SUPPORTED_UI_COPY, 'en'), 'Book now');
  assert.equal(uiCopyLabel('ui.unknown.keyName', SUPPORTED_UI_COPY, 'en'), 'Key name');
});

test('interface text registry reads the enriched label/group/defaults shape defensively', () => {
  const entries = uiCopyRegistry({
    'ui.booking.cta': { label: { en: 'Booking button', fr: 'Bouton de réservation', es: 'Botón de reserva' }, group: 'Booking', defaults: { en: 'Book', fr: 'Réserver', es: 'Reservar' } },
    'ui.plain.thing': { en: 'Plain', fr: 'Simple', es: 'Sencillo' },
    'ui.odd.entry': { label: 'Odd label', defaults: { en: 'a' } },
  }, 'fr');
  assert.deepEqual(entries[0], { key: 'ui.booking.cta', label: 'Bouton de réservation', group: 'Booking', defaults: { en: 'Book', fr: 'Réserver', es: 'Reservar' } });
  assert.deepEqual(entries[1], { key: 'ui.plain.thing', label: 'Thing', group: 'Plain', defaults: { en: 'Plain', fr: 'Simple', es: 'Sencillo' } });
  assert.equal(entries[2].label, 'Odd label');
  assert.deepEqual(entries[2].defaults, { en: '', fr: '', es: '' });
});
