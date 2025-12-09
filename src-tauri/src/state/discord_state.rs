use crate::error::{AppError, Result};
use crate::state; // Need this for State and ProcessState access
use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use log::{debug, error, info, warn};
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager; // Keep for app_handle.state()
use tokio::sync::{Mutex, RwLock};
use uuid::Uuid;

// Discord application ID for VXL Launcher
const DISCORD_APP_ID: &str = "1443240317955477554"; // Replace with actual Discord application ID

// Different states for Discord Rich Presence
#[derive(Debug, Clone, PartialEq)]
pub enum DiscordState {
    Idle,
    BrowsingLibrary,
    BrowsingVXLStudios,
    BrowsingModdedContent,
    Playing(String), // Profile name
    GettingReadyToPlay,
    BrowsingOutfits,
    BrowsingCapes,
    Tinkering,
}

pub struct DiscordManager {
    client: Arc<Mutex<Option<DiscordIpcClient>>>,
    current_state: Arc<RwLock<DiscordState>>,
    enabled: Arc<RwLock<bool>>,
    global_start_timestamp: Arc<RwLock<i64>>, // Global timer for all states
    previous_state: Arc<RwLock<DiscordState>>, // Store state before going idle on blur
}

impl DiscordManager {
    pub async fn new(enabled: bool) -> Result<Self> {
        info!(
            "Initializing Discord Rich Presence Manager (enabled: {})",
            enabled
        );

        // Get current time for global timer
        let global_timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        let manager = Self {
            client: Arc::new(Mutex::new(None)),
            current_state: Arc::new(RwLock::new(DiscordState::Idle)),
            enabled: Arc::new(RwLock::new(enabled)),
            global_start_timestamp: Arc::new(RwLock::new(global_timestamp)),
            previous_state: Arc::new(RwLock::new(DiscordState::Idle)),
        };

        // Initialize Discord presence if enabled
        if enabled {
            debug!("Discord Rich Presence initially enabled, connecting...");
            if let Err(e) = manager.connect().await {
                error!("Failed to connect to Discord during initialization: {}", e);
            }
            debug!("Setting initial Discord state to Idle");
            if let Err(e) = manager.set_state_internal(DiscordState::Idle, true).await {
                error!("Failed to set initial Discord state: {}", e);
            }
        } else {
            info!("Discord Rich Presence is disabled");
        }
        info!("Successfully initialized Discord Rich Presence Manager");

        Ok(manager)
    }

    async fn connect(&self) -> Result<()> {
        if !*self.enabled.read().await {
            debug!("Discord Rich Presence is disabled, skipping connection");
            return Ok(());
        }

        debug!("Attempting to connect to Discord...");
        let mut client_lock = self.client.lock().await;

        // Only initialize if not already initialized
        if client_lock.is_none() {
            debug!("No existing Discord client, creating new one...");
            match DiscordIpcClient::new(DISCORD_APP_ID)
                .map_err(|e| AppError::DiscordError(format!("Discord error: {}", e)))
            {
                Ok(mut client) => {
                    debug!("Discord client created, connecting...");
                    match client.connect().map_err(|e| {
                        AppError::DiscordError(format!("Discord connection error: {}", e))
                    }) {
                        Ok(_) => {
                            info!("Successfully connected to Discord client");
                            *client_lock = Some(client);
                        }
                        Err(e) => {
                            warn!("Failed to connect to Discord client: {}", e);
                            return Err(e);
                        }
                    }
                }
                Err(e) => {
                    warn!("Failed to create Discord client: {}", e);
                    return Err(e);
                }
            }
        } else {
            debug!("Discord client already exists");
        }

        Ok(())
    }

    async fn disconnect(&self) -> Result<()> {
        debug!("Attempting to disconnect from Discord...");
        let mut client_lock = self.client.lock().await;

        if let Some(mut client) = client_lock.take() {
            debug!("Found active Discord client, closing connection...");
            match client
                .close()
                .map_err(|e| AppError::DiscordError(format!("Discord disconnect error: {}", e)))
            {
                Ok(_) => {
                    info!("Successfully disconnected from Discord client");
                }
                Err(e) => {
                    warn!("Error disconnecting from Discord client: {}", e);
                    return Err(e);
                }
            }
        } else {
            debug!("No active Discord client to disconnect");
        }

        Ok(())
    }

    /* TODO
    lass mal brainstormen wie wir das handhaben wollen also imagine wir starten ein profil
    und dann editieren wir was im mods oder so... dann würden wir ja das spiel quasi überschreiben check?
     */
    // Public method that catches errors to prevent application crashes
    pub async fn set_state(&self, state: DiscordState, force: bool) -> Result<()> {
        debug!("Setting Discord state to: {:?}", state);
        match self.set_state_internal(state, force).await {
            Ok(_) => Ok(()),
            Err(e) => {
                error!(
                    "Error setting Discord state: {}. Continuing without Discord presence.",
                    e
                );
                // Return Ok to prevent application errors
                Ok(())
            }
        }
    }

    // Internal implementation that can be forced to update
    async fn set_state_internal(&self, state: DiscordState, force: bool) -> Result<()> {
        // Check if Discord is enabled
        if !*self.enabled.read().await {
            debug!("Discord Rich Presence is disabled, ignoring state update");
            return Ok(());
        }

        {
            let mut current_state = self.current_state.write().await;

            // Only update if state changed or forced
            if !force && *current_state == state {
                debug!("Discord state unchanged, skipping update");
                return Ok(());
            }

            debug!(
                "Updating Discord state from {:?} to {:?}",
                *current_state, state
            );
            *current_state = state.clone();
        }

        // Lock the client and set the activity
        let mut client_lock = self.client.lock().await;

        // If client is None, try to reconnect
        if client_lock.is_none() {
            debug!("No Discord client available, attempting to reconnect...");
            drop(client_lock); // Release the lock before reconnecting
            self.connect().await?;
            client_lock = self.client.lock().await;
        }

        if let Some(client_ref) = client_lock.as_mut() {
            // Create activity for current state (pass self to access timestamp)
            let activity = self.create_activity_for_state(&state).await; // Make async

            debug!("Sending activity to Discord...");
            match client_ref
                .set_activity(activity)
                .map_err(|e| AppError::DiscordError(format!("Discord activity error: {}", e)))
            {
                Ok(_) => {
                    debug!("Successfully updated Discord Rich Presence");
                }
                Err(e) => {
                    warn!("Failed to update Discord Rich Presence: {}", e);
                    // Try to reconnect
                    debug!("Attempting to reconnect to Discord...");
                    if let Err(reconnect_e) = client_ref.reconnect().map_err(|e| {
                        AppError::DiscordError(format!("Discord reconnect error: {}", e))
                    }) {
                        error!("Failed to reconnect to Discord: {}", reconnect_e);
                        return Err(reconnect_e);
                    }

                    debug!("Reconnection successful, trying to set activity again...");
                    // Try setting activity again after reconnect with a new activity
                    let new_activity = self.create_activity_for_state(&state).await;
                    if let Err(retry_e) = client_ref.set_activity(new_activity).map_err(|e| {
                        AppError::DiscordError(format!(
                            "Discord activity error after reconnect: {}",
                            e
                        ))
                    }) {
                        error!(
                            "Failed to update Discord Rich Presence after reconnect: {}",
                            retry_e
                        );
                        return Err(retry_e);
                    }
                    debug!("Successfully updated Discord Rich Presence after reconnect");
                }
            }
        } else {
            // This case should be less likely now due to the reconnect logic above
            warn!("Failed to get Discord client, cannot set activity");
        }

        Ok(())
    }

    /// Get the state text for a given Discord state
    fn get_state_text(&self, state: &DiscordState) -> String {
        match state {
            DiscordState::Idle => "Idling...".to_string(),
            DiscordState::BrowsingLibrary => "Browsing their library".to_string(),
            DiscordState::BrowsingVXLStudios => "Browsing VXL Studios' Content".to_string(),
            DiscordState::BrowsingModdedContent => "Browsing modded content".to_string(),
            DiscordState::Playing(profile_name) => format!("Playing {}", profile_name),
            DiscordState::GettingReadyToPlay => "Getting ready to play".to_string(),
            DiscordState::BrowsingOutfits => "Getting all cosy with their outfit".to_string(),
            DiscordState::BrowsingCapes => "Browsing their royal cape attire".to_string(),
            DiscordState::Tinkering => "Tinkering....".to_string(),
        }
    }

    /// Create a base activity that will be reused and only state text will change
    fn create_base_activity(&self) -> activity::Activity {
        let icon = "icon_512px";
        let download_button = activity::Button::new("DOWNLOAD", "https://voxelstudios.co.uk/download/");
        let buttons = vec![download_button];

        activity::Activity::new()
            .assets(
                activity::Assets::new()
                    .large_image(icon)
                    .large_text("VXL Launcher"),
            )
            .buttons(buttons)
    }

    /// Create activity for state with dynamic state text only
    async fn create_activity_for_state(&self, state: &DiscordState) -> activity::Activity {
        let mut activity = self.create_base_activity();
        let state_text = self.get_state_text(state);
        activity = activity.state(state_text.leak());

        // Use global timer for all states
        let global_timestamp = *self.global_start_timestamp.read().await;
        activity = activity.timestamps(activity::Timestamps::new().start(global_timestamp));

        // Only add details for Playing state
        if matches!(state, DiscordState::Playing(_)) {
            activity = activity.details("In-game");
        }

        activity
    }

    // Set enable/disable state
    pub async fn set_enabled(&self, enabled: bool) -> Result<()> {
        debug!("Setting Discord Rich Presence enabled: {}", enabled);
        let mut enabled_lock = self.enabled.write().await;
        let was_enabled = *enabled_lock;
        *enabled_lock = enabled;

        if !was_enabled && enabled {
            // Was disabled, now enabled - connect
            debug!("Discord was disabled, now enabled - connecting...");
            drop(enabled_lock);

            // Catch errors to prevent application crashes
            if let Err(e) = self.connect().await {
                error!("Failed to connect to Discord when enabling: {}", e);
                // Continue without error return
                return Ok(());
            }

            // Set initial state and catch errors
            if let Err(e) = self.set_state_internal(DiscordState::Idle, true).await {
                error!("Failed to set initial Discord state: {}", e);
                // Continue without error return
                return Ok(());
            }
        } else if was_enabled && !enabled {
            // Was enabled, now disabled - disconnect
            debug!("Discord was enabled, now disabled - disconnecting...");
            drop(enabled_lock);

            // Catch errors to prevent application crashes
            if let Err(e) = self.disconnect().await {
                error!("Failed to disconnect from Discord when disabling: {}", e);
                // Continue without error return
            }
        } else {
            debug!("Discord enabled state unchanged: {}", enabled);
        }

        Ok(())
    }


    pub async fn get_current_state(&self) -> DiscordState {
        let state = self.current_state.read().await.clone();
        debug!("Getting current Discord state: {:?}", state);
        state
    }

    pub async fn is_enabled(&self) -> bool {
        let enabled = *self.enabled.read().await;
        debug!("Checking if Discord is enabled: {}", enabled);
        enabled
    }

    /// Handle window blur event (loses focus) - set to Idle and save previous state
    /// But don't transition to Idle if a game is currently running
    pub async fn handle_blur_event(&self) -> Result<()> {
        if !self.is_enabled().await {
            return Ok(());
        }

        let current_state = self.get_current_state().await;
        
        // Check if a game is currently running
        let is_game_running = match state::State::get().await {
            Ok(state) => {
                let processes = state.process_manager.list_processes().await;
                processes
                    .iter()
                    .any(|p| p.state == state::process_state::ProcessState::Running)
            }
            Err(e) => {
                error!("Blur handling: Failed to get global state: {}. Assuming game might be running.", e);
                true // Safety: assume game is running if we can't check
            }
        };

        // If in Playing state but no game is running, force to Idle
        if matches!(current_state, DiscordState::Playing(_)) && !is_game_running {
            debug!("Window blur: In Playing state but no game is running, forcing to Idle");
            self.force_idle().await?;
            return Ok(());
        }

        // Never override Playing state if game is actually running
        if matches!(current_state, DiscordState::Playing(_)) {
            debug!("Window blur: Currently in Playing state with game running, not transitioning to Idle");
            return Ok(());
        }

        // Only transition to Idle if no game is running
        if !is_game_running {
            // Only save and transition if not already idle
            if current_state != DiscordState::Idle {
                debug!("Window blur: Saving state {:?} and transitioning to Idle", current_state);
                // Save current state before going idle
                let mut prev_state = self.previous_state.write().await;
                *prev_state = current_state;
                drop(prev_state);
                
                // Transition to idle
                self.set_state_internal(DiscordState::Idle, true).await?;
            }
        } else {
            debug!("Window blur: Game is running, keeping current Discord state");
        }

        Ok(())
    }

    /// Handle window focus event (gains focus) - restore previous state or check game status
    pub async fn handle_focus_event(&self) -> Result<()> {
        if !self.is_enabled().await {
            return Ok(());
        }

        // Get the global state and check processes
        let is_game_running = match state::State::get().await {
            Ok(state) => {
                // Access process manager via the successfully retrieved state
                let processes = state.process_manager.list_processes().await;
                processes
                    .iter()
                    .any(|p| p.state == state::process_state::ProcessState::Running)
            }
            Err(e) => {
                error!("Focus handling: Failed to get global state using State::get(): {}. Assuming game might be running.", e);
                // Safety measure: Assume a game *might* be running if we can't get state.
                true
            }
        };

        if !is_game_running {
            let current_state = self.get_current_state().await;
            
            // If we're in Idle, restore the previous state
            if current_state == DiscordState::Idle {
                let prev_state = self.previous_state.read().await.clone();
                if prev_state != DiscordState::Idle {
                    debug!("Window focus: Restoring previous state {:?}", prev_state);
                    self.set_state_internal(prev_state, true).await?;
                } else {
                    debug!("Window focus: Previous state was also Idle, staying Idle");
                }
            }
        }

        Ok(())
    }


    // Convenience methods for setting specific states
    pub async fn set_idle(&self) -> Result<()> {
        self.set_state(DiscordState::Idle, false).await
    }

    pub async fn set_browsing_library(&self) -> Result<()> {
        self.set_state(DiscordState::BrowsingLibrary, false).await
    }

    pub async fn set_browsing_vxl_studios(&self) -> Result<()> {
        self.set_state(DiscordState::BrowsingVXLStudios, false).await
    }

    pub async fn set_browsing_modded_content(&self) -> Result<()> {
        self.set_state(DiscordState::BrowsingModdedContent, false).await
    }

    pub async fn set_playing(&self, profile_name: String) -> Result<()> {
        self.set_state(DiscordState::Playing(profile_name), false).await
    }

    pub async fn set_getting_ready_to_play(&self) -> Result<()> {
        self.set_state(DiscordState::GettingReadyToPlay, false).await
    }

    pub async fn set_browsing_outfits(&self) -> Result<()> {
        self.set_state(DiscordState::BrowsingOutfits, false).await
    }

    pub async fn set_browsing_capes(&self) -> Result<()> {
        self.set_state(DiscordState::BrowsingCapes, false).await
    }

    pub async fn set_tinkering(&self) -> Result<()> {
        self.set_state(DiscordState::Tinkering, false).await
    }

    /// Force the Discord state to Idle, overriding any current state (including Playing).
    /// This is used when a game process is detected as stopped to immediately reflect the change.
    pub async fn force_idle(&self) -> Result<()> {
        if !self.is_enabled().await {
            return Ok(());
        }
        
        debug!("Force setting Discord state to Idle (overriding current state)");
        self.set_state_internal(DiscordState::Idle, true).await
    }
}
