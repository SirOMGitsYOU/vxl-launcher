"use client";

import type React from "react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm gap-2",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-base gap-2.5",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--accent)] text-white border border-[var(--accent)] hover:brightness-110 font-semibold",
  secondary:
    "bg-[var(--surface-overlay)] text-white border border-[var(--surface-border)] hover:border-[var(--surface-border-strong)]",
  ghost:
    "bg-transparent text-[var(--text-secondary)] border border-transparent hover:text-white hover:bg-[var(--surface-overlay)]/60",
  danger:
    "bg-red-600/90 text-white border border-red-500 hover:bg-red-600 font-semibold",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", icon, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg transition-all duration-150",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100",
          sizeClasses[size],
          variantClasses[variant],
          className,
        )}
        {...props}
      >
        {icon}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
