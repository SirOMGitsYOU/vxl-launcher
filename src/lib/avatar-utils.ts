/**
 * Utility functions for generating avatar and skin URLs via NMSR.
 * @see https://nmsr.nickac.dev/
 */

const NMSR_HOST = 'https://nmsr.nickac.dev';

/**
 * Get face avatar URL (NMSR Head:Face mode)
 * @param uuid - Minecraft player UUID (with or without hyphens)
 * @param options - Optional parameters for avatar customization
 * @returns Avatar URL string
 */
export function getAvatarUrl(
  uuid: string,
  options?: {
    overlay?: boolean;
    size?: number;
  }
): string {
  const cleanUuid = uuid.replace(/-/g, '');
  const params = new URLSearchParams();

  if (options?.overlay === false) {
    params.append('nolayers', '');
  }
  if (options?.size) {
    params.append('w', options.size.toString());
  }

  const queryString = params.toString();
  const suffix = queryString ? `?${queryString}` : '';

  return `${NMSR_HOST}/face/${cleanUuid}${suffix}`;
}

/**
 * Get face avatar URL (same as primary)
 */
export function getFallbackAvatarUrl(
  uuid: string,
  options?: {
    overlay?: boolean;
    size?: number;
  }
): string {
  return getAvatarUrl(uuid, options);
}

/**
 * Get full-body render URL (NMSR fullbody endpoint)
 */
export function getFullbodyRenderUrl(
  playerNameOrUuid: string,
  options?: {
    slim?: boolean;
  }
): string {
  const encoded = encodeURIComponent(playerNameOrUuid);
  const params = new URLSearchParams();
  if (options?.slim) {
    params.append('alex', '');
  }
  const queryString = params.toString();
  const suffix = queryString ? `?${queryString}` : '';
  return `${NMSR_HOST}/fullbody/${encoded}${suffix}`;
}

/**
 * Default Steve skin texture (NMSR accepts player name, not legacy hash).
 */
export function getDefaultSkinTextureUrl(): string {
  return `${NMSR_HOST}/skin/Steve`;
}

/**
 * Normalize Mojang texture URLs for browser loading (HTTPS).
 */
export function normalizeMinecraftTextureUrl(url: string): string {
  return url.replace(/^http:\/\/textures\.minecraft\.net/i, "https://textures.minecraft.net");
}

/**
 * Default Steve full-body render fallback
 */
export function getDefaultFullbodyRenderUrl(): string {
  return getFullbodyRenderUrl("Steve");
}

/**
 * Get raw skin texture URL
 */
export function getSkinUrl(uuid: string): string {
  const cleanUuid = uuid.replace(/-/g, '');
  return `${NMSR_HOST}/skin/${cleanUuid}`;
}

/**
 * Get raw skin texture URL (same as primary)
 */
export function getFallbackSkinUrl(uuid: string): string {
  return getSkinUrl(uuid);
}

/**
 * Create an image element with fallback support
 */
export function createImageWithFallback(
  primaryUrl: string,
  fallbackUrl: string
): HTMLImageElement {
  const img = new Image();
  img.src = primaryUrl;
  img.onerror = () => {
    img.src = fallbackUrl;
  };
  return img;
}
