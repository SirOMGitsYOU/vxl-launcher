"use client";

import { useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

export interface SelectMenuOption {
  value: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

interface SelectMenuProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectMenuOption[];
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  size?: "sm" | "md";
  /** Max height of the menu panel in pixels. Defaults to 240. */
  maxMenuHeight?: number;
}

const sizeClasses = {
  sm: "h-8 text-xs",
  md: "h-9 text-sm",
} as const;

export function SelectMenu({
  value,
  onChange,
  options,
  className,
  disabled = false,
  placeholder = "Select",
  size = "md",
  maxMenuHeight = 240,
}: SelectMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.value === value);

  return (
    <div className={cn("relative inline-flex min-w-0 select-none", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "inline-flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)] pl-3 pr-2",
          "cursor-pointer text-white focus:border-[var(--accent)]/50 focus:outline-none",
          "hover:border-[var(--surface-border-strong)]",
          sizeClasses[size],
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {selected?.icon ? (
            <Icon icon={selected.icon} className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
          ) : null}
          <span className="truncate">{selected?.label ?? placeholder}</span>
        </span>
        <Icon
          icon="solar:alt-arrow-down-linear"
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-[var(--text-muted)] transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        triggerRef={triggerRef}
        width={triggerRef.current?.offsetWidth ?? 160}
      >
        <div
          className="custom-scrollbar overflow-y-auto"
          style={{ maxHeight: maxMenuHeight }}
        >
          {options.map((option) => (
            <DropdownItem
              key={option.value}
              isActive={option.value === value}
              icon={
                option.icon ? (
                  <Icon icon={option.icon} className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                ) : undefined
              }
              onClick={() => {
                if (option.disabled) return;
                onChange(option.value);
                setIsOpen(false);
              }}
              className={cn(
                "py-2 text-sm normal-case tracking-normal",
                option.disabled && "cursor-not-allowed opacity-50",
              )}
            >
              {option.label}
            </DropdownItem>
          ))}
        </div>
      </Dropdown>
    </div>
  );
}
