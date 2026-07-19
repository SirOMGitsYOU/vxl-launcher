"use client";

import type React from "react";
import { forwardRef } from "react";
import { cn } from "../../../lib/utils";

interface NavButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label?: string;
  isActive?: boolean;
  isDisabled?: boolean;
}

export const NavButton = forwardRef<HTMLButtonElement, NavButtonProps>(
  (
    {
      className,
      icon,
      label,
      isActive = false,
      isDisabled = false,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "vxl-select-tab relative w-full flex items-center gap-3 px-3 py-2.5 text-sm",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40",
          isActive && "vxl-select-tab-active",
          !isActive && "text-[var(--text-secondary)] hover:text-white hover:bg-[var(--surface-overlay)]/60",
          isDisabled && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-[var(--text-secondary)]",
          className,
        )}
        disabled={isDisabled}
        {...props}
      >
        <span
          className={cn(
            "flex items-center justify-center w-5 h-5 flex-shrink-0",
            isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]",
          )}
        >
          {icon}
        </span>
        {label && (
          <span className={cn("truncate", isActive ? "text-white font-semibold" : "font-medium")}>
            {label}
          </span>
        )}
      </button>
    );
  },
);

NavButton.displayName = "NavButton";
