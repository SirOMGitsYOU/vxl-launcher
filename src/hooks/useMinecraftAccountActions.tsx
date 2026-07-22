"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useMinecraftAuthStore } from "../store/minecraft-auth-store";
import { useGlobalModal } from "./useGlobalModal";
import { getLauncherConfig } from "../services/launcher-config-service";
import { MinecraftAuthService } from "../services/minecraft-auth-service";
import { BrowserLoginModal } from "../components/account/BrowserLoginModal";

export function useMinecraftAccountActions() {
  const {
    accounts,
    activeAccount,
    isLoading,
    error,
    addAccount,
    removeAccount,
    setActiveAccount,
    initializeAccounts,
  } = useMinecraftAuthStore();
  const { showModal, hideModal } = useGlobalModal();
  const [useBrowserLogin, setUseBrowserLogin] = useState(false);

  useEffect(() => {
    const checkBrowserLogin = async () => {
      try {
        const [config, isFlatpakEnv] = await Promise.all([
          getLauncherConfig(),
          MinecraftAuthService.isFlatpak(),
        ]);
        setUseBrowserLogin(isFlatpakEnv || config.use_browser_based_login);
      } catch (err) {
        console.error("Failed to load config or check Flatpak:", err);
      }
    };
    checkBrowserLogin();
  }, []);

  const handleAddAccount = async () => {
    try {
      if (useBrowserLogin) {
        showModal(
          "browser-login-modal",
          <BrowserLoginModal
            onCancel={async () => {
              try {
                await MinecraftAuthService.cancelLogin();
                hideModal("browser-login-modal");
                toast.error("Login cancelled");
                useMinecraftAuthStore.setState({
                  isLoading: false,
                  error: null,
                });
              } catch (err) {
                console.error("Failed to cancel login:", err);
                toast.error("Failed to cancel login");
                useMinecraftAuthStore.setState({ isLoading: false });
              }
            }}
          />,
        );
      }
      await addAccount();
      if (useBrowserLogin) {
        hideModal("browser-login-modal");
      }
    } catch (err) {
      console.error("Error adding account:", err);
      if (useBrowserLogin) {
        hideModal("browser-login-modal");
      }
    }
  };

  const handleSetActive = async (accountId: string) => {
    try {
      await setActiveAccount(accountId);
    } catch (err) {
      console.error("Error setting active account:", err);
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    try {
      await removeAccount(accountId);
    } catch (err) {
      console.error("Error removing account:", err);
    }
  };

  return {
    accounts,
    activeAccount,
    isLoading,
    error,
    initializeAccounts,
    handleAddAccount,
    handleSetActive,
    handleRemoveAccount,
  };
}
