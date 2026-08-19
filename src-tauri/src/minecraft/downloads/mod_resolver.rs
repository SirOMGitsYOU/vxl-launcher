use crate::error::Result;
use crate::state::profile_state::{
    self, CustomModInfo, ModLoader, ModSource, NoriskModIdentifier, Profile,
};
use log::{debug, info, warn};
use std::collections::HashMap;
use std::path::PathBuf;
use tauri::command;

// --- Struct for resolved mods ---
#[derive(Debug, Clone)]
pub struct TargetMod {
    // Make fields public so mod_downloader can access them
    pub mod_id: String, // Canonical Key (e.g., "modrinth:AANobbMI")
    pub filename: String,
    pub cache_path: PathBuf,
}

// --- Unified helper function to add a mod to final_mods with all necessary checks ---
async fn try_add_mod_to_final_list(
    canonical_key: String,
    filename: String,
    mod_cache_dir: &PathBuf,
    final_mods: &mut HashMap<String, TargetMod>,
    mod_type_str: &str,
    mod_name: &str,
) -> bool {
    // 1. Check if file exists in cache
    let cache_path = mod_cache_dir.join(&filename);
    if !cache_path.exists() {
        warn!(
            "{} mod '{}' not found in cache at: {:?}. Skipping.",
            mod_type_str, filename, cache_path
        );
        return false;
    }
    
    // 2. Add to final mods
    if final_mods.contains_key(&canonical_key) {
        info!(
            "Overriding pack {} mod with key '{}' with version: {}",
            mod_type_str, canonical_key, filename
        );
    } else {
        info!(
            "Adding {} mod to list: {}",
            mod_type_str, filename
        );
    }
    
    final_mods.insert(
        canonical_key.clone(),
        TargetMod {
            mod_id: canonical_key,
            filename,
            cache_path,
        },
    );
    
    true
}

// --- Helper function to resolve the final list of mods (Focus on Modrinth) ---
// Renamed loader parameter to loader_str for clarity
pub async fn resolve_target_mods(
    profile: &Profile,
    custom_mod_infos: Option<&[CustomModInfo]>,
    minecraft_version: &str,
    loader_str: &str,
    mod_cache_dir: &PathBuf,
) -> Result<Vec<TargetMod>> {
    let mut final_mods: HashMap<String, TargetMod> = HashMap::new(); // Key: Canonical Mod Identifier

    // --- Helper: Get Canonical Key ---
    fn get_canonical_key_profile(source: &ModSource) -> Option<String> {
        match source {
            ModSource::Modrinth { project_id, .. } => Some(format!("modrinth:{}", project_id)),
            ModSource::CurseForge { project_id, .. } => Some(format!("curseforge:{}", project_id)),
            ModSource::Url { url, .. } => Some(format!("url:{}", url)),
            ModSource::Maven { coordinates, .. } => Some(format!("maven:{}", coordinates)),
            _ => None, // Ignore other types
        }
    }

    // 1. Process Pack Mods (Only Modrinth)
    // Removed: No pre-installed modpacks - pack mods skipped entirely

    // 2. Process Profile Mods (Only Modrinth for Overrides)
    info!(
        "Resolving manually added/overridden mods for profile: '{}'",
        profile.name
    );
    for mod_info in &profile.mods {
        if !mod_info.enabled {
            debug!(
                "Skipping disabled profile mod: {}",
                mod_info
                    .display_name
                    .as_deref()
                    .unwrap_or(&mod_info.id.to_string())
            );
            continue;
        }

        // --- Moved Compatibility Checks (Applied to *all* enabled profile mods) ---

        // 1. Game Version Check
        if let Some(mod_gv_list) = &mod_info.game_versions {
            if !mod_gv_list.is_empty() && !mod_gv_list.contains(&minecraft_version.to_string()) {
                debug!(
                    "Skipping profile mod '{}' (intended for MC {:?}) because target version is {}",
                    mod_info
                        .display_name
                        .as_deref()
                        .unwrap_or(&mod_info.id.to_string()),
                    mod_gv_list,
                    minecraft_version
                );
                continue; // Skip if target game version is not in the list
            }
        }

        // 2. Loader Check
        let profile_loader = profile.loader;
        match mod_info.associated_loader {
            Some(mod_loader) => {
                if mod_loader != profile_loader {
                    debug!(
                        "Skipping profile mod '{}' (intended for loader {:?}) because profile loader is {:?}",
                        mod_info.display_name.as_deref().unwrap_or(&mod_info.id.to_string()),
                        mod_loader,
                        profile_loader
                    );
                    continue; // Skip if loader doesn't match
                }
            }
            None => {
                debug!(
                    "Skipping profile mod '{}' because it lacks an associated loader.",
                    mod_info
                        .display_name
                        .as_deref()
                        .unwrap_or(&mod_info.id.to_string())
                );
                continue; // Skip if no loader is associated in profile mod
            }
        }
        // --- End Moved Compatibility Checks ---

        // Compatibility checks passed, now process based on source type
        match &mod_info.source {
            ModSource::Modrinth { project_id, .. } => {
                // Common logic for sources that can override pack mods
                if let Some(canonical_key) = get_canonical_key_profile(&mod_info.source) {
                    match profile_state::get_profile_mod_filename(&mod_info.source) {
                        Ok(filename) => {
                            let mod_id_string = mod_info.id.to_string();
                            let mod_name = mod_info.display_name.as_deref().unwrap_or(&mod_id_string);
                            try_add_mod_to_final_list(
                                canonical_key,
                                filename,
                                mod_cache_dir,
                                &mut final_mods,
                                "profile Modrinth",
                                mod_name,
                            ).await;
                        }
                        Err(e) => {
                            // Error getting filename from profile mod source
                            warn!(
                                "Could not determine filename for profile mod '{}': {}. Skipping.",
                                mod_info
                                    .display_name
                                    .as_deref()
                                    .unwrap_or(&mod_info.id.to_string()),
                                e
                            );
                        }
                    }
                } else {
                    // Log if canonical key fails for expected types
                    warn!(
                        "Could not get canonical key for profile mod: {:?}",
                        mod_info.source
                    );
                }
            }
            ModSource::CurseForge { project_id, .. } => {
                // Common logic for sources that can override pack mods
                if let Some(canonical_key) = get_canonical_key_profile(&mod_info.source) {
                    match profile_state::get_profile_mod_filename(&mod_info.source) {
                        Ok(filename) => {
                            let mod_id_string = mod_info.id.to_string();
                            let mod_name = mod_info.display_name.as_deref().unwrap_or(&mod_id_string);
                            try_add_mod_to_final_list(
                                canonical_key,
                                filename,
                                mod_cache_dir,
                                &mut final_mods,
                                "profile CurseForge",
                                mod_name,
                            ).await;
                        }
                        Err(e) => {
                            // Error getting filename from profile mod source
                            warn!(
                                "Could not determine filename for profile mod '{}': {}. Skipping.",
                                mod_info
                                    .display_name
                                    .as_deref()
                                    .unwrap_or(&mod_info.id.to_string()),
                                e
                            );
                        }
                    }
                } else {
                    // Log if canonical key fails for expected types
                    warn!(
                        "Could not get canonical key for profile mod: {:?}",
                        mod_info.source
                    );
                }
            }
            ModSource::Url { .. } | ModSource::Maven { .. } => {
                // Common logic for sources that can override pack mods
                if let Some(canonical_key) = get_canonical_key_profile(&mod_info.source) {
                    match profile_state::get_profile_mod_filename(&mod_info.source) {
                        Ok(filename) => {
                            let mod_type_str = match &mod_info.source {
                                ModSource::Url { .. } => "profile URL",
                                ModSource::Maven { .. } => "profile Maven",
                                _ => "profile Unknown", // Should not happen here
                            };
                            let mod_id_string = mod_info.id.to_string();
                            let mod_name = mod_info.display_name.as_deref().unwrap_or(&mod_id_string);
                            try_add_mod_to_final_list(
                                canonical_key,
                                filename,
                                mod_cache_dir,
                                &mut final_mods,
                                mod_type_str,
                                mod_name,
                            ).await;
                        }
                        Err(e) => {
                            // Error getting filename from profile mod source
                            warn!(
                                "Could not determine filename for profile mod '{}': {}. Skipping.",
                                mod_info
                                    .display_name
                                    .as_deref()
                                    .unwrap_or(&mod_info.id.to_string()),
                                e
                            );
                        }
                    }
                } else {
                    // Log if canonical key fails for expected types
                    warn!(
                        "Could not get canonical key for profile mod: {:?}",
                        mod_info.source
                    );
                }
            }
            ModSource::Local { .. } | ModSource::Embedded { .. } => {
                // Ignore Local/Embedded mods in the profile.mods list for resolution purposes.
                // These should be handled via custom_mods.
                debug!(
                    "Ignoring profile mod of type {:?} during resolution.",
                    mod_info.source.clone()
                );
            }
        }
    }

    // 3. Process Custom Mods (Add if enabled)
    info!(
        "Resolving custom (local) mods for profile: '{}'",
        profile.name
    );
    if let Some(custom_mods) = custom_mod_infos {
        let mut custom_mods_added = 0;
        for info in custom_mods {
            if info.is_enabled {
                // Create a unique key for the HashMap
                let canonical_key = format!("local:{}", info.filename);

                // Custom mods use direct path, not cache path - no exists() check needed
                let target = TargetMod {
                    mod_id: canonical_key.clone(),
                    filename: info.filename.clone(),
                    cache_path: info.path.clone(), // Use the direct path from custom_mods
                };

                // Use the unique canonical key
                if final_mods.insert(canonical_key.clone(), target).is_none() {
                    debug!(
                        "Adding enabled custom mod to target list: {}",
                        info.filename
                    );
                    custom_mods_added += 1;
                } else {
                    // This should not happen if canonical keys are unique, but log just in case
                    warn!("Custom mod canonical key collision: {}", canonical_key);
                }
            } else {
                debug!("Skipping disabled custom mod: {}", info.filename);
            }
        }
        info!(
            "Added {} enabled custom mods to the target list.",
            custom_mods_added
        );
    } else {
        info!("No custom mod information provided for resolving.");
    }

    let final_target_list: Vec<TargetMod> = final_mods.into_values().collect();
    info!(
        "Resolved {} total target mods for sync (incl. custom & overrides).",
        final_target_list.len()
    );
    debug!("Final target mods for sync: {:?}", final_target_list);
    Ok(final_target_list)
}

