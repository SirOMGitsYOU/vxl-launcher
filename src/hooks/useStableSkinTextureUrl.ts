import { useEffect, useState } from "react";

function dataUrlToBlobUrl(dataUrl: string): string {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/data:([^;]+)/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

/**
 * WebGL skin loads are more reliable with blob/http URLs than raw data: URLs,
 * especially when SkinView remounts after tab navigation.
 */
export function useStableSkinTextureUrl(
  url: string | null | undefined,
): string | null {
  const [stableUrl, setStableUrl] = useState<string | null>(() => {
    if (!url) return null;
    return url.startsWith("data:") ? null : url;
  });

  useEffect(() => {
    if (!url) {
      setStableUrl(null);
      return;
    }

    if (!url.startsWith("data:")) {
      setStableUrl(url);
      return;
    }

    let objectUrl: string;
    try {
      objectUrl = dataUrlToBlobUrl(url);
    } catch (error) {
      console.warn("[useStableSkinTextureUrl] Failed to parse data URL:", error);
      setStableUrl(null);
      return;
    }

    setStableUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [url]);

  return stableUrl;
}
