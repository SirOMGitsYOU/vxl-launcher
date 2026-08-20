import { useMemo } from "react";

import { useCachedCapeDisplayUrl } from "./useCachedCapeDisplayUrl";
import { useVanillaCapeStore } from "../store/useVanillaCapeStore";

export interface CapePreviewInput {
  texture: string;
  elytra?: boolean;
}

/**
 * Equipped vanilla cape for 3D player previews (Play, Skins, etc.).
 */
export function useEquippedCapePreview(
  elytra = false,
): CapePreviewInput | null {
  const equippedCape = useVanillaCapeStore(
    (state) => state.equippedCape ?? state.ownedCapes.find((cape) => cape.equipped) ?? null,
  );

  const { displayUrl } = useCachedCapeDisplayUrl(
    equippedCape?.id,
    equippedCape?.url,
  );

  return useMemo(() => {
    if (!equippedCape || !(displayUrl ?? "").trim()) return null;
    return {
      texture: displayUrl!,
      elytra,
    };
  }, [displayUrl, elytra, equippedCape?.id]);
}
