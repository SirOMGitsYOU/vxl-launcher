import { create } from "zustand";
import { convertFileSrc } from "@tauri-apps/api/core";
import { MinecraftAuthService } from "../services/minecraft-auth-service";
import { MinecraftSkinService } from "../services/minecraft-skin-service";
import { populateAvatarCache, AVATAR_FETCH_SIZE } from "../hooks/useCrafatarAvatar";
import type { MinecraftAccount } from "../types/minecraft";
import { toast } from "react-hot-toast";
import { useVanillaCapeStore } from "./useVanillaCapeStore";

interface MinecraftAuthState {
  accounts: MinecraftAccount[];
  activeAccount: MinecraftAccount | null;
  isLoading: boolean;
  error: string | null;

  initializeAccounts: () => Promise<void>;
  addAccount: () => Promise<void>;
  removeAccount: (accountId: string) => Promise<void>;
  setActiveAccount: (accountId: string) => Promise<void>;
}

// Default Steve UUID for fallback avatars
const DEFAULT_STEVE_UUID = "8667ba71b85a4004af54457a9734eed7";

// Helper function to pre-fetch avatars for all accounts
async function prefetchAccountAvatars(accounts: MinecraftAccount[]) {
  if (accounts.length === 0) return;
  
  // Pre-fetch avatars for both dropdown (32px) and modal (40px) sizes, plus button (28px)
  // Also pre-fetch default Steve avatar for new profiles
  const allUuids = [...new Set([...accounts.map(a => a.id), DEFAULT_STEVE_UUID])];
  
  const prefetchPromises = allUuids.map((uuid) =>
    MinecraftSkinService.getCrafatarAvatar({
      uuid,
      size: AVATAR_FETCH_SIZE,
      overlay: true,
    })
      .then((path) => {
        const url = convertFileSrc(path);
        populateAvatarCache(uuid, url, true);
        return url;
      })
      .catch(() => null),
  );
  
  try {
    await Promise.all(prefetchPromises);
  } catch (err) {
    console.error("Failed to prefetch avatars:", err);
  }
}

export const useMinecraftAuthStore = create<MinecraftAuthState>((set, get) => ({
  accounts: [],
  activeAccount: null,
  isLoading: false,
  error: null,

  initializeAccounts: async () => {
    try {
      set({ isLoading: true, error: null });

      const accounts = await MinecraftAuthService.getAccounts();

      const activeAccount = await MinecraftAuthService.getActiveAccount();

      const updatedAccounts = accounts.map((account) => ({
        ...account,
        active: activeAccount ? account.id === activeAccount.id : false,
      }));

      set({
        accounts: updatedAccounts,
        activeAccount,
        isLoading: false,
      });

      // Pre-fetch avatars in the background after accounts are loaded
      prefetchAccountAvatars(updatedAccounts);
    } catch (error) {
      console.error("Failed to initialize accounts:", error);
      set({
        error: `Failed to load accounts: ${error instanceof Error ? error.message : String(error)}`,
        isLoading: false,
      });
    }
  },

  addAccount: async () => {
    set({ isLoading: true, error: null });

    const fullProcessPromise = (async () => {
      // Step 1: Login
      const newAccount = await MinecraftAuthService.beginLogin();
      if (!newAccount) {
        // This will be caught by toast.promise and the try/catch block
        throw new Error("Login cancelled by user.");
      }

      // Step 2: Get all data needed for the state update
      const accounts = await MinecraftAuthService.getAccounts();
      const activeAccount = await MinecraftAuthService.getActiveAccount();

      // Return a payload with all data needed for the success toast and the final state update
      return { newAccount, accounts, activeAccount };
    })();

    toast.promise(
      fullProcessPromise,
      {
        loading: "Please sign in via your browser...",
        success: ({ newAccount }) =>
          `Account '${newAccount.username}' added successfully.`,
        error: (err) => err.message,
      },
      {
        loading: {
          duration: 50000,
        },
        success: {
          duration: 1500,
        },
        error: {
          duration: 1500,
        },
      },
    );

    try {
      const { newAccount, accounts, activeAccount } = await fullProcessPromise;

      // Pre-fetch the new account's avatar BEFORE updating state
      // This ensures the avatar is cached and ready when the modal opens
      await prefetchAccountAvatars([newAccount]);

      // Now, after the toast has finished, update the state in one go.
      const updatedAccounts = accounts.map((account) => ({
        ...account,
        active: activeAccount ? account.id === activeAccount.id : false,
      }));

      set({
        accounts: updatedAccounts,
        activeAccount,
        error: null,
      });

      // Pre-fetch avatars for all accounts in the background
      prefetchAccountAvatars(updatedAccounts);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      // The toast handles displaying the error. We just log it and set state if it's a critical error.
      if (!errorMessage.includes("cancelled by user")) {
        console.error("Failed to add account:", error);
        set({ error: `Failed to add account: ${errorMessage}` });
      } else {
        console.log("Account add cancelled by user.");
      }
    } finally {
      set({ isLoading: false });
    }
  },

  removeAccount: async (accountId: string) => {
    try {
      set({ isLoading: true, error: null });
      const wasActive = get().activeAccount?.id === accountId;

      await MinecraftAuthService.removeAccount(accountId);

      const accounts = await MinecraftAuthService.getAccounts();
      const activeAccount = await MinecraftAuthService.getActiveAccount();

      const updatedAccounts = accounts.map((account) => ({
        ...account,
        active: activeAccount ? account.id === activeAccount.id : false,
      }));

      set({
        accounts: updatedAccounts,
        activeAccount,
        isLoading: false,
      });

      // Pre-fetch avatars for remaining accounts in the background
      prefetchAccountAvatars(updatedAccounts);
    } catch (error) {
      console.error("Failed to remove account:", error);
      set({
        error: `Failed to remove account: ${error instanceof Error ? error.message : String(error)}`,
        isLoading: false,
      });
    }
  },

  setActiveAccount: async (accountId: string) => {
    try {
      set({ isLoading: true, error: null });

      await MinecraftAuthService.setActiveAccount(accountId);

      const activeAccount = await MinecraftAuthService.getActiveAccount();

      const updatedAccounts = get().accounts.map((account) => ({
        ...account,
        active: account.id === accountId,
      }));

      set({
        accounts: updatedAccounts,
        activeAccount,
        isLoading: false,
      });

      useVanillaCapeStore.getState().clearData();
    } catch (error) {
      console.error("Failed to set active account:", error);
      set({
        error: `Failed to set active account: ${error instanceof Error ? error.message : String(error)}`,
        isLoading: false,
      });
    }
  },
}));
