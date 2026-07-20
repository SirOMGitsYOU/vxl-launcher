import { create } from "zustand";
import { persist } from "zustand/middleware";
import { VanillaCapeService } from "../services/vanilla-cape-service";
import type { VanillaCape, VanillaCapeInfo } from "../types/vanillaCapes";
import { toast } from "react-hot-toast";

interface VanillaCapeState {
  ownedCapes: VanillaCape[];
  equippedCape: VanillaCape | null;
  capeInfo: VanillaCapeInfo[];
  /** In-memory only: which account the session cape list belongs to */
  cachedAccountId: string | null;
  isLoading: boolean;
  error: string | null;
  lastFetchTime: number | null;

  fetchOwnedCapes: (options?: { force?: boolean; accountId?: string }) => Promise<void>;
  fetchCapeInfo: () => Promise<void>;
  equipCape: (capeId: string | null) => Promise<void>;
  refreshData: (accountId?: string) => Promise<void>;
  clearData: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const STORAGE_KEY = "vxl-vanilla-capes";

function syncCapeTexturesInBackground(capes: VanillaCape[]): void {
  const refs = capes
    .filter((cape) => cape.url.trim() !== "")
    .map((cape) => ({ id: cape.id, url: cape.url }));

  if (refs.length === 0) {
    return;
  }

  // Disk cache: only downloads textures that are missing or outdated.
  VanillaCapeService.syncCapeTextureCache(refs).catch((error) => {
    console.warn("Failed to sync cape texture cache:", error);
  });
}

export const useVanillaCapeStore = create<VanillaCapeState>()(
  persist(
    (set, get) => ({
      ownedCapes: [],
      equippedCape: null,
      capeInfo: [],
      cachedAccountId: null,
      isLoading: false,
      error: null,
      lastFetchTime: null,

      fetchOwnedCapes: async (options) => {
        const force = options?.force ?? false;
        const accountId = options?.accountId ?? get().cachedAccountId;
        const state = get();

        // Session cache: skip Mojang if we already have the list for this account.
        if (
          !force &&
          accountId &&
          state.cachedAccountId === accountId &&
          state.ownedCapes.length > 0
        ) {
          syncCapeTexturesInBackground(state.ownedCapes);
          return;
        }

        if (state.isLoading) {
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const ownedCapes = await VanillaCapeService.getOwnedVanillaCapes();
          const equippedCape = ownedCapes.find((cape) => cape.equipped) ?? null;

          set({
            ownedCapes,
            equippedCape,
            cachedAccountId: accountId ?? null,
            isLoading: false,
            lastFetchTime: Date.now(),
          });
          syncCapeTexturesInBackground(ownedCapes);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to fetch owned capes";
          set({ error: errorMessage, isLoading: false });
          console.error("Failed to fetch owned vanilla capes:", error);
        }
      },

      fetchCapeInfo: async () => {
        set({ isLoading: true, error: null });
        try {
          const capeInfo = await VanillaCapeService.getVanillaCapeInfo();
          set({ capeInfo, isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to fetch cape info";
          set({ error: errorMessage, isLoading: false });
          console.error("Failed to fetch vanilla cape info:", error);
        }
      },

      equipCape: async (capeId: string | null) => {
        const previousEquipped = get().equippedCape;

        try {
          if (capeId === null) {
            set({ equippedCape: null });
          } else {
            const cape = get().ownedCapes.find((c) => c.id === capeId);
            if (cape) {
              set({ equippedCape: { ...cape, equipped: true } });
            }
          }

          await VanillaCapeService.equipVanillaCape(capeId);

          set((state) => ({
            ownedCapes: state.ownedCapes.map((cape) => ({
              ...cape,
              equipped: cape.id === capeId,
            })),
          }));
        } catch (error) {
          set({ equippedCape: previousEquipped });

          const errorMessage = error instanceof Error ? error.message : "Failed to equip cape";
          set({ error: errorMessage });
          console.error("Failed to equip vanilla cape:", error);
          throw error;
        }
      },

      refreshData: async (accountId?: string) => {
        set({ isLoading: true, error: null });
        try {
          await VanillaCapeService.refreshVanillaCapeData();
          await get().fetchOwnedCapes({
            force: true,
            accountId: accountId ?? get().cachedAccountId ?? undefined,
          });
          toast.success("Cape data refreshed!");
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to refresh cape data";
          set({ error: errorMessage, isLoading: false });
          toast.error(`Failed to refresh cape data: ${errorMessage}`);
          console.error("Failed to refresh vanilla cape data:", error);
        }
      },

      clearData: () => {
        set({
          ownedCapes: [],
          equippedCape: null,
          cachedAccountId: null,
          isLoading: false,
          error: null,
          lastFetchTime: null,
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },
    }),
    {
      name: STORAGE_KEY,
      // Cape list is session-only; only static metadata persists across restarts.
      partialize: (state) => ({
        capeInfo: state.capeInfo,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.ownedCapes = [];
          state.equippedCape = null;
          state.cachedAccountId = null;
          state.isLoading = false;
          state.error = null;
          state.lastFetchTime = null;
        }
      },
    },
  ),
);
