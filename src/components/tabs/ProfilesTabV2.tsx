"use client";

import { useEffect, useState } from "react";
import { useProfileStore } from "../../store/profile-store";
import { LoadingState, EmptyState, Select, IconButton, ToolbarActions } from "../ui-v2";
import { LibraryProfileCard } from "../library/LibraryProfileCard";
import { useShellSearchTab } from "../../hooks/useShellSearchTab";
import { useShellSearch } from "../../contexts/ShellSearchContext";
import { BrowseDetailLayout } from "../layout/BrowseDetailLayout";
import type { ToolbarAction } from "../ui-v2";
import { useNavigate } from "react-router-dom";
import { ProfileImport } from "../profiles/ProfileImport";
import { useProfileWizardStore } from "../../store/profile-wizard-store";
import { useThemeStore } from "../../store/useThemeStore";
import { useGlobalModal } from "../../hooks/useGlobalModal";
import { Icon } from "@iconify/react";
import { DataSyncModal } from "../modals/DataSyncModal";
export function ProfilesTabV2() {
  const {
    profiles,
    loading,
    error,
    fetchProfiles,
  } = useProfileStore();
  const navigate = useNavigate();
  const { openModal: openWizard } = useProfileWizardStore();
  // Global modal system
  const { showModal, hideModal } = useGlobalModal();
  
  // Persistent filters from theme store
  const {
    profilesTabActiveGroup,
    profilesTabSortBy,
    profilesTabVersionFilter,
    profilesTabLayoutMode,
    setProfilesTabActiveGroup,
    setProfilesTabSortBy,
    setProfilesTabLayoutMode,
  } = useThemeStore();  
  // Local non-persistent state
  const [isDataSyncModalOpen, setIsDataSyncModalOpen] = useState(false);
  const { query: searchQuery } = useShellSearch();
  
  // Use persistent values instead of local state
  const activeGroup = profilesTabActiveGroup;
  const sortBy = profilesTabSortBy;
  const versionFilter = profilesTabVersionFilter;
  const layoutMode = profilesTabLayoutMode;

  useShellSearchTab("Search profiles...");

  // Action buttons configuration
  const actionButtons: ToolbarAction[] = [
    {
      id: "data-sync",
      label: "Data sync",
      icon: "solar:share-bold",
      onClick: () => {
        setIsDataSyncModalOpen(true);
      },
    },
    {
      id: "import",
      label: "Import",
      icon: "solar:upload-bold",
      onClick: () => {
        showModal("profile-import", <ProfileImport
          onClose={() => {
            hideModal("profile-import");
            navigate("/profiles");
          }}
          onImportComplete={handleImportComplete}
        />);
        navigate("/profiles");
      },
    },
    {
      id: "create",
      label: "Create",
      icon: "solar:widget-add-bold",
      onClick: () => {
        const defaultGroup = activeGroup === "all" ? null : activeGroup;
        openWizard(defaultGroup);
        navigate("/profiles");
      },
    },
  ];
  
  // Get unique profile groups dynamically (normalized to lowercase)
  const getUniqueProfileGroups = () => {
    const uniqueGroups = new Set<string>();
    profiles.forEach(profile => {
      if (profile.group && profile.group.trim() !== "") {
        // Normalize to lowercase to avoid duplicates like "Custom" and "CUSTOM"
        uniqueGroups.add(profile.group.toLowerCase());
      }
    });
    return Array.from(uniqueGroups).sort();
  };

  // Calculate group counts based on current search/filter
  const getFilteredCountForGroup = (groupId: string) => {
    if (groupId === "all") return profiles.length;
    
    // Handle default groups
    if (groupId === "modpacks") return profiles.filter(p => p.group === "MODPACKS").length;
    
    // Handle dynamic groups (groupId is normalized lowercase, compare with profile.group in lowercase)
    return profiles.filter(p => p.group && p.group.toLowerCase() === groupId).length;
  };

  // Create groups array with default groups + dynamic groups
  const createGroups = (): { id: string; name: string; count: number }[] => {
    const defaultGroups = [
      { id: "all", name: "All", count: getFilteredCountForGroup("all") },
      { id: "modpacks", name: "Modpacks", count: getFilteredCountForGroup("modpacks") },
    ];

    const uniqueGroups = getUniqueProfileGroups();
    const dynamicGroups = uniqueGroups
      .filter((group) => !["modpacks"].includes(group))
      .map((group) => ({
        id: group,
        name: group,
        count: getFilteredCountForGroup(group),
      }));

    return [...defaultGroups, ...dynamicGroups];
  };

  const groups = createGroups();

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleImportComplete = () => {
    fetchProfiles();
    hideModal("profile-import");
    navigate("/profiles");
  };

  // Filter profiles based on search query, active group, and version filter
  const normalizedSearch = (searchQuery ?? "").toLowerCase();
  const filteredProfiles = profiles.filter((profile) => {
    const profileName = (profile.name ?? "").toLowerCase();
    const profileGroup = (profile.group ?? "").toLowerCase();

    const matchesSearch =
      normalizedSearch === "" ||
      profileName.includes(normalizedSearch) ||
      profileGroup.includes(normalizedSearch);

    const matchesGroup =
      activeGroup === "all" ||
      (activeGroup === "modpacks" && profile.group === "MODPACKS") ||
      profileGroup === activeGroup;

    const matchesVersion =
      versionFilter === "all" ||
      (profile.game_version ?? "").includes(versionFilter);

    return matchesSearch && matchesGroup && matchesVersion;
  });

  const sortedProfiles = [...filteredProfiles].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return (a.name ?? "").localeCompare(b.name ?? "");
      case "last_played": {
        const aTimestamp = a.last_played ? new Date(a.last_played).getTime() : 0;
        const bTimestamp = b.last_played ? new Date(b.last_played).getTime() : 0;

        if (bTimestamp !== aTimestamp) {
          return bTimestamp - aTimestamp;
        }

        const aCreated = new Date(a.created).getTime();
        const bCreated = new Date(b.created).getTime();
        if (bCreated !== aCreated) {
          return bCreated - aCreated;
        }

        return (a.name ?? "").localeCompare(b.name ?? "");
      }
      case "date_created": {
        const aCreatedTimestamp = new Date(a.created).getTime();
        const bCreatedTimestamp = new Date(b.created).getTime();
        return bCreatedTimestamp - aCreatedTimestamp;
      }
      default:
        return (a.name ?? "").localeCompare(b.name ?? "");
    }
  });

  if (loading) {    return <LoadingState message="Loading profiles..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon="solar:danger-triangle-bold"
        title="Failed to load profiles"
        description={error || undefined}
      />
    );
  }

  return (
    <>
      <BrowseDetailLayout
      title="Library"
      subtitle="Browse and manage your profiles"
      icon="lucide:library"
      showDetail={false}
      filters={groups.map((g) => ({ id: g.id, label: g.name }))}      activeFilter={activeGroup}
      onFilterChange={setProfilesTabActiveGroup}
      toolbarExtra={<ToolbarActions actions={actionButtons} />}
      sortControl={
        <div className="flex items-center gap-2">
          <Select
            value={sortBy}
            onChange={(e) => setProfilesTabSortBy(e.target.value)}
          >
            <option value="name">Sort by: Name</option>
            <option value="last_played">Sort by: Last played</option>
            <option value="date_created">Sort by: Date created</option>
          </Select>
          <IconButton
            onClick={() => {
              const nextMode = layoutMode === "list" ? "grid" : layoutMode === "grid" ? "compact" : "list";
              setProfilesTabLayoutMode(nextMode);
            }}
            title="Toggle layout"
          >
            <Icon icon="solar:widget-4-bold" className="w-4 h-4" />
          </IconButton>
        </div>
      }
      browseContent={
        sortedProfiles.length === 0 ? (
          <EmptyState
            icon="lucide:library"
            title="No profiles found"
            description="Try a different filter or create a new profile."
          />
        ) : (
          <div
            className={
              layoutMode === "list"
                ? "space-y-2"
                : layoutMode === "grid"
                  ? "grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3"
                  : "grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3"
            }
          >
            {sortedProfiles.map((profile) => (
              <LibraryProfileCard
                key={profile.id}
                profile={profile}
                onSelect={(p) => navigate(`/profiles/${p.id}`)}
                layout={layoutMode}
              />
            ))}          </div>
        )
      }
      />
      <DataSyncModal
        isOpen={isDataSyncModalOpen}
        onClose={() => setIsDataSyncModalOpen(false)}
      />
    </>
  );
}