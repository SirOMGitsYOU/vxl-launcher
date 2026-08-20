"use client";

import { Children, isValidElement, type ReactNode } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../../lib/utils";
import { useThemeStore } from "../../../store/useThemeStore";
import { fuzzyMatch, useSettingsSearch } from "./SettingsSearchContext";

interface SettingsSectionProps {
  id?: string;
  title: string;
  description?: ReactNode;
  icon?: string;
  headerActions?: ReactNode;
  keywords?: string[];
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function SettingsSection({
  id,
  title,
  description,
  icon,
  headerActions,
  keywords,
  children,
  className,
  bodyClassName,
}: SettingsSectionProps) {
  const accentColor = useThemeStore((s) => s.accentColor);
  const query = useSettingsSearch();

  let body: ReactNode = children;

  if (query) {
    const sectionHay = [title, ...(keywords ?? [])].join(" ");
    const sectionMatch = fuzzyMatch(sectionHay, query);

    if (!sectionMatch) {
      const kept = Children.toArray(children).filter((child) => {
        if (!isValidElement(child)) return false;
        const p = child.props as { label?: unknown; searchKeywords?: string[] };
        if (typeof p.label !== "string" && !p.searchKeywords) return false;
        const hay = [
          typeof p.label === "string" ? p.label : "",
          ...(p.searchKeywords ?? []),
        ].join(" ");
        return fuzzyMatch(hay, query);
      });
      if (kept.length === 0) return null;
      body = kept;
    }
  }

  return (
    <section id={id} className={cn("scroll-mt-4", className)}>
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-[var(--surface-border)]">
        <div className="flex items-center gap-2 min-w-0">
          {icon && (
            <Icon
              icon={icon}
              className="w-5 h-5 flex-shrink-0"
              style={{ color: accentColor.value }}
            />
          )}
          <h3
            className="text-lg font-semibold leading-none"
            style={{ color: accentColor.value }}
          >
            {title}
          </h3>
        </div>
        {headerActions && <div className="flex-shrink-0">{headerActions}</div>}
      </div>

      {description && (
        <p className="text-sm text-[var(--text-secondary)] mt-2">{description}</p>
      )}

      <div className={cn("mt-1", bodyClassName)}>{body}</div>
    </section>
  );
}
