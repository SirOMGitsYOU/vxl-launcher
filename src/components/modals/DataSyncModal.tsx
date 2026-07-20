"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { Modal } from "../ui/Modal";
import { Button, Card } from "../ui-v2";
import { Checkbox } from "../ui/Checkbox";
import { toast } from "react-hot-toast";
import type { FileSyncConfig } from "../../types/fileSync";
import * as FileSyncService from "../../services/file-sync-service";
import { useProfileStore } from "../../store/profile-store";

interface DataSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SYNCABLE_FILES = [
  { value: "servers.dat", label: "Server list (servers.dat)" },
  { value: "options.txt", label: "Game options (options.txt)" },
  { value: "shaderpacks", label: "Shaderpacks folder" },
] as const;

export function DataSyncModal({ isOpen, onClose }: DataSyncModalProps) {
  const { profiles } = useProfileStore();
  const [step, setStep] = useState<"source" | "files" | "targets">("source");
  const [selectedSourceProfile, setSelectedSourceProfile] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<string[]>(["servers.dat"]);
  const [syncAllProfiles, setSyncAllProfiles] = useState(false);
  const [selectedTargetProfiles, setSelectedTargetProfiles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const resetState = () => {
    setStep("source");
    setSelectedSourceProfile("");
    setSelectedFiles(["servers.dat"]);
    setSyncAllProfiles(false);
    setSelectedTargetProfiles(new Set());
  };

  const handleClose = () => {
    onClose();
    resetState();
  };

  const handleFileToggle = (file: string) => {
    setSelectedFiles((prev) =>
      prev.includes(file) ? prev.filter((entry) => entry !== file) : [...prev, file],
    );
  };

  const handleTargetProfileToggle = (profileId: string) => {
    setSelectedTargetProfiles((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) {
        next.delete(profileId);
      } else {
        next.add(profileId);
      }
      return next;
    });
  };

  const handleCreateSync = async () => {
    if (!selectedSourceProfile) {
      toast.error("Please select a source profile");
      return;
    }

    if (selectedFiles.length === 0) {
      toast.error("Please select at least one file to sync");
      return;
    }

    if (!syncAllProfiles && selectedTargetProfiles.size === 0) {
      toast.error("Please select at least one target profile or enable all profiles");
      return;
    }

    setIsLoading(true);
    try {
      const sourceProfile = profiles.find((profile) => profile.id === selectedSourceProfile);
      if (!sourceProfile) {
        toast.error("Source profile not found");
        return;
      }

      const targetProfileIds = syncAllProfiles
        ? profiles.filter((profile) => profile.id !== selectedSourceProfile).map((profile) => profile.id)
        : Array.from(selectedTargetProfiles);

      const config: Omit<FileSyncConfig, "id" | "created_at" | "last_synced_at"> = {
        source_profile_id: selectedSourceProfile,
        modpack_name: sourceProfile.name,
        profile_ids: targetProfileIds,
        files_to_sync: selectedFiles as FileSyncConfig["files_to_sync"],
        sync_all_profiles: syncAllProfiles,
        enabled: true,
      };

      await FileSyncService.createFileSyncConfig(config);
      toast.success("Data sync configuration created successfully");
      handleClose();
    } catch (error) {
      console.error("Failed to create sync config:", error);
      toast.error("Failed to create data sync configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const renderProfileOption = (
    profile: { id: string; name: string },
    selected: boolean,
    onSelect: () => void,
  ) => (
    <button
      key={profile.id}
      type="button"
      onClick={onSelect}
      className="w-full text-left"
    >
      <Card
        interactive
        selected={selected}
        className="px-3 py-2.5"
      >
        <span className="text-sm text-white">{profile.name}</span>
      </Card>
    </button>
  );

  const renderFooter = () => {
    if (step === "source") {
      return (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleClose} className="flex-1" size="md">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => setStep("files")}
            disabled={!selectedSourceProfile}
            className="flex-1"
            size="md"
            icon={<Icon icon="solar:arrow-right-bold" className="h-4 w-4" />}
          >
            Next
          </Button>
        </div>
      );
    }

    if (step === "files") {
      return (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setStep("source")}
            className="flex-1"
            size="md"
            icon={<Icon icon="solar:arrow-left-bold" className="h-4 w-4" />}
          >
            Back
          </Button>
          <Button
            variant="primary"
            onClick={() => setStep("targets")}
            disabled={selectedFiles.length === 0}
            className="flex-1"
            size="md"
            icon={<Icon icon="solar:arrow-right-bold" className="h-4 w-4" />}
          >
            Next
          </Button>
        </div>
      );
    }

    return (
      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => setStep("files")}
          className="flex-1"
          size="md"
          icon={<Icon icon="solar:arrow-left-bold" className="h-4 w-4" />}
        >
          Back
        </Button>
        <Button
          variant="primary"
          onClick={handleCreateSync}
          disabled={isLoading || (!syncAllProfiles && selectedTargetProfiles.size === 0)}
          className="flex-1"
          size="md"
          icon={
            isLoading ? (
              <Icon icon="solar:refresh-bold" className="h-4 w-4 animate-spin" />
            ) : (
              <Icon icon="solar:check-circle-bold" className="h-4 w-4" />
            )
          }
        >
          {isLoading ? "Creating..." : "Create sync"}
        </Button>
      </div>
    );
  };

  const stepTitle =
    step === "source"
      ? "Data sync — Source profile"
      : step === "files"
        ? "Data sync — Files"
        : "Data sync — Target profiles";

  return (
    <Modal title={stepTitle} onClose={handleClose} width="md" footer={renderFooter()}>
      <div className="space-y-4 p-6 select-none">
        {step === "source" && (
          <>
            <p className="text-sm text-[var(--text-secondary)]">
              Select the profile to sync files from.
            </p>
            <div className="custom-scrollbar max-h-56 space-y-2 overflow-y-auto">
              {profiles.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No profiles available</p>
              ) : (
                profiles.map((profile) =>
                  renderProfileOption(profile, selectedSourceProfile === profile.id, () =>
                    setSelectedSourceProfile(profile.id),
                  ),
                )
              )}
            </div>
          </>
        )}

        {step === "files" && (
          <>
            <p className="text-sm text-[var(--text-secondary)]">Choose which files to sync.</p>
            <div className="space-y-2">
              {SYNCABLE_FILES.map((file) => (
                <Card key={file.value} className="px-3 py-2.5">
                  <Checkbox
                    label={file.label}
                    checked={selectedFiles.includes(file.value)}
                    onChange={() => handleFileToggle(file.value)}
                    size="md"
                  />
                </Card>
              ))}
            </div>
          </>
        )}

        {step === "targets" && (
          <>
            <p className="text-sm text-[var(--text-secondary)]">
              Choose which profiles should receive synced files.
            </p>

            <Card className="px-3 py-2.5">
              <Checkbox
                label="All profiles"
                checked={syncAllProfiles}
                onChange={() => setSyncAllProfiles(!syncAllProfiles)}
                description="Include every other profile as a sync target"
                size="md"
              />
            </Card>

            {!syncAllProfiles && (
              <div className="custom-scrollbar max-h-56 space-y-2 overflow-y-auto">
                {profiles.filter((profile) => profile.id !== selectedSourceProfile).length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No other profiles available</p>
                ) : (
                  profiles
                    .filter((profile) => profile.id !== selectedSourceProfile)
                    .map((profile) => (
                      <Card key={profile.id} className="px-3 py-2.5">
                        <Checkbox
                          label={profile.name}
                          checked={selectedTargetProfiles.has(profile.id)}
                          onChange={() => handleTargetProfileToggle(profile.id)}
                          size="md"
                        />
                      </Card>
                    ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
