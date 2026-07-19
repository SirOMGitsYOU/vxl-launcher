"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import type { MinecraftVersion, VersionManifest } from "../../../types/minecraft";
import type { ModLoader } from "../../../types/profile";
import { invoke } from "@tauri-apps/api/core";
import { Modal } from "../../ui/Modal";
import { Button, SelectTab, LoadingState } from "../../ui-v2";
import { StatusMessage } from "../../ui/StatusMessage";
import { SearchWithFilters } from "../../ui/SearchWithFilters";
import { ProfileWizardV2Step2 } from "./ProfileWizardV2Step2";
import { ProfileWizardV2Step3 } from "./ProfileWizardV2Step3";
import { useThemeStore } from "../../../store/useThemeStore";
import { useProfileStore } from "../../../store/profile-store";
import type { CreateProfileParams } from "../../../types/profile";
import { toast } from "react-hot-toast";

interface ProfileWizardV2Props {
  onClose: () => void;
  onSave: (profile: any) => void;
  defaultGroup?: string | null;
}

export function ProfileWizardV2({ onClose, onSave, defaultGroup }: ProfileWizardV2Props) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Step 1 data
  const [minecraftVersions, setMinecraftVersions] = useState<MinecraftVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVersionType, setSelectedVersionType] = useState<"release" | "snapshot">("release");
  
  // Step 2 data
  const [selectedLoader, setSelectedLoader] = useState<ModLoader>("fabric");
  const [selectedLoaderVersion, setSelectedLoaderVersion] = useState<string | null>(null);

  useEffect(() => {
    const loadMinecraftVersions = async () => {
      setLoading(true);
      setShowLoadingIndicator(false);
      
      // Show loading indicator only after 800ms delay
      const loadingTimeout = setTimeout(() => {
        if (loading) {
          setShowLoadingIndicator(true);
        }
      }, 800);

      try {
        const manifest = await invoke<VersionManifest>("get_minecraft_versions");
        setMinecraftVersions(manifest.versions);
        
        // Auto-select latest release
        const latestRelease = manifest.versions.find(v => v.type === "release");
        if (latestRelease) {
          setSelectedVersion(latestRelease.id);
        }
      } catch (err) {
        setError("Failed to load Minecraft versions. Please try again.");
        console.error("Failed to load Minecraft versions:", err);
      } finally {
        clearTimeout(loadingTimeout);
        setLoading(false);
        setShowLoadingIndicator(false);
      }
    };

    loadMinecraftVersions();
  }, []);

  const filteredVersions = minecraftVersions
    .filter(version => {
      // Release shows all non-snapshot versions (release, alpha, etc.)
      // Snapshot shows only snapshot versions
      if (selectedVersionType === "release" && version.type === "snapshot") {
        return false;
      }
      if (selectedVersionType === "snapshot" && version.type !== "snapshot") {
        return false;
      }
      if (searchQuery) {
        return version.id.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });

  const handleStep1Next = () => {
    if (selectedVersion) {
      setCurrentStep(2);
    }
  };

  const handleStep2Next = (loader: ModLoader, loaderVersion: string | null) => {
    setSelectedLoader(loader);
    setSelectedLoaderVersion(loaderVersion);
    setCurrentStep(3);
  };

  const handleStep3Create = async (profileData: {
    name: string;
    group: string | null;
    minecraftVersion: string;
    loader: ModLoader;
    loaderVersion: string | null;
    memoryMaxMb: number;
    use_shared_minecraft_folder?: boolean;
    enable_file_sync?: boolean;
  }) => {
    const { createProfile } = useProfileStore.getState();

    const createParams: CreateProfileParams = {
      name: profileData.name,
      game_version: profileData.minecraftVersion,
      loader: profileData.loader,
      loader_version: profileData.loaderVersion || undefined,
      use_shared_minecraft_folder: profileData.use_shared_minecraft_folder,
      enable_file_sync: profileData.enable_file_sync,
    };

    const creationPromise = async () => {
      const profileId = await createProfile(createParams);

      // Update profile with additional settings
      const updateData: any = {};
      
      if (profileData.group) {
        updateData.group = profileData.group;
      }

      // Set memory settings
      updateData.settings = {
        memory: {
          min: 1024, // Default minimum
          max: profileData.memoryMaxMb
        }
      };

      if (Object.keys(updateData).length > 0) {
        await useProfileStore.getState().updateProfile(profileId, updateData);
      }

      const createdProfile = await useProfileStore.getState().getProfile(profileId);
      onSave(createdProfile);
      return createdProfile;
    };

    return toast.promise(creationPromise(), {
      loading: "Creating profile...",
      success: (createdProfile) => `Profile '${createdProfile.name}' created successfully!`,
      error: (err) => `Failed to create profile: ${err instanceof Error ? err.message : String(err)}`,
    });
  };

  const handleBackToStep1 = () => {
    setCurrentStep(1);
  };

  const handleBackToStep2 = () => {
    setCurrentStep(2);
  };

  const renderContent = () => {
    if (showLoadingIndicator) {
      return <LoadingState message="Loading versions..." />;
    }

    if (error) {
      return <StatusMessage type="error" message={error} />;
    }

    return (
      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="flex gap-4 items-center">
          <SearchWithFilters
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder="Search versions..."
            showSort={false}
            showFilter={false}
            className="flex-1"
          />

          <div className="flex gap-2">
            {[
              { key: "release", label: "Release", icon: "solar:star-bold" },
              { key: "snapshot", label: "Snapshot", icon: "solar:test-tube-bold" },
            ].map((type) => (
              <SelectTab
                key={type.key}
                active={selectedVersionType === type.key}
                onClick={() => setSelectedVersionType(type.key as "release" | "snapshot")}
                icon={<Icon icon={type.icon} className="w-4 h-4" />}
              >
                {type.label}
              </SelectTab>
            ))}
          </div>
        </div>

        {/* Version List */}
        <div className="max-h-96 overflow-y-auto overflow-x-hidden scrollbar-hide grid grid-cols-3 gap-3">
          {filteredVersions.map(version => (
            <div
              key={version.id}
              className={`p-4 cursor-pointer transition-all duration-200 border rounded-xl ${
                selectedVersion === version.id
                  ? "border-[var(--accent)] bg-[rgba(var(--accent-rgb),0.06)] vxl-accent-glow"
                  : "border-[var(--surface-border)] bg-[var(--surface-overlay)] hover:border-[var(--surface-border-strong)]"
              }`}
              onClick={() => setSelectedVersion(version.id)}
            >
              <div className="flex flex-col items-center text-center">
                <h4 className="text-lg font-semibold text-white">
                  {version.id}
                </h4>
                <p className="text-xs text-[var(--text-secondary)] capitalize mt-1">
                  {version.type}
                </p>
              </div>
            </div>
          ))}
        </div>

        {filteredVersions.length === 0 && !loading && (
          <div className="col-span-3 text-center py-8">
            <Icon icon="solar:magnifer-bold" className="w-12 h-12 text-white/50 mx-auto mb-2" />
            <p className="text-sm text-[var(--text-secondary)]">No versions found</p>
          </div>
        )}
      </div>
    );
  };

  const renderFooter = () => (
    <div className="flex justify-end items-center">
      <Button
        variant="primary"
        onClick={handleStep1Next}
        disabled={loading || !selectedVersion}
        size="md"
        icon={<Icon icon="solar:arrow-right-bold" className="w-4 h-4" />}
      >
        Next
      </Button>
    </div>
  );

  // Show Step 2 if we're on step 2
  if (currentStep === 2) {
    return (
      <ProfileWizardV2Step2
        onClose={onClose}
        onNext={handleStep2Next}
        onBack={handleBackToStep1}
        selectedMinecraftVersion={selectedVersion}
      />
    );
  }

  // Show Step 3 if we're on step 3
  if (currentStep === 3) {
    return (
      <ProfileWizardV2Step3
        onClose={onClose}
        onBack={handleBackToStep2}
        onCreate={handleStep3Create}
        selectedMinecraftVersion={selectedVersion}
        selectedLoader={selectedLoader}
        selectedLoaderVersion={selectedLoaderVersion}
        defaultGroup={defaultGroup}
      />
    );
  }

  // Default: Show Step 1
  return (
    <Modal
      title="Create profile — select Minecraft version"
      onClose={onClose}
      width="lg"
      footer={renderFooter()}
    >
      <div className="min-h-[500px] p-6">
        {renderContent()}
      </div>
    </Modal>
  );
} 