use crate::config::{ProjectDirsExt, HTTP_CLIENT, LAUNCHER_DIRECTORY};
use crate::error::{AppError, Result};
use crate::state::event_state::{EventPayload, EventType};
use crate::utils::hash_utils::calculate_sha1_from_bytes;
use base64::Engine;
use log::{debug, error, warn};
use reqwest::multipart::{Form, Part};
use serde::Deserialize;
use std::path::PathBuf;
use uuid::Uuid;

const NMSR_API_BASE: &str = "https://nmsr.nickac.dev";
const NMSR_SKIN_CACHE_VERSION: &str = "fullbody_v1";

fn generate_cache_filename(
    player_name: &str,
    render_type: &str,
    render_view: &str,
    base64_skin_data: Option<&str>,
) -> String {
    if let Some(data) = base64_skin_data {
        let hash_string = calculate_sha1_from_bytes(data.as_bytes());
        let short_hash = &hash_string[0..std::cmp::min(8, hash_string.len())];
        format!(
            "{}_{}_{}_{}_custom_{}.png",
            NMSR_SKIN_CACHE_VERSION, player_name, render_type, render_view, short_hash
        )
    } else {
        format!(
            "{}_{}_{}_{}_default.png",
            NMSR_SKIN_CACHE_VERSION, player_name, render_type, render_view
        )
    }
}

pub struct StarlightApiService {
    cache_dir: PathBuf,
}

impl StarlightApiService {
    pub fn new() -> Result<Self> {
        let cache_dir = LAUNCHER_DIRECTORY.meta_dir().join("nmsr_skin_cache");
        if !cache_dir.exists() {
            std::fs::create_dir_all(&cache_dir).map_err(|e| {
                AppError::Other(format!("Failed to create NMSR skin cache directory: {}", e))
            })?;
        }

        Ok(Self { cache_dir })
    }

    async fn fetch_fullbody_from_nmsr(
        player_name: &str,
        base64_skin_data: Option<&str>,
        slim: bool,
    ) -> Result<Vec<u8>> {
        let response = if let Some(base64_data) = base64_skin_data {
            let skin_bytes = base64::engine::general_purpose::STANDARD
                .decode(base64_data)
                .map_err(|e| {
                    AppError::Other(format!(
                        "Failed to decode base64 skin data for '{}': {}",
                        player_name, e
                    ))
                })?;

            let skin_part = Part::bytes(skin_bytes)
                .file_name("skin.png")
                .mime_str("image/png")
                .map_err(|e| AppError::Other(format!("Failed to build skin multipart part: {}", e)))?;

            let mut form = Form::new().part("skin", skin_part);
            if slim {
                form = form.text("alex", "");
            }

            let url = format!("{}/fullbody", NMSR_API_BASE);

            debug!(
                "Posting custom skin render to NMSR fullbody for player {}",
                player_name
            );

            HTTP_CLIENT.post(&url).multipart(form).send().await.map_err(|e| {
                warn!(
                    "NMSR fullbody POST failed for player {} (custom_skin: true): {:?}",
                    player_name, e
                );
                AppError::Other(format!("NMSR fullbody POST failed: {}", e))
            })?
        } else {
            let url = format!("{}/fullbody/{}", NMSR_API_BASE, player_name);
            let mut request = HTTP_CLIENT.get(&url);
            if slim {
                request = request.query(&[("alex", "")]);
            }

            debug!(
                "Fetching fullbody render from NMSR for player {}",
                player_name
            );

            request.send().await.map_err(|e| {
                warn!(
                    "NMSR fullbody GET failed for player {} (custom_skin: false): {:?}",
                    player_name, e
                );
                AppError::Other(format!("NMSR fullbody GET failed: {}", e))
            })?
        };

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| format!("HTTP Error {}", status));
            warn!(
                "NMSR fullbody call failed for player {} (custom_skin: {}) with status {}: {}",
                player_name,
                base64_skin_data.is_some(),
                status,
                error_text
            );
            return Err(AppError::Other(format!(
                "Failed to fetch fullbody render for '{}' (custom_skin: {}): {}",
                player_name,
                base64_skin_data.is_some(),
                if status == 404 {
                    "Render not found".to_string()
                } else {
                    error_text
                }
            )));
        }

        response.bytes().await.map(|b| b.to_vec()).map_err(|e| {
            AppError::Other(format!(
                "Failed to read fullbody image bytes for {}: {}",
                player_name, e
            ))
        })
    }

    async fn write_image_to_cache(target_cache_path: &PathBuf, image_bytes: &[u8]) -> Result<()> {
        let mut file = tokio::fs::File::create(target_cache_path).await.map_err(|e| {
            AppError::Other(format!(
                "Failed to create cache file {}: {}",
                target_cache_path.display(),
                e
            ))
        })?;

        tokio::io::AsyncWriteExt::write_all(&mut file, image_bytes)
            .await
            .map_err(|e| {
                AppError::Other(format!(
                    "Failed to write image to cache file {}: {}",
                    target_cache_path.display(),
                    e
                ))
            })?;

        Ok(())
    }

    async fn fetch_and_cache_skin(
        player_name: &str,
        render_type: &str,
        render_view: &str,
        base64_skin_data: Option<&str>,
        slim: bool,
        target_cache_path: &PathBuf,
    ) -> Result<Vec<u8>> {
        let _ = render_view;
        let _ = render_type;

        let image_bytes =
            Self::fetch_fullbody_from_nmsr(player_name, base64_skin_data, slim).await?;

        debug!(
            "Saving NMSR skin render for player {} (custom_skin: {}) to cache: {:?}",
            player_name,
            base64_skin_data.is_some(),
            target_cache_path
        );

        Self::write_image_to_cache(target_cache_path, &image_bytes).await?;

        debug!(
            "Successfully cached NMSR skin render for player {} (custom_skin: {}): {:?}",
            player_name,
            base64_skin_data.is_some(),
            target_cache_path
        );

        Ok(image_bytes)
    }

    async fn background_skin_update(
        cache_dir: PathBuf,
        player_name: String,
        render_type: String,
        render_view: String,
        base64_skin_data: Option<String>,
        slim: bool,
    ) {
        let file_name = generate_cache_filename(
            &player_name,
            &render_type,
            &render_view,
            base64_skin_data.as_deref(),
        );
        let cache_path = cache_dir.join(&file_name);

        debug!(
            "[BG] Attempting to update NMSR skin for player {} (custom_skin: {}) at {:?}",
            player_name,
            base64_skin_data.is_some(),
            cache_path
        );

        match Self::fetch_and_cache_skin(
            &player_name,
            &render_type,
            &render_view,
            base64_skin_data.as_deref(),
            slim,
            &cache_path,
        )
        .await
        {
            Ok(_) => {
                debug!(
                    "[BG] NMSR skin for player {} successfully fetched and cached. Emitting update event.",
                    player_name
                );

                if let Ok(state) = crate::state::State::get().await {
                    let skin_type_msg = if base64_skin_data.is_some() {
                        "custom skin"
                    } else {
                        "default skin"
                    };
                    let payload = EventPayload {
                        event_id: Uuid::new_v4(),
                        event_type: EventType::StarlightSkinUpdated,
                        target_id: None,
                        message: format!(
                            "Skin for player {} ({}) was updated via NMSR.",
                            player_name, skin_type_msg
                        ),
                        progress: None,
                        error: None,
                    };
                    if let Err(e) = state.event_state.emit(payload).await {
                        error!(
                            "[BG] Failed to emit StarlightSkinUpdated event for {}: {}",
                            player_name, e
                        );
                    }
                } else {
                    error!(
                        "[BG] Failed to get global state to emit StarlightSkinUpdated event for {}.",
                        player_name
                    );
                }
            }
            Err(e) => {
                warn!(
                    "[BG] Failed to fetch and cache NMSR skin for player {}: {}",
                    player_name, e
                );
            }
        }
    }

    pub async fn get_skin_render(
        &self,
        player_name: &str,
        render_type: &str,
        render_view: &str,
        base64_skin_data: Option<String>,
        slim: bool,
    ) -> Result<PathBuf> {
        debug!(
            "Requesting NMSR skin render for player: {} (type: {}, view: {}, custom_skin: {}, slim: {})",
            player_name,
            render_type,
            render_view,
            base64_skin_data.is_some(),
            slim
        );

        let file_name = generate_cache_filename(
            player_name,
            render_type,
            render_view,
            base64_skin_data.as_deref(),
        );
        let cache_path = self.cache_dir.join(&file_name);

        if cache_path.exists() {
            if base64_skin_data.is_some() {
                debug!(
                    "Cache hit for custom NMSR skin for player {}: {:?}",
                    player_name, cache_path
                );
                Ok(cache_path)
            } else {
                debug!(
                    "Cache hit for default NMSR skin for player {}: {:?}. Spawning background update.",
                    player_name, cache_path
                );

                let cache_dir_clone = self.cache_dir.clone();
                let player_name_clone = player_name.to_string();
                let render_type_clone = render_type.to_string();
                let render_view_clone = render_view.to_string();
                let base64_skin_data_clone = base64_skin_data.clone();

                tokio::spawn(async move {
                    Self::background_skin_update(
                        cache_dir_clone,
                        player_name_clone,
                        render_type_clone,
                        render_view_clone,
                        base64_skin_data_clone,
                        slim,
                    )
                    .await;
                });
                Ok(cache_path)
            }
        } else {
            debug!(
                "Cache miss for NMSR skin for player {} (custom_skin: {}). Fetching in foreground.",
                player_name,
                base64_skin_data.is_some()
            );
            match Self::fetch_and_cache_skin(
                player_name,
                render_type,
                render_view,
                base64_skin_data.as_deref(),
                slim,
                &cache_path,
            )
            .await
            {
                Ok(_) => Ok(cache_path),
                Err(e) => {
                    error!(
                        "Failed to fetch NMSR skin for player {} in foreground: {}",
                        player_name, e
                    );
                    Err(e)
                }
            }
        }
    }
}

#[derive(Deserialize, Debug)]
pub struct GetSkinRenderPayload {
    pub player_name: String,
    pub render_type: String,
    pub render_view: String,
    pub base64_skin_data: Option<String>,
    #[serde(default)]
    pub slim: bool,
}
