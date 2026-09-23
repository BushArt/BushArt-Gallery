# Changelog

All notable changes to the **BushArt documentation package** are recorded here. This changelog tracks the documentation itself (`project-docs/`) — it is versioned independently from the BushArt application's own release version (see `11-Project-Roadmap.md` for application milestones: MVP/1.0, 1.1, 1.2, 2.0).

Format: loosely follows [Keep a Changelog](https://keepachangelog.com/) conventions, adapted for a documentation-only artifact.

---

## [Unreleased]

### Added
- **TODO-048** — Database index setup moved off the deploy path and onto an idempotent, non-fatal application boot task (`src/lib/db/indexes.ts` + `src/instrumentation.ts`), with `npm run db:setup` delegating to the same shared index spec and no npm script depending on Node-version-specific CLI flags (ADR-015); the deploy that previously failed now builds cleanly and logs `Database indexes ensured {"database":"bushart"}` on every boot.
- **TODO-038** — Deployed the application to Render: production is live at `https://bushart-gallery.onrender.com` over HTTPS with the documented environment variables and a successful production build.
- **TODO-001** — Scaffolded the repository: Next.js 16 App Router project with TypeScript strict mode, ESLint v9 flat config (`eslint.config.mjs`), and Tailwind v4 (PostCSS-based via `@tailwindcss/postcss`). Implemented the full empty directory skeleton per `08-Project-Structure.md` with App Router routes, library structure, and configuration files. `npm run build` succeeds on the scaffold.
- **TODO-002** — Provisioned MongoDB Atlas M0 cluster and Cloudinary account; local environment wired and connectivity verified with `scripts/verify-env.mjs`.
- **TODO-003** — Wired design tokens and self-hosted fonts via Tailwind v4 `@theme` and `next/font`.
- **TODO-004** — MongoDB connection helper with hot-reload-safe client caching, idempotent index setup script, and vitest-based integration test covering all schema-defined indexes.
- **TODO-005** — Data-access layer for all four collections: typed model functions for artworks, tags, admins, and settings with server-side ObjectId conversion, NSFW-safe defaults, cursor pagination, and 34 mocked-driver unit tests.
- **TODO-006** — Added Zod validation schemas for artwork, tag, and settings with strict field-level enforcement; introduced internal DB-layer schemas (`ArtworkCreateInternalSchema`/`ArtworkUpdateInternalSchema`) so `createArtwork`/`updateArtwork` and `createTag` validate before write; added auth request/response schemas for Phase 2; tightened `Admin.createdAt` to non-null `Date` to match `04-Database-Schema.md §5`.
- **TODO-007** — Core auth utilities: custom HS256 JWT session token module (`lib/auth/jwt.ts`) with 7-day expiry, bcrypt cost-12 password hashing (`lib/auth/password.ts`), consolidated auth logic in `lib/auth/` per `08-Project-Structure.md`, type consolidation through `src/types/admin.ts` per `09-Coding-Standards.md` §1, and 54 passing tests covering sign/verify round-trips, expiry, signature tamper rejection, malformed token handling, password hashing, and the auth-data boundary (`getAdminByUsername` returning `AdminInternal` with `passwordHash`).
- **TODO-008** — Admin seed script + brute-force lockout state machine (5 consecutive failures → 15-minute lock), 20 unit tests, and CI workflow. Seed script verified idempotent. Lockout constants match `02-Technical-Specification.md` §4 exactly (`MAX_FAILED_ATTEMPTS = 5`, `LOCK_DURATION_MS = 900000`). `package.json` lint script fixed for Next.js 16 compatibility.
- **TODO-009** — Auth API routes + server-side guard + proxy.ts: `POST /api/auth/login`, `POST /api/auth/logout`, and `GET /api/auth/me` Route Handlers backed by the JWT session + bcrypt utilities from TODO-007, a server-side admin guard (`requireAdmin`) re-exported through `lib/auth/guard.ts`, and a `proxy.ts` placeholder re-export referencing CVE-2025-29927 for defense-in-depth. 180 passing total.
- **TODO-010** — Cloudinary v2 client configuration (`lib/cloudinary/client.ts`) with deferred env-var validation, scoped upload-signature helper (`lib/cloudinary/signature.ts`) enforcing the `bushart/` folder namespace, and `POST /api/upload/signature` Route Handler returning time-boxed HMAC signatures. Admin session enforced via `requireAdmin`; `CLOUDINARY_API_SECRET` never leaves the server. 12 integration tests + 10 unit tests; 180 passing total.
- **TODO-011** — Cloudinary transformation URL helper module (`lib/cloudinary/transformations.ts`) as the single source of truth for grid/list/popup/fullscreen/download presets, with `f_auto,q_auto` on display contexts and `fl_attachment` for original-quality downloads. Extracted browser-safe `cloudName.ts` (reads `CLOUDINARY_CLOUD_NAME` with `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` fallback) so client components can build URLs without importing the SDK; added `server-only` guards on `client.ts` and `signature.ts`. Supports image and video (`resourceType`) for timelapse downloads. 13 unit tests; 193 passing total.
- **TODO-012** — Public artwork read endpoints: `GET /api/artworks` (filters, cursor pagination, default limit 24/max 60, NSFW default-exclude), `GET /api/artworks/:slug` (full detail with resolved tags, NSFW included per §4.2 implementation note), and `GET /api/artworks/:slug/download` (302 redirect via `fl_attachment`). Tag AND filter returns empty page when any requested slug is missing. 13 route integration tests + model pagination/tag-filter coverage; 242 passing total.
- **TODO-013** — Admin artwork write endpoints: `POST`/`PATCH`/`DELETE /api/artworks[/:id]` with `requireAdmin`, tag `usageCount` reconciliation, merged featured/featuredOrder PATCH validation, Cloudinary `destroyAssets` before Mongo delete (503 + record preserved on destroy failure), and `lib/cloudinary/destroy.ts`. 16 route integration tests + model reconciliation/delete coverage; 242 passing total.
- **TODO-014** — Tags API: `GET`/`POST /api/tags` and `DELETE /api/tags/:id` with case-insensitive duplicate-name and slug-collision `409 CONFLICT`, cascading delete (pull tag from artworks before removing tag document), and `slugify` utility for tag creation. 8 route integration tests + 3 slugify unit tests; 242 passing total.
- **TODO-015** — Settings API: `GET`/`PATCH /api/settings` against the singleton `site_settings` document, including zero-state first PATCH via `upsertSettings`, admin auth on PATCH, and public response mapping that strips internal image `url` fields per §4.5. 7 route integration tests; 242 passing total.
- **TODO-016** — Homepage hero section: `HeroSection` and `FeaturedArtwork` render banner, profile, artist name, bio, social links, contact button, and featured artworks from server-side `findSettings()` + `findFeaturedArtworks()` wrapped in Suspense. 2 component tests; 261 passing total.
- **TODO-017** — Gallery grid and detailed list views: `GalleryGrid`, `GalleryList`, `ArtworkCard`, `ViewModeToggle`, and `GallerySection` client shell with grid/list toggle, NSFW/commission badges (icon + color), scroll preservation on mode switch, and shared feed via `useArtworks`. 3 component tests; 261 passing total.
- **TODO-018** — URL-synced filter bar and NSFW toggle: `FilterBar`, `NsfwToggle`, and `useFilters` serialize tags/year/medium/type/nsfw/sort to URL search params, persist NSFW preference in `localStorage` (`bushart-nsfw`), debounce text inputs (300ms), and validate year input. 8 component/hook tests; 261 passing total.
- **TODO-019** — Infinite scroll and SketchReveal motion: `useInfiniteScroll` IntersectionObserver sentinel, cursor pagination via `useArtworks`, `SketchRevealImage` on gallery thumbnails with `prefers-reduced-motion` opacity fallback and load-error placeholder, retry button for retryable fetch failures, and stale-cursor race fix on filter refetch. 6 hook/UI component tests; 261 passing total.
- **TODO-020** — Intercepting-route artwork modal and full-page fallback: `@modal/(.)artwork/[slug]` client interception, `/artwork/[slug]` server fallback, shared `ArtworkPopup` via `HomePageShell` extraction, `ArtworkModalClient`, `useArtwork` hook, Playwright bootstrap (`playwright.config.ts`, `scripts/seed-e2e.ts`), CI `e2e` job, and 6 E2E tests covering both entry paths plus Esc/fullscreen, NSFW, download, and share. 3 Modal tests + route wiring; 275 passing / 8 skipped total.
- **TODO-021** — ArtworkPopup and FullscreenViewer: image sequence, timelapse toggle with fullscreen entry, metadata placard, tag pills, sketch-in modal frame, NSFW interstitial (`07` Flow 5), swipe navigation, accessible modal/focus trap, and explicit absence of any related-artwork module. 7 component tests (ArtworkPopup, FullscreenViewer, Modal); 275 passing / 8 skipped total.
- **TODO-022** — Download and Share actions in the popup action row: anchor-based `DownloadButton` via sorted `GET /api/artworks/:slug/download` redirect (no byte proxying), `ShareButton` with Web Share API and clipboard fallback confirmation. 4 component tests + download API sort defense; 275 passing / 8 skipped total.
- **TODO-023** — Admin login surface: `AuthProvider`, `useAuth`, `LoginModal`, `AdminFooter` (footer glyph + `Shift+Alt+L`), root `Providers` wrapper in `layout.tsx` (Suspense for PPR), and E2E login/lockout/edit-after-login coverage. 352 passing / 8 skipped; E2E 19.
- **TODO-024** — Upload flow: `UploadCard`, `UploadDialog`, `TagPicker`, client `uploadClient.ts`, gallery refresh via `AdminShell`, empty-gallery and list-mode upload entry points, and E2E upload with inline tag create + post-upload gallery refresh assertion. 352 passing / 8 skipped; E2E 19.
- **TODO-025** — Edit artwork flow: `ArtworkEditForm` with metadata, image add/remove, optional timelapse swap, admin Edit toggle in `ArtworkPopup`, and `featuredDirty` PATCH (featured fields omitted unless explicitly changed). Component + E2E coverage. 352 passing / 8 skipped; E2E 19.
- **TODO-026** — Tag management UI: `TagManager` with usage counts, two-step delete confirmation, and admin toolbar entry. 352 passing / 8 skipped; E2E 19.
- **TODO-027** — Homepage/hero editor: `HomepageEditor` with in-place edit for all hero fields (including contact, social links, and empty-state affordances), Cloudinary banner/profile upload, and component tests. 352 passing / 8 skipped; E2E 19.
- **TODO-028** — Featured artwork management: `featured`/`featuredOrder` in detail response, edit-form toggle with required `featuredOrder`, and homepage featured strip synced via `router.refresh()`. 352 passing / 8 skipped; E2E 19.
- **TODO-029** — Error boundaries + API error envelope + logging: shared leveled structured logger (`lib/logger.ts`) replacing every bare `console.*` in committed code; all Route Handlers — including all four auth routes — funneling errors through `apiError`/`handleRouteError`; `GET /api/auth/me` returning **200** `{authenticated:false}` when the JWT is valid but the admin record is missing; root `app/error.tsx` last-resort boundary alongside independent gallery/popup recovery; and an ESLint `no-console` guard enforcing the invariant. Two audit rounds fixed Error-serialization loss in logs, silent root-boundary swallowing, an unreachable trace level, the logout funnel gap, and purity/double-log issues in `SectionErrorBoundary`. 361 passing / 8 skipped; lint + typecheck clean.
- **TODO-030** — Accessibility pass: added axe-core E2E coverage, keyboard journeys across gallery, filters, artwork popup, fullscreen, and admin controls, reduced-motion and contrast checks, screen-reader image-position announcements, and title-derived image alt text.
- **TODO-031** — Boot-time environment validation: added shared Zod validation for required runtime variables, production JWT secret strength enforcement, and Next.js instrumentation-based startup validation.
- **TODO-032** — MongoDB connectivity fail-fast: mapped MongoDB network, selection, timeout, and documented timeout-code failures to the shared 503 `SERVICE_UNAVAILABLE` envelope, added 10-second connection bounds, and enabled reconnect after failed connections.
- **TODO-033** — Client resilience and upload metadata retry: aligned artwork-detail retry state with list-fetch semantics and added status-aware upload/edit save retries that preserve uploaded media references and avoid re-uploading Cloudinary assets.
- **TODO-034** — HTTP security headers: added baseline frame, content-type, referrer, and Cloudinary-compatible CSP headers across site and API routes, with HSTS remaining at the Render/proxy boundary.
- **TODO-035** — Coverage gate on required write/auth paths: per-glob thresholds in `vitest.config.mts` (85% lines/statements/functions, 80% branches on `src/lib/auth/**`, `src/lib/db/models/artwork.ts`, `src/app/api/artworks/**`, each enforced independently) via `@vitest/coverage-v8` and `npm run test:coverage`; the CI `test` job enforces the gate and gates the `e2e` job (`needs: test`).
- **TODO-036** — Route Handler integration test suite: all 15 endpoints covered with real MongoDB integration tests in `tests/api/` using the `createMongodbMock()` pattern; 9 files converted to real MongoDB, 2 use mocks or need no DB access; dependency-failure paths assert 503 `SERVICE_UNAVAILABLE` + shared error envelope (Phase 8 TODO-029/032).
- **TODO-037** — Playwright E2E suite: 7 spec files covering login, full upload, NSFW toggle, artwork modal entry, admin edit-after-login, accessibility, and NSFW toggle; `tests/e2e/nsfw-toggle.spec.ts` added for the previously-missing NSFW toggle flow; `webServer` dev-server bootstrap and seeded global setup; CI `e2e` job runs after the unit/component gate.

### Fixed
- **TODO-039** — Environment parity verification: production's `NEXT_PUBLIC_SITE_URL` held the local `http://localhost:3000` value — silently breaking the artwork share link and Open Graph URL — and was corrected to the production origin; the Node runtime pin, database target, build command, and remaining variables were confirmed against the Render dashboard.
- **TODO-038** — Deployment-session fixes: the auth `me` route no longer swallows the prerender bail-out, `getDb()` resolves the application database name instead of the driver's implicit `test`, destructive test paths refuse non-test databases, and the local `dev`/`test-all` runners were added.
- [Phase 0 audit remediation] — Post-close-out audit fixes applied to the scaffold: typed `getDb()` in `src/lib/db/mongodb.ts`; implemented `scripts/seed-admin.ts` with bcrypt cost 12 and idempotency; added `npm run seed:admin`; removed duplicate legacy CSS var aliases from `src/app/globals.css`; replaced bare `proxy.ts` re-export with a documented placeholder referencing CVE-2025-29927; strengthened `tests/db-setup.test.ts` with idempotency, index option assertions, and deterministic `site_settings` coverage.
- [Phase 1 audit remediation] — Fixed missing tag usageCount increment in `createArtwork`; added 34 mocked-driver unit tests covering tag reconciliation, featured artworks, settings zero-state, and tagSlugs resolution; updated CHANGELOG test count from 31 to 34
- [Phase 2 audit remediation] — Added concurrent login TOCTOU race condition test (`tests/api/auth/login-race.test.ts`); verified 12 placeholder stub files are expected for Phase 3–5 and do not affect Phase 2 functionality.
- [Phase 4 audit remediation] — Tag AND filter empty page when any requested slug is missing; DELETE artwork destroys Cloudinary media before Mongo delete (503 if destroy fails); PATCH featured/featuredOrder merged-state validation; tagIds ObjectId format + uniqueness validation; tag delete pull-before-remove order; settings GET strips image `url`; removed false-confidence route test; +11 tests (242 passing / 8 skipped total).
- [Phase 5 audit remediation] — Infinite-scroll stale-cursor race on filter change; year NaN validation; useFilters URL/localStorage integration tests; retry button for retryable fetch failures; debounced filter inputs; SketchReveal load-error fallback; +10 tests (261 passing / 8 skipped total).
- [Phase 6 audit remediation] — 22 post-implementation findings remediated: modal Esc/fullscreen stacking and a11y, download sorted-index contract, useArtwork abort/slug guard, timelapse fullscreen entry, sketch-in frame, card prefetch, generateMetadata, swipe nav, E2E/CI hardening, and Playwright artifact gitignore. 275 Vitest / 6 E2E passing.
- [Phase 7 audit remediation] — Unified auth context (single root `Providers`), safe featured PATCH on metadata-only edits, empty-gallery upload entry, complete hero editor fields, image/timelapse edit in edit form, tag-create error surfacing, and gallery refresh E2E assertion. 352 Vitest / 19 E2E passing.
- [Phase 8 audit remediation] — Remediated accessibility keyboard coverage and popup timing, environment validation, MongoDB 503/reconnect handling, client metadata retries, security headers, Node 20 command compatibility, and test-count regression protection; local validation finished at 376 Vitest passes / 8 skips and 30 Playwright passes.

### Documentation Updates

- `04-Database-Schema.md` §3–6, `10-Deployment-Guide.md` §1, §6 (ADR-015 boot-task guidance), `12-Decision-Log.md` — no change; the shared index module matches the documented index list, and the boot-task and Node-pin guidance already described the shipped behaviour. (The separate §6 correction to the build-environment rationale is recorded under TODO-039.)
- `10-Deployment-Guide.md` §6 step 8 — corrected: Render's build pipeline does run with the service's environment variables (a production client bundle inlines the dashboard-provided `NEXT_PUBLIC_*` values at build time); ADR-015's decision that database setup never runs in the build is unchanged.
- `02-Technical-Specification.md` §9, `10-Deployment-Guide.md` §1, §4 — no change; the runtime environment-variable contract, the Node runtime pin (`NODE_VERSION` = `.node-version` = CI = 24.14.1), and the variable list all matched the documented behaviour.
- `02-Technical-Specification.md` §2 — recorded the pinned runtime alongside Next.js's 20.9+ minimum.
- `08-Project-Structure.md` §1–2 — added the new `scripts/` entries and `.node-version` to the layout and responsibilities.
- `10-Deployment-Guide.md` §1, §2, §6 — documented the Node runtime and precedence, corrected the Atlas network-access guidance, and moved database setup from a deploy step to an application boot task (ADR-015).
- `Testing-Infrastructure.md` §5 — documented `npm run test:all`.
- `12-Decision-Log.md` — appended ADR-014 (database-name pinning and the destructive-test-path guard) and ADR-015 (index setup as a boot task, never a build or deploy step).
- `01-Product-Definition.md`, `03-System-Architecture.md`, `04-Database-Schema.md`, `05-API-Specification.md`, `06-UI-Design-System.md`, `07-User-Flows.md`, `09-Coding-Standards.md`, `11-Project-Roadmap.md` — no change; implementation matched the documented contract.

#### TODO-001 – TODO-037 close-outs

**Summary:** 6 documents updated across 13 sections; 10 files verified unchanged against implementation (64 section-level cross-checks).

#### `02-Technical-Specification.md`
- §12 — documented the selected baseline security headers and HSTS deferral at the deployment boundary.
- §9 — added `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` so client-side transformation URL building is documented alongside the server-side var.

#### `03-System-Architecture.md`
- §10 — documented as-built root `app/error.tsx` last-resort boundary complementing the independent gallery-feed/artwork-popup boundaries.
- §6 — documented as-built single client auth tree at root layout for modal and homepage parity.
- §6 — documented as-built hero Server Component pattern: settings via `findSettings()`, featured artworks via separate `findFeaturedArtworks()` DB query (not included in `GET /api/settings`).

#### `05-API-Specification.md`
- §4.2 — documented as-built inclusion of `featured`, `featuredOrder`, and image `url` in artwork detail response (admin edit PATCH requires urls for unchanged images).
- §4.3 — clarified image index resolution behavior for artwork list queries.

#### `08-Project-Structure.md`
- §1 — added `GallerySection.tsx`; noted `NsfwToggle` is exported from `FilterBar.tsx`; added `tests/components/` and `tests/hooks/` for jsdom component tests.
- §1, §4 — added `artworks/[id]/download/route.ts`, `lib/api/` helpers, and `lib/cloudinary/destroy.ts`; documented Next.js single-segment constraint for slug GET vs ObjectId PATCH/DELETE on `artworks/[id]/`.
- §1 — added `cloudName.ts` to the `lib/cloudinary/` directory tree; marked `client.ts` as server-only.

#### `09-Coding-Standards.md`
- §11–12 — §11 no change (every handler funnels through the shared helpers); §12 updated to note the no-console invariant is enforced by a scoped ESLint rule (`src/**`, `lib/logger.ts` exempt).
- §13 — updated; Vitest jsdom environment and 19 Phase 5 component/hook tests added per risk-weighted philosophy (261 passing total).

#### `10-Deployment-Guide.md`
- §3–4 — documented that both cloud-name env vars must be set to the same value in local and Render environments.

---

### Verified — No Documentation Changes Required

The following sections were verified unchanged against the implementation and require no edits:

- `01-Product-Definition.md` — §6 editable hero fields render from live settings + featured query; §7 accessibility requirements satisfied as implemented; related-artwork module remains an explicit non-feature.
- `02-Technical-Specification.md` — §4 guard.ts and proxy.ts implement the documented CVE-2025-29927 defense-in-depth requirement; lockout.ts implements the documented 5-consecutive-failure/15-minute-lock contract; jwt.ts/password.ts implement the documented HS256, bcrypt 12, 7-day expiry, and no-plaintext-logging contracts; §9 validated runtime variables and one-time seed inputs match the documented environment contract.
- `03-System-Architecture.md` — §4 signed-upload flow matches documented direct-to-Cloudinary architecture; §5 implementation matches documented single-preset-map, on-demand URL transformation model (ADR-008); §6 intercepting parallel routes with shared `ArtworkPopup` and Suspense boundaries match documented shareable-modal architecture (ADR-005); §7 server-driven URL-serialized filters and client-persisted NSFW preference sent as explicit query param match documented filtering model; §9 infinite scroll, cursor pagination, and inline retry for retryable fetch failures match documented gallery rendering model (full error boundaries deferred to TODO-029).
- `04-Database-Schema.md` — §4 cascading tag delete behavior matches documented pull-then-remove semantics; §5 admins schema already defined `failedLoginAttempts`, `lockUntil`, and `lastLoginAt` fields; `AdminInternal` shape including `createdAt` matches documented `admins` collection schema.
- `05-API-Specification.md` — §2 dependency failures preserve documented shared error envelope with `503 SERVICE_UNAVAILABLE`; envelope shape, error codes, and status mapping match documented contract exactly across every Route Handler.
- `06-UI-Design-System.md` — UI design system unchanged; components implemented per tokens and guidance defined in this document.
- `07-User-Flows.md` — user flows unchanged; implemented flows match documented journeys.
- `08-Project-Structure.md` — §1 FilterBar.tsx houses both filter controls and NsfwToggle export; gallery domain components implemented as documented (list view omits truncated description because ArtworkListItem API shape excludes description — documented limitation); hero/ components implemented as documented; §2 lib/auth/ and src/types/ layout matches documented conventions; scripts/seed-admin.ts was already listed and is now implemented.
- `09-Coding-Standards.md` — §1 Admin/AdminInternal types consolidated into src/types/admin.ts as single source of truth; §4 model-boundary rule satisfied as specified; §13 test coverage for Cloudinary module and upload signature route satisfies documented risk-weighted philosophy; 13 unit tests for Cloudinary transformation and cloud-name modules; 20 lockout state-machine tests; 49 new Phase 4 route/model tests (242 passing total); type consolidation, model-boundary rule, and test coverage all satisfy documented standards.
- `10-Deployment-Guide.md` — §2–3 implementation matched documented contract; §6 HSTS remains a Render/proxy responsibility as documented.
- `12-Decision-Log.md` — ADR-005 implementation matches documented intercepting-route + fallback pattern; ADR-008 implementation matches documented on-demand transformation URL architecture.
- `project-docs/Testing-Infrastructure.md` — implementation matched documented coverage gate and E2E setup sections.
## [0.1] — 2026-07-18

**Initial creation of the full documentation package**, generated prior to any application code, establishing the project's single source of truth per `README.md`.

### Added
- `README.md` — documentation landing page, folder structure, reading order, hierarchy, and maintenance rules.
- `PROJECT-CONSTITUTION.md` — the project's highest-precedence governing document: vision, core philosophy, engineering principles, product principles, and future-growth rules.
- `01-Product-Definition.md` — vision, personas, user stories, functional and non-functional requirements, scope, success metrics.
- `02-Technical-Specification.md` — full technology stack, authentication/authorization model, media pipeline, caching model, environment variables, and an explicit, researched "Cost Reality" section covering current MongoDB Atlas, Cloudinary, and Railway free-tier limitations.
- `03-System-Architecture.md` — high-level architecture, authentication flow, upload flow, media processing, gallery rendering, filtering, search, caching, error recovery, and scalability, with Mermaid diagrams throughout.
- `04-Database-Schema.md` — full schema for `artworks`, `tags`, `admins`, and `site_settings`, including subdocuments, validation rules, indexes, example documents, and an ER diagram.
- `05-API-Specification.md` — all 15 MVP endpoints (5 public, 10 admin), request/response shapes, standard error envelope, pagination format, and versioning policy.
- `06-UI-Design-System.md` — the "digital sketchbook / museum gallery" design language: a named ink-and-paper color palette with three functionally-motivated accents, a three-face typography system, spacing/elevation/radius tokens, component guidance, and the "sketch-in reveal" signature motion.
- `07-User-Flows.md` — 11 documented flows (6 visitor, 5 administrator) with Mermaid diagrams, grounded in the schema and API documents.
- `08-Project-Structure.md` — full repository directory tree, responsibilities by directory, and naming conventions, including the intercepting-route structure for shareable artwork modals.
- `09-Coding-Standards.md` — TypeScript, React, Next.js, MongoDB, and Tailwind conventions; naming; error handling; logging; a risk-weighted testing philosophy; and a Conventional Commits policy.
- `10-Deployment-Guide.md` — local setup through production, including concrete MongoDB Atlas and Cloudinary provisioning steps, environment variable reference, backup strategy (addressing M0's lack of automated backups), and disaster recovery scenarios.
- `11-Project-Roadmap.md` — MVP through Version 2.0, plus unscheduled future ideas, each item cross-referenced to the document that already specifies it.
- `12-Decision-Log.md` — twelve initial Architecture Decision Records covering every major technology and architectural choice, including the rationale for choosing custom auth over Auth.js and the honest cost analysis behind sticking with Railway.
- `CHANGELOG.md` — this file.

### Notes
- This version establishes the documentation hierarchy (`README.md` §5) and the cross-referencing convention used throughout the package.
- Technical facts in `02-Technical-Specification.md` and `10-Deployment-Guide.md` (framework versions, provider free-tier limits) were verified against current sources as of 2026-07-18 and should be re-checked at the start of implementation if significant time has passed, since provider pricing and framework releases move independently of this document.

### Known Gaps for v0.2
- No wireframes or high-fidelity mockups yet — `06-UI-Design-System.md` defines tokens and component guidance but not full-page compositions.
- No formal test plan document; testing philosophy is defined in `09-Coding-Standards.md` §13 but a dedicated test-case inventory does not yet exist.
- Legal/licensing terms for downloadable artwork (what a visitor may do with a downloaded file) are outside this package's scope and are not yet addressed anywhere in `project-docs/`.
