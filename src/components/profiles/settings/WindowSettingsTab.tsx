"use client";

import type { Profile } from "../../../types/profile";
import { Label } from "../../ui/Label";
import { cn } from "../../../lib/utils";
import { Input, SectionHeader, SettingsSection } from "../../ui-v2";
import { fieldLabelClass, ProfileSettingToggle } from "./profile-settings-ui";

interface WindowSettingsTabProps {
  editedProfile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
}

export function WindowSettingsTab({
  editedProfile,
  updateProfile,
}: WindowSettingsTabProps) {
  const resolutionPresets = [
    { width: 854, height: 480, label: "Default" },
    { width: 1280, height: 720, label: "720p" },
    { width: 1920, height: 1080, label: "1080p" },
    { width: 2560, height: 1440, label: "1440p" },
    { width: 3840, height: 2160, label: "4K" },
  ];

  const handleResolutionChange = (width: number, height: number) => {
    const newSettings = { ...editedProfile.settings };
    if (!newSettings.resolution) {
      newSettings.resolution = { width, height };
    } else {
      newSettings.resolution.width = width;
      newSettings.resolution.height = height;
    }
    updateProfile({ settings: newSettings });
  };

  const handleFullscreenChange = (fullscreen: boolean) => {
    const newSettings = { ...editedProfile.settings };
    newSettings.fullscreen = fullscreen;
    updateProfile({ settings: newSettings });
  };

  return (
    <div className="space-y-4 select-none">
      <SectionHeader
        icon="solar:widget-bold"
        title="Window settings"
        description="Configure how Minecraft's window appears on your screen."
      />

      <SettingsSection>
        <label className={fieldLabelClass}>Resolution</label>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Width</label>
            <Input
              type="number"
              value={String(editedProfile.settings?.resolution?.width || 854)}
              onChange={(e) => {
                const width = Number.parseInt(e.target.value) || 854;
                handleResolutionChange(
                  width,
                  editedProfile.settings?.resolution?.height || 480,
                );
              }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Height</label>
            <Input
              type="number"
              value={String(editedProfile.settings?.resolution?.height || 480)}
              onChange={(e) => {
                const height = Number.parseInt(e.target.value) || 480;
                handleResolutionChange(
                  editedProfile.settings?.resolution?.width || 854,
                  height,
                );
              }}
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {resolutionPresets.map((preset) => (
            <Label
              key={preset.label}
              variant={
                editedProfile.settings?.resolution?.width === preset.width &&
                editedProfile.settings?.resolution?.height === preset.height
                  ? "default"
                  : "ghost"
              }
              size="md"
              className={cn(
                "cursor-pointer text-sm",
                editedProfile.settings?.resolution?.width === preset.width &&
                  editedProfile.settings?.resolution?.height === preset.height
                  ? "bg-accent/20 border-accent text-white"
                  : "border-[var(--surface-border)] bg-[var(--surface-overlay)] text-[var(--text-secondary)] hover:border-[var(--surface-border-strong)] hover:text-white",
              )}
              onClick={() => handleResolutionChange(preset.width, preset.height)}
            >
              {preset.label}
            </Label>
          ))}
        </div>

        <ProfileSettingToggle
          label="Fullscreen"
          checked={editedProfile.settings?.fullscreen || false}
          onChange={handleFullscreenChange}
        />
      </SettingsSection>
    </div>
  );
}
