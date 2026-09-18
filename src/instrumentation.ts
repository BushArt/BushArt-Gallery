import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { validateRuntimeEnv } from "@/lib/env";
import { ensureIndexesOnce } from "@/lib/db/indexes";
import { error as logError } from "@/lib/logger";

export async function register() {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  validateRuntimeEnv();

  // Index setup must never run as part of `next build`: the build runs on
  // separate compute from the deployed instance and a deploy must not depend
  // on database reachability (ADR-015).
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
    return;
  }

  try {
    await ensureIndexesOnce();
  } catch (cause) {
    // Non-fatal by design (ADR-015): the service must start and serve even
    // when the database is unreachable — requests that need it already
    // surface 503s. Index creation is idempotent, so the next boot retries.
    logError("Database index setup failed at boot; continuing without verified indexes", {
      error: cause,
    });
  }
}
