"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import type { ModLoader } from "../../../types/profile";
import { Modal } from "../../ui/Modal";
import { Button } from "../../ui/buttons/Button";
import { StatusMessage } from "../../ui/StatusMessage";
import { useThemeStore } from "../../../store/useThemeStore";
import { SearchStyleInput } from "../../ui/Input";
import { RangeSlider } from "../../ui/RangeSlider";
import { Select } from "../../ui/Select";
import { Card } from "../../ui/Card";
import { Checkbox } from "../../ui/Checkbox";
import { invoke } from "@tauri-apps/api/core";
// Removed NoriskModEntryDefinition, NoriskModpacksConfig imports - no pre-installed modpacks

const forbiddenChars = /[<>:"/\\|?*]/g;
const forbiddenTrailing = /[ .]$/;

interface NoriskPack {
    displayName: string;
    description: string;
    isExperimental?: boolean;
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
    defaultGroup
}: ProfileWizardV2Step3Props) {
    const accentColor = useThemeStore((state) => state.accentColor);
    const [profileName, setProfileName] = useState("");
    const [profileGroup, setProfileGroup] = useState(defaultGroup || "");
    const [memoryMaxMb, setMemoryMaxMb] = useState<number>(3072); // 3GB default
    const [systemRamMb] = useState<number>(16384); // 16GB default for slider range
    const [useSharedMinecraftFolder, setUseSharedMinecraftFolder] = useState(
        defaultGroup && defaultGroup.toLowerCase() !== "modpacks"
    ); // Default to true when group exists and is not "modpacks"
    const [showAllVersions, setShowAllVersions] = useState(false); // Default to false to show only curated versions

    // Update profile group when defaultGroup changes
    useEffect(() => {
        if (defaultGroup && !profileGroup) {
            setProfileGroup(defaultGroup);
        }
    }, [defaultGroup]);

    // Update shared Minecraft folder setting when defaultGroup changes
    useEffect(() => {
        setUseSharedMinecraftFolder(
            defaultGroup && defaultGroup.toLowerCase() !== "modpacks"
        );
    }, [defaultGroup]);

    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getLoaderDisplayName = (loader: ModLoader) => {
        const names = {
            vanilla: "Vanilla",
            fabric: "Fabric",
            forge: "Forge",
            neoforge: "NeoForge",
            quilt: "Quilt"
        };
        return names[loader] || loader;
    };

    const handleMemoryChange = (value: number) => {
        setMemoryMaxMb(value);
    };

    // Auto-generate profile name based on loader and minecraft version
    useEffect(() => {
        const generateProfileName = () => {
            const loaderName = getLoaderDisplayName(selectedLoader);
            return `${loaderName} ${selectedMinecraftVersion}`;
        };

        setProfileName(generateProfileName());
    }, [selectedLoader, selectedMinecraftVersion]);

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
                memoryMaxMb: memoryMaxMb,
                use_shared_minecraft_folder: useSharedMinecraftFolder
            });
        } catch (err) {
            console.error("Failed to create profile:", err);
            setError(`Failed to create profile: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setCreating(false);
        }
    };

    // ProfileName ForbiddenCharacter Event Handler
    const [profileCharRemoved, setProfileCharRemoved] = useState(false);
    const [profileNameHasForbiddenEnding, setProfileNameHasForbiddenEnding] = useState(false);

    const handleProfileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const cleanValue = value.replace(forbiddenChars, "");

        if (value !== cleanValue) {
            setProfileCharRemoved(true);
        }

        setProfileNameHasForbiddenEnding(forbiddenTrailing.test(cleanValue));

        setProfileName(cleanValue);
    };

    const renderContent = () => {
        if (error) {
            return <StatusMessage type="error" message={error} />;
        }

        return (
            <div className="space-y-8">
                {/* Profile Details */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="block text-base font-minecraft-ten text-white/50">
                            Profile Name
                        </label>
                        <SearchStyleInput
                            value={profileName}
                            onChange={handleProfileNameChange}
                            placeholder="Enter profile name..."
                            required
                        />
                        {profileCharRemoved && (
                            <p className="text-xs text-red-400 font-minecraft-ten mt-1">
                                The profile name cannot contain these characters: &lt; &gt; : " / \ | ? *
                            </p>
                        )}
                        {profileNameHasForbiddenEnding && (
                            <p className="text-xs text-red-400 font-minecraft-ten mt-1">
                                The profile name cannot end with a space or dot.
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-base font-minecraft-ten text-white/50">
                            Group (Optional)
                        </label>
                        <SearchStyleInput
                            value={profileGroup}
                            onChange={(e) => setProfileGroup(e.target.value)}
                            placeholder="Enter group name..."
                        />
                    </div>
                </div>

                {/* Checkbox Options */}
                <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                        <Checkbox
                            label="Use shared Minecraft folder"
                            checked={useSharedMinecraftFolder}
                            onChange={(event) => setUseSharedMinecraftFolder(event.target.checked)}
                            description="When enabled, a shared Minecraft folder will be used based on the group. Your settings, worlds, configs and resource packs will remain the same between profiles."
                            descriptionClassName="font-minecraft-ten text-sm"
                            size="lg"
                        />
                        <p className="text-xs text-white/50 font-minecraft-ten ml-10 -mt-1">
                            (you can change this anytime)
                        </p>
                    </div>
                </div>

                {/* RAM Settings */}
                <div className="space-y-3">
                    <label className="block text-base font-minecraft-ten text-white/50">
                        Recommended RAM: 4096 mb
                    </label>
                    <RangeSlider
                        value={memoryMaxMb}
                        onChange={handleMemoryChange}
                        min={1024}
                        max={systemRamMb}
                        step={512}
                        valueLabel={`${memoryMaxMb} MB (${(memoryMaxMb / 1024).toFixed(1)} GB)`}
                        minLabel="1 GB"
                        maxLabel={`${systemRamMb} MB`}
                        variant="flat"
                        recommendedRange={[4096, 8192]}
                        unit="MB"
                    />
                </div>

                {/* Advanced Settings - Hidden for now */}
                {/* TODO: Re-enable when additional advanced options are available */}
            </div>
        );
    };

    const renderFooter = () => (
        <div className="flex justify-between items-center">
            <Button
                variant="secondary"
                onClick={onBack}
                disabled={creating}
                size="md"
                className="text-xl"
                icon={<Icon icon="solar:arrow-left-bold" className="w-5 h-5" />}
                iconPosition="left"
            >
                back
            </Button>

            <Button
                variant="success"
                onClick={handleCreate}
                disabled={
                    creating ||
                    !profileName.trim() ||
                    profileNameHasForbiddenEnding
                }
                size="md"
                className="min-w-[180px] text-xl"
                icon={
                    creating ? (
                        <Icon icon="solar:refresh-bold" className="w-5 h-5 animate-spin" />
                    ) : (
                        <Icon icon="solar:check-circle-bold" className="w-5 h-5" />
                    )
                }
                iconPosition="left"
            >
                {creating ? "creating..." : "create profile"}
            </Button>
        </div>
    );

    return (
        <Modal
            title="create profile - finalize"
            onClose={onClose}
            width="lg"
            footer={renderFooter()}
        >
            <div className="min-h-[500px] p-6 overflow-hidden">
                {renderContent()}
            </div>
        </Modal>
    );
}