"use client";

import { useEffect, useRef } from "react";
import { useThemeStore } from "../../store/useThemeStore";
import { useQualitySettingsStore } from "../../store/quality-settings-store";
import { useWindowFocus } from "../../hooks/useWindowFocus";

interface NebulaGridProps {
  opacity?: number;
  speed?: number;
  gridSize?: number;
  className?: string;
}

export function NebulaGrid({
  opacity = 0.15,
  speed = 1,
  gridSize = 30,
  className = "",
}: NebulaGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);
  const staticBackground = useThemeStore((state) => state.staticBackground);
  const { qualityLevel } = useQualitySettingsStore();
  const isWindowFocused = useWindowFocus();

  const pausedTimeRef = useRef<number>(0);
  const totalPausedDurationRef = useRef<number>(0);
  const lastPauseStartRef = useRef<number>(0);
  const animationStartTimeRef = useRef<number>(0);

  const shouldAnimate = isWindowFocused && !staticBackground;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId = 0;
    let effectiveTime = 0;

    const qualityMultiplier =
      qualityLevel === "low" ? 0.5 : qualityLevel === "high" ? 1.5 : 1;
    const adjustedSpeed = speed * qualityMultiplier;
    const adjustedGridSize =
      qualityLevel === "low"
        ? gridSize * 1.5
        : qualityLevel === "high"
          ? gridSize * 0.7
          : gridSize;

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: Number.parseInt(result[1], 16),
            g: Number.parseInt(result[2], 16),
            b: Number.parseInt(result[3], 16),
          }
        : { r: 0, g: 0, b: 0 };
    };

    const rgb = hexToRgb(accentColor.value);

    const drawGrid = (timeValue: number) => {
      const { width, height } = canvas.getBoundingClientRect();
      if (width === 0 || height === 0) {
        return false;
      }

      ctx.clearRect(0, 0, width, height);

      const cellSize = adjustedGridSize;
      const cols = Math.ceil(width / cellSize) + 1;
      const rows = Math.ceil(height / cellSize) + 1;
      const offsetX = (timeValue * adjustedSpeed * 0.5) % cellSize;
      const offsetY = (timeValue * adjustedSpeed * 0.3) % cellSize;

      for (let y = 0; y < rows; y++) {
        const posY = y * cellSize - offsetY;
        ctx.beginPath();
        ctx.moveTo(0, posY);
        ctx.lineTo(width, posY);
        const lineOpacity =
          opacity * (0.3 + 0.7 * Math.sin(y * 0.1 + timeValue * 0.001));
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${lineOpacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      for (let x = 0; x < cols; x++) {
        const posX = x * cellSize - offsetX;
        ctx.beginPath();
        ctx.moveTo(posX, 0);
        ctx.lineTo(posX, height);
        const lineOpacity =
          opacity * (0.3 + 0.7 * Math.sin(x * 0.1 + timeValue * 0.001));
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${lineOpacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
          const posX = x * cellSize - offsetX;
          const posY = y * cellSize - offsetY;
          const pulse =
            0.5 +
            0.5 * Math.sin(x * 0.5 + y * 0.5 + timeValue * 0.003 * adjustedSpeed);
          const dotSize = 2 * pulse;
          const dotOpacity = opacity * pulse;

          ctx.beginPath();
          ctx.arc(posX, posY, dotSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${dotOpacity})`;
          ctx.fill();
        }
      }

      return true;
    };

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!shouldAnimate) {
        requestAnimationFrame(() => {
          drawGrid(pausedTimeRef.current * 0.06);
        });
      }
    };

    const renderGrid = (timestamp?: number) => {
      if (timestamp && animationStartTimeRef.current === 0) {
        animationStartTimeRef.current = timestamp;
      }

      if (!shouldAnimate) {
        if (timestamp && lastPauseStartRef.current === 0) {
          lastPauseStartRef.current = timestamp;
          pausedTimeRef.current =
            timestamp -
            animationStartTimeRef.current -
            totalPausedDurationRef.current;
        }

        drawGrid(pausedTimeRef.current * 0.06);
        return;
      }

      if (lastPauseStartRef.current > 0 && timestamp) {
        const pauseDuration = timestamp - lastPauseStartRef.current;
        totalPausedDurationRef.current += pauseDuration;
        lastPauseStartRef.current = 0;
      }

      if (timestamp) {
        const rawEffectiveTime =
          timestamp -
          animationStartTimeRef.current -
          totalPausedDurationRef.current;
        effectiveTime = rawEffectiveTime * 0.06;
      }

      if (!drawGrid(effectiveTime)) {
        animationFrameId = requestAnimationFrame(renderGrid);
        return;
      }

      animationFrameId = requestAnimationFrame(renderGrid);
    };

    window.addEventListener("resize", resize);
    resize();
    animationFrameId = requestAnimationFrame(renderGrid);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [accentColor.value, opacity, speed, gridSize, qualityLevel, shouldAnimate, staticBackground]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
    />
  );
}
