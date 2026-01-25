import { useEffect, useRef } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useProcessStore, ProcessMetrics } from "../store/useProcessStore";
import { EventType, MinecraftProcessExitedPayload } from "../types/events";
import { ProcessState } from "../types/processState";
import { useLogThrottle } from "./useLogThrottle";

const LAUNCH_STATUS_EVENTS = new Set([
  EventType.InstallingJava,
  EventType.DownloadingLibraries,
  EventType.ExtractingNatives,
  EventType.DownloadingAssets,
  EventType.ReusingMinecraftAssets,
  EventType.CopyingInitialData,
  EventType.DownloadingClient,
  EventType.InstallingFabric,
  EventType.InstallingQuilt,
  EventType.InstallingForge,
  EventType.InstallingNeoForge,
  EventType.PatchingForge,
  EventType.DownloadingMods,
  EventType.SyncingMods,
  EventType.LaunchingMinecraft,
]);

interface StateEventPayload {
  event_type: string;
  event_id: string;
  target_id: string | null;
  message: string;
  progress: number | null;
  error: string | null;
}

export function useProcessEvents(options: {
  autoFetch?: boolean;
  processFilter?: string[];
} = {}) {
  const { autoFetch = true, processFilter } = options;

  const {
    fetchProcesses,
    addLogEntry,
    addLogEntriesBatch,
    updateMetrics,
    markProcessStopped,
    addLauncherLog,
    clearLauncherLogs,
    clearLogs,
    processes,
    stoppedProcesses,
  } = useProcessStore();

  const { throttledAddLog } = useLogThrottle(addLogEntry, addLogEntriesBatch);

  const stateEventListenerRef = useRef<UnlistenFn | null>(null);
  const firstMcLogReceived = useRef<Set<string>>(new Set());
  const launchStartedForProfile = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (autoFetch) {
      fetchProcesses();
    }

    let isSubscribed = true;

    const setupListeners = async () => {
      try {
        stateEventListenerRef.current = await listen<StateEventPayload>(
          "state_event",
          (event) => {
            if (!isSubscribed) return;

            const payload = event.payload;

            if (payload.event_type === EventType.MinecraftOutput && payload.target_id) {
              if (processFilter && !processFilter.includes(payload.target_id)) {
                return;
              }

              const currentProcesses = useProcessStore.getState().processes;
              const process = currentProcesses.find(p => p.id === payload.target_id);
              if (process && !firstMcLogReceived.current.has(process.profile_id)) {
                firstMcLogReceived.current.add(process.profile_id);
                clearLauncherLogs(process.profile_id);
              }

              throttledAddLog(payload.target_id, payload.message);
            }

            if (payload.event_type === EventType.MinecraftProcessExited && payload.target_id) {
              try {
                const exitPayload: MinecraftProcessExitedPayload = JSON.parse(payload.message);

                if (exitPayload.process_metadata) {
                  const updatedMetadata = { ...exitPayload.process_metadata };
                  if (exitPayload.success) {
                    updatedMetadata.state = "Stopped" as ProcessState;
                  } else {
                    updatedMetadata.state = { Crashed: `Exit code: ${exitPayload.exit_code}` } as ProcessState;
                  }

                  markProcessStopped(payload.target_id, updatedMetadata);
                }
              } catch (e) {
                console.error("[useProcessEvents] Failed to parse exit payload:", e);
              }

              fetchProcesses();
            }

            if (payload.event_type === EventType.LaunchSuccessful && payload.target_id) {
              addLauncherLog(payload.target_id, "✓ Minecraft started successfully!");
              firstMcLogReceived.current.delete(payload.target_id);
              launchStartedForProfile.current.delete(payload.target_id);
              fetchProcesses();
            }

            if (payload.event_type === EventType.Error && payload.target_id) {
              addLauncherLog(payload.target_id, `✗ Error: ${payload.message || "Unknown error"}`);
              launchStartedForProfile.current.delete(payload.target_id);
            }

            if (LAUNCH_STATUS_EVENTS.has(payload.event_type as EventType) && payload.target_id && payload.message) {
              const profileId = payload.target_id;

              if (!launchStartedForProfile.current.has(profileId)) {
                launchStartedForProfile.current.add(profileId);

                clearLauncherLogs(profileId);

                const currentStoppedProcesses = useProcessStore.getState().stoppedProcesses;
                for (const [processId, stoppedProcess] of currentStoppedProcesses) {
                  if (stoppedProcess.profile_id === profileId) {
                    clearLogs(processId);
                  }
                }
              }

              addLauncherLog(profileId, payload.message);
            }

          }
        );

        console.log("[useProcessEvents] Listening for state_event");
      } catch (err) {
        console.error("[useProcessEvents] Failed to set up event listeners:", err);
      }
    };

    setupListeners();

    return () => {
      isSubscribed = false;

      if (stateEventListenerRef.current) {
        stateEventListenerRef.current();
        stateEventListenerRef.current = null;
      }

      console.log("[useProcessEvents] Cleaned up event listeners");
    };
  }, [autoFetch, processFilter, fetchProcesses, throttledAddLog, updateMetrics, markProcessStopped, addLauncherLog, clearLauncherLogs, clearLogs]);

  return useProcessStore();
}

export function useProcessLogs(processId: string | null) {
  const { getLogsForProcess, logs } = useProcessStore();

  return {
    logs: processId ? getLogsForProcess(processId) : [],
    allLogs: logs,
  };
}
