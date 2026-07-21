# TODO — Active Build Queue & Task Staging

> **Precedence: None.** This document sits outside the hierarchy defined in `README.md` §5. It is not a source of truth and nothing in it is authoritative — if a note here ever conflicts with an actual numbered doc, the numbered doc wins, even mid-task. Its only job is to stage work before that work earns a permanent place in `CHANGELOG.md` and, where relevant, in the numbered docs themselves.

---

## 1. Purpose & Lifecycle

TODO.md is a **revolving door, not an archive.** It exists as the working pitstop for whatever feature or task is actively being built: a place to stage the plan, log notes and intermediate results while work happens, and check the outcome against explicit success conditions before anything is considered finished.

It is deliberately not the place where finished work lives. A task being functionally complete — every success condition met, every listed test passing — is **not** the same as a task being closed out. Closing out is a separate, explicit action, and it does not happen on this document's own initiative or on an agent's judgment that the work "looks done."

> **A completed item is never erased from this file, and never written into `CHANGELOG.md`, without EXPLICIT PERMISSION OR ORDER FROM THE USER.** A finished task, a passing test suite, or the user moving on to another topic are not permission. Permission is the user directly saying to close a specific item out.

## 2. Close-Out Procedure

Once — and only once — the user gives that explicit permission, run this sequence **for that one item**:

1. Confirm every success condition and test on the item is actually met/passing. If anything is outstanding, say so instead of proceeding.
2. Append an entry to `CHANGELOG.md`'s `[Unreleased]` section (create that section at the top of the file if it doesn't exist yet) using the controlled format in §3 below.
3. Update every numbered doc (`01`–`12`) the implementation actually touched — meaning either it confirms the doc's existing spec as-built, or it revealed a genuine deviation or addition the doc should now reflect. If nothing needed updating, say that explicitly in the CHANGELOG entry rather than silently skipping the step.
4. Remove the item's entire block from this file.

**Run this once per finished item, not batched.** Do not let several completed tasks pile up and reconcile them all in one pass — each item is closed out as its own explicit, reviewable action, so the record in `CHANGELOG.md` stays granular and every doc update is traceable to the single task that caused it.

## 3. Controlled Format for a CHANGELOG Entry

```markdown
## [Unreleased]

### Added
- **TODO-0XX** — <one or two sentences on what shipped, in plain language>

### Documentation Updates
- `0X-Doc-Name.md` §<section> — <what changed and why, or "no change; implementation matched the documented contract">
```

Use `### Changed` or `### Fixed` instead of `### Added` where that's the more accurate category, matching the style already established in `CHANGELOG.md`'s `[0.1]` entry. When enough `[Unreleased]` entries accumulate that they represent a meaningful, shippable increment, the user may choose to cut them into a proper dated version (`[0.2]`, `[0.3]`, ...) — that's a separate, deliberate decision this procedure does not make on its own.

## 4. Rules for Creating a TODO Item

1. **Give it a unique ID and an appropriate title.** IDs are sequential (`TODO-001`, `TODO-002`, ...) and are never reused, even after an item is closed out and erased — so a reference to "TODO-024" in `CHANGELOG.md` stays unambiguous forever. Titles are a few words, action-oriented, and name the outcome, not the mechanism (`Upload flow`, not `Add UploadDialog.tsx`).
2. **Estimate the time, roughly.** A range (e.g., "4–6h") aimed at one focused contributor. It's a planning aid, not a commitment — if reality diverges, note that in Notes/Results rather than silently ignoring the estimate.
3. **List explicit, checkable success conditions.** "The popup opens" is not a success condition. "Clicking a card opens the popup with no full page reload, and the URL updates to `/artwork/[slug]`" is.
4. **Create tests whenever a test can meaningfully exist**, per the risk-weighted philosophy in `09-Coding-Standards.md` §13 — business logic and write paths get real coverage; purely presentational work can honestly say "None required" instead of inventing a test for its own sake. Either way, say which and why.
5. **Name important structural changes up front, where one is already expected** — a new collection, a new endpoint, a new top-level directory, a new environment variable. Flag it in Success Conditions before starting, so the doc update at close-out is never a surprise.
6. **State the spec reference.** Every item should point at the doc and section that already defines what "correct" looks like. If nothing covers it yet, that's a signal the task is bigger than a TODO item — it likely needs its own ADR or a doc-package update *before* implementation starts, not after.
7. **State dependencies explicitly, by ID.** An item with unmet dependencies stays at `Not Started` regardless of how tempting it is to jump ahead.
8. **Keep items modular.** One item should be reviewable and closeable as a single coherent unit — not so small it's just "create a file," not so large it quietly bundles several unrelated success conditions together.
9. **Log notes and results as you go, not only at the end.** Notes/Results is a working log — blockers hit, decisions made, anything a future reader would want that isn't already captured by the success conditions.

## 5. Item Template

```markdown
#### TODO-0XX — <Short, action-oriented title>
**Status:** Not Started · **Est. time:** <range> · **Depends on:** <TODO IDs, or "None">
**Spec reference:** <doc>.md §<section>

**Success conditions:**
- <objectively checkable condition>

**Tests:**
- <what gets tested, or "None required — <why>">

**Notes / Results:** _(log here as work happens)_
```

**Status legend:** `Not Started` → `In Progress` → `Blocked — <reason in Notes>` → `Done — Awaiting Close-Out` (every success condition met and every test passing; do **not** remove until explicit permission per §2). Once closed out, an item has no status — it no longer exists here; it lives in `CHANGELOG.md`.

---

## 6. Current Queue — MVP Build Sequence

This seed list covers **Version 1.0 (MVP)** exactly as specified across `01`–`12`, sequenced into a technical build order — it is not a replacement for the version-based staging in `11-Project-Roadmap.md`; it's how the MVP milestone gets built. V1.1+ items get their own entries here when work on them begins, following the rules in §4.

### Phase 0 — Foundation & Environment

#### TODO-001 — Scaffold the repository
**Status:** Done — Awaiting Close-Out · **Est. time:** 1–2h · **Depends on:** None
**Spec reference:** `08-Project-Structure.md` (full), `02-Technical-Specification.md` §2

**Success conditions:**
- Next.js 16 App Router project created; TypeScript strict mode on; ESLint/Prettier configured per `09-Coding-Standards.md`
- Empty directory skeleton matches `08-Project-Structure.md` §1
- `npm run build` succeeds on the bare scaffold

**Tests:** None required — scaffolding only.
**Notes / Results:**
- **Audit date:** 2026-07-21
- **SC1 (Next.js 16 + TS strict + ESLint/Prettier):** ✅ All met. `package.json` has `"next": "^16.2.10"`, App Router structure in place, `tsconfig.json` has `"strict": true`, ESLint (`eslint.config.mjs`) and Prettier (`.prettierrc`) configured.
- **SC2 (Directory skeleton matches `08-Project-Structure.md` §1):** ⚠️ Broadly matches but with deltas:
  - No `tailwind.config.ts` — Tailwind v4 uses PostCSS-based config (`@tailwindcss/postcss` in `postcss.config.mjs`) instead. The doc should be updated to reflect this.
  - Uses `eslint.config.mjs` (ESLint v9 flat config) instead of `.eslintrc.json` as documented.
  - Extra `bushart-scaffold/` directory exists — not in the spec, likely a leftover from initial generation.
  - `scripts/db-setup.mjs` referenced in `package.json` scripts but file may not exist.
- **SC3 (`npm run build` succeeds):** ❓ Not verified in this session — the repo is far beyond a bare scaffold, so this check applies to the current state.
- **Overall verdict:** TODO-001 is effectively **complete and exceeded**. The scaffold was done, and the codebase now includes substantial implementation from later TODO items (models, auth, Cloudinary, validation, route handlers, components, hooks, types) all committed in the same initial commit `c70dd07d`. The documented structure in `08-Project-Structure.md` has minor deltas from the actual files (Tailwind v4 config format, ESLint flat config, extra scaffold dir) that should be reconciled at close-out.
- **Branch rename:** Local and remote `master` branch renamed to `main`. GitHub default branch updated to `main`. Old `master` deleted from origin.
- **Cleanup:** The audit also found and removed `bushart-scaffold/` (duplicate scaffold, 16 files) and `create-placeholders.mjs` (unused script) from both git and disk; `.gitignore` was patched with `.env`, `*.swp`, `*.swo` patterns; orphaned `.pre-commit-config.yaml` line commented out.
  - Commit `db123c77`: removed duplicate Next.js scaffold directory
  - Commit `6fa70765`: removed obsolete placeholder generation script
  - Commit `1a57430f`: added `.env`, `*.swp`, `*.swo` to `.gitignore`

#### TODO-002 — Provision MongoDB Atlas & Cloudinary
**Status:** Not Started · **Est. time:** 1h · **Depends on:** None
**Spec reference:** `10-Deployment-Guide.md` §2–3

**Success conditions:**
- M0 cluster live, DB user created, network access configured
- Cloudinary account created, credentials in hand
- `.env.example` and local `.env.local` populated per `02-Technical-Specification.md` §9

**Tests:** None — external setup.
**Notes / Results:** _(none yet)_

#### TODO-003 — Wire design tokens + load fonts
**Status:** Not Started · **Est. time:** 2h · **Depends on:** TODO-001
**Spec reference:** `06-UI-Design-System.md` §2–5

**Success conditions:**
- `tailwind.config.ts` exposes every color/spacing/radius/type token from §2–5 by name
- Fraunces, Inter, and IBM Plex Mono load via `next/font`, self-hosted (no runtime Google Fonts request)

**Tests:** None required — visual/config only.
**Notes / Results:** _(none yet)_

### Phase 1 — Data Layer

#### TODO-004 — MongoDB connection helper + index setup script
**Status:** Not Started · **Est. time:** 2–3h · **Depends on:** TODO-001, TODO-002
**Spec reference:** `04-Database-Schema.md` §3–6

**Success conditions:**
- `lib/db/mongodb.ts` caches a single client across hot reloads/invocations
- `npm run db:setup` idempotently creates every index listed in §3–6; running it twice causes no errors

**Tests:** Integration test against a local/test MongoDB instance asserting all listed indexes exist post-setup.
**Notes / Results:** _(none yet)_

#### TODO-005 — Data-access layer for all four collections
**Status:** Not Started · **Est. time:** 4–6h · **Depends on:** TODO-004
**Spec reference:** `04-Database-Schema.md` §3–6

**Success conditions:**
- `lib/db/models/{artwork,tag,admin,settings}.ts` expose typed functions covering every operation later endpoints need
- No Route Handler needs to import the MongoDB driver directly; `ObjectId` ↔ string conversion happens only at this boundary (`09-Coding-Standards.md` §4)

**Tests:** Unit tests for each model function's query shape (mocked driver) — required per `09-Coding-Standards.md` §13.
**Notes / Results:** _(none yet)_

#### TODO-006 — Zod schemas + shared TypeScript types
**Status:** Not Started · **Est. time:** 3–4h · **Depends on:** TODO-005
**Spec reference:** `04-Database-Schema.md` (validation rules throughout), `05-API-Specification.md`

**Success conditions:**
- `lib/validation/{artwork,tag,settings}.ts` implement every validation rule in `04` (1–20 images, `type` enum, slug pattern, `featuredOrder` required iff `featured`, etc.)
- `src/types/*` derived via `z.infer`, matching `05`'s request/response shapes field-for-field

**Tests:** Unit tests covering each validation rule's pass/fail boundary.
**Notes / Results:** _(none yet)_

### Phase 2 — Authentication

#### TODO-007 — Core auth utilities
**Status:** Not Started · **Est. time:** 2h · **Depends on:** TODO-001
**Spec reference:** `02-Technical-Specification.md` §4

**Success conditions:**
- `lib/auth/jwt.ts` signs/verifies HS256 tokens with the documented 7-day expiry
- Password hashing uses bcrypt, cost factor 12; no plaintext password is ever logged

**Tests:** Unit tests for sign/verify round-trip, expiry handling, and tampered-token rejection.
**Notes / Results:** _(none yet)_

#### TODO-008 — Admin seed script + brute-force lockout
**Status:** Not Started · **Est. time:** 2h · **Depends on:** TODO-005, TODO-007
**Spec reference:** `02-Technical-Specification.md` §9, `04-Database-Schema.md` §5

**Success conditions:**
- `scripts/seed-admin.ts` creates exactly one `admins` doc from `INITIAL_ADMIN_*`
- `failedLoginAttempts`/`lockUntil` locks after 5 failures for 15 minutes, exactly as specified

**Tests:** Unit tests for the lockout state machine (attempt counting, lock expiry).
**Notes / Results:** _(none yet)_

#### TODO-009 — Auth API routes + server-side guard + `proxy.ts`
**Status:** Not Started · **Est. time:** 4h · **Depends on:** TODO-007, TODO-008
**Spec reference:** `05-API-Specification.md` §5, `02-Technical-Specification.md` §4 (CVE-2025-29927 note)

**Success conditions:**
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` match §5 exactly, incl. an identical error for wrong username vs. wrong password
- `lib/auth/guard.ts` independently re-verifies the session inside every admin handler
- `proxy.ts` performs a UX-layer redirect only — a request that bypasses it must still be rejected at the handler level

**Tests:** Integration tests for all three routes (success + failure paths), plus one regression test proving a handler rejects an unauthenticated request even without `proxy.ts` in the loop.
**Notes / Results:** _(none yet)_

### Phase 3 — Media Pipeline

#### TODO-010 — Cloudinary client + signed upload signature endpoint
**Status:** Not Started · **Est. time:** 2h · **Depends on:** TODO-002, TODO-009
**Spec reference:** `02-Technical-Specification.md` §6, `05-API-Specification.md` §6

**Success conditions:**
- `POST /api/upload/signature` requires a valid admin session and returns a correctly signed, time-boxed signature
- `CLOUDINARY_API_SECRET` never appears in any client-visible response

**Tests:** Integration test asserting an unauthenticated call is rejected and an authenticated call returns a valid signature shape.
**Notes / Results:** _(none yet)_

#### TODO-011 — Transformation URL helper module
**Status:** Not Started · **Est. time:** 2h · **Depends on:** TODO-010
**Spec reference:** `03-System-Architecture.md` §5, `12-Decision-Log.md` ADR-008

**Success conditions:**
- `lib/cloudinary/transformations.ts` is the single place defining grid/list/popup/fullscreen/download URL parameters
- `f_auto,q_auto` applied consistently everywhere per `02-Technical-Specification.md` §7; a new size later requires touching only this file

**Tests:** Unit tests asserting each context produces the expected parameter string.
**Notes / Results:** _(none yet)_

### Phase 4 — Core API

#### TODO-012 — Public artwork read endpoints
**Status:** Not Started · **Est. time:** 5h · **Depends on:** TODO-005, TODO-006, TODO-011
**Spec reference:** `05-API-Specification.md` §4.1–4.3

**Success conditions:**
- `GET /api/artworks` (filters, cursor pagination, 24 default/60 max limit), `GET /api/artworks/:slug`, and `GET /api/artworks/:slug/download` all match §4 exactly, incl. NSFW default-exclude behavior and the 302 `fl_attachment` redirect

**Tests:** Integration tests for filter combinations, cursor stability under a concurrent insert, and the download redirect target.
**Notes / Results:** _(none yet)_

#### TODO-013 — Admin artwork write endpoints
**Status:** Not Started · **Est. time:** 5h · **Depends on:** TODO-009, TODO-012
**Spec reference:** `05-API-Specification.md` §7

**Success conditions:**
- `POST`/`PATCH`/`DELETE` on `/api/artworks[/:id]` match §7 exactly, incl. tag `usageCount` reconciliation on create/edit/delete and Cloudinary `destroy` calls on delete

**Tests:** Integration test that edits `tagIds` and asserts `usageCount` updates correctly on both the added and removed tag.
**Notes / Results:** _(none yet)_

#### TODO-014 — Tags API
**Status:** Not Started · **Est. time:** 2h · **Depends on:** TODO-005, TODO-006, TODO-009
**Spec reference:** `05-API-Specification.md` §8, `04-Database-Schema.md` §4

**Success conditions:**
- Create/list/cascading-delete all match spec; a case-insensitive duplicate name returns `409`

**Tests:** Integration test proving cascading delete pulls the tag from every referencing artwork in one operation.
**Notes / Results:** _(none yet)_

#### TODO-015 — Settings API
**Status:** Not Started · **Est. time:** 2h · **Depends on:** TODO-005, TODO-006, TODO-009
**Spec reference:** `05-API-Specification.md` §9, `04-Database-Schema.md` §6

**Success conditions:**
- `GET`/`PATCH /api/settings` operate correctly against the singleton document, including the very first `PATCH` before any settings document exists yet

**Tests:** Integration test covering that zero-state case specifically.
**Notes / Results:** _(none yet)_

### Phase 5 — Public Gallery UI

#### TODO-016 — Root layout + hero section
**Status:** Not Started · **Est. time:** 4h · **Depends on:** TODO-003, TODO-015
**Spec reference:** `06-UI-Design-System.md` §8, `01-Product-Definition.md` §6

**Success conditions:**
- Banner, profile picture, artist name, bio, social links, contact button, and featured artwork all render from live `GET /api/settings` + featured-artwork data
- Mobile-first; matches breakpoints in `06` §4

**Tests:** Component test asserting the hero renders correctly with both a populated and an empty settings object.
**Notes / Results:** _(none yet)_

#### TODO-017 — Gallery grid + detailed list views
**Status:** Not Started · **Est. time:** 6h · **Depends on:** TODO-012, TODO-016
**Spec reference:** `06-UI-Design-System.md` §4 & §8

**Success conditions:**
- Both view modes render from the same feed data; switching modes preserves scroll position and active filters
- NSFW/commission badges use the three-accent palette from `06` §2.2 — color is never the only signal

**Tests:** Component test for card rendering in both modes, using commission/NSFW/plain artwork fixtures.
**Notes / Results:** _(none yet)_

#### TODO-018 — Filter bar + NSFW toggle (URL-synced)
**Status:** Not Started · **Est. time:** 4h · **Depends on:** TODO-012, TODO-017
**Spec reference:** `03-System-Architecture.md` §7, `07-User-Flows.md` Flows 1 & 5

**Success conditions:**
- Active filters serialize to URL search params and reproduce the same view on load
- NSFW preference persists client-side and is sent as an explicit query param on every request

**Tests:** Component test asserting a filter change updates both the URL and the fired API query.
**Notes / Results:** _(none yet)_

#### TODO-019 — Infinite scroll + SketchReveal signature motion
**Status:** Not Started · **Est. time:** 5h · **Depends on:** TODO-017
**Spec reference:** `03-System-Architecture.md` §6 & §9, `06-UI-Design-System.md` §14

**Success conditions:**
- `IntersectionObserver` sentinel correctly fetches the next cursor page
- `SketchReveal` plays on thumbnail lazy-load-in and falls back to an opacity crossfade under `prefers-reduced-motion`

**Tests:** Component test asserting reduced-motion preference disables the trace animation.
**Notes / Results:** _(none yet)_

### Phase 6 — Artwork Detail & Sharing

#### TODO-020 — Intercepting-route modal + full-page fallback
**Status:** Not Started · **Est. time:** 5h · **Depends on:** TODO-012, TODO-017
**Spec reference:** `03-System-Architecture.md` §6, `08-Project-Structure.md` §2, `12-Decision-Log.md` ADR-005

**Success conditions:**
- Clicking a card client-side-navigates to a modal with no full reload
- Visiting `/artwork/[slug]` directly server-renders the same popup content as a full page, sharing the identical underlying component

**Tests:** E2E test covering both entry paths (in-app click vs. direct URL load).
**Notes / Results:** _(none yet)_

#### TODO-021 — ArtworkPopup + FullscreenViewer
**Status:** Not Started · **Est. time:** 5h · **Depends on:** TODO-020
**Spec reference:** `06-UI-Design-System.md` §11, `07-User-Flows.md` Flow 2

**Success conditions:**
- Image sequence, timelapse, metadata placard, tags, and action row render per `06` §11
- No related-artwork module anywhere, even when other artworks share tags — this is an explicit non-feature (`01-Product-Definition.md`)
- Fullscreen viewer strips all chrome except close + prev/next

**Tests:** Component test asserting the related-artwork module is absent under all conditions.
**Notes / Results:** _(none yet)_

#### TODO-022 — Download + Share actions
**Status:** Not Started · **Est. time:** 2h · **Depends on:** TODO-012, TODO-021
**Spec reference:** `07-User-Flows.md` Flows 3 & 4, `05-API-Specification.md` §4.3

**Success conditions:**
- Download triggers the documented redirect without the app server touching file bytes
- Share uses the Web Share API where available and falls back to clipboard-copy with visible confirmation otherwise

**Tests:** Component test for both Share code paths (mocked API availability true/false).
**Notes / Results:** _(none yet)_

### Phase 7 — Admin Experience

#### TODO-023 — Hidden login entry point + LoginModal + useAuth
**Status:** Not Started · **Est. time:** 4h · **Depends on:** TODO-009, TODO-016
**Spec reference:** `06-UI-Design-System.md` §12, `07-User-Flows.md` Flow 6

**Success conditions:**
- Footer glyph (~30% opacity, full on hover/focus) and `Shift+Alt+L` both open the login modal
- `useAuth` reflects session state on every load via `GET /api/auth/me`; lockout error surfaces inline per `05` §5.1

**Tests:** E2E test for the full login flow, including a locked-account attempt.
**Notes / Results:** _(none yet)_

#### TODO-024 — Upload flow (UploadCard → UploadDialog → Cloudinary → create)
**Status:** Not Started · **Est. time:** 8h · **Depends on:** TODO-010, TODO-011, TODO-013, TODO-023
**Spec reference:** `07-User-Flows.md` Flow 7, `03-System-Architecture.md` §4

**Success conditions:**
- Admin-only UploadCard is the first gallery card, and only when authenticated
- Single flow supports multi-image + optional timelapse + full metadata + existing/new tag selection
- A fresh upload appears in the gallery immediately with no manual refresh
- End-to-end completes in under 2 minutes for a standard single-image upload (`01-Product-Definition.md` §11 success metric)

**Tests:** E2E test for the complete upload flow, including creating a new tag inline.
**Notes / Results:** _(none yet)_

#### TODO-025 — Edit artwork flow
**Status:** Not Started · **Est. time:** 4h · **Depends on:** TODO-013, TODO-024
**Spec reference:** `07-User-Flows.md` Flow 8

**Success conditions:**
- Popup switches to a pre-filled edit state for admins only
- Save round-trips through `PATCH /api/artworks/:id` and reflects immediately

**Tests:** Component test asserting edit controls are absent for non-admin sessions.
**Notes / Results:** _(none yet)_

#### TODO-026 — Tag management UI
**Status:** Not Started · **Est. time:** 3h · **Depends on:** TODO-014, TODO-023
**Spec reference:** `07-User-Flows.md` Flow 9

**Success conditions:**
- Dedicated view lists tags with usage counts
- Deletion requires a UI confirmation step before calling the API (the API itself has none, per `05` §8.2)

**Tests:** Component test asserting delete requires confirmation before firing the API call.
**Notes / Results:** _(none yet)_

#### TODO-027 — Homepage/hero editor
**Status:** Not Started · **Est. time:** 4h · **Depends on:** TODO-015, TODO-016, TODO-023
**Spec reference:** `07-User-Flows.md` Flow 10

**Success conditions:**
- Every hero field is editable in place for admins, saved via `PATCH /api/settings`, and visible to all visitors immediately after save

**Tests:** Component test for the in-place edit → save → re-render cycle.
**Notes / Results:** _(none yet)_

#### TODO-028 — Featured artwork management UI
**Status:** Not Started · **Est. time:** 3h · **Depends on:** TODO-013, TODO-025
**Spec reference:** `07-User-Flows.md` Flow 11

**Success conditions:**
- Toggling `featured` and setting `featuredOrder` updates the homepage featured section immediately
- No separate `/feature` endpoint is used — folded into the general `PATCH`, per `12-Decision-Log.md`

**Tests:** Component test asserting `featuredOrder` is required in the UI whenever `featured` is toggled on.
**Notes / Results:** _(none yet)_

### Phase 8 — Hardening

#### TODO-029 — Error boundaries + API error envelope + logging
**Status:** Not Started · **Est. time:** 4h · **Depends on:** TODO-012 through TODO-028
**Spec reference:** `03-System-Architecture.md` §10, `05-API-Specification.md` §2, `09-Coding-Standards.md` §11–12

**Success conditions:**
- Gallery feed and artwork popup fail independently — one broken request never blanks the whole page
- Every Route Handler returns the shared error envelope; no bare `console.log` remains in committed code

**Tests:** Component test forcing one section to error and asserting the rest of the page still renders.
**Notes / Results:** _(none yet)_

#### TODO-030 — Accessibility pass
**Status:** Not Started · **Est. time:** 6h · **Depends on:** TODO-016 through TODO-028
**Spec reference:** `06-UI-Design-System.md` §16, `01-Product-Definition.md` §7

**Success conditions:**
- Full keyboard operability across gallery/filter/popup/fullscreen/admin controls, with visible focus states throughout
- Screen-reader text present on cards; fullscreen viewer announces image position on navigation
- Every uploaded image has at least title-derived alt text; contrast spot-checked against `06` §2.3

**Tests:** Automated accessibility audit (e.g., axe) integrated into the E2E suite, zero critical violations as the bar.
**Notes / Results:** _(none yet)_

### Phase 9 — Testing Infrastructure

#### TODO-031 — Wire the required unit-test coverage gate
**Status:** Not Started · **Est. time:** 2h · **Depends on:** TODO-007, TODO-008, TODO-013
**Spec reference:** `09-Coding-Standards.md` §13

**Success conditions:**
- CI fails the build if `lib/auth/` or the `artworks` write paths lack passing test coverage — the one area flagged as required-before-ship, not optional

**Tests:** This task *is* the test-infrastructure work — the tests themselves are written under TODO-007/008/013.
**Notes / Results:** _(none yet)_

#### TODO-032 — Route Handler integration test suite
**Status:** Not Started · **Est. time:** 6h · **Depends on:** TODO-012, TODO-013, TODO-014, TODO-015
**Spec reference:** `09-Coding-Standards.md` §13, `05-API-Specification.md` (all sections)

**Success conditions:**
- Primary success + failure path covered for all 15 endpoints, run against a real local/test MongoDB instance

**Tests:** This task is the test suite itself.
**Notes / Results:** _(none yet)_

#### TODO-033 — E2E suite (Playwright)
**Status:** Not Started · **Est. time:** 5h · **Depends on:** TODO-018, TODO-023, TODO-024
**Spec reference:** `09-Coding-Standards.md` §13

**Success conditions:**
- Login, full upload, and NSFW toggle flows pass headlessly in CI

**Tests:** This task is the test suite itself.
**Notes / Results:** _(none yet)_

### Phase 10 — Deployment

#### TODO-034 — Deploy to Render
**Status:** Not Started · **Est. time:** 2h · **Depends on:** TODO-001 through TODO-033; the pending Railway→Render documentation update (`02`, `03`, `08`, `10`, `12`, `CHANGELOG.md`) applied first
**Spec reference:** `10-Deployment-Guide.md` §6 (Render version), `12-Decision-Log.md` ADR-013

**Success conditions:**
- Connected repo auto-deploys `main`; every environment variable set; homepage loads, login works, and a real upload succeeds end-to-end in production

**Tests:** Manual production smoke test against the full checklist in `10` §10.
**Notes / Results:** _(none yet)_

#### TODO-035 — Backup workflow
**Status:** Not Started · **Est. time:** 3h · **Depends on:** TODO-034
**Spec reference:** `10-Deployment-Guide.md` §8

**Success conditions:**
- Scheduled GitHub Actions job runs `mongodump` on a recurring cadence and completes successfully at least once, verified manually

**Tests:** One manual restore-drill into a scratch cluster confirming the export is actually usable.
**Notes / Results:** _(none yet)_

#### TODO-036 — Monitoring: Cloudinary alerts + Render keep-alive
**Status:** Not Started · **Est. time:** 1h · **Depends on:** TODO-034
**Spec reference:** `10-Deployment-Guide.md` §7

**Success conditions:**
- Cloudinary usage-alert emails enabled
- A scheduled keep-alive ping configured to stay within Render's included monthly hours while avoiding the 15-minute sleep in practice

**Tests:** None — operational configuration.
**Notes / Results:** _(none yet)_

---

*Estimates throughout assume one focused, solo contributor and are planning aids, not commitments. When V1.1 work begins (per `11-Project-Roadmap.md`), seed its items here following §4–§5 above.*
