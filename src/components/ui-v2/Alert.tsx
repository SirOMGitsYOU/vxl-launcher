"use client";

import type React from "react";
import { cn } from "../../lib/utils";

interface AlertProps {
  tone?: "error" | "info";
  children: React.ReactNode;
  className?: string;
}

export function Alert({ tone = "info", children, className }: AlertProps) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        tone === "error" && "border-red-500/30 bg-red-500/10 text-red-200",
        tone === "info" && "border-[var(--surface-border)] bg-[var(--surface-overlay)] text-[var(--text-secondary)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
