"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";

import { Modal } from "../ui/Modal";
import { Button, Card } from "../ui-v2";
import { toast } from "react-hot-toast";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import * as ProfileService from "../../services/profile-service";
import { useProfileStore } from "../../store/profile-store";
import { cn } from "../../lib/utils";

interface ProfileImportProps {
  onClose: () => void;
  onImportComplete: () => void;
}

const SUPPORTED_FORMATS = [
  { ext: ".mrpack", label: "Modrinth", iconClass: "text-sky-400" },
  { ext: ".vxlpack", label: "VXL Launcher", iconClass: "text-emerald-400" },
  { ext: ".zip", label: "CurseForge", iconClass: "text-orange-400" },
] as const;

export function ProfileImport({ onClose, onImportComplete }: ProfileImportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const navigate = useNavigate();

  const handleImport = async () => {
    const operationId = `profile-import-dialog-${Date.now()}`;
    let loadingToastId: string | undefined;

    try {
      const selectedPath = await openDialog({
        multiple: false,
        directory: false,
        filters: [
          {
            name: "Modpack Files",
            extensions: ["noriskpack", "mrpack", "zip"],
          },
        ],
        title: "Select Modpack to Import",
      });

      if (selectedPath && typeof selectedPath === "string") {
        setIsImporting(true);
        onClose();

        loadingToastId = `loading-${operationId}`;
        const fileName = selectedPath
          .substring(selectedPath.lastIndexOf("/") + 1)
          .substring(selectedPath.lastIndexOf("\\") + 1);
        toast.loading(`Importing profile from ${fileName}...`, { id: loadingToastId });

        const newProfileId = await ProfileService.importProfileByPath(selectedPath);

        toast.success(`Profile from ${fileName} imported successfully! Opening profile...`, {
          id: loadingToastId,
          duration: 3000,
        });
        await useProfileStore.getState().fetchProfiles(true);
        onImportComplete();
        navigate(`/profiles/${newProfileId}`);
      } else if (selectedPath !== null) {
        console.warn("File selection dialog did not return a valid path:", selectedPath);
        toast.error("Could not get selected file path. Please try again.");
      }
    } catch (err) {
      console.error("Failed to import profile:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (loadingToastId) {
        toast.error(`Failed to import profile: ${errorMessage}`, { id: loadingToastId });
      } else {
        toast.error(`Failed to import profile: ${errorMessage}`);
      }
    } finally {
      setIsImporting(false);
    }
  };

  const renderFooter = () => (
    <div className="flex justify-end">
      <Button
        variant="primary"
        onClick={handleImport}
        disabled={isImporting}
        icon={
          isImporting ? (
            <Icon icon="solar:refresh-bold" className="h-4 w-4 animate-spin" />
          ) : (
            <Icon icon="solar:upload-bold" className="h-4 w-4" />
          )
        }
        size="md"
      >
        {isImporting ? "Importing..." : "Select file to import"}
      </Button>
    </div>
  );

  return (
    <Modal title="Import profile" onClose={onClose} width="lg" footer={renderFooter()}>
      <div className="space-y-5 p-6 select-none">
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          Select a file or drag and drop a .mrpack, .vxlpack, or .zip file into the launcher to
          import it and create a new profile.
        </p>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">Supported formats</h3>
          <ul className="space-y-2">
            {SUPPORTED_FORMATS.map((format) => (
              <li key={format.ext}>
                <Card className="flex items-center gap-3 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(var(--accent-rgb),0.12)]">
                    <Icon
                      icon="solar:file-bold"
                      className={cn("h-4 w-4", format.iconClass)}
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-white">{format.ext}</span>
                    <span className="text-sm text-[var(--text-muted)]"> · {format.label}</span>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
