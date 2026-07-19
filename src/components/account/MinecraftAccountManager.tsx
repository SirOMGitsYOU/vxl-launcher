"use client";

import { Icon } from "@iconify/react";
import { Modal } from "../ui/Modal";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  LoadingState,
} from "../ui-v2";
import { useMinecraftAccountActions } from "../../hooks/useMinecraftAccountActions";
import { AccountSwitcherPanel } from "./AccountSwitcherPanel";

interface MinecraftAccountManagerProps {
  onClose: () => void;
}

export function MinecraftAccountManager({ onClose }: MinecraftAccountManagerProps) {
  const {
    accounts,
    activeAccount,
    isLoading,
    error,
    handleAddAccount,
    handleSetActive,
    handleRemoveAccount,
  } = useMinecraftAccountActions();

  return (
    <Modal
      title="Minecraft Accounts"
      onClose={onClose}
      width="lg"
      footer={
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleAddAccount}
            disabled={isLoading}
            icon={
              isLoading ? (
                <Icon icon="solar:refresh-bold" className="h-4 w-4 animate-spin" />
              ) : (
                <Icon icon="solar:add-circle-bold" className="h-4 w-4" />
              )
            }
            size="sm"
          >
            {isLoading ? "Processing..." : "Add Account"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 px-6 py-5">
        {error && <Alert tone="error">{error}</Alert>}

        <p className="text-sm text-[var(--text-secondary)]">
          Add, remove, or set the active Minecraft account used when launching the game.
        </p>

        <Card className="overflow-hidden">
          <div className="border-b border-[var(--surface-border)] px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Your accounts</h3>
          </div>
          <div className="custom-scrollbar max-h-[40vh] overflow-y-auto">
            {isLoading && accounts.length === 0 ? (
              <LoadingState message="Loading accounts..." />
            ) : accounts.length === 0 ? (
              <EmptyState
                icon="solar:user-cross-bold"
                title="No accounts found"
                description="Add a Minecraft account to get started"
              />
            ) : (
              <AccountSwitcherPanel
                open
                onOpenChange={() => undefined}
                accounts={accounts}
                activeAccount={activeAccount}
                isLoading={isLoading}
                onSetActive={handleSetActive}
                onRemoveAccount={handleRemoveAccount}
                onAddAccount={handleAddAccount}
                mode="list"
              />
            )}
          </div>
        </Card>
      </div>
    </Modal>
  );
}
