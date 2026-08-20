use crate::error::CommandError;

use serde::Serialize;

#[derive(Serialize)]
pub struct EmoteAssetUrlsDto {
    pub animation: String,
    pub geo: String,
    pub texture: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mcmeta: Option<String>,
}

/// MVP stub: pack emotes require the full NoRisk cosmetic asset stack.
#[tauri::command]
pub async fn get_random_local_emote() -> Result<Option<EmoteAssetUrlsDto>, CommandError> {
    Ok(None)
}
