// Editor suite: drives the real /admin UI in Chromium. Writes content, publishes, then rolls back (see run.mjs for the final safety net).
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadPlaywright, makeSuite, sleep } from './lib.mjs';

const T = { en: 'E2E check — Discover Fez', fr: 'Test E2E — Découvrir Fès', es: 'Prueba E2E — Descubrir Fez' };
const PHOTO = resolve(import.meta.dirname, '../../src/assets/images/real/about_us_image3.jpg');

export async function run(ctx) {
  const s = makeSuite('editor', ctx);
  const { chromium } = loadPlaywright();
  const B = ctx.baseUrl.origin;
  const stamp = Date.now();
  const PHOTO_ALT = `E2E test photo ${stamp}`;
  assert.ok(existsSync(PHOTO), `test photo missing: ${PHOTO}`);

  const browser = await chromium.launch({ headless: !ctx.headed });
  const bctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, extraHTTPHeaders: ctx.accessHeaders() });
  const ed = await bctx.newPage();
  const errors = [];
  // TEST-HARNESS ARTIFACT (investigated): Playwright injects helper scripts into frames to drive locators. The live
  // preview iframe is deliberately sandboxed without allow-scripts, so those injections log "Blocked script execution in
  // 'about:blank' ... sandboxed". Real (coordinate) mouse clicks produce zero console errors — asserted strictly by the
  // dedicated check below — so these specific harness messages are ignored here.
  const sandboxNoise = [];
  const watch = p => {
    p.on('pageerror', e => errors.push(`[${s.current}] ${e.message}`));
    // A 409 is expected once: the deliberate two-editor conflict.
    p.on('console', m => { if (m.type() === 'error' && /Blocked script execution in 'about:blank'.*sandboxed/.test(m.text())) { sandboxNoise.push(s.current); return; } if (m.type() === 'error' && !/favicon/.test(m.text()) && !/status of 409 \(Conflict\)/.test(m.text())) errors.push(`[${s.current}] ${m.text()}`); });
    p.on('dialog', d => d.accept());
  };
  watch(ed);
  let shot = 0;
  ctx.failShot = async name => { await ed.screenshot({ path: join(ctx.out, `fail-${name}-${++shot}.png`) }); };
  const snap = async name => ed.screenshot({ path: join(ctx.out, `${name}.png`) }).catch(() => {});

  const ready = async (p = ed) => { await p.waitForSelector('[data-admin-status=ready]', { timeout: 60000 }); await p.waitForSelector('select[name=current-page] option[value=home]', { state: 'attached' }); };
  const choosePage = async (id, p = ed) => { await p.selectOption('select[name=current-page]', id); await p.waitForTimeout(400); };
  const tab = async (key, p = ed) => { await p.click(`[data-workspace-tab=${key}]`); await p.waitForTimeout(300); };
  const locale = async l => { await ed.click(`[data-locale=${l}]`); await ed.waitForTimeout(200); };
  const waitRevision = async v => ed.waitForSelector(`.cms-admin-notice[data-revision="${v}"]`, { timeout: 60000 });
  const openAll = async scope => scope.evaluate(el => el.querySelectorAll('details:not([open])').forEach(d => { d.open = true; }));
  const openDetails = async loc => { if (!(await loc.evaluate(d => d.open))) await loc.locator(':scope > summary').click(); };
  const frame = () => ed.frameLocator('.cms-admin-preview iframe');

  const base = await ctx.admin(); const V0 = base.version;
  const basePublic = await ctx.pubDoc();
  let V = V0;
  const origPrice = base.document.products.find(p => p.id === 'daytrip-custom').price.amount;
  const NEW_PRICE = origPrice + 6;
  const origHome = base.document.pages.find(p => p.id === 'home');

  try {
    await s.check('editor opens behind Cloudflare Access with live content', async () => {
      await ed.goto(B + '/admin', { waitUntil: 'domcontentloaded' }); await ready();
      assert.match(await ed.locator('.cms-version-details').innerText(), new RegExp(`Version ${V0}\\b`));
      await snap('01-editor');
    });

    await s.check('edit homepage hero title in English, French and Spanish (live preview updates)', async () => {
      await choosePage('home'); await tab('sections');
      await ed.selectOption('select[name=current-section]', 'hero');
      for (const l of ['en', 'fr', 'es']) { await locale(l); await ed.fill(`textarea[data-path="pages.home.sections.hero.title.${l}"]`, T[l]); }
      await locale('en');
      await frame().locator('body').getByText(T.en).first().waitFor({ timeout: 15000 });
    });

    await s.check('save draft creates a new private revision', async () => {
      await ed.click('button[name=save-draft]'); V += 1; await waitRevision(V); ctx.wroteSomething = true;
      const a = await ctx.admin(); assert.equal(a.version, V); assert.equal(a.publishedRevision, V0);
      assert.equal(a.document.pages.find(p => p.id === 'home').sections.find(x => x.id === 'hero').title.fr, T.fr);
    });

    await s.check('draft is NOT visible on the public site (API + HTML, EN/FR/ES)', async () => {
      const d = await ctx.pubDoc(); assert.equal(d.version, basePublic.version);
      for (const [p, l] of [['/', 'en'], ['/fr', 'fr'], ['/es', 'es']]) { const h = await ctx.html(p); assert.equal(h.status, 200); assert.ok(!h.text.includes(T[l]), `${p} leaked draft`); }
    });

    await s.check('draft survives an editor reload', async () => {
      await ed.reload({ waitUntil: 'domcontentloaded' }); await ready(); await choosePage('home'); await tab('sections');
      await ed.selectOption('select[name=current-section]', 'hero'); await locale('es');
      assert.equal(await ed.inputValue('textarea[data-path="pages.home.sections.hero.title.es"]'), T.es); await locale('en');
    });

    // ---- NEW: Google length counters on Page settings ----
    await s.check('Page settings shows Google length counters (N/42, N/155) that warn when over', async () => {
      await choosePage('home'); await tab('page'); await openAll(ed.locator('.cms-page-settings'));
      const titleSel = 'textarea[data-path="pages.home.seo.title.en"], input[data-path="pages.home.seo.title.en"]';
      const descSel = 'textarea[data-path="pages.home.seo.description.en"], input[data-path="pages.home.seo.description.en"]';
      const tc = ed.locator('[data-seo-counter="pages.home.seo.title"]'); const dc = ed.locator('[data-seo-counter="pages.home.seo.description"]');
      await tc.waitFor({ timeout: 10000 }); await dc.waitFor({ timeout: 10000 });
      await ed.fill(titleSel, 'x'.repeat(30)); assert.match(await tc.innerText(), /^30\/42\b/); assert.ok(!(await tc.getAttribute('class')).includes('is-warning'), 'title 30/42 should not warn');
      await ed.fill(titleSel, 'x'.repeat(60)); assert.match(await tc.innerText(), /^60\/42\b/); assert.ok((await tc.getAttribute('class')).includes('is-warning'), 'title 60/42 should warn');
      await ed.fill(descSel, 'y'.repeat(100)); assert.match(await dc.innerText(), /^100\/155\b/); assert.ok(!(await dc.getAttribute('class')).includes('is-warning'), 'description 100/155 should not warn');
      await ed.fill(descSel, 'y'.repeat(170)); assert.match(await dc.innerText(), /^170\/155\b/); assert.ok((await dc.getAttribute('class')).includes('is-warning'), 'description 170/155 should warn');
      // Put the original values back so this check leaves no trace in the draft.
      await ed.fill(titleSel, origHome.seo?.title?.en ?? ''); await ed.fill(descSel, origHome.seo?.description?.en ?? '');
    });

    // ---- NEW: live preview link behaviour ----
    await s.check('live preview: select mode keeps the editor and preview on the page; browse mode navigates inside the preview; ctrl-click opens nothing', async () => {
      await choosePage('home'); await tab('sections'); await ed.waitForSelector('.cms-admin-preview iframe');
      const f = frame(); await f.locator('h1').first().waitFor({ timeout: 15000 });
      const h1Before = (await f.locator('h1').first().innerText()).trim();
      const links = f.locator('a[data-internal-link]:visible'); assert.ok(await links.count() > 0, 'preview has no a[data-internal-link]');
      const hrefs = await links.evaluateAll(a => a.map(x => x.getAttribute('href')));
      const target = hrefs.findIndex(h => h && h !== '/' && !h.startsWith('#')); assert.ok(target >= 0, `no navigable internal link in ${hrefs.join(',')}`);
      const url0 = ed.url();
      // select mode
      await ed.click('button[name=preview-select]'); assert.equal(await ed.getAttribute('button[name=preview-select]', 'aria-pressed'), 'true');
      await links.nth(target).click({ force: true }); await ed.waitForTimeout(500);
      assert.equal(ed.url(), url0, 'select-mode click changed the editor URL');
      assert.equal((await f.locator('h1').first().innerText()).trim(), h1Before, 'select-mode click changed preview content');
      assert.equal(new URL(ed.url()).pathname.replace(/\/$/, ''), '/admin');
      // ctrl-click opens no new page (either mode)
      const pagesBefore = bctx.pages().length; let popup = false; const onPage = () => { popup = true; }; bctx.on('page', onPage);
      await links.nth(target).click({ modifiers: ['Control'], force: true }); await ed.waitForTimeout(800); bctx.off('page', onPage);
      assert.ok(!popup && bctx.pages().length === pagesBefore, 'ctrl-click opened a new page');
      assert.equal(ed.url(), url0);
      // browse mode
      await ed.click('button[name=preview-browse]'); assert.equal(await ed.getAttribute('button[name=preview-browse]', 'aria-pressed'), 'true');
      await links.nth(target).click(); await ed.waitForTimeout(800);
      await f.locator('h1').first().waitFor({ timeout: 15000 });
      assert.equal(ed.url(), url0, 'browse-mode navigation left /admin');
      assert.notEqual((await f.locator('h1').first().innerText()).trim(), h1Before, 'browse-mode click did not navigate inside the preview');
      assert.ok(ed.url().includes('/admin'));
      await ed.click('button[name=preview-select]');
    });

    let hiddenId, hiddenTitle;
    await s.check('live preview: human mouse clicks on preview links produce zero console errors and never leave /admin', async () => {
      // Fresh page: measures the site, not state accumulated by earlier Playwright frame helpers on the main page.
      const fresh = await bctx.newPage(); const consoleErrors = []; const pageErrors = [];
      fresh.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); }); fresh.on('pageerror', e => pageErrors.push(e.message)); fresh.on('dialog', d => d.accept());
      try {
        await fresh.goto(B + '/admin', { waitUntil: 'domcontentloaded' }); await ready(fresh);
        // Positions are computed from the PARENT document only: no script runs inside the sandboxed frame.
        const boxes = () => fresh.evaluate(() => { const fr = document.querySelector('.cms-admin-preview iframe'); const r = fr.getBoundingClientRect(); const k = r.width / fr.offsetWidth;
          return [...fr.contentDocument.querySelectorAll('a[data-internal-link]')].map(a => { const q = a.getBoundingClientRect(); return { x: r.left + (q.left + q.width / 2) * k, y: r.top + (q.top + q.height / 2) * k, w: q.width, h: q.height }; })
            .filter(q => q.w > 0 && q.h > 0 && q.y > r.top + 4 && q.y < Math.min(r.bottom, innerHeight) - 4).slice(0, 4); });
        for (const mode of ['select', 'browse']) {
          await fresh.click(`button[name=preview-${mode}]`); await fresh.waitForTimeout(200);
          const list = await boxes(); assert.ok(list.length > 0, `no visible preview links in ${mode} mode`);
          for (const q of list) {
            await fresh.mouse.click(q.x, q.y); await fresh.waitForTimeout(300);
            assert.match(new URL(fresh.url()).pathname, /^\/admin/, 'editor must stay on /admin');
            if (mode === 'browse') { await fresh.click('button[name=preview-browse]'); await fresh.waitForTimeout(150); }
          }
        }
        assert.deepEqual([...pageErrors, ...consoleErrors], [], 'human clicks in the preview must not log errors');
      } finally { await fresh.close(); }
    });

    await s.check('change a tour price with the Pricing tool', async () => {
      await choosePage('daytrip-custom'); await ed.click('button[name=edit-page-pricing]'); await ed.waitForSelector('[data-price-editor]');
      await ed.fill('input[name=price-amount]', String(NEW_PRICE));
      if (await ed.locator('select[name=price-estimates-decision]').count()) await ed.selectOption('select[name=price-estimates-decision]', 'remove');
      await ed.click('button[name=apply-price]'); await ed.waitForTimeout(300);
      await snap('02-pricing');
    });

    await s.check('hide a homepage section', async () => {
      await tab('sections'); await choosePage('home');
      const opts = await ed.$$eval('select[name=current-section] option', o => o.map(x => ({ v: x.value, t: x.textContent })));
      const target = opts.find(o => o.v !== 'hero' && /Why|Pourquoi|Choose/i.test(o.t)) || opts[opts.length - 2];
      hiddenId = target.v; await ed.selectOption('select[name=current-section]', hiddenId);
      hiddenTitle = (await ed.locator('.cms-focused-section h3').innerText()).trim();
      await ed.uncheck('input[name=show-current-section]');
    });

    await s.check('add a new text section and fill it', async () => {
      await ed.locator('details.cms-add-section summary').click();
      await ed.selectOption('select[name=section-type]', 'richText'); await ed.click('button[name=add-section]'); await ed.waitForTimeout(400);
      const sel = await ed.inputValue('select[name=current-section]'); assert.match(sel, /^richtext/i);
      const area = ed.locator(`textarea[data-path^="pages.home.sections.${sel}."][data-path$=".en"]`);
      const n = await area.count(); assert.ok(n >= 1, 'no text fields for new section');
      for (let i = 0; i < n; i++) await area.nth(i).fill('E2E new section text');
    });

    await s.check('reorder sections (move one down)', async () => {
      await openDetails(ed.locator('details.cms-section-outline'));
      const firstLi = ed.locator('.cms-admin-sections > li').first();
      const before = await firstLi.locator('[data-section-tab]').getAttribute('data-section-tab');
      await firstLi.locator('[data-section-tab]').click(); await ed.waitForTimeout(200); // tools only show for the selected section
      await openDetails(firstLi.locator('details.cms-section-tools'));
      await firstLi.locator('[data-move=down]').click(); await ed.waitForTimeout(200);
      const order = await ed.$$eval('.cms-admin-sections [data-section-tab]', b => b.map(x => x.getAttribute('data-section-tab')));
      assert.equal(order[1], before);
    });

    let uploadId;
    await s.check('upload a real photo (re-encoded by Cloudflare Images) into the library', async () => {
      await tab('photos');
      await ed.setInputFiles('.cms-admin-upload input[type=file]', PHOTO);
      await ed.fill('.cms-admin-upload fieldset:not([hidden]) input[maxlength="500"]', PHOTO_ALT);
      await ed.click('button[name=upload-photo]'); ctx.wroteSomething = true;
      await ed.waitForSelector('.cms-admin-upload [role=status]', { timeout: 60000 });
      await ed.fill('input[name=photo-search]', PHOTO_ALT); await ed.waitForTimeout(500);
      uploadId = await ed.$$eval('[data-media-pick^="upload-"]', b => b.map(x => x.getAttribute('data-media-pick'))[0]);
      assert.ok(uploadId, 'new upload not in library');
    });

    await s.check('use the uploaded photo on the Fez page hero', async () => {
      await tab('sections'); await choosePage('fez'); await ed.selectOption('select[name=current-section]', 'hero');
      await ed.click('[data-section-panel=photos]'); await ed.waitForTimeout(300);
      if (!(await ed.locator('input[name=photo-search]').isVisible())) await ed.locator('details.cms-photo-picker > summary').click();
      await ed.fill('input[name=photo-search]', PHOTO_ALT); await ed.waitForTimeout(500);
      const pick = ed.locator(`[data-media-pick="${uploadId}"]`);
      await pick.click(); assert.equal(await pick.getAttribute('aria-pressed'), 'true');
    });

    await s.check('create a new page linked in the navigation', async () => {
      await ed.locator('details.cms-pages-drawer summary').click();
      await ed.fill('input[name=new-page-id]', 'e2e-test-page'); await ed.check('input[name=show-in-navigation]'); await ed.click('button[name=add-page]'); await ed.waitForTimeout(400);
      await tab('page'); await ed.fill('textarea[data-path="pages.e2e-test-page.title.en"]', 'E2E Test Page');
    });

    const BLOG = { slug: `e2e-blog-${stamp}`, en: 'E2E blog post', fr: 'Article E2E', es: 'Artículo E2E', body: 'E2E blog second paragraph', heading: 'E2E toolbar heading', bold: 'bold toolbar words', items: ['E2E list one', 'E2E list two'], linkText: 'E2E guide', linkUrl: 'https://example.com/e2e-guide', date: '2026-03-04' };
    let blogId, blogPath, blogCover;
    await s.check('add a blog post (EN/FR/ES) and tick "published"', async () => {
      await tab('content');
      await openDetails(ed.locator('details:has(> summary:text-is("Blog posts"))'));
      const i = (await ctx.admin()).document.blogPosts.length;
      await ed.click('button[data-add="blogPosts"]'); await ed.waitForTimeout(500);
      const p = `blogPosts.${i}`; blogId = await ed.inputValue(`[data-path="${p}.id"]`);
      assert.match(blogId, /^blog-post/, 'new posts get a readable id');
      await ed.fill(`[data-path="${p}.slug"]`, BLOG.slug);
      for (const l of ['en', 'fr', 'es']) {
        await locale(l);
        await ed.fill(`[data-path="${p}.title.${l}"]`, BLOG[l]);
        await ed.fill(`[data-path="${p}.excerpt.${l}"]`, `${BLOG[l]} excerpt`);
        if (l !== 'en') await ed.fill(`[data-path="${p}.content.${l}"]`, `${BLOG[l]} first paragraph.\n\n${BLOG.body}`);
      }
      await locale('en');
      await ed.fill(`[data-path="${p}.author"]`, 'E2E');
      await ed.check(`[data-path="${p}.published"]`);
      blogPath = p;
    });

    // The English article is written with the formatting toolbar (heading, bold, bullet list, link, library photo).
    await s.check('blog form: format the English article with the toolbar (heading, bold, bullet list, link, library photo)', async () => {
      const area = ed.locator(`[data-path="${blogPath}.content.en"]`);
      const pick = async needle => area.evaluate((el, text) => { el.focus(); const at = el.value.indexOf(text); if (at < 0) throw new Error(`no "${text}" in the article`); el.setSelectionRange(at, at + text.length); }, needle);
      const tool = id => ed.click(`[data-article-field="${blogPath}.content.en"] [data-article-tool=${id}]`);
      await area.fill(BLOG.heading); await pick(BLOG.heading); await tool('heading');
      await area.press('Control+End'); await ed.keyboard.type(`\n\nThis story has ${BLOG.bold} inside it.\n\n${BLOG.body}\n\n${BLOG.items.join('\n')}\n\nRead the ${BLOG.linkText} online.`);
      await pick(BLOG.bold); await tool('bold');
      await pick(BLOG.items.join('\n')); await tool('bullets');
      await pick(BLOG.linkText); await tool('link');
      await ed.fill('[name=article-link-address]', 'javascript:alert(1)'); await ed.click('[name=insert-article-link]');
      await ed.waitForSelector('[data-article-link-error]'); await snap('06-blog-link-error');
      await ed.fill('[name=article-link-address]', BLOG.linkUrl); await ed.click('[name=insert-article-link]');
      await area.press('Control+End'); await tool('photo');
      await ed.fill('[data-media-picker=article-photo] [name=picker-search]', PHOTO_ALT); await ed.waitForTimeout(300);
      await snap('07-blog-photo-picker');
      await ed.click(`[data-media-picker=article-photo] [data-picker-media="${uploadId}"]`);
      const text = await area.inputValue();
      assert.ok(text.startsWith(`## ${BLOG.heading}`), text);
      assert.ok(text.includes(`**${BLOG.bold}**`) && text.includes(`- ${BLOG.items[0]}\n- ${BLOG.items[1]}`), text);
      assert.ok(text.includes(`[${BLOG.linkText}](${BLOG.linkUrl})`) && text.includes(`](media:${uploadId})`), text);
      await ed.waitForTimeout(450);
      const preview = ed.locator(`[data-article-field="${blogPath}.content.en"] [data-article-preview]`);
      assert.ok(await preview.locator('h2').filter({ hasText: BLOG.heading }).count() && await preview.locator('strong').filter({ hasText: BLOG.bold }).count() && await preview.locator('ul li').count() === 2 && await preview.locator('figure img').count(), 'article preview shows heading, bold, list and photo');
      await snap('08-blog-toolbar-preview');
    });

    await s.check('blog form: date picker and cover photo picker', async () => {
      const date = ed.locator(`[data-path="${blogPath}.date"]`);
      assert.equal(await date.getAttribute('type'), 'date');
      assert.match(await date.inputValue(), /^\d{4}-\d{2}-\d{2}$/, 'new posts start with a date');
      await date.fill(BLOG.date); assert.equal(await date.inputValue(), BLOG.date);
      await ed.click(`[data-cover-field="${blogPath}.coverImage"] [data-cover-change]`);
      await ed.fill('[data-media-picker=cover] [name=picker-search]', 'Fez'); await ed.waitForTimeout(300);
      const choice = ed.locator('[data-media-picker=cover] [data-picker-media]').nth(1);
      blogCover = { id: await choice.getAttribute('data-picker-media') };
      await choice.click();
      assert.equal(await ed.locator('[data-media-picker=cover]').count(), 0, 'picker closes after choosing');
      assert.ok(await ed.locator(`[data-cover-field="${blogPath}.coverImage"] [data-cover-thumb]`).count());
      await snap('09-blog-cover');
    });

    await s.check('main live preview follows the post being written', async () => {
      await ed.click(`[data-path="${blogPath}.content.en"]`);
      await frame().locator('body').getByText(BLOG.heading).first().waitFor({ timeout: 20000 });
    });

    await s.check('change the design (corner radius)', async () => { await tab('appearance'); await ed.selectOption('select[name=theme-radius]', 'pill'); });

    await s.check('save draft: all edits stored privately, photo still private', async () => {
      await ed.click('button[name=save-draft]'); V += 1; await waitRevision(V);
      const a = await ctx.admin(); const d = a.document;
      assert.equal(d.products.find(p => p.id === 'daytrip-custom').price.amount, NEW_PRICE);
      assert.equal(d.pages.find(p => p.id === 'home').sections.find(x => x.id === hiddenId).enabled, false);
      assert.ok(d.pages.some(p => p.id === 'e2e-test-page'));
      assert.equal(d.theme.radius, 'pill');
      const post = d.blogPosts.find(b => b.id === blogId);
      assert.ok(post.content.en.startsWith(`## ${BLOG.heading}`) && post.content.en.includes(`**${BLOG.bold}**`) && post.content.en.includes(`- ${BLOG.items[0]}`) && post.content.en.includes(`[${BLOG.linkText}](${BLOG.linkUrl})`) && post.content.en.includes(`](media:${uploadId})`), 'formatted article stored');
      assert.equal(post.date, BLOG.date); assert.equal(post.coverImage, d.media.find(m => m.id === blogCover.id).src, 'cover chosen with the picker');
      assert.equal(d.pages.find(p => p.id === 'fez').sections.find(x => x.id === 'hero').image.mediaId, uploadId);
      const src = d.media.find(m => m.id === uploadId).src; ctx.uploads.push(src);
      assert.equal((await ctx.http(src, { auth: false })).status, 404, 'unpublished upload must not be public');
      assert.equal((await ctx.http(src.replace('/media/', '/api/admin/media/'))).status, 200, 'editor can see its draft upload');
      assert.equal((await ctx.html('/e2e-test-page')).status, 404, 'draft page must not be public');
      assert.equal((await ctx.html(`/${BLOG.slug}`)).status, 404, 'draft blog post must not be public');
    });

    await s.check('publish: every change goes live (EN/FR/ES, price, hidden section, new page, photo)', async () => {
      const before = (await ctx.admin()).publishedRevision; await ed.click('button[name=publish]');
      // The "what changed" confirmation lists the edits made above in plain language, and nothing is live until it is confirmed.
      await ed.waitForSelector('[data-publish-dialog] [data-publish-changes]', { timeout: 30000 });
      const listed = await ed.locator('[data-publish-changes]').innerText();
      for (const expected of [/Page: Home/, /Page added/, /Tour: .+ — prices changed/, /Blog post added: /, /Design changed/, /Photo library: /, /Menu changed/]) assert.match(listed, expected);
      assert.ok(!/\b(?:pages|products|blogPosts|siteSettings)\.\d/.test(listed), 'no raw paths in the list');
      assert.equal((await ctx.admin()).publishedRevision, before, 'nothing is published while the dialog is open');
      await snap('06-publish-dialog');
      await ed.click('[data-publish-dialog] button[name=confirm-publish]');
      let a; for (let i = 0; i < 60; i++) { a = await ctx.admin(); if (a.publishedRevision > before && a.publishedRevision === a.version) break; await sleep(1000); }
      assert.ok(a.publishedRevision > before, 'publish did not complete');
      await ed.waitForFunction(v => (document.querySelector('.cms-version-details')?.innerText || '').includes(`Published revision ${v}.`), a.version, { timeout: 30000 });
      V = a.version; assert.equal(a.publishedRevision, V);
      const pd = await ctx.pubDoc(); const d = pd.document; assert.equal(pd.version, V);
      for (const [p, l] of [['/', 'en'], ['/fr', 'fr'], ['/es', 'es']]) { const h = await ctx.html(p); assert.ok(h.text.includes(T[l]), `${p} missing ${l} title`); }
      assert.equal(d.products.find(p => p.id === 'daytrip-custom').price.amount, NEW_PRICE);
      assert.ok(!d.pages.find(p => p.id === 'home').sections.some(x => x.id === hiddenId), 'hidden section must not be public');
      const np = await ctx.html('/e2e-test-page'); assert.equal(np.status, 200);
      for (const [prefix, l] of [['', 'en'], ['/fr', 'fr'], ['/es', 'es']]) { const bp = await ctx.html(`${prefix}/${BLOG.slug}`); assert.equal(bp.status, 200, `blog post ${prefix || '/'} not public`); assert.ok(bp.text.includes(BLOG[l]), `blog post ${l} title missing`); }
      assert.ok(d.navigation.some(n => n.pageId === 'e2e-test-page'));
      const src = d.media.find(m => m.id === uploadId).src; const img = await ctx.http(src, { auth: false }); assert.equal(img.status, 200); assert.match(img.headers.get('content-type'), /image\//);
    });

    await s.check('History shows when, who and what for each revision, with a "Live now" marker on the published one', async () => {
      await tab('history');
      const live = ed.locator('[data-history] li[data-history-version]', { has: ed.locator('[data-mark=live]') });
      await live.first().waitFor({ timeout: 30000 });
      assert.equal(await live.count(), 1, 'exactly one revision is marked live');
      assert.equal(await live.first().getAttribute('data-history-version'), String(V));
      const row = await live.first().innerText();
      assert.match(row, /\b\d{1,2} [A-Z][a-z]{2} \d{4}, \d{2}:\d{2}\b/, 'local date and time');
      assert.match(row, /Published/); assert.match(row, /Live now/);
      assert.match(row, /by (Editor|Automated test|\S+@\S+)/, 'who did it, never a raw account id');
      const all = await ed.locator('[data-history]').innerText();
      assert.ok(!/service:/.test(all), 'no raw service-token ids');
      assert.ok(await ed.locator('[data-history] [data-mark=draft]').count() >= 1, 'current draft marker');
      await snap('07-history');
      await tab('sections');
    });

    await s.check('visitor browser shows the published changes', async () => {
      const v = await browser.newPage({ viewport: { width: 1280, height: 900 } }); watch(v);
      try {
        await v.goto(B + '/fr', { waitUntil: 'networkidle' }); assert.match(await v.locator('h1').first().innerText(), /Test E2E/);
        await v.goto(B + '/daytrip-custom', { waitUntil: 'networkidle' }); assert.match(await v.locator('main').innerText(), new RegExp(String(NEW_PRICE)));
        await v.screenshot({ path: join(ctx.out, '03-public-price.png') });
        await v.goto(B + '/', { waitUntil: 'networkidle' }); assert.match(await v.locator('h1').first().innerText(), /E2E check/);
        assert.ok(!(await v.locator('main').innerText()).includes(hiddenTitle), 'hidden section visible');
        assert.ok(await v.locator('nav').getByText('E2E Test Page').count() || (await v.content()).includes('E2E Test Page'), 'new page not in navigation');
        await v.goto(B + '/blog', { waitUntil: 'networkidle' });
        const card = v.locator('article, li, div').filter({ has: v.getByText(BLOG.en) }).filter({ has: v.getByText('Read More') }).last();
        await card.getByText('Read More').click(); await v.waitForTimeout(800);
        assert.ok((await v.locator('body').innerText()).includes(BLOG.body), 'new blog post not readable from /blog');
        // The formatted article renders as headings, bold, a list, a link and a photo (reader on /blog, then the post page).
        const formatted = async where => {
          const art = v.locator('.article-body');
          await art.first().waitFor({ timeout: 15000 });
          assert.ok(await art.locator('h2').filter({ hasText: BLOG.heading }).count(), `${where}: h2 missing`);
          assert.ok(await art.locator('strong').filter({ hasText: BLOG.bold }).count(), `${where}: bold missing`);
          assert.equal(await art.locator('ul > li').count(), 2, `${where}: list missing`);
          assert.ok(await art.locator(`a[href="${BLOG.linkUrl}"]`).count(), `${where}: link missing`);
          assert.ok(await art.locator('figure img').count(), `${where}: photo missing`);
          assert.equal(await art.locator('script, iframe').count(), 0);
        };
        await formatted('/blog reader');
        await v.screenshot({ path: join(ctx.out, '10-public-blog-reader.png') });
        await v.goto(`${B}/${BLOG.slug}`, { waitUntil: 'networkidle' }); await formatted('post page');
        await v.screenshot({ path: join(ctx.out, '11-public-blog-post.png') });
        await v.goto(B + '/fez', { waitUntil: 'networkidle' }); assert.ok((await v.content()).includes(uploadId), 'uploaded photo not on Fez page');
        await v.screenshot({ path: join(ctx.out, '04-public-fez-photo.png') });
      } finally { await v.close(); }
    });

    await s.check('two editors at once: the stale one is stopped and nothing is overwritten', async () => {
      const other = await bctx.newPage(); watch(other);
      try {
        await other.goto(B + '/admin', { waitUntil: 'domcontentloaded' }); await ready(other);
        await choosePage('about'); await tab('page'); await ed.fill('textarea[data-path="pages.about.title.en"]', 'E2E editor A'); await ed.click('button[name=save-draft]'); V += 1; await waitRevision(V);
        await choosePage('about', other); await tab('page', other); await other.fill('textarea[data-path="pages.about.title.en"]', 'E2E editor B'); await other.click('button[name=save-draft]');
        await other.waitForSelector('[data-admin-conflict]', { timeout: 30000 });
        const a = await ctx.admin(); assert.equal(a.version, V); assert.equal(a.document.pages.find(p => p.id === 'about').title.en, 'E2E editor A');
      } finally { await other.close(); }
    });

    // ---- mobile layout (also covers the NEW 390px overflow requirement) ----
    await s.check('mobile editor layout (390px) has no horizontal overflow', async () => {
      const m = await bctx.newPage(); await m.setViewportSize({ width: 390, height: 844 }); watch(m);
      try {
        await m.goto(B + '/admin', { waitUntil: 'domcontentloaded' }); await ready(m);
        const over = () => m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert.ok(await over() <= 1, `overflow ${await over()}px on first screen`);
        await choosePage('home', m); for (const key of ['sections', 'page', 'photos', 'appearance']) { await tab(key, m); await m.waitForTimeout(250); assert.ok(await over() <= 1, `overflow ${await over()}px on the ${key} tab`); }
        await m.screenshot({ path: join(ctx.out, '05-mobile-editor.png') });
      } finally { await m.close(); }
    });

    await s.check('unsaved edits survive a reload as a local copy and can be restored, then saved', async () => {
      const KEY = 'fgt-cms-unsaved-v1';
      await ed.evaluate(key => localStorage.removeItem(key), KEY);
      await choosePage('about'); await tab('page');
      const sel = 'textarea[data-path="pages.about.title.en"]';
      await ed.fill(sel, 'E2E unsaved copy');
      assert.equal(await ed.evaluate(key => localStorage.getItem(key), KEY), null, 'nothing is written per keystroke');
      await ed.waitForFunction(key => !!localStorage.getItem(key), KEY, { timeout: 10000 });
      await ed.reload({ waitUntil: 'domcontentloaded' }); await ready();
      const banner = ed.locator('[data-restore-banner]');
      await banner.waitFor({ timeout: 15000 });
      assert.match(await banner.innerText(), /You have unsaved changes from \d{1,2} [A-Z][a-z]{2} \d{4}, \d{2}:\d{2}\./);
      await snap('08-restore-banner');
      await ed.click('button[name=restore-unsaved]');
      await banner.waitFor({ state: 'detached' });
      await choosePage('about'); await tab('page');
      assert.equal(await ed.inputValue(sel), 'E2E unsaved copy', 'restored as an unsaved edit');
      assert.equal(await ed.locator('[data-state]').getAttribute('data-state'), 'unsaved');
      assert.equal((await ctx.admin()).document.pages.find(p => p.id === 'about').title.en, 'E2E editor A', 'restoring alone saves nothing');
      await ed.click('button[name=save-draft]'); V += 1; await waitRevision(V);
      assert.equal((await ctx.admin()).document.pages.find(p => p.id === 'about').title.en, 'E2E unsaved copy');
      assert.equal(await ed.evaluate(key => localStorage.getItem(key), KEY), null, 'saving clears the local copy');
      await ed.reload({ waitUntil: 'domcontentloaded' }); await ready();
      assert.equal(await ed.locator('[data-restore-banner]').count(), 0, 'no banner once saved');
    });

    await s.check('roll back from History & backups restores the exact original content', async () => {
      await ed.reload({ waitUntil: 'domcontentloaded' }); await ready(); await tab('history');
      await ed.fill('input[name=rollback-revision]', String(base.publishedRevision)); await ed.click('button[name=rollback]');
      await ed.waitForSelector('.cms-admin-notice', { timeout: 60000 });
      let a; for (let i = 0; i < 30; i++) { a = await ctx.admin(); if (a.version > V && a.publishedRevision === a.version) break; await sleep(500); }
      assert.equal(a.publishedRevision, a.version); assert.deepEqual(a.document, base.document);
      const p = await ctx.pubDoc(); assert.deepEqual(p.document, basePublic.document);
      assert.equal((await ctx.html('/e2e-test-page')).status, 404);
      assert.equal((await ctx.html(`/${BLOG.slug}`)).status, 404, 'rolled-back blog post must be gone');
      for (const [path, l] of [['/', 'en'], ['/fr', 'fr'], ['/es', 'es']]) assert.ok(!(await ctx.html(path)).text.includes(T[l]));
    });

    await s.check('no browser errors anywhere during the test', async () => { assert.deepEqual(errors, []); });
  } finally {
    ctx.failShot = null;
    await browser.close().catch(() => {});
  }
  return s;
}
