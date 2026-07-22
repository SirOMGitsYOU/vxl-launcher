"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MinecraftProfile } from "../../types/minecraft";
import type {
  MinecraftSkin,
  SkinVariant,
} from "../../types/localSkin";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { MinecraftSkinService } from "../../services/minecraft-skin-service";
import { Button, IconButton } from "../ui-v2";
import { Icon } from "@iconify/react";
import { StatusMessage } from "../ui/StatusMessage";
import { useLivePlayerSkin, parseLiveSkinFromProfile } from "../../hooks/useLivePlayerSkin";
import { SkinPreview } from "../skins/SkinPreview";
import { useDebounce } from "../../hooks/useDebounce";
import { useThemeStore } from "../../store/useThemeStore";
import { useSkinStore } from "../../store/useSkinStore";
import { toast } from "react-hot-toast";
import { BrowseDetailLayout } from "../layout/BrowseDetailLayout";
import { DetailPanelBody, DetailPanelHero, DetailPanelActions } from "../layout/DetailPanel";
import { useShellSearchTab } from "../../hooks/useShellSearchTab";
import { useShellSearch } from "../../contexts/ShellSearchContext";
import { useGlobalModal } from "../../hooks/useGlobalModal";
import { AddSkinModal } from "../modals/AddSkinModal";
import { SkinView3DWrapper } from "../common/SkinView3DWrapper";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// SortableSkinCard component for drag and drop
const SortableSkinCard = ({ skin, selectedLocalSkin, accentColor, loading, onSelectSkin, onEditSkin, onDeleteSkin }: {
  skin: MinecraftSkin;
  selectedLocalSkin: MinecraftSkin | null;
  accentColor: any;
  loading: boolean;
  onSelectSkin: (skin: MinecraftSkin) => void;
  onEditSkin: (skin: MinecraftSkin, event?: React.MouseEvent) => void;
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
      className={`relative group p-3 rounded-xl cursor-pointer transition-all border ${
        selectedLocalSkin?.id === skin.id
          ? "border-[var(--accent)] bg-[rgba(var(--accent-rgb),0.06)] vxl-accent-glow"
          : "border-[var(--surface-border)] bg-[var(--surface-overlay)] hover:border-[var(--surface-border-strong)]"
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
          renderType="fullbody"
          width={160}
          height={160}
          className="w-full h-full"
        />
      </div>

      <div className="text-center">
        <h3 className="text-sm font-medium text-white truncate">
          {skin.name}
        </h3>
        <div className="mt-1">
          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-white/10 text-[var(--text-secondary)] border border-[var(--surface-border)]">
            {skin.variant === "slim" ? "Slim" : "Classic"}
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
  const { query: search } = useShellSearch();
  const [currentSkinId, setCurrentSkinId] = useState<string | null>(null);
  const {
    skinUrl: playerCurrentSkin,
    variant: playerCurrentSkinVariant,
    isLoading: isPlayerSkinLoading,
    refresh: refreshLivePlayerSkin,
  } = useLivePlayerSkin(activeAccount);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [delayedActiveId, setDelayedActiveId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<{oldIndex: number, newIndex: number, skin: MinecraftSkin} | null>(null);

  const debouncedSearch = useDebounce(search ?? "", 250);
  const accentColor = useThemeStore((state) => state.accentColor);

  useShellSearchTab("Search skins...");

  const filteredSkins = useMemo(() => {
    const normalizedSearch = (debouncedSearch ?? "").trim().toLowerCase();
    if (!normalizedSearch) return localSkins;
    return localSkins.filter((skin) =>
      (skin.name ?? "").toLowerCase().includes(normalizedSearch),
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
      const data = await MinecraftSkinService.getUserSkinData(activeAccount.id);
      setSkinData(data);

      const parsed = parseLiveSkinFromProfile(data?.properties);
      if (parsed.skinId) {
        setCurrentSkinId(parsed.skinId);
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
        skin={skin ?? undefined}
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
        skin.base64_data,
        skin.variant,
      );

      toast.success(
        `Successfully applied skin: ${skin.name} (${skin.variant} model)`,
      );
      await loadSkinData();
      await refreshLivePlayerSkin();
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
    <BrowseDetailLayout
      title="Skins"
      subtitle="Browse and manage your character skins"
      icon="temaki:clothes-hanger"
      toolbarExtra={activeAccount ? addSkinButton : undefined}
      detailEmpty={!selectedLocalSkin && !playerCurrentSkin && !isPlayerSkinLoading}
      detailEmptyMessage="Select a skin to preview"
      browseContent={
        accountLoading ? (
          <div className="flex items-center justify-center h-full min-h-[240px] text-[var(--text-secondary)]">
            Loading account...
          </div>
        ) : !activeAccount ? (
          accountError ? (
            <StatusMessage type="error" message={`Account Error: ${accountError}`} />
          ) : (
            <div className="flex items-center justify-center h-full min-h-[240px] text-[var(--text-secondary)]">
              Please log in to a Minecraft account to manage skins.
            </div>
          )
        ) : localSkinsError ? (
          <StatusMessage type="error" message={localSkinsError} />
        ) : localSkinsLoading ? (
          <div className="flex items-center justify-center h-full min-h-[240px] text-[var(--text-secondary)]">
            <Icon icon="solar:refresh-bold" className="w-6 h-6 animate-spin mr-2" />
            Loading skins...
          </div>
        ) : filteredSkins.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[240px] text-center">
            <Icon icon="solar:sad-bold" className="w-10 h-10 text-[var(--text-muted)] mb-2" />
            <p className="text-white">{debouncedSearch ? "No skins match your search" : "No skins found"}</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {debouncedSearch ? "Try a different search term" : "Add your first skin to get started"}
            </p>
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
              items={filteredSkins.map((skin) => skin.id)}
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
            <DragOverlay dropAnimation={null}>
              {delayedActiveId ? (
                <div className="pointer-events-none">
                  <div className="relative p-3 rounded-xl border border-[var(--accent)] bg-[var(--surface-overlay)] shadow-lg opacity-95">
                    <div className="aspect-square rounded-lg mb-2 overflow-hidden flex items-center justify-center">
                      <SkinPreview
                        skin={filteredSkins.find((skin) => skin.id === delayedActiveId)!}
                        renderType="fullbody"
                        width={160}
                        height={160}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="text-center">
                      <h3 className="text-sm font-medium text-white truncate">
                        {filteredSkins.find((skin) => skin.id === delayedActiveId)?.name}
                      </h3>
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )
      }
      detailContent={
        <>
          <DetailPanelHero className="flex-1 min-h-64">
            <div className="w-full h-full min-h-64 flex items-center justify-center bg-[var(--surface-base)]">
              {selectedLocalSkin ? (
                <SkinView3DWrapper
                  skinUrl={`data:image/png;base64,${selectedLocalSkin.base64_data}`}
                  skinVariant={
                    selectedLocalSkin.variant === "slim" ? "slim" : "classic"
                  }
                  enableAutoRotate
                  autoRotateSpeed={0.3}
                  zoom={0.9}
                  enableRotate
                  enableZoom={false}
                  enablePan={false}
                  horizontalRotationOnly
                />
              ) : isPlayerSkinLoading || (activeAccount && !playerCurrentSkin) ? (
                <Icon
                  icon="solar:refresh-bold"
                  className="w-6 h-6 animate-spin text-[var(--text-secondary)]"
                />
              ) : playerCurrentSkin ? (
                <SkinView3DWrapper
                  key={`${activeAccount?.id}-${playerCurrentSkinVariant}-${playerCurrentSkin}`}
                  skinUrl={playerCurrentSkin}
                  playerUuid={activeAccount?.id}
                  skinVariant={playerCurrentSkinVariant}
                  enableAutoRotate
                  autoRotateSpeed={0.3}
                  zoom={0.9}
                  enableRotate
                  enableZoom={false}
                  enablePan={false}
                  horizontalRotationOnly
                />
              ) : (
                <Icon icon="solar:clothing-bold" className="w-12 h-12 text-[var(--text-muted)]" />
              )}
            </div>
          </DetailPanelHero>
          <DetailPanelBody>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {selectedLocalSkin?.name || (playerCurrentSkin ? "Current Skin" : "No Skin Selected")}
              </h3>
              {selectedLocalSkin && (
                <p className="text-sm mt-1" style={{ color: "var(--accent)" }}>
                  {selectedLocalSkin.variant === "slim" ? "Slim model" : "Classic model"}
                </p>
              )}
            </div>
            {selectedLocalSkin?.description && (
              <p className="text-sm text-[var(--text-secondary)]">{selectedLocalSkin.description}</p>
            )}
          </DetailPanelBody>
          <DetailPanelActions>
            <Button
              onClick={() => selectedLocalSkin && handleEquipSkin(selectedLocalSkin)}
              disabled={loading || !selectedLocalSkin || isSkinApplied(selectedLocalSkin)}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Icon icon="solar:refresh-bold" className="w-4 h-4 animate-spin" />
                  Applying...
                </>
              ) : !selectedLocalSkin ? (
                "Select a skin to apply"
              ) : isSkinApplied(selectedLocalSkin) ? (
                "Currently Equipped"
              ) : (
                <>
                  <Icon icon="solar:play-bold" className="w-4 h-4" />
                  Apply Skin
                </>
              )}
            </Button>
          </DetailPanelActions>
        </>
      }
    />
  );
}
