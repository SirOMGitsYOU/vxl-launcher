"use client";

import React, { useRef } from 'react';
import { cn } from '../../../lib/utils';
import type { ModrinthProjectType } from '../../../types/modrinth';
import { ALL_MODRINTH_PROJECT_TYPES, type Profile } from './modrinthSearchShared';
import { useModrinthSearch } from './hooks/useModrinthSearch';
import { useModrinthUpdates } from './hooks/useModrinthUpdates';
import { useModrinthInstall } from './hooks/useModrinthInstall';
import { ModrinthInstallBar } from './components/ModrinthInstallBar';
import { ModrinthResultList } from './components/ModrinthResultList';
import { ModrinthFiltersPanel } from './components/ModrinthFiltersPanel';

import type { UnifiedVersion } from '../../../types/unified';

export interface ModrinthSearchV2Props {
  profiles: Profile[];
  onInstallSuccess?: () => void;
  className?: string;
  selectedProfileId?: string;
  initialSidebarVisible?: boolean;
  overrideDisplayContext?: 'detail' | 'standalone';
  initialProjectType?: ModrinthProjectType;
  allowedProjectTypes?: ModrinthProjectType[];
  disableVirtualization?: boolean;
  useVXLStudiosData?: boolean;
}

export function ModrinthSearchV2({
  profiles,
  onInstallSuccess,
  className = '',
  selectedProfileId,
  initialSidebarVisible = true,
  overrideDisplayContext,
  initialProjectType,
  allowedProjectTypes,
  disableVirtualization = false,
  useVXLStudiosData = false,
}: ModrinthSearchV2Props) {
  const checkStatusRef = useRef<
    | ((
        projectId: string,
        versions: UnifiedVersion[],
        startIndex: number,
        count: number,
        forceRefresh?: string[],
      ) => Promise<void>)
    | undefined
  >(undefined);

  const search = useModrinthSearch({
    profiles,
    selectedProfileId,
    initialSidebarVisible,
    overrideDisplayContext,
    initialProjectType,
    allowedProjectTypes,
    useVXLStudiosData,
    checkDisplayedVersionsStatus: checkStatusRef.current,
  });

  const updates = useModrinthUpdates({
    selectedProfile: search.selectedProfile,
    searchResults: search.searchResults,
    projectType: search.projectType,
    expandedVersions: search.expandedVersions,
    numDisplayedVersions: search.numDisplayedVersions,
    versionFilters: search.versionFilters,
    getFilteredVersions: search.getFilteredVersions,
  });

  checkStatusRef.current = updates.checkDisplayedVersionsStatus;

  const install = useModrinthInstall({
    onInstallSuccess,
    search,
    updates,
  });

  const {
    searchResultsAreaRef,
    searchTerm,
    setSearchTerm,
    projectType,
    searchResults,
    loading,
    error,
    totalHits,
    sortOrder,
    setSortOrder,
    sortOptions,
    gameVersionsData,
    allLoadersData,
    selectedGameVersions,
    setSelectedGameVersions,
    setSelectedLoadersByProjectType,
    showAllGameVersionsSidebar,
    setShowAllGameVersionsSidebar,
    gameVersionSearchTerm,
    setGameVersionSearchTerm,
    filterClientRequired,
    setFilterClientRequired,
    filterServerRequired,
    setFilterServerRequired,
    expandedVersions,
    numDisplayedVersions,
    versionFilters,
    isSidebarVisible,
    setIsSidebarVisible,
    selectedProfile,
    setSelectedProfile,
    modSource,
    setModSource,
    internalProfiles,
    currentSelectedCategories,
    currentSelectedLoaders,
    availableProjectTypes,
    availableLoaders,
    displayedGameVersions,
    dynamicFilterGroups,
    showNoResultsMessage,
    handleProjectTypeChange,
    handleCategoryToggle,
    handleGameVersionToggle,
    handleLoaderToggle,
    loadMoreResults,
    removeGameVersionTag,
    removeLoaderTag,
    removeCategoryTag,
    removeClientRequiredTag,
    removeServerRequiredTag,
    clearAllFilters,
    toggleProjectVersions,
    handleVersionFilterChange,
    loadMoreProjectVersions,
    hoveredVersionId,
    setHoveredVersionId,
    openVersionDropdowns,
    toggleVersionDropdown,
    closeAllVersionDropdowns,
    versionDropdownUIState,
    handleVersionDropdownUIChange,
    accentColor,
    isStandaloneBrowse,
    initialDisplayCount,
  } = search;

  const { installedProjects, installedVersions } = updates;

  const {
    quickInstallModalOpen,
    quickInstallProject,
    quickInstallVersions,
    quickInstallLoading,
    quickInstallError,
    quickInstallingProjects,
    installingModpackAsProfile,
    installingVersion,
    installingModpackVersion,
    installStatus,
    installing,
    quickInstall,
    handleDirectQuickInstall,
    handleInstallModpackAsProfile,
    handleInstallModpackVersionAsProfile,
    handleDirectInstall,
    handleDeleteVersionFromProfile,
    handleToggleEnableVersion,
    closeQuickInstallModal,
    quickInstallToProfile,
    findBestVersionForProfile,
    handleInstallToNewProfile,
  } = install;

  const onQuickInstallClick =
    overrideDisplayContext === 'detail' ? handleDirectQuickInstall : quickInstall;

  return (
    <div className={`modrinth-search-v2 flex h-full flex-row gap-4 ${className}`}>
      <div
        className={cn(
          'left-content-area flex min-w-0 flex-1 flex-col overflow-hidden',
          isStandaloneBrowse && 'pl-6 pt-4',
        )}
      >
        <ModrinthInstallBar
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          projectType={projectType}
          onProjectTypeChange={handleProjectTypeChange}
          availableProjectTypes={availableProjectTypes}
          allowedProjectTypes={allowedProjectTypes || ALL_MODRINTH_PROJECT_TYPES}
          profiles={internalProfiles}
          selectedProfile={selectedProfile}
          onSelectedProfileChange={(profile) => {
            if (profile === null) {
              setSelectedProfile(null);
              setSelectedGameVersions([]);
              setSelectedLoadersByProjectType((prev) => ({
                ...prev,
                [projectType]: [],
              }));
            } else {
              setSelectedProfile(profile);
            }
          }}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          sortOptions={sortOptions}
          isSidebarVisible={isSidebarVisible}
          onToggleSidebar={() => setIsSidebarVisible(!isSidebarVisible)}
          selectedGameVersions={selectedGameVersions}
          currentSelectedLoaders={currentSelectedLoaders}
          currentSelectedCategories={currentSelectedCategories}
          filterClientRequired={filterClientRequired}
          filterServerRequired={filterServerRequired}
          onRemoveGameVersionTag={removeGameVersionTag}
          onRemoveLoaderTag={removeLoaderTag}
          onRemoveCategoryTag={removeCategoryTag}
          onRemoveClientRequiredTag={removeClientRequiredTag}
          onRemoveServerRequiredTag={removeServerRequiredTag}
          onClearAllFilters={clearAllFilters}
          overrideDisplayContext={overrideDisplayContext}
          modSource={modSource}
          onModSourceChange={setModSource}
          quickInstallModalOpen={quickInstallModalOpen}
          quickInstallProject={quickInstallProject}
          quickInstallVersions={quickInstallVersions}
          quickInstallLoading={quickInstallLoading}
          quickInstallError={quickInstallError}
          installStatus={installStatus}
          installingProfiles={installing}
          onCloseQuickInstallModal={closeQuickInstallModal}
          onQuickInstallToProfile={quickInstallToProfile}
          onUninstallClick={handleDeleteVersionFromProfile}
          findBestVersionForProfile={findBestVersionForProfile}
          onInstallToNewProfile={handleInstallToNewProfile}
        />

        <ModrinthResultList
          searchResultsAreaRef={searchResultsAreaRef}
          searchResults={searchResults}
          loading={loading}
          error={error}
          showNoResultsMessage={showNoResultsMessage}
          totalHits={totalHits}
          disableVirtualization={disableVirtualization}
          expandedVersions={expandedVersions}
          numDisplayedVersions={numDisplayedVersions}
          initialDisplayCount={initialDisplayCount}
          versionFilters={versionFilters}
          versionDropdownUIState={versionDropdownUIState}
          openVersionDropdowns={openVersionDropdowns}
          selectedProfile={selectedProfile}
          installedProjects={installedProjects}
          installedVersions={installedVersions}
          accentColor={accentColor}
          quickInstallingProjects={quickInstallingProjects}
          installingModpackAsProfile={installingModpackAsProfile}
          installingVersion={installingVersion}
          installingModpackVersion={installingModpackVersion}
          hoveredVersionId={hoveredVersionId}
          gameVersionsData={gameVersionsData}
          showAllGameVersionsSidebar={showAllGameVersionsSidebar}
          selectedGameVersions={selectedGameVersions}
          onQuickInstallClick={onQuickInstallClick}
          onInstallModpackAsProfileClick={handleInstallModpackAsProfile}
          onInstallModpackVersionAsProfileClick={handleInstallModpackVersionAsProfile}
          onToggleVersionsClick={toggleProjectVersions}
          onVersionFilterChange={handleVersionFilterChange}
          onVersionUiStateChange={handleVersionDropdownUIChange}
          onToggleVersionDropdown={toggleVersionDropdown}
          onCloseAllVersionDropdowns={closeAllVersionDropdowns}
          onLoadMoreVersions={loadMoreProjectVersions}
          onInstallVersionClick={handleDirectInstall}
          onHoverVersion={setHoveredVersionId}
          onDeleteVersionClick={handleDeleteVersionFromProfile}
          onToggleEnableClick={handleToggleEnableVersion}
          onLoadMoreResults={loadMoreResults}
        />
      </div>

      <ModrinthFiltersPanel
        isVisible={isSidebarVisible}
        projectType={projectType}
        accentColor={accentColor}
        gameVersionSearchTerm={gameVersionSearchTerm}
        onGameVersionSearchTermChange={setGameVersionSearchTerm}
        displayedGameVersions={displayedGameVersions}
        selectedGameVersions={selectedGameVersions}
        onGameVersionToggle={handleGameVersionToggle}
        showAllGameVersionsSidebar={showAllGameVersionsSidebar}
        onShowAllGameVersionsSidebarChange={setShowAllGameVersionsSidebar}
        availableLoaders={availableLoaders}
        currentSelectedLoaders={currentSelectedLoaders}
        onLoaderToggle={handleLoaderToggle}
        allLoadersData={allLoadersData}
        dynamicFilterGroups={dynamicFilterGroups}
        currentSelectedCategories={currentSelectedCategories}
        onCategoryToggle={handleCategoryToggle}
        filterClientRequired={filterClientRequired}
        onClientRequiredToggle={() => setFilterClientRequired(!filterClientRequired)}
        filterServerRequired={filterServerRequired}
        onServerRequiredToggle={() => setFilterServerRequired(!filterServerRequired)}
        modSource={modSource}
      />
    </div>
  );
}
