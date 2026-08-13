# 09 — Coding Standards

> **Precedence: 8th.** This document defines how code is written. It ranks above the remaining operational documents (`07`, `08`, `10`, `11`, `12`, `CHANGELOG.md`) because consistent code quality protects every one of them from drifting out of sync with reality.

---

## 1. TypeScript

- **Strict mode is mandatory** (`"strict": true` in `tsconfig.json`, no local overrides).
- `any` is treated as a defect — use `unknown` and narrow, or model the type properly. A PR introducing `any` without a comment explaining why no better type exists should not be merged.
- Prefer `interface` for object shapes that might be extended (component props, document shapes); prefer `type` for unions, intersections, and utility-derived types.
- Shared types live in `src/types/` (`08-Project-Structure.md` §2) and are the single source of truth referenced by both `lib/` and `components/` — never redefined locally per-file.
- API request/response types are derived from the same Zod schemas used for runtime validation (`lib/validation/`) via `z.infer<...>`, so the compile-time type and the runtime check can never silently diverge.

## 2. React

- **Functional components only.** No class components anywhere in the codebase.
- One component per file; the file name matches the component name.
- Props are typed with an explicit `interface`, always named `<ComponentName>Props`.
- Components that don't need default props still declare a typed props interface — never `React.FC` with an untyped or `any`-typed props object.
- Server Components are the default; a component only becomes a Client Component (`"use client"`) when it needs interactivity, browser APIs, or hooks that require it. This isn't a style preference — it directly affects the "Initial JS payload" performance budget in `02-Technical-Specification.md` §13.
- Co-locate a component's tightly-scoped helper functions in the same file; promote a helper to `lib/utils/` only once a second component needs it.

## 3. Next.js

- App Router only, per `02-Technical-Specification.md` §2 — no Pages Router patterns, no `getServerSideProps`/`getStaticProps`.
- Data fetching happens in Server Components or Route Handlers, never via client-side `useEffect` fetches for data that could be rendered server-side — this is both a performance and a simplicity default.
- Caching follows the opt-in `"use cache"` model exactly as scoped in `02-Technical-Specification.md` §8: default to dynamic, add `"use cache"` deliberately, and pair every cached read with an explicit `cacheTag()` the corresponding mutation calls `revalidateTag()` on. A cached read with no corresponding invalidation path is a bug, not an optimization.
- `proxy.ts` (the Next.js 16 edge entry point) is used only for UX-layer redirects (e.g., bouncing an unauthenticated visitor away from rendering admin-only UI before it flashes on screen). **Every** admin Route Handler independently calls the `lib/auth/guard.ts` helper to re-verify the session server-side, regardless of what `proxy.ts` already checked — this is the direct, non-negotiable mitigation for the middleware-bypass vulnerability class documented in `02-Technical-Specification.md` §4. A protected Route Handler that skips this check, even if `proxy.ts` "already covers it," fails code review.

## 4. MongoDB

- All access goes through `lib/db/models/*.ts` — Route Handlers never import the MongoDB driver directly.
- Queries always use the indexes defined in `04-Database-Schema.md`; a new query pattern that doesn't hit an existing index requires either adding an index to that document (in the same PR) or a documented reason it's acceptable to scan.
- `ObjectId` conversion happens at the `lib/db` boundary — everything above that layer (Route Handlers, components) works with plain string ids, never raw `ObjectId` instances, to keep serialization simple and consistent.
- No collection is ever queried or mutated with a hand-built query string; the driver's query builder is used throughout to avoid injection-shaped bugs entirely.

## 5. Tailwind

- Utility classes only — no CSS-in-JS runtime, no ad hoc `<style>` blocks.
- Design tokens (`06-UI-Design-System.md`) are wired into `tailwind.config.ts`; components reference token-derived classes (`bg-ink-900`, `text-paper-100`) rather than arbitrary-value utilities (`bg-[#1B1917]`) — an arbitrary-value color/spacing utility appearing in a component is a signal the token system is missing something, and the fix is to add the token, not repeat the raw value.
- Watch selector specificity when composing classes across a shared base component and a feature-specific wrapper (a known Tailwind footstop called out in `frontend-design` guidance) — prefer `clsx`/conditional class composition over layering competing selectors that can silently cancel out.

## 6. File Naming

See `08-Project-Structure.md` §3 for the full convention table. Summary: `PascalCase.tsx` for components, `camelCase.ts` everywhere else, `route.ts` for handlers (fixed by Next.js).

## 7. Component Naming

- Components are named for what they render, not how they're implemented (`ArtworkPopup`, not `Modal2` or `PopupWrapper`).
- Boolean props are named as questions/states (`isOpen`, `nsfw`, `disabled`), never ambiguous nouns.
- Event handler props are always `on<Event>` (`onUploadComplete`); the corresponding internal handler function is `handle<Event>`.

## 8. Hooks

- Custom hooks are prefixed `use` and live in `src/hooks/` if shared across components, or co-located if genuinely single-use.
- A hook returns an object with named keys for anything beyond a single value (`{ items, isLoading, loadMore }`, not a positional tuple), so call sites stay self-documenting as the hook grows.
- Hooks do not reach into `lib/db` or any server-only module — the client/server boundary is enforced by what each layer is allowed to import, not just by convention.

## 9. API Naming

- Routes are RESTful nouns, plural for collections (`/api/artworks`, `/api/tags`), singular path segments for a specific resource (`/api/artworks/:id`) — exactly as catalogued in `05-API-Specification.md` §10. That table is authoritative; a new route is added there in the same PR that introduces it.
- Query parameters are `camelCase`; JSON field names are `camelCase`, matching the database schema field names one-to-one wherever practical, so no silent renaming happens between the database and the wire format.

## 10. Comments

- Code is written to need few comments: clear names, small functions, one responsibility per module.
- Where a comment is warranted, it explains **why**, not **what** — the "what" should already be legible from the code itself.
- Every exported function in `lib/` gets a one-to-three-line JSDoc comment describing its contract (inputs, return shape, and any side effects like a cache tag it invalidates) — this is the one place comment coverage is a hard requirement, since `lib/` is the layer other code depends on without necessarily reading its implementation.

## 11. Error Handling

- Every Route Handler wraps its logic in a `try/catch` that funnels into the shared error-envelope helper (`05-API-Specification.md` §2) — no handler returns a raw, unshaped error to the client.
- Expected failure modes (validation, not-found, auth) are distinguished from unexpected ones (a thrown exception from a dependency): expected ones map to a specific `code`/status; unexpected ones map to `500 INTERNAL_ERROR` and are logged with full context server-side, but never leak internal detail (stack traces, connection strings) into the client-facing response.
- Client-side, data-fetching hooks distinguish retryable failures (network errors, `5xx`) from terminal ones (`4xx`) and surface them differently, per `03-System-Architecture.md` §10.

## 12. Logging

- Structured, leveled logging (`debug`/`info`/`warn`/`error`) through a single small wrapper — no bare `console.log` left in committed code.
- Logs never include secrets, full request bodies containing credentials, or a plaintext password under any circumstance, even at `debug` level.
- Server-side errors are logged with enough context to diagnose without reproducing (route, relevant ids, error message/stack) — but never with full user-submitted free text (artwork descriptions, bios) beyond what's needed to identify the record.

## 13. Testing Philosophy

Given the Constitution's single-operator scale, testing effort is **risk-weighted rather than blanket-applied**:

| Layer | Expectation |
|---|---|
| `lib/` (business logic, auth, validation, db access) | Unit-tested thoroughly — this is where a silent bug does real damage (data loss, an auth bypass, a broken upload). |
| `app/api/**` (Route Handlers) | Integration-tested against a real (local/test) MongoDB instance for the primary success and failure paths of each endpoint in `05-API-Specification.md`. |
| `components/` | Light, targeted testing — critical interactive components (upload dialog, filter bar, NSFW toggle) get tests for their core behavior; purely presentational components generally don't need dedicated tests. |
| End-to-end | Playwright tests covering flows in `07-User-Flows.md` that would be embarrassing or damaging to break silently: artwork modal entry paths (in-app vs direct URL), Esc/fullscreen stacking, NSFW interstitial, download/share actions, plus (Phase 7+) login, upload. Not exhaustive coverage of every flow. |

**Component tests (Phase 5+):** React components and client hooks under `tests/components/` and `tests/hooks/` run in Vitest with the `jsdom` environment and `@testing-library/react`. Node-only tests (`tests/**/*.test.ts`) remain on the default Node environment. **E2E tests (Phase 6+):** Playwright specs live under `tests/e2e/` with a dedicated `tsconfig.json`; the root `tsconfig.json` excludes them to keep IDE resolution clean.

It's acceptable for test coverage to grow incrementally post-MVP rather than being complete on day one — but `lib/auth/` and `lib/db/models/artwork.ts`'s write paths are the one area where tests are expected **before** a feature touching them is considered done, given how costly a silent bug there would be (Constitution: "long-term maintainability over short-term convenience").

## 14. Git Commit Convention

**Conventional Commits**, enforced by convention (and optionally a commit-lint hook, if the artist wants one — not required for a single-contributor repo):

```
<type>(<scope>): <short summary>

[optional body]

[optional footer, e.g. references to a Decision Log entry]
```

| Type | Use for |
|---|---|
| `feat` | A new user-facing capability |
| `fix` | A bug fix |
| `docs` | Changes to `project-docs/` only |
| `refactor` | Internal restructuring with no behavior change |
| `chore` | Tooling, dependencies, config |
| `test` | Adding or adjusting tests only |

Example: `feat(upload): support direct-to-Cloudinary signed uploads for timelapse video`

A commit that changes both application code and its corresponding documentation (per `README.md` §6's maintenance rule) is acceptable as a single commit spanning both — the rule is that they land together, not that they're necessarily split into separate commits.
