# BushArt — Project Constitution

> **Precedence: Highest.** If any other document in this package conflicts with this one, this document wins. Every design and engineering decision — past, present, and future — is evaluated against this Constitution.

---

## Vision

Most working artists end up with their body of work scattered across four or five platforms they don't control, each optimized for engagement metrics rather than presentation, each capable of disappearing, changing its algorithm, or burying older work without warning.

BushArt exists to be the opposite of that: a single, permanent, artist-owned home for completed work — one that looks and feels like a considered gallery rather than a feed, that costs nothing to run at the artist's current scale, and that never requires touching a database console or a file system to use.

BushArt is not a social platform, not a client-management tool, and not a marketplace. It is a **sketchbook and a gallery** — a place where finished work is archived beautifully and shown clearly, and nothing else competes for the visitor's attention.

---

## Core Philosophy

These principles are non-negotiable defaults. A feature that violates one of them needs a documented exception in `12-Decision-Log.md`, not a silent workaround.

1. **Artwork is always the primary focus.** Nothing on the page competes visually with the art — not navigation chrome, not admin controls, not related-content modules, not advertising (there is none).
2. **Simplicity over unnecessary complexity.** The smallest system that satisfies a real requirement is the correct system. Complexity must be earned by a requirement in `01-Product-Definition.md`, not anticipated speculatively.
3. **Every administrative action is possible through the website.** If doing something requires opening MongoDB Compass, editing a JSON file, or SSHing into a server, the feature is incomplete — regardless of how it's implemented under the hood.
4. **No manual database editing.** The admin UI is the only supported interface to the data. Direct writes are a break-glass emergency procedure, not a workflow.
5. **No manual file management.** Media is uploaded through the browser and organized automatically. There is no folder the artist is ever expected to open.
6. **Free-tier infrastructure only, by default.** The system is designed to run within the free tiers of its chosen providers at the artist's current scale. Where a provider's free tier has materially changed or has real limitations, that reality is documented honestly (see `02-Technical-Specification.md` §Cost Reality and `12-Decision-Log.md` ADR-009) rather than assumed away. Paid upgrades are an explicit, deliberate choice the artist makes as the project grows — never a silent requirement.
7. **Long-term maintainability over short-term convenience.** A shortcut that saves a day of work now and costs a week of confusion in a year is not a shortcut.
8. **Mobile-first responsive experience.** The majority of gallery visitors will arrive on a phone. Every layout is designed for a narrow viewport first and enhanced outward, not the reverse.
9. **Performance is a feature.** A beautiful gallery that loads slowly is a broken gallery. Load time, layout stability, and smooth scrolling are treated with the same seriousness as functional correctness.
10. **Accessibility is mandatory, not aspirational.** Keyboard navigation, screen-reader support, color contrast, and motion sensitivity are requirements, not polish items scheduled for "later."
11. **Progressive enhancement where practical.** Core browsing (viewing artwork, reading descriptions) must not hard-depend on JavaScript executing perfectly on every device; interactivity layers on top of a working baseline wherever the underlying framework makes that practical.

---

## Engineering Principles

1. **Strong typing everywhere.** TypeScript strict mode, end to end — from the database access layer through the API contracts to the React components. `any` is treated as a defect.
2. **Reusable components over one-off markup.** If a UI pattern appears twice, it becomes a shared component before it appears a third time.
3. **Clean architecture, clear separation of concerns.** Data access, business logic, and presentation are separable layers. A component does not reach into the database, and a database model does not know about React.
4. **Modular design.** Features are organized so that a new one (e.g., blog posts in `11-Project-Roadmap.md` Version 2) can be added as a new module without restructuring existing ones.
5. **Self-documenting code, backed by documentation — not instead of it.** Clear naming and small functions reduce the need for comments; this package covers the "why" that code can't express on its own.
6. **Backward-compatible APIs whenever possible.** Additive changes are preferred over breaking ones; see `05-API-Specification.md` §Versioning Policy.

---

## Product Principles

1. **One continuously scrolling page.** The gallery is not paginated into separate routes. See `03-System-Architecture.md` for how individual artworks still get shareable, addressable URLs without breaking this principle.
2. **Fast browsing, minimal clicks.** Getting from "landing on the homepage" to "looking at a specific piece" is two actions: scroll, click.
3. **Frictionless uploads.** Publishing a finished piece is a single guided flow the artist can complete in under a minute for a simple upload.
4. **Artwork-first interface.** UI chrome (badges, buttons, filters) is deliberately quiet — see `06-UI-Design-System.md` for how restraint is enforced visually.
5. **Elegant, purposeful animation.** Motion communicates state changes and reinforces the sketchbook metaphor; it is never decoration for its own sake, and it always respects `prefers-reduced-motion`.
6. **Professional presentation.** The gallery should read as a considered creative portfolio, not a template.

---

## Future Growth

BushArt's architecture is deliberately over-provisioned in exactly one dimension: **extensibility**, without being over-provisioned in infrastructure or complexity. Concretely:

- The database schema (`04-Database-Schema.md`) reserves fields and collections for known future features (color palette extraction, collections/series, blog posts) so that adding them later is additive, not migratory.
- The API (`05-API-Specification.md`) is versioned from day one, even though only `v1` exists at launch.
- The admin model supports more than one administrator from day one, even though the MVP UI assumes exactly one.
- The component structure (`08-Project-Structure.md`) organizes by feature domain, so a new domain (e.g., `blog/`) slots in beside `gallery/` and `artwork/` without touching either.

Every future feature listed in `11-Project-Roadmap.md` must be evaluated against this Constitution before it is built. If a proposed feature cannot be reconciled with a principle above, the Constitution does not bend — the feature is redesigned, deferred, or, in rare and explicit cases, the Constitution itself is amended through a dated entry in `12-Decision-Log.md` explaining exactly what changed and why.

---

*This Constitution was ratified as part of Documentation Package v0.1 on 2026-07-18. Amendments must be logged in `12-Decision-Log.md` and reflected here with an updated revision note in `CHANGELOG.md`.*
