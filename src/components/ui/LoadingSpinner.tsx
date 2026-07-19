"use client";

import type React from "react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";
import { Logo } from "./Logo";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
  variant?:
    | "default"
    | "secondary"
    | "warning"
    | "destructive"
    | "info"
    | "success";
  message?: string;
  showMessage?: boolean;
  shadowDepth?: "default" | "short" | "none";
}

const sizeConfig = {
  xs: { logo: "w-8 h-8", gap: "gap-1.5", text: "text-[10px]" },
  sm: { logo: "w-10 h-10", gap: "gap-2", text: "text-xs" },
  md: { logo: "w-12 h-12", gap: "gap-2.5", text: "text-sm" },
  lg: { logo: "w-16 h-16", gap: "gap-3", text: "text-sm" },
  xl: { logo: "w-20 h-20", gap: "gap-3", text: "text-base" },
  xxl: { logo: "w-24 h-24", gap: "gap-3.5", text: "text-base" },
} as const;

/** Animated VXL logo used as the loading indicator. */
export function SpinnerRing({
  size = "md",
  className,
}: {
  size?: LoadingSpinnerProps["size"];
  variant?: LoadingSpinnerProps["variant"];
  className?: string;
}) {
  const config = sizeConfig[size ?? "md"];

  return (
    <div className={cn("flex items-center justify-center", className)} role="status" aria-label="Loading">
      <Logo forceAnimate size="sm" className={config.logo} />
    </div>
  );
}

export const LoadingSpinner = forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  (
    {
      size = "md",
      message,
      showMessage = true,
      className,
      shadowDepth = "short",
      ...props
    },
    ref,
  ) => {
    const config = sizeConfig[size];
    const framed = shadowDepth !== "none";

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center",
          config.gap,
          framed &&
            "rounded-xl border border-[var(--surface-border)] bg-[var(--surface-overlay)]/90 px-4 py-3 backdrop-blur-sm",
          className,
        )}
        {...props}
      >
        <SpinnerRing size={size} />

        {showMessage && message && (
          <p className={cn("text-center text-[var(--text-secondary)]", config.text)}>
            {message}
          </p>
        )}
      </div>
    );
  },
);

LoadingSpinner.displayName = "LoadingSpinner";
