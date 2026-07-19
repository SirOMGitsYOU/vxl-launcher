"use client";

import type React from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <div className="relative inline-flex min-w-0">
      <select
        className={cn(
          "h-9 w-full min-w-0 appearance-none rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)] pl-3 pr-8",
          "cursor-pointer text-sm text-white focus:border-[var(--accent)]/50 focus:outline-none",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <Icon
        icon="solar:alt-arrow-down-linear"
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]"
      />
    </div>
  );
}
