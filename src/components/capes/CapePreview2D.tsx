import React, { useState, useEffect, useCallback, useRef } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { VanillaCapeImage } from './VanillaCapeImage';
import {
  getCachedCapeTexturePath,
  getCapePreviewPath,
  saveCapePreview,
} from '../../services/vanilla-cape-service';
import { getOrCreateStaticCapePreview } from '../../utils/cape-static-preview';

interface CapePreview2DProps {
  capeId: string;
  capeUrl: string;
  playerUuid?: string;
  className?: string;
}

type PreviewMode = 'starlight' | 'fallback' | 'placeholder';

const STARLIGHT_TIMEOUT_MS = 8000;

function buildStarlightUrl(capeUrl: string, playerUuid?: string): string {
  const formattedUuid = playerUuid
    ? playerUuid.replace(/-/g, '')
    : 'ec561538f3fd461daff5086b22154bce';

  const baseUrl = `https://starlightskins.lunareclipse.studio/render/default/${formattedUuid}/full`;
  const cameraPosition = encodeURIComponent('{"x":"-30.26","y":"20.34","z":"54.94"}');
  const cameraParams = `?cameraPosition=${cameraPosition}`;
  const fovParam = '&cameraFOV=22';

  let fullUrl = `${baseUrl}${cameraParams}${fovParam}`;
  if (capeUrl && capeUrl.trim() !== '') {
    fullUrl += `&capeTexture=${encodeURIComponent(capeUrl)}`;
  } else {
    fullUrl += '&capeTexture=n/a';
  }

  return fullUrl;
}

export const CapePreview2D: React.FC<CapePreview2DProps> = ({
  capeId,
  capeUrl,
  playerUuid,
  className,
}) => {
  const isNoCape = capeId === 'no-cape' || !capeUrl.trim();
  const [mode, setMode] = useState<PreviewMode>(isNoCape ? 'placeholder' : 'starlight');
  const [starlightUrl, setStarlightUrl] = useState('');
  const [fallbackImageUrl, setFallbackImageUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(!isNoCape);
  const [error, setError] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackAttemptedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = useState({ width: 140, height: 140 });

  const clearStarlightTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const loadFallbackTexture = useCallback(async () => {
    if (isNoCape || fallbackAttemptedRef.current) {
      if (isNoCape) {
        setMode('placeholder');
        setLoading(false);
      }
      return;
    }

    fallbackAttemptedRef.current = true;
    setMode('fallback');
    setLoading(true);
    setError(false);

    try {
      const texturePath = await getCachedCapeTexturePath(capeId, capeUrl);
      const textureImageUrl = convertFileSrc(texturePath);
      const staticPreviewUrl = await getOrCreateStaticCapePreview(
        capeId,
        textureImageUrl,
        getCapePreviewPath,
        saveCapePreview,
        convertFileSrc,
      );
      setFallbackImageUrl(staticPreviewUrl);
    } catch (fallbackError) {
      console.error('[CapePreview2D] Failed to load cached cape preview:', fallbackError);
      setError(true);
      setLoading(false);
    }
  }, [capeId, capeUrl, isNoCape]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const size = Math.max(Math.round(rect.width), Math.round(rect.height), 80);
      setPreviewSize({ width: size, height: size });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fallbackAttemptedRef.current = false;
    clearStarlightTimeout();

    if (isNoCape) {
      setMode('placeholder');
      setStarlightUrl('');
      setFallbackImageUrl(undefined);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;

    const initPreview = async () => {
      try {
        const existingPreviewPath = await getCapePreviewPath(capeId);
        if (cancelled) return;

        if (existingPreviewPath) {
          setMode('fallback');
          setStarlightUrl('');
          setFallbackImageUrl(convertFileSrc(existingPreviewPath));
          setLoading(true);
          setError(false);
          return;
        }
      } catch (previewError) {
        console.warn('[CapePreview2D] Failed to check cached preview path:', previewError);
      }

      if (cancelled) return;

      setMode('starlight');
      setStarlightUrl(buildStarlightUrl(capeUrl, playerUuid));
      setFallbackImageUrl(undefined);
      setLoading(true);
      setError(false);

      timeoutRef.current = setTimeout(() => {
        console.warn('[CapePreview2D] Starlight preview timed out, using cached texture fallback');
        loadFallbackTexture();
      }, STARLIGHT_TIMEOUT_MS);
    };

    initPreview();

    return () => {
      cancelled = true;
      clearStarlightTimeout();
    };
  }, [capeId, capeUrl, playerUuid, isNoCape, clearStarlightTimeout, loadFallbackTexture]);

  const handleStarlightLoad = () => {
    clearStarlightTimeout();
    setLoading(false);
    setError(false);
  };

  const handleStarlightError = () => {
    clearStarlightTimeout();
    console.warn('[CapePreview2D] Starlight preview failed, using cached texture fallback');
    loadFallbackTexture();
  };

  const handleFallbackLoad = () => {
    setLoading(false);
    setError(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      <div className="absolute inset-0 flex items-center justify-center">
        {loading && (
          <LoadingSpinner
            size="md"
            variant="default"
            message="Loading Cape..."
            showMessage={true}
            shadowDepth="none"
          />
        )}

        {error && !loading && (
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">Failed to load cape</p>
          </div>
        )}

        {mode === 'starlight' && starlightUrl && (
          <img
            src={starlightUrl}
            alt="Cape Preview"
            className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
            loading="lazy"
            style={{ imageRendering: 'auto' }}
            onLoad={handleStarlightLoad}
            onError={handleStarlightError}
          />
        )}

        {mode === 'fallback' && !error && fallbackImageUrl && (
          <img
            src={fallbackImageUrl}
            alt="Cape Preview"
            className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
            loading="lazy"
            style={{ imageRendering: 'auto' }}
            onLoad={handleFallbackLoad}
            onError={() => setError(true)}
          />
        )}

        {mode === 'placeholder' && !error && (
          <div className="flex items-center justify-center w-full h-full">
            <VanillaCapeImage
              imageUrl={undefined}
              width={previewSize.width}
              className="max-w-full max-h-full"
              onLoad={handleFallbackLoad}
            />
          </div>
        )}
      </div>
    </div>
  );
};
