#!/usr/bin/env node
/**
 * test-all.mjs
 *
 * Staged local test runner. Each stage runs as a separate child process so a
 * stage failure stops the run at the stage that caused it, each stage gets the
 * isolated database it needs (never the `bushart` app database), and slow stages
 * (build, E2E) can be given more headroom with `--timeout=<ms>`:
 *
 *   1. lint + typecheck (no DB)
 *   2. vitest unit (no live DB; db-setup.test.ts self-skips)
 *   3. vitest component (jsdom, no DB)
 *   4. vitest integration (MONGODB_URI rewritten to bushart-test)
 *   5. coverage gate
 *   6. next build
 *   7. seed-e2e + playwright (MONGODB_URI rewritten to bushart-e2e)
 *   8. test-count guard
 *
 * Atlas TLS on Windows needs the OS certificate store; every child inherits
 * NODE_USE_SYSTEM_CA=1 (defaulted, not forced).
 *
 * Usage:
 *   npm run test:all                        # everything
 *   npm run test:all -- --from=3            # resume at stage 3
 *   npm run test:all -- --only=7            # only stage 7 (e2e)
 *   npm run test:all -- --skip=6            # skip comma-separated stages
 *   npm run test:all -- --timeout=1800000   # per-stage timeout in ms
 *
 * `npm run test:all` loads `.env.local` itself (via `scripts/load-env.mjs`);
 * invoking this file directly (`node scripts/test-all.mjs`) without that file
 * present requires `MONGODB_URI` to already be in the environment — the
 * database-backed stages skip themselves rather than guessing a target.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvLocal } from "./load-env.mjs";

loadEnvLocal();

if (!process.env.NODE_USE_SYSTEM_CA) process.env.NODE_USE_SYSTEM_CA = "1";
mkdirSync("ci-reports", { recursive: true });

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return [m?.[1] ?? a, m?.[2] ?? "1"];
  }),
);
const from = parseInt(args.from ?? "1", 10);
const only = args.only ? parseInt(args.only, 10) : null;
const skip = new Set((args.skip ?? "").split(",").filter(Boolean).map(Number));

const STAGE_TIMEOUT_MS = Number(args.timeout ?? 20 * 60_000);
const APP_URI = process.env.MONGODB_URI ?? "";
function withDb(uri, db) {
  if (!uri) return uri;
  // Replace only the database path segment of a mongodb:// or mongodb+srv://
  // URI, preserving multi-host authorities and query strings.
  return uri.replace(/(\/\/[^/]*\/)[^?]*/, `$1${db}`);
}

const STAGES = [
  { n: 1, name: "lint+typecheck", cmds: [["npm", ["run", "lint"]], ["npx", ["tsc", "--noEmit"]]] },
  {
    n: 2,
    name: "vitest unit (no DB)",
    cmds: [
      [
        "node",
        [
          "./node_modules/vitest/vitest.mjs",
          "run",
          "--project",
          "unit",
          "--reporter=json",
          "--outputFile=ci-reports/vitest-unit.json",
        ],
      ],
    ],
  },
  {
    n: 3,
    name: "vitest component (jsdom, no DB)",
    cmds: [
      [
        "node",
        [
          "./node_modules/vitest/vitest.mjs",
          "run",
          "--project",
          "component",
          "--reporter=json",
          "--outputFile=ci-reports/vitest-component.json",
        ],
      ],
    ],
  },
  {
    n: 4,
    name: "vitest integration (bushart-test)",
    env: { MONGODB_URI: withDb(APP_URI, "bushart-test") },
    cmds: [
      [
        "node",
        [
          "./node_modules/vitest/vitest.mjs",
          "run",
          "--project",
          "integration",
          "--reporter=json",
          "--outputFile=ci-reports/vitest-integration.json",
        ],
      ],
    ],
  },
  {
    n: 5,
    name: "coverage gate",
    env: { MONGODB_URI: withDb(APP_URI, "bushart-test") },
    cmds: [
      [
        "node",
        [
          "./node_modules/vitest/vitest.mjs",
          "run",
          "--coverage",
          "--reporter=default",
          "--reporter=json",
          "--outputFile=ci-reports/vitest.json",
        ],
      ],
    ],
  },
  { n: 6, name: "next build", cmds: [["node", ["./node_modules/next/dist/bin/next", "build"]]] },
  {
    n: 7,
    name: "seed-e2e + playwright (bushart-e2e)",
    env: {
      MONGODB_URI: withDb(APP_URI, "bushart-e2e"),
      PLAYWRIGHT_JSON_OUTPUT_FILE: resolve("ci-reports/playwright.json"),
    },
    cmds: [
      ["node", ["./node_modules/tsx/dist/cli.mjs", "scripts/seed-e2e.ts"]],
      ["node", ["./node_modules/playwright/cli.js", "test", "--reporter=list,json"]],
    ],
  },
  {
    n: 8,
    name: "test-count guard",
    cmds: [
      [
        "node",
        [
          "scripts/check-test-counts.mjs",
          "ci-reports/vitest.json",
          "ci-reports/playwright.json",
        ],
      ],
    ],
  },
];

let failed = 0;
for (const stage of STAGES) {
  if (only !== null && stage.n !== only) continue;
  if (stage.n < from || skip.has(stage.n)) {
    console.log(`[test-all] stage ${stage.n} (${stage.name}): skipped`);
    continue;
  }
  if (stage.env?.MONGODB_URI === "") {
    console.log(`[test-all] stage ${stage.n} (${stage.name}): skipped (MONGODB_URI unset)`);
    continue;
  }
  console.log(`[test-all] stage ${stage.n}/${STAGES.length}: ${stage.name}`);
  for (const [cmd, cmdArgs] of stage.cmds) {
    const r = spawnSync(cmd, cmdArgs, {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: { ...process.env, ...stage.env },
      timeout: STAGE_TIMEOUT_MS,
    });
    if ((r.status ?? 1) !== 0 || r.error) {
      const why = r.error ? ` (${r.error.code ?? r.error.message})` : "";
      console.error(`[test-all] FAILED: ${cmd} ${cmdArgs.join(" ")} (exit ${r.status})${why}`);
      failed += 1;
      break;
    }
  }
  if (failed) break;
}
console.log(failed ? "[test-all] RESULT: FAIL" : "[test-all] RESULT: PASS");
process.exit(failed ? 1 : 0);
