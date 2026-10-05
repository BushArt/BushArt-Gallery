import "server-only";

import { getCloudinary } from "./client";

/**
 * Generate a short-lived, scoped upload signature for direct Cloudinary uploads.
 *
 * The signature authorizes the browser to upload directly to Cloudinary
 * without the server ever handling file bytes. The API secret never leaves
 * this module.
 *
 * @returns Signature payload matching 05-API-Specification.md §6.1
 */

export const UPLOAD_FOLDER = "bushart/uploads";

/** Image formats a signed upload may produce. */
export const IMAGE_ALLOWED_FORMATS = "jpg,jpeg,png,gif,webp,avif";

/** Video formats a signed upload may produce. */
export const VIDEO_ALLOWED_FORMATS = "mp4,mov,webm";

export const UPLOAD_MAX_FILE_SIZE = 50 * 1024 * 1024;

export class FolderValidationError extends Error {
  constructor(folder: string) {
    super(`Invalid folder: must start with "bushart/uploads/", got "${folder}"`);
    this.name = "FolderValidationError";
  }
}

export function validateFolder(folder: string): void {
  if (folder !== UPLOAD_FOLDER) {
    throw new FolderValidationError(folder);
  }
}

export interface SignUploadSignatureParams {
  resourceType: "image" | "video";
}

export interface SignUploadSignatureResult {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  /**
   * The remaining signed parameters. Cloudinary recomputes the signature from
   * the parameters actually present in the upload request, so every signed
   * field MUST be echoed back by the client or the upload is rejected with
   * "Invalid Signature". These are returned so the client forwards the exact
   * values that were signed.
   */
  allowedFormats: string;
  maxFileSize: number;
  overwrite: boolean;
  uniqueFilename: boolean;
  /**
   * The signed `resource_type`, present only for video uploads.
   *
   * `signUploadSignature` signs `resource_type` when the resource type is not
   * `image`; Cloudinary recomputes the signature from the parameters actually
   * present in the upload request, so a signed field that the client omits makes
   * the whole signature mismatch and the upload is rejected. Returning it here
   * lets the client echo back exactly what was signed — see
   * `uploadFileToCloudinary`.
   */
  resourceType?: "video";
}

export async function signUploadSignature(
  params: SignUploadSignatureParams,
): Promise<SignUploadSignatureResult> {
  const folder = UPLOAD_FOLDER;

  const timestamp = Math.floor(Date.now() / 1000);

  const allowedFormats =
    params.resourceType === "video" ? VIDEO_ALLOWED_FORMATS : IMAGE_ALLOWED_FORMATS;

  const signableParams: Record<string, string> = {
    folder,
    timestamp: String(timestamp),
    allowed_formats: allowedFormats,
    max_file_size: String(UPLOAD_MAX_FILE_SIZE),
    overwrite: "false",
    unique_filename: "true",
  };

  if (params.resourceType !== "image") {
    signableParams.resource_type = params.resourceType;
  }

  const cloudinary = getCloudinary();
  const apiSecret = cloudinary.config().api_secret!;
  const signature = cloudinary.utils.api_sign_request(signableParams, apiSecret);

  return {
    signature,
    timestamp,
    apiKey: cloudinary.config().api_key!,
    cloudName: cloudinary.config().cloud_name!,
    folder,
    allowedFormats,
    maxFileSize: UPLOAD_MAX_FILE_SIZE,
    overwrite: false,
    uniqueFilename: true,
    // Mirrors the condition above: only signed for non-image resources, and
    // therefore only returned when it was actually part of the signature.
    ...(params.resourceType === "video" ? { resourceType: "video" as const } : {}),
  };
}