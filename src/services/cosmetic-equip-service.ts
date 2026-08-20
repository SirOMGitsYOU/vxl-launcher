import { VanillaCapeService } from "./vanilla-cape-service";
import { vanillaCapeCosmetic } from "../lib/cosmetics/vanilla-cape-cosmetic";
import type { ResolvedCosmetic } from "../lib/cosmetics/vanilla-cape-cosmetic";
import { localFileToDisplayUrl } from "../utils/local-file-url";

export interface EquippedCosmetics {
  cosmetics: ResolvedCosmetic[];
}

const EMPTY: EquippedCosmetics = { cosmetics: [] };

export async function getEquippedCosmetics(
  _playerIdentifier: string,
): Promise<EquippedCosmetics> {
  const cape = await VanillaCapeService.getCurrentlyEquippedVanillaCape();
  if (!cape?.url?.trim()) return EMPTY;

  let textureUrl = cape.url;
  try {
    const localPath = await VanillaCapeService.getCachedCapeTexturePath(
      cape.id,
      cape.url,
    );
    textureUrl = await localFileToDisplayUrl(localPath);
  } catch {
    // fall back to remote cape URL
  }

  return {
    cosmetics: [vanillaCapeCosmetic(cape.id, textureUrl)],
  };
}
