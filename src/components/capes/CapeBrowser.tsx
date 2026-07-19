"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Icon } from "@iconify/react";
import { Button } from "../ui-v2";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { useVanillaCapeStore } from "../../store/useVanillaCapeStore";
import type { VanillaCape } from "../../types/vanillaCapes";
import { preloadIcons } from "../../lib/icon-utils";
import { toast } from "react-hot-toast";
import { SkinView3DWrapper } from "../common/SkinView3DWrapper";
import { CapePreview2D } from "./CapePreview2D";
import { useLivePlayerSkin, parseLiveSkinFromProfile } from "../../hooks/useLivePlayerSkin";
import { getCachedCapeTexturePath } from "../../services/vanilla-cape-service";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { BrowseDetailLayout } from "../layout/BrowseDetailLayout";
import { DetailPanelBody, DetailPanelHero, DetailPanelActions } from "../layout/DetailPanel";
import { useShellSearchTab } from "../../hooks/useShellSearchTab";
import { useShellSearch } from "../../contexts/ShellSearchContext";

export function CapeBrowser(): JSX.Element {
  const { activeAccount } = useMinecraftAuthStore();
  const { ownedCapes: vanillaCapes, isLoading, error, fetchOwnedCapes, equipCape, refreshData, clearData } = useVanillaCapeStore();
  const [showPlayer, setShowPlayer] = useState(true);
  const [showElytra, setShowElytra] = useState(false);
  const [selectedCape, setSelectedCape] = useState<VanillaCape | null>(null);
  const { query: searchQuery } = useShellSearch();
  useShellSearchTab("Search capes...");
  const { skinUrl: playerSkin, variant: playerSkinVariant } = useLivePlayerSkin(activeAccount);
  const [cachedSelectedCapeUrl, setCachedSelectedCapeUrl] = useState<string | undefined>(undefined);
  const activeAccountId = activeAccount?.id;

  // Get equipped cape
  const equippedCape = vanillaCapes.find(cape => cape.equipped);

  useEffect(() => {
    if (equippedCape) {
      setSelectedCape(equippedCape);
    }
  }, [equippedCape, activeAccountId]);

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

  // Fetch vanilla capes on mount and when account changes
  useEffect(() => {
    if (!activeAccountId) {
      clearData();
      setSelectedCape(null);
      return;
    }

    clearData();
    setSelectedCape(null);
    fetchOwnedCapes({ force: true });
  }, [activeAccountId, clearData, fetchOwnedCapes]);

  useEffect(() => {
    if (!selectedCape || selectedCape.id === "no-cape" || !(selectedCape.url ?? "").trim()) {
      setCachedSelectedCapeUrl(undefined);
      return;
    }

    let cancelled = false;

    const resolveCachedCapeUrl = async () => {
      try {
        const localPath = await getCachedCapeTexturePath(selectedCape.id, selectedCape.url);
        if (!cancelled) {
          setCachedSelectedCapeUrl(convertFileSrc(localPath));
        }
      } catch (error) {
        console.warn("[CapeBrowser] Failed to resolve cached cape texture, using remote URL:", error);
        if (!cancelled) {
          setCachedSelectedCapeUrl(selectedCape.url);
        }
      }
    };

    resolveCachedCapeUrl();

    return () => {
      cancelled = true;
    };
  }, [selectedCape]);

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
    try {
      await refreshData();
      toast.success("Capes refreshed!");
    } catch (error) {
      console.error("Error refreshing capes:", error);
      toast.error("Failed to refresh capes");
    }
  }, [refreshData]);

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
      detailEmpty={!selectedCape}
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
              <div
                key={cape.id}
                onClick={() => handleSelectCape(cape)}
                className={`p-3 rounded-xl cursor-pointer transition-all border ${
                  selectedCape?.id === cape.id
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
              </div>
            ))}
          </div>
        )
      }
      detailContent={
        selectedCape ? (
          <>
            <DetailPanelHero className="flex-1 min-h-64">
              <div className="w-full h-full min-h-64 flex items-center justify-center bg-[var(--surface-base)]">
                <SkinView3DWrapper
                  skinUrl={showPlayer ? playerSkin : null}
                  skinVariant={playerSkinVariant}
                  capeUrl={
                    selectedCape.id === "no-cape"
                      ? undefined
                      : cachedSelectedCapeUrl ?? selectedCape.url
                  }
                  enableAutoRotate
                  autoRotateSpeed={0.3}
                  displayAsElytra={showElytra}
                  zoom={0.9}
                  enableRotate
                  enableZoom={false}
                  enablePan={false}
                  horizontalRotationOnly
                />
              </div>
            </DetailPanelHero>
            <DetailPanelBody>
              <div>
                <h3 className="text-lg font-semibold text-white">{selectedCape.name}</h3>
                {selectedCape.description && (
                  <p className="text-sm text-[var(--text-secondary)] mt-2">{selectedCape.description}</p>
                )}
              </div>
            </DetailPanelBody>
            <DetailPanelActions>
              {selectedCape.id !== "no-cape" ? (
                <Button
                  onClick={() => handleEquipCape(selectedCape)}
                  disabled={isLoading || selectedCape.equipped}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Icon icon="solar:refresh-bold" className="w-4 h-4 animate-spin" />
                      Equipping...
                    </>
                  ) : selectedCape.equipped ? (
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
                  onClick={() => handleEquipCape(selectedCape)}
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
