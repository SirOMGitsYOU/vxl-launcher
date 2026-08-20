import { invoke } from "@tauri-apps/api/core";

export type ImportedBackgroundMediaType = "image" | "video";

/** Videos at or above this size may load slowly (fully buffered into memory). */
export const LARGE_BACKGROUND_VIDEO_BYTES = 50 * 1024 * 1024;

export interface ImportCustomBackgroundResult {
  path: string;
  media_type: ImportedBackgroundMediaType;
  file_size_bytes: number;
}

export function isLargeBackgroundVideo(
  mediaType: ImportedBackgroundMediaType | null | undefined,
  sizeBytes: number,
): boolean {
  return mediaType === "video" && sizeBytes >= LARGE_BACKGROUND_VIDEO_BYTES;
}

export function formatBackgroundFileSize(sizeBytes: number): string {
  if (sizeBytes >= 1024 * 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  return `${Math.round(sizeBytes / (1024 * 1024))} MB`;
}

export function largeBackgroundVideoWarning(sizeBytes: number): string {
  return `This video is ${formatBackgroundFileSize(sizeBytes)}. Large videos load fully into memory and may take a while to start.`;
}

export async function importCustomBackground(
  sourcePath: string,
): Promise<ImportCustomBackgroundResult> {
  return invoke<ImportCustomBackgroundResult>("import_custom_background", {
    sourcePath,
  });
}

export async function getFileSizeBytes(filePath: string): Promise<number> {
  return invoke<number>("get_file_size_bytes", { filePath });
}
