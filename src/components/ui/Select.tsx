"use client";

import type React from "react";
import { SelectMenu, type SelectMenuOption } from "../ui-v2/SelectMenu";

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "themed-surface" | "flat" | "3d";
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  className,
  disabled = false,
}: SelectProps) {
  const menuOptions: SelectMenuOption[] = options.map((option) => ({
    value: option.value,
    label: option.label,
  }));

  return (
    <SelectMenu
      value={value}
      onChange={onChange}
      options={menuOptions}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      size={className?.includes("text-xs") || className?.includes("h-8") ? "sm" : "md"}
    />
  );
}
