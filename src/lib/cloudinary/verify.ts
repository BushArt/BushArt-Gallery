import "server-only";

import { getCloudinary } from "./client";

/**
 * Server-side Cloudinary asset verification.
 *
 * The upload signature (05-API-Specification.md §6.1) constrains the *folder*
 * an upload may land in, but it does not let the server prove afterwards that a
 * given `publicId` really exists in this cloud or really belongs to the app's
 * namespace. Without that proof an admin request (or anything that gets past
 * `requireAdmin`) can persist an artwork document referencing assets that were
 * never uploaded — a phantom image, or an asset owned by an unrelated tenant of
 * the same cloud.
 *
 * `verifyAssetOwnership` closes that gap by asking the Cloudinary Admin API
 * whether the resource exists and reporting which folder it actually lives in.
 * Callers must treat a missing/foreign asset as a client error (400), and must
 * never derive the stored URL from client input.
 */

export type VerifiedResourceType = "image" | "video";

/** Prefix every app-owned asset must live under. */
export const ASSET_NAMESPACE = "bushart/";

export interface AssetRef {
  publicId: string;
  resourceType: VerifiedResourceType;
}

export type AssetRejectionReason = "missing" | "foreign";

export interface AssetRejection {
  publicId: string;
  resourceType: VerifiedResourceType;
  reason: AssetRejectionReason;
}

export type AssetVerificationResult =
  | { ok: true; verified: AssetRef[] }
  | { ok: false; rejected: AssetRejection[] };

/** Shape of the subset of the Admin API resource payload we rely on. */
interface CloudinaryResourcePayload {
  asset_id?: string;
  public_id?: string;
  asset_folder?: string;
  folder?: string;
  [key: string]: unknown;
}

/**
 * Cloudinary reports a missing resource as an HTTP error from `api.resource`.
 * The SDK surfaces the status on `error.http_code`; older/edge shapes only
 * carry `error.status`. Accept either so a 404 is never mistaken for a
 * transient failure (and vice versa).
 */
function httpStatusOf(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const candidate = error as {
    http_code?: unknown;
    status?: unknown;
    statusCode?: unknown;
  };
  for (const value of [candidate.http_code, candidate.status, candidate.statusCode]) {
    if (typeof value === "number") return value;
  }
  return undefined;
}

/**
 * Derive the folder a resource lives in.
 *
 * Cloudinary's Admin API returns `asset_folder` for assets under an asset
 * folder and a `folder` path (leading slash) otherwise. Normalising both here
 * keeps the ownership comparison in one place.
 */
function resolveAssetFolder(payload: CloudinaryResourcePayload): string {
  if (typeof payload.asset_folder === "string" && payload.asset_folder.length > 0) {
    return payload.asset_folder;
  }
  if (typeof payload.folder === "string") {
    return payload.folder.replace(/^\/+/, "").replace(/\/+$/, "");
  }
  // Fall back to the public id's leading path segment when neither is present.
  const publicId = typeof payload.public_id === "string" ? payload.public_id : "";
  return publicId.split("/").slice(0, -1).join("/");
}

/**
 * Resolve a client-supplied public id against the Admin API.
 *
 * @returns the canonical public id from Cloudinary, or null when the resource
 *          does not exist in this cloud.
 * @throws  when the Admin API is unreachable — a transient failure must not be
 *          reported as "missing", or a valid upload would be rejected.
 */
async function lookupResource(publicId: string, resourceType: VerifiedResourceType) {
  const cld = getCloudinary();
  try {
    const payload = (await cld.api.resource(publicId, {
      resource_type: resourceType,
    })) as CloudinaryResourcePayload;
    return payload;
  } catch (error) {
    const status = httpStatusOf(error);
    if (status === 404) return null;
    throw error;
  }
}

/**
 * Verify a single asset exists and lives inside the app's `bushart/` namespace.
 *
 * @returns the rejection reason, or null when the asset is acceptable.
 */
export async function verifyAssetOwnership(
  asset: AssetRef,
): Promise<AssetRejection | null> {
  const payload = await lookupResource(asset.publicId, asset.resourceType);

  if (!payload) {
    return { ...asset, reason: "missing" };
  }

  const folder = resolveAssetFolder(payload);
  if (!folder.startsWith(ASSET_NAMESPACE)) {
    return { ...asset, reason: "foreign" };
  }

  return null;
}

/**
 * Verify every asset referenced by an artwork write.
 *
 * Duplicated public ids are collapsed so a repeated reference costs one Admin
 * API call rather than one per occurrence.
 */
export async function verifyAssetOwnershipAll(
  assets: AssetRef[],
): Promise<AssetVerificationResult> {
  const unique = new Map<string, AssetRef>();
  for (const asset of assets) {
    unique.set(`${asset.resourceType}:${asset.publicId}`, asset);
  }

  const results = await Promise.all(
    [...unique.values()].map((asset) => verifyAssetOwnership(asset)),
  );

  const rejected = results.filter((result): result is AssetRejection => result !== null);
  if (rejected.length > 0) {
    return { ok: false, rejected };
  }

  return { ok: true, verified: [...unique.values()] };
}

/** Human-readable detail for the client, grouped by failure reason. */
export function describeAssetRejections(rejected: AssetRejection[]): {
  missing: string[];
  foreign: string[];
} {
  return {
    missing: rejected.filter((r) => r.reason === "missing").map((r) => r.publicId),
    foreign: rejected.filter((r) => r.reason === "foreign").map((r) => r.publicId),
  };
}