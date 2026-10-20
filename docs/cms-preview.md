# Persistent loopback editor preview

From this project directory, after `npm run build`:

```sh
node scripts/cms-preview.mjs
```

Open **http://127.0.0.1:9196/admin**. The public preview is at
http://127.0.0.1:9196/. `localhost:9196` also works. This launcher does not
install npm packages: it uses an installed Wrangler or an existing cached
**4.149.0**. If necessary, set `CMS_PREVIEW_WRANGLER` to the absolute path of
Wrangler's `bin/wrangler.js`. It needs the project's already-installed `tsx`.

- Front proxy: `127.0.0.1:9196`.
- Real local Wrangler Worker: `127.0.0.1:9197`; inspector: `9497`.
- Persistent local D1/R2 state: **`.wrangler/cms-owner-preview`**.
- Real local Images decoder/re-encoder, not a header-only image fixture.
- Every startup applies local migrations. Only a database at version zero with
  no draft receives `createCmsSeed()` and its initial publication. Existing
  edits/drafts/publication pointers are never reset or automatically republished.
- Ctrl-C/SIGTERM closes the proxy and local Wrangler, but retains D1/R2 state.
- Rebuild after source changes, then restart this launcher to refresh assets.
- The separate preview on port 9195 is not managed or touched by this launcher.

Optional isolated ports/state:

```sh
node scripts/cms-preview.mjs --port 9296 --upstream 9297 --inspector 9597 --state .wrangler/cms-isolated-preview
```

## Security boundary and honest limitations

This is **synthetic local authentication, not operational Cloudflare Access**.
The Node proxy generates an ephemeral RSA key and approved test identity, keeps
its private key in memory, strips caller auth/cookies, and adds a short-lived
signed assertion only to private editor requests. A scratch-only Worker entry
uses the existing trusted-JWKS fetch test seam. The real, unchanged verifier
still checks RS256 signature, issuer, audience, expiry and identity allowlist.
Only the public JWKS is written to scratch; no browser token, PIN, shared
password, production dev flag or production authentication bypass is added.
A restart rotates the key. Anonymous/forged assertions directly against the
upstream still return 401. Public API/media routes receive no synthetic auth.

Both servers bind loopback. The proxy rejects remote peers, unexpected Host,
absolute URLs, cross-site Fetch Metadata, foreign Origin, embedded frames and
writes without an exact preview Origin. Do not tunnel, expose, publish or deploy
this harness/configuration. Anyone already able to run commands on this machine
can use this LOCAL owner identity: it is not a multi-user login system.
The generated Worker is an editor/API harness plus built assets; it is not proof
of operational Access HTTP/JWKS integration or all production-only integrations.
No remote D1/R2 resources are provisioned or contacted by these commands.

The state lock prevents cooperating preview/backup processes from using a state
folder simultaneously. If a force-kill leaves `<state>.lock`, inspect the recorded
PID and confirm no Wrangler process uses that state before manually removing the
stale lock. Stale locks are not automatically removed because that would race
another launcher. Never point another Wrangler process at the same folder.

## Executable proof

```sh
node --test tests/cms-preview-launcher.test.mjs
node scripts/cms-preview-smoke.mjs
```

The smoke uses disposable scratch state and free loopback ports. It exercises
admin HTML, signed authentication, anonymous upstream rejection, Host/CSRF
rejection, real D1 save/publish/reload, real Images upload and R2 reads, restart
without reseeding, protected backup hashes, draft-only restore, and a complete
local SQLite/R2 snapshot restored into an isolated folder. It removes its own
state and never modifies the owner's `.wrangler/cms-owner-preview`.

See [cms-recovery.md](cms-recovery.md) for backups and storage limits.
