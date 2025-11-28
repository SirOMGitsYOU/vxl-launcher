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
 * Initiates the Discord account linking process.
 *
 * @returns A promise that resolves when the command is successfully sent.
 * @throws If the backend command fails.
 */
export const discordAuthLink = (): Promise<void> => {
  return invoke('discord_auth_link');
};

/**
 * Checks the Discord account linking status.
 *
 * @returns A promise that resolves to a boolean indicating if a Discord account is linked.
 * @throws If the backend command fails.
 */
export const discordAuthStatus = (): Promise<boolean> => {
  return invoke('discord_auth_status');
};

/**
 * Unlinks the currently linked Discord account.
 *
 * @returns A promise that resolves when the unlinking process is successful.
 * @throws If the backend command fails.
 */
export const discordAuthUnlink = (): Promise<void> => {
  return invoke('discord_auth_unlink');
};

/**
 * Gets the mobile app token for NoRisk mobile app linking.
 *
 * @returns A promise that resolves to the mobile app token string.
 * @throws If the backend command fails.
 */
export const getMobileAppToken = (): Promise<string> => {
  return invoke('get_mobile_app_token');
};

/**
 * Resets the mobile app token for NoRisk mobile app linking.
 *
 * @returns A promise that resolves to the new mobile app token string.
 * @throws If the backend command fails.
 */
export const resetMobileAppToken = (): Promise<string> => {
  return invoke('reset_mobile_app_token');
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