"use client";

import { Icon } from "@iconify/react";
import { Button } from "./Button";

export interface ToolbarAction {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
}

interface ToolbarActionsProps {
  actions: ToolbarAction[];
}

export function ToolbarActions({ actions }: ToolbarActionsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {actions.map((action) => (
        <Button
          key={action.id}
          variant="secondary"
          size="sm"
          onClick={action.onClick}
          icon={<Icon icon={action.icon} className="w-4 h-4" />}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
