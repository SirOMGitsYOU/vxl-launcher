"use client";

import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";
import { useProfileStore } from "../../store/profile-store";
import { ProfileCardV2 } from "../profiles/ProfileCardV2";
import { PlayLaunchControl } from "./PlayLaunchControl";
import { PlayerRig } from "./PlayerRig";

const FEATURED_PROFILE_ID: string | null = "d2332f66-9117-4cf3-b35b-6bac4262f984";

interface PlayHeroProps {
  playerName: string | null | undefined;
  launchButtonDefaultVersion: string;
  onLaunchVersionChange: (versionId: string) => void;
  launchButtonVersions: Array<{
    id: string;
    label: string;
    icon?: string;
    isCustom?: boolean;
    profileId: string;
  }>;
  className?: string;
}

const PLAYER_OUTLINE = { strength: 4, thickness: 3, sensitivity: 0.1 };

export function PlayHero({
  playerName,
  launchButtonDefaultVersion,
  onLaunchVersionChange,
  launchButtonVersions,
  className,
}: PlayHeroProps) {
  const featureMode = useThemeStore((state) => state.featureMode);
  const setFeatureMode = useThemeStore((state) => state.setFeatureMode);

  const { profiles } = useProfileStore();
  const featuredProfile = FEATURED_PROFILE_ID
    ? profiles.find((p) => p.id === FEATURED_PROFILE_ID)
    : null;
  const isLoadingProfiles = profiles.length === 0;

  useEffect(() => {
    if (!FEATURED_PROFILE_ID && featureMode) {
      setFeatureMode(false);
    }
  }, [featureMode, setFeatureMode]);

  const selectedVersionLabel = launchButtonVersions.find(
    (v) => v.id === launchButtonDefaultVersion,
  )?.label;

  return (
    <div className={cn("flex flex-col items-center w-full max-w-xl", className)}>
      {!isLoadingProfiles && featuredProfile && (
        <button
          type="button"
          onClick={() => setFeatureMode(!featureMode)}
          className="mb-4 text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
        >
          {featureMode ? "Switch to main launch" : "Craft Attack modpack"}
        </button>
      )}

      <div className="relative w-full flex flex-col items-center">
        <PlayerRig
          playerName={playerName}
          outline={PLAYER_OUTLINE}
          className="relative flex-shrink-0 mb-2"
        />

        {!isLoadingProfiles && (
          <div className="w-full flex justify-center mt-6 px-4">
            {featureMode && featuredProfile ? (
              <div className="w-full max-w-md">
                <ProfileCardV2 profile={featuredProfile} layoutMode="compact" variant="3d" />
              </div>
            ) : (
              <PlayLaunchControl
                defaultVersion={launchButtonDefaultVersion}
                onVersionChange={onLaunchVersionChange}
                versions={launchButtonVersions}
                selectedVersionLabel={selectedVersionLabel}
                selectedProfileName={selectedVersionLabel}
                className="max-w-md"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
