"use client";

import React from 'react';
import { Virtuoso } from 'react-virtuoso';
import type { UnifiedModSearchResult, UnifiedVersion } from '../../../../types/unified';
import type { ModrinthGameVersion } from '../../../../types/modrinth';
import type { ContentInstallStatus } from '../../../../types/profile';
import type { AccentColor } from '../../../../store/useThemeStore';
import { ModrinthProjectCardV2 } from '../ModrinthProjectCardV2';
import type { Profile } from '../modrinthSearchShared';
import type { VersionFiltersState } from '../hooks/useModrinthUpdates';

export interface ModrinthResultListProps {
  searchResultsAreaRef: React.RefObject<HTMLDivElement>;
  searchResults: UnifiedModSearchResult[];
  loading: boolean;
  error: string | null;
  showNoResultsMessage: boolean;
  totalHits: number;
  disableVirtualization?: boolean;
  expandedVersions: Record<string, UnifiedVersion[] | null | 'loading'>;
  numDisplayedVersions: Record<string, number>;
  initialDisplayCount: number;
  versionFilters: Record<string, VersionFiltersState>;
  versionDropdownUIState: Record<
    string,
    { showAllGameVersions: boolean; gameVersionSearchTerm: string }
  >;
  openVersionDropdowns: Record<
    string,
    { type: boolean; gameVersion: boolean; loader: boolean }
  >;
  selectedProfile: Profile | null;
  installedProjects: Record<string, ContentInstallStatus | null>;
  installedVersions: Record<string, Record<string, ContentInstallStatus>>;
  accentColor: AccentColor;
  quickInstallingProjects: Record<string, boolean>;
  installingModpackAsProfile: Record<string, boolean>;
  installingVersion: Record<string, boolean>;
  installingModpackVersion: Record<string, boolean>;
  hoveredVersionId: string | null;
  gameVersionsData: ModrinthGameVersion[];
  showAllGameVersionsSidebar: boolean;
  selectedGameVersions: string[];
  onQuickInstallClick: (project: UnifiedModSearchResult) => void;
  onInstallModpackAsProfileClick: (project: UnifiedModSearchResult) => void;
  onInstallModpackVersionAsProfileClick: (
    project: UnifiedModSearchResult,
    version: UnifiedVersion,
  ) => void;
  onToggleVersionsClick: (projectId: string) => void;
  onVersionFilterChange: (
    projectId: string,
    filterType: 'gameVersions' | 'loaders' | 'versionType',
    value: string | string[],
  ) => void;
  onVersionUiStateChange: (
    projectId: string,
    field: 'showAllGameVersions' | 'gameVersionSearchTerm',
    value: boolean | string,
  ) => void;
  onToggleVersionDropdown: (
    projectId: string,
    dropdownType: 'type' | 'gameVersion' | 'loader',
  ) => void;
  onCloseAllVersionDropdowns: (projectId: string) => void;
  onLoadMoreVersions: (projectId: string) => void;
  onInstallVersionClick: (
    project: UnifiedModSearchResult,
    version: UnifiedVersion,
  ) => void;
  onHoverVersion: (versionId: string | null) => void;
  onDeleteVersionClick: (
    profileId: string,
    project: UnifiedModSearchResult,
    version: UnifiedVersion,
  ) => void;
  onToggleEnableClick: (
    profileId: string,
    project: UnifiedModSearchResult,
    version: UnifiedVersion,
    newEnabledState: boolean,
    sha1Hash: string,
  ) => void;
  onLoadMoreResults: () => void;
}

export function ModrinthResultList({
  searchResultsAreaRef,
  searchResults,
  loading,
  error,
  showNoResultsMessage,
  totalHits,
  disableVirtualization = false,
  expandedVersions,
  numDisplayedVersions,
  initialDisplayCount,
  versionFilters,
  versionDropdownUIState,
  openVersionDropdowns,
  selectedProfile,
  installedProjects,
  installedVersions,
  accentColor,
  quickInstallingProjects,
  installingModpackAsProfile,
  installingVersion,
  installingModpackVersion,
  hoveredVersionId,
  gameVersionsData,
  showAllGameVersionsSidebar,
  selectedGameVersions,
  onQuickInstallClick,
  onInstallModpackAsProfileClick,
  onInstallModpackVersionAsProfileClick,
  onToggleVersionsClick,
  onVersionFilterChange,
  onVersionUiStateChange,
  onToggleVersionDropdown,
  onCloseAllVersionDropdowns,
  onLoadMoreVersions,
  onInstallVersionClick,
  onHoverVersion,
  onDeleteVersionClick,
  onToggleEnableClick,
  onLoadMoreResults,
}: ModrinthResultListProps) {
  const renderProjectCard = (hit: UnifiedModSearchResult, index: number) => {
    const projectVersions = expandedVersions[hit.project_id];
    const displayedCount =
      numDisplayedVersions[hit.project_id] || initialDisplayCount;
    const currentProjectInstallStatus = selectedProfile
      ? installedProjects[hit.project_id]
      : null;
    const currentVersionFilters = versionFilters[hit.project_id] || {
      gameVersions: [],
      loaders: [],
      versionType: 'all',
    };
    const currentVersionDropdownUIState = versionDropdownUIState[
      hit.project_id
    ] || { showAllGameVersions: false, gameVersionSearchTerm: '' };
    const currentOpenVersionDropdowns = openVersionDropdowns[hit.project_id] || {
      type: false,
      gameVersion: false,
      loader: false,
    };

    return (
      <ModrinthProjectCardV2
        key={hit.project_id}
        itemIndex={index}
        hit={hit}
        accentColor={accentColor}
        installStatus={currentProjectInstallStatus}
        isQuickInstalling={quickInstallingProjects[hit.project_id] || false}
        isInstallingModpackAsProfile={
          installingModpackAsProfile[hit.project_id] || false
        }
        installingVersionStates={installingVersion}
        installingModpackVersionStates={installingModpackVersion}
        onQuickInstallClick={onQuickInstallClick}
        onInstallModpackAsProfileClick={onInstallModpackAsProfileClick}
        onInstallModpackVersionAsProfileClick={
          onInstallModpackVersionAsProfileClick
        }
        onToggleVersionsClick={onToggleVersionsClick}
        isExpanded={Array.isArray(projectVersions) && projectVersions.length > 0}
        isLoadingVersions={projectVersions === 'loading'}
        projectVersions={projectVersions}
        displayedCount={displayedCount}
        versionFilters={currentVersionFilters}
        versionDropdownUIState={currentVersionDropdownUIState}
        openVersionDropdowns={currentOpenVersionDropdowns}
        installedVersions={
          selectedProfile ? installedVersions[selectedProfile.id] || {} : {}
        }
        selectedProfile={selectedProfile}
        selectedProfileId={selectedProfile?.id}
        hoveredVersionId={hoveredVersionId}
        gameVersionsData={gameVersionsData}
        showAllGameVersionsSidebar={showAllGameVersionsSidebar}
        selectedGameVersionsSidebar={selectedGameVersions}
        onVersionFilterChange={onVersionFilterChange}
        onVersionUiStateChange={onVersionUiStateChange}
        onToggleVersionDropdown={onToggleVersionDropdown}
        onCloseAllVersionDropdowns={onCloseAllVersionDropdowns}
        onLoadMoreVersions={onLoadMoreVersions}
        onInstallVersionClick={onInstallVersionClick}
        onHoverVersion={onHoverVersion}
        onDeleteVersionClick={onDeleteVersionClick}
        onToggleEnableClick={onToggleEnableClick}
      />
    );
  };

  return (
    <div
      ref={searchResultsAreaRef}
      className="search-results-area flex-1 overflow-y-auto"
    >
      {searchResults.length === 0 && !loading && error && (
        <p className="p-4 text-center text-red-500">Error: {error}</p>
      )}
      {searchResults.length === 0 && !loading && !error && showNoResultsMessage && (
        <p className="p-4 text-center text-xl lowercase text-gray-400">
          No results found. Try adjusting filters or search term.
        </p>
      )}

      {searchResults.length > 0 &&
        (disableVirtualization ? (
          <div>
            {searchResults.map((hit, index) => renderProjectCard(hit, index))}

            {!loading &&
              searchResults.length > 0 &&
              searchResults.length < totalHits && (
                <div className="flex justify-center p-4">
                  <button
                    onClick={onLoadMoreResults}
                    className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--surface-border-strong)] hover:text-white"
                  >
                    Load More ({totalHits - searchResults.length} remaining)
                  </button>
                </div>
              )}

            {loading && searchResults.length > 0 && (
              <div className="p-4 text-center">Loading more items...</div>
            )}

            {!loading &&
              searchResults.length > 0 &&
              searchResults.length >= totalHits && (
                <div className="p-4 text-center text-xl text-gray-400">
                  No more results.
                </div>
              )}
          </div>
        ) : (
          <Virtuoso
            style={{ height: '100%' }}
            data={searchResults}
            endReached={onLoadMoreResults}
            itemContent={(index, hit) => renderProjectCard(hit, index)}
            components={{
              Footer: () => {
                if (loading && searchResults.length > 0) {
                  return (
                    <div className="p-4 text-center">Loading more items...</div>
                  );
                }
                if (
                  !loading &&
                  searchResults.length > 0 &&
                  searchResults.length >= totalHits
                ) {
                  return (
                    <div className="p-4 text-center text-xl text-gray-400">
                      No more results.
                    </div>
                  );
                }
                return null;
              },
            }}
          />
        ))}
    </div>
  );
}
