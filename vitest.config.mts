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
