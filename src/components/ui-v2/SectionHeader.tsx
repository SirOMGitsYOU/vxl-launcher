"use client";

import type React from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";

interface SectionHeaderProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  icon,
  title,
  description,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("mb-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          {icon && <Icon icon={icon} className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />}
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {description && (
              <p className="text-sm text-[var(--text-secondary)] mt-1">{description}</p>
            )}
          </div>
        </div>
        {action}
      </div>
    </div>
  );
}
