"use client";

import React, { useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import type { Profile } from "../../types/profile";
import { Dropdown } from "./dropdown/Dropdown";
import { DropdownItem } from "./dropdown/DropdownItem";

export interface ContextMenuItem {
  /** Unique identifier for the menu item */
  id: string;
  /** Label text to display */
  label: string;
  /** Icon to display */
  icon: string;
  /** Whether this is a destructive action (like delete) */
  destructive?: boolean;
  /** Whether to show a separator before this item */
  separator?: boolean;
  /** Whether this item is disabled */
  disabled?: boolean;
  /** Click handler */
  onClick: (profile: Profile) => void;
}

export interface SettingsContextMenuProps {
  /** The profile this menu is for */
  profile: Profile;
  /** Whether the menu is visible */
  isOpen: boolean;
  /** Position coordinates (used when no trigger ref is provided) */
  position: { x: number; y: number };
  /** Menu items to display */
  items: ContextMenuItem[];
  /** Close handler */
  onClose: () => void;
  /** Optional ref to the button that triggers this menu */
  triggerButtonRef?: React.RefObject<HTMLElement>;
}

function ContextMenuPanel({
  profile,
  items,
  onClose,
}: {
  profile: Profile;
  items: ContextMenuItem[];
  onClose: () => void;
}) {
  return (
    <div className="py-1">
      {items.map((item) => (
        <React.Fragment key={item.id}>
          {item.separator ? (
            <div className="mx-2 my-1 h-px bg-[var(--surface-border)]" />
          ) : null}

          <DropdownItem
            onClick={() => {
              if (!item.disabled) {
                item.onClick(profile);
                onClose();
              }
            }}
            icon={
              <Icon
                icon={item.icon}
                className={cn(
                  "h-4 w-4",
                  item.disabled
                    ? "text-[var(--text-muted)]"
                    : item.destructive
                      ? "text-red-400"
                      : "text-[var(--text-muted)]",
                )}
              />
            }
            className={cn(
              "py-2.5 text-sm normal-case tracking-normal",
              item.disabled && "cursor-not-allowed opacity-50",
              item.destructive && "text-red-400 hover:bg-red-500/10 hover:text-red-300",
            )}
          >
            {item.label}
          </DropdownItem>
        </React.Fragment>
      ))}
    </div>
  );
}

export function SettingsContextMenu({
  profile,
  isOpen,
  position,
  items,
  onClose,
  triggerButtonRef,
}: SettingsContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (triggerButtonRef) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }

      onClose();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isOpen, onClose, triggerButtonRef]);

  if (triggerButtonRef) {
    return (
      <Dropdown
        isOpen={isOpen}
        onClose={onClose}
        triggerRef={triggerButtonRef}
        width={220}
        ariaLabel="Profile options"
      >
        <ContextMenuPanel profile={profile} items={items} onClose={onClose} />
      </Dropdown>
    );
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="absolute z-50 min-w-[220px] overflow-hidden rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] shadow-lg"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <ContextMenuPanel profile={profile} items={items} onClose={onClose} />
    </div>
  );
}
