import { useState, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
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

// Export cache population function for pre-fetching
export function populateAvatarCache(uuid: string, url: string, overlay = true) {
  avatarCache.set(buildCacheKey(uuid, overlay), url);
}

interface UseCrafatarAvatarOptions {
  uuid: string | null | undefined;
  overlay?: boolean;
  fallbackToDefault?: boolean;
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

    if (avatarCache.has(cacheKey)) {
      setAvatarUrl(avatarCache.get(cacheKey)!);
      return;
    }

    if (loadingPromises.has(cacheKey)) {
      loadingPromises
        .get(cacheKey)!
        .then((url) => setAvatarUrl(url))
        .catch(() => {
          if (fallbackToDefault) {
            setAvatarUrl(
              getFallbackAvatarUrl(DEFAULT_STEVE_UUID, {
                overlay: true,
                size: AVATAR_FETCH_SIZE,
              }),
            );
          }
        });
      return;
    }

    const loadAvatar = async () => {
      try {
        const loadingPromise = MinecraftSkinService.getCrafatarAvatar({
          uuid,
          size: AVATAR_FETCH_SIZE,
          overlay,
        });

        loadingPromises.set(cacheKey, loadingPromise);

        const localPath = await loadingPromise;
        const url = convertFileSrc(localPath);

        avatarCache.set(cacheKey, url);
        setAvatarUrl(url);
      } catch (error) {
        console.error("[useCrafatarAvatar] Failed to load avatar:", error);

        const remoteUrl = getAvatarUrl(uuid, {
          overlay,
          size: AVATAR_FETCH_SIZE,
        });
        avatarCache.set(cacheKey, remoteUrl);
        setAvatarUrl(remoteUrl);
      } finally {
        loadingPromises.delete(cacheKey);
      }
    };

    loadAvatar();
  }, [uuid, overlay, fallbackToDefault]);

  return avatarUrl;
}
