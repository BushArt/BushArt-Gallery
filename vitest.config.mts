import { defineConfig } from "vitest/config";
import path from "path";

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
        "src/lib/db/models/artwork.ts",
        "src/app/api/artworks/**",
      ],
      exclude: [
        "src/lib/auth/session.ts",
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
