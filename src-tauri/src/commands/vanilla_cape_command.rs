use crate::error::{AppError, CommandError};
use crate::minecraft::api::cape_texture_cache::{
    spawn_cape_texture_sync, CapeTextureCache, CapeTextureRef,
};
use crate::minecraft::api::vanilla_cape_api::{VanillaCape, VanillaCapeApi, VanillaCapeInfo};
use crate::state::state_manager::State;
use log::debug;
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Deserialize, Debug)]
pub struct EquipVanillaCapePayload {
    pub cape_id: Option<String>,
}

fn cape_texture_refs_from_vanilla_capes(capes: &[VanillaCape]) -> Vec<CapeTextureRef> {
    capes
        .iter()
        .filter(|cape| !cape.url.trim().is_empty())
        .map(|cape| CapeTextureRef {
            id: cape.id.clone(),
            url: cape.url.clone(),
        })
        .collect()
}

#[tauri::command]
pub async fn sync_cape_texture_cache(capes: Vec<CapeTextureRef>) -> Result<(), CommandError> {
    debug!(
        "Command called: sync_cape_texture_cache with {} capes",
        capes.len()
    );

    let cache = CapeTextureCache::new().map_err(CommandError::from)?;
    cache
        .sync_owned_capes(&capes)
        .await
        .map_err(CommandError::from)?;

    debug!("Command completed: sync_cape_texture_cache");
    Ok(())
}

#[tauri::command]
pub async fn get_cached_cape_texture_path(
    cape_id: String,
    cape_url: String,
) -> Result<PathBuf, CommandError> {
    debug!(
        "Command called: get_cached_cape_texture_path for cape_id: {}",
        cape_id
    );

    let cache = CapeTextureCache::new().map_err(CommandError::from)?;
    let path = cache
        .get_cached_texture_path(&cape_id, &cape_url)
        .await
        .map_err(CommandError::from)?;

    debug!(
        "Command completed: get_cached_cape_texture_path -> {:?}",
        path
    );
    Ok(path)
}

#[tauri::command]
pub async fn get_cape_preview_path(cape_id: String) -> Result<Option<PathBuf>, CommandError> {
    debug!(
        "Command called: get_cape_preview_path for cape_id: {}",
        cape_id
    );

    let cache = CapeTextureCache::new().map_err(CommandError::from)?;
    Ok(cache.get_preview_path_if_exists(&cape_id).await)
}

#[tauri::command]
pub async fn save_cape_preview(
    cape_id: String,
    png_base64: String,
) -> Result<PathBuf, CommandError> {
    debug!(
        "Command called: save_cape_preview for cape_id: {}",
        cape_id
    );

    use base64::Engine;
    let png_bytes = base64::engine::general_purpose::STANDARD
        .decode(png_base64)
        .map_err(|e| CommandError::from(AppError::Other(format!("Invalid preview PNG data: {}", e))))?;

    let cache = CapeTextureCache::new().map_err(CommandError::from)?;
    let path = cache
        .save_preview(&cape_id, &png_bytes)
        .await
        .map_err(CommandError::from)?;

    debug!("Command completed: save_cape_preview -> {:?}", path);
    Ok(path)
}

#[tauri::command]
pub async fn get_owned_vanilla_capes() -> Result<Vec<VanillaCape>, CommandError> {
    debug!("Command called: get_owned_vanilla_capes");

    let state = State::get().await?;
    
    // Check if cache has data
    let cache = state.vanilla_capes_cache.read().await;
    if !cache.is_empty() {
        debug!("Returning cached vanilla capes - found {} capes", cache.len());
        spawn_cape_texture_sync(cape_texture_refs_from_vanilla_capes(&cache));
        return Ok(cache.clone());
    }
    drop(cache);
    
    let active_account = state
        .minecraft_account_manager_v2
        .get_active_account()
        .await?
        .ok_or_else(|| CommandError::from(AppError::NoCredentialsError))?;

    debug!("Using active account: {} (UUID: {})", active_account.username, active_account.id);

    let cape_api = VanillaCapeApi::new();
    
    let owned_capes = cape_api
        .get_owned_capes(&active_account.access_token)
        .await
        .map_err(|e| {
            debug!("Failed to get owned vanilla capes: {:?}", e);
            CommandError::from(e)
        })?;

    let equipped_cape = cape_api
        .get_currently_equipped_cape(&active_account.access_token)
        .await
        .map_err(|e| {
            debug!("Failed to get currently equipped vanilla cape: {:?}", e);
            CommandError::from(e)
        })?;

    // Mark the equipped cape in the owned capes list
    let mut result_capes = owned_capes;
    if let Some(equipped) = equipped_cape {
        if let Some(cape) = result_capes.iter_mut().find(|c| c.id == equipped.id) {
            cape.equipped = true;
        }
    }

    // Cache the result
    let mut cache = state.vanilla_capes_cache.write().await;
    *cache = result_capes.clone();
    drop(cache);

    debug!("Command completed: get_owned_vanilla_capes - found {} capes", result_capes.len());
    spawn_cape_texture_sync(cape_texture_refs_from_vanilla_capes(&result_capes));
    Ok(result_capes)
}

#[tauri::command]
pub async fn get_currently_equipped_vanilla_cape() -> Result<Option<VanillaCape>, CommandError> {
    debug!("Command called: get_currently_equipped_vanilla_cape");

    let state = State::get().await?;
    
    let active_account = state
        .minecraft_account_manager_v2
        .get_active_account()
        .await?
        .ok_or_else(|| CommandError::from(AppError::NoCredentialsError))?;

    debug!("Using active account: {} (UUID: {})", active_account.username, active_account.id);

    let cape_api = VanillaCapeApi::new();
    
    let result = cape_api
        .get_currently_equipped_cape(&active_account.access_token)
        .await
        .map_err(|e| {
            debug!("Failed to get currently equipped vanilla cape: {:?}", e);
            CommandError::from(e)
        });

    if result.is_ok() {
        debug!("Command completed: get_currently_equipped_vanilla_cape");
    } else {
        debug!("Command failed: get_currently_equipped_vanilla_cape");
    }

    result
}

#[tauri::command]
pub async fn equip_vanilla_cape(cape_id: Option<String>) -> Result<(), CommandError> {
    debug!("Command called: equip_vanilla_cape with cape_id: {:?}", cape_id);

    let state = State::get().await?;
    
    let active_account = state
        .minecraft_account_manager_v2
        .get_active_account()
        .await?
        .ok_or_else(|| CommandError::from(AppError::NoCredentialsError))?;

    debug!("Using active account: {} (UUID: {})", active_account.username, active_account.id);

    let cape_api = VanillaCapeApi::new();
    
    let result = cape_api
        .equip_cape(&active_account.access_token, cape_id.as_deref())
        .await
        .map_err(|e| {
            debug!("Failed to equip vanilla cape: {:?}", e);
            CommandError::from(e)
        });

    if result.is_ok() {
        debug!("Command completed: equip_vanilla_cape");
    } else {
        debug!("Command failed: equip_vanilla_cape");
    }

    result
}

#[tauri::command]
pub async fn get_vanilla_cape_info() -> Result<Vec<VanillaCapeInfo>, CommandError> {
    debug!("Command called: get_vanilla_cape_info");

    let cape_api = VanillaCapeApi::new();
    let cape_info = cape_api.get_cape_info();

    debug!("Command completed: get_vanilla_cape_info - returned {} cape info entries", cape_info.len());
    Ok(cape_info)
}

#[tauri::command]
pub async fn refresh_vanilla_cape_data() -> Result<(), CommandError> {
    debug!("Command called: refresh_vanilla_cape_data");
    
    let state = State::get().await?;
    
    // Clear the cache to force a fresh API call on next get_owned_vanilla_capes
    let mut cache = state.vanilla_capes_cache.write().await;
    cache.clear();
    drop(cache);
    
    debug!("Command completed: refresh_vanilla_cape_data - cache cleared");
    Ok(())
}