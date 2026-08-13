import { applyEnvLocal } from "./load-env";
import { execSync } from "node:child_process";

export default async function globalSetup() {
  applyEnvLocal();

  if (process.env.CI) {
    return;
  }

  if (!process.env.MONGODB_URI) {
    console.warn("MONGODB_URI not set — skipping E2E seed (direct URL test may fail)");
    return;
  }

  execSync("node --use-system-ca ./node_modules/tsx/dist/cli.mjs scripts/seed-e2e.ts", {
    stdio: "inherit",
    env: process.env,
  });
}
