use crate::config::{ProjectDirsExt, HTTP_CLIENT, LAUNCHER_DIRECTORY};
use crate::error::{AppError, Result};
use log::{debug, error, warn};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use tokio::fs as tokio_fs;
use tokio::io::AsyncWriteExt;

const INDEX_FILENAME: &str = "index.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapeTextureRef {
    pub id: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CapeCacheEntry {
    source_url: String,
    cached_at: i64,
}

#[derive(Debug, Default, Serialize, Deserialize)]
struct CapeCacheIndex {
    entries: HashMap<String, CapeCacheEntry>,
}

pub struct CapeTextureCache {
    cache_dir: PathBuf,
}

impl CapeTextureCache {
    pub fn new() -> Result<Self> {
        let cache_dir = LAUNCHER_DIRECTORY.meta_dir().join("cape_textures");
        if !cache_dir.exists() {
            std::fs::create_dir_all(&cache_dir).map_err(|e| {
                AppError::Other(format!("Failed to create cape texture cache directory: {}", e))
            })?;
        }
        Ok(Self { cache_dir })
    }

    fn index_path(&self) -> PathBuf {
        self.cache_dir.join(INDEX_FILENAME)
    }

    fn texture_path_for_id(&self, cape_id: &str) -> PathBuf {
        self.cache_dir.join(format!("{}.png", sanitize_cape_id(cape_id)))
    }

    fn preview_path_for_id(&self, cape_id: &str) -> PathBuf {
        self.cache_dir
            .join(format!("{}_preview_fallback.png", sanitize_cape_id(cape_id)))
    }

    async fn remove_preview_if_exists(&self, cape_id: &str) {
        let preview_path = self.preview_path_for_id(cape_id);
        if preview_path.exists() {
            if let Err(e) = tokio_fs::remove_file(&preview_path).await {
                warn!(
                    "Failed to remove stale cape preview {:?}: {}",
                    preview_path, e
                );
            }
        }
    }

    async fn load_index(&self) -> Result<CapeCacheIndex> {
        let index_path = self.index_path();
        if !index_path.exists() {
            return Ok(CapeCacheIndex::default());
        }

        let contents = tokio_fs::read_to_string(&index_path).await.map_err(|e| {
            AppError::Other(format!("Failed to read cape texture index: {}", e))
        })?;

        serde_json::from_str(&contents).map_err(|e| {
            AppError::Other(format!("Failed to parse cape texture index: {}", e))
        })
    }

    async fn save_index(&self, index: &CapeCacheIndex) -> Result<()> {
        let contents = serde_json::to_string_pretty(index).map_err(|e| {
            AppError::Other(format!("Failed to serialize cape texture index: {}", e))
        })?;

        tokio_fs::write(self.index_path(), contents)
            .await
            .map_err(|e| AppError::Other(format!("Failed to write cape texture index: {}", e)))
    }

    async fn download_texture(&self, cape_id: &str, source_url: &str) -> Result<PathBuf> {
        debug!("Downloading cape texture for {} from {}", cape_id, source_url);

        let response = HTTP_CLIENT.get(source_url).send().await.map_err(|e| {
            error!("Failed to download cape texture for {}: {:?}", cape_id, e);
            AppError::Other(format!("Failed to download cape texture: {}", e))
        })?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Other(format!(
                "Failed to download cape texture for '{}': {} - {}",
                cape_id, status, error_text
            )));
        }

        let image_bytes = response.bytes().await.map_err(|e| {
            AppError::Other(format!("Failed to read cape texture bytes for '{}': {}", cape_id, e))
        })?;

        let texture_path = self.texture_path_for_id(cape_id);
        let mut file = tokio_fs::File::create(&texture_path).await.map_err(|e| {
            AppError::Other(format!(
                "Failed to create cape texture file {}: {}",
                texture_path.display(),
                e
            ))
        })?;

        file.write_all(&image_bytes).await.map_err(|e| {
            AppError::Other(format!(
                "Failed to write cape texture file {}: {}",
                texture_path.display(),
                e
            ))
        })?;

        debug!(
            "Cached cape texture for {} at {:?}",
            cape_id, texture_path
        );
        Ok(texture_path)
    }

    async fn ensure_cached(&self, cape_id: &str, source_url: &str) -> Result<PathBuf> {
        if source_url.trim().is_empty() {
            return Err(AppError::Other(format!(
                "No source URL provided for cape '{}'",
                cape_id
            )));
        }

        let texture_path = self.texture_path_for_id(cape_id);
        let mut index = self.load_index().await?;
        let needs_download = match index.entries.get(cape_id) {
            None => true,
            Some(entry) => entry.source_url != source_url || !texture_path.exists(),
        };

        if needs_download {
            self.remove_preview_if_exists(cape_id).await;
            self.download_texture(cape_id, source_url).await?;
            index.entries.insert(
                cape_id.to_string(),
                CapeCacheEntry {
                    source_url: source_url.to_string(),
                    cached_at: chrono::Utc::now().timestamp(),
                },
            );
            self.save_index(&index).await?;
        }

        Ok(texture_path)
    }

    pub async fn get_cached_texture_path(
        &self,
        cape_id: &str,
        cape_url: &str,
    ) -> Result<PathBuf> {
        self.ensure_cached(cape_id, cape_url).await
    }

    pub async fn get_preview_path_if_exists(&self, cape_id: &str) -> Option<PathBuf> {
        let preview_path = self.preview_path_for_id(cape_id);
        if preview_path.exists() {
            Some(preview_path)
        } else {
            None
        }
    }

    pub async fn save_preview(&self, cape_id: &str, png_bytes: &[u8]) -> Result<PathBuf> {
        let preview_path = self.preview_path_for_id(cape_id);
        tokio_fs::write(&preview_path, png_bytes)
            .await
            .map_err(|e| AppError::Other(format!("Failed to write cape preview: {}", e)))?;
        debug!("Saved cape preview for {} at {:?}", cape_id, preview_path);
        Ok(preview_path)
    }

    pub async fn sync_owned_capes(&self, capes: &[CapeTextureRef]) -> Result<()> {
        let owned: Vec<&CapeTextureRef> = capes
            .iter()
            .filter(|c| !c.url.trim().is_empty())
            .collect();

        let owned_ids: HashSet<&str> = owned.iter().map(|c| c.id.as_str()).collect();
        let mut index = self.load_index().await?;

        for cape in &owned {
            let texture_path = self.texture_path_for_id(&cape.id);
            let needs_download = match index.entries.get(&cape.id) {
                None => true,
                Some(entry) => entry.source_url != cape.url || !texture_path.exists(),
            };

            if needs_download {
                self.remove_preview_if_exists(&cape.id).await;
                match self.download_texture(&cape.id, &cape.url).await {
                    Ok(_) => {
                        index.entries.insert(
                            cape.id.clone(),
                            CapeCacheEntry {
                                source_url: cape.url.clone(),
                                cached_at: chrono::Utc::now().timestamp(),
                            },
                        );
                    }
                    Err(e) => {
                        warn!(
                            "Failed to cache cape texture for {} during sync: {}",
                            cape.id, e
                        );
                    }
                }
            }
        }

        let stale_ids: Vec<String> = index
            .entries
            .keys()
            .filter(|id| !owned_ids.contains(id.as_str()))
            .cloned()
            .collect();

        for stale_id in stale_ids {
            index.entries.remove(&stale_id);
            let texture_path = self.texture_path_for_id(&stale_id);
            if texture_path.exists() {
                if let Err(e) = tokio_fs::remove_file(&texture_path).await {
                    warn!(
                        "Failed to remove stale cape texture {:?}: {}",
                        texture_path, e
                    );
                }
            }
            self.remove_preview_if_exists(&stale_id).await;
        }

        self.save_index(&index).await?;
        debug!(
            "Cape texture cache sync complete: {} owned capes tracked",
            owned.len()
        );
        Ok(())
    }
}

fn sanitize_cape_id(cape_id: &str) -> String {
    cape_id
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

pub fn spawn_cape_texture_sync(capes: Vec<CapeTextureRef>) {
    if capes.is_empty() {
        return;
    }

    tokio::spawn(async move {
        match CapeTextureCache::new() {
            Ok(cache) => {
                if let Err(e) = cache.sync_owned_capes(&capes).await {
                    warn!("Background cape texture sync failed: {}", e);
                }
            }
            Err(e) => {
                warn!("Failed to initialize cape texture cache: {}", e);
            }
        }
    });
}
