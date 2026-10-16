# CMS request/revision safeguards — focused local evidence

Scope: the authenticated CMS request budget and aggregate immutable-revision growth findings in security review check 28, with local non-logging regression coverage related to check 35. This is **not** a completed security audit or release approval. No production request, database mutation, configuration change, commit, push, or deployment was performed.

## Controls

### Shared request admission

`worker/cms-request-budget.ts` uses conditional SQLite writes in one D1 atomic batch, following the existing upload reservation pattern. It does not use isolate/process memory as an authority. Time comes from SQLite `unixepoch()`, not request headers or a caller-supplied timestamp.

| Bucket | Authenticated operations | Per verified subject | Site-wide aggregate | Window |
| --- | --- | ---: | ---: | --- |
| read | content, revision list/detail, private media GET/HEAD | 300 | 600 | 60 seconds |
| write | draft, publish, rollback, validate, upload attempts | 60 | 120 | 60 seconds |
| recovery | backup, orphan dry-run, restore attempts | 6 | 12 | 3600 seconds |

Windows are fixed windows anchored on first admission, not rolling-window guarantees; boundary bursts can span two windows. Buckets are independent. Recovery restore is charged to the recovery bucket, not additionally to write. Existing upload-specific accounting remains in force.

Authentication, authorization, origin checks, route and method checks precede accounting. Admission then precedes body reads/parsing, schema validation, document/revision selection and R2/recovery work. Invalid admitted attempts consume capacity. Rejected rate attempts do not consume another editor's site-wide capacity. Recreating a handler or reopening the database does not reset counters.

Numerical/counter-cardinality denials return `429 {"error":"cms_request_rate"}`, `Cache-Control: no-store`, and conservative `Retry-After: 60` or `3600`. Unavailable/missing database schema fails closed with a generic 503. Static admin asset delivery, unauthenticated verification cost and public CMS/media reads are not covered by this authenticated application limiter; parent must address public/platform abuse protection separately.

The table has three site aggregate rows plus at most 256 active subject/bucket rows admitted by this helper. Existing rows remain usable when that bound is reached; new rows fail closed. Expired subject rows are deleted on the next budget operation. There is no timer/background TTL: expired rows can remain at rest during inactivity, but historical windows do not accumulate. Verified subjects are private accounting metadata (as in existing upload accounting), not request/body/token/IP logs; they are not exposed in rate responses. No extra subject hashing, secret, client identifier or telemetry was introduced.

### Immutable revision storage

`migrations/0003_cms_release_safeguards.sql` initializes a singleton aggregate from **all existing revisions** using `length(CAST(document AS BLOB))` for UTF-8 bytes. BEFORE/AFTER INSERT triggers enforce and charge:

- at most **1000** retained immutable revisions;
- at most **24 MiB (25,165,824 bytes)** of retained revision document JSON, across draft, publication, rollback and restore copies.

These are JSON payload limits, not an assertion about physical D1 database file/index size. Trigger accounting and document-pointer CAS writes share the transaction: failed pointer updates roll back both the revision and its charge. Direct INSERTs also hit the storage trigger; no application preflight race grants extra capacity. Original no-update/no-delete triggers remain intact. Nothing deletes or rewrites revisions, media or owner content.

Storage denial is `507 {"error":"cms_revision_storage_budget"}` through the route, with no document/pointer changes. Normal under-budget save/publish/rollback/export/restore works, including the actual schema and multilingual seed. Restore remains draft-only. At the absolute cap all new immutable copies must stop; there is no reserved bypass for publish/rollback/restore. Reads and backups within the supported size remain available. Owner-approved capacity/recovery planning is required before exhaustion; do not silently delete history or raise the ceiling without revisiting backup memory/request limits.

The 24 MiB ceiling leaves headroom under the existing 32 MiB backup request path for at most 1000 revision envelopes and the existing bounded upload inventory. Backup/orphan routes check the durable aggregate **before** the existing full-row materialization. This bounds the current implementation rather than adding a streaming export system. It does not claim streaming, arbitrary-size backup support or an R2 aggregate-cost guarantee.

Migration of an already-over-budget database is non-destructive and succeeds: reads remain possible, subsequent revisions are denied, and backup/orphan HTTP operations return 413 before loading full history. Such an inherited database needs an explicitly authorized offline/paged backup and capacity plan; this change does not delete history to make it fit. No such production inventory or repair was performed.

## Verification actually run

Run from the project root:

```sh
node --test --test-concurrency=1 tests/cms-release-safeguards.test.mjs tests/cms-storage-safeguards.test.mjs
```

Result: **16 tests passed, 0 failed** (13 release-safeguard checks plus 3 existing upload-budget regressions). Latest run reported `duration_ms 4466.295364`.

Coverage includes exact UTF-8 byte and count boundaries; migration of existing history and over-budget history; immutable-history preservation; stale CAS and failed-transaction rollback; valid save/publish/rollback/recovery with the real schema and seed; storage denial on restore; all three exact identity thresholds; global and active-row limits; window reset/expired-row cleanup; signed-request route guards and generic responses; missing-schema 503; and no console logging during synthetic private-marker requests/errors. JWTs are generated in memory and never printed or persisted.

Concurrency checks use **three worker threads with separate real SQLite connections to the same temporary file**, released together only after all report ready. They exercise the final identity/site request slot, final CAS revision slot, and distinct direct INSERTs competing for the final storage slot independently of CAS. Another connection confirms persistence after restart. Temporary file databases are removed in `finally` blocks. The D1 adapter executes actual SQL, not mocked SQL results, using real `BEGIN IMMEDIATE`/COMMIT/ROLLBACK transactions.

```sh
node_modules/.bin/tsc --ignoreConfig --noEmit --target ES2022 --module ESNext --moduleResolution bundler --lib ES2023,DOM,DOM.Iterable --skipLibCheck worker/cms-store.ts worker/cms-routes.ts worker/cms-request-budget.ts
```

Result: exit 0, no diagnostics. The first attempt without `--ignoreConfig` returned TS5112 because this installed TypeScript requires it for an explicit file list; corrected command above passed.

```sh
node --test --test-concurrency=1 --test-name-pattern='D1 draft save is versioned' tests/cms-backend.test.mjs
```

Result: **1 test failed**, `no such table: cms_revision_budget`. This legacy fixture applies only migration 0001. It must apply migration 0003 (preferably all migrations in order) before the wider suite is meaningful. The fixture was not modified because it is outside the delegated file allowlist. Other old fixtures/scripts with hard-coded migration lists need the same parent-side update. There is intentionally no unsafe runtime fallback that bypasses a missing migration.

No Chromium, full-suite run, build, Wrangler/Miniflare runtime proof, remote D1 exercise or production verification was run here. SQLite proves the SQL/transaction behavior locally; actual Cloudflare D1 batch/trigger execution and deployed response behavior still require parent verification. Provider/Access/CI log access and retention were not inspected; check 35 remains externally unresolved. The existing 36-check audit files were not rewritten or declared current.

## Parent deployment/integration requirements

1. Keep the inherited Worker Builds -> PR preview -> main production flow. This patch does not migrate hosting or edit Wrangler/auth/media configuration.
2. Apply `0003_cms_release_safeguards.sql` after 0001/0002 to the correct preview/production `CMS_DB` **before** the matching Worker code serves authenticated CMS requests. The new code intentionally fails closed when schema is missing. No new binding, dependency, secret or environment variable is required; thresholds are code/migration constants.
3. Before production migration, inventory existing count and UTF-8 document bytes using a read-only aggregate and arrange the authorized backup/capacity plan. Existing above-limit data is retained, not repaired automatically.
4. Update older local test/runtime fixtures to include migration 0003, rerun appropriate regression checks, and exercise the shared D1 admission/trigger behavior in the actual local/preview runtime. Do not expose signed test tokens in reports.
5. Configure/verify public and unauthenticated abuse controls, platform logging/access/retention, and operational capacity alerts separately. Finish the broader security/release verification independently; these local results do not close checks 28/35 or approve deployment.

Changed paths: `worker/cms-store.ts`, `worker/cms-routes.ts`, new `worker/cms-request-budget.ts`, new `migrations/0003_cms_release_safeguards.sql`, new `tests/cms-release-safeguards.test.mjs`, and this document.
