# BushArt — Project Documentation

> **Digital Sketchbook & Gallery**
> Version: `0.1` · Status: Pre-Development · Last Updated: 2026-07-18

Welcome to the single source of truth for **BushArt** — a minimalist, dark-themed digital art portfolio and content management system. This folder is the complete engineering and product foundation for the project, written before a single line of application code exists.

---

## 1. What is BushArt?

BushArt is a self-hosted, artist-owned alternative to scattering finished work across social media. It is simultaneously:

1. **A public gallery** — a fast, filterable, artwork-first browsing experience for visitors.
2. **A private studio** — a login-gated administrative surface, built into the same page, that lets the artist upload and manage every piece without ever touching the database or file system directly.

The full product vision lives in `01-Product-Definition.md`. The full technical vision lives in `02-Technical-Specification.md`.

---

## 2. Purpose of This Documentation

Software decays fastest not from bad code, but from decisions nobody wrote down. This package exists so that:

- Any future contributor (including a future version of the artist, six months removed from this decision) can understand **why** the system is shaped the way it is, not just **what** it does.
- Every design, schema, and architectural choice has a documented rationale, so it can be revisited deliberately instead of being silently violated.
- The project can grow for years — new gallery layouts, a blog, collections, richer search — without requiring a rewrite, because the foundational documents were built to absorb that growth.

This is a **living package**. It ships at `v0.1` alongside zero application code, and it is expected to evolve alongside the codebase — see [§6](#6-how-to-maintain-this-documentation).

---

## 3. Folder Structure

```text
project-docs/
│
├── README.md                     ← You are here
├── PROJECT-CONSTITUTION.md       ← Non-negotiable governing principles
├── 01-Product-Definition.md      ← What we are building, and for whom
├── 02-Technical-Specification.md ← How it will be built
├── 03-System-Architecture.md     ← How the pieces fit and talk to each other
├── 04-Database-Schema.md         ← Every collection, field, and index
├── 05-API-Specification.md       ← Every route, contract, and error shape
├── 06-UI-Design-System.md        ← Visual language, tokens, components
├── 07-User-Flows.md              ← Step-by-step journeys, visitor and admin
├── 08-Project-Structure.md       ← Repository layout and file conventions
├── 09-Coding-Standards.md        ← How code is written and reviewed
├── 10-Deployment-Guide.md        ← Local setup through to production
├── 11-Project-Roadmap.md         ← MVP through long-term milestones
├── 12-Decision-Log.md            ← Architecture Decision Records (ADRs)
├── CHANGELOG.md                  ← Version history of this documentation
├── AGENT.md                      ← Operational entry point for contributors
├── TODO.md                       ← Active build queue (non-authoritative staging)
└── Testing-Infrastructure.md     ← Testing layers, CI, coverage policy
```

---

## 4. Reading Order

You do not need to read this package front-to-back to use it, but if you are onboarding to the project for the first time, read in this order:

| Order | Document | Why |
|---|---|---|
| 1 | `PROJECT-CONSTITUTION.md` | Establishes the principles everything else must obey. |
| 2 | `01-Product-Definition.md` | Explains what is being built and why, with no implementation detail. |
| 3 | `02-Technical-Specification.md` | Introduces the stack and the technical shape of the answer. |
| 4 | `03-System-Architecture.md` | Shows how the stack's pieces connect, with diagrams. |
| 5 | `04-Database-Schema.md` + `05-API-Specification.md` | The concrete data contracts everything else is built on. |
| 6 | `06-UI-Design-System.md` + `07-User-Flows.md` | The experience layer, grounded in the data contracts above. |
| 7 | `08-Project-Structure.md` + `09-Coding-Standards.md` | How to actually write the code, day to day. |
| 8 | `10-Deployment-Guide.md` | How the code reaches production. |
| 9 | `11-Project-Roadmap.md` | Where the project is headed, and in what order. |
| 10 | `12-Decision-Log.md` | The "why" behind every major fork in the road — read on demand. |

`CHANGELOG.md` is reference material, not reading-order material — consult it to see what changed between documentation versions.

---

## 5. Sources of Truth — Documentation Hierarchy

Every document in this package is internally consistent with the others as of `v0.1`. If a future edit ever creates a contradiction, **the document higher in this list wins**:

1. `PROJECT-CONSTITUTION.md`
2. `01-Product-Definition.md`
3. `02-Technical-Specification.md`
4. `03-System-Architecture.md`
5. `04-Database-Schema.md`
6. `05-API-Specification.md`
7. `06-UI-Design-System.md`
8. `09-Coding-Standards.md`
9. All remaining documents (`07`, `08`, `10`, `11`, `12`, `CHANGELOG.md`)

In practice this means: if `05-API-Specification.md` describes a field that `04-Database-Schema.md` doesn't have, the schema document is correct and the API document has a bug that needs fixing — not the other way around. The Constitution outranks everything, including this README.

---

## 6. How to Maintain This Documentation

Documentation that isn't maintained is worse than no documentation — it actively misleads. BushArt's docs are maintained under these rules:

1. **Docs change in the same pull request as the code that motivates them.** A schema change and its corresponding edit to `04-Database-Schema.md` are one commit, not a follow-up task.
2. **Every non-trivial architectural decision gets an ADR.** Add it to `12-Decision-Log.md` before merging the code that implements it, not after. If you're debating between two approaches, the debate belongs in the ADR's "Alternatives Considered" section.
3. **Bump the version and log it.** Any change to this package gets an entry in `CHANGELOG.md` using the format already established there. Documentation versions do not need to match application release versions — they track independently.
4. **No silent contradictions.** If you must temporarily violate the Constitution or another higher-ranked document (e.g., a scoped-down MVP shortcut), say so explicitly in the relevant document and note it in the Decision Log, rather than letting the documents quietly drift apart.
5. **Diagrams are Mermaid, not images.** Every diagram in this package is written in Mermaid syntax directly in the Markdown so it stays version-controllable and diffable. Keep it that way.
6. **When in doubt, favor the reader six months from now.** They have less context than you do right now. Write for them.

---

## 7. Conventions Used Throughout This Package

- **MUST / SHOULD / MAY** are used in the RFC 2119 sense: `MUST` is non-negotiable, `SHOULD` is a strong default that needs a documented reason to deviate from, `MAY` is a genuine option.
- Collection names are `snake_case` and plural (`artworks`, `tags`, `site_settings`).
- API routes are `kebab-case` and RESTful; see `05-API-Specification.md`.
- Every Mermaid diagram is treated as documentation, not decoration — if it goes stale, it is a bug.

---

## 8. Quick Links

- Building a feature? Start with `08-Project-Structure.md` and `09-Coding-Standards.md`.
- Touching the database? `04-Database-Schema.md` is authoritative.
- Touching an endpoint? `05-API-Specification.md` is authoritative.
- Touching a screen? `06-UI-Design-System.md` + `07-User-Flows.md`.
- Shipping to production? `10-Deployment-Guide.md`.
- Wondering *why* something was built a certain way? `12-Decision-Log.md`.
