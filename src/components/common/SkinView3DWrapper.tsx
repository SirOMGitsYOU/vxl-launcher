'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import * as skinview3d from 'skinview3d';
import { cn } from '../../lib/utils';
import { getFallbackSkinUrl } from '../../lib/avatar-utils';

interface SkinView3DWrapperProps {
  skinUrl?: string | null;
  capeUrl?: string | null;
  skinVariant?: 'classic' | 'slim';
  className?: string;
  width?: number;
  height?: number;
  enableAutoRotate?: boolean;
  zoom?: number;
  displayAsElytra?: boolean;
  onPaintPixel?: (x: any, y: any) => void;
  autoRotateSpeed?: number;
  startFromBack?: boolean;
  enableRotate?: boolean;
  enableZoom?: boolean;
  enablePan?: boolean;
  horizontalRotationOnly?: boolean;
}

const DEFAULT_STEVE_SKIN_URL = 'https://nmsr.nickac.dev/skin/8667ba71b358a38efd67f79b3cc33b1f';
const FALLBACK_STEVE_SKIN_URL = 'https://nmsr.nickac.dev/skin/8667ba71b358a38efd67f79b3cc33b1f';

// Helper function to convert skin variant to skinview3d model
const getModelType = (variant: 'classic' | 'slim' = 'classic') => {
  return variant === 'slim' ? 'slim' : 'default';
};

export const SkinView3DWrapper: React.FC<SkinView3DWrapperProps> = ({
  skinUrl,
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
}) => {
  console.log("[SkinView3D] Component props:", {
    skinUrl: skinUrl ? (typeof skinUrl === 'string' ? skinUrl.substring(0, 50) + "..." : skinUrl) : null,
    skinVariant,
    enableAutoRotate,
    zoom
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const skinViewerRef = useRef<skinview3d.SkinViewer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSkinUrlRef = useRef<string | null>(null);
  const skinLoadedSuccessfullyRef = useRef<boolean>(false);

  // Function to load skin with fallback support
  const loadSkinWithFallback = useCallback(async (viewer: skinview3d.SkinViewer, url: string) => {
    try {
      // Try loading the primary URL
      await viewer.loadSkin(url);
      skinLoadedSuccessfullyRef.current = true;
      console.log(`[SkinView3D] Successfully loaded skin from ${url}`);
    } catch (error) {
      console.warn(`[SkinView3D] Failed to load skin from ${url}, trying fallback...`, error);
      try {
        // Extract UUID from the URL if it's a Crafatar URL
        const uuidMatch = url.match(/\/skin(?:s)?\/([a-f0-9]{32})/);
        if (uuidMatch) {
          const uuid = uuidMatch[1];
          const fallbackUrl = getFallbackSkinUrl(uuid);
          console.log(`[SkinView3D] Attempting fallback skin URL: ${fallbackUrl}`);
          await viewer.loadSkin(fallbackUrl);
          skinLoadedSuccessfullyRef.current = true;
        } else {
          console.log(`[SkinView3D] Attempting default Steve skin: ${DEFAULT_STEVE_SKIN_URL}`);
          await viewer.loadSkin(DEFAULT_STEVE_SKIN_URL);
          skinLoadedSuccessfullyRef.current = true;
        }
      } catch (fallbackError) {
        console.error(`[SkinView3D] Failed to load skin from both primary and fallback URLs`, fallbackError);
        // Use default Steve skin if both fail
        try {
          console.log(`[SkinView3D] Attempting default Steve skin: ${DEFAULT_STEVE_SKIN_URL}`);
          await viewer.loadSkin(DEFAULT_STEVE_SKIN_URL);
          skinLoadedSuccessfullyRef.current = true;
        } catch (defaultError) {
          console.error(`[SkinView3D] Failed to load default Steve skin, trying fallback...`, defaultError);
          // Last resort: try fallback Steve skin
          try {
            console.log(`[SkinView3D] Attempting fallback Steve skin: ${FALLBACK_STEVE_SKIN_URL}`);
            await viewer.loadSkin(FALLBACK_STEVE_SKIN_URL);
            skinLoadedSuccessfullyRef.current = true;
          } catch (fallbackSteveError) {
            console.error(`[SkinView3D] Failed to load any skin`, fallbackSteveError);
            skinLoadedSuccessfullyRef.current = false;
          }
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return () => {};

    const determineWidth = propWidth || containerRef.current.offsetWidth || 300;
    const determineHeight = propHeight || containerRef.current.offsetHeight || 400;

    const viewer = new skinview3d.SkinViewer({
      canvas: canvasRef.current,
      width: determineWidth,
      height: determineHeight,
      skin: skinUrl === null ? undefined : (skinUrl || DEFAULT_STEVE_SKIN_URL),
    });

    skinViewerRef.current = viewer;

    // Load skin with model based on skinVariant prop
    const modelType = getModelType(skinVariant);
    if (skinUrl === null) {
      viewer.loadSkin(null);
    } else if (skinUrl) {
      viewer.loadSkin(skinUrl, { model: modelType });
    } else if (DEFAULT_STEVE_SKIN_URL) {
      viewer.loadSkin(DEFAULT_STEVE_SKIN_URL, { model: modelType });
    }

    if (capeUrl) {
      viewer.loadCape(capeUrl, displayAsElytra ? { backEquipment: "elytra" } : undefined);
    }
    viewer.autoRotate = enableAutoRotate;
    if (enableAutoRotate && autoRotateSpeed !== 1.0) {
      viewer.autoRotateSpeed = autoRotateSpeed;
    }
    viewer.zoom = zoom;
   
    if (startFromBack && viewer.playerObject) {
        viewer.playerObject.rotation.y = Math.PI; 
    } else if (!enableAutoRotate && viewer.playerObject) {
        viewer.playerObject.rotation.y = Math.PI; 
    }


    const resizeObserver = new ResizeObserver(entries => {
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
      if (skinViewerRef.current) {
      
        skinViewerRef.current = null;
      }
    };

  }, [propWidth, propHeight, enableAutoRotate, zoom]);

 
  useEffect(() => {
    if (!skinViewerRef.current) return;

    // Clear any existing timeout
    if (lastSkinUrlRef.current !== skinUrl) {
      lastSkinUrlRef.current = skinUrl;
      skinLoadedSuccessfullyRef.current = false;
    }

    if (skinUrl === null) {
      // Don't load any skin
      skinViewerRef.current.loadSkin(null);
    } else if (skinUrl) {
      // Only load skin if we have a valid URL
      loadSkinWithFallback(skinViewerRef.current, skinUrl);
    } else {
      // Load default Steve skin
      loadSkinWithFallback(skinViewerRef.current, DEFAULT_STEVE_SKIN_URL);
    }
  }, [skinUrl, loadSkinWithFallback]);

  // Separate useEffect for skinVariant changes only
  useEffect(() => {
    if (skinViewerRef.current && skinUrl) {
      const modelType = getModelType(skinVariant);
      console.log(`[SkinView3D] Changing model to: ${modelType} for variant: ${skinVariant}`);
      skinViewerRef.current.loadSkin(skinUrl, { model: modelType });
    }
  }, [skinVariant]);

  useEffect(() => {
    if (skinViewerRef.current) {
      if (capeUrl === null) {
        skinViewerRef.current.loadCape(null);
      } else if (capeUrl) {
        skinViewerRef.current.loadCape(capeUrl, displayAsElytra ? { backEquipment: "elytra" } : undefined);
      }
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

  // Update rotation controls
  useEffect(() => {
    if (!skinViewerRef.current || !skinViewerRef.current.controls) return;
    
    skinViewerRef.current.controls.enableRotate = enableRotate;
    skinViewerRef.current.controls.enableZoom = enableZoom;
    skinViewerRef.current.controls.enablePan = enablePan;
    
    if (horizontalRotationOnly) {
      const middlePolarAngle = Math.PI / 2;
      skinViewerRef.current.controls.minPolarAngle = middlePolarAngle;
      skinViewerRef.current.controls.maxPolarAngle = middlePolarAngle;
    }
  }, [enableRotate, enableZoom, enablePan, horizontalRotationOnly]);

  return (
    <div ref={containerRef} className={cn("w-full h-full", className)}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}; 
