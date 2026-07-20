"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import type { Profile, SymlinkInfo } from "../../../types/profile";
import { toast } from "react-hot-toast";
import { useLaunchStateStore, LaunchState } from "../../../store/launch-state-store";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { useGlobalModal } from "../../../hooks/useGlobalModal";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { SymlinkConfigModal } from "./SymlinkConfigModal";
import { logError, logWarn, logInfo } from "../../../utils/logging-utils";
import {
  getProfileInstancePath,
  addProfileSymlink,
  removeProfileSymlink,
  getProfileSymlinks,
  getDefaultProfilePath,
} from "../../../services/profile-service";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  IconButton,
  LoadingState,
  SectionHeader,
  SettingsSection,
} from "../../ui-v2";
import { fieldLabelClass } from "./profile-settings-ui";

interface SymlinkSettingsTabProps {
  editedProfile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
  allProfiles: Profile[];
}

export function SymlinkSettingsTab({ editedProfile }: SymlinkSettingsTabProps) {
  const { showModal, hideModal } = useGlobalModal();
  const { confirm, confirmDialog } = useConfirmDialog();
  const [symlinks, setSymlinks] = useState<SymlinkInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const { getProfileState } = useLaunchStateStore();
  const profileState = getProfileState(editedProfile.id);
  const isProfileRunning =
    profileState.launchState === LaunchState.RUNNING ||
    profileState.launchState === LaunchState.LAUNCHING;

  useEffect(() => {
    loadSymlinks();
  }, [editedProfile.id]);

  const loadSymlinks = async () => {
    try {
      setLoading(true);
      const links = await getProfileSymlinks(editedProfile.id);
      setSymlinks(links);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logError(`Failed to load symlinks for profile ${editedProfile.id}: ${errorMessage}`);
      console.error("Failed to load symlinks:", error);
      toast.error("Failed to load symlinks");
    } finally {
      setLoading(false);
    }
  };

  const openPickerAndConfigure = async (directory: boolean) => {
    try {
      const profilesPath = await getDefaultProfilePath();
      const selected = await open({
        directory,
        multiple: false,
        defaultPath: profilesPath,
        title: directory
          ? "Select folder to symlink into your profile"
          : "Select file to symlink into your profile",
      });

      if (selected && typeof selected === "string") {
        const profileInstancePath = await getProfileInstancePath(editedProfile.id);
        const modalId = "symlink-config";
        showModal(
          modalId,
          <SymlinkConfigModal
            externalPath={selected}
            profileInstancePath={profileInstancePath}
            onConfirm={async (targetPath) => {
              hideModal(modalId);
              await createSymlink(selected, targetPath);
            }}
            onCancel={() => hideModal(modalId)}
          />,
        );
      }
    } catch (error) {
      console.error("Failed to open picker:", error);
      toast.error("Failed to open file picker");
    }
  };

  const createSymlink = async (externalPath: string, targetPath: string) => {
    try {
      logInfo(
        `Creating symlink for profile ${editedProfile.id}: ${targetPath} → ${externalPath}`,
      );
      await addProfileSymlink({
        profile_id: editedProfile.id,
        relative_path: targetPath,
        external_path: externalPath,
      });

      toast.success(`Symlink created: ${targetPath} → ${externalPath}`);
      await loadSymlinks();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logError(
        `Symlink creation failed for profile ${editedProfile.id}: ${errorMessage}. Target: ${targetPath}, External: ${externalPath}`,
      );
      console.error("Symlink creation failed:", error);

      if (errorMessage.includes("os error 1314") || errorMessage.includes("erforderliches Recht")) {
        logWarn(`Symlink creation failed due to Windows permissions. Profile: ${editedProfile.id}`);
        toast.error(
          "Windows requires Administrator rights or Developer Mode for symlinks. Please run the launcher as Administrator or enable Developer Mode in Windows Settings.",
          { duration: 8000 },
        );
      } else {
        toast.error(`Failed to create symlink: ${errorMessage}`);
      }
    }
  };

  const removeSymlink = async (path: string) => {
    const confirmed = await confirm({
      title: "Remove symlink",
      message: `Are you sure you want to remove the symlink "${path}"? The original files will not be deleted.`,
      confirmText: "Remove",
      cancelText: "Cancel",
      type: "danger",
    });

    if (!confirmed) return;

    try {
      logInfo(`Removing symlink for profile ${editedProfile.id}: ${path}`);
      await removeProfileSymlink(editedProfile.id, path);
      toast.success(`Symlink removed: ${path}`);
      await loadSymlinks();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logError(
        `Failed to remove symlink for profile ${editedProfile.id}: ${errorMessage}. Path: ${path}`,
      );
      toast.error(`Failed to remove symlink: ${errorMessage}`);
    }
  };

  const openInternalPath = async (relativePath: string) => {
    try {
      const instancePath = await getProfileInstancePath(editedProfile.id);
      const normalizedInstancePath = instancePath.replace(/\\/g, "/");
      const normalizedRelativePath = relativePath.replace(/\\/g, "/");
      const fullPath = `${normalizedInstancePath}/${normalizedRelativePath}`.replace(/\//g, "\\");

      logInfo(`Opening internal path for profile ${editedProfile.id}: ${fullPath}`);
      await openPath(fullPath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logError(
        `Failed to open internal path for profile ${editedProfile.id}: ${errorMessage}. Path: ${relativePath}`,
      );
      toast.error(`Failed to open internal path: ${errorMessage}`);
    }
  };

  if (isProfileRunning) {
    return (
      <EmptyState
        icon="solar:lock-bold"
        title="Profile is running"
        description="Stop the profile to manage symlinks."
      />
    );
  }

  return (
    <>
      {confirmDialog}
      <div className="space-y-4 select-none">
        <SectionHeader
          icon="solar:link-bold"
          title="Folder symlinks"
          description="Link folders or files from anywhere on your system to share content between profiles."
        />

        <SettingsSection>
          <label className={fieldLabelClass}>Active symlinks</label>
          {loading ? (
            <LoadingState message="Loading symlinks..." />
          ) : symlinks.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No symlinks configured.</p>
          ) : (
            <div className="space-y-2">
              {symlinks.map((symlink) => (
                <Card key={symlink.link_path} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <Icon
                          icon={symlink.is_directory ? "solar:folder-bold" : "solar:file-bold"}
                          className="h-4 w-4 flex-shrink-0 text-[var(--accent)]"
                        />
                        <span
                          className="truncate text-sm font-medium text-white"
                          title={symlink.link_path}
                        >
                          {symlink.link_path}
                        </span>
                        <span className="flex-shrink-0 text-xs text-[var(--text-muted)]">
                          ({symlink.link_type})
                        </span>
                      </div>
                      <div className="flex items-start gap-2 pl-6">
                        <Icon
                          icon="solar:arrow-right-bold"
                          className="mt-0.5 h-3 w-3 flex-shrink-0 text-[var(--text-muted)]"
                        />
                        <span
                          className="truncate font-mono text-xs text-[var(--text-secondary)]"
                          title={symlink.target_path}
                        >
                          {symlink.target_path}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <IconButton
                        size="sm"
                        onClick={() => openInternalPath(symlink.link_path)}
                        title="Open in profile"
                        aria-label="Open in profile"
                      >
                        <Icon icon="solar:folder-bold" className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton
                        size="sm"
                        onClick={() => removeSymlink(symlink.link_path)}
                        title="Remove symlink"
                        aria-label="Remove symlink"
                        className="hover:border-red-500/50 hover:text-red-300"
                      >
                        <Icon icon="solar:trash-bin-minimalistic-bold" className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </SettingsSection>

        <SettingsSection>
          <label className={fieldLabelClass}>Add new symlink</label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => openPickerAndConfigure(true)}
              variant="secondary"
              size="md"
              className="w-full"
              icon={<Icon icon="solar:folder-bold" className="h-4 w-4" />}
            >
              Link folder
            </Button>
            <Button
              onClick={() => openPickerAndConfigure(false)}
              variant="secondary"
              size="md"
              className="w-full"
              icon={<Icon icon="solar:file-bold" className="h-4 w-4" />}
            >
              Link file
            </Button>
          </div>

          <Alert tone="info" className="mt-4">
            <p className="font-medium text-white">How it works</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-[var(--text-secondary)]">
              <li>Choose a folder or file from anywhere on your computer.</li>
              <li>Configure where it appears in your profile.</li>
              <li>The content is linked — changes sync instantly.</li>
            </ol>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Perfect for syncing screenshots, config files, saves, or resource packs across
              profiles or cloud storage.
            </p>
          </Alert>
        </SettingsSection>
      </div>
    </>
  );
}
