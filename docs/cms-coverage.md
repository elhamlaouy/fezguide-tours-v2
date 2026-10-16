# CMS editor coverage and delivery boundaries

## What this document means

**A typed control is not proof that a public renderer consumes the field.** The tables below distinguish those two facts. The canonical authoring fields use labeled text areas, ordinary inputs, bounded number inputs, checkboxes, approved enum selectors, reference selectors and ordered-array buttons. There is no raw-JSON-only editor, arbitrary HTML or executable CSS control.

The metadata is `src/cms/editor-controls.ts`; mounted controls are `src/admin/StructuredFields.tsx` and `AdminApp.tsx`. New field/action/enum labels are EN/FR/ES in `editor-labels.ts`. Diagnostic paths stay unchanged; validation explanations are localized.

A field with no value has an **Add optional field** button. A localized field follows the selected EN/FR/ES content tab without changing the other locales. Array operations are native keyboard-focusable buttons with item-specific accessible labels and disabled boundary moves. IDs are displayed read-only; creation/duplication allocates new IDs instead of renaming referenced records.

## Runnable checks

Run from the repository root:

```sh
npm run lint
node --test tests/cms-admin.test.mjs tests/cms-editor-controls.test.mjs tests/cms-renderer.test.mjs tests/cms-schema.test.mjs tests/cms-seo.test.mjs
npm run build
```

The mounted admin tests use the existing Happy DOM installation in the adjacent static-release project, not a new dependency. If that project is unavailable, those tests intentionally fail with an explicit DOM prerequisite error.

Short test references used below:

- **A-global**: `cms-admin.test.mjs` — `structured global entities SEO theme arrays and UI copy survive draft save and reload`.
- **A-families**: same file — `every section family mounts approved variants and structured array creation controls`.
- **A-rich**: same file — `structured rich-text blocks and localized lists add reorder remove without raw JSON`.
- **A-entities**: same file — `entity creation keeps product graph valid and referenced page removal hides rather than destroys`.
- **A-links**: same file — `navigation footer and UI copy have safe creation deletion target switching and reordering`.
- **A-transfer**: same file — `invalid and oversized JSON imports never save or publish; valid import is dirty draft only` and `export uses the actual draft Blob and pending import disables save publish rollback`.
- **E-metadata**: `cms-editor-controls.test.mjs` — `authoring metadata covers every canonical seed field; legacy is explicitly archival`, `optional numeric fields enum controls and reference selectors have complete metadata`.
- **E-variants**: same file — `all fourteen discriminator families provide only approved variant choices`.
- **E-graph**: same file — `page removal protects home and referenced graph, safely cleans link and card targets`.
- **E-import**: same file — `bounded validated import preserves canonical URLs and cannot manufacture attributed reviews or remove home`.
- **R-families**: `cms-renderer.test.mjs` — `every section type renders from document data`, `seed variants keep their approved layouts`, `edited CMS text replaces source text and is not overwritten`.
- **SEO**: `cms-seo.test.mjs`, server-rendered head metadata and sitemap checks.

## Pages and shared primitives

| Document path | Actual editor control | Consumer / limitation | Runnable checks |
| --- | --- | --- | --- |
| `pages[].id` | Stable read-only identifier; create/duplicate buttons allocate unique IDs | Routing and graph identity | A-entities, E-graph |
| `pages[].title.{en,fr,es}` | Page-title textarea | `PageRenderer` heading, SEO fallback | A-global; existing title/locale preview tests |
| `pages[].slug`, `kind`, `enabled` | URL input, editorial/product/landing select, visibility checkbox | Routing, `PageRenderer`, `isPublicPage`; product classification must validate | A-global, A-entities, E-metadata |
| `pages[].parentId`, `productId` | Optional page/product reference selectors | Product category/detail graph, routing/visibility/booking constraints | A-entities, E-graph, schema tests |
| `pages[].localeFallback.{en,fr,es}` | Optional per-language enum selectors | `contentLanguage`; cycles blocked by validation | E-metadata, schema locale-fallback tests |
| `pages[].seo.title`, `description`, `noIndex`, `image` | Localized copy, optional checkbox and library-image group | `worker/seo.ts` title/description/robots/share image and sitemap | A-global, E-metadata, SEO |
| `pages[].seo.canonical` | Optional URL input | Relative canonical paths select a validated preferred route; old slugs redirect, and sitemap/hreflang follow it. Absolute URLs cannot replace the trusted origin. Reserved, conflicting and multi-segment preferred paths are rejected | E-metadata; SEO covers computed policy, not editable override |
| `pages[].source` | Optional source/provenance input | Provenance metadata, not public copy | E-metadata |
| `pages[].sections` | Add type, select section, duplicate, remove, enable, move up/down | `PageRenderer` enabled sections in document order | Existing mounted section operations; A-families, R-families |
| `CmsImage.mediaId`, `alt`, `caption` | Library-ID selector, localized alt/caption groups; optional image/caption insertion | `resolveImage`, `CmsImg`, `Gallery` (caption display depends on layout) | A-global, A-families, media preview tests, R-families |
| `CmsLink.id`, `label`, `enabled`, `pageId` or `href` | Stable ID, localized label, checkbox, optional target controls; switching target removes the mutually exclusive previous target | `visibleLink`, `Actions`, Navbar/Footer | A-links, A-families, schema URL/XOR checks |
| `CmsCard.id`, `title`, `description`, `image`, `pageId`, `badge` | Ordered card rows, stable ID, localized copy, optional image/page/badge | `CardGrid`/`CardFace` | A-families, R-families |
| `ItineraryStop.time`, `title`, `description`, `badge` | Ordered rows; time input; localized required/optional copy | `Itinerary` | A-families, E-metadata, R-families |

## Every section discriminator and approved variant

All section families expose the shared `id` (read-only), `type` (read-only; discriminator chosen when adding), `enabled`, optional `title`, `eyebrow`, `description`, and the following approved **variant select**. Optional copy exists even when absent from the seed.

| Section type | Approved variants | Structured payload controls | Consumer | Runnable checks |
| --- | --- | --- | --- | --- |
| `hero` | banner, split, minimal | Optional image group; ordered links | `Hero` | A-families, E-variants, R-families |
| `richText` | story, panel | Ordered blocks; paragraph/heading/quote/list/link type select; localized text, ordered localized lists, link URL. Type conversion retains narrative copy | `RichText` | A-rich, A-families, E-variants, R-families |
| `cardGrid` | overview, featured | Ordered cards with all card fields | `CardGrid` | A-families, E-variants, R-families |
| `productGrid` | overview, featured | Ordered product reference selectors | `ProductGrid` | A-families, E-variants, R-families |
| `gallery` | grid, carousel, story | Ordered image references, localized alt/caption | `Gallery` | A-global, A-families, E-variants, R-families |
| `benefits` | grid, strip | Ordered title/description rows | `Benefits` | A-families, E-variants, R-families |
| `cta` | split, banner, booking | Optional product/image; ordered links | `Cta`; booking must target the matching product detail page | A-families, E-variants, R-families, schema booking checks |
| `reviews` | marquee, grid | Ordered existing review references | `Reviews`; disabled reviews omitted, attribution preserved | A-families, E-import, E-variants, R-families |
| `faq` | accordion, list | Ordered FAQ reference selectors | `Faq` | A-global, A-families, E-variants, R-families |
| `team` | grid, story | Ordered team reference selectors | `Team`; biography displayed in story variant | A-families, E-variants, R-families |
| `itinerary` | timeline, list | Ordered stops, including optional time/badge | `Itinerary` | A-families, E-variants, R-families |
| `inclusions` | columns, list | Independent ordered EN/FR/ES included and excluded arrays | `Inclusions` | A-families, A-rich (shared list controls), E-variants, R-families |
| `practicalInfo` | facts, panel | Ordered title/description fact rows | `PracticalInfo` | A-families, E-variants, R-families |
| `contact` | banner, panel | Ordered page/external/contact links | `Contact`/`Actions` | A-families, E-variants, R-families |

## Global families and entity collections

| Document path | Actual editor control | Consumer / limitation | Runnable checks |
| --- | --- | --- | --- |
| `theme.colors.{primary,accent,background,text}` | Existing palette color inputs | `themeStyle` and scoped renderer CSS | Existing mounted theme test, E-metadata |
| `theme.font`, `spacing`, `radius` | Approved font/spacing/radius selectors | `themeStyle` | Existing mounted theme test, E-metadata |
| `theme.fontScale`, `containerWidth` | Bounded number inputs (0.8–1.4 and 960–1600 px) | `themeStyle` | A-global, E-metadata |
| `theme.buttonVariant`, `cardVariant` | solid/outline and outlined/flat selectors | `themeStyle`/renderer CSS | A-global, E-metadata |
| `navigation[]`, `footer.links[]` | Ordered add/remove/reorder link groups with all link fields | Navbar/Footer and shell-link filtering; Atlas credit remains independent and deduplicated | A-links; existing locale/footer order test; public-shell tests |
| `footer.text` | EN/FR/ES textarea | Footer | A-links, public-shell tests |
| `siteSettings.siteName`, `phoneNumber`, `whatsappNumber`, `email` | Plain labeled inputs with validation on save | Site shell/contact links; WhatsApp message destination | A-global, E-metadata; public-site tests |
| `siteSettings.address`, `licenseBadge`, `heroTagline`, `heroTitle`, `heroSubtitle` | Localized textareas | Contact/license shell fields as wired; **hero section copy is independently authored in page sections, not automatically mirrored from these compatibility hero fields** | E-metadata; A-global exercises shared settings controls |
| `siteSettings.heroImage`, `socialInstagram`, `socialFacebook`, `socialTripadvisor`, `googleMaps` | Optional canonical image picker/URL or ordinary URL inputs | Hero compatibility field vs current hero sections; social/contact shell links where consumed | E-metadata; schema URL checks |
| `uiCopy.*.{en,fr,es}` | Literal dictionary key display; localized textarea; bounded add-key and confirmed remove | Only keys explicitly consumed by `uiText` affect rendering. A newly invented key has no automatic effect | A-global, A-links, E-metadata |
| `products[].id`, `kind`, `actionType` | Stable identity/product/book_tour displayed read-only; product add creates its matching unpublished detail page | Product graph/booking invariants | A-entities, E-metadata |
| `products[].pageId`, `published` | Category selector; optional visibility checkbox. Category change updates matching detail parent and legacy category relationship | `publicProduct`, `productPage`, booking validation | A-entities, E-metadata |
| `products[].title`, `subtitle`, `shortDescription`, `image`, `imageAlt`, `price.{amount,currency,basis}` | Localized copy, canonical library image URL selector, bounded amount/currency/basis controls | `ProductGrid` and booking CTA price/product handoff | A-entities, A-families, E-metadata, renderer tests |
| `products[].fullDescription`, `highlights`, `practicalInfo.{duration,departure,groupSize,priceMAD,priceEUR,priceUSD}`, `galleryImages`, `itinerary`, `included`, `excluded`, `whatToBring`, `meetingPointDetails`, `cancellationPolicy`, `suitableFor` | All localized text/list/ordered URL/stop/fact/number fields, including absent optional data | Authoring-time `syncEntityEdits` updates matching semantic detail sections for changed entity fields/locales only; unrelated custom sections remain intact. Accepted image URLs are registered as canonical media rows rather than silently dropped. `cms-entity-propagation.test.mjs` exercises all long-form families | E-metadata, A-entities (schema-valid collection creation/save), A-rich/A-families (mounted shared structured primitives) |
| `editorialEntries[].id`, `pageId`, `source`, `productId` | Add creates matching unpublished editorial page; stable ID, page/product refs, source text; remove/reorder rows | Classification/provenance metadata. Public narrative is authored in the referenced page sections | A-entities, E-metadata, schema editorial-kind checks |
| `blogPosts[].id`, `slug`, `title`, `excerpt`, `content`, `coverImage`, `category`, `author`, `date`, `readTime`, `published` | All typed fields; add creates unpublished editorial detail page; ordered collection operations | `syncEntityEdits` propagates changed blog copy/images to listing and detail sections; category/author/date/read-time render via `blogMetadata`; visibility and removed posts are gated. Rendering regressions are in `cms-entity-propagation.test.mjs` | A-entities, E-metadata; public-renderer proof remains required for field-to-page propagation |
| `teamMembers[].id`, `name`, `role`, `bio`, `languages`, `experience`, `licenseNumber`, `avatarUrl` | Stable ID; ordinary/localized text, ordered language rows, optional license and canonical portrait picker; add/remove/reorder | `Team`; deletion blocked while referenced | A-entities, A-families, E-metadata, R-families |
| `faqs[].id`, `category`, `question`, `answer` | Stable ID; allowed category select; localized copy; add/remove/reorder | `Faq`; deletion blocked while referenced | A-global, A-entities, A-families, E-metadata, R-families |
| `media[].id`, `src`, `alt`, `caption`, `width`, `height`, `focalPoint.{x,y}`, `source` | Stable ID; canonical image URL/library picker, localized alt/caption, bounded dimensions/focal-point numbers, provenance; upload or metadata-row add; confirmed remove/reorder | `resolveImage`; dimensions must be provided together; referenced media cannot be removed | Existing mounted upload/select/save/reload private-preview test; E-metadata; media/schema/renderer tests |
| `reviews[].id`, `author`, `title`, `quote`, `date`, `url`, `source` | Read-only attributed source records; no review creation control | `Reviews`; imports reject new/rewritten attributed records | A-families, E-import |
| `reviews[].enabled`; section `reviewIds[]` | Hide checkbox; ordered review reference list | `Reviews`; public order follows section references, not global storage order | A-families; existing renderer hidden-review checks |
| `schemaVersion` | Not author-editable | Fixed migration/version contract | Schema tests |
| `legacy.{tours,customPages,blogPosts,teamMembers,faqs,siteSettings}` | **No authoring controls: archived compatibility snapshot retained in validated exports/imports** | Compatibility/archive data; current canonical authoring UI must not be advertised as an editor for this snapshot | E-metadata explicitly excludes archive; schema tests still validate it |

## Destructive operations and data safety

- Page duplicate requires confirmation, uses a new slug/ID, remains unpublished and duplicates the matching product graph when applicable. It does not add navigation or publish.
- Home cannot be removed through the UI or imported away.
- Removal of a referenced product detail/category, referenced editorial page, or linked blog/custom page hides the page instead of deleting it. The owner receives the translated explanation. Products are retained and hidden on collection removal.
- An unreferenced page can be confirmed for removal. Navigation/footer/section links to it are removed; card targets are cleared while retaining card copy. The resulting document is validated before applying the operation.
- Team, FAQ and media collection removal is blocked by validation while referenced; remove the references first. No dangling graph is silently saved.
- Imports check the file byte bound before reading and validate the parsed safe JSON before replacing the **dirty in-memory draft only**. No import makes a network write. New/altered attributed review text is rejected. Import/export preserve canonical media URLs; private preview URLs exist only in an editor-derived render copy.
- Export downloads the actual in-memory document as an `application/json` Blob. It is not a promise of a server backup or revision restore.
- Save/publish/rollback are disabled while upload/import is pending. Validated Save draft and explicit Publish remain separate actions. Invalid fields, unsafe URLs, cycles, duplicate IDs and missing references block writes.
- `beforeunload` and editor-close/discard guards protect unsaved work. Switching an editor page/locale does not discard the draft and does not need a warning.
- Mobile/desktop toggles render a 390 px / 1280 px content canvas with responsive container overrides. This is a content preview, **not** a full iframe/device emulation or complete Navbar/Footer/booking preview. The owner still needs the local public-site preview before deployment.

## Explicit unsupported / not-complete claims

- Logo SVG/artwork, its dimensions/layout and component behavior are not arbitrary executable inputs. The approved artwork is preserved; brand text consumes `siteSettings.siteName` in both shell logos.
- Booking form labels and messages consume the supported `booking.*` UI-copy keys, canonical contacts and products. `cms-brand-booking.test.mjs` verifies actual mounted output. Inventing a new dictionary key still does not invent new component behavior.
- Product/blog propagation and preferred canonical routing are backed by rendering/mounted/Worker regressions, not form presence alone. Compatibility hero fields remain archived separately from the effective home-page hero section; edit the home hero through its section controls.
- Atlas attribution remains exactly one fixed credit, not an owner-editable claim. Review authenticity is not inferred from text edits.
- No authentication was weakened, remote resource created, Git commit/push performed, or deployment attempted by this editor task. Local owner testing and production authorization remain separate delivery gates.
