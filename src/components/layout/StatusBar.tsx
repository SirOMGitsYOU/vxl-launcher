"use client";

import { Icon } from "@iconify/react";
import { useProcessStore } from "../../store/useProcessStore";
import { openUrl } from "@tauri-apps/plugin-opener";

const SOCIAL_LINKS = [
  {
    icon: "mdi:discord",
    label: "Discord",
    url: "https://discord.gg/vxl",
  },
  {
    icon: "mdi:github",
    label: "GitHub",
    url: "https://github.com/VXLStudios",
  },
  {
    icon: "mdi:web",
    label: "Website",
    url: "https://vxlstudios.com",
  },
] as const;

export function StatusBar() {
  const processes = useProcessStore((state) => state.processes);
  const runningCount = processes.filter((p) => {
    const state = p.state;
    return state === "Running" || state === "Starting" || state === "Stopping";
  }).length;

  const statusText =
    runningCount === 0
      ? "No instances running"
      : `${runningCount} instance${runningCount === 1 ? "" : "s"} running`;

  return (
    <div className="h-10 flex-shrink-0 vxl-border border-x-0 border-b-0 flex items-center justify-between px-4 bg-[var(--surface-raised)]">
      <div className="flex-1" />

      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full vxl-border bg-[var(--surface-overlay)] text-xs text-[var(--text-secondary)]">
        <Icon
          icon={runningCount > 0 ? "solar:play-circle-bold" : "solar:check-circle-linear"}
          className="w-4 h-4"
          style={{ color: runningCount > 0 ? "var(--accent)" : undefined }}
        />
        <span>{statusText}</span>
      </div>

      <div className="flex-1 flex items-center justify-end gap-2">
        {SOCIAL_LINKS.map((link) => (
          <button
            key={link.label}
            type="button"
            title={link.label}
            onClick={() => openUrl(link.url).catch(console.error)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors"
          >
            <Icon icon={link.icon} className="w-4 h-4" />
          </button>
        ))}
      </div>
    </div>
  );
}
