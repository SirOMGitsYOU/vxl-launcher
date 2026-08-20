export interface PresetBackground {
  id: string;
  name: string;
  /** YouTube video ID — fill in later to enable the preset */
  youtubeId: string;
  thumbnailUrl?: string;
}

export const PRESET_BACKGROUNDS: PresetBackground[] = [
  { id: "vxl-preset-1", name: "Quiet fireplace scene", youtubeId: "FqnAV6tkwzA" },
  { id: "vxl-preset-2", name: "Relaxing Farm Morning", youtubeId: "xLo-BrCh7JQ" },
  { id: "vxl-preset-3", name: "Lazy Beach", youtubeId: "SZu6k3riYso" },
  { id: "vxl-preset-4", name: "Cozy Rainy Swamp", youtubeId: "n0vvGQL6PpI" },
  { id: "vxl-preset-5", name: "Soothing Underwater Scenes", youtubeId: "RnnctM5Rf9I" },
  { id: "vxl-preset-6", name: "Cherry Groves", youtubeId: "EjBdURAwJHI" },
  { id: "vxl-preset-7", name: "Dreamy deserts", youtubeId: "9Y0TZkTjbc8" },
  { id: "vxl-preset-8", name: "Glowing Caves", youtubeId: "hJLgLTpI9U8" },
  { id: "vxl-preset-9", name: "Soothing Snowfall", youtubeId: "bEoa2GjmPUk" },
  { id: "vxl-preset-10", name: "Serene snow", youtubeId: "JBoUwElRFVM" },
];

export function getPresetBackgroundById(id: string | null | undefined): PresetBackground | undefined {
  if (!id) return undefined;
  return PRESET_BACKGROUNDS.find((preset) => preset.id === id);
}

export function getPresetThumbnailUrl(preset: PresetBackground): string | null {
  if (preset.thumbnailUrl) return preset.thumbnailUrl;
  if (!preset.youtubeId.trim()) return null;
  return `https://i.ytimg.com/vi/${preset.youtubeId}/hqdefault.jpg`;
}

export function getYoutubeThumbnailUrl(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

export type YoutubeEmbedQuality = "low" | "medium" | "high";

/**
 * YouTube picks stream tier from the iframe's layout width (not CSS scale).
 * @see https://developers.google.com/youtube/iframe_api_reference
 */
export function getYoutubeEmbedDimensions(quality: YoutubeEmbedQuality): {
  width: number;
  height: number;
} {
  switch (quality) {
    case "high":
      // 1633px+ width → 1080p tier
      return { width: 1920, height: 1080 };
    case "medium":
      // 1089px+ width → 720p tier
      return { width: 1280, height: 720 };
    case "low":
      // 726px+ width → 480p tier
      return { width: 854, height: 480 };
  }
}

/** Background embed URL — controls=0 must be in the iframe src query string. */
export function buildYoutubeEmbedUrl(youtubeId: string): string {
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? `&origin=${encodeURIComponent(window.location.origin)}`
      : "";

  return (
    `https://www.youtube-nocookie.com/embed/${youtubeId}` +
    `?controls=0` +
    `&showinfo=0` +
    `&rel=0` +
    `&autoplay=1` +
    `&loop=1` +
    `&mute=1` +
    `&playlist=${youtubeId}` +
    `&modestbranding=1` +
    `&playsinline=1` +
    `&disablekb=1` +
    `&fs=0` +
    `&iv_load_policy=3` +
    `&cc_load_policy=0` +
    `&color=white` +
    origin
  );
}
