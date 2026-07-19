"use client";

import { Icon } from "@iconify/react";
import { Modal } from "../ui/Modal";
import { CreditsContent } from "./CreditsContent";

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreditsModal({ isOpen, onClose }: CreditsModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      title="Credits"
      titleIcon={<Icon icon="solar:code-bold" className="h-5 w-5" />}
      onClose={onClose}
      width="md"
    >
      <div className="px-6 py-5">
        <CreditsContent />
      </div>
    </Modal>
  );
}
