"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { listen, type Event as TauriEvent } from "@tauri-apps/api/event";
import { Modal } from "../ui/Modal";
import { Alert, Button } from "../ui-v2";
import { EventType, type EventPayload } from "../../types/events";

interface BrowserLoginModalProps {
  onCancel: () => Promise<void>;
}

export function BrowserLoginModal({ onCancel }: BrowserLoginModalProps) {
  const [loginStatus, setLoginStatus] = useState<string>("Starting login process...");
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unlisten = listen<EventPayload>("state_event", (event: TauriEvent<EventPayload>) => {
      const payload = event.payload;

      if (payload.event_type === EventType.Error && payload.error) {
        setError(payload.error);
        setLoginStatus(payload.message);
        return;
      }

      if (
        payload.event_type === EventType.AccountLoginStarted ||
        payload.event_type === EventType.AccountLoginWaitingForBrowser ||
        payload.event_type === EventType.AccountLoginExchangingToken ||
        payload.event_type === EventType.AccountLoginExchangingXboxToken ||
        payload.event_type === EventType.AccountLoginExchangingXstsToken ||
        payload.event_type === EventType.AccountLoginGettingMinecraftToken ||
        payload.event_type === EventType.AccountLoginCheckingEntitlements ||
        payload.event_type === EventType.AccountLoginFetchingProfile ||
        payload.event_type === EventType.AccountLoginCompleted
      ) {
        setError(null);
        setLoginStatus(payload.message);
        if (payload.progress !== null) {
          setProgress(payload.progress);
        }
      }
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  return (
    <Modal
      title="Browser Login"
      onClose={async () => {
        await onCancel();
      }}
      width="md"
      footer={
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onCancel} size="sm">
            Cancel Login
          </Button>
        </div>
      }
    >
      <div className="space-y-4 px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(var(--accent-rgb),0.12)] text-[var(--accent)]">
            <Icon icon="solar:global-bold" className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Sign in via browser</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              A browser window will open for Microsoft authentication. If it does not open
              automatically, check your browser settings.
            </p>
          </div>
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className={error ? "text-red-300" : "text-[var(--text-secondary)]"}>
              {loginStatus}
            </span>
            {!error && (
              <span className="text-[var(--text-muted)]">{Math.round(progress)}%</span>
            )}
          </div>
          {!error && (
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-base)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
