/**
 * Structured, leveled logging wrapper for BushArt.
 *
 * Philosophy (per 09-Coding-Standards.md §12):
 * - No bare console.* left in committed code
 * - Logs never include secrets, full request bodies containing credentials,
 *   or a plaintext password under any circumstance, even at debug level
 * - Server-side errors are logged with enough context to diagnose without
 *   reproducing (route, relevant ids, error message/stack) — but never with
 *   full user-submitted free text beyond what's needed to identify the record
 *
 * Usage:
 *   import { info, warn, error, debug } from "@/lib/logger";
 *   info("Route handler entered", { route: "/api/artworks" });
 *   error("Database query failed", { route: "GET /api/artworks", error });
 */

// Environment check: only enable debug logging in non-production
const IS_DEBUG = process.env.NODE_ENV !== "production";

const levelValues: Record<string, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel: number = IS_DEBUG ? levelValues["debug"] : levelValues["info"];

/**
 * Check if the current level verbosity allows this message through.
 */
function shouldLog(level: number): boolean {
  return level <= currentLevel;
}

const SENSITIVE_KEYS = ["password", "passwordHash", "secret", "apiKey", "token"];

/**
 * Recursively sanitize a value, masking known-sensitive keys and converting
 * Error instances into a serializable shape (JSON.stringify drops Error's own
 * enumerable props, so we must extract message/stack/name explicitly).
 * Sensitive-key masking applies at every nesting depth, not just the top level.
 */
function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (Array.isArray(value)) {
    if (depth > 4) return "[Array]";
    return value.map((v) => sanitizeValue(v, depth + 1));
  }

  if (value !== null && typeof value === "object") {
    if (depth > 4) return "[Object]";
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
        // Replace sensitive values with mask rather than omitting entirely
        // so the key exists but value is obfuscated
        out[key] = "***MASKED***";
      } else {
        out[key] = sanitizeValue(val, depth + 1);
      }
    }
    return out;
  }

  return value;
}

/**
 * Format a standardized log message with timestamp and level.
 */
function formatMessage(level: string, message: string, context?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const base = `${timestamp} [${level.toUpperCase()}] ${message}`;

  if (!context || Object.keys(context).length === 0) {
    return base;
  }

  // Safely stringify context, stripping potential sensitive fields.
  // Never let a serialization failure take down the error path.
  try {
    return `${base} ${JSON.stringify(sanitizeValue(context))}`;
  } catch {
    return `${base} [unserializable context]`;
  }
}

/**
 * Log at error level — always emits (level 0 is highest priority)
 * Used for unhandled errors, failures that need immediate attention.
 */
export function error(message: string, context?: Record<string, unknown>): void {
  if (!shouldLog(levelValues["error"])) return;
  console.error(formatMessage("error", message, context));
}

/**
 * Log at warn level — for recoverable issues, deprecation warnings, etc.
 */
export function warn(message: string, context?: Record<string, unknown>): void {
  if (!shouldLog(levelValues["warn"])) return;
  console.warn(formatMessage("warn", message, context));
}

/**
 * Log at info level — for general runtime information, request tracking.
 */
export function info(message: string, context?: Record<string, unknown>): void {
  if (!shouldLog(levelValues["info"])) return;
  console.info(formatMessage("info", message, context));
}

/**
 * Log at debug level — for detailed diagnostics, only in development.
 * Never enable in production per 02-Technical-Specification.md §11 (no paid
 * dependencies/services by default, and debug logging could expose internals).
 */
export function debug(message: string, context?: Record<string, unknown>): void {
  if (!shouldLog(levelValues["debug"])) return;
  console.debug(formatMessage("debug", message, context));
}
