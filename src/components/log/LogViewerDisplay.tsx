"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import type { LogLevel, ParsedLogLine } from "../../services/log-service";
import { Select } from "../ui/Select";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { toast } from "react-hot-toast";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { cn } from "../../lib/utils";
import { Virtuoso } from "react-virtuoso";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  LoadingState,
} from "../ui-v2";

interface LogViewerDisplayProps {
  isLoading: boolean;
  error: string | null;
  displayLines: ParsedLogLine[];
  parsedLogLinesCount: number;
  searchTerm: string;
  levelFilters: Record<LogLevel, boolean>;
  copied: boolean;
  onSearchChange: (value: string) => void;
  onLevelFilterChange: (level: LogLevel, checked: boolean) => void;
  onCopyLog: () => void;
  logLevelsDefinition: readonly LogLevel[];
  scrollableContainerRef?: React.RefObject<HTMLDivElement>;
  isLiveLogs?: boolean;
  showPadding?: boolean;
  isAutoscrollEnabled?: boolean;
  onAutoscrollChange?: (enabled: boolean) => void;
  onOpenFolder?: () => void;
  onUploadLog?: () => Promise<string>;
  uploadUrl?: string | null;
  uploadError?: string | null;
  onOpenUploadUrl?: (url: string) => void;
  logFiles?: string[];
  selectedLogPath?: string | null;
  onLogSelect?: (value: string) => void;
  isInsideLogWindow?: boolean;
  isWordWrapEnabled?: boolean;
  onWordWrapChange?: (enabled: boolean) => void;
  scrollToTop?: () => void;
  scrollToBottom?: () => void;
}

function getFilename(path: string | null): string {
  if (!path) return "";
  return path.split(/[\\/]/).pop() || path;
}

function getLevelColorClass(level: LogLevel | undefined): string {
  switch (level) {
    case "ERROR":
      return "text-red-400";
    case "WARN":
      return "text-yellow-400";
    case "INFO":
      return "text-blue-400";
    case "DEBUG":
      return "text-cyan-400";
    case "TRACE":
      return "text-purple-400";
    default:
      return "text-white/70";
  }
}

function getLevelBadgeTone(level: LogLevel, active: boolean): "default" | "accent" | "muted" {
  if (!active) return "muted";
  switch (level) {
    case "ERROR":
    case "WARN":
      return "accent";
    default:
      return "default";
  }
}

export function LogViewerDisplay({
  isLoading,
  error,
  displayLines,
  parsedLogLinesCount,
  searchTerm,
  levelFilters,
  copied,
  onSearchChange,
  onLevelFilterChange,
  onCopyLog,
  logLevelsDefinition,
  isLiveLogs,
  isAutoscrollEnabled = true,
  onAutoscrollChange,
  scrollableContainerRef,
  onOpenFolder,
  onUploadLog,
  onOpenUploadUrl,
  logFiles = [],
  selectedLogPath = null,
  onLogSelect,
  isInsideLogWindow = false,
  isWordWrapEnabled,
  onWordWrapChange,
  scrollToTop,
  scrollToBottom,
}: LogViewerDisplayProps) {
  const [isSubmittingUpload, setIsSubmittingUpload] = useState(false);
  const [frozenLogLines, setFrozenLogLines] = useState<ParsedLogLine[] | null>(null);

  useEffect(() => {
    if (isAutoscrollEnabled) {
      setFrozenLogLines(null);
    } else if (frozenLogLines === null) {
      setFrozenLogLines([...displayLines]);
    }
  }, [isAutoscrollEnabled, displayLines, frozenLogLines]);

  const linesForVirtuoso = frozenLogLines !== null ? frozenLogLines : displayLines;

  if (isLoading) {
    return <LoadingState message="Loading logs..." />;
  }

  if (error) {
    return <Alert tone="error">{error}</Alert>;
  }

  if (
    !(isLiveLogs && parsedLogLinesCount === 0) &&
    linesForVirtuoso.length === 0 &&
    searchTerm === "" &&
    Object.values(levelFilters).every((v) => v)
  ) {
    return (
      <EmptyState
        icon="solar:file-text-bold"
        title="No log content available"
        description="Select a log file to view."
      />
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <Card className="flex flex-shrink-0 flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {logLevelsDefinition
            .filter((level) => level !== "TRACE")
            .map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => onLevelFilterChange(level, !levelFilters[level])}
                disabled={isLoading}
              >
                <Badge tone={getLevelBadgeTone(level, levelFilters[level])}>{level}</Badge>
              </button>
            ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <Input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter lines..."
            className="min-w-[180px] flex-1 md:max-w-xs"
          />

          <IconButton
            size="sm"
            onClick={onCopyLog}
            disabled={displayLines.length === 0 || copied}
            title={copied ? "Copied" : "Copy log"}
            aria-label={copied ? "Copied" : "Copy log"}
            className={copied ? "border-green-500/40 text-green-300" : undefined}
          >
            <Icon icon={copied ? "solar:check-circle-bold" : "solar:copy-bold"} className="h-4 w-4" />
          </IconButton>

          {onUploadLog && (
            <IconButton
              size="sm"
              onClick={async () => {
                if (isSubmittingUpload) return;
                setIsSubmittingUpload(true);
                try {
                  const url = await onUploadLog();
                  let clipboardSuccess = false;
                  try {
                    await writeText(url);
                    clipboardSuccess = true;
                  } catch (copyError) {
                    console.error("Failed to copy URL to clipboard:", copyError);
                  }

                  const successMessage = clipboardSuccess
                    ? "Link copied! Click to open."
                    : "Log uploaded (copy failed)! Click to open.";

                  toast.success(
                    (t) => (
                      <span
                        onClick={() => {
                          if (url && onOpenUploadUrl) onOpenUploadUrl(url);
                          toast.dismiss(t.id);
                        }}
                        className="cursor-pointer hover:underline"
                      >
                        {successMessage}
                      </span>
                    ),
                    { duration: 5000 },
                  );
                } catch (err: unknown) {
                  toast.error(`Upload failed: ${String(err)}`);
                } finally {
                  setIsSubmittingUpload(false);
                }
              }}
              disabled={isLoading || parsedLogLinesCount === 0 || isSubmittingUpload}
              title="Upload log"
              aria-label="Upload log"
            >
              <Icon icon="solar:upload-bold" className="h-4 w-4" />
            </IconButton>
          )}

          {onOpenFolder && (
            <IconButton
              size="sm"
              onClick={onOpenFolder}
              disabled={isLoading}
              title="Open logs folder"
              aria-label="Open logs folder"
            >
              <Icon icon="solar:folder-bold" className="h-4 w-4" />
            </IconButton>
          )}
        </div>
      </Card>

      <Card className="min-h-0 flex-1 overflow-hidden p-0">
        <div className="custom-scrollbar h-full overflow-y-auto" ref={scrollableContainerRef}>
          {linesForVirtuoso.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState
                icon="solar:filter-bold"
                title="No log lines match the current filters"
                description="Try adjusting search or level filters."
              />
            </div>
          ) : (
            <Virtuoso
              style={{ height: "100%" }}
              data={linesForVirtuoso}
              followOutput={isAutoscrollEnabled ? "smooth" : false}
              className={cn(
                "custom-scrollbar min-h-full bg-black/60 p-3 font-mono text-sm",
                isWordWrapEnabled ? "whitespace-pre-wrap" : "whitespace-pre",
              )}
              itemContent={(index, line) => (
                <div key={`${line.id}-${index}`} className="flex flex-nowrap items-start">
                  {line.timestamp ? (
                    <>
                      <span className={`select-none pr-2 ${getLevelColorClass(line.level)}`}>
                        <span className="opacity-80">[{line.timestamp}]</span>
                        <span className="ml-1 opacity-80">
                          [{line.thread}/{line.level ?? "-"}]
                        </span>
                      </span>
                      <span
                        className={`min-w-0 flex-1 break-words ${
                          line.level === "ERROR" || line.level === "WARN"
                            ? getLevelColorClass(line.level)
                            : "text-white/90"
                        }`}
                      >
                        {line.text}
                      </span>
                    </>
                  ) : (
                    <span
                      className={`min-w-0 flex-1 break-words pl-1 ${
                        line.level === "ERROR" || line.level === "WARN"
                          ? getLevelColorClass(line.level)
                          : "text-white/90"
                      }`}
                    >
                      {line.text}
                    </span>
                  )}
                </div>
              )}
            />
          )}
        </div>
      </Card>

      <Card className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 p-3">
        <p className="text-xs text-[var(--text-secondary)]">
          {searchTerm || Object.values(levelFilters).some((v) => !v)
            ? `${linesForVirtuoso.length} of ${parsedLogLinesCount} lines matching filters`
            : `${parsedLogLinesCount} lines`}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {isAutoscrollEnabled !== undefined && onAutoscrollChange && (
            <ToggleSwitch
              checked={isAutoscrollEnabled}
              onChange={onAutoscrollChange}
              label="Autoscroll"
              size="sm"
            />
          )}

          {logFiles.length > 0 && onLogSelect && (
            <Select
              value={selectedLogPath || ""}
              onChange={onLogSelect}
              options={[
                { value: "", label: "Select log file" },
                ...logFiles.map((path) => ({
                  value: path,
                  label: getFilename(path),
                })),
              ]}
              className="w-56"
              disabled={isLoading}
            />
          )}

          {onWordWrapChange && (
            <Button
              variant={isWordWrapEnabled ? "primary" : "secondary"}
              size="sm"
              onClick={() => onWordWrapChange(!isWordWrapEnabled)}
              disabled={isLoading}
              icon={<Icon icon="solar:text-bold" className="h-4 w-4" />}
            >
              Wrap
            </Button>
          )}

          {scrollToTop && (
            <IconButton size="sm" onClick={scrollToTop} disabled={isLoading} title="Scroll to top" aria-label="Scroll to top">
              <Icon icon="solar:double-alt-arrow-up-bold" className="h-4 w-4" />
            </IconButton>
          )}

          {scrollToBottom && (
            <IconButton
              size="sm"
              onClick={scrollToBottom}
              disabled={isLoading}
              title="Scroll to bottom"
              aria-label="Scroll to bottom"
            >
              <Icon icon="solar:double-alt-arrow-down-bold" className="h-4 w-4" />
            </IconButton>
          )}
        </div>
      </Card>
    </div>
  );
}
