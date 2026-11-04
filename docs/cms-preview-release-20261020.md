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

## Hosted preview and later owner decisions

The authorized preview release is now commit `7d98a2ed8e85e7c4c66fb9a94c3e2d01455ba26b`; its exact-SHA Cloudflare checks succeeded and actual authenticated editor/public navigation worked. Code deployment preserved all10original immutable rows. These facts supersede the pre-deployment future-tense statements above.

The owner subsequently selected €125 per vehicle for the Custom Private Day Trip, accepted the disclosed current local72mobile performance for launch with speed work afterward, and explicitly authorized an approved-content-only preview save/publish/rollback proof. Actual owner-UI operations created draft11, publication12, rollback13 from10 and final rollback14 from12. Final preview pointers are14/14/14; the fresh public-facing preview shows €125 per vehicle. All10original rows remain exactly unchanged. Only the canonical amount and its matching EUR compatibility field differ from the prior published document; other owner content and manual equivalents are preserved. Diagnostic/private evidence remains local.

The small Spanish review-interface follow-up was independently approved at exact file hashes, passed the clean446-test/TypeScript/Vite gate, and was committed/pushed as `e5334f85c58bf82431e3abe294fd8f5fa5f4f69c`. Its exact-SHA Workers Build succeeded. The freshly opened Spanish custom-trip page displays the corrected Spanish explanatory paragraph and “Leer las 82 opiniones en Tripadvisor”, while preserving original attributed reviews and €125 per vehicle. Fresh protected editor content loaded14/14/14 with “Draft saved”. After code deployment, all14complete history rows, pointers, upload reservation and revision budget still match the pre-deployment source snapshot. An initial read-only query returned authentication10000; existing OAuth whoami and the exact-ID retry succeeded without new credentials or grants.

A local-only production-transfer preflight remains separate from release permission.

## Remaining acceptance

Latest local performance72mobile/94desktop is not a new deployed score. The owner explicitly deferred the previous prelaunch mobile target; this is acceptance of a limitation, not an achieved improvement. Final owner-visible review, the two-file follow-up release, production data-transfer readiness and production authorization remain separate. The prior security audit is not a blanket clearance. Production remains unchanged until separately approved.
