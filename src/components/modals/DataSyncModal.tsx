"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "../ui/buttons/Button";
import { Checkbox } from "../ui/Checkbox";
import { toast } from "react-hot-toast";
import type { FileSyncConfig } from "../../types/fileSync";
import * as FileSyncService from "../../services/file-sync-service";
import { useProfileStore } from "../../store/profile-store";
import { useThemeStore } from "../../store/useThemeStore";

interface DataSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SYNCABLE_FILES = [
  { value: "servers.dat", label: "Server List (servers.dat)" },
  { value: "options.txt", label: "Game Options (options.txt)" },
  { value: "shaderpacks", label: "Shaderpacks Folder" },
];

export function DataSyncModal({ isOpen, onClose }: DataSyncModalProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const { profiles } = useProfileStore();
  const [step, setStep] = useState<"source" | "files" | "targets">("source");
  const [selectedSourceProfile, setSelectedSourceProfile] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<string[]>(["servers.dat"]);
  const [syncAllProfiles, setSyncAllProfiles] = useState(false);
  const [selectedTargetProfiles, setSelectedTargetProfiles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  // Filter out Hytale profiles - only show Minecraft profiles
  const minecraftProfiles = profiles.filter((p) => p.game_type !== "hytale");

  const handleFileToggle = (file: string) => {
    setSelectedFiles((prev) =>
      prev.includes(file) ? prev.filter((f) => f !== file) : [...prev, file]
    );
  };

  const handleTargetProfileToggle = (profileId: string) => {
    setSelectedTargetProfiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(profileId)) {
        newSet.delete(profileId);
      } else {
        newSet.add(profileId);
      }
      return newSet;
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
      toast.error("Please select at least one target profile or enable 'ALL Profiles'");
      return;
    }

    setIsLoading(true);
    try {
      const sourceProfile = profiles.find((p) => p.id === selectedSourceProfile);
      if (!sourceProfile) {
        toast.error("Source profile not found");
        return;
      }

      const targetProfileIds = syncAllProfiles
        ? minecraftProfiles.filter((p) => p.id !== selectedSourceProfile).map((p) => p.id)
        : Array.from(selectedTargetProfiles);

      const config: Omit<
        FileSyncConfig,
        "id" | "created_at" | "last_synced_at"
      > = {
        source_profile_id: selectedSourceProfile,
        modpack_name: sourceProfile.name,
        profile_ids: targetProfileIds,
        files_to_sync: selectedFiles as any,
        sync_all_profiles: syncAllProfiles,
        enabled: true,
      };

      await FileSyncService.createFileSyncConfig(config);
      toast.success("Data Sync configuration created successfully");
      onClose();
      handleClose();
    } catch (error) {
      console.error("Failed to create sync config:", error);
      toast.error("Failed to create Data Sync configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setStep("source");
    setSelectedSourceProfile("");
    setSelectedFiles(["servers.dat"]);
    setSyncAllProfiles(false);
    setSelectedTargetProfiles(new Set());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-minecraft-ten text-white uppercase">Data Sync Setup</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <Icon icon="solar:close-circle-bold" className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Source Profile Selection */}
        {step === "source" && (
          <div className="space-y-4">
            <p className="text-xs font-minecraft-ten text-white/70">
              Select an initial source profile to sync files from:
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {minecraftProfiles.length === 0 ? (
                <p className="text-xs font-minecraft-ten text-white/60">
                  No Minecraft profiles available
                </p>
              ) : (
                minecraftProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => setSelectedSourceProfile(profile.id)}
                    className={`w-full p-2 rounded text-left transition-colors ${
                      selectedSourceProfile === profile.id
                        ? "bg-white/20 border border-white/40"
                        : "bg-black/30 border border-white/10 hover:border-white/20"
                    }`}
                  >
                    <span className="text-xs font-minecraft-ten text-white/80">
                      {profile.name}
                    </span>
                  </button>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => setStep("files")}
                disabled={!selectedSourceProfile}
                className="flex-1"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: File Selection */}
        {step === "files" && (
          <div className="space-y-4">
            <p className="text-xs font-minecraft-ten text-white/70">
              Select files to sync:
            </p>
            <div className="space-y-2">
              {SYNCABLE_FILES.map((file) => (
                <label key={file.value} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedFiles.includes(file.value)}
                    onChange={() => handleFileToggle(file.value)}
                  />
                  <span className="text-xs font-minecraft-ten text-white/80">
                    {file.label}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setStep("source")}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                size="sm"
                onClick={() => setStep("targets")}
                disabled={selectedFiles.length === 0}
                className="flex-1"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Target Profile Selection */}
        {step === "targets" && (
          <div className="space-y-4">
            <p className="text-xs font-minecraft-ten text-white/70 mb-3">
              Select target profiles to sync to:
            </p>

            {/* ALL Profiles Toggle */}
            <label className="flex items-center gap-3 p-2 rounded bg-black/30 border border-white/10 cursor-pointer hover:border-white/20 transition-colors">
              <Checkbox
                checked={syncAllProfiles}
                onChange={() => setSyncAllProfiles(!syncAllProfiles)}
              />
              <div className="flex-1">
                <p className="text-xs font-minecraft-ten text-white">
                  ALL Profiles
                </p>
                <p className="text-xs font-minecraft-ten text-white/50">
                  Include all other profiles
                </p>
              </div>
            </label>

            {/* Profile List */}
            {!syncAllProfiles && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {minecraftProfiles.filter((p) => p.id !== selectedSourceProfile).length === 0 ? (
                  <p className="text-xs font-minecraft-ten text-white/60">
                    No other Minecraft profiles available
                  </p>
                ) : (
                  minecraftProfiles
                    .filter((p) => p.id !== selectedSourceProfile)
                    .map((profile) => (
                      <label
                        key={profile.id}
                        className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-white/5 transition-colors"
                      >
                        <Checkbox
                          checked={selectedTargetProfiles.has(profile.id)}
                          onChange={() => handleTargetProfileToggle(profile.id)}
                        />
                        <span className="text-xs font-minecraft-ten text-white/80">
                          {profile.name}
                        </span>
                      </label>
                    ))
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setStep("files")}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                size="sm"
                onClick={handleCreateSync}
                disabled={
                  isLoading ||
                  (!syncAllProfiles && selectedTargetProfiles.size === 0)
                }
                className="flex-1"
              >
                {isLoading ? "Creating..." : "Create Sync"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
