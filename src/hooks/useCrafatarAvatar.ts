import { useState, useEffect, useRef } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { MinecraftSkinService } from "../services/minecraft-skin-service";
import { getAvatarUrl, getFallbackAvatarUrl } from "../lib/avatar-utils";

const DEFAULT_STEVE_UUID = "8667ba71b85a4004af54457a9734eed7";

// Global cache to prevent re-fetching the same avatar
const avatarCache = new Map<string, string>();
const loadingPromises = new Map<string, Promise<string>>();

// Export cache population function for pre-fetching
export function populateAvatarCache(cacheKey: string, url: string) {
  avatarCache.set(cacheKey, url);
}

interface UseCrafatarAvatarOptions {
  uuid: string | null | undefined;
  size?: number;
  overlay?: boolean;
  fallbackToDefault?: boolean;
}

/**
 * Hook to load and cache Crafatar avatars.
 * Handles loading, caching, and error fallback automatically.
 * Uses global cache to prevent re-fetching the same avatar multiple times.
 * 
 * @param options - Configuration options for the avatar
 * @returns The avatar URL (local cached path converted to file src) or null if not loaded yet
 */
export function useCrafatarAvatar({
  uuid,
  size,
  overlay = true,
  fallbackToDefault = true,
}: UseCrafatarAvatarOptions): string | null {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const cacheKey = `${uuid}-${size ?? 'default'}-${overlay}`;

  useEffect(() => {
    if (!uuid) {
      setAvatarUrl(null);
      return;
    }

    // Check if already cached
    if (avatarCache.has(cacheKey)) {
      setAvatarUrl(avatarCache.get(cacheKey)!);
      return;
    }

    // Check if already loading
    if (loadingPromises.has(cacheKey)) {
      loadingPromises.get(cacheKey)!.then(url => {
        setAvatarUrl(url);
      }).catch(() => {
        if (fallbackToDefault) {
          setAvatarUrl(getFallbackAvatarUrl(DEFAULT_STEVE_UUID, { overlay: true, size }));
        }
      });
      return;
    }

    const loadAvatar = async () => {
      try {
        const loadingPromise = MinecraftSkinService.getCrafatarAvatar({
          uuid,
          size: size ?? undefined,
          overlay,
        });
        
        loadingPromises.set(cacheKey, loadingPromise);
        
        const localPath = await loadingPromise;
        const url = convertFileSrc(localPath);
        
        // Cache the result
        avatarCache.set(cacheKey, url);
        setAvatarUrl(url);
      } catch (error) {
        console.error("[useCrafatarAvatar] Failed to load avatar:", error);
        
        // Fallback to remote URL instead of local file
        const remoteUrl = getAvatarUrl(uuid, { overlay, size });
        avatarCache.set(cacheKey, remoteUrl);
        setAvatarUrl(remoteUrl);
      } finally {
        loadingPromises.delete(cacheKey);
      }
    };

    loadAvatar();
  }, [uuid, size, overlay, fallbackToDefault, cacheKey]);

  return avatarUrl;
}

