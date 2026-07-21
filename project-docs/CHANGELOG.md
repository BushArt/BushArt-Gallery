# Changelog

All notable changes to the **BushArt documentation package** are recorded here. This changelog tracks the documentation itself (`project-docs/`) — it is versioned independently from the BushArt application's own release version (see `11-Project-Roadmap.md` for application milestones: MVP/1.0, 1.1, 1.2, 2.0).

Format: loosely follows [Keep a Changelog](https://keepachangelog.com/) conventions, adapted for a documentation-only artifact.

---

## [Unreleased]

### Added
- **TODO-001** — Scaffolded the repository: Next.js 16 App Router project with TypeScript strict mode, ESLint v9 flat config (`eslint.config.mjs`), and Tailwind v4 (PostCSS-based via `@tailwindcss/postcss`). Implemented the full empty directory skeleton per `08-Project-Structure.md` with App Router routes, library structure, and configuration files. `npm run build` succeeds on the scaffold.

### Documentation Updates
- `08-Project-Structure.md` §6 — Updated to reflect Tailwind v4 uses PostCSS-based configuration (`postcss.config.mjs`) instead of `tailwind.config.ts`, and ESLint v9 flat config (`eslint.config.mjs`) instead of `.eslintrc.json`.

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
