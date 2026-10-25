import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'tsx/esm/api';
register();
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { Window } = await import('happy-dom');
const { Navbar } = await import('../src/components/Navbar.tsx');
const { Footer } = await import('../src/components/Footer.tsx');
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
      assert.ok(row.querySelector('nav').classList.contains('xl:flex'));
      assert.ok(actions.querySelector('button.xl\\:hidden'));
      assert.ok(!row.className.includes('overflow-hidden'), 'do not mask overflow on the row');
    } finally { await window.happyDOM.close(); }
  });
}

// At 1024px six localized links plus booking/language actions squeeze even
// the normal wordmark to 4 lines; use the existing drawer until 1280px.
test('localized tablet navigation uses the existing compact drawer breakpoint', async () => {
  const window = new Window();
  try {
    const document = { schemaVersion: 1, siteSettings: { siteName: 'Isolated CMS test' }, pages: [], navigation: [], products: [], uiCopy: {}, legacy: { tours: [], customPages: [] }, blogPosts: [], teamMembers: [], faqs: [] };
    window.document.body.innerHTML = renderToStaticMarkup(createElement(CmsPreviewProvider, { document },
      createElement(Navbar, { currentPage: 'home', language: 'fr', onNavigate() {}, onLanguageChange() {}, onOpenBooking() {} })));
    const row = window.document.querySelector('header > div');
    assert.ok(row.querySelector('nav').classList.contains('xl:flex'));
    assert.ok(!row.querySelector('nav').classList.contains('lg:flex'));
    assert.ok(row.lastElementChild.querySelector('button.xl\\:hidden'));
  } finally { await window.happyDOM.close(); }
});

// These contracts address the reproduced 320px overflow; not geometry assertions.
for (const language of ['en', 'fr', 'es']) {
  for (const siteName of [
    'Isolated CMS test — long multilingual brand for mobile checks',
    'IsolatedCMSTestLongMultilingualBrandForMobileChecksSansEspaces',
  ]) {
    test(`long brand sizing contracts (${language}, ${siteName})`, async () => {
      const window = new Window();
      try {
        const document = { schemaVersion: 1, siteSettings: { siteName, licenseBadge: {}, address: {}, phoneNumber: '', email: '' }, pages: [], navigation: [], products: [], uiCopy: {}, footer: { text: {} }, legacy: { tours: [], customPages: [] }, blogPosts: [], teamMembers: [], faqs: [] };
        window.document.body.innerHTML = renderToStaticMarkup(createElement(CmsPreviewProvider, { document },
          createElement(Navbar, { document, currentPage: 'home', language, onNavigate() {}, onLanguageChange() {}, onOpenBooking() {} }),
          createElement(Footer, { document, language, onNavigate() {} })));
        const row = window.document.querySelector('header > div');
        assert.ok(row.classList.contains('min-h-20'), 'row must grow around wrapped text while retaining its normal 80px minimum');
        assert.ok(!row.classList.contains('h-20'), 'fixed height lets wrapped brand escape the row');
        assert.ok(row.classList.contains('py-2'), 'wrapped text needs safe vertical padding');
        assert.ok(row.querySelector('nav').classList.contains('shrink-0'), 'desktop navigation must retain its width beside a long brand');
        const logos = window.document.querySelectorAll('[aria-label]');
        const brandLogos = [...logos].filter(node => node.getAttribute('aria-label') === `${siteName} Logo`);
        assert.equal(brandLogos.length, 2);
        for (const logo of brandLogos) {
          assert.equal(logo.textContent, siteName, 'preserve the complete exact brand');
          for (const token of ['min-w-0', 'max-w-full']) assert.ok(logo.classList.contains(token), `shared logo needs ${token}`);
          const text = logo.lastElementChild;
          for (const token of ['min-w-0', 'whitespace-normal', '[overflow-wrap:anywhere]']) assert.ok(text.classList.contains(token), `shared text needs ${token} at all breakpoints`);
          assert.ok(text.firstElementChild.classList.contains('min-w-0'), 'text flex child must shrink');
          assert.ok(!text.classList.contains('whitespace-nowrap'));
          assert.ok(!/truncate|overflow-hidden|line-clamp/.test(logo.className + text.className));
        }
        const footerLogo = brandLogos[1];
        assert.ok(footerLogo.parentElement.classList.contains('max-w-full'), 'footer padded badge must stay within its column');
        assert.ok(footerLogo.parentElement.parentElement.classList.contains('min-w-0'), 'footer grid item must release intrinsic width');
      } finally { await window.happyDOM.close(); }
    });
  }
}
