"use client";

import type React from "react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Icon } from "@iconify/react";

import { VerticalNavbar } from ".././navigation/VerticalNavbar";
import { UserProfileBar } from ".././header/UserProfileBar";
import { useThemeStore } from "../../store/useThemeStore";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { checkUpdateAvailable, downloadAndInstallUpdate } from "../../services/vxl-service";
import type { UpdateInfo } from "../../types/updater";
import { ProfileWizardV2Modal } from "../modals/ProfileWizardV2Modal";
import { ProfileSettingsModal } from "../modals/ProfileSettingsModal";
import { ProfileDuplicateModal } from "../modals/ProfileDuplicateModal";
import { exit } from '@tauri-apps/plugin-process';
import { Tooltip } from "../ui/Tooltip";
import { toast } from 'react-hot-toast';
import { signalFrontendReady } from "../../startup/boot-splash";

const getNavItems = (hasAccount: boolean) => [
  { id: "play", icon: "solar:play-bold", label: "Play" },
  { id: "profiles", icon: "lucide:library", label: "Library" },
  { id: "mods", icon: "mdi:jigsaw", label: "Mods" },
  { id: "vxlstudios", icon: "f7:cube-fill", label: "Voxel Studios" },
  { id: "skins", icon: "temaki:clothes-hanger", label: "Skins", disabled: !hasAccount },
  { id: "capes", icon: "game-icons:cape", label: "Capes", disabled: !hasAccount },
  { id: "settings", icon: "solar:settings-bold", label: "Settings" },
];

interface AppLayoutProps {
  children: ReactNode;
  activeTab: string;
  onNavChange: (tabId: string) => void;
}

export function AppLayout({
  children,
  activeTab,
  onNavChange,
}: AppLayoutProps) {
  const launcherRef = useRef<HTMLDivElement>(null);
  const backgroundPatternRef = useRef<HTMLDivElement>(null);
  const minimizeRef = useRef<HTMLDivElement>(null);
  const maximizeRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLDivElement>(null);
  const { accounts } = useMinecraftAuthStore();
  const hasAccount = accounts && accounts.length > 0;

  useEffect(() => {
    let cancelled = false;

    const markFrontendReady = () => {
      if (!cancelled) {
        signalFrontendReady();
      }
    };

    const fontsReady = document.fonts?.ready ?? Promise.resolve();

    fontsReady
      .catch(() => undefined)
      .finally(() => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(markFrontendReady);
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(launcherRef.current, {
        scale: 0.98,
        duration: 0.45,
        ease: "power3.out",
      });

      if (backgroundPatternRef.current) {
        gsap.to(backgroundPatternRef.current, {
          backgroundPosition: "100% 100%",
          duration: 120,
          repeat: -1,
          ease: "none",
        });
      }
    });

    const setupWindowControls = async () => {
      try {
        const tauriModule = await import("@tauri-apps/api/window").catch(
          () => null,
        );

        if (tauriModule) {
          const { Window } = tauriModule;
          const currentWindow = Window.getCurrent();

          if (minimizeRef.current) {
            minimizeRef.current.addEventListener("click", () =>
              currentWindow.minimize(),
            );
          }

          if (maximizeRef.current) {
            maximizeRef.current.addEventListener("click", () =>
              currentWindow.toggleMaximize(),
            );
          }

          if (closeRef.current) {
            closeRef.current.addEventListener("click", () =>
              exit(0),
            );
          }
        } else {
          console.log(
            "Tauri API not available, window controls will be decorative only",
          );
        }
      } catch (error) {
        console.error("Failed to initialize window controls:", error);
      }
    };

    setupWindowControls();

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={launcherRef}
      className="h-screen w-full overflow-hidden relative flex bg-[var(--surface-base)]"
    >
      <VerticalNavbar
        items={getNavItems(hasAccount)}
        activeItem={activeTab}
        onItemClick={onNavChange}
        className="h-full z-10"
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <HeaderBar
          minimizeRef={minimizeRef}
          maximizeRef={maximizeRef}
          closeRef={closeRef}
        />

        <div className="flex-1 relative overflow-hidden">
          <div className="relative z-10 h-full overflow-hidden custom-scrollbar">
            {children}
          </div>
        </div>
      </div>
      {/* Global Modals Portal */}
      <ProfileWizardV2Modal />
      <ProfileSettingsModal />
      <ProfileDuplicateModal />
    </div>
  );
}

interface HeaderBarProps {
  minimizeRef: React.RefObject<HTMLDivElement>;
  maximizeRef: React.RefObject<HTMLDivElement>;
  closeRef: React.RefObject<HTMLDivElement>;
}

function HeaderBar({ minimizeRef, maximizeRef, closeRef }: HeaderBarProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const [availableUpdate, setAvailableUpdate] = useState<UpdateInfo | null>(null);

  const handleUpdateClick = async () => {
    try {
      await toast.promise(
        downloadAndInstallUpdate(),
        {
          loading: 'Downloading and installing update...',
          success: 'Update installed successfully! Application will restart.',
          error: (err) => {
            const message =
              err instanceof Error
                ? err.message
                : typeof err === "object" &&
                    err !== null &&
                    "message" in err &&
                    typeof (err as { message?: unknown }).message === "string"
                  ? (err as { message: string }).message
                  : String(err);
            return `Update failed: ${message}`;
          },
        }
      );
    } catch (error) {
      console.error("Failed to download and install update:", error);
      // Toast error is already handled by the promise toast
    }
  };

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const updateInfo = await checkUpdateAvailable();
        if (updateInfo) {
          setAvailableUpdate(updateInfo);
        }
      } catch (error) {
        console.error("Failed to check for updates:", error);
      }
    };

    checkForUpdates();

    const updateCheckInterval = setInterval(checkForUpdates, 4 * 60 * 60 * 1000);
    return () => clearInterval(updateCheckInterval);
  }, []);

  return (
    <div
      className="h-14 flex-shrink-0 vxl-border border-x-0 border-t-0 flex items-center px-4 z-10 bg-[var(--surface-raised)]"
      data-tauri-drag-region
    >
      <div className="flex-1 min-w-0" data-tauri-drag-region />

      <div className="flex items-center gap-3 flex-shrink-0">
        {availableUpdate && (
          <Tooltip content={`Click to update: ${availableUpdate.version}`}>
            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
              onClick={handleUpdateClick}
            >
              <Icon
                icon="solar:download-minimalistic-bold"
                className="w-5 h-5"
                style={{ color: accentColor.value }}
              />
            </button>
          </Tooltip>
        )}
        <UserProfileBar />
        <WindowControls
          minimizeRef={minimizeRef}
          maximizeRef={maximizeRef}
          closeRef={closeRef}
        />
      </div>
    </div>
  );
}

interface WindowControlsProps {
  minimizeRef: React.RefObject<HTMLDivElement>;
  maximizeRef: React.RefObject<HTMLDivElement>;
  closeRef: React.RefObject<HTMLDivElement>;
}

function WindowControls({
  minimizeRef,
  maximizeRef,
  closeRef,
}: WindowControlsProps) {
  return (
    <div className="flex items-center gap-1 ml-1">
      <div
        ref={minimizeRef}
        className="titlebar-button-borderless w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        title="Minimize"
      >
        <Icon icon="mdi:window-minimize" className="w-4 h-4" />
      </div>
      <div
        ref={maximizeRef}
        className="titlebar-button-borderless w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        title="Maximize"
      >
        <Icon icon="mdi:window-maximize" className="w-4 h-4" />
      </div>
      <div
        ref={closeRef}
        className="titlebar-button-borderless w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
        title="Close"
      >
        <Icon icon="mdi:close" className="w-4 h-4" />
      </div>
    </div>
  );
}
