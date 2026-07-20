"use client";

import React from 'react';
import type { ModrinthProjectType, ModrinthCategory, ModrinthGameVersion, ModrinthLoader } from '../../../../types/modrinth';
import { ModPlatform } from '../../../../types/unified';
import type { AccentColor } from '../../../../store/useThemeStore';
import { ModrinthFilterSidebarV2 } from '../ModrinthFilterSidebarV2';
import type { UIDynamicFilterGroup } from '../modrinthSearchShared';

export interface ModrinthFiltersPanelProps {
  isVisible: boolean;
  projectType: ModrinthProjectType;
  accentColor: AccentColor;
  gameVersionSearchTerm: string;
  onGameVersionSearchTermChange: (term: string) => void;
  displayedGameVersions: ModrinthGameVersion[];
  selectedGameVersions: string[];
  onGameVersionToggle: (version: string) => void;
  showAllGameVersionsSidebar: boolean;
  onShowAllGameVersionsSidebarChange: (show: boolean) => void;
  availableLoaders: ModrinthLoader[];
  currentSelectedLoaders: string[];
  onLoaderToggle: (loaderName: string) => void;
  allLoadersData: ModrinthLoader[];
  dynamicFilterGroups: UIDynamicFilterGroup[];
  currentSelectedCategories: string[];
  onCategoryToggle: (categoryName: string) => void;
  filterClientRequired: boolean;
  onClientRequiredToggle: () => void;
  filterServerRequired: boolean;
  onServerRequiredToggle: () => void;
  modSource: ModPlatform;
}

export function ModrinthFiltersPanel({
  isVisible,
  projectType,
  accentColor,
  gameVersionSearchTerm,
  onGameVersionSearchTermChange,
  displayedGameVersions,
  selectedGameVersions,
  onGameVersionToggle,
  showAllGameVersionsSidebar,
  onShowAllGameVersionsSidebarChange,
  availableLoaders,
  currentSelectedLoaders,
  onLoaderToggle,
  allLoadersData,
  dynamicFilterGroups,
  currentSelectedCategories,
  onCategoryToggle,
  filterClientRequired,
  onClientRequiredToggle,
  filterServerRequired,
  onServerRequiredToggle,
  modSource,
}: ModrinthFiltersPanelProps) {
  if (!isVisible) return null;

  return (
    <ModrinthFilterSidebarV2
      projectType={projectType}
      accentColor={accentColor}
      gameVersionSearchTerm={gameVersionSearchTerm}
      onGameVersionSearchTermChange={onGameVersionSearchTermChange}
      displayedGameVersions={displayedGameVersions}
      selectedGameVersions={selectedGameVersions}
      onGameVersionToggle={onGameVersionToggle}
      showAllGameVersionsSidebar={showAllGameVersionsSidebar}
      onShowAllGameVersionsSidebarChange={onShowAllGameVersionsSidebarChange}
      availableLoaders={availableLoaders}
      currentSelectedLoaders={currentSelectedLoaders}
      onLoaderToggle={onLoaderToggle}
      allLoadersData={allLoadersData}
      dynamicFilterGroups={dynamicFilterGroups}
      currentSelectedCategories={currentSelectedCategories}
      onCategoryToggle={onCategoryToggle}
      filterClientRequired={filterClientRequired}
      onClientRequiredToggle={onClientRequiredToggle}
      filterServerRequired={filterServerRequired}
      onServerRequiredToggle={onServerRequiredToggle}
      modSource={modSource}
    />
  );
}
