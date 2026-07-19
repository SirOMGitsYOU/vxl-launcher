"use client";

import React, { useState, useRef } from "react";
import { Icon } from "@iconify/react";
import type { UnifiedGalleryImage } from "../../types/unified";

interface ModDetailGalleryProps {
  images: UnifiedGalleryImage[];
}

export function ModDetailGallery({ images }: ModDetailGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  const sortedImages = [...images].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return a.ordering - b.ordering;
  });

  return (
    <>
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg  text-white flex items-center gap-2 normal-case">
            <Icon icon="solar:gallery-bold" className="w-5 h-5" />
            Gallery
          </h2>
          <span className="text-xs text-white/50 ">
            {images.length} image{images.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="relative">
          {images.length > 3 && (
            <button
              onClick={scrollLeft}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/70 hover:bg-black/90 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <Icon icon="solar:alt-arrow-left-bold" className="w-5 h-5" />
            </button>
          )}

          {images.length > 3 && (
            <button
              onClick={scrollRight}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/70 hover:bg-black/90 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <Icon icon="solar:alt-arrow-right-bold" className="w-5 h-5" />
            </button>
          )}

          <div
            ref={scrollContainerRef}
            className="flex gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden"
            style={{
              scrollSnapType: "x mandatory",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {sortedImages.map((image, index) => (
              <button
                key={image.url}
                onClick={() => openLightbox(index)}
                className="relative flex-shrink-0 rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-200 group"
                style={{ scrollSnapAlign: "start" }}
              >
                <img
                  src={image.thumbnail_url || image.url}
                  alt={image.title || `Gallery image ${index + 1}`}
                  className="h-40 w-auto min-w-[200px] max-w-[320px] object-cover"
                  loading="lazy"
                />

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <Icon
                    icon="solar:magnifer-zoom-in-bold"
                    className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>

                {image.featured && (
                  <div className="absolute top-2 left-2 bg-yellow-500/90 text-black text-xs  px-2 py-0.5 rounded">
                    Featured
                  </div>
                )}

                {image.title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="text-xs text-white  truncate">
                      {image.title}
                    </p>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={sortedImages[lightboxIndex]?.url}
              alt={sortedImages[lightboxIndex]?.title || "Gallery image"}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />

            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-black/70 hover:bg-black/90 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <Icon icon="solar:close-circle-bold" className="w-6 h-6" />
            </button>

            {sortedImages.length > 1 && (
              <>
                <button
                  onClick={() => setLightboxIndex((lightboxIndex - 1 + sortedImages.length) % sortedImages.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/70 hover:bg-black/90 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <Icon icon="solar:alt-arrow-left-bold" className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setLightboxIndex((lightboxIndex + 1) % sortedImages.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/70 hover:bg-black/90 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <Icon icon="solar:alt-arrow-right-bold" className="w-5 h-5" />
                </button>
              </>
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 px-3 py-1 rounded text-white text-sm ">
              {lightboxIndex + 1} / {sortedImages.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
