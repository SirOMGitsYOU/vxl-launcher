"use client";

import { Icon } from "@iconify/react";
import type { Profile } from "../../types/profile";
import { ProfileIconV2 } from "../profiles/ProfileIconV2";
import { Card } from "../ui-v2";
import { cn } from "../../lib/utils";

type LibraryCardLayout = "list" | "grid" | "compact";

interface LibraryProfileCardProps {
  profile: Profile;
  selected?: boolean;
  onSelect?: (profile: Profile) => void;
  layout?: LibraryCardLayout;
}

function formatLoader(loader: string | undefined) {
  if (!loader || loader === "vanilla") return "Vanilla";
  if (loader === "neoforge") return "NeoForge";
  return loader.charAt(0).toUpperCase() + loader.slice(1);
}

function formatGroup(group: string) {
  const normalized = group.trim();
  if (!normalized) return null;
  if (normalized.toUpperCase() === "MODPACKS") return null;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

function getLoaderIcon(loader: string | undefined) {
  switch (loader) {
    case "fabric":
      return "/icons/fabric.png";
    case "forge":
      return "/icons/forge.png";
    case "quilt":
      return "/icons/quilt.png";
    case "neoforge":
      return "/icons/neoforge.png";
    default:
      return "/icons/minecraft.png";
  }
}

function formatLastPlayed(lastPlayed: string | null | undefined) {
  if (!lastPlayed) return null;

  const date = new Date(lastPlayed);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
  if (diffInMonths < 12) return `${diffInMonths}mo ago`;
  return `${diffInYears}y ago`;
}

function ProfileMeta({
  profile,
  showLastPlayed = false,
}: {
  profile: Profile;
  showLastPlayed?: boolean;
}) {
  const lastPlayed = showLastPlayed ? formatLastPlayed(profile.last_played) : null;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-secondary)]">
      {profile.game_version && (
        <span className="inline-flex items-center gap-1.5">
          <img src="/icons/minecraft.png" alt="" className="h-3.5 w-3.5 object-contain opacity-90" />
          <span>{profile.game_version}</span>
        </span>
      )}

      {profile.game_version && (
        <span className="hidden h-3 w-px bg-[var(--surface-border-strong)] sm:block" aria-hidden />
      )}

      <span className="inline-flex items-center gap-1.5">
        <img
          src={getLoaderIcon(profile.loader)}
          alt=""
          className="h-3.5 w-3.5 object-contain opacity-90"
        />
        <span>{formatLoader(profile.loader)}</span>
      </span>

      {lastPlayed && (
        <>
          <span className="hidden h-3 w-px bg-[var(--surface-border-strong)] sm:block" aria-hidden />
          <span className="text-[var(--text-muted)]">{lastPlayed}</span>
        </>
      )}
    </div>
  );
}

export function LibraryProfileCard({
  profile,
  selected = false,
  onSelect,
  layout = "list",
}: LibraryProfileCardProps) {
  const isCompact = layout === "compact";
  const groupLabel = profile.group ? formatGroup(profile.group) : null;
  const iconSize = isCompact ? "sm" : "md";

  return (
    <Card
      interactive
      selected={selected}
      onClick={() => onSelect?.(profile)}
      className={cn(
        "group flex items-center overflow-hidden bg-[var(--surface-raised)]",
        isCompact ? "gap-3 p-3" : "gap-4 p-4",
        layout === "grid" && "h-full",
      )}
    >
      <ProfileIconV2 profile={profile} size={iconSize} tone="neutral" className="flex-shrink-0" />

      <div className="min-w-0 flex-1">
        <h3
          className={cn(
            "truncate font-semibold text-white",
            isCompact ? "text-sm" : "text-[15px] leading-snug",
          )}
        >
          {profile.name}
        </h3>

        {groupLabel && (
          <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{groupLabel}</p>
        )}

        <div className={cn(groupLabel ? "mt-1.5" : "mt-1")}>
          <ProfileMeta profile={profile} showLastPlayed={layout === "list"} />
        </div>
      </div>

      {layout === "list" && (
        <Icon
          icon="solar:alt-arrow-right-linear"
          className="ml-1 h-4 w-4 flex-shrink-0 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100"
        />
      )}
    </Card>
  );
}
