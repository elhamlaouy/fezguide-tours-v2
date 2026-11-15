// Public-site suite: every sitemap URL rendered in a real browser, SEO metadata, JSON-LD, links, edge redirects.
import assert from 'node:assert/strict';
import { loadPlaywright, makeSuite, pool } from './lib.mjs';

const BRAND = 'Fez Guide Tours';
const IGNORED_CONSOLE = /favicon/i;

export async function run(ctx) {
  const s = makeSuite('public', ctx);
  const { chromium } = loadPlaywright();
  const sitemap = await ctx.sitemapUrls();
  const toLocal = loc => { const u = new URL(loc); return u.pathname + u.search; };

  // --- robots + sitemap ---
  await s.check('/robots.txt is valid (allows the site, blocks /admin and /api/, points to the sitemap)', async () => {
    const r = await ctx.http('/robots.txt', { auth: false }); assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type') || '', /text\/plain/);
    const t = await r.text();
    assert.match(t, /^User-agent:\s*\*/mi); assert.match(t, /^Disallow:\s*\/admin/mi); assert.match(t, /^Disallow:\s*\/api\//mi); assert.match(t, /^Sitemap:\s*https:\/\/\S+\/sitemap\.xml/mi);
  });
  await s.check('/sitemap.xml is valid XML with unique https URLs for EN, FR and ES', async () => {
    const r = await ctx.http('/sitemap.xml', { auth: false }); assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type') || '', /xml/);
    const xml = await r.text(); assert.match(xml, /<urlset[^>]*sitemaps\.org/);
    assert.ok(sitemap.length >= 9, `only ${sitemap.length} URLs`);
    assert.equal(new Set(sitemap).size, sitemap.length, 'duplicate <loc>');
    for (const u of sitemap) assert.match(u, /^https:\/\/[^\s/]+\/\S*$/, `bad loc ${u}`);
    assert.ok(sitemap.some(u => /\/fr(\/|$)/.test(new URL(u).pathname)) && sitemap.some(u => /\/es(\/|$)/.test(new URL(u).pathname)), 'FR/ES missing');
  });

  // --- render every page ---
  const browser = await chromium.launch();
  const bctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, extraHTTPHeaders: ctx.accessHeaders() });
  ctx.failShot = null;
  const pages = []; // per-page facts
  const origin = ctx.baseUrl.origin;
  await pool(sitemap, 4, async loc => {
    const path = toLocal(loc);
    const page = await bctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error' && !IGNORED_CONSOLE.test(m.text())) errors.push(`console: ${m.text()}`); });
    let status = 0, facts = null, fail = null;
    try {
      const res = await page.goto(origin + path, { waitUntil: 'networkidle', timeout: 60000 });
      status = res.status();
      await page.waitForSelector('h1', { timeout: 15000 }).catch(() => {});
      facts = await page.evaluate(() => {
        const q = x => document.querySelector(x);
        const ld = [];
        const ldErrors = [];
        for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
          try { const j = JSON.parse(el.textContent); for (const n of (Array.isArray(j) ? j : [j])) { if (n && n['@graph']) ld.push(...n['@graph']); else ld.push(n); } } catch (e) { ldErrors.push(String(e.message)); }
        }
        const types = ld.flatMap(n => (Array.isArray(n?.['@type']) ? n['@type'] : [n?.['@type']])).filter(Boolean);
        const hrefs = [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'));
        return {
          title: document.title, description: q('meta[name=description]')?.getAttribute('content') || '',
          canonical: q('link[rel=canonical]')?.getAttribute('href') || '',
          hreflang: Object.fromEntries([...document.querySelectorAll('link[rel=alternate][hreflang]')].map(l => [l.getAttribute('hreflang'), l.getAttribute('href')])),
          h1: [...document.querySelectorAll('h1')].map(h => h.textContent.trim()),
          types, ldErrors, hrefs, hasBookingPrice: !!q('[data-price-product-id]'),
          internalLinks: document.querySelectorAll('a[href^="/"], a[href^="' + location.origin + '"]').length,
        };
      });
    } catch (e) { fail = e.message; }
    if ((fail || errors.length) && !ctx.noShots) await page.screenshot({ path: `${ctx.out}/public-${path.replace(/\W+/g, '_') || 'home'}.png` }).catch(() => {});
    await page.close();
    pages.push({ loc, path, status, facts, errors, fail });
  });
  await browser.close();
  pages.sort((a, b) => a.loc.localeCompare(b.loc));

  // Aggregated rule: one PASS/FAIL line per rule listing up to 8 offenders.
  const rule = async (title, test, { warnOnly = false } = {}) => {
    const bad = [];
    for (const p of pages) { try { const msg = test(p); if (msg) bad.push(`${p.path || '/'}: ${msg}`); } catch (e) { bad.push(`${p.path || '/'}: ${e.message}`); } }
    const detail = `${pages.length - bad.length}/${pages.length} pages`;
    if (warnOnly) { if (bad.length) s.warn(`${title} - ${bad.length} page(s): ${bad.slice(0, 8).join(' | ')}`); return; }
    await s.check(`${title} (${detail})`, async () => { if (bad.length) throw new Error(`${bad.length} failing: ${bad.slice(0, 8).join(' | ')}`); });
  };
  const usable = p => p.facts && !p.fail;
  const isHome = p => ['/', '/fr', '/es'].includes(p.path);

  await rule('every sitemap URL renders with status 200', p => (p.fail ? `render failed: ${p.fail}` : p.status !== 200 ? `status ${p.status}` : ''));
  await rule('exactly one <h1> after render', p => (usable(p) ? (p.facts.h1.length === 1 ? '' : `${p.facts.h1.length} h1`) : 'not rendered'));
  await rule(`<title> is present and ends with " | ${BRAND}" (or contains the brand)`, p => {
    if (!usable(p)) return 'not rendered'; const t = p.facts.title;
    return t && (t.endsWith(` | ${BRAND}`) || t.toLowerCase().replace(/\s/g, '').includes('fezguidetours')) ? '' : `title "${t}"`;
  });
  await rule('meta description present', p => (usable(p) ? (p.facts.description.trim() ? '' : 'missing') : 'not rendered'));
  await rule('meta description length within 120-160 characters', p => { if (!usable(p)) return ''; const n = p.facts.description.trim().length; return n >= 120 && n <= 160 ? '' : `${n} chars`; }, { warnOnly: true });
  await rule('canonical equals the sitemap URL', p => (usable(p) ? (p.facts.canonical === p.loc ? '' : `canonical "${p.facts.canonical}" != "${p.loc}"`) : 'not rendered'));
  await rule('hreflang en/fr/es/x-default present', p => {
    if (!usable(p)) return 'not rendered';
    const miss = ['en', 'fr', 'es', 'x-default'].filter(k => !p.facts.hreflang[k]); return miss.length ? `missing ${miss.join(',')}` : '';
  });
  await rule('JSON-LD parses and includes WebSite, TravelAgency and WebPage', p => {
    if (!usable(p)) return 'not rendered'; const f = p.facts;
    if (f.ldErrors.length) return `invalid JSON-LD (${f.ldErrors[0]})`;
    const miss = ['WebSite', 'TravelAgency', 'WebPage'].filter(t => !f.types.includes(t)); return miss.length ? `missing ${miss.join(',')} (have ${f.types.join(',') || 'none'})` : '';
  });
  await rule('BreadcrumbList JSON-LD on every non-home page', p => (usable(p) && !isHome(p) && !p.facts.types.includes('BreadcrumbList') ? `no BreadcrumbList (have ${p.facts.types.join(',')})` : ''));
  // Tour pages = CMS product pages whose product has a booking price (listing pages also show prices but are not Product pages).
  const doc = (await ctx.pubDoc()).document;
  const priced = new Set(doc.pages.filter(pg => pg.kind === 'product' && pg.enabled !== false && doc.products.find(pr => pr.id === pg.productId)?.price?.amount > 0).map(pg => `/${pg.slug}`));
  const tourPages = pages.filter(p => priced.has(p.path.replace(/^\/(fr|es)(?=\/)/, '')));
  if (!tourPages.length) s.warn('no priced tour pages found in the sitemap; Product JSON-LD not checked');
  await s.check(`Product JSON-LD on tour pages with a booking price (${tourPages.length} pages)`, async () => {
    const bad = tourPages.filter(p => !(usable(p) && p.facts.types.includes('Product'))).map(p => `${p.path} (have ${p.facts?.types.join(',')})`);
    if (bad.length) throw new Error(`${bad.length} missing Product: ${bad.slice(0, 8).join(' | ')}`);
  });
  await rule('rendered page has internal <a href> links', p => (usable(p) ? (p.facts.internalLinks > 0 ? '' : 'no internal links') : 'not rendered'));
  await rule('no page errors or console errors while rendering', p => (p.errors.length ? p.errors.slice(0, 2).join(' / ') : ''));

  // --- every distinct internal link resolves ---
  const links = new Map();
  for (const p of pages.filter(usable)) {
    for (const h of p.facts.hrefs) {
      if (!h || /^(mailto:|tel:|sms:|#|javascript:|whatsapp:)/i.test(h)) continue;
      let u; try { u = new URL(h, origin + p.path); } catch { continue; }
      const internal = u.origin === origin || u.hostname === 'fezguidetours.com' || u.hostname === 'www.fezguidetours.com';
      if (!internal) continue;
      const path = u.pathname + u.search; if (/^\/(api|admin)(\/|$)/.test(path)) continue;
      if (!links.has(path)) links.set(path, p.path || '/');
    }
  }
  await s.check(`every distinct internal link returns 200 (${links.size} links)`, async () => {
    const entries = [...links]; const bad = [];
    await pool(entries, 8, async ([path, from]) => {
      let r; try { r = await ctx.http(path, { auth: false, headers: { Accept: 'text/html' } }); } catch (e) { bad.push(`${path} (from ${from}): ${e.message}`); return; }
      if (r.status !== 200) bad.push(`${path} (from ${from}): ${r.status}`); await r.arrayBuffer().catch(() => {});
    });
    if (bad.length) throw new Error(`${bad.length} broken: ${bad.slice(0, 8).join(' | ')}`);
  });

  // --- production-only edge behaviour ---
  const prodOnly = (title, fn) => (ctx.production ? s.check(title, fn) : s.skip_(title, 'production only'));
  await prodOnly('www.fezguidetours.com redirects 301 to the apex, keeping path and query', async () => {
    const r = await fetch('https://www.fezguidetours.com/x?y=1', { redirect: 'manual' });
    assert.equal(r.status, 301); assert.equal(r.headers.get('location'), 'https://fezguidetours.com/x?y=1');
  });
  await prodOnly('app.fezguidetours.com without credentials is sent to Cloudflare Access', async () => {
    const r = await fetch('https://app.fezguidetours.com/', { redirect: 'manual' });
    assert.equal(r.status, 302); assert.match(r.headers.get('location') || '', /cloudflareaccess\.com/);
  });
  const anon = { 'CF-Access-Client-Id': 'nobody.access' };
  await prodOnly('/admin without valid credentials is sent to Cloudflare Access', async () => {
    const r = await ctx.http('/admin', { headers: anon, auth: false }); assert.ok([302, 401, 403].includes(r.status), String(r.status));
    if (r.status === 302) assert.match(r.headers.get('location') || '', /cloudflareaccess\.com/);
  });
  await prodOnly('/api/admin/content without valid credentials is refused', async () => {
    const r = await ctx.http('/api/admin/content', { headers: anon, auth: false }); assert.ok([302, 401, 403].includes(r.status), String(r.status));
  });
  return s;
}
