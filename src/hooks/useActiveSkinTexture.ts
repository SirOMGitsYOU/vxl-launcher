import { useMinecraftAuthStore } from "../store/minecraft-auth-store";
import type { SkinVariant } from "../types/localSkin";
import { useLivePlayerSkin } from "./useLivePlayerSkin";

export interface ActiveSkinTexture {
  textureUrl: string | null;
  variant: SkinVariant;
  loading: boolean;
}

export function useActiveSkinTexture(): ActiveSkinTexture {
  const { activeAccount } = useMinecraftAuthStore();
  const { skinUrl, variant, isLoading } = useLivePlayerSkin(activeAccount);

  return {
    textureUrl: skinUrl ?? null,
    variant,
    loading: isLoading,
  };
}
