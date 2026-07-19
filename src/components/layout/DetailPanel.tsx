"use client";

import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface DetailPanelProps {
  children?: ReactNode;
  className?: string;
  emptyMessage?: string;
  isEmpty?: boolean;
}

export function DetailPanel({
  children,
  className,
  emptyMessage = "Select an item to view details",
  isEmpty = false,
}: DetailPanelProps) {
  return (
    <aside
      className={cn(
        "w-[340px] flex-shrink-0 h-full vxl-border border-y-0 border-r-0 bg-[var(--surface-raised)] overflow-hidden flex flex-col",
        className,
      )}
    >
      {isEmpty || !children ? (
        <div className="flex-1 flex items-center justify-center p-6 text-center text-sm text-[var(--text-muted)]">
          {emptyMessage}
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto custom-scrollbar">
          {children}
        </div>
      )}
    </aside>
  );
}

interface DetailPanelSectionProps {
  children: ReactNode;
  className?: string;
}

export function DetailPanelHero({ children, className }: DetailPanelSectionProps) {
  return (
    <div className={cn("relative overflow-hidden bg-[var(--surface-overlay)]", className)}>
      {children}
    </div>
  );
}

export function DetailPanelBody({ children, className }: DetailPanelSectionProps) {
  return (
    <div className={cn("shrink-0 p-5 flex flex-col gap-4", className)}>{children}</div>
  );
}

export function DetailPanelActions({ children, className }: DetailPanelSectionProps) {
  return (
    <div className={cn("shrink-0 p-5 pt-0 mt-auto flex items-center gap-2", className)}>
      {children}
    </div>
  );
}
