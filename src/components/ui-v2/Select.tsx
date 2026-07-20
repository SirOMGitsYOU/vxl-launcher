"use client";

import type React from "react";
import { SelectMenu, type SelectMenuOption } from "./SelectMenu";

function optionsFromChildren(children: React.ReactNode): SelectMenuOption[] {
  const options: SelectMenuOption[] = [];

  for (const child of Array.isArray(children) ? children : [children]) {
    if (!child || typeof child !== "object" || !("props" in child)) continue;
    const props = child.props as {
      value?: string;
      disabled?: boolean;
      children?: React.ReactNode;
    };
    if (props.value === undefined) continue;
    options.push({
      value: String(props.value),
      label: String(props.children ?? props.value),
      disabled: props.disabled,
    });
  }

  return options;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "placeholder"> {
  options?: SelectMenuOption[];
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
}

export function Select({
  className,
  children,
  value,
  onChange,
  options,
  disabled,
  placeholder,
}: SelectProps) {
  const resolvedOptions = options ?? optionsFromChildren(children);

  return (
    <SelectMenu
      value={String(value ?? "")}
      onChange={(nextValue) => {
        onChange?.({
          target: { value: nextValue },
        } as React.ChangeEvent<HTMLSelectElement>);
      }}
      options={resolvedOptions}
      className={className}
      disabled={disabled}
      placeholder={placeholder}
      size={className?.includes("text-xs") || className?.includes("h-8") ? "sm" : "md"}
    />
  );
}
