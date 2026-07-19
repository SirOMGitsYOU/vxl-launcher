"use client";

import React from "react";
import { Icon } from "@iconify/react";

export interface ActionButton {
  /** Unique identifier for the button */
  id: string;
  /** Label text to display */
  label: string | null;
  /** Icon to display */
  icon: string;
  /** Optional tooltip text */
  tooltip?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Click handler */
  onClick: () => void;
}

export interface ActionButtonsProps {
  /** Array of action button configurations */
  actions: ActionButton[];
  /** Additional CSS classes */
  className?: string;
  /** Refs for specific buttons by their id */
  buttonRefs?: Record<string, React.RefObject<HTMLButtonElement>>;
}

export function ActionButtons({
  actions,
  className = "",
  buttonRefs,
}: ActionButtonsProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {actions.map((action) => {
        const isIconOnly = !action.label || action.label.trim() === "";
        return (
          <button
            key={action.id}
            ref={buttonRefs?.[action.id]}
            onClick={action.onClick}
            className={`flex items-center ${isIconOnly ? 'justify-center w-8 h-8 p-[1em]' : 'gap-2 px-4 py-2'} bg-[var(--surface-overlay)] text-[var(--text-secondary)] hover:text-white border border-[var(--surface-border)] hover:border-[var(--surface-border-strong)] rounded-lg text-sm font-medium transition-all duration-200`}
            title={action.tooltip}
            disabled={action.disabled}
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <Icon icon={action.icon} className="w-4 h-4" />
            </div>
            {!isIconOnly && (
              <span style={{ transform: 'translateY(-0.075em)' }}>{action.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
