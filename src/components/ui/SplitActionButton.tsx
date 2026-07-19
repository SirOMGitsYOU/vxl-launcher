"use client";

import type React from "react";
import { useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";

export interface SplitActionButtonProps {
  label: string;
  icon: string;
  iconClassName?: string;
  menuIcon?: string;
  menuIconClassName?: string;
  menuTooltip?: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
  disabled?: boolean;
  menuDisabled?: boolean;
  className?: string;
  onPrimaryClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMenuClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export function SplitActionButton({
  label,
  icon,
  iconClassName = "",
  menuIcon = "solar:alt-arrow-down-bold",
  menuIconClassName = "",
  menuTooltip,
  variant = "primary",
  size = "sm",
  disabled = false,
  menuDisabled = false,
  className,
  onPrimaryClick,
  onMenuClick,
}: SplitActionButtonProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const isSecondary = variant === "secondary";
  const menuIsDisabled = disabled || menuDisabled;
  const [primaryHovered, setPrimaryHovered] = useState(false);
  const [menuHovered, setMenuHovered] = useState(false);

  const getPrimarySegmentStyle = (hovered: boolean): React.CSSProperties => ({
    backgroundColor: hovered ? accentColor.value : `${accentColor.value}33`,
    boxShadow: hovered ? `inset 0 0 0 1px ${accentColor.value}` : undefined,
  });

  const getSecondarySegmentStyle = (hovered: boolean): React.CSSProperties | undefined =>
    hovered
      ? {
          backgroundColor: "var(--surface-base)",
          boxShadow: "inset 0 0 0 1px var(--surface-border-strong)",
        }
      : undefined;

  const sizeClasses =
    size === "sm"
      ? {
          root: "h-8 text-xs",
          primary: "px-2.5 gap-1.5",
          menu: "w-8",
          icon: "w-3 h-3",
          menuIcon: "w-3.5 h-3.5",
        }
      : {
          root: "h-10 text-sm",
          primary: "px-3 gap-2",
          menu: "w-10",
          icon: "w-4 h-4",
          menuIcon: "w-4 h-4",
        };

  const handlePrimaryClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!disabled && onPrimaryClick) onPrimaryClick(e);
  };

  const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!menuIsDisabled && onMenuClick) onMenuClick(e);
  };

  return (
    <div
      className={cn(
        "inline-flex overflow-hidden rounded-lg border transition-all duration-200",
        isSecondary
          ? "border-[var(--surface-border)]"
          : "text-white",
        disabled && "opacity-50",
        className,
      )}
      style={
        isSecondary
          ? undefined
          : {
              borderColor: `${accentColor.value}60`,
            }
      }
    >
      <button
        type="button"
        disabled={disabled}
        onClick={handlePrimaryClick}
        onMouseEnter={() => !disabled && setPrimaryHovered(true)}
        onMouseLeave={() => setPrimaryHovered(false)}
        className={cn(
          "inline-flex items-center font-medium transition-all duration-150",
          sizeClasses.root,
          sizeClasses.primary,
          isSecondary
            ? "bg-[var(--surface-overlay)] text-[var(--text-secondary)] hover:text-white"
            : "text-white",
          disabled && "cursor-not-allowed",
        )}
        style={
          isSecondary
            ? getSecondarySegmentStyle(primaryHovered)
            : getPrimarySegmentStyle(primaryHovered)
        }
      >
        <Icon icon={icon} className={cn(sizeClasses.icon, iconClassName)} />
        <span>{label}</span>
      </button>

      <div
        className={cn(
          "w-px self-stretch",
          isSecondary ? "bg-[var(--surface-border)]" : "bg-white/10",
        )}
        style={!isSecondary ? { backgroundColor: `${accentColor.value}40` } : undefined}
      />

      <button
        type="button"
        disabled={menuIsDisabled}
        onClick={handleMenuClick}
        title={menuTooltip}
        onMouseEnter={() => !menuIsDisabled && setMenuHovered(true)}
        onMouseLeave={() => setMenuHovered(false)}
        className={cn(
          "inline-flex items-center justify-center transition-all duration-150",
          sizeClasses.root,
          sizeClasses.menu,
          isSecondary
            ? "bg-[var(--surface-overlay)] text-[var(--text-secondary)] hover:text-white"
            : "text-white",
          menuIsDisabled && "cursor-not-allowed",
        )}
        style={
          isSecondary
            ? getSecondarySegmentStyle(menuHovered)
            : getPrimarySegmentStyle(menuHovered)
        }
      >
        <Icon icon={menuIcon} className={cn(sizeClasses.menuIcon, menuIconClassName)} />
      </button>
    </div>
  );
}
