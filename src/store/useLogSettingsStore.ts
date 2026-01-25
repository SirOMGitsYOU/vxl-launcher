import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LogSettingsState {
  showThreadPrefix: boolean;

  setShowThreadPrefix: (show: boolean) => void;
  toggleShowThreadPrefix: () => void;
}

export const useLogSettingsStore = create<LogSettingsState>()(
  persist(
    (set) => ({
      showThreadPrefix: false,

      setShowThreadPrefix: (show) => set({ showThreadPrefix: show }),
      toggleShowThreadPrefix: () =>
        set((state) => ({ showThreadPrefix: !state.showThreadPrefix })),
    }),
    {
      name: "log-settings",
    }
  )
);
