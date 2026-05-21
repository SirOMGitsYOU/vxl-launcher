use crate::config::{ProjectDirsExt, LAUNCHER_DIRECTORY};
use crate::error::{AppError, Result};
use log::debug;
use std::path::PathBuf;
use tokio::fs as tokio_fs;

pub struct SkinPreviewCache {
    cache_dir: PathBuf,
}

impl SkinPreviewCache {
    pub fn new() -> Result<Self> {
        let cache_dir = LAUNCHER_DIRECTORY.meta_dir().join("skin_previews");
        if !cache_dir.exists() {
            std::fs::create_dir_all(&cache_dir).map_err(|e| {
                AppError::Other(format!("Failed to create skin preview cache directory: {}", e))
            })?;
        }
        Ok(Self { cache_dir })
    }

    fn preview_path_for_key(&self, cache_key: &str) -> PathBuf {
        self.cache_dir.join(format!("{}.png", sanitize_cache_key(cache_key)))
    }

    pub async fn get_preview_path_if_exists(&self, cache_key: &str) -> Option<PathBuf> {
        let preview_path = self.preview_path_for_key(cache_key);
        if preview_path.exists() {
            Some(preview_path)
        } else {
            None
        }
    }

    pub async fn save_preview(&self, cache_key: &str, png_bytes: &[u8]) -> Result<PathBuf> {
        let preview_path = self.preview_path_for_key(cache_key);
        tokio_fs::write(&preview_path, png_bytes)
            .await
            .map_err(|e| AppError::Other(format!("Failed to write skin preview: {}", e)))?;
        debug!("Saved skin preview at {:?}", preview_path);
        Ok(preview_path)
    }
}

fn sanitize_cache_key(cache_key: &str) -> String {
    cache_key
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect()
}
