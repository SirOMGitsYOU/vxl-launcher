"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import * as ProcessService from "../../services/process-service";
import type { ProcessMetadata } from "../../types/processState";
import { Button } from "../ui/./buttons/Button";
import { useThemeStore } from "../../store/useThemeStore";

interface RunningInstancesIndicatorProps {
  className?: string;
}

export function RunningInstancesIndicator({
  className,
}: RunningInstancesIndicatorProps) {
  const [processes, setProcesses] = useState<ProcessMetadata[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const accentColor = useThemeStore((state) => state.accentColor);

  const fetchProcesses = useCallback(async () => {
    setError(null);
    try {
      const fetchedProcesses = await ProcessService.getRunningProcesses();
      setProcesses(fetchedProcesses);
    } catch (err) {
      setError("Failed to fetch processes");
      console.error(err);
      setProcesses([]);
    } finally {
      if (isLoading) setIsLoading(false);
    }
  }, [isLoading]);

  useEffect(() => {
    fetchProcesses();

    const intervalId = setInterval(fetchProcesses, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchProcesses]);

  const handleInstancesButtonClick = async () => {
    try {
      if (hasInstances && processes.length > 0) {
        await ProcessService.openLogWindow(processes[0].id);
      } else {
        await ProcessService.openLogWindow(null);
      }
    } catch (err) {
      console.error(
        `Failed to open log window:`,
        err,
      );
    }
  };


  const instanceCount = processes.length;
  const hasInstances = instanceCount > 0;

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Button
          variant={hasInstances ? "success" : "flat"}
          size="sm"
          onClick={handleInstancesButtonClick}
          icon={<Icon icon="solar:monitor-bold" className="w-4 h-4" />}
          className="h-10"
        >
          {isLoading && instanceCount === 0
            ? "Loading..."
            : instanceCount === 0
              ? "No instances"
              : `${instanceCount} Instance${instanceCount !== 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  );
}
