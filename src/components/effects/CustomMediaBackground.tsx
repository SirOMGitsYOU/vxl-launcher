"use client";

import React, { useEffect, useRef, useState } from "react";
import { useBackgroundEffectStore } from "../../store/background-effect-store";
import {
  getPresetBackgroundById,
} from "../../config/preset-backgrounds";
import { YoutubeBackgroundEmbed } from "./YoutubeBackgroundEmbed";
import { useWindowFocus } from "../../hooks/useWindowFocus";
import { localFileToDisplayUrl } from "../../utils/local-file-url";

interface CustomMediaBackgroundProps {
  activeTab: string;
}

export default function CustomMediaBackground({ activeTab }: CustomMediaBackgroundProps) {
  const {
    customMediaUrl,
    customMediaType,
    customMediaBlur,
    customMediaQuality,
    customMediaOnlyOnPlay,
    presetBackgroundId,
  } = useBackgroundEffectStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState(false);
  const isWindowFocused = useWindowFocus();

  const preset = getPresetBackgroundById(presetBackgroundId);
  const youtubeId = customMediaType === "youtube" ? preset?.youtubeId?.trim() : "";
  const hiddenByTab = customMediaOnlyOnPlay && activeTab !== "play";
  const hasActiveMedia =
    (customMediaUrl && customMediaType && customMediaType !== "youtube") ||
    (customMediaType === "youtube" && Boolean(youtubeId));

  useEffect(() => {
    setMediaError(false);

    if (!customMediaUrl || customMediaType === "youtube") {
      setDisplayUrl(null);
      return;
    }

    let cancelled = false;

    localFileToDisplayUrl(customMediaUrl)
      .then((url) => {
        if (!cancelled) {
          setDisplayUrl(url || null);
          if (!url) setMediaError(true);
        }
      })
      .catch((error) => {
        console.error("[CustomMediaBackground] failed to resolve media URL:", error);
        if (!cancelled) {
          setDisplayUrl(null);
          setMediaError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [customMediaUrl, customMediaType]);

  useEffect(() => {
    if (customMediaType !== "video") return;

    const tryPlay = () => {
      if (videoRef.current && !hiddenByTab && isWindowFocused && displayUrl) {
        videoRef.current.play().catch((error) => {
          console.warn("[CustomMediaBackground] video play failed:", error);
        });
      }
    };

    const handlePause = () => {
      videoRef.current?.pause();
    };

    window.addEventListener("focus", tryPlay);
    window.addEventListener("blur", handlePause);

    if (hiddenByTab || !isWindowFocused) {
      videoRef.current?.pause();
    } else {
      tryPlay();
    }

    return () => {
      window.removeEventListener("focus", tryPlay);
      window.removeEventListener("blur", handlePause);
    };
  }, [customMediaType, displayUrl, hiddenByTab, isWindowFocused]);

  if (!hasActiveMedia || mediaError || (customMediaType !== "youtube" && !displayUrl)) {
    return null;
  }

  const getQualityStyles = (): React.CSSProperties => {
    switch (customMediaQuality) {
      case "low":
        return {
          width: "50%",
          height: "50%",
          transform: "scale(2)",
          transformOrigin: "top left",
          imageRendering: "pixelated",
        };
      case "medium":
        return {
          width: "75%",
          height: "75%",
          transform: "scale(1.3333)",
          transformOrigin: "top left",
        };
      case "high":
      default:
        return {
          width: "100%",
          height: "100%",
        };
    }
  };

  const mediaStyles = getQualityStyles();

  const handleMediaError = () => {
    console.error("[CustomMediaBackground] failed to load media");
    setMediaError(true);
  };

  const containerStyle: React.CSSProperties = {
    display: hiddenByTab ? "none" : undefined,
    filter: customMediaBlur > 0 ? `blur(${customMediaBlur}px)` : undefined,
    transform: customMediaBlur > 0 ? `scale(${1 + customMediaBlur * 0.006})` : undefined,
  };

  return (
    <div
      className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
      style={containerStyle}
    >
      {customMediaType === "youtube" && youtubeId ? (
        <YoutubeBackgroundEmbed
          youtubeId={youtubeId}
          visible={!hiddenByTab && isWindowFocused}
          quality={customMediaQuality}
        />
      ) : customMediaType === "video" && displayUrl ? (
        <video
          ref={videoRef}
          src={displayUrl}
          autoPlay
          loop
          muted
          playsInline
          onError={handleMediaError}
          className="object-cover"
          style={mediaStyles}
        />
      ) : displayUrl ? (
        <img
          src={displayUrl}
          alt="Custom background"
          onError={handleMediaError}
          className="object-cover"
          style={mediaStyles}
        />
      ) : null}
    </div>
  );
}
