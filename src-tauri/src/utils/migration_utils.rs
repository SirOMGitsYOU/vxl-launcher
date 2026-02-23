use crate::state::profile_state::{Profile, validate_profile_consistency, attempt_profile_recovery};
use log::{info, warn};
use std::collections::HashMap;
use uuid::Uuid;

/// Performs profile migrations during startup.
/// Currently handles:
/// - Recovery of corrupted Hytale profiles due to game_type defaulting
pub fn migrate_profiles(profiles: &mut HashMap<Uuid, Profile>) -> usize {
    let mut migration_count = 0;
    
    // Check for corrupted profiles and attempt recovery
    let mut corrupted_ids = Vec::new();
    
    for (id, profile) in profiles.iter() {
        if validate_profile_consistency(profile) {
            warn!("Migration: Found corrupted profile '{}' (ID: {})", profile.name, id);
            corrupted_ids.push(*id);
        }
    }
    
    // Attempt to recover corrupted profiles
    for corrupted_id in corrupted_ids {
        if let Some(corrupted_profile) = profiles.get(&corrupted_id) {
            if let Some(recovered_profile) = attempt_profile_recovery(corrupted_profile) {
                info!("Migration: Successfully recovered profile '{}' as {}", corrupted_profile.name, recovered_profile.game_type);
                profiles.insert(corrupted_id, recovered_profile);
                migration_count += 1;
            } else {
                warn!("Migration: Failed to recover profile '{}', removing it", corrupted_profile.name);
                profiles.remove(&corrupted_id);
                migration_count += 1; // Count as migration even though it's removal
            }
        }
    }
    
    if migration_count > 0 {
        info!("ProfileManager: Completed profile migrations. Total changes: {}", migration_count);
    }
    
    migration_count
}