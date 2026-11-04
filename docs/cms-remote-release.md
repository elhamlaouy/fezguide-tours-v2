# FezGuideTours remote release setup — historical record

> **Later scope supersedes the historical permission below:** current work is local repairs/read-only readiness only. No commit, push, deploy, production publication, new resource creation or provider-policy changes without fresh explicit authorization. Existing resource facts remain useful; reread actual state before use. See `cms-provider-readiness-20261020.md`.

## Historical authorization (superseded)

Supersedes the earlier billing-disabled hold in `cms-continuation-checkpoint.md`:
Owner said “ok so lets redeploy it then” and explicitly selected **Yes—enable R2, then deploy only after the checks pass**. R2 usage-billed activation approved; no additional paid subscription approved. Commit/push/PR/production release authorized only after checks. Preserve inherited PR → Cloudflare Workers Builds → main production path.

## Remote changes actually made and read back

Account: `417f3820605485ace5bdbb9576452f42`.

- R2 subscription active: dashboard checkout confirmation “Purchase complete / subscription is active,” $0 base, free allowances with possible overage charges.
- Production D1 `fezguidetours-cms`: `1256f794-3fe3-48fa-b747-c7536b1e842e`.
- Preview D1 `fezguidetours-cms-preview`: `0a0ffd04-1c44-4710-810d-cc8fe71229c5`.
- Production private R2 `fezguidetours-cms-media`; preview private R2 `fezguidetours-cms-media-preview`. Both Standard storage; list readback confirmed. For BOTH buckets, r2.dev access disabled, no custom domains, and CORS configuration absent (API10059, not a permissive policy).
- Applied migrations0001/0002/0003 to both fresh D1 databases; readback confirms exact migration names, singleton version0/null draft/null published, revision budget0/0. These empty databases are NOT yet connected to a new deployed release.
- Cloudflare Access self-hosted app `ed0ed452-a7ca-4119-98a6-797cc9e73fd2`, name `FezGuideTours CMS editors`.
- Exact production destinations `/admin` and `/api/admin` at `fezguidetours.elhamlaouy.workers.dev`; read back saved app destinations.
- Saved Allow policy `31984bec-05ea-43e9-9922-ac6f7b63bdae`, name `FezGuideTours approved editors`, explicit Emails include `elhamlaouy@gmail.com` and `fezguidetours1@gmail.com`. No Everyone rule. Parent entered both chips and saved policy.
- Audience (public identifier, not a credential): `ceca0a5d3c57647e2ee38ba429819025e496bbb9e90a1078315a2bc3616b3274`.
- Real issuer: `delicate-forest-c939.cloudflareaccess.com`; operational `/cdn-cgi/access/certs` HTTP200, two public keys.
- Enabled HttpOnly on Access cookie and saved. Need reread exact setting during final provider audit.
- Anonymous production `/admin` now HTTP302 to this real Access app. Preview pane shows “Log in to FezGuideTours CMS editors / Sign in with Cloudflare.” No authorized login completed yet. Current IdP is Cloudflare, not an email-code flow; client usability/OTP method still needs resolution.

## Local config changes

`wrangler.toml`: exact account, isolated production/previews D1/R2, Images binding, canonical/Access issuer/audience/two-email allowlist in each scope. `wrangler deploy --dry-run --outdir <profile scratch>/fez-worker-build` exited0 and listed intended production bindings; NO deployment performed.

Cloudflare Images documentation retrieved: Images Free includes5000unique transformations/month, over-limit new transforms fail9422 rather than billed; Images binding accepts raw bytes and is perWorker. Actual dashboard transformations reads0/5000. No Images Paid plan activated. Need actual remote upload/re-encode proof before release.

## Next gates / not done

- Configure preview Access destinations once exact PR preview URL is known; never share production database/bucket with test publication.
- Verify identity-provider choice permits both approved emails; complete real owner login without exposing secrets/codes.
- Determine initial content: preserve owner local saved state and media; do not overwrite it with seed or initialize remote with synthetic test markers.
- Finish security audit (independent helper), performance and artifact checks, then authorized commit/push and actual PR preview verification.
- Prove online upload/save/publish/reload/rollback in isolated preview, production release only after gates; operational backups/capacity protections/log access/retention still need proof.
- No commit, push, merge, new Worker deployment or production CMS publication yet. Existing live public release unchanged; admin paths are newly Access-protected.
