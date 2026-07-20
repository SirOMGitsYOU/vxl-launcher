"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import type { Profile } from "../../types/profile";
import GeneralSettingsTab from "./settings/GeneralSettingsTab";
import { InstallationSettingsTab } from "./settings/InstallationSettingsTab";
import { JavaSettingsTab } from "./settings/JavaSettingsTab";
import { WindowSettingsTab } from "./settings/WindowSettingsTab";
import { AdvancedTab } from "./settings/AdvancedTab";
import { SymlinkSettingsTab } from "./settings/SymlinkSettingsTab";

import { useProfileStore } from "../../store/profile-store";
import * as ProfileService from "../../services/profile-service";
import { Modal } from "../ui/Modal";
import { Button } from "../ui-v2";
import { useThemeStore } from "../../store/useThemeStore";
import { toast } from "react-hot-toast";
import { DesignerSettingsTab } from './settings/DesignerSettingsTab';
import { cn } from "../../lib/utils";

interface ProfileSettingsProps {
  profile: Profile;
  onClose: () => void;
}

type SettingsTab =
  | "general"
  | "installation"
  | "java"
  | "window"
  | "nrc"
  | "designer"
  | "symlinks";

export function ProfileSettings({ profile, onClose }: ProfileSettingsProps) {
  const { updateProfile, deleteProfile } = useProfileStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [editedProfile, setEditedProfile] = useState<Profile>({ ...profile });
  const [currentProfile, setCurrentProfile] = useState<Profile>({ ...profile });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [systemRam, setSystemRam] = useState<number>(8192);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { accentColor } = useThemeStore();

  const showDesignerTab = false;
  const [tempRamMb, setTempRamMb] = useState(profile.settings?.memory?.max ?? 3072);

  useEffect(() => {
    ProfileService.getSystemRamMb()
      .then((ram) => setSystemRam(ram))
      .catch((err) => {
        console.error("Failed to get system RAM:", err);
      });
  }, []);

  useEffect(() => {
    setTempRamMb(profile.settings?.memory?.max ?? 3072);
  }, [profile]);

  const updateProfileData = (updates: Partial<Profile>) => {
    setEditedProfile((prev) => ({ ...prev, ...updates }));
  };

  const handleRefresh = async () => {
    try {
      const updatedProfile = await ProfileService.getProfile(profile.id);
      setCurrentProfile(updatedProfile);
      setEditedProfile(updatedProfile);

      useProfileStore.getState().refreshSingleProfileInStore(updatedProfile);

      return updatedProfile;
    } catch (error) {
      console.error("Failed to refresh profile:", error);
      throw error;
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateProfile(profile.id, {
        name: editedProfile.name,
        game_version: editedProfile.game_version,
        loader: editedProfile.loader,
        loader_version: editedProfile.loader_version || null || undefined,
        settings: {
          ...editedProfile.settings,
          memory: {
            ...editedProfile.settings?.memory,
            max: tempRamMb,
          },
        },
        group: editedProfile.group,
        clear_group: !editedProfile.group,
        description: editedProfile.description,
        norisk_information: editedProfile.norisk_information,
        use_shared_minecraft_folder: editedProfile.use_shared_minecraft_folder,
        preferred_account_id: editedProfile.preferred_account_id,
        clear_preferred_account: !editedProfile.preferred_account_id,
      });

      toast.success("Profile saved successfully!");
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Failed to save profile:", err);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const deletePromise = deleteProfile(profile.id);

      toast
        .promise(deletePromise, {
          loading: `Deleting profile '${profile.name}'...`,
          success: () => {
            onClose();
            return `Profile '${profile.name}' deleted successfully!`;
          },
          error: (err) => {
            const errorMessage =
              err instanceof Error ? err.message : String(err.message);
            return `Failed to delete profile: ${errorMessage}`;
          },
        })
        .finally(() => {
          setIsDeleting(false);
        });
    } catch (err) {
      console.error("Error during delete initiation:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to initiate profile deletion: ${errorMessage}`);
      setIsDeleting(false);
    }
  };

  const baseTabConfig = [
    { id: "general", label: "General", icon: "solar:settings-bold" },
    { id: "installation", label: "Installation", icon: "solar:download-bold" },
    { id: "java", label: "Java & memory", icon: "solar:code-bold" },
    { id: "window", label: "Window", icon: "solar:widget-bold" },
    { id: "nrc", label: "Advanced", icon: "solar:shield-check-bold" },
    { id: "symlinks", label: "Symlinks", icon: "solar:link-bold" },
  ];

  const tabConfig = showDesignerTab
    ? [
        ...baseTabConfig,
        { id: "designer", label: "Designer", icon: "solar:palette-bold" },
      ]
    : baseTabConfig;

  useEffect(() => {
    if (activeTab === "designer" && !showDesignerTab) {
      setActiveTab("general");
    }
  }, [activeTab, showDesignerTab]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <GeneralSettingsTab
            profile={currentProfile}
            editedProfile={editedProfile}
            updateProfile={updateProfileData}
            onDelete={handleDelete}
            isDeleting={isDeleting}
            onRefresh={handleRefresh}
          />
        );
      case "installation":
        return (
          <InstallationSettingsTab
            profile={profile}
            editedProfile={editedProfile}
            updateProfile={updateProfileData}
            refreshTrigger={refreshTrigger}
          />
        );
      case "java":
        return (
          <JavaSettingsTab
            editedProfile={editedProfile}
            updateProfile={updateProfileData}
            systemRam={systemRam}
            tempRamMb={tempRamMb}
            setTempRamMb={setTempRamMb}
          />
        );
      case "window":
        return (
          <WindowSettingsTab
            editedProfile={editedProfile}
            updateProfile={updateProfileData}
          />
        );
      case "nrc":
        return <AdvancedTab profile={profile} />;

      case "designer":
        if (showDesignerTab) {
          return (
            <DesignerSettingsTab
              editedProfile={editedProfile}
              updateProfile={updateProfileData}
            />
          );
        }
        return null;
      case "symlinks":
        return (
          <SymlinkSettingsTab
            editedProfile={editedProfile}
            updateProfile={updateProfileData}
            allProfiles={useProfileStore.getState().profiles}
          />
        );
      default:
        return null;
    }
  };

  const renderFooter = () => (
    <div className="flex gap-2">
      <Button variant="secondary" onClick={onClose} className="flex-1" size="md">
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={handleSave}
        disabled={isSaving}
        className="flex-1"
        size="md"
      >
        {isSaving ? "Saving..." : "Save changes"}
      </Button>
    </div>
  );

  return (
    <Modal
      title={`Profile settings — ${profile.name}`}
      onClose={onClose}
      width="xl"
      footer={renderFooter()}
      className="h-[650px] min-h-[550px] flex flex-col"
    >
      <div className="flex h-full min-h-0">
        <nav className="flex w-52 flex-shrink-0 flex-col border-r border-[var(--surface-border)] py-2">
          {tabConfig.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors",
                  isActive
                    ? "border-l-2 font-medium text-white"
                    : "border-l-2 border-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-overlay)]/60 hover:text-white",
                )}
                style={
                  isActive
                    ? {
                        backgroundColor: `${accentColor.value}10`,
                        borderLeftColor: accentColor.value,
                      }
                    : undefined
                }
                onClick={() => setActiveTab(tab.id as SettingsTab)}
              >
                <Icon
                  icon={tab.icon}
                  className="h-4 w-4 flex-shrink-0"
                  style={isActive ? { color: accentColor.value } : undefined}
                />
                <span style={isActive ? { color: accentColor.value } : undefined}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="custom-scrollbar min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-4">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </Modal>
  );
}
