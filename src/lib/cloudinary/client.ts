import { v2 as cloudinary } from "cloudinary";

/**
 * Server-side Cloudinary v2 client.
 *
 * Reads credentials from environment variables and configures the SDK.
 * This module is server-only — the API secret never reaches the browser.
 */

// Raw env reads are kept at module scope so named exports remain available.
// Validation is deferred to getCloudinary() to avoid crashing module import.
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

let configured = false;

/**
 * Validate required env vars and configure the Cloudinary SDK on first call.
 * This defers validation to runtime so missing env vars don't crash module import.
 */
export function getCloudinary() {
  if (configured) return cloudinary;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Missing Cloudinary environment variables. Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET",
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  configured = true;
  return cloudinary;
}

export { cloudinary };
export { cloudName, apiKey };
