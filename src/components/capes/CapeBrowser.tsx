"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "../ui-v2";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { useVanillaCapeStore } from "../../store/useVanillaCapeStore";
import type { VanillaCape } from "../../types/vanillaCapes";
import { preloadIcons } from "../../lib/icon-utils";
import { toast } from "react-hot-toast";
import { VxlSkinPreview } from "../common/VxlSkinPreview";
import { DEFAULT_RENDER_PROFILE } from "vxl-skin-renderer/core";
import { CapePreview2D } from "./CapePreview2D";
import { useLivePlayerSkin } from "../../hooks/useLivePlayerSkin";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { BrowseDetailLayout } from "../layout/BrowseDetailLayout";
import { DetailPanelBody, DetailPanelHero, DetailPanelActions } from "../layout/DetailPanel";
import { useShellSearchTab } from "../../hooks/useShellSearchTab";
import { useShellSearch } from "../../contexts/ShellSearchContext";

/** 180° from the default skins preview yaw so the cape faces the camera. */
const CAPE_PLAYER_PREVIEW_ROTATION =
  DEFAULT_RENDER_PROFILE.rig.restYaw + Math.PI;

export function CapeBrowser(): JSX.Element {
  const { activeAccount } = useMinecraftAuthStore();
  const { ownedCapes: vanillaCapes, isLoading, error, fetchOwnedCapes, equipCape, refreshData, clearData } = useVanillaCapeStore();
  const [showPlayer, setShowPlayer] = useState(true);
  const [showElytra, setShowElytra] = useState(false);
  const [selectedCape, setSelectedCape] = useState<VanillaCape | null>(null);
  const { query: searchQuery } = useShellSearch();
  useShellSearchTab("Search capes...");
  const { skinUrl: playerSkin, variant: playerSkinVariant, isLoading: isPlayerSkinLoading } = useLivePlayerSkin(activeAccount);
  const activeAccountId = activeAccount?.id;

  const canShowPlayerSkin = Boolean(playerSkin) && !isPlayerSkinLoading;

  const equippedCape = vanillaCapes.find((cape) => cape.equipped);

  const activeSelection = useMemo((): VanillaCape | null => {
    if (selectedCape) return selectedCape;
    if (equippedCape) return equippedCape;
    if (isLoading) return null;
    return {
      id: "no-cape",
      name: "No Cape",
      description: "Remove your equipped cape",
      url: "",
      equipped: !equippedCape,
      category: "special",
      active: !equippedCape,
    };
  }, [selectedCape, equippedCape, isLoading]);

  const previewCape = useMemo(() => {
    if (!activeSelection || activeSelection.id === "no-cape") return null;
    if (!(activeSelection.url ?? "").trim()) return null;
    return {
      texture: activeSelection.url,
      elytra: showElytra,
    };
  }, [activeSelection?.id, activeSelection?.url, showElytra]);

  useEffect(() => {
    if (!equippedCape) return;
    setSelectedCape(equippedCape);
  }, [equippedCape?.id, activeAccountId]);

  // Add "No Cape" option at the beginning of capes list
  const filteredCapes = useMemo(() => {
    const hasEquippedCape = vanillaCapes.some(cape => cape.equipped);
    const noCapeOption: VanillaCape = {
      id: "no-cape",
      name: "No Cape",
      description: "Remove your equipped cape",
      url: "",
      equipped: !hasEquippedCape,
      category: "special",
      active: !hasEquippedCape,
    };

    return [noCapeOption, ...vanillaCapes];
  }, [vanillaCapes]);

  const visibleCapes = useMemo(() => {
    const normalizedSearch = (searchQuery ?? "").trim().toLowerCase();
    if (!normalizedSearch) return filteredCapes;
    return filteredCapes.filter((cape) =>
      (cape.name ?? "").toLowerCase().includes(normalizedSearch),
    );
  }, [filteredCapes, searchQuery]);


  useEffect(() => {
    preloadIcons(["solar:add-square-bold-duotone"]);
  }, []);

  // First open per session (or account change) pulls the cape list from Mojang.
  // Revisiting the tab reuses the in-memory session cache; refresh forces a new pull.
  useEffect(() => {
    if (!activeAccountId) {
      clearData();
      setSelectedCape(null);
      return;
    }

    fetchOwnedCapes({ accountId: activeAccountId });
  }, [activeAccountId, clearData, fetchOwnedCapes]);

  const handleSelectCape = useCallback((cape: VanillaCape) => {
    setSelectedCape(cape);
  }, []);

  const handleEquipCape = useCallback(async (cape: VanillaCape) => {
    try {
      const actualCapeId = cape.id === "no-cape" ? null : cape.id;
      await equipCape(actualCapeId);
      toast.success("Cape equipped successfully!");
    } catch (error) {
      console.error("Error equipping cape:", error);
      toast.error(`Failed to equip cape: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, [equipCape]);

  const handleRefresh = useCallback(async () => {
    if (!activeAccountId) return;
    try {
      await refreshData(activeAccountId);
      toast.success("Capes refreshed!");
    } catch (error) {
      console.error("Error refreshing capes:", error);
      toast.error("Failed to refresh capes");
    }
  }, [activeAccountId, refreshData]);

  return (
    <BrowseDetailLayout
      title="Capes"
      subtitle="Browse and manage your character capes"
      icon="game-icons:cape"
      toolbarExtra={
        <div className="flex items-center gap-3">
          <ToggleSwitch checked={showPlayer} onChange={setShowPlayer} label="Show Player" size="sm" />
          <ToggleSwitch checked={showElytra} onChange={setShowElytra} label="Show Elytra" size="sm" />
          <Button onClick={handleRefresh} disabled={isLoading} size="sm" variant="ghost">
            <Icon icon="solar:refresh-bold" className="w-4 h-4" />
          </Button>
        </div>
      }
      detailEmpty={!activeSelection}
      browseContent={
        error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full min-h-[240px] text-[var(--text-secondary)]">
            <Icon icon="solar:refresh-bold" className="w-6 h-6 animate-spin mr-2" />
            Loading capes...
          </div>
        ) : visibleCapes.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[240px] text-[var(--text-secondary)]">
            No capes found
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            {visibleCapes.map((cape) => (
              <button
                type="button"
                key={cape.id}
                onClick={() => handleSelectCape(cape)}
                aria-pressed={activeSelection?.id === cape.id}
                className={`p-3 rounded-xl cursor-pointer transition-all border text-left ${
                  activeSelection?.id === cape.id
                    ? "border-[var(--accent)] bg-[rgba(var(--accent-rgb),0.06)] vxl-accent-glow"
                    : "border-[var(--surface-border)] bg-[var(--surface-overlay)] hover:border-[var(--surface-border-strong)]"
                }`}
              >
                <div className="aspect-square rounded-lg mb-2 overflow-hidden flex items-center justify-center bg-[var(--surface-base)]">
                  <CapePreview2D
                    capeId={cape.id}
                    capeUrl={cape.url}
                    playerUuid={activeAccount?.id}
                    className="w-full h-full"
                  />
                </div>
                <h4 className="text-sm font-medium text-white text-center truncate">{cape.name}</h4>
                {cape.equipped && (
                  <div className="mt-1 text-center">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(var(--accent-rgb),0.15)] text-[var(--accent)]">
                      Equipped
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )
      }
      detailContent={
        activeSelection ? (
          <>
            <DetailPanelHero className="flex-1 min-h-64">
              <div className="w-full h-full min-h-64 flex items-center justify-center bg-[var(--surface-base)]">
                {showPlayer && !canShowPlayerSkin ? (
                  <Icon
                    icon="solar:refresh-bold"
                    className="w-6 h-6 animate-spin text-[var(--text-secondary)]"
                  />
                ) : (
                  <VxlSkinPreview
                    key={
                      showPlayer
                        ? `capes-player-${activeAccountId ?? "none"}`
                        : `cape-only-${showElytra ? "elytra" : "cape"}`
                    }
                    textureUrl={showPlayer ? (playerSkin ?? null) : "/skins/steve.png"}
                    variant={showPlayer ? playerSkinVariant : "slim"}
                    cape={previewCape}
                    rotation={CAPE_PLAYER_PREVIEW_ROTATION}
                    zoom={1.6}
                    style={{ width: "100%", height: "100%", minHeight: "16rem" }}
                  />
                )}
              </div>
            </DetailPanelHero>
            <DetailPanelBody>
              <div>
                <h3 className="text-lg font-semibold text-white">{activeSelection.name}</h3>
                {activeSelection.description && (
                  <p className="text-sm text-[var(--text-secondary)] mt-2">{activeSelection.description}</p>
                )}
              </div>
            </DetailPanelBody>
            <DetailPanelActions>
              {activeSelection.id !== "no-cape" ? (
                <Button
                  onClick={() => handleEquipCape(activeSelection)}
                  disabled={isLoading || activeSelection.equipped}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Icon icon="solar:refresh-bold" className="w-4 h-4 animate-spin" />
                      Equipping...
                    </>
                  ) : activeSelection.equipped ? (
                    "Currently Equipped"
                  ) : (
                    <>
                      <Icon icon="solar:play-bold" className="w-4 h-4" />
                      Equip Cape
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => handleEquipCape(activeSelection)}
                  disabled={isLoading || !equippedCape}
                  className="flex-1"
                  variant="secondary"
                >
                  {isLoading ? "Removing..." : !equippedCape ? "No Cape Equipped" : "Remove Cape"}
                </Button>
              )}
            </DetailPanelActions>
          </>
        ) : undefined
      }
    />
  );
}
