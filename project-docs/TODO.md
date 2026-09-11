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
3. **Document dependencies.** If a task needs another TODO completed first, name it. A task with unfinished dependencies stays "Blocked" until they land.
4. **Write explicit, testable success conditions.** "Works" is not a success condition. "A visitor can filter by year and see only matching artworks" is. Every condition should be verifiable without reading the code.
5. **List the tests that prove it.** If a task ships behavior, it names the test files or specs that lock that behavior in. Pure-infra tasks with no user-visible behavior may note "None — infrastructure configuration."

## 5. Task Template

```markdown
#### TODO-0XX — <Title>
**Status:** Not Started · **Est. time:** Xh · **Depends on:** TODO-0YY (if any)
**Spec reference:** `0X-Doc-Name.md` §Y

**Success conditions:**
- <Condition 1>
- <Condition 2>

**Tests:** <Which test files or specs verify this>
**Notes / Results:** _(fill in as work progresses)_
```

## 6. Active Items

_(No currently active items — pick up the next Not Started item from the phases below.)_

---

### [Done] Phase 1 — Foundation & Documentation

### [Done] Phase 2 — Gallery & Viewing Experience

### [Done] Phase 3 — Artworks & Detail View

### [Done] Phase 4 — Admin Authentication

### [Done] Phase 5 — Admin CMS & Artwork Management

### [Done] Phase 6 — Media Upload Pipeline

### [Done] Phase 7 — Media Enhancement & Accessibility

### [Done] Phase 8 — Hardening

### Phase 9 — Testing Infrastructure

#### TODO-035 — Wire the required unit-test coverage gate
**Status:** Done — Awaiting Close-Out · **Est. time:** 2h · **Depends on:** TODO-007, TODO-008, TODO-013
**Spec reference:** `09-Coding-Standards.md` §13

**Success conditions:**
- CI fails the build if `lib/auth/` or the `artworks` write paths lack passing test coverage — the one area flagged as required-before-ship, not optional

**Tests:** This task *is* the test-infrastructure work — the tests themselves are written under TODO-007/008/013.
**Notes / Results:** Coverage gate wired: `@vitest/coverage-v8@3.2.7`, `npm run test:coverage`, per-glob thresholds in `vitest.config.mts` (85% lines/statements/functions, 80% branches on `lib/auth/**`, artwork model write paths, `app/api/artworks/**` independently). CI `test` job runs MongoDB + `db:setup` + single coverage step. See `Testing-Infrastructure.md`. Phase 9 testing scope is unchanged from the original MVP plan; pick up after Phase 8 hardening (TODO-029–034) is complete.

**Audit note (2026-09-11):** Coverage gate implementation verified complete. Status updated from "Not Started" to "Done — Awaiting Close-Out" per audit findings. All success conditions met: thresholds configured, CI integration working, coverage tooling installed.

#### TODO-036 — Route Handler integration test suite
**Status:** In Progress · **Est. time:** 6h · **Depends on:** TODO-012, TODO-013, TODO-014, TODO-015
**Spec reference:** `09-Coding-Standards.md` §13, `05-API-Specification.md` (all sections)

**Success conditions:**
- Primary success + failure path covered for all 15 endpoints, run against a real local/test MongoDB instance
- Dependency failures assert **503** `SERVICE_UNAVAILABLE` and shared error envelope (Phase 8 TODO-029/032 behaviors)

**Tests:** This task is the test suite itself.
**Notes / Results:** Assert Phase 8 error-envelope and MongoDB **503** behaviors from TODO-029/032 on dependency-failure paths.

**Audit note (2026-09-11):** Conversion from mocked to real MongoDB in progress. Test helper `tests/helpers/test-db.ts` created with `getTestDb()`, `clearCollections()`, `seedDocuments()`, `closeTestDb()`, and `createMongodbMock()` utilities. The `vi.mock("@/lib/db/mongodb", () => createMongodbMock())` pattern redirects all model-layer database calls to the test database without production code changes.

**Converted tests (real MongoDB):**
- `tests/api/artworks/list.test.ts` — GET /api/artworks with real data
- `tests/api/artworks/detail.test.ts` — GET /api/artworks/:slug with real data
- `tests/api/artworks/download.test.ts` — GET /api/artworks/:slug/download with real data
- `tests/api/auth/login.test.ts` — POST /api/auth/login with real admin data
- `tests/api/auth/me.test.ts` — GET /api/auth/me with real admin data

**Remaining tests to convert:**
- `tests/api/artworks/write.test.ts` — POST/PATCH/DELETE /api/artworkts (admin-gated, more complex)
- `tests/api/auth/login-race.test.ts` — Race condition tests
- `tests/api/auth/logout.test.ts` — No DB access needed, can remain as-is
- `tests/api/settings/settings.test.ts` — GET/PUT /api/settings
- `tests/api/tags/tags.test.ts` — GET/POST /api/tags
- `tests/api/upload/signature.test.ts` — GET /api/upload/signature

**Dependency mocking strategy:** Auth/password and JWT modules remain mocked (pure logic, no DB). Only the `@/lib/db/mongodb` module is redirected to test database.

#### TODO-037 — E2E suite (Playwright)
**Status:** Done — Awaiting Close-Out · **Est. time:** 5h · **Depends on:** TODO-018, TODO-023, TODO-024
**Spec reference:** `09-Coding-Standards.md` §13

**Success conditions:**
- Login, full upload, and NSFW toggle flows pass headlessly in CI

**Tests:** This task is the test suite itself.
**Notes / Results:** Accessibility axe audit (TODO-030) integrates into this suite when wired; not a blocking dependency for login/upload/NSFW flow coverage.

**Audit note (2026-09-11):** All success conditions now met. Added `tests/e2e/nsfw-toggle.spec.ts` to cover the NSFW toggle flow that was missing from the original E2E suite. The test verifies:
1. Toggle state changes and persists across page reload
2. NSFW artworks are filtered when toggle is off
3. NSFW artworks appear when toggle is on

**E2E test files (7 spec files, 21+ tests):**
- `admin-login.spec.ts` — Login flow, keyboard shortcut, lockout
- `admin-upload.spec.ts` — Full upload flow with tag creation
- `admin-edit-after-login.spec.ts` — Post-login editing
- `nsfw-toggle.spec.ts` — NSFW toggle flow (NEW)
- `accessibility.spec.ts` — Axe audit, keyboard, contrast
- `artwork-modal.spec.ts` — Modal interactions
- `gallery-browse.spec.ts` — Gallery browsing

### Phase 10 — Deployment

#### TODO-038 — Deploy to Render
**Status:** Not Started · **Est. time:** 2h · **Depends on:** TODO-001 through TODO-037; the pending Railway→Render documentation update (`02`, `03`, `08`, `10`, `12`, `CHANGELOG.md`) applied first
**Spec reference:** `10-Deployment-Guide.md` §6 (Render version), `12-Decision-Log.md` ADR-013

**Success conditions:**
- Production app is live on Render with a custom domain (or `*.onrender.com` URL) and HTTPS
- `MONGODB_URI`, `JWT_SECRET`, Cloudinary env vars set in Render dashboard
- `npm run build` succeeds in Render's environment; `db:setup` runs as a post-deploy hook

**Tests:** Deployed site is reachable and serves the gallery.
**Notes / Results:** Requires all prior phases complete; the documentation update (Railway→Render) is part of this task's dependency chain.

#### TODO-039 — Environment parity verification
**Status:** Not Started · **Est. time:** 1h · **Depends on:** TODO-038
**Spec reference:** `10-Deployment-Guide.md` §6, `02-Technical-Specification.md` §9

**Success conditions:**
- Production `npm run build` succeeds with the same Next.js config used locally
- No env-var mismatches between local `.env.local` and Render dashboard

**Tests:** None — operational verification.
**Notes / Results:** Requires production deploy (TODO-038) live first.

#### TODO-040 — Cloudinary usage alerts + Render keep-alive
**Status:** Not Started · **Est. time:** 1h · **Depends on:** TODO-038
**Spec reference:** `10-Deployment-Guide.md` §7

**Success conditions:**
- Cloudinary usage-alert emails enabled
- A scheduled keep-alive ping configured to stay within Render's included monthly hours while avoiding the 15-minute sleep in practice

**Tests:** None — operational configuration.
**Notes / Results:** Requires production deploy (TODO-038) live first.

### Phase 11 — Advanced Testing Infrastructure

#### TODO-041 — MSW integration layer for hook/component tests
**Status:** Not Started · **Est. time:** 4h · **Depends on:** None
**Spec reference:** `Testing-Infrastructure.md` §8–§9, `09-Coding-Standards.md` §13

**Success conditions:**
- MSW server boots in Vitest jsdom setup and serves realistic `/api/**` sequences for hook tests without per-file Playwright-style route mocks
- At least one hook test (`useArtworks` or `useFilters`) converted to the shared MSW pattern as a reference implementation

**Tests:** This task is the test-infrastructure work.
**Notes / Results:** Post-MVP advanced testing; scope unchanged. E2E baseline is TODO-037; deploy prerequisite for smoke/Lighthouse items is TODO-038.

#### TODO-042 — Schema contract tests (Zod vs 04/05)
**Status:** Not Started · **Est. time:** 3h · **Depends on:** None
**Spec reference:** `04-Database-Schema.md`, `05-API-Specification.md`, `09-Coding-Standards.md` §13

**Success conditions:**
- Test suite asserts every field required by the API spec is accepted/rejected consistently by the matching Zod schema in `lib/validation/`
- CI fails on deliberate schema/doc drift (field added to spec but missing from validator, or vice versa)

**Tests:** This task is the test suite itself.
**Notes / Results:** _(none yet)_

#### TODO-043 — Playwright visual regression baseline
**Status:** Not Started · **Est. time:** 4h · **Depends on:** TODO-037
**Spec reference:** `Testing-Infrastructure.md` §2, `06-UI-Design-System.md`

**Success conditions:**
- Screenshot comparison configured for gallery grid and artwork modal in Playwright
- Baseline images committed; CI fails on unintended visual diffs above a documented tolerance

**Tests:** This task is the test suite itself.
**Notes / Results:** _(none yet)_

#### TODO-044 — Automated post-deploy smoke suite
**Status:** Not Started · **Est. time:** 3h · **Depends on:** TODO-038
**Spec reference:** `10-Deployment-Guide.md` §10, `Testing-Infrastructure.md` §6

**Success conditions:**
- Script or GitHub Action hits production (or staging) with HTTP checks for homepage, auth endpoint, and gallery API
- Replaces the manual production checklist in TODO-038 for routine deploy verification

**Tests:** This task is the smoke suite itself.
**Notes / Results:** _(none yet)_

#### TODO-045 — Lighthouse CI performance budget gate
**Status:** Not Started · **Est. time:** 3h · **Depends on:** TODO-038
**Spec reference:** `02-Technical-Specification.md` §13, `Testing-Infrastructure.md` §6

**Success conditions:**
- Lighthouse CI (or equivalent) runs against homepage in CI or post-deploy
- Build fails when Initial JS payload or LCP exceeds the budget documented in `02` §13

**Tests:** This task is the performance gate itself.
**Notes / Results:** _(none yet)_

#### TODO-046 — Parallel E2E workers + flake policy
**Status:** Not Started · **Est. time:** 2h · **Depends on:** TODO-037
**Spec reference:** `Testing-Infrastructure.md` §6, `playwright.config.ts`

**Success conditions:**
- Playwright `workers` increased beyond 1 once suite exceeds ~20 tests without flaky failures
- Retry policy and trace-on-failure rules documented in `Testing-Infrastructure.md`

**Tests:** None — infrastructure configuration.
**Notes / Results:** _(none yet)_

---

*Estimates throughout assume one focused, solo contributor and are planning aids, not commitments. When V1.1 work begins (per `11-Project-Roadmap.md`), seed its items here following §4–§5 above.*
