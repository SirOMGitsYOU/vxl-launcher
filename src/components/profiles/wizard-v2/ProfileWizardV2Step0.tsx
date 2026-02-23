"use client";

import { Icon } from "@iconify/react";
import { Modal } from "../../ui/Modal";
import { Button } from "../../ui/buttons/Button";
import { useThemeStore } from "../../../store/useThemeStore";
import { Card } from "../../ui/Card";

interface ProfileWizardV2Step0Props {
  onClose: () => void;
  onSelectGame: (gameType: "minecraft" | "hytale") => void;
}

export function ProfileWizardV2Step0({ onClose, onSelectGame }: ProfileWizardV2Step0Props) {
  const accentColor = useThemeStore((state) => state.accentColor);

  const games = [
    {
      id: "minecraft",
      name: "Minecraft",
      description: "Create a Minecraft profile with modloaders (Fabric, Forge, etc.)",
      icon: "game-icons:minecraft",
      color: "#2d5016"
    },
    {
      id: "hytale",
      name: "Hytale",
      description: "Create a Hytale profile with launcher configuration",
      icon: "game-icons:hytale",
      color: "#1a3a52"
    }
  ];

  const renderFooter = () => (
    <div className="flex justify-end gap-3">
      <Button
        variant="ghost"
        onClick={onClose}
        size="md"
        className="min-w-[120px] text-xl"
      >
        cancel
      </Button>
    </div>
  );

  return (
    <Modal
      title="create profile - select game"
      onClose={onClose}
      width="md"
      footer={renderFooter()}
    >
      <div className="min-h-[400px] p-6">
        <div className="grid grid-cols-1 gap-4">
          {games.map((game) => (
            <div
              key={game.id}
              className="p-6 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg border-2 rounded-lg"
              style={{
                backgroundColor: `${game.color}20`,
                borderColor: accentColor.value
              }}
              onClick={() => onSelectGame(game.id as "minecraft" | "hytale")}
            >
              <div className="flex items-center gap-4">
                <Icon icon={game.icon} className="w-16 h-16" style={{ color: game.color }} />
                <div className="flex-1">
                  <h3 className="text-2xl font-minecraft text-white lowercase mb-1">
                    {game.name}
                  </h3>
                  <p className="text-sm text-white/70 font-minecraft-ten">
                    {game.description}
                  </p>
                </div>
                <Icon icon="solar:arrow-right-bold" className="w-6 h-6 text-white/50" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
