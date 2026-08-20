import { useMemo } from "react";
import type {
  Attachable,
  NametagOptions,
  SnapshotRequest,
} from "vxl-skin-renderer/snapshot";

import { getSkinPreview } from "../lib/skin-preview";
import { useSkinStore } from "../store/useSkinStore";
import type { SkinVariant } from "../types/localSkin";
import { useAsyncResource } from "./useAsyncResource";

const DEFAULT_FALLBACK_SKIN_URL = "/skins/steve.png";
const NO_ATTACHABLES: Attachable[] = [];

export interface SkinPreviewInput {
  textureUrl: string | null | undefined;
  variant?: SkinVariant;
  attachables?: Attachable[];
  nametag?: NametagOptions | null;
  emote?: SnapshotRequest["emote"];
  fit?: boolean | number;
  crop?: boolean | number;
  width?: number;
  height?: number;
  dpr?: number;
  fallbackUrl?: string | null;
}

export interface SkinPreview {
  url: string;
  loading: boolean;
}

export function useSkinPreview(
  enabled: boolean,
  input: SkinPreviewInput,
): SkinPreview {
  const skinRevision = useSkinStore((state) => state.skinRevision);
  const {
    textureUrl,
    variant = "classic",
    attachables = NO_ATTACHABLES,
    nametag = null,
    emote,
    fit,
    crop,
    width,
    height,
    dpr = 2,
    fallbackUrl = DEFAULT_FALLBACK_SKIN_URL,
  } = input;
  const active = enabled && !!textureUrl;

  const attachableIds = useMemo(
    () =>
      attachables
        .map((attachable) => attachable.meta.id ?? attachable.assets.texture)
        .sort()
        .join(","),
    [attachables],
  );
  const nametagKey = nametag
    ? `${nametag.text}|${nametag.iconUrl ?? ""}|${nametag.iconPlus ?? false}`
    : "";

  const { data, loading } = useAsyncResource<string>(
    active
      ? () =>
          getSkinPreview(
            { textureUrl, variant, attachables, nametag, emote, fit, crop },
            width && height
              ? { width: Math.round(width * dpr), height: Math.round(height * dpr) }
              : undefined,
          )
      : null,
    [
      active,
      textureUrl,
      variant,
      attachableIds,
      nametagKey,
      emote?.animation ?? "",
      fit,
      crop,
      width,
      height,
      dpr,
      skinRevision,
    ],
    fallbackUrl ?? "",
  );

  return { url: data, loading: active && loading };
}
