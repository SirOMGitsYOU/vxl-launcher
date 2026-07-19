"use client";

import { Icon } from "@iconify/react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
}

export function EmptyState({ icon = "solar:box-minimalistic-linear", title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[240px] text-center px-6">
      <Icon icon={icon} className="w-10 h-10 text-[var(--text-muted)] mb-3" />
      <p className="text-white font-medium">{title}</p>
      {description && (
        <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-sm">{description}</p>
      )}
    </div>
  );
}
