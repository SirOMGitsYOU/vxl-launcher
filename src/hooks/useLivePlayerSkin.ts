import { useCallback, useEffect, useState } from "react";
import { MinecraftSkinService } from "../services/minecraft-skin-service";
import type { MinecraftAccount } from "../types/minecraft";
import type { TexturesData } from "../types/minecraft";
import { getSkinUrl, normalizeMinecraftTextureUrl } from "../lib/avatar-utils";

export type PlayerSkinVariant = "classic" | "slim";

interface UseLivePlayerSkinResult {
  skinUrl: string | undefined;
  variant: PlayerSkinVariant;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function parseLiveSkinFromProfile(
  properties: { name: string; value: string }[] | undefined,
): { skinUrl?: string; variant: PlayerSkinVariant; skinId?: string } {
  if (!properties) {
    return { variant: "classic" };
  }

  const texturesProp = properties.find((prop) => prop.name === "textures");
  if (!texturesProp) {
    return { variant: "classic" };
  }

  try {
    const decodedValue = atob(texturesProp.value);
    const texturesJson = JSON.parse(decodedValue) as TexturesData;
    const skinInfo = texturesJson.textures?.SKIN;

    if (!skinInfo?.url) {
      return { variant: "classic" };
    }

    const variant: PlayerSkinVariant =
      skinInfo.metadata?.model === "slim" ? "slim" : "classic";

    const urlParts = skinInfo.url.split("/");
    const skinIdFromUrl = urlParts[urlParts.length - 1]?.split(".")[0];

    return {
      skinUrl: skinInfo.url,
      variant,
      skinId: skinIdFromUrl,
    };
  } catch (error) {
    console.error("[useLivePlayerSkin] Failed to parse skin textures:", error);
    return { variant: "classic" };
  }
}

export function useLivePlayerSkin(
  activeAccount: MinecraftAccount | null,
): UseLivePlayerSkinResult {
  const [skinUrl, setSkinUrl] = useState<string | undefined>(undefined);
  const [variant, setVariant] = useState<PlayerSkinVariant>("classic");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!activeAccount) {
      setSkinUrl(undefined);
      setVariant("classic");
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const profileData = await MinecraftSkinService.getUserSkinData(activeAccount.id);

      const parsed = parseLiveSkinFromProfile(profileData.properties);
      const resolvedUrl = parsed.skinUrl
        ? normalizeMinecraftTextureUrl(parsed.skinUrl)
        : getSkinUrl(activeAccount.id);

      setSkinUrl(resolvedUrl);
      setVariant(parsed.variant);
    } catch (fetchError) {
      console.error("[useLivePlayerSkin] Failed to fetch live player skin:", fetchError);
      setError(
        fetchError instanceof Error ? fetchError.message : "Failed to fetch player skin",
      );
      setSkinUrl(getSkinUrl(activeAccount.id));
    } finally {
      setIsLoading(false);
    }
  }, [activeAccount]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    skinUrl,
    variant,
    isLoading,
    error,
    refresh,
  };
}
