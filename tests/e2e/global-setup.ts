import { applyEnvLocal } from "./load-env";
import { execSync } from "node:child_process";

export default async function globalSetup() {
  applyEnvLocal();

  if (process.env.CI) {
    return;
  }

  if (!process.env.MONGODB_URI) {
    console.warn(
      "E2E setup: MONGODB_URI is not set — skipping DB seed. Direct URL tests against real API will fail. See tests/e2e/README.md.",
    );
    return;
  }

  execSync("node --use-system-ca ./node_modules/tsx/dist/cli.mjs scripts/seed-e2e.ts", {
    stdio: "inherit",
    env: process.env,
  });
}
