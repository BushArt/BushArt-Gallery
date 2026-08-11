# Changelog

All notable changes to the **BushArt documentation package** are recorded here. This changelog tracks the documentation itself (`project-docs/`) — it is versioned independently from the BushArt application's own release version (see `11-Project-Roadmap.md` for application milestones: MVP/1.0, 1.1, 1.2, 2.0).

Format: loosely follows [Keep a Changelog](https://keepachangelog.com/) conventions, adapted for a documentation-only artifact.

---

## [Unreleased]

### Added
- **TODO-009** — Auth API routes + server-side guard + proxy.ts
- **TODO-010** — Cloudinary v2 client configuration (`lib/cloudinary/client.ts`) with deferred env-var validation, scoped upload-signature helper (`lib/cloudinary/signature.ts`) enforcing the `bushart/` folder namespace, and `POST /api/upload/signature` Route Handler returning time-boxed HMAC signatures. Admin session enforced via `requireAdmin`; `CLOUDINARY_API_SECRET` never leaves the server. 12 integration tests + 10 unit tests; 180 passing total.

### Documentation Updates
- `02-Technical-Specification.md` §6 — no change; implementation matched the documented media pipeline and direct-upload contract.
- `03-System-Architecture.md` §4 — no change; signed-upload flow implementation matches the documented direct-to-Cloudinary architecture.
- `05-API-Specification.md` §6 — no change; request/response shape, error envelope, and auth requirement match the documented contract exactly.
- `09-Coding-Standards.md` §13 — no change; test coverage for the Cloudinary module and upload signature route satisfies the documented risk-weighted philosophy.
- `05-API-Specification.md` §5 — no change; implementation matches the documented auth endpoint contracts exactly.
- `02-Technical-Specification.md` §4 — no change; guard.ts and proxy.ts implement the documented CVE-2025-29927 defense-in-depth requirement.
- `08-Project-Structure.md` §2 — no change; `lib/auth/` and `src/types/` layout matches documented conventions.
- `09-Coding-Standards.md` §1, §4, §13 — no change; type consolidation, model-boundary rule, and test coverage all satisfy the documented standards.

- **TODO-008** — Admin seed script + brute-force lockout state machine (5 consecutive failures → 15-minute lock), 20 unit tests, and CI workflow. Seed script verified idempotent. Lockout constants match `02-Technical-Specification.md` §4 exactly (`MAX_FAILED_ATTEMPTS = 5`, `LOCK_DURATION_MS = 900000`). `package.json` lint script fixed for Next.js 16 compatibility.

- **TODO-001** — Scaffolded the repository: Next.js 16 App Router project with TypeScript strict mode, ESLint v9 flat config (`eslint.config.mjs`), and Tailwind v4 (PostCSS-based via `@tailwindcss/postcss`). Implemented the full empty directory skeleton per `08-Project-Structure.md` with App Router routes, library structure, and configuration files. `npm run build` succeeds on the scaffold.

- **TODO-007** — Core auth utilities: custom HS256 JWT session token module (`lib/auth/jwt.ts`) with 7-day expiry, bcrypt cost-12 password hashing (`lib/auth/password.ts`), consolidated auth logic in `lib/auth/` per `08-Project-Structure.md`, type consolidation through `src/types/admin.ts` per `09-Coding-Standards.md` §1, and 54 passing tests covering sign/verify round-trips, expiry, signature tamper rejection, malformed token handling, password hashing, and the auth-data boundary (`getAdminByUsername` returning `AdminInternal` with `passwordHash`).

- **TODO-002** — Provisioned MongoDB Atlas M0 cluster and Cloudinary account; local environment wired and connectivity verified with `scripts/verify-env.mjs`.

- **TODO-003** — Wired design tokens and self-hosted fonts via Tailwind v4 `@theme` and `next/font`.

- **TODO-004** — MongoDB connection helper with hot-reload-safe client caching, idempotent index setup script, and vitest-based integration test covering all schema-defined indexes.

- **TODO-005** — Data-access layer for all four collections: typed model functions for artworks, tags, admins, and settings with server-side ObjectId conversion, NSFW-safe defaults, cursor pagination, and 34 mocked-driver unit tests.

- **TODO-006** — Added Zod validation schemas for artwork, tag, and settings with strict field-level enforcement; introduced internal DB-layer schemas (`ArtworkCreateInternalSchema`/`ArtworkUpdateInternalSchema`) so `createArtwork`/`updateArtwork` and `createTag` validate before write; added auth request/response schemas for Phase 2; tightened `Admin.createdAt` to non-null `Date` to match `04-Database-Schema.md §5`.

### Fixed
- [Phase 0 audit remediation] — Post-close-out audit fixes applied to the scaffold: typed `getDb()` in `src/lib/db/mongodb.ts`; implemented `scripts/seed-admin.ts` with bcrypt cost 12 and idempotency; added `npm run seed:admin`; removed duplicate legacy CSS var aliases from `src/app/globals.css`; replaced bare `proxy.ts` re-export with a documented placeholder referencing CVE-2025-29927; strengthened `tests/db-setup.test.ts` with idempotency, index option assertions, and deterministic `site_settings` coverage.

- [Phase 1 audit remediation] — Fixed missing tag usageCount increment in `createArtwork`; added 34 mocked-driver unit tests covering tag reconciliation, featured artworks, settings zero-state, and tagSlugs resolution; updated CHANGELOG test count from 31 to 34

- [Phase 2 audit remediation] — Added concurrent login TOCTOU race condition test (`tests/api/auth/login-race.test.ts`); verified 12 placeholder stub files are expected for Phase 3–5 and do not affect Phase 2 functionality.

### Documentation Updates
- `02-Technical-Specification.md` §4 — no change; `lockout.ts` implements the documented 5-consecutive-failure/15-minute-lock contract.
- `04-Database-Schema.md` §5 — no change; admins schema already defined `failedLoginAttempts`, `lockUntil`, and `lastLoginAt` fields; implementation matches exactly.
- `09-Coding-Standards.md` §13 — no change; 20 lockout state-machine tests written per the documented risk-weighted philosophy.
- `02-Technical-Specification.md` §4 — no change; `jwt.ts`/`password.ts` implement the documented HS256, bcrypt 12, 7-day expiry, and no-plaintext-logging contracts.
- `04-Database-Schema.md` §5 — no change; `AdminInternal` shape including `createdAt` matches the documented `admins` collection schema.
- `08-Project-Structure.md` §2 — no change; `lib/auth/` and `src/types/` layout matches the documented conventions.
- `09-Coding-Standards.md` §1 — no change; `Admin`/`AdminInternal` types consolidated into `src/types/admin.ts` as the single source of truth.
- `05-API-Specification.md` §3 — corrected nextCursor encoding description from `{ createdAt, _id }` to `{ sortValue, _id }` to match implementation.
- `06-UI-Design-System.md` §2–5 — no change; `@theme`-only token strategy matches the documented design intent.
- `08-Project-Structure.md` §2 — no change; `scripts/seed-admin.ts` was already listed and is now implemented.
- `09-Coding-Standards.md` §4 — no change; model-boundary rule satisfied as specified.
- `10-Deployment-Guide.md` §2–3 — no change; implementation matched the documented contract.

---

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
