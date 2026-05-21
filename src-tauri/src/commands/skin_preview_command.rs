use crate::error::{AppError, CommandError};
use crate::minecraft::api::skin_preview_cache::SkinPreviewCache;
use log::debug;
use std::path::PathBuf;

#[tauri::command]
pub async fn get_skin_preview_path(cache_key: String) -> Result<Option<PathBuf>, CommandError> {
    debug!(
        "Command called: get_skin_preview_path for cache_key: {}",
        cache_key
    );

    let cache = SkinPreviewCache::new().map_err(CommandError::from)?;
    Ok(cache.get_preview_path_if_exists(&cache_key).await)
}

#[tauri::command]
pub async fn save_skin_preview(
    cache_key: String,
    png_base64: String,
) -> Result<PathBuf, CommandError> {
    debug!(
        "Command called: save_skin_preview for cache_key: {}",
        cache_key
    );

    use base64::Engine;
    let png_bytes = base64::engine::general_purpose::STANDARD
        .decode(png_base64)
        .map_err(|e| {
            CommandError::from(AppError::Other(format!("Invalid preview PNG data: {}", e)))
        })?;

    let cache = SkinPreviewCache::new().map_err(CommandError::from)?;
    let path = cache
        .save_preview(&cache_key, &png_bytes)
        .await
        .map_err(CommandError::from)?;

    debug!("Command completed: save_skin_preview -> {:?}", path);
    Ok(path)
}
