import { invoke } from '@tauri-apps/api/core';
import type { BlogPost } from '../types/wordPress';
import type { UpdateInfo } from '../types/updater';

/**
 * Fetches the latest news and changelog posts from the backend.
 *
 * @returns A promise that resolves to an array of BlogPost objects.
 * @throws If the backend command fails.
 */
export const fetchNewsAndChangelogs = (): Promise<BlogPost[]> => {
  // Directly invoke and return the promise. Errors will propagate to the caller.
  return invoke('get_news_and_changelogs_command');
};

/**
 * Checks if an application update is available.
 * Uses the beta channel setting from the launcher configuration.
 *
 * @returns A promise that resolves to UpdateInfo if an update is available, or null if up to date.
 * @throws If the backend command fails.
 */
export const checkUpdateAvailable = (): Promise<UpdateInfo | null> => {
  return invoke('check_update_available_command');
};

/**
 * Downloads and installs an available application update.
 * Uses the beta channel setting from the launcher configuration.
 * The application will restart automatically after successful installation.
 *
 * @returns A promise that resolves when the update process is complete.
 * @throws If the backend command fails or no update is available.
 */
export const downloadAndInstallUpdate = (): Promise<void> => {
  return invoke('download_and_install_update_command');
};

// Re-export logging utilities for backward compatibility
export { log as logMessage, logDebug as logMessageDebug, logInfo as logMessageInfo, logWarn as logMessageWarn, logError as logMessageError } from '../utils/logging-utils';