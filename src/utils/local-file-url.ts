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

export function isUnsafeLocalResourceUrl(url: string): boolean {
  return (
    url.startsWith("file:") ||
    /^[A-Za-z]:[\\/]/.test(url) ||
    url.startsWith("\\\\")
  );
}

/**
 * Converts a `file://` URL, asset protocol URL, or Windows path into a filesystem path for backend reads.
 * Chromium/WebView2 cannot load `file://` or blocked asset URLs from the Tauri origin.
 */
export function toFilesystemPath(filePath: string): string {
  const trimmed = filePath.trim();

  if (trimmed.includes("asset.localhost") || trimmed.startsWith("asset://")) {
    try {
      const withProtocol = trimmed.startsWith("asset://")
        ? trimmed
        : trimmed.startsWith("http")
          ? trimmed
          : `https://${trimmed.replace(/^\/\//, "")}`;
      const url = new URL(withProtocol);
      let pathname = decodeURIComponent(url.pathname.replace(/^\//, ""));
      if (/^[A-Za-z]:/.test(pathname)) {
        return pathname.replace(/\//g, "\\");
      }
      return pathname;
    } catch {
      return trimmed;
    }
  }

  if (!trimmed.startsWith("file:")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    let pathname = decodeURIComponent(url.pathname);
    if (/^\/[A-Za-z]:/.test(pathname)) {
      pathname = pathname.slice(1);
    }
    return pathname.replace(/\//g, "\\");
  } catch {
    return trimmed.replace(/^file:\/\//i, "");
  }
}

function mimeTypeForPath(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
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

  const normalizedPath = toFilesystemPath(filePath);
  const isRemoteDisplayUrl =
    isDisplayableRemoteUrl(filePath) &&
    !filePath.includes("asset.localhost") &&
    !filePath.startsWith("asset://");

  if (isRemoteDisplayUrl) return filePath;

  const cacheKey = normalizedPath || filePath;

  const cached = blobUrlCache.get(cacheKey);
  if (cached) return cached;

  const rawBytes = await invoke<Uint8Array | number[] | ArrayBuffer>(
    "read_file_bytes",
    { filePath: normalizedPath },
  );
  const bytes = toUint8Array(rawBytes);
  const blob = new Blob([bytes], { type: mimeTypeForPath(normalizedPath) });
  const url = URL.createObjectURL(blob);
  blobUrlCache.set(cacheKey, url);
  return url;
}

export function clearLocalFileUrlCache(): void {
  for (const url of blobUrlCache.values()) {
    URL.revokeObjectURL(url);
  }
  blobUrlCache.clear();
}
