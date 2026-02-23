use std::str::FromStr;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum GameType {
    Minecraft,
    Hytale,
}

impl GameType {
    pub fn as_str(&self) -> &'static str {
        match self {
            GameType::Minecraft => "minecraft",
            GameType::Hytale => "hytale",
        }
    }
    
    pub fn display_name(&self) -> &'static str {
        match self {
            GameType::Minecraft => "Minecraft",
            GameType::Hytale => "Hytale",
        }
    }
}

impl FromStr for GameType {
    type Err = String;
    
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "minecraft" => Ok(GameType::Minecraft),
            "hytale" => Ok(GameType::Hytale),
            _ => Err(format!("Unknown game type: {}", s)),
        }
    }
}

impl std::fmt::Display for GameType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

// Re-export config types from profile_state to avoid circular dependencies
pub use crate::state::profile_state::{MinecraftProfileConfig, HytaleProfileConfig};
