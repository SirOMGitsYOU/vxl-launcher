"use client";

import { useState } from "react";
import type { Profile } from "../../../types/profile";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import * as ProfileService from "../../../services/profile-service";
import { Button, SectionHeader, SettingsSection } from "../../ui-v2";

interface AdvancedTabProps {
  profile: Profile;
}

export function AdvancedTab({ profile }: AdvancedTabProps) {
  const [isRepairing, setIsRepairing] = useState(false);

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
          disabled={isRepairing}
          variant="secondary"
          size="md"
          icon={<Icon icon="solar:shield-check-bold" className="h-4 w-4" />}
        >
          {isRepairing ? "Repairing..." : "Repair profile"}
        </Button>
      </SettingsSection>
    </div>
  );
}
