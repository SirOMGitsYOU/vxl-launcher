"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import type { Profile } from "../../../types/profile";
import { RangeSlider } from "../../ui/RangeSlider";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { toast } from "react-hot-toast";
import { cn } from "../../../lib/utils";
import { getGlobalMemorySettings } from "../../../services/launcher-config-service";
import type { MemorySettings } from "../../../types/launcherConfig";
import {
  Alert,
  Button,
  Input,
  LoadingState,
  SettingsSection,
} from "../../ui-v2";
import { fieldLabelClass, ProfileSettingToggle } from "./profile-settings-ui";

interface JavaSettingsTabProps {
  editedProfile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
  systemRam: number;
  tempRamMb: number;
  setTempRamMb: (value: number) => void;
}

interface JavaInstallation {
  path: string;
  major_version: number;
  vendor: string;
  architecture: string;
  is_default?: boolean;
}

const textAreaClass =
  "min-h-[100px] w-full rounded-lg bg-[var(--surface-overlay)] border border-[var(--surface-border)] px-3 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]/50";

export function JavaSettingsTab({
  editedProfile,
  updateProfile,
  systemRam,
  tempRamMb,
  setTempRamMb,
}: JavaSettingsTabProps) {
  const [useCustomJava, setUseCustomJava] = useState(
    editedProfile.settings?.use_custom_java_path ?? false,
  );
  const [useCustomArgs, setUseCustomArgs] = useState(
    (editedProfile.settings?.custom_jvm_args?.length || 0) > 0,
  );
  const [detectedJavaInstallations, setDetectedJavaInstallations] = useState<JavaInstallation[]>([]);
  const [isDetectingJava, setIsDetectingJava] = useState(false);
  const [customJavaPathInput, setCustomJavaPathInput] = useState(
    editedProfile.settings?.java_path || "",
  );
  const [isValidatingJavaPath, setIsValidatingJavaPath] = useState(false);
  const [globalMemorySettings, setGlobalMemorySettingsState] = useState<MemorySettings | null>(null);
  const [isLoadingGlobalMemory, setIsLoadingGlobalMemory] = useState(false);
  const [isSystemRamLoaded, setIsSystemRamLoaded] = useState(false);

  const detectJavaInstallations = async () => {
    setIsDetectingJava(true);
    try {
      const installations: JavaInstallation[] = await invoke("detect_java_installations_command");
      setDetectedJavaInstallations(installations);
      if (installations.length === 0) {
        toast(
          "No Java installations found on your system. You may need to specify the path manually if you use a custom Java setup.",
        );
      } else if (!customJavaPathInput) {
        const currentProfileJavaPath = editedProfile.settings?.java_path;
        const preselected = currentProfileJavaPath
          ? installations.find((inst) => inst.path === currentProfileJavaPath)
          : installations.find((inst) => inst.is_default) || installations[0];
        if (preselected) {
          setCustomJavaPathInput(preselected.path);
        }
      }
    } catch (error) {
      console.error("Error detecting Java installations:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to detect Java: ${errorMessage}`);
      setDetectedJavaInstallations([]);
    } finally {
      setIsDetectingJava(false);
    }
  };

  useEffect(() => {
    detectJavaInstallations();
  }, []);

  useEffect(() => {
    if (systemRam !== 8192) {
      setIsSystemRamLoaded(true);
    }
  }, [systemRam]);

  useEffect(() => {
    if (editedProfile.is_standard_version) {
      setIsLoadingGlobalMemory(true);
      getGlobalMemorySettings()
        .then((settings) => {
          setGlobalMemorySettingsState(settings);
        })
        .catch((error) => {
          console.error("Failed to load global memory settings:", error);
          toast.error("Failed to load global memory settings");
        })
        .finally(() => {
          setIsLoadingGlobalMemory(false);
        });
    } else {
      setIsLoadingGlobalMemory(false);
    }
  }, [editedProfile.is_standard_version]);

  const browseForJavaPath = async () => {
    try {
      const selected = await open({
        title: "Select Java executable (javaw.exe, java) or installation directory",
        directory: false,
        multiple: false,
      });
      if (typeof selected === "string" && selected) {
        setCustomJavaPathInput(selected);
        await testCustomJavaPath(selected);
      }
    } catch (error) {
      console.error("Error browsing for Java path:", error);
      const errorMessage = String(error instanceof Error ? error.message : error);
      toast.error(`Error browsing for Java: ${errorMessage}`);
    }
  };

  const testCustomJavaPath = async (path_to_test?: string) => {
    const currentPath = path_to_test || customJavaPathInput;
    if (!currentPath) {
      toast.error("Please select or enter a Java path to test.");
      return;
    }
    setIsValidatingJavaPath(true);
    try {
      const isValid: boolean = await invoke("validate_java_path_command", {
        path: currentPath,
      });
      if (isValid) {
        toast.success("Java path is valid!");
        updateProfile({
          settings: {
            ...editedProfile.settings,
            java_path: currentPath,
            use_custom_java_path: true,
          },
        });
      } else {
        toast.error(
          "Invalid Java path. Check the path or ensure it's a compatible Java version.",
        );
      }
    } catch (error: unknown) {
      console.error(`Error validating Java path ${currentPath}:`, error);
      const message =
        error instanceof Error && error.message.includes("Java path does not exist")
          ? "Selected Java path does not exist."
          : error instanceof Error
            ? error.message
            : String(error);
      toast.error(`Java validation error: ${message}`);
    } finally {
      setIsValidatingJavaPath(false);
    }
  };

  let recommendedMaxRam;
  if (systemRam <= 8192) {
    recommendedMaxRam = Math.min(2048, systemRam);
  } else {
    recommendedMaxRam = Math.min(4096, systemRam);
  }

  const handleJavaPathInputChange = (newPath: string) => {
    setCustomJavaPathInput(newPath);
  };

  const handleDetectedJavaListItemClick = (installation: JavaInstallation) => {
    setCustomJavaPathInput(installation.path);
    testCustomJavaPath(installation.path);
  };

  const handleJavaArgsChange = (args: string) => {
    const newSettings = { ...editedProfile.settings };
    newSettings.custom_jvm_args = args;
    updateProfile({ settings: newSettings });
  };

  const handleCustomJavaToggle = (checked: boolean) => {
    setUseCustomJava(checked);
    if (checked) {
      if (!customJavaPathInput && detectedJavaInstallations.length > 0) {
        const defaultOrFirst =
          detectedJavaInstallations.find((j) => j.is_default) || detectedJavaInstallations[0];
        if (defaultOrFirst) setCustomJavaPathInput(defaultOrFirst.path);
      }
      updateProfile({
        settings: { ...editedProfile.settings, use_custom_java_path: true },
      });
    } else {
      updateProfile({
        settings: { ...editedProfile.settings, use_custom_java_path: false },
      });
    }
  };

  const handleCustomArgsToggle = (checked: boolean) => {
    setUseCustomArgs(checked);
    const newSettings = { ...editedProfile.settings };
    if (checked) {
      if (!newSettings.custom_jvm_args) {
        newSettings.custom_jvm_args = [
          "-XX:+UseG1GC",
          "-XX:+ParallelRefProcEnabled",
          "-XX:MaxGCPauseMillis=200",
        ].join(" ");
      }
    } else {
      newSettings.custom_jvm_args = null;
    }
    updateProfile({ settings: newSettings });
  };

  const isMemoryLoading =
    (editedProfile.is_standard_version && (isLoadingGlobalMemory || !globalMemorySettings)) ||
    !isSystemRamLoaded;

  return (
    <div className="space-y-4 select-none">
      <SettingsSection>
        <label className={fieldLabelClass}>
          {editedProfile.is_standard_version ? "Global memory allocated" : "Memory allocated"}
        </label>
        {isMemoryLoading ? (
          <LoadingState message="Loading memory settings..." />
        ) : (
          <>
            <RangeSlider
              value={tempRamMb}
              onChange={setTempRamMb}
              min={512}
              max={systemRam}
              step={512}
              valueLabel={`${tempRamMb} MB (${(tempRamMb / 1024).toFixed(1)} GB)`}
              minLabel="512 MB"
              maxLabel={`${systemRam} MB`}
              variant="flat"
              recommendedRange={[4096, 8192]}
              unit="MB"
            />
            <p className="mt-3 text-xs text-[var(--text-secondary)]">
              Recommended: {recommendedMaxRam} MB ({(recommendedMaxRam / 1024).toFixed(1)} GB)
            </p>
            {editedProfile.is_standard_version && (
              <Alert tone="info" className="mt-3">
                This setting applies to all standard profiles.
              </Alert>
            )}
          </>
        )}
      </SettingsSection>

      <SettingsSection>
        <ProfileSettingToggle
          label="Custom Java installation"
          description="Use a specific Java executable instead of the launcher default."
          checked={useCustomJava}
          onChange={handleCustomJavaToggle}
        />

        {!useCustomJava && (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            The launcher will use its bundled Java or a system-wide default.
          </p>
        )}

        {useCustomJava && (
          <div className="mt-4 space-y-4">
            {isDetectingJava && (
              <p className="text-sm text-[var(--text-secondary)]">
                Detecting Java installations...
              </p>
            )}

            <div>
              <label htmlFor="custom-java-path-input" className={fieldLabelClass}>
                Manual Java path
              </label>
              <div className="flex gap-2">
                <Input
                  id="custom-java-path-input"
                  value={customJavaPathInput}
                  onChange={(e) => handleJavaPathInputChange(e.target.value)}
                  placeholder="Path to java executable (e.g. .../bin/javaw.exe)"
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  size="md"
                  onClick={browseForJavaPath}
                  icon={<Icon icon="solar:folder-with-files-bold" className="h-4 w-4" />}
                  aria-label="Browse for Java executable"
                >
                  Browse
                </Button>
              </div>
            </div>

            {detectedJavaInstallations.length > 0 && !isDetectingJava && (
              <div>
                <label className={fieldLabelClass}>Detected installations</label>
                <div className="custom-scrollbar max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[var(--surface-border)] p-2">
                  {detectedJavaInstallations.map((java) => (
                    <button
                      key={java.path}
                      type="button"
                      onClick={() => handleDetectedJavaListItemClick(java)}
                      title={java.path}
                      className={cn(
                        "w-full rounded-md border p-2 text-left text-xs transition-colors",
                        customJavaPathInput === java.path
                          ? "border-[var(--accent)] bg-[rgba(var(--accent-rgb),0.12)] text-white"
                          : "border-[var(--surface-border)] bg-[var(--surface-overlay)] text-[var(--text-secondary)] hover:border-[var(--surface-border-strong)] hover:text-white",
                      )}
                    >
                      <span className="block truncate">{java.path}</span>
                      <span className="block truncate text-[var(--text-muted)]">
                        v{java.major_version} · {java.vendor} · {java.architecture}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="primary"
              size="md"
              onClick={() => testCustomJavaPath()}
              disabled={isValidatingJavaPath || !customJavaPathInput}
              icon={<Icon icon="solar:test-tube-bold" className="h-4 w-4" />}
            >
              {isValidatingJavaPath ? "Testing..." : "Test & use path"}
            </Button>
          </div>
        )}
      </SettingsSection>

      {!editedProfile.is_standard_version && (
        <SettingsSection>
          <ProfileSettingToggle
            label="Custom Java arguments"
            description="Override the default JVM arguments used when launching this profile."
            checked={useCustomArgs}
            onChange={handleCustomArgsToggle}
          />

          {useCustomArgs && (
            <div className="mt-4">
              <textarea
                value={editedProfile.settings?.custom_jvm_args || ""}
                onChange={(e) => handleJavaArgsChange(e.target.value)}
                placeholder="Enter Java arguments..."
                className={textAreaClass}
              />
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Arguments should be separated by spaces. Example: -Xmx4G
              </p>
            </div>
          )}
        </SettingsSection>
      )}
    </div>
  );
}
