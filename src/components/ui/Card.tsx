"use client";

import type React from "react";
import { forwardRef, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Card as V2Card } from "../ui-v2/Card";
import type { ComponentVariant } from "./design-system";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: ComponentVariant;
  withAnimation?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  role?: string;
  ariaLabel?: string;
}

/** Delegates to ui-v2 Card with legacy prop compatibility. */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { children, className, variant = "default", onClick, onContextMenu, role, ariaLabel, ...props },
  ref,
) {
  const isFlat = variant === "flat" || variant === "flat-secondary" || variant === "ghost";

  return (
    <V2Card
      ref={ref as React.Ref<HTMLDivElement>}
      interactive={!!onClick}
      className={cn(
        isFlat ? "bg-[var(--surface-overlay)]" : "bg-[var(--surface-raised)]",
        className,
      )}
      onClick={onClick}
      onContextMenu={onContextMenu}
      role={role}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </V2Card>
  );
});
