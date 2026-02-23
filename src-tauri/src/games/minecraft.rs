use async_trait::async_trait;
use crate::state::profile_state::Profile;
use crate::error::Result;
use std::path::PathBuf;
use uuid::Uuid;

use super::handler::GameHandler;

pub struct MinecraftHandler;

#[async_trait]
impl GameHandler for MinecraftHandler {
    async fn launch(
        &self,
        profile: &Profile,
    ) -> Result<()> {
        let config = profile.minecraft_config.as_ref()
            .ok_or_else(|| crate::error::AppError::InvalidGameConfig("Missing Minecraft config".into()))?;
        
        // TODO: Phase 3 - Delegate to existing installer::install_minecraft_version
        // For now, this is a stub that will be implemented when command layer is updated
        Ok(())
    }
    
    async fn install_mod(
        &self,
        _profile_id: Uuid,
        _mod_source: crate::state::profile_state::ModSource,
    ) -> Result<()> {
        // TODO: Phase 4 - Implement mod installation
        Err(crate::error::AppError::NotImplemented("Minecraft mod installation not yet implemented".into()).into())
    }
    
    async fn get_mods_path(&self, profile: &Profile) -> Result<PathBuf> {
        let config = profile.minecraft_config.as_ref()
            .ok_or_else(|| crate::error::AppError::InvalidGameConfig("Missing Minecraft config".into()))?;
        
        // Use existing logic from ProfileManager
        let state = crate::state::state_manager::State::get().await?;
        if config.use_shared_minecraft_folder {
            state.profile_manager.get_profile_mods_path_shared(profile)
        } else {
            state.profile_manager.get_profile_mods_path_single(profile)
        }
    }
    
    async fn validate_profile(&self, profile: &Profile) -> Result<()> {
        let _config = profile.minecraft_config.as_ref()
            .ok_or_else(|| crate::error::AppError::InvalidGameConfig("Missing Minecraft config".into()))?;
        
        // Validate profile directory exists
        let profile_path = crate::config::LAUNCHER_DIRECTORY.data_dir().join("profiles").join(&profile.path);
        if !profile_path.exists() {
            return Err(crate::error::AppError::Other(format!(
                "Profile directory not found: {:?}",
                profile_path
            )).into());
        }
        
        Ok(())
    }
    
    fn get_game_name(&self) -> &'static str {
        "Minecraft"
    }
    
    async fn file_exists(&self, profile: &Profile, path: &str) -> Result<bool> {
        let mods_path = self.get_mods_path(profile).await?;
        Ok(mods_path.join(path).exists())
    }
}
