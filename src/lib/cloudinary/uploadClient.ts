export interface UploadSignatureResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
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
  folder = "bushart/uploads",
): Promise<UploadSignatureResponse> {
  const res = await fetch("/api/upload/signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resourceType, folder }),
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
  formData.append("folder", sig.folder);

  const endpoint = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${resourceType}/upload`;
  const res = await fetch(endpoint, { method: "POST", body: formData });
  if (!res.ok) {
    throw new Error(`Cloudinary upload failed (${res.status})`);
  }
  return res.json() as Promise<CloudinaryUploadResult>;
}
