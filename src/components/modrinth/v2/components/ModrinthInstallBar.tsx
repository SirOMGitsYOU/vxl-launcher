"use client";

import React from 'react';
import type { ModrinthProjectType } from '../../../../types/modrinth';
import { UnifiedSortType, ModPlatform } from '../../../../types/unified';
import { ModrinthSearchControlsV2 } from '../ModrinthSearchControlsV2';
import { ModrinthQuickInstallModalV2 } from '../ModrinthQuickInstallModalV2';
import type { UnifiedModSearchResult, UnifiedVersion } from '../../../../types/unified';
import { ALL_MODRINTH_PROJECT_TYPES, type Profile } from '../modrinthSearchShared';

interface SelectOption {
  value: UnifiedSortType;
  label: string;
  icon?: string;
}

export interface ModrinthInstallBarProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  projectType: ModrinthProjectType;
  onProjectTypeChange: (type: ModrinthProjectType) => void;
  availableProjectTypes: ModrinthProjectType[];
  allowedProjectTypes?: ModrinthProjectType[];
  profiles: Profile[];
  selectedProfile: Profile | null;
  onSelectedProfileChange: (profile: Profile | null) => void;
  sortOrder: UnifiedSortType;
  onSortOrderChange: (sort: UnifiedSortType) => void;
  sortOptions: SelectOption[];
  isSidebarVisible: boolean;
  onToggleSidebar: () => void;
  selectedGameVersions: string[];
  currentSelectedLoaders: string[];
  currentSelectedCategories: string[];
  filterClientRequired: boolean;
  filterServerRequired: boolean;
  onRemoveGameVersionTag: (version: string) => void;
  onRemoveLoaderTag: (loader: string) => void;
  onRemoveCategoryTag: (category: string) => void;
  onRemoveClientRequiredTag: () => void;
  onRemoveServerRequiredTag: () => void;
  onClearAllFilters: () => void;
  overrideDisplayContext?: 'detail' | 'standalone';
  modSource: ModPlatform;
  onModSourceChange: (source: ModPlatform) => void;
  quickInstallModalOpen: boolean;
  quickInstallProject: UnifiedModSearchResult | null;
  quickInstallVersions: UnifiedVersion[] | null;
  quickInstallLoading: boolean;
  quickInstallError: string | null;
  installStatus: Record<string, boolean>;
  installingProfiles: Record<string, boolean>;
  onCloseQuickInstallModal: () => void;
  onQuickInstallToProfile: (profileId: string) => void;
  onUninstallClick: (
    profileId: string,
    project: UnifiedModSearchResult,
    version: UnifiedVersion,
  ) => Promise<void>;
  findBestVersionForProfile: (
    profile: Profile,
    versions: UnifiedVersion[],
  ) => UnifiedVersion | null;
  onInstallToNewProfile: (
    profileName: string,
    project: UnifiedModSearchResult,
    version: UnifiedVersion | null,
    sourceProfileIdToCopy?: string | null,
  ) => Promise<void>;
}

export function ModrinthInstallBar({
  searchTerm,
  onSearchTermChange,
  projectType,
  onProjectTypeChange,
  availableProjectTypes,
  allowedProjectTypes,
  profiles,
  selectedProfile,
  onSelectedProfileChange,
  sortOrder,
  onSortOrderChange,
  sortOptions,
  isSidebarVisible,
  onToggleSidebar,
  selectedGameVersions,
  currentSelectedLoaders,
  currentSelectedCategories,
  filterClientRequired,
  filterServerRequired,
  onRemoveGameVersionTag,
  onRemoveLoaderTag,
  onRemoveCategoryTag,
  onRemoveClientRequiredTag,
  onRemoveServerRequiredTag,
  onClearAllFilters,
  overrideDisplayContext,
  modSource,
  onModSourceChange,
  quickInstallModalOpen,
  quickInstallProject,
  quickInstallVersions,
  quickInstallLoading,
  quickInstallError,
  installStatus,
  installingProfiles,
  onCloseQuickInstallModal,
  onQuickInstallToProfile,
  onUninstallClick,
  findBestVersionForProfile,
  onInstallToNewProfile,
}: ModrinthInstallBarProps) {
  return (
    <>
      <ModrinthSearchControlsV2
        searchTerm={searchTerm}
        onSearchTermChange={onSearchTermChange}
        projectType={projectType}
        onProjectTypeChange={onProjectTypeChange}
        availableProjectTypes={availableProjectTypes}
        allProjectTypes={allowedProjectTypes || ALL_MODRINTH_PROJECT_TYPES}
        profiles={profiles}
        selectedProfile={selectedProfile}
        onSelectedProfileChange={onSelectedProfileChange}
        sortOrder={sortOrder}
        onSortOrderChange={onSortOrderChange}
        sortOptions={sortOptions}
        isSidebarVisible={isSidebarVisible}
        onToggleSidebar={onToggleSidebar}
        selectedGameVersions={selectedGameVersions}
        currentSelectedLoaders={currentSelectedLoaders}
        currentSelectedCategories={currentSelectedCategories}
        filterClientRequired={filterClientRequired}
        filterServerRequired={filterServerRequired}
        onRemoveGameVersionTag={onRemoveGameVersionTag}
        onRemoveLoaderTag={onRemoveLoaderTag}
        onRemoveCategoryTag={onRemoveCategoryTag}
        onRemoveClientRequiredTag={onRemoveClientRequiredTag}
        onRemoveServerRequiredTag={onRemoveServerRequiredTag}
        onClearAllFilters={onClearAllFilters}
        overrideDisplayContext={overrideDisplayContext}
        modSource={modSource}
        onModSourceChange={onModSourceChange}
      />

      {quickInstallProject && quickInstallModalOpen && (
        <ModrinthQuickInstallModalV2
          isOpen={quickInstallModalOpen}
          onClose={onCloseQuickInstallModal}
          project={quickInstallProject as any}
          versions={quickInstallVersions as any}
          isLoading={quickInstallLoading}
          error={quickInstallError}
          profiles={profiles}
          selectedProfileId={selectedProfile?.id}
          installStatus={installStatus}
          installingProfiles={installingProfiles}
          onInstallToProfile={onQuickInstallToProfile}
          onUninstallClick={onUninstallClick as any}
          findBestVersionForProfile={findBestVersionForProfile as any}
          onInstallToNewProfile={onInstallToNewProfile as any}
        />
      )}
    </>
  );
}
