// Global cache for mod icons to prevent redundant API calls across component remounts
const modrinthIconCache = new Map<string, string | null>();
const curseforgeIconCache = new Map<string, string | null>();
const localIconCache = new Map<string, string | null>();

export const ModIconCache = {
  // Modrinth icon cache
  getModrinthIcon: (projectId: string): string | null | undefined => {
    return modrinthIconCache.get(projectId);
  },

  setModrinthIcon: (projectId: string, iconUrl: string | null) => {
    modrinthIconCache.set(projectId, iconUrl);
  },

  hasModrinthIcon: (projectId: string): boolean => {
    return modrinthIconCache.has(projectId);
  },

  getModrinthIcons: (projectIds: string[]): Record<string, string | null> => {
    const result: Record<string, string | null> = {};
    projectIds.forEach(id => {
      if (modrinthIconCache.has(id)) {
        result[id] = modrinthIconCache.get(id) || null;
      }
    });
    return result;
  },

  // CurseForge icon cache
  getCurseforgeIcon: (projectId: string): string | null | undefined => {
    return curseforgeIconCache.get(projectId);
  },

  setCurseforgeIcon: (projectId: string, iconUrl: string | null) => {
    curseforgeIconCache.set(projectId, iconUrl);
  },

  hasCurseforgeIcon: (projectId: string): boolean => {
    return curseforgeIconCache.has(projectId);
  },

  getCurseforgeIcons: (projectIds: string[]): Record<string, string | null> => {
    const result: Record<string, string | null> = {};
    projectIds.forEach(id => {
      if (curseforgeIconCache.has(id)) {
        result[id] = curseforgeIconCache.get(id) || null;
      }
    });
    return result;
  },

  // Local icon cache
  getLocalIcon: (path: string): string | null | undefined => {
    return localIconCache.get(path);
  },

  setLocalIcon: (path: string, iconData: string | null) => {
    localIconCache.set(path, iconData);
  },

  hasLocalIcon: (path: string): boolean => {
    return localIconCache.has(path);
  },

  getLocalIcons: (paths: string[]): Record<string, string | null> => {
    const result: Record<string, string | null> = {};
    paths.forEach(path => {
      if (localIconCache.has(path)) {
        result[path] = localIconCache.get(path) || null;
      }
    });
    return result;
  },

  // Clear cache (useful for testing or manual refresh)
  clearModrinthCache: () => {
    modrinthIconCache.clear();
  },

  clearCurseforgeCache: () => {
    curseforgeIconCache.clear();
  },

  clearLocalCache: () => {
    localIconCache.clear();
  },

  clearAll: () => {
    modrinthIconCache.clear();
    curseforgeIconCache.clear();
    localIconCache.clear();
  },
};
