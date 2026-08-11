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

export interface SignUploadSignatureParams {
  resourceType: "image" | "video" | "raw";
  folder: string;
}

export interface SignUploadSignatureResult {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

/**
 * Thrown when a folder path fails namespace validation.
 * Allows route handlers to distinguish 400 VALIDATION_ERROR from 500 INTERNAL_ERROR.
 */
export class FolderValidationError extends Error {
  constructor(folder: string) {
    super(`Invalid folder: must start with "bushart/", got "${folder}"`);
    this.name = "FolderValidationError";
  }
}

/**
 * Validate that the folder is within the allowed `bushart/` namespace.
 * Prevents path traversal or uploads to unexpected locations.
 * @throws FolderValidationError if folder does not start with "bushart/"
 */
export function validateFolder(folder: string): void {
  if (!folder.startsWith("bushart/")) {
    throw new FolderValidationError(folder);
  }
}

export async function signUploadSignature(
  params: SignUploadSignatureParams,
): Promise<SignUploadSignatureResult> {
  validateFolder(params.folder);

  const timestamp = Math.floor(Date.now() / 1000);

  // Build parameters to sign. Only include parameters that affect the upload.
  const signableParams: Record<string, string> = {
    folder: params.folder,
    timestamp: String(timestamp),
  };

  // Cloudinary expects resource_type in the signature for certain upload types.
  // For MVP (images/videos), include it to restrict the signature scope.
  if (params.resourceType !== "image") {
    signableParams.resource_type = params.resourceType;
  }

  // Cloudinary v2: use utils.api_sign_request to compute the SHA-1 HMAC signature.
  // Retrieve the secret from the configured SDK instance rather than from env directly.
  const cloudinary = getCloudinary();
  const apiSecret = cloudinary.config().api_secret!;
  const signature = cloudinary.utils.api_sign_request(signableParams, apiSecret);

  return {
    signature,
    timestamp,
    apiKey: cloudinary.config().api_key!,
    cloudName: cloudinary.config().cloud_name!,
    folder: params.folder,
  };
}