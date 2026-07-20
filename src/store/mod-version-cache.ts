import type { UnifiedVersion, ModPlatform } from "../types/unified";

function buildVersionCacheKey(
  source: ModPlatform,
  projectId: string,
  gameVersion?: string,
  loaders?: string[],
): string {
  const loaderKey = loaders?.length ? loaders.slice().sort().join(",") : "";
  return `${source}:${projectId}:${gameVersion ?? ""}:${loaderKey}`;
}

const versionListCache = new Map<string, UnifiedVersion[]>();

export const ModVersionCache = {
  get: (
    source: ModPlatform,
    projectId: string,
    gameVersion?: string,
    loaders?: string[],
  ): UnifiedVersion[] | undefined => {
    return versionListCache.get(buildVersionCacheKey(source, projectId, gameVersion, loaders));
  },

  set: (
    source: ModPlatform,
    projectId: string,
    gameVersion: string | undefined,
    loaders: string[] | undefined,
    versions: UnifiedVersion[],
  ) => {
    versionListCache.set(
      buildVersionCacheKey(source, projectId, gameVersion, loaders),
      versions,
    );
  },

  has: (
    source: ModPlatform,
    projectId: string,
    gameVersion?: string,
    loaders?: string[],
  ): boolean => {
    return versionListCache.has(buildVersionCacheKey(source, projectId, gameVersion, loaders));
  },

  clear: () => {
    versionListCache.clear();
  },
};
