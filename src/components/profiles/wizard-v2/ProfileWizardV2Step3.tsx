"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import type { ModLoader } from "../../../types/profile";
import { Modal } from "../../ui/Modal";
import { Button, Card, Input } from "../../ui-v2";
import { StatusMessage } from "../../ui/StatusMessage";
import { RangeSlider } from "../../ui/RangeSlider";
import * as ProfileService from "../../../services/profile-service";
import { cn } from "../../../lib/utils";

const forbiddenChars = /[<>:"/\\|?*]/g;
const forbiddenTrailing = /[ .]$/;

function getLoaderDisplayName(loader: ModLoader) {
  const names: Record<ModLoader, string> = {
    vanilla: "Vanilla",
    fabric: "Fabric",
    forge: "Forge",
    neoforge: "NeoForge",
    quilt: "Quilt",
  };
  return names[loader] || loader;
}

interface SettingToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function SettingToggleCard({ label, description, checked, onChange }: SettingToggleRowProps) {
  return (
    <Card className="flex h-full flex-col p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-white">{label}</p>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={() => onChange(!checked)}
          className={cn(
            "relative h-5 w-9 shrink-0 rounded-full border transition-colors",
            checked
              ? "border-[var(--accent)] bg-[var(--accent)]"
              : "border-[var(--surface-border-strong)] bg-[var(--surface-overlay)]",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform",
              checked && "translate-x-4",
            )}
          />
        </button>
      </div>
      <p className="text-xs leading-relaxed text-[var(--text-muted)]">{description}</p>
    </Card>
  );
}

interface ProfileWizardV2Step3Props {
  onClose: () => void;
  onBack: () => void;
  onCreate: (profileData: {
    name: string;
    group: string | null;
    minecraftVersion: string;
    loader: ModLoader;
    loaderVersion: string | null;
    memoryMaxMb: number;
    use_shared_minecraft_folder?: boolean;
    enable_file_sync?: boolean;
  }) => void;
  selectedMinecraftVersion: string;
  selectedLoader: ModLoader;
  selectedLoaderVersion: string | null;
  defaultGroup?: string | null;
}

export function ProfileWizardV2Step3({
  onClose,
  onBack,
  onCreate,
  selectedMinecraftVersion,
  selectedLoader,
  selectedLoaderVersion,
  defaultGroup,
}: ProfileWizardV2Step3Props) {
  const [profileName, setProfileName] = useState(
    () => `${getLoaderDisplayName(selectedLoader)} ${selectedMinecraftVersion}`,
  );
  const [profileGroup, setProfileGroup] = useState(defaultGroup || "");
  const [memoryMaxMb, setMemoryMaxMb] = useState<number>(3072);
  const [systemRamMb, setSystemRamMb] = useState<number>(16384);
  const [useSharedMinecraftFolder, setUseSharedMinecraftFolder] = useState(
    Boolean(defaultGroup && defaultGroup.toLowerCase() !== "modpacks"),
  );
  const [enableFileSync, setEnableFileSync] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileCharRemoved, setProfileCharRemoved] = useState(false);
  const [profileNameHasForbiddenEnding, setProfileNameHasForbiddenEnding] = useState(false);

  useEffect(() => {
    if (defaultGroup && !profileGroup) {
      setProfileGroup(defaultGroup);
    }
  }, [defaultGroup, profileGroup]);

  useEffect(() => {
    setUseSharedMinecraftFolder(Boolean(defaultGroup && defaultGroup.toLowerCase() !== "modpacks"));
  }, [defaultGroup]);

  useEffect(() => {
    void ProfileService.getSystemRamMb()
      .then((ramMb) => {
        if (ramMb > 0) {
          setSystemRamMb(ramMb);
          setMemoryMaxMb((current) => Math.min(current, ramMb));
        }
      })
      .catch(() => {
        // Keep defaults when system RAM is unavailable.
      });
  }, []);

  const handleCreate = async () => {
    if (!profileName.trim()) {
      setError("Profile name is required");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      await onCreate({
        name: profileName.trim(),
        group: profileGroup.trim() || null,
        minecraftVersion: selectedMinecraftVersion,
        loader: selectedLoader,
        loaderVersion: selectedLoaderVersion,
        memoryMaxMb,
        use_shared_minecraft_folder: useSharedMinecraftFolder,
        enable_file_sync: enableFileSync,
      });
    } catch (err) {
      console.error("Failed to create profile:", err);
      setError(`Failed to create profile: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setCreating(false);
    }
  };

  const handleProfileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleanValue = value.replace(forbiddenChars, "");

    if (value !== cleanValue) {
      setProfileCharRemoved(true);
    }

    setProfileNameHasForbiddenEnding(forbiddenTrailing.test(cleanValue));
    setProfileName(cleanValue);
  };

  const footer = (
    <div className="flex items-center justify-between">
      <Button
        variant="secondary"
        onClick={onBack}
        disabled={creating}
        size="md"
        icon={<Icon icon="solar:arrow-left-bold" className="h-4 w-4" />}
      >
        Back
      </Button>

      <Button
        variant="primary"
        onClick={handleCreate}
        disabled={creating || !profileName.trim() || profileNameHasForbiddenEnding}
        size="md"
        icon={
          creating ? (
            <Icon icon="solar:refresh-bold" className="h-4 w-4 animate-spin" />
          ) : (
            <Icon icon="solar:check-circle-bold" className="h-4 w-4" />
          )
        }
      >
        {creating ? "Creating..." : "Create profile"}
      </Button>
    </div>
  );

  const renderContent = () => {
    if (error) {
      return <StatusMessage type="error" message={error} />;
    }

    return (
      <div className="space-y-4">
        <Card className="p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
            <span>{getLoaderDisplayName(selectedLoader)}</span>
            <span>·</span>
            <span>Minecraft {selectedMinecraftVersion}</span>
            {selectedLoaderVersion ? (
              <>
                <span>·</span>
                <span>{selectedLoaderVersion.replace(" (stable)", "")}</span>
              </>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="profile-name"
                className="block text-sm font-medium text-[var(--text-secondary)]"
              >
                Profile name
              </label>
              <Input
                id="profile-name"
                value={profileName}
                onChange={handleProfileNameChange}
                placeholder="Enter profile name..."
                maxLength={35}
                required
                className="w-full"
              />
              {profileCharRemoved && (
                <p className="text-xs text-red-400">
                  Profile names cannot contain: &lt; &gt; : &quot; / \ | ? *
                </p>
              )}
              {profileNameHasForbiddenEnding && (
                <p className="text-xs text-red-400">
                  Profile names cannot end with a space or dot.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="profile-group"
                className="block text-sm font-medium text-[var(--text-secondary)]"
              >
                Group (optional)
              </label>
              <Input
                id="profile-group"
                value={profileGroup}
                onChange={(e) => setProfileGroup(e.target.value)}
                placeholder="Enter group name..."
                className="w-full"
              />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SettingToggleCard
            label="Use shared Minecraft folder"
            description="Share settings, worlds, configs, and resource packs between profiles in the same group."
            checked={useSharedMinecraftFolder}
            onChange={setUseSharedMinecraftFolder}
          />
          <SettingToggleCard
            label="Enable data sync"
            description="Sync servers.dat and options.txt with other profiles. You can configure this later."
            checked={enableFileSync}
            onChange={setEnableFileSync}
          />
        </div>

        <Card className="space-y-3 p-4">
          <label className="block text-sm font-medium text-[var(--text-secondary)]">
            Memory allocation
          </label>
          <RangeSlider
            value={memoryMaxMb}
            onChange={setMemoryMaxMb}
            min={1024}
            max={systemRamMb}
            step={512}
            valueLabel={`${memoryMaxMb} MB (${(memoryMaxMb / 1024).toFixed(1)} GB)`}
            minLabel="1 GB"
            maxLabel={`${(systemRamMb / 1024).toFixed(0)} GB`}
            variant="flat"
            recommendedRange={[4096, 8192]}
            unit="MB"
          />
        </Card>
      </div>
    );
  };

  return (
    <Modal
      title="Create profile — Finalize"
      onClose={onClose}
      width="lg"
      footer={footer}
    >
      <div className="p-6">{renderContent()}</div>
    </Modal>
  );
}
