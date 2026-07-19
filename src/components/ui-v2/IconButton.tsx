"use client";

import type React from "react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-9 h-9",
  md: "w-10 h-10",
  lg: "w-11 h-11",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg border border-[var(--surface-border)]",
          "bg-[var(--surface-overlay)] text-[var(--text-secondary)]",
          "hover:text-white hover:border-[var(--surface-border-strong)] transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

IconButton.displayName = "IconButton";
