"use client";

import { type CSSProperties, useEffect, useState } from "react";
import {
  buildYoutubeEmbedUrl,
  getYoutubeEmbedDimensions,
  type YoutubeEmbedQuality,
} from "../../config/preset-backgrounds";

interface YoutubeBackgroundEmbedProps {
  youtubeId: string;
  visible: boolean;
  quality?: YoutubeEmbedQuality;
}

function useCoverScale(sourceWidth: number, sourceHeight: number): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => {
      const scaleX = window.innerWidth / sourceWidth;
      const scaleY = window.innerHeight / sourceHeight;
      setScale(Math.max(scaleX, scaleY) * 1.02);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [sourceWidth, sourceHeight]);

  return scale;
}

export function YoutubeBackgroundEmbed({
  youtubeId,
  visible,
  quality = "high",
}: YoutubeBackgroundEmbedProps) {
  const { width, height } = getYoutubeEmbedDimensions(quality);
  const coverScale = useCoverScale(width, height);
  const embedUrl = buildYoutubeEmbedUrl(youtubeId);

  const iframeStyle: CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: `${width}px`,
    height: `${height}px`,
    transform: `translate(-50%, -50%) scale(${coverScale})`,
    transformOrigin: "center center",
    border: 0,
    pointerEvents: "none",
    opacity: visible ? 1 : 0,
    transition: "opacity 0.3s ease",
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <iframe
        key={`${embedUrl}-${width}x${height}`}
        title="Background video"
        src={embedUrl}
        width={width}
        height={height}
        frameBorder={0}
        style={iframeStyle}
        allow="autoplay; encrypted-media"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
