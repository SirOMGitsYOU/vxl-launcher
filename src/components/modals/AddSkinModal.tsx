"use client";

import { memo, useState } from "react";
import type { MinecraftSkin, SkinVariant } from "../../types/localSkin";
import type { TexturesData } from "../../types/minecraft";
import { useThemeStore } from "../../store/useThemeStore";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { useGlobalModal } from "../../hooks/useGlobalModal";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";
import { IconButton } from "../ui/buttons/IconButton";
import { Icon } from "@iconify/react";
import { Input } from "../ui/Input";
import { Checkbox } from "../ui/Checkbox";
import { toast } from "react-hot-toast";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { MinecraftSkinService } from "../../services/minecraft-skin-service";
import { SkinView3DWrapper } from "../common/SkinView3DWrapper";
import { SearchStyleInput } from "../ui/Input";

interface AddSkinModalProps {
  skin?: MinecraftSkin;
  onSave: (skin: MinecraftSkin) => Promise<void>;
  onAdd: (
    skinInput: string,
    targetName: string,
    targetVariant: SkinVariant,
    description?: string | null,
  ) => Promise<void>;
  isLoading: boolean;
}

export const AddSkinModal = memo(
  ({ skin, onSave, onAdd, isLoading }: AddSkinModalProps) => {
    const [name, setName] = useState<string>(skin?.name ?? "");
    const [isSlimVariant, setIsSlimVariant] = useState<boolean>(
      skin?.variant === "slim",
    );

    // Initialize states for existing skin editing
    const [skinInput, setSkinInput] = useState<string>(skin ? skin.name : "");
    const [isPreviewMode, setIsPreviewMode] = useState<boolean>(!!skin); // Auto-preview for existing skins
    const [previewBase64Url, setPreviewBase64Url] = useState<string | null>(
      skin ? `data:image/png;base64,${skin.base64_data}` : null
    );
    const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
    const [previewSkinName, setPreviewSkinName] = useState<string>(skin?.name ?? "");
    const [importingCurrentSkin, setImportingCurrentSkin] = useState<boolean>(false);

    const variant: SkinVariant = isSlimVariant ? "slim" : "classic";
    const accentColor = useThemeStore((state) => state.accentColor);
    const { hideModal } = useGlobalModal();
    const { activeAccount } = useMinecraftAuthStore();

    const handleClose = () => {
      hideModal('add-skin-modal');
      // Reset states when closing
      setIsPreviewMode(!!skin);
      setPreviewBase64Url(skin ? `data:image/png;base64,${skin.base64_data}` : null);
      setPreviewSkinName(skin?.name ?? "");
      setIsSlimVariant(skin?.variant === "slim");
    };

    const handleImportCurrentSkin = async () => {
      if (!activeAccount) {
        toast.error("You must be logged in to import your current skin");
        return;
      }

      setImportingCurrentSkin(true);
      try {
        const skinData = await MinecraftSkinService.getUserSkinData(
          activeAccount.id,
          activeAccount.access_token,
        );

        if (skinData?.properties) {
          const texturesProp = skinData.properties.find(
            (prop: { name: string; value: string }) => prop.name === "textures",
          );

          if (texturesProp) {
            try {
              const decodedValue = atob(texturesProp.value);
              const texturesJson = JSON.parse(decodedValue) as TexturesData;
              const skinInfo = texturesJson.textures?.SKIN;

              if (skinInfo?.url) {
                setSkinInput(skinInfo.url);
                
                // Auto-detect variant based on metadata
                if (texturesJson.textures?.SKIN?.metadata?.model === "slim") {
                  setIsSlimVariant(true);
                } else {
                  setIsSlimVariant(false);
                }

                toast.success(
                  `Imported current skin from ${activeAccount.minecraft_username} (${texturesJson.textures?.SKIN?.metadata?.model === "slim" ? "Slim" : "Classic"} model)`,
                );
              } else {
                toast.error("Could not find skin URL in account data");
              }
            } catch (e) {
              console.error("Error parsing skin textures:", e);
              toast.error("Failed to parse skin details from account");
            }
          } else {
            toast.error("No skin data found for this account");
          }
        } else {
          toast.error("Could not retrieve skin data from account");
        }
      } catch (err) {
        console.error("Error importing current skin:", err);
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to import current skin",
        );
      } finally {
        setImportingCurrentSkin(false);
      }
    };

    const parseWebsiteUrl = async (url: URL, originalInput: string): Promise<{ finalUrl: string; targetName: string }> => {
      let finalUrl = originalInput;
      let targetName = "";

      // NameMC parsing
      if (url.hostname === "namemc.com" || url.hostname === "www.namemc.com") {
        const skinIdMatch = url.pathname.match(/\/skin\/([a-f0-9]+)/i);
        if (skinIdMatch) {
          const skinId = skinIdMatch[1];
          finalUrl = `https://s.namemc.com/i/${skinId}.png`;
          targetName = skinId;
          console.log(`[AddSkinModal] Converted NameMC skin URL to direct texture: ${finalUrl}`);
        } else {
          const profileMatch = url.pathname.match(/\/profile\/([^\/]+)/i);
          if (profileMatch) {
            let username = profileMatch[1];
            username = username.replace(/\.\d+$/, "");
            setSkinInput(username);
            targetName = username;
            finalUrl = username;
            console.log(`[AddSkinModal] Extracted username from NameMC profile URL: ${username}`);
          } else {
            throw new Error("Invalid NameMC URL format");
          }
        }
      }
      // Crafty.gg parsing
      else if (url.hostname === "crafty.gg" || url.hostname === "www.crafty.gg") {
        const craftySkinsMatch = url.pathname.match(/\/skins\/([a-f0-9\-]+)/i);
        if (craftySkinsMatch) {
          const uuid = craftySkinsMatch[1];
          // Crafty.gg provides texture data via .json endpoint (use backend to avoid CORS)
          let textureData = "";
          try {
            textureData = await invoke<string>("fetch_crafty_gg_skin_texture", { uuid });
            console.log(`[AddSkinModal] Fetched texture from Crafty.gg JSON endpoint`);
          } catch (fetchError) {
            console.error("[AddSkinModal] Failed to fetch Crafty.gg skin texture:", fetchError);
            throw new Error("Failed to fetch skin from Crafty.gg. Please try again.");
          }
          targetName = uuid;
          // Return the base64 data directly - it will be handled as Base64 source
          finalUrl = textureData;
          console.log(`[AddSkinModal] Processing Crafty.gg skin URL: ${uuid}`);
        } else {
          const craftyProfileMatch = url.pathname.match(/\/@([^\/]+)/i);
          if (craftyProfileMatch) {
            const username = craftyProfileMatch[1];
            setSkinInput(username);
            targetName = username;
            finalUrl = username;
            console.log(`[AddSkinModal] Extracted username from Crafty.gg profile URL: ${username}`);
          } else {
            throw new Error("Invalid Crafty.gg URL format");
          }
        }
      }
      // Laby.net parsing
      else if (url.hostname === "laby.net" || url.hostname === "www.laby.net") {
        const labySkinsMatch = url.pathname.match(/\/skin\/([a-f0-9]+)/i);
        if (labySkinsMatch) {
          const uuid = labySkinsMatch[1];
          finalUrl = `https://laby.net/api/v3/texture/${uuid}/skin.png?download=1`;
          targetName = uuid;
          console.log(`[AddSkinModal] Processing Laby.net skin URL: ${uuid}`);
        } else {
          const labyProfileMatch = url.pathname.match(/\/@([^\/]+)/i);
          if (labyProfileMatch) {
            const username = labyProfileMatch[1];
            setSkinInput(username);
            targetName = username;
            finalUrl = username;
            console.log(`[AddSkinModal] Extracted username from Laby.net profile URL: ${username}`);
          } else {
            throw new Error("Invalid Laby.net URL format");
          }
        }
      }
      // Generic URL handling
      else {
        const pathnameParts = url.pathname
          .split("/")
          .filter((part) => part.length > 0);
        targetName = pathnameParts.pop() || url.hostname || "Web_Skin";
        if (targetName.match(/\.(png|jpg|jpeg|gif)$/i)) {
          targetName = targetName.substring(0, targetName.lastIndexOf("."));
        }
      }

      return { finalUrl, targetName };
    };

    const handlePreview = async () => {
      const trimmedInput = skinInput.trim();
      if (!trimmedInput) {
        toast.error("Skin source (Username, UUID, URL, or File Path) cannot be empty.");
        return;
      }

      setIsPreviewLoading(true);

      try {

        // Create SkinSourceDetails based on input type (similar to addSkinLocally logic)
        let sourceDetails: any;
        let finalUrl = trimmedInput;
        let targetName = "";

        // Regex patterns (should match the ones in minecraft-skin-service.ts)
        const MINECRAFT_USERNAME_REGEX = /^[a-zA-Z0-9_]{2,16}$/;
        const UUID_REGEX = /^(?:[0-9a-fA-F]{32}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;

        if (MINECRAFT_USERNAME_REGEX.test(trimmedInput)) {
          sourceDetails = { type: "Profile", details: { query: trimmedInput } };
        } else if (UUID_REGEX.test(trimmedInput)) {
          sourceDetails = { type: "Profile", details: { query: trimmedInput } };
        } else if ((trimmedInput.startsWith("iVBORw0KGgo") || /^[A-Za-z0-9+/=]+$/.test(trimmedInput)) && trimmedInput.length > 100) {
          // Detect base64 data (PNG starts with iVBORw0KGgo or is valid base64)
          // Only treat as base64 if it's long enough to be actual image data
          sourceDetails = { type: "Base64", details: { base64_content: trimmedInput } };
        } else {
          let isHttpUrl = false;
          let isFileProtocolUrl = false;
          let pathFromUrlIfFileProtocol = "";

          try {
            const parsedUrl = new URL(trimmedInput);
            if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
              isHttpUrl = true;
              // Parse website-specific URLs
              const parsed = await parseWebsiteUrl(parsedUrl, trimmedInput);
              finalUrl = parsed.finalUrl;
              targetName = parsed.targetName;
            } else if (parsedUrl.protocol === "file:") {
              isFileProtocolUrl = true;
              let rawPath = decodeURIComponent(parsedUrl.pathname);
              // Normalize path: remove leading slash on Windows if it looks like /C:/path
              if (rawPath.length > 2 && rawPath.startsWith('/') && rawPath[2] === ':') {
                rawPath = rawPath.substring(1);
              }
              pathFromUrlIfFileProtocol = rawPath;
            }
          } catch (e) {
            // Not a parsable URL, will be treated as FilePath
          }

          if (isHttpUrl) {
            // Check if finalUrl is base64 data (from website parsing like Crafty.gg)
            // But only if it's actually base64 image data, not just a username
            if ((finalUrl.startsWith("iVBORw0KGgo") || /^[A-Za-z0-9+/=]+$/.test(finalUrl)) && finalUrl.length > 100) {
              sourceDetails = { type: "Base64", details: { base64_content: finalUrl } };
            } else if (MINECRAFT_USERNAME_REGEX.test(finalUrl)) {
              // If finalUrl is a username (from Crafty.gg profile parsing), treat as Profile
              sourceDetails = { type: "Profile", details: { query: finalUrl } };
            } else {
              sourceDetails = { type: "Url", details: { url: finalUrl } };
            }
          } else if (isFileProtocolUrl) {
            sourceDetails = { type: "FilePath", details: { path: pathFromUrlIfFileProtocol } };
          } else {
            // Assume it's a direct file path
            sourceDetails = { type: "FilePath", details: { path: trimmedInput } };
          }
        }

        // Get base64 data from the source
        // For Profile sources (username/UUID), use the metadata-aware function to get variant
        let base64Data: string;
        let detectedVariant: "slim" | "classic" | null = null;

        if (sourceDetails.type === "Base64") {
          // Base64 data is already available, use it directly
          base64Data = sourceDetails.details.base64_content;
          console.log(`[AddSkinModal] Using base64 data directly from Crafty.gg`);
        } else if (sourceDetails.type === "Profile") {
          try {
            console.log(`[AddSkinModal] Fetching profile data for: ${sourceDetails.details.query}`);
            const result = await invoke<{ base64_data: string; variant: string }>(
              "get_base64_with_metadata_from_skin_source_command",
              { source: sourceDetails }
            );
            console.log(`[AddSkinModal] Backend returned variant: ${result.variant}`);
            base64Data = result.base64_data;
            detectedVariant = (result.variant === "slim" ? "slim" : "classic") as "slim" | "classic";
            console.log(`[AddSkinModal] Detected skin variant from profile: ${detectedVariant}`);
            // Auto-set the variant based on the profile metadata
            setIsSlimVariant(detectedVariant === "slim");
          } catch (err) {
            console.error("[AddSkinModal] Failed to get metadata, falling back to standard method:", err);
            base64Data = await MinecraftSkinService.getBase64FromSkinSource(sourceDetails);
          }
        } else {
          base64Data = await MinecraftSkinService.getBase64FromSkinSource(sourceDetails);
        }

        // If targetName wasn't set by website parsing, generate it from the input
        if (!targetName.trim()) {
          const looksLikeHttpUrl = /^(https?):\/\//i.test(trimmedInput);
          const isLikelyFilePath = (input: string): boolean => {
            if (input.startsWith("file://")) return true;
            const hasPathSeparators = /[\\/]/.test(input);
            const isHttp = /^(https?):\/\//i.test(input);
            return hasPathSeparators && !isHttp;
          };

          if (looksLikeHttpUrl) {
            try {
              const url = new URL(trimmedInput);
              const pathnameParts = url.pathname
                .split("/")
                .filter((part) => part.length > 0);
              targetName = pathnameParts.pop() || url.hostname || "Web_Skin";
              if (targetName.match(/\.(png|jpg|jpeg|gif)$/i)) {
                targetName = targetName.substring(0, targetName.lastIndexOf("."));
              }
            } catch (e) {
              targetName = "Invalid_Web_Skin_Url";
              console.error("Error parsing HTTP URL for name:", e);
            }
          } else if (isLikelyFilePath(trimmedInput)) {
            let pathForNameExtraction = trimmedInput;
            if (trimmedInput.startsWith("file://")) {
              try {
                const tempUrl = new URL(trimmedInput);
                pathForNameExtraction = decodeURIComponent(tempUrl.pathname);
              } catch (e) {
                console.error(
                  "Error parsing file:// URL for name extraction:",
                  e,
                );
              }
            }
            const pathParts = pathForNameExtraction.split(/[\\/]/);
            targetName = pathParts.pop() || "File_Skin";
            if (targetName.match(/\.(png|jpg|jpeg|gif)$/i)) {
              targetName = targetName.substring(0, targetName.lastIndexOf("."));
            }
          } else {
            targetName = trimmedInput;
          }
        }

        if (!targetName.trim()) {
          targetName = "Unnamed_Skin";
          console.warn(
            "Derived target name was empty, falling back to Unnamed_Skin for input:",
            trimmedInput,
          );
        }

        // Create data URL for the skin viewer
        const base64Url = `data:image/png;base64,${base64Data}`;

        setPreviewBase64Url(base64Url);
        setPreviewSkinName(targetName);
        setIsPreviewMode(true);
        toast.success("Skin preview loaded successfully!");

      } catch (error) {
        console.error("Error loading skin preview:", error);
        console.error("Error details:", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          input: trimmedInput
        });
        toast.error(`Failed to load skin preview: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsPreviewLoading(false);
      }
    };

    const handleBackToEdit = () => {
      setIsPreviewMode(false);
      setPreviewBase64Url(null);
      setIsPreviewLoading(false);
    };

    const handleOpenFileUpload = async () => {
      try {
        const selectedFile = await open({
          multiple: false,
          directory: false,
          filters: [
            {
              name: "Skin Image",
              extensions: ["png"],
            },
          ],
          title: "Select Skin File (.png)",
        });

        if (typeof selectedFile === "string") {
          setSkinInput(selectedFile);
          toast.success("File selected: " + selectedFile.split(/[\\/]/).pop());
        } else if (selectedFile === null) {
          console.log("User cancelled file selection.");
        }
      } catch (error) {
        console.error("Error opening file dialog:", error);
        toast.error(
          "Failed to open file dialog. Ensure Tauri dialog plugin is configured.",
        );
      }
    };

    const handleSave = async () => {
      const saveOperation = async () => {
        if (skin) {
          return await onSave({
            ...skin,
            name: previewSkinName || skin.name,
            variant,
          });
        } else {
          const trimmedInput = skinInput.trim();
          if (!trimmedInput) {
            throw new Error("Skin source (Username, UUID, URL, or File Path) cannot be empty.");
          }

          // If we have preview base64 data (from Crafty.gg or other sources), use it directly
          if (previewBase64Url && previewBase64Url.startsWith("data:image/png;base64,")) {
            const base64Data = previewBase64Url.replace("data:image/png;base64,", "");
            const targetName = previewSkinName || "Unnamed_Skin";
            console.log("[AddSkinModal] Saving skin with base64 data from preview");
            return await onAdd(base64Data, targetName, variant, null);
          }

          // Use the same name generation logic as in the original code
          let targetName = "";
          let finalUrl = trimmedInput;
          const looksLikeHttpUrl = /^(https?):\/\//i.test(trimmedInput);
          const isLikelyFilePath = (input: string): boolean => {
            if (input.startsWith("file://")) return true;
            const hasPathSeparators = /[\\/]/.test(input);
            const isHttp = /^(https?):\/\//i.test(input);
            return hasPathSeparators && !isHttp;
          };

          if (looksLikeHttpUrl) {
            try {
              const url = new URL(trimmedInput);
              // Parse website-specific URLs
              const parsed = await parseWebsiteUrl(url, trimmedInput);
              finalUrl = parsed.finalUrl;
              targetName = parsed.targetName;
            } catch (e) {
              targetName = "Invalid_Web_Skin_Url";
              console.error("Error parsing HTTP URL for name:", e);
            }
          } else if (isLikelyFilePath(trimmedInput)) {
            let pathForNameExtraction = trimmedInput;
            if (trimmedInput.startsWith("file://")) {
              try {
                const tempUrl = new URL(trimmedInput);
                pathForNameExtraction = decodeURIComponent(tempUrl.pathname);
              } catch (e) {
                console.error(
                  "Error parsing file:// URL for name extraction:",
                  e,
                );
              }
            }
            const pathParts = pathForNameExtraction.split(/[\\/]/);
            targetName = pathParts.pop() || "File_Skin";
            if (targetName.match(/\.(png|jpg|jpeg|gif)$/i)) {
              targetName = targetName.substring(0, targetName.lastIndexOf("."));
            }
          } else {
            targetName = trimmedInput;
          }

          // Use previewSkinName if available (when in preview mode)
          if (previewSkinName.trim()) {
            targetName = previewSkinName.trim();
          }

          if (!targetName.trim()) {
            targetName = "Unnamed_Skin";
            console.warn(
              "Derived target name was empty, falling back to Unnamed_Skin for input:",
              trimmedInput,
            );
          }

        return await onAdd(finalUrl, targetName, variant, null);
        }
      };

      // Use Promise Toast for better UX
      toast.promise(saveOperation(), {
        loading: skin ? "Updating skin..." : "Adding skin...",
        success: (result) => {
          const skinName = skin ? (previewSkinName || skin.name) : previewSkinName;
          return `Skin "${skinName}" ${skin ? "updated" : "added"} successfully!`;
        },
        error: (err) => {
          console.error("Save error:", err);
          return err instanceof Error ? err.message : "Failed to save skin";
        },
      });
    };

    return (
      <Modal
        title={skin ? "Edit Skin Properties" : (isPreviewMode ? "Add Skin - Preview" : "Add Skin")}
        onClose={handleClose}
        variant="flat"
        footer={
          <div className="flex gap-3 justify-center">
            {isPreviewMode ? (
              <Button
                variant="flat"
                onClick={handleSave}
                disabled={isLoading}
                size="sm"
              >
                {isLoading ? "Saving..." : (skin ? "Save Changes" : "Save Skin")}
              </Button>
            ) : (
              <>
                {!skin && (
                  <Button
                    variant="flat-secondary"
                    onClick={handlePreview}
                    disabled={isPreviewLoading}
                    size="sm"
                  >
                    {isPreviewLoading ? "Loading..." : "Preview Skin"}
                  </Button>
                )}
                {skin && (
                  <Button
                    variant="flat"
                    onClick={handleSave}
                    disabled={isLoading}
                    size="sm"
                  >
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                )}
                <Button
                  variant="flat-secondary"
                  onClick={handleClose}
                  disabled={isLoading || isPreviewLoading}
                  size="sm"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        }
      >
        {isPreviewMode ? (
          <div className="p-4">
            {/* Skin Name Input - Above Preview */}
            <div className="flex justify-center mb-4">
              <div className="w-full max-w-md">
                <SearchStyleInput
                  value={previewSkinName}
                  onChange={(e) => setPreviewSkinName(e.target.value)}
                  placeholder="Enter skin name..."
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex justify-center">
              <div className="w-64 h-80">
                <SkinView3DWrapper
                  skinUrl={previewBase64Url || undefined}
                  skinVariant={variant}
                  enableAutoRotate={true}
                  autoRotateSpeed={0.2}
                  zoom={0.9}
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-center gap-6">
                <Checkbox
                  checked={!isSlimVariant}
                  onChange={(e) => setIsSlimVariant(false)}
                  disabled={isLoading}
                  label="Classic (Steve)"
                  size="md"
                />
                <Checkbox
                  checked={isSlimVariant}
                  onChange={(e) => setIsSlimVariant(true)}
                  disabled={isLoading}
                  label="Slim (Alex)"
                  size="md"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {skin && (
              <div className="space-y-4">
                {/* 3D Skin Preview for editing */}
                <div className="flex justify-center">
                  <div className="w-48 h-64">
                    <SkinView3DWrapper
                      skinUrl={previewBase64Url || undefined}
                      skinVariant={variant}
                      enableAutoRotate={true}
                      autoRotateSpeed={0.3}
                      zoom={0.8}
                    />
                  </div>
                </div>

                {/* Skin Name Input */}
                <div>
                  <label className="block font-minecraft text-3xl text-white/80 lowercase mb-2">
                    Skin Name
                  </label>
                  <SearchStyleInput
                    value={previewSkinName}
                    onChange={(e) => setPreviewSkinName(e.target.value)}
                    placeholder="Enter skin name..."
                    disabled={isLoading}
                  />
                </div>

                {/* Skin Variant Selection */}
                <div>
                  <p className="font-minecraft text-3xl text-white/80 lowercase mb-4">
                    Skin Variant
                  </p>
                  <div className="flex justify-center gap-6">
                    <Checkbox
                      checked={!isSlimVariant}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setIsSlimVariant(false);
                        }
                      }}
                      disabled={isLoading}
                      label="Classic (Steve)"
                      size="md"
                    />
                    <Checkbox
                      checked={isSlimVariant}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setIsSlimVariant(true);
                        }
                      }}
                      disabled={isLoading}
                      label="Slim (Alex)"
                      size="md"
                    />
                  </div>
                </div>
              </div>
            )}

            {!skin && (
              <div className="space-y-3">
                <label className="block font-minecraft text-3xl text-white/80 lowercase">
                  Skin
                </label>
                <div className="flex gap-2">
                  <Input
                    id="skinInputField"
                    value={skinInput}
                    onChange={(e) => setSkinInput(e.target.value)}
                    placeholder="Copy by username, UUID or download from URL"
                    disabled={isLoading || importingCurrentSkin}
                    size="md"
                    variant="flat"
                    className="flex-grow"
                  />
                  <IconButton
                    onClick={handleOpenFileUpload}
                    title="Upload Skin from file"
                    disabled={isLoading || importingCurrentSkin}
                    size="md"
                    variant="flat-secondary"
                    icon={<Icon icon="solar:folder-bold" className="w-5 h-5" />}
                  />
                </div>
                <p className="text-white/50 font-minecraft text-lg lowercase">
                  Supported Sites: NameMC.com, Crafty.gg, Laby.net & Any Direct Image Host
                </p>
                <Button
                  onClick={handleImportCurrentSkin}
                  disabled={isLoading || importingCurrentSkin || !activeAccount}
                  variant="flat-secondary"
                  size="sm"
                  className="w-full"
                  icon={<Icon icon="solar:download-bold" className="w-4 h-4" />}
                >
                  {importingCurrentSkin ? "Importing..." : "Import Current Skin"}
                </Button>
              </div>
            )}

          </div>
        )}
      </Modal>
    );
  },
);
