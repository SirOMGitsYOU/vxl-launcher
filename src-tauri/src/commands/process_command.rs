use crate::error::CommandError;
use crate::state::process_state::{ProcessMetadata, CrashlogDto};
use crate::state::state_manager::State;
use tauri::Manager;
use uuid::Uuid;
use serde_json::json;

#[tauri::command]
pub async fn get_processes() -> Result<Vec<ProcessMetadata>, CommandError> {
    let state = State::get().await?;
    let processes = state.process_manager.list_processes().await;
    Ok(processes)
}

#[tauri::command]
pub async fn get_process(process_id: Uuid) -> Result<Option<ProcessMetadata>, CommandError> {
    let state = State::get().await?;
    let process = state.process_manager.get_process_metadata(process_id).await;
    Ok(process)
}

#[tauri::command]
pub async fn get_processes_by_profile(
    profile_id: Uuid,
) -> Result<Vec<ProcessMetadata>, CommandError> {
    let state = State::get().await?;
    let processes = state
        .process_manager
        .get_process_metadata_by_profile(profile_id)
        .await;
    Ok(processes)
}

#[tauri::command]
pub async fn stop_process(process_id: Uuid) -> Result<(), CommandError> {
    let state = State::get().await?;
    state.process_manager.stop_process(process_id).await?;
    Ok(())
}

#[tauri::command]
pub async fn get_full_log(process_id: Uuid) -> Result<String, CommandError> {
    let state = State::get().await?;
    let log_content = state
        .process_manager
        .get_full_log_content(process_id)
        .await?;
    Ok(log_content)
}

#[tauri::command]
pub async fn open_log_window<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    process_id: Uuid,
    is_live_logs: Option<bool>,
) -> Result<(), CommandError> {
    let window_label = format!("log_window_{}", process_id);

    if let Some(window) = app.get_webview_window(&window_label) {
        window.set_focus().map_err(|e| {
            CommandError::from(crate::error::AppError::Other(format!(
                "Failed to focus existing log window {}: {}",
                window_label, e
            )))
        })?;
        return Ok(());
    }

    let is_live = is_live_logs.unwrap_or(false);

    let window = tauri::WebviewWindowBuilder::new(
        &app,
        &window_label,
        tauri::WebviewUrl::App(
            format!(
                "log-window.html?processId={}&isLiveLogs={}",
                process_id, is_live
            )
            .into(),
        ),
    )
    .title(format!("Minecraft Logs ({})", process_id))
    .inner_size(1200.0, 800.0)
    .center()
    .build()
    .map_err(|e| CommandError::from(crate::error::AppError::Other(e.to_string())))?;

    Ok(())
}

#[tauri::command]
pub async fn fetch_crash_report(profile_id: Uuid, process_id: Option<Uuid>) -> Result<Option<String>, CommandError> {
    let state = State::get().await?;
    let crash_content = state
        .process_manager
        .fetch_latest_crash_report(profile_id, process_id)
        .await?;
    Ok(crash_content)
}

#[tauri::command]
pub async fn set_discord_state(
    state_type: String,
    profile_name: Option<String>,
) -> Result<(), CommandError> {
    let state = State::get().await?;
    //TODO
    Ok(())
}

#[tauri::command]
pub async fn submit_crash_log_command(payload: CrashlogDto) -> Result<(), CommandError> {
    log::info!(
        "Executing submit_crash_log_command with mcLogsUrl: {}",
        payload.mcLogsUrl
    );

    // Sanitize the crash log content by removing sensitive data
    let sanitized_content = sanitize_crash_log(&payload.mcLogsUrl).await?;

    // Prepare the payload for mclo.gs API
    let mclog_payload = json!({
        "content": sanitized_content
    });

    // Submit to mclo.gs API
    let client = reqwest::Client::new();
    let response = client
        .post("https://api.mclo.gs/1/log")
        .json(&mclog_payload)
        .send()
        .await
        .map_err(|e| {
            CommandError::from(crate::error::AppError::Other(format!(
                "Failed to submit crash log to mclo.gs: {}",
                e
            )))
        })?;

    if !response.status().is_success() {
        return Err(CommandError::from(crate::error::AppError::Other(
            format!(
                "mclo.gs API returned error: {}",
                response.status()
            ),
        )));
    }

    log::info!("Successfully submitted crash log to mclo.gs");
    Ok(())
}

/// Sanitizes crash log content by removing sensitive information
async fn sanitize_crash_log(log_url: &str) -> Result<String, CommandError> {
    // Fetch the crash log content from the provided URL
    let client = reqwest::Client::new();
    let response = client
        .get(log_url)
        .send()
        .await
        .map_err(|e| {
            CommandError::from(crate::error::AppError::Other(format!(
                "Failed to fetch crash log from URL: {}",
                e
            )))
        })?;

    let mut content = response
        .text()
        .await
        .map_err(|e| {
            CommandError::from(crate::error::AppError::Other(format!(
                "Failed to read crash log content: {}",
                e
            )))
        })?;

    // First, extract and store all domains/IPs that appear in "Connecting to" lines
    // so we can redact them everywhere they appear in the log
    let mut redacted_addresses = Vec::new();
    
    // Match "Connecting to <address>, <port>" patterns
    // This pattern captures domains (including subdomains), IPs, and masked IPs like **.**.**.** 
    // The pattern captures everything up to the comma, including trailing periods
    if let Ok(connecting_regex) = regex::Regex::new(r"Connecting to\s+([a-zA-Z0-9\.\*\-]+\.?)\s*,\s*\d+") {
        for cap in connecting_regex.captures_iter(&content) {
            if let Some(address) = cap.get(1) {
                let addr_str = address.as_str().to_string();
                // Also add the version without trailing period for matching
                let addr_without_period = addr_str.trim_end_matches('.').to_string();
                redacted_addresses.push(addr_str.clone());
                if addr_without_period != addr_str {
                    redacted_addresses.push(addr_without_period);
                }
            }
        }
    }

    // IMPORTANT: Redact all extracted domains/IPs everywhere they appear in the log FIRST
    // This must be done before generic IP/pattern replacements to avoid conflicts
    for address in redacted_addresses {
        // Escape special regex characters in the address
        let escaped_address = regex::escape(&address);
        if let Ok(address_regex) = regex::Regex::new(&escaped_address) {
            content = address_regex
                .replace_all(&content, "[ADDRESS_REDACTED]")
                .to_string();
        }
    }

    // Remove sensitive data patterns
    // Remove file paths that might contain usernames
    content = regex::Regex::new(r"C:\\Users\\[^\\]+")
        .unwrap()
        .replace_all(&content, "C:\\Users\\[REDACTED]")
        .to_string();

    content = regex::Regex::new(r"/home/[^/]+")
        .unwrap()
        .replace_all(&content, "/home/[REDACTED]")
        .to_string();

    // Remove IP addresses
    content = regex::Regex::new(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
        .unwrap()
        .replace_all(&content, "[IP_REDACTED]")
        .to_string();

    // Remove email addresses
    content = regex::Regex::new(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
        .unwrap()
        .replace_all(&content, "[EMAIL_REDACTED]")
        .to_string();

    // Remove UUIDs that might be user identifiers (but keep some for context)
    // Only redact UUIDs that appear in suspicious contexts
    content = regex::Regex::new(r"(?i)(user|account|player)[-_]?id[:\s]*([a-f0-9\-]{36})")
        .unwrap()
        .replace_all(&content, "$1: [UUID_REDACTED]")
        .to_string();

    // Redact "Connecting to" lines completely (in case any addresses slip through)
    content = regex::Regex::new(r"Connecting to\s+[a-zA-Z0-9\.\*\-]+\s*,\s*\d+")
        .unwrap()
        .replace_all(&content, "Connecting to [ADDRESS_REDACTED], [PORT_REDACTED]")
        .to_string();

    Ok(content)
}
