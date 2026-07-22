"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { useMinecraftAccountActions } from "../../hooks/useMinecraftAccountActions";
import { AccountSwitcherPanel } from "./AccountSwitcherPanel";

interface AccountSelectorProps {
  className?: string;
}

export function AccountSelector({ className }: AccountSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const {
    accounts,
    activeAccount,
    isLoading,
    handleAddAccount,
    handleSetActive,
    handleRemoveAccount,
  } = useMinecraftAccountActions();

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative z-50", className)}>
      <AccountSwitcherPanel
        open={open}
        onOpenChange={setOpen}
        accounts={accounts}
        activeAccount={activeAccount}
        isLoading={isLoading}
        onSetActive={handleSetActive}
        onRemoveAccount={handleRemoveAccount}
        onAddAccount={handleAddAccount}
      />
    </div>
  );
}
