"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { gsap } from "gsap";
import { 
  getAccessibilityProps
} from "./design-system";

interface TabHeaderProps {
  title: string;
  icon?: string;
  children?: ReactNode;
  className?: string;
  role?: string;
  ariaLabel?: string;
}

export function TabHeader({
  title,
  icon,
  children,
  className,
  role = "banner",
  ariaLabel,
}: TabHeaderProps) {
  const headerRef = useRef<HTMLDivElement>(null);

  const accessibilityProps = getAccessibilityProps({
    label: ariaLabel
  });

  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: -20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
        },
      );
    }
  }, []);
  return (
    <div
      ref={headerRef}
      className={cn(
        "flex-shrink-0 flex flex-col gap-4 px-6 py-5 border-b border-[var(--surface-border)] bg-[var(--surface-raised)]",
        className,
      )}
      role={role}
      {...accessibilityProps}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: "rgba(var(--accent-rgb), 0.12)",
              color: "var(--accent)",
            }}
          >
            <Icon icon={icon} className="w-5 h-5" aria-hidden="true" />
          </div>
        )}
        <h1 className="text-xl font-semibold text-white">{title}</h1>
      </div>
      {children}
    </div>
  );
}
