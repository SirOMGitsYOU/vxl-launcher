"use client";

import { Icon } from "@iconify/react";
import { Card, IconButton, Badge } from "../ui-v2";
import { openExternalUrl } from "../../services/tauri-service";

interface CreditLink {
  url: string;
  icon: string;
  title: string;
}

interface CreditEntry {
  name: string;
  alias?: string;
  role: string;
  icon: string;
  links: CreditLink[];
}

const CREDITS: CreditEntry[] = [
  {
    name: "NoRisk & LiquidBounce",
    role: "Base Code",
    icon: "solar:server-bold",
    links: [
      {
        url: "https://github.com/NoRiskClient/noriskclient-launcher",
        icon: "solar:global-bold",
        title: "NoRisk Source Code",
      },
      {
        url: "https://github.com/CCBlueX/LiquidLauncher",
        icon: "solar:global-bold",
        title: "LiquidBounce Source Code",
      },
    ],
  },
  {
    name: "Voxel Studios",
    role: "Frontend, UI, Code & API",
    icon: "solar:server-bold",
    links: [
      {
        url: "https://github.com/VicariousNetwork/vxl-launcher",
        icon: "solar:global-bold",
        title: "VXL Launcher Source Code",
      },
      {
        url: "https://vxl.to/discord",
        icon: "ic:baseline-discord",
        title: "VXL Studios Discord",
      },
    ],
  },
];

async function handleOpenUrl(url: string) {
  try {
    await openExternalUrl(url);
  } catch (error) {
    console.error("Failed to open external URL:", error);
  }
}

export function CreditsContent() {
  return (
    <div className="space-y-3">
      {CREDITS.map((credit) => (
        <Card key={credit.name} className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[rgba(var(--accent-rgb),0.2)] bg-[rgba(var(--accent-rgb),0.08)]">
                <Icon icon={credit.icon} className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold text-white">{credit.name}</span>
                  {credit.alias ? (
                    <span className="text-xs text-[var(--text-secondary)]">{credit.alias}</span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Badge tone="muted" className="hidden sm:inline-flex">
                {credit.role}
              </Badge>
              {credit.links.map((link) => (
                <IconButton
                  key={link.url}
                  size="sm"
                  title={link.title}
                  aria-label={link.title}
                  onClick={() => handleOpenUrl(link.url)}
                >
                  <Icon icon={link.icon} className="h-4 w-4" />
                </IconButton>
              ))}
            </div>
          </div>

          <div className="mt-3 sm:hidden">
            <Badge tone="muted">{credit.role}</Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
