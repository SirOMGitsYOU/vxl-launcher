import { invoke } from '@tauri-apps/api/core';

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
  features: string[];
  fixes: string[];
  improvements: string[];
}

export interface ChangelogResponse {
  current_version: string;
  entries: ChangelogEntry[];
}

/**
 * Fetch changelog data for the current launcher version
 * @returns A promise that resolves to changelog data
 */
export const fetchChangelog = (): Promise<ChangelogResponse> => {
  return invoke('fetch_changelog_command');
};

/**
 * Fetch changelog for a specific version
 * @param version The version to fetch changelog for
 * @returns A promise that resolves to changelog data for the specific version
 */
export const fetchVersionChangelog = (version: string): Promise<ChangelogEntry | null> => {
  return invoke('fetch_version_changelog_command', { version });
};
