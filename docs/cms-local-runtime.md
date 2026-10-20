# Local CMS runtime

This file is the local proof path for the Worker CMS gate. It does not authorize deployment, remote D1, or a change to production bindings.

## What is wired

`worker/index.ts` calls `createCmsHandler({ validateDocument: validateCmsDocument })` before the legacy `/api/cms` KV handler and before asset fallback.

- `/admin` and `/api/admin/*` always enter the handler. Unauthenticated requests return `401` and never reach assets, even when `CMS_DB` is absent.
- Public `/api/cms` and `/api/cms/document` use D1 only when `CMS_DB` is configured. The handler returns the published projection, not the draft.
- If `CMS_DB` is absent, `GET /api/cms` keeps the existing KV read and still strips a top-level `bookings` key. Admin writes are not exposed.
- Authenticated `GET /admin` still falls through to assets. There is no local login bypass.

Production `wrangler.toml` is unchanged. Its KV id is not copied here.

## Local config

`wrangler.cms-local.toml` is local-only:

- D1 binding `CMS_DB`, database name `fez-cms-local`
- placeholder `database_id` `00000000-0000-0000-0000-000000000000`
- `run_worker_first` includes `/admin`, `/admin/*`, and `/api/*` so the SPA fallback cannot answer admin paths
- no account id, no remote id, no secrets, no KV binding

Do not run `wrangler deploy` or `d1 create` against this file. Always pass `--local`. Never pass `--remote`.

`/admin` is listed as well as `/admin/*` because the star pattern is not a reliable match for the exact path.

## Commands

From the project directory, with Wrangler `4.149.0`:

```sh
npx --yes wrangler@4.149.0 d1 migrations apply fez-cms-local \
  --local --config wrangler.cms-local.toml --persist-to "$PERSIST"
npx --yes wrangler@4.149.0 dev \
  --config wrangler.cms-local.toml --local --ip 127.0.0.1 --port 8787 \
  --persist-to "$PERSIST" --show-interactive-dev-session=false
node scripts/cms-local-smoke.mjs
```

The smoke script applies the migration with pinned Wrangler, then inserts the published seed and a later draft with bound parameters. `wrangler d1 execute --file` rejects the full seed as `SQLITE_TOOBIG`. It starts Wrangler, checks HTTP, and stops the server. It uses a scratch persist directory and does not create a remote database.

## Auth boundary

`worker/cms-auth.ts` accepts only an `https://*.cloudflareaccess.com` issuer and fetches that host's JWKS. It has no development flag or production bypass. A synthetic local issuer cannot be configured without changing that module.

Authenticated draft, publish, and stale-write HTTP through Wrangler are therefore not proven. Those storage behaviors are proven by `tests/cms-backend.test.mjs` and `tests/cms-integration.test.mjs` against the handler SQL in local SQLite. The integration test then reads the same database through `worker/index.ts`.

Wrangler proves:

- anonymous `/admin` and `/api/admin/*` are JSON `401`, not the SPA
- public `GET /api/cms` and `GET /api/cms/document` read the published D1 row
- a newer draft row is absent from that public JSON
- moving `published_revision` changes the public JSON
- an unauthenticated write does not change the public JSON
- the built public site still serves, including the Atlas Tactics credit

Still unproven on Wrangler: a signed Access JWT calling draft save, publish, or a losing stale write. Do not add a bypass to close that gap.
