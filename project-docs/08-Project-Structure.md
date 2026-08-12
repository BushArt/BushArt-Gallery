# 08 — Project Structure

> **Precedence: 9th (part of "remaining documents").** This document defines the repository layout. It implements the architecture described in `03-System-Architecture.md` and must stay consistent with it — if a new top-level directory is introduced, `03-System-Architecture.md` should be checked for whether it implies a new component responsibility worth documenting there too.

---

## 1. Directory Tree

```text
bushart/
├── src/
│   ├── app/
│   │   ├── layout.tsx                     # Root layout: fonts, providers, <html>/<body>
│   │   ├── page.tsx                       # Homepage: hero + gallery feed
│   │   ├── globals.css                    # Tailwind entry + CSS custom properties (design tokens)
│   │   ├── @modal/                        # Parallel route slot for the artwork popup
│   │   │   ├── default.tsx                # Renders null when no modal is active
│   │   │   └── (.)artwork/
│   │   │       └── [slug]/
│   │   │           └── page.tsx           # Intercepted artwork popup (client-side nav target)
│   │   ├── artwork/
│   │   │   └── [slug]/
│   │   │       └── page.tsx               # Full-page fallback: direct visits, refreshes, shared links
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   ├── logout/route.ts
│   │       │   └── me/route.ts
│   │       ├── artworks/
│   │       │   ├── route.ts               # GET (list), POST (create)
│   │       │   └── [id]/
│   │       │       ├── route.ts           # GET (by slug), PATCH, DELETE (by ObjectId)
│   │       │       └── download/
│   │       │           └── route.ts       # GET (302 redirect to fl_attachment URL)
│   │       ├── tags/
│   │       │   ├── route.ts               # GET (list), POST (create)
│   │       │   └── [id]/route.ts          # DELETE
│   │       ├── settings/route.ts          # GET, PATCH
│   │       └── upload/
│   │           └── signature/route.ts     # POST
│   │
│   ├── components/
│   │   ├── gallery/
│   │   │   ├── GalleryGrid.tsx
│   │   │   ├── GalleryList.tsx
│   │   │   ├── ArtworkCard.tsx
│   │   │   ├── UploadCard.tsx             # Admin-only "add artwork" card
│   │   │   ├── FilterBar.tsx
│   │   │   ├── ViewModeToggle.tsx
│   │   │   └── NsfwToggle.tsx
│   │   ├── artwork/
│   │   │   ├── ArtworkPopup.tsx
│   │   │   ├── ArtworkEditForm.tsx
│   │   │   ├── FullscreenViewer.tsx
│   │   │   ├── DownloadButton.tsx
│   │   │   └── ShareButton.tsx
│   │   ├── admin/
│   │   │   ├── LoginModal.tsx
│   │   │   ├── UploadDialog.tsx
│   │   │   ├── TagManager.tsx
│   │   │   └── HomepageEditor.tsx
│   │   ├── hero/
│   │   │   ├── HeroSection.tsx
│   │   │   └── FeaturedArtwork.tsx
│   │   └── ui/                            # Shared, feature-agnostic primitives
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       ├── Badge.tsx
│   │       ├── Input.tsx
│   │       ├── TagPill.tsx
│   │       ├── SketchReveal.tsx           # The signature loading/reveal primitive (06-UI-Design-System.md §14)
│   │       └── Skeleton.tsx
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── mongodb.ts                 # Cached connection helper
│   │   │   └── models/
│   │   │       ├── artwork.ts             # Data-access functions (not an ORM model class)
│   │   │       ├── tag.ts
│   │   │       ├── admin.ts
│   │   │       └── settings.ts
│   │   ├── auth/
│   │   │   ├── jwt.ts                     # Sign/verify session tokens
│   │   │   ├── session.ts                 # Cookie read/write helpers
│   │   │   └── guard.ts                   # Server-side "require admin" helper used by every protected route handler
│   │   ├── api/
│   │   │   ├── errors.ts                  # Shared error envelope helpers for Route Handlers
│   │   │   ├── artwork-response.ts        # §4.2 detail response mapper
│   │   │   ├── artwork-slug.ts            # Unique slug generation for POST /api/artworks
│   │   │   └── settings-response.ts       # §4.5 public settings shape (strips internal fields)
│   │   ├── cloudinary/
│   │   │   ├── client.ts                  # SDK configuration (server-only)
│   │   │   ├── cloudName.ts               # Browser/server-safe cloud name resolution
│   │   │   ├── signature.ts               # Signed-upload parameter generation
│   │   │   ├── transformations.ts         # Single source of truth for every derived-size URL
│   │   │   └── destroy.ts                 # Cloudinary asset cleanup on artwork delete (server-only)
│   │   ├── validation/
│   │   │   ├── artwork.ts                 # Zod schemas, shared by client forms and Route Handlers
│   │   │   ├── tag.ts
│   │   │   └── settings.ts
│   │   └── utils/
│   │       ├── slugify.ts
│   │       ├── cursor.ts                  # Pagination cursor encode/decode
│   │       └── formatDate.ts
│   │
│   ├── hooks/
│   │   ├── useArtworks.ts                 # Data fetching + infinite scroll state
│   │   ├── useAuth.ts                     # Wraps GET /api/auth/me
│   │   ├── useInfiniteScroll.ts           # IntersectionObserver sentinel hook
│   │   └── useFilters.ts                  # Reads/writes filter state to URL search params
│   │
│   └── types/
│       ├── artwork.ts
│       ├── tag.ts
│       ├── settings.ts
│       └── api.ts                         # Shared request/response types matching 05-API-Specification.md
│
├── scripts/
│   └── seed-admin.ts                      # One-time admin bootstrap (02-Technical-Specification.md §9)
│
├── public/
│   └── icons/                             # Static, non-media assets (favicon, etc.)
│
├── proxy.ts                                # Next.js 16 edge entry point (formerly middleware.ts) —
│                                            # UX-layer redirect only; never the sole auth check (02-Technical-Specification.md §4)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── .env.example
├── .eslintrc.json
└── .prettierrc
```

## 2. Responsibilities by Directory

| Directory | Responsibility |
|---|---|
| `app/` | Routing, layouts, and Route Handlers only. Pages compose components; they do not contain business logic. |
| `app/@modal` + `app/artwork/[slug]` | The intercepting-route pair implementing the shareable-popup pattern from `03-System-Architecture.md` §6. These two routes render the *same* underlying `ArtworkPopup` component — they differ only in how they're reached (client-side interception vs. full server render). |
| `app/api/**` | Thin Route Handlers: parse request → call `lib/` → shape response. No handler talks to MongoDB or Cloudinary directly without going through `lib/db` or `lib/cloudinary`. |
| `components/` | Presentation, organized by feature domain (`gallery/`, `artwork/`, `admin/`, `hero/`), plus a domain-agnostic `ui/` for primitives reused across domains. |
| `lib/` | All business logic: database access, auth, media, validation. This is the layer `09-Coding-Standards.md` holds to the strictest testing expectations, since it's where correctness actually matters most. |
| `hooks/` | Client-side state and data-fetching glue between components and the API. |
| `types/` | Shared TypeScript types, kept in sync with `04-Database-Schema.md` and `05-API-Specification.md` by convention — a schema change and its type update ship in the same commit. |
| `scripts/` | One-off operational scripts run manually via `npm run <script>`, never imported by the application itself. |

## 3. Naming Conventions

- **Files:** `PascalCase.tsx` for components, `camelCase.ts` for everything else (`lib/`, `hooks/`, `utils/`).
- **Components:** one component per file; file name matches the exported component name exactly.
- **Route Handlers:** always `route.ts`, per Next.js App Router convention — the directory path *is* the route.
- **Route params:** `[slug]` for artworks (human-readable, SEO- and share-friendly), `[id]` for tag/artwork mutation routes where the raw `ObjectId` is the natural key and no public-facing readability requirement exists. **Next.js constraint:** a single dynamic segment folder (`artworks/[id]/`) serves both GET-by-slug and PATCH/DELETE-by-ObjectId — the handler dispatches by HTTP method and validates the param format accordingly.

## 4. Feature Organization

Components are grouped by **feature domain** (`gallery`, `artwork`, `admin`, `hero`), not by technical type (there is no top-level `components/buttons/`, `components/modals/` split). This is a deliberate choice: when a future feature is added (e.g., `blog/` in `11-Project-Roadmap.md` V2), it becomes a new sibling domain folder that can be reasoned about, tested, and eventually removed as a unit — consistent with the Constitution's "modular design" principle. Only genuinely cross-domain primitives (a generic `Button`, `Modal`, `Badge`) live in `components/ui/`.

## 5. Shared Components & Utilities

Anything used by more than one feature domain belongs in `components/ui/` or `lib/utils/` — never duplicated. The one exception worth calling out explicitly: `SketchReveal.tsx` (the signature loading animation, `06-UI-Design-System.md` §14) lives in `ui/` even though it's currently only used by `gallery/` and `artwork/`, because it's a design-system primitive, not gallery- or artwork-specific logic.

## 6. Configuration

- `next.config.ts` enables `cacheComponents: true` (`02-Technical-Specification.md` §8) and configures the Cloudinary remote image pattern for `next/image`.
- `postcss.config.mjs` sets up Tailwind v4 via `@tailwindcss/postcss`; design tokens from `06-UI-Design-System.md` — colors, spacing, radii, and type scale — are defined in `globals.css` and referenced by name, never hard-coded as raw hex/pixel values in component files.
- `eslint.config.mjs` is the ESLint v9 flat config; it extends `eslint-config-next/core-web-vitals` and `eslint-config-prettier` directly.
- `.env.example` enumerates every variable from `02-Technical-Specification.md` §9 with placeholder values and a one-line comment each — it is kept in sync with that document as a hard rule, not a suggestion.
