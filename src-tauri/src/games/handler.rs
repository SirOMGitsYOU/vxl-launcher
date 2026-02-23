use async_trait::async_trait;
use crate::state::profile_state::Profile;
use crate::error::Result;
use std::path::PathBuf;
use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;

use super::GameType;

#[async_trait]
pub trait GameHandler: Send + Sync {
    /// Launch the game with the given profile
    async fn launch(
        &self,
        profile: &Profile,
    ) -> Result<()>;
    
    /// Install a mod to the profile
    async fn install_mod(
        &self,
        profile_id: Uuid,
        mod_source: crate::state::profile_state::ModSource,
    ) -> Result<()>;
    
    /// Get the mods directory path for this profile
    async fn get_mods_path(&self, profile: &Profile) -> Result<PathBuf>;
    
    /// Validate that the profile is properly configured
    async fn validate_profile(&self, profile: &Profile) -> Result<()>;
    
    /// Get human-readable game name
    fn get_game_name(&self) -> &'static str;
    
    /// Check if a file exists in the game installation
    async fn file_exists(&self, profile: &Profile, path: &str) -> Result<bool>;
}

pub struct GameHandlerRegistry {
    handlers: HashMap<String, Arc<dyn GameHandler>>,
}

impl GameHandlerRegistry {
    pub fn new() -> Self {
        Self {
            handlers: HashMap::new(),
        }
    }
    
    pub fn register(&mut self, game_type: &str, handler: Arc<dyn GameHandler>) {
        self.handlers.insert(game_type.to_string(), handler);
    }
    
    pub fn get(&self, game_type: &str) -> Result<Arc<dyn GameHandler>> {
        self.handlers
            .get(game_type)
            .cloned()
            .ok_or_else(|| crate::error::AppError::UnsupportedGame(game_type.to_string()))
    }
}

impl Default for GameHandlerRegistry {
    fn default() -> Self {
        Self::new()
    }
}
