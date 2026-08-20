import { create } from "zustand";
import { persist } from "zustand/middleware";

export enum BACKGROUND_EFFECTS {
  NONE = "none",
  MATRIX_RAIN = "matrix-rain",
  ENCHANTMENT_PARTICLES = "enchantment-particles",
  NEBULA_WAVES = "nebula-waves",
  NEBULA_PARTICLES = "nebula-particles",
  NEBULA_GRID = "nebula-grid",
  NEBULA_VOXELS = "nebula-voxels",
  NEBULA_LIGHTNING = "nebula-lightning",
  NEBULA_LIQUID_CHROME = "nebula-liquid-chrome",
  RETRO_GRID = "retro-grid",
  VOXEL_GRID = "voxel-grid",
  RETRO_VOXEL_GRID = "retro-voxel-grid",
  PLAIN_BACKGROUND = "plain-background",
}

export type CustomMediaType = "image" | "video" | "youtube";
export type CustomMediaQuality = "low" | "medium" | "high";

interface BackgroundEffectState {
  currentEffect: string;
  customMediaUrl: string | null;
  customMediaType: CustomMediaType | null;
  customMediaBlur: number;
  customMediaQuality: CustomMediaQuality;
  customMediaOnlyOnPlay: boolean;
  customMediaHideEffects: boolean;
  presetBackgroundId: string | null;
  setCurrentEffect: (effect: string) => void;
  setCustomMedia: (url: string | null, type: CustomMediaType | null) => void;
  setPresetBackground: (presetId: string | null) => void;
  clearCustomBackground: () => void;
  setCustomMediaBlur: (blur: number) => void;
  setCustomMediaQuality: (quality: CustomMediaQuality) => void;
  setCustomMediaOnlyOnPlay: (onlyOnPlay: boolean) => void;
  setCustomMediaHideEffects: (hideEffects: boolean) => void;
}

export const useBackgroundEffectStore = create<BackgroundEffectState>()(
  persist(
    (set) => ({
      currentEffect: BACKGROUND_EFFECTS.RETRO_GRID,
      customMediaUrl: null,
      customMediaType: null,
      customMediaBlur: 0,
      customMediaQuality: "high",
      customMediaOnlyOnPlay: true,
      customMediaHideEffects: true,
      presetBackgroundId: null,
      setCurrentEffect: (effect) => set({ currentEffect: effect }),
      setCustomMedia: (url, type) =>
        set({
          customMediaUrl: url,
          customMediaType: type,
          presetBackgroundId: null,
        }),
      setPresetBackground: (presetId) =>
        set({
          presetBackgroundId: presetId,
          customMediaType: presetId ? "youtube" : null,
          customMediaUrl: null,
        }),
      clearCustomBackground: () =>
        set({
          customMediaUrl: null,
          customMediaType: null,
          presetBackgroundId: null,
        }),
      setCustomMediaBlur: (blur) => set({ customMediaBlur: blur }),
      setCustomMediaQuality: (quality) => set({ customMediaQuality: quality }),
      setCustomMediaOnlyOnPlay: (onlyOnPlay) =>
        set({ customMediaOnlyOnPlay: onlyOnPlay }),
      setCustomMediaHideEffects: (hideEffects) =>
        set({ customMediaHideEffects: hideEffects }),
    }),
    {
      name: "vxl-background-effect-storage",
    },
  ),
);
