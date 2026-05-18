import { invoke } from '@tauri-apps/api/core';
import type { VanillaCape, VanillaCapeInfo } from '../types/vanillaCapes';

export interface CapeTextureRef {
  id: string;
  url: string;
}

export class VanillaCapeService {
  static async getOwnedVanillaCapes(): Promise<VanillaCape[]> {
    return invoke<VanillaCape[]>('get_owned_vanilla_capes');
  }

  static async getCurrentlyEquippedVanillaCape(): Promise<VanillaCape | null> {
    return invoke<VanillaCape | null>('get_currently_equipped_vanilla_cape');
  }

  static async equipVanillaCape(capeId: string | null): Promise<void> {
    return invoke('equip_vanilla_cape', { capeId });
  }

  static async getVanillaCapeInfo(): Promise<VanillaCapeInfo[]> {
    return invoke<VanillaCapeInfo[]>('get_vanilla_cape_info');
  }

  static async refreshVanillaCapeData(): Promise<void> {
    return invoke('refresh_vanilla_cape_data');
  }

  static async syncCapeTextureCache(capes: CapeTextureRef[]): Promise<void> {
    return invoke('sync_cape_texture_cache', { capes });
  }

  static async getCachedCapeTexturePath(capeId: string, capeUrl: string): Promise<string> {
    return invoke<string>('get_cached_cape_texture_path', { capeId, capeUrl });
  }

  static async getCapePreviewPath(capeId: string): Promise<string | null> {
    return invoke<string | null>('get_cape_preview_path', { capeId });
  }

  static async saveCapePreview(capeId: string, pngBase64: string): Promise<string> {
    return invoke<string>('save_cape_preview', { capeId, pngBase64 });
  }
}

export const getOwnedVanillaCapes = VanillaCapeService.getOwnedVanillaCapes;
export const getCurrentlyEquippedVanillaCape = VanillaCapeService.getCurrentlyEquippedVanillaCape;
export const equipVanillaCape = VanillaCapeService.equipVanillaCape;
export const getVanillaCapeInfo = VanillaCapeService.getVanillaCapeInfo;
export const refreshVanillaCapeData = VanillaCapeService.refreshVanillaCapeData;
export const syncCapeTextureCache = VanillaCapeService.syncCapeTextureCache;
export const getCachedCapeTexturePath = VanillaCapeService.getCachedCapeTexturePath;
export const getCapePreviewPath = VanillaCapeService.getCapePreviewPath;
export const saveCapePreview = VanillaCapeService.saveCapePreview;