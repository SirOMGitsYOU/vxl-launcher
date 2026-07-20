"use client";

import { useNavigate } from "react-router-dom";
import { useProfileWizardStore } from "../../store/profile-wizard-store";
import { ProfileWizardV2 } from "../profiles/wizard-v2/ProfileWizardV2";
import { useProfileStore } from "../../store/profile-store";
import type { Profile } from "../../types/profile";

export function ProfileWizardV2Modal() {
  const navigate = useNavigate();
  const { isModalOpen, defaultGroup, closeModal } = useProfileWizardStore();
  const { fetchProfiles } = useProfileStore();

  if (!isModalOpen) {
    return null;
  }

  const handleSave = async (profile: Profile) => {
    await fetchProfiles(true);

    if (profile?.id) {
      navigate(`/profiles/${profile.id}`);
    }

    closeModal();
  };

  return (
    <ProfileWizardV2
      onClose={closeModal}
      onSave={handleSave}
      defaultGroup={defaultGroup}
    />
  );
}
