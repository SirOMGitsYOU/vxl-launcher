"use client";

import type React from "react";
import { cn } from "../../lib/utils";
import { selectTabActive, selectTabBase, selectTabInactive } from "./tokens";

interface SelectTabProps {
  active?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function SelectTab({ active, icon, children, onClick, className }: SelectTabProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={!!active}
      onClick={onClick}
      className={cn(selectTabBase, active ? selectTabActive : selectTabInactive, className)}
    >
      {icon}
      {children}
    </button>
  );
}
