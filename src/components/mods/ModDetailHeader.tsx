"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import type { UnifiedProjectDetails, UnifiedModSearchResult } from "../../types/unified";
import { ModPlatform } from "../../types/unified";
import type { AccentColor } from "../../store/useThemeStore";
import { TagBadge } from "../ui/TagBadge";
import { ActionButton } from "../ui/ActionButton";
import { openExternalUrl } from "../../services/tauri-service";

interface ModDetailHeaderProps {
  project: UnifiedProjectDetails;
  accentColor: AccentColor;
  showVersions: boolean;
  onToggleVersions: () => void;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

function getProjectTypeIcon(type: string): string {
  switch (type) {
    case "mod": return "pixel:bolt-solid";
    case "modpack": return "pixel:folder-open-solid";
    case "resourcepack": return "pixel:image-solid";
    case "shader": return "pixel:sun-solid";
    case "datapack": return "pixel:cube-solid";
    default: return "pixel:cube-solid";
  }
}

export function ModDetailHeader({ project, accentColor, showVersions, onToggleVersions }: ModDetailHeaderProps) {
  const [isInstalling, setIsInstalling] = useState(false);

  const handleOpenProjectPage = async () => {
    try {
      await openExternalUrl(project.project_url);
    } catch (error) {
      console.error("Failed to open URL:", error);
      toast.error("Could not open link in browser.");
    }
  };

  const handleInstallClick = async () => {
    setIsInstalling(true);
    toast.loading("Installation feature coming soon...");
    setTimeout(() => setIsInstalling(false), 1000);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 bg-black/20 rounded-lg p-4 border border-white/10">
      <div
        className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-lg overflow-hidden border self-center sm:self-start"
        style={{
          borderColor: `${accentColor.value}30`,
          backgroundColor: `${accentColor.value}10`,
        }}
      >
        {project.icon_url ? (
          <img
            src={project.icon_url}
            alt={`${project.title} icon`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-700/50 flex items-center justify-center">
            <Icon icon={getProjectTypeIcon(project.project_type)} className="w-12 h-12 text-gray-500" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <button
              onClick={handleOpenProjectPage}
              className="text-2xl font-minecraft-ten text-white leading-tight hover:text-accent hover:underline transition-colors text-left"
            >
              {project.title}
            </button>
            {project.author && (
              <p className="text-sm text-gray-400 font-minecraft-ten mt-1">
                by {project.author}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 text-sm text-white/70 font-minecraft-ten">
              <div className="flex items-center gap-1">
                <Icon icon="solar:download-minimalistic-bold" className="w-4 h-4" />
                <span>{formatNumber(project.downloads)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Icon icon="solar:heart-bold" className="w-4 h-4" />
                <span>{formatNumber(project.followers)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <ActionButton
                label={isInstalling ? "Installing..." : "Install"}
                icon={isInstalling ? "solar:refresh-bold" : "solar:download-minimalistic-bold"}
                iconClassName={isInstalling ? "animate-spin-slow" : ""}
                variant={isInstalling ? "secondary" : "primary"}
                size="sm"
                disabled={isInstalling}
                onClick={handleInstallClick}
              />
              <ActionButton
                icon={showVersions ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"}
                variant="icon-only"
                tooltip={showVersions ? "Hide Versions" : "Show Versions"}
                onClick={onToggleVersions}
                size="sm"
              />
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-300 font-minecraft-ten mt-3 line-clamp-2">
          {project.description}
        </p>

        <div className="flex flex-wrap items-center gap-2 mt-4">
          <TagBadge
            variant={project.source === ModPlatform.Modrinth ? "success" : "warning"}
            size="sm"
          >
            <Icon
              icon={project.source === ModPlatform.Modrinth ? "simple-icons:modrinth" : "simple-icons:curseforge"}
              className="w-3 h-3 mr-1"
            />
            {project.source}
          </TagBadge>

          <TagBadge variant="info" size="sm">
            <Icon icon={getProjectTypeIcon(project.project_type)} className="w-3 h-3 mr-1" />
            <span className="capitalize">{project.project_type}</span>
          </TagBadge>

          {project.categories.slice(0, 4).map((category) => (
            <TagBadge key={category} size="sm">
              {category.replace(/-/g, " ")}
            </TagBadge>
          ))}
          {project.categories.length > 4 && (
            <span className="text-xs text-white/50 font-minecraft-ten">
              +{project.categories.length - 4} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
