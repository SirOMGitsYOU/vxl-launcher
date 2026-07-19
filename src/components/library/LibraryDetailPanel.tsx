"use client";

import { Icon } from "@iconify/react";
import type { Profile } from "../../types/profile";
import { ProfileIconV2 } from "../profiles/ProfileIconV2";
import { useProfileLaunch } from "../../hooks/useProfileLaunch";
import {
  DetailPanelBody,
  DetailPanelHero,
  DetailPanelActions,
} from "../layout/DetailPanel";
import { Badge, Button, LaunchButton } from "../ui-v2";

interface LibraryDetailPanelProps {
  profile: Profile;
  onSettings?: (profile: Profile) => void;
  onMods?: (profile: Profile) => void;
  onOpenFolder?: (profile: Profile) => void;
  onDelete?: (profileId: string, profileName: string) => void;
}

function formatLoader(loader: string | undefined) {
  if (!loader) return "Unknown";
  return loader.charAt(0).toUpperCase() + loader.slice(1);
}

export function LibraryDetailPanel({
  profile,
  onSettings,
  onMods,
  onOpenFolder,
  onDelete,
}: LibraryDetailPanelProps) {
  const { handleLaunch, isLaunching, statusMessage } = useProfileLaunch({
    profileId: profile.id,
    profileName: profile.name,
  });

  const meta = [
    profile.game_version && `Minecraft ${profile.game_version}`,
    formatLoader(profile.loader),
    profile.group && profile.group !== "MODPACKS" ? profile.group : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <DetailPanelHero className="h-40 flex items-center justify-center">
        <ProfileIconV2 profile={profile} size="lg" className="scale-150" />
      </DetailPanelHero>

      <DetailPanelBody>
        <div>
          <h3 className="text-lg font-semibold text-white">{profile.name}</h3>
          {meta && (
            <p className="text-sm text-[var(--text-secondary)] mt-1">{meta}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge tone="accent">{formatLoader(profile.loader)}</Badge>
          {profile.game_version && <Badge tone="muted">{profile.game_version}</Badge>}
          {profile.last_played && (
            <Badge tone="default">
              Last played {new Date(profile.last_played).toLocaleDateString()}
            </Badge>
          )}
        </div>

        <LaunchButton
          label="Play"
          sublabel={isLaunching ? statusMessage || "Launching..." : profile.name}
          onLaunch={() => handleLaunch()}
          isLaunching={isLaunching}
          disabled={!profile.id}
          className="w-full max-w-none"
        />
      </DetailPanelBody>

      <DetailPanelActions>
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={() => onSettings?.(profile)}
          icon={<Icon icon="solar:settings-bold" className="w-4 h-4" />}
        >
          Settings
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={() => onMods?.(profile)}
          icon={<Icon icon="solar:widget-4-bold" className="w-4 h-4" />}
        >
          Mods
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenFolder?.(profile)}
          icon={<Icon icon="solar:folder-bold" className="w-4 h-4" />}
          aria-label="Open folder"
        />
        {onDelete && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => onDelete(profile.id, profile.name)}
            icon={<Icon icon="solar:trash-bin-trash-bold" className="w-4 h-4" />}
            aria-label="Delete profile"
          />
        )}
      </DetailPanelActions>
    </>
  );
}
