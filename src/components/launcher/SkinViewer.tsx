"use client";

import React, { useEffect, useState } from "react";
import { cn } from "../../lib/utils";

interface SkinViewerProps {
  skinUrl: string;
  fallbackSkinUrl?: string;
  playerName?: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function SkinViewer({
  skinUrl,
  fallbackSkinUrl,
  playerName,
  width = 300,
  height = 400,
  className,
  style,
}: SkinViewerProps) {
  const [displayUrl, setDisplayUrl] = useState(skinUrl);
  const [hasError, setHasError] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    setDisplayUrl(skinUrl);
    setHasError(false);
    setUsedFallback(false);
  }, [skinUrl, fallbackSkinUrl]);

  const handleError = () => {
    if (fallbackSkinUrl && !usedFallback) {
      console.warn(
        `[SkinViewer] Primary skin failed, trying fallback: ${fallbackSkinUrl}`,
      );
      setUsedFallback(true);
      setDisplayUrl(fallbackSkinUrl);
      return;
    }
    console.warn(`[SkinViewer] Error loading image from skinUrl: ${displayUrl}`);
    setHasError(true);
  };

  if (hasError || !displayUrl) {
    // Show fallback if error or no skinUrl provided
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gray-700/50 rounded-md",
          className,
        )}
        style={{ width, height, ...style }}
      >
        <span className="text-gray-500 text-3xl">?</span>
      </div>
    );
  }

  return (
    <img
      src={displayUrl}
      alt={playerName ? `${playerName}'s Skin` : "Minecraft Skin"}
      width={width}
      height={height}
      className={cn("object-contain rounded-md select-none", className)}
      style={{
        imageRendering: "pixelated",
        userSelect: "none",
        ...style,
      }}
      draggable={false}
      onError={handleError}
    />
  );
}
