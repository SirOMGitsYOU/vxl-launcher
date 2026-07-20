"use client";

import { useCallback, memo } from "react";
import { Icon } from "@iconify/react";
import type { Profile } from "../../../types/profile";
import { useThemeStore } from "../../../store/useThemeStore";
import ProfileIcon from "../ProfileIcon";
import { useMinecraftAuthStore } from "../../../store/minecraft-auth-store";
import { useCrafatarAvatar } from "../../../hooks/useCrafatarAvatar";
import type { MinecraftAccount } from "../../../types/minecraft";
import { cn } from "../../../lib/utils";
import { getFallbackAvatarUrl } from "../../../lib/avatar-utils";
import { Card, Input, SettingsSection } from "../../ui-v2";
import { fieldLabelClass, ProfileSettingToggle } from "./profile-settings-ui";

interface GeneralSettingsTabProps {
  profile: Profile;
  editedProfile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
  onRefresh?: () => Promise<Profile>;
  onDelete?: () => void;
  isDeleting?: boolean;
}

const GeneralSettingsTab = memo(function GeneralSettingsTab({
  profile,
  editedProfile,
  updateProfile,
  onRefresh,
}: GeneralSettingsTabProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const { accounts } = useMinecraftAuthStore();

  const AccountAvatar = memo(function AccountAvatar({ account }: { account: MinecraftAccount }) {
    const avatarUrl = useCrafatarAvatar({
      uuid: account.id,
      overlay: true,
    });

    if (!avatarUrl) {
      return null;
    }

    return (
      <img
        src={avatarUrl}
        alt={account.username}
        className="h-full w-full object-cover pixelated"
        style={{ imageRendering: "pixelated" }}
        onError={(e) => {
          e.currentTarget.src = getFallbackAvatarUrl("8667ba71b85a4004af54457a9734eed7", {
            overlay: true,
          });
        }}
      />
    );
  });

  const handleAccountSelect = (accountId: string | null) => {
    updateProfile({ preferred_account_id: accountId });
  };

  const handleIconUpdate = useCallback(async () => {
    try {
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error("Failed to refresh profile after icon update:", error);
    }
  }, [onRefresh]);

  return (
    <div className="space-y-4 select-none">
      <SettingsSection>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={fieldLabelClass}>Profile name</label>
            <div className="flex items-center gap-3">
              <ProfileIcon
                profileId={profile.id}
                banner={profile.banner}
                profileName={profile.name}
                accentColor={accentColor.value}
                onSuccessfulUpdate={handleIconUpdate}
                className="h-10 w-10 flex-shrink-0"
              />
              <Input
                value={editedProfile.name}
                onChange={(e) => updateProfile({ name: e.target.value })}
                placeholder="Enter profile name"
                maxLength={35}
                className="flex-1"
                disabled={profile.is_standard_version}
              />
            </div>
          </div>

          <div>
            <label className={fieldLabelClass}>Group</label>
            <Input
              value={editedProfile.group || ""}
              onChange={(e) => updateProfile({ group: e.target.value || null })}
              placeholder="e.g. modpacks, vanilla+"
              disabled={profile.is_standard_version}
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection>
        <ProfileSettingToggle
          label="Use shared Minecraft folder"
          description="When enabled, a shared Minecraft folder will be used based on the group. Your settings, worlds, configs and resource packs will remain the same between profiles."
          helperText="You can change this anytime."
          checked={editedProfile.use_shared_minecraft_folder ?? false}
          onChange={(checked) => {
            updateProfile({ use_shared_minecraft_folder: checked });
          }}
        />
      </SettingsSection>

      <SettingsSection>
        <label className={fieldLabelClass}>Quick play path</label>
        <Input
          value={editedProfile.settings.quick_play_path || ""}
          onChange={(e) =>
            updateProfile({
              settings: {
                ...editedProfile.settings,
                quick_play_path: e.target.value || null,
              },
            })
          }
          placeholder="World name or server address (e.g. MyWorld or hypixel.net)"
        />
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Enter a world name for singleplayer or a server address for multiplayer. Server
          addresses are detected by containing a dot (e.g. hypixel.net).
        </p>
      </SettingsSection>

      <SettingsSection>
        <label className={fieldLabelClass}>Preferred launch account</label>

        {accounts.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {accounts.map((account) => {
              const isSelected = editedProfile.preferred_account_id === account.id;

              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => handleAccountSelect(isSelected ? null : account.id)}
                  className="text-left"
                  title={`${account.username} (${account.id})`}
                >
                  <Card
                    interactive
                    selected={isSelected}
                    className="flex w-[88px] flex-col items-center p-3"
                  >
                    <div
                      className={cn(
                        "relative h-12 w-12 overflow-hidden rounded-md border",
                        isSelected ? "border-[var(--accent)]" : "border-[var(--surface-border)]",
                      )}
                    >
                      <AccountAvatar account={account} />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <Icon
                            icon="solar:check-circle-bold"
                            className="h-6 w-6"
                            style={{ color: accentColor.value }}
                          />
                        </div>
                      )}
                    </div>
                    <span
                      className={cn(
                        "mt-2 max-w-[72px] truncate text-xs",
                        isSelected ? "text-white" : "text-[var(--text-secondary)]",
                      )}
                    >
                      {account.username}
                    </span>
                  </Card>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="py-2 text-sm text-[var(--text-muted)]">No accounts found</p>
        )}
      </SettingsSection>
    </div>
  );
});

export default GeneralSettingsTab;
