use async_trait::async_trait;
use crate::state::profile_state::Profile;
use crate::error::Result;
use std::path::PathBuf;
use uuid::Uuid;

use super::handler::GameHandler;

pub struct HytaleHandler;

#[async_trait]
impl GameHandler for HytaleHandler {
    async fn launch(
        &self,
        profile: &Profile,
    ) -> Result<()> {
        let config = profile.hytale_config.as_ref()
            .ok_or_else(|| crate::error::AppError::InvalidGameConfig("Missing Hytale config".into()))?;
        
        // Launch Hytale Launcher
        std::process::Command::new(&config.hytale_launcher_path)
            .spawn()
            .map_err(|e| crate::error::AppError::Io(e))?;
        
        Ok(())
    }
    
    async fn install_mod(
            &self,
            profile_id: Uuid,
            mod_source: crate::state::profile_state::ModSource,
        ) -> Result<()> {
            use crate::state::profile_state::ModSource;
            use crate::utils::download_utils::{DownloadConfig, DownloadUtils};
            use crate::config::{ProjectDirsExt, LAUNCHER_DIRECTORY};
            use tokio::fs;
        
        // Get the profile to access Hytale config
        let state = crate::state::state_manager::State::get().await?;
        let profile = state.profile_manager.get_profile(profile_id).await?;
        
        let config = profile.hytale_config.as_ref()
            .ok_or_else(|| crate::error::AppError::InvalidGameConfig("Missing Hytale config".into()))?;
        
        // Add the mod to the profile's mod list with metadata first
        add_mod_to_profile(&state, profile_id, &mod_source).await?;
        
        // Get the mods directory from Hytale installation
        let hytale_mods_path = self.get_mods_path(&profile).await?;
        
        log::info!("Hytale mods path calculated: {:?}", hytale_mods_path);
        
        // Ensure Hytale mods directory exists
        if let Err(e) = fs::create_dir_all(&hytale_mods_path).await {
            log::error!("Failed to create Hytale mods directory {:?}: {}", hytale_mods_path, e);
            return Err(crate::error::AppError::Io(e).into());
        }
        
        // Extract download info from mod source
        let (download_url, file_name, file_hash) = match &mod_source {
            ModSource::Modrinth { download_url, file_name, file_hash_sha1, .. } => {
                (download_url.clone(), file_name.clone(), file_hash_sha1.as_deref())
            }
            ModSource::CurseForge { download_url, file_name, file_hash_sha1, .. } => {
                (download_url.clone(), file_name.clone(), file_hash_sha1.as_deref())
            }
            _ => {
                return Err(crate::error::AppError::Other(
                    "Unsupported mod source for Hytale".to_string()
                ).into());
            }
        };
        
        // Use the central mod cache (same as Minecraft)
        const MOD_CACHE_DIR_NAME: &str = "mod_cache";
        let mod_cache_dir = LAUNCHER_DIRECTORY.meta_dir().join(MOD_CACHE_DIR_NAME);
        if !mod_cache_dir.exists() {
            fs::create_dir_all(&mod_cache_dir).await?;
        }
        
        // Download to cache first
        let cache_file_path = mod_cache_dir.join(&file_name);
        let temp_cache_path = cache_file_path.with_extension("jar.tmp");
        
        log::info!(
            "Downloading Hytale mod '{}' to cache at {:?}",
            file_name,
            cache_file_path
        );
        
        // Configure download with hash verification if available
        let mut download_config = DownloadConfig::new().with_streaming(true);
        if let Some(hash) = file_hash {
            download_config = download_config.with_sha1(hash);
        }
        
        // Download to cache
        DownloadUtils::download_file(&download_url, &temp_cache_path, download_config).await?;
        fs::rename(&temp_cache_path, &cache_file_path).await?;
        
        // Copy from cache to Hytale mods folder
        let target_path = hytale_mods_path.join(&file_name);
        
        log::info!(
            "Copying Hytale mod '{}' from cache to {:?}",
            file_name,
            target_path
        );
        
        // Copy the file from cache to Hytale mods directory
        if let Err(e) = fs::copy(&cache_file_path, &target_path).await {
            log::error!("Failed to copy mod from cache {:?} to Hytale mods {:?}: {}", cache_file_path, target_path, e);
            return Err(crate::error::AppError::Io(e).into());
        }
        
        log::info!(
            "Successfully installed Hytale mod '{}' to profile {} (cached at {:?})",
            file_name,
            profile_id,
            cache_file_path
        );
        
        Ok(())
    }
    
    async fn get_mods_path(&self, profile: &Profile) -> Result<PathBuf> {
        let config = profile.hytale_config.as_ref()
            .ok_or_else(|| crate::error::AppError::InvalidGameConfig("Missing Hytale config".into()))?;
        
        // Use the stored mods path if available, otherwise fall back to calculating from launcher path
        let mods_path = if !config.hytale_mods_path.is_empty() {
            PathBuf::from(&config.hytale_mods_path)
        } else {
            // Fallback for existing profiles without mods_path stored
            let launcher_path = PathBuf::from(&config.hytale_launcher_path);
            launcher_path
                .parent()
                .ok_or_else(|| crate::error::AppError::InvalidPath)?
                .join("UserData")
                .join("mods")
        };
        
        Ok(mods_path)
    }
    
    async fn validate_profile(&self, profile: &Profile) -> Result<()> {
        let config = profile.hytale_config.as_ref()
            .ok_or_else(|| crate::error::AppError::InvalidGameConfig("Missing Hytale config".into()))?;
        
        let launcher_path = PathBuf::from(&config.hytale_launcher_path);
        if !launcher_path.exists() {
            return Err(crate::error::AppError::InvalidGameConfig("Hytale launcher not found".into()).into());
        }
        
        Ok(())
    }
    
    fn get_game_name(&self) -> &'static str {
        "Hytale"
    }
    
    async fn file_exists(&self, profile: &Profile, path: &str) -> Result<bool> {
        let mods_path = self.get_mods_path(profile).await?;
        Ok(mods_path.join(path).exists())
    }
}

// Helper function to add mod to profile with metadata
async fn add_mod_to_profile(
    state: &crate::state::state_manager::State,
    profile_id: Uuid,
    mod_source: &crate::state::profile_state::ModSource,
) -> Result<()> {
    use crate::state::profile_state::{Mod, ModSource, ModLoader};
    use uuid::Uuid;
    
    log::info!("Adding mod to profile {} with metadata", profile_id);
    
    // Get display name from mod source
    let display_name = match mod_source {
        ModSource::Modrinth { project_id, .. } => {
            // Try to get the project name from Modrinth
            match crate::integrations::modrinth::get_multiple_projects(vec![project_id.clone()]).await {
                Ok(projects) => {
                    if let Some(project) = projects.first() {
                        Some(project.title.clone())
                    } else {
                        log::warn!("No project found for Modrinth project {}", project_id);
                        None
                    }
                }
                Err(e) => {
                    log::warn!("Failed to fetch Modrinth project info for {}: {}", project_id, e);
                    None
                }
            }
        }
        ModSource::CurseForge { project_id, .. } => {
            // Try to get the project name from CurseForge
            match crate::integrations::curseforge::get_mod_info(project_id.parse::<u32>().unwrap_or(0)).await {
                Ok(mod_info) => Some(mod_info.name),
                Err(e) => {
                    log::warn!("Failed to fetch CurseForge mod info for {}: {}", project_id, e);
                    None
                }
            }
        }
        _ => None,
    };
    
    let new_mod = Mod {
        id: Uuid::new_v4(),
        source: mod_source.clone(),
        enabled: true,
        display_name,
        version: None,
        game_versions: None,
        file_name_override: None,
        associated_loader: Some(ModLoader::Vanilla), // Hytale mods are vanilla
        modpack_origin: None,
        updates_enabled: true,
    };
    
    // Add the mod to the profile using the ProfileManager
    state.profile_manager.add_mod(profile_id, new_mod).await?;
    
    log::info!("Successfully added mod to profile {}", profile_id);
    Ok(())
}
