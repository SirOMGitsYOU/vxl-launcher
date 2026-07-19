"use client";

import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";

export interface GroupTab {
  /** Unique identifier for the group */
  id: string;
  /** Display name of the group */
  name: string;
  /** Number of items in this group */
  count: number;
  /** Optional icon for the group */
  icon?: string;
}

export interface GroupTabsProps {
  /** Array of group tabs to display */
  groups: GroupTab[];
  /** Currently active group ID */
  activeGroup: string;
  /** Callback when a group is selected */
  onGroupChange: (groupId: string) => void;
  /** Whether to show the "Add Group" button */
  showAddButton?: boolean;
  /** Callback when the "Add Group" button is clicked */
  onAddGroup?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Custom add button text */
  addButtonText?: string;
  /** Custom add button icon */
  addButtonIcon?: string;
}

export function GroupTabs({
  groups,
  activeGroup,
  onGroupChange,
  showAddButton = true,
  onAddGroup,
  className = "",
  addButtonText = "ADD GROUP",
  addButtonIcon = "solar:add-circle-bold",
}: GroupTabsProps) {
  const handleGroupClick = (groupId: string) => {
    onGroupChange(groupId);
  };

  const handleAddGroupClick = () => {
    onAddGroup?.();
  };

  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex items-center gap-2 flex-wrap">
        {groups.map((group) => (
          <button
            key={group.id}
            onClick={() => handleGroupClick(group.id)}
            className={cn(
              "vxl-select-tab px-3 py-1.5 text-sm flex items-center gap-2",
              activeGroup === group.id
                ? "vxl-select-tab-active"
                : "text-[var(--text-secondary)] hover:text-white hover:bg-[var(--surface-overlay)]/60",
            )}
          >
            {group.icon && (
              <Icon icon={group.icon} className="w-4 h-4" />
            )}
            <span>{group.name}</span>
          </button>
        ))}
        
        {/* Add Group Button */}
        {showAddButton && (
          <button
            onClick={handleAddGroupClick}
            className="vxl-select-tab px-3 py-1.5 text-sm flex items-center gap-2 border-dashed text-[var(--text-muted)] hover:text-white hover:border-[var(--surface-border-strong)]"
          >
            <Icon icon={addButtonIcon} className="w-4 h-4" />
            <span>{addButtonText}</span>
          </button>
        )}
      </div>
    </div>
  );
}
