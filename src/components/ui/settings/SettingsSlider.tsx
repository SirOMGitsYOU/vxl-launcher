"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../../lib/utils";
import { useThemeStore } from "../../../store/useThemeStore";

interface SettingsSliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  unit?: string;
  formatValue?: (value: number) => string;
  className?: string;
}

function formatDisplay(
  val: number,
  unit?: string,
  formatValue?: (value: number) => string,
) {
  return formatValue?.(val) ?? `${val}${unit ?? ""}`;
}

export function SettingsSlider({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
  unit,
  formatValue,
  className,
}: SettingsSliderProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const [draftValue, setDraftValue] = useState(value);
  const [isInteracting, setIsInteracting] = useState(false);
  const draftRef = useRef(value);

  useEffect(() => {
    if (!isInteracting) {
      setDraftValue(value);
      draftRef.current = value;
    }
  }, [value, isInteracting]);

  const sliderValue = isInteracting ? draftValue : value;
  const committedDisplay = formatDisplay(value, unit, formatValue);
  const draftDisplay = formatDisplay(draftValue, unit, formatValue);
  const percent =
    max === min ? 0 : ((sliderValue - min) / (max - min)) * 100;

  const commit = useCallback(() => {
    setIsInteracting((interacting) => {
      if (!interacting) return false;
      const next = draftRef.current;
      if (next !== value) {
        onChange(next);
      }
      return false;
    });
  }, [onChange, value]);

  const beginInteraction = useCallback(() => {
    draftRef.current = value;
    setDraftValue(value);
    setIsInteracting(true);
  }, [value]);

  const handlePointerDown = useCallback(() => {
    beginInteraction();

    const handlePointerUp = () => {
      commit();
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointerup", handlePointerUp);
  }, [beginInteraction, commit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(e.target.value);
    draftRef.current = next;
    setDraftValue(next);
  };

  const handleBlur = () => {
    commit();
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 min-w-[148px] max-w-[180px]",
        disabled && "opacity-50 pointer-events-none",
        className,
      )}
    >
      <div className="relative flex-1 min-w-0 pt-6">
        {isInteracting && (
          <div
            className="absolute top-0 z-10 pointer-events-none -translate-x-1/2"
            style={{ left: `${percent}%` }}
          >
            <span
              className="inline-block rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums text-white shadow-sm"
              style={{
                backgroundColor: accentColor.value,
                boxShadow: `0 2px 8px ${accentColor.value}40`,
              }}
            >
              {draftDisplay}
            </span>
          </div>
        )}

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={sliderValue}
          disabled={disabled}
          onChange={handleChange}
          onPointerDown={handlePointerDown}
          onFocus={beginInteraction}
          onBlur={handleBlur}
          className="settings-slider-input h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15"
          style={{ accentColor: accentColor.value }}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={sliderValue}
          aria-valuetext={isInteracting ? draftDisplay : committedDisplay}
        />
      </div>

      <span className="w-10 shrink-0 text-right text-sm tabular-nums text-white/80">
        {committedDisplay}
      </span>
    </div>
  );
}
