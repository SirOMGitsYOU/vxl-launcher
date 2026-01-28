/**
 * File Sync Configuration Types
 * Handles syncing of specific files (servers.dat, options.txt) across profiles via centralized hub
 */

export type SyncableFile = 'servers.dat' | 'options.txt';

export interface FileSyncConfig {
  id: string; // UUID
  source_profile_id: string; // UUID of the source profile
  modpack_name: string; // Name of the modpack (source)
  profile_ids: string[]; // UUIDs of profiles enrolled in this sync
  files_to_sync: SyncableFile[]; // Which files to sync
  sync_all_profiles: boolean; // If true, include all current and future profiles
  enabled: boolean;
  created_at: string; // ISO 8601 timestamp
  last_synced_at: string | null; // ISO 8601 timestamp
}

export interface FileSyncStatus {
  config_id: string;
  is_syncing: boolean;
  last_sync_result: 'success' | 'error' | null;
  last_error_message: string | null;
  files_synced: SyncableFile[];
  sync_timestamp: string | null;
}

export interface BulkSyncPayload {
  source_profile_id: string;
  target_profile_ids: string[];
  files_to_sync: SyncableFile[];
}

export interface HubSyncPayload {
  config_id: string;
  profile_id: string;
  files_to_sync: SyncableFile[];
  direction: 'pull' | 'push'; // pull from hub, push to hub
}

export interface ProfileSyncSettings {
  sync_enabled: boolean;
  config_id: string | null; // Reference to FileSyncConfig
}
