"use client";

import React from "react";
import { useThemeStore } from "../../store/useThemeStore";
import { useWindowFocus } from "../../hooks/useWindowFocus";
import { NebulaVoxels } from "./NebulaVoxels";
import { RetroGridEffect } from "./RetroGridEffect";

interface RetroVoxelGridProps {
  cubeCount?: number;
  opacity?: number;
  speed?: number;
  className?: string;
  renderMode?: "top" | "bottom" | "both";
  perspective?: string;
}

export function RetroVoxelGrid({
  cubeCount = 30,
  opacity = 0.2,
  speed = 1,
  className = "",
  renderMode = "both",
  perspective = "150px",
}: RetroVoxelGridProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const isBackgroundAnimationEnabled = useThemeStore((state) => state.isBackgroundAnimationEnabled);
  const isWindowFocused = useWindowFocus();
  
  // Animation should only run if both window is focused AND background animations are enabled
  const shouldAnimate = isWindowFocused && isBackgroundAnimationEnabled;

  // Calculate grid background color with low opacity
  const hexToRgbaWithLowOpacity = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.05)`;
  };

  // Calculate custom grid line color
  const gridLineColor = `${accentColor.value}80`;

  return (
    <div className={`absolute inset-0 ${className}`} style={{ perspective }}>
      {/* Retro Grid Background */}
      <div 
        className="absolute inset-0"
        style={{ backgroundColor: hexToRgbaWithLowOpacity(accentColor.value) }}
      >
        <RetroGridEffect
          renderMode={renderMode}
          perspective={perspective}
          customGridLineColor={gridLineColor}
          isAnimationEnabled={shouldAnimate}
        />
      </div>
      
      {/* Nebula Voxels Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <NebulaVoxels
          cubeCount={cubeCount}
          opacity={opacity}
          speed={speed}
        />
      </div>
    </div>
  );
}
