import { useEffect, useState } from "react";

import { getCachedCapeTexturePath } from "../services/vanilla-cape-service";
import { localFileToDisplayUrl } from "../utils/local-file-url";

type CapeCacheEntry = {
  id: string;
  url: string;
};

/**
 * Resolves a cape texture for WebGL preview.
 * Always returns the current cape's remote URL immediately; upgrades to cache when ready.
 */
export function useCachedCapeDisplayUrl(
  capeId: string | null | undefined,
  capeUrl: string | null | undefined,
): { displayUrl: string | null; isResolvingCache: boolean } {
  const remoteUrl = (capeUrl ?? "").trim() || null;
  const [cacheEntry, setCacheEntry] = useState<CapeCacheEntry | null>(null);
  const [isResolvingCache, setIsResolvingCache] = useState(false);

  useEffect(() => {
    if (!capeId || !remoteUrl) {
      setCacheEntry(null);
      setIsResolvingCache(false);
      return;
    }

    let cancelled = false;
    setCacheEntry(null);
    setIsResolvingCache(true);

    const resolve = async () => {
      try {
        const localPath = await getCachedCapeTexturePath(capeId, remoteUrl);
        if (!cancelled) {
          setCacheEntry({
            id: capeId,
            url: await localFileToDisplayUrl(localPath),
          });
        }
      } catch (error) {
        console.warn("[useCachedCapeDisplayUrl] Cache resolve failed, using remote URL:", error);
        if (!cancelled) {
          setCacheEntry({ id: capeId, url: remoteUrl });
        }
      } finally {
        if (!cancelled) {
          setIsResolvingCache(false);
        }
      }
    };

    void resolve();

    return () => {
      cancelled = true;
    };
  }, [capeId, remoteUrl]);

  const displayUrl =
    !capeId || !remoteUrl
      ? null
      : cacheEntry?.id === capeId
        ? cacheEntry.url
        : remoteUrl;

  return {
    displayUrl,
    isResolvingCache: Boolean(
      remoteUrl && isResolvingCache && cacheEntry?.id !== capeId,
    ),
  };
}
