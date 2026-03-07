"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { Modal } from "../ui/Modal";
import { useThemeStore } from "../../store/useThemeStore";
import { IconButton } from "../ui/buttons/IconButton";
import { Button } from "../ui/buttons/Button";
import { openExternalUrl } from "../../services/tauri-service";
import { fetchChangelog, type ChangelogEntry, type ChangelogResponse } from "../../services/changelog-service";

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const [activeTab, setActiveTab] = useState<"changelog" | "credits">("changelog");
  const [changelogData, setChangelogData] = useState<ChangelogResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && activeTab === "changelog" && !changelogData) {
      loadChangelog();
    }
  }, [isOpen, activeTab]);

  const loadChangelog = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchChangelog();
      setChangelogData(data);
    } catch (err) {
      console.error("Failed to fetch changelog:", err);
      setError("Failed to load changelog data");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUrl = async (url: string) => {
    try {
      await openExternalUrl(url);
    } catch (error) {
      console.error("Failed to open external URL:", error);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const renderChangeSection = (title: string, icon: string, changes: string[]) => {
    if (changes.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-3">
          <Icon icon={icon} className="w-5 h-5" style={{ color: accentColor.value }} />
          <h4 className="text-2xl font-minecraft text-white">{title}</h4>
        </div>
        <ul className="space-y-1 ml-6">
          {changes.map((change, index) => (
            <li key={index} className="text-white/60 font-minecraft-ten text-sm">
              • {change}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderChangelogEntry = (entry: ChangelogEntry, index: number) => (
    <div
      key={entry.version}
      className={`p-4 rounded-lg border-2 transition-colors ${
        index === 0
          ? "bg-black/30 border-white/30"
          : "bg-black/20 border-white/20"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center mt-2"
            style={{ backgroundColor: `${accentColor.value}40` }}
          >
            <Icon
              icon="solar:tag-bold"
              className="w-4 h-4"
              style={{ color: accentColor.value }}
            />
          </div>
          <div>
            <h3 className="text-2xl font-minecraft text-white">
              {entry.version}
            </h3>
            <p className="text-white/50 font-minecraft-ten text-xs -mt-2">
              {formatDate(entry.date)}
            </p>
          </div>
        </div>
        {entry.version === changelogData?.current_version && (
          <div
            className="px-3 py-1.5 rounded-full text-sm font-minecraft-ten"
            style={{
              backgroundColor: `${accentColor.value}20`,
              color: accentColor.value,
              border: `1px solid ${accentColor.value}40`,
            }}
          >
            Current
          </div>
        )}
      </div>

      <div className="space-y-2">
        {renderChangeSection("Features", "solar:star-bold", entry.features)}
        {renderChangeSection("Improvements", "solar:arrow-up-bold", entry.improvements)}
        {renderChangeSection("Fixes", "solar:check-circle-bold", entry.fixes)}
        {renderChangeSection("Changes", "solar:refresh-circle-bold", entry.changes)}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <Modal
      title={activeTab === "changelog" ? "Changelog" : "Credits"}
      titleIcon={<Icon icon={activeTab === "changelog" ? "solar:document-text-bold" : "solar:code-bold"} className="w-6 h-6" />}
      onClose={onClose}
      width="lg"
    >
      <div className="p-6">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "changelog" ? "default" : "ghost"}
            onClick={() => setActiveTab("changelog")}
            icon={<Icon icon="solar:document-text-bold" className="w-4 h-4" />}
            className="whitespace-nowrap"
          >
            Changelog
          </Button>
          <Button
            variant={activeTab === "credits" ? "default" : "ghost"}
            onClick={() => setActiveTab("credits")}
            icon={<Icon icon="solar:code-bold" className="w-4 h-4" />}
            className="whitespace-nowrap"
          >
            Credits
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === "changelog" ? (
          <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-white/20 border-t-white rounded-full"></div>
                <span className="ml-3 text-white/70 font-minecraft-ten">Loading changelog...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <Icon icon="solar:danger-triangle-bold" className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-red-400 font-minecraft-ten">{error}</p>
                <Button
                  onClick={loadChangelog}
                  variant="ghost"
                  className="mt-3"
                  disabled={loading}
                >
                  Retry
                </Button>
              </div>
            ) : changelogData ? (
              <div className="space-y-4">
                {changelogData.entries.map((entry, index) =>
                  renderChangelogEntry(entry, index)
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-white/50 font-minecraft-ten">No changelog data available</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border-2 border-white/20 transition-colors">
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${accentColor.value}40` }}
                >
                  <Icon
                    icon="solar:code-2-bold"
                    className="w-5 h-5"
                    style={{ color: accentColor.value }}
                  />
                </div>
                <div className="min-h-[3rem] flex flex-col justify-center">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-minecraft text-white tracking-wider">
                      Deadmake
                    </span>
                    <span className="text-white/50 font-minecraft text-lg">
                      aka Maggus
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right mr-3">
                  <p className="text-white/80 font-minecraft text-lg tracking-wide" title="(sirknubble did it better)">
                    UI & Frontend
                  </p>
                </div>
                <IconButton
                  icon={<Icon icon="solar:global-bold" className="w-4 h-4" />}
                  onClick={() => handleOpenUrl("https://deadmake.dev")}
                  variant="default"
                  size="sm"
                  title="Visit deadmake.dev"
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border-2 border-white/20 transition-colors">
              <div className="flex items-center gap-4">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${accentColor.value}40` }}
                >
                  <Icon
                    icon="solar:server-bold"
                    className="w-5 h-5"
                    style={{ color: accentColor.value }}
                  />
                </div>
                <div className="min-h-[3rem] flex flex-col justify-center">
                  <div className="flex items-baseline gap-2">
                    <h4 className="text-2xl font-minecraft text-white tracking-wider">
                      NoRisk & LiquidBounce
                    </h4>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-white/80 font-minecraft text-lg tracking-wide">
                    Base Code
                  </p>
                </div>
                <IconButton
                  icon={<Icon icon="solar:global-bold" className="w-4 h-4" />}
                  onClick={() => handleOpenUrl("https://github.com/NoRiskClient/noriskclient-launcher")}
                  variant="default"
                  size="sm"
                  title="NoRisk Source Code"
                />
                <IconButton
                  icon={<Icon icon="solar:global-bold" className="w-4 h-4" />}
                  onClick={() => handleOpenUrl("https://github.com/CCBlueX/LiquidLauncher")}
                  variant="default"
                  size="sm"
                  title="LiquidBounce Source Code"
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border-2 border-white/20 transition-colors">
              <div className="flex items-center gap-4">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${accentColor.value}40` }}
                >
                  <Icon
                    icon="solar:server-bold"
                    className="w-5 h-5"
                    style={{ color: accentColor.value }}
                  />
                </div>
                <div className="min-h-[3rem] flex flex-col justify-center">
                  <div className="flex items-baseline gap-2">
                    <h4 className="text-2xl font-minecraft text-white tracking-wider">
                      Voxel Studios
                    </h4>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-white/80 font-minecraft text-lg tracking-wide">
                    Code & API
                  </p>
                </div>
                <IconButton
                  icon={<Icon icon="solar:global-bold" className="w-4 h-4" />}
                  onClick={() => handleOpenUrl("https://github.com/VicariousNetwork/vxl-launcher")}
                  variant="default"
                  size="sm"
                  title="VXL Launcher Source Code"
                />
                <IconButton
                  icon={<Icon icon="ic:baseline-discord" className="w-4 h-4" />}
                  onClick={() => handleOpenUrl("https://vxl.to/discord")}
                  variant="default"
                  size="sm"
                  title="VXL Studios Discord"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
