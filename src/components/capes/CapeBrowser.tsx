"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "../ui/buttons/Button";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { useThemeStore } from "../../store/useThemeStore";
import { useVanillaCapeStore } from "../../store/useVanillaCapeStore";
import type { VanillaCape } from "../../types/vanillaCapes";
import { preloadIcons } from "../../lib/icon-utils";
import { toast } from "react-hot-toast";
import { SkinView3DWrapper } from "../common/SkinView3DWrapper";
import { CapePreview2D } from "./CapePreview2D";
import { getSkinUrl } from "../../lib/avatar-utils";



export function CapeBrowser(): JSX.Element {
  const { activeAccount } = useMinecraftAuthStore();
  const { ownedCapes: vanillaCapes, isLoading, error, fetchOwnedCapes, equipCape, refreshData } = useVanillaCapeStore();
  const [showPlayer, setShowPlayer] = useState(true);
  const [showElytra, setShowElytra] = useState(false);
  const [selectedCape, setSelectedCape] = useState<VanillaCape | null>(null);
  const [playerSkin, setPlayerSkin] = useState<string | undefined>(undefined);
  const accentColor = useThemeStore((state) => state.accentColor);
  const hasInitializedRef = useRef(false);

  // Get equipped cape
  const equippedCape = vanillaCapes.find(cape => cape.equipped);

  // Set selected cape to equipped cape on mount
  useEffect(() => {
    if (equippedCape && !selectedCape) {
      setSelectedCape(equippedCape);
    }
  }, [equippedCape, selectedCape]);

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


  useEffect(() => {
    preloadIcons(["solar:add-square-bold-duotone"]);
  }, []);

  // Fetch vanilla capes on mount and when account changes
  useEffect(() => {
    if (activeAccount) {
      fetchOwnedCapes();
      hasInitializedRef.current = true;
    }
  }, [activeAccount, fetchOwnedCapes]);

  // Fetch player skin
  useEffect(() => {
    if (activeAccount) {
      try {
        const skinUrl = getSkinUrl(activeAccount.id);
        console.log('[CapeBrowser] Setting player skin URL:', skinUrl);
        setPlayerSkin(skinUrl);
      } catch (error) {
        console.error('Failed to fetch player skin:', error);
        setPlayerSkin(undefined);
      }
    }
  }, [activeAccount]);

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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-3xl font-minecraft text-white">Vanilla Capes</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-white/70 font-minecraft text-xl">
              <input
                type="checkbox"
                checked={showPlayer}
                onChange={(e) => setShowPlayer(e.target.checked)}
                className="w-4 h-4"
              />
              Show Player
            </label>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-white/70 font-minecraft text-xl">
              <input
                type="checkbox"
                checked={showElytra}
                onChange={(e) => setShowElytra(e.target.checked)}
                className="w-4 h-4"
              />
              Show Elytra
            </label>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            size="sm"
          >
            <Icon icon="solar:refresh-bold" className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        {/* Left Side - Player Preview */}
        <div className="w-1/3 bg-black/30 rounded-lg overflow-hidden border border-white/10 flex flex-col">
          {/* 3D Preview */}
          <div className="flex-1 bg-black/50 relative flex items-center justify-center">
            {selectedCape ? (
              <div className="w-full h-full relative">
                <SkinView3DWrapper
                  skinUrl={playerSkin}
                  capeUrl={selectedCape.id === "no-cape" ? undefined : selectedCape.url}
                  enableAutoRotate={true}
                  autoRotateSpeed={0.3}
                  displayAsElytra={showElytra}
                  zoom={0.9}
                  enableRotate={true}
                  enableZoom={false}
                  enablePan={false}
                  horizontalRotationOnly={true}
                />
              </div>
            ) : (
              <div className="text-center">
                <Icon icon="solar:cape-bold" className="w-16 h-16 text-white/30 mx-auto mb-2" />
                <p className="font-minecraft text-white/70">Select a cape to preview</p>
              </div>
            )}
          </div>

          {/* Cape Info and Equip Button */}
          <div className="p-4 border-t border-white/10 bg-black/20">
            <h3 className="text-xl font-minecraft text-white mb-3 lowercase">
              {selectedCape?.name || 'No Cape Selected'}
            </h3>

            {selectedCape && selectedCape.id !== "no-cape" && (
              <Button
                onClick={() => handleEquipCape(selectedCape)}
                disabled={isLoading || selectedCape.equipped}
                size="md"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Icon icon="solar:refresh-bold" className="w-4 h-4 mr-2 animate-spin" />
                    Equipping...
                  </>
                ) : selectedCape.equipped ? (
                  'Currently Equipped'
                ) : (
                  'Equip This Cape'
                )}
              </Button>
            )}

            {selectedCape && selectedCape.id === "no-cape" && (
              <Button
                onClick={() => handleEquipCape(selectedCape)}
                disabled={isLoading || !equippedCape}
                size="md"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Icon icon="solar:refresh-bold" className="w-4 h-4 mr-2 animate-spin" />
                    Removing...
                  </>
                ) : !equippedCape ? (
                  'No Cape Equipped'
                ) : (
                  'Remove Cape'
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Right Side - Cape Grid */}
        <div className="w-2/3 overflow-hidden flex flex-col">
          {/* Error state */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
              <p className="text-red-300 font-minecraft text-sm">{error}</p>
            </div>
          )}

          {/* Cape Grid */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Icon icon="solar:refresh-bold" className="w-8 h-8 animate-spin text-white/50 mx-auto mb-2" />
                  <p className="text-white/70 font-minecraft">Loading capes...</p>
                </div>
              </div>
            ) : filteredCapes.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Icon icon="solar:sad-bold" className="w-12 h-12 text-white/30 mx-auto mb-2" />
                  <p className="text-white/70 font-minecraft">No capes found</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                {filteredCapes.map((cape) => (
                  <div
                    key={cape.id}
                    onClick={() => handleSelectCape(cape)}
                    className={`p-3 rounded-lg cursor-pointer transition-all border-2 ${
                      selectedCape?.id === cape.id
                        ? `border-[${accentColor.value}] bg-black/40`
                        : 'border-white/10 hover:border-white/20 bg-black/20 hover:bg-black/30'
                    }`}
                    style={{
                      borderColor: selectedCape?.id === cape.id ? accentColor.value : undefined,
                    }}
                  >
                    <div className="aspect-square rounded mb-2 overflow-hidden bg-black/40 flex items-center justify-center">
                      <CapePreview2D
                        capeUrl={cape.url}
                        playerUuid={activeAccount?.id}
                        className="w-full h-full"
                      />
                    </div>
                    <h4 className="text-2xl font-minecraft text-white text-center lowercase break-words line-clamp-2 leading-none">
                      {cape.name}
                    </h4>
                    {cape.equipped && (
                      <div className="mt-1 text-center">
                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded font-minecraft">
                          ✓
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
