# 12 — Decision Log

> **Precedence: 9th (part of "remaining documents"), but treat with care.** This document records *why* the choices baked into `02` through `09` were made. It does not override any higher-ranked document — it explains them. If a decision recorded here is ever reversed, the reversal gets a new, dated ADR; existing entries are never edited or deleted, only superseded.

---

## ADR-001 — Adopt Next.js App Router as the Unified Full-Stack Framework

**Date:** 2026-07-18
**Decision:** Build BushArt as a single Next.js 16 (App Router) application serving both the UI and the API, rather than a separate frontend SPA and backend service.

**Context:** The project brief specifies Next.js, React, and TypeScript for the frontend and "Next.js API Routes (or Route Handlers)" for the backend — effectively already pointing at a unified codebase. A single-operator project also has limited capacity to maintain two deployables, two sets of tooling, and a cross-origin API contract.

**Alternatives Considered:**
- A separate SPA (e.g., Vite + React) with an independent API (e.g., Express/Fastify). Rejected: doubles deployment surface area and operational complexity for no benefit this project needs — there's no requirement for the API to serve any consumer other than this one frontend.
- A fully static site generator with a headless CMS. Rejected: conflicts directly with the Constitution's "no manual file management" and "every administrative action through the website" principles — most headless CMS options either cost money at this project's needed feature set or reintroduce a separate admin surface outside the artist's own site.

**Trade-offs:** Coupling frontend and backend into one deployable means they always ship together, which is a non-issue here (single consumer) but would be a real constraint if BushArt ever needed to serve a separate client (e.g., a native mobile app) — not a current requirement.

**Long-term Impact:** Every other architectural document in this package assumes this choice — Route Handlers (`05-API-Specification.md`), the Cache Components caching model (`02-Technical-Specification.md` §8), and the intercepting-route sharing pattern (ADR-005) are all Next.js-App-Router-specific mechanisms this decision unlocks.

---

## ADR-002 — MongoDB Atlas (M0) as the Primary Datastore

**Date:** 2026-07-18
**Decision:** Use MongoDB Atlas's free M0 cluster for all structured metadata; store no media bytes in the database.

**Context:** The brief specifies MongoDB Atlas by name. Artwork records are naturally document-shaped (variable-length image arrays, optional subdocuments like `timelapse`), which fits MongoDB's model more directly than a relational schema would.

**Alternatives Considered:**
- A relational database (e.g., Postgres on a free tier elsewhere) with join tables for tags. Rejected: adds schema migration overhead for a document-shaped problem, without a corresponding benefit — BushArt has no requirement for multi-table transactional consistency that would favor SQL.
- Storing media as MongoDB GridFS. Rejected outright: conflicts with the entire media-optimization requirement (`01-Product-Definition.md` §6) — Cloudinary (ADR-003) is a far better fit, and mixing media bytes into the metadata store would also blow past the 512MB M0 ceiling quickly.

**Trade-offs:** M0 has no automated backups (`02-Technical-Specification.md` §11), requiring the manual export process in `10-Deployment-Guide.md` §8. Accepted as a reasonable trade for genuinely-free, indefinite hosting of a small metadata footprint.

**Long-term Impact:** Because only metadata lives here, the 512MB ceiling is expected to remain a non-issue for years of continued uploads (`04-Database-Schema.md` §8) — this decision is not expected to need revisiting on its own; it would only be revisited alongside a broader multi-region or multi-tenant requirement that doesn't currently exist.

---

## ADR-003 — Cloudinary for Media Storage, Transformation, and Delivery

**Date:** 2026-07-18
**Decision:** Store all original media in Cloudinary; derive every displayed size via on-the-fly transformation URLs rather than pre-generating and storing separate thumbnail files.

**Context:** The brief specifies Cloudinary by name and requires automatic thumbnailing, compression, and modern-format delivery (`01-Product-Definition.md` §6, §Media Optimization).

**Alternatives Considered:**
- Raw object storage (e.g., a free-tier S3-compatible bucket) plus a self-written image-processing step (e.g., `sharp` running at upload time). Rejected: reintroduces exactly the manual-pipeline complexity Cloudinary exists to remove, for a single-operator project with no capacity to maintain image-processing infrastructure — directly against the Constitution's "simplicity over unnecessary complexity."
- Vercel's built-in image optimization (if hosted on Vercel instead of the then-chosen platform). Not applicable given the hosting choice in ADR-009 (now superseded by ADR-013), and would still require separate object storage for originals regardless.

**Trade-offs:** Cloudinary's free tier is credit-pooled across storage, bandwidth, and transformations (25 credits/month total, `02-Technical-Specification.md` §11) — video in particular can consume this quickly, which is why the upload flow surfaces a soft guideline on timelapse length/size rather than treating the free tier as unlimited.

**Long-term Impact:** Because thumbnails are URLs, not files, adding a new gallery layout or display size later (`11-Project-Roadmap.md` V2) never requires reprocessing existing uploads — see ADR-008 for this specific sub-decision in more depth.

---

## ADR-004 — Custom Lightweight JWT Authentication Instead of Auth.js/NextAuth

**Date:** 2026-07-18
**Decision:** Implement a small, purpose-built JWT-in-httpOnly-cookie session system rather than adopting Auth.js (formerly NextAuth) or a third-party identity provider.

**Context:** The brief explicitly allowed either "NextAuth/Auth.js or a lightweight custom session system." BushArt has exactly one login type: a single administrator's username and password — no OAuth providers, no visitor accounts, no multi-tenant roles.

**Alternatives Considered:**
- **Auth.js v5.** Its core value is unifying many OAuth/OIDC providers behind one API — a real strength this project doesn't use. For credentials-only login, Auth.js still requires the developer to write their own password hashing and verification logic (it deliberately doesn't provide this, for good security reasons), which means most of its "batteries included" value doesn't apply here, while its dependency footprint and configuration surface still would.
- **A third-party hosted identity provider** (e.g., Clerk, WorkOS). Rejected: introduces an external dependency and, for several such providers, a per-user pricing model that is entirely unnecessary for a single fixed administrator account — directly against the Constitution's cost and simplicity principles.

**Trade-offs:** Building auth by hand means BushArt owns its own security surface rather than delegating it to a maintained library. This is mitigated by keeping the implementation deliberately small and well-tested (`09-Coding-Standards.md` §13 calls out `lib/auth/` as requiring test coverage before a touching feature ships) and by the explicit, non-negotiable defense-in-depth rule against relying solely on `proxy.ts` for protection (`02-Technical-Specification.md` §4), directly informed by the real-world CVE-2025-29927 middleware-bypass vulnerability class.

**Long-term Impact:** If BushArt ever needs OAuth (e.g., "log in with Google" as a convenience, or a second administrator authenticating independently), Auth.js remains a reasonable adoption target at that point — this decision is scoped to "not needed yet," not "never."

---

## ADR-005 — Single Continuously-Scrolling Homepage with Intercepting Routes for Shareable Artwork Modals

**Date:** 2026-07-18
**Decision:** Implement individual artwork "pages" as Next.js parallel/intercepting routes (`app/@modal/(.)artwork/[slug]`) layered over the single homepage route, rather than either (a) true separate pages that break the one-page browsing feel, or (b) a client-only modal with no real URL.

**Context:** The brief requires both "a single continuously scrolling page" and a "Share button" per artwork — two requirements that are in tension unless solved deliberately. A share button implies a real, bookmarkable, server-renderable URL; "one page" implies no full navigation away from the gallery.

**Alternatives Considered:**
- **Client-only modal state** (e.g., a React state flag with no URL change). Rejected: makes the Share button non-functional for anyone who wasn't already on the page, since there'd be nothing to link to.
- **Fully separate artwork pages** (`/artwork/[slug]` as the only way to view a piece, with the homepage just linking to them). Rejected: breaks the "one continuously scrolling page" principle — every click would be a full navigation away from the gallery.

**Trade-offs:** This pattern is more implementation complexity than either alternative alone — it requires maintaining both the intercepted route and the fallback full-page route, sharing the same underlying component (`08-Project-Structure.md` §2). Accepted because it's the one approach satisfying both requirements simultaneously rather than trading one off against the other.

**Long-term Impact:** This pattern generalizes — the same intercepting-route technique is the natural mechanism for any future overlay that also needs a real URL (e.g., a future blog post preview modal in `11-Project-Roadmap.md` V2).

---

## ADR-006 — Direct-to-Cloudinary Client Uploads via Signed Signatures

**Date:** 2026-07-18
**Decision:** The admin's browser uploads media directly to Cloudinary using a short-lived signature minted by the BushArt server; the server never receives the file bytes.

**Context:** Timelapse videos in particular can be large. Proxying large uploads through the application server adds latency, consumes server bandwidth and memory, and risks hitting body-size limits.

**Alternatives Considered:**
- **Proxy uploads through a Route Handler** (`POST /api/artworks` accepts multipart file data directly). Rejected: the server becomes a bottleneck and a single point of failure for every upload, and it duplicates bandwidth costs (file travels to the application server, then again to Cloudinary) for no benefit.
- **Unsigned Cloudinary upload preset**, letting the browser upload without a per-request signature. Rejected on security grounds: an unsigned preset can be discovered and abused by anyone who finds it (e.g., in browser dev tools), letting a third party consume the project's Cloudinary quota. A signature scoped to an authenticated admin session avoids this entirely.

**Trade-offs:** Slightly more moving parts (a dedicated signature endpoint, §6 of `05-API-Specification.md`) than either alternative alone, in exchange for removing the server from the media data path entirely.

**Long-term Impact:** Server resource usage stays roughly flat as the media library grows, since the application server never touches media bytes (`03-System-Architecture.md` §11) — this decision is a direct contributor to the project's overall scalability story.

---

## ADR-007 — Cursor-Based Pagination for the Gallery Feed

**Date:** 2026-07-18
**Decision:** `GET /api/artworks` paginates via an opaque cursor (`{ createdAt, _id }`), not a page/offset number.

**Context:** The gallery uses infinite scroll, and new artwork can be inserted at any time (the artist may upload while a visitor is mid-scroll).

**Alternatives Considered:**
- **Offset-based pagination** (`?page=3&limit=24`). Rejected: under concurrent inserts, offset pagination can skip or duplicate items as the underlying result set shifts beneath a visitor's scroll position — a well-known failure mode this project has no reason to accept when the cursor alternative isn't meaningfully harder to implement.

**Trade-offs:** Cursor pagination can't jump to an arbitrary page number directly (e.g., "page 5"), which is a non-issue for an infinite-scroll UI that never exposes page numbers to begin with.

**Long-term Impact:** Stays correct and performant regardless of how large the `artworks` collection grows, since it's backed by the compound index in `04-Database-Schema.md` §3 rather than a `SKIP`-style scan.

---

## ADR-008 — On-the-Fly Cloudinary Transformation URLs Instead of Pre-Rendered Thumbnail Files

**Date:** 2026-07-18
**Decision:** BushArt never stores a separate physical "thumbnail" file — every display size is a parameterized Cloudinary URL derived from the one stored original, generated at request time and cached at Cloudinary's CDN edge thereafter.

**Context:** The brief requires thumbnails to be "generated automatically and intelligently cropped or resized depending on the selected layout" (grid vs. list vs. popup vs. fullscreen) — four-plus distinct sizes per image.

**Alternatives Considered:**
- **Eagerly generate and store fixed thumbnail files at upload time** (e.g., a `thumbnails/` folder per artwork). Rejected: multiplies stored file count per artwork, requires reprocessing every existing upload if a new size/layout is ever added later, and duplicates responsibility Cloudinary already handles better via URL-based transformations.

**Trade-offs:** The very first request for a given transformation incurs Cloudinary's on-demand processing latency before it's cached at the edge; subsequent requests are served from cache. This is a negligible, one-time cost per unique size and is the standard, intended usage pattern for Cloudinary's transformation API.

**Long-term Impact:** Adding a new layout (`11-Project-Roadmap.md` V2's "additional gallery layouts") is a pure code change to `lib/cloudinary/transformations.ts` (`08-Project-Structure.md` §2) — zero data migration, zero reprocessing of historical uploads.

---

## ADR-009 — Railway as the Hosting Platform, With Documented Cost Reality

**Date:** 2026-07-18
**Decision:** Host the application on Railway, as specified in the brief, while explicitly documenting that Railway's current pricing model is not indefinitely free for continuous, database-backed hosting.

**Context:** The brief specifies "Railway (Free Tier)." Current research (`02-Technical-Specification.md` §11) shows Railway's free offering is now a one-time $5 trial credit followed by a ~$1/month Free plan — realistically insufficient for continuous hosting of this app, with the practical floor being the Hobby plan at $5/month, usage-billed.

**Alternatives Considered:**
- **Render**, which — per the same research pass — offers a more durable, genuinely free web-service tier (with the well-known trade-off of cold starts after inactivity on free instances). A real candidate if minimizing cost to literally $0 is prioritized over avoiding cold-start latency.
- **Fly.io**, which offers a free usage allowance with a similar usage-billed model to Railway.
- **Vercel**, a natural fit for Next.js specifically, but the brief's explicit choice of MongoDB Atlas + Cloudinary already sidesteps most of what would make Vercel's platform-specific integrations compelling, and its free tier has its own function-execution constraints that don't clearly beat Railway's for this use case.

**Decision rationale despite the cost finding:** Railway remains the recommendation because (a) it was the brief's explicit choice, (b) it runs Next.js as a long-lived process rather than short-lived serverless functions, which fits this app's connection-pooling and upload-signature-latency needs cleanly, and (c) the realistic cost floor (~$5/month) is small in absolute terms and was reasonable to expect for "hosting a real application continuously," even if it doesn't match "completely free" literally. This is presented as a budgeting fact for the artist to decide on, not a silent assumption.

**Trade-offs:** Committing to Railway despite the cost finding means accepting a small recurring cost as the realistic price of continuous uptime; the Render alternative avoids that cost but introduces cold-start latency that would itself need to be weighed against the Constitution's "performance is a feature" principle.

**Long-term Impact:** Nothing in the application architecture is Railway-specific beyond deployment configuration (`08-Project-Structure.md` has no Railway-only code paths) — migrating to Render, Fly.io, or another Node-compatible host later remains a low-risk option if the cost picture changes again.

---

## ADR-010 — Tailwind CSS + Framer Motion for Styling and Motion

**Date:** 2026-07-18
**Decision:** Use Tailwind CSS (utility-first, token-driven) for all styling and Framer Motion for all animation, per the brief.

**Context:** The brief specifies both by name. Both integrate cleanly with the App Router and support the token-driven design system in `06-UI-Design-System.md`.

**Alternatives Considered:**
- **CSS Modules / hand-written CSS.** Rejected: loses Tailwind's direct mapping from design tokens to utility classes (`09-Coding-Standards.md` §5), increasing the chance of visual drift between components over time.
- **A heavier animation library** or hand-rolled CSS animations for the sketch-in reveal (`06-UI-Design-System.md` §14). Rejected: Framer Motion already handles the orchestration (staggered entrances, gesture-driven transitions, `prefers-reduced-motion` handling patterns) this project needs, without introducing a second animation approach alongside it.

**Trade-offs:** None significant at this project's scale — both choices are close to industry-default for a Next.js + React project of this shape.

**Long-term Impact:** The token system in `06-UI-Design-System.md` is the actual long-term asset; Tailwind is the mechanism, and could in principle be swapped later with the tokens intact, though no such swap is anticipated.

---

## ADR-011 — Defer Dedicated Search Infrastructure; Ship Filter-Based Browsing First

**Date:** 2026-07-18
**Decision:** The MVP ships tag/medium/year/type filtering only; free-text search is explicitly deferred to `11-Project-Roadmap.md` V1.2.

**Context:** At launch scale (a single artist's output, likely well under a thousand pieces initially), well-designed tag filtering plausibly covers most real browsing needs that free-text search would otherwise solve.

**Alternatives Considered:**
- **MongoDB Atlas Search from day one.** Rejected for the MVP: adds a second query/index paradigm to learn and maintain before there's evidence the tag-filter approach is insufficient — against the Constitution's "complexity must be earned by a requirement," not anticipated speculatively.

**Trade-offs:** A visitor cannot free-text search a description or title at launch. Accepted, given the tag system is designed to be the primary discovery mechanism (`01-Product-Definition.md` §6), with search as an enhancement once the archive's size makes it clearly valuable.

**Long-term Impact:** Because search is scoped to arrive as an additional query parameter on the existing `GET /api/artworks` endpoint (`03-System-Architecture.md` §8) rather than a new endpoint, deferring it costs nothing structurally — it's a pure addition when it ships.

---

## ADR-012 — Single-Admin Data Model in MVP, Schema Forward-Compatible with Multiple Admins

**Date:** 2026-07-18
**Decision:** The `admins` collection (`04-Database-Schema.md` §5) supports any number of documents from day one, even though the MVP's UI and authorization model (`02-Technical-Specification.md` §5) assume exactly one administrator.

**Context:** The brief describes a single artist managing their own work. There is no current requirement for a second administrator (an assistant, a collaborator).

**Alternatives Considered:**
- **Hard-code a single admin** (e.g., credentials in an environment variable, no `admins` collection at all). Rejected: would require a genuine data migration to introduce a second admin later, which is a disproportionate cost for what the collection-based approach avoids for free.
- **Build full multi-admin role management now** (permissions, invites). Rejected as premature — no current requirement justifies the complexity (Constitution: "complexity must be earned").

**Trade-offs:** None meaningful — modeling `admins` as a collection instead of a single hard-coded credential costs essentially nothing extra today.

**Long-term Impact:** `11-Project-Roadmap.md` V2's "multi-admin support" milestone is scoped as primarily a UI and authorization-model change, not a data migration, directly because of this decision.

---

## ADR-013 — Supersede Railway with Render as the Hosting Platform

**Date:** 2026-07-19
**Decision:** Replace Railway with Render for application hosting. This ADR supersedes ADR-009's Railway decision; ADR-009 is preserved unedited for historical record.

**Context:** ADR-009 documented Railway's realistic ~$5/month floor (one-time $5 trial credit, then a ~$1/month Free plan too tight for continuous database-backed hosting). Render offers a genuinely indefinite $0 tier — 750 hours/month, 512MB RAM, 0.1 vCPU, no credit card required — that requires no rework of the connection-handling architecture. Render runs Next.js as a long-lived process (like Railway did), so the existing MongoDB connection-pooling approach in `02-Technical-Specification.md` §3 is unchanged.

**Alternatives Considered:**
- **Google Cloud Run:** Free tier includes 2M requests/month but 360,000 vCPU-seconds — the per-request billing model doesn't match a long-lived process as cleanly; cold starts are worse than Render's.
- **Oracle Cloud Always Free:** 4 ARM cores / 24GB RAM is generous hardware, but the provisioning process is notoriously unreliable and the platform's documentation and community are thinner than Render's.
- **Vercel:** Natural fit for Next.js, but its free tier's 100 serverless function execution limit per day and 10s function timeout are a poor match for a long-lived connection-pooling model.
- **Netlify:** Similar serverless constraints to Vercel; not designed for long-lived Node processes.

**Trade-offs:** Free-tier cold starts (~30–60s after 15 minutes of idle) are the accepted cost. Mitigated by a scheduled keep-alive ping (UptimeRobot or similar) that stays within the 750 free hours. The Constitution's "performance is a feature" principle is partially traded here — cold-start latency on the first request after idle is a real UX cost — but the mitigation (keep-alive) eliminates it for regular visitors, and the cost saving (literally $0 vs. ~$5/month) is judged worth the edge case of a cold start for a rare visitor after a long idle period.

**Long-term Impact:** Nothing in the application architecture is Render-specific beyond deployment configuration — the same portability argument from ADR-009 still holds. If Render's free tier changes or a better option emerges, migrating remains a low-risk, configuration-only change.
