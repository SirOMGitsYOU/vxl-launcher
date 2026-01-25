"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import type { UnifiedProjectDetails, UnifiedVersion } from "../../types/unified";
import UnifiedService from "../../services/unified-service";
import { useThemeStore } from "../../store/useThemeStore";
import { TagBadge } from "../ui/TagBadge";

interface ModDetailVersionsProps {
  project: UnifiedProjectDetails;
}

export function ModDetailVersions({ project }: ModDetailVersionsProps) {
  const { accentColor } = useThemeStore();

  const [versions, setVersions] = useState<UnifiedVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayedCount, setDisplayedCount] = useState(10);

  const [versionTypeFilter, setVersionTypeFilter] = useState<string>("all");
  const [gameVersionFilter, setGameVersionFilter] = useState<string>("all");
  const [loaderFilter, setLoaderFilter] = useState<string>("all");

  useEffect(() => {
    async function loadVersions() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await UnifiedService.getModVersions({
          source: project.source,
          project_id: project.id,
        });

        const sorted = response.versions.sort((a, b) =>
          new Date(b.date_published).getTime() - new Date(a.date_published).getTime()
        );

        setVersions(sorted);
      } catch (err) {
        console.error("Failed to load versions:", err);
        setError(err instanceof Error ? err.message : "Failed to load versions");
      } finally {
        setIsLoading(false);
      }
    }

    loadVersions();
  }, [project.source, project.id]);

  const availableGameVersions = useMemo(() => {
    const allVersions = [...new Set(versions.flatMap(v => v.game_versions))];
    return allVersions.sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" }));
  }, [versions]);

  const availableLoaders = useMemo(() => {
    return [...new Set(versions.flatMap(v => v.loaders))].sort();
  }, [versions]);

  const filteredVersions = useMemo(() => {
    return versions.filter(v => {
      if (versionTypeFilter !== "all" && v.release_type !== versionTypeFilter) return false;
      if (gameVersionFilter !== "all" && !v.game_versions.includes(gameVersionFilter)) return false;
      if (loaderFilter !== "all" && !v.loaders.map(l => l.toLowerCase()).includes(loaderFilter.toLowerCase())) return false;
      return true;
    });
  }, [versions, versionTypeFilter, gameVersionFilter, loaderFilter]);

  const hasActiveFilters = versionTypeFilter !== "all" || gameVersionFilter !== "all" || loaderFilter !== "all";

  const handleClearFilters = () => {
    setVersionTypeFilter("all");
    setGameVersionFilter("all");
    setLoaderFilter("all");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon icon="solar:refresh-bold" className="w-6 h-6 text-white/50 animate-spin" />
        <span className="ml-2 text-white/50 font-minecraft-ten">Loading versions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Icon icon="solar:danger-triangle-bold" className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-400 font-minecraft-ten text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div
        className="mb-4 p-3 rounded-lg border backdrop-blur-sm"
        style={{
          backgroundColor: `${accentColor.value}10`,
          borderColor: `${accentColor.value}30`,
        }}
      >
        <div className="flex flex-wrap gap-2 items-center mb-2">
          <select
            value={versionTypeFilter}
            onChange={(e) => setVersionTypeFilter(e.target.value)}
            className="px-2 py-1 rounded text-xs font-minecraft-ten bg-black/30 border border-white/20 text-white"
          >
            <option value="all">All Types</option>
            <option value="release">Release</option>
            <option value="beta">Beta</option>
            <option value="alpha">Alpha</option>
          </select>

          <select
            value={gameVersionFilter}
            onChange={(e) => setGameVersionFilter(e.target.value)}
            className="px-2 py-1 rounded text-xs font-minecraft-ten bg-black/30 border border-white/20 text-white"
          >
            <option value="all">All Game Versions</option>
            {availableGameVersions.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>

          {availableLoaders.length > 0 && (
            <select
              value={loaderFilter}
              onChange={(e) => setLoaderFilter(e.target.value)}
              className="px-2 py-1 rounded text-xs font-minecraft-ten bg-black/30 border border-white/20 text-white"
            >
              <option value="all">All Loaders</option>
              {availableLoaders.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          )}

          <div className="ml-auto text-xs text-white/50 font-minecraft-ten">
            {filteredVersions.length} version{filteredVersions.length !== 1 ? "s" : ""}
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <TagBadge
              variant="destructive"
              className="cursor-pointer hover:brightness-110 transition-all flex-shrink-0 flex items-center"
              onClick={handleClearFilters}
            >
              <Icon icon="solar:trash-bin-trash-bold" className="w-3 h-3 mr-1.5" />
              <span>Clear All</span>
            </TagBadge>
          </div>
        )}
      </div>

      {filteredVersions.length > 0 ? (
        <div className="space-y-2">
          {filteredVersions.slice(0, displayedCount).map((version) => (
            <div
              key={version.id}
              className="p-3 rounded-lg bg-black/20 border border-white/10 hover:border-white/20 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-minecraft-ten text-white font-bold">
                      {version.version_number}
                    </span>
                    <TagBadge size="sm" variant="info">
                      {version.release_type}
                    </TagBadge>
                  </div>
                  <p className="text-xs text-white/70 font-minecraft-ten">
                    {new Date(version.date_published).toLocaleDateString()}
                  </p>
                  {version.game_versions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {version.game_versions.slice(0, 3).map(gv => (
                        <TagBadge key={gv} size="sm">{gv}</TagBadge>
                      ))}
                      {version.game_versions.length > 3 && (
                        <span className="text-xs text-white/50 font-minecraft-ten">
                          +{version.game_versions.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-white/50 font-minecraft-ten">
                    {(version.downloads || 0).toLocaleString()} downloads
                  </p>
                </div>
              </div>
            </div>
          ))}

          {filteredVersions.length > displayedCount && (
            <button
              onClick={() => setDisplayedCount(prev => prev + 10)}
              className="w-full mt-2 py-2 rounded-lg text-xs font-minecraft-ten transition-colors"
              style={{
                backgroundColor: `${accentColor.value}15`,
                borderColor: `${accentColor.value}30`,
                color: accentColor.value,
              }}
            >
              Load More ({filteredVersions.length - displayedCount} more)
            </button>
          )}
        </div>
      ) : (
        <div
          className="relative overflow-hidden transition-colors duration-150 rounded-md p-4 text-sm text-gray-400 text-center border-2 border-b-4 backdrop-blur-md"
          style={{
            borderColor: `${accentColor.value}60`,
            borderBottomColor: accentColor.value,
            backgroundColor: `${accentColor.value}15`,
          }}
        >
          No versions match the selected filters.
        </div>
      )}
    </div>
  );
}
