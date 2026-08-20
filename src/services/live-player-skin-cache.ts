import { getSkinUrl } from "../lib/avatar-utils";
import {
  parseLiveSkinFromProfile,
  type PlayerSkinVariant,
} from "../lib/live-player-skin";
import type { MinecraftProfile } from "../types/minecraft";
import { MinecraftSkinService } from "./minecraft-skin-service";

export interface CachedLivePlayerSkin {
  profile: MinecraftProfile;
  textureUrl: string;
  variant: PlayerSkinVariant;
  skinId?: string;
}

const cache = new Map<string, CachedLivePlayerSkin>();
const inflight = new Map<string, Promise<CachedLivePlayerSkin>>();

function cacheKey(accountId: string, revision: number): string {
  return `${accountId}:${revision}`;
}

export function peekLivePlayerSkin(
  accountId: string,
  revision: number,
): CachedLivePlayerSkin | undefined {
  return cache.get(cacheKey(accountId, revision));
}

export function invalidateLivePlayerSkinCache(accountId?: string): void {
  if (!accountId) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.startsWith(`${accountId}:`)) {
      cache.delete(key);
    }
  }
}

export async function fetchLivePlayerSkin(
  accountId: string,
  revision: number,
  force = false,
): Promise<CachedLivePlayerSkin> {
  const key = cacheKey(accountId, revision);

  if (!force) {
    const hit = cache.get(key);
    if (hit) return hit;

    const pending = inflight.get(key);
    if (pending) return pending;
  }

  const task = (async () => {
    const profile = await MinecraftSkinService.getUserSkinData(accountId);
    const parsed = parseLiveSkinFromProfile(profile.properties);
    const entry: CachedLivePlayerSkin = {
      profile,
      textureUrl: getSkinUrl(accountId),
      variant: parsed.variant,
      skinId: parsed.skinId,
    };
    cache.set(key, entry);
    return entry;
  })();

  inflight.set(key, task);
  try {
    return await task;
  } finally {
    inflight.delete(key);
  }
}
