import { invoke } from "@tauri-apps/api/core";

const blobUrlCache = new Map<string, string>();

export function isDisplayableRemoteUrl(url: string): boolean {
  return (
    /^https?:\/\//i.test(url) ||
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.includes("asset.localhost") ||
    url.startsWith("asset://")
  );
}

function mimeTypeForPath(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/png";
}

function toUint8Array(bytes: Uint8Array | number[] | ArrayBuffer): Uint8Array {
  if (bytes instanceof Uint8Array) return bytes;
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes);
  return new Uint8Array(bytes);
}

/**
 * Converts a local filesystem path into a URL suitable for <img> / canvas usage.
 * Uses the Rust read_file_bytes command (path-validated) to create blob URLs,
 * avoiding asset-protocol scope issues.
 */
export async function localFileToDisplayUrl(filePath: string): Promise<string> {
  if (!filePath) return "";
  if (isDisplayableRemoteUrl(filePath)) return filePath;

  const cached = blobUrlCache.get(filePath);
  if (cached) return cached;

  const rawBytes = await invoke<Uint8Array | number[] | ArrayBuffer>(
    "read_file_bytes",
    { filePath },
  );
  const bytes = toUint8Array(rawBytes);
  const blob = new Blob([bytes], { type: mimeTypeForPath(filePath) });
  const url = URL.createObjectURL(blob);
  blobUrlCache.set(filePath, url);
  return url;
}

export function clearLocalFileUrlCache(): void {
  for (const url of blobUrlCache.values()) {
    URL.revokeObjectURL(url);
  }
  blobUrlCache.clear();
}
