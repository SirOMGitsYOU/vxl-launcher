"use client";

import type React from "react";
import type { Profile } from "../../types/profile";
import ProfileIcon from "./ProfileIcon";
import { useThemeStore } from "../../store/useThemeStore";
import { cn } from "../../lib/utils";

interface ProfileIconV2Props {
  profile: Profile;
  size?: "sm" | "md" | "lg";
  className?: string;
  tone?: "accent" | "neutral";
}

export function ProfileIconV2({
  profile,
  size = "md",
  className = "",
  tone = "accent",
}: ProfileIconV2Props) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const isNeutral = tone === "neutral";

  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-14 h-14",
    lg: "w-[72px] h-[72px]",
  };

  const iconSizes = {
    sm: "w-6 h-6",
    md: "w-7 h-7",
    lg: "w-9 h-9",
  };

  return (
    <div
      className={cn(
        sizeClasses[size],
        "flex items-center justify-center overflow-hidden rounded-xl border",
        isNeutral
          ? "border-[var(--surface-border)] bg-[var(--surface-base)]"
          : "border-2",
        className,
      )}
      style={
        isNeutral
          ? undefined
          : {
              backgroundColor: `${accentColor.value}20`,
              borderColor: `${accentColor.value}60`,
            }
      }
    >
      <ProfileIcon
        profileId={profile.id}
        banner={profile.banner}
        profileName={profile.name}
        accentColor={accentColor.value}
        onSuccessfulUpdate={() => {}}
        isEditable={false}
        variant="bare"
        className="h-full w-full"
        placeholderIcon="ph:package-duotone"
        iconClassName={iconSizes[size]}
      />
    </div>
  );
}
