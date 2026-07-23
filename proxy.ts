/**
 * proxy.ts — Next.js 16 Edge Middleware (formerly middleware.ts)
 *
 * This file is a **UX-layer redirect only**. It is NOT the security boundary
 * for admin-protected routes. Every admin Route Handler must independently
 * re-verify the session server-side (see lib/auth/guard.ts).
 *
 * This mitigates CVE-2025-29927, a disclosed vulnerability class where
 * middleware-only session gating in Next.js could be bypassed via a spoofed
 * internal header. See 02-Technical-Specification.md §4 for the full
 * defense-in-depth requirement.
 *
 * TODO: Implement the actual session check here to redirect unauthenticated
 * visitors away from admin-only pages before they render. For now this is a
 * pass-through placeholder.
 */

export { default } from "next/server";