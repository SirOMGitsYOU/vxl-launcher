"use client";

import { Icon } from "@iconify/react";
import { EmptyState } from "../ui-v2/EmptyState";
import { ReactNode, useEffect } from "react";
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { preloadIcons } from "../../lib/icon-utils";
import { Virtuoso } from 'react-virtuoso';

const GENERIC_LIST_DEFAULT_ICONS = [
  "solar:danger-triangle-bold",
  "solar:planet-bold"
];

interface GenericListItemSkeletonProps {
  accentColor: string;
}

function GenericListItemSkeleton({ accentColor }: GenericListItemSkeletonProps) {
  const baseIsDark = parseInt(accentColor.substring(1, 3), 16) < 128;
  const highlightColor = baseIsDark ? `${accentColor}99` : `${accentColor}4D`;

  return (
    <SkeletonTheme baseColor={`${accentColor}20`} highlightColor={highlightColor}>
      <li className="p-4 flex items-start gap-4">
        <div className="relative w-24 h-24 flex-shrink-0">
          <Skeleton height="100%" width="100%" style={{ borderRadius: '0px' }} />
        </div>
        <div className="flex-grow min-w-0 h-24 flex flex-col justify-center">
          <Skeleton width="70%" height={20} style={{ marginBottom: '0.5rem', borderRadius: '0px' }} />
          <Skeleton count={2} height={15} style={{ borderRadius: '0px' }} />
        </div>
      </li>
    </SkeletonTheme>
  );
}

interface GenericListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  isLoading?: boolean;  loadingComponent?: ReactNode;
  loadingItemCount?: number;
  error?: string | null;
  errorComponent?: (error: string) => ReactNode;
  emptyStateIcon?: string;
  emptyStateMessage?: string;
  emptyStateDescription?: string;
  emptyStateAction?: ReactNode;
  searchQuery?: string;  accentColor?: string;
  listContainerClassName?: string;
  listItemClassName?: string;
  ulClassName?: string;
  showEmptyState?: boolean;
}

export function GenericList<T>({
  items,
  renderItem,
  isLoading = false,
  loadingComponent,  loadingItemCount = 3,
  error = null,
  errorComponent,
  emptyStateIcon = GENERIC_LIST_DEFAULT_ICONS[1],
  emptyStateMessage = "no items match your search",
  emptyStateDescription = "Try adjusting your search or filters.",
  emptyStateAction,
  searchQuery = "",
  accentColor = "#FFFFFF",
  listContainerClassName = "",
  ulClassName = "space-y-2",
  showEmptyState = true,
}: GenericListProps<T>) {
  const effectiveAccentColor = accentColor || "#FFFFFF";

  useEffect(() => {
    preloadIcons(GENERIC_LIST_DEFAULT_ICONS);
  }, []);

  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }        if (loadingItemCount && loadingItemCount > 0) {
      // For many loading items, limit to a reasonable number to avoid performance issues
      const effectiveLoadingCount = Math.min(loadingItemCount, 20);

      return (
        <div
        className={`${listContainerClassName} h-full min-h-0`}
        >
          <Virtuoso
            data={Array.from({ length: effectiveLoadingCount })}
            itemContent={(index) => (
              <div className="pb-2">
                <GenericListItemSkeleton key={`skeleton-${index}`} accentColor={effectiveAccentColor} />
              </div>
            )}
            style={{ height: '100%' }}
          />
        </div>
      );    } else if (items.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <EmptyState
            icon={emptyStateIcon}
            title={emptyStateMessage || "Nothing here yet"}
            description={emptyStateDescription}
          />
          {emptyStateAction && <div className="mt-4">{emptyStateAction}</div>}
        </div>
      );
    }
  }  if (error && errorComponent) {
    return <>{errorComponent(error)}</>;
  }
  if (error && showEmptyState) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <EmptyState
          icon={emptyStateIcon || GENERIC_LIST_DEFAULT_ICONS[0]}
          title={emptyStateMessage || "Something went wrong"}
          description={emptyStateDescription || error}
        />
        {emptyStateAction && <div className="mt-4">{emptyStateAction}</div>}
      </div>
    );
  } else if (error) {
    return (
      <div
        className="p-3 flex items-center gap-2 mb-4 rounded-lg border"
        style={{
          backgroundColor: `rgba(220, 38, 38, 0.1)`,
          borderColor: `rgba(220, 38, 38, 0.3)`,
        }}
      >
        <Icon
          icon={GENERIC_LIST_DEFAULT_ICONS[0]}
          className="w-5 h-5 text-red-400"
        />
        <span className="text-white  text-lg">{error}</span>
      </div>
    );
  }
  
  const isEmpty = items.length === 0;

  if (showEmptyState && isEmpty && !isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <EmptyState
          icon={emptyStateIcon}
          title={emptyStateMessage || (searchQuery ? "No results found" : "Nothing here yet")}
          description={emptyStateDescription || (searchQuery ? "Try a different search term." : undefined)}
        />
        {emptyStateAction && <div className="mt-4">{emptyStateAction}</div>}
      </div>
    );
  }
  if (isEmpty && !isLoading && !error && !showEmptyState) {
     return null; // Return nothing for empty state without background
  }
  if (!isEmpty) {
    return (
        <div
        className={`${listContainerClassName} h-full min-h-0`}
        >
        <Virtuoso
          style={{ height: "100%" }}
          data={items}
          itemContent={(index) => (
            <div className="pb-2">
              {renderItem(items[index], index)}
            </div>
          )}
        />
        </div>
    );
  }
  return null;
}