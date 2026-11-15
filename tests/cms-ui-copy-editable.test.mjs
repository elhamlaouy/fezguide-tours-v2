import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { register } from 'tsx/esm/api';

register();
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.css')) return { format: 'module', source: 'export default "";', shortCircuit: true };
    return nextLoad(url, context);
  },
});

const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { PageRenderer } = await import('../src/cms/PageRenderer.tsx');
const { CmsProvider } = await import('../src/context/CmsContext.tsx');
const { Footer } = await import('../src/components/Footer.tsx');
const { HARDCODED_UI_COPY, SUPPORTED_UI_COPY, UI_COPY_META, copyText } = await import('../src/cms/ui-copy.ts');
await (await import('../src/cms/ApprovedPageRenderer.tsx')).preloadApprovedLayouts();

const LANGUAGES = ['en', 'fr', 'es'];
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
const renderPage = (document, page, language) => renderToStaticMarkup(createElement(PageRenderer, { document, page, language, onNavigate() {}, onBook() {} }));
const renderFooter = (document, language) => renderToStaticMarkup(createElement(CmsProvider, null, createElement(Footer, { document, language, onNavigate() {}, onOpenAdmin() {} })));
/** Every public page and the footer in one language: the surface on which a text can appear. */
function surface(document, language) {
  return document.pages.filter(page => page.enabled).map(page => renderPage(document, page, language)).join('\n') + renderFooter(document, language);
}
const vars = { 'ui.filter.allExperiences': 4, 'ui.filter.allDayTrips': 4, 'ui.filter.allFood': 4 };

test('every new key has a registry entry with label, group and EN/FR/ES defaults, and is a supported UI-copy key', () => {
  assert.ok(HARDCODED_UI_COPY.length >= 25);
  assert.equal(new Set(HARDCODED_UI_COPY.map(item => item.key)).size, HARDCODED_UI_COPY.length);
  for (const item of HARDCODED_UI_COPY) {
    for (const language of LANGUAGES) for (const field of ['label', 'group']) assert.ok(item[field][language]?.trim(), `${item.key}.${field}.${language}`);
    for (const language of LANGUAGES) assert.equal(typeof item.defaults[language], 'string', item.key);
    assert.deepEqual(SUPPORTED_UI_COPY[item.key], item.defaults);
    assert.deepEqual(UI_COPY_META[item.key], { label: item.label, group: item.group });
  }
});

test('with today\'s data (no new keys in the document) every default is visible exactly as before, in every language', () => {
  const document = createCmsSeed();
  for (const item of HARDCODED_UI_COPY) delete document.uiCopy[item.key];
  const html = Object.fromEntries(LANGUAGES.map(language => [language, surface(document, language)]));
  for (const item of HARDCODED_UI_COPY) {
    for (const language of LANGUAGES) {
      const expected = copyText(document, item.key, language, { count: 4 });
      assert.equal(expected, (item.defaults[language] || item.defaults.en).replace('{count}', '4'), `${item.key}.${language}`);
      const pattern = new RegExp(escape(copyText(document, item.key, language, { count: '@@' })).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('@@', '\\d+'));
      assert.ok(pattern.test(html[language]), `${item.key}.${language}: default "${expected}" is not rendered`);
    }
  }
});

test('setting each new key in uiCopy changes the rendered output in EN, FR and ES', () => {
  const baseline = createCmsSeed();
  const seen = new Set();
  for (const language of LANGUAGES) {
    const document = structuredClone(baseline);
    for (const item of HARDCODED_UI_COPY) document.uiCopy[item.key] = Object.fromEntries(LANGUAGES.map(code => [code, `EDITED ${item.key} ${code} {count}`]));
    const html = surface(document, language);
    for (const item of HARDCODED_UI_COPY) {
      const marker = `EDITED ${item.key} ${language}`;
      const hit = html.includes(marker);
      if (hit) seen.add(`${item.key}.${language}`);
      // Interaction-only or data-dependent surfaces are asserted below with dedicated renders.
    }
  }
  const missing = HARDCODED_UI_COPY.flatMap(item => LANGUAGES.map(language => `${item.key}.${language}`)).filter(id => !seen.has(id));
  assert.deepEqual(missing, [], 'keys not reachable through any public render');
});

test('the count placeholder is replaced by the automatic number and removable by the owner', () => {
  assert.equal(copyText(null, 'ui.filter.allDayTrips', 'en', { count: 7 }), 'All Day Trips (7)');
  assert.equal(copyText(null, 'ui.filter.allDayTrips', 'es', { count: 7 }), 'Todas las excursiones de un día');
  const document = createCmsSeed();
  document.uiCopy['ui.filter.allFood'] = { en: 'Everything', fr: 'Tout ({count})', es: 'Todo' };
  assert.equal(copyText(document, 'ui.filter.allFood', 'en', { count: 7 }), 'Everything');
  assert.equal(copyText(document, 'ui.filter.allFood', 'fr', { count: 7 }), 'Tout (7)');
  const html = renderPage(document, document.pages.find(page => page.id === 'food-tours'), 'en');
  assert.ok(html.includes('Everything'));
  assert.equal(html.includes('All Food Experiences'), false);
});

test('uiCopy values are plain text, never markup', () => {
  const document = createCmsSeed();
  document.uiCopy['ui.reviews.ratingBadge'] = { en: '<img src=x onerror=alert(1)> 4.9 / 5', fr: 'x', es: 'x' };
  const page = document.pages.find(item => item.sections.some(section => section.type === 'reviews'));
  const html = renderPage(document, page, 'en');
  assert.equal(html.includes('<img src=x'), false);
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt; 4.9 / 5'));
});

test('footer phone suffix is editable and can be emptied without a dangling space', () => {
  const document = createCmsSeed();
  document.uiCopy['ui.footer.whatsappSuffix'] = { en: '(Call us anytime)', fr: '(Appelez-nous)', es: '(Llámanos)' };
  assert.ok(renderFooter(document, 'en').includes('(Call us anytime)'));
  assert.ok(renderFooter(document, 'fr').includes('(Appelez-nous)'));
  assert.ok(renderFooter(document, 'es').includes('(Llámanos)'));
  document.uiCopy['ui.footer.whatsappSuffix'] = { en: '', fr: '', es: '' };
  assert.equal(renderFooter(document, 'en').includes('WhatsApp 24/7'), false);
});

test('homepage trust badge with no text in the current language is not rendered at all', () => {
  const document = createCmsSeed();
  const home = document.pages.find(page => page.id === 'home');
  const trust = home.sections.find(section => section.id === 'trust');
  assert.ok(trust.items.length >= 3);
  const count = html => (html.match(/bg-white\/40 px-3 py-1 rounded-lg border border-white\/30/g) || []).length;
  const before = count(renderPage(document, home, 'en'));
  assert.equal(before, trust.items.length);
  trust.items[0].title = { en: '', fr: trust.items[0].title.fr, es: trust.items[0].title.es };
  trust.items[0].description = { en: '', fr: trust.items[0].description?.fr ?? '', es: trust.items[0].description?.es ?? '' };
  assert.equal(count(renderPage(document, home, 'en')), before - 1);
  assert.equal(count(renderPage(document, home, 'fr')), before);
});

test('the editor lists every new interface text with its human label and group (EN/FR/ES)', async () => {
  const { uiCopyRegistry } = await import('../src/admin/ui-copy-registry.ts');
  const { SUPPORTED_UI_COPY, HARDCODED_UI_COPY } = await import('../src/cms/ui-copy.ts');
  for (const language of ['en', 'fr', 'es']) {
    const entries = new Map(uiCopyRegistry(SUPPORTED_UI_COPY, language).map(entry => [entry.key, entry]));
    for (const item of HARDCODED_UI_COPY) {
      const entry = entries.get(item.key);
      assert.ok(entry, `${item.key} listed`);
      assert.equal(entry.label, item.label[language], `${item.key} label (${language})`);
      assert.equal(entry.group, item.group[language], `${item.key} group (${language})`);
      assert.deepEqual(entry.defaults, item.defaults, `${item.key} defaults`);
    }
  }
});
