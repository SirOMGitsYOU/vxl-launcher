"use client";

import { createContext, useCallback, useContext } from "react";
import type { LauncherConfig } from "../../../types/launcherConfig";

interface SettingsConfigValue {
  config: LauncherConfig | null;
  tempConfig: LauncherConfig | null;
  setTempConfig: (config: LauncherConfig) => void;
  saving: boolean;
}

const SettingsConfigContext = createContext<SettingsConfigValue | null>(null);

export const SettingsConfigProvider = SettingsConfigContext.Provider;

export function useSettingsConfig(): SettingsConfigValue {
  const ctx = useContext(SettingsConfigContext);
  if (!ctx) {
    throw new Error("useSettingsConfig must be used within SettingsConfigProvider");
  }
  return ctx;
}

export function useSettingsKeywords() {
  return useCallback((...keywords: string[]) => keywords, []);
}
