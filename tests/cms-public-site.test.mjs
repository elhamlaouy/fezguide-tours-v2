import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
const { fetchPublishedDocument, loadAdminApp, publishedPage } = await import('../src/cms/public-document.ts');
const { default: App, PublicPageSwitch } = await import('../src/App.tsx');
const { CmsProvider } = await import('../src/context/CmsContext.tsx');
const { Navbar } = await import('../src/components/Navbar.tsx');
const { Footer } = await import('../src/components/Footer.tsx');

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const jsonResponse = (body, ok = true) => ({ ok, status: ok ? 200 : 404, json: async () => body });

test('document fetch failure keeps a marker from the old home path', async () => {
  const missing = await fetchPublishedDocument({ fetch: async () => jsonResponse({ error: 'not_found' }, false) });
  const invalid = await fetchPublishedDocument({ fetch: async () => jsonResponse({ version: 1, document: { schemaVersion: 99 } }) });
  const absent = await fetchPublishedDocument({ fetch: async () => jsonResponse({ version: null, document: null }) });
  assert.equal(missing, null);
  assert.equal(invalid, null);
  assert.equal(absent, null);

  const context = read('src/context/CmsContext.tsx');
  assert.match(context, /fetch\('\/api\/cms'/);
  assert.match(context, /fetchPublishedDocument/);
  assert.match(context, /PROTECTED_FEZ_TOUR_IDS/);

  const html = renderToStaticMarkup(createElement(PublicPageSwitch, {
    document: missing,
    pageId: 'home',
    language: 'en',
    onNavigate() {},
    onBook() {},
    legacy: createElement(App),
  }));
  assert.match(html, /View All Tours/);
  assert.match(html, /Atlas Tactics/);
  assert.match(html, /Contact guide on WhatsApp/);
  assert.equal(html.includes('data-section-id='), false);
});

test('a valid document renders a CMS section id', async () => {
  const { createCmsSeed } = await import('../src/cms/seed.ts');
  const seed = createCmsSeed();
  const document = await fetchPublishedDocument({
    fetch: async (url) => {
      assert.equal(url, '/api/cms/document');
      return jsonResponse({ version: 1, document: seed });
    },
  });
  assert.ok(document);
  assert.equal(publishedPage(document, 'experience-detail', 'our-fez-tours')?.id, 'our-fez-tours');
  assert.equal(publishedPage(document, 'bespoke-morocco-experiences')?.id, 'page-bespoke-itinerary');
  assert.equal(publishedPage(document, 'not-a-real-page'), undefined);

  const booked = [];
  const home = renderToStaticMarkup(createElement(PublicPageSwitch, {
    document,
    pageId: 'home',
    language: 'en',
    onNavigate() {},
    onBook(id) { booked.push(id); },
    legacy: createElement('div', null, 'View All Tours'),
  }));
  assert.match(home, /data-section-id="hero"/);
  assert.equal(home.includes('View All Tours'), false);

  for (const pageId of ['about', 'travel-tips']) {
    const editorial = renderToStaticMarkup(createElement(PublicPageSwitch, {
      document,
      pageId,
      language: 'fr',
      onNavigate() {},
      onBook(id) { booked.push(id); },
      legacy: createElement('div', null, 'OLD_PAGE'),
    }));
    assert.equal(editorial.includes('OLD_PAGE'), false, pageId);
    assert.equal(/data-action="book"/.test(editorial), false, pageId);
  }
  assert.deepEqual(booked, []);
});

test('canonical documents never leak legacy pages for absent or disabled routes', async () => {
  const { createCmsSeed } = await import('../src/cms/seed.ts');
  const document = createCmsSeed();
  document.pages.find(page => page.id === 'about').enabled = false;
  for (const pageId of ['missing-page', 'about']) {
    const html = renderToStaticMarkup(createElement(PublicPageSwitch, {
      document, pageId, language: 'fr', onNavigate() {}, onBook() {},
      legacy: createElement('div', null, 'LEGACY-LEAK'),
    }));
    assert.doesNotMatch(html, /LEGACY-LEAK/);
    assert.match(html, /404/);
    assert.match(html, /Page introuvable/);
  }
});

const text = (en, fr, es) => ({ en, fr, es });

function shellMarkup(document, language = 'en') {
  return renderToStaticMarkup(createElement(CmsProvider, null,
    createElement('div', null,
      createElement(Navbar, {
        currentPage: 'home',
        language,
        document,
        onNavigate() {},
        onLanguageChange() {},
        onOpenBooking() {},
      }),
      createElement(Footer, { language, document, onNavigate() {} }),
    ),
  ));
}

function shellDocument(createCmsSeed) {
  const document = structuredClone(createCmsSeed());
    const home = document.navigation.find((link) => link.pageId === 'home');
    home.label = text('CMS Home EN', 'CMS Home FR', 'CMS Home AR');
    document.navigation.push({
      id: 'hidden-nav',
      label: text('Hidden Nav Link', 'Hidden Nav Link', 'Hidden Nav Link'),
      enabled: false,
      pageId: 'home',
    });
    document.pages.find((page) => page.id === 'about').enabled = false;
    document.footer = {
      text: text('CMS Footer EN', 'CMS Footer FR', 'CMS Footer AR'),
      links: [
        { id: 'footer-home', label: text('CMS Footer Home EN', 'CMS Footer Home FR', 'CMS Footer Home AR'), enabled: true, pageId: 'home' },
        { id: 'footer-about', label: text('Disabled Page Link', 'Disabled Page Link', 'Disabled Page Link'), enabled: true, pageId: 'about' },
        { id: 'footer-off', label: text('Disabled Footer Link', 'Disabled Footer Link', 'Disabled Footer Link'), enabled: false, pageId: 'home' },
        { id: 'footer-atlas', label: text('Atlas Tactics', 'Atlas Tactics', 'Atlas Tactics'), enabled: true, href: 'https://atlastactics.com' },
        { id: 'footer-ext', label: text('CMS External EN', 'CMS External FR', 'CMS External AR'), enabled: true, href: 'https://example.test/visit' },
        { id: 'footer-bad', label: text('CMS Bad Link', 'CMS Bad Link', 'CMS Bad Link'), enabled: true, href: 'javascript:alert(1)' },
      ],
    };
    document.siteSettings = {
      ...document.siteSettings,
      phoneNumber: '+212 600-000001',
      whatsappNumber: '212600000001',
      email: 'cms-shell@example.test',
      address: text('CMS Address EN', 'CMS Address FR', 'CMS Address AR'),
      googleMaps: 'https://maps.example.test/fez',
    };
    document.uiCopy = {
      ...document.uiCopy,
      'ui.nav.bookTour': text('CMS Book EN', 'CMS Book FR', 'CMS Book AR'),
      'ui.footer.contactTitle': text('CMS Contact EN', 'CMS Contact FR', 'CMS Contact AR'),
      'ui.footer.copyright': text('CMS Copyright EN', 'CMS Copyright FR', 'CMS Copyright AR'),
      'ui.common.allDepartments': text('CMS Departments EN', 'CMS Departments FR', 'CMS Departments AR'),
      'ui.common.whatsappChat': text('CMS WhatsApp EN', 'CMS WhatsApp FR', 'CMS WhatsApp AR'),
    };
    return document;
}

test('a published document drives nav, footer, and contact', async () => {
  const { createCmsSeed } = await import('../src/cms/seed.ts');
  const document = shellDocument(createCmsSeed);
  const html = shellMarkup(document, 'fr');
  assert.match(html, /CMS Home FR/);
  assert.match(html, /CMS Book FR/);
  assert.match(html, /CMS Footer FR/);
  assert.match(html, /CMS Footer Home FR/);
  assert.match(html, /CMS Contact FR/);
  assert.match(html, /CMS Copyright FR/);
  assert.match(html, /CMS Departments FR/);
  assert.match(html, /CMS Address FR/);
  assert.match(html, /CMS External FR/);
  assert.match(html, /href="https:\/\/example\.test\/visit"/);
  assert.match(html, /href="https:\/\/maps\.example\.test\/fez"/);
  assert.match(html, /\+212 600-000001/);
  assert.match(html, /cms-shell@example\.test/);
  assert.match(html, /wa\.me\/212600000001/);
  assert.equal(html.includes('Hidden Nav Link'), false);
  assert.equal(html.includes('Disabled Page Link'), false);
  assert.equal(html.includes('Disabled Footer Link'), false);
  assert.equal(html.includes('CMS Bad Link'), false);
  assert.equal(html.includes('À Propos'), false);
  assert.equal(html.includes('+212 719-603009'), false);
  assert.equal(html.includes('fezguidetours1@gmail.com'), false);
  assert.equal((html.match(/href="https:\/\/atlastactics\.com"/g) || []).length, 1);
  assert.equal((html.match(/https:\/\/atlastactics\.com/g) || []).length, 1);
  assert.equal((read('src/App.tsx').match(/document=\{publishedDocument\}/g) || []).length, 3);
});

test('canonical shell filters links in the active locale, not English', async () => {
  const { createCmsSeed } = await import('../src/cms/seed.ts');
  const { validateCmsDocument } = await import('../src/cms/schema.ts');
  const { Window } = await import('happy-dom');
  const document = createCmsSeed();
  const spanishOnly = { id: 'spanish-only', label: text('', '', 'Enlace español único'), enabled: true, pageId: 'home' };
  const missingSpanish = { id: 'missing-spanish', label: text('English only sentinel', 'Français seulement', ''), enabled: true, pageId: 'home' };
  document.navigation = [spanishOnly, missingSpanish];
  document.footer.links = [spanishOnly, missingSpanish];
  assert.equal(validateCmsDocument(document).valid, true);
  const spanish = shellMarkup(document, 'es');
  assert.equal((spanish.match(/Enlace español único/g) || []).length, 2);
  assert.doesNotMatch(spanish, /English only sentinel|Français seulement/);
  const dom = new Window();
  dom.document.body.innerHTML = spanish;
  for (const button of dom.document.querySelectorAll('nav button, footer button')) {
    assert.ok(button.textContent.trim() || button.getAttribute('aria-label'), 'no unnamed focusable shell buttons');
  }
  await dom.happyDOM.close();
  assert.match(shellMarkup(document, 'en'), /English only sentinel/);
  assert.match(shellMarkup(document, 'fr'), /Français seulement/);
  missingSpanish.label.fr = '';
  assert.match(shellMarkup(document, 'fr'), /English only sentinel/, 'French retains the existing English fallback');
});

test('missing or invalid document keeps the hardcoded shell and source contact', () => {
  const missing = shellMarkup(null);
  const invalid = shellMarkup({ schemaVersion: 99 });
  for (const html of [missing, invalid]) {
    assert.match(html, /Book an Experience/);
    assert.match(html, />Home</);
    assert.match(html, /Day Trips/);
    assert.match(html, /\+212 719-603009/);
    assert.match(html, /fezguidetours1@gmail\.com/);
    assert.match(html, /Bab Boujloud, Medina of Fez, 30110 Morocco/);
    assert.equal(html.includes('CMS Home EN'), false);
    assert.equal((html.match(/href="https:\/\/atlastactics\.com"/g) || []).length, 1);
  }
});

test('worker runs before assets for admin and api routes', () => {
  const wrangler = read('wrangler.toml');
  assert.match(wrangler, /run_worker_first = \["\/\*", "!\/assets\/\*", "!\/images\/\*", "!\/fonts\/\*", "!\/favicon\.svg"\]/);
  assert.match(wrangler, /id = "49f69448fb834d4496a05e0d41b19b3c"/);
  assert.match(wrangler, /binding = "CMS_DB"/);
  assert.match(wrangler, /binding = "CMS_MEDIA"/);
  assert.match(wrangler, /binding = "CMS_IMAGES"/);
  assert.equal(wrangler.includes('00000000-0000-0000-0000-000000000000'), false);
});

test('/admin dynamic import is attempted', async () => {
  const source = read('src/cms/public-document.ts');
  const app = read('src/App.tsx');
  assert.match(source, /import\(\s*['"]\.\.\/admin\/AdminApp['"]\s*\)/);
  assert.match(app, /loadAdminApp\(/);
  assert.match(app, /isAdminPath/);
  const loaded = await loadAdminApp();
  assert.ok(loaded === null || typeof loaded.AdminApp === 'function');
});

test('initial public snapshot is reused without fetching a newer revision, including an empty public projection', async () => {
  const { createCmsSeed } = await import('../src/cms/seed.ts');
  const { publicCmsDocument } = await import('../worker/cms-routes.ts');
  const document = createCmsSeed();
  const originalDocument = globalThis.document;
  let fetches = 0;
  globalThis.document = { getElementById: () => ({ textContent: JSON.stringify(document) }) };
  try {
    const fetch = async () => { fetches++; return jsonResponse({ document: null }); };
    assert.equal((await fetchPublishedDocument({ fetch })).pages[0].id, document.pages[0].id);
    assert.equal(fetches, 0);
    for (const page of document.pages) page.enabled = false;
    const empty = publicCmsDocument(document);
    globalThis.document.getElementById = () => ({ textContent: JSON.stringify(empty) });
    assert.deepEqual((await fetchPublishedDocument({ fetch })).pages, []);
    assert.equal(fetches, 0, 'an empty published site must not become legacy fallback');
    globalThis.document.getElementById = () => ({ textContent: '{broken' });
    assert.equal(await fetchPublishedDocument({ fetch }), null);
    assert.equal(fetches, 1, 'invalid embedded payload falls back to the validated API');
  } finally { if (originalDocument) globalThis.document = originalDocument; else delete globalThis.document; }
});
