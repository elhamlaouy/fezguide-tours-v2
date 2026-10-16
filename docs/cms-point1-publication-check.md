# Point 1 — public page after publishing

## Scope

Investigate the prior browser timeout after Publish. No production deployment, remote CMS writes, commits, pushes or point-2 upload/login work. All new publication tests use disposable local Cloudflare state and leave the owner's state untouched.

## What the old failure established

`fez-timezone-browser-proof.log` recorded Publish's HTTP 200 followed by a timeout waiting for `.cms-page` on a subsequent public navigation. It did not preserve that navigation's HTTP status, response body or browser error array. Therefore it does not establish a failed database publication, and the precise historical reason for the missing rendered page cannot be proved from that log.

The old run reached Publish after 315177 ms. A fresh complete run reached it after 39833 ms and completed browser security checks after 62918 ms. This supports a materially slower prior test environment, but is not conclusive proof of a CPU/memory root cause. Do not report an unproven infrastructure cause as established fact.

## Investigation and test improvements

1. A minimal disposable Worker/D1 + Madrid-timezone Chromium probe loaded the original page, saved/published multilingual headings through the real endpoints, read back the exact published headings, and rendered them at `/`, `/fr`, `/es`. Exit 0; no browser errors or failed responses. Probe: profile scratch `fez-publish-diagnostic.mjs`.
2. Added explicit HTTP-200 assertions to public browser navigations in `scripts/cms-browser-publish-proof.mjs`. Non-200 navigation now fails immediately rather than appearing as a selector timeout.
3. Added bounded synthetic-public-page diagnostics on missing rendered content: locale, status, browser errors, CSP violations, snapshot presence and script sources. No assertion/cookie/token values are inspected or logged.
4. After Publish, assert the durable published pointer equals the new version and the public API exposes exactly the saved EN/FR/ES headings before testing the separate public browser.
5. Label each published locale check separately. Kept the original 30000-ms selector timeout; did not hide the failure by increasing it or retrying a failed assertion.

## Fresh execution

- Full real browser-button run: exit 0. EN/FR/ES live editing, save/reload, private draft, Publish visible in an independent public browser, Worker restart, exact stored/public rollback, no page errors or CSP violations.
- Both subsequent full runs with the strengthened pointer/API/navigation assertions: exit 0. Full logs: profile scratch `fez-point1-run-1.log` and `fez-point1-run-2.log`.
- `node --test --test-concurrency=1 tests/cms-date-timezones.test.mjs tests/cms-public-site.test.mjs tests/cms-integration.test.mjs && git diff --check`: exit 0; **18 tests passed, 0 failed, 0 skipped, 0 cancelled**.
- These are real local workerd/D1 and Chromium results, not proof of operational online Access login, uploads or production deployment.

## Conclusion / confirmation boundary

The publication/rendering flow currently passes repeatable end-to-end checks, including the exact stage that previously timed out. No persistent publication defect was reproduced, so no speculative change to publishing logic was made. The existing timezone-validator correction remains in the working tree and is exercised with Europe/Madrid in the browser.

Functional publication verification passes. The exact historical stall remains unconfirmed; do not claim a conclusively reproduced-and-fixed publication root cause. Stop here for the owner's review before point 2 or production work.
