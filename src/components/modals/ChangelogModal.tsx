"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { Modal } from "../ui/Modal";
import { Badge, Button, Card, LoadingState, SelectTab } from "../ui-v2";
import { fetchChangelog, type ChangelogEntry, type ChangelogResponse } from "../../services/changelog-service";
import { CreditsContent } from "./CreditsContent";

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  const [activeTab, setActiveTab] = useState<"changelog" | "credits">("changelog");
  const [changelogData, setChangelogData] = useState<ChangelogResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && activeTab === "changelog" && !changelogData) {
      void loadChangelog();
    }
  }, [isOpen, activeTab, changelogData]);

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
      <div className="mb-3 last:mb-0">
        <div className="mb-2 flex items-center gap-2">
          <Icon icon={icon} className="h-4 w-4 text-[var(--accent)]" />
          <h4 className="text-sm font-semibold text-white">{title}</h4>
        </div>
        <ul className="ml-6 space-y-1">
          {changes.map((change, index) => (
            <li key={index} className="text-sm text-[var(--text-secondary)]">
              • {change}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderChangelogEntry = (entry: ChangelogEntry) => {
    const isCurrent = entry.version === changelogData?.current_version;

    return (
      <Card
        key={entry.version}
        className={isCurrent ? "border-[var(--accent)] bg-[rgba(var(--accent-rgb),0.06)] p-4" : "p-4"}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[rgba(var(--accent-rgb),0.2)] bg-[rgba(var(--accent-rgb),0.08)]">
              <Icon icon="solar:tag-bold" className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">{entry.version}</h3>
              <p className="text-xs text-[var(--text-secondary)]">{formatDate(entry.date)}</p>
            </div>
          </div>
          {isCurrent ? <Badge tone="accent">Current</Badge> : null}
        </div>

        <div className="space-y-1">
          {renderChangeSection("Features", "solar:star-bold", entry.features)}
          {renderChangeSection("Improvements", "solar:arrow-up-bold", entry.improvements)}
          {renderChangeSection("Fixes", "solar:check-circle-bold", entry.fixes)}
          {renderChangeSection("Changes", "solar:refresh-circle-bold", entry.changes)}
        </div>
      </Card>
    );
  };

  if (!isOpen) return null;

  return (
    <Modal
      title={activeTab === "changelog" ? "Changelog" : "Credits"}
      titleIcon={
        <Icon
          icon={activeTab === "changelog" ? "solar:document-text-bold" : "solar:code-bold"}
          className="h-5 w-5"
        />
      }
      onClose={onClose}
      width="lg"
    >
      <div className="space-y-5 px-6 py-5">
        <div className="flex flex-wrap gap-2">
          <SelectTab
            active={activeTab === "changelog"}
            onClick={() => setActiveTab("changelog")}
            icon={<Icon icon="solar:document-text-bold" className="h-4 w-4" />}
          >
            Changelog
          </SelectTab>
          <SelectTab
            active={activeTab === "credits"}
            onClick={() => setActiveTab("credits")}
            icon={<Icon icon="solar:code-bold" className="h-4 w-4" />}
          >
            Credits
          </SelectTab>
        </div>

        {activeTab === "changelog" ? (
          <div className="max-h-96 space-y-3 overflow-y-auto custom-scrollbar">
            {loading ? (
              <LoadingState message="Loading changelog..." />
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Icon icon="solar:danger-triangle-bold" className="mb-3 h-10 w-10 text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
                <Button onClick={loadChangelog} variant="secondary" className="mt-4" disabled={loading}>
                  Retry
                </Button>
              </div>
            ) : changelogData ? (
              changelogData.entries.map((entry) => renderChangelogEntry(entry))
            ) : (
              <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
                No changelog data available
              </p>
            )}
          </div>
        ) : (
          <CreditsContent />
        )}
      </div>
    </Modal>
  );
}
