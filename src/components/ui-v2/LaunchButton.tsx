"use client";

import type React from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { Button } from "./Button";
import { IconButton } from "./IconButton";

interface LaunchButtonProps {
  label: string;
  sublabel?: string;
  onLaunch: () => void;
  onOpenPicker?: () => void;
  isLaunching?: boolean;
  disabled?: boolean;
  className?: string;
}

export function LaunchButton({
  label,
  sublabel,
  onLaunch,
  onOpenPicker,
  isLaunching = false,
  disabled = false,
  className,
}: LaunchButtonProps) {
  return (
    <div className={cn("flex items-stretch w-full max-w-md", className)}>
      <Button
        variant={isLaunching ? "danger" : "primary"}
        size="lg"
        onClick={onLaunch}
        disabled={disabled}
        className="flex-1 rounded-r-none min-h-[52px]"
        icon={
          <Icon
            icon={isLaunching ? "solar:stop-bold" : "solar:play-bold"}
            className="w-5 h-5"
          />
        }
      >
        <span className="flex flex-col items-start leading-tight">
          <span>{isLaunching ? "Stop" : label}</span>
          {sublabel && (
            <span className="text-xs font-normal opacity-90 truncate max-w-[220px]">
              {sublabel}
            </span>
          )}
        </span>
      </Button>
      {onOpenPicker && (
        <IconButton
          size="lg"
          onClick={onOpenPicker}
          disabled={disabled || isLaunching}
          className="rounded-l-none border-l-0 min-w-[52px]"
          aria-label="Choose profile"
        >
          <Icon icon="solar:alt-arrow-down-linear" className="w-5 h-5" />
        </IconButton>
      )}
    </div>
  );
}
