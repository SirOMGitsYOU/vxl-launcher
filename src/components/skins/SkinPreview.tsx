import { LoadingSpinner } from "../ui/LoadingSpinner";
import { SkinViewer } from "../launcher/SkinViewer";
import { MinecraftSkinService } from "../../services/minecraft-skin-service";
import type { MinecraftSkin } from "../../types/localSkin";
import {
  buildSkinPreviewCacheKey,
  getOrCreateStaticSkinPreview,
} from "../../utils/skin-static-preview";
import React, { memo, useEffect, useRef, useState } from "react";
import { localFileToDisplayUrl } from "../../utils/local-file-url";

const NMSR_TIMEOUT_MS = 8000;
const NMSR_RENDER_TYPE = "fullbody";

interface SkinPreviewProps {
  skin: MinecraftSkin;
  renderType?: string;
  width?: number;
  height?: number;
  className?: string;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("NMSR preview timed out"));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export const SkinPreview = memo(function SkinPreview({
  skin,
  renderType = NMSR_RENDER_TYPE,
  width = 140,
  height = 140,
  className,
}: SkinPreviewProps) {
  const [renderUrl, setRenderUrl] = useState<string>("");
  const [isRenderLoading, setIsRenderLoading] = useState<boolean>(true);
  const [canShowSpinner, setCanShowSpinner] = useState<boolean>(false);
  const spinnerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsRenderLoading(true);
    setRenderUrl("");
    setCanShowSpinner(false);

    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current);
    }

    spinnerTimeoutRef.current = setTimeout(() => {
      if (isMounted) {
        setCanShowSpinner(true);
      }
    }, 500);

    const loadFallbackPreview = async (cacheKey: string) => {
      const staticPreviewUrl = await getOrCreateStaticSkinPreview(
        cacheKey,
        skin.base64_data,
        skin.variant,
        MinecraftSkinService.getSkinPreviewPath,
        MinecraftSkinService.saveSkinPreview,
        localFileToDisplayUrl,
      );

      if (isMounted) {
        setRenderUrl(staticPreviewUrl);
        setIsRenderLoading(false);
        setCanShowSpinner(false);
      }
    };

    const fetchRender = async () => {
      if (!skin?.base64_data) {
        if (isMounted) {
          setRenderUrl("");
          setIsRenderLoading(false);
          setCanShowSpinner(false);
        }
        return;
      }

      const cacheKey = await buildSkinPreviewCacheKey(
        skin.base64_data,
        renderType,
        "full",
      );

      try {
        if (skin.name) {
          try {
            const payload = {
              player_name: skin.name.replace(/[^a-zA-Z0-9_]/g, "_") || "skin",
              render_type: renderType,
              render_view: "full",
              base64_skin_data: skin.base64_data,
              slim: skin.variant === "slim",
            };

            const localPath = await withTimeout(
              MinecraftSkinService.getStarlightSkinRender(payload),
              NMSR_TIMEOUT_MS,
            );

            if (isMounted) {
              setRenderUrl(await localFileToDisplayUrl(localPath));
              setIsRenderLoading(false);
              setCanShowSpinner(false);
            }
            return;
          } catch (nmsrError) {
            console.warn(
              `[SkinPreview] NMSR preview failed for ${skin.name}, using static fallback:`,
              nmsrError,
            );
          }
        }

        await loadFallbackPreview(cacheKey);
      } catch (error) {
        console.error(`[SkinPreview] Failed to load preview for ${skin.name}:`, error);
        if (isMounted) {
          setRenderUrl("");
          setIsRenderLoading(false);
          setCanShowSpinner(false);
        }
      } finally {
        if (spinnerTimeoutRef.current) {
          clearTimeout(spinnerTimeoutRef.current);
        }
      }
    };

    fetchRender();

    return () => {
      isMounted = false;
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
      }
    };
  }, [skin?.name, skin?.base64_data, skin?.variant, renderType]);

  return (
    <div className={`relative ${className || ""}`}>
      {isRenderLoading && canShowSpinner ? (
        <LoadingSpinner
          size="md"
          variant="default"
          message="Loading..."
          showMessage={true}
          shadowDepth="none"
        />
      ) : !isRenderLoading ? (
        <SkinViewer
          skinUrl={renderUrl || ""}
          width={width}
          height={height}
          className="w-full h-full"
        />
      ) : null}
    </div>
  );
});
