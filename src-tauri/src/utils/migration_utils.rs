use crate::state::profile_state::Profile;
use log::{info, warn};
use std::collections::HashMap;
use uuid::Uuid;

/// Performs profile migrations during startup.
/// Currently handles:
/// - Removed: No pre-installed modpacks
pub fn migrate_profiles(profiles: &mut HashMap<Uuid, Profile>) -> usize {
    let mut migration_count = 0;
    
    // All migrations related to norisk packs removed - no pre-installed modpacks
    
    if migration_count > 0 {
        info!("ProfileManager: Completed profile migrations. Total changes: {}", migration_count);
    }
    
    migration_count
}