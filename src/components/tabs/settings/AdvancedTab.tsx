"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import { Button } from "../../ui-v2";
import { SettingsSection } from "../../ui/settings/SettingsSection";
import { SettingRow } from "../../ui/settings/SettingRow";
import { ToggleSwitch } from "../../ui/ToggleSwitch";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { openExternalUrl } from "../../../services/tauri-service";
import { useSettingsConfig, useSettingsKeywords } from "./settings-context";

export function AdvancedTab() {
  const kw = useSettingsKeywords();
  const { tempConfig, setTempConfig, saving } = useSettingsConfig();
  const { confirm, confirmDialog } = useConfirmDialog();

  const [isHooksExpanded, setIsHooksExpanded] = useState(false);
  const [isPreLaunchEditEnabled, setIsPreLaunchEditEnabled] = useState(false);
  const [isWrapperEditEnabled, setIsWrapperEditEnabled] = useState(false);
  const [isPostExitEditEnabled, setIsPostExitEditEnabled] = useState(false);

  return (
    <div className="space-y-6">
      <SettingsSection
        id="settings-section-login"
        title="Login"
        icon="solar:login-3-bold"
        keywords={kw("login", "browser", "microsoft", "auth")}
      >
        <SettingRow
          label="Browser-Based Login"
          description="Use external browser for Microsoft login instead of embedded window."
          searchKeywords={kw("browser", "login", "microsoft", "auth")}
          disabled={saving}
        >
          <ToggleSwitch
            checked={tempConfig?.use_browser_based_login || false}
            onChange={(checked) =>
              tempConfig &&
              setTempConfig({ ...tempConfig, use_browser_based_login: checked })
            }
            disabled={saving}
            size="md"
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        id="settings-section-gamedir"
        title="Game Data Directory"
        icon="solar:folder-bold"
        keywords={kw("game", "data", "directory", "folder", "path")}
        description="Choose a custom location to store game data (worlds, mods, libraries, etc.)"
      >
        <div className="flex gap-3 py-3">
          <input
            type="text"
            value={tempConfig?.custom_game_directory || ""}
            placeholder="Default location will be used"
            className="flex-1 p-3 rounded-md bg-black/40 border border-[#ffffff20] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
            disabled={saving}
            readOnly
          />
          {tempConfig?.custom_game_directory && (
            <Button
              variant="ghost"
              className="px-4 py-3 border border-[#ffffff20] hover:bg-red-500/20 hover:border-red-500/30 transition-colors"
              disabled={saving}
              onClick={() => {
                if (tempConfig) {
                  setTempConfig({
                    ...tempConfig,
                    custom_game_directory: null,
                  });
                }
              }}
              title="Reset to default location"
            >
              <Icon icon="solar:close-circle-bold" className="w-5 h-5 text-red-400" />
            </Button>
          )}
          <Button
            variant="ghost"
            className="px-4 py-3 border border-[#ffffff20] hover:bg-white/5 transition-colors"
            disabled={saving}
            onClick={async () => {
              try {
                const { open } = await import("@tauri-apps/plugin-dialog");
                const directory = await open({
                  multiple: false,
                  directory: true,
                });

                if (directory && tempConfig) {
                  setTempConfig({
                    ...tempConfig,
                    custom_game_directory: directory,
                  });
                }
              } catch (error) {
                console.error("Failed to open folder dialog:", error);
              }
            }}
            title="Select custom directory"
          >
            <Icon icon="solar:folder-open-bold" className="w-5 h-5" />
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        id="settings-section-hooks"
        title="Game Hooks"
        icon="solar:code-bold"
        keywords={kw("hooks", "script", "command", "wrapper", "pre-launch", "post-exit")}
        description="Configure custom commands to run before, during, and after game launch"
        headerActions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsHooksExpanded((v) => !v)}
            icon={
              <Icon
                icon={isHooksExpanded ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"}
                className="w-5 h-5"
              />
            }
          >
            {isHooksExpanded ? "Hide configuration" : "Show configuration"}
          </Button>
        }
      >
        {isHooksExpanded && (
          <div className="space-y-6 py-3">
            <div className="p-4 rounded-lg border border-[#ffffff20] hover:bg-black/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon icon="solar:play-circle-bold" className="w-5 h-5 text-white" />
                  <h5 className="text-sm font-medium text-white">Pre-Launch Hook</h5>
                </div>
                <Button
                  variant={isPreLaunchEditEnabled ? "secondary" : "ghost"}
                  size="sm"
                  onClick={async () => {
                    if (isPreLaunchEditEnabled) {
                      setIsPreLaunchEditEnabled(false);
                      return;
                    }
                    const confirmed = await confirm({
                      title: "Enable pre-launch editing",
                      message:
                        "Editing the Pre-Launch hook can prevent the game from starting if misconfigured. Proceed only if you know what you're doing.",
                      confirmText: "ENABLE",
                      cancelText: "CANCEL",
                      type: "warning",
                      fullscreen: true,
                    });
                    if (confirmed) {
                      setIsPreLaunchEditEnabled(true);
                      toast.success("Pre-Launch editing enabled");
                    }
                  }}
                  icon={
                    <Icon
                      icon={
                        isPreLaunchEditEnabled
                          ? "solar:lock-unlocked-bold"
                          : "solar:lock-keyhole-bold"
                      }
                      className="w-4 h-4"
                    />
                  }
                >
                  {isPreLaunchEditEnabled ? "Disable editing" : "Enable editing"}
                </Button>
              </div>
              <p className="text-sm text-white/60 mb-4">
                Command to run before Minecraft starts. If this command fails, the launch will be aborted.
              </p>
              <input
                type="text"
                value={tempConfig?.hooks?.pre_launch || ""}
                onChange={(e) => {
                  if (tempConfig) {
                    setTempConfig({
                      ...tempConfig,
                      hooks: {
                        ...tempConfig.hooks,
                        pre_launch: e.target.value || null,
                      },
                    });
                  }
                }}
                placeholder='Example: echo "Starting Minecraft..."'
                className="w-full p-3 rounded-md bg-black/40 border border-[#ffffff20] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                disabled={saving || !isPreLaunchEditEnabled}
                title={
                  !isPreLaunchEditEnabled ? "Enable editing to modify this field" : undefined
                }
              />
            </div>

            <div className="p-4 rounded-lg border border-[#ffffff20] hover:bg-black/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon icon="solar:shield-bold" className="w-5 h-5 text-white" />
                  <h5 className="text-sm font-medium text-white">Wrapper Hook</h5>
                </div>
                <Button
                  variant={isWrapperEditEnabled ? "secondary" : "ghost"}
                  size="sm"
                  onClick={async () => {
                    if (isWrapperEditEnabled) {
                      setIsWrapperEditEnabled(false);
                      return;
                    }
                    const confirmed = await confirm({
                      title: "Enable wrapper editing",
                      message:
                        "Changing the Wrapper hook affects how Java is executed. Misconfiguration may prevent launching.",
                      confirmText: "ENABLE",
                      cancelText: "CANCEL",
                      type: "warning",
                      fullscreen: true,
                    });
                    if (confirmed) {
                      setIsWrapperEditEnabled(true);
                      toast.success("Wrapper editing enabled");
                    }
                  }}
                  icon={
                    <Icon
                      icon={
                        isWrapperEditEnabled
                          ? "solar:lock-unlocked-bold"
                          : "solar:lock-keyhole-bold"
                      }
                      className="w-4 h-4"
                    />
                  }
                >
                  {isWrapperEditEnabled ? "Disable editing" : "Enable editing"}
                </Button>
              </div>
              <p className="text-sm text-white/60 mb-4">
                Wrapper command to run Java through (e.g., sandboxing tools). The Java path will be passed as an argument.
              </p>
              <input
                type="text"
                value={tempConfig?.hooks?.wrapper || ""}
                onChange={(e) => {
                  if (tempConfig) {
                    setTempConfig({
                      ...tempConfig,
                      hooks: {
                        ...tempConfig.hooks,
                        wrapper: e.target.value || null,
                      },
                    });
                  }
                }}
                placeholder="Example: firejail or gamemoderun"
                className="w-full p-3 rounded-md bg-black/40 border border-[#ffffff20] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                disabled={saving || !isWrapperEditEnabled}
                title={
                  !isWrapperEditEnabled ? "Enable editing to modify this field" : undefined
                }
              />
            </div>

            <div className="p-4 rounded-lg border border-[#ffffff20] hover:bg-black/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon icon="solar:stop-circle-bold" className="w-5 h-5 text-white" />
                  <h5 className="text-sm font-medium text-white">Post-Exit Hook</h5>
                </div>
                <Button
                  variant={isPostExitEditEnabled ? "secondary" : "ghost"}
                  size="sm"
                  onClick={async () => {
                    if (isPostExitEditEnabled) {
                      setIsPostExitEditEnabled(false);
                      return;
                    }
                    const confirmed = await confirm({
                      title: "Enable post-exit editing",
                      message:
                        "Post-Exit hook runs system commands after the game closes. Proceed only if you trust the command.",
                      confirmText: "ENABLE",
                      cancelText: "CANCEL",
                      type: "warning",
                      fullscreen: true,
                    });
                    if (confirmed) {
                      setIsPostExitEditEnabled(true);
                      toast.success("Post-Exit editing enabled");
                    }
                  }}
                  icon={
                    <Icon
                      icon={
                        isPostExitEditEnabled
                          ? "solar:lock-unlocked-bold"
                          : "solar:lock-keyhole-bold"
                      }
                      className="w-4 h-4"
                    />
                  }
                >
                  {isPostExitEditEnabled ? "Disable editing" : "Enable editing"}
                </Button>
              </div>
              <p className="text-sm text-white/60 mb-4">
                Command to run after Minecraft exits successfully. Runs in the background without blocking.
              </p>
              <input
                type="text"
                value={tempConfig?.hooks?.post_exit || ""}
                onChange={(e) => {
                  if (tempConfig) {
                    setTempConfig({
                      ...tempConfig,
                      hooks: {
                        ...tempConfig.hooks,
                        post_exit: e.target.value || null,
                      },
                    });
                  }
                }}
                placeholder='Example: echo "Minecraft closed"'
                className="w-full p-3 rounded-md bg-black/40 border border-[#ffffff20] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                disabled={saving || !isPostExitEditEnabled}
                title={
                  !isPostExitEditEnabled ? "Enable editing to modify this field" : undefined
                }
              />
            </div>

            <div className="p-4 rounded-lg border border-orange-500/30 bg-orange-900/20">
              <div className="flex items-start gap-3">
                <Icon
                  icon="solar:danger-triangle-bold"
                  className="w-6 h-6 text-orange-400 flex-shrink-0 mt-1"
                />
                <div>
                  <h4 className="text-base font-semibold text-orange-300 mb-2">Warning</h4>
                  <p className="text-sm text-orange-200/80">
                    These hooks execute system commands with full permissions. Only use commands you
                    trust and understand. Invalid commands may prevent Minecraft from launching or
                    cause security issues.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-[#ffffff20] bg-black/10">
              <div className="flex items-start gap-3">
                <Icon
                  icon="solar:info-circle-bold"
                  className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1"
                />
                <div>
                  <h4 className="text-base font-semibold text-blue-300 mb-2">Examples</h4>
                  <div className="space-y-2 text-sm text-blue-200/80">
                    <p>
                      <strong>Pre-Launch:</strong> <code>echo &quot;Starting game...&quot;</code>
                    </p>
                    <p>
                      <strong>Wrapper:</strong> <code>firejail</code> or <code>gamemoderun</code>
                    </p>
                    <p>
                      <strong>Post-Exit:</strong> <code>notify-send &quot;Game finished&quot;</code>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        id="settings-section-licenses"
        title="Third-party Code"
        icon="solar:document-text-bold"
        keywords={kw("license", "licenses", "third-party", "credits", "liquidbounce", "norisk")}
        description="View licenses for base code and components from third parties"
        headerActions={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openExternalUrl("https://github.com/CCBlueX/LiquidBounce")}
              icon={<Icon icon="solar:external-link-bold" className="w-5 h-5" />}
            >
              LiquidBounce
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                openExternalUrl("https://github.com/NoRiskClient/noriskclient-launcher")
              }
              icon={<Icon icon="solar:external-link-bold" className="w-5 h-5" />}
            >
              NoRiskLauncher
            </Button>
          </div>
        }
      >
        <div className="py-1" />
      </SettingsSection>

      {confirmDialog}
    </div>
  );
}
