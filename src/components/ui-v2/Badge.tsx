"use client";

import type React from "react";
import { cn } from "../../lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "default" | "accent" | "muted";
}

export function Badge({ className, tone = "muted", children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide border",
        tone === "accent" &&
          "border-[var(--accent)]/30 bg-[rgba(var(--accent-rgb),0.12)] text-[var(--accent)]",
        tone === "muted" &&
          "border-[var(--surface-border)] bg-[var(--surface-base)] text-[var(--text-secondary)]",
        tone === "default" &&
          "border-[var(--surface-border-strong)] bg-[var(--surface-overlay)] text-white",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
