import { randomBytes } from "node:crypto";
import { findArtworkBySlug } from "@/lib/db/models/artwork";
import { slugifyOrDefault } from "@/lib/utils/slugify";

/** Suffix hex length appended to the base slug on collision. */
const SUFFIX_LENGTH = 4;

/**
 * Upper bound on pre-insert collision probes.
 *
 * The read loop below is only a best-effort de-duplication: the authoritative
 * uniqueness guarantee is the `artworks_slug_unique` index, and POST retries on
 * duplicate-key (11000). Bounding the loop keeps a pathological case (many
 * existing slugs, or a slug base that keeps colliding) from spinning forever
 * and holding a request open.
 */
const MAX_PROBE_ATTEMPTS = 8;

/** Thrown when the bounded slug probe loop exhausts without a free candidate. */
export class SlugGenerationError extends Error {
  constructor(title: string) {
    super(`Could not derive a unique slug for "${title}" after ${MAX_PROBE_ATTEMPTS} attempts`);
    this.name = "SlugGenerationError";
  }
}

function randomSuffix(length = SUFFIX_LENGTH): string {
  const bytes = randomBytes(length);
  return bytes.toString("hex").slice(0, length);
}

/**
 * Derive a unique artwork slug from a title, appending a short random suffix on collision.
 *
 * Bounded to {@link MAX_PROBE_ATTEMPTS} probes; throws {@link SlugGenerationError}
 * rather than looping indefinitely.
 */
export async function generateUniqueArtworkSlug(title: string): Promise<string> {
  const base = slugifyOrDefault(title, "artwork");

  // Attempt 0 uses the bare base slug; each retry appends a fresh random suffix.
  for (let attempt = 0; attempt < MAX_PROBE_ATTEMPTS; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${randomSuffix()}`;
    const existing = await findArtworkBySlug(candidate, true);
    if (!existing) {
      return candidate;
    }
  }

  throw new SlugGenerationError(title);
}