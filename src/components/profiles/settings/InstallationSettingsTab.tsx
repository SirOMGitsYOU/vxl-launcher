"use client";

import { useEffect, useState } from "react";
import type { ModLoader, Profile, ResolvedLoaderVersion } from "../../../types/profile";
import type { MinecraftVersion } from "../../../types/minecraft";
import { invoke } from "@tauri-apps/api/core";
import { SearchWithFilters } from "../../ui/SearchWithFilters";
import { Select } from "../../ui/Select";
import { cn } from "../../../lib/utils";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingState,
  SettingsSection,
} from "../../ui-v2";
import { fieldLabelClass, ProfileSettingToggle } from "./profile-settings-ui";

interface InstallationSettingsTabProps {
  profile: Profile;
  editedProfile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
  refreshTrigger?: number;
}

type VersionType = "release" | "snapshot" | "old-beta" | "old-alpha";

const LOADERS = [
  { name: "vanilla", icon: "/icons/minecraft.png", label: "Vanilla" },
  { name: "fabric", icon: "/icons/fabric.png", label: "Fabric" },
  { name: "forge", icon: "/icons/forge.png", label: "Forge" },
  { name: "quilt", icon: "/icons/quilt.png", label: "Quilt" },
  { name: "neoforge", icon: "/icons/neoforge.png", label: "NeoForge" },
] as const;

export function InstallationSettingsTab({
  profile,
  editedProfile,
  updateProfile,
  refreshTrigger,
}: InstallationSettingsTabProps) {
  const [selectedVersionType, setSelectedVersionType] = useState<VersionType>("release");
  const [minecraftVersions, setMinecraftVersions] = useState<MinecraftVersion[]>([]);
  const [filteredVersions, setFilteredVersions] = useState<string[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(true);
  const [loaderVersions, setLoaderVersions] = useState<string[]>([]);
  const [isLoadingLoaderVersions, setIsLoadingLoaderVersions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [resolvedLoaderVersion, setResolvedLoaderVersion] = useState<ResolvedLoaderVersion | null>(null);

  useEffect(() => {
    async function fetchMinecraftVersions() {
      try {
        setIsLoadingVersions(true);
        setError(null);
        const result = await invoke<{ versions: MinecraftVersion[] }>("get_minecraft_versions");
        setMinecraftVersions(result.versions);
      } catch (err) {
        console.error("Failed to fetch Minecraft versions:", err);
        setError(
          `Failed to fetch Minecraft versions: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setIsLoadingVersions(false);
      }
    }

    fetchMinecraftVersions();
  }, []);

  useEffect(() => {
    if (minecraftVersions.length > 0) {
      const apiVersionType = selectedVersionType.replace("-", "_");
      const filtered = minecraftVersions
        .filter((version) => version.type === apiVersionType)
        .filter((version) =>
          searchQuery ? version.id.toLowerCase().includes(searchQuery.toLowerCase()) : true,
        )
        .map((version) => version.id);
      setFilteredVersions(filtered);
    }
  }, [minecraftVersions, selectedVersionType, searchQuery]);

  useEffect(() => {
    async function fetchLoaderVersions() {
      if (!editedProfile.game_version || editedProfile.loader === "vanilla") {
        setLoaderVersions([]);
        return;
      }

      try {
        setIsLoadingLoaderVersions(true);
        setError(null);
        let versions: string[] = [];

        switch (editedProfile.loader) {
          case "fabric": {
            const fabricResult = await invoke<{ loader: { version: string } }[]>(
              "get_fabric_loader_versions",
              { minecraftVersion: editedProfile.game_version },
            );
            versions = fabricResult.map((v) => v.loader.version);
            break;
          }
          case "forge":
            versions = await invoke<string[]>("get_forge_versions", {
              minecraftVersion: editedProfile.game_version,
            });
            break;
          case "quilt": {
            const quiltResult = await invoke<{ loader: { version: string } }[]>(
              "get_quilt_loader_versions",
              { minecraftVersion: editedProfile.game_version },
            );
            versions = quiltResult.map((v) => v.loader.version);
            break;
          }
          case "neoforge":
            versions = await invoke<string[]>("get_neoforge_versions", {
              minecraftVersion: editedProfile.game_version,
            });
            break;
        }

        setLoaderVersions(versions);
      } catch (err) {
        console.error(`Failed to fetch ${editedProfile.loader} versions:`, err);
        setError(
          `Failed to fetch ${editedProfile.loader} versions: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setIsLoadingLoaderVersions(false);
      }
    }

    fetchLoaderVersions();
  }, [editedProfile.game_version, editedProfile.loader]);

  const fetchResolvedLoaderVersion = async () => {
    if (!editedProfile.game_version || editedProfile.loader === "vanilla") {
      setResolvedLoaderVersion(null);
      return;
    }

    try {
      const resolved = await invoke<ResolvedLoaderVersion>("resolve_loader_version", {
        profileId: editedProfile.id,
        minecraftVersion: editedProfile.game_version,
      });
      setResolvedLoaderVersion(resolved);
    } catch (err) {
      console.error("Failed to resolve loader version:", err);
      setResolvedLoaderVersion(null);
    }
  };

  useEffect(() => {
    fetchResolvedLoaderVersion();
  }, [
    editedProfile.id,
    editedProfile.game_version,
    editedProfile.loader,
    editedProfile.loader_version,
    editedProfile.settings.use_overwrite_loader_version,
    editedProfile.settings.overwrite_loader_version,
  ]);

  useEffect(() => {
    if (refreshTrigger) {
      fetchResolvedLoaderVersion();
    }
  }, [refreshTrigger]);

  function isModLoaderCompatible(loader: string, minecraftVersion: string): boolean {
    if (loader === "vanilla") return true;

    switch (loader) {
      case "fabric":
        return isVersionNewerOrEqual(minecraftVersion, "1.14");
      case "forge":
        return true;
      case "quilt":
        return isVersionNewerOrEqual(minecraftVersion, "1.14");
      case "neoforge":
        return isVersionNewerOrEqual(minecraftVersion, "1.20.1");
      default:
        return false;
    }
  }

  function isVersionNewerOrEqual(version: string, baseVersion: string): boolean {
    const parseVersion = (v: string) => {
      const parts = v.split(".");
      return {
        major: Number.parseInt(parts[0]) || 0,
        minor: Number.parseInt(parts[1]) || 0,
        patch: Number.parseInt(parts[2]) || 0,
      };
    };

    const v1 = parseVersion(version);
    const v2 = parseVersion(baseVersion);

    if (v1.major !== v2.major) return v1.major > v2.major;
    if (v1.minor !== v2.minor) return v1.minor > v2.minor;
    return v1.patch >= v2.patch;
  }

  const handleGameVersionClick = (versionId: string) => {
    updateProfile({ game_version: versionId, loader_version: null });
  };

  const handleLoaderClick = (loaderName: string) => {
    const newLoader = (
      editedProfile.loader === loaderName ? "vanilla" : loaderName
    ) as ModLoader;
    updateProfile({ loader: newLoader, loader_version: null });
  };

  const getReasonText = (reason: string): string => {
    switch (reason) {
      case "norisk_pack":
        return "Forced by NoRisk Pack";
      case "user_overwrite":
        return "User overwrite";
      case "profile_default":
        return "Profile default";
      case "not_resolved":
        return "Not resolved";
      default:
        return reason;
    }
  };

  const loaderLabel =
    editedProfile.loader === "vanilla"
      ? "Vanilla"
      : `${editedProfile.loader.charAt(0).toUpperCase()}${editedProfile.loader.slice(1)} ${editedProfile.loader_version || ""}`.trim();

  return (
    <div className="space-y-4 select-none">
      {error && <Alert tone="error">{error}</Alert>}

      <SettingsSection>
        <label className={fieldLabelClass}>Currently installed</label>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="gap-1.5">
            <img src="/icons/minecraft.png" alt="" className="h-3.5 w-3.5 object-contain" />
            {editedProfile.game_version}
          </Badge>
          <Badge className="gap-1.5">
            <img
              src={
                editedProfile.loader === "vanilla"
                  ? "/icons/minecraft.png"
                  : editedProfile.loader === "fabric"
                    ? "/icons/fabric.png"
                    : editedProfile.loader === "forge"
                      ? "/icons/forge.png"
                      : editedProfile.loader === "quilt"
                        ? "/icons/quilt.png"
                        : editedProfile.loader === "neoforge"
                          ? "/icons/neoforge.png"
                          : "/icons/minecraft.png"
              }
              alt=""
              className="h-3.5 w-3.5 object-contain"
            />
            {loaderLabel}
          </Badge>
        </div>
      </SettingsSection>

      <SettingsSection>
        <label className={fieldLabelClass}>Game version</label>
        <div className="mb-3">
          <SearchWithFilters
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder="Search versions..."
            className="w-full"
            showSort={false}
            showFilter={true}
            filterOptions={[
              { value: "release", label: "Release", icon: "solar:filter-bold" },
              { value: "snapshot", label: "Snapshot", icon: "solar:filter-bold" },
              { value: "old-beta", label: "Old Beta", icon: "solar:filter-bold" },
              { value: "old-alpha", label: "Old Alpha", icon: "solar:filter-bold" },
            ]}
            filterValue={selectedVersionType}
            onFilterChange={(value) => setSelectedVersionType(value as VersionType)}
          />
        </div>

        {isLoadingVersions ? (
          <LoadingState message="Loading versions..." />
        ) : filteredVersions.length === 0 ? (
          <EmptyState
            icon="solar:magnifer-linear"
            title="No versions found"
            description="Try adjusting your search or filter."
          />
        ) : (
          <Card className="max-h-48 overflow-y-auto custom-scrollbar p-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {filteredVersions.map((version) => (
                <Button
                  key={version}
                  variant={editedProfile.game_version === version ? "primary" : "secondary"}
                  size="sm"
                  className={cn(
                    "w-full",
                    profile.is_standard_version && "cursor-not-allowed opacity-50",
                  )}
                  onClick={() => !profile.is_standard_version && handleGameVersionClick(version)}
                  disabled={profile.is_standard_version}
                >
                  {version}
                </Button>
              ))}
            </div>
          </Card>
        )}
      </SettingsSection>

      <SettingsSection>
        <label className={fieldLabelClass}>Platform</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {LOADERS.map((loader) => {
            const isCompatible = isModLoaderCompatible(
              loader.name,
              editedProfile.game_version,
            );
            const isSelected = editedProfile.loader === loader.name;

            return (
              <button
                key={loader.name}
                type="button"
                disabled={!isCompatible}
                onClick={() => isCompatible && handleLoaderClick(loader.name)}
                className="text-left disabled:cursor-not-allowed"
              >
                <Card
                  interactive={isCompatible}
                  selected={isSelected}
                  className={cn(
                    "flex flex-col items-center p-3",
                    !isCompatible && "opacity-40",
                  )}
                >
                  <img
                    src={loader.icon}
                    alt={loader.label}
                    className="mb-2 h-8 w-8 object-contain"
                  />
                  <span className="text-xs font-medium text-white">{loader.label}</span>
                  {!isCompatible && (
                    <span className="mt-1 text-[10px] text-[var(--text-muted)]">
                      Not compatible
                    </span>
                  )}
                </Card>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      {editedProfile.loader !== "vanilla" && (
        <SettingsSection>
          <label className={fieldLabelClass}>
            {editedProfile.loader.charAt(0).toUpperCase() + editedProfile.loader.slice(1)} version
          </label>

          {resolvedLoaderVersion && (
            <p className="mb-3 text-sm text-[var(--text-secondary)]">
              Current loader version:{" "}
              <span className="font-medium text-white">
                {resolvedLoaderVersion.version || "Not set"}
              </span>
              {resolvedLoaderVersion.reason !== "profile_default" && (
                <span className="ml-1 text-[var(--text-muted)]">
                  ({getReasonText(resolvedLoaderVersion.reason)})
                </span>
              )}
            </p>
          )}

          {isLoadingLoaderVersions ? (
            <LoadingState message={`Loading ${editedProfile.loader} versions...`} />
          ) : loaderVersions.length > 0 ? (
            <div className="space-y-3">
              <ProfileSettingToggle
                label={`Use custom ${editedProfile.loader} version`}
                checked={editedProfile.settings.use_overwrite_loader_version}
                onChange={(checked) =>
                  updateProfile({
                    settings: {
                      ...editedProfile.settings,
                      use_overwrite_loader_version: checked,
                    },
                  })
                }
              />

              <Select
                value={editedProfile.settings.overwrite_loader_version || ""}
                onChange={(value) =>
                  updateProfile({
                    settings: {
                      ...editedProfile.settings,
                      overwrite_loader_version: value,
                    },
                  })
                }
                options={[
                  { value: "", label: "Select custom version" },
                  ...loaderVersions.map((version) => ({
                    value: version,
                    label: version,
                  })),
                ]}
                disabled={!editedProfile.settings.use_overwrite_loader_version}
              />
            </div>
          ) : (
            <EmptyState
              icon="solar:box-minimalistic-linear"
              title="No loader versions available"
              description={`No ${editedProfile.loader} versions found for Minecraft ${editedProfile.game_version}.`}
            />
          )}
        </SettingsSection>
      )}
    </div>
  );
}
