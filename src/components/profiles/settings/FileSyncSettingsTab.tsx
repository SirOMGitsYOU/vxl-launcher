"use client";

import { useEffect, useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import type { Profile } from "../../../types/profile";
import type { FileSyncConfig, SyncableFile } from "../../../types/fileSync";
import * as FileSyncService from "../../../services/file-sync-service";
import { useThemeStore } from "../../../store/useThemeStore";
import { useProfileStore } from "../../../store/profile-store";
import { Button } from "../../ui/buttons/Button";
import { toast } from "react-hot-toast";
import { Checkbox } from "../../ui/Checkbox";

interface FileSyncSettingsTabProps {
  profile: Profile;
}

const SYNCABLE_FILES: { value: SyncableFile; label: string }[] = [
  { value: 'servers.dat', label: 'Server List (servers.dat)' },
  { value: 'options.txt', label: 'Game Options (options.txt)' },
];

export function FileSyncSettingsTab({ profile }: FileSyncSettingsTabProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const { profiles } = useProfileStore();
  const [syncConfigs, setSyncConfigs] = useState<FileSyncConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SyncableFile[]>(['servers.dat']);
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);

  // Load sync configs on mount
  useEffect(() => {
    loadSyncConfigs();
  }, []);

  const loadSyncConfigs = async () => {
    setIsLoading(true);
    try {
      const configs = await FileSyncService.getFileSyncConfigs();
      // Filter to only show configs where this profile is the source
      const relevantConfigs = configs.filter(c => c.source_profile_id === profile.id);
      setSyncConfigs(relevantConfigs);
    } catch (error) {
      console.error("Failed to load sync configs:", error);
      toast.error("Failed to load sync configurations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileToggle = (file: SyncableFile) => {
    setSelectedFiles(prev => 
      prev.includes(file) 
        ? prev.filter(f => f !== file)
        : [...prev, file]
    );
  };

  const handleTargetToggle = (profileId: string) => {
    setSelectedTargets(prev => {
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
    if (selectedTargets.size === 0) {
      toast.error("Please select at least one target profile");
      return;
    }
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one file to sync");
      return;
    }

    try {
      const newConfig = await FileSyncService.createFileSyncConfig({
        source_profile_id: profile.id,
        target_profile_ids: Array.from(selectedTargets),
        files_to_sync: selectedFiles,
        sync_direction: 'one-way',
        enabled: true,
      });

      setSyncConfigs([...syncConfigs, newConfig]);
      setShowCreateForm(false);
      setSelectedTargets(new Set());
      setSelectedFiles(['servers.dat']);
      toast.success("Sync configuration created!");
    } catch (error) {
      console.error("Failed to create sync config:", error);
      toast.error("Failed to create sync configuration");
    }
  };

  const handleDeleteConfig = async (configId: string) => {
    try {
      await FileSyncService.deleteFileSyncConfig(configId);
      setSyncConfigs(syncConfigs.filter(c => c.id !== configId));
      toast.success("Sync configuration deleted");
    } catch (error) {
      console.error("Failed to delete sync config:", error);
      toast.error("Failed to delete sync configuration");
    }
  };

  const handleManualSync = async (configId: string) => {
    const config = syncConfigs.find(c => c.id === configId);
    if (!config) return;

    setIsSyncing(true);
    try {
      await FileSyncService.bulkSyncFiles({
        source_profile_id: config.source_profile_id,
        target_profile_ids: config.target_profile_ids,
        files_to_sync: config.files_to_sync,
      });
      toast.success(`Synced ${config.files_to_sync.join(', ')} to ${config.target_profile_ids.length} profile(s)`);
      loadSyncConfigs();
    } catch (error) {
      console.error("Failed to sync files:", error);
      toast.error("Failed to sync files");
    } finally {
      setIsSyncing(false);
    }
  };

  const otherProfiles = profiles.filter(p => p.id !== profile.id);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-minecraft-ten text-white/70 uppercase tracking-wide mb-4">
          File Sync Configuration
        </h3>
        <p className="text-xs font-minecraft-ten text-white/60 mb-4">
          Sync specific files (servers.dat, options.txt) from this profile to other profiles.
        </p>
      </div>

      {/* Existing Sync Configs */}
      {syncConfigs.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-minecraft-ten text-white/70 uppercase">Active Syncs</h4>
          {syncConfigs.map((config) => (
            <div
              key={config.id}
              className="p-3 rounded-lg bg-black/30 border border-white/10 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-minecraft-ten text-white">
                    Syncing to {config.target_profile_ids.length} profile(s)
                  </p>
                  <p className="text-xs font-minecraft-ten text-white/60 mt-1">
                    Files: {config.files_to_sync.join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleManualSync(config.id)}
                    disabled={isSyncing}
                    icon={isSyncing ? <Icon icon="solar:refresh-bold" className="animate-spin" /> : undefined}
                  >
                    {isSyncing ? "Syncing..." : "Sync Now"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteConfig(config.id)}
                    icon={<Icon icon="solar:trash-bin-trash-bold" />}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create New Sync Form */}
      {!showCreateForm ? (
        <Button
          onClick={() => setShowCreateForm(true)}
          icon={<Icon icon="solar:add-circle-bold-duotone" />}
        >
          Create New Sync
        </Button>
      ) : (
        <div className="p-4 rounded-lg bg-black/30 border border-white/10 space-y-4">
          <h4 className="text-xs font-minecraft-ten text-white/70 uppercase">Select Files to Sync</h4>
          <div className="space-y-2">
            {SYNCABLE_FILES.map((file) => (
              <label key={file.value} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedFiles.includes(file.value)}
                  onChange={() => handleFileToggle(file.value)}
                />
                <span className="text-xs font-minecraft-ten text-white/80">{file.label}</span>
              </label>
            ))}
          </div>

          <div>
            <h4 className="text-xs font-minecraft-ten text-white/70 uppercase mb-2">Select Target Profiles</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {otherProfiles.length === 0 ? (
                <p className="text-xs font-minecraft-ten text-white/60">No other profiles available</p>
              ) : (
                otherProfiles.map((targetProfile) => (
                  <label key={targetProfile.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedTargets.has(targetProfile.id)}
                      onChange={() => handleTargetToggle(targetProfile.id)}
                    />
                    <span className="text-xs font-minecraft-ten text-white/80">{targetProfile.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleCreateSync}
              disabled={selectedTargets.size === 0 || selectedFiles.length === 0}
            >
              Create Sync
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setShowCreateForm(false);
                setSelectedTargets(new Set());
                setSelectedFiles(['servers.dat']);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center p-4">
          <Icon icon="solar:refresh-bold" className="animate-spin w-5 h-5 text-white/50" />
        </div>
      )}
    </div>
  );
}
