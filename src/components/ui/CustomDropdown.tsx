"use client";

import { SelectMenu, type SelectMenuOption } from "../ui-v2/SelectMenu";
import { cn } from "../../lib/utils";

export interface DropdownOption {
  value: string;
  label: string;
  icon?: string;
}

interface CustomDropdownProps {
  label?: string;
  value: string;
  options: DropdownOption[];
  onChange?: (value: string) => void;
  className?: string;
  variant?: "default" | "search";
  disabled?: boolean;
  placeholder?: string;
}

export function CustomDropdown({
  label,
  value,
  options,
  onChange,
  className = "",
  variant = "default",
  disabled = false,
  placeholder = "Select",
}: CustomDropdownProps) {
  const menuOptions: SelectMenuOption[] = options.map((option) => ({
    value: option.value,
    label: option.label,
    icon: option.icon,
  }));

  return (
    <div className={cn("min-w-0", className)}>
      {label ? (
        <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">{label}</label>
      ) : null}
      <SelectMenu
        value={value}
        onChange={(nextValue) => onChange?.(nextValue)}
        options={menuOptions}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(variant === "search" ? "min-w-[8.5rem]" : "w-full", "h-9")}
      />
    </div>
  );
}
