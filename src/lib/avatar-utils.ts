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
