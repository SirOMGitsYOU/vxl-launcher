"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Modal } from "../../ui/Modal";
import { Button } from "../../ui/buttons/Button";
import { StatusMessage } from "../../ui/StatusMessage";
import { useThemeStore } from "../../../store/useThemeStore";
import { useProfileStore } from "../../../store/profile-store";
import type { CreateProfileParams } from "../../../types/profile";
import { toast } from "react-hot-toast";

interface HytaleProfileWizardProps {
  onClose: () => void;
  onSave: (profile: any) => void;
  defaultGroup?: string | null;
}

export function HytaleProfileWizard({ onClose, onSave, defaultGroup }: HytaleProfileWizardProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Step 1: Hytale launcher .exe path
  const [hytaleExePath, setHytaleExePath] = useState<string>("");
  
  // Step 1: Hytale mods folder path
  const [hytaleModsPath, setHytaleModsPath] = useState<string>("");
  
  // Step 2: Profile details
  const [profileName, setProfileName] = useState<string>("Hytale");
  const [profileGroup, setProfileGroup] = useState<string | null>(defaultGroup || null);

  // Auto-detect Hytale paths on mount
  useEffect(() => {
    const detectPaths = async () => {
      try {
        const [launcherPath, modsPath] = await invoke<[string | null, string | null]>("detect_hytale_paths");
        if (launcherPath) {
          setHytaleExePath(launcherPath);
        }
        if (modsPath) {
          setHytaleModsPath(modsPath);
        }
      } catch (err) {
        console.log("Hytale path auto-detection skipped (not on Windows or paths not found)");
      }
    };
    detectPaths();
  }, []);

  const handleSelectExePath = async () => {
    try {
      const selected = await open({
        filters: [
          { name: "Executable", extensions: ["exe"] },
          { name: "All Files", extensions: ["*"] }
        ],
        title: "Select Hytale Launcher .exe"
      });
      
      if (selected) {
        setHytaleExePath(selected as string);
      }
    } catch (err) {
      setError("Failed to select Hytale launcher .exe");
      console.error("Failed to select Hytale launcher .exe:", err);
    }
  };

  const handleSelectModsPath = async () => {
    try {
      const selected = await open({
        directory: true,
        title: "Select Hytale Mods Folder"
      });
      
      if (selected) {
        setHytaleModsPath(selected as string);
      }
    } catch (err) {
      setError("Failed to select mods folder");
      console.error("Failed to select mods folder:", err);
    }
  };

  const handleStep1Next = () => {
    if (hytaleExePath && hytaleModsPath) {
      setCurrentStep(2);
    }
  };

  const handleStep2Create = async () => {
    if (!profileName.trim()) {
      setError("Profile name is required");
      return;
    }

    const { createProfile } = useProfileStore.getState();

    const createParams: CreateProfileParams = {
      game_type: "hytale",
      name: profileName,
      hytale_launcher_path: hytaleExePath,
      hytale_mods_path: hytaleModsPath,
    };

    const creationPromise = async () => {
      const profileId = await createProfile(createParams);

      const updateData: any = {};
      
      if (profileGroup) {
        updateData.group = profileGroup;
      }

      if (Object.keys(updateData).length > 0) {
        await useProfileStore.getState().updateProfile(profileId, updateData);
      }

      const createdProfile = await useProfileStore.getState().getProfile(profileId);
      onSave(createdProfile);
      return createdProfile;
    };

    return toast.promise(creationPromise(), {
      loading: "Creating Hytale profile...",
      success: (createdProfile) => `Profile '${createdProfile.name}' created successfully!`,
      error: (err) => `Failed to create profile: ${err instanceof Error ? err.message : String(err)}`,
    });
  };

  const handleBackToStep1 = () => {
    setCurrentStep(1);
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Icon icon="game-icons:hytale" className="w-24 h-24 mx-auto mb-4" style={{ color: "#1a3a52" }} />
        <h2 className="text-2xl font-minecraft text-white lowercase mb-2">Configure Hytale Paths</h2>
        <p className="text-sm text-white/70 font-minecraft-ten">
          Select the Hytale launcher .exe and mods folder
        </p>
      </div>

      <div className="space-y-4">
        {/* Hytale Launcher .exe */}
        <div>
          <p className="text-sm font-minecraft-ten text-white/70 uppercase mb-2">Hytale Launcher</p>
          <div className="p-4 bg-black/30 rounded-lg border-2 border-white/20">
            {hytaleExePath ? (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-white/60 font-minecraft-ten uppercase mb-1">Selected</p>
                  <p className="text-sm text-white font-minecraft-ten break-all">{hytaleExePath}</p>
                </div>
                <Icon icon="solar:check-circle-bold" className="w-6 h-6 text-green-500 ml-4 flex-shrink-0" />
              </div>
            ) : (
              <div className="text-center py-4">
                <Icon icon="solar:file-bold" className="w-12 h-12 text-white/50 mx-auto mb-2" />
                <p className="text-sm text-white/70 font-minecraft-ten">No .exe selected</p>
              </div>
            )}
          </div>
          <Button
            variant="default"
            onClick={handleSelectExePath}
            size="md"
            className="w-full text-lg mt-2"
            icon={<Icon icon="solar:folder-open-bold" className="w-5 h-5" />}
          >
            browse
          </Button>
        </div>

        {/* Hytale Mods Folder */}
        <div>
          <p className="text-sm font-minecraft-ten text-white/70 uppercase mb-2">Mods Folder</p>
          <div className="p-4 bg-black/30 rounded-lg border-2 border-white/20">
            {hytaleModsPath ? (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-white/60 font-minecraft-ten uppercase mb-1">Selected</p>
                  <p className="text-sm text-white font-minecraft-ten break-all">{hytaleModsPath}</p>
                </div>
                <Icon icon="solar:check-circle-bold" className="w-6 h-6 text-green-500 ml-4 flex-shrink-0" />
              </div>
            ) : (
              <div className="text-center py-4">
                <Icon icon="solar:folder-bold" className="w-12 h-12 text-white/50 mx-auto mb-2" />
                <p className="text-sm text-white/70 font-minecraft-ten">No folder selected</p>
              </div>
            )}
          </div>
          <Button
            variant="default"
            onClick={handleSelectModsPath}
            size="md"
            className="w-full text-lg mt-2"
            icon={<Icon icon="solar:folder-open-bold" className="w-5 h-5" />}
          >
            browse
          </Button>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-minecraft text-white lowercase mb-2">Profile Details</h2>
        <p className="text-sm text-white/70 font-minecraft-ten">
          Configure your Hytale profile
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-minecraft-ten text-white/70 uppercase mb-2">
            Profile Name
          </label>
          <input
            type="text"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="Enter profile name"
            className="w-full px-4 py-2 bg-black/30 border-2 border-white/20 rounded-lg text-white placeholder-white/50 font-minecraft-ten focus:outline-none focus:border-current"
          />
        </div>

        <div>
          <label className="block text-sm font-minecraft-ten text-white/70 uppercase mb-2">
            Group (Optional)
          </label>
          <input
            type="text"
            value={profileGroup || ""}
            onChange={(e) => setProfileGroup(e.target.value || null)}
            placeholder="Enter group name"
            className="w-full px-4 py-2 bg-black/30 border-2 border-white/20 rounded-lg text-white placeholder-white/50 font-minecraft-ten focus:outline-none focus:border-current"
          />
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (error) {
      return <StatusMessage type="error" message={error} />;
    }

    if (currentStep === 1) {
      return renderStep1();
    }

    return renderStep2();
  };

  const renderFooter = () => {
    if (currentStep === 1) {
      return (
        <div className="flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            size="md"
            className="min-w-[120px] text-xl"
          >
            cancel
          </Button>
          <Button
            variant="default"
            onClick={handleStep1Next}
            disabled={!hytaleExePath || !hytaleModsPath}
            size="md"
            className="min-w-[120px] text-xl"
            icon={<Icon icon="solar:arrow-right-bold" className="w-5 h-5" />}
            iconPosition="right"
          >
            next
          </Button>
        </div>
      );
    }

    return (
      <div className="flex justify-end gap-3">
        <Button
          variant="ghost"
          onClick={handleBackToStep1}
          size="md"
          className="min-w-[120px] text-xl"
          icon={<Icon icon="solar:arrow-left-bold" className="w-5 h-5" />}
        >
          back
        </Button>
        <Button
          variant="default"
          onClick={handleStep2Create}
          disabled={loading || !profileName.trim()}
          size="md"
          className="min-w-[120px] text-xl"
          icon={<Icon icon="solar:check-circle-bold" className="w-5 h-5" />}
          iconPosition="right"
        >
          create
        </Button>
      </div>
    );
  };

  return (
    <Modal
      title={currentStep === 1 ? "create profile - hytale setup" : "create profile - profile details"}
      onClose={onClose}
      width="md"
      footer={renderFooter()}
    >
      <div className="min-h-[400px] p-6">
        {renderContent()}
      </div>
    </Modal>
  );
}
