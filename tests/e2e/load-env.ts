import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadEnvLocal(): Record<string, string> {
  const envPath = resolve(process.cwd(), ".env.local");
  const result: Record<string, string> = {};

  if (!existsSync(envPath)) return result;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key) result[key] = value;
  }

  return result;
}

export function applyEnvLocal() {
  for (const [key, value] of Object.entries(loadEnvLocal())) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
