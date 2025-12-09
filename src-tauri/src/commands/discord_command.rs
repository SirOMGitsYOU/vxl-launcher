use crate::state::State;
use crate::state::discord_state::DiscordState;
use log::{debug, error};

/// Set Discord state to Browsing Library
#[tauri::command]
pub async fn set_discord_state_browsing_library() -> std::result::Result<(), String> {
    debug!("Command: set_discord_state_browsing_library");
    match State::get().await {
        Ok(state) => {
            if let Err(e) = state.discord_manager.set_browsing_library().await {
                error!("Failed to set Discord state to browsing library: {}", e);
                // Don't return error to prevent app crashes
                return Ok(());
            }
            Ok(())
        }
        Err(e) => {
            error!("Failed to get global state for Discord command: {}", e);
            // Don't return error to prevent app crashes
            Ok(())
        }
    }
}

/// Set Discord state to Browsing VXL Studios
#[tauri::command]
pub async fn set_discord_state_browsing_vxl_studios() -> std::result::Result<(), String> {
    debug!("Command: set_discord_state_browsing_vxl_studios");
    match State::get().await {
        Ok(state) => {
            if let Err(e) = state.discord_manager.set_browsing_vxl_studios().await {
                error!("Failed to set Discord state to browsing VXL Studios: {}", e);
                // Don't return error to prevent app crashes
                return Ok(());
            }
            Ok(())
        }
        Err(e) => {
            error!("Failed to get global state for Discord command: {}", e);
            // Don't return error to prevent app crashes
            Ok(())
        }
    }
}

/// Set Discord state to Browsing Modded Content
#[tauri::command]
pub async fn set_discord_state_browsing_modded_content() -> std::result::Result<(), String> {
    debug!("Command: set_discord_state_browsing_modded_content");
    match State::get().await {
        Ok(state) => {
            if let Err(e) = state.discord_manager.set_browsing_modded_content().await {
                error!("Failed to set Discord state to browsing modded content: {}", e);
                // Don't return error to prevent app crashes
                return Ok(());
            }
            Ok(())
        }
        Err(e) => {
            error!("Failed to get global state for Discord command: {}", e);
            // Don't return error to prevent app crashes
            Ok(())
        }
    }
}

/// Set Discord state to Playing a specific profile
#[tauri::command]
pub async fn set_discord_state_playing(profile_name: String) -> std::result::Result<(), String> {
    debug!("Command: set_discord_state_playing with profile: {}", profile_name);
    match State::get().await {
        Ok(state) => {
            if let Err(e) = state.discord_manager.set_playing(profile_name).await {
                error!("Failed to set Discord state to playing: {}", e);
                // Don't return error to prevent app crashes
                return Ok(());
            }
            Ok(())
        }
        Err(e) => {
            error!("Failed to get global state for Discord command: {}", e);
            // Don't return error to prevent app crashes
            Ok(())
        }
    }
}

/// Set Discord state to Idle
#[tauri::command]
pub async fn set_discord_state_idle() -> std::result::Result<(), String> {
    debug!("Command: set_discord_state_idle");
    match State::get().await {
        Ok(state) => {
            if let Err(e) = state.discord_manager.set_idle().await {
                error!("Failed to set Discord state to idle: {}", e);
                // Don't return error to prevent app crashes
                return Ok(());
            }
            Ok(())
        }
        Err(e) => {
            error!("Failed to get global state for Discord command: {}", e);
            // Don't return error to prevent app crashes
            Ok(())
        }
    }
}

/// Set Discord state to Getting Ready to Play
#[tauri::command]
pub async fn set_discord_state_getting_ready_to_play() -> std::result::Result<(), String> {
    debug!("Command: set_discord_state_getting_ready_to_play");
    match State::get().await {
        Ok(state) => {
            if let Err(e) = state.discord_manager.set_getting_ready_to_play().await {
                error!("Failed to set Discord state to getting ready to play: {}", e);
                return Ok(());
            }
            Ok(())
        }
        Err(e) => {
            error!("Failed to get global state for Discord command: {}", e);
            Ok(())
        }
    }
}

/// Set Discord state to Browsing Outfits
#[tauri::command]
pub async fn set_discord_state_browsing_outfits() -> std::result::Result<(), String> {
    debug!("Command: set_discord_state_browsing_outfits");
    match State::get().await {
        Ok(state) => {
            if let Err(e) = state.discord_manager.set_browsing_outfits().await {
                error!("Failed to set Discord state to browsing outfits: {}", e);
                return Ok(());
            }
            Ok(())
        }
        Err(e) => {
            error!("Failed to get global state for Discord command: {}", e);
            Ok(())
        }
    }
}

/// Set Discord state to Browsing Capes
#[tauri::command]
pub async fn set_discord_state_browsing_capes() -> std::result::Result<(), String> {
    debug!("Command: set_discord_state_browsing_capes");
    match State::get().await {
        Ok(state) => {
            if let Err(e) = state.discord_manager.set_browsing_capes().await {
                error!("Failed to set Discord state to browsing capes: {}", e);
                return Ok(());
            }
            Ok(())
        }
        Err(e) => {
            error!("Failed to get global state for Discord command: {}", e);
            Ok(())
        }
    }
}

/// Set Discord state to Tinkering
#[tauri::command]
pub async fn set_discord_state_tinkering() -> std::result::Result<(), String> {
    debug!("Command: set_discord_state_tinkering");
    match State::get().await {
        Ok(state) => {
            if let Err(e) = state.discord_manager.set_tinkering().await {
                error!("Failed to set Discord state to tinkering: {}", e);
                return Ok(());
            }
            Ok(())
        }
        Err(e) => {
            error!("Failed to get global state for Discord command: {}", e);
            Ok(())
        }
    }
}
