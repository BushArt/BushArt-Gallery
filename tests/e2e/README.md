# BushArt E2E Tests

## Requirements

- `npm run test:e2e:install` — install Chromium once
- **`MONGODB_URI`** must be set for direct-URL tests that hit the real API (local runs seed via `tests/e2e/global-setup.ts`)
- In CI, seed runs automatically when `CI` is set

If `MONGODB_URI` is unset locally, mocked intercept-path tests still run; direct `/artwork/[slug]` visits may fail without a seeded database.

## Spec files

| Spec | What it covers | API mocking |
|---|---|---|
| `artwork-modal.spec.ts` | Modal entry paths (in-app + direct URL), Esc/fullscreen stacking, NSFW interstitial, thumbnails, download, share | Mixed — intercept paths use `mockGalleryApis()`; direct URL uses seeded DB |
| `gallery-browse.spec.ts` | Filter URL sync, grid/list toggle, NSFW localStorage persistence | Always mocked via `mockGalleryApis()` |

Shared fixtures and route intercepts live in `fixtures.ts`.
