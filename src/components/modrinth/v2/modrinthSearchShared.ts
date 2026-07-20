import type { ModrinthProjectType, ModrinthCategory } from '../../../types/modrinth';
import { UnifiedProjectType } from '../../../types/unified';
import type { ContentInstallStatus } from '../../../types/profile';

export type Profile = any;

export const ALL_MODRINTH_PROJECT_TYPES: ModrinthProjectType[] = [
  'modpack',
  'mod',
  'resourcepack',
  'shader',
  'datapack',
];

export const PREFERRED_HEADER_ORDER = [
  'resolutions',
  'performance impact',
  'features',
  'categories',
];

export const INITIAL_DISPLAY_COUNT = 5;
export const LOAD_MORE_INCREMENT = 5;
export const SEARCH_PAGE_LIMIT = 20;

export interface UIDynamicFilterGroup {
  accordionTitle: string;
  headerValue: string;
  options: ModrinthCategory[];
}

export const convertToUnifiedProjectType = (
  modrinthType: ModrinthProjectType,
): UnifiedProjectType => {
  switch (modrinthType) {
    case 'mod':
      return UnifiedProjectType.Mod;
    case 'modpack':
      return UnifiedProjectType.Modpack;
    case 'resourcepack':
      return UnifiedProjectType.ResourcePack;
    case 'shader':
      return UnifiedProjectType.Shader;
    case 'datapack':
      return UnifiedProjectType.Datapack;
    default:
      return UnifiedProjectType.Mod;
  }
};

export const defaultErrorContentStatus: ContentInstallStatus = {
  is_installed: false,
  is_included_in_norisk_pack: false,
  is_specific_version_in_pack: false,
  is_enabled: undefined,
  found_item_details: undefined,
  norisk_pack_item_details: undefined,
};

export const getStatusForNewInstall = (
  existingPreviousStatus?: ContentInstallStatus | null,
): ContentInstallStatus => ({
  is_installed: true,
  is_included_in_norisk_pack:
    existingPreviousStatus?.is_included_in_norisk_pack || false,
  is_specific_version_in_pack:
    existingPreviousStatus?.is_specific_version_in_pack || false,
  is_enabled: true,
  found_item_details: existingPreviousStatus?.found_item_details ?? undefined,
  norisk_pack_item_details:
    existingPreviousStatus?.norisk_pack_item_details ?? undefined,
});
