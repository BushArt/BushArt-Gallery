export interface UploadSignatureResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  allowedFormats: string;
  maxFileSize: number;
  overwrite: boolean;
  uniqueFilename: boolean;
  resourceType?: "video";
}

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  duration?: number;
  resource_type: string;
}

export async function requestUploadSignature(
  resourceType: "image" | "video",
): Promise<UploadSignatureResponse> {
  const res = await fetch("/api/upload/signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resourceType }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? "Failed to get upload signature");
  }
  return res.json() as Promise<UploadSignatureResponse>;
}

export async function uploadFileToCloudinary(
  file: File,
  resourceType: "image" | "video",
): Promise<CloudinaryUploadResult> {
  const sig = await requestUploadSignature(resourceType);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", sig.apiKey);
  formData.append("timestamp", String(sig.timestamp));
  formData.append("signature", sig.signature);
  // Every field that was signed must be echoed back, or Cloudinary recomputes a
  // different signature and rejects the upload ("Invalid Signature").
  formData.append("folder", sig.folder);
  formData.append("allowed_formats", sig.allowedFormats);
  formData.append("max_file_size", String(sig.maxFileSize));
  formData.append("overwrite", String(sig.overwrite));
  formData.append("unique_filename", String(sig.uniqueFilename));
  // `resource_type` is only signed for non-image uploads. Echo it back only when
  // the server actually signed it — adding it unconditionally would change the
  // parameter set for image uploads and invalidate their signature.
  if (sig.resourceType) {
    formData.append("resource_type", sig.resourceType);
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${resourceType}/upload`;
  const res = await fetch(endpoint, { method: "POST", body: formData });
  if (!res.ok) {
    throw new Error(`Cloudinary upload failed (${res.status})`);
  }
  return res.json() as Promise<CloudinaryUploadResult>;
}
