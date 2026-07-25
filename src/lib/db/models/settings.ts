import { getDb } from "@/lib/db/mongodb";
import type { SiteSettings } from "@/types/settings";

// ── Internal MongoDB document shape ───────────────────────────────────────

interface SiteSettingsDoc {
  _id: import("mongodb").ObjectId;
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

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Find the singleton site settings document.
 *
 * @returns The settings document, or null if none exists yet.
 */
export async function findSettings(): Promise<SiteSettings | null> {
  const db = await getDb();
  const doc = await db.collection<SiteSettingsDoc>("site_settings").findOne({});
  if (!doc) return null;
  return {
    id: doc._id.toHexString(),
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

/**
 * Create or update the site settings singleton.
 *
 * @param data - Partial settings to apply; omitted fields keep existing values on update.
 * @returns The resulting settings document.
 */
export async function upsertSettings(data: Partial<SiteSettings>): Promise<SiteSettings> {
  const db = await getDb();
  const now = new Date();

  const setData: Record<string, unknown> = { updatedAt: now };
  if (data.artistName !== undefined) setData.artistName = data.artistName;
  if (data.tagline !== undefined) setData.tagline = data.tagline;
  if (data.biography !== undefined) setData.biography = data.biography;
  if (data.profileImage !== undefined) setData.profileImage = data.profileImage;
  if (data.bannerImage !== undefined) setData.bannerImage = data.bannerImage;
  if (data.socialLinks !== undefined) setData.socialLinks = data.socialLinks;
  if (data.contactEmail !== undefined) setData.contactEmail = data.contactEmail;
  if (data.contactUrl !== undefined) setData.contactUrl = data.contactUrl;

  await db.collection<SiteSettingsDoc>("site_settings").updateOne(
    {},
    { $set: setData },
    { upsert: true },
  );

  const updated = await db.collection<SiteSettingsDoc>("site_settings").findOne({});
  if (!updated) throw new Error("Failed to upsert site settings");

  return {
    id: updated._id.toHexString(),
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