# 11 — Project Roadmap

> **Precedence: 9th (part of "remaining documents").** This document sequences the functional requirements in `01-Product-Definition.md` and the future-facing hooks in `04-Database-Schema.md` §7 into concrete milestones. Every milestone is evaluated against `PROJECT-CONSTITUTION.md` before being scheduled.

---

## How to Read This Roadmap

Each milestone lists what ships, what it depends on, and which existing document(s) already specify it in detail — this roadmap sequences work, it does not re-specify it. Nothing below should describe a feature that isn't already accounted for somewhere in `01`–`09`; if it does, that's a gap to fix before implementation starts, not a detail to improvise during it.

---

## MVP — Version 1.0

**Goal:** every functional requirement in `01-Product-Definition.md` §6 is live, with no manual data-management fallback required for normal operation.

| Feature | Spec Reference |
|---|---|
| Public gallery — grid and detailed-list views | `06-UI-Design-System.md` §8, `07-User-Flows.md` Flow 1 |
| Artwork popup + fullscreen viewer | `06-UI-Design-System.md` §11, `07-User-Flows.md` Flow 2 |
| Filtering (tags, year, medium, commission/personal) | `03-System-Architecture.md` §7, `05-API-Specification.md` §4.1 |
| NSFW toggle, SFW default | `07-User-Flows.md` Flow 5 |
| Infinite scroll, lazy loading | `03-System-Architecture.md` §6, §9 |
| Download / Share | `07-User-Flows.md` Flows 3–4 |
| Shareable per-artwork URLs | `03-System-Architecture.md` §6 |
| Hidden admin login | `07-User-Flows.md` Flow 6 |
| Upload flow (multi-image + optional timelapse, full metadata, tags) | `07-User-Flows.md` Flow 7 |
| Automatic thumbnailing / media optimization | `03-System-Architecture.md` §5 |
| Edit artwork | `07-User-Flows.md` Flow 8 |
| Tag management (create/select/remove, cascading delete) | `07-User-Flows.md` Flow 9 |
| Homepage/hero editing | `07-User-Flows.md` Flow 10 |
| Featured artwork management | `07-User-Flows.md` Flow 11 |

**Dependencies:** MongoDB Atlas + Cloudinary provisioned (`10-Deployment-Guide.md` §2–3) before any application feature work can be meaningfully tested end-to-end.

**Definition of done:** the success metrics in `01-Product-Definition.md` §11 are met — specifically, a full upload completes in under two minutes and zero manual file/database intervention is needed for any MVP-scope task.

---

## Version 1.1 — Polish & Operational Hardening

Focused on refinement rather than new user-facing surface area, informed by whatever friction shows up in real MVP usage.

| Feature | Notes |
|---|---|
| Performance pass against `02-Technical-Specification.md` §13 budgets | Audit real Core Web Vitals under production traffic, not just synthetic testing. |
| Drag-to-reorder featured artwork | Replaces manually entering `featuredOrder` integers (`04-Database-Schema.md` §3) with a direct-manipulation admin UI — no schema change required. |
| Bulk tag operations (rename, merge near-duplicates) | Addressable without a schema change; purely an admin-UI + API-layer addition. |
| Upload flow refinements | Progress indicators for large timelapse uploads, clearer in-flow guidance on the Cloudinary bandwidth budget (`02-Technical-Specification.md` §11). |
| EXIF/metadata stripping on upload | A privacy-hardening addition to the Cloudinary upload pipeline (`03-System-Architecture.md` §5). |
| Admin activity visibility | Surfacing `createdAt`/`updatedAt`/`lastLoginAt` (already in the schema) in the admin UI, rather than only existing as raw fields. |
| Preview/staging deployment environment | Extends `10-Deployment-Guide.md` §6 beyond the single-environment MVP setup. |
| Hosted error tracking | `10-Deployment-Guide.md` §7 flags this as a reasonable, not-yet-required addition. |

**Dependencies:** MVP live with real usage data to prioritize against.

---

## Version 1.2 — Discovery & Reach

Focused on helping visitors (and the growing archive itself) stay navigable as the collection scales past what filter chips alone comfortably handle.

| Feature | Notes |
|---|---|
| Collections / Series | New `collections` collection (`04-Database-Schema.md` §7) — additive, references existing `artworks._id`, no change to the `artworks` schema. |
| Enhanced search | Evaluate MongoDB Atlas Search (available on shared tiers, subject to the resource constraints noted for M0) against a simpler regex/text-index interim approach; either way, ships as an additional query parameter on the existing `GET /api/artworks` (`03-System-Architecture.md` §8), not a new endpoint. |
| Automatic color palette extraction | Populates the already-reserved `artworks.colorPalette` field (`04-Database-Schema.md` §3) at upload time via a Cloudinary add-on or a small analysis step — schema requires no change, only backfilling `null` → populated for new uploads (and optionally a one-time backfill script for existing artwork). |
| Rich social sharing previews | Open Graph image generation at the `/artwork/[slug]` route (`03-System-Architecture.md` §6), building on the fact that every artwork already has a real, server-renderable route. |

**Dependencies:** `colorPalette` field already exists from MVP launch (`04-Database-Schema.md`), so this milestone is unblocked by schema work — it's purely additive implementation.

---

## Version 2.0 — Platform Growth

| Feature | Notes |
|---|---|
| Blog posts | New `blog_posts` collection (`04-Database-Schema.md` §7) and a new `blog/` feature domain (`08-Project-Structure.md` §4) — organized as a sibling to `gallery/`/`artwork/`, not entangled with either. |
| Additional gallery layouts | E.g., a filmstrip/timeline view — implemented as a new rendering mode consuming the same `GET /api/artworks` feed, no API change required. |
| Multi-admin support | The `admins` collection (`04-Database-Schema.md` §5) already supports multiple documents; this milestone is primarily UI (an invite/second-account flow) plus revisiting the currently-flat authorization model (`02-Technical-Specification.md` §5) if role differentiation becomes necessary. |
| Formal hosting cost review | If traffic has grown meaningfully beyond a single artist's portfolio-scale baseline, revisit `02-Technical-Specification.md` §11's cost picture against alternatives rather than assuming Render indefinitely (`03-System-Architecture.md` §11). |

**Dependencies:** none of these block each other; they can be sequenced independently based on what the artist's actual practice needs first.

---

## Future Ideas (Unscheduled)

Captured so they're evaluated deliberately if they ever become relevant, rather than forgotten or implemented ad hoc:

- A secondary, redundant media backup beyond Cloudinary itself, if the archive's irreplaceability grows to warrant the added complexity (`10-Deployment-Guide.md` §9).
- Native masonry layout (`grid-template-rows: masonry`) once cross-browser support is reliable enough to replace the JS-computed approach in `06-UI-Design-System.md` §4.
- Refresh-token session management, if the 7-day fixed session (`02-Technical-Specification.md` §4) proves inconvenient in practice.

Every item in this roadmap remains subject to `PROJECT-CONSTITUTION.md` §Future Growth: a feature that can't be reconciled with the Constitution is redesigned or deferred before it's scheduled into a version, not after it's half-built.
