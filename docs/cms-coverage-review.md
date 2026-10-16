# Independent CMS editable-coverage review

## Verdict

**Not yet accurate to describe this as complete, effective whole-site editing.** The editor, schema and save/reload tests cover a large surface, but several valid saved values have no public consumer, retain stale business contact targets, overwrite another currency, or erase another locale's owner-authored content.

This review changed no application source, configuration, database or service. No owner-server access, commit, push, deployment, remote creation or production write was performed. The only repository artifact created by this reviewer is this report. Scratch probes are outside the repository.

## Execution and scope

Executed successfully:

```sh
node --test tests/cms-renderer.test.mjs tests/cms-schema.test.mjs tests/cms-seo.test.mjs tests/cms-editor-controls.test.mjs tests/cms-entity-propagation.test.mjs tests/cms-brand-booking.test.mjs tests/cms-theme.test.mjs tests/cms-routing.test.mjs tests/cms-public-site.test.mjs
# 133 passed, 0 failed

node --test tests/cms-admin.test.mjs tests/cms-live-preview.test.mjs tests/cms-history-guard.test.mjs
# 41 passed, 0 failed

npm run lint
# tsc --noEmit, exit 0

node /home/ubuntu/.hermes/profiles/website-builder/cache/scratch/cms-coverage-probe.mjs
node /home/ubuntu/.hermes/profiles/website-builder/cache/scratch/cms-shell-coverage-probe.mjs
# Both exit 0; observed defect states described below.
```

The existing suites total **174 passing tests**. The first independent probe additionally renders **27 seed pages × EN/FR/ES = 81 page/locale outputs**, mutates the real authoring helper, validates changes, performs a JSON export/import round trip, and renders the resulting document. The second mounts real shell, booking, floating contact and iframe-preview components in Happy DOM with simulated published API responses; it intercepts `window.open`, never contacting WhatsApp.

Probe output: `/home/ubuntu/.hermes/profiles/website-builder/cache/scratch/cms-coverage-probe-output.json`.

**Persistence qualification:** JSON round trips and mounted save/reload tests are not a claim that an actual Worker process was restarted or that production changed. The parent task owns real isolated-Worker edit/save/reload/publish/restart/rollback verification. These findings identify data-to-output defects that persist even when the document is saved perfectly.

Source reviewed: editor metadata, mounted structured controls/workspaces, labels, seed/schema/entity projection, all public section consumers, Navbar/Footer, booking/floating contact, theme CSS, routing, SEO and document/store behavior. References below are to the reviewed local source; later fixes can move line numbers.

## Findings requiring fixes

### F1 — P1: canonical WhatsApp edits do not update major public contact actions

**Evidence:** `src/components/FloatingWhatsAppButton.tsx:17–25,103–119`; `src/context/CmsContext.tsx:120–128`; `src/cms/seed.ts:90,115,147,174`; `src/cms/SectionRenderer.tsx:113–125,294–310,442–448`.

- Set `siteSettings.whatsappNumber` to `212600123456`, validate, round-trip and render.
- Footer and booking use `https://wa.me/212600123456`.
- The actual floating contact action still opens `https://wa.me/212719603009?...`; its default message also still says `FezGuideTours` after changing `siteSettings.siteName` to `AUDIT NEW BRAND`.
- Nine seed pages retain `wa.me/212719603009` in their section actions: `home`, `travel-tips`, `tips-plan-trip`, `our-fez-tours`, `daytrip-chefchaouen`, `daytrip-meknes`, `daytrip-ifrane`, `daytrip-custom`, `our-food-tours`. None of these rendered page bodies uses the new number.

**Cause:** floating contact reads compatibility `siteSettings`, which the public provider deliberately resets to source contact values, instead of `publishedDocument.siteSettings`. Seed page contacts are copied literal URLs and `Actions` emits them unchanged. They are independently editable, but the global settings help promises whole-site contacts (`src/admin/editor-workspace.ts:32`).

**Smallest fix:** make floating contact prefer the canonical document and canonical page/product title. For default business contact actions, resolve a typed business-contact binding from current settings, or migrate only known default contact targets on settings change while preserving custom external links. Do not indiscriminately rewrite arbitrary owner-authored URLs. Regress footer + navbar drawer + booking + floating click + every seeded contact/booking action after one global number change.

### F2 — P1: the UI-copy editor mostly exposes dead seed keys and omits real booking keys

**Evidence:** `src/admin/AdminApp.tsx:847–855`; `src/cms/seed.ts:237–250,2475–2590,2848–2852`; `src/components/BookingModal.tsx:26,168–192,249–254`; `src/components/FloatingWhatsAppButton.tsx:51–89,294–299`.

The seed has **271 UI-copy keys**. Static consumer inventory over all current `uiText`/`bookingText` callers finds **262 seed keys without a consumer**, leaving nine consumed seeded keys. Representative exposed dead keys include `BookingModal.copy.1` ("Reserve Your Experience"), `FloatingWhatsAppButton.label.8` ("Start WhatsApp Chat"), `ui.nav.home`, and `ui.footer.rights`.

Concrete mounted regression:

```text
uiCopy['BookingModal.copy.1'] = 'AUDIT OLD BOOK LABEL' -> absent
uiCopy['FloatingWhatsAppButton.label.8'] = 'AUDIT FLOAT LABEL' -> absent even with card open
uiCopy['ui.booking.title'] = 'AUDIT SEMANTIC BOOK LABEL' -> present
```

All **30 `ui.booking.*` keys actually read by BookingModal are absent from the seed**. Owners must know an undocumented exact key and add it manually rather than edit the already-visible label matching the same text. The arbitrary-key feature is not itself a defect; a new unknown key appropriately cannot invent a consumer. The misleading part is shipping known-looking, prepopulated editable keys that do nothing while hiding the effective ones.

**Smallest fix:** seed the actual semantic consumer keys, migrate/retire old component-snapshot aliases from the active editor, and wire remaining floating/shell labels through supported semantic keys. Surface an explicit unsupported/archival badge for retained unused keys; explain key semantics in the editor, not only a repository document. Regress a representative edit from each real surface through mounted output, not merely `uiCopy` persistence.

### F3 — P1: multi-currency facts collide and lose a saved price in public output

**Evidence:** `src/cms/entity-projection.ts:94–108`; editor price metadata `src/cms/editor-controls.ts:49–51`.

For either `our-fez-tours` or `daytrip-chefchaouen`, use `setEditorPath` to set, in sequence:

```text
products.<id>.practicalInfo.priceMAD = 987
products.<id>.practicalInfo.priceEUR = 654
products.<id>.practicalInfo.priceUSD = 321
```

The document validates, round-trips and retains all three entity values. Public fact rows contain only `Price (EUR): 654 EUR` and `Price (USD): 321 USD`; **987 MAD is absent**. On insertion, the label is selected from `titles[items.length]`, not the currency being inserted. The existing four facts include a Languages row, so a new MAD row gets the EUR label; the later EUR edit finds that mislabeled row and overwrites it.

**Smallest fix:** append `{ title: titles[index], description: ... }` for the specific missing currency, and thereafter use a stable semantic binding rather than row position or owner-editable English title if possible. Regress all three currencies surviving simultaneously, all edit orders, changed fact ordering/labels, removal, and new products. The current propagation test checks each sentinel immediately after its edit, so it misses the later overwrite.

`product.price` and `practicalInfo.price*` are also independent inputs; define/display their different purposes so a practical-information edit is not mistaken for changing the booking offer.

### F4 — P1: editing English product prose can delete French/Spanish owner-authored list content

**Evidence:** `src/cms/entity-projection.ts:31–44,81–85`.

Reproduction on `our-fez-tours`:

1. Change the bound `overview` rich-text block to a valid `list` with `en: ['OWNER EN LIST']`, `fr: ['OWNER FR LIST']`, `es: ['OWNER ES LIST']`.
2. Confirm the French public output contains `OWNER FR LIST`.
3. Edit only `products.our-fez-tours.fullDescription.en` to `NEW EN PROSE` through `setEditorPath`.
4. Validate, JSON round-trip and render French again.

Observed block becomes a `paragraph` with `{en: 'NEW EN PROSE', fr: '', es: ''}`; **French and Spanish lists are lost**. Even with a text-bearing block, the discriminator/format is replaced for every locale. This contradicts the changed-field/locale preservation contract at `entity-projection.ts:55` and `docs/cms-coverage.md:94`.

**Smallest fix:** do not overwrite incompatible owner-authored block discriminators silently. Preserve independent locale payloads; when the shared block shape cannot represent the edit safely, create/update a dedicated bound paragraph block or explicitly detach the custom section from entity propagation. Regress list, quote, heading and link blocks in untouched locales, not only seed paragraphs.

### F5 — P2: media's raw-URL consumers can silently lose portraits; team URL edits are not registered

**Evidence:** `src/cms/editor-controls.ts:61–64,84–99`; `src/admin/StructuredFields.tsx:81`; `src/cms/entity-projection.ts:14–22,56–64`; `src/cms/SectionRenderer.tsx:78–81,370–373`; `src/cms/schema.ts:233,239–240,292–306`.

Use a valid `team` story section referencing the existing members. This section is added to the probe because the approved seed About page is independent narrative/photos, not a team-record consumer.

Two valid saved edits fail:

- Set a member's `avatarUrl` to `https://example.org/audit-team-avatar.jpg` in the advertised URL field. It validates and survives a JSON round trip, but is **not registered in `media`** and is absent from rendered output. `setEditorPath` invokes image registration only for root product/blog changes, not team changes, despite the registration loop containing a team branch.
- Change the source URL of that member's existing library row (`media.<id>.src`). The stable media row survives, but the member retains the previous raw URL, so portrait count drops from three to two. A gallery using the row's stable `mediaId` follows the replacement; the raw-URL consumer does not.

A third probe assigns members to an otherwise-unreferenced media row (`media-125`) and removes it. Validation returns `valid: true` while portraits drop from three to one. Media-reference deletion protection currently traverses `CmsImage.mediaId`, not string-backed team/product/blog references.

**Smallest fix:** register accepted team URLs at the actual authoring entry point; preserve/update string-backed canonical references when a media source changes; include those references in removal protection. Converting these consumers to stable media IDs is cleaner but larger. Regress custom avatar URLs, source replacement, and attempted removal of media referenced only by canonical entity URL fields. Do not confuse explicit media-library selection (which already works) with arbitrary accepted URL support.

### F6 — P2: team portraits discard the saved focal point

**Evidence:** `src/cms/render-utils.ts:46–57`; `src/cms/SectionRenderer.tsx:84–99,241,267,370–373`.

For a team section, set the portrait media's `focalPoint` to `{x: 0.23, y: 0.74}`. The document validates and retains it, but actual avatar HTML is:

```html
<img class="cms-avatar" src="/images/real/about_us_image1.jpg" alt="AUDIT MEMBER" loading="lazy" decoding="async" referrerPolicy="no-referrer"/>
```

No `object-position` style is emitted. Hero/card/gallery/product consumers apply the resolved position, but the separate Team `<img>` drops it.

**Smallest fix:** add the same allowlisted `style={image.objectPosition ? { objectPosition: image.objectPosition } : undefined}` to the team image, ideally sharing the image primitive. Regress the emitted/computed avatar position.

### F7 — P2: locale-fallback controls accept values the renderer ignores

**Evidence:** `src/cms/editor-controls.ts:39–41`; `src/cms/schema.ts:187–189,284–290`; `src/cms/render-utils.ts:15–17`; `docs/cms-coverage.md:46`.

A validated saved `pages.about.localeFallback = {es: 'en', fr: 'es'}` produces `contentLanguage(about, 'es') === 'es'`, not `en`. Spanish has an unconditional early return even when the owner explicitly chooses a fallback. The schema also permits acyclic chains, while resolution follows only one hop.

**Smallest fix:** make the controls/schema match policy. If Spanish must never fall back, remove/disallow its fallback control and document that restriction. If explicit owner fallback is allowed, resolve the validated chain for all locales, then use the same effective language in public routing, content and SEO. Regress an explicit ES fallback and a multi-hop chain, not just FR → EN.

### F8 — P2: iframe preview omits shell theme-variant attributes present on the public site

**Evidence:** `src/admin/LivePreview.tsx:177–185`; `src/App.tsx:349–350`; `src/cms/site-theme.css:24–26`.

Set `theme.cardVariant = 'flat'`, `theme.buttonVariant = 'outline'` and mount LivePreview. Its shell wrapper has:

```text
data-cms-site = "true"
data-button-variant = null
data-card-variant = null
```

The actual public wrapper has both variant attributes. Therefore shell CSS gated by `[data-card-variant="flat"]` / `[data-button-variant="outline"]` does not match the preview wrapper, although PageRenderer's inner article is correct. Current preview tests check tokens/identity, not these shell selectors.

**Smallest fix:** mirror the public wrapper's data attributes in LivePreview; mount matching shell structure in a regression and verify selector/computed-style parity. This is a concrete preview fidelity gap, not a persistence problem.

## Supported behavior verified / not defects

- **All fourteen discriminators** have mounted structured controls and an actual section consumer. Existing fixture coverage includes `productGrid`, `team` and `faq`, although the current 27-page seed only uses eleven types. Their absence from seed pages is not proof of a missing renderer.
- `teamMembers.name`, `role`, `bio`, `languages`, `experience` and `licenseNumber` **all appear in actual output** when a story team section references the record. Biography is intentionally omitted in the grid variant. Global collection order does not supersede each section's explicit reference order.
- FAQ question/answer and ordered references have consumers; FAQ category is collection taxonomy, not automatic page placement or a displayed label.
- Product title/copy, long-form families, cards, blog listing/detail copy and metadata, visibility, canonical routes, sitemap/hreflang, image URL registration for product/blog edits, booking labels and offer output have real regressions. Those successes do not cover the interaction bugs above.
- Navigation/footer order, locale labels, safe external/page target switching, canonical shell contacts, brand text, footer text and existing shared UI keys have mounted consumers.
- Media dimensions, alt/caption fallback and focal point have actual consumers in most image paths. Per-placement nonempty alt overrides library alt; an explicit placement caption overrides the library caption. This is intentional precedence, not a missing consumer.
- Variant-dependent fields need clearer guidance: minimal heroes omit their image; CTA images render only for split; Team biography is story-only. The current controls are variant-blind. Either hide inapplicable controls or explain the supported layout, rather than promising every filled field is visible in every variant.
- Page title, section hero title, menu label and authored SEO title are distinct surfaces, not one universally mirrored field. An existing titled hero owns the H1; page title remains metadata/fallback. The UI/help should not imply editing one changes all others.
- Provenance (`source`), editorial relationships, taxonomy and fixed IDs are not expected to appear as visitor prose.
- Compatibility hero settings and `legacy.*` are known archival/compatibility boundaries, not newly discovered coverage failures. Current homepage hero editing belongs to section controls.
- Review text/author/source are intentionally protected; hide/order controls are the intended authoring surface. **Do not unlock attributed reviews as a coverage fix.**
- Approved logo artwork/layout and exactly one fixed Atlas Tactics credit are intentionally protected. Editable site-name text already reaches both shell logos. **These are not missing CMS coverage.**
- Arbitrary safe UI dictionary keys do not and should not create executable rendering behavior. The required fix is discoverable effective keys and truthful control labeling, not automatic arbitrary-key rendering.

## Documentation corrections and acceptance follow-up

`docs/cms-coverage.md:116` still describes a content canvas without iframe or complete Navbar/Footer. Current `LivePreview.tsx` is an isolated iframe and includes both shell components; booking/contact actions are deliberately inert and FloatingWhatsAppButton is absent. Update that stale paragraph and describe the actual preview exclusions. Lines 88–90, 94, 97–99 need the effectiveness limitations above, not just metadata/control coverage.

Before calling the requested whole-CMS work complete:

1. Fix F1–F4 first: business contact correctness, truthful effective controls, currency retention and cross-locale content safety.
2. Add combined-state regressions for F3/F4; testing each field immediately after its own edit is insufficient.
3. Fix/label F5–F8 and all intentionally variant-dependent controls.
4. Re-run these probes and the focused suites against fixes. A changed result is expected; the probes currently assert several observed defects, so adapt them into positive regression expectations rather than treating their present exit zero as a clean bill of health.
5. Complete the parent's real isolated-Worker save/reload/publish/restart/rollback checks and inspect anonymous output. Do not claim that Save draft alone changes the live site; draft persistence and explicit publication remain separate, correct security boundaries.

No service/install/network blocker was encountered. Existing tests pass despite the concrete uncovered gaps; this is missing regression coverage, not evidence that the gaps are harmless.
