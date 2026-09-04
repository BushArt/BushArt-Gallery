import { validateRuntimeEnv } from "@/lib/env";

export function register() {
  if (process.env.NODE_ENV !== "test") {
    validateRuntimeEnv();
  }
}
