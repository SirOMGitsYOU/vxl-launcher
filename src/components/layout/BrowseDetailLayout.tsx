"use client";

import type { ReactNode } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { DetailPanel } from "./DetailPanel";

export interface BrowseFilter {
  id: string;
  label: string;
}

interface BrowseDetailLayoutProps {
  title: string;
  subtitle?: string;
  icon?: string;
  filters?: BrowseFilter[];
  activeFilter?: string;
  onFilterChange?: (filterId: string) => void;
  sortControl?: ReactNode;
  viewToggle?: ReactNode;
  toolbarExtra?: ReactNode;
  footerAction?: ReactNode;
  browseContent: ReactNode;
  detailContent?: ReactNode;
  detailEmpty?: boolean;
  detailEmptyMessage?: string;
  showDetail?: boolean;
  className?: string;
}

export function BrowseDetailLayout({
  title,
  subtitle,
  icon,
  filters,
  activeFilter,
  onFilterChange,
  sortControl,
  viewToggle,
  toolbarExtra,
  footerAction,
  browseContent,
  detailContent,
  detailEmpty,
  detailEmptyMessage,
  showDetail = true,
  className,
}: BrowseDetailLayoutProps) {
  return (
    <div className={cn("h-full flex overflow-hidden", className)}>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-[var(--surface-border)]">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-3 min-w-0">
              {icon && (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: "rgba(var(--accent-rgb), 0.12)",
                    color: "var(--accent)",
                  }}
                >
                  <Icon icon={icon} className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight text-white truncate">{title}</h2>
                {subtitle && (
                  <p className="text-sm text-[var(--text-secondary)] mt-1 leading-snug">{subtitle}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {viewToggle}
              {sortControl}
              {toolbarExtra}
            </div>
          </div>

          {filters && filters.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {filters.map((filter) => {
                const isActive = activeFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => onFilterChange?.(filter.id)}
                    className={cn(
                      "vxl-select-tab px-3.5 py-2 text-sm",
                      isActive
                        ? "vxl-select-tab-active"
                        : "text-[var(--text-secondary)] hover:text-white hover:bg-[var(--surface-overlay)]/60",
                    )}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
          {browseContent}
        </div>

        {footerAction && (
          <div className="px-6 py-4 border-t border-[var(--surface-border)]">
            {footerAction}
          </div>
        )}
      </div>

      {showDetail && (
        <DetailPanel isEmpty={detailEmpty} emptyMessage={detailEmptyMessage}>
          {detailContent}
        </DetailPanel>
      )}
    </div>
  );
}
