# Access authentication — reviewed final fix

## Root cause

The original signing-key request used `redirect: 'error'`. Node accepts this option, but native Cloudflare workerd throws before making the request:

> Invalid redirect value, must be one of "follow" or "manual" ("error" won't be implemented since it does not make sense at the edge; use "manual" and check the response status code)

The verifier intentionally catches provider failures and denies access, so this runtime exception became `jwks_unavailable` and HTTP 401. The issuer/key server was healthy; prior synthetic fetch tests never exercised native Worker fetch option validation.

## Final change

Use `redirect: 'manual'` in `worker/cms-auth.ts`. Existing `jwksBody()` rejects all non-OK responses before reading/importing keys, so 3xx responses are NOT followed. Keep the exact issuer, audience, approved identity, RS256 signature, key strength, expiry, streamed byte limits, timeouts and bounded caches unchanged.

Removed the speculative platform-context alternative and all temporary public diagnostic responses/configuration. Authentication remains the original cryptographically verified assertion path. No static keys, cookie trust or bypass were added.

## Executed evidence

- Before fix: native workerd proof failed; both direct and wrapped native fetch threw the exact redirect-mode TypeError. Binding fetch was not the cause.
- After the one-line correction: real configured public JWKS returned HTTP 200 inside workerd; real native signature verification ran and denied an intentionally forged assertion. A second verification reused the key cache (one fetch, two signature checks). No owner token or remote writes.
- `node scripts/cms-access-native-proof.mjs`: exit 0 after final cleanup.
- Added regression for 301/302/303/307/308: no follow, no authorization, no repeated fetch during failure-cache window.
- `npm run build` (prebuild lint + full suite, then Vite) and `git diff --check`: exit 0. Full suite: 320 pass, 0 fail. The temporary platform/probe cases were removed with their discarded code; this is not a reduced security gate.
- Independent helper review was unavailable due provider rate limits; no independent sign-off is claimed.

## Deployment boundary

Ship this fix through the existing authorized feature branch and PR #12 / Workers Builds preview. Explicitly reload the deployed editor, verify signed-in content plus signed-out denial, and record the exact clean build. Do not merge or replace production as part of this authentication fix; the wider production security/performance gates remain open.
