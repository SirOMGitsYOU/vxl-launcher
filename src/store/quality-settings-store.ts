import { create } from "zustand";
import { persist } from "zustand/middleware";

export type QualityLevel = "low" | "medium" | "high";

interface QualitySettingsState {
  qualityLevel: QualityLevel;
  setQualityLevel: (level: QualityLevel) => void;
  skinRenderer3d: boolean;
  setSkinRenderer3d: (enabled: boolean) => void;
}

export const useQualitySettingsStore = create<QualitySettingsState>()(
  persist(
    (set) => ({
      qualityLevel: "medium",
      setQualityLevel: (level) => set({ qualityLevel: level }),
      skinRenderer3d: true,
      setSkinRenderer3d: (enabled) => set({ skinRenderer3d: enabled }),
    }),
    {
      name: "vxl-quality-settings-storage",
    },
  ),
);
