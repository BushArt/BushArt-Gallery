import { defineConfig } from "vitest/config";
import path from "path";
import { loadEnvLocal } from "./scripts/load-env.mjs";

// Vitest does not read `.env.local` itself, so a plain `npm test` used to start
// with no MONGODB_URI at all: every DB-backed test fell back to
// mongodb://localhost:27017, hung in server selection for 30s, and surfaced as
// a 10s hookTimeout with no hint of the real cause. Load it exactly the way
// `scripts/test-all.mjs` does (never overriding an already-set variable).
loadEnvLocal();

/**
 * Returns MONGODB_URI with its database segment forced to a test database.
 *
 * Safety rule (`project-docs/Testing-Infrastructure.md` §5): a Vitest run must
 * never be able to touch the application database. Any URI whose database does
 * not already end in `-test` is rewritten to `bushart-test` — the same
 * per-stage rewrite `test-all` performs (`bushart-e2e` is Playwright-only).
 */
function testMongoUri(): string | undefined {
  const uri = process.env.MONGODB_URI;
  if (!uri) return undefined;
  const dbPath = (uri.match(/^mongodb(?:\+srv)?:\/\/[^/]*\/([^?]*)/) || [])[1];
  if (dbPath === undefined || dbPath.endsWith("-test")) return uri;
  return uri.replace(/(\/\/[^/]*\/)[^?]*/, "$1bushart-test");
}

const MONGODB_URI = testMongoUri();
if (MONGODB_URI) process.env.MONGODB_URI = MONGODB_URI;
// Atlas TLS on Windows may need the OS certificate store; `test-all` defaults
// the same variable (defaulted, not forced). Workers are fresh processes, so
// they pick it up at bootstrap even though this process is already running.
if (!process.env.NODE_USE_SYSTEM_CA) process.env.NODE_USE_SYSTEM_CA = "1";

const coverageThresholds = {
  lines: 85,
  functions: 85,
  branches: 80,
  statements: 85,
};

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 15_000,
    // Atlas round-trips in the `integration` project can exceed Vitest's
    // default 10s hook budget on a cold connection; a reachable-but-slow
    // database must not be reported as a hook timeout.
    hookTimeout: 30_000,
    // Computed from process.env above (incl. `.env.local`) so forked workers
    // inherit the same target regardless of how Vitest spawns them.
    env: MONGODB_URI ? { MONGODB_URI } : {},
    // The DB-backed files in `tests/api/**` share a single database and clear
    // collections in `beforeEach`, so two files running at once delete each
    // other's seeded documents and collide on unique indexes
    // (artworks_slug_unique, tags_slug_unique, admins_username_unique).
    // Pool options such as `maxWorkers` are only honoured at the root config
    // level, so parallelism is disabled here rather than per project.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      include: [
        "src/lib/auth/**",
        "src/lib/db/models/**",
        "src/lib/cloudinary/**",
        "src/app/api/**",
        "src/instrumentation.ts",
      ],
      exclude: [
        "src/lib/auth/index.ts",
      ],
      thresholds: {
        ...coverageThresholds,
        "src/lib/auth/**": coverageThresholds,
        "src/lib/db/models/artwork.ts": coverageThresholds,
        "src/app/api/artworks/**": coverageThresholds,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/**/*.test.ts"],
          exclude: ["tests/api/**", "tests/db-setup.test.ts"],
        },
      },
      {
        // Files that share the real MongoDB connection must run one at a time:
        // concurrent clearCollections() calls wipe each other's seeded documents.
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/api/**/*.test.ts", "tests/db-setup.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "component",
          environment: "jsdom",
          include: ["tests/**/*.test.tsx"],
        },
      },
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
