"use client";

import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";
import { SkinViewer } from "../launcher/SkinViewer";
import { useThemeStore } from "../../store/useThemeStore";
import { MinecraftSkinService } from "../../services/minecraft-skin-service";
import type { GetStarlightSkinRenderPayload } from "../../types/localSkin";
import { localFileToDisplayUrl } from "../../utils/local-file-url";
import { useProfileStore } from "../../store/profile-store";
import { ProfileCardV2 } from "../profiles/ProfileCardV2";
import { PlayLaunchControl } from "./PlayLaunchControl";

import { getDefaultFullbodyRenderUrl, getFullbodyRenderUrl } from "../../lib/avatar-utils";

const DEFAULT_FALLBACK_SKIN_URL = getDefaultFullbodyRenderUrl();
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

export function PlayHero({
  playerName,
  launchButtonDefaultVersion,
  onLaunchVersionChange,
  launchButtonVersions,
  className,
}: PlayHeroProps) {
  const featureMode = useThemeStore((state) => state.featureMode);
  const setFeatureMode = useThemeStore((state) => state.setFeatureMode);
  const [resolvedSkinUrl, setResolvedSkinUrl] = useState<string>(DEFAULT_FALLBACK_SKIN_URL);
  const [fallbackSkinUrl, setFallbackSkinUrl] = useState<string>(DEFAULT_FALLBACK_SKIN_URL);

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

  useEffect(() => {
    const fetchAndSetSkin = async () => {
      const remoteFallback = playerName
        ? getFullbodyRenderUrl(playerName)
        : DEFAULT_FALLBACK_SKIN_URL;
      setFallbackSkinUrl(remoteFallback);

      if (playerName) {
        try {
          const payload: GetStarlightSkinRenderPayload = {
            player_name: playerName,
            render_type: "fullbody",
            render_view: "full",
          };
          const localPath = await MinecraftSkinService.getStarlightSkinRender(payload);
          if (localPath) {
            setResolvedSkinUrl(await localFileToDisplayUrl(localPath));
          } else {
            setResolvedSkinUrl(remoteFallback);
          }
        } catch {
          setResolvedSkinUrl(remoteFallback);
        }
      } else {
        setResolvedSkinUrl(DEFAULT_FALLBACK_SKIN_URL);
      }
    };

    fetchAndSetSkin();
  }, [playerName]);

  const skinViewerDisplayHeight = 420;
  const skinViewerMaxDisplayWidth = 220;

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

      <h2 className="text-3xl font-semibold tracking-tight text-white mb-6 text-center">
        {playerName || "No account"}
      </h2>

      <div className="relative w-full flex flex-col items-center">
        <SkinViewer
          skinUrl={resolvedSkinUrl}
          fallbackSkinUrl={fallbackSkinUrl}
          playerName={playerName?.toString()}
          width={skinViewerMaxDisplayWidth}
          height={skinViewerDisplayHeight}
          className="bg-transparent flex-shrink-0"
          style={{
            filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.45))",
            height: `${skinViewerDisplayHeight}px`,
            width: "auto",
            maxWidth: `${skinViewerMaxDisplayWidth}px`,
          }}
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
