import { invoke } from "@tauri-apps/api/core";
import type { FileSyncConfig, SyncFilePayload, BulkSyncPayload, FileSyncStatus } from "../types/fileSync";

/**
 * Service for managing file sync operations across profiles
 */

/**
 * Sync a single file from source profile to target profile
 */
export async function syncFile(payload: SyncFilePayload): Promise<void> {
  try {
    await invoke("sync_profile_file", { payload });
  } catch (error) {
    console.error("[FileSyncService] Failed to sync file:", error);
    throw error;
  }
}

/**
 * Sync multiple files from source profile to multiple target profiles
 */
export async function bulkSyncFiles(payload: BulkSyncPayload): Promise<void> {
  try {
    await invoke("bulk_sync_profile_files", { payload });
  } catch (error) {
    console.error("[FileSyncService] Failed to bulk sync files:", error);
    throw error;
  }
}

/**
 * Get all file sync configurations
 */
export async function getFileSyncConfigs(): Promise<FileSyncConfig[]> {
  try {
    const configs = await invoke<FileSyncConfig[]>("get_file_sync_configs");
    return configs;
  } catch (error) {
    console.error("[FileSyncService] Failed to get sync configs:", error);
    throw error;
  }
}

/**
 * Create a new file sync configuration
 */
export async function createFileSyncConfig(config: Omit<FileSyncConfig, 'id' | 'created_at' | 'last_synced_at'>): Promise<FileSyncConfig> {
  try {
    const newConfig = await invoke<FileSyncConfig>("create_file_sync_config", { payload: { config } });
    return newConfig;
  } catch (error) {
    console.error("[FileSyncService] Failed to create sync config:", error);
    throw error;
  }
}

/**
 * Update a file sync configuration
 */
export async function updateFileSyncConfig(config: FileSyncConfig): Promise<FileSyncConfig> {
  try {
    const updatedConfig = await invoke<FileSyncConfig>("update_file_sync_config", { config });
    return updatedConfig;
  } catch (error) {
    console.error("[FileSyncService] Failed to update sync config:", error);
    throw error;
  }
}

/**
 * Delete a file sync configuration
 */
export async function deleteFileSyncConfig(configId: string): Promise<void> {
  try {
    await invoke("delete_file_sync_config", { config_id: configId });
  } catch (error) {
    console.error("[FileSyncService] Failed to delete sync config:", error);
    throw error;
  }
}

/**
 * Get the status of a file sync configuration
 */
export async function getFileSyncStatus(configId: string): Promise<FileSyncStatus> {
  try {
    const status = await invoke<FileSyncStatus>("get_file_sync_status", { config_id: configId });
    return status;
  } catch (error) {
    console.error("[FileSyncService] Failed to get sync status:", error);
    throw error;
  }
}

/**
 * Check if a file exists in a profile
 */
export async function checkFileExists(profileId: string, fileName: string): Promise<boolean> {
  try {
    const exists = await invoke<boolean>("check_profile_file_exists", { 
      profile_id: profileId,
      file_name: fileName 
    });
    return exists;
  } catch (error) {
    console.error("[FileSyncService] Failed to check file existence:", error);
    throw error;
  }
}

// ============================================================================
// Hub-Based Sync Functions (Phase 1)
// ============================================================================

/**
 * Pull files from sharedFiles to profile
 */
export async function pullFromHub(
  profileId: string,
  filesToSync: string[]
): Promise<void> {
  try {
    await invoke("pull_from_hub", {
      profile_id: profileId,
      files_to_sync: filesToSync,
    });
  } catch (error) {
    console.error("[FileSyncService] Failed to pull from sharedFiles:", error);
    throw error;
  }
}

/**
 * Push files from profile to sharedFiles
 */
export async function pushToHub(
  profileId: string,
  filesToSync: string[]
): Promise<void> {
  try {
    await invoke("push_to_hub", {
      profile_id: profileId,
      files_to_sync: filesToSync,
    });
  } catch (error) {
    console.error("[FileSyncService] Failed to push to sharedFiles:", error);
    throw error;
  }
}

/**
 * Get list of files in sharedFiles
 */
export async function getSharedFiles(): Promise<string[]> {
  try {
    const files = await invoke<string[]>("get_shared_files");
    return files;
  } catch (error) {
    console.error("[FileSyncService] Failed to get shared files:", error);
    throw error;
  }
}
