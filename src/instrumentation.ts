import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { validateRuntimeEnv } from "@/lib/env";
import { ensureIndexesOnce } from "@/lib/db/indexes";
import { setIndexesVerified } from "@/lib/db/indexReady";
import { error as logError } from "@/lib/logger";

export async function register() {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  validateRuntimeEnv();

  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
    return;
  }

  try {
    await ensureIndexesOnce();
    setIndexesVerified();
  } catch (cause) {
    logError("Database index setup failed at boot; continuing without verified indexes", {
      error: cause,
    });
  }
}
