"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { Button, IconButton } from "../ui-v2";
import { cn } from "../../lib/utils";

export interface ActionButton {
  /** Unique identifier for the button */
  id: string;
  /** Label text to display */
  label: string | null;
  /** Icon to display */
  icon: string;
  /** Button style variant */
  variant?: "primary" | "secondary";
  /** Optional tooltip text */
  tooltip?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Click handler */
  onClick: (event?: React.MouseEvent<HTMLButtonElement>) => void;
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
    <div className={cn("flex items-center gap-2", className)}>
      {actions.map((action) => {
        const isIconOnly = !action.label || action.label.trim() === "";
        const variant = action.variant ?? "secondary";

        if (isIconOnly) {
          return (
            <IconButton
              key={action.id}
              ref={buttonRefs?.[action.id]}
              size="sm"
              onClick={(event) => action.onClick(event)}
              disabled={action.disabled}
              title={action.tooltip}
              aria-label={action.tooltip ?? action.id}
            >
              <Icon icon={action.icon} className="h-4 w-4" />
            </IconButton>
          );
        }

        return (
          <Button
            key={action.id}
            ref={buttonRefs?.[action.id]}
            variant={variant}
            size="sm"
            onClick={(event) => action.onClick(event)}
            disabled={action.disabled}
            title={action.tooltip}
            icon={<Icon icon={action.icon} className="h-4 w-4" />}
          >
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
