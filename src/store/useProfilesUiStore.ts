import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setProfileGroupingPreference } from "../services/launcher-config-service";

interface ProfilesUiState {
  profileGroupingCriterion: string;
  setProfileGroupingCriterion: (criterion: string) => Promise<void>;
  collapsedProfileGroups: string[];
  setCollapsedProfileGroups: (groups: string[]) => void;
  toggleCollapsedProfileGroup: (groupKey: string) => void;
  profilesTabActiveGroup: string;
  profilesTabSortBy: string;
  profilesTabVersionFilter: string;
  profilesTabLayoutMode: "list" | "grid" | "compact";
  setProfilesTabActiveGroup: (group: string) => void;
  setProfilesTabSortBy: (sortBy: string) => void;
  setProfilesTabVersionFilter: (filter: string) => void;
  setProfilesTabLayoutMode: (mode: "list" | "grid" | "compact") => void;
}

export const useProfilesUiStore = create<ProfilesUiState>()(
  persist(
    (set) => ({
      profileGroupingCriterion: "group",
      collapsedProfileGroups: [],
      profilesTabActiveGroup: "all",
      profilesTabSortBy: "last_played",
      profilesTabVersionFilter: "all",
      profilesTabLayoutMode: "compact",

      setProfileGroupingCriterion: async (criterion: string) => {
        try {
          await setProfileGroupingPreference(criterion);
        } catch (error) {
          console.error("Failed to save profile grouping preference:", error);
        }
        set({ profileGroupingCriterion: criterion });
      },

      setCollapsedProfileGroups: (groups) => set({ collapsedProfileGroups: groups }),
      toggleCollapsedProfileGroup: (groupKey) =>
        set((state) => ({
          collapsedProfileGroups: state.collapsedProfileGroups.includes(groupKey)
            ? state.collapsedProfileGroups.filter((key) => key !== groupKey)
            : [...state.collapsedProfileGroups, groupKey],
        })),

      setProfilesTabActiveGroup: (group) => set({ profilesTabActiveGroup: group }),
      setProfilesTabSortBy: (sortBy) => set({ profilesTabSortBy: sortBy }),
      setProfilesTabVersionFilter: (filter) =>
        set({ profilesTabVersionFilter: filter }),
      setProfilesTabLayoutMode: (mode) => set({ profilesTabLayoutMode: mode }),
    }),
    {
      name: "vxl-profiles-ui-storage",
    },
  ),
);
