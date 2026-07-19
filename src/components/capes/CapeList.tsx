"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { useInView } from "react-intersection-observer";
import type { VanillaCape } from "../../types/vanillaCapes";
import { EmptyState } from "../ui/EmptyState";
import { Icon } from "@iconify/react";
import { CapeImage } from "./CapeImage";
import { VanillaCapeImage } from "./VanillaCapeImage";
import { CapePreview2D } from "./CapePreview2D";
import { Tooltip } from "../ui/Tooltip";
// Removed VirtuosoGrid import - using native scrolling instead
import { useThemeStore } from "../../store/useThemeStore";
import { cn } from "../../lib/utils";
import { Button } from "../ui/buttons/Button";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import gsap from "gsap";
import { IconButton } from "../ui/buttons/IconButton";


// Removed ListComponent - using native grid layout instead

interface CapeItemDisplayProps {
  cape: VanillaCape;
  imageUrl: string;
  isCurrentlyEquipping: boolean;
  isEquipped?: boolean;
  onEquipCape: (capeId: string) => void;
  isVanilla?: boolean;
}

function CapeItemDisplay({
  cape,
  imageUrl,
  isCurrentlyEquipping,
  isEquipped = false,
  onEquipCape,
  isVanilla = false,
}: CapeItemDisplayProps) {
  // No-op click handler - just display the cape preview inline
  const handleCapeClick = useCallback(() => {
    // Modal removed - cape is displayed inline in the grid
  }, []);
  const [isHovered, setIsHovered] = useState(false);
  const accentColor = useThemeStore((state) => state.accentColor);
  const activeAccount = useMinecraftAuthStore((state) => state.activeAccount);

  // Use consistent dimensions like original CapeDisplay
  const displayWidth = 140;
  const displayHeight = Math.round(displayWidth * (16 / 10)); // 16:10 aspect ratio for capes

  // Grid layout (similar to ProfileCardV2 grid mode)
  return (
    <div
      className="relative flex flex-col gap-3 p-4 rounded-lg bg-[var(--surface-overlay)] border border-[var(--surface-border)] hover:border-[var(--surface-border-strong)] transition-all duration-200 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.preventDefault();
        handleCapeClick();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        handleCapeClick();
      }}
    >

      {/* Cape content */}
      <div className="flex flex-col items-center gap-3 relative z-10 w-full">
        {/* Cape Image */}
        <div
          className="relative flex-shrink-0 rounded-lg flex items-center justify-center overflow-hidden border-2 transition-all duration-300 ease-out"
          style={{
            width: `${displayWidth}px`,
            height: `${displayHeight}px`,
            backgroundColor: isHovered ? `${accentColor.value}20` : 'transparent',
            borderColor: isEquipped ? accentColor.value : (isHovered ? `${accentColor.value}60` : 'transparent'),
          }}
        >
          <CapePreview2D
            capeId={cape.id}
            capeUrl={imageUrl}
            playerUuid={activeAccount?.id}
            className="rounded-sm block w-full h-full"
          />

          {/* Equipped badge */}
          {isEquipped && !isCurrentlyEquipping && (
            <div className="absolute top-2 right-2 z-30">
              <Tooltip content="This cape is currently equipped">
                <Icon
                  icon="solar:check-circle-bold"
                  className="w-4 h-4"
                  style={{ color: accentColor.value }}
                />
              </Tooltip>
            </div>
          )}

          {/* Equipping overlay */}
          {isCurrentlyEquipping && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg">
              <Icon
                icon="solar:refresh-bold"
                className="w-8 h-8 animate-spin mb-1"
                style={{ color: accentColor.value }}
              />
              <span className=" text-xs text-white lowercase">
                Equipping
              </span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}


export interface CapeListProps {
  capes: VanillaCape[];
  onEquipCape: (capeHash: string) => void;
  isLoading?: boolean;
  isEquippingCapeId?: string | null;
  equippedCapeId?: string | null;
  loadMoreItems?: () => void;
  hasMoreItems?: boolean;
  isFetchingMore?: boolean;
  isVanilla?: boolean;
}

export function CapeList({
  capes,
  onEquipCape,
  isLoading = false,
  isEquippingCapeId = null,
  equippedCapeId = null,
  loadMoreItems,
  hasMoreItems = false,
  isFetchingMore = false,
  isVanilla = false,
}: CapeListProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    cape: null;
  } | null>(null);
  const authStore = useMinecraftAuthStore();
  const activeAccount = authStore.activeAccount;

  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Track if we've ever loaded capes successfully (for EmptyState logic)
  useEffect(() => {
    if (!isLoading && !hasInitiallyLoaded) {
      // For favorites mode, only consider it loaded if we actually have capes available to filter from
      const hasContent = capes.length > 0;

      if (hasContent) {
        setHasInitiallyLoaded(true);
      }
    }
  }, [isLoading, capes.length, hasInitiallyLoaded]);

// Removed virtuosoComponents - using native scrolling grid instead 

  function calculateMenuPosition(x: number, y: number, menuWidth: number, menuHeight: number) {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const padding = 16;
    let adjustedX = x;
    let adjustedY = y;
    if (x + menuWidth + padding > viewport.width) {
      adjustedX = x - menuWidth;
      if (adjustedX < padding) adjustedX = viewport.width - menuWidth - padding;
    }
    if (y + menuHeight + padding > viewport.height) {
      adjustedY = y - menuHeight;
      if (adjustedY < padding) adjustedY = viewport.height - menuHeight - padding;
    }
    adjustedX = Math.max(padding, Math.min(adjustedX, viewport.width - menuWidth - padding));
    adjustedY = Math.max(padding, Math.min(adjustedY, viewport.height - menuHeight - padding));
    return { x: adjustedX, y: adjustedY };
  }

  useEffect(() => {
    if (contextMenu) {
      const menuWidth = 200;
      const menuHeight = 56;
      setMenuPosition(calculateMenuPosition(contextMenu.x, contextMenu.y, menuWidth, menuHeight));
      window.addEventListener("click", () => setContextMenu(null));
      return () => window.removeEventListener("click", () => setContextMenu(null));
    }
  }, [contextMenu]);

  useEffect(() => {
    if (contextMenu && menuRef.current) {
      gsap.fromTo(
        menuRef.current,
        { opacity: 0, scale: 0.95, y: -10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.18, ease: "power2.out" }
      );
    }
  }, [contextMenu]);

  // Load more trigger component for intersection observer
  const LoadMoreTrigger = () => {
    const { ref, inView } = useInView({
      threshold: 0,
      rootMargin: '500px', // Load more when 500px from bottom - even earlier!
    });

    useEffect(() => {
      if (inView && hasMoreItems && !isFetchingMore && loadMoreItems) {
        console.log("[CapeList] Load more trigger activated, loading more items...");
        loadMoreItems();
      }
    }, [inView, hasMoreItems, isFetchingMore, loadMoreItems]);

    if (!hasMoreItems) return null;

    return (
      <div ref={ref} className="flex justify-center items-center p-8">
        {isFetchingMore ? (
          <Icon
            icon="eos-icons:loading"
            className="w-8 h-8 animate-spin"
            style={{ color: accentColor.value }}
          />
        ) : (
          <div className="w-full h-4" /> // Invisible trigger area
        )}
      </div>
    );
  };

  return (
      <div className="flex-1 min-h-0 flex flex-col">

        {/* Native scrolling grid - similar to ScreenshotsTab */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
              gap: "16px",
              padding: "16px",
          }}
        >
          {capes.map((cape) => {
            const imageUrl = (cape as VanillaCape).url;
            const capeId = (cape as VanillaCape).id;
            const isEquipped = equippedCapeId === capeId;
            return (
              <CapeItemDisplay
                key={capeId}
                cape={cape}
                imageUrl={imageUrl}
                isCurrentlyEquipping={isEquippingCapeId === capeId}
                isEquipped={isEquipped}
                onEquipCape={onEquipCape}
                isVanilla={isVanilla}
              />
            );
          })}
          </div>
        </div>
      </div>
  );
}
