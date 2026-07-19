"use client";

import type React from "react";
import { forwardRef } from "react";
import { cn } from "../../../lib/utils";
import { IconButton as V2IconButton } from "../../ui-v2/IconButton";
import type { ComponentSize, ComponentVariant } from "../design-system";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ComponentVariant;
  displayVariant?: "button" | "ghost" | "themed-surface";
  size?: ComponentSize;
  icon: React.ReactNode;
  shadowDepth?: "default" | "short" | "none";
  label?: string;
  description?: string;
}

function mapSize(size?: ComponentSize): "sm" | "md" | "lg" {
  if (size === "xs" || size === "sm") return "sm";
  if (size === "lg" || size === "xl") return "lg";
  return "md";
}

function variantClassName(variant?: ComponentVariant): string {
  switch (variant) {
    case "destructive":
      return "bg-red-600/90 text-white border-red-500 hover:bg-red-600";
    case "ghost":
      return "bg-transparent border-transparent hover:bg-[var(--surface-overlay)]/60";
    case "secondary":
    case "flat":
    case "flat-secondary":
      return "bg-[var(--surface-overlay)]";
    default:
      return "";
  }
}

/** @deprecated Import from `../ui-v2` instead. Shim delegates to ui-v2 IconButton. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "default", size = "md", disabled = false, icon, ...props }, ref) => {
    return (
      <V2IconButton
        ref={ref}
        size={mapSize(size)}
        disabled={disabled}
        className={cn(variantClassName(variant), className)}
        {...props}
      >
        {icon}
      </V2IconButton>
    );
  },
);

IconButton.displayName = "IconButton";
