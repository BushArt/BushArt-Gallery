import type { NextConfig } from "next";

/**
 * Browser bundles only receive NEXT_PUBLIC_* env vars. Mirror the server
 * cloud name when the public copy is omitted so local .env.local files that
 * only set CLOUDINARY_CLOUD_NAME still work (see 02-Technical-Specification §9).
 */
const publicCloudName =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME ?? "";

/**
 * CSP nonce was evaluated and rejected — see the note on `style-src` below.
 *
 * Next.js supports per-request nonces via proxy.ts, but a nonce requires
 * dynamic rendering: Next.js can only attach a request-scoped nonce to the
 * document it renders for that request. This app sets `cacheComponents: true`
 * and relies on static/partial prerendering, so adopting nonces would opt every
 * route into full dynamic rendering and discard that benefit across the whole
 * site.
 */

/**
 * `script-src` MUST retain `'unsafe-inline'`.
 *
 * The Next.js App Router streams its RSC payload through inline
 * `<script>self.__next_f.push(...)</script>` tags. Those tags cannot carry a
 * hash or SRI integrity, and a per-request nonce is not an option here: a nonce
 * forces the document into dynamic rendering, which would discard the partial
 * prerendering that `cacheComponents: true` (below) exists to enable. Without
 * `'unsafe-inline'` (and with no nonce) the browser blocks those inline scripts
 * and the page never hydrates — see vercel/next.js#95353. The earlier claim that
 * "there is no build-time inline script" was incorrect for the App Router.
 *
 * `'unsafe-eval'` stays out of production: the app never generates code at
 * runtime (no eval / new Function). It is re-added in development only, where
 * the bundler's dev/HMR runtime relies on eval.
 *
 * `style-src` likewise keeps `'unsafe-inline'`: Tailwind v4 and next/font emit
 * runtime-injected <style> elements and React inlines style attributes (e.g.
 * the aspect-ratio on gallery cards). An injected <style> cannot execute
 * script, so this carries no XSS risk.
 *
 * `object-src 'none'` closes the plugin/embed vector the other directives
 * never covered.
 */
const isDevelopment = process.env.NODE_ENV === "development";
const scriptSource = isDevelopment
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  scriptSource,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "media-src 'self' blob: https://res.cloudinary.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.cloudinary.com https://res.cloudinary.com",
].join("; ");

/**
 * HSTS.
 *
 * Sent by the app rather than relying on Render's edge, so the guarantee is
 * verifiable from `next.config.ts` and identical across every deployment target
 * (Render, a container, or bare `next start`). `preload` is included per the
 * plan; see project-docs/02-Technical-Specification.md §12.
 *
 * Only meaningful over HTTPS — browsers ignore the header on plain HTTP,
 * so local development is unaffected.
 */
const strictTransportSecurity = "max-age=31536000; includeSubDomains; preload";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: strictTransportSecurity },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  env: {
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: publicCloudName,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;