# Full supported CMS: local acceptance and owner testing

## Release boundary

Owner requested completion and local testing before any deployment. This work authorizes local code and isolated local data only. No commits, pushes, remote provisioning or deployment. Preserve FezGuideTours' existing Vite/React/Cloudflare Worker stack, approved geometry and real source data. Fully customizable means all supported typed website fields and section/layout choices, not arbitrary application code, scripts, CSS injection, billing or authentication policy.

## Local completion gates

1. **Editor coverage:** form controls for page/SEO, all section types and approved variants, ordered arrays and references, products/editorial/blog/team/FAQ, settings/UI copy, navigation/footer, safe theme tokens, media metadata. Safe creation/removal and relationships. Reviews retain verified provenance. EN/FR/ES controls and draft-only import/export.
2. **Public rendering:** edited values actually affect public output after explicit publishing; valid CMS documents never revert to hardcoded defaults. Seed keeps approved business copy, photos, product/editorial distinction, contacts and one Atlas credit.
3. **Routing:** new CMS-only pages have stable URLs; EN/FR/ES deep links, old query links, browser back/forward, hidden/missing-page behavior tested.
4. **SEO:** initial HTML metadata, canonical, Open Graph and visible-content-derived JSON-LD; published-only sitemap and robots. Do not claim rankings or perfect Lighthouse scores.
5. **Recovery/budgets:** validated document backups/import into draft; media preservation across revisions; complete isolated local backup/restore proof. Durable bounded uploads/storage, no unsafe deletion of retained media.
6. **Local test runtime:** real Worker/D1/R2/Images behind loopback-only harness with signed local identity. Production JWT verification unchanged, no production auth bypass. Persistent isolated local state, repeatable restart. Synthetic local identity is not production Access login proof.
7. **Verification:** independent specification then quality reviews; typecheck, all regression tests, build, actual HTTP and browser testing, narrow mobile checks and measured performance. Resolve actionable defects before delivery.

## Owner test script

- Open local public site and editor.
- Change title and section text in each language; save draft. Public site must stay unchanged.
- Switch desktop/mobile draft preview.
- Upload an image; select it, change alt/caption, reorder gallery; save, reload and verify preview.
- Add a custom page and navigation link; set SEO and publish explicitly. Open its direct URL and refresh; use browser back/forward.
- Edit product details, global contacts, theme settings and navigation/footer; confirm preview and published output.
- Hide a page/media-containing section; verify it no longer appears publicly.
- Export a backup; import into draft only; verify no automatic publication.
- Publish another change, then roll back a revision and verify public values/media return exactly.
- Try invalid fields; errors must preserve draft and prevent writes/publication.

## Not production approval

Actual Cloudflare Access login, owner identity allowlist, isolated remote databases/private storage/Images eligibility and costs, remote capacity rules, production publishing and operational backups must be configured and verified after explicit owner approval. Local completion does not certify these external settings. Booking intake remains a WhatsApp handoff, not a database-backed booking submission.
