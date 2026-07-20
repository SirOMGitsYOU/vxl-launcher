import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SpinnerRing } from '../ui/LoadingSpinner';
import { VanillaCapeImage } from './VanillaCapeImage';
import {
  getCachedCapeTexturePath,
  getCapePreviewPath,
  saveCapePreview,
} from '../../services/vanilla-cape-service';
import { getOrCreateStaticCapePreview } from '../../utils/cape-static-preview';
import { localFileToDisplayUrl } from '../../utils/local-file-url';
import { cn } from '../../lib/utils';

interface CapePreview2DProps {
  capeId: string;
  capeUrl: string;
  playerUuid?: string;
  className?: string;
}

const LOADING_OVERLAY_DELAY_MS = 350;

export const CapePreview2D: React.FC<CapePreview2DProps> = ({
  capeId,
  capeUrl,
  className,
}) => {
  const isNoCape = capeId === 'no-cape' || !capeUrl.trim();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [placeholderTextureUrl, setPlaceholderTextureUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isNoCape);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [placeholderWidth, setPlaceholderWidth] = useState(100);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const width = Math.round(container.getBoundingClientRect().width);
      if (width > 0) {
        setPlaceholderWidth(width);
      }
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!loading) {
      setShowLoadingOverlay(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setShowLoadingOverlay(true);
    }, LOADING_OVERLAY_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [loading]);

  const loadPreview = useCallback(async () => {
    if (isNoCape) {
      setPreviewUrl(null);
      setPlaceholderTextureUrl(null);
      setLoading(false);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);
    setPreviewUrl(null);
    setPlaceholderTextureUrl(null);

    try {
      const texturePath = await getCachedCapeTexturePath(capeId, capeUrl);
      const textureImageUrl = await localFileToDisplayUrl(texturePath);
      setPlaceholderTextureUrl(textureImageUrl);

      const staticPreviewUrl = await getOrCreateStaticCapePreview(
        capeId,
        textureImageUrl,
        getCapePreviewPath,
        saveCapePreview,
        localFileToDisplayUrl,
      );
      setPreviewUrl(staticPreviewUrl);
    } catch (previewError) {
      console.error('[CapePreview2D] Failed to load cape preview:', previewError);
      setError(true);
      setLoading(false);
    }
  }, [capeId, capeUrl, isNoCape]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const handlePreviewLoad = () => {
    setLoading(false);
    setError(false);
  };

  if (isNoCape) {
    return (
      <div
        ref={containerRef}
        className={cn('relative h-full w-full overflow-hidden', className)}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <VanillaCapeImage
            imageUrl={undefined}
            width={placeholderWidth}
            className="max-h-full max-w-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative h-full w-full overflow-hidden', className)}
    >
      {loading && placeholderTextureUrl && (
        <div className="absolute inset-0 flex items-center justify-center opacity-35">
          <VanillaCapeImage
            imageUrl={placeholderTextureUrl}
            width={placeholderWidth}
            className="max-h-full max-w-full"
          />
        </div>
      )}

      {previewUrl && !error && (
        <img
          src={previewUrl}
          alt="Cape preview"
          draggable={false}
          className={cn(
            'absolute inset-0 h-full w-full object-contain object-center',
            'transition-opacity duration-300 ease-out',
            loading ? 'opacity-0' : 'opacity-100',
          )}
          onLoad={handlePreviewLoad}
          onError={() => {
            setError(true);
            setLoading(false);
          }}
        />
      )}

      {loading && (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-10 flex items-center justify-center',
            showLoadingOverlay
              ? 'bg-[var(--surface-base)]/50'
              : 'bg-transparent',
          )}
          aria-hidden={!showLoadingOverlay}
        >
          {showLoadingOverlay ? (
            <SpinnerRing size="sm" />
          ) : (
            <div className="absolute inset-0 animate-pulse bg-[var(--surface-base)]/20" />
          )}
        </div>
      )}

      {error && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center">
          <span className="text-xs text-[var(--text-secondary)]">Preview unavailable</span>
          {placeholderTextureUrl && (
            <VanillaCapeImage
              imageUrl={placeholderTextureUrl}
              width={placeholderWidth}
              className="max-h-full max-w-full opacity-80"
            />
          )}
        </div>
      )}
    </div>
  );
};
