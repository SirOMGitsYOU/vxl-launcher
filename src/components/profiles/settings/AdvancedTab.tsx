"use client";

import { useState } from "react";
import type { Profile } from "../../../types/profile";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import * as ProfileService from "../../../services/profile-service";
import { useProfileStore } from "../../../store/profile-store";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { Button, SectionHeader, SettingsSection } from "../../ui-v2";

interface AdvancedTabProps {
  profile: Profile;
  onRefresh?: () => Promise<unknown>;
}

export function AdvancedTab({ profile, onRefresh }: AdvancedTabProps) {
  const [isRepairing, setIsRepairing] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const { confirm, confirmDialog } = useConfirmDialog();
  const updateProfile = useProfileStore((state) => state.updateProfile);

  const handleRepair = async () => {
    try {
      setIsRepairing(true);
      await ProfileService.repairProfile(profile.id);
      toast.success("Profile repair completed successfully!");
    } catch (err) {
      console.error("Failed to repair profile:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to repair profile: ${errorMessage}`);
    } finally {
      setIsRepairing(false);
    }
  };

  const handleUnlinkModpack = async () => {
    const confirmed = await confirm({
      title: "Convert to custom profile",
      message:
        "This unlinks the profile from its modpack. Installed content stays, but automatic modpack updates and version switching will be removed. You can then add, remove, and update mods individually. This cannot be undone.",
      confirmText: "Unlink",
      cancelText: "Cancel",
      type: "warning",
    });

    if (!confirmed) {
      return;
    }

    setIsUnlinking(true);
    try {
      await toast.promise(
        updateProfile(profile.id, { clear_modpack_info: true }).then(async () => {
          await onRefresh?.();
        }),
        {
          loading: `Unlinking ${profile.name} from its modpack...`,
          success: `${profile.name} is now a custom profile`,
          error: (error) =>
            error instanceof Error ? error.message : "Failed to unlink modpack",
        },
      );
    } finally {
      setIsUnlinking(false);
    }
  };

  return (
    <div className="space-y-4 select-none">
      <SettingsSection>
        <SectionHeader
          icon="solar:shield-check-bold"
          title="Repair profile"
          description="Repairs the profile installation by redownloading missing or corrupted files."
        />
        <Button
          onClick={handleRepair}
          disabled={isRepairing || isUnlinking}
          variant="secondary"
          size="md"
          icon={<Icon icon="solar:shield-check-bold" className="h-4 w-4" />}
        >
          {isRepairing ? "Repairing..." : "Repair profile"}
        </Button>
      </SettingsSection>

      {profile.modpack_info ? (
        <SettingsSection>
          <SectionHeader
            icon="solar:link-broken-bold"
            title="Convert to custom profile"
            description="Unlink this profile from its modpack to customize mods freely. You will lose automatic modpack update tracking and version switching."
          />
          <Button
            onClick={handleUnlinkModpack}
            disabled={isRepairing || isUnlinking}
            variant="danger"
            size="md"
            icon={<Icon icon="solar:link-broken-bold" className="h-4 w-4" />}
          >
            {isUnlinking ? "Unlinking..." : "Unlink modpack"}
          </Button>
        </SettingsSection>
      ) : null}

      {confirmDialog}
    </div>
  );
}
