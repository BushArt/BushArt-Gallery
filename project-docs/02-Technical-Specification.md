# 02 — Technical Specification

> **Precedence: 3rd.** This document answers *how will it be built*. It is subordinate to the Constitution and Product Definition, and takes precedence over everything from `03-System-Architecture.md` downward.

---

## 1. Technology Stack — Summary

| Layer | Choice |
|---|---|
| Frontend framework | Next.js 16 (App Router) |
| UI library | React 19 |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| Animation | Framer Motion (`motion` package) |
| Backend | Next.js Route Handlers (same codebase as frontend) |
| Authentication | Custom, lightweight JWT session (see §4) |
| Database | MongoDB Atlas, Free (M0) cluster |
| Media storage & processing | Cloudinary, Free plan |
| Hosting | Render |
| Validation | Zod |

Rationale for each major choice is recorded in `12-Decision-Log.md`. This document specifies the *what*; the Decision Log explains the *why* and the alternatives that were considered.

---

## 2. Frontend

- **Next.js 16**, App Router only (no Pages Router). The current stable line ships Turbopack as the default bundler, React 19.2 support, and an opt-in caching model via Cache Components (see §8). Minimum Node.js runtime: **20.9+**.
- **TypeScript strict mode** end to end — see `09-Coding-Standards.md`.
- **Tailwind CSS** for styling, driven by the design tokens defined in `06-UI-Design-System.md`. No CSS-in-JS runtime.
- **Framer Motion** for the animation vocabulary described in `06-UI-Design-System.md` §Motion — gallery entrance transitions, popup open/close, the signature "sketch-in" reveal, and filter transitions. All motion respects `prefers-reduced-motion`.
- **Zod** schemas define both client-side form validation and server-side request validation from a single shared definition, so the two never drift apart.
- Images are rendered through `next/image` wherever practical, backed by Cloudinary-hosted sources (see §6).

## 3. Backend

- Next.js **Route Handlers** (`app/api/**/route.ts`) serve the REST API documented in full in `05-API-Specification.md`. There is no separate backend service or repository — frontend and backend ship as one deployable unit, which is the primary reason Next.js was chosen over a split SPA + API architecture (`12-Decision-Log.md` ADR-001).
- Business logic (validation, authorization checks, data shaping) lives in a `lib/` layer that Route Handlers call into — handlers themselves stay thin. See `08-Project-Structure.md`.
- The database driver is the official `mongodb` Node.js driver, wrapped in a small connection-caching helper appropriate for a long-lived container process. Render runs Next.js as a long-lived process (not short-lived serverless functions), so the existing connection-pooling approach needs no rework — a standard pooled connection is used rather than a per-invocation connection dance.

## 4. Authentication

BushArt uses a **custom, lightweight JWT-based session** rather than Auth.js (NextAuth) or a third-party identity provider. Full rationale is in `12-Decision-Log.md` ADR-004; the short version: BushArt has exactly one type of login (a single administrator's username and password), and Auth.js's value proposition is largely built around multi-provider OAuth — for a credentials-only, single-admin site, a ~150-line custom implementation is simpler to reason about, has fewer dependencies, and avoids pulling in machinery the project doesn't use.

**Mechanics:**
- Credentials are checked against the `admins` collection (`04-Database-Schema.md`); passwords are hashed with **bcrypt** (cost factor 12) via `bcryptjs`, never stored or logged in plaintext.
- On success, the server issues a JWT (`HS256`, signed with `JWT_SECRET`) containing the admin's id, username, issued-at, and a 7-day expiry.
- The token is set as an **httpOnly, Secure, SameSite=Lax** cookie named `bushart_session`. It is never exposed to client-side JavaScript.
- There is no refresh-token machinery in the MVP — sessions simply expire after 7 days and the artist logs in again. This is a deliberate scope cut (see `12-Decision-Log.md` ADR-004) appropriate for a single low-frequency user; refresh tokens are a documented future option if session length becomes annoying in practice.
- Brute-force protection: the `admins` document tracks `failedLoginAttempts` and `lockUntil`. Five consecutive failures locks the account for 15 minutes. This is intentionally simple rather than a general-purpose rate limiter, since there is exactly one account to protect.

**A specific, documented security requirement:** route protection **must not** rely solely on Next.js's `proxy.ts` (the framework's edge-middleware entry point, renamed from `middleware.ts` as of Next.js 16). A publicly disclosed vulnerability class (CVE-2025-29927) demonstrated that middleware-only session gating in Next.js could be bypassed by a spoofed internal header. BushArt therefore treats `proxy.ts` as a **first line of defense and a UX convenience only** (e.g., redirecting an unauthenticated visitor away from an admin-only page before it renders) — every admin Route Handler independently re-verifies the session server-side before performing any read of admin-only data or any write. This defense-in-depth requirement is non-negotiable; see `09-Coding-Standards.md` §Security.

## 5. Authorization

Authorization in BushArt is intentionally simple: a request is either **anonymous** (public read-only access) or **authenticated as an admin** (full read/write access). There are no intermediate roles or per-resource permissions in the MVP. The `admins` collection schema (`04-Database-Schema.md`) is nonetheless structured to support multiple admin accounts without a migration, in case a future version introduces roles — see `11-Project-Roadmap.md` Version 2.

## 6. Media Storage

- **Cloudinary** stores every original upload and serves every derived size through its CDN.
- Uploads happen **directly from the admin's browser to Cloudinary**, authorized by a short-lived signature minted by a BushArt API route (`POST /api/upload/signature`) — the media itself never passes through the Render server. See `03-System-Architecture.md` §Upload Flow and `12-Decision-Log.md` ADR-006.
- Thumbnails and display sizes are **not** separate stored files. They are generated on demand via Cloudinary transformation URLs (e.g., width/height/crop parameters appended to the asset's base URL) and cached at Cloudinary's CDN edge after first request. See ADR-008.
- Video (timelapse) uploads use Cloudinary's video pipeline for adaptive delivery. Because a single unedited timelapse can be large, the admin upload flow enforces a soft client-side guideline (recommended under ~60 seconds, compressed before upload where possible) to protect the free-tier bandwidth budget described below — this is guidance surfaced in the UI, not a hard technical cap.

## 7. Image & Media Optimization

All delivered media (not originals) is served with:
- `f_auto` — automatic format negotiation (AVIF/WebP where the requesting browser supports it, falling back gracefully).
- `q_auto` — automatic, perceptually-tuned quality/compression.
- Explicit `width`/`height`/`crop` parameters per context (grid thumbnail, list thumbnail, popup enlarged view, fullscreen), defined centrally in a small `lib/cloudinary/transformations.ts` module so every part of the app requests media the same way.
- `loading="lazy"` (via `next/image`) for everything below the fold, with the gallery's own intersection-observer-driven infinite scroll (see `03-System-Architecture.md`) controlling when new items enter the DOM at all.

Originals are retained at full resolution for the **Download** action, delivered via a Cloudinary `fl_attachment` URL rather than duplicated into a second storage location.

## 8. State Management & Caching

- **Server state** (artwork lists, tags, settings) is fetched through the Route Handlers and cached using Next.js 16's **Cache Components** model: caching is opt-in via the `"use cache"` directive rather than implicit, which the framework moved to specifically to make caching behavior predictable. Public, non-personalized reads (the gallery feed, tag list, site settings) are the primary candidates for `"use cache"` with a `cacheLife()` profile; anything gated behind the admin session is left dynamic by default and never cached at the shared level.
- Mutations (`POST`/`PATCH`/`DELETE` from the admin) invalidate the relevant cached data via `cacheTag()` / `revalidateTag()`, so a newly published artwork appears immediately without a manual redeploy or cache flush.
- **Client state** is kept intentionally minimal: React state and URL search params (for active filters, so a filtered view is itself shareable) are sufficient — no global client state library is introduced. See `12-Decision-Log.md` for why this was not over-engineered with something like Redux or a heavier data-fetching library.
- **Media caching** is handled by Cloudinary's CDN, not by the application.

## 9. Environment Variables

| Variable | Purpose | Required |
|---|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string | Yes |
| `JWT_SECRET` | Signing secret for session tokens | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account identifier | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key (server-side only) | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret (server-side only, used to mint upload signatures) | Yes |
| `NEXT_PUBLIC_SITE_URL` | Canonical absolute site URL, used for share links and metadata | Yes |
| `INITIAL_ADMIN_USERNAME` | Used once by the admin-seeding script | Only for initial setup |
| `INITIAL_ADMIN_PASSWORD` | Used once by the admin-seeding script | Only for initial setup |
| `NODE_ENV` | Standard Node environment flag | Provided by platform |

Full setup instructions are in `10-Deployment-Guide.md`. Note that admin credentials are **not** kept as standing environment variables read at login time — they exist only transiently, to seed the first `admins` document via a one-time script. Ongoing login checks always go against the hashed value in MongoDB.

## 10. External Services

| Service | Role | Tier |
|---|---|---|
| MongoDB Atlas | Primary datastore (all metadata) | Free (M0), 512MB storage, no time limit, no credit card required |
| Cloudinary | Media storage, transformation, CDN delivery | Free, 25 monthly credits (1 credit = 1GB storage, 1GB bandwidth, or 1,000 transformations, pooled) |
| Render | Application hosting | Free (750 hrs/month, 512MB RAM, 0.1 CPU, sleeps after 15 min idle, ~30–60s cold start on wake, no credit card required) |

## 11. Cost Reality (updated for Render)

The Constitution commits to free-tier infrastructure "by default," and the original project brief specifies free-tier services by name. In the interest of the documentation being trustworthy rather than optimistic, here is the honest state of each provider as of this writing:

- **MongoDB Atlas M0** is genuinely free indefinitely — 512MB storage, no time limit, no credit card required. At BushArt's expected metadata volume (text and small subdocuments only; media lives in Cloudinary, not Mongo) this comfortably supports many thousands of artwork records. The one real limitation: **the free tier does not include automated backups** — see `10-Deployment-Guide.md` §Backup Strategy for the mitigation.
- **Cloudinary's Free plan** provides 25 credits/month, pooled across storage, bandwidth, and transformations (1 credit = 1GB storage *or* 1GB bandwidth *or* 1,000 transformations). This is workable for a personal portfolio at moderate traffic, but video (timelapses) consumes bandwidth quickly, and a single busy month of gallery traffic can plausibly approach the ceiling. `10-Deployment-Guide.md` §Monitoring covers watching this.
- **Render's Free web service tier** is genuinely indefinite: 750 hours/month of uptime, 512MB RAM, 0.1 vCPU, no credit card required. The service sleeps after 15 minutes of inactivity and takes ~30–60 seconds to cold-start on the next request. A scheduled keep-alive ping (e.g., UptimeRobot) can prevent the sleep entirely and stays within the 750 free hours. This is a strict improvement over the previous platform's cost picture — Render requires no paid plan to run BushArt continuously.

This update is recorded in `12-Decision-Log.md` ADR-013, which supersedes ADR-009's Railway analysis. The Constitution's "free-tier only" principle is now fully satisfied by the hosting platform itself, not just by the architecture's ability to run on one.

## 12. Security

- All admin-mutating routes independently verify the session server-side (§4).
- Passwords hashed with bcrypt, cost factor 12; never logged.
- All Cloudinary uploads from the browser are authorized by short-lived, single-use signed parameters — the API secret never reaches the client.
- Input validation via Zod on every Route Handler that accepts a body; invalid input is rejected before it reaches any database or Cloudinary call.
- MongoDB Atlas network access is restricted to an IP allowlist appropriate for Render's deployment model (documented concretely in `10-Deployment-Guide.md` — Render provides static outbound egress IPs per region on the free tier, which is a strict improvement over the previous platform).
- Cookies: `httpOnly`, `Secure` (in production), `SameSite=Lax`.
- No secrets are ever committed to the repository; `.env.example` documents every variable's shape without real values.

## 13. Performance Targets

| Metric | Target |
|---|---|
| Largest Contentful Paint (LCP) | < 2.5s on a simulated mid-tier mobile connection |
| Interaction to Next Paint (INP) | < 200ms |
| Cumulative Layout Shift (CLS) | < 0.1 |
| Gallery scroll frame rate | Sustained ~60fps during infinite-scroll loading |
| Initial JS payload (homepage) | Budgeted and tracked; large client-only dependencies (e.g., a masonry layout library) are lazy-loaded, not part of the initial bundle |

These map to Core Web Vitals because they are measurable, tooling-supported, and directly reflect the Constitution's "performance is a feature" principle.

## 14. Deployment Strategy

Single environment model for the MVP: a `main` branch deploys automatically to production on Render via its GitHub integration. Full walkthrough, including environment provisioning for MongoDB Atlas and Cloudinary, lives in `10-Deployment-Guide.md`. Preview/staging environments are a documented future enhancement (`11-Project-Roadmap.md` V1.1), not a Day 1 requirement, given the single-operator scale of the project.
