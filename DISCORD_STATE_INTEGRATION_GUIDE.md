# Discord Rich Presence State Integration Guide

## Overview
The Discord Rich Presence system has been extended to support multiple states beyond just "Idle". This guide shows you how to integrate the new states throughout your application.

## Available States

### 1. **Idle**
```rust
discord_manager.set_idle().await?;
```
- Displayed as: "Idling..."
- Shows elapsed time since becoming idle
- Automatically set when no game is running

### 2. **Browsing Library**
```rust
discord_manager.set_browsing_library().await?;
```
- Displayed as: "Browsing Library"
- Details: "Exploring available content"
- Use when user navigates to the library/content section

### 3. **Browsing VXL Studios**
```rust
discord_manager.set_browsing_vxl_studios().await?;
```
- Displayed as: "Browsing VXL Studios"
- Details: "Checking out studio content"
- Use when user views studio-specific content

### 4. **Browsing Modded Content**
```rust
discord_manager.set_browsing_modded_content().await?;
```
- Displayed as: "Browsing Modded Content"
- Details: "Looking for mods"
- Use when user browses mods or modifications

### 5. **Playing Profile**
```rust
discord_manager.set_playing("Profile Name".to_string()).await?;
```
- Displayed as: "Playing Profile Name"
- Details: "In-game"
- Use when a game profile is launched
- Profile name is dynamically inserted

## Integration Points

### Frontend Navigation (TypeScript/React)
When implementing state changes in your frontend, you'll need to call Tauri commands that trigger the Discord state updates. Example:

```typescript
// When user navigates to library
await invoke('set_discord_state_browsing_library');

// When user navigates to studios
await invoke('set_discord_state_browsing_vxl_studios');

// When user browses mods
await invoke('set_discord_state_browsing_modded_content');

// When user launches a profile
await invoke('set_discord_state_playing', { profileName: 'My Profile' });
```

### Backend Commands (Tauri)
Create corresponding Tauri commands in your command module:

```rust
#[tauri::command]
pub async fn set_discord_state_browsing_library(
    state: tauri::State<'_, AppState>,
) -> Result<()> {
    state.discord_manager.set_browsing_library().await
}

#[tauri::command]
pub async fn set_discord_state_browsing_vxl_studios(
    state: tauri::State<'_, AppState>,
) -> Result<()> {
    state.discord_manager.set_browsing_vxl_studios().await
}

#[tauri::command]
pub async fn set_discord_state_browsing_modded_content(
    state: tauri::State<'_, AppState>,
) -> Result<()> {
    state.discord_manager.set_browsing_modded_content().await
}

#[tauri::command]
pub async fn set_discord_state_playing(
    profile_name: String,
    state: tauri::State<'_, AppState>,
) -> Result<()> {
    state.discord_manager.set_playing(profile_name).await
}
```

### Process Management
When launching a game profile, automatically update Discord state:

```rust
// In your process launch code
let profile_name = "My Awesome Profile".to_string();
discord_manager.set_playing(profile_name).await?;
```

When a process ends:
```rust
// When game process terminates
discord_manager.set_idle().await?;
```

## State Transitions

### Recommended Flow
```
Idle
  ↓
User navigates to Library → Browsing Library
  ↓
User navigates to Studios → Browsing VXL Studios
  ↓
User navigates to Mods → Browsing Modded Content
  ↓
User launches game → Playing [Profile Name]
  ↓
Game closes → Idle
```

### Key Behaviors
- **Idle state** automatically sets a timestamp to show "elapsed time"
- **Non-idle states** clear the idle timestamp
- All state changes are non-blocking and won't crash the app if Discord is unavailable
- States persist until explicitly changed

## Error Handling
All state-setting methods return `Result<()>`. Errors are logged but won't crash the application:

```rust
match discord_manager.set_browsing_library().await {
    Ok(_) => debug!("Discord state updated successfully"),
    Err(e) => warn!("Failed to update Discord state: {}", e),
}
```

## Testing
To test Discord integration:
1. Ensure Discord is running on your system
2. Launch the VXL Launcher
3. Check your Discord profile to see the rich presence updates
4. Navigate through different sections and verify the status changes

## Future Enhancements
- Add state for profile editing
- Add state for downloading/installing content
- Add custom images for different states
- Add more detailed activity information (elapsed time, progress, etc.)
