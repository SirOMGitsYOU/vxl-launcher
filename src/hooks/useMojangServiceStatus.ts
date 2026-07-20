import { useCallback, useEffect, useRef, useState } from "react";
import { fetchMojangServiceStatus } from "../services/mojang-status-service";
import {
  MONITORED_MOJANG_SERVICES,
  type MonitoredMojangServiceState,
  type MonitoredServiceCheckStatus,
} from "../types/mojang-status";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

const INITIAL_SERVICES: MonitoredMojangServiceState[] = MONITORED_MOJANG_SERVICES.map(
  (service) => ({
    id: service.id,
    label: service.label,
    status: "loading",
  }),
);

export interface MojangServiceStatusState {
  services: MonitoredMojangServiceState[];
  checkedAt: string | null;
  fetchError: string | null;
  isLoading: boolean;
}

function mapServiceStatus(status: string | undefined): MonitoredServiceCheckStatus {
  if (status === "up") return "up";
  if (status === "down") return "down";
  return "unknown";
}

export function useMojangServiceStatus() {
  const [state, setState] = useState<MojangServiceStatusState>({
    services: INITIAL_SERVICES,
    checkedAt: null,
    fetchError: null,
    isLoading: true,
  });
  const isMountedRef = useRef(true);

  const refresh = useCallback(async () => {
    setState((current) => ({
      ...current,
      isLoading: current.checkedAt === null,
      fetchError: null,
    }));

    try {
      const data = await fetchMojangServiceStatus();
      if (!isMountedRef.current) return;

      const services: MonitoredMojangServiceState[] = MONITORED_MOJANG_SERVICES.map(
        (monitored) => {
          const remote = data.services.find((service) => service.id === monitored.id);
          return {
            id: monitored.id,
            label: monitored.label,
            status: mapServiceStatus(remote?.status),
          };
        },
      );

      setState({
        services,
        checkedAt: data.checkedAt,
        fetchError: null,
        isLoading: false,
      });
    } catch (error) {
      if (!isMountedRef.current) return;

      const message = error instanceof Error ? error.message : "Status check failed";
      setState({
        services: MONITORED_MOJANG_SERVICES.map((service) => ({
          id: service.id,
          label: service.label,
          status: "unknown",
        })),
        checkedAt: null,
        fetchError: message,
        isLoading: false,
      });
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void refresh();

    const intervalId = window.setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  return { state, refresh };
}
