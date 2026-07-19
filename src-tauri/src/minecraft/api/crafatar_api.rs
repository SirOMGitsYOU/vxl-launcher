use crate::config::{ProjectDirsExt, HTTP_CLIENT, LAUNCHER_DIRECTORY};
use crate::error::{AppError, Result};
use log::{debug, error, warn};
use serde::Deserialize;
use std::path::PathBuf;
use tokio::fs as tokio_fs;
use tokio::io::AsyncWriteExt;

const NMSR_API_BASE: &str = "https://nmsr.nickac.dev";
const NMSR_FACE_CACHE_VERSION: &str = "face_v1";

/// Normalizes UUID by removing hyphens for consistent cache filenames
fn normalize_uuid(uuid: &str) -> String {
    uuid.replace('-', "")
}

/// Generates cache filename based on UUID, size, and overlay parameters
fn generate_cache_filename(uuid: &str, size: Option<u32>, overlay: bool) -> String {
    let normalized_uuid = normalize_uuid(uuid);
    let size_str = size.map(|s| s.to_string()).unwrap_or_else(|| "default".to_string());
    let overlay_str = if overlay { "true" } else { "false" };
    format!(
        "{}_{}_{}_{}.png",
        NMSR_FACE_CACHE_VERSION, normalized_uuid, size_str, overlay_str
    )
}

pub struct CrafatarApiService {
    cache_dir: PathBuf,
}

impl CrafatarApiService {
    pub fn new() -> Result<Self> {
        let cache_dir = LAUNCHER_DIRECTORY.meta_dir().join("nmsr_face_cache");
        if !cache_dir.exists() {
            std::fs::create_dir_all(&cache_dir).map_err(|e| {
                AppError::Other(format!("Failed to create NMSR face cache directory: {}", e))
            })?;
        }
        Ok(Self { cache_dir })
    }

    async fn fetch_and_cache_avatar(
        uuid: &str,
        size: Option<u32>,
        overlay: bool,
        target_cache_path: &PathBuf,
    ) -> Result<Vec<u8>> {
        let normalized_uuid = normalize_uuid(uuid);
        let base_url = format!("{}/face/{}", NMSR_API_BASE, normalized_uuid);

        let mut query_params = Vec::new();
        if let Some(s) = size {
            query_params.push(("w", s.to_string()));
        }
        if !overlay {
            query_params.push(("nolayers", String::new()));
        }

        // Use global HTTP_CLIENT
        let mut request_builder = HTTP_CLIENT.get(&base_url);
        if !query_params.is_empty() {
            request_builder = request_builder.query(&query_params);
        }

        let request = request_builder.build().map_err(|e| {
            error!("Failed to build NMSR face request: {}", e);
            AppError::Other(format!("Failed to build NMSR face request: {}", e))
        })?;

        let final_url = request.url().to_string();

        debug!(
            "Fetching avatar from URL: {} for UUID {} (size: {:?}, overlay: {})",
            final_url, uuid, size, overlay
        );

        // Use global HTTP_CLIENT to execute the request
        let response = HTTP_CLIENT.execute(request).await.map_err(|e| {
            warn!(
                "NMSR face request failed for UUID {} (size: {:?}, overlay: {}): {:?}",
                uuid, size, overlay, e
            );
            AppError::Other(format!("NMSR face request failed: {}", e))
        })?;

        let status = response.status();

        if !status.is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| format!("HTTP Error {}", status));
            warn!(
                "NMSR face API call failed for UUID {} (size: {:?}, overlay: {}) with status {}: {}",
                uuid, size, overlay, status, error_text
            );

            // Return the error directly - no fallback
            return Err(AppError::Other(format!(
                "Failed to fetch avatar for UUID '{}' (size: {:?}, overlay: {}): {}",
                uuid,
                size,
                overlay,
                if status == 404 {
                    "Avatar not found".to_string()
                } else {
                    error_text
                }
            )));
        }

        let image_bytes = response.bytes().await.map_err(|e| {
            warn!(
                "Failed to read image bytes for UUID {} (size: {:?}, overlay: {}): {:?}",
                uuid, size, overlay, e
            );
            AppError::Other(format!("Failed to read image bytes for {}: {}", uuid, e))
        })?;

        debug!(
            "Saving avatar for UUID {} (size: {:?}, overlay: {}) to cache: {:?}",
            uuid, size, overlay, target_cache_path
        );
        let mut file = tokio_fs::File::create(&target_cache_path).await.map_err(|e| {
            error!(
                "Failed to create cache file for UUID {} (size: {:?}, overlay: {}): {:?}",
                uuid, size, overlay, e
            );
            AppError::Other(format!(
                "Failed to create cache file {}: {}",
                target_cache_path.display(),
                e
            ))
        })?;

        file.write_all(&image_bytes).await.map_err(|e| {
            error!(
                "Failed to write image to cache file for UUID {} (size: {:?}, overlay: {}): {:?}",
                uuid, size, overlay, e
            );
            AppError::Other(format!(
                "Failed to write image to cache file {}: {}",
                target_cache_path.display(),
                e
            ))
        })?;

        debug!(
            "Successfully cached avatar for UUID {} (size: {:?}, overlay: {}): {:?}",
            uuid, size, overlay, target_cache_path
        );
        Ok(image_bytes.to_vec())
    }

    async fn background_avatar_update(
        cache_dir: PathBuf,
        uuid: String,
        size: Option<u32>,
        overlay: bool,
    ) {
        let file_name = generate_cache_filename(&uuid, size, overlay);
        let cache_path = cache_dir.join(&file_name);

        debug!(
            "[BG] Attempting to update avatar for UUID {} (size: {:?}, overlay: {}) at {:?}",
            uuid, size, overlay, cache_path
        );

        match Self::fetch_and_cache_avatar(&uuid, size, overlay, &cache_path).await {
            Ok(_new_image_bytes) => {
                debug!(
                    "[BG] Avatar for UUID {} (size: {:?}, overlay: {}) successfully fetched and cached.",
                    uuid, size, overlay
                );
            }
            Err(e) => {
                warn!(
                    "[BG] Failed to fetch and cache avatar for UUID {} (size: {:?}, overlay: {}): {}",
                    uuid, size, overlay, e
                );
            }
        }
    }

    pub async fn get_avatar(
        &self,
        uuid: &str,
        size: Option<u32>,
        overlay: bool,
    ) -> Result<PathBuf> {
        debug!(
            "Requesting avatar for UUID: {} (size: {:?}, overlay: {})",
            uuid, size, overlay
        );

        let file_name = generate_cache_filename(uuid, size, overlay);
        let cache_path = self.cache_dir.join(&file_name);

        if cache_path.exists() {
            // Cache hit - return cached path and spawn background update
            debug!(
                "Cache hit for UUID {} (size: {:?}, overlay: {}): {:?}. Returning cached path and spawning background update.",
                uuid, size, overlay, cache_path
            );

            let cache_dir_clone = self.cache_dir.clone();
            let uuid_clone = uuid.to_string();
            let size_clone = size;

            tokio::spawn(async move {
                Self::background_avatar_update(cache_dir_clone, uuid_clone, size_clone, overlay)
                    .await;
            });
            Ok(cache_path)
        } else {
            // Cache miss, fetch and cache in foreground.
            debug!(
                "Cache miss for UUID {} (size: {:?}, overlay: {}). Fetching and caching in foreground.",
                uuid, size, overlay
            );
            match Self::fetch_and_cache_avatar(uuid, size, overlay, &cache_path).await {
                Ok(_) => Ok(cache_path),
                Err(e) => {
                    // If API fails (e.g., 503), check if we have any cached version for this UUID
                    // Try to find a cached avatar with different parameters
                    if let Ok(entries) = std::fs::read_dir(&self.cache_dir) {
                        let normalized_uuid = normalize_uuid(uuid);
                        for entry in entries.flatten() {
                            if let Some(file_name) = entry.file_name().to_str() {
                                if file_name.contains(&normalized_uuid) && file_name.ends_with(".png") {
                                    warn!(
                                        "API failed for UUID {} (size: {:?}, overlay: {}), but found cached version: {:?}. Returning cached version.",
                                        uuid, size, overlay, entry.path()
                                    );
                                    return Ok(entry.path());
                                }
                            }
                        }
                    }
                    error!(
                        "Failed to fetch avatar for UUID {} (size: {:?}, overlay: {}) in foreground: {}",
                        uuid, size, overlay, e
                    );
                    Err(e)
                }
            }
        }
    }
}

#[derive(Deserialize, Debug)]
pub struct GetCrafatarAvatarPayload {
    pub uuid: String,
    pub size: Option<u32>,
    #[serde(default = "default_overlay")]
    pub overlay: bool,
}

fn default_overlay() -> bool {
    true
}

