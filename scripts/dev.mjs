#!/usr/bin/env node
/**
 * dev.mjs
 *
 * Local `npm run dev` entry point. Ensures Node uses the OS certificate store
 * (equivalent to manually running `$env:NODE_USE_SYSTEM_CA='1'; npm run dev`)
 * so Atlas TLS works on Windows without any per-shell setup. The variable is
 * only defaulted, never forced: an explicitly set value is respected. On
 * Linux/Render this is a harmless no-op.
 *
 * Usage: npm run dev [-- --port 3111 ...]
 */
import { spawn } from "node:child_process";

if (!process.env.NODE_USE_SYSTEM_CA) {
  process.env.NODE_USE_SYSTEM_CA = "1";
}

const child = spawn(
  process.execPath,
  ["./node_modules/next/dist/bin/next", "dev", ...process.argv.slice(2)],
  { stdio: "inherit", env: process.env },
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
