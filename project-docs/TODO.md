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

### [Done] Phase 9 — Testing Infrastructure

---

### Phase 10 — Deployment

#### TODO-039 — Environment parity verification
**Status:** Not Started · **Est. time:** 1h · **Depends on:** TODO-038
**Spec reference:** `10-Deployment-Guide.md` §6, `02-Technical-Specification.md` §9

**Success conditions:**
- Production `npm run build` succeeds with the same Next.js config used locally
- No env-var mismatches between local `.env.local` and Render dashboard

**Tests:** None — operational verification.
**Notes / Results:** Production deploy (TODO-038) is live. Carried over from TODO-038, since these could not be confirmed from the repository: confirm Render's build log reports the pinned Node runtime (`.node-version`, 24.14.1) for both build and post-deploy; re-confirm the deployed `MONGODB_URI` names `bushart`; verify `INITIAL_ADMIN_*` were removed after seeding; and compare every variable in `10-Deployment-Guide.md` §4 against the Render dashboard. Render does not receive `.env.local` — the dashboard is the only source of truth for production.

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

### Phase 12 — Post-Deploy Operations

#### TODO-047 — Production content inventory & preservation check
**Status:** Not Started · **Est. time:** 2h · **Depends on:** TODO-038
**Spec reference:** `04-Database-Schema.md` §8, `10-Deployment-Guide.md` §8

**Success conditions:**
- The artwork reported missing during the TODO-038 session is either located or confirmed lost, and the answer is recorded
- A current count of `artworks`/`tags`/`site_settings` in the `bushart` database is captured and compared against the Cloudinary assets, so orphaned or unlisted media is identified
- No deletion, migration, or reseeding is performed without separate approval

**Tests:** None — operational inventory.
**Notes / Results:** Opened at TODO-038 close-out. During that session, agent-run tests were pointed at the application database and destroyed data; the admin was restored, but the fate of a missing E2E artwork and the full extent of content loss were never established, and earlier empty-collection observations are not a current inventory. The `getTestDb()`/`seed-e2e.ts` guards (`12-Decision-Log.md` ADR-014) prevent recurrence on those paths only.

#### TODO-048 — Database index setup as an application boot task
**Status:** Done — Awaiting Close-Out · **Est. time:** 2h · **Depends on:** TODO-038
**Spec reference:** `04-Database-Schema.md` §3–6, `10-Deployment-Guide.md` §6, `12-Decision-Log.md` ADR-015

**Success conditions:**
- The first Render deploy after the fix completes without database commands in the build command, and the boot log shows the index task running (or failing loudly but non-fatally)
- The homepage returns 200 and admin login works against production
- No npm script depends on Node-version-specific CLI flags; `npm run db:setup` works on the app's minimum supported Node (20.9+) with no `.env.local` present
- Index definitions live in one shared module used by both the boot task and `db:setup` (`04-Database-Schema.md` §3–6 unchanged)

**Tests:** `tests/db-setup.test.ts` (index creation against a real database); full gate via `npm run test:all`.
**Notes / Results:** Implementation 2026-09-18. Root cause of the failed deploy: `db:setup` ran in Render's build command on Node 20.18.0, where `--env-file-if-exists` failed hard on the (legitimately absent) `.env.local`. Free tier has no pre-deploy command, one-off jobs, or shell access, so index setup moved into the app boot path (`src/lib/db/indexes.ts` + `src/instrumentation.ts`), non-fatal and idempotent; the standalone script now delegates to the same spec. `engines` relaxed to `>=20.9.0`; the Node CLI flags were removed from every npm script. Verified locally: lint/typecheck clean, `tests/db-setup.test.ts` 8/8 vs `bushart-test`, flag-free `npm run db:setup` exit 0, full gate PASS. Render-side observation (clean build, boot-log index task, homepage 200 + login) still pending on the next deploy.

#### TODO-049 — Dependency security remediation (`npm audit`)
**Status:** Not Started · **Est. time:** 2h · **Depends on:** None
**Spec reference:** `02-Technical-Specification.md` §11, `09-Coding-Standards.md` §14

**Success conditions:**
- `npm audit` reports zero high/critical vulnerabilities (11 at 2026-09-18: next, sharp, postcss, nanoid, browserslist, js-yaml, brace-expansion, baseline-browser-mapping)
- All fixes are non-breaking (`npm audit fix`, no forced major bumps); build and full test gate stay green
- `eslint-config-next` matches the installed `next` major

**Tests:** Full suite green after the bump (`npm run test:all`); `npm run build` succeeds.
**Notes / Results:** Triaged 2026-09-18. The critical `next` advisories target Server Actions and the Image Optimization API, which this app does not use (no `use server`, no `next/image`); the app-facing risk is low but the in-range fix (next 16.2.10 → 16.3.5) is cheap. The only advisory without a non-breaking fix is dev-only `@vitest/mocker` — deferred to TODO-050. No CI `npm audit` gate for now (would turn unrelated advisories into red builds); revisit if remediation cadence becomes a problem.

#### TODO-050 — Vitest 5 upgrade (deferred, breaking)
**Status:** Not Started · **Est. time:** 3h · **Depends on:** TODO-049
**Spec reference:** `Testing-Infrastructure.md`, `09-Coding-Standards.md` §13

**Success conditions:**
- `vitest` and `@vitest/coverage-v8` upgraded to the v5 line, clearing the `@vitest/mocker` path-traversal advisory (GHSA-82fw-gwwq-j7x9)
- All projects (unit/component/integration) pass under the new runner; config migrations (if any) applied and documented in `Testing-Infrastructure.md`

**Tests:** This task is the migration; the full suite is the verification.
**Notes / Results:** Deferred from TODO-049 — the fix requires a breaking major upgrade of the test runner, which should not ride along with a security-remediation pass. Dev-only exposure.

---

*Estimates throughout assume one focused, solo contributor and are planning aids, not commitments. When V1.1 work begins (per `11-Project-Roadmap.md`), seed its items here following §4–§5 above.*
