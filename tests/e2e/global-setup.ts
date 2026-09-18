import { applyEnvLocal } from "./load-env";
import { execSync } from "node:child_process";

export default async function globalSetup() {
  applyEnvLocal();

  if (!process.env.MONGODB_URI) {
    console.warn(
      "E2E setup: MONGODB_URI is not set — skipping DB seed. Direct URL tests against real API will fail. See tests/e2e/README.md.",
    );
    return;
  }

  // seed-e2e.ts refuses non-test databases (TODO-038), so a local .env.local
  // pointing at the app DB can never be seeded by accident.
  execSync("node ./node_modules/tsx/dist/cli.mjs scripts/seed-e2e.ts", {
    stdio: "inherit",
    env: process.env,
  });
}
