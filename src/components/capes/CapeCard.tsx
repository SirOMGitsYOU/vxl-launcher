"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useThemeStore } from "../../store/useThemeStore";
import { IconButton } from "../ui/buttons/IconButton";
import { getPlayerProfileByUuidOrName } from "../../services/cape-service";
// import type { MinecraftProfile } from '../../types/minecraft'; // Not needed if not fetching profile for display
import { Icon } from "@iconify/react";
import { CapeImage } from "./CapeImage"; // Assuming we want to show a 2D preview
import { Card } from "../ui/Card";
import { cn } from "../../lib/utils";

interface CapeCardProps {
  cape: CosmeticCape;
  onEquip: (capeHash: string) => void;
  isSelected?: boolean;
  isLoading?: boolean;
  index: number;
}

const CARD_MIN_WIDTH = 210;
const IMAGE_TARGET_HEIGHT = 160;
const IMAGE_TARGET_WIDTH = 100;

export function CapeCard({
  cape,
  onEquip,
  isSelected,
  isLoading,
  index,
}: CapeCardProps) {
  const { _id: capeHash, elytra, uses } = cape;

  const accentColor = useThemeStore((state) => state.accentColor);
  const isBackgroundAnimationEnabled = useThemeStore(
    (state) => state.isBackgroundAnimationEnabled,
  );

  const animationStyle = isBackgroundAnimationEnabled
    ? { animationDelay: `${index * 0.075}s` }
    : {};
  const animationClasses = isBackgroundAnimationEnabled
    ? "animate-in fade-in duration-500 fill-mode-both"
    : "";

  return (
    <div style={animationStyle} className={animationClasses}>
      <Card
        className={cn(
          "relative p-4 pt-1.5 pb-2 h-[380px] flex flex-col text-center group",
          "transition-all duration-300 ease-out hover:scale-105 hover:z-10",
          isLoading ? "opacity-60 pointer-events-none" : "",
          `min-w-[${CARD_MIN_WIDTH}px]`,
        )}
        variant={isSelected ? "flat" : "flat"}
        onClick={() => !isLoading && onEquip(capeHash)}
      >

        <div className="h-64 flex relative pt-2 pb-2 flex-grow items-center justify-center transition-transform duration-300 ease-out group-hover:scale-105">
          <div
            className="w-full flex items-center justify-center relative bg-black/10 rounded overflow-hidden"
            style={{ height: `${IMAGE_TARGET_HEIGHT}px` }}
          >
            {elytra && (
              <div
                className="absolute top-1 left-1 bg-accent text-accent-foreground px-1.5 py-0.5 text-xs font-bold rounded-sm pixelated-text shadow-md uppercase z-10"
                title="This cape includes an Elytra texture."
                style={{ backgroundColor: accentColor.value, color: "#ffffff" }}
              >
                Elytra
              </div>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-20 transition-opacity duration-300 ease-in-out">
            <div className="w-20 h-20 border-4 border-t-transparent border-white rounded-full animate-spin mb-4 transition-all duration-300"></div>
            <span className="font-minecraft text-2xl text-white lowercase animate-pulse transition-all duration-300">
              Applying...
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}
