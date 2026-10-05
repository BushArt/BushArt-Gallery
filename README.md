# BushArt

**Digital Sketchbook & Gallery** — a minimalist, dark-themed digital art portfolio and CMS.

[![CI](https://github.com/BushArt/BushArt-Gallery/actions/workflows/ci.yml/badge.svg)](https://github.com/BushArt/BushArt-Gallery/actions/workflows/ci.yml)

BushArt is a self-hosted, artist-owned alternative to scattering finished work across social media. It is one continuously scrolling page that serves as both a public gallery and a private studio: visitors browse and filter, and the artist manages every piece from that same page after logging in.

It is a single deployable app — [Next.js](https://nextjs.org) 16 App Router, [MongoDB](https://www.mongodb.com/atlas) for metadata, [Cloudinary](https://cloudinary.com) for media. No separate backend, no file system to maintain.

## Features

- Infinite-scroll gallery in grid or detailed-list mode, paginated by cursor so results stay stable while new work is added
- Filtering by tag, year, medium, type, and sort order — applied in the database rather than the browser, and reflected in the URL so any view is shareable
- A shareable URL per artwork: opening one from the gallery slides a modal over the still-scrolling page, while loading that link directly server-renders the same popup
- Up to 20 images plus an optional timelapse video per artwork, delivered as resized Cloudinary URLs rather than stored copies
- NSFW artwork gated behind an explicit in-app consent prompt, with no title, description, or image leaked to crawlers
- Admin studio built into the page — press `Shift+Alt+L` or click the footer glyph to log in; there is no separate admin route
- Uploads go straight from the browser to Cloudinary using short-lived signed parameters, so media bytes never pass through the app server
- A single admin account, authenticated with a bcrypt hash and an httpOnly session cookie; five failed attempts lock the account temporarily

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | MongoDB — an Atlas M0 free-tier cluster is enough |
| Media | Cloudinary |
| Validation | Zod |
| Auth | bcryptjs + httpOnly JWT session cookie |
| Runtime | Node 24 |

## Quick start

You need **Node 24** (`>=20.9.0 <25`; CI pins 24.14.1), a MongoDB database, and a Cloudinary account. Both external services have free tiers.

```bash
git clone https://github.com/BushArt/BushArt-Gallery.git
cd BushArt-Gallery
npm ci
cp .env.example .env.local   # then fill it in, see below
npm run db:setup             # create indexes (idempotent)
npm run seed:admin           # create the first admin account
npm run dev
```

Then open <http://localhost:3000>.

## Environment variables

Read from `.env.local` during development and from the host's environment in production. `.env.local` is gitignored — never commit it.

Required at boot. The app validates these on startup and refuses to run without them; `JWT_SECRET` must be at least 32 characters in production.

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Signs the session cookie |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name, used server-side |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | The same cloud name, exposed to the browser |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret — never sent to the browser |
| `NEXT_PUBLIC_SITE_URL` | Absolute site origin, used for metadata and share links |

Needed only by `npm run seed:admin`:

| Variable | Purpose |
|---|---|
| `INITIAL_ADMIN_USERNAME` | Username for the admin account it creates |
| `INITIAL_ADMIN_PASSWORD` | Password for that account — change it before deploying |

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint over `src/`, `tests/`, and `scripts/` |
| `npm test` | Unit, component, and API tests (Vitest) |
| `npm run test:coverage` | The same suite with a coverage gate |
| `npm run test:e2e` | End-to-end tests (Playwright) |
| `npm run test:counts` | Guards against test-count regressions |
| `npm run db:setup` | Create database indexes (idempotent) |
| `npm run seed:admin` | Create the first admin account |

## How it works

- **One deployable.** Pages and REST Route Handlers live in the same Next.js app. Handlers stay thin — parse, verify, validate, delegate to `src/lib/`, shape the response — and all business logic sits in `src/lib/`.
- **Media never touches the server.** The browser requests a short-lived Cloudinary signature, uploads directly, then submits only the metadata. The app holds the API secret but never handles the file.
- **One artwork URL, two renderings.** A route interception renders the artwork modal over the gallery; the same route reached directly server-renders the full page with the popup already open. Both render the same component.
- **The proxy is not the security boundary.** `proxy.ts` only redirects unauthenticated visitors away from admin UI. Every mutating Route Handler independently re-verifies the session server-side.
- **Startup self-checks.** Environment variables are validated with Zod before the app serves traffic, and database indexes are ensured once on boot; admin routes stay closed until that completes.

## Documentation

The project was designed and documented ahead of the code, so the reasoning is recorded rather than lost:

| Document | What it covers |
|---|---|
| [`project-docs/03-System-Architecture.md`](project-docs/03-System-Architecture.md) | How the pieces connect, with diagrams |
| [`project-docs/04-Database-Schema.md`](project-docs/04-Database-Schema.md) | Collections, fields, and indexes |
| [`project-docs/05-API-Specification.md`](project-docs/05-API-Specification.md) | Every route, contract, and error shape |
| [`project-docs/10-Deployment-Guide.md`](project-docs/10-Deployment-Guide.md) | Local setup through to production |
| [`project-docs/12-Decision-Log.md`](project-docs/12-Decision-Log.md) | ADRs — why each major choice was made |
| [`project-docs/README.md`](project-docs/README.md) | Index of the full documentation set |

## Deployment

[`render.yaml`](render.yaml) is committed: a Render blueprint that builds with `npm run build` and serves with `npm run start`. Create the service from the blueprint, then fill in the seven required environment variables in the Render dashboard.

## License

MIT — see [LICENSE](LICENSE).
