import { useState, useEffect, useMemo, useRef } from "react";
import { Icon } from "@iconify/react";
import { invoke } from "@tauri-apps/api/core";
import { listen, emitTo, type UnlistenFn } from "@tauri-apps/api/event";
import { useThemeStore } from "../../store/useThemeStore";
import { useProcessStore, getProcessStatus, ProcessMetrics } from "../../store/useProcessStore";
import { useLaunchStateStore, LaunchState } from "../../store/launch-state-store";
import { ProcessMetadata, ProcessState } from "../../types/processState";
import { EventType } from "../../types/events";
import * as ProcessService from "../../services/process-service";
import { useCrafatarAvatar } from "../../hooks/useCrafatarAvatar";
import {
  isDisplayableRemoteUrl,
  localFileToDisplayUrl,
} from "../../utils/local-file-url";

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

function Tooltip({ text, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
      setIsVisible(true);
    }
  };

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsVisible(false)}
      className="relative"
    >
      {children}
      {isVisible && (
        <div
          className="fixed px-2 py-1 text-xs  bg-black/90 text-white/90 rounded border border-white/20 whitespace-nowrap pointer-events-none z-50"
          style={{
            left: `${position.x}px`,
            top: `${position.y - 32}px`,
            transform: "translateX(-50%)",
          }}
        >
          {text}
          <div
            className="absolute w-2 h-2 bg-black/90 border-b border-r border-white/20 rotate-45"
            style={{
              left: "50%",
              top: "100%",
              transform: "translateX(-50%) translateY(-50%)",
            }}
          />
        </div>
      )}
    </div>
  );
}

type InstanceStatus = "running" | "idle" | "crashed" | "starting" | "stopping";

interface InstanceData {
  id: string;
  profileId: string;
  name: string;
  version: string;
  loader: string;
  loaderVersion?: string;
  status: InstanceStatus;
  modCount: number;
  startTime: number;
  endTime?: number;
  memoryUsage: number;
  memoryMax: number;
  cpuUsage: number;
  profileImageUrl?: string;
  accountUuid?: string;
  accountName?: string;
}

const formatMemory = (bytes: number): string => {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)}GB`;
  }
  return `${Math.round(mb)}MB`;
};

function ProcessProfileImage({
  profileImageUrl,
  alt,
  className,
  fallback,
}: {
  profileImageUrl?: string;
  alt: string;
  className?: string;
  fallback: React.ReactNode;
}) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);

    if (!profileImageUrl) {
      setDisplayUrl(null);
      return;
    }

    if (isDisplayableRemoteUrl(profileImageUrl)) {
      setDisplayUrl(profileImageUrl);
      return;
    }

    let cancelled = false;

    localFileToDisplayUrl(profileImageUrl)
      .then((url) => {
        if (!cancelled) {
          setDisplayUrl(url || null);
          if (!url) setFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDisplayUrl(null);
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profileImageUrl]);

  if (!displayUrl || failed) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={displayUrl}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

const formatElapsedTime = (startTime: number, currentTime: number): string => {
  const elapsed = Math.floor((currentTime - startTime) / 1000);
  if (elapsed < 0) return "0:00";

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const formatElapsedTimeCompact = (startTime: number, currentTime: number): string => {
  const elapsed = Math.floor((currentTime - startTime) / 1000);
  if (elapsed < 0) return "0:00";

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  if (hours >= 1) {
    return `${hours}hr`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

function processToInstance(process: ProcessMetadata, metrics?: ProcessMetrics, endTime?: number): InstanceData {
  const startTimeMs = new Date(process.start_time).getTime();

  return {
    id: process.id,
    profileId: process.profile_id,
    name: process.profile_name || "Unknown Profile",
    version: process.minecraft_version || "Unknown",
    loader: process.modloader?.toLowerCase() || "vanilla",
    loaderVersion: process.modloader_version || undefined,
    status: getProcessStatus(process.state),
    modCount: 0,
    startTime: startTimeMs,
    endTime: endTime,
    memoryUsage: metrics?.memoryBytes || 0,
    memoryMax: 4096 * 1024 * 1024,
    cpuUsage: metrics?.cpuPercent || 0,
    profileImageUrl: process.profile_image_url || undefined,
    accountUuid: process.account_uuid || undefined,
    accountName: process.account_name || undefined,
  };
}

const getLoaderIcon = (loader: string): string => {
  const loaderLower = loader.toLowerCase();
  if (loaderLower === "fabric") return "/icons/fabric.png";
  if (loaderLower === "forge") return "/icons/forge.png";
  if (loaderLower === "neoforge") return "/icons/neoforge.png";
  if (loaderLower === "quilt") return "/icons/quilt.png";
  return "/icons/minecraft.png";
};

const getStatusColor = (status: InstanceStatus): string => {
  switch (status) {
    case "running": return "#22c55e";
    case "starting": return "#eab308";
    case "stopping": return "#f97316";
    case "crashed": return "#ef4444";
    case "idle": return "#6b7280";
    default: return "#6b7280";
  }
};

interface InstanceItemProps {
  instance: InstanceData;
  isSelected: boolean;
  isHovered: boolean;
  currentTime: number;
  accentColor: { value: string };
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
  onOpenProfile: () => void;
  isCompact?: boolean;
  stoppingProcessIds?: Set<string>;
  getProfileState?: (profileId: string) => any;
  finalizeButtonLaunch?: (profileId: string, message?: string) => void;
  addLauncherLog?: (profileId: string, message: string) => void;
  handleStopProcess?: (processId: string) => void;
  handleLaunchProfile?: (profileId: string) => void;
  handleOpenFolder?: (profileId: string) => void;
}

function InstanceItem({
  instance,
  isSelected,
  isHovered,
  currentTime,
  accentColor,
  onSelect,
  onHover,
  onOpenProfile,
  isCompact = false,
  stoppingProcessIds,
  getProfileState,
  finalizeButtonLaunch,
  addLauncherLog,
  handleStopProcess,
  handleLaunchProfile,
  handleOpenFolder,
}: InstanceItemProps) {
  const statusColor = getStatusColor(instance.status);

  if (isCompact) {
    return (
      <Tooltip text={instance.name}>
        <div
          className="relative p-3 rounded-lg bg-[var(--surface-overlay)] border border-[var(--surface-border)] hover:border-[var(--surface-border-strong)] cursor-pointer transition-all duration-200 group"
          style={{
            borderColor: isSelected ? `${accentColor.value}60` : undefined,
            backgroundColor: isSelected ? `${accentColor.value}10` : undefined,
          }}
          onClick={onSelect}
          onMouseEnter={() => onHover(true)}
          onMouseLeave={() => onHover(false)}
        >
          <div className="flex items-center gap-3 mb-2">
          <div
            className="relative w-11 h-11 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 border-2 transition-all duration-200"
            style={{
              backgroundColor: isHovered || isSelected ? `${accentColor.value}20` : "transparent",
              borderColor: isHovered || isSelected ? `${accentColor.value}60` : "transparent",
            }}
          >
            <ProcessProfileImage
              profileImageUrl={instance.profileImageUrl}
              alt={instance.name}
              className="w-full h-full object-cover"
              fallback={
                <Icon
                  icon="mdi:minecraft"
                  className="w-6 h-6"
                  style={{ color: accentColor.value }}
                />
              }
            />
          </div>

          <div className="flex-1 min-w-0">
            <span
              className="text-sm  font-bold"
              style={{ color: statusColor }}
            >
              {formatElapsedTimeCompact(instance.startTime, instance.endTime || currentTime)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {(instance.status === "running" || instance.status === "starting") &&
           !stoppingProcessIds.has(instance.id) ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStopProcess(instance.id);
              }}
              className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              title="Stop"
            >
              <Icon icon="solar:stop-bold" className="w-3.5 h-3.5" />
            </button>
          ) : (instance.status === "crashed" || instance.status === "idle" || stoppingProcessIds.has(instance.id)) && (() => {
            const launchState = getProfileState(instance.profileId);
            const isLaunching = launchState.isButtonLaunching;

            return isLaunching ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  ProcessService.abort(instance.profileId).then(() => {
                    finalizeButtonLaunch(instance.profileId, "Aborted");
                    addLauncherLog(instance.profileId, "✗ Launch aborted by user");
                  }).catch((error) => {
                    console.error("Failed to abort launch:", error);
                  });
                }}
                className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                title="Stop"
              >
                <Icon icon="solar:stop-bold" className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLaunchProfile(instance.profileId);
                }}
                className="p-1.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                title="Start"
              >
                <Icon icon="solar:play-bold" className="w-3.5 h-3.5" />
              </button>
            );
          })()}

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenFolder(instance.profileId);
            }}
            className="p-1.5 rounded bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
            title="Open Folder"
          >
            <Icon icon="solar:folder-bold" className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenProfile();
            }}
            className="p-1.5 rounded bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
            title="Open Profile"
          >
            <Icon icon="solar:settings-bold" className="w-3.5 h-3.5" />
          </button>
        </div>
        </div>
      </Tooltip>
    );
  }

  return (
    <div
      className="relative p-3 rounded-lg bg-[var(--surface-overlay)] border border-[var(--surface-border)] hover:border-[var(--surface-border-strong)] cursor-pointer transition-all duration-200"
      style={{
        borderColor: isSelected ? `${accentColor.value}60` : undefined,
        backgroundColor: isSelected ? `${accentColor.value}10` : undefined,
      }}
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpenProfile();
        }}
        className="absolute top-2 right-2 p-1 rounded text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors"
        title="Open Profile"
      >
        <Icon icon="solar:settings-bold" className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-start gap-3">
        <div
          className="relative w-11 h-11 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 border-2 transition-all duration-200"
          style={{
            backgroundColor: isHovered || isSelected ? `${accentColor.value}20` : "transparent",
            borderColor: isHovered || isSelected ? `${accentColor.value}60` : "transparent",
          }}
        >
          <ProcessProfileImage
            profileImageUrl={instance.profileImageUrl}
            alt={instance.name}
            className="w-full h-full object-cover"
            fallback={
              <Icon
                icon="mdi:minecraft"
                className="w-6 h-6"
                style={{ color: accentColor.value }}
              />
            }
          />
        </div>

        <div className="flex-1 min-w-0">
          <span
            className="block  text-white text-sm whitespace-nowrap overflow-hidden text-ellipsis mb-1"
            style={{ textShadow: "0 2px 4px rgba(0,0,0,0.7)" }}
            title={instance.name}
          >
            {instance.name}
          </span>

          <div className="flex items-center gap-2 text-[11px] ">
            {instance.accountName && (
              <div className="flex items-center gap-1.5 text-white/60">
                <Icon icon="solar:user-bold" className="w-3 h-3" />
                <span>{instance.accountName}</span>
              </div>
            )}
            {instance.accountName && <span className="text-white/30">•</span>}
            <div
              className="flex items-center gap-1"
              style={{ color: statusColor }}
            >
              {instance.status === "running" && (
                <div
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ backgroundColor: statusColor }}
                />
              )}
              {instance.status === "starting" && (
                <Icon icon="svg-spinners:pulse-3" className="w-3 h-3" />
              )}
              {instance.status === "crashed" && (
                <Icon icon="solar:danger-triangle-bold" className="w-3 h-3" />
              )}
              {instance.status === "idle" && (
                <Icon icon="solar:stop-circle-bold" className="w-3 h-3" />
              )}
              <span>{formatElapsedTime(instance.startTime, instance.endTime || currentTime)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface InstanceSidebarProps {
  selectedInstanceId?: string;
  onSelectInstance?: (id: string) => void;
  onCompactModeChange?: (isCompact: boolean) => void;
}

export function InstanceSidebar({
  selectedInstanceId,
  onSelectInstance,
  onCompactModeChange,
}: InstanceSidebarProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [stoppingProcessIds, setStoppingProcessIds] = useState<Set<string>>(new Set());
  const [isCompact, setIsCompact] = useState(() => {
    const saved = localStorage.getItem("instanceSidebar_isCompact");
    return saved ? JSON.parse(saved) : false;
  });

  const { processes, stoppedProcesses, processEndTimes, metrics, fetchProcesses, stopProcess, isLoading } = useProcessStore();

  const { getProfileState, initiateButtonLaunch, finalizeButtonLaunch, setButtonStatusMessage } = useLaunchStateStore();

  const { addLauncherLog, clearLauncherLogs, clearLogs } = useProcessStore();

  useEffect(() => {
    localStorage.setItem("instanceSidebar_isCompact", JSON.stringify(isCompact));
  }, [isCompact]);

  useEffect(() => {
    fetchProcesses();

    const interval = setInterval(() => {
      fetchProcesses();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchProcesses]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const eventListenerRef = useRef<UnlistenFn | null>(null);
  useEffect(() => {
    let isSubscribed = true;

    const setupListener = async () => {
      eventListenerRef.current = await listen<{
        event_type: string;
        target_id: string | null;
        message: string;
      }>("state_event", (event) => {
        if (!isSubscribed) return;

        const payload = event.payload;
        const profileId = payload.target_id;

        if (!profileId) return;

        if (payload.event_type === EventType.LaunchSuccessful) {
          finalizeButtonLaunch(profileId);
        } else if (payload.event_type === EventType.Error) {
          finalizeButtonLaunch(profileId, payload.message || "Error");
        } else if (payload.message && getProfileState(profileId).isButtonLaunching) {
          setButtonStatusMessage(profileId, payload.message);
        }
      });
    };

    setupListener();

    return () => {
      isSubscribed = false;
      if (eventListenerRef.current) {
        eventListenerRef.current();
      }
    };
  }, [finalizeButtonLaunch, setButtonStatusMessage, getProfileState]);

  const instances = useMemo(() => {
    const runningInstances = processes
      .filter((p) => {
        const status = getProcessStatus(p.state);
        return status === "running" || status === "starting" || status === "stopping";
      })
      .map((p) => processToInstance(p, metrics.get(p.id)));

    const stoppedInstances = Array.from(stoppedProcesses.values())
      .filter((p) => !processes.find((running) => running.id === p.id))
      .map((p) => processToInstance(p, undefined, processEndTimes.get(p.id)));

    return [...runningInstances, ...stoppedInstances].sort((a, b) =>
      a.profileId.localeCompare(b.profileId)
    );
  }, [processes, stoppedProcesses, processEndTimes, metrics]);

  useEffect(() => {
    if (stoppingProcessIds.size > 0) {
      const runningIds = new Set(processes.map(p => p.id));
      const stillStopping = new Set(
        [...stoppingProcessIds].filter(id => runningIds.has(id))
      );
      if (stillStopping.size !== stoppingProcessIds.size) {
        setStoppingProcessIds(stillStopping);
      }
    }
  }, [processes, stoppingProcessIds]);

  useEffect(() => {
    if (!selectedInstanceId && instances.length > 0) {
      onSelectInstance?.(instances[0].id);
    }
  }, [instances, selectedInstanceId, onSelectInstance]);

  const selectedInstance = instances.find((i) => i.id === selectedInstanceId);

  const handleStopProcess = (processId: string) => {
    setStoppingProcessIds(prev => new Set(prev).add(processId));

    stopProcess(processId).catch((error) => {
      console.error("Failed to stop process:", error);
    });
  };

  const handleOpenFolder = async (profileId: string) => {
    try {
      await invoke("open_profile_folder", { profileId });
    } catch (error) {
      console.error("Failed to open folder:", error);
    }
  };

  const handleLaunchProfile = async (profileId: string) => {
    const profileState = getProfileState(profileId);
    if (profileState.isButtonLaunching) {
      return;
    }

    clearLauncherLogs(profileId);
    for (const [processId, stoppedProcess] of stoppedProcesses) {
      if (stoppedProcess.profile_id === profileId) {
        clearLogs(processId);
      }
    }

    initiateButtonLaunch(profileId);

    try {
      await ProcessService.launch(profileId);
    } catch (error) {
      console.error("Failed to launch profile:", error);
      const errorMsg = typeof error === "string" ? error : (error as Error).message || "Launch failed";
      finalizeButtonLaunch(profileId, errorMsg);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between">
        {isCompact ? (
          <div title="Instances">
            <Icon icon="solar:monitor-bold" className="w-4 h-4" style={{ color: accentColor.value }} />
          </div>
        ) : (
          <span
            className=" text-sm tracking-wider flex items-center gap-2"
            style={{ color: accentColor.value }}
          >
            <Icon icon="solar:monitor-bold" className="w-4 h-4" />
            Instances
          </span>
        )}
        <button
          onClick={() => {
            const newCompactState = !isCompact;
            setIsCompact(newCompactState);
            onCompactModeChange?.(newCompactState);
          }}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs  transition-colors"
          style={{
            backgroundColor: `${accentColor.value}20`,
            color: accentColor.value
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${accentColor.value}30`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = `${accentColor.value}20`;
          }}
          title={isCompact ? "Expand to full view" : "Collapse to compact view"}
        >
          <Icon icon={isCompact ? "solar:maximize-bold" : "solar:minimize-bold"} className="w-3 h-3" />
          {isCompact ? "Full" : "Compact"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {isLoading && instances.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-white/50 text-sm ">
            <Icon icon="svg-spinners:pulse-3" className="w-6 h-6 mr-2" />
            Loading...
          </div>
        ) : instances.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-white/50 text-sm  text-center">
            <Icon icon="solar:gamepad-no-charge-bold" className="w-8 h-8 mb-2 opacity-50" />
            No active instances
          </div>
        ) : (
          instances.map((instance) => (
            <InstanceItem
              key={instance.id}
              instance={instance}
              isSelected={selectedInstanceId === instance.id}
              isHovered={hoveredId === instance.id}
              currentTime={currentTime}
              accentColor={accentColor}
              onSelect={() => onSelectInstance?.(instance.id)}
              onHover={(hovered) => setHoveredId(hovered ? instance.id : null)}
              onOpenProfile={async () => {
                try {
                  await emitTo("main", "navigate-to-profile", { profileId: instance.profileId });
                  await invoke("focus_main_window");
                } catch (error) {
                  console.error("Failed to open profile in main window:", error);
                }
              }}
              isCompact={isCompact}
              stoppingProcessIds={stoppingProcessIds}
              getProfileState={getProfileState}
              finalizeButtonLaunch={finalizeButtonLaunch}
              addLauncherLog={addLauncherLog}
              handleStopProcess={handleStopProcess}
              handleLaunchProfile={handleLaunchProfile}
              handleOpenFolder={handleOpenFolder}
            />
          ))
        )}
      </div>

      {selectedInstance && !isCompact && (
        <div className="px-3 py-3 bg-black/30 rounded-lg mx-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs  text-white/50 truncate">
              {selectedInstance.name}
            </span>
            <span
              className="text-xs "
              style={{ color: getStatusColor(selectedInstance.status) }}
            >
              {formatElapsedTime(selectedInstance.startTime, selectedInstance.endTime || currentTime)}
            </span>
          </div>

          {selectedInstance.status === "running" && selectedInstance.memoryUsage > 0 && (
            <div className="flex gap-4 mb-3 mt-1">
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs  text-white/40 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Icon icon="solar:sd-card-bold" className="w-3 h-3" />
                    RAM
                  </span>
                  <span className="text-white/60">{formatMemory(selectedInstance.memoryUsage)}</span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min((selectedInstance.memoryUsage / selectedInstance.memoryMax) * 100, 100)}%`,
                      backgroundColor: selectedInstance.memoryUsage / selectedInstance.memoryMax > 0.8
                        ? "rgba(248, 113, 113, 0.7)"
                        : `${accentColor.value}90`,
                    }}
                  />
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between text-xs  text-white/40 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Icon icon="solar:cpu-bolt-bold" className="w-3 h-3" />
                    CPU
                  </span>
                  <span className="text-white/60">{Math.round(selectedInstance.cpuUsage)}%</span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(selectedInstance.cpuUsage, 100)}%`,
                      backgroundColor: selectedInstance.cpuUsage > 80
                        ? "rgba(248, 113, 113, 0.7)"
                        : `${accentColor.value}90`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className={`flex items-center ${isCompact ? "gap-1" : "gap-1.5"}`}>
            {(selectedInstance.status === "running" || selectedInstance.status === "starting") &&
             !stoppingProcessIds.has(selectedInstance.id) ? (
              <button
                onClick={() => handleStopProcess(selectedInstance.id)}
                className={`${isCompact ? "p-1.5 rounded" : "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs "} bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors`}
                title={isCompact ? "Stop" : undefined}
              >
                <Icon icon="solar:stop-bold" className="w-3.5 h-3.5" />
                {!isCompact && "STOP"}
              </button>
            ) : (selectedInstance.status === "crashed" || selectedInstance.status === "idle" || stoppingProcessIds.has(selectedInstance.id)) && (() => {
              const launchState = getProfileState(selectedInstance.profileId);
              const isLaunching = launchState.isButtonLaunching;

              return isLaunching ? (
                <button
                  onClick={async () => {
                    try {
                      await ProcessService.abort(selectedInstance.profileId);
                      finalizeButtonLaunch(selectedInstance.profileId, "Aborted");
                      addLauncherLog(selectedInstance.profileId, "✗ Launch aborted by user");
                    } catch (error) {
                      console.error("Failed to abort launch:", error);
                    }
                  }}
                  className={`${isCompact ? "p-1.5 rounded" : "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs "} bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors`}
                  title={isCompact ? "Stop" : undefined}
                >
                  <Icon icon="solar:stop-bold" className="w-3.5 h-3.5" />
                  {!isCompact && "STOP"}
                </button>
              ) : (
                <button
                  onClick={() => handleLaunchProfile(selectedInstance.profileId)}
                  className={`${isCompact ? "p-1.5 rounded" : "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs "} bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors`}
                  title={isCompact ? "Start" : undefined}
                >
                  <Icon icon="solar:play-bold" className="w-3.5 h-3.5" />
                  {!isCompact && "START"}
                </button>
              );
            })()}

            <button
              onClick={() => handleOpenFolder(selectedInstance.profileId)}
              className={`${isCompact ? "p-1.5 rounded" : "flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs "} bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors`}
              title="Open Folder"
            >
              <Icon icon="solar:folder-bold" className="w-3.5 h-3.5" />
              {!isCompact && "OPEN FOLDER"}
            </button>
          </div>
        </div>
      )}

      <div className="px-4 py-2 text-xs  text-white/50">
        {instances.filter((i) => i.status === "running").length} RUNNING
      </div>
    </div>
  );
}
