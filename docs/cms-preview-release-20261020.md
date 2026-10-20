# Preview release — 2026-10-20

## Current owner decisions

Owner requests shipping today and explicitly selected:
- Authorize committing and pushing tested work to update the isolated preview; **ask before production**.
- Keep the existing approved photographs and accept their disclosed sharpness limits for launch. No upscaling or unapproved substitutions.

This supersedes the earlier local-only prohibition only for the approved branch preview. It does not authorize main merge, production deployment/publication, provider-policy changes, new resources, account recovery or overwriting CMS owner data.

## Delivery path

Existing private `elhamlaouy/FezGuideTours`, branch `feat/customizable-cms`, PR12. Preserve inherited PR-triggered Cloudflare Workers Builds. Do not install the house Pages deploy pipeline. Runtime/tests/assets plus this release note only; diagnostic evidence, browser traces, private snapshots and backups stay local.

Base HEAD and remote preview head confirmed `19d3317982afc285085565d2708660e4851e3cf2`; production/main remains `241dca78c7c89dc5803082a4804681fc5b7529a9` before this release. Clean npm ci completed with0reported vulnerabilities. The first archived-source build caught a Git-history-dependent layout test (444pass/1fail), not a runtime failure. Its exact five approved source blobs are now a hash-pinned test fixture; unchanged DOM/class assertions pass without Git history. Targeted7/7 and the final clean full build445/445,0fail/0cancelled, TypeScript and Vite all pass. One extra EOF blank line was removed. Both independent reviews approved the bounded preview candidate and the portable fixture follow-up; parent matched the full reviewed runtime fingerprint and the exact reviewed test/fixture hashes. No old green check is clearance for the next SHA.

The owner completed a fresh protected-preview sign-in; actual editor content loaded at existing version10/draft10/published10 with “Draft saved”. No Save/Publish operation was performed. Before code deployment a private read-only database snapshot of all10immutable revision rows and pointers was captured, with0rows written. Initial CLI authentication failure is retained; existing OAuth whoami succeeded and the exact saved database-ID read succeeded. No credentials were printed or new grants created.

## Remaining acceptance

Latest local performance72mobile/94desktop is not a new deployed score and does not meet the previous mobile target; photo-quality acceptance does not waive that target. Fresh preview runtime, authenticated editor/data preservation, security controls, exact new-SHA check and owner review still required. Production remains unchanged until separately approved after those checks.
