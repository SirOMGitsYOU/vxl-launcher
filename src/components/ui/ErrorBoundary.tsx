"use client";

import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || "An unexpected error occurred.",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleOpenLogs = async (): Promise<void> => {
    try {
      const launcherDir = await invoke<string>("get_launcher_directory");
      window.open(`file://${launcherDir}`, "_blank");
    } catch (error) {
      console.error("Failed to open launcher directory:", error);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-[var(--surface-base)] p-8 text-center">
          <h1 className="font-minecraft text-xl uppercase text-[var(--accent)]">
            Something went wrong
          </h1>
          <p className="max-w-md text-sm text-[var(--text-muted)]">
            {this.state.message}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="border border-[var(--surface-border)] px-4 py-2 font-minecraft uppercase hover:bg-[var(--surface-raised)]"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={() => void this.handleOpenLogs()}
              className="border border-[var(--surface-border)] px-4 py-2 font-minecraft uppercase hover:bg-[var(--surface-raised)]"
            >
              Open logs folder
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
