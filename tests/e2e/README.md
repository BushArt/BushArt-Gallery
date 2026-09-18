# BushArt E2E Tests

## Requirements

- `npm run test:e2e:install` — install Chromium once
- **`MONGODB_URI`** must name a test database (`bushart-e2e` locally, see CI) for direct-URL tests that hit the real API (local runs seed via `tests/e2e/global-setup.ts`); `seed-e2e.ts` refuses any other database
  - Set it in the shell/process, not only in `.env.local`: an explicitly provided `MONGODB_URI` wins, and `.env.local` is the fallback (its value points at the application database). `npm run test:all` rewrites it to `bushart-e2e` for this stage.
- In CI, the workflow seeds explicitly via `scripts/seed-e2e.ts` before Playwright runs

If `MONGODB_URI` is unset locally, mocked intercept-path tests still run; direct `/artwork/[slug]` visits may fail without a seeded database.

## Spec files

| Spec | What it covers | API mocking |
|---|---|---|
| `artwork-modal.spec.ts` | Modal entry paths (in-app + direct URL), Esc/fullscreen stacking, NSFW interstitial, thumbnails, download, share | Mixed — intercept paths use `mockGalleryApis()`; direct URL uses seeded DB |
| `gallery-browse.spec.ts` | Filter URL sync, grid/list toggle, NSFW localStorage persistence | Always mocked via `mockGalleryApis()` |

Shared fixtures and route intercepts live in `fixtures.ts`.
