import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Loads `.env.local` into `process.env` for standalone scripts, without
 * overriding values that are already set — matching `applyEnvLocal()` in
 * `tests/e2e/load-env.ts`.
 *
 * The file is absent on Render by design (gitignored; the dashboard supplies
 * runtime variables there), so this is always a safe no-op in production
 * (ADR-015). Replaces Node's `--env-file-if-exists` CLI flag, which is only
 * available on newer runtimes.
 */
export function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}