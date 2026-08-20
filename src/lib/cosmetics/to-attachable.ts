import { attachableFromNorisk } from "vxl-skin-renderer/adapters/norisk";
import type { Attachable } from "vxl-skin-renderer/core";

import type { ResolvedCosmetic } from "./vanilla-cape-cosmetic";

export function cosmeticToAttachable(cosmetic: ResolvedCosmetic): Attachable {
  return attachableFromNorisk(cosmetic.urls, cosmetic.urls.metadataJson);
}
