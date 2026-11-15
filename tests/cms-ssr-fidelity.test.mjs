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
const { PublicPageSwitch } = await import('../src/App.tsx');
await (await import('../src/cms/ApprovedPageRenderer.tsx')).preloadApprovedLayouts();
const { CmsPreviewProvider } = await import('../src/context/CmsContext.tsx');
const { Navbar } = await import('../src/components/Navbar.tsx');
const { Footer } = await import('../src/components/Footer.tsx');
const { buildSnapshot } = await import('../worker/ssr-snapshot.ts');
const { createCmsSeed } = await import('../src/cms/seed.ts');
const { pageLocaleAvailable } = await import('../src/cms/render-utils.ts');
const { pagePath } = await import('../src/cms/routing.ts');

/** The page exactly as the app renders it for a visitor: shell + routed page. */
const clientHtml = (document, pageId, language) => renderToStaticMarkup(createElement(CmsPreviewProvider, { document }, createElement('div', null,
  createElement(Navbar, { currentPage: pageId, language, document, onNavigate() {}, onLanguageChange() {}, onOpenBooking() {} }),
  createElement('main', null, createElement(PublicPageSwitch, { document, pageId, language, onNavigate() {}, onBook() {}, legacy: null })),
  createElement(Footer, { language, document, onNavigate() {} }))));

const decode = value => value.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16))).replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const textNodes = html => html.replace(/<(script|style)[\s\S]*?<\/\1>/g, '').split(/<[^>]*>/).map(value => decode(value).replace(/\s+/g, ' ').trim()).filter(Boolean);
const headings = (html, level) => [...html.matchAll(new RegExp(`<${level}[^>]*>([\\s\\S]*?)</${level}>`, 'g'))].map(match => decode(match[1].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim());

function compare(document, label) {
  let pages = 0;
  for (const page of document.pages) for (const language of ['en', 'fr', 'es']) {
    if (!pageLocaleAvailable(document, page, language)) continue;
    pages++;
    const snapshot = buildSnapshot(document, page, language);
    const client = clientHtml(document, page.id, language);
    const visible = ` ${textNodes(client).join(' ')} `;
    const missing = textNodes(snapshot).filter(node => !visible.includes(node));
    assert.deepEqual(missing, [], `${label} ${page.id}/${language}: snapshot text that the rendered page does not show`);
    assert.deepEqual(headings(snapshot, 'h1'), headings(client, 'h1').slice(0, 1), `${label} ${page.id}/${language}: same single H1`);
    // Every link target is one the app renders too, or the route of another public page (the blog list opens posts inline).
    const links = new Set([...client.matchAll(/ href="([^"]*)"/g)].map(match => decode(match[1])));
    for (const other of document.pages) if (pageLocaleAvailable(document, other, language)) links.add(pagePath(document, other.id, language));
    for (const [, href] of snapshot.matchAll(/ href="([^"]*)"/g)) assert.ok(links.has(decode(href)), `${label} ${page.id}/${language}: link ${href} is not a link of the rendered page`);
  }
  return pages;
}

test('every snapshot text node and link of every seed page appears in the client-rendered page, per language', () => {
  assert.equal(compare(createCmsSeed(), 'seed'), 81);
});

test('fidelity holds after editor changes: hidden sections, hidden pages, disabled links, locale fallback', () => {
  const document = createCmsSeed();
  const page = id => document.pages.find(item => item.id === id);
  page('fez').sections.find(section => section.id === 'introduction').enabled = false;
  page('fez-things-to-do').enabled = false;
  page('home').sections.find(section => section.id === 'contact').links[0].enabled = false;
  page('day-trips').sections.find(section => section.id === 'promises').enabled = false;
  page('daytrip-meknes').sections.find(section => section.id === 'itinerary').enabled = false;
  page('daytrip-ifrane').sections.find(section => section.id === 'booking').enabled = false;
  document.navigation.find(link => link.pageId === 'about').enabled = false;
  document.footer.links = document.footer.links.slice(0, 3);
  page('about').localeFallback = { fr: 'en' };
  page('about').title.fr = '';
  document.products.find(product => product.id === 'daytrip-custom').published = false;
  assert.ok(compare(document, 'edited') > 60);
});
