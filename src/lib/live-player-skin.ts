import type { TexturesData } from "../types/minecraft";

export type PlayerSkinVariant = "classic" | "slim";

export interface ParsedLiveSkin {
  skinUrl?: string;
  variant: PlayerSkinVariant;
  skinId?: string;
}

export function parseLiveSkinFromProfile(
  properties: { name: string; value: string }[] | undefined,
): ParsedLiveSkin {
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
    console.error("[live-player-skin] Failed to parse skin textures:", error);
    return { variant: "classic" };
  }
}
