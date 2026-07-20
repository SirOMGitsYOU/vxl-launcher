import { useState, useEffect, useRef, useCallback } from 'react';
import * as ProfileService from '../../../../services/profile-service';
import type { UnifiedModSearchResult, UnifiedVersion } from '../../../../types/unified';
import type { ModrinthProjectType } from '../../../../types/modrinth';
import type { ContentInstallStatus, ContentCheckRequest } from '../../../../types/profile';
import {
  defaultErrorContentStatus,
  getStatusForNewInstall,
  INITIAL_DISPLAY_COUNT,
  type Profile,
} from '../modrinthSearchShared';
import { debugLog } from '../utils/debug';

export interface VersionFiltersState {
  gameVersions: string[];
  loaders: string[];
  versionType: string;
}

export interface UseModrinthUpdatesParams {
  selectedProfile: Profile | null;
  searchResults: UnifiedModSearchResult[];
  projectType: ModrinthProjectType;
  expandedVersions: Record<string, UnifiedVersion[] | null | 'loading'>;
  numDisplayedVersions: Record<string, number>;
  versionFilters: Record<string, VersionFiltersState>;
  getFilteredVersions: (
    projectId: string,
    versions: UnifiedVersion[],
  ) => UnifiedVersion[];
}

export function useModrinthUpdates({
  selectedProfile,
  searchResults,
  projectType,
  expandedVersions,
  numDisplayedVersions,
  versionFilters,
  getFilteredVersions,
}: UseModrinthUpdatesParams) {
  const [installedProjects, setInstalledProjects] = useState<
    Record<string, ContentInstallStatus | null>
  >({});
  const [installedVersions, setInstalledVersions] = useState<
    Record<string, Record<string, ContentInstallStatus>>
  >({});
  const justInstalledOrToggledRef = useRef(false);

  const checkDisplayedVersionsStatus = useCallback(
    async (
      projectId: string,
      versions: UnifiedVersion[],
      startIndex: number,
      count: number,
      forceRefresh: string[] = [],
    ) => {
      if (!selectedProfile || !versions || versions.length === 0) return;

      const displayedVersions = versions.slice(startIndex, startIndex + count);
      if (displayedVersions.length === 0) return;

      debugLog(
        `Checking installation status for ${displayedVersions.length} displayed versions of project ${projectId}`,
      );

      try {
        const requests: ContentCheckRequest[] = [];

        requests.push({
          project_id: projectId,
          project_type: projectType,
          request_id: `project-${projectId}`,
        });

        for (const version of displayedVersions) {
          if (
            installedVersions[selectedProfile.id]?.[version.id] &&
            !forceRefresh.includes(version.id)
          ) {
            continue;
          }

          const primaryFile =
            version.files.find((file) => file.primary) || version.files[0];
          if (!primaryFile) continue;

          requests.push({
            project_id: projectId,
            version_id: version.id,
            file_hash_sha1: primaryFile.hashes?.sha1,
            file_name: primaryFile.filename,
            project_type: projectType,
            game_version: version.game_versions[0],
            loader: version.loaders[0],
            pack_version_number: version.version_number,
            request_id: version.id,
          });
        }

        if (requests.length === 0) return;

        const batchResults = await ProfileService.batchCheckContentInstalled({
          profile_id: selectedProfile.id,
          requests,
        });

        debugLog('Batch check results:', batchResults);

        const newInstalledState: Record<string, ContentInstallStatus | null> =
          installedVersions[selectedProfile.id] || {};
        let projectInNoRiskStatus: ContentInstallStatus | null = null;

        batchResults.results.forEach((result) => {
          if (result.request_id === `project-${projectId}`) {
            projectInNoRiskStatus = result.status;
          } else if (result.request_id) {
            newInstalledState[result.request_id] = {
              ...result.status,
              is_included_in_norisk_pack:
                projectInNoRiskStatus?.is_included_in_norisk_pack &&
                result.status.is_specific_version_in_pack,
            };
          }
        });

        for (const version of displayedVersions) {
          if (
            !newInstalledState[version.id] &&
            installedVersions[selectedProfile.id]?.[version.id]
          ) {
            newInstalledState[version.id] =
              installedVersions[selectedProfile.id][version.id];
          }
        }

        if (Object.keys(newInstalledState).length > 0) {
          setInstalledVersions((prev) => {
            const newState = { ...prev };
            if (!newState[selectedProfile.id]) {
              newState[selectedProfile.id] = {};
            }

            newState[selectedProfile.id] = {
              ...newState[selectedProfile.id],
              ...newInstalledState,
            };

            return newState;
          });
        }
      } catch (error) {
        console.error(
          `Failed to batch check versions for project ${projectId}:`,
          error,
        );

        try {
          const projectInNoRiskStatus = await ProfileService.isContentInstalled({
            profile_id: selectedProfile.id,
            project_id: projectId,
            project_type: projectType,
          });

          const newInstalledState: Record<string, ContentInstallStatus | null> =
            {};

          for (const version of displayedVersions) {
            try {
              if (
                installedVersions[selectedProfile.id]?.[version.id] &&
                !forceRefresh.includes(version.id)
              ) {
                newInstalledState[version.id] =
                  installedVersions[selectedProfile.id][version.id];
                continue;
              }

              const primaryFile =
                version.files.find((file) => file.primary) || version.files[0];
              if (!primaryFile) {
                newInstalledState[version.id] = {
                  is_installed: false,
                  is_included_in_norisk_pack: false,
                  is_specific_version_in_pack: false,
                  is_enabled: null,
                  found_item_details: null,
                  norisk_pack_item_details: null,
                };
                continue;
              }

              const statusFromService = await ProfileService.isContentInstalled({
                profile_id: selectedProfile.id,
                project_id: projectId,
                version_id: version.id,
                file_hash_sha1: primaryFile.hashes?.sha1,
                project_type: projectType,
                game_version: version.game_versions[0],
                loader: version.loaders[0],
                pack_version_number: version.version_number,
                file_name: primaryFile.filename,
              });

              newInstalledState[version.id] = {
                is_installed: statusFromService.is_installed,
                is_included_in_norisk_pack:
                  projectInNoRiskStatus.is_included_in_norisk_pack &&
                  statusFromService.is_specific_version_in_pack,
                is_specific_version_in_pack:
                  statusFromService.is_specific_version_in_pack,
                is_enabled:
                  statusFromService.is_enabled !== undefined
                    ? statusFromService.is_enabled
                    : null,
                found_item_details: statusFromService.found_item_details || null,
                norisk_pack_item_details:
                  statusFromService.norisk_pack_item_details || null,
              };
            } catch (versionError) {
              console.error(
                `Failed to check status for version ${version.version_number}:`,
                versionError,
              );
              newInstalledState[version.id] = {
                is_installed: false,
                is_included_in_norisk_pack: false,
                is_specific_version_in_pack: false,
                is_enabled: null,
                found_item_details: null,
                norisk_pack_item_details: null,
              };
            }
          }

          if (Object.keys(newInstalledState).length > 0) {
            setInstalledVersions((prev) => {
              const newState = { ...prev };
              if (!newState[selectedProfile.id]) {
                newState[selectedProfile.id] = {};
              }

              newState[selectedProfile.id] = {
                ...newState[selectedProfile.id],
                ...newInstalledState,
              };

              return newState;
            });
          }
        } catch (e) {
          console.error(`Failed to get project status for ${projectId}:`, e);
        }
      }
    },
    [selectedProfile, projectType, installedVersions],
  );

  useEffect(() => {
    Object.entries(expandedVersions).forEach(([projectId, versions]) => {
      if (Array.isArray(versions) && versions.length > 0 && selectedProfile) {
        const displayCount =
          numDisplayedVersions[projectId] || INITIAL_DISPLAY_COUNT;
        const filteredVersions = getFilteredVersions(projectId, versions);
        checkDisplayedVersionsStatus(
          projectId,
          filteredVersions,
          0,
          displayCount,
        );
      }
    });
  }, [
    expandedVersions,
    numDisplayedVersions,
    selectedProfile,
    versionFilters,
    getFilteredVersions,
    checkDisplayedVersionsStatus,
  ]);

  useEffect(() => {
    const checkInstallationStatus = async () => {
      if (!selectedProfile || !searchResults.length) {
        setInstalledProjects({});
        return;
      }
      if (justInstalledOrToggledRef.current) {
        justInstalledOrToggledRef.current = false;
        return;
      }

      const requests: ContentCheckRequest[] = searchResults.map((project) => ({
        project_id: project.project_id,
        project_type: project.project_type,
        request_id: project.project_id,
      }));

      try {
        const batchResults = await ProfileService.batchCheckContentInstalled({
          profile_id: selectedProfile.id,
          requests,
        });

        const newInstalledState: Record<string, ContentInstallStatus | null> =
          {};

        batchResults.results.forEach((result) => {
          if (result.request_id) {
            newInstalledState[result.request_id] = result.status;
          }
        });

        setInstalledProjects(newInstalledState);
      } catch (error) {
        console.error('Failed to batch check installation status:', error);

        const newInstalledState: Record<string, ContentInstallStatus | null> =
          {};
        for (const project of searchResults) {
          try {
            const status = await ProfileService.isContentInstalled({
              profile_id: selectedProfile.id,
              project_id: project.project_id,
              project_type: project.project_type,
            });
            newInstalledState[project.project_id] = status;
          } catch (checkError) {
            console.error(
              `Failed to check status for ${project.title}:`,
              checkError,
            );
            newInstalledState[project.project_id] = {
              ...defaultErrorContentStatus,
            };
          }
        }
        setInstalledProjects(newInstalledState);
      }
    };

    checkInstallationStatus();
  }, [selectedProfile, searchResults]);

  useEffect(() => {
    const checkNewResultsInstallation = async () => {
      if (!selectedProfile || !searchResults.length) return;

      if (justInstalledOrToggledRef.current) {
        justInstalledOrToggledRef.current = false;
        return;
      }

      const uncheckedProjects = searchResults.filter(
        (project) => !installedProjects[project.project_id],
      );

      if (uncheckedProjects.length === 0) return;

      try {
        const requests: ContentCheckRequest[] = uncheckedProjects.map(
          (project) => ({
            project_id: project.project_id,
            project_type: project.project_type,
            request_id: project.project_id,
          }),
        );

        const batchResults = await ProfileService.batchCheckContentInstalled({
          profile_id: selectedProfile.id,
          requests,
        });

        const newInstalledState = { ...installedProjects };
        batchResults.results.forEach((result) => {
          if (result.request_id) {
            newInstalledState[result.request_id] = result.status;
          }
        });

        setInstalledProjects(newInstalledState);
      } catch (error) {
        console.error(
          'Failed to batch check new results installation status:',
          error,
        );

        const newInstalledState = { ...installedProjects };
        for (const project of uncheckedProjects) {
          try {
            const status = await ProfileService.isContentInstalled({
              profile_id: selectedProfile.id,
              project_id: project.project_id,
              project_type: project.project_type,
            });
            newInstalledState[project.project_id] = status;
          } catch (checkError) {
            console.error(
              `Failed to check status for ${project.title}:`,
              checkError,
            );
            newInstalledState[project.project_id] = {
              ...defaultErrorContentStatus,
            };
          }
        }

        if (uncheckedProjects.length > 0) {
          setInstalledProjects(newInstalledState);
        }
      }
    };

    checkNewResultsInstallation();
  }, [searchResults.length, selectedProfile, installedProjects]);

  useEffect(() => {
    if (!selectedProfile) {
      debugLog('No profile selected - resetting project installation status');
      setInstalledProjects({});
    }
  }, [selectedProfile]);

  useEffect(() => {
    if (selectedProfile) {
      setInstalledProjects({});
    }
  }, [projectType, selectedProfile]);

  return {
    installedProjects,
    setInstalledProjects,
    installedVersions,
    setInstalledVersions,
    justInstalledOrToggledRef,
    checkDisplayedVersionsStatus,
    getStatusForNewInstall,
    defaultErrorContentStatus,
  };
}

export type UseModrinthUpdatesReturn = ReturnType<typeof useModrinthUpdates>;
