"use client";

import type React from "react";
import { forwardRef } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import type { ComponentSize, ComponentVariant } from "./design-system";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  icon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  error?: string;
  size?: ComponentSize;
  variant?: ComponentVariant;
  label?: string;
  description?: string;
}

// Neue SearchWithFilters-Style Input Komponente
export interface SearchStyleInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  placeholder?: string;
  icon?: string;
  error?: string;
}

export const SearchStyleInput = forwardRef<HTMLInputElement, SearchStyleInputProps>(
  ({ className, placeholder = "Enter name for new profile", icon, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="flex items-center gap-2 bg-[var(--surface-overlay)] rounded-xl px-4 py-3 border border-[var(--surface-border)] hover:border-[var(--surface-border-strong)] transition-colors">
          {icon && (
            <Icon icon={icon} className="w-4 h-4 text-white/50 flex-shrink-0" />
          )}
          <input
            ref={ref}
            type="text"
            placeholder={placeholder}
            className={cn(
              "bg-transparent text-white placeholder:text-[var(--text-muted)] text-sm flex-1 outline-none",
              className
            )}
            spellCheck={false}
            autoComplete="off"
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-400 ">
            {error}
          </p>
        )}
      </div>
    );
  }
);

SearchStyleInput.displayName = "SearchStyleInput";

// SearchStyleTextArea - für mehrzeilige Eingaben im SearchStyle Design
export interface SearchStyleTextAreaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> {
  placeholder?: string;
  icon?: string;
  error?: string;
  minHeight?: string;
}

export const SearchStyleTextArea = forwardRef<HTMLTextAreaElement, SearchStyleTextAreaProps>(
  ({ className, placeholder = "Enter text...", icon, error, minHeight = "100px", ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="flex items-start gap-2 bg-[var(--surface-overlay)] rounded-lg px-4 py-3 border border-[var(--surface-border)] hover:border-[var(--surface-border-strong)] transition-colors">
          {icon && (
            <Icon icon={icon} className="w-4 h-4 text-white/50 flex-shrink-0 mt-1" />
          )}
          <textarea
            ref={ref}
            placeholder={placeholder}
            className={cn(
              "bg-transparent text-white placeholder:text-[var(--text-muted)] text-sm flex-1 outline-none resize-none",
              className
            )}
            style={{ minHeight }}
            spellCheck={false}
            autoComplete="off"
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-400 ">
            {error}
          </p>
        )}
      </div>
    );
  }
);

SearchStyleTextArea.displayName = "SearchStyleTextArea";

/** Delegates to ui-v2 styling with legacy icon/clearable/error API. */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      icon,
      clearable = false,
      onClear,
      error,
      label,
      description,
      size: _size,
      variant: _variant,
      ...props
    },
    ref,
  ) => {
    const handleClear = () => {
      if (onClear) {
        onClear();
      } else if (props.onChange) {
        const event = {
          target: { value: "" },
        } as React.ChangeEvent<HTMLInputElement>;
        props.onChange(event);
      }
    };

    return (
      <div className="w-full">
        {label && (
          <label className="mb-1 block text-sm text-[var(--text-secondary)]">{label}</label>
        )}
        <div
          className={cn(
            "flex h-9 items-center overflow-hidden rounded-lg border bg-[var(--surface-overlay)]",
            error
              ? "border-red-500"
              : "border-[var(--surface-border)] focus-within:border-[var(--accent)]/50",
            props.disabled && "cursor-not-allowed opacity-50",
            className,
          )}
        >
          {icon && (
            <div className="flex h-full w-10 items-center justify-center text-[var(--text-muted)]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className="h-full flex-1 border-none bg-transparent px-3 text-sm text-white outline-none placeholder:text-[var(--text-muted)]"
            spellCheck={false}
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${props.id}-error` : undefined}
            {...props}
          />
          {clearable && props.value && (
            <button
              type="button"
              onClick={handleClear}
              className="flex h-full w-10 items-center justify-center text-white transition-opacity hover:opacity-80"
              tabIndex={-1}
            >
              <Icon icon="solar:close-circle-bold" className="h-4 w-4" />
            </button>
          )}
        </div>
        {description && !error && (
          <p className="mt-1 text-xs text-[var(--text-muted)]">{description}</p>
        )}
        {error && (
          <p id={`${props.id}-error`} className="mt-1 text-sm text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
