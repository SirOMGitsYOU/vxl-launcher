import {
  ModPlatform,
  type UnifiedModSearchParams,
  type UnifiedModSearchResponse,
  type UnifiedModVersionsParams,
  type UnifiedModpackVersionsResponse,
  type UnifiedVersionResponse,
  type UnifiedProjectType,
  type UnifiedSortType,
  type UnifiedUpdateCheckRequest,
  type UnifiedUpdateCheckResponse,
  type UnifiedVersion,
  type ModpackSwitchRequest,
  type ModpackSwitchResponse,
} from "../types/unified";
import type { ModPackSource } from "../types/profile";
import type { SwitchContentVersionPayload, ContentType } from "../types/content";
import type { LocalContentItem } from "../types/profile";
import { invoke } from "@tauri-apps/api/core";

class UnifiedService {
    static async searchMods(params: UnifiedModSearchParams): Promise<UnifiedModSearchResponse> {
        return invoke<UnifiedModSearchResponse>("search_mods_unified_command", { params });
    }

    static async getModVersions(params: UnifiedModVersionsParams): Promise<UnifiedVersionResponse> {
        return invoke<UnifiedVersionResponse>("get_mod_versions_unified_command", { params });
    }

    static async checkModUpdates(request: UnifiedUpdateCheckRequest): Promise<UnifiedUpdateCheckResponse> {
        return invoke<UnifiedUpdateCheckResponse>("check_mod_updates_unified_command", { request });
    }

    static async getModpackVersions(modpackSource: ModPackSource): Promise<UnifiedModpackVersionsResponse> {
        return invoke<UnifiedModpackVersionsResponse>("get_modpack_versions_unified_command", {
            modpackSource
        });
    }

    static buildModpackSwitchRequest(
        version: UnifiedVersion,
        profileId: string,
    ): ModpackSwitchRequest {
        const primaryFile = version.files.find((file) => file.primary) ?? version.files[0];
        if (!primaryFile) {
            throw new Error("No downloadable file found for this modpack version");
        }

        if (version.source === ModPlatform.Modrinth) {
            return {
                download_url: primaryFile.url,
                modpack_source: {
                    source: "modrinth",
                    project_id: version.project_id,
                    version_id: version.id,
                },
                profile_id: profileId,
            };
        }

        if (version.source === ModPlatform.CurseForge) {
            const fileId = Number.parseInt(version.id, 10);
            if (!Number.isFinite(fileId) || fileId <= 0) {
                throw new Error("CurseForge file ID not found");
            }

            return {
                download_url: primaryFile.url,
                modpack_source: {
                    source: "curse_forge",
                    project_id: Number.parseInt(version.project_id, 10),
                    file_id: fileId,
                },
                profile_id: profileId,
            };
        }

        throw new Error(`Unsupported modpack source: ${version.source}`);
    }

    static isInstalledModpackVersion(
        version: UnifiedVersion,
        versions: UnifiedModpackVersionsResponse | null,
        installedSource?: ModPackSource | null,
    ): boolean {
        if (installedSource?.source === "modrinth") {
            return version.id === installedSource.version_id;
        }

        if (installedSource?.source === "curse_forge") {
            const storedFileId = String(installedSource.file_id);
            if (version.id === storedFileId) {
                return true;
            }
            return version.files.some(
                (file) =>
                    file.fingerprint != null &&
                    (String(file.fingerprint) === storedFileId ||
                        (file.fingerprint >>> 0) === installedSource.file_id),
            );
        }

        if (versions?.installed_version?.id === version.id) {
            return true;
        }

        const installedFingerprints = versions?.installed_version?.files
            .map((file) => file.fingerprint)
            .filter((fingerprint): fingerprint is number => fingerprint != null);
        if (installedFingerprints && installedFingerprints.length > 0) {
            return version.files.some(
                (file) =>
                    file.fingerprint != null &&
                    installedFingerprints.includes(file.fingerprint),
            );
        }

        return false;
    }

    static async switchContentVersion(
        profileId: string,
        contentType: ContentType,
        currentItem: LocalContentItem,
        newVersion: UnifiedVersion
    ): Promise<void> {
        const payload: SwitchContentVersionPayload = {
            profile_id: profileId,
            content_type: contentType,
            current_item_details: { ...currentItem, path_str: currentItem.path_str },
            new_version_details: newVersion,
        };

        return invoke("switch_content_version", { payload });
    }

    static async switchModpackVersion(request: ModpackSwitchRequest): Promise<ModpackSwitchResponse> {
        console.log("Switching modpack version", request);

        return invoke("switch_modpack_version_command", { request });
    }

    static async getCurseForgeFileChangelog(modId: number, fileId: number): Promise<string> {
        console.log("Getting CurseForge file changelog:", { modId, fileId });

        return invoke("get_curseforge_file_changelog_command", { modId, fileId });
    }
}

export default UnifiedService;
