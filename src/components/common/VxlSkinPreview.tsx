"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SkinView, type SkinViewProps } from "vxl-skin-renderer/react";
import type { Attachable, RenderProfilePartial } from "vxl-skin-renderer/core";

import { useDeferredRendererSkin } from "../../hooks/useDeferredRendererSkin";
import { useIdleEmote } from "../../hooks/useIdleEmote";
import { useStableSkinTextureUrl } from "../../hooks/useStableSkinTextureUrl";
import { useWindowFocus } from "../../hooks/useWindowFocus";
import { useThemeStore } from "../../store/useThemeStore";

/** Stable empty array — SkinView's default `attachables = []` creates a new [] every render. */
const NO_ATTACHABLES: Attachable[] = [];

/**
 * Wait for the skin to finish loading in the renderer before the first setCape.
 * setCape during an in-flight setSkin cancels the skin texture (library limitation).
 * Cape swaps after that only call setCape — the skin URL is never touched.
 */
const INITIAL_CAPE_ATTACH_DELAY_MS = 200;

type VxlSkinPreviewProps = Pick<
  SkinViewProps,
  | "skin"
  | "model"
  | "cape"
  | "attachables"
  | "nametag"
  | "zoom"
  | "rotation"
  | "draggable"
  | "dragAxis"
  | "loading"
  | "className"
  | "style"
  | "outline"
> & {
  /** Back-compat alias for `skin`. */
  textureUrl?: string | null;
  /** Back-compat alias for `model`. */
  variant?: SkinViewProps["model"];
  /** When false, the player stands still instead of playing launcher idle emotes. */
  idleEmote?: boolean;
  fps?: number;
  /** When false, skeleton shows only on first skin load (not when swapping skins). Default true. */
  skeletonOnSkinChange?: boolean;
};

function stableCapeKey(cape: SkinViewProps["cape"]): string {
  if (cape == null) return "";
  if (typeof cape === "string") return cape;
  return `${cape.texture}|${cape.elytra ? "1" : "0"}|${cape.mcmeta ?? ""}`;
}

function stableAttachablesKey(attachables: Attachable[]): string {
  return attachables
    .map(
      (entry) =>
        `${entry.meta.id ?? ""}:${entry.assets.texture}:${entry.assets.geo ?? ""}`,
    )
    .join("|");
}

export function VxlSkinPreview({
  skin,
  textureUrl,
  model: _model,
  variant: _variant = "auto",
  cape,
  attachables,
  nametag,
  zoom = 1.75,
  rotation,
  draggable = true,
  dragAxis = "yaw",
  fps = 60,
  loading,
  className,
  style,
  outline,
  idleEmote: useEmote = true,
  skeletonOnSkinChange = true,
}: VxlSkinPreviewProps) {
  const idleEmote = useIdleEmote();
  const hasLoadedSkinOnceRef = useRef(false);
  const accentColor = useThemeStore((state) => state.accentColor);
  const isWindowFocused = useWindowFocus();
  const resolvedSkin = skin ?? textureUrl ?? null;
  const stableSkinUrl = useStableSkinTextureUrl(resolvedSkin);
  const stableAttachables = attachables ?? NO_ATTACHABLES;
  const capeKey = stableCapeKey(cape);
  const rendererModel = "auto" as const;

  const attachablesKey = stableAttachablesKey(stableAttachables);
  const rendererSyncKey = useMemo(
    () => `${stableSkinUrl ?? ""}|${attachablesKey}`,
    [stableSkinUrl, attachablesKey],
  );

  const deferredSkin = useDeferredRendererSkin(stableSkinUrl, rendererSyncKey);

  const [skinTextureReady, setSkinTextureReady] = useState(false);
  const [capeAttachAllowed, setCapeAttachAllowed] = useState(!resolvedSkin);

  useEffect(() => {
    setCapeAttachAllowed(!resolvedSkin);
  }, [stableSkinUrl, resolvedSkin]);

  useEffect(() => {
    if (!deferredSkin) {
      setSkinTextureReady(false);
      return;
    }

    let alive = true;
    setSkinTextureReady(false);
    const img = new Image();
    img.onload = () => {
      if (alive) setSkinTextureReady(true);
    };
    img.onerror = () => {
      if (alive) setSkinTextureReady(true);
    };
    img.src = deferredSkin;

    return () => {
      alive = false;
    };
  }, [deferredSkin]);

  useEffect(() => {
    if (deferredSkin && skinTextureReady) {
      hasLoadedSkinOnceRef.current = true;
    }
  }, [deferredSkin, skinTextureReady]);

  useEffect(() => {
    if (!resolvedSkin) return;
    if (!deferredSkin || !skinTextureReady || capeAttachAllowed) return;

    const id = window.setTimeout(() => {
      setCapeAttachAllowed(true);
    }, INITIAL_CAPE_ATTACH_DELAY_MS);

    return () => clearTimeout(id);
  }, [capeAttachAllowed, deferredSkin, resolvedSkin, skinTextureReady]);

  const isSkinApplying = useMemo(() => {
    if (!resolvedSkin) return false;
    if (!stableSkinUrl || !deferredSkin) return true;
    return !skinTextureReady;
  }, [resolvedSkin, stableSkinUrl, deferredSkin, skinTextureReady]);

  const showLoading =
    Boolean(loading) ||
    (isSkinApplying &&
      (skeletonOnSkinChange || !hasLoadedSkinOnceRef.current));

  const rendererCape = useMemo((): SkinViewProps["cape"] => {
    if (cape == null) return null;
    if (resolvedSkin && !capeAttachAllowed) return null;
    if (typeof cape === "string") return cape;
    return {
      texture: cape.texture,
      elytra: cape.elytra,
      mcmeta: cape.mcmeta,
      mcmetaJson: cape.mcmetaJson,
    };
  }, [capeKey, cape, resolvedSkin, capeAttachAllowed]);

  const profile = useMemo<RenderProfilePartial>(
    () => ({
      renderer: {
        fpsCap: isWindowFocused ? fps : 1,
        maxDpr: 1.5,
      },
      loading: {
        skeletonColor: accentColor.value,
      },
    }),
    [accentColor.value, fps, isWindowFocused],
  );

  return (
    <SkinView
      profile={profile}
      skin={deferredSkin}
      model={rendererModel}
      attachables={stableAttachables}
      cape={rendererCape}
      nametag={nametag}
      emote={useEmote && deferredSkin && !showLoading ? idleEmote.urls : null}
      onEmoteEnd={
        useEmote && deferredSkin && !showLoading && !idleEmote.loop
          ? idleEmote.onEnd
          : undefined
      }
      rotation={rotation}
      zoom={zoom}
      draggable={draggable}
      dragAxis={dragAxis}
      loading={showLoading}
      outline={outline}
      className={className}
      style={style}
    />
  );
}
