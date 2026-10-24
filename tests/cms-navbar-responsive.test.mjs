import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'tsx/esm/api';
register();
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { Window } = await import('happy-dom');
const { Navbar } = await import('../src/components/Navbar.tsx');
const { CmsPreviewProvider } = await import('../src/context/CmsContext.tsx');

// Structural rendered regression only: happy-dom does not calculate CSS geometry.
// Deliberately synthetic shell document: no owner content or network requests.
for (const language of ['en', 'fr', 'es']) {
  test(`structural mobile flex sizing accommodates synthetic brand (${language})`, async () => {
    const window = new Window();
    try {
      const document = { schemaVersion: 1, siteSettings: { siteName: 'Isolated CMS test' }, pages: [], navigation: [], products: [], uiCopy: {}, legacy: { tours: [], customPages: [] }, blogPosts: [], teamMembers: [], faqs: [] };
      window.document.body.innerHTML = renderToStaticMarkup(createElement(CmsPreviewProvider, { document },
        createElement(Navbar, { document, currentPage: 'home', language, onNavigate() {}, onLanguageChange() {}, onOpenBooking() {} })));
      const row = window.document.querySelector('header > div');
      const brand = row.firstElementChild;
      const logo = brand.firstElementChild;
      const actions = row.lastElementChild;
      assert.ok(brand.classList.contains('min-w-0'), 'brand flex item must be allowed below intrinsic nowrap width');
      assert.ok(logo.classList.contains('min-w-0'), 'logo must shrink within its brand slot');
      assert.ok(logo.classList.contains('max-lg:[&>div:last-child]:whitespace-normal'), 'mobile brand text must wrap rather than push actions out');
      assert.ok(logo.classList.contains('max-lg:[&>div:last-child>span]:min-w-0'), 'text span must release its flex min-content width');
      assert.ok(logo.classList.contains('max-lg:[&>div:last-child]:[overflow-wrap:anywhere]'), 'unbroken synthetic brand tokens may wrap');
      assert.ok(actions.classList.contains('shrink-0'), 'language and mobile-menu actions retain their width');
      assert.equal(logo.getAttribute('aria-label'), 'Isolated CMS test Logo');
      assert.equal(logo.getAttribute('role'), 'button');
      assert.equal(logo.getAttribute('tabindex'), '0');
      assert.ok(logo.textContent.includes('Isolated CMS test'));
      assert.ok(row.querySelector('nav').classList.contains('lg:flex'));
      assert.ok(actions.querySelector('button.lg\\:hidden'));
      assert.ok(!row.className.includes('overflow-hidden'), 'do not mask overflow on the row');
    } finally { await window.happyDOM.close(); }
  });
}
