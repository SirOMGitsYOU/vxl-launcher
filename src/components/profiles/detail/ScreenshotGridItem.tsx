"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../../lib/utils";
import type { ScreenshotInfo as ActualScreenshotInfo } from "../../../types/profile";
import { Card } from "../../ui-v2";

interface ScreenshotGridItemProps {
  screenshot: ActualScreenshotInfo;
  onItemClick?: (screenshot: ActualScreenshotInfo) => void;
  previewSrc: string | null;
  isLoading: boolean;
  hasError: boolean;
}

const ScreenshotGridItemComponent: React.FC<ScreenshotGridItemProps> = ({
  screenshot,
  onItemClick,
  previewSrc,
  isLoading,
  hasError,
}) => {
  const [isImageTagLoaded, setIsImageTagLoaded] = useState(false);
  const [imageTagError, setImageTagError] = useState(false);

  useEffect(() => {
    setIsImageTagLoaded(false);
    setImageTagError(false);
  }, [previewSrc, isLoading, hasError]);

  return (
    <button
      type="button"
      onClick={onItemClick ? () => onItemClick(screenshot) : undefined}
      className="w-full text-left"
    >
      <Card
        interactive
        className="group relative overflow-hidden p-0"
        style={{ aspectRatio: "16 / 9" }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface-overlay)]">
            <Icon icon="solar:gallery-bold" className="h-6 w-6 text-[var(--text-muted)]" />
          </div>
        )}

        {!isLoading && previewSrc && !hasError && !imageTagError && (
          <img
            src={previewSrc}
            alt={screenshot.filename}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
              isImageTagLoaded ? "opacity-100" : "opacity-0",
            )}
            onError={() => {
              setImageTagError(true);
              setIsImageTagLoaded(false);
            }}
            onLoad={() => {
              setIsImageTagLoaded(true);
              setImageTagError(false);
            }}
          />
        )}

        {!isLoading && (hasError || imageTagError) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--surface-overlay)] p-2">
            <Icon icon="solar:gallery-remove-bold" className="mb-1 h-6 w-6 text-red-400/80" />
            <p className="text-center text-xs text-red-300">Preview error</p>
          </div>
        )}

        {!isLoading && !previewSrc && !hasError && !imageTagError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--surface-overlay)] p-2">
            <Icon icon="solar:gallery-minimalistic-bold" className="mb-1 h-6 w-6 text-[var(--text-muted)]" />
            <p className="text-center text-xs text-[var(--text-secondary)]">No preview</p>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <p className="truncate text-xs text-white">{screenshot.filename}</p>
        </div>
      </Card>
    </button>
  );
};

export const ScreenshotGridItem = React.memo(ScreenshotGridItemComponent);
