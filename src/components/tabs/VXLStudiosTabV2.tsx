"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ModrinthSearchV2 } from "../modrinth/v2/ModrinthSearchV2";
import type { Profile } from "../../types/profile";
import { getAllProfilesAndLastPlayed } from "../../services/profile-service";
import { ErrorMessage } from "../ui/ErrorMessage";
import { LoadingState } from "../ui-v2";

interface VXLStudiosTabV2Props {
  profiles?: Profile[];
}

/**
 * VXL Studios Tab - A mirror of the Mods tab that shows only Voxel Studios projects
 * Uses ModrinthSearchV2 with initial search term "voxel studios" to filter results
 */
export function VXLStudiosTabV2({
  profiles: initialProfiles = [],
}: VXLStudiosTabV2Props) {
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [profilesLoaded, setProfilesLoaded] = useState(initialProfiles.length > 0);

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
    // Potentially reload profiles if an installation changes them
  }, []);

  // Memoize the ModrinthSearchV2 component with VXL Studios configuration
  const memoizedSearch = useMemo(
    () => (
      <ModrinthSearchV2
        profiles={profiles}
        onInstallSuccess={handleInstallSuccess}
        className="h-full"
        overrideDisplayContext="standalone"
        initialProjectType="modpack"
        allowedProjectTypes={["modpack", "mod", "resourcepack"]}
        useVXLStudiosData={true}
      />
    ),
    [profiles, handleInstallSuccess],
  );

  if (initialProfiles.length === 0 && !profilesLoaded) {
    return <LoadingState message="Loading profiles..." />;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden relative bg-[var(--surface-base)]">
      {error && <ErrorMessage message={error} />}

      <div className="flex-1 overflow-hidden flex space-x-4">
        <div className="flex-1 overflow-hidden">{memoizedSearch}</div>
      </div>
    </div>
  );
}

export default VXLStudiosTabV2;
