"use client";

import { useEffect, useRef, useState } from "react";
import type { Profile } from "../../../types/profile";
import { Icon } from "@iconify/react";
import { useThemeStore } from "../../../store/useThemeStore";
import { Button } from "../../ui/buttons/Button";
import { gsap } from "gsap";
import { toast } from "react-hot-toast";
import * as ProfileService from "../../../services/profile-service";

interface NRCTabProps {
  profile: Profile;
  editedProfile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
  onRefresh?: () => Promise<Profile>;
}

export function NRCTab({
  profile,
  editedProfile,
  updateProfile,
  onRefresh,
}: NRCTabProps) {
  const [isRepairing, setIsRepairing] = useState(false);
  const isBackgroundAnimationEnabled = useThemeStore(
    (state) => state.isBackgroundAnimationEnabled,
  );
  const tabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isBackgroundAnimationEnabled && tabRef.current) {
      gsap.fromTo(
        tabRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: "power2.out" },
      );
    }
  }, [isBackgroundAnimationEnabled]);

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
    <div ref={tabRef} className="space-y-6 select-none">
      <div className="space-y-6">
        {/* Repair Profile Section */}
        <div className="space-y-3">
          <label className="block text-3xl font-minecraft text-white mb-2 lowercase">
            repair profile
          </label>
          <div className="flex flex-col space-y-2 max-w-xs">
            <p className="text-xs text-white/60 font-minecraft-ten select-none leading-relaxed whitespace-normal break-words overflow-wrap-anywhere">
              Repairs the profile installation by redownloading missing or corrupted files.
            </p>
            <Button
              onClick={handleRepair}
              disabled={isRepairing}
              variant="secondary"
              icon={
                isRepairing ? (
                  <Icon
                    icon="solar:refresh-bold"
                    className="w-4 h-4 animate-spin text-white"
                  />
                ) : (
                  <Icon icon="solar:shield-check-bold" className="w-4 h-4 text-white" />
                )
              }
              size="sm"
              className="text-xl"
            >
              {isRepairing ? "repairing..." : "repair"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
