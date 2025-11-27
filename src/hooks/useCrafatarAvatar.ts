import { useState, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { MinecraftSkinService } from "../services/minecraft-skin-service";
import { getAvatarUrl, getFallbackAvatarUrl } from "../lib/avatar-utils";

const DEFAULT_STEVE_UUID = "8667ba71b85a4004af54457a9734eed7";

interface UseCrafatarAvatarOptions {
  uuid: string | null | undefined;
  size?: number;
  overlay?: boolean;
  fallbackToDefault?: boolean;
}

/**
 * Hook to load and cache Crafatar avatars.
 * Handles loading, caching, and error fallback automatically.
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

  useEffect(() => {
    if (!uuid) {
      setAvatarUrl(null);
      return;
    }

    const loadAvatar = async () => {
      try {
        const localPath = await MinecraftSkinService.getCrafatarAvatar({
          uuid,
          size: size ?? undefined,
          overlay,
        });
        setAvatarUrl(convertFileSrc(localPath));
      } catch (error) {
        console.error("[useCrafatarAvatar] Failed to load avatar:", error);
        
        if (fallbackToDefault) {
          // Fallback to default Steve avatar with primary and fallback support
          setAvatarUrl(
            getFallbackAvatarUrl(DEFAULT_STEVE_UUID, { overlay: true, size })
          );
        } else {
          setAvatarUrl(null);
        }
      }
    };

    loadAvatar();
  }, [uuid, size, overlay, fallbackToDefault]);

  return avatarUrl;
}

