"use client";

import { useRef, useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { Profile } from "../../../types/profile";
import { useThemeStore } from "../../../store/useThemeStore";
import { Button } from "../../ui/buttons/Button";
import { StatusMessage } from "../../ui/StatusMessage";

interface HytaleInstallationSettingsTabProps {
  profile: Profile;
  editedProfile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
}

export function HytaleInstallationSettingsTab({
  profile,
  editedProfile,
  updateProfile,
}: HytaleInstallationSettingsTabProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect Hytale paths on mount if not already set
  useEffect(() => {
    const detectPaths = async () => {
      // Auto-detect if launcher path is not set OR mods path is not set
      if (!editedProfile.hytale_config?.hytale_launcher_path || !editedProfile.hytale_config?.hytale_mods_path) {
        try {
          const [launcherPath, modsPath] = await invoke<[string | null, string | null]>("detect_hytale_paths");
          if (launcherPath || modsPath) {
            const hytaleConfig = editedProfile.hytale_config || { hytale_launcher_path: "" };
            updateProfile({
              hytale_config: {
                ...hytaleConfig,
                hytale_launcher_path: launcherPath || hytaleConfig.hytale_launcher_path,
                hytale_mods_path: modsPath || hytaleConfig.hytale_mods_path
              }
            });
          }
        } catch (err) {
          console.log("Hytale path auto-detection skipped (not on Windows or paths not found)");
        }
      }
    };
    detectPaths();
  }, [editedProfile.hytale_config?.hytale_launcher_path, editedProfile.hytale_config?.hytale_mods_path]);

  const handleSelectLauncherPath = async () => {
    try {
      setError(null);
      const selected = await open({
        filters: [
          { name: "Executable", extensions: ["exe"] },
          { name: "All Files", extensions: ["*"] }
        ],
        title: "Select Hytale Launcher .exe"
      });
      
      if (selected) {
        // Update the hytale_config with new launcher path
        const hytaleConfig = editedProfile.hytale_config || {};
        updateProfile({
          hytale_config: {
            ...hytaleConfig,
            hytale_launcher_path: selected as string
          }
        });
      }
    } catch (err) {
      setError("Failed to select Hytale launcher .exe");
      console.error("Failed to select Hytale launcher .exe:", err);
    }
  };

  const handleSelectModsPath = async () => {
    try {
      setError(null);
      const selected = await open({
        directory: true,
        title: "Select Hytale Mods Folder"
      });
      
      if (selected) {
        // Update the hytale_config with new mods path
        const hytaleConfig = editedProfile.hytale_config || { hytale_launcher_path: "" };
        updateProfile({
          hytale_config: {
            ...hytaleConfig,
            hytale_mods_path: selected as string
          }
        });
      }
    } catch (err) {
      setError("Failed to select mods folder");
      console.error("Failed to select mods folder:", err);
    }
  };

  const launcherPath = editedProfile.hytale_config?.hytale_launcher_path || "";
  const modsPath = editedProfile.hytale_config?.hytale_mods_path || "";

  return (
    <div className="space-y-6 select-none">
      {error && <StatusMessage type="error" message={error} />}

      <div className="space-y-4">
        <div>
          <h3 className="text-3xl font-minecraft text-white mb-3 lowercase">
            currently installed
          </h3>
          <div className="flex items-center gap-3 text-sm font-minecraft-ten">
            <div className="text-white flex items-center gap-2">
              <img
                src="/icons/hytale.png"
                alt="Hytale"
                className="w-4 h-4 object-contain"
              />
              <span className="font-bold">Hytale</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hytale Launcher .exe Path */}
      <div className="space-y-4">
        <div>
          <h3 className="text-3xl font-minecraft text-white mb-3 lowercase">
            launcher executable
          </h3>
          <div className="p-4 bg-black/30 rounded-lg border-2 border-white/20">
            {launcherPath ? (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-white/60 font-minecraft-ten uppercase mb-1">Current Path</p>
                  <p className="text-sm text-white font-minecraft-ten break-all">{launcherPath}</p>
                </div>
                <Icon icon="solar:check-circle-bold" className="w-6 h-6 text-green-500 ml-4 flex-shrink-0" />
              </div>
            ) : (
              <div className="text-center py-4">
                <Icon icon="solar:file-bold" className="w-12 h-12 text-white/50 mx-auto mb-2" />
                <p className="text-sm text-white/70 font-minecraft-ten">No launcher path set</p>
              </div>
            )}
          </div>
          <Button
            variant="default"
            onClick={handleSelectLauncherPath}
            size="md"
            className="w-full text-lg mt-3"
            icon={<Icon icon="solar:folder-open-bold" className="w-5 h-5" />}
          >
            browse
          </Button>
        </div>
      </div>

      {/* Mods Folder Path */}
      <div className="space-y-4">
        <div>
          <h3 className="text-3xl font-minecraft text-white mb-3 lowercase">
            mods folder
          </h3>
          <div className="p-4 bg-black/30 rounded-lg border-2 border-white/20">
            {modsPath ? (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-white/60 font-minecraft-ten uppercase mb-1">Current Path</p>
                  <p className="text-sm text-white font-minecraft-ten break-all">{modsPath}</p>
                </div>
                <Icon icon="solar:check-circle-bold" className="w-6 h-6 text-green-500 ml-4 flex-shrink-0" />
              </div>
            ) : (
              <div className="text-center py-4">
                <Icon icon="solar:folder-bold" className="w-12 h-12 text-white/50 mx-auto mb-2" />
                <p className="text-sm text-white/70 font-minecraft-ten">Mods folder is auto-detected from launcher path</p>
              </div>
            )}
          </div>
          <Button
            variant="default"
            onClick={handleSelectModsPath}
            size="md"
            className="w-full text-lg mt-3"
            icon={<Icon icon="solar:folder-open-bold" className="w-5 h-5" />}
          >
            browse
          </Button>
        </div>
      </div>

      <div className="p-4 bg-black/20 rounded-lg border-2 border-white/10">
        <p className="text-xs text-white/60 font-minecraft-ten">
          <Icon icon="solar:info-circle-bold" className="w-4 h-4 inline mr-2" />
          Update the launcher executable path to change where Hytale launches from.
        </p>
      </div>
    </div>
  );
}
