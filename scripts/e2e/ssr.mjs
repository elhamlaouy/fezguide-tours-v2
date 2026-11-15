// SSR suite (run with --expect-ssr): the raw HTML, without JavaScript, must already contain the page.
// A browser context with JavaScript disabled parses the raw server response, so we inspect the exact snapshot a crawler sees.
import { loadPlaywright, makeSuite, pool } from './lib.mjs';

const MIN_TEXT = 200;
const norm = t => t.replace(/\s+/g, ' ').trim();

export async function run(ctx) {
  const s = makeSuite('ssr', ctx);
  const { chromium } = loadPlaywright();
  const sitemap = await ctx.sitemapUrls();
  const origin = ctx.baseUrl.origin;
  const browser = await chromium.launch();
  const headers = ctx.accessHeaders();
  const rawCtx = await browser.newContext({ javaScriptEnabled: false, extraHTTPHeaders: headers });
  const liveCtx = await browser.newContext({ viewport: { width: 1280, height: 900 }, extraHTTPHeaders: headers });

  const rows = [];
  await pool(sitemap, 4, async loc => {
    const path = new URL(loc).pathname + new URL(loc).search;
    const raw = await rawCtx.newPage(); const live = await liveCtx.newPage();
    const row = { path, problems: [] };
    try {
      const rr = await raw.goto(origin + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
      row.status = rr.status();
      row.snapshot = await raw.evaluate(() => {
        const root = document.getElementById('root');
        if (!root) return { hasRoot: false };
        const chunks = []; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) { if (!n.parentElement?.closest('script,style,noscript,template')) chunks.push(n.textContent); }
        return { hasRoot: true, h1: [...root.querySelectorAll('h1')].map(h => h.textContent), text: root.textContent, chunks, links: root.querySelectorAll('a[href]').length, internalLinks: [...root.querySelectorAll('a[href]')].filter(a => /^\//.test(a.getAttribute('href'))).length };
      });
      await live.goto(origin + path, { waitUntil: 'networkidle', timeout: 60000 });
      await live.waitForSelector('h1', { timeout: 15000 }).catch(() => {});
      row.live = await live.evaluate(() => ({ h1: [...document.querySelectorAll('h1')].map(h => h.textContent), text: document.getElementById('root')?.textContent || '' }));
    } catch (e) { row.problems.push(`load failed: ${e.message}`); }
    await raw.close(); await live.close();
    rows.push(row);
  });
  await browser.close();
  rows.sort((a, b) => a.path.localeCompare(b.path));

  const rule = async (title, test) => {
    const bad = new Map(); let n = 0;
    for (const r of rows) { const m = r.problems[0] || (r.snapshot && r.live ? test(r) : 'no data'); if (m) { n++; const key = m.replace(/"[^"]*"/g, '"..."').replace(/\d+/g, 'N'); const g = bad.get(key) || { m, paths: [] }; g.paths.push(r.path || '/'); bad.set(key, g); } }
    await s.check(`${title} (${rows.length - n}/${rows.length} pages)`, async () => {
      if (n) throw new Error([...bad.values()].slice(0, 4).map(g => `${g.paths.length} page(s) e.g. ${g.paths.slice(0, 3).join(', ')}: ${g.m}`).join(' || '));
    });
  };
  const EMPTY = 'raw HTML has an empty <div id="root"> (no server-rendered snapshot; the SSR feature is not shipped or not enabled)';

  await rule('raw HTML contains <div id="root"> with exactly one <h1>', r => (!r.snapshot.hasRoot ? 'no <div id="root"> in raw HTML' : r.snapshot.h1.length === 1 ? '' : r.snapshot.h1.length === 0 && norm(r.snapshot.text).length === 0 ? EMPTY : `${r.snapshot.h1.length} <h1> in raw root`));
  await rule('raw <h1> text equals the rendered page <h1>', r => {
    if (r.snapshot.h1.length !== 1) return 'no single raw <h1> to compare';
    return norm(r.snapshot.h1[0]) === norm(r.live.h1[0] || '') ? '' : `raw "${norm(r.snapshot.h1[0]).slice(0, 60)}" != rendered "${norm(r.live.h1[0] || '').slice(0, 60)}"`;
  });
  await rule(`raw root has meaningful body text (>= ${MIN_TEXT} chars)`, r => { const n = norm(r.snapshot.text || '').length; return n >= MIN_TEXT ? '' : n === 0 ? EMPTY : `only ${n} chars of text`; });
  await rule('raw root has internal <a href> links', r => (r.snapshot.internalLinks > 0 ? '' : r.snapshot.links === 0 && !norm(r.snapshot.text || '') ? EMPTY : 'no internal <a href> in the raw snapshot'));
  await rule('fidelity: every raw text chunk appears in the rendered page', r => {
    if (!r.snapshot.chunks.some(c => norm(c))) return EMPTY;
    const live = norm(r.live.text); const missing = [];
    for (const c of r.snapshot.chunks) { const t = norm(c); if (t && !live.includes(t)) missing.push(t.slice(0, 50)); }
    return missing.length ? `${missing.length} chunk(s) only in SSR, e.g. "${missing[0]}"` : '';
  });
  return s;
}
