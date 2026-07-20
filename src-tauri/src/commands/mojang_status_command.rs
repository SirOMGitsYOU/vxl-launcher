use crate::error::{AppError, CommandError};
use serde::{Deserialize, Serialize};
use tauri::command;

const MOJANG_STATUS_URL: &str = "https://www.mcstate.net/api/mojang-status";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MojangServiceStatus {
    Up,
    Down,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MojangServiceHealth {
    pub id: String,
    pub label: String,
    pub desc: String,
    pub status: MojangServiceStatus,
    #[serde(default)]
    pub latency: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MojangStatusResponse {
    pub services: Vec<MojangServiceHealth>,
    pub checked_at: String,
}

#[command]
pub async fn fetch_mojang_service_status_command() -> Result<MojangStatusResponse, CommandError> {
    let response = reqwest::get(MOJANG_STATUS_URL).await.map_err(AppError::MinecraftApi)?;

    if !response.status().is_success() {
        return Err(CommandError::from(AppError::Config(format!(
            "Mojang status API returned status: {}",
            response.status()
        ))));
    }

    response
        .json::<MojangStatusResponse>()
        .await
        .map_err(AppError::MinecraftApi)
        .map_err(CommandError::from)
}
