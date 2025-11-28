// CurseForge modpack categories
export const CURSEFORGE_MODPACK_CATEGORIES = [
  { id: 4482, name: "Extra Large", slug: "extra-large" },
  { id: 4481, name: "Small / Light", slug: "small-light" },
  { id: 4483, name: "Combat / PvP", slug: "combat-pvp" },
  { id: 4474, name: "Sci-Fi", slug: "sci-fi" },
  { id: 4475, name: "Adventure and RPG", slug: "adventure-and-rpg" },
  { id: 4487, name: "FTB Official Pack", slug: "ftb-official-pack" },
  { id: 4478, name: "Quests", slug: "quests" },
  { id: 4472, name: "Tech", slug: "tech" },
  { id: 4736, name: "Skyblock", slug: "skyblock" },
  { id: 4480, name: "Map Based", slug: "map-based" },
  { id: 7418, name: "Horror", slug: "horror" },
  { id: 4484, name: "Multiplayer", slug: "multiplayer" },
  { id: 4477, name: "Mini Game", slug: "mini-game" },
  { id: 4473, name: "Magic", slug: "magic" },
  { id: 5128, name: "Vanilla+", slug: "vanilla" },
  { id: 4479, name: "Hardcore", slug: "hardcore" },
  { id: 4476, name: "Exploration", slug: "exploration" },
] as const;

// CurseForge mod categories
export const CURSEFORGE_MOD_CATEGORIES = [
  { id: 434, name: "Armor, Tools, and Weapons", slug: "armor-weapons-tools" },
  { id: 435, name: "Server Utility", slug: "server-utility" },
  { id: 423, name: "Map and Information", slug: "map-information" },
  { id: 426, name: "Addons", slug: "mc-addons" },
  { id: 6821, name: "Bug Fixes", slug: "bug-fixes" },
  { id: 421, name: "API and Library", slug: "library-api" },
  { id: 436, name: "Food", slug: "mc-food" },
  { id: 5299, name: "Education", slug: "education" },
  { id: 412, name: "Technology", slug: "technology" },
  { id: 420, name: "Storage", slug: "storage" },
  { id: 5191, name: "Utility & QoL", slug: "utility-qol" },
  { id: 4558, name: "Redstone", slug: "redstone" },
  { id: 8937, name: "ModJam 2025", slug: "modjam-2025" },
  { id: 4906, name: "MCreator", slug: "mc-creator" },
  { id: 425, name: "Miscellaneous", slug: "mc-miscellaneous" },
  { id: 406, name: "World Gen", slug: "world-gen" },
  { id: 6814, name: "Performance", slug: "performance" },
  { id: 424, name: "Cosmetic", slug: "cosmetic" },
  { id: 4671, name: "Twitch Integration", slug: "twitch-integration" },
  { id: 422, name: "Adventure and RPG", slug: "adventure-rpg" },
  { id: 419, name: "Magic", slug: "magic" },
  { id: 9026, name: "CreativeMode", slug: "creativemode" },
] as const;

// CurseForge resource pack categories
export const CURSEFORGE_RESOURCEPACK_CATEGORIES = [
  { id: 393, name: "16x", slug: "sixteen-x" },
  { id: 394, name: "32x", slug: "thirty-two-x" },
  { id: 395, name: "64x", slug: "sixty-four-x" },
  { id: 396, name: "128x", slug: "one-twenty-eight-x" },
  { id: 397, name: "256x", slug: "two-fifty-six-x" },
  { id: 398, name: "512x and Higher", slug: "five-twelve-x-and-beyond" },
  { id: 400, name: "Photo Realistic", slug: "photo-realistic" },
  { id: 405, name: "Miscellaneous", slug: "miscellaneous" },
  { id: 403, name: "Traditional", slug: "traditional" },
  { id: 5244, name: "Font Packs", slug: "font-packs" },
  { id: 4465, name: "Mod Support", slug: "mod-support" },
  { id: 402, name: "Medieval", slug: "medieval" },
  { id: 5193, name: "Data Packs", slug: "data-packs" },
  { id: 404, name: "Animated", slug: "animated" },
  { id: 401, name: "Modern", slug: "modern" },
  { id: 399, name: "Steampunk", slug: "steampunk" },
  { id: 8939, name: "ModJam 2025", slug: "modjam-2025" },
] as const;

// CurseForge datapack categories
export const CURSEFORGE_DATAPACK_CATEGORIES = [
  { id: 6946, name: "Mod Support", slug: "mod-support" },
  { id: 6951, name: "Tech", slug: "tech" },
  { id: 6952, name: "Magic", slug: "magic" },
  { id: 6948, name: "Adventure", slug: "adventure" },
  { id: 6950, name: "Library", slug: "library" },
  { id: 6953, name: "Utility", slug: "utility" },
  { id: 6947, name: "Miscellaneous", slug: "miscellaneous" },
  { id: 6949, name: "Fantasy", slug: "fantasy" },
  { id: 8938, name: "ModJam 2025", slug: "modjam-2025" },
] as const;

export interface CurseForgeCategoryFilter {
  id: number;
  name: string;
  slug: string;
}
