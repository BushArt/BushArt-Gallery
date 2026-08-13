# BushArt E2E Tests

## Requirements

- `npm run test:e2e:install` — install Chromium once
- **`MONGODB_URI`** must be set for direct-URL tests that hit the real API (local runs seed via `tests/e2e/global-setup.ts`)
- In CI, seed runs automatically when `CI` is set

If `MONGODB_URI` is unset locally, mocked intercept-path tests still run; direct `/artwork/[slug]` visits may fail without a seeded database.
