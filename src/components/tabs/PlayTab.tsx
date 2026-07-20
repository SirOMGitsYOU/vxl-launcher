"use client";

import { useEffect } from "react";
import { ServerSection } from "../servers/ServerSection";
import { ErrorMessage } from "../ui/ErrorMessage";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { useProfileStore } from "../../store/profile-store";
import { PlayHero } from "../play/PlayHero";
import { PlayBackgroundEffect } from "../play/PlayBackgroundEffect";
import { LoadingState } from "../ui-v2";

export function PlayTab() {
  const {
    profiles,
    selectedProfile: storeSelectedProfile,
    loading,
    error: profilesError,
    setSelectedProfile,
  } = useProfileStore();

  const { activeAccount } = useMinecraftAuthStore();

  useEffect(() => {
    if (!storeSelectedProfile && profiles.length > 0) {
      setSelectedProfile(profiles[0]);
    }
  }, [storeSelectedProfile, profiles, setSelectedProfile]);

  const handleVersionChange = (versionId: string) => {
    const profileToSelect = profiles.find((p) => p.id === versionId) || null;
    setSelectedProfile(profileToSelect);
  };

  const versions = profiles.map((profile) => ({
    id: profile.id,
    label: `${profile.name}`,
    icon: profile.loader === "vanilla" ? undefined : profile.loader,
    isCustom: profile.loader !== "vanilla",
    profileId: profile.id,
  }));

  return (
    <div className="flex h-full relative">
      <div className="flex-grow flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0">
          <PlayBackgroundEffect />
        </div>

        <div className="relative z-10">
          {loading ? (
            <LoadingState message="Loading profiles..." />
          ) : (
            <>
              {profilesError && (
                <ErrorMessage
                  message={profilesError || "An unknown error occurred"}
                />
              )}

              <PlayHero
                playerName={
                  activeAccount?.minecraft_username || activeAccount?.username
                }
                launchButtonDefaultVersion={
                  storeSelectedProfile?.id || versions[0]?.id || ""
                }
                onLaunchVersionChange={handleVersionChange}
                launchButtonVersions={versions}
              />
            </>
          )}
        </div>
      </div>

      <ServerSection className="relative z-10 flex-shrink-0 border-l border-[var(--surface-border)] bg-[var(--surface-raised)]" />
    </div>
  );
}
