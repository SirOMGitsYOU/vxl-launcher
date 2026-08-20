import type { NoriskAssetUrls } from "vxl-skin-renderer/adapters/norisk";

export interface ResolvedCosmetic {
  cosmeticId: string;
  name: string;
  type: string;
  urls: NoriskAssetUrls;
}

export function vanillaCapeCosmetic(
  capeId: string,
  textureUrl: string,
): ResolvedCosmetic {
  return {
    cosmeticId: `cape:${capeId}`,
    name: "Cape",
    type: "CAPE",
    urls: {
      geo: "",
      texture: textureUrl,
      metadataJson: {
        id: `cape:${capeId}`,
        name: "Cape",
        type: "CAPE",
        path: "cape",
        defaultSettings: {
          scale: 1,
          previewScale: 1,
          offset: { x: 0, y: 0, z: 0 },
          previewOffset: { x: 0, y: 0, z: 0 },
        },
      },
    },
  };
}
