"use client";

import {
  BACKGROUND_EFFECTS,
  useBackgroundEffectStore,
} from "../../store/background-effect-store";
import { useQualitySettingsStore } from "../../store/quality-settings-store";
import { useThemeStore } from "../../store/useThemeStore";
import { EnchantmentParticlesEffect } from "../effects/EnchantmentParticlesEffect";
import { NebulaGrid } from "../effects/NebulaGrid";
import { NebulaVoxels } from "../effects/NebulaVoxels";
import { RetroGridEffect } from "../effects/RetroGridEffect";
import { RetroVoxelGrid } from "../effects/RetroVoxelGrid";
import { VoxelGrid } from "../effects/VoxelGrid";
import PlainBackground from "../effects/PlainBackground";

export function PlayBackgroundEffect() {
  const { currentEffect } = useBackgroundEffectStore();
  const { qualityLevel } = useQualitySettingsStore();
  const { accentColor, staticBackground } = useThemeStore();

  const qualityParams =
    qualityLevel === "low"
      ? { particleCount: 30, opacity: 0.2, speed: 0.5 }
      : qualityLevel === "high"
        ? { particleCount: 80, opacity: 0.4, speed: 1.5 }
        : { particleCount: 50, opacity: 0.3, speed: 1 };

  switch (currentEffect) {
    case BACKGROUND_EFFECTS.ENCHANTMENT_PARTICLES:
      return (
        <EnchantmentParticlesEffect
          opacity={qualityParams.opacity}
          particleCount={qualityParams.particleCount}
          speed={qualityParams.speed}
        />
      );
    case BACKGROUND_EFFECTS.NEBULA_GRID:
      return (
        <NebulaGrid
          opacity={qualityParams.opacity}
          speed={qualityParams.speed}
          gridSize={30}
        />
      );
    case BACKGROUND_EFFECTS.NEBULA_VOXELS:
      return (
        <NebulaVoxels
          opacity={qualityParams.opacity}
          cubeCount={qualityParams.particleCount}
          speed={qualityParams.speed}
        />
      );
    case BACKGROUND_EFFECTS.RETRO_GRID:
      return (
        <RetroGridEffect
          renderMode="both"
          isAnimationEnabled={!staticBackground}
          customGridLineColor={`${accentColor.value}80`}
        />
      );
    case BACKGROUND_EFFECTS.VOXEL_GRID:
      return (
        <VoxelGrid
          opacity={qualityParams.opacity}
          cubeCount={qualityParams.particleCount}
          speed={qualityParams.speed}
          gridSize={30}
        />
      );
    case BACKGROUND_EFFECTS.RETRO_VOXEL_GRID:
      return (
        <RetroVoxelGrid
          opacity={qualityParams.opacity}
          cubeCount={qualityParams.particleCount}
          speed={qualityParams.speed}
        />
      );
    case BACKGROUND_EFFECTS.PLAIN_BACKGROUND:
      return <PlainBackground accentColorValue={accentColor.value} />;
    default:
      return null;
  }
}
