"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import type {
  ModrinthGameVersion,
  ModrinthSearchHit,
} from "../../../types/modrinth";
import type { UnifiedVersion } from "../../../types/unified";
import type { AccentColor } from "../../../store/useThemeStore";
import type { ContentInstallStatus } from "../../../types/profile";
import { Icon } from "@iconify/react";
import { ModrinthVersionItemV2 } from "./ModrinthVersionItemV2";
import { Select, Button } from "../../ui-v2";
import { CheckboxV2 } from "../../ui/CheckboxV2";
import { TagBadge } from "../../ui/TagBadge";

// --- Define Props for the new component ---
interface ModrinthVersionListV2Props {
  projectId: string;
  project: ModrinthSearchHit;
  versions: UnifiedVersion[];
  displayedCount: number;
  filters: {
    gameVersions: string[];
    loaders: string[];
    versionType: string;
  };
  uiState: {
    showAllGameVersions: boolean;
    gameVersionSearchTerm: string;
  };
  openDropdowns: {
    type: boolean;
    gameVersion: boolean;
    loader: boolean;
  };
  installedVersions: Record<string, ContentInstallStatus | null>;
  installingVersionStates?: Record<string, boolean>;
  installingModpackVersionStates?: Record<string, boolean>;
  selectedProfile: any | null; // Replace 'any' with actual Profile type if available
  accentColor: AccentColor;
  hoveredVersionId: string | null;
  gameVersionsData: ModrinthGameVersion[]; // Needed for filtering
  showAllGameVersionsSidebar: boolean; // State from main sidebar
  selectedGameVersionsSidebar: string[]; // State from main sidebar
  onFilterChange: (
    projectId: string,
    filterType: "gameVersions" | "loaders" | "versionType",
    value: string | string[],
  ) => void;
  onUiStateChange: (
    projectId: string,
    field: keyof ModrinthVersionListV2Props["uiState"],
    value: boolean | string,
  ) => void;
  onToggleDropdown: (
    projectId: string,
    dropdownType: "type" | "gameVersion" | "loader",
  ) => void;
  onCloseAllDropdowns: (projectId: string) => void;
  onLoadMore: (projectId: string) => void;
  onInstallClick: (
    project: ModrinthSearchHit,
    version: UnifiedVersion,
  ) => void;
  onInstallModpackVersionAsProfileClick?: (
    project: ModrinthSearchHit,
    version: UnifiedVersion,
  ) => void;
  onHoverVersion: (id: string | null) => void;
  selectedProfileId?: string | null;
  onDeleteClick?: (
    profileId: string,
    project: ModrinthSearchHit,
    version: UnifiedVersion,
  ) => void;
  onToggleEnableClick?: (
    profileId: string,
    project: ModrinthSearchHit,
    version: UnifiedVersion,
    newEnabledState: boolean,
    sha1Hash: string,
  ) => void;
  isProjectBlocked?: boolean; // Deprecated, use projectNoRiskStatus instead
  projectNoRiskStatus?: 'blocked' | 'warning' | null;
}

// --- Component Implementation ---
export const ModrinthVersionListV2: React.FC<ModrinthVersionListV2Props> = ({
  projectId,
  project,
  versions,
  displayedCount,
  filters,
  uiState,
  openDropdowns: _openDropdowns,
  installedVersions,
  installingVersionStates,
  installingModpackVersionStates,
  selectedProfile,
  accentColor: _accentColor,
  hoveredVersionId,
  gameVersionsData,
  showAllGameVersionsSidebar,
  selectedGameVersionsSidebar,
  onFilterChange,
  onUiStateChange,
  onToggleDropdown: _onToggleDropdown,
  onCloseAllDropdowns: _onCloseAllDropdowns,
  onLoadMore,
  onInstallClick,
  onInstallModpackVersionAsProfileClick,
  onHoverVersion,
  selectedProfileId,
  onDeleteClick,
  onToggleEnableClick,
  isProjectBlocked = false, // Deprecated
  projectNoRiskStatus = null,
}) => {
  const [showFilters, setShowFilters] = useState(false);

  const versionTypeOptions = [
    { value: "all", label: "All types" },
    { value: "release", label: "Release" },
    { value: "beta", label: "Beta" },
    { value: "alpha", label: "Alpha" },
  ];
  useEffect(() => {
    setShowFilters(
      filters.gameVersions.length > 0 ||
        filters.loaders.length > 0 ||
        filters.versionType !== "all",
    );
  }, [filters]);

  // --- Helper function to get filtered versions (moved from parent) ---
  const getFilteredVersions = (
    allVersions: UnifiedVersion[],
  ): UnifiedVersion[] => {
    if (!filters) return allVersions;

    return allVersions.filter((version) => {
      // Filter by version type
      if (
        filters.versionType !== "all" &&
        version.release_type !== filters.versionType
      ) {
        return false;
      }

      // Filter by game versions (if any selected)
      if (filters.gameVersions.length > 0) {
        const hasMatchingGameVersion = version.game_versions.some((gv) =>
          filters.gameVersions.includes(gv),
        );
        if (!hasMatchingGameVersion) return false;
      }

      // Filter by loaders (if any selected)
      if (filters.loaders.length > 0) {
        const hasMatchingLoader = version.loaders.some((loader) =>
          filters.loaders.includes(loader),
        );
        if (!hasMatchingLoader) return false;
      }

      return true;
    });
  };

  const filteredVersions = useMemo(
    () => getFilteredVersions(versions),
    [versions, filters.versionType, filters.gameVersions, filters.loaders],
  );

  // Get available game versions
  const availableGameVersions = useMemo(() => {
    const allProjectGameVersionsSet = new Set(
      versions.flatMap((v) => v.game_versions),
    );
    let availableGVs = Array.from(allProjectGameVersionsSet);

    if (!uiState?.showAllGameVersions) {
      // Apply main sidebar filters when checkbox is OFF
      if (selectedGameVersionsSidebar.length > 0) {
        availableGVs = availableGVs.filter((gv) =>
          selectedGameVersionsSidebar.includes(gv),
        );
      }
      if (!showAllGameVersionsSidebar) {
        const releaseVersions = new Set(
          gameVersionsData
            .filter((v) => v.version_type === "release")
            .map((v) => v.version),
        );
        availableGVs = availableGVs.filter((gv) => releaseVersions.has(gv));
      }
    }

    // Sort versions
    return availableGVs.sort((a, b) =>
      b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" }),
    );
  }, [
    versions,
    uiState?.showAllGameVersions,
    selectedGameVersionsSidebar,
    showAllGameVersionsSidebar,
    gameVersionsData,
  ]);

  // Get available loaders for the current project type
  const availableLoaders = useMemo(() => {
    // Get loaders that are actually used in this project's versions
    const projectLoaders = Array.from(
      new Set(versions.flatMap((v) => v.loaders)),
    );

    // Only show loaders that are relevant to this project
    return projectLoaders.sort();
  }, [versions]);

  // Create game version options
  const gameVersionOptions = useMemo(
    () => [
      { value: "all", label: "All game versions" },
      ...availableGameVersions.map((gv) => ({
        value: gv,
        label: gv,
      })),
    ],
    [availableGameVersions],
  );

  const loaderOptions = useMemo(
    () => [
      { value: "all", label: "All loaders" },
      ...availableLoaders.map((loader) => ({
        value: loader,
        label: loader,
      })),
    ],
    [availableLoaders],
  );

  // Handle clearing all filters
  const handleClearAllFilters = () => {
    onFilterChange(projectId, "versionType", "all");
    onFilterChange(projectId, "gameVersions", []);
    onFilterChange(projectId, "loaders", []);
  };

  return (
    <div className="bg-[var(--surface-base)] px-3 py-3">
      <div className="mb-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filters.versionType}
            onChange={(e) => onFilterChange(projectId, "versionType", e.target.value)}
            className="h-8 min-w-[7.5rem] text-xs"
          >
            {versionTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select
            value={filters.gameVersions.length > 0 ? filters.gameVersions[0] : "all"}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "all") {
                onFilterChange(projectId, "gameVersions", []);
              } else {
                const current = filters.gameVersions || [];
                const isAlreadySelected = current.includes(value);
                const newValue = isAlreadySelected
                  ? current.filter((v) => v !== value)
                  : [...current, value];
                onFilterChange(projectId, "gameVersions", newValue);
              }
            }}
            className="h-8 min-w-[9rem] max-w-[11rem] text-xs"
          >
            {gameVersionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select
            value={filters.loaders.length > 0 ? filters.loaders[0] : "all"}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "all") {
                onFilterChange(projectId, "loaders", []);
              } else {
                const current = filters.loaders || [];
                const isAlreadySelected = current.includes(value);
                const newValue = isAlreadySelected
                  ? current.filter((l) => l !== value)
                  : [...current, value];
                onFilterChange(projectId, "loaders", newValue);
              }
            }}
            className="h-8 min-w-[7.5rem] text-xs"
          >
            {loaderOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <div className="ml-auto">
            <CheckboxV2
              checked={uiState?.showAllGameVersions || false}
              onChange={(checked) =>
                onUiStateChange(projectId, "showAllGameVersions", checked)
              }
              label="Show all versions"
              size="sm"
            />
          </div>
        </div>

        {showFilters && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 overflow-x-auto hide-scrollbar rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)]">
              <div className="flex items-center gap-1.5 p-2">
                <TagBadge
                  variant="destructive"
                  className="cursor-pointer hover:brightness-110 transition-all flex-shrink-0 flex items-center"
                  onClick={handleClearAllFilters}
                >
                  <Icon icon="solar:trash-bin-trash-bold" className="w-3 h-3 mr-1.5" />
                  <span>Clear All</span>
                </TagBadge>

                {filters.versionType !== "all" && (
                  <TagBadge 
                    variant="filter"
                    className="inline-flex whitespace-nowrap">
                    Type: {filters.versionType}
                    <button
                      onClick={() =>
                        onFilterChange(projectId, "versionType", "all")
                      }
                      className="ml-1.5 text-current opacity-70 hover:opacity-100 focus:outline-none"
                      aria-label={`Remove version type ${filters.versionType}`}
                    >
                      <Icon
                        icon="solar:close-circle-bold"
                        className="w-3 h-3"
                      />
                    </button>
                  </TagBadge>
                )}

                {filters.gameVersions.map((version) => (
                  <TagBadge
                    key={`gv-${version}`}
                    variant="filter"
                    className="inline-flex whitespace-nowrap"
                  >
                    {version}
                    <button
                      onClick={() => {
                        const newVersions = filters.gameVersions.filter(
                          (v) => v !== version,
                        );
                        onFilterChange(projectId, "gameVersions", newVersions);
                      }}
                      className="ml-1.5 text-current opacity-70 hover:opacity-100 focus:outline-none"
                      aria-label={`Remove game version ${version}`}
                    >
                      <Icon
                        icon="solar:close-circle-bold"
                        className="w-3 h-3"
                      />
                    </button>
                  </TagBadge>
                ))}

                {filters.loaders.map((loader) => (
                  <TagBadge
                    key={`loader-${loader}`}
                    variant="filter"
                    className="inline-flex whitespace-nowrap"
                  >
                    {loader}
                    <button
                      onClick={() => {
                        const newLoaders = filters.loaders.filter(
                          (l) => l !== loader,
                        );
                        onFilterChange(projectId, "loaders", newLoaders);
                      }}
                      className="ml-1.5 text-current opacity-70 hover:opacity-100 focus:outline-none"
                      aria-label={`Remove loader ${loader}`}
                    >
                      <Icon
                        icon="solar:close-circle-bold"
                        className="w-3 h-3"
                      />
                    </button>
                  </TagBadge>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {filteredVersions.length > 0 ? (
        <div className="space-y-2">
          {filteredVersions.slice(0, displayedCount).map((version) => {
            const versionStatus = selectedProfile
              ? installedVersions?.[version.id] || null
              : null;
            const isInstalling = installingVersionStates?.[version.id] || false;
            const isInstallingModpackVersion =
              installingModpackVersionStates?.[version.id] || false;
            const isVersionHovered = hoveredVersionId === version.id;
            return (
              <ModrinthVersionItemV2
                key={version.id}
                version={version}
                project={project}
                versionStatus={versionStatus}
                isInstalling={isInstalling}
                isInstallingModpackVersion={isInstallingModpackVersion}
                isHovered={isVersionHovered}
                onMouseEnter={() => onHoverVersion(version.id)}
                onMouseLeave={() => onHoverVersion(null)}
                onInstallClick={onInstallClick}
                onInstallModpackVersionAsProfileClick={
                  onInstallModpackVersionAsProfileClick
                }
                selectedProfileId={selectedProfileId}
                onDeleteClick={onDeleteClick}
                onToggleEnableClick={onToggleEnableClick}
                noRiskStatus={(version as any).noRiskStatus || projectNoRiskStatus}
              />
            );
          })}
          {/* Load More Button */}
          {filteredVersions.length > displayedCount && (
            <Button
              onClick={() => onLoadMore(projectId)}
              variant="ghost"
              size="sm"
              className="mt-2 w-full text-xs"
            >
              Load more ({filteredVersions.length - displayedCount} remaining)
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)] p-4 text-center text-sm text-[var(--text-secondary)]">
          No versions match the selected filters.
        </div>
      )}
    </div>
  );
};
