"use client";

import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { useMojangServiceStatus } from "../../hooks/useMojangServiceStatus";
import type { MonitoredServiceCheckStatus } from "../../types/mojang-status";

function statusLabel(status: MonitoredServiceCheckStatus): string {
  switch (status) {
    case "loading":
      return "Checking";
    case "up":
      return "Online";
    case "down":
      return "Offline";
    default:
      return "Unknown";
  }
}

function ServiceStatusRow({
  label,
  status,
}: {
  label: string;
  status: MonitoredServiceCheckStatus;
}) {
  const isDown = status === "down";
  const isUp = status === "up";
  const isLoading = status === "loading";

  return (
    <div
      className={cn(
        "flex items-center justify-between text-[10px] uppercase tracking-wide",
        isDown ? "text-red-300" : "text-[var(--text-muted)]",
      )}
    >
      <span className="truncate pr-2">{label}</span>
      <span
        className={cn(
          "flex shrink-0 items-center gap-1.5",
          isUp && "text-emerald-400",
          isDown && "text-red-300",
        )}
      >
        {isLoading ? (
          <Icon icon="solar:refresh-bold" className="h-3 w-3 animate-spin" />
        ) : (
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              isUp && "bg-emerald-400",
              isDown && "bg-red-400 animate-pulse",
              !isUp && !isDown && "bg-[var(--text-muted)]",
            )}
          />
        )}
        {statusLabel(status)}
      </span>
    </div>
  );
}

export function MojangStatusIndicator() {
  const { state } = useMojangServiceStatus();
  const hasDownService = state.services.some((service) => service.status === "down");

  return (
    <div
      className={cn(
        "w-full select-none rounded-md px-1 py-1",
        hasDownService && "border border-red-500/30 bg-red-500/10",
      )}
      title={
        state.fetchError ??
        (state.checkedAt ? `Last checked ${new Date(state.checkedAt).toLocaleString()}` : undefined)
      }
    >
      <div className="space-y-1">
        {state.services.map((service) => (
          <ServiceStatusRow key={service.id} label={service.label} status={service.status} />
        ))}
      </div>
    </div>
  );
}
