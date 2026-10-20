# CMS recovery and storage safeguards

## Protected document recovery (production-applicable Worker API)

All routes below use the same verified, allowlisted Access identity as the editor
and `Cache-Control: no-store`. There is no recovery bypass.

- `GET /api/admin/recovery/backup`: `fez-cms-backup-v1` JSON containing the current
  version/draft/published pointers, every retained immutable revision with its
  schema-valid document and SHA-256, and a deduplicated uploaded-media manifest
  (`key`, `bytes`, `sha256`) across **all retained revisions**.
- Download each manifest object's exact bytes through the existing protected
  `GET /api/admin/media/<key>`. Public `/media/<key>` is not a complete backup
  source: unpublished/unused/old-revision objects are deliberately private.
- `POST /api/admin/recovery/restore` accepts exactly
  `{backup, revision, expectedVersion}`. It validates the archive's documents,
  immutable revision hashes, pointers/source references and manifest completeness,
  then checks every referenced object exists in R2 and matches exact bytes/hash.
  Missing or changed media fails **before any document write**. A successful
  restore appends only the selected document as a new **draft**, using the same
  optimistic version guard. It never moves the published pointer. Preview the
  draft, then explicitly publish it through the normal publish API.
- `GET /api/admin/recovery/orphans`: quarantine/GC **dry run only**, including
  candidates older than seven days. It excludes uploads referenced anywhere in
  any retained revision, including removed/hidden media library/legacy copies.
  Recent orphans stay quarantined. `deleted` is always zero. This is NOT an
  authorization to delete a candidate later without another complete reference
  check and an owner-approved retention policy. Original objects/revisions are
  never automatically deleted.

Export/restore is bounded to 1000 revisions and a 32 MiB archive request;
large archives fail explicitly instead of silently dropping history. R2 inventory
is capped at 1000 objects for the dry run; oversize/incomplete inventory fails
closed. Use a full local snapshot for larger local histories. The JSON export is
not itself a complete object-byte backup. Cross-account production R2 byte restore
and scheduled/offsite production backups are not implemented by the local tool.
Static repository images are source assets, not uploaded R2 objects; preserve the
repository/build separately. Archive hashes detect changed bytes, not authenticity
against an attacker who can rewrite an entire backup; restrict backup access.

## Complete local D1 + R2 snapshot

Stop the launcher first (Ctrl-C), and ensure no other Wrangler uses its folder:

```sh
node scripts/cms-local-backup.mjs backup .wrangler/cms-owner-preview .wrangler/backups/owner-001
node scripts/cms-local-backup.mjs restore .wrangler/backups/owner-001 .wrangler/cms-restored-check
node scripts/cms-preview.mjs --port 9296 --upstream 9297 --inspector 9597 --state .wrangler/cms-restored-check
```

Targets must be NEW, isolated directories. Backup/restore refuses overlapping
paths, existing targets, symlinks/special files and invalid manifests. Each file's
SHA-256/byte count and the complete inventory are verified before the restored
state is renamed into place; partial staging is removed on failure. The state
lock and pre/post inventory comparison protect a stopped-state snapshot, not a
live SQLite snapshot; never copy a running Miniflare state directory manually.

This LOCAL snapshot contains complete SQLite/R2 data (including orphan uploads,
revision history, publication pointers, reservation accounting and metadata), not
just the active draft. Restoring to an isolated folder faithfully preserves the
snapshot's historical publication state; it does not publish on a remote site.
The HTTP recovery API instead always restores a draft. Snapshots contain private
editor history and local simulator details: keep them out of Git/public assets.

`node scripts/cms-preview-smoke.mjs` proves a real upload/save/publish/restart,
complete stopped-state snapshot, isolated restore, unchanged D1 pointers and
exact uploaded object bytes. It uses no production resources.

## Durable upload budgets

Apply `migrations/0002_media_budget.sql` before enabling uploads. Worker-enforced
application defaults (NOT Cloudflare account quota claims):

| Limit | Default |
| --- | --- |
| Image input/output | 8 MiB each |
| Decoded dimensions | 8192 per dimension; 12,000,000 pixels |
| Per verified identity upload attempts | 30 per rolling hour |
| Aggregate stored + pending bytes | 256 MiB |
| Aggregate stored + pending upload objects | 500 |

A single conditional D1 insert atomically reserves one object and the worst-case
8 MiB before reading/decoding the image. Concurrent final-slot requests cannot
both win. Stored objects are charged their actual re-encoded bytes; uploads not
added to any document still count (orphans cannot evade quotas). Format/metadata
errors reject before reservation; decode/size failures release reserved bytes but
retain the attempt for the rolling-hour rate. Successful objects cannot release
accounting merely because an editor removes them from the current draft.

The object key is durably recorded before R2 put. R2 transport errors/process
crashes after a write starts are ambiguous; their pending reservations remain
charged conservatively, even if the request reports failure. They do not expire
automatically, because releasing a reservation while a delayed R2 write completes
could undercount storage. Reconcile the exact recorded key, age, object bytes and
all retained revision references offline before changing any such accounting;
there is deliberately no unsafe timed auto-release/delete endpoint. Failed
pre-write reservations release bytes; rate attempts remain durable. This can
require operator intervention after a crash rather than allowing unlimited
uploads. No automatic attempt-ledger pruning/production scheduler is claimed.

These budgets cover uploads made through this Worker after migration. If adopting
an existing/nonempty R2 bucket from an older implementation, inventory and import
its existing objects into the accounting ledger **before** enabling production
uploads; otherwise historical objects predate the ledger and are not counted.
This project has provisioned no production media bucket. Raising limits requires
checking actual D1/R2/Images account allowances and costs, not assuming unlimited
Cloudflare free-tier capacity. Real decoding/re-encoding and metadata stripping
remain mandatory; header sniffing alone is not accepted.

Checks:

```sh
node --test tests/cms-recovery.test.mjs tests/cms-storage-safeguards.test.mjs tests/cms-media.test.mjs tests/cms-preview-launcher.test.mjs
node scripts/cms-media-local-smoke.mjs
node scripts/cms-preview-smoke.mjs
```
