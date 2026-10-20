# Fez Guide Tours Customizable CMS Implementation Plan

> **For Hermes:** Use subagent-driven-development to implement approved tasks with spec and quality review. This document authorizes no commits, infrastructure changes or deployment.

**Goal:** Make all business-owned visible content, media, navigation and supported page compositions editable without losing the approved live design or source-document changes.

**Architecture:** Preserve Vite/React/TypeScript and the existing Cloudflare Worker Static Assets + Workers Builds delivery. Introduce typed page/section content, D1 authoritative drafts/revisions with atomic concurrency checks, authenticated administration, and R2 media. KV can remain an optional derived public cache; never use it as the only authoritative writable CMS database.

**Tech stack:** Existing React 19, Vite, TypeScript, Tailwind (preserve existing stack), Node built-in tests; Cloudflare Worker, Access subject to verified deployment configuration, D1, R2, optional KV cache.

## Current local implementation status

- Full supported typed authoring controls now cover pages/SEO, fourteen section families and approved variants, ordered media/cards/links, products/blog/team/FAQ, global copy/contact/navigation/footer and theme tokens. `docs/cms-coverage.md` records effective consumer and test paths; arbitrary executable input and fabricated review editing are intentionally excluded.
- Product/blog changes propagate at authoring time to corresponding semantic page sections without resetting unrelated owner copy. Category relationships, canonical-safe duplication, accepted external media references and locale-dependent content links have mounted/rendering regressions.
- Stable EN/FR/ES deep links, browser history, relative preferred canonical routes, initial published-only metadata, sitemap and robots are implemented. Missing page translations are unavailable/noindex and excluded from discovery links.
- Persistent signed loopback preview runs at `http://127.0.0.1:9196/admin` with public preview at `http://127.0.0.1:9196/`. Synthetic local identity is not operational production Access proof. Real local D1/R2/Images, rate/aggregate budgets, protected recovery and isolated snapshot restore are exercised. Symlink roots and ancestors are rejected.
- Independent specification and scoped final quality gates pass, including the corrected history dirty-state guard. 261 pre-history full tests passed; the new mounted Back/Forward/pending-upload/import test and existing routing tests pass. A final combined rerun including that test is running.
- Owner-runtime browser edit → private draft save → explicit local publish → reload → rollback was exercised, restoring the baseline as revision 6. Desktop/320px/390px checks found no horizontal overflow and exactly one public Atlas credit. The editor's preview is content-only, not complete device emulation.
- Measured local mobile Lighthouse: performance 39, accessibility 96, best practices 100, SEO 100. Performance and remaining accessibility remediation are predeployment blockers. No perfect-score or live-production performance claim.
- Nothing committed, pushed or deployed. Actual owner identity/Access login, isolated remote bindings, existing-object accounting, provider capacity/costs and release authorization remain production gates.

## Historical slice status (superseded by the local status above)

- Spanish replacement is implemented across fallback pages, CMS seed and editor locale tabs (EN/FR/ES). Arabic is no longer a supported locale. Real review quotations retain their original source language and attribution.
- Parent verified typecheck and 213 Node tests, production build, real local D1 smoke and real local R2/Images upload smoke. Browser language selection rendered the Spanish homepage in LTR without desktop overflow; exactly one Atlas credit remained. Visual review caught two untranslated fallback trust badges; these were corrected and added to the localization regression.
- Photo upload is connected to AdminApp: append to draft library, select on supported sections, private authenticated draft preview including after reload, save/publish remain explicit. Save/publish/rollback are disabled while uploading. Private preview URLs are never persisted.
- The byte-limit guard now preserves HTTP 413 if stream cancellation itself fails; a regression covers both declared and streamed limits.
- Working production config includes `/media/*` worker-first routing only. No remote D1/R2/Images bindings were provisioned. Nothing committed, pushed or deployed.
- Independent specification review passes for the local Spanish/upload slice. Recheck independently exercised missing-Spanish compatibility content and Spanish validation errors; English/French behavior was retained. Final scoped code-quality review is APPROVED after correcting canonical navigation/footer filtering to use the active locale. Independent recheck covered Spanish-only, missing/whitespace Spanish labels, EN/FR fallback, external and disabled links. These checks do not establish production login/publishing, visual parity across every CMS page, all-field editing, initial-HTML SEO, complete theme/layout controls, backups, or production quotas.
- Required production decisions remain approved editor identity, Access setup, isolated D1/private R2, Images availability/costs, and explicit release authorization.

## Verified baseline

- Repository: elhamlaouy/FezGuideTours.
- Local HEAD and origin/main: 241dca78c7c89dc5803082a4804681fc5b7529a9.
- Cloudflare production build check for that commit: completed/success.
- Live JS /assets/index-CLpabP8N.js and CSS /assets/index-ClKOcqsE.css match local dist byte-for-byte.
- Public /api/cms includes tours, customPages, blogPosts, teamMembers, faqs, siteSettings; no top-level bookings key.
- Parent reran npm run lint and node --test tests/*.test.mjs: typecheck passes, 29 tests pass.
- Browser visual verification remains limited by gateway timeouts; HTTP/content checks are not a new visual approval.
- No source code changed in this review. scripts/__pycache__/ was already untracked. This plan is a local uncommitted document.

## Preserve the current release, not the old CMS snapshot

Git history since emergency patch 106ea45:
1. Tripadvisor review cards and accessible loop (#1).
2. Approved phone/email/map contacts (#2).
3. Bilingual editorial guides (#3), tour/layout CTA alignment (#4), editorial reading treatment (#5).
4. Unified Fez overview cards (#6).
5. Private Fez Medina tour product, €170 per person and approved section order (#7).
6. Shared breadcrumb and Tripadvisor on day trips (#8).
7. Day-trip source-document content/photos (#9).
8. Food guide/product split and tasting walk (#10).
9. Travel-tip and About content-only pages (#11).

Preserve all approved copy, original local photographs, galleries, ordering, card families, CTA placement, real review source/links, pricing and contact corrections as migration seeds. Editorial pages must stay editorial; no automatic booking CTA on travel tips or About. Preserve live content overrides where used, but do not import stale KV fields over protected source corrections.

## What is not currently editable

- src/context/CmsContext.tsx:70-78 replaces remote protected tour IDs with source versions.
- Same file:113-121 forces phone, WhatsApp, email and map back to source defaults.
- src/pages/HomePage.tsx hardcodes most section copy/images and all composition.
- Category pages FezPage, DayTripsPage, FoodToursPage, TravelTipsPage hardcode page blocks.
- MedinaArticlePage, HistoryCultureArticlePage, ThingsToDoArticlePage, AboutPage and src/data/editorialArticles.ts keep editorial content outside CMS.
- OurFezToursPage has separate source-fixed price, itinerary, gallery and policy content.
- src/components/Navbar.tsx, Footer.tsx, FloatingWhatsAppButton.tsx and src/data/translations.ts hardcode shell/UI content.
- teamMembers/faqs load but do not drive active About/FAQ output.
- Theme values are repeated Tailwind literals; no editable theme contract.
- index.html and public/sitemap.xml/manifest.json hold static metadata; sitemap routes need reconciliation with actual SPA navigation.
- Old dashboard was removed, not merely hidden. Recover visual/editor components from history selectively; never restore PIN authentication/localStorage database behavior.

## Meaning of fully customizable

Editable: every business text, EN/FR/AR translation, image/alt/caption/focal point, tour price/currency/duration/policies, editorial page, blog, review display, navigation/footer, contact messaging, buttons, SEO, theme token and supported section order/visibility/variant.

Page builder: add, remove, duplicate, reorder and hide supported sections; assemble new pages; choose approved layout variants with desktop/mobile/RTL previews.

Not editable as arbitrary executable input: JavaScript, unsanitized HTML, CSS injection, database bindings, credentials, authentication policies, billing or deployment settings. New component behaviors still require development. This prevents code execution while giving control over the website itself.

Source-document provenance and review attribution stay recorded. Existing review text can be displayed/hidden/reordered without inventing testimonials or silently representing edited text as verified.

## Content contract

CmsDocument: schemaVersion, site settings, theme, navigation, footer, localized UI copy, pages, products, editorial entries, blog, team, FAQs, media metadata and approved review records.

Page: stable ID, slug, locale content, page kind (editorial/product/landing), SEO, enabled state, ordered sections.

Section discriminated union: hero, richText, cardGrid, productGrid, gallery, benefits, CTA, reviews, FAQ, team, itinerary, inclusions, practicalInfo and contact. Every section has stable ID, enabled state, approved variant and localized fields. Product references use IDs, not copied titles. Rich text is sanitized structured content. Links use validated schemes. No arbitrary CSS classes from JSON.

Safe theme fields: semantic colors, licensed font choices, font scale, container width, spacing preset, radius, button/card variants. Renderer maps tokens to static CSS variables/classes; do not rely on dynamically generated Tailwind classes.

## Ordered implementation work and acceptance gates

Every slice starts with a failing Node/TypeScript test, runs the focused test, implements minimum behavior, reruns tests/typecheck/build, then receives independent spec and quality review. Existing source-string tests must be adapted to schema/renderer behavior rather than deleted to make a migration green. Commit only after separate owner authorization.

### 1. Freeze migration fixtures and coverage
Files: create src/cms/seed.ts, src/cms/schema.ts, tests/cms-seed.test.mjs, docs/cms-coverage.md; read existing src/data/* and all page components.
- Capture effective frontend values: source-protected content + permitted live overrides.
- Record current page/section/image order and page/product relationships.
- Create a coverage row for every rendered field -> document path -> editor control -> public renderer -> test.
Gate: no lost text, photos, product data or contact corrections; no bookings/secrets copied into public seed. Screenshots at desktop, 375px and 320px plus Arabic where available.

### 2. Define and validate typed schema
Files: src/cms/schema.ts, src/types/index.ts, tests/cms-schema.test.mjs.
- Versioned document, field limits, ID/slug validation, URL rules, locale policy, bounded section/media counts.
- Reject unknown unsafe fields and invalid references.
Gate: invalid/oversized content rejected; every existing page expressible in schema. Editorial/product separation preserved.

### 3. Secure isolated infrastructure before writes
Files: wrangler.toml, worker/auth.ts, worker/index.ts, tests/cms-auth.test.mjs.
- Obtain owner email/identity approval and verify Access protection on intended admin hostname/path.
- Protect /admin and /api/admin/*; actual Worker JWT signature/issuer/audience/time/allowed-identity enforcement; missing configuration fails closed.
- Verify direct workers.dev, custom-host and preview paths cannot bypass enforcement.
- Existing previews.kv_namespaces points at production namespace. Split production/preview D1, KV and R2 before writes.
Gate: anonymous/forged/expired/wrong-audience access denied; approved real login works; homepage/public API still public. Access setup and remote resources require owner approval.

### 4. Authoritative drafts/revisions and migration
Files: migrations/0001_cms.sql, worker/cms-store.ts, scripts/migrate-cms.ts, tests/cms-store.test.mjs.
- D1 documents/revisions/published pointer with atomic version compare-and-swap.
- Backup old KV privately; migrate effective public seed non-destructively, retain legacy key until acceptance.
- Private historical booking export requires authorized access and separate retention decision; never put it in CMS content.
Gate: draft edits invisible publicly; stale second writer gets 409 and changes no data; publish/rollback selects exact immutable revision; restore tested in disposable storage.

### 5. Protected editor API and public contract
Files: worker/cms-routes.ts, worker/index.ts, tests/cms-api.test.mjs.
- /api/admin/content GET; draft save; validate/preview; publish; revisions; rollback endpoints.
- Explicit allowed methods, content types, byte limits, authorization, schema validation and safe errors.
- Public /api/cms compatibility endpoint returns allowlisted published fields only; new document endpoint/version explicitly defined.
- Start with published D1 read to avoid dual-store publish races. If KV cache is used later, immutable versioned snapshots, failure recovery and propagation must be tested and documented.
Gate: unauthenticated writes denied; public response never exposes drafts, bookings, secrets or private metadata; runtime tests through Wrangler with real local D1.

### 6. Renderer migration, preserving appearance
Files: src/cms/SectionRenderer.tsx, src/context/CmsContext.tsx, src/pages/*.tsx, src/components/*.tsx.
Order: shell/contacts -> homepage -> categories -> editorial/About/travel tips -> product detail -> blog/custom pages/team/FAQ.
- Reuse current component geometry. Move only data and section configuration first.
- Remove source-protection overrides only AFTER migration correctly seeds current approved values.
- Fallback only when published document missing/invalid; never silently overwrite valid edits with source defaults.
Gate: each page visually matches approved baseline with seed; every coverage field edit changes output; stable product links and breadcrumbs; 320px/mobile/RTL pass.

### 7. Admin UI and publishing workflow
Files: src/admin/AdminApp.tsx, src/admin/ContentEditor.tsx, src/admin/SectionEditor.tsx, src/admin/Preview.tsx, src/admin/admin-api.ts, src/App.tsx; tests for browser runtime.
- Separate/lazy-load admin application. Tree navigation, forms, language tabs, drag/order alternatives accessible by keyboard, variant picker, media selection, duplicate/hide sections, page creation.
- Live preview uses the same renderer with authenticated draft data; no publicly readable draft URLs.
- Save draft vs publish explicit; dirty-state warning, validation, revision history, stale edit conflict UI, expired-session handling.
Gate: actual owner edits draft, previews, publishes, reloads on a separate client and rolls back; no token/private booking store in localStorage.

### 8. Media uploads and recovery
Files: worker/media.ts, src/admin/MediaLibrary.tsx, src/cms/media.ts, tests/cms-media.test.mjs.
- Existing local image library immediately selectable without uploads.
- R2 upload authorization, generated keys, image signature/MIME/bytes/dimension checks, prohibit unsanitized SVG, metadata alt/caption/focal point.
- Choose an upload flow that actually enforces restrictions before publishing media; a presigned URL alone is not validation.
- No deletion of referenced media; cleanup quarantined/orphan uploads safely; backups and media manifests restore tested.
Gate: upload/selection/replace work; unauthorized/oversized/disguised files rejected; referenced photos survive rollback.

### 9. Theme, global copy, routing and SEO
Files: src/index.css, src/components/Logo.tsx, src/cms/theme.ts, src/admin/*, src/App.tsx, worker/seo.ts, index.html, public/sitemap.xml, public/manifest.json.
- Central semantic tokens and safe font options; shell settings and localized copy editable.
- Preserve old query links, add stable CMS slugs and intentional redirects; do not assume SPA fallback establishes working routes.
- Per-page initial HTML title/description/canonical/OG and matching visible structured data; XML sitemap and robots from published routes/canonical origin.
- Structured data derives validated visible business/product fields, not raw injected JSON.
Gate: fetch each published route without JS and verify metadata; navigation/back/deep links work; no broken canonical/sitemap routes; theme mobile contrast/layout checks.

### 10. Production proof
Commands: npm ci; npm run lint; node --test tests/*.test.mjs; npm run build; pinned Wrangler dry-run using profile scratch output; real Wrangler HTTP and browser tests.
- Work on authorized branch/PR; existing Workers Builds preview, then merge only after required checks. No Astro/Pages migration or direct production push.
- Full security audit, authenticated publish/rollback, public-read checks, private-preview isolation, content coverage matrix all green.
- Production build check plus live expected revision/assets, mobile/RTL screenshots, measured Lighthouse (not assumed scores).
Gate: CMS is complete only after actual end-to-end owner publish proof; disclose any unresolved checks instead of claiming fully editable.

## Separate booking correction
Current BookingModal generates a local reference and says request received without server submission. Correct copy to 'inquiry prepared — send it through WhatsApp' unless implementing a verified intake backend. Private bookings with D1 validation, spam control, retention and admin management are a separate approved workstream, not a prerequisite for restoring CMS publishing.

## Decisions needed before implementation
- Approved owner login identity/email and permitted additional editors.
- Admin on existing workers.dev path or verified custom domain; confirm actual Access routing and account settings before selecting.
- Approval for D1/R2 and separate preview resources. No unlimited dynamic/free-tier promise; verify current quotas and eligibility before provisioning.
- Confirmation that fully customizable means the supported visual page builder above, not arbitrary application code execution.

## Parallel work boundaries
- Schema/migration reviewer owns seed/schema/test contract.
- Backend worker owns auth/storage/API, isolated test resources.
- Frontend worker owns renderer migrations after schema frozen.
- Editor/media worker starts after API/schema contracts stable.
- Parent integrates and verifies; independent reviewers gate spec then quality. Never parallel-edit the same files without a defined merge boundary.
