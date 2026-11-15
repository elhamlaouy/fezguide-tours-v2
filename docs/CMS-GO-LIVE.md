# Fez Guide Tours CMS — go-live guide

This is the current, authoritative handoff. Older `docs/cms-*.md` files are historical notes from the previous build and describe the original (non-v2) Cloudflare resources.

## What the CMS does

- Editor at `/admin`, protected by Cloudflare Access (email one-time code, no passwords stored by the site).
- Edit every page in English, French and Spanish: text, photos, section order/visibility, prices, navigation, footer, contact details, colours/fonts, SEO titles/descriptions, new pages.
- **Save draft** is private. **Publish** makes the draft public immediately. **History & backups** rolls back to any earlier revision (rollback is itself a new revision, nothing is ever deleted).
- Photo uploads (JPEG/PNG/WebP, up to 8 MiB) are re-encoded through Cloudflare Images and stored privately in R2; they become public only when a published page uses them.
- Public pages are rendered from the published revision in D1, with per-page title/description/canonical/Open Graph tags, `sitemap.xml` and `robots.txt` generated from published content.

## Fixed in this release

1. **Empty database had no way in.** Migration `0004` reset the v2 D1 database, so the editor showed "No draft is stored yet" with nothing to click. The editor now shows **Load the current website content**, which saves today's site content as a private draft. Nothing changes publicly until **Publish**.
2. **Free-plan CPU limit.** Every public page view re-validated and re-projected the full ~620 KB document (~16 ms CPU, measured). That's over the Workers Free 10 ms CPU limit, so visitors would intermittently get "Worker exceeded resource limits" errors after the first publish. The public projection is now cached per Worker isolate, keyed by the immutable published revision: one small D1 query per request, ~6 ms on a cold isolate and ~2 ms warm. A publish or rollback changes the revision number, so the cache refreshes immediately. Every revision is still validated when written.
3. **Wrong canonical domain.** `index.html` and the default canonical origin pointed at the old `fezguidetours.elhamlaouy.workers.dev`. Both now use `https://fezguidetours.com`.

Verified locally against real workerd + D1 + R2 + Images, starting from an empty database exactly like production: bootstrap → edit → publish → public page and server HTML updated → photo upload → rollback → public page restored. Anonymous admin API calls return 401. Full suite: 458 tests pass. Worker bundle: 48 KiB gzipped.

## Go-live steps (owner, Cloudflare dashboard)

### 1. Merge the PR

Merging to `main` runs `.github/workflows/deploy.yml`: build + tests, apply D1 migrations, deploy the `fezguidetours-v2` Worker to `https://fezguidetours-v2.elhamlaouy.workers.dev`.

### 2. Create the Access application for the editor (Zero Trust Free, up to 50 users)

1. Cloudflare dashboard → **Zero Trust** → **Settings** → **Custom pages** (or **General**): note your **team domain**. The code expects `delicate-forest-c939.cloudflareaccess.com`. If yours differs, update `ACCESS_TEAM_DOMAIN` in `wrangler.toml` in step 3.
2. **Zero Trust → Settings → Authentication → Login methods**: make sure **One-time PIN** is enabled.
3. **Zero Trust → Access → Applications → Add an application → Self-hosted.**
   - Name: `FezGuideTours CMS`
   - Session duration: 24 hours
   - Add these public hostnames/paths, all four if possible:
     - `fezguidetours-v2.elhamlaouy.workers.dev` path `admin`
     - `fezguidetours-v2.elhamlaouy.workers.dev` path `api/admin`
     - `fezguidetours.com` path `admin`
     - `fezguidetours.com` path `api/admin`
   - Identity providers: One-time PIN.
   - Policy: **Allow**, Include → **Emails** → `elhamlaouy@gmail.com`, `fezguidetours1@gmail.com`. No "Everyone" rule.
   - Save. Open the application again and copy its **Application Audience (AUD) Tag**.
   - If the dashboard won't accept the workers.dev hostname, the alternative is Workers & Pages → `fezguidetours-v2` → Settings → Domains & Routes → workers.dev → **Enable Cloudflare Access**. That gates the whole workers.dev URL, which is fine for pre-launch testing. Use that application's AUD instead.

### 3. Put the AUD in `wrangler.toml`

In GitHub, edit `wrangler.toml` on `main`. Replace the value of `ACCESS_AUD` under `[vars]` with the AUD tag from step 2 (and `ACCESS_TEAM_DOMAIN` if it differs). Commit. The workflow redeploys automatically.

The Worker checks the Access JWT signature, issuer, audience, expiry and the email allowlist. If the AUD is wrong, the editor shows "Sign-in required". It fails closed and never exposes anything.

### 4. Load and publish the content

1. Open `https://fezguidetours-v2.elhamlaouy.workers.dev/admin`, enter your email, then the code you receive.
2. Click **Load the current website content**, review a few pages, then click **Publish**.
3. Open `https://fezguidetours-v2.elhamlaouy.workers.dev/` in a private window and check it.

### 5. Move the domain to the v2 Worker

1. Workers & Pages → the **old** Worker → Settings → Domains & Routes → remove `fezguidetours.com` (and `www.fezguidetours.com` if present). Leave other hostnames such as `app.fezguidetours.com` alone unless you also want them on v2.
2. Workers & Pages → **fezguidetours-v2** → Settings → Domains & Routes → **Add → Custom domain** → `fezguidetours.com` (and `www.fezguidetours.com` if used).
3. Check `https://fezguidetours.com/` and `https://fezguidetours.com/admin`.

Rollback plan: re-attach the domain to the old Worker. No data is lost.

## Free-plan budget

| Service | Free allowance | This site |
|---|---|---|
| Workers | 100k requests/day, 10 ms CPU | ~2 ms warm per page after the cache fix |
| D1 | 5M rows read/day, 100k writes/day, 5 GB | 1–2 row reads per page; revisions capped at 1000 / 24 MiB |
| R2 | 10 GB, 1M writes, 10M reads/month | Uploads capped (8 MiB each, durable budget table) |
| Images | 5,000 unique transformations/month | One re-encode per upload; over the limit, new uploads fail instead of billing |
| Access | 50 users | 2 editors |
| Rate limiting | Free | 600 dynamic requests/min per location; extra requests get 429 |

## Client quick guide

1. Go to `fezguidetours.com/admin` and sign in with the email code.
2. **Choose a page**, click a part of the preview to edit it. Use the **en / fr / Español** tabs for each language.
3. **Save draft** whenever you like; **Publish** when ready. The public site updates immediately.
4. Photos: **Photo library → Upload a photo**, then pick it on a section under **Photos**. Save and publish.
5. Prices: **Experiences & stories** or the **Pricing** button on a tour page.
6. Made a mistake? **History & backups** → choose an earlier revision → **Rollback**.

## Not verified from the build environment

The build sandbox couldn't reach `fezguidetours.com` or the Cloudflare API, so the live Access login, the domain move and the first remote publish must be checked once by the owner (steps 2–5).
