import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ModPlatform } from "../types/unified";

interface NavigationUiState {
  openContextMenuId: string | null;
  setOpenContextMenuId: (id: string | null) => void;
  modSource: ModPlatform;
  setModSource: (source: ModPlatform) => void;
  serverSectionCollapsed: boolean;
  setServerSectionCollapsed: (collapsed: boolean) => void;
}

export const useNavigationUiStore = create<NavigationUiState>()(
  persist(
    (set) => ({
      openContextMenuId: null,
      modSource: ModPlatform.Modrinth,
      serverSectionCollapsed: false,
      setOpenContextMenuId: (id) => set({ openContextMenuId: id }),
      setModSource: (source) => set({ modSource: source }),
      setServerSectionCollapsed: (collapsed) =>
        set({ serverSectionCollapsed: collapsed }),
    }),
    {
      name: "vxl-navigation-ui-storage",
    },
  ),
);
