"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import type { ModLoader } from "../../../types/profile";
import { invoke } from "@tauri-apps/api/core";
import { Modal } from "../../ui/Modal";
import { Button, LoadingState } from "../../ui-v2";
import { StatusMessage } from "../../ui/StatusMessage";
import { cn } from "../../../lib/utils";

interface LoaderVersionInfo {
  loader: {
    version: string;
    stable?: boolean;
  };
}

interface ProfileWizardV2Step2Props {
  onClose: () => void;
  onNext: (selectedLoader: ModLoader, selectedLoaderVersion: string | null) => void;
  onBack: () => void;
  selectedMinecraftVersion: string;
}

const MOD_LOADERS: {
  key: ModLoader;
  label: string;
  backgroundImage: string;
}[] = [
  { key: "vanilla", label: "Vanilla", backgroundImage: "/icons/minecraft.png" },
  { key: "fabric", label: "Fabric", backgroundImage: "/icons/fabric.png" },
  { key: "forge", label: "Forge", backgroundImage: "/icons/forge.png" },
  { key: "neoforge", label: "NeoForge", backgroundImage: "/icons/neoforge.png" },
  { key: "quilt", label: "Quilt", backgroundImage: "/icons/quilt.png" },
];

export function ProfileWizardV2Step2({
  onClose,
  onNext,
  onBack,
  selectedMinecraftVersion,
}: ProfileWizardV2Step2Props) {
  const [loading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLoader, setSelectedLoader] = useState<ModLoader>("vanilla");
  const [selectedLoaderVersion, setSelectedLoaderVersion] = useState<string | null>(null);
  const [loaderVersions, setLoaderVersions] = useState<string[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  const [showNoVersionsFound, setShowNoVersionsFound] = useState(false);
  const [unavailableLoaders, setUnavailableLoaders] = useState<Set<ModLoader>>(new Set());

  useEffect(() => {
    const checkAllLoaders = async () => {
      setUnavailableLoaders(new Set());

      const modLoaderKeys: Exclude<ModLoader, "vanilla">[] = [
        "fabric",
        "forge",
        "neoforge",
        "quilt",
      ];

      const checkPromises = modLoaderKeys.map(async (loaderKey) => {
        try {
          let versions: string[] = [];

          switch (loaderKey) {
            case "fabric": {
              const fabricVersions = await invoke<LoaderVersionInfo[]>(
                "get_fabric_loader_versions",
                { minecraftVersion: selectedMinecraftVersion },
              );
              versions = fabricVersions.map(
                (v) => `${v.loader.version}${v.loader.stable ? " (stable)" : ""}`,
              );
              break;
            }
            case "forge":
              versions = await invoke<string[]>("get_forge_versions", {
                minecraftVersion: selectedMinecraftVersion,
              });
              break;
            case "neoforge":
              versions = await invoke<string[]>("get_neoforge_versions", {
                minecraftVersion: selectedMinecraftVersion,
              });
              break;
            case "quilt": {
              const quiltVersions = await invoke<LoaderVersionInfo[]>(
                "get_quilt_loader_versions",
                { minecraftVersion: selectedMinecraftVersion },
              );
              versions = quiltVersions.map(
                (v) => `${v.loader.version}${v.loader.stable ? " (stable)" : ""}`,
              );
              break;
            }
          }

          return versions.length === 0 ? loaderKey : null;
        } catch (err) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : typeof err === "object" && err !== null && "message" in err
                ? String((err as { message: unknown }).message)
                : String(err);
          const errorKind =
            typeof err === "object" && err !== null && "kind" in err
              ? String((err as { kind: unknown }).kind)
              : "";
          const isNoVersionsError =
            errorMessage.includes("Status 400") ||
            errorMessage.includes("Status 404") ||
            errorKind.includes("Status 400") ||
            errorKind.includes("Status 404");

          return isNoVersionsError ? loaderKey : null;
        }
      });

      const unavailableResults = await Promise.all(checkPromises);
      const unavailable = unavailableResults.filter(
        (loader): loader is Exclude<ModLoader, "vanilla"> => loader !== null,
      );

      if (unavailable.length > 0) {
        setUnavailableLoaders(new Set(unavailable));
        if (unavailable.includes(selectedLoader as Exclude<ModLoader, "vanilla">)) {
          setSelectedLoader("vanilla");
        }
      }
    };

    void checkAllLoaders();
  }, [selectedMinecraftVersion, selectedLoader]);

  useEffect(() => {
    const fetchVersions = async () => {
      if (selectedLoader === "vanilla") {
        setLoaderVersions([]);
        setSelectedLoaderVersion(null);
        setShowLoadingIndicator(false);
        setShowNoVersionsFound(false);
        return;
      }

      setLoadingVersions(true);
      setShowLoadingIndicator(false);
      setShowNoVersionsFound(false);
      setError(null);

      const loadingTimeout = window.setTimeout(() => {
        setShowLoadingIndicator(true);
      }, 800);

      let noVersionsTimeout: number | undefined;

      try {
        let versions: string[] = [];

        switch (selectedLoader) {
          case "fabric": {
            const fabricVersions = await invoke<LoaderVersionInfo[]>(
              "get_fabric_loader_versions",
              { minecraftVersion: selectedMinecraftVersion },
            );
            versions = fabricVersions.map(
              (v) => `${v.loader.version}${v.loader.stable ? " (stable)" : ""}`,
            );
            break;
          }
          case "forge":
            versions = await invoke<string[]>("get_forge_versions", {
              minecraftVersion: selectedMinecraftVersion,
            });
            break;
          case "neoforge":
            versions = await invoke<string[]>("get_neoforge_versions", {
              minecraftVersion: selectedMinecraftVersion,
            });
            break;
          case "quilt": {
            const quiltVersions = await invoke<LoaderVersionInfo[]>(
              "get_quilt_loader_versions",
              { minecraftVersion: selectedMinecraftVersion },
            );
            versions = quiltVersions.map(
              (v) => `${v.loader.version}${v.loader.stable ? " (stable)" : ""}`,
            );
            break;
          }
        }

        setLoaderVersions(versions);
        if (versions.length > 0) {
          setSelectedLoaderVersion(versions[0]);
          setShowNoVersionsFound(false);
        } else {
          noVersionsTimeout = window.setTimeout(() => {
            setShowNoVersionsFound(true);
          }, 800);

          if (
            selectedLoader === "fabric" ||
            selectedLoader === "forge" ||
            selectedLoader === "neoforge" ||
            selectedLoader === "quilt"
          ) {
            setUnavailableLoaders((prev) => new Set(prev).add(selectedLoader));
            setSelectedLoader("vanilla");
            setSelectedLoaderVersion(null);
            setShowNoVersionsFound(false);
          }
        }
      } catch (err) {
        console.error(`Failed to fetch ${selectedLoader} versions:`, err);

        const errorMessage =
          err instanceof Error
            ? err.message
            : typeof err === "object" && err !== null && "message" in err
              ? String((err as { message: unknown }).message)
              : String(err);
        const errorKind =
          typeof err === "object" && err !== null && "kind" in err
            ? String((err as { kind: unknown }).kind)
            : "";
        const isNoVersionsError =
          errorMessage.includes("Status 400") ||
          errorMessage.includes("Status 404") ||
          errorKind.includes("Status 400") ||
          errorKind.includes("Status 404");

        if (isNoVersionsError) {
          if (
            selectedLoader === "fabric" ||
            selectedLoader === "forge" ||
            selectedLoader === "neoforge" ||
            selectedLoader === "quilt"
          ) {
            setUnavailableLoaders((prev) => new Set(prev).add(selectedLoader));
            setSelectedLoader("vanilla");
          }
          setLoaderVersions([]);
          setSelectedLoaderVersion(null);
          setShowNoVersionsFound(false);
          setError(null);
        } else {
          setError(`Failed to load ${selectedLoader} versions. Please try again.`);
          setLoaderVersions([]);
          setSelectedLoaderVersion(null);
          setShowNoVersionsFound(false);
        }
      } finally {
        window.clearTimeout(loadingTimeout);
        if (noVersionsTimeout !== undefined) {
          window.clearTimeout(noVersionsTimeout);
        }
        setLoadingVersions(false);
        setShowLoadingIndicator(false);
      }
    };

    void fetchVersions();
  }, [selectedLoader, selectedMinecraftVersion]);

  const handleNext = () => {
    onNext(selectedLoader, selectedLoaderVersion);
  };

  const renderContent = () => {
    if (loading) {
      return <LoadingState message="Loading mod loaders..." />;
    }

    if (error) {
      return <StatusMessage type="error" message={error} />;
    }

    return (
      <div className="flex flex-col space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {MOD_LOADERS.map((loader) => {
            const isUnavailable = unavailableLoaders.has(loader.key);
            const isDisabled = isUnavailable && loader.key !== "vanilla";
            const isSelected = selectedLoader === loader.key;

            return (
              <div
                key={loader.key}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all duration-200",
                  isDisabled && "pointer-events-none cursor-not-allowed opacity-50",
                  isSelected && !isDisabled
                    ? "border-[var(--accent)] bg-[rgba(var(--accent-rgb),0.06)] vxl-accent-glow"
                    : "border-[var(--surface-border)] bg-[var(--surface-overlay)] hover:border-[var(--surface-border-strong)]",
                )}
                onClick={() => !isDisabled && setSelectedLoader(loader.key)}
              >
                <div
                  className="h-12 w-12 shrink-0 bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url('${loader.backgroundImage}')` }}
                />
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-white">{loader.label}</h4>
                  {isDisabled && (
                    <p className="text-xs text-[var(--text-muted)]">Not available</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="min-h-[2.75rem]">
          {selectedLoader === "vanilla" ? (
            <p className="py-2 text-center text-sm text-[var(--text-muted)]">
              No additional loader version required
            </p>
          ) : showLoadingIndicator ? (
            <LoadingState message="Loading versions..." />
          ) : loaderVersions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Loader version</p>
              <div className="custom-scrollbar max-h-44 overflow-y-auto rounded-xl border border-[var(--surface-border)] bg-[var(--surface-overlay)] p-2">
                {loaderVersions.map((version) => {
                  const isSelected = selectedLoaderVersion === version;
                  return (
                    <button
                      key={version}
                      type="button"
                      onClick={() => setSelectedLoaderVersion(version)}
                      className={cn(
                        "mb-1 w-full rounded-lg px-3 py-2 text-left text-sm transition-colors last:mb-0",
                        isSelected
                          ? "border border-[var(--accent)]/40 bg-[rgba(var(--accent-rgb),0.12)] text-white"
                          : "border border-transparent text-[var(--text-secondary)] hover:bg-white/5 hover:text-white",
                      )}
                    >
                      {version}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : showNoVersionsFound ? (
            <div className="py-2 text-center">
              <Icon
                icon="solar:danger-triangle-bold"
                className="mx-auto mb-2 h-6 w-6 text-[var(--text-muted)]"
              />
              <p className="text-sm text-[var(--text-secondary)]">
                No {selectedLoader} versions available for {selectedMinecraftVersion}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const renderFooter = () => (
    <div className="flex items-center justify-between">
      <Button
        variant="secondary"
        onClick={onBack}
        disabled={loading || loadingVersions}
        size="md"
        icon={<Icon icon="solar:arrow-left-bold" className="h-4 w-4" />}
      >
        Back
      </Button>

      <Button
        variant="primary"
        onClick={handleNext}
        disabled={
          loading || loadingVersions || (selectedLoader !== "vanilla" && !selectedLoaderVersion)
        }
        size="md"
        icon={<Icon icon="solar:arrow-right-bold" className="h-4 w-4" />}
      >
        Next
      </Button>
    </div>
  );

  return (
    <Modal
      title="Create profile — Select mod loader"
      onClose={onClose}
      width="lg"
      footer={renderFooter()}
    >
      <div className="min-h-[400px] overflow-hidden p-6">{renderContent()}</div>
    </Modal>
  );
}
