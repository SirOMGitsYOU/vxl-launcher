"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useInView } from "react-intersection-observer";
import { Icon } from "@iconify/react";
import type { Profile, ScreenshotInfo as ActualScreenshotInfo } from "../../../types/profile";
import { invoke } from "@tauri-apps/api/core";
import { getImagePreview as getImgPreviewServiceCall } from "../../../services/tauri-service";
import { ProfileScreenshotModal } from "../ProfileScreenshotModal";
import { ScreenshotGridItem } from "./ScreenshotGridItem";
import {
  Alert,
  EmptyState,
  Input,
  LoadingState,
  Select,
} from "../../ui-v2";

interface ScreenshotsTabProps {
  profile: Profile;
  isActive?: boolean;
  onOpenScreenshotModal?: (screenshot: ActualScreenshotInfo) => void;
}

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

function LazyScreenshotItem({
  screenshot,
  onItemClick,
}: {
  screenshot: ActualScreenshotInfo;
  onItemClick: (screenshot: ActualScreenshotInfo) => void;
}) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: "50px",
  });

  const loadPreview = useCallback(async () => {
    if (previewSrc || isLoading || hasError) return;

    setIsLoading(true);
    try {
      const response = await getImgPreviewServiceCall({
        path: screenshot.path,
        width: 320,
        height: 180,
        quality: 80,
      });
      const imageType = screenshot.filename.toLowerCase().endsWith(".png") ? "png" : "jpeg";
      setPreviewSrc(`data:image/${imageType};base64,${response.base64_image}`);
    } catch (err) {
      console.error(`Failed to load preview for ${screenshot.path}:`, err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [screenshot.path, screenshot.filename, previewSrc, isLoading, hasError]);

  useEffect(() => {
    if (inView) {
      loadPreview();
    }
  }, [inView, loadPreview]);

  return (
    <div ref={ref}>
      <ScreenshotGridItem
        screenshot={screenshot}
        onItemClick={onItemClick}
        previewSrc={previewSrc}
        isLoading={isLoading}
        hasError={hasError}
      />
    </div>
  );
}

export function ScreenshotsTab({
  profile,
}: ScreenshotsTabProps) {
  const [selectedScreenshot, setSelectedScreenshot] = useState<ActualScreenshotInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [rawScreenshots, setRawScreenshots] = useState<ActualScreenshotInfo[]>([]);

  useEffect(() => {
    const fetchScreenshots = async () => {
      if (!profile?.id) {
        setRawScreenshots([]);
        setIsLoading(false);
        setError("Profile information is missing.");
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const result = await invoke<ActualScreenshotInfo[]>("list_profile_screenshots", {
          profileId: profile.id,
        });
        setRawScreenshots(result);
      } catch (err) {
        console.error("Failed to fetch screenshots:", err);
        setError(err instanceof Error ? err.message : String(err));
        setRawScreenshots([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScreenshots();
  }, [profile.id, refreshTrigger]);

  const sortedScreenshots = useMemo(() => {
    let sorted = [...rawScreenshots];

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      sorted = sorted.filter((shot) => shot.filename.toLowerCase().includes(query));
    }

    if (sortOrder === "newest") {
      sorted.sort((a, b) => {
        if (!a.modified && !b.modified) return 0;
        if (!a.modified) return 1;
        if (!b.modified) return -1;
        return new Date(b.modified).getTime() - new Date(a.modified).getTime();
      });
    } else {
      sorted.sort((a, b) => {
        if (!a.modified && !b.modified) return 0;
        if (!a.modified) return -1;
        if (!b.modified) return 1;
        return new Date(a.modified).getTime() - new Date(b.modified).getTime();
      });
    }

    return sorted;
  }, [rawScreenshots, sortOrder, searchQuery]);

  const openScreenshot = (screenshot: ActualScreenshotInfo) => {
    setSelectedScreenshot(screenshot);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="flex h-full flex-col select-none">
        <div className="mb-4 flex flex-shrink-0 flex-wrap items-center gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search screenshots..."
            className="min-w-[200px] flex-1"
          />
          <Select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            options={sortOptions}
            className="w-44"
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {isLoading && <LoadingState message="Loading screenshots..." />}

          {!isLoading && error && <Alert tone="error">{error}</Alert>}

          {!isLoading && !error && rawScreenshots.length === 0 && (
            <EmptyState
              icon="solar:camera-minimalistic-bold"
              title="No screenshots yet"
              description="Take some in-game screenshots and they'll appear here."
            />
          )}

          {!isLoading && !error && rawScreenshots.length > 0 && sortedScreenshots.length === 0 && (
            <EmptyState
              icon="solar:magnifer-linear"
              title="No screenshots match your search"
              description="Try a different search term or sort order."
            />
          )}

          {!isLoading && !error && sortedScreenshots.length > 0 && (
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 p-1 md:grid-cols-3 xl:grid-cols-4">
                {sortedScreenshots.map((screenshot) => (
                  <LazyScreenshotItem
                    key={screenshot.path}
                    screenshot={screenshot}
                    onItemClick={openScreenshot}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ProfileScreenshotModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        screenshot={selectedScreenshot}
        onScreenshotDeleted={() => {
          setRefreshTrigger((prev) => prev + 1);
          setIsModalOpen(false);
        }}
      />
    </>
  );
}
