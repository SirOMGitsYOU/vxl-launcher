import { useCallback, useEffect, useState } from "react";
import {
  fetchLivePlayerSkin,
  peekLivePlayerSkin,
} from "../services/live-player-skin-cache";
import { useSkinStore } from "../store/useSkinStore";
import type { MinecraftAccount } from "../types/minecraft";
import { getSkinUrl } from "../lib/avatar-utils";
import type { PlayerSkinVariant } from "../lib/live-player-skin";

export type { PlayerSkinVariant } from "../lib/live-player-skin";
export { parseLiveSkinFromProfile } from "../lib/live-player-skin";

interface UseLivePlayerSkinResult {
  skinUrl: string | undefined;
  variant: PlayerSkinVariant;
  isLoading: boolean;
  error: string | null;
  refresh: (force?: boolean) => Promise<void>;
}

export function useLivePlayerSkin(
  activeAccount: MinecraftAccount | null,
): UseLivePlayerSkinResult {
  const skinRevision = useSkinStore((state) => state.skinRevision);
  const accountId = activeAccount?.id;
  const cached = accountId
    ? peekLivePlayerSkin(accountId, skinRevision)
    : undefined;

  const [skinUrl, setSkinUrl] = useState<string | undefined>(
    cached?.textureUrl,
  );
  const [variant, setVariant] = useState<PlayerSkinVariant>(
    cached?.variant ?? "classic",
  );
  const [isLoading, setIsLoading] = useState(Boolean(accountId && !cached));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (force = false) => {
      if (!activeAccount) {
        setSkinUrl(undefined);
        setVariant("classic");
        setError(null);
        setIsLoading(false);
        return;
      }

      const hasCache =
        !force &&
        !!peekLivePlayerSkin(activeAccount.id, skinRevision);

      if (!hasCache) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const data = await fetchLivePlayerSkin(
          activeAccount.id,
          skinRevision,
          force,
        );
        setSkinUrl(data.textureUrl);
        setVariant(data.variant);
      } catch (fetchError) {
        console.error(
          "[useLivePlayerSkin] Failed to fetch live player skin:",
          fetchError,
        );
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to fetch player skin",
        );
        setSkinUrl(getSkinUrl(activeAccount.id));
      } finally {
        setIsLoading(false);
      }
    },
    [activeAccount, skinRevision],
  );

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  return {
    skinUrl,
    variant,
    isLoading,
    error,
    refresh,
  };
}
