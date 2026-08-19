import { useState, useEffect } from "react";
import {
  isUnsafeLocalResourceUrl,
  localFileToDisplayUrl,
} from "../utils/local-file-url";
import { MinecraftSkinService } from "../services/minecraft-skin-service";
import { getAvatarUrl, getFallbackAvatarUrl } from "../lib/avatar-utils";

const DEFAULT_STEVE_UUID = "8667ba71b85a4004af54457a9734eed7";

/** Fixed NMSR fetch size — display size is handled via CSS scaling. */
export const AVATAR_FETCH_SIZE = 64;

// Global cache to prevent re-fetching the same avatar
const avatarCache = new Map<string, string>();
const loadingPromises = new Map<string, Promise<string>>();

function buildCacheKey(uuid: string, overlay: boolean): string {
  return `${uuid}-${AVATAR_FETCH_SIZE}-${overlay}`;
}

function isUsableAvatarUrl(url: string): boolean {
  return Boolean(url) && !isUnsafeLocalResourceUrl(url);
}

// Export cache population function for pre-fetching
export function populateAvatarCache(uuid: string, url: string, overlay = true) {
  if (!isUsableAvatarUrl(url)) {
    return;
  }
  avatarCache.set(buildCacheKey(uuid, overlay), url);
}

export function resetCrafatarAvatarCache(): void {
  avatarCache.clear();
  loadingPromises.clear();
}

interface UseCrafatarAvatarOptions {
  uuid: string | null | undefined;
  overlay?: boolean;
  fallbackToDefault?: boolean;
}

async function loadCrafatarAvatarUrl(
  uuid: string,
  overlay: boolean,
): Promise<string> {
  const localPath = await MinecraftSkinService.getCrafatarAvatar({
    uuid,
    size: AVATAR_FETCH_SIZE,
    overlay,
  });
  const url = await localFileToDisplayUrl(localPath);
  if (!isUsableAvatarUrl(url)) {
    throw new Error("Avatar resolved to a blocked local resource URL");
  }
  return url;
}

/**
 * Loads and caches NMSR face avatars via the backend.
 * Always fetches at AVATAR_FETCH_SIZE and scales in the UI.
 */
export function useCrafatarAvatar({
  uuid,
  overlay = true,
  fallbackToDefault = true,
}: UseCrafatarAvatarOptions): string | null {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!uuid) {
      setAvatarUrl(null);
      return;
    }

    const cacheKey = buildCacheKey(uuid, overlay);
    const cached = avatarCache.get(cacheKey);
    if (cached && isUsableAvatarUrl(cached)) {
      setAvatarUrl(cached);
      return;
    }

    let cancelled = false;

    const applyUrl = (url: string) => {
      if (!cancelled) {
        setAvatarUrl(url);
      }
    };

    const applyFallback = () => {
      if (!fallbackToDefault) {
        if (!cancelled) {
          setAvatarUrl(null);
        }
        return;
      }
      applyUrl(
        getFallbackAvatarUrl(DEFAULT_STEVE_UUID, {
          overlay: true,
          size: AVATAR_FETCH_SIZE,
        }),
      );
    };

    const existingPromise = loadingPromises.get(cacheKey);
    if (existingPromise) {
      existingPromise.then(applyUrl).catch(applyFallback);
      return () => {
        cancelled = true;
      };
    }

    const loadingPromise = loadCrafatarAvatarUrl(uuid, overlay)
      .then((url) => {
        avatarCache.set(cacheKey, url);
        applyUrl(url);
        return url;
      })
      .catch((error) => {
        console.error("[useCrafatarAvatar] Failed to load avatar:", error);
        const remoteUrl = getAvatarUrl(uuid, {
          overlay,
          size: AVATAR_FETCH_SIZE,
        });
        avatarCache.set(cacheKey, remoteUrl);
        applyUrl(remoteUrl);
        return remoteUrl;
      })
      .finally(() => {
        loadingPromises.delete(cacheKey);
      });

    loadingPromises.set(cacheKey, loadingPromise);

    return () => {
      cancelled = true;
    };
  }, [uuid, overlay, fallbackToDefault]);

  return avatarUrl;
}
