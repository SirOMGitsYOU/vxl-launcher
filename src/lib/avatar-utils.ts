/**
 * Utility functions for generating avatar and skin URLs
 */

const VXL_AVATAR_HOST = 'https://avatar.vxl.to';

/**
 * Get avatar URL
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
  
  if (options?.overlay) {
    params.append('overlay', '');
  }
  if (options?.size) {
    params.append('size', options.size.toString());
  }
  
  const queryString = params.toString();
  const suffix = queryString ? `?${queryString}` : '';
  
  return `${VXL_AVATAR_HOST}/avatars/${cleanUuid}${suffix}`;
}

/**
 * Get avatar URL (same as primary since we only use VXL)
 * @param uuid - Minecraft player UUID (with or without hyphens)
 * @param options - Optional parameters for avatar customization
 * @returns Avatar URL string
 */
export function getFallbackAvatarUrl(
  uuid: string,
  options?: {
    overlay?: boolean;
    size?: number;
  }
): string {
  const cleanUuid = uuid.replace(/-/g, '');
  const params = new URLSearchParams();
  
  if (options?.overlay) {
    params.append('overlay', '');
  }
  if (options?.size) {
    params.append('size', options.size.toString());
  }
  
  const queryString = params.toString();
  const suffix = queryString ? `?${queryString}` : '';
  
  return `${VXL_AVATAR_HOST}/avatars/${cleanUuid}${suffix}`;
}

/**
 * Get skin URL
 * @param uuid - Minecraft player UUID (with or without hyphens)
 * @returns Skin URL string
 */
export function getSkinUrl(uuid: string): string {
  const cleanUuid = uuid.replace(/-/g, '');
  return `${VXL_AVATAR_HOST}/skins/${cleanUuid}`;
}

/**
 * Get skin URL (same as primary since we only use VXL)
 * @param uuid - Minecraft player UUID (with or without hyphens)
 * @returns Skin URL string
 */
export function getFallbackSkinUrl(uuid: string): string {
  const cleanUuid = uuid.replace(/-/g, '');
  return `${VXL_AVATAR_HOST}/skins/${cleanUuid}`;
}

/**
 * Create an image element with fallback support
 * @param primaryUrl - Primary image URL
 * @param fallbackUrl - Fallback image URL
 * @returns Image element with onerror handler
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
