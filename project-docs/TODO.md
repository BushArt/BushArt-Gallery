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

## 7. Audit Close-Out

**Position note:** This rule is deliberately placed last among the numbered/lettered rules, immediately before the `## Unnumbered Phase Audit Task` section it governs. It is a hybrid rule/task: as a rule it is permanent and never erased; as a task trigger it is what fills and empties the `Notes / Results` log inside the audit section below.

1. **Firing the audit** — Firing the audit (per the Trigger Rule in the task below) populates the `Notes / Results` log in the `## Unnumbered Phase Audit Task` section with findings, and sets its status line.
2. **Close-out sequence** — A close-out sequence, once explicitly permitted by the user for this audit instance, erases only the contents of `Notes / Results` and resets the audit's status line to `Pending Audit`. The `## Unnumbered Phase Audit Task` heading, its Purpose, Trigger Rule, Checklist, and Status Definitions are never removed — they are the reusable shell for the next phase's audit.
3. **CHANGELOG entry** — Close-out writes one line to `CHANGELOG.md`: `[Phase [X] audit remediation] — <description>` where `<description>` contains only the important details of what was found and fixed (not a full dump of the `Notes / Results` log — that log is being deleted, so anything worth keeping must be summarized into this line).
4. **Permission requirement** — This rule does not override §2. No `Notes / Results` content, status change, or `CHANGELOG` line is written on an agent's own judgment. Permission means the user directly saying to close out this audit instance — never inferred from silence, from the phase moving on, or from the audit reaching `Pass`. A `Pass` audit's `Notes / Results` are not erased, and no `CHANGELOG` line is written, without this explicit permission — same as a `Blocked` audit that was later resolved and re-run to `Pass`.

## Unnumbered Phase Audit Task

### Purpose

Purpose: Before any code for a new phase begins, run this unnumbered audit to root out integration gaps, missing specs, and dependency issues that would otherwise surface mid-build. It is not a numbered TODO item — it sits before the phase's first item, with its own status, and must pass before the phase's first item can move to In Progress.

### Trigger Rule

Trigger Rule: The audit runs immediately before the first TODO item of a new phase is picked up. It is triggered by the transition from "the previous phase is done" to "work on the next phase is about to start." The audit itself is the first action of the new phase — no code is written until it completes.

### Checklist

Working through everything touching the last completed phase, verify:

- **Bug sweep** — review all code changed or added during the last phase for defects, not just the specific behavior it was written to satisfy.
- **Regression check** — confirm existing functionality and tests that passed before the last phase still pass after it.
- **Incomplete work** — search for stubs, placeholder logic, unresolved TODOs, or partially wired features left behind from the last phase.
- **Inconsistencies** — cross-check naming, data shapes, and behavior for agreement across files/modules the last phase touched.
- **Convention deviations** — compare the last phase's output against established project conventions (style, structure, patterns) and flag departures.
- **Integration gaps** — verify the interfaces, dependencies, and assumptions the last phase produced actually satisfy what the upcoming phase's first items need.

Each item that surfaces a finding is logged in Notes / Results as it's found, not batched at the end.

### Status Definitions

| Status | Meaning |
|---|---|
| `Pending Audit` | Default/reset state. The audit for this phase transition has not yet started. |
| `In Progress` | The checklist above is actively being worked; findings are being logged to `Notes / Results` as they surface. |
| `Blocked` | One or more checklist items surfaced unresolved issues. The phase gate stays shut — the phase's first TODO item cannot move to `In Progress` while this status holds. |
| `Pass` | The checklist has been worked through and any findings resolved, and the user has told the agent to stop the audit and accept this result. The phase gate lifts. |

**Transitions:** `Pending Audit` → `In Progress` → `Blocked` (if findings block) → `In Progress` (on rework) → `Pass`, or directly `In Progress` → `Pass` if nothing blocking surfaces. Only the user decides when the audit stops and what the final status is — the agent runs the checklist and logs findings, but does not unilaterally declare `Pass`. This mirrors the permission requirement in the Close-Out rule above: logging a finding is not the same act as resolving or closing it.

### Outcome Recording Format

A single status line sits at the top of `Notes / Results`, updated in place as the audit progresses:

> `Status: <Pending Audit | In Progress | Blocked | Pass>`

Below it, each finding is logged as it surfaces:

- [Checklist item] <what was found> — <resolution or "unresolved">
### Notes / Results

Status: Pending Audit

### [Done] Phase 1 — Data Layer

### [Done] Phase 2 — Authentication

### [Done] Phase 3 — Media Pipeline

### [Done] Phase 4 — Core API

### [Done] Phase 5 — Public Gallery UI

### [Done] Phase 6 — Artwork Detail & Sharing

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
- [ ] `NEXT_PUBLIC_SITE_URL` must be set to the production Render URL in the Render dashboard environment variables before deployment (also affects share links and Open Graph metadata).

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
