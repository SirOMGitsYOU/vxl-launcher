use crate::config::{ProjectDirsExt, LAUNCHER_DIRECTORY};
use crate::error::AppError;
use crate::state::profile_state::ProfileManager;
use crate::state::state_manager::State;
use chrono::Utc;
use log::{error, info, warn};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::State as TauriState;
use uuid::Uuid;

// Helper function to recursively copy a directory or file
fn copy_recursive(src: &PathBuf, dst: &PathBuf) -> Result<(), String> {
    if src.is_dir() {
        // Create destination directory
        fs::create_dir_all(dst).map_err(|e| format!("Failed to create directory: {}", e))?;
        
        // Recursively copy contents
        let entries = fs::read_dir(src)
            .map_err(|e| format!("Failed to read directory: {}", e))?;
        
        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let path = entry.path();
            let file_name = entry.file_name();
            let dst_path = dst.join(&file_name);
            
            if path.is_dir() {
                copy_recursive(&path, &dst_path)?;
            } else {
                fs::copy(&path, &dst_path)
                    .map_err(|e| format!("Failed to copy file: {}", e))?;
            }
        }
        Ok(())
    } else {
        // Copy single file
        fs::copy(src, dst).map_err(|e| format!("Failed to copy file: {}", e))?;
        Ok(())
    }
}

// ============================================================================
// DTOs for File Sync Commands
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileSyncConfig {
    pub id: String,
    pub source_profile_id: String,
    pub modpack_name: String,
    pub profile_ids: Vec<String>,
    pub files_to_sync: Vec<String>, // "servers.dat", "options.txt"
    pub sync_all_profiles: bool,
    pub enabled: bool,
    pub created_at: String,
    pub last_synced_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileSyncSettings {
    pub sync_enabled: bool,
    pub config_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileSyncStatus {
    pub config_id: String,
    pub is_syncing: bool,
    pub last_sync_result: Option<String>, // "success" or "error"
    pub last_error_message: Option<String>,
    pub files_synced: Vec<String>,
    pub sync_timestamp: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateFileSyncConfigPayload {
    pub config: FileSyncConfig,
}

#[derive(Debug, Deserialize)]
pub struct UpdateFileSyncConfigPayload {
    pub config: FileSyncConfig,
}

#[derive(Debug, Deserialize)]
pub struct CreateFileSyncConfigDto {
    pub source_profile_id: String,
    pub modpack_name: String,
    pub profile_ids: Vec<String>,
    pub files_to_sync: Vec<String>,
    pub sync_all_profiles: bool,
    pub enabled: bool,
}

#[derive(Debug, Deserialize)]
pub struct ConfigWrapper {
    pub config: CreateFileSyncConfigDto,
}

#[derive(Debug, Deserialize)]
pub struct CheckFileExistsPayload {
    pub profile_id: String,
    pub file_name: String,
}

// ============================================================================
// File Sync Configuration Storage
// ============================================================================

fn get_sync_configs_path() -> Result<PathBuf, AppError> {
    Ok(LAUNCHER_DIRECTORY.data_dir().join("file_sync_configs.json"))
}

pub fn load_sync_configs() -> Result<Vec<FileSyncConfig>, AppError> {
    let path = get_sync_configs_path()?;
    if !path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&path).map_err(|e| {
        AppError::Config(format!("Failed to read sync configs: {}", e))
    })?;

    serde_json::from_str(&content).map_err(|e| {
        AppError::Config(format!("Failed to parse sync configs: {}", e))
    })
}

pub fn save_sync_configs(configs: &[FileSyncConfig]) -> Result<(), AppError> {
    let path = get_sync_configs_path()?;
    let content = serde_json::to_string_pretty(configs).map_err(|e| {
        AppError::Config(format!("Failed to serialize sync configs: {}", e))
    })?;

    fs::write(&path, content).map_err(|e| {
        AppError::Config(format!("Failed to write sync configs: {}", e))
    })?;

    Ok(())
}

// ============================================================================
// File Sync Commands
// ============================================================================

/// Get all file sync configurations
#[tauri::command]
pub async fn get_file_sync_configs() -> Result<Vec<FileSyncConfig>, String> {
    load_sync_configs().map_err(|e| e.to_string())
}

/// Create a new file sync configuration and perform initial sync
#[tauri::command]
pub async fn create_file_sync_config(payload: ConfigWrapper) -> Result<FileSyncConfig, String> {
    // Create new config with generated ID and timestamp
    let config = FileSyncConfig {
        id: Uuid::new_v4().to_string(),
        source_profile_id: payload.config.source_profile_id.clone(),
        modpack_name: payload.config.modpack_name.clone(),
        profile_ids: payload.config.profile_ids.clone(),
        files_to_sync: payload.config.files_to_sync.clone(),
        sync_all_profiles: payload.config.sync_all_profiles,
        enabled: payload.config.enabled,
        created_at: Utc::now().to_rfc3339(),
        last_synced_at: None,
    };

    // Clear old configs and save only the new one
    let configs = vec![config.clone()];
    save_sync_configs(&configs).map_err(|e| e.to_string())?;

    info!("Created file sync config: {}", config.id);

    // Perform initial sync: push from source profile to hub, then pull to all target profiles
    info!("Performing initial sync for config: {}", config.id);
    
    // First, push files from source profile to hub to create initial shared files
    info!(
        "Pushing files from source profile {} to hub",
        config.source_profile_id
    );
    if let Err(e) = push_to_hub(
        config.source_profile_id.clone(),
        config.files_to_sync.clone(),
    )
    .await
    {
        warn!("Failed to push from source profile during initial sync: {}", e);
    }

    // Then pull from hub to all target profiles to ensure they have the synced files
    for profile_id in &config.profile_ids {
        if let Err(e) = pull_from_hub(
            profile_id.clone(),
            config.files_to_sync.clone(),
        )
        .await
        {
            warn!("Failed to pull to profile {} during initial sync: {}", profile_id, e);
        }
    }

    Ok(config)
}

/// Update a file sync configuration
#[tauri::command]
pub async fn update_file_sync_config(
    payload: UpdateFileSyncConfigPayload,
) -> Result<FileSyncConfig, String> {
    let mut configs = load_sync_configs().map_err(|e| e.to_string())?;

    // Find and update the config
    if let Some(pos) = configs.iter().position(|c| c.id == payload.config.id) {
        configs[pos] = payload.config.clone();
        save_sync_configs(&configs).map_err(|e| e.to_string())?;
        info!("Updated file sync config: {}", payload.config.id);
        Ok(payload.config)
    } else {
        Err(format!("File sync config not found: {}", payload.config.id))
    }
}

/// Delete a file sync configuration
#[tauri::command]
pub async fn delete_file_sync_config(config_id: String) -> Result<(), String> {
    let mut configs = load_sync_configs().map_err(|e| e.to_string())?;

    // Remove the config
    configs.retain(|c| c.id != config_id);
    save_sync_configs(&configs).map_err(|e| e.to_string())?;

    info!("Deleted file sync config: {}", config_id);
    Ok(())
}

/// Get the status of a file sync configuration
#[tauri::command]
pub async fn get_file_sync_status(config_id: String) -> Result<FileSyncStatus, String> {
    let configs = load_sync_configs().map_err(|e| e.to_string())?;

    if let Some(config) = configs.iter().find(|c| c.id == config_id) {
        Ok(FileSyncStatus {
            config_id: config.id.clone(),
            is_syncing: false,
            last_sync_result: None,
            last_error_message: None,
            files_synced: config.files_to_sync.clone(),
            sync_timestamp: config.last_synced_at.clone(),
        })
    } else {
        Err(format!("File sync config not found: {}", config_id))
    }
}

/// Check if a file exists in a profile
#[tauri::command]
pub async fn check_profile_file_exists(profile_id: String, file_name: String) -> Result<bool, String> {
    let profile_uuid = Uuid::parse_str(&profile_id)
        .map_err(|e| format!("Invalid profile ID: {}", e))?;

    let state = State::get()
        .await
        .map_err(|e| format!("Failed to get state: {}", e))?;

    let profile = state
        .profile_manager
        .get_profile(profile_uuid)
        .await
        .map_err(|e| format!("Failed to get profile: {}", e))?;

    let file_path = PathBuf::from(&profile.path).join(&file_name);
    Ok(file_path.exists())
}

// ============================================================================
// Hub-Based Sync Commands (Phase 1)
// ============================================================================

/// Get the shared files directory
fn get_shared_files_dir() -> Result<PathBuf, String> {
    Ok(LAUNCHER_DIRECTORY.file_sync_hub_dir())
}

/// Pull files from sharedFiles to profile
#[tauri::command]
pub async fn pull_from_hub(
    profile_id: String,
    files_to_sync: Vec<String>,
) -> Result<(), String> {
    info!(
        "Pulling {} files from sharedFiles to profile {}",
        files_to_sync.len(),
        profile_id
    );

    // Parse profile UUID
    let profile_uuid = uuid::Uuid::parse_str(&profile_id)
        .map_err(|e| format!("Invalid profile ID: {}", e))?;

    // Get state and profile
    let state = State::get()
        .await
        .map_err(|e| format!("Failed to get state: {}", e))?;

    let profile = state
        .profile_manager
        .get_profile(profile_uuid)
        .await
        .map_err(|e| format!("Failed to get profile: {}", e))?;

    // Calculate full profile path
    let profile_path = state
        .profile_manager
        .calculate_instance_path_for_profile(&profile)
        .map_err(|e| format!("Failed to calculate profile path: {}", e))?;

    // Get shared files directory
    let shared_files_dir = get_shared_files_dir()?;

    // Pull each file/folder from sharedFiles to profile
    for file_name in &files_to_sync {
        let shared_file = shared_files_dir.join(file_name);
        let profile_file = profile_path.join(file_name);

        // Skip if shared file/folder doesn't exist
        if !shared_file.exists() {
            warn!("Shared file/folder not found, skipping: {}", shared_file.display());
            continue;
        }

        // Remove existing destination if it exists (to ensure clean sync)
        if profile_file.exists() {
            if profile_file.is_dir() {
                fs::remove_dir_all(&profile_file).map_err(|e| {
                    format!("Failed to remove existing directory: {}", e)
                })?;
            } else {
                fs::remove_file(&profile_file).map_err(|e| {
                    format!("Failed to remove existing file: {}", e)
                })?;
            }
        }

        // Copy file or folder from sharedFiles to profile
        if let Err(e) = copy_recursive(&shared_file, &profile_file) {
            error!(
                "Failed to pull {} from sharedFiles to profile: {}",
                file_name, e
            );
            return Err(format!("Failed to pull {}: {}", file_name, e));
        }

        info!("Pulled {} from sharedFiles to profile {}", file_name, profile_id);
    }

    info!("Successfully pulled files from sharedFiles to profile {}", profile_id);
    Ok(())
}

/// Push files from profile to sharedFiles
#[tauri::command]
pub async fn push_to_hub(
    profile_id: String,
    files_to_sync: Vec<String>,
) -> Result<(), String> {
    info!(
        "Pushing {} files from profile {} to sharedFiles",
        files_to_sync.len(),
        profile_id
    );

    // Parse profile UUID
    let profile_uuid = uuid::Uuid::parse_str(&profile_id)
        .map_err(|e| format!("Invalid profile ID: {}", e))?;

    // Get state and profile
    let state = State::get()
        .await
        .map_err(|e| format!("Failed to get state: {}", e))?;

    let profile = state
        .profile_manager
        .get_profile(profile_uuid)
        .await
        .map_err(|e| format!("Failed to get profile: {}", e))?;

    // Calculate full profile path
    let profile_path = state
        .profile_manager
        .calculate_instance_path_for_profile(&profile)
        .map_err(|e| format!("Failed to calculate profile path: {}", e))?;

    // Get shared files directory and create if needed
    let shared_files_dir = get_shared_files_dir()?;
    fs::create_dir_all(&shared_files_dir).map_err(|e| {
        format!("Failed to create sharedFiles directory: {}", e)
    })?;

    // Push each file/folder from profile to sharedFiles
    for file_name in &files_to_sync {
        let profile_file = profile_path.join(file_name);
        let shared_file = shared_files_dir.join(file_name);

        // Skip if profile file/folder doesn't exist
        if !profile_file.exists() {
            warn!(
                "Profile file/folder not found, skipping: {}",
                profile_file.display()
            );
            continue;
        }

        // Remove existing destination if it exists (to ensure clean sync)
        if shared_file.exists() {
            if shared_file.is_dir() {
                fs::remove_dir_all(&shared_file).map_err(|e| {
                    format!("Failed to remove existing directory: {}", e)
                })?;
            } else {
                fs::remove_file(&shared_file).map_err(|e| {
                    format!("Failed to remove existing file: {}", e)
                })?;
            }
        }

        // Copy file or folder from profile to sharedFiles
        if let Err(e) = copy_recursive(&profile_file, &shared_file) {
            error!(
                "Failed to push {} from profile to sharedFiles: {}",
                file_name, e
            );
            return Err(format!("Failed to push {}: {}", file_name, e));
        }

        info!("Pushed {} from profile {} to sharedFiles", file_name, profile_id);
    }

    info!("Successfully pushed files from profile {} to sharedFiles", profile_id);
    Ok(())
}

/// Get list of files in sharedFiles
#[tauri::command]
pub async fn get_shared_files() -> Result<Vec<String>, String> {
    let shared_files_dir = get_shared_files_dir()?;

    // Create sharedFiles directory if it doesn't exist
    if !shared_files_dir.exists() {
        fs::create_dir_all(&shared_files_dir).map_err(|e| {
            format!("Failed to create sharedFiles directory: {}", e)
        })?;
        return Ok(Vec::new());
    }

    let mut files = Vec::new();
    match fs::read_dir(&shared_files_dir) {
        Ok(entries) => {
            for entry in entries {
                if let Ok(entry) = entry {
                    let path = entry.path();
                    if path.is_file() {
                        if let Some(name) = path.file_name() {
                            if let Some(name_str) = name.to_str() {
                                files.push(name_str.to_string());
                            }
                        }
                    }
                }
            }
        }
        Err(e) => {
            warn!("Failed to read sharedFiles directory: {}", e);
        }
    }

    files.sort();
    Ok(files)
}
