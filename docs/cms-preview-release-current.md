# CMS preview release — current handoff

## Superseding update — authenticated dashboard restored

The owner reopened the dashboard. Read the exact isolated preview application `2c90c569-1b3f-4e1e-a0a3-84760c7a28f1`; applied its actual audience ONLY to `[previews.vars]`. Production audience remains unchanged. Enabled preview HttpOnly and verified the saved switch after reopening the exact application. Rebuilt through prebuild lint + all 319 tests, then Vite: exit 0; `git diff --check` also passed. The older desktop/audience blocker paragraphs below are historical and superseded by this update. Online deployment/authenticated publishing proof is still required; this is not production release approval.

## Verified execution

- `npm run lint && npm test && npm run build && node scripts/cms-browser-publish-proof.mjs && node scripts/cms-preview-smoke.mjs`: exit 0. Full suite: 319 pass, 0 fail, no skipped tests.
- Browser proof exercised English/French/Spanish live draft editing, draft save/reload, private drafts, publish in a separate public browser, Worker restart and exact rollback; no browser errors or CSP violations. Disposable local D1/R2/Images only; not operational Cloudflare Access proof.
- Fixed CI portability: pinned `happy-dom@20.14.5` directly, removed sibling-project DOM imports and machine-specific test temporary paths. `prebuild` now runs lint + the full suite, so inherited `npm run build` cannot skip them. `.node-version` pins the locally verified Node 24.20.0.
- After portability changes: real `npm ci && npm run build && node scripts/cms-rate-limit-proof.mjs` exited 0. Test output is in `fez-clean-install-build.log` under the active profile scratch directory. No dependency vulnerabilities reported by npm.
- Actual isolated workerd platform-binding proof: 600 allowed requests, next request 429 with Retry-After 60; static favicon still works. This is per-location throttling, not a global quota/spend guarantee or deployed proof.
- Last measured default mobile Lighthouse: performance 29, accessibility 100, best practices 100, SEO 100, CLS 0. Report: `fez-continued-lighthouse.json` in active profile scratch. Host benchmark changed substantially from the older run and Lighthouse warns the CPU is slower than expected. Do not claim 90 or performance clearance.

## Remote state and blockers

- Production application code has NOT been deployed/merged by this continuation. All CMS source remains uncommitted on `feat/customizable-cms`.
- The owner selected the existing `FezGuideTours approved editors` policy and the parent created `FezGuideTours isolated CMS preview`. The Applications list readback confirmed its exact intended hostname `feat-customizable-cms-fezguidetours.elhamlaouy.workers.dev` and existing policy. That saved Access application is protection only, NOT a deployed editor.
- Production Access application and isolated preview Access application are different. **The preview ACCESS_AUD in wrangler.toml still duplicates production and MUST be replaced with the actual saved preview application audience before creating the online preview.** Do not weaken JWT verification or accept arbitrary audiences.
- Current desktop bridge is unavailable: repeated `drive_preview` calls return `No Hermes Desktop window answered the preview action request`; `desktop_preview read` also fails. The fallback isolated browser reaches Cloudflare sign-in and has no authenticated dashboard session.
- Existing Wrangler OAuth works for Workers/D1, but lacks useful Access application access. Listing Access apps misleadingly returned success with an empty list; reading the exact known production application ID returned HTTP 403 / code 1010. This is NOT proof that applications were deleted. Do not keep retrying or widen operator credentials silently.
- Read-only API confirmed the isolated preview D1 database still exists. Worker settings API works; no application/provider write was performed in this finishing attempt.
- A request for the owner to reopen the Cloudflare Applications tab in Hermes Desktop timed out without an answer. Resume the owner dashboard connection to read the preview audience and cookie settings, then update ONLY preview vars.

## Remaining release path

1. Restore authenticated desktop dashboard access. Read exact preview application/audience; verify same two-email policy and HttpOnly/session settings. Set preview ACCESS_AUD, preserve production audience.
2. Check final config/source artifact scans and authorization, then commit/push authorized branch and open PR. Preserve inherited Cloudflare Workers Builds: production `npx wrangler deploy`, preview `npx wrangler preview`; do not introduce a second production deploy owner.
3. Read successful PR build and actual returned isolated preview URL; verify resource bindings and correct Access assertion in real owner login. Do not give an intended hostname to the owner as a working editor.
4. Prove online preview upload/edit/save/publish/rollback and signed-out/non-owner denial using isolated data. Preserve the local owner state, its six revisions and backups.
5. Refresh all 36 security rows with actual evidence, resolve remaining unknowns and performance work. Do not merge/deploy production while required checks remain blocked.

No secrets, authentication codes or Access JWTs belong in chat, reports, or Git. Existing credential-bearing provider configuration must be handled without exposing values.
