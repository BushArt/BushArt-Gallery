import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import { SiteSettingsSchema } from "@/lib/validation/settings";
import { info, warn } from "@/lib/logger";
import type { SiteSettings } from "@/types/settings";

export const SINGLETON_SETTINGS_ID = new ObjectId("000000000000000000000001");

interface SiteSettingsDoc {
  _id: ObjectId;
  artistName: string;
  tagline: string | null;
  biography: string | null;
  profileImage: SiteSettings["profileImage"];
  bannerImage: SiteSettings["bannerImage"];
  socialLinks: SiteSettings["socialLinks"];
  contactEmail: string | null;
  contactUrl: string | null;
  updatedAt: Date;
}

/**
 * The singleton's stored fields, normalised so a legacy document that predates
 * the fixed `_id` (H5) can be copied across without carrying `undefined`s.
 */
const SETTINGS_FIELDS = [
  "artistName",
  "tagline",
  "biography",
  "profileImage",
  "bannerImage",
  "socialLinks",
  "contactEmail",
  "contactUrl",
] as const;

/**
 * Loads the singleton settings document, falling back to the newest document
 * written before the fixed `_id` existed.
 *
 * H5 keyed `site_settings` on {@link SINGLETON_SETTINGS_ID} so concurrent
 * upserts can never create a second document. A document written before that
 * change carries an arbitrary `_id`, so filtering on the singleton id alone
 * would report an empty zero-state for settings that really exist — and the
 * next PATCH would insert a second document next to the lost one.
 */
async function findSettingsDoc(
  col: Collection<SiteSettingsDoc>,
): Promise<SiteSettingsDoc | null> {
  const singleton = await col.findOne({ _id: SINGLETON_SETTINGS_ID });
  if (singleton) return singleton;
  const [legacy] = await col
    .find({ _id: { $ne: SINGLETON_SETTINGS_ID } })
    .sort({ updatedAt: -1 })
    .limit(1)
    .toArray();
  return legacy ?? null;
}

function settingsFieldDefaults(doc: SiteSettingsDoc | null): Record<string, unknown> {
  if (!doc) return {};
  const out: Record<string, unknown> = {};
  for (const field of SETTINGS_FIELDS) {
    const value = doc[field];
    if (value !== undefined) out[field] = value;
  }
  return out;
}

export async function findSettings(): Promise<SiteSettings | null> {
  const db = await getDb();
  const doc = await findSettingsDoc(
    db.collection<SiteSettingsDoc>("site_settings"),
  );
  if (!doc) return null;
  return {
    artistName: doc.artistName,
    tagline: doc.tagline,
    biography: doc.biography,
    profileImage: doc.profileImage,
    bannerImage: doc.bannerImage,
    socialLinks: doc.socialLinks,
    contactEmail: doc.contactEmail,
    contactUrl: doc.contactUrl,
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function upsertSettings(data: Partial<SiteSettings>): Promise<SiteSettings> {
  const db = await getDb();
  const now = new Date();

  const validated = SiteSettingsSchema.partial().strip().parse({
    ...data,
    updatedAt: now.toISOString(),
  });

  const { updatedAt: _stripped, ...validatedFields } = validated;
  const col = db.collection<SiteSettingsDoc>("site_settings");

  // Carry the stored values across when this is the first write after the
  // singleton `_id` was introduced (or a later partial PATCH).
  const existing = await findSettingsDoc(col);
  const setData: Record<string, unknown> = {
    ...settingsFieldDefaults(existing),
    ...validatedFields,
    updatedAt: now,
  };

  await col.updateOne(
    { _id: SINGLETON_SETTINGS_ID },
    { $set: setData },
    { upsert: true },
  );

  // The pre-singleton document has been copied into the singleton above —
  // retire it (and any other strays) so the collection really is a singleton.
  // Only reached after the singleton write succeeded, so no data can be lost;
  // a failure here is logged rather than failing an already-persisted PATCH.
  if (existing && !existing._id.equals(SINGLETON_SETTINGS_ID)) {
    try {
      await col.deleteMany({ _id: { $ne: SINGLETON_SETTINGS_ID } });
      info("Adopted legacy site_settings document into the singleton", {
        legacyId: existing._id.toHexString(),
      });
    } catch (cause) {
      warn("Legacy site_settings document could not be retired", {
        error: cause,
      });
    }
  }

  const updated = await col.findOne({
    _id: SINGLETON_SETTINGS_ID,
  });
  if (!updated) throw new Error("Failed to upsert site settings");

  return {
    artistName: updated.artistName,
    tagline: updated.tagline,
    biography: updated.biography,
    profileImage: updated.profileImage,
    bannerImage: updated.bannerImage,
    socialLinks: updated.socialLinks,
    contactEmail: updated.contactEmail,
    contactUrl: updated.contactUrl,
    updatedAt: updated.updatedAt.toISOString(),
  };
}
