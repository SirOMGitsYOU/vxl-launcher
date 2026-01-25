import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Icon } from "@iconify/react";
import { useThemeStore } from "../../store/useThemeStore";
import { LogWindowTitlebar } from "./LogWindowTitlebar";
import { InstanceSidebar } from "./InstanceSidebar";
import { LogViewerCore } from "./LogViewerCore";
import { useProcessEvents, useProcessLogs } from "../../hooks/useProcessEvents";
import { useProcessStore } from "../../store/useProcessStore";
import { getLogContentForProcess } from "../../services/process-service";
import { getProfileLatestLogContent } from "../../services/profile-service";
import type { ProcessMetadata } from "../../types/processState";

interface MinecraftLogWindowProps {
  crashedProcess?: ProcessMetadata;
}

export function MinecraftLogWindow({ crashedProcess }: MinecraftLogWindowProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarCompact, setSidebarCompact] = useState(() => {
    const saved = localStorage.getItem("logWindow_sidebarCompact");
    return saved ? JSON.parse(saved) : false;
  });

  const { processes } = useProcessEvents({ autoFetch: true });

  const { logs: rawLogs } = useProcessLogs(selectedInstanceId);

  const {
    stoppedProcesses,
    launcherLogs: launcherLogsMap,
    selectedProcessId,
    selectProcess,
    clearLogs,
    clearLauncherLogs,
    loadLogsFromContent,
    hasLogsForProcess,
    markProcessStopped
  } = useProcessStore();

  useEffect(() => {
    localStorage.setItem("logWindow_sidebarCompact", JSON.stringify(sidebarCompact));
  }, [sidebarCompact]);

  const crashedProcessHandledRef = useRef(false);
  useEffect(() => {
    if (crashedProcess && !crashedProcessHandledRef.current) {
      crashedProcessHandledRef.current = true;
      console.log("[MinecraftLogWindow] Adding crashed process to store:", crashedProcess.id);
      markProcessStopped(crashedProcess.id, crashedProcess);
      setSelectedInstanceId(crashedProcess.id);
    }
  }, [crashedProcess, markProcessStopped]);

  useEffect(() => {
    const themeStore = useThemeStore.getState();
    themeStore.applyAccentColorToDOM();
    themeStore.applyBorderRadiusToDOM();
  }, []);

  useEffect(() => {
    if (selectedProcessId && selectedProcessId !== selectedInstanceId) {
      setSelectedInstanceId(selectedProcessId);
    }
  }, [selectedProcessId, selectedInstanceId]);

  useEffect(() => {
    if (!selectedInstanceId && processes.length > 0) {
      const runningProcess = processes.find(p => p.state === "Running");
      if (runningProcess) {
        setSelectedInstanceId(runningProcess.id);
      } else {
        setSelectedInstanceId(processes[0].id);
      }
    }
  }, [processes, selectedInstanceId]);

  const { selectedProfileId, selectedStartTime } = useMemo(() => {
    if (!selectedInstanceId) return { selectedProfileId: null, selectedStartTime: null };
    const runningProcess = processes.find(p => p.id === selectedInstanceId);
    if (runningProcess) {
      return {
        selectedProfileId: runningProcess.profile_id,
        selectedStartTime: new Date(runningProcess.start_time).getTime()
      };
    }
    const stoppedProcess = stoppedProcesses.get(selectedInstanceId);
    if (stoppedProcess) {
      return {
        selectedProfileId: stoppedProcess.profile_id,
        selectedStartTime: new Date(stoppedProcess.start_time).getTime()
      };
    }
    return { selectedProfileId: null, selectedStartTime: null };
  }, [selectedInstanceId, processes, stoppedProcesses]);

  const launcherLogs = useMemo(() => {
    if (!selectedProfileId) return [];
    return launcherLogsMap.get(selectedProfileId) || [];
  }, [selectedProfileId, launcherLogsMap]);

  const isFetchingLogsRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedInstanceId || !selectedProfileId) return;
    if (hasLogsForProcess(selectedInstanceId)) return;
    if (isFetchingLogsRef.current === selectedInstanceId) return;

    const fetchLogs = async () => {
      isFetchingLogsRef.current = selectedInstanceId;

      try {
        let logContent = await getLogContentForProcess(selectedInstanceId);

        if (!logContent || logContent.trim() === "") {
          const isRecentProcess = selectedStartTime && (Date.now() - selectedStartTime) < 5000;
          if (!isRecentProcess) {
            logContent = await getProfileLatestLogContent(selectedProfileId);
          }
        }

        if (logContent && logContent.trim() !== "") {
          loadLogsFromContent(selectedInstanceId, logContent);
        }
      } catch (error) {
        console.error("[MinecraftLogWindow] Failed to fetch logs:", error);
      } finally {
        isFetchingLogsRef.current = null;
      }
    };

    fetchLogs();
  }, [selectedInstanceId, selectedProfileId, selectedStartTime, hasLogsForProcess, loadLogsFromContent]);

  const displayLogs = useMemo(() => {
    if (rawLogs.length > 0) {
      return rawLogs;
    }
    return launcherLogs;
  }, [rawLogs, launcherLogs]);

  const handleClear = () => {
    if (!selectedInstanceId) return;
    clearLogs(selectedInstanceId);
    if (selectedProfileId) {
      clearLauncherLogs(selectedProfileId);
    }
  };

  const handleSelectInstance = useCallback((id: string) => {
    setSelectedInstanceId(id);
    selectProcess(id);
  }, [selectProcess]);

  return (
    <div
      className="h-screen flex flex-col"
      style={{
        background: `linear-gradient(135deg, ${accentColor.value}20 0%, ${accentColor.value}10 50%, ${accentColor.value}18 100%)`,
      }}
    >
      <LogWindowTitlebar />

      <div className="flex-1 flex flex-col min-h-0 p-3 gap-3">
        <div className="flex-1 flex gap-3 min-h-0">
          <div className={`flex flex-col min-w-0 ${sidebarVisible ? "flex-[7]" : "flex-1"}`}>
            {!selectedInstanceId ? (
              <div className="flex-1 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur-sm text-white/30">
                <div className="text-center">
                  <Icon icon="solar:monitor-smartphone-bold" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="font-minecraft-ten">SELECT AN INSTANCE</p>
                  <p className="text-xs mt-1 font-sans">Choose an instance from the sidebar to view logs</p>
                </div>
              </div>
            ) : (
              <LogViewerCore
                logs={displayLogs}
                onClear={handleClear}
                onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
                sidebarVisible={sidebarVisible}
                noLogsIcon="solar:document-text-bold"
                noLogsTitle="NO LOGS YET"
                noLogsSubtitle="Waiting for log output..."
              />
            )}
          </div>

          {sidebarVisible && (
            <div className={sidebarCompact ? "flex-[1] min-w-[120px] max-w-[150px]" : "flex-[3] min-w-[280px] max-w-[350px]"}>
              <InstanceSidebar
                selectedInstanceId={selectedInstanceId || undefined}
                onSelectInstance={handleSelectInstance}
                onCompactModeChange={setSidebarCompact}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
