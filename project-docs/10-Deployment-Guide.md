# 10 — Deployment Guide

> **Precedence: 9th (part of "remaining documents").** This document walks from an empty machine to a live production deployment. It implements the choices made in `02-Technical-Specification.md`; if a step here ever contradicts that document, the Technical Specification wins and this guide has a bug.

---

## 1. Local Setup

**Prerequisites:** Node.js **20.9+** (required by Next.js 16), Git, a package manager (`npm` is assumed throughout; `pnpm`/`yarn` work identically).

```bash
git clone <repository-url> bushart
cd bushart
npm install
cp .env.example .env.local
# fill in .env.local using §4 below
npm run dev
```

The app runs at `http://localhost:3000`. Local development connects to the **same** MongoDB Atlas and Cloudinary accounts used in production by default (both have generous-enough free tiers for solo development traffic) — there is no local database requirement for day-to-day feature work. Contributors who want full isolation may point `MONGODB_URI` at a local MongoDB instance instead; this is optional, not required.

## 2. MongoDB Atlas Setup

1. Create a free account at MongoDB Atlas (no credit card required for the M0 tier).
2. Create a new **Project**, then **Build a Database** → select **M0 (Free)**, choose a cloud provider/region close to Render's deployment region to minimize latency.
3. Create a **Database User** with a strong, generated password (not the same as the admin login password used inside BushArt itself — these are unrelated credentials).
4. **Network Access:** add an IP allowlist entry. Render provides a documented set of static outbound egress IPs per region on the free tier. Allowlist those IPs in Atlas — this is a strict improvement over the previous platform, which had no static egress option on its free tier. Render's static egress IPs are listed in the Render Dashboard under your service's **Networking** settings.
   This tradeoff is recorded, not hidden — see `12-Decision-Log.md` if it needs revisiting as the project matures.
5. Get the connection string (`mongodb+srv://...`) from **Connect → Drivers**, and set it as `MONGODB_URI`.
6. No manual collection creation is required — `04-Database-Schema.md`'s collections are created implicitly on first write. Indexes, however, **are** created explicitly by an idempotent setup script (`npm run db:setup`, or run once as part of first deployment) rather than left to happen by accident — see `04-Database-Schema.md` §3–6 for the exact index list.

## 3. Cloudinary Setup

1. Create a free Cloudinary account (Free plan: 25 monthly credits, pooled across storage/bandwidth/transformations — `02-Technical-Specification.md` §11).
2. From the Cloudinary Dashboard, copy the **Cloud Name**, **API Key**, and **API Secret** into `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
3. No upload preset needs to be created manually — BushArt uses **signed** uploads authorized per-request by `POST /api/upload/signature` (`05-API-Specification.md` §6), not a client-exposed unsigned preset, which keeps upload authorization tied to an active admin session rather than a shared static preset name.
4. Recommended (not required): enable Cloudinary's usage-alert email notifications so the artist is warned before hitting the 25-credit monthly ceiling, rather than discovering it as a failed upload.

## 4. Environment Variables

| Variable | Where it's used | Example |
|---|---|---|
| `MONGODB_URI` | `lib/db/mongodb.ts` | `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/bushart` |
| `JWT_SECRET` | `lib/auth/jwt.ts` | A long, random, generated string — never reused from another project |
| `CLOUDINARY_CLOUD_NAME` | `lib/cloudinary/client.ts` | `bushart` |
| `CLOUDINARY_API_KEY` | `lib/cloudinary/client.ts`, `lib/cloudinary/signature.ts` | `142857396215` |
| `CLOUDINARY_API_SECRET` | `lib/cloudinary/signature.ts` (server-only, never sent to the client) | — |
| `NEXT_PUBLIC_SITE_URL` | Share links, Open Graph metadata | `https://bushart.example` |
| `INITIAL_ADMIN_USERNAME` | `scripts/seed-admin.ts` only | `bush` |
| `INITIAL_ADMIN_PASSWORD` | `scripts/seed-admin.ts` only | A strong, unique password |

`.env.example` in the repository mirrors this table exactly, with placeholder values and no real secrets — kept in sync per `08-Project-Structure.md` §6.

**Bootstrapping the first admin account:**
```bash
npm run seed:admin
```
This reads `INITIAL_ADMIN_USERNAME`/`INITIAL_ADMIN_PASSWORD`, hashes the password with bcrypt, and inserts the first `admins` document (`04-Database-Schema.md` §5). Run this once, locally or as a one-off Render job, then **remove those two variables** from the environment — they are not read anywhere else in the running application, and leaving a plaintext password in an environment variable indefinitely is unnecessary exposure.

## 5. Build Process

```bash
npm run build   # next build — Turbopack production build (default in Next.js 16)
npm run start   # next start — production server
```

`npm run build` runs type-checking and linting as part of the build; a build with type errors fails closed rather than shipping.

## 6. Production Deployment (Render)

1. Create a free Render account (no credit card required for the free tier).
2. In the Render Dashboard, click **New +** → **Web Service** and connect your GitHub repository. Render auto-detects the Next.js framework and configures the build command (`npm run build`) and start command (`npm run start`) without a custom Dockerfile.
3. Set every variable from §4 (except the two `INITIAL_ADMIN_*` ones — see the bootstrapping note above) in Render's **Environment Variables** section during service creation.
4. Deploys trigger automatically on push to `main`. There is a single production environment in the MVP; preview environments per-branch are a documented future enhancement (`11-Project-Roadmap.md` V1.1), not a Day 1 setup.
5. Attach a custom domain if desired (Render supports this on the free tier via the **Settings** tab).
6. **Free-tier behavior:** Render's free web service runs for 750 hours/month. The service **sleeps after 15 minutes of inactivity** and takes ~30–60 seconds to cold-start on the next request. This is the accepted trade-off for genuinely free hosting — see `12-Decision-Log.md` ADR-013 for the full rationale.
7. **Mitigation (optional but recommended):** Set up a free UptimeRobot account to ping your site's URL every 5 minutes. This keep-alive prevents the service from sleeping and stays within the 750 free hours (5-minute pings consume ~8,640 minutes/month, well under the 45,000-minute monthly allowance). The ping target should be the homepage URL; no special endpoint is needed.

## 7. Monitoring

- **Application logs:** Render's built-in log viewer is sufficient at this scale — no separate log aggregation service is introduced for the MVP.
- **Uptime:** a free third-party uptime check (e.g., UptimeRobot, pinging the homepage every 5 minutes) is recommended to prevent Render's free-tier idle sleep. This is a zero-cost addition that stays within the 750 free hours and doubles as basic uptime monitoring. See §6 step 7 for setup details.
- **Cloudinary usage:** monitored via Cloudinary's dashboard and the usage-alert emails set up in §3 — the 25-credit monthly ceiling is the single most likely free-tier limit to be hit in practice (`02-Technical-Specification.md` §11), so this is worth checking after any month with a large batch of uploads or a traffic spike.
- **MongoDB Atlas:** the Atlas dashboard shows storage against the 512MB M0 ceiling; at BushArt's metadata-only footprint (no media bytes stored here), this is expected to remain a non-issue for a very long time — see `04-Database-Schema.md` §8 for why.
- **Error tracking:** a hosted error-tracking service (e.g., a free tier of a tool like Sentry) is a reasonable V1.1 addition (`11-Project-Roadmap.md`) but is not part of the MVP — Render's logs plus the structured logging convention in `09-Coding-Standards.md` §12 are sufficient at launch.

## 8. Backup Strategy

MongoDB Atlas's free M0 tier has **no automated backups** (`02-Technical-Specification.md` §11). The mitigation:

1. A scheduled export (`mongodump` against the Atlas connection string, or the equivalent `mongoexport` per-collection for a human-readable JSON snapshot) runs on a recurring basis — the simplest zero-infrastructure option is a scheduled GitHub Actions workflow (using the free minutes allowance available to a personal repository) that runs the export and uploads the resulting file as a workflow artifact or commits it to a private backup location.
2. Because BushArt's database holds **only metadata** (`04-Database-Schema.md` §1), this export is small (well under Atlas's own 512MB ceiling by a wide margin) and fast, even as the artwork collection grows into the thousands.
3. Media itself (Cloudinary) does not need a separate backup process for the MVP: Cloudinary is not deleted by anything BushArt's own backup/restore procedure does, and a MongoDB restore does not touch Cloudinary at all (`04-Database-Schema.md` §8). A future enhancement (`11-Project-Roadmap.md`) may add a periodic Cloudinary asset manifest export purely as an extra safety net, but it is not required for correctness today.
4. Recommended cadence: weekly is sufficient given how infrequently the underlying data changes relative to a typical production database — the artist is not processing thousands of writes a day.

## 9. Disaster Recovery

| Scenario | Recovery Path |
|---|---|
| MongoDB Atlas data corrupted or accidentally deleted | Restore the most recent `mongodump` export (§8) into a fresh or the same M0 cluster. Cloudinary media is unaffected and immediately usable again once `publicId` references are restored. |
| Cloudinary account/media lost | Not recoverable by BushArt's own tooling alone — this is the one true single point of failure in the architecture, inherent to relying on a single media provider. Mitigating this fully (e.g., a redundant secondary storage copy) is a deliberate scope cut for the MVP, revisit if/when the archive's irreplaceability grows to warrant the added complexity — see `12-Decision-Log.md`. |
| Render deployment fails / account issue | The application itself is stateless and rebuildable from the Git repository at any time; redeploying to Render (or, if necessary, an alternative host — nothing in the codebase is Render-specific beyond configuration) restores service as soon as environment variables are reconfigured. |
| Admin locked out (forgotten password, lost access) | Re-run `scripts/seed-admin.ts` logic manually (or a dedicated `scripts/reset-admin-password.ts`, a reasonable small addition) against the production `MONGODB_URI` to reset the single admin account's password hash directly — this is the one legitimate, break-glass exception to the Constitution's "no manual database editing" principle, and should be logged as an operational event when it happens. |

## 10. Deployment Checklist (Quick Reference)

1. MongoDB Atlas M0 cluster created, user + network access configured.
2. Cloudinary account created, credentials copied.
3. All environment variables set in Render (§4).
4. `npm run seed:admin` run once; `INITIAL_ADMIN_*` variables removed afterward.
5. Database indexes created (`npm run db:setup` or equivalent, per §2).
6. First deploy succeeds; homepage loads; login works; a test upload succeeds end-to-end.
7. Cloudinary usage alerts configured.
8. Keep-alive ping (UptimeRobot or similar) set up to prevent free-tier idle sleep (§6 step 7).
9. Backup workflow (§8) scheduled and verified to run successfully at least once.
