'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import * as skinview3d from 'skinview3d';
import { cn } from '../../lib/utils';
import { useWindowFocus } from '../../hooks/useWindowFocus';
import {
  getDefaultSkinTextureUrl,
  getSkinUrl,
  normalizeMinecraftTextureUrl,
} from '../../lib/avatar-utils';

export type SkinViewAnimation = 'none' | 'idle' | 'walk';

interface SkinView3DWrapperProps {
  skinUrl?: string | null;
  /** Used for NMSR fallback when the primary Mojang texture URL fails */
  playerUuid?: string | null;
  capeUrl?: string | null;
  skinVariant?: 'classic' | 'slim';
  className?: string;
  width?: number;
  height?: number;
  enableAutoRotate?: boolean;
  zoom?: number;
  displayAsElytra?: boolean;
  onPaintPixel?: (x: unknown, y: unknown) => void;
  autoRotateSpeed?: number;
  startFromBack?: boolean;
  enableRotate?: boolean;
  enableZoom?: boolean;
  enablePan?: boolean;
  horizontalRotationOnly?: boolean;
  animation?: SkinViewAnimation;
  animationSpeed?: number;
  pauseWhenUnfocused?: boolean;
  /** When false (default for hero), player faces the camera instead of spinning */
  faceCamera?: boolean;
}

const getModelType = (variant: 'classic' | 'slim' = 'classic') =>
  variant === 'slim' ? 'slim' : 'default';

function buildSkinLoadCandidates(
  url: string | null | undefined,
  playerUuid?: string | null,
): string[] {
  const candidates: string[] = [];

  if (url) {
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      candidates.push(url);
    } else {
      candidates.push(normalizeMinecraftTextureUrl(url));
    }
  }

  if (playerUuid) {
    candidates.push(getSkinUrl(playerUuid));
  }

  candidates.push(getDefaultSkinTextureUrl());

  return [...new Set(candidates)];
}

function applyViewerAnimation(
  viewer: skinview3d.SkinViewer,
  animation: SkinViewAnimation,
  speed: number,
) {
  if (animation === 'none') {
    viewer.animation = null;
    return;
  }

  const anim =
    animation === 'idle'
      ? new skinview3d.IdleAnimation()
      : new skinview3d.WalkingAnimation();
  anim.speed = speed;
  viewer.animation = anim;
}

export const SkinView3DWrapper: React.FC<SkinView3DWrapperProps> = ({
  skinUrl,
  playerUuid,
  capeUrl,
  skinVariant = 'classic',
  className,
  width: propWidth,
  height: propHeight,
  enableAutoRotate = false,
  zoom = 1.0,
  displayAsElytra = false,
  autoRotateSpeed = 1.0,
  startFromBack = false,
  enableRotate = true,
  enableZoom = true,
  enablePan = true,
  horizontalRotationOnly = false,
  animation = 'none',
  animationSpeed = 0.85,
  pauseWhenUnfocused = true,
  faceCamera = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const skinViewerRef = useRef<skinview3d.SkinViewer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSkinUrlRef = useRef<string | null>(null);
  const isWindowFocused = useWindowFocus();

  const loadSkinWithFallback = useCallback(
    async (viewer: skinview3d.SkinViewer, url: string | null | undefined) => {
      const modelType = getModelType(skinVariant);
      const candidates = buildSkinLoadCandidates(url, playerUuid);

      for (const candidate of candidates) {
        try {
          await viewer.loadSkin(candidate, { model: modelType });
          return;
        } catch (error) {
          console.warn(`[SkinView3D] Failed to load skin from ${candidate}`, error);
        }
      }

      console.error('[SkinView3D] Failed to load any skin candidate');
    },
    [playerUuid, skinVariant],
  );

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return () => {};

    const determineWidth = propWidth || containerRef.current.offsetWidth || 300;
    const determineHeight = propHeight || containerRef.current.offsetHeight || 400;

    const viewer = new skinview3d.SkinViewer({
      canvas: canvasRef.current,
      width: determineWidth,
      height: determineHeight,
    });

    skinViewerRef.current = viewer;

    if (skinUrl === null) {
      viewer.loadSkin(null);
    } else {
      void loadSkinWithFallback(viewer, skinUrl);
    }

    if (capeUrl) {
      viewer.loadCape(capeUrl, displayAsElytra ? { backEquipment: 'elytra' } : undefined);
    }
    viewer.autoRotate = enableAutoRotate;
    if (enableAutoRotate && autoRotateSpeed !== 1.0) {
      viewer.autoRotateSpeed = autoRotateSpeed;
    }
    viewer.zoom = zoom;
    applyViewerAnimation(viewer, animation, animationSpeed);

    if (startFromBack && viewer.playerObject) {
      viewer.playerObject.rotation.y = Math.PI;
    } else if (faceCamera && viewer.playerObject) {
      viewer.playerObject.rotation.y = Math.PI;
    } else if (!enableAutoRotate && viewer.playerObject) {
      viewer.playerObject.rotation.y = Math.PI;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      if (!skinViewerRef.current) return;
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (!propWidth) skinViewerRef.current.width = width;
        if (!propHeight) skinViewerRef.current.height = height;
      }
    });

    if (!propWidth || !propHeight) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      skinViewerRef.current?.dispose();
      skinViewerRef.current = null;
    };
  }, [propWidth, propHeight, enableAutoRotate, zoom, autoRotateSpeed, startFromBack, displayAsElytra, faceCamera]);

  useEffect(() => {
    if (!skinViewerRef.current) return;

    if (lastSkinUrlRef.current !== skinUrl) {
      lastSkinUrlRef.current = skinUrl ?? null;
    }

    if (skinUrl === null) {
      skinViewerRef.current.loadSkin(null);
      return;
    }

    void loadSkinWithFallback(skinViewerRef.current, skinUrl);
  }, [skinUrl, skinVariant, loadSkinWithFallback]);

  useEffect(() => {
    if (!skinViewerRef.current) return;

    if (capeUrl === null) {
      skinViewerRef.current.loadCape(null);
    } else if (capeUrl) {
      skinViewerRef.current.loadCape(
        capeUrl,
        displayAsElytra ? { backEquipment: 'elytra' } : undefined,
      );
    }
  }, [capeUrl, displayAsElytra]);

  useEffect(() => {
    if (skinViewerRef.current) {
      skinViewerRef.current.autoRotate = enableAutoRotate;
    }
  }, [enableAutoRotate]);

  useEffect(() => {
    if (skinViewerRef.current) {
      skinViewerRef.current.zoom = zoom;
    }
  }, [zoom]);

  useEffect(() => {
    if (!skinViewerRef.current) return;
    applyViewerAnimation(skinViewerRef.current, animation, animationSpeed);
  }, [animation, animationSpeed]);

  useEffect(() => {
    if (!skinViewerRef.current?.controls) return;

    skinViewerRef.current.controls.enableRotate = enableRotate;
    skinViewerRef.current.controls.enableZoom = enableZoom;
    skinViewerRef.current.controls.enablePan = enablePan;

    if (horizontalRotationOnly) {
      const middlePolarAngle = Math.PI / 2;
      skinViewerRef.current.controls.minPolarAngle = middlePolarAngle;
      skinViewerRef.current.controls.maxPolarAngle = middlePolarAngle;
    }
  }, [enableRotate, enableZoom, enablePan, horizontalRotationOnly]);

  useEffect(() => {
    if (!skinViewerRef.current || !pauseWhenUnfocused) return;

    const shouldPause = !isWindowFocused;
    if (skinViewerRef.current.animation) {
      skinViewerRef.current.animation.paused = shouldPause;
    }
    if (enableAutoRotate) {
      skinViewerRef.current.autoRotate = !shouldPause;
    }
  }, [isWindowFocused, pauseWhenUnfocused, enableAutoRotate]);

  return (
    <div ref={containerRef} className={cn('h-full w-full', className)}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
};
