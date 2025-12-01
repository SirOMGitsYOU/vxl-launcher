"use client";

import type React from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MinecraftProfile, TexturesData } from "../../types/minecraft";
import type {
  GetStarlightSkinRenderPayload,
  MinecraftSkin,
  SkinVariant,
} from "../../types/localSkin";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { MinecraftSkinService } from "../../services/minecraft-skin-service";
import { Button } from "../ui/buttons/Button";
import { IconButton } from "../ui/buttons/IconButton";
import { Icon } from "@iconify/react";
import { StatusMessage } from "../ui/StatusMessage";
import { SkinViewer } from "../launcher/SkinViewer";
import { useDebounce } from "../../hooks/useDebounce";
import { useThemeStore } from "../../store/useThemeStore";
import { useSkinStore } from "../../store/useSkinStore";
import { toast } from "react-hot-toast";
import { convertFileSrc } from "@tauri-apps/api/core";
import { SearchWithFilters } from "../ui/SearchWithFilters";
import { useGlobalModal } from "../../hooks/useGlobalModal";
import { AddSkinModal } from "../modals/AddSkinModal";
import { SkinView3DWrapper } from "../common/SkinView3DWrapper";
import { cn } from "../../lib/utils";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// SkinPreview component for grid items
const SkinPreview = memo(({ 
  skin, 
  renderType = 'dungeons',
  width = 140, 
  height = 140,
  className 
}: { 
  skin: MinecraftSkin;
  renderType?: string;
  width?: number; 
  height?: number; 
  className?: string;
}) => {
  const [renderUrl, setRenderUrl] = useState<string>("");
  const [isRenderLoading, setIsRenderLoading] = useState<boolean>(true);
  const [canShowSpinner, setCanShowSpinner] = useState<boolean>(false);
  const spinnerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsRenderLoading(true);
    setRenderUrl("");
    setCanShowSpinner(false);

    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current);
    }

    spinnerTimeoutRef.current = setTimeout(() => {
      if (isMounted && isRenderLoading) {
        setCanShowSpinner(true);
      }
    }, 500);

    const fetchRender = async () => {
      if (skin && skin.name) {
        try {
          const payload: GetStarlightSkinRenderPayload = {
            player_name: skin.name.replace(/[^a-zA-Z0-9_]/g, '_') || 'skin',
            render_type: renderType as any,
            render_view: 'full',
            base64_skin_data: skin.base64_data,
          };
          
          const localPath = await MinecraftSkinService.getStarlightSkinRender(payload);
          
          if (isMounted) {
            if (localPath) {
              setRenderUrl(convertFileSrc(localPath));
            } else {
              console.warn(`[SkinPreview] Starlight render returned empty path for ${skin.name}.`);
              setRenderUrl("");
            }
            setIsRenderLoading(false);
            setCanShowSpinner(false);
            if (spinnerTimeoutRef.current)
              clearTimeout(spinnerTimeoutRef.current);
          }
        } catch (error) {
          console.error(`[SkinPreview] Failed to fetch skin render for ${skin.name}:`, error);
          
          if (isMounted) {
            setRenderUrl("");
            setIsRenderLoading(false);
            setCanShowSpinner(false);
            if (spinnerTimeoutRef.current)
              clearTimeout(spinnerTimeoutRef.current);
          }
        }
      } else {
        if (isMounted) {
          console.warn(`[SkinPreview] No skin.name provided, cannot fetch skin render.`);
          setRenderUrl("");
          setIsRenderLoading(false);
          setCanShowSpinner(false);
          if (spinnerTimeoutRef.current)
            clearTimeout(spinnerTimeoutRef.current);
        }
      }
    };

    fetchRender();

    return () => {
      isMounted = false;
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
      }
    };
  }, [skin?.name, skin?.base64_data, renderType]);

  return (
    <div className={`relative ${className}`}>
      {isRenderLoading && canShowSpinner ? (
        <div className="flex flex-col items-center justify-center space-y-2 w-full h-full">
          <div className="w-6 h-6 border-4 border-t-transparent border-[var(--accent)] rounded-full animate-spin"></div>
          <p className="font-minecraft text-xs text-white/70 lowercase">Loading...</p>
        </div>
      ) : !isRenderLoading ? (
        <SkinViewer
          skinUrl={renderUrl || ""}
          width={width}
          height={height}
          className="w-full h-full"
        />
      ) : null}
    </div>
  );
});

// SortableSkinCard component for drag and drop
const SortableSkinCard = ({ skin, selectedLocalSkin, accentColor, loading, onSelectSkin, onEditSkin, onDeleteSkin }: {
  skin: MinecraftSkin;
  selectedLocalSkin: MinecraftSkin | null;
  accentColor: any;
  loading: boolean;
  onSelectSkin: (skin: MinecraftSkin) => void;
  onEditSkin: (skin: MinecraftSkin, event: React.MouseEvent) => void;
  onDeleteSkin: (id: string, name: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: skin.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    scale: isDragging ? 1.02 : 1,
    zIndex: isDragging ? 1000 : 1,
    boxShadow: isDragging ? '0 10px 30px rgba(0,0,0,0.3)' : 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group p-3 rounded-lg cursor-pointer transition-all border-2 ${
        selectedLocalSkin?.id === skin.id
          ? `border-[${accentColor.value}] bg-black/40`
          : 'border-white/10 hover:border-white/20 bg-black/20 hover:bg-black/30'
      }`}
      onClick={() => onSelectSkin(skin)}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-move"
      >
        <div className="w-8 h-8 flex items-center justify-center bg-black/30 hover:bg-black/50 text-white/70 hover:text-white border border-white/10 hover:border-white/20 rounded transition-all duration-200">
          <Icon icon="radix-icons:drag-handle-dots-2" className="w-4 h-4" />
        </div>
      </div>

      {/* Hover edit/delete buttons */}
      <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col gap-1">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDeleteSkin(skin.id, skin.name);
          }}
          className="w-8 h-8 flex items-center justify-center bg-black/30 hover:bg-red-700/80 text-white/70 hover:text-white border border-white/10 hover:border-white/20 rounded transition-all duration-200"
          title="Delete skin"
          disabled={loading}
        >
          <Icon icon="solar:trash-bin-trash-bold" className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEditSkin(skin, e);
          }}
          className="w-8 h-8 flex items-center justify-center bg-black/30 hover:bg-black/50 text-white/70 hover:text-white border border-white/10 hover:border-white/20 rounded transition-all duration-200"
          title="Edit skin properties"
          disabled={loading}
        >
          <Icon icon="solar:pen-bold" className="w-4 h-4" />
        </button>
      </div>

      <div className="aspect-square rounded mb-2 overflow-hidden flex items-center justify-center">
        <SkinPreview
          skin={skin}
          renderType="dungeons"
          width={160}
          height={160}
          className="w-full h-full"
        />
      </div>

      <div className="text-center">
        <h3 className="text-2xl font-minecraft text-white text-med lowercase truncate">
          {skin.name}
        </h3>
        <div className="mt-1">
          <span className="px-2 py-1 text-lg font-minecraft rounded bg-white/20 text-white border border-white/30">
            {skin.variant === "slim" ? "SLIM" : "CLASSIC"}
          </span>
        </div>
      </div>
    </div>
  );
};

export function SkinsTab() {
  const {
    activeAccount,
    isLoading: accountLoading,
    error: accountError,
    initializeAccounts,
  } = useMinecraftAuthStore();
  const { showModal, hideModal } = useGlobalModal();
  const { selectedSkinId, setSelectedSkinId } = useSkinStore();
  const [skinData, setSkinData] = useState<MinecraftProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [localSkins, setLocalSkins] = useState<MinecraftSkin[]>([]);
  const [localSkinsLoading, setLocalSkinsLoading] = useState<boolean>(false);
  const [localSkinsError, setLocalSkinsError] = useState<string | null>(null);
  const [selectedLocalSkin, setSelectedLocalSkin] = useState<MinecraftSkin | null>(null);
  const [search, setSearch] = useState<string>("");
  const [currentSkinId, setCurrentSkinId] = useState<string | null>(null);
  const [playerCurrentSkin, setPlayerCurrentSkin] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [delayedActiveId, setDelayedActiveId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<{oldIndex: number, newIndex: number, skin: MinecraftSkin} | null>(null);

  const debouncedSearch = useDebounce(search, 250);
  const accentColor = useThemeStore((state) => state.accentColor);

  const filteredSkins = useMemo(() => {
    if (!debouncedSearch.trim()) return localSkins;
    return localSkins.filter((skin) =>
      skin.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
    );
  }, [localSkins, debouncedSearch]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
    setDelayedActiveId(event.active.id);
    
    // Store initial position
    const oldIndex = localSkins.findIndex((skin) => skin.id === event.active.id);
    const skin = localSkins.find((skin) => skin.id === event.active.id);
    if (skin) {
      setDraggedItem({ oldIndex, newIndex: oldIndex, skin });
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    console.log('Drag end:', { activeId: active.id, overId: over?.id });

    if (draggedItem && draggedItem.oldIndex !== draggedItem.newIndex) {
      console.log('Showing reorder toast');
      
      // Show toast confirmation
      toast.success('Skins reordered successfully');
      
      // TODO: Update skin order in storage when API is available
      // MinecraftSkinService.updateSkinOrder(newSkins);
    } else {
      console.log('No position change, no toast');
    }

    setActiveId(null);
    setDraggedItem(null);
    
    // Remove ghost immediately to prevent animation conflict
    setDelayedActiveId(null);
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      const oldIndex = localSkins.findIndex((skin) => skin.id === active.id);
      const newIndex = localSkins.findIndex((skin) => skin.id === over.id);

      // Only update if position actually changed
      if (oldIndex !== newIndex) {
        const newSkins = [...localSkins];
        const [reorderedSkin] = newSkins.splice(oldIndex, 1);
        newSkins.splice(newIndex, 0, reorderedSkin);

        setLocalSkins(newSkins);
        
        // Update dragged item tracking
        if (draggedItem && draggedItem.skin.id === active.id) {
          setDraggedItem({ ...draggedItem, newIndex });
        }
      }
    }
  };

  const loadSkinData = useCallback(async () => {
    if (!activeAccount) return;

    setLoading(true);

    try {
      const data = await MinecraftSkinService.getUserSkinData(
        activeAccount.id,
        activeAccount.access_token,
      );
      setSkinData(data);

      if (data?.properties) {
        const texturesProp = data.properties.find(
          (prop: { name: string; value: string }) => prop.name === "textures",
        );

        if (texturesProp) {
          try {
            const decodedValue = atob(texturesProp.value);
            const texturesJson = JSON.parse(decodedValue) as TexturesData;
            const skinInfo = texturesJson.textures?.SKIN;

            if (skinInfo?.url) {
              // Extract the actual skin texture URL from Mojang
              setPlayerCurrentSkin(skinInfo.url);
              
              const urlParts = skinInfo.url.split("/");
              const skinIdFromUrl = urlParts[urlParts.length - 1].split(".")[0];
              setCurrentSkinId(skinIdFromUrl);
            }
          } catch (e) {
            console.error("Error parsing skin textures:", e);
            toast.error("Failed to parse skin details.");
          }
        }
      }
    } catch (err) {
      console.error("Error loading skin data:", err);
      toast.error(err instanceof Error ? err.message : String(err.message));
    } finally {
      setLoading(false);
    }
  }, [activeAccount]);

  const loadLocalSkins = useCallback(async () => {
    setLocalSkinsLoading(true);
    setLocalSkinsError(null);

    try {
      const skins = await MinecraftSkinService.getAllSkins();

      setLocalSkins(skins);
      console.log(`Loaded ${skins.length} local skins`);

      if (selectedSkinId) {
        const selectedSkin = skins.find((skin) => skin.id === selectedSkinId);
        if (selectedSkin) {
          setSelectedLocalSkin(selectedSkin);
        }
      }
      setLocalSkinsLoading(false);
    } catch (err) {
      console.error("Error loading local skins:", err);
      setLocalSkinsError(err instanceof Error ? err.message : String(err));
      setLocalSkinsLoading(false);
    }
  }, [selectedSkinId]);

  useEffect(() => {
    if (activeAccount) {
      loadSkinData();
    }

    loadLocalSkins();

    if (!activeAccount && !accountLoading) {
      initializeAccounts();
    }
  }, [
    activeAccount,
    loadSkinData,
    loadLocalSkins,
    initializeAccounts,
    accountLoading,
  ]);

  const startEditSkin = (
    skin: MinecraftSkin | null,
    event?: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event?.stopPropagation();
    showModal('add-skin-modal', (
      <AddSkinModal
        skin={skin}
        onSave={saveSkin}
        onAdd={addSkin}
        isLoading={localSkinsLoading}
      />
    ));
  };

  const saveSkin = async (skin: MinecraftSkin) => {
    if (!skin) return;

    try {
      const updatedSkin = await MinecraftSkinService.updateSkinProperties(
        skin.id,
        skin.name,
        skin.variant,
      );

      if (updatedSkin) {
        setLocalSkins((prevSkins) =>
          prevSkins.map((s) => (s.id === updatedSkin.id ? updatedSkin : s)),
        );
        if (selectedLocalSkin?.id === updatedSkin.id) {
          setSelectedLocalSkin(updatedSkin);
        }
        hideModal('add-skin-modal');
      } else {
        toast.error("Skin not found. It may have been deleted.");
      }
    } catch (err) {
      console.error("Error updating skin properties:", err);
      toast.error(err instanceof Error ? err.message : String(err.message));
    }
  };

  const addSkin = async (
    skinInput: string,
    targetName: string,
    targetVariant: SkinVariant,
    description?: string | null,
  ) => {
    try {
      const newSkin = await MinecraftSkinService.addSkinLocally(
        skinInput,
        targetName,
        targetVariant,
        description,
      );
      setLocalSkins((prevSkins) =>
        [...prevSkins, newSkin].sort((a, b) => a.name.localeCompare(b.name)),
      );
      hideModal('add-skin-modal');
    } catch (err) {
      console.error("Error adding new skin:", err);
      const errorMessage =
        err instanceof Error ? err.message : String(err.message);
      toast.error(`Failed to add skin: ${errorMessage}`);
    }
  };

  const handleDeleteSkin = async (skinId: string, skinName: string) => {
    const deletePromise = async () => {
      const removed = await MinecraftSkinService.removeSkin(skinId);
      if (!removed) {
        throw new Error(
          `Skin "${skinName}" could not be found or was already deleted.`,
        );
      }
      return removed;
    };

    toast.promise(
      deletePromise(),
      {
        loading: `Deleting skin "${skinName}"...`,
        success: () => {
          setLocalSkins((prevSkins) =>
            prevSkins.filter((s) => s.id !== skinId),
          );
          if (selectedLocalSkin?.id === skinId) {
            setSelectedLocalSkin(null);
            setSelectedSkinId(null);
          }
          return `Successfully deleted skin: ${skinName}`;
        },
        error: (err) => {
          console.error("Error deleting skin:", err);
          return err instanceof Error ? err.message : String(err.message);
        },
      },
      {
        success: { duration: 4000 },
        error: { duration: 5000 },
      },
    );
  };

  const applyLocalSkin = async (skin: MinecraftSkin) => {
    if (!activeAccount) {
      toast.error("You must be logged in to apply a skin");
      return;
    }

    if (isSkinApplied(skin)) {
      toast.error(`Skin "${skin.name}" is already applied to your account`);
      return;
    }

    setLoading(true);
    setSelectedLocalSkin(skin);

    try {
      await MinecraftSkinService.applySkinFromBase64(
        activeAccount.id,
        activeAccount.access_token,
        skin.base64_data,
        skin.variant,
      );

      toast.success(
        `Successfully applied skin: ${skin.name} (${skin.variant} model)`,
      );
      await loadSkinData();
    } catch (err) {
      console.error("Error applying local skin:", err);
      toast.error(err instanceof Error ? err.message : String(err.message));
    } finally {
      setLoading(false);
    }
  };

  const isSkinApplied = (skin: MinecraftSkin): boolean => {
    if (!currentSkinId) return false;
    return skin.id === currentSkinId;
  };

  const handleSelectSkin = useCallback((skin: MinecraftSkin) => {
    console.log('Selected skin:', skin);
    setSelectedLocalSkin(skin);
  }, []);

  const handleEquipSkin = useCallback(async (skin: MinecraftSkin) => {
    await applyLocalSkin(skin);
  }, [activeAccount]);

  // Add skin button
  const addSkinButton = (
    <Button
      onClick={() => startEditSkin(null)}
      disabled={!activeAccount}
      size="sm"
    >
      <div className="inline-flex items-center">
        <Icon icon="solar:add-square-bold" className="w-4 h-4 mr-2 flex-shrink-0" />
        <span>Add Skin</span>
      </div>
    </Button>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-3xl font-minecraft text-white">Skins</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md">
            <SearchWithFilters
              placeholder="Search skins..."
              searchValue={search}
              onSearchChange={setSearch}
              onSearchEnter={() => {}}
            />
          </div>
          {activeAccount && addSkinButton}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        {/* Left Side - Player Preview */}
        <div className="w-1/3 bg-black/30 rounded-lg overflow-hidden border border-white/10 flex flex-col">
          {/* 3D Preview */}
          <div className="flex-1 bg-black/50 relative flex items-center justify-center">
            {(selectedLocalSkin || playerCurrentSkin) ? (
              <div className="w-full h-full relative">
                <SkinView3DWrapper
                  skinUrl={selectedLocalSkin ? `data:image/png;base64,${selectedLocalSkin.base64_data}` : playerCurrentSkin}
                  skinVariant={selectedLocalSkin ? (selectedLocalSkin.variant === 'slim' ? 'slim' : 'classic') : 'classic'}
                  enableAutoRotate={true}
                  autoRotateSpeed={0.3}
                  zoom={0.9}
                  enableRotate={true}
                  enableZoom={false}
                  enablePan={false}
                  horizontalRotationOnly={true}
                />
              </div>
            ) : (
              <div className="text-center">
                <Icon icon="solar:clothing-bold" className="w-16 h-16 text-white/30 mx-auto mb-2" />
                <p className="font-minecraft text-white/70">Loading current skin...</p>
              </div>
            )}
          </div>

          {/* Skin Info and Equip Button */}
          <div className="p-4 border-t border-white/10 bg-black/20">
            <h3 className="text-2xl text-medium font-minecraft text-white mb-3 lowercase">
              {selectedLocalSkin ? selectedLocalSkin.name : (playerCurrentSkin ? 'Current Skin' : 'No Skin Selected')}
            </h3>

            <Button
              onClick={() => selectedLocalSkin && handleEquipSkin(selectedLocalSkin)}
              disabled={loading || !selectedLocalSkin || isSkinApplied(selectedLocalSkin)}
              size="md"
              className="w-full"
            >
              {loading ? (
                <>
                  <Icon icon="solar:refresh-bold" className="w-4 h-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : !selectedLocalSkin ? (
                'Select a skin to equip'
              ) : isSkinApplied(selectedLocalSkin) ? (
                'Currently Equipped'
              ) : (
                'Equip This Skin'
              )}
            </Button>
          </div>
        </div>

        {/* Right Side - Skin Grid */}
        <div className="w-2/3 overflow-hidden flex flex-col">
          {/* Account check */}
          {accountLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-white/70 font-minecraft text-xl text-center py-4">
                Loading account...
              </p>
            </div>
          ) : accountError ? (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
              <p className="text-red-300 font-minecraft text-sm">Account Error: {accountError}</p>
            </div>
          ) : !activeAccount ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-white/70 italic font-minecraft text-xl text-center py-10">
                Please log in to a Minecraft account to manage skins.
              </p>
            </div>
          ) : (
            <>
              {/* Error state */}
              {localSkinsError && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
                  <p className="text-red-300 font-minecraft text-sm">{localSkinsError}</p>
                </div>
              )}

              {/* Skin Grid */}
              <div className="flex-1 overflow-y-auto">
                {localSkinsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Icon icon="solar:refresh-bold" className="w-8 h-8 animate-spin text-white/50 mx-auto mb-2" />
                      <p className="text-white/70 font-minecraft">Loading skins...</p>
                    </div>
                  </div>
                ) : filteredSkins.length === 0 && !localSkinsError ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Icon icon="solar:sad-bold" className="w-12 h-12 text-white/30 mx-auto mb-2" />
                      <p className="text-4xl text-white/70 font-minecraft">
                        {debouncedSearch ? 'No skins match your search' : 'No skins found'}
                      </p>
                      <p className="text-2xl text-white/50 font-minecraft text-medium mt-2">
                        {debouncedSearch ? 'Try a different search term' : 'Add your first skin to get started'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={filteredSkins.map(skin => skin.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
                        {filteredSkins.map((skin) => (
                          <SortableSkinCard
                            key={skin.id}
                            skin={skin}
                            selectedLocalSkin={selectedLocalSkin}
                            accentColor={accentColor}
                            loading={loading}
                            onSelectSkin={handleSelectSkin}
                            onEditSkin={startEditSkin}
                            onDeleteSkin={handleDeleteSkin}
                          />
                        ))}
                      </div>
                    </SortableContext>
                    <DragOverlay
                    dropAnimation={null}
                  >
                      {delayedActiveId ? (
                        <div className="pointer-events-none">
                          <div className="relative p-3 rounded-lg border-2 border-white/40 bg-black/50 shadow-2xl opacity-95">
                            <div className="aspect-square rounded mb-2 overflow-hidden flex items-center justify-center">
                              <SkinPreview
                                skin={filteredSkins.find(skin => skin.id === delayedActiveId)!}
                                renderType="dungeons"
                                width={160}
                                height={160}
                                className="w-full h-full"
                              />
                            </div>
                            <div className="text-center">
                              <h3 className="font-minecraft text-white text-sm lowercase truncate">
                                {filteredSkins.find(skin => skin.id === delayedActiveId)?.name}
                              </h3>
                              <div className="mt-1">
                                <span className="px-2 py-1 text-xs font-minecraft rounded bg-white/20 text-white border border-white/30">
                                  {filteredSkins.find(skin => skin.id === delayedActiveId)?.variant === "slim" ? "Slim" : "Classic"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
