"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { parseMotdToHtml } from "../../../utils/motd-utils";
import { useThemeStore } from "../../../store/useThemeStore";
import { TagBadge } from "../../ui/TagBadge";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  LoadingState,
} from "../../ui-v2";
import { useProfileLaunch } from "../../../hooks/useProfileLaunch.tsx";
import { toast } from "react-hot-toast";
import { preloadIcons } from "../../../lib/icon-utils";
import type { ServerInfo, ServerPingInfo } from "../../../types/minecraft";
import type { Profile } from "../../../types/profile";
import * as WorldService from "../../../services/world-service";

const SERVERS_TAB_ICONS_TO_PRELOAD = [
  "solar:server-bold",
  "solar:users-group-rounded-bold",
  "solar:wifi-bold",
  "solar:tag-bold",
  "solar:login-3-bold",
  "solar:stop-bold",
  "solar:refresh-bold",
];

export interface ServersTabProps {
  profile: Profile;
  onRefresh?: () => void;
  isActive?: boolean;
  searchQuery?: string;
  onLaunchRequest?: (params: {
    profileId: string;
    quickPlaySingleplayer?: string;
    quickPlayMultiplayer?: string;
  }) => void;
}

export function ServersTab({
  profile,
  onRefresh,
  isActive = false,
  searchQuery = "",
}: ServersTabProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverPings, setServerPings] = useState<Record<string, ServerPingInfo>>({});
  const [pingingServers, setPingingServers] = useState<Set<string>>(new Set());
  const accentColor = useThemeStore((state) => state.accentColor);

  const effectiveSearchQuery = searchQuery || localSearchQuery;

  const { isLaunching, handleQuickPlayLaunch } = useProfileLaunch({
    profileId: profile.id,
    onLaunchSuccess: () => {
      console.log("Profile launched successfully from ServersTab:", profile.name);
    },
    onLaunchError: (launchError) => {
      console.error("Profile launch error from ServersTab:", launchError);
    },
  });

  useEffect(() => {
    preloadIcons(SERVERS_TAB_ICONS_TO_PRELOAD);
  }, []);

  useEffect(() => {
    if (searchQuery !== undefined) {
      setLocalSearchQuery(searchQuery);
    }
  }, [searchQuery]);

  useEffect(() => {
    setServers([]);
    setError(null);
    setServerPings({});
    setPingingServers(new Set());
  }, [profile.id]);

  const getServerDisplayName = useCallback((server: ServerInfo): string => {
    return server.name || server.address || "Unnamed Server";
  }, []);

  const getServerIconSrc = useCallback(
    (server: ServerInfo): string | null => {
      const pingInfo = server.address ? serverPings[server.address] : null;
      const iconData = pingInfo?.favicon_base64 || server.icon_base64;
      if (iconData) {
        return iconData.startsWith("data:image")
          ? iconData
          : `data:image/png;base64,${iconData}`;
      }
      return null;
    },
    [serverPings],
  );

  const pingAllServers = useCallback(async (serversToPing: ServerInfo[]) => {
    const relevantServers = serversToPing.filter((server) => server.address);
    if (relevantServers.length === 0) return;

    const currentPinging = new Set<string>(
      relevantServers.map((server) => server.address!),
    );
    setPingingServers(currentPinging);
    setServerPings((prev) => {
      const next = { ...prev };
      relevantServers.forEach((server) => {
        if (server.address) delete next[server.address];
      });
      return next;
    });

    await Promise.allSettled(
      relevantServers.map(async (server) => {
        const address = server.address!;
        try {
          const pingResult = await WorldService.pingMinecraftServer(address);
          setServerPings((prev) => ({ ...prev, [address]: pingResult }));
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          setServerPings((prev) => ({
            ...prev,
            [address]: {
              error: errorMsg,
              description: null,
              description_json: null,
              version_name: null,
              version_protocol: null,
              players_online: null,
              players_max: null,
              favicon_base64: null,
              latency_ms: null,
            },
          }));
        } finally {
          setPingingServers((prev) => {
            const next = new Set(prev);
            next.delete(address);
            return next;
          });
        }
      }),
    );
  }, []);

  const loadData = useCallback(async () => {
    const profileId = profile.id;
    if (!profileId || !isActive) {
      setServers([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setServerPings({});
    setPingingServers(new Set());

    try {
      const profileServers = await WorldService.getServersForProfile(profileId);

      if (profile.id !== profileId) {
        return;
      }

      setServers(profileServers);
      void pingAllServers(profileServers);
    } catch (err) {
      if (profile.id !== profileId) {
        return;
      }
      setServers([]);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (profile.id === profileId) {
        setLoading(false);
      }
    }
  }, [profile.id, isActive, pingAllServers]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleServerLaunch = useCallback(
    (server: ServerInfo) => {
      if (server.address) {
        toast.success(`Joining server: ${server.name || server.address}`);
        handleQuickPlayLaunch(undefined, server.address);
      } else {
        handleQuickPlayLaunch(undefined, undefined);
      }
    },
    [handleQuickPlayLaunch],
  );

  const handleRefresh = () => {
    void loadData();
    onRefresh?.();
  };

  const filteredServers = effectiveSearchQuery
    ? servers.filter((server) =>
        getServerDisplayName(server)
          .toLowerCase()
          .includes(effectiveSearchQuery.toLowerCase()),
      )
    : servers;

  const sortedServers = [...filteredServers].sort((a, b) =>
    getServerDisplayName(a).localeCompare(getServerDisplayName(b)),
  );

  const emptyTitle = effectiveSearchQuery
    ? "No servers match your search"
    : "No servers yet";
  const emptyDescription = effectiveSearchQuery
    ? "Try a different search term."
    : `Add servers in Minecraft while using "${profile.name}" to see them here.`;

  return (
    <div className="flex h-full flex-col select-none">
      <div className="mb-4 flex items-center gap-2">
        {!searchQuery && (
          <Input
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            placeholder="Search servers..."
            className="flex-1"
          />
        )}
        <IconButton
          size="md"
          onClick={handleRefresh}
          disabled={loading || pingingServers.size > 0}
          title="Refresh servers"
          aria-label="Refresh servers"
        >
          <Icon icon="solar:refresh-bold" className="h-4 w-4" />
        </IconButton>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {loading && <LoadingState message="Loading servers..." />}

        {!loading && error && <Alert tone="error">{error}</Alert>}

        {!loading && !error && sortedServers.length === 0 && (
          <EmptyState
            icon="solar:server-bold"
            title={emptyTitle}
            description={emptyDescription}
          />
        )}

        {!loading && !error && sortedServers.length > 0 && (
          <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto">
            {sortedServers.map((server) => {
              const key = server.address || server.name || getServerDisplayName(server);
              const pingInfo = server.address ? serverPings[server.address] : null;
              const isPinging = server.address ? pingingServers.has(server.address) : false;
              const hasPingError = !!pingInfo?.error;
              const itemDisplayName = getServerDisplayName(server);
              const serverIconSrc = getServerIconSrc(server);

              return (
                <Card key={key} className="flex items-center gap-4 p-3">
                  <div className="relative h-14 w-14 flex-shrink-0">
                    <div
                      className="absolute inset-0 overflow-hidden rounded-md border-2 border-b-4"
                      style={{
                        backgroundColor: `${accentColor.value}15`,
                        borderColor: `${accentColor.value}30`,
                        borderBottomColor: `${accentColor.value}50`,
                        boxShadow: `0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 ${accentColor.value}20`,
                      }}
                    >
                      {serverIconSrc ? (
                        <img
                          src={serverIconSrc}
                          alt={`${itemDisplayName} icon`}
                          className="image-pixelated h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Icon icon="solar:server-bold" className="h-10 w-10 text-white/50" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium text-white" title={itemDisplayName}>
                      {itemDisplayName}
                    </h3>
                    <div className="my-1 flex flex-grow items-center overflow-hidden">
                      <div
                        className="motd-container truncate text-center text-xs text-white/70"
                        title={pingInfo?.description || server.address || ""}
                      >
                        {isPinging ? (
                          <span className="italic text-white/50">Pinging...</span>
                        ) : hasPingError ? (
                          <span className="italic text-red-400">Error: {pingInfo?.error}</span>
                        ) : pingInfo ? (
                          <span
                            dangerouslySetInnerHTML={{
                              __html: parseMotdToHtml(
                                pingInfo.description_json || pingInfo.description,
                              ),
                            }}
                          />
                        ) : (
                          <span className="italic text-white/50">
                            {server.address || "Address missing"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 flex-wrap items-center gap-1">
                      {isPinging ? (
                        <TagBadge size="sm" variant="default">
                          Pinging...
                        </TagBadge>
                      ) : hasPingError ? (
                        <TagBadge size="sm" variant="destructive">
                          Error
                        </TagBadge>
                      ) : pingInfo ? (
                        <>
                          <TagBadge
                            size="sm"
                            variant={
                              pingInfo.players_online != null && pingInfo.players_online > 0
                                ? "success"
                                : "default"
                            }
                            iconElement={<Icon icon="solar:users-group-rounded-bold" />}
                          >
                            {pingInfo.players_online ?? "-"}/
                            {pingInfo.players_max ?? "-"}
                          </TagBadge>
                          <TagBadge
                            size="sm"
                            variant={
                              pingInfo.latency_ms != null && pingInfo.latency_ms <= 80
                                ? "success"
                                : pingInfo.latency_ms != null && pingInfo.latency_ms <= 150
                                  ? "default"
                                  : pingInfo.latency_ms != null && pingInfo.latency_ms <= 250
                                    ? "warning"
                                    : "destructive"
                            }
                            iconElement={<Icon icon="solar:wifi-bold" />}
                          >
                            {pingInfo.latency_ms ?? "-"} ms
                          </TagBadge>
                          {pingInfo.version_name && (
                            <TagBadge
                              size="sm"
                              variant="default"
                              iconElement={<Icon icon="solar:tag-bold" />}
                            >
                              {pingInfo.version_name}
                            </TagBadge>
                          )}
                        </>
                      ) : (
                        <TagBadge size="sm" variant="inactive">
                          Offline / Unknown
                        </TagBadge>
                      )}
                    </div>
                  </div>

                  <Button
                    variant={isLaunching ? "danger" : "primary"}
                    size="sm"
                    disabled={!server.address}
                    onClick={() => handleServerLaunch(server)}
                    icon={
                      <Icon
                        icon={isLaunching ? "solar:stop-bold" : "solar:login-3-bold"}
                        className="h-4 w-4"
                      />
                    }
                  >
                    {isLaunching ? "Stop" : "Join"}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
