"use client";

import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { useCrafatarAvatar } from "../../hooks/useCrafatarAvatar";

interface CurrentAccountDisplayProps {
  onClick?: () => void;
  className?: string;
  layout?: "header" | "sidebar";
}

export function CurrentAccountDisplay({
  onClick,
  className,
  layout = "header",
}: CurrentAccountDisplayProps) {
  const { activeAccount } = useMinecraftAuthStore();
  const avatarUrl = useCrafatarAvatar({
    uuid: activeAccount?.id,
    overlay: true,
  });

  const baseClasses = cn(
    "relative overflow-hidden transition-all duration-200 cursor-pointer",
    layout === "sidebar"
      ? "flex items-center gap-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-overlay)] p-2.5 hover:border-[var(--surface-border-strong)] hover:bg-[var(--surface-base)]"
      : "flex items-center gap-2.5 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)] px-3 py-2 hover:border-[var(--surface-border-strong)] hover:bg-[var(--surface-base)]",
    className,
  );

  if (!activeAccount) {
    return (
      <button type="button" className={baseClasses} onClick={onClick}>
        <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--surface-border)] bg-[var(--surface-base)]">
          <span className="text-xs text-white">+</span>
        </div>

        <div className="min-w-0 flex-1 text-left">
          <span className="truncate text-sm font-medium text-white">Add account</span>
          {layout === "sidebar" && (
            <p className="text-[11px] text-[var(--text-muted)]">Sign in to play</p>
          )}
        </div>

        <Icon
          icon="solar:alt-arrow-down-bold"
          className="ml-auto h-4 w-4 flex-shrink-0 text-[var(--text-secondary)]"
        />
      </button>
    );
  }

  const username =
    activeAccount.minecraft_username || activeAccount.username || "Unknown";

  return (
    <button type="button" className={baseClasses} onClick={onClick}>
      <div
        className={cn(
          "relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--surface-border)] bg-[var(--surface-base)]",
          layout === "sidebar" ? "h-8 w-8" : "h-7 w-7",
        )}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl || "/placeholder.svg"}
            alt={`${username}'s avatar`}
            className="h-full w-full object-cover pixelated"
            style={{ imageRendering: "pixelated" }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
            }}
          />
        ) : (
          <span className="text-xs text-white">{username.charAt(0).toUpperCase()}</span>
        )}
      </div>

      <div className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-medium text-white" title={username}>
          {username}
        </span>
        {layout === "sidebar" && (
          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--accent)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            Online
          </span>
        )}
      </div>

      <Icon
        icon="solar:alt-arrow-down-bold"
        className="ml-auto h-4 w-4 flex-shrink-0 text-[var(--text-secondary)]"
      />
    </button>
  );
}
