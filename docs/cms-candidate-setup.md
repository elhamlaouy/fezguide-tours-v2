# Isolated CMS candidate: setup and release gates

This is an additive candidate in the inherited FezGuideTours repository, not a replacement site. Preserve the production Worker, old preview, original content and immutable revision history. Never import an old preview over newer production content.

## Prerequisites

- Use the verified Node **24.20.0** runtime and its bundled npm. Native tests use `node:sqlite`; do not substitute an older deployment-builder default.
- Python **3.11 or newer** is required: configuration tests use stdlib `tomllib`.
- Install this repository's pinned dependencies with `npm ci`. Do not reuse another project's dependencies or install an unpinned Wrangler.
- Set `TMPDIR` explicitly to a private writable scratch directory with no symlink ancestors. Backup/restore tests intentionally reject ambiguous paths. On this workstation use the profile's configured scratch directory, not the system temporary-directory alias.
- Run full builds, native runtime proofs and browser/performance checks serially. Do not run them concurrently on this workstation.

## Normal verification

From the project root, with the intended Node first on `PATH` and `TMPDIR` set:

```sh
node --version
python3 --version
npm ci
npm ls --depth=0
npm run build
npm audit --audit-level=low
git diff --check
```

`npm run build` runs TypeScript and the normal tests before Vite. Its mandatory postbuild gate then recomputes the current source/build identity and compares the complete recorded release metadata and both candidate configurations. A missing `dist`, stale expected metadata or stale configured identity must fail. Do not remove/skip the postbuild gate or regenerate its expected values automatically to make an ordinary build green.

### Deliberate release-identity refresh

After an authorized source change, a stale-identity failure is expected until a new release has been reviewed. Build the proposed artifacts explicitly:

```sh
npm run lint
npm test
./node_modules/.bin/vite build
node scripts/cms-release-identity.mjs
```

Review the actual output before updating the expected metadata at `docs/evidence/cms-completion-20261024/final-release-identity.json` and the identity variables in **both** isolated candidate TOMLs. The contract distinguishes validation policy, source/renderer identity, the complete asset-manifest identity (`CMS_ASSET_ID`), and the actual built HTML-shell digest (`CMS_SHELL_ID`). The full manifest identity is not the digest of `index.html`. Preserve both checks; never substitute fixture values or remove shell verification.

Then rerun the complete normal verification, followed by the actual-release lifecycle proof and independent SPEC/quality review. An identity refresh alone does not establish working Publish/Rollback/bootstrap.

## Optional private historical proofs

Ordinary builds do not require or read private archives. Two additional checks are explicitly enabled by the operator:

- `CMS_SOURCE14_PROOF`: local path to the private query-result envelope expected by `tests/cms-document-parts.test.mjs`.
- `CMS_PROJECTION_SOURCE_FILE`: local path to the source accepted by `tests/cms-projection-parts.test.mjs`.

For the shared envelope, the second array element must contain `results` with the unique revision-14 row `{version: 14, document: <the exact archived document string>}`. Preserve the archived document bytes; adapt only an external test envelope. A private transfer-batch archive is not itself this query-result envelope. These variables must never trigger a remote import, mutate an archive or seed a database. Use a private directory/file and keep all private inputs and generated document dumps out of Git and logs. Record enabled versus skipped proofs honestly.

## Disposable local lifecycle proof

After the reviewed build and identity refresh:

```sh
node scripts/cms-staged-native-proof.mjs --cross-host --uploads --actual-release
```

This proof must use actual release-derived bundle/shell identities with disposable **local** storage. Synthetic local signatures and loopback origin substitutions are test seams, not proof of real Cloudflare Access login or hosted runtime CPU. Prove private Save, explicit Publish, anonymous public HTML/API/media, exact Rollback, upload privacy/revocation and retained source state. Keep any unsupported/untested scenario explicit.

## Only two isolated deployment targets

| Purpose | Configuration | Worker/host |
| --- | --- | --- |
| Protected editor | `wrangler.cms-candidate-app.toml` | `fezguidetours-cms-candidate-app`, intended host `app.fezguidetours.com` |
| Noindex public test | `wrangler.cms-candidate-public.toml` | `fezguidetours-cms-candidate-public`, separate workers.dev host |

Both must bind only the new candidate D1/R2. No shared legacy KV. Preserve required fail-closed public rate limiting. The editor is custom-host-only, behind the saved Access application's exact audience and exactly the approved two editors; no workers.dev/version alias or bypass policy. The public test is noindex and has no business-SPA fallback for missing static assets.

Check local bundling without uploading:

```sh
./node_modules/.bin/wrangler deploy --dry-run --config wrangler.cms-candidate-public.toml
./node_modules/.bin/wrangler deploy --dry-run --config wrangler.cms-candidate-app.toml
```

Dry-run success is not a deployment or hosted binding/authentication proof. Do not run a bare `wrangler deploy` or `wrangler preview`, and do not use the root/inherited Wrangler configuration to publish this candidate.

## Source control and hosted release

Commit/push authorization is separate from test/review clearance. Stage only the explicitly reviewed candidate paths; never add the evidence directory wholesale. Keep credentials, private archives, owner-state dumps, `dist`, local state, scratch fixtures and machine-specific probes out of the commit.

**Inherited automatic builds are explicitly blocked in this candidate.** Cloudflare documents `WORKERS_CI=1`, `WORKERS_CI_BUILD_UUID`, `WORKERS_CI_BRANCH` and `WORKERS_CI_COMMIT_SHA` as injected build markers. The first `prebuild` step refuses those environments before lint/tests/Vite and before the provider can reach its old-preview deploy command. This guard does not edit the inherited provider pipeline or the production branch. Local verification and independent GitHub CI remain available. Do not bypass/remove the guard, rely on an undocumented `[skip ci]` convention, or push until the complete candidate and this guard have passed independent review and the authorized source-control/deployment path has been verified. No production merge/cutover is authorized by this document.

After an approved isolated deployment, read back the exact deployed artifacts, release identities, resource bindings, Access/domain and public-bucket exposure settings. Then prove real approved-editor login and the hosted lifecycle, including anonymous delivery, negative auth/origin checks, noindex/asset 404s, and provider CPU/quota behavior. Preserve original production and old-preview state. A configured Access app, empty migrated D1, login redirect or green local suite is not a usable deployed CMS. Do not describe intended hosts as working previews until those gates pass.
