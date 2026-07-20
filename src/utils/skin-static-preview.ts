import * as skinview3d from "skinview3d";
import type { SkinVariant } from "../types/localSkin";

const PREVIEW_SIZE = 256;
const SKIN_PREVIEW_CACHE_VERSION = "nmsr_fullbody_v1";

async function sha1HexPrefix(input: string, length = 8): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return hashHex.slice(0, Math.min(length, hashHex.length));
}

export async function buildSkinPreviewCacheKey(
  base64Data: string,
  renderType: string,
  renderView: string,
): Promise<string> {
  const hashPrefix = await sha1HexPrefix(base64Data);
  return `${hashPrefix}_${renderType}_${renderView}_${SKIN_PREVIEW_CACHE_VERSION}`;
}

let renderQueue: Promise<unknown> = Promise.resolve();

function enqueueRender<T>(task: () => Promise<T>): Promise<T> {
  const result = renderQueue.then(task, task);
  renderQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function renderSkinPreviewBlob(
  base64Data: string,
  variant: SkinVariant,
): Promise<Blob> {
  return enqueueRender(async () => {
    const canvas = document.createElement("canvas");
    const viewer = new skinview3d.SkinViewer({
      canvas,
      width: PREVIEW_SIZE,
      height: PREVIEW_SIZE,
    });

    try {
      viewer.autoRotate = false;
      viewer.zoom = 0.9;
      viewer.controls.enableRotate = false;
      viewer.controls.enableZoom = false;
      viewer.controls.enablePan = false;

      const model = variant === "slim" ? "slim" : "default";
      await viewer.loadSkin(`data:image/png;base64,${base64Data}`, { model });

      if (viewer.playerObject) {
        viewer.playerObject.rotation.y = 0;
      }

      viewer.render();

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) =>
            result ? resolve(result) : reject(new Error("Failed to export skin preview")),
          "image/png",
        );
      });

      return blob;
    } finally {
      viewer.dispose();
    }
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const memoryPreviewCache = new Map<string, string>();

export async function getOrCreateStaticSkinPreview(
  cacheKey: string,
  base64Data: string,
  variant: SkinVariant,
  getExistingPreviewPath: (key: string) => Promise<string | null>,
  savePreview: (key: string, pngBase64: string) => Promise<string>,
  toDisplayUrl: (path: string) => Promise<string> | string,
): Promise<string> {
  const cached = memoryPreviewCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const existingPath = await getExistingPreviewPath(cacheKey);
  if (existingPath) {
    const displayUrl = await Promise.resolve(toDisplayUrl(existingPath));
    memoryPreviewCache.set(cacheKey, displayUrl);
    return displayUrl;
  }

  const blob = await renderSkinPreviewBlob(base64Data, variant);
  const pngBase64 = await blobToBase64(blob);
  await savePreview(cacheKey, pngBase64);
  const displayUrl = `data:image/png;base64,${pngBase64}`;
  memoryPreviewCache.set(cacheKey, displayUrl);
  return displayUrl;
}

export function clearStaticSkinPreviewMemoryCache(): void {
  memoryPreviewCache.clear();
}
