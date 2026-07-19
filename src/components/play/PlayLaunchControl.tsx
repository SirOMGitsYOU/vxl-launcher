"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LaunchState } from "../../store/launch-state-store";
import { useVersionSelectionStore } from "../../store/version-selection-store";
import { useProfileLaunch } from "../../hooks/useProfileLaunch";
import { LaunchButton } from "../ui-v2/LaunchButton";

interface Version {
  id: string;
  label: string;
}

interface PlayLaunchControlProps {
  versions?: Version[];
  defaultVersion?: string;
  onVersionChange?: (version: string) => void;
  selectedVersionLabel?: string;
  selectedProfileName?: string;
  className?: string;
}

export function PlayLaunchControl({
  defaultVersion,
  onVersionChange,
  versions,
  selectedVersionLabel,
  selectedProfileName,
  className,
}: PlayLaunchControlProps) {
  const [transientSuccessActive, setTransientSuccessActive] = useState(false);
  const { selectedVersion, setSelectedVersion } = useVersionSelectionStore();
  const navigate = useNavigate();

  const { handleLaunch, isLaunching, statusMessage, launchState } = useProfileLaunch({
    profileId: selectedVersion,
    profileName: selectedProfileName,
    onLaunchSuccess: () => {
      setTransientSuccessActive(true);
      setTimeout(() => setTransientSuccessActive(false), 3000);
    },
    onLaunchError: (error: string) => {
      console.error("Launch error:", error);
    },
  });

  useEffect(() => {
    const currentStoreVersion = selectedVersion;
    const storeVersionIsValidInProps = versions?.some((v) => v.id === currentStoreVersion);

    if (defaultVersion) {
      if (!storeVersionIsValidInProps || currentStoreVersion !== defaultVersion) {
        const defaultVersionPropIsValidInProps = versions?.some((v) => v.id === defaultVersion);
        if (defaultVersionPropIsValidInProps) {
          setSelectedVersion(defaultVersion);
        } else if (versions && versions.length > 0) {
          setSelectedVersion(versions[0].id);
        } else {
          setSelectedVersion("");
        }
      }
    } else if (!storeVersionIsValidInProps) {
      if (versions && versions.length > 0) {
        setSelectedVersion(versions[0].id);
      } else {
        setSelectedVersion("");
      }
    }
  }, [defaultVersion, versions, selectedVersion, setSelectedVersion]);

  const handleLaunchClick = async () => {
    if (!selectedVersion) return;
    await handleLaunch();
  };

  const handleOpenPicker = () => {
    if (isLaunching) return;
    navigate("/profiles");
  };

  let sublabel = selectedVersionLabel;
  if (transientSuccessActive && statusMessage === "STARTING!") {
    sublabel = statusMessage;
  } else if (isLaunching) {
    sublabel = statusMessage || "Launching...";
  } else if (statusMessage && launchState === LaunchState.ERROR) {
    sublabel = statusMessage;
  } else if (statusMessage) {
    sublabel = statusMessage;
  }

  const disabled =
    !selectedVersion || (versions && versions.length === 0 && !selectedVersion);

  return (
    <LaunchButton
      className={className}
      label="Play"
      sublabel={sublabel}
      onLaunch={handleLaunchClick}
      onOpenPicker={handleOpenPicker}
      isLaunching={isLaunching}
      disabled={disabled}
    />
  );
}
