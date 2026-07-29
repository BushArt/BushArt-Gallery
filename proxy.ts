/**
 * proxy.ts — Next.js 16 Edge Middleware
 *
 * UX-layer redirect only. This file MUST NOT be treated as the security
 * boundary for admin-protected routes. Every admin Route Handler must
 * independently re-verify the session server-side (see lib/auth/guard.ts).
 *
 * This mitigates CVE-2025-29927, a disclosed vulnerability class where
 * middleware-only session gating in Next.js could be bypassed via a spoofed
 * internal header. See 02-Technical-Specification.md §4 for the full
 * defense-in-depth requirement.
 *
 * Phase 1 ships this as a pass-through so the middleware matchers/config
 * are in place when Phase 7 builds the admin UI. TODO-023/TODO-009 will
 * replace this with actual session-based redirects.
 */

export { default } from "next/server";
