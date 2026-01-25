import { useCallback, useEffect, useRef } from "react";

const LOG_THROTTLE_CONFIG = {
  burstLimit: 10,
  batchInterval: 100,
  cooldownTime: 500,
};

interface ThrottledLogEntry {
  processId: string;
  rawMessage: string;
}

type AddLogEntryFn = (processId: string, rawMessage: string) => void;
type AddLogEntriesBatchFn = (entries: ThrottledLogEntry[]) => void;

export function useLogThrottle(
  addLogEntry: AddLogEntryFn,
  addLogEntriesBatch: AddLogEntriesBatchFn
) {
  const bufferRef = useRef<ThrottledLogEntry[]>([]);
  const burstCountRef = useRef(0);
  const lastMessageTimeRef = useRef(Date.now());
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushBuffer = useCallback(() => {
    if (bufferRef.current.length > 0) {
      addLogEntriesBatch([...bufferRef.current]);
      bufferRef.current = [];
    }
  }, [addLogEntriesBatch]);

  const startFlushTimer = useCallback(() => {
    if (!flushTimerRef.current) {
      flushTimerRef.current = setInterval(() => {
        if (bufferRef.current.length > 0) {
          flushBuffer();
        } else {
          if (flushTimerRef.current) {
            clearInterval(flushTimerRef.current);
            flushTimerRef.current = null;
          }
        }
      }, LOG_THROTTLE_CONFIG.batchInterval);
    }
  }, [flushBuffer]);

  const resetCooldown = useCallback(() => {
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
    }
    cooldownTimerRef.current = setTimeout(() => {
      burstCountRef.current = 0;
    }, LOG_THROTTLE_CONFIG.cooldownTime);
  }, []);

  const throttledAddLog = useCallback((processId: string, rawMessage: string) => {
    lastMessageTimeRef.current = Date.now();
    resetCooldown();

    if (burstCountRef.current < LOG_THROTTLE_CONFIG.burstLimit) {
      burstCountRef.current++;
      addLogEntry(processId, rawMessage);
      return;
    }

    bufferRef.current.push({ processId, rawMessage });
    startFlushTimer();
  }, [addLogEntry, resetCooldown, startFlushTimer]);

  useEffect(() => {
    return () => {
      if (bufferRef.current.length > 0) {
        addLogEntriesBatch([...bufferRef.current]);
        bufferRef.current = [];
      }

      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  }, [addLogEntriesBatch]);

  return { throttledAddLog };
}
