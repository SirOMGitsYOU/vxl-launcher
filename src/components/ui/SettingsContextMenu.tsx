"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

const MENU_MIN_WIDTH = 220;
const VIEWPORT_PADDING = 8;

function estimateMenuHeight(itemCount: number): number {
  return itemCount * 42 + 12;
}

function clampMenuPosition(
  x: number,
  y: number,
  menuWidth: number,
  menuHeight: number,
): { x: number; y: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = x;
  let top = y;

  if (left + menuWidth + VIEWPORT_PADDING > viewportWidth) {
    left = x - menuWidth;
  }

  if (top + menuHeight + VIEWPORT_PADDING > viewportHeight) {
    top = y - menuHeight;
  }

  left = Math.max(
    VIEWPORT_PADDING,
    Math.min(left, viewportWidth - menuWidth - VIEWPORT_PADDING),
  );
  top = Math.max(
    VIEWPORT_PADDING,
    Math.min(top, viewportHeight - menuHeight - VIEWPORT_PADDING),
  );

  return { x: left, y: top };
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
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    setPortalNode(document.body);
  }, []);

  useEffect(() => {
    if (!isOpen || triggerButtonRef) {
      return;
    }

    setAdjustedPosition(
      clampMenuPosition(
        position.x,
        position.y,
        MENU_MIN_WIDTH,
        estimateMenuHeight(items.length),
      ),
    );
  }, [isOpen, items.length, position, triggerButtonRef]);

  useLayoutEffect(() => {
    if (!isOpen || triggerButtonRef || !menuRef.current) {
      return;
    }

    const rect = menuRef.current.getBoundingClientRect();
    setAdjustedPosition(
      clampMenuPosition(position.x, position.y, rect.width, rect.height),
    );
  }, [isOpen, items, position, triggerButtonRef]);

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

  if (!isOpen || !portalNode) {
    return null;
  }

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[220px] overflow-hidden rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] shadow-lg"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      <ContextMenuPanel profile={profile} items={items} onClose={onClose} />
    </div>,
    portalNode,
  );
}
