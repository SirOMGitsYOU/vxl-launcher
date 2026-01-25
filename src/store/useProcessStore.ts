import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { ProcessMetadata, ProcessState } from "../types/processState";

export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG" | "TRACE" | "UNKNOWN";

export interface LogEntry {
  id: string;
  processId: string;
  timestamp: Date | null;
  level: LogLevel;
  thread: string | null;
  message: string;
  raw: string;
}

interface ParserState {
  lastLevel: LogLevel;
  lastThread: string | null;
  nextId: number;
}

export interface ProcessMetrics {
  processId: string;
  memoryBytes: number;
  cpuPercent: number;
  timestamp: Date;
}

interface ProcessStore {
  processes: ProcessMetadata[];
  stoppedProcesses: Map<string, ProcessMetadata>;
  processEndTimes: Map<string, number>;
  logs: Map<string, LogEntry[]>;
  launcherLogs: Map<string, LogEntry[]>;
  metrics: Map<string, ProcessMetrics>;
  parserStates: Map<string, ParserState>;
  selectedProcessId: string | null;
  isLoading: boolean;
  error: string | null;

  fetchProcesses: () => Promise<void>;
  setProcesses: (processes: ProcessMetadata[]) => void;
  updateProcess: (process: ProcessMetadata) => void;
  removeProcess: (processId: string) => void;
  selectProcess: (processId: string | null) => void;
  markProcessStopped: (processId: string, metadata: ProcessMetadata) => void;

  addLogEntry: (processId: string, rawMessage: string) => void;
  addLogEntriesBatch: (entries: Array<{ processId: string; rawMessage: string }>) => void;
  loadLogsFromContent: (processId: string, content: string) => void;
  clearLogs: (processId: string) => void;
  getLogsForProcess: (processId: string) => LogEntry[];
  hasLogsForProcess: (processId: string) => boolean;

  addLauncherLog: (profileId: string, message: string) => void;
  clearLauncherLogs: (profileId: string) => void;
  getLauncherLogsForProfile: (profileId: string) => LogEntry[];

  updateMetrics: (processId: string, metrics: ProcessMetrics) => void;
  getMetricsForProcess: (processId: string) => ProcessMetrics | undefined;

  stopProcess: (processId: string) => Promise<void>;
}

const LOG_LEVELS: readonly LogLevel[] = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'] as const;

const logLineRegexStandard = /^\s*\[(\d{2}:\d{2}:\d{2})\]\s+\[([^/]+)\/([^\]]+)\]:\s*(.*)$/;
const logLineRegexNeoForgeSource = /^\s*\[([^\]]+)\]\s+\[([^/]+)\/([^\]]+)\]\s+\[[^\]]+\]:\s*(.*)$/;
const logLineRegexNeoForgeNoSource = /^\s*\[([^\]]+)\]\s+\[([^/]+)\/([^\]]+)\]:\s*(.*)$/;

interface ParsedLine {
  timestamp: string | null;
  thread: string | null;
  level: LogLevel | null;
  text: string;
}

function parseLogLine(line: string): ParsedLine {
  let match: RegExpMatchArray | null = null;

  match = line.match(logLineRegexStandard);
  if (match) {
    const levelUpper = match[3].toUpperCase() as LogLevel;
    return {
      timestamp: match[1],
      thread: match[2],
      level: LOG_LEVELS.includes(levelUpper) ? levelUpper : null,
      text: match[4].trim(),
    };
  }

  match = line.match(logLineRegexNeoForgeSource);
  if (match) {
    const levelUpper = match[3].toUpperCase() as LogLevel;
    return {
      timestamp: match[1],
      thread: match[2],
      level: LOG_LEVELS.includes(levelUpper) ? levelUpper : null,
      text: match[4].trim(),
    };
  }

  match = line.match(logLineRegexNeoForgeNoSource);
  if (match) {
    const levelUpper = match[3].toUpperCase() as LogLevel;
    return {
      timestamp: match[1],
      thread: match[2],
      level: LOG_LEVELS.includes(levelUpper) ? levelUpper : null,
      text: match[4].trim(),
    };
  }

  return {
    timestamp: null,
    thread: null,
    level: null,
    text: line.trimEnd(),
  };
}

function timestampToDate(timestamp: string): Date {
  const timeMatch = timestamp.match(/(\d{2}):(\d{2}):(\d{2})/);
  if (timeMatch) {
    const [, hours, minutes, seconds] = timeMatch;
    const now = new Date();
    now.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds), 0);
    return now;
  }
  return new Date();
}

export const useProcessStore = create<ProcessStore>((set, get) => ({
  processes: [],
  stoppedProcesses: new Map(),
  processEndTimes: new Map(),
  logs: new Map(),
  launcherLogs: new Map(),
  metrics: new Map(),
  parserStates: new Map(),
  selectedProcessId: null,
  isLoading: false,
  error: null,

  fetchProcesses: async () => {
    set({ isLoading: true, error: null });
    try {
      const processes = await invoke<ProcessMetadata[]>("get_processes");

      const runningProfileIds = new Set(processes.map(p => p.profile_id));

      const currentState = get();
      const newStoppedProcesses = new Map(currentState.stoppedProcesses);
      const newProcessEndTimes = new Map(currentState.processEndTimes);
      let newSelectedProcessId = currentState.selectedProcessId;

      for (const [id, stoppedProcess] of newStoppedProcesses) {
        if (runningProfileIds.has(stoppedProcess.profile_id)) {
          if (currentState.selectedProcessId === id) {
            const newProcess = processes.find(p => p.profile_id === stoppedProcess.profile_id);
            if (newProcess) {
              newSelectedProcessId = newProcess.id;
            }
          }
          newStoppedProcesses.delete(id);
          newProcessEndTimes.delete(id);
        }
      }

      set({
        processes,
        stoppedProcesses: newStoppedProcesses,
        processEndTimes: newProcessEndTimes,
        selectedProcessId: newSelectedProcessId,
        isLoading: false
      });

      const state = get();
      if (!state.selectedProcessId && processes.length > 0) {
        const runningProcess = processes.find(p => p.state === "Running");
        if (runningProcess) {
          set({ selectedProcessId: runningProcess.id });
        } else {
          set({ selectedProcessId: processes[0].id });
        }
      }
    } catch (error) {
      set({ error: String(error), isLoading: false });
      console.error("Failed to fetch processes:", error);
    }
  },

  setProcesses: (processes) => {
    set({ processes });
  },

  updateProcess: (process) => {
    set((state) => {
      const existingIndex = state.processes.findIndex(p => p.id === process.id);
      let newProcesses: ProcessMetadata[];
      if (existingIndex >= 0) {
        newProcesses = [...state.processes];
        newProcesses[existingIndex] = process;
      } else {
        newProcesses = [...state.processes, process];
      }

      const newStoppedProcesses = new Map(state.stoppedProcesses);
      const newProcessEndTimes = new Map(state.processEndTimes);
      for (const [id, stoppedProcess] of newStoppedProcesses) {
        if (stoppedProcess.profile_id === process.profile_id) {
          newStoppedProcesses.delete(id);
          newProcessEndTimes.delete(id);
        }
      }

      return { processes: newProcesses, stoppedProcesses: newStoppedProcesses, processEndTimes: newProcessEndTimes };
    });
  },

  removeProcess: (processId) => {
    set((state) => ({
      processes: state.processes.filter(p => p.id !== processId),
      selectedProcessId: state.selectedProcessId === processId ? null : state.selectedProcessId,
    }));
  },

  selectProcess: (processId) => {
    set({ selectedProcessId: processId });
  },

  markProcessStopped: (processId, metadata) => {
    set((state) => {
      const newStoppedProcesses = new Map(state.stoppedProcesses);
      newStoppedProcesses.set(processId, metadata);

      const newProcessEndTimes = new Map(state.processEndTimes);
      newProcessEndTimes.set(processId, Date.now());

      const newProcesses = state.processes.filter(p => p.id !== processId);

      return {
        stoppedProcesses: newStoppedProcesses,
        processEndTimes: newProcessEndTimes,
        processes: newProcesses,
      };
    });
  },

  addLogEntry: (processId, rawMessage) => {
    set((state) => {
      const newLogs = new Map(state.logs);
      const newParserStates = new Map(state.parserStates);
      const processLogs = newLogs.get(processId) || [];

      let parserState = newParserStates.get(processId) || {
        lastLevel: "INFO" as LogLevel,
        lastThread: null,
        nextId: 0,
      };

      const parsed = parseLogLine(rawMessage);

      let level: LogLevel;
      let thread: string | null;

      if (parsed.timestamp !== null) {
        level = parsed.level || "UNKNOWN";
        thread = parsed.thread;
        parserState = {
          ...parserState,
          lastLevel: level,
          lastThread: thread,
          nextId: parserState.nextId + 1,
        };
      } else {
        level = parserState.lastLevel;
        thread = parserState.lastThread;
        parserState = {
          ...parserState,
          nextId: parserState.nextId + 1,
        };
      }

      const entry: LogEntry = {
        id: `${processId}-${parserState.nextId}`,
        processId,
        timestamp: parsed.timestamp ? timestampToDate(parsed.timestamp) : null,
        level,
        thread,
        message: parsed.text,
        raw: rawMessage,
      };

      newParserStates.set(processId, parserState);

      const updatedLogs = [...processLogs, entry].slice(-10000);
      newLogs.set(processId, updatedLogs);

      return { logs: newLogs, parserStates: newParserStates };
    });
  },

  addLogEntriesBatch: (entries) => {
    if (entries.length === 0) return;

    set((state) => {
      const newLogs = new Map(state.logs);
      const newParserStates = new Map(state.parserStates);

      const entriesByProcess = new Map<string, string[]>();
      for (const { processId, rawMessage } of entries) {
        const existing = entriesByProcess.get(processId) || [];
        existing.push(rawMessage);
        entriesByProcess.set(processId, existing);
      }

      for (const [processId, messages] of entriesByProcess) {
        const processLogs = newLogs.get(processId) || [];
        let parserState = newParserStates.get(processId) || {
          lastLevel: "INFO" as LogLevel,
          lastThread: null,
          nextId: 0,
        };

        const newEntries: LogEntry[] = [];

        for (const rawMessage of messages) {
          const parsed = parseLogLine(rawMessage);

          let level: LogLevel;
          let thread: string | null;

          if (parsed.timestamp !== null) {
            level = parsed.level || "UNKNOWN";
            thread = parsed.thread;
            parserState = {
              ...parserState,
              lastLevel: level,
              lastThread: thread,
              nextId: parserState.nextId + 1,
            };
          } else {
            level = parserState.lastLevel;
            thread = parserState.lastThread;
            parserState = {
              ...parserState,
              nextId: parserState.nextId + 1,
            };
          }

          newEntries.push({
            id: `${processId}-${parserState.nextId}`,
            processId,
            timestamp: parsed.timestamp ? timestampToDate(parsed.timestamp) : null,
            level,
            thread,
            message: parsed.text,
            raw: rawMessage,
          });
        }

        newParserStates.set(processId, parserState);
        const updatedLogs = [...processLogs, ...newEntries].slice(-10000);
        newLogs.set(processId, updatedLogs);
      }

      return { logs: newLogs, parserStates: newParserStates };
    });
  },

  loadLogsFromContent: (processId, content) => {
    set((state) => {
      const newLogs = new Map(state.logs);
      const newParserStates = new Map(state.parserStates);

      const lines = content.split(/\r?\n/);
      const entries: LogEntry[] = [];

      let parserState: ParserState = {
        lastLevel: "INFO" as LogLevel,
        lastThread: null,
        nextId: 0,
      };

      for (let line of lines) {
        if (!line.trim()) continue;

        line = line.replace(/\r$/, '');

        const parsed = parseLogLine(line);

        let level: LogLevel;
        let thread: string | null;

        if (parsed.timestamp !== null) {
          level = parsed.level || "UNKNOWN";
          thread = parsed.thread;
          parserState = {
            ...parserState,
            lastLevel: level,
            lastThread: thread,
            nextId: parserState.nextId + 1,
          };
        } else {
          level = parserState.lastLevel;
          thread = parserState.lastThread;
          parserState = {
            ...parserState,
            nextId: parserState.nextId + 1,
          };
        }

        entries.push({
          id: `${processId}-${parserState.nextId}`,
          processId,
          timestamp: parsed.timestamp ? timestampToDate(parsed.timestamp) : null,
          level,
          thread,
          message: parsed.text,
          raw: line,
        });
      }

      newLogs.set(processId, entries.slice(-10000));
      newParserStates.set(processId, parserState);

      return { logs: newLogs, parserStates: newParserStates };
    });
  },

  clearLogs: (processId) => {
    set((state) => {
      const newLogs = new Map(state.logs);
      const newParserStates = new Map(state.parserStates);
      newLogs.delete(processId);
      newParserStates.delete(processId);
      return { logs: newLogs, parserStates: newParserStates };
    });
  },

  getLogsForProcess: (processId) => {
    return get().logs.get(processId) || [];
  },

  hasLogsForProcess: (processId) => {
    const logs = get().logs.get(processId);
    return logs !== undefined && logs.length > 0;
  },

  addLauncherLog: (profileId, message) => {
    set((state) => {
      const newLauncherLogs = new Map(state.launcherLogs);
      const profileLogs = newLauncherLogs.get(profileId) || [];

      const entry: LogEntry = {
        id: `launcher-${profileId}-${Date.now()}`,
        processId: profileId,
        timestamp: new Date(),
        level: "INFO",
        thread: "Launcher",
        message: message,
        raw: `[Launcher] ${message}`,
      };

      newLauncherLogs.set(profileId, [...profileLogs, entry]);
      return { launcherLogs: newLauncherLogs };
    });
  },

  clearLauncherLogs: (profileId) => {
    set((state) => {
      const newLauncherLogs = new Map(state.launcherLogs);
      newLauncherLogs.delete(profileId);
      return { launcherLogs: newLauncherLogs };
    });
  },

  getLauncherLogsForProfile: (profileId) => {
    return get().launcherLogs.get(profileId) || [];
  },

  updateMetrics: (processId, metrics) => {
    set((state) => {
      const newMetrics = new Map(state.metrics);
      newMetrics.set(processId, metrics);
      return { metrics: newMetrics };
    });
  },

  getMetricsForProcess: (processId) => {
    return get().metrics.get(processId);
  },

  stopProcess: async (processId) => {
    try {
      await invoke("stop_process", { processId });
    } catch (error) {
      console.error("Failed to stop process:", error);
      set({ error: String(error) });
    }
  },
}));

export function isProcessActive(state: ProcessState): boolean {
  return state === "Running" || state === "Starting" ||
         (typeof state === "object" && "Crashed" in state);
}

export function getProcessStatus(state: ProcessState): "running" | "idle" | "crashed" | "starting" | "stopping" {
  if (state === "Running") return "running";
  if (state === "Starting") return "starting";
  if (state === "Stopping") return "stopping";
  if (state === "Stopped") return "idle";
  if (typeof state === "object" && "Crashed" in state) return "crashed";
  return "idle";
}
