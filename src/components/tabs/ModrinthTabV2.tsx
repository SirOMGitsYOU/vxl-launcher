"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ModrinthSearchV2 } from "../modrinth/v2/ModrinthSearchV2"; // Adjusted import path
import type { Profile } from "../../types/profile";
import { getAllProfilesAndLastPlayed } from "../../services/profile-service";
import { ErrorMessage } from "../ui/ErrorMessage";
import { LoadingState } from "../ui-v2";
// import { LoadingOverlay } from "../ui/LoadingOverlay"; // Removed
// import { Card } from "../ui/Card"; // Card might not be directly needed here anymore
// import { useThemeStore } from "../../store/useThemeStore"; // Theme store might be used by sub-components
// import { ModrinthFilters } from "../modrinth/ModrinthFilters"; // Filters will be part of ModrinthSearchV2 or a new V2 component
// import type { ModrinthProjectType } from "../../types/modrinth"; // ProjectType will be managed within ModrinthSearchV2

interface ModrinthTabV2Props {
  profiles?: Profile[];
}

export function ModrinthTabV2({
  profiles: initialProfiles = [],
}: ModrinthTabV2Props) {
  const [error, setError] = useState<string | null>(null);
  // const [refreshKey, setRefreshKey] = useState(0); // May or may not be needed depending on V2 search interaction
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [profilesLoaded, setProfilesLoaded] = useState(initialProfiles.length > 0);
  // const [isLoading, setIsLoading] = useState(initialProfiles.length === 0); // Removed
  // const [loadingProgress, setLoadingProgress] = useState(0); // Removed

  useEffect(() => {
    // Only load profiles if they haven't been loaded yet
    if (initialProfiles.length === 0 && !profilesLoaded) {
      const loadProfiles = async () => {
        try {
          const fetched = await getAllProfilesAndLastPlayed();
          setProfiles(fetched.all_profiles);
        } catch (err) {
          console.error("Failed to load profiles:", err);
          setError(
            `Failed to load profiles: ${err instanceof Error ? err.message : String(err)}`,
          );
        } finally {
          setProfilesLoaded(true);
        }
      };

      // Use requestIdleCallback for non-critical loading if available
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        (window as any).requestIdleCallback(loadProfiles);
      } else {
        // Fallback to setTimeout with a small delay
        setTimeout(loadProfiles, 10);
      }
    }
  }, [initialProfiles, profilesLoaded]);

  const handleInstallSuccess = useCallback(() => {
    // This might trigger a refresh of profile list or other UI elements
    // setRefreshKey((prev) => prev + 1);
    // Potentially reload profiles if an installation changes them
    // getAllProfilesAndLastPlayed().then(res => setProfiles(res.all_profiles)).catch(err => console.error("Failed to refresh profiles after install", err));
  }, []);

  // Memoize the ModrinthSearchV2 component to prevent unnecessary re-renders
  const memoizedSearch = useMemo(
    () => (
      <ModrinthSearchV2
        profiles={profiles}
        onInstallSuccess={handleInstallSuccess}
        className="h-full"
        overrideDisplayContext="standalone"
      />
    ),
    [profiles, handleInstallSuccess],
  );

  if (initialProfiles.length === 0 && !profilesLoaded) {
    return <LoadingState message="Loading profiles..." />;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden relative bg-[var(--surface-base)]">
      {/* <LoadingOverlay // Removed
        isLoading={isLoading}
        message={loadingMessage}
        progress={loadingProgress}
        variant="default"
        shadowDepth="default"
      /> */}

      {error && <ErrorMessage message={error} />}

      <div className="flex-1 overflow-hidden flex space-x-4">
        <div className="flex-1 overflow-hidden">{memoizedSearch}</div>
        {/**
          Filters are now intended to be part of ModrinthSearchV2 or a new ModrinthFiltersV2.
          If ModrinthFiltersV2 is separate, it would be placed here or within ModrinthSearchV2 layout.
          For now, assuming filters are integrated or will be added to ModrinthSearchV2 itself.
        */}
        {/**
        <div className="w-1/4 max-w-xs flex-shrink-0">
          <ModrinthFiltersV2 ... />
        </div>
        */}
      </div>
    </div>
  );
}

export default ModrinthTabV2;