"use client";

import type React from "react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-9 px-3 rounded-lg bg-[var(--surface-overlay)] border border-[var(--surface-border)]",
          "text-sm text-white placeholder:text-[var(--text-muted)]",
          "focus:outline-none focus:border-[var(--accent)]/50",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
