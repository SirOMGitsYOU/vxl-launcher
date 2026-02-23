export type GameType = "minecraft" | "hytale";

export interface GameTypeInfo {
  id: GameType;
  displayName: string;
  icon: string;
  description: string;
}

export const GAME_TYPES: Record<GameType, GameTypeInfo> = {
  minecraft: {
    id: "minecraft",
    displayName: "Minecraft",
    icon: "/icons/minecraft.png",
    description: "Java Edition"
  },
  hytale: {
    id: "hytale",
    displayName: "Hytale",
    icon: "/icons/hytale.png",
    description: "Hytale Launcher"
  }
};

export function isValidGameType(value: string): value is GameType {
  return value === "minecraft" || value === "hytale";
}

export function getGameTypeInfo(gameType: GameType): GameTypeInfo {
  return GAME_TYPES[gameType];
}
