import { invoke } from "@tauri-apps/api/core";
import type { MinecraftAccount } from "../types/minecraft";

export class MinecraftAuthService {
  static async beginLogin(): Promise<MinecraftAccount | null> {
    try {
      return await invoke<MinecraftAccount | null>("begin_login");
    } catch (error) {
      console.error("Failed to begin login:", error);
      throw error;
    }
  }

  static async removeAccount(accountId: string): Promise<void> {
    try {
      await invoke("remove_account", { accountId });
    } catch (error) {
      console.error("Failed to remove account:", error);
      throw error;
    }
  }

  static async getActiveAccount(): Promise<MinecraftAccount | null> {
    try {
      return await invoke<MinecraftAccount | null>("get_active_account");
    } catch (error) {
      console.error("Failed to get active account:", error);
      throw error;
    }
  }

  static async setActiveAccount(accountId: string): Promise<void> {
    try {
      await invoke("set_active_account", { accountId });
    } catch (error) {
      console.error("Failed to set active account:", error);
      throw error;
    }
  }

  static async getAccounts(): Promise<MinecraftAccount[]> {
    try {
      return await invoke<MinecraftAccount[]>("get_accounts");
    } catch (error) {
      console.error("Failed to get accounts:", error);
      throw error;
    }
  }

  static async cancelLogin(): Promise<void> {
    try {
      await invoke("cancel_login");
    } catch (error) {
      console.error("Failed to cancel login:", error);
      throw error;
    }
  }

  static async isFlatpak(): Promise<boolean> {
    const maxRetries = 3;
    const retryDelay = 100; // ms
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await invoke<boolean>("is_flatpak");
      } catch (error) {
        if (attempt < maxRetries - 1) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          // Final attempt failed, log and return false
          console.error("Failed to check if Flatpak after retries:", error);
          return false;
        }
      }
    }
    return false;
  }
}
