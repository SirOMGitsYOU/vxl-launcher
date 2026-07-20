"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProfileStore } from "../../store/profile-store";
import { LoadingState } from "../ui/LoadingState";
import { EmptyState } from "../ui/EmptyState";
import { ProfileDetailViewV2 } from "./ProfileDetailViewV2";
import type { Profile } from "../../types/profile";
import { useProfileSettingsStore } from "../../store/profile-settings-store";

export function ProfileDetailViewV2Wrapper() {
  const { profileId } = useParams<{ profileId: string }>();
  const navigate = useNavigate();
  const { profiles, loading, fetchProfiles, profilesLoaded, getProfile } = useProfileStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Only fetch profiles once on initial mount if not already loaded
  useEffect(() => {
    if (!profilesLoaded && !loading) {
      void fetchProfiles();
    }
  }, [profilesLoaded, loading, fetchProfiles]);

  useEffect(() => {
    if (!profileId) {
      setProfile(null);
      return;
    }

    const foundProfile = profiles.find((p) => p.id === profileId);
    if (foundProfile) {
      setProfile(foundProfile);
      return;
    }

    if (!profilesLoaded || loading) {
      return;
    }

    let cancelled = false;
    setProfileLoading(true);

    void getProfile(profileId)
      .then((loadedProfile) => {
        if (!cancelled) {
          setProfile(loadedProfile);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfile(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setProfileLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profileId, profiles, profilesLoaded, loading, getProfile]);

  const { openModal } = useProfileSettingsStore();

  const handleClose = () => {
    navigate("/profiles");
  };

  const handleEdit = () => {
    if (profile) {
      openModal(profile);
    }
  };

  if (loading || profileLoading) {
    return <LoadingState message="Loading profile..." />;
  }

  if (!profileId) {
    return (
      <EmptyState
        icon="solar:danger-triangle-bold"
        message="No profile ID provided"
      />
    );
  }

  if (!profile) {
    return (
      <EmptyState
        icon="solar:widget-bold"
        message="Profile not found"
      />
    );
  }

  return (
    <ProfileDetailViewV2
      profile={profile}
      onClose={handleClose}
      onEdit={handleEdit}
    />
  );
}
