# FezGuide end-to-end suite

Runs against the local stack or production. Only touches the site through HTTP and a real Chromium; nothing in `src/` or `worker/` is imported.

| Suite | What it checks |
| --- | --- |
| `api` | 21 editor-API security checks (rejected writes leave content untouched; the two Cloudflare Access checks are production only). |
| `editor` | The editor UI in Chromium: draft privacy, publish, EN/FR/ES, price tool, hide/add/reorder sections, photo upload + use, new page, design change, two-editor conflict, Google length counters (`N/42`, `N/155`), live-preview link behaviour (select vs browse, ctrl-click), 390px no-overflow, rollback, no browser errors. |
| `public` | Every `/sitemap.xml` URL rendered: status, one `<h1>`, title/description/canonical/hreflang, JSON-LD (WebSite, TravelAgency, WebPage, BreadcrumbList, Product on priced tour pages), internal links, every distinct internal link returns 200, robots/sitemap validity. Production only: `www` 301, Access redirects. |
| `ssr` | Only with `--expect-ssr`. Raw HTML without JavaScript must contain one `<h1>` equal to the rendered one, >= 200 chars of text, internal links, and every raw text chunk must exist in the rendered page. Fails until the SSR feature ships. |

## Flags

`node scripts/e2e/run.mjs [--base URL] [--suites api,editor,public,ssr] [--production] [--expect-ssr] [--allow-dirty] [--out DIR] [--headed]`

- `--base` default `http://127.0.0.1:9196`. `--suites` default `api,editor,public`. `--expect-ssr` also adds `ssr`.
- `--out` default: a fresh directory under the OS temp dir. Holds failure screenshots, `snapshot-*.json`, `summary.json`.
- Exit code 0 only if every check passed (and the final restore verified), 1 on failures, 3 if aborted because the draft is dirty.

## Local

```sh
npx vite build
CMS_PREVIEW_WRANGLER=$PWD/node_modules/wrangler/bin/wrangler.js node scripts/cms-preview.mjs --state /tmp/e2e-state --port 9396 --upstream 9397 --inspector 9697 &
NODE_PATH=$(npm root -g) node scripts/e2e/run.mjs --base http://127.0.0.1:9396 --suites api,editor,public
```

No credentials: the launcher proxy injects a signed synthetic identity. Playwright is resolved from the repo or from the global `npm root -g`; browsers are never installed.
Use a fresh `--state` directory for each fresh run if you can (the recovery budget below persists in the local D1).

## Production

```sh
export E2E_ACCESS_CLIENT_ID='<id>.access'   # the secret header is injected by the environment network proxy; never set or print it here
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt NODE_PATH=$(npm root -g) \
  node scripts/e2e/run.mjs --base https://fezguidetours.com --production --suites api,editor,public
```

`E2E_ACCESS_CLIENT_ID` is sent as `CF-Access-Client-Id` on every request to the base host (Node fetch and Playwright). The `NODE_*` variables route Node fetch through the container proxy and are only needed in that environment.

## Safety

- Before any write the suite snapshots `GET /api/admin/content` and `GET /api/cms/document`. It aborts without writing if the editor draft differs from the published document (unsaved owner work) unless `--allow-dirty`.
- The `editor` suite publishes test content, then rolls back via the History UI. Whatever happens (also on failure or Ctrl-C) `run.mjs` finally verifies the published document is byte-identical to the snapshot and rolls back through `POST /api/admin/content/rollback` if not. This adds revisions to the history (the original revision is restored as a new one).
- Uploaded test photos stay in the media store (R2/D1) after rollback. The summary prints `uploadedMedia` (`/media/upload-*.jpg`); delete those objects from R2 afterwards.
- Rate limits: the write budget is 60 requests/minute/identity, and the backup export is in the `recovery` bucket, 6 per hour per identity. A backup that is rate limited is reported as a warning, not a failure. Do not run the suite in a tight loop.
- Locally, the miniflare proxy can drop the next connection after an early 413 (oversized body); the oversized-body check therefore runs last and `ctx.getJson` retries 5xx.

## Known findings (not weakened, reported)

- `Blocked script execution in 'about:blank' … sandboxed` messages are a **test-harness artifact**: Playwright injects helper scripts into frames to drive locators, and the live-preview iframe is deliberately sandboxed without `allow-scripts`. They are ignored by the generic error watcher. A dedicated check clicks preview links with real mouse coordinates (no frame injection) and requires **zero** console errors.
- Meta descriptions outside 120-160 characters are reported as a `WARN` (SEO content, not a defect).
