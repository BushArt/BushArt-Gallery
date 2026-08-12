import { vi } from "vitest";

// server-only throws when imported outside a Server Component context.
// Vitest runs in Node, so mock it as a no-op for modules that use the guard.
vi.mock("server-only", () => ({}));
