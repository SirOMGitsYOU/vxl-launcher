"use client";

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UnifiedService from '../../../../services/unified-service';
import { ModrinthService } from '../../../../services/modrinth-service';
import { CurseForgeService } from '../../../../services/curseforge-service';
import * as ProfileService from '../../../../services/profile-service';
import { toast } from 'react-hot-toast';
import {
  installContentToProfile,
  uninstallContentFromProfile,
  toggleContentFromProfile,
} from '../../../../services/content-service';
import {
  ContentType as NrContentType,
  type InstallContentPayload,
  type UninstallContentPayload,
  type ToggleContentPayload,
} from '../../../../types/content';
import type { ContentInstallStatus } from '../../../../types/profile';
import type { UnifiedModSearchResult, UnifiedVersion } from '../../../../types/unified';
import { UnifiedProjectType, ModPlatform } from '../../../../types/unified';
import type { ModrinthProjectType } from '../../../../types/modrinth';
import { useGlobalModal } from '../../../../hooks/useGlobalModal';
import { useProfileStore } from '../../../../store/profile-store';
import { ModrinthQuickInstallProfilesModal } from '../ModrinthQuickInstallProfilesModal';
import { handleIrisCheckAndShowModal } from '../../../../utils/iris-detection.tsx';
import { getStatusForNewInstall, type Profile } from '../modrinthSearchShared';
import { debugLog } from '../utils/debug';
import type { UseModrinthSearchReturn } from './useModrinthSearch';
import type { UseModrinthUpdatesReturn } from './useModrinthUpdates';

export interface UseModrinthInstallParams {
  onInstallSuccess?: () => void;
  search: UseModrinthSearchReturn;
  updates: UseModrinthUpdatesReturn;
}

export function useModrinthInstall({
  onInstallSuccess,
  search,
  updates,
}: UseModrinthInstallParams) {
  const navigate = useNavigate();
  const { showModal, hideModal } = useGlobalModal();

  const {
    selectedProfile,
    internalProfiles,
    setInternalProfiles,
    projectType,
    modSource,
    selectedGameVersions,
    currentSelectedLoaders,
    allLoadersData,
    expandedVersions,
    overrideDisplayContext,
  } = search;

  const {
    installedProjects,
    setInstalledProjects,
    installedVersions,
    setInstalledVersions,
    justInstalledOrToggledRef,
  } = updates;

  const [selectedVersion, setSelectedVersion] = useState<UnifiedVersion | null>(null);
  const [selectedProject, setSelectedProject] = useState<UnifiedModSearchResult | null>(null);
  const [currentInstallProject, setCurrentInstallProject] = useState<UnifiedModSearchResult | any | null>(null);
  const [currentInstallVersion, setCurrentInstallVersion] = useState<UnifiedVersion | null>(null);
  const [installing, setInstalling] = useState<Record<string, boolean>>({});
  const [uninstalling, setUninstalling] = useState<Record<string, boolean>>({});
  const [installStatus, setInstallStatus] = useState<Record<string, boolean>>({});
  const [loadingStatus, setLoadingStatus] = useState(false);

  // New state for quick install modal
  const [quickInstallModalOpen, setQuickInstallModalOpen] = useState(false);
  const [quickInstallProject, setQuickInstallProject] = useState<UnifiedModSearchResult | any | null>(null);
  const [quickInstallVersions, setQuickInstallVersions] = useState<any[] | null>(null); // Changed to any[] to handle UnifiedVersion
  const [quickInstallLoading, setQuickInstallLoading] = useState(false); // Loading for fetching versions for modal
  const [quickInstallError, setQuickInstallError] = useState<string | null>(null);
  const [quickInstallingProjects, setQuickInstallingProjects] = useState<Record<string, boolean>>({}); // New state for card button loading
  const [installingModpackAsProfile, setInstallingModpackAsProfile] = useState<Record<string, boolean>>({}); // New state for modpack install loading
  const [installingVersion, setInstallingVersion] = useState<Record<string, boolean>>({}); // New state for specific version install loading
  const [installingModpackVersion, setInstallingModpackVersion] = useState<Record<string, boolean>>({}); // New state for modpack version install loading

  // Helper function to map Unified project type to our ContentType enum
  function mapUnifiedProjectTypeToNrContentType(projectType: string): NrContentType | null {
    switch (projectType) {
      case 'mod':
      case UnifiedProjectType.Mod:
        return NrContentType.Mod;
      case 'resourcepack':
      case UnifiedProjectType.ResourcePack:
        return NrContentType.ResourcePack;
      case 'shader':
      case UnifiedProjectType.Shader:
        return NrContentType.ShaderPack;
      case 'datapack':
      case UnifiedProjectType.Datapack:
        return NrContentType.DataPack;
      case 'modpack':
      case UnifiedProjectType.Modpack: // Modpacks are handled by creating a new profile
        toast.error("Modpacks should be installed as new profiles, not as content via this method.");
        return null;
      default:
        // Log unhandled project types if any, but avoid throwing error that breaks UI
        console.warn(`Unsupported project type for direct installation: ${projectType}`);
        toast.error(`Cannot directly install project type: ${projectType}`);
        return null;
    }
  }

  // Find the best version for a profile
  const findBestVersionForProfile = (profile: Profile, versions: UnifiedVersion[]): UnifiedVersion | null => {
    if (!profile || !versions || versions.length === 0) return null;
    
    // First try: find a version matching both game version and loader
    if (profile.game_version && profile.loader) {
      const exactMatch = versions.find(v => 
        v.game_versions.includes(profile.game_version) && 
        v.loaders.includes(profile.loader)
      );
      if (exactMatch) return exactMatch;
    }
    
    // Second try: match just game version (for resourcepacks, datapacks, etc.)
    if (profile.game_version) {
      const gameVersionMatch = versions.find(v => 
        v.game_versions.includes(profile.game_version)
      );
      if (gameVersionMatch) return gameVersionMatch;
    }
    
    // Last resort: just return the latest version
    return versions[0];
  };

  // Open install modal using global modal system
  const openInstallModal = async (project: UnifiedModSearchResult | any, version: UnifiedVersion) => {
    debugLog('🚀 Opening install modal for:', project.title, version.version_number);
    setSelectedVersion(version);
    setSelectedProject(project);
    setCurrentInstallProject(project);
    setCurrentInstallVersion(version);
    setLoadingStatus(true);
    setInstallStatus({}); // Reset install status

    const modalId = `install-${project.project_id}-${version.id}`;

    try {
      const primaryFile = version.files.find(file => file.primary) || version.files[0];
      if (!primaryFile) {
        throw new Error("No primary file available for this version");
      }

      const statuses: Record<string, boolean> = {};
      // Initialize all statuses to false
      for (const profile of internalProfiles) {
        statuses[profile.id] = false;
      }

      // Perform individual checks for each profile
      for (const profile of internalProfiles) {
        try {
          const status = await ProfileService.isContentInstalled({
            profile_id: profile.id,
            project_id: project.project_id,
            version_id: version.id,
            project_type: project.project_type as ModrinthProjectType, // Cast to ensure compatibility
            game_version: version.game_versions[0], // Use first game version
            loader: version.loaders[0], // Use first loader
            file_hash_sha1: primaryFile.hashes?.sha1,
            pack_version_number: version.version_number, // Use actual version number for pack checks
            file_name: primaryFile.filename,
          });
          statuses[profile.id] = !!status.is_installed; // Ensure boolean
          debugLog(`[openInstallModal] Profile ${profile.id} ('${profile.name}') status for ${project.title} v${version.version_number}: ${status.is_installed}`);
        } catch (e) {
          console.error(`[openInstallModal] Failed to check status for profile ${profile.id} ('${profile.name}'):`, e);
          statuses[profile.id] = false; // Default to false on error
        }
      }
      
      setInstallStatus(statuses);

      debugLog('📊 Final install statuses for modal:', statuses);

      // Open the global modal with the universal profiles modal
      showModal(
        modalId,
        <ModrinthQuickInstallProfilesModal
          project={project}
          version={version}
          profiles={internalProfiles}
          onInstallToProfile={(profileId) => {
            debugLog('🎯 Installing to profile:', profileId, 'project:', project.title, 'version:', version.version_number);
            installToProfile(profileId, project, version);
          }}
          onUninstallClick={async (profileId, project, version) => {
            debugLog('🗑️ Uninstalling from profile:', profileId);
            await handleDeleteVersionFromProfile(profileId, project, version);
          }}
          onInstallToNewProfile={handleInstallToNewProfile}
          onProfileClick={(profile) => {
            debugLog('🖱️ Navigating to profile:', profile.name);
            hideModal(modalId);
            navigate(`/profiles/${profile.id}`);
          }}
          onClose={() => {
            debugLog('❌ Closing install modal');
            hideModal(modalId);
            setSelectedVersion(null);
            setSelectedProject(null);
            setCurrentInstallProject(null);
            setCurrentInstallVersion(null);
            setInstallStatus({});
            setUninstalling({});
          }}
          installingProfiles={installing}
          uninstallingProfiles={uninstalling}
          installStatus={installStatus}
        />,
        1200 // Higher z-index to ensure it's on top
      );

    } catch (error) {
      console.error("[openInstallModal] Failed to check installation status for modal:", error);
      // Fallback: Initialize all statuses to false if there's a general error (e.g., no primary file)
      const fallbackStatuses: Record<string, boolean> = {};
      internalProfiles.forEach(profile => {
        fallbackStatuses[profile.id] = false;
      });
      setInstallStatus(fallbackStatuses);

      // Still open the modal even if status check failed
      showModal(
        modalId,
        <ModrinthQuickInstallProfilesModal
          project={project}
          version={version}
          profiles={internalProfiles}
          onInstallToProfile={(profileId) => {
            debugLog('🎯 Installing to profile:', profileId, 'project:', project.title, 'version:', version.version_number);
            installToProfile(profileId, project, version);
          }}
          onUninstallClick={async (profileId, project, version) => {
            debugLog('🗑️ Uninstalling from profile:', profileId);
            await handleDeleteVersionFromProfile(profileId, project, version);
          }}
          onInstallToNewProfile={handleInstallToNewProfile}
          onProfileClick={(profile) => {
            debugLog('🖱️ Navigating to profile:', profile.name);
            hideModal(modalId);
            navigate(`/profiles/${profile.id}`);
          }}
          onClose={() => {
            debugLog('❌ Closing install modal');
            hideModal(modalId);
            setSelectedVersion(null);
            setSelectedProject(null);
            setCurrentInstallProject(null);
            setCurrentInstallVersion(null);
            setInstallStatus({});
            setUninstalling({});
          }}
          installingProfiles={installing}
          uninstallingProfiles={uninstalling}
          installStatus={installStatus}
        />,
        1200
      );
    } finally {
      setLoadingStatus(false);
    }
  };

  // Update the install modal when installation states change
  useEffect(() => {
    if (currentInstallProject && currentInstallVersion) {
      const modalId = `install-${currentInstallProject.project_id}-${currentInstallVersion.id}`;
      debugLog('🔄 Updating install modal with new states:', { installing, uninstalling, installStatus });

      showModal(
        modalId,
        <ModrinthQuickInstallProfilesModal
          project={currentInstallProject}
          version={currentInstallVersion}
          profiles={internalProfiles}
          onInstallToProfile={(profileId) => {
            debugLog('🎯 Installing to profile:', profileId, 'project:', currentInstallProject.title, 'version:', currentInstallVersion.version_number);
            installToProfile(profileId, currentInstallProject, currentInstallVersion);
          }}
          onUninstallClick={async (profileId, project, version) => {
            debugLog('🗑️ Uninstalling from profile:', profileId);
            await handleDeleteVersionFromProfile(profileId, project, version);
          }}
          onInstallToNewProfile={handleInstallToNewProfile}
          onProfileClick={(profile) => {
            debugLog('🖱️ Navigating to profile:', profile.name);
            hideModal(modalId);
            navigate(`/profiles/${profile.id}`);
          }}
          onClose={() => {
            debugLog('❌ Closing install modal');
            hideModal(modalId);
            setSelectedVersion(null);
            setSelectedProject(null);
            setCurrentInstallProject(null);
            setCurrentInstallVersion(null);
            setInstallStatus({});
            setUninstalling({});
          }}
          installingProfiles={installing}
          uninstallingProfiles={uninstalling}
          installStatus={installStatus}
        />,
        1200
      );
    }
  }, [installing, uninstalling, installStatus, currentInstallProject, currentInstallVersion]);

  // Check installation status when profiles change
  useEffect(() => {
    if (currentInstallProject && currentInstallVersion && internalProfiles.length > 0) {
      debugLog('🔍 Re-checking installation status for profiles change');
      // We could add a function to check status here if needed
    }
  }, [internalProfiles, currentInstallProject, currentInstallVersion]);

  // Install mod to selected profile
  const installToProfile = async (profileId: string, project?: UnifiedModSearchResult | any, version?: UnifiedVersion) => {
    // Use provided parameters or fall back to global state
    const targetProject = project || selectedProject;
    const targetVersion = version || selectedVersion;

    if (!targetVersion || !targetProject) {
      console.error('❌ Missing required installation information:', { targetProject, targetVersion });
      toast.error("Missing required installation information");
      return;
    }

    setInstalling(prev => ({ ...prev, [profileId]: true }));

    try {
      const primaryFile = targetVersion.files.find(file => file.primary) || targetVersion.files[0];
      if (!primaryFile) {
        toast.error("No download file available for the selected version.");
        setInstalling(prev => ({ ...prev, [profileId]: false }));
        return;
      }

      const mappedContentType = mapUnifiedProjectTypeToNrContentType(targetProject.project_type);
      if (!mappedContentType) {
        setInstalling(prev => ({ ...prev, [profileId]: false }));
        return;
      }
      
      // Special handling for modpacks: should not reach here if mapUnifiedProjectTypeToNrContentType works correctly
      if (targetProject.project_type === 'modpack') {
        toast.error("Modpacks must be installed as new profiles.");
        setInstalling(prev => ({ ...prev, [profileId]: false }));
        return;
      }

      const payload: InstallContentPayload = {
        profile_id: profileId,
        project_id: targetProject.project_id,
        version_id: targetVersion.id,
        file_name: primaryFile.filename,
        download_url: primaryFile.url,
        file_hash_sha1: primaryFile.hashes?.sha1 || undefined,
        file_fingerprint: undefined, // Modrinth doesn't use fingerprints
        content_name: targetProject.title,
        version_number: targetVersion.version_number,
        content_type: mappedContentType,
        loaders: targetVersion.loaders,
        game_versions: targetVersion.game_versions,
        source: targetProject.source,
      };

      await installContentToProfile(payload);

      toast.success(`Successfully installed ${targetProject.title} (${targetVersion.version_number}) to ${internalProfiles.find(p => p.id === profileId)?.name || 'profile'}`);

      // Check for Iris shader mod if a shader pack was installed
      if (targetProject.project_type === 'shader') {
        await handleIrisCheckAndShowModal(
          targetProject.title,
          profileId,
          targetProject.project_id,
          "Installation",
          showModal,
          hideModal,
          () => {
            // TODO: Implement Iris installation logic
            debugLog('🎯 User clicked "Install Iris Now"');
          }
        );
      }

      setInstallStatus(prev => ({ ...prev, [profileId]: true }));
      
      setInstalledProjects(prev => ({
        ...prev,
        [targetProject.project_id]: getStatusForNewInstall(prev[targetProject.project_id])
      }));

      // Fix für den TypeScript-Fehler: Verwende die korrekte verschachtelte Struktur
      setInstalledVersions(prev => {
        const newState = { ...prev };
        const currentProfileId = profileId;

        if (!newState[currentProfileId]) {
          newState[currentProfileId] = {};
        }

        newState[currentProfileId][targetVersion.id] = getStatusForNewInstall(
          newState[currentProfileId][targetVersion.id]
        );

        return newState;
      });

      justInstalledOrToggledRef.current = true; // Set flag
      if (onInstallSuccess) {
        onInstallSuccess();
      }
      
    } catch (error) {
      toast.error(`Failed to install: ${error instanceof Error ? error.message : String(error)}`);
      console.error("Install error in installToProfile:", error);
    } finally {
      setInstalling(prev => ({ ...prev, [profileId]: false }));
    }
  };

  // New function to install directly to the selected profile without opening a modal
  const handleDirectInstall = async (project: UnifiedModSearchResult | any, version: UnifiedVersion) => {
    if (!selectedProfile) {
      // Open the install modal instead of showing an error
      openInstallModal(project, version);
      return;
    }

    const profileId = selectedProfile.id;
    const profileName = selectedProfile.name;

    setInstallingVersion(prev => ({ ...prev, [version.id]: true }));

    try {
      // Get primary file
      const primaryFile = version.files.find(f => f.primary) || version.files[0];
      if (!primaryFile) {
        toast.error(`No primary file found for ${project.title}`);
        setInstallingVersion(prev => ({ ...prev, [version.id]: false }));
        return;
      }

      // Check content type
      const mappedContentType = mapUnifiedProjectTypeToNrContentType(project.project_type);
      if (!mappedContentType) {
        setInstallingVersion(prev => ({ ...prev, [version.id]: false }));
        return;
      }

      // Special handling for modpacks
      if (project.project_type === 'modpack') {
        toast.error("Modpacks must be installed as new profiles.");
        setInstallingVersion(prev => ({ ...prev, [version.id]: false }));
        return;
      }

      // Proceed with installation using the unified generic function
      const payload: InstallContentPayload = {
        profile_id: profileId,
        project_id: project.project_id,
        version_id: version.id,
        file_name: primaryFile.filename,
        download_url: primaryFile.url,
        file_hash_sha1: primaryFile.hashes?.sha1 || undefined,
        file_fingerprint: primaryFile.fingerprint || undefined,
        content_name: project.title,
        version_number: version.version_number,
        content_type: mappedContentType,
        loaders: version.loaders,
        game_versions: version.game_versions,
        source: project.source,
      };

      await toast.promise(
        installContentToProfile(payload),
        {
          loading: `Installing ${project.title} (${version.version_number}) to ${profileName}...`,
          success: `Successfully installed ${project.title} (${version.version_number}) to ${profileName}`,
          error: (err) => `Failed to install: ${err.message || String(err)}`,
        }
      );

      // Check for Iris shader mod if a shader pack was installed
      if (project.project_type === 'shader') {
        await handleIrisCheckAndShowModal(
          project.title,
          profileId,
          project.project_id,
          "Direct install",
          showModal,
          hideModal,
          () => {
            // TODO: Implement Iris installation logic
            debugLog('🎯 User clicked "Install Iris Now"');
          }
        );
      }

      // Update installation status
      setInstalledProjects(prev => ({
        ...prev,
        [project.project_id]: getStatusForNewInstall(prev[project.project_id])
      }));

      setInstalledVersions(prev => {
        const newState = { ...prev };
        if (!newState[profileId]) newState[profileId] = {};
        newState[profileId][version.id] = getStatusForNewInstall(
          newState[profileId][version.id]
        );
        return newState;
      });

      justInstalledOrToggledRef.current = true;

      if (onInstallSuccess) onInstallSuccess();

    } catch (error) {
      console.error(`Direct install failed for ${project.title}:`, error);
      toast.error(`Failed to install ${project.title}`);
    } finally {
      // Reset loading state for the version
      setInstallingVersion(prev => ({ ...prev, [version.id]: false }));
    }
  };

  // State to track the currently opened quick install project
  const [currentQuickInstallProject, setCurrentQuickInstallProject] = useState<UnifiedModSearchResult | any | null>(null);

  // Function to handle quick install - shows profile selection modal using global modal
  const quickInstall = async (project: UnifiedModSearchResult | any) => {
    const modalId = `quick-install-${project.project_id}`;
    setCurrentQuickInstallProject(project);

    // Check installation status for all profiles when opening modal
    debugLog('🚀 Opening quick install modal for:', project.title);
    await checkInstallationStatusForModal(project, internalProfiles);

    debugLog('📊 Current installStatus before modal:', installStatus);

    showModal(
      modalId,
      <ModrinthQuickInstallProfilesModal
        project={project}
        profiles={internalProfiles}
        onProfileSelect={handleProfileSelectionForQuickInstall}
        onInstallToNewProfile={handleInstallToNewProfile}
        onProfileClick={(profile) => {
          // Close modal first, then navigate to profile page
          debugLog('🖱️ Profile clicked for navigation:', profile.name);
          hideModal(modalId);
          setCurrentQuickInstallProject(null);
          navigate(`/profiles/${profile.id}`);
        }}
        onClose={() => {
          debugLog('❌ Modal closed');
          hideModal(modalId);
          setCurrentQuickInstallProject(null);
        }}
        installingProfiles={installing}
        installStatus={installStatus}
      />,
      1200 // Higher z-index to ensure it's on top
    );
  };

  // Function to handle direct quick install for BrowseTab context - no modal
  const handleDirectQuickInstall = async (project: UnifiedModSearchResult | any) => {
    debugLog('🚀 Direct quick install for:', project.title);

    if (!selectedProfile) {
      console.error('❌ No selected profile for direct install');
      toast.error('No profile selected for installation');
      return;
    }

    // Set loading state for the project
    setQuickInstallingProjects(prev => ({ ...prev, [project.project_id]: true }));

    try {
      // Fetch versions for this project
      const response = await UnifiedService.getModVersions({
        source: project.source,
        project_id: project.project_id
      });
      if (!response.versions || response.versions.length === 0) {
        toast.error(`No versions found for ${project.title}`);
        setQuickInstallingProjects(prev => ({ ...prev, [project.project_id]: false }));
        return;
      }

      // Find best version for selected profile
      const sortedVersions = response.versions.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
      const bestVersion = findBestVersionForProfile(selectedProfile, sortedVersions);

      if (!bestVersion) {
        toast.error(`No compatible version of ${project.title} for profile '${selectedProfile.name}'`);
        setQuickInstallingProjects(prev => ({ ...prev, [project.project_id]: false }));
        return;
      }

      // Get primary file
      const primaryFile = bestVersion.files.find(f => f.primary) || bestVersion.files[0];
      if (!primaryFile) {
        toast.error(`No primary file found for ${project.title}`);
        setQuickInstallingProjects(prev => ({ ...prev, [project.project_id]: false }));
        return;
      }

      // Check content type
      const mappedContentType = mapUnifiedProjectTypeToNrContentType(project.project_type);
      if (!mappedContentType) {
        setQuickInstallingProjects(prev => ({ ...prev, [project.project_id]: false }));
        return;
      }

      // Special handling for modpacks
      if (project.project_type === 'modpack') {
        toast.error("Modpacks must be installed as new profiles.");
        setQuickInstallingProjects(prev => ({ ...prev, [project.project_id]: false }));
        return;
      }

      // Proceed with installation using the same logic as handleProfileSelectionForQuickInstall
      const payload: InstallContentPayload = {
        profile_id: selectedProfile.id,
        project_id: project.project_id,
        version_id: bestVersion.id,
        file_name: primaryFile.filename,
        download_url: primaryFile.url,
        file_hash_sha1: primaryFile.hashes?.sha1 || undefined,
        file_fingerprint: undefined, // Modrinth doesn't use fingerprints
        content_name: project.title,
        version_number: bestVersion.version_number,
        content_type: mappedContentType,
        loaders: bestVersion.loaders,
        game_versions: bestVersion.game_versions,
        source: project.source,
        };

        await toast.promise(
        installContentToProfile(payload),
        {
          loading: `Installing ${project.title} (${bestVersion.version_number}) to ${selectedProfile.name}...`,
          success: `Successfully installed ${project.title} (${bestVersion.version_number}) to ${selectedProfile.name}`,
          error: (err) => `Failed to install: ${err.message || String(err)}`,
        }
      );

      // Update installation status
      setInstalledProjects(prev => ({
        ...prev,
        [project.project_id]: getStatusForNewInstall(prev[project.project_id])
      }));

      setInstalledVersions(prev => {
        const newState = { ...prev };
        if (!newState[selectedProfile.id]) newState[selectedProfile.id] = {};
        newState[selectedProfile.id][bestVersion.id] = getStatusForNewInstall(
          newState[selectedProfile.id][bestVersion.id]
        );
        return newState;
      });

      justInstalledOrToggledRef.current = true;

      // Check for Iris shader mod if a shader pack was installed
      if (project.project_type === 'shader') {
        await handleIrisCheckAndShowModal(
          project.title,
          selectedProfile.id,
          project.project_id,
          "Direct install",
          showModal,
          hideModal,
          () => {
            // TODO: Implement Iris installation logic
            debugLog('🎯 User clicked "Install Iris Now"');
          }
        );
      }

      if (onInstallSuccess) onInstallSuccess();

    } catch (error) {
      console.error(`Quick install failed for ${project.title}:`, error);
      toast.error(`Failed to install ${project.title}`);
    } finally {
      // Reset loading state for the project
      setQuickInstallingProjects(prev => ({ ...prev, [project.project_id]: false }));
    }
  };

  // Check installation status for all profiles when opening modal
  const checkInstallationStatusForModal = async (project: UnifiedModSearchResult | any, profiles: Profile[]) => {
    debugLog('🔍 Checking installation status for modal:', project.title, profiles.length, 'profiles');

    if (profiles.length === 0) {
      debugLog('❌ No profiles to check');
      return;
    }

    const newInstallStatuses: Record<string, boolean> = {};

    // Initialize all profiles as false first
    profiles.forEach(profile => {
      newInstallStatuses[profile.id] = false;
    });

    try {
      // Check each profile individually for better error handling
      for (const profile of profiles) {
        try {
          debugLog(`🔍 Checking profile: ${profile.name} (${profile.id})`);

          const status = await ProfileService.isContentInstalled({
            profile_id: profile.id,
            project_id: project.project_id,
            project_type: project.project_type
          });

          const isInstalled = !!status?.is_installed;
          newInstallStatuses[profile.id] = isInstalled;

          debugLog(`✅ Profile ${profile.name}: ${isInstalled ? 'INSTALLED' : 'NOT INSTALLED'}`);
        } catch (error) {
          console.error(`❌ Failed to check profile ${profile.name}:`, error);
          newInstallStatuses[profile.id] = false;
        }
      }

      debugLog('📊 Final install statuses:', newInstallStatuses);
      setInstallStatus(newInstallStatuses);
    } catch (error) {
      console.error('❌ Failed to check installation status for modal:', error);
      setInstallStatus(newInstallStatuses); // Keep the initialized false values
    }
  };

  // Update the modal when installation states change
  useEffect(() => {
    // Check if there's an open quick install modal
    if (currentQuickInstallProject) {
      const modalId = `quick-install-${currentQuickInstallProject.project_id}`;
      // Re-open the modal with updated states
      showModal(
        modalId,
        <ModrinthQuickInstallProfilesModal
          project={currentQuickInstallProject}
          profiles={internalProfiles}
          onProfileSelect={handleProfileSelectionForQuickInstall}
          onInstallToNewProfile={handleInstallToNewProfile}
          onProfileClick={(profile) => {
            // Close modal first, then navigate to profile page
            hideModal(modalId);
            setCurrentQuickInstallProject(null);
            navigate(`/profiles/${profile.id}`);
          }}
          onClose={() => {
            hideModal(modalId);
            setCurrentQuickInstallProject(null);
          }}
          installingProfiles={installing}
          uninstallingProfiles={uninstalling}
          installStatus={installStatus}
        />,
        1200
      );
    }
  }, [installing, uninstalling, installStatus, currentQuickInstallProject]);

  // Re-check installation status when profiles change
  useEffect(() => {
    if (currentQuickInstallProject && internalProfiles.length > 0) {
      checkInstallationStatusForModal(currentQuickInstallProject, internalProfiles);
    }
  }, [internalProfiles]);

  // Handle profile selection and proceed with installation
  const handleProfileSelectionForQuickInstall = async (project: UnifiedModSearchResult | any, profile: Profile) => {
    // Don't close the modal - let it stay open so user can install to multiple profiles
    // Set loading state for the profile being installed
    setInstalling(prev => ({ ...prev, [profile.id]: true }));

    try {
      // Fetch versions for this project
      const response = await UnifiedService.getModVersions({
        source: project.source,
        project_id: project.project_id
      });
      if (!response.versions || response.versions.length === 0) {
        toast.error(`No versions found for ${project.title}`);
        setQuickInstallingProjects(prev => ({ ...prev, [project.project_id]: false }));
        return;
      }

      // Find best version for selected profile
      const sortedVersions = response.versions.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
      const bestVersion = findBestVersionForProfile(profile, sortedVersions);

      if (!bestVersion) {
        toast.error(`No compatible version of ${project.title} for profile '${profile.name}'`);
        setQuickInstallingProjects(prev => ({ ...prev, [project.project_id]: false }));
        return;
      }

      // Get primary file
      const primaryFile = bestVersion.files.find(f => f.primary) || bestVersion.files[0];
      if (!primaryFile) {
        toast.error(`No primary file found for ${project.title}`);
        setQuickInstallingProjects(prev => ({ ...prev, [project.project_id]: false }));
        return;
      }

      // Check content type
      const mappedContentType = mapUnifiedProjectTypeToNrContentType(project.project_type);
      if (!mappedContentType) {
        setQuickInstallingProjects(prev => ({ ...prev, [project.project_id]: false }));
        return;
      }

      // Special handling for modpacks
      if (project.project_type === 'modpack') {
        toast.error("Modpacks must be installed as new profiles.");
        setQuickInstallingProjects(prev => ({ ...prev, [project.project_id]: false }));
        return;
      }

      // Proceed with installation
      const payload: InstallContentPayload = {
        profile_id: profile.id,
        project_id: project.project_id,
        version_id: bestVersion.id,
        file_name: primaryFile.filename,
        download_url: primaryFile.url,
        file_hash_sha1: primaryFile.hashes?.sha1 || undefined,
        file_fingerprint: undefined, // Modrinth doesn't use fingerprints
        content_name: project.title,
        version_number: bestVersion.version_number,
        content_type: mappedContentType,
        loaders: bestVersion.loaders,
        game_versions: bestVersion.game_versions,
        source: project.source,
        };

        await toast.promise(
        installContentToProfile(payload),
        {
          loading: `Installing ${project.title} (${bestVersion.version_number}) to ${profile.name}...`,
          success: `Successfully installed ${project.title} (${bestVersion.version_number}) to ${profile.name}`,
          error: (err) => `Failed to install: ${err.message || String(err)}`,
        }
      );

      // Check for Iris shader mod if a shader pack was installed
      if (project.project_type === 'shader') {
        await handleIrisCheckAndShowModal(
          project.title,
          profile.id,
          project.project_id,
          "Quick install",
          showModal,
          hideModal,
          () => {
            // TODO: Implement Iris installation logic
            debugLog('🎯 User clicked "Install Iris Now"');
          }
        );
      }

      // Update installation status
      setInstalledProjects(prev => ({
        ...prev,
        [project.project_id]: getStatusForNewInstall(prev[project.project_id])
      }));

      setInstalledVersions(prev => {
        const newState = { ...prev };
        if (!newState[profile.id]) newState[profile.id] = {};
        newState[profile.id][bestVersion.id] = getStatusForNewInstall(
          newState[profile.id][bestVersion.id]
        );
        return newState;
      });

      justInstalledOrToggledRef.current = true;

      // Set install status to true for successful installation
      setInstallStatus(prev => ({ ...prev, [profile.id]: true }));

      if (onInstallSuccess) onInstallSuccess();

    } catch (error) {
      console.error(`Quick install failed for ${project.title}:`, error);
      toast.error(`Failed to install ${project.title}`);
    } finally {
      // Reset loading state for the profile
      setInstalling(prev => ({ ...prev, [profile.id]: false }));
    }
  };

  // Close quick install modal
  const closeQuickInstallModal = () => {
    setQuickInstallModalOpen(false);
    setQuickInstallProject(null);
    setQuickInstallVersions(null);
    setInstallStatus({});
    setInstalling({});
  };

  // Install mod to selected profile via quick install
  const quickInstallToProfile = async (profileId: string) => {
    if (!quickInstallProject || !quickInstallVersions) {
      toast.error("Missing required installation information");
      return;
    }

    const profile = internalProfiles.find(p => p.id === profileId);
    if (!profile) {
      toast.error("Profile not found");
      return;
    }

    const bestVersion = findBestVersionForProfile(profile, quickInstallVersions);
    if (!bestVersion) {
      toast.error(`No compatible version found for ${profile.name}`);
      return;
    }

    setInstalling(prev => ({ ...prev, [profileId]: true }));

    try {
      const primaryFile = bestVersion.files.find(file => file.primary) || bestVersion.files[0];
      if (!primaryFile) {
        toast.error("No download file available for the selected version.");
        setInstalling(prev => ({ ...prev, [profileId]: false }));
        return;
      }

      const mappedContentType = mapUnifiedProjectTypeToNrContentType(quickInstallProject.project_type);
      if (!mappedContentType) {
        setInstalling(prev => ({ ...prev, [profileId]: false }));
        return;
      }
      
      if (quickInstallProject.project_type === 'modpack') {
          toast.error("Modpacks must be installed as new profiles.");
          setInstalling(prev => ({ ...prev, [profileId]: false }));
          return;
      }

      const payload: InstallContentPayload = {
        profile_id: profileId, // Use the passed profileId
        project_id: quickInstallProject.project_id,
        version_id: bestVersion.id,
        file_name: primaryFile.filename,
        download_url: primaryFile.url,
        file_hash_sha1: primaryFile.hashes?.sha1 || undefined,
        file_fingerprint: undefined, // Modrinth doesn't use fingerprints
        content_name: quickInstallProject.title,
        version_number: bestVersion.version_number,
        content_type: mappedContentType,
        loaders: bestVersion.loaders,
        game_versions: bestVersion.game_versions,
        source: quickInstallProject.source,
      };

      await installContentToProfile(payload);

      toast.success(`Successfully installed ${quickInstallProject.title} (${bestVersion.version_number}) to ${profile.name}`);

      // Check for Iris shader mod if a shader pack was installed
      if (quickInstallProject.project_type === 'shader') {
        await handleIrisCheckAndShowModal(
          quickInstallProject.title,
          profileId,
          quickInstallProject.project_id,
          "Quick install to profile",
          showModal,
          hideModal,
          () => {
            // TODO: Implement Iris installation logic
            debugLog('🎯 User clicked "Install Iris Now"');
          }
        );
      }

      setInstallStatus(prev => ({ ...prev, [profileId]: true }));
      
      // Update installedProjects state only if this profile is the currently selected one in the main view
      if (selectedProfile && selectedProfile.id === profileId) {
        setInstalledProjects(prev => ({
          ...prev,
          [quickInstallProject.project_id]: getStatusForNewInstall(prev[quickInstallProject.project_id])
        }));
      }
      
      // Update installedVersions state for the specific profileId
      setInstalledVersions(prev => {
        const newState = { ...prev };
        if (!newState[profileId]) { // Use profileId
          newState[profileId] = {};   // Use profileId
        }
        
        newState[profileId][bestVersion.id] = getStatusForNewInstall( // Use profileId
          newState[profileId][bestVersion.id] // Use profileId
        );
        
        return newState;
      });

      justInstalledOrToggledRef.current = true; 
      if (onInstallSuccess) {
        onInstallSuccess();
      }
      
    } catch (error) {
      toast.error(`Failed to install: ${error instanceof Error ? error.message : String(error)}`);
      console.error("Install error in quickInstallToProfile:", error);
    } finally {
      setInstalling(prev => ({ ...prev, [profileId]: false }));
    }
  };

  const handleInstallModpackAsProfile = async (project: UnifiedModSearchResult | any) => {
    if (project.project_type !== 'modpack') {
      toast.error("This handler is primarily for modpacks. For other types, behavior might differ.");
      if (onInstallSuccess) {
        onInstallSuccess();
      }
      return;
    }
    setInstallingModpackAsProfile(prev => ({ ...prev, [project.project_id]: true })); // Start loading
    const toastId = toast.loading(`Fetching versions for ${project.title}...`);

    try {
      const response = await UnifiedService.getModVersions({
        source: project.source,
        project_id: project.project_id
      });
      const allVersions = response.versions;

      if (!allVersions || allVersions.length === 0) {
        throw new Error("No versions found for this modpack.");
      }

      // Sort all versions by date published, newest first
      const sortedVersions = allVersions.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());

      // Try to find the latest 'release' version
      let latestVersion = sortedVersions.find(v => v.release_type === 'release');

      // If no release version is found, fall back to the absolute latest version
      if (!latestVersion) {
        latestVersion = sortedVersions[0];
      }

      if (!latestVersion || !latestVersion.files || latestVersion.files.length === 0) { throw new Error("Latest version has no files."); }
      const primaryFile = latestVersion.files.find(f => f.primary) || latestVersion.files[0];
      if (!primaryFile) { throw new Error("No primary file found for the latest version."); }

      toast.loading(`Installing ${project.title} (v${latestVersion.version_number}) as new profile...`, { id: toastId });

      let newProfileId: string;

      // Choose the appropriate service based on modSource
      if (modSource === ModPlatform.CurseForge) {
        // For CurseForge, we need projectId and fileId as numbers
        const projectId = parseInt(project.project_id);
        const fileId = parseInt(latestVersion.id);

        if (isNaN(projectId) || isNaN(fileId)) {
          throw new Error("Invalid project or file ID for CurseForge modpack");
        }

        newProfileId = await CurseForgeService.downloadAndInstallCurseForgeModpack(
          projectId,
          fileId,
          project.title,
          primaryFile.url,
          project.icon_url || undefined,
          project.title
        );
      } else {
        // Default to Modrinth
        newProfileId = await ModrinthService.downloadAndInstallModpack(
          project.project_id,
          latestVersion.id,
          primaryFile.filename,
          primaryFile.url,
          project.icon_url || undefined
        );
      }

      toast.success(
        (t) => (
          <div className="flex flex-col">
            <span>Successfully installed {project.title} as a new profile!</span>
            <span className="text-xs text-gray-400">Profile ID: {newProfileId}</span>
            {/* TODO: Maybe add a button to switch to this profile or open its settings */}
          </div>
        ),
        { id: toastId, duration: 1000 }
      );

      try {
        // Wait for the profile list to be updated in the global store
        await useProfileStore.getState().fetchProfiles();
        const updatedProfiles = useProfileStore.getState().profiles;
        setInternalProfiles(updatedProfiles); // Sync local state

        // Now it's safe to navigate
        navigate(`/profiles/${newProfileId}`);
      } catch (profileError) {
        console.error("Failed to refresh profiles list internally:", profileError);
        toast.error("Profile installed, but failed to navigate automatically.");
      }

      // Conditionally call onInstallSuccess
      if (project.project_type !== 'modpack' && onInstallSuccess) {
        onInstallSuccess();
      }
      // For modpacks, onInstallSuccess is intentionally skipped to prevent page reload,
      // as internalProfiles state is updated directly.

    } catch (err: any) {
      console.error("Failed to install modpack as profile:", err);
      toast.error(`Error installing ${project.title}: ${err.message || 'Unknown error'}`, { id: toastId });
    } finally {
      setInstallingModpackAsProfile(prev => ({ ...prev, [project.project_id]: false })); // Stop loading
    }
  };

  const handleInstallModpackVersionAsProfile = async (project: UnifiedModSearchResult | any, version: UnifiedVersion) => {
    if (project.project_type !== 'modpack') {
      toast.error("This handler is primarily for modpack versions. For other types, behavior might differ.");
      if (onInstallSuccess) {
        onInstallSuccess();
      }
      return;
    }
    if (!version || !version.files || version.files.length === 0) {
      toast.error("Selected version has no files.");
      return;
    }

    setInstallingModpackVersion(prev => ({ ...prev, [version.id]: true })); // Start loading for this modpack version

    const primaryFile = version.files.find(f => f.primary) || version.files[0];
    if (!primaryFile) {
        toast.error("No primary file found for the selected version.");
        return;
    }
    const toastId = toast.loading(`Installing ${project.title} (version ${version.version_number}) as new profile...`);

    try {
      let newProfileId: string;

      // Choose the appropriate service based on modSource
      if (modSource === ModPlatform.CurseForge) {
        // For CurseForge, we need projectId and fileId as numbers
        const projectId = parseInt(project.project_id);
        const fileId = parseInt(version.id);

        if (isNaN(projectId) || isNaN(fileId)) {
          throw new Error("Invalid project or file ID for CurseForge modpack");
        }

        newProfileId = await CurseForgeService.downloadAndInstallCurseForgeModpack(
          projectId,
          fileId,
          project.title,
          primaryFile.url,
          project.icon_url || undefined,
          project.title
        );
      } else {
        // Default to Modrinth
        newProfileId = await ModrinthService.downloadAndInstallModpack(
          project.project_id,
          version.id,
          primaryFile.filename,
          primaryFile.url,
          project.icon_url || undefined
        );
      }

      toast.success(
        (t) => (
          <div className="flex flex-col">
            <span>Successfully installed {project.title} (v{version.version_number}) as a new profile!</span>
            <span className="text-xs text-gray-400">Profile ID: {newProfileId}</span>
          </div>
        ),
        { id: toastId, duration: 1000 }
      );

      try {
        // Wait for the profile list to be updated in the global store
        await useProfileStore.getState().fetchProfiles();
        const updatedProfiles = useProfileStore.getState().profiles;
        setInternalProfiles(updatedProfiles); // Sync local state

        // Now it's safe to navigate
        navigate(`/profiles/${newProfileId}`);
      } catch (profileError) {
        console.error("Failed to refresh profiles list internally:", profileError);
        toast.error("Profile installed, but failed to navigate automatically.");
      }

      // Conditionally call onInstallSuccess
      if (project.project_type !== 'modpack' && onInstallSuccess) {
        onInstallSuccess();
      }
      // For modpacks, onInstallSuccess is intentionally skipped.

    } catch (err: any) {
      console.error("Failed to install modpack version as profile:", err);
      toast.error(`Error installing ${project.title}: ${err.message || 'Unknown error'}`, { id: toastId });
    } finally {
      setInstallingModpackVersion(prev => ({ ...prev, [version.id]: false })); // Stop loading for this modpack version
    }
  };

  const handleInstallToNewProfile = async (
    profileName: string,
    project: UnifiedModSearchResult | any,
    version: UnifiedVersion | null,
    sourceProfileIdToCopy?: string | null // Parameter for copying
  ): Promise<void> => {

    try {
      let newProfileId: string;
      let successMessageDetail = `Successfully created profile '${profileName}'`;
      let gameVersion = '1.21.1'; // Default fallback
      let loader = 'fabric'; // Default to fabric, will be overridden if needed
      let versionToInstall: UnifiedVersion | null = null; // The version we'll install

      // Handle profile creation
      if (sourceProfileIdToCopy) {
        // Get the source profile from the store
        debugLog('🔍 Looking for source profile:', sourceProfileIdToCopy);
        const allProfiles = await ProfileService.getAllProfilesAndLastPlayed();
        debugLog('📋 Available profiles:', allProfiles.all_profiles.map(p => ({ id: p.id, name: p.name })));

        const sourceProfile = allProfiles.all_profiles.find(p => p.id === sourceProfileIdToCopy);
        debugLog('🎯 Found source profile:', sourceProfile);

        if (!sourceProfile) {
          throw new Error(`Source profile with ID ${sourceProfileIdToCopy} not found`);
        }

        const sourceProfileName = sourceProfile.name;

        // Copy profile using the service directly
        const copyParams = {
          source_profile_id: sourceProfileIdToCopy,
          new_profile_name: profileName,
          include_files: undefined, // Let the backend handle includeAll
        };

        debugLog('🔄 Copying profile with params:', copyParams);
        newProfileId = await ProfileService.copyProfile(copyParams);
        debugLog('✅ Profile copied successfully, new ID:', newProfileId);

        // If the source profile is a standard version, update the new profile to be custom
        if (sourceProfile?.is_standard_version) {
          await ProfileService.updateProfile(newProfileId, {
            group: "CUSTOM",
          });
        }

        successMessageDetail = `Successfully copied profile '${profileName}' from '${sourceProfileName}'`;

        // Get game version from the source profile for compatibility filtering
        if (sourceProfile) {
          gameVersion = sourceProfile.game_version || '1.21.1';
          loader = sourceProfile.loader || 'vanilla';
        }
      } else {
        // Handle both cases: with version and without version
      let versionToInstall: any = null; // Will be set below

        if (version) {
          // Version is available - use it
          gameVersion = version.game_versions[0] || '1.21.1';
          if (project.project_type === 'mod' || project.project_type === 'modpack') {
            loader = version.loaders[0] || 'vanilla';
          }
        } else {
          // No version specified - get the best compatible version based on current filters
          debugLog('🔍 Finding best compatible version for:', project.title);
          debugLog('🔍 Current filters - Game versions:', selectedGameVersions, 'Loaders:', currentSelectedLoaders);
          debugLog('🔍 Available loaders from UI:', allLoadersData.map(l => l.name));

          // Get all versions for this project
          debugLog('🔄 Fetching mod versions from API...');
          const response = await UnifiedService.getModVersions({
            source: project.source,
            project_id: project.project_id
          });
          const modVersions = response.versions;
          debugLog('✅ Got', modVersions.length, 'versions from API');

          if (!modVersions || modVersions.length === 0) {
            throw new Error(`No versions found for ${project.title}`);
          }

          // STRATEGY: FABRIC-FIRST with Filter Support
          debugLog('🎯 FABRIC-FIRST strategy with filter support');
          debugLog('🔍 Current filters - Game versions:', selectedGameVersions, 'Loaders:', currentSelectedLoaders);

          // Step 1: Apply game version filter if active
          let filteredVersions: any[] = modVersions;
          if (selectedGameVersions && selectedGameVersions.length > 0) {
            filteredVersions = modVersions.filter(version =>
              version.game_versions.some(gv => selectedGameVersions.includes(gv))
            );
            debugLog(`🎮 Filtered to ${filteredVersions.length} versions matching game versions:`, selectedGameVersions);
          }

          // Step 2: Apply loader filter if active
          if (currentSelectedLoaders && currentSelectedLoaders.length > 0) {
            filteredVersions = filteredVersions.filter(version =>
              version.loaders && version.loaders.some(l =>
                currentSelectedLoaders.some(filterL => filterL.toLowerCase() === l.toLowerCase())
              )
            );
            debugLog(`🔧 Filtered to ${filteredVersions.length} versions matching loaders:`, currentSelectedLoaders);
          }

          // Step 3: If no versions match filters, fall back to all versions
          if (filteredVersions.length === 0) {
            debugLog('⚠️ No versions match current filters, using all versions');
            filteredVersions = modVersions;
          }

          // Step 4: FABRIC-FIRST within filtered versions
          const fabricVersions = filteredVersions.filter(version =>
            version.loaders && version.loaders.some(l => l.toLowerCase() === 'fabric')
          );

          debugLog(`✅ Found ${fabricVersions.length} Fabric-compatible versions out of ${filteredVersions.length} filtered versions`);

          if (fabricVersions.length > 0) {
            // Use Fabric version with highest MC version
            const sortedFabricVersions = fabricVersions.sort((a, b) => {
              const aMaxMC = a.game_versions.sort((x, y) => y.localeCompare(x, undefined, { numeric: true }))[0];
              const bMaxMC = b.game_versions.sort((x, y) => y.localeCompare(x, undefined, { numeric: true }))[0];
              return bMaxMC.localeCompare(aMaxMC, undefined, { numeric: true });
            });

            versionToInstall = sortedFabricVersions[0];
            loader = 'fabric';

            // Get highest MC version supported by this Fabric version
            const sortedMCVersions = [...versionToInstall.game_versions].sort((a, b) => {
              return b.localeCompare(a, undefined, { numeric: true });
            });
            gameVersion = sortedMCVersions[0] || '1.21.1';

            debugLog('🎉 FABRIC SUCCESS: Using Fabric version', versionToInstall.version_number, 'for MC', gameVersion);
          } else {
            // No Fabric versions found in filtered results, use best available
            debugLog('⚠️ No Fabric versions found in filtered results, using best available');

            // Try to find any version that matches loader filter
            if (currentSelectedLoaders && currentSelectedLoaders.length > 0) {
              const loaderMatchingVersions = filteredVersions.filter(version =>
                version.loaders && version.loaders.some(l =>
                  currentSelectedLoaders.some(filterL => filterL.toLowerCase() === l.toLowerCase())
                )
              );

              if (loaderMatchingVersions.length > 0) {
                // Sort by MC version and pick highest
                const sortedLoaderVersions = loaderMatchingVersions.sort((a, b) => {
                  const aMaxMC = a.game_versions.sort((x, y) => y.localeCompare(x, undefined, { numeric: true }))[0];
                  const bMaxMC = b.game_versions.sort((x, y) => y.localeCompare(x, undefined, { numeric: true }))[0];
                  return bMaxMC.localeCompare(aMaxMC, undefined, { numeric: true });
                });

                versionToInstall = sortedLoaderVersions[0] as any;
                loader = currentSelectedLoaders[0].toLowerCase(); // Use filtered loader

                const sortedMCVersions = [...versionToInstall.game_versions].sort((a, b) => {
                  return b.localeCompare(a, undefined, { numeric: true });
                });
                gameVersion = sortedMCVersions[0] || '1.21.1';

                debugLog('🎯 FILTER MATCH: Using filtered loader', loader, 'version', versionToInstall.version_number, 'for MC', gameVersion);
              } else {
                // No loader match, use latest from filtered
                versionToInstall = filteredVersions[0] as any;
                loader = 'fabric'; // Default fallback

                const sortedMCVersions = [...versionToInstall.game_versions].sort((a, b) => {
                  return b.localeCompare(a, undefined, { numeric: true });
                });
                gameVersion = sortedMCVersions[0] || '1.21.1';

                debugLog('📦 FILTERED FALLBACK: Using latest filtered version with fabric loader');
              }
            } else {
              // No loader filter, use latest from filtered
              versionToInstall = filteredVersions[0] as any;
              loader = 'fabric'; // Default to fabric

              const sortedMCVersions = [...versionToInstall.game_versions].sort((a, b) => {
                return b.localeCompare(a, undefined, { numeric: true });
              });
              gameVersion = sortedMCVersions[0] || '1.21.1';

              debugLog('📦 SIMPLE FALLBACK: Using latest filtered version with fabric loader');
            }
          }

          // Safety check - ensure versionToInstall is valid
          if (!versionToInstall) {
            debugLog('⚠️ Version selection logic failed, versionToInstall is null');
            debugLog('🔍 Debug info:', {
              modVersionsLength: modVersions.length,
              selectedGameVersions,
              currentSelectedLoaders,
              filteredVersionsLength: filteredVersions.length,
              fabricVersionsLength: fabricVersions?.length || 0
            });
            // Don't throw here, let the fallback logic handle it
          }





          // Set the loader based on the version to install (with Fabric priority)
          if (versionToInstall && versionToInstall.loaders && versionToInstall.loaders.length > 0) {
            const versionLoaders = versionToInstall.loaders.map(l => l.toLowerCase());
            debugLog('🔧 Available loaders in selected version:', versionLoaders);
            debugLog('🔧 Version details:', {
              version: versionToInstall.version_number,
              mc_versions: versionToInstall.game_versions,
              loaders: versionToInstall.loaders
            });

            // Use preferred loader order: fabric > forge > quilt > neoforge
            const preferredLoaderOrder = ['fabric', 'forge', 'quilt', 'neoforge'];
            debugLog('🔧 Checking against priority order:', preferredLoaderOrder);

            const selectedLoader = preferredLoaderOrder.find(l => versionLoaders.includes(l.toLowerCase()));

            if (selectedLoader) {
              loader = selectedLoader;
              debugLog('✅ Selected preferred loader:', loader, 'from priority order');
            } else {
              // If no preferred loader found, use the first available loader
              loader = versionLoaders[0];
              debugLog('⚠️ No preferred loader found, using first available:', loader, '(available:', versionLoaders, ')');
            }

            // If we have specific loader filters, try to respect them
            if (currentSelectedLoaders && currentSelectedLoaders.length > 0) {
              const filteredLoader = currentSelectedLoaders.find(l =>
                versionLoaders.includes(l.toLowerCase())
              );
              if (filteredLoader) {
                loader = filteredLoader.toLowerCase();
                debugLog('🔧 Using filtered loader:', loader);
              }
            }
          } else {
            loader = 'fabric'; // Fallback
            debugLog('⚠️ No loaders found in version, using fallback:', loader);
          }

          debugLog('📦 Final selection - MC version:', gameVersion, 'with loader:', loader, 'for mod:', project.title, 'using version:', versionToInstall?.version_number || 'null');

          // Final safety check - if versionToInstall is still null, set it to the first available version
          if (!versionToInstall) {
            debugLog('🚨 EMERGENCY FALLBACK: versionToInstall is still null, using first available version');
            if (modVersions && modVersions.length > 0) {
              versionToInstall = modVersions[0];
              debugLog('✅ Emergency fallback version:', versionToInstall.version_number);
            } else {
              throw new Error(`No versions available for ${project.title} after all fallback attempts`);
            }
          }
        }

        // Create new profile using the service directly
        debugLog('🔄 Creating new profile:', { name: profileName, game_version: gameVersion, loader });
        newProfileId = await ProfileService.createProfile({
          name: profileName,
          game_version: gameVersion,
          loader: loader,
        });
        debugLog('✅ Profile created successfully, new ID:', newProfileId);
      }

      // Handle installation based on whether version is available
      if (version) {
        // Version is available - install the specific version
        versionToInstall = version; // Set the version to install
        const primaryFile = version.files.find((f) => f.primary) || version.files[0];
        if (!primaryFile) {
          throw new Error("No primary file found for the selected version.");
        }

        const mappedContentType = mapUnifiedProjectTypeToNrContentType(project.project_type);
        if (!mappedContentType) {
          throw new Error(`Unsupported project type for installation: ${project.project_type}`);
        }

        // Safeguard: Modpacks should not be installed as content here.
        // mapUnifiedProjectTypeToNrContentType handles toast, but this ensures error propagation for toast.promise
        if (project.project_type === 'modpack') {
          throw new Error("Modpacks should be installed as new profiles, not as content to an existing one.");
        }

        const payload: InstallContentPayload = {
          profile_id: newProfileId,
          project_id: project.project_id,
          version_id: version.id,
          file_name: primaryFile.filename,
          download_url: primaryFile.url,
          file_hash_sha1: primaryFile.hashes?.sha1 || undefined,
          file_fingerprint: undefined, // Modrinth doesn't use fingerprints
          content_name: project.title,
          version_number: version.version_number,
          content_type: mappedContentType,
          loaders: version.loaders,
          game_versions: version.game_versions,
          source: project.source,
        };

        // Install content (toast is handled by the modal)
        await installContentToProfile(payload);
        debugLog('✅ Content installed successfully:', project.title, version.version_number);
      } else {
        // No specific version - get the latest version and install it
        debugLog('🔍 Getting latest version for:', project.title);

        // Get all versions for this project
        const response = await UnifiedService.getModVersions({
          source: project.source,
          project_id: project.project_id
        });
        const versions = response.versions;

        if (versions.length === 0) {
          throw new Error(`No versions found for ${project.title}`);
        }

        debugLog('📦 Installing version:', versionToInstall?.version_number || 'unknown', 'for MC', gameVersion);
        debugLog('🔍 Version data:', JSON.stringify(versionToInstall, null, 2));

        // Safety check before installation
        if (!versionToInstall) {
          debugLog('⚠️ No version was selected by the complex logic, falling back to first available version');
          // Fallback: use the first version from the versions array
          if (versions && versions.length > 0) {
            versionToInstall = versions[0] as any;
            debugLog('✅ Using fallback version:', versionToInstall.version_number);
          } else {
            throw new Error(`No versions available for ${project.title}`);
          }
        }

        // Handle different possible file structures
        let primaryFile = null;

        if (versionToInstall.files && Array.isArray(versionToInstall.files) && versionToInstall.files.length > 0) {
          // Standard case: files array is available
          primaryFile = versionToInstall.files.find((f) => f.primary) || versionToInstall.files[0];
        } else {
          // Fallback: try to find another version that has files
          console.warn('⚠️ No files array found for selected version, looking for alternative version');

          // Get fresh versions data to find one with files
          const response = await UnifiedService.getModVersions({
            source: project.source,
            project_id: project.project_id
          });
          const allVersions = response.versions;
          const versionWithFiles = allVersions.find(v =>
            v.files && Array.isArray(v.files) && v.files.length > 0
          );

          if (versionWithFiles) {
            debugLog('✅ Found alternative version with files:', versionWithFiles.version_number);
            versionToInstall = versionWithFiles as any;
            primaryFile = versionToInstall.files.find((f) => f.primary) || versionToInstall.files[0];
          } else {
            throw new Error(`No downloadable versions found for ${project.title}. This may be a temporary API issue.`);
          }
        }

        if (!primaryFile) {
          console.error('❌ No primary file found. Available files:', versionToInstall.files);
          throw new Error(`No suitable download file found for ${project.title} version ${versionToInstall.version_number}`);
        }

        debugLog('✅ Using file:', primaryFile.filename, 'from URL:', primaryFile.url);

        const mappedContentType = mapUnifiedProjectTypeToNrContentType(project.project_type);
        if (!mappedContentType) {
          throw new Error(`Unsupported project type for installation: ${project.project_type}`);
        }

        // Safeguard: Modpacks should not be installed as content here.
        if (project.project_type === 'modpack') {
          throw new Error("Modpacks should be installed as new profiles, not as content to an existing one.");
        }

        const payload = {
          profile_id: newProfileId,
          project_id: project.project_id,
          version_id: versionToInstall.id,
          download_url: primaryFile.url,
          file_name: primaryFile.filename,
          version_number: versionToInstall.version_number,
          content_type: mappedContentType,
          loaders: versionToInstall.loaders,
          game_versions: versionToInstall.game_versions,
          source: project.source,
        };

        // Install content (toast is handled by the modal)
        await installContentToProfile(payload);
        debugLog('✅ Content installed successfully:', project.title, versionToInstall.version_number);
      }

      // Update the store and local state to reflect changes
      const updatedProfiles = await ProfileService.getAllProfilesAndLastPlayed();
      setInternalProfiles(updatedProfiles.all_profiles);

      // Update the global profile store properly
      useProfileStore.setState({
        profiles: updatedProfiles.all_profiles,
        lastPlayedProfileId: updatedProfiles.last_played_profile_id,
        loading: false,
      });

      // Navigate to the newly created profile
      debugLog('🚀 Navigating to new profile:', newProfileId);
      navigate(`/profiles/${newProfileId}`);

      // Call onInstallSuccess if it exists and the installed content was not a modpack
      if (project.project_type !== 'modpack' && onInstallSuccess) {
        justInstalledOrToggledRef.current = true;
        onInstallSuccess();
      }

    } catch (error) {
      console.error("Error in handleInstallToNewProfile:", error);
      toast.error(`Failed to create profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Function to handle deleting a version from a profile
  const handleDeleteVersionFromProfile = async (
    profileId: string, // This is the definitive profile ID for this operation
    project: UnifiedModSearchResult | any,
    version: UnifiedVersion
  ) => {
    // REMOVED: if (!selectedProfile) { ... }

    const profileName = internalProfiles.find(p => p.id === profileId)?.name || profileId;

    const primaryFile = version.files.find(file => file.primary) || version.files[0];
    if (!primaryFile) {
      toast.error("No primary file found for the version. Cannot determine details for deletion.");
      return;
    }

    const payload: UninstallContentPayload = {
      profile_id: profileId,
      sha1_hash: primaryFile.hashes?.sha1 || undefined,
    };

    if (!payload.sha1_hash) {
      toast.error("SHA1 hash is missing for this version. Cannot proceed with deletion.");
      console.error("Deletion failed: SHA1 hash missing for", project.title, version.version_number, primaryFile);
      return;
    }

    debugLog("Attempting to remove content with payload:", payload);

    // Set uninstalling state
    debugLog('🗑️ Setting uninstalling state for profile:', profileId);
    setUninstalling(prev => ({ ...prev, [profileId]: true }));

    const removePromise = uninstallContentFromProfile(payload);

    await toast.promise(
      removePromise,
      {
        loading: `Removing ${project.title} (${version.version_number}) from ${profileName}...`,
        success: (data: any) => {
          // Update version status - set to not installed FOR THE SPECIFIC profileId
          setInstalledVersions(prev => {
            const newState = { ...prev };
            if (!newState[profileId]) { // Use profileId
              newState[profileId] = {}; // Use profileId
            }
            
            newState[profileId][version.id] = { // Use profileId
              is_installed: false,
              is_included_in_norisk_pack: newState[profileId]?.[version.id]?.is_included_in_norisk_pack || false, // Use profileId
              is_specific_version_in_pack: newState[profileId]?.[version.id]?.is_specific_version_in_pack || false, // Use profileId
              is_enabled: null,
              found_item_details: null,
              norisk_pack_item_details: newState[profileId]?.[version.id]?.norisk_pack_item_details || null, // Use profileId
            };
            
            return newState;
          });
          
          // Update modal states if they are open and showing this item
          // Reset install status for the profile so it can be installed again
          debugLog('🗑️ Resetting install status for profile:', profileId, 'after uninstall');
          setInstallStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[profileId]; // Remove the install status completely
            return newStatus;
          });

          // Reset uninstalling state
          debugLog('✅ Resetting uninstalling state for profile:', profileId);
          setUninstalling(prev => {
            const newState = { ...prev };
            delete newState[profileId];
            return newState;
          });

          // Check if any other versions of this project remain installed IN THE SPECIFIC profileId
          const anyVersionsStillInstalled = Object.entries(installedVersions[profileId] || {})
            .some(([vId, status]) => {
              if (vId === version.id) return false;
              const versionProject = expandedVersions[project.project_id];
              if (!Array.isArray(versionProject)) return false;
              const belongsToProject = versionProject.some(v => v.id === vId);
              return belongsToProject && status?.is_installed === true;
            });

          // If no versions are still installed, update project status ONLY IF profileId is the selectedProfile
          if (!anyVersionsStillInstalled && selectedProfile && selectedProfile.id === profileId) {
            setInstalledProjects(prev => ({
              ...prev,
              [project.project_id]: {
                is_installed: false,
                is_included_in_norisk_pack: prev[project.project_id]?.is_included_in_norisk_pack || false,
                is_specific_version_in_pack: prev[project.project_id]?.is_specific_version_in_pack || false,
                is_enabled: null,
                found_item_details: null,
                norisk_pack_item_details: prev[project.project_id]?.norisk_pack_item_details || null,
              }
            }));
          }

          justInstalledOrToggledRef.current = true;
          if (onInstallSuccess) {
            onInstallSuccess();
          }
          return `Successfully removed ${project.title} (${version.version_number}) from ${profileName}`;
        },
        error: (err) => {
          // Reset uninstalling state on error
          debugLog('❌ Resetting uninstalling state on error for profile:', profileId);
          setUninstalling(prev => {
            const newState = { ...prev };
            delete newState[profileId];
            return newState;
          });
          return `Failed to remove: ${err.message || String(err)}`;
        },
      }
    ).finally(() => {
      // Always reset uninstalling state
      debugLog('🔄 Finally resetting uninstalling state for profile:', profileId);
      setUninstalling(prev => {
        const newState = { ...prev };
        delete newState[profileId];
        return newState;
      });
    });
  };

  // New function to handle toggling enable/disable state of a version
  const handleToggleEnableVersion = async (
    profileId: string,
    project: UnifiedModSearchResult | any,
    version: UnifiedVersion,
    newEnabledState: boolean,
    sha1Hash: string
  ) => {
    // Get current installation status for the version
    const currentVersionStatus = installedVersions[selectedProfile.id]?.[version.id];

    // Determine NrContentType from project.project_type
    let nrContentType: NrContentType | undefined = undefined;
    switch (project.project_type as ModrinthProjectType) {
      case 'mod':
        nrContentType = NrContentType.Mod;
        break;
      case 'resourcepack':
        nrContentType = NrContentType.ResourcePack;
        break;
      case 'shader':
        nrContentType = NrContentType.ShaderPack;
        break;
      case 'datapack':
        nrContentType = NrContentType.DataPack;
        break;
      default:
        // Optionally log a warning for unhandled project types if needed
        console.warn("[ModrinthSearchV2] Unhandled project_type for NrContentType mapping in toggle:", project.project_type);
    }

    // Check if this is a NoRisk Pack item
    if (currentVersionStatus?.norisk_pack_item_details?.norisk_mod_identifier) {
      const noriskIdentifier = currentVersionStatus.norisk_pack_item_details.norisk_mod_identifier;
      
      const toastMessage = newEnabledState ? "Enabling" : "Disabling";
      const successMessage = newEnabledState ? "enabled" : "disabled";
      
      await toast.promise(
        async () => {
          const payload: ToggleContentPayload = {
            profile_id: profileId,
            enabled: newEnabledState,
            norisk_mod_identifier: noriskIdentifier,
            content_type: nrContentType, // Pass content_type here as well
            // sha1_hash is not strictly needed for norisk_mod_identifier-based toggling by current backend logic,
            // but can be included for consistency if desired or if backend logic changes.
            sha1_hash: sha1Hash, 
          };
          
          await toggleContentFromProfile(payload);
          
          // Update version's installation status
          setInstalledVersions(prev => {
            const newState = { ...prev };
            if (!newState[selectedProfile.id]) {
              newState[selectedProfile.id] = {};
            }
            
            if (newState[selectedProfile.id][version.id]) {
              newState[selectedProfile.id][version.id] = {
                ...newState[selectedProfile.id][version.id]!,
                is_enabled: newEnabledState,
                norisk_pack_item_details: {
                  ...newState[selectedProfile.id][version.id]!.norisk_pack_item_details!,
                  is_enabled: newEnabledState
                }
              };
            }
            
            return newState;
          });

          // Also update the project's installation status to reflect the change
          // This is important if the project card's display depends on this specific item's state.
          setInstalledProjects(prev => {
            const currentProjectStatus = prev[project.project_id];
            if (currentProjectStatus) {
              return {
                ...prev,
                [project.project_id]: {
                  ...currentProjectStatus,
                  is_enabled: newEnabledState, // Update top-level is_enabled for the project
                  norisk_pack_item_details: {
                    // Ensure we spread existing details if they exist, or initialize if not
                    ...(currentProjectStatus.norisk_pack_item_details || {}),
                    // We might not have a full norisk_mod_identifier here at project level,
                    // but the key is to update its is_enabled state if these details are what project card uses.
                    is_enabled: newEnabledState 
                  }
                }
              };
            }
            return prev; // If no existing project status, don't change it
          });

          return { versionName: version.version_number };
        },
        {
          loading: `${toastMessage} NoRisk Pack item: ${project.title} (${version.version_number})...`,
          success: ({ versionName }) => `Successfully ${successMessage} NoRisk Pack item: ${project.title} (${versionName})`,
          error: (err) => `Failed to ${toastMessage.toLowerCase()} NoRisk Pack item: ${err.message || String(err)}`
        }
      ).catch(err => {
        console.error(`Error ${toastMessage.toLowerCase()} NoRisk Pack item:`, err);
      });
      
      return; // Exit after handling NoRisk pack item
    }

    // Regular content toggle using SHA1 hash (for non-NoRisk pack items)
    if (!sha1Hash) {
      toast.error("Cannot enable/disable version: missing file hash");
      return;
    }

    const toastMessage = newEnabledState ? "Enabling" : "Disabling";
    const successMessage = newEnabledState ? "enabled" : "disabled";
    
    await toast.promise(
      async () => {
        const payload: ToggleContentPayload = {
          profile_id: profileId,
          sha1_hash: sha1Hash,
          enabled: newEnabledState,
          content_type: nrContentType, // Add mapped content_type
          norisk_mod_identifier: undefined, // Explicitly undefined for non-NoRisk items
        };
        
        await toggleContentFromProfile(payload);
        
        // Update version's installation status
        setInstalledVersions(prev => {
          const newState = { ...prev };
          if (!newState[selectedProfile.id]) {
            newState[selectedProfile.id] = {};
          }
          
          if (newState[selectedProfile.id][version.id]) {
            newState[selectedProfile.id][version.id] = {
              ...newState[selectedProfile.id][version.id]!,
              is_enabled: newEnabledState
            };
          }
          
          return newState;
        });

        // Update project's installation status (only its is_enabled field)
        setInstalledProjects(prev => {
            const currentProjectStatus = prev[project.project_id];
            if (currentProjectStatus && currentProjectStatus.is_installed) { // Only update if project is considered installed
              return {
                ...prev,
                [project.project_id]: {
                  ...currentProjectStatus,
                  is_enabled: newEnabledState 
                }
              };
            }
            return prev;
        });
        
        return { versionName: version.version_number };
      },
      {
        loading: `${toastMessage} ${project.title} (${version.version_number})...`,
        success: ({ versionName }) => `Successfully ${successMessage} ${project.title} (${versionName})`,
        error: (err) => `Failed to ${toastMessage.toLowerCase()}: ${err.message || String(err)}`
      }
    ).catch(err => {
      console.error(`Error ${toastMessage.toLowerCase()} content:`, err);
    });
  };
  return {
    selectedVersion,
    selectedProject,
    installing,
    uninstalling,
    installStatus,
    loadingStatus,
    quickInstallModalOpen,
    quickInstallProject,
    quickInstallVersions,
    quickInstallLoading,
    quickInstallError,
    quickInstallingProjects,
    installingModpackAsProfile,
    installingVersion,
    installingModpackVersion,
    openInstallModal,
    installToProfile,
    handleDirectInstall,
    quickInstall,
    handleDirectQuickInstall,
    handleProfileSelectionForQuickInstall,
    closeQuickInstallModal,
    quickInstallToProfile,
    handleInstallModpackAsProfile,
    handleInstallModpackVersionAsProfile,
    handleInstallToNewProfile,
    handleDeleteVersionFromProfile,
    handleToggleEnableVersion,
    findBestVersionForProfile,
    mapUnifiedProjectTypeToNrContentType,
  };
}

export type UseModrinthInstallReturn = ReturnType<typeof useModrinthInstall>;
