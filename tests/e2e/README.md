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
| `accessibility.spec.ts` | Axe-core accessibility — contrast, reduced motion, keyboard flows, fullscreen announcements, security headers | Always mocked via `mockGalleryApis()` |
| `admin-login.spec.ts` | Admin login access control, session auth, login/error paths | Mocked auth callbacks; real server |
| `admin-upload.spec.ts` | Admin artwork upload flow, authenticated write, validation, cancel | Intercepted Cloudinary + real DB |
| `admin-edit-after-login.spec.ts` | Admin edit-after-login: authenticated artwork edit via route integration | Intercepted DB reads/writes |
| `artwork-modal.spec.ts` | Modal entry (in-app + direct URL), Esc/fullscreen stacking, NSFW interstitial, thumbnails, download, share | Mixed — intercept paths use `mockGalleryApis()`; direct URL uses seeded DB |
| `gallery-browse.spec.ts` | Filter URL sync, grid/list toggle, NSFW localStorage persistence | Always mocked via `mockGalleryApis()` |
| `nsfw-toggle.spec.ts` | NSFW toggle, per-artwork NSFW state, gallery persistence after reload | Intercepted gallery + direct URL |

Shared fixtures and route intercepts live in `fixtures.ts`.
