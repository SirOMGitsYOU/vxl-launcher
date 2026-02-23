use std::path::PathBuf;

#[cfg(target_os = "windows")]
use winreg::RegKey;

/// Detect Hytale installation paths from Windows registry
/// Returns (launcher_path, mods_path) if found
#[tauri::command]
pub fn detect_hytale_paths() -> Result<(Option<String>, Option<String>), String> {
    #[cfg(target_os = "windows")]
    {
        detect_hytale_paths_windows()
    }

    #[cfg(not(target_os = "windows"))]
    {
        // No auto-detection on macOS and Linux
        Ok((None, None))
    }
}

#[cfg(target_os = "windows")]
fn detect_hytale_paths_windows() -> Result<(Option<String>, Option<String>), String> {
    let mut launcher_path: Option<String> = None;
    let mut mods_path: Option<String> = None;

    // Try to get launcher path from HKEY_LOCAL_MACHINE
    if let Ok(hklm) = RegKey::predef(winreg::enums::HKEY_LOCAL_MACHINE).open_subkey(
        r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Hypixel StudiosHytale Launcher",
    ) {
        if let Ok(display_icon) = hklm.get_value::<String, _>("DisplayIcon") {
            // DisplayIcon contains the path to hytale-launcher.exe
            launcher_path = Some(display_icon);
        }
    }

    // Try to get Hytale client path from HKEY_CURRENT_USER
    if let Ok(hkcu) = RegKey::predef(winreg::enums::HKEY_CURRENT_USER).open_subkey(
        r"System\GameConfigStore\Children\bb7159f5-cda6-484b-a8ba-21da64de993e",
    ) {
        if let Ok(matched_exe) = hkcu.get_value::<String, _>("MatchedExeFullPath") {
            // Extract the Hytale directory (everything before \install)
            let lower_exe = matched_exe.to_lowercase();
            if let Some(install_pos) = lower_exe.find("\\install") {
                let hytale_dir = &matched_exe[..install_pos];
                mods_path = Some(format!("{}\\UserData\\mods", hytale_dir));
            }
        }
    }

    Ok((launcher_path, mods_path))
}
