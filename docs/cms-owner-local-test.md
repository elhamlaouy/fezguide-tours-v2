# Fez Guide Tours — owner local test guide

## Open

- Editor: http://127.0.0.1:9196/admin
- Public site: http://127.0.0.1:9196/
- French: http://127.0.0.1:9196/fr
- Spanish: http://127.0.0.1:9196/es

This is isolated local D1/R2/Images state, not the live Cloudflare website. The loopback launcher supplies a synthetic signed test identity through unchanged JWT verification. There is no production login bypass and no editor password to enter in chat. The owner runtime persists under `.wrangler/cms-owner-preview` and bootstrap does not overwrite existing drafts.

Restart from the project directory with `npm run cms:preview` after stopping the previous launcher. Do not start two launchers on the same state. The existing `npm run preview` is only a static Vite preview and does not supply the editor database or upload API.

## Organized editing workspace

- **Choose a page** at the top. Start with **Page sections**, then choose a section or use **Previous part / Next part**. Clicking a section in the preview selects its matching controls and returns from preview-only mode to split view.
- Edit one group at a time: **Text & content**, **Photos**, **Layout**, or **Advanced details**. Section ordering/addition and optional-field removal are secondary disclosures, not primary editing actions.
- **Page settings** contains title, address, availability and SEO. **Experiences & stories** contains the shared collections. **Photo library**, **Design & style**, **Site settings**, and **History & backups** keep unrelated controls separate.
- Use **Split view**, **Editor only**, or **Preview only**. The **Editor space** slider changes the split at wider widths. At small widths the panels stack instead of overflowing. Desktop (1280 CSS px) and mobile (390 CSS px) previews scale to their actual available panel width. A narrow initial window starts with the mobile preview.
- The isolated live preview includes the header and footer. Unsaved text, contact, brand and theme changes are in-memory only. Changing the layout does not discard work. Selecting another part scrolls that part into view; typing does not reset the preview scroll.
- **Select sections** is the default interaction mode. **Browse preview** enables internal draft-page navigation. Contact, booking, external-link and form actions are disabled in the preview; use the separate public preview for a deliberate handoff test.
- Upload metadata shows one language at a time; title/caption fields are optional disclosures. Uploaded photos still need an explicit draft save and publish.

## First test

1. Select a page and EN, FR or Español.
2. Click its hero in the preview, or choose it in the section selector. Edit its title or description under **Text & content**; the preview should update before saving.
3. Try the layout modes, desktop/mobile device buttons and next/previous part. Confirm the whole preview width fits and the same draft stays intact.
4. Click **Save draft**, refresh the editor, and check the edit survived. The public site should still show its previous content.
5. Click **Publish**, open the public page separately, and check the changed content.
6. Open **History & backups** and restore a previous revision. Check the public page and photos return to that revision.

## More controls

- Add, duplicate, move, hide and remove supported sections. Layout variants are approved choices, not executable CSS.
- Edit product details and blog copy through their collections; changed fields propagate to the corresponding semantic page blocks. Independently authored page sections are retained.
- Add pages and navigation links, edit slugs/SEO, then test direct URLs, refreshing and browser Back/Forward.
- A relative SEO canonical such as `/company` defines the preferred route. The former slug redirects there; sitemap and alternate-language URLs follow it. Reserved/conflicting/multi-segment paths are rejected. Absolute URLs cannot change the trusted canonical origin.
- Upload a JPEG/PNG/WebP, select it, set alt/caption/focal point, reorder the gallery, save and reload. Draft-only images remain private until visibly published.
- Change global contacts, brand name, navigation/footer, safe palette/fonts/spacing/width/radius/button/card choices. The approved logo artwork and one Atlas credit stay protected.
- Edit FAQs and team profiles. Attributed source reviews may be hidden/reordered, not fabricated or rewritten as verified reviews.
- Export/import a document. Imports validate into an unsaved draft only; they never publish automatically. Complete local database/media recovery commands are in `cms-recovery.md`.

Blank Spanish page titles mean that locale is unavailable: no English fallback, public route is 404/noindex, and content links/sitemap/hreflang omit it. EN/FR retain documented compatibility fallback.

Compatibility global hero fields are not the effective CMS hero. Edit the home page's hero section to change its public hero.

## Draft safety

Close/reload and browser-history navigation protect dirty work. Declining Back/Forward must retain the draft and restore the editor URL. Upload/import/publish operations block history-driven departure while pending. Confirmed discard intentionally loses unsaved edits; reopening loads the stored draft.

## Known deployment limits

The local functional preview is not production approval. Real Access login and approved owner identity, isolated remote storage/bindings, accounting for existing remote media, external quotas/costs, production recovery and release authorization remain separate gates.

Latest measured local mobile Lighthouse run: performance 39, accessibility 96, best practices 100, SEO 100; LCP 10.6 seconds, total blocking time 1,430 ms, CLS 0. Performance and remaining accessibility issues need remediation before production. These are measured local scores, not claims about the live site. The public bundle remains above Vite's 500 KB warning threshold.

Booking is an inquiry prepared for WhatsApp. It is not a database-backed booking submission or a confirmed reservation.
