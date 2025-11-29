"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";
import { Card } from "../ui/Card";
import { Button } from "../ui/buttons/Button";

interface ServerInfo {
  name?: string;
  address?: string;
  icon_base64?: string;
  profileId?: string;
  profileName?: string;
  gameVersion?: string;
  loader?: string;
}

interface ServerPingInfo {
  description?: string; // raw § codes
  favicon_base64?: string;
  motd_html?: string;
  version_name?: string;
  players_online?: number;
  players_max?: number;
  ping?: number;
}

interface FeaturedServer {
  name: string;
  address: string;
}

// Minecraft MOTD formatter
const colorMap: Record<string, string> = {
  '0': '#000000', '1': '#0000AA', '2': '#00AA00', '3': '#00AAAA',
  '4': '#AA0000', '5': '#AA00AA', '6': '#FFAA00', '7': '#AAAAAA',
  '8': '#555555', '9': '#5555FF', 'a': '#55FF55', 'b': '#55FFFF',
  'c': '#FF5555', 'd': '#FF55FF', 'e': '#FFFF55', 'f': '#FFFFFF'
};

// Function to parse the complex MOTD structure from eu.mc-api.net
function parseMotdFromApi(description: any): string {
  if (!description) return '';
  
  // Handle the nested structure with text and extra arrays
  const extractText = (obj: any): string => {
    if (!obj) return '';
    
    let text = obj.text || '';
    
    if (obj.extra && Array.isArray(obj.extra)) {
      obj.extra.forEach((extra: any) => {
        text += extractText(extra);
      });
    }
    
    return text;
  };
  
  return extractText(description);
}

// Function to extract MOTD from different possible response formats
function extractMotd(data: any): string | null {
  // Try different possible MOTD locations
  if (data.description) {
    // Handle complex nested structure
    const rawMotd = parseMotdFromApi(data.description);
    if (rawMotd.trim()) return rawMotd;
  }
  
  // Handle simple string description
  if (typeof data.description === 'string' && data.description.trim()) {
    return data.description;
  }
  
  // Handle motd field (some APIs use this)
  if (data.motd) {
    if (typeof data.motd === 'string' && data.motd.trim()) {
      return data.motd;
    }
    if (data.motd?.raw && data.motd.raw.trim()) {
      return data.motd.raw;
    }
    if (data.motd?.html && Array.isArray(data.motd.html)) {
      return data.motd.html.join(' ');
    }
  }
  
  return null;
}

// Function to convert MOTD to simple white text
function motdToHtml(text: string): string {
  // Remove all Minecraft color codes and formatting
  let cleanText = text;
  
  // Remove color codes (§ followed by any character)
  cleanText = cleanText.replace(/§[0-9a-fk-or]/g, '');
  
  // Remove hex color codes (§x§R§R§G§G§B§B pattern)
  cleanText = cleanText.replace(/§x§[0-9a-f]§[0-9a-f]§[0-9a-f]§[0-9a-f]§[0-9a-f]§[0-9a-f]/g, '');
  
  // Remove alternative hex format (&#RRGGBB)
  cleanText = cleanText.replace(/&?#([0-9a-fA-F]{6})/g, '');
  
  // Strip gradient tags
  cleanText = cleanText.replace(/<\/?gradient[^>]*>/gi, '');
  
  // Convert line breaks to HTML
  cleanText = cleanText.replace(/\n/g, '<br/>');
  
  // Clean up extra spaces
  cleanText = cleanText.replace(/\s+/g, ' ').trim();
  
  // Wrap in white span
  return `<span style="color:#FFFFFF;">${cleanText}</span>`;
}

interface ServerSectionProps {
  className?: string;
}

export function ServerSection({ className }: ServerSectionProps) {
  const serverRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const accentColor = useThemeStore((state) => state.accentColor);
  const serverSectionWidth = useThemeStore((state) => state.newsSectionWidth); // Reuse the same width setting
  const setServerSectionWidth = useThemeStore((state) => state.setNewsSectionWidth);

  const [serverMode, setServerMode] = useState<'featured' | 'your'>('featured');
  const [userServers, setUserServers] = useState<ServerInfo[]>([]);
  const [serverDetails, setServerDetails] = useState<Record<string, ServerPingInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featuredServers, setFeaturedServers] = useState<FeaturedServer[]>([]);

  const loadUserServers = useCallback(async () => {
    try {
      setError(null);
      console.log("[ServerSection] Loading user servers from ALL profiles...");
      
      // Get all profiles
      const profilesResponse = await invoke('get_all_profiles_and_last_played') as any;
      console.log("[ServerSection] Raw profiles response:", profilesResponse);
      
      // Extract profiles array from the response
      const profiles = profilesResponse.all_profiles || [];
      
      console.log("[ServerSection] Extracted profiles:", profiles);
      
      // Check if profiles is an array and has items
      if (!Array.isArray(profiles) || profiles.length === 0) {
        console.log("[ServerSection] No profiles found, showing empty state");
        setUserServers([]);
        setIsLoading(false);
        return;
      }
      
      console.log("[ServerSection] Found profiles:", profiles.length);
      profiles.forEach((p: any, i: number) => {
        console.log(`[ServerSection] Profile ${i}:`, {
          id: p.id,
          name: p.name,
          game_version: p.game_version,
          loader: p.loader
        });
      });
      
      // Collect servers from ALL profiles
      const allServers: ServerInfo[] = [];
      
      for (const profile of profiles) {
        console.log("[ServerSection] Fetching servers for profile:", profile.id, profile.name);
        try {
          const fetched = await invoke('get_servers_for_profile', { profileId: profile.id });
          console.log(`[ServerSection] Raw server response for ${profile.name}:`, fetched);
          
          const raw = fetched as ServerInfo[];
          // Add profile info to each server
          const serversWithProfile = raw.map(server => ({
            ...server,
            profileId: profile.id,
            profileName: profile.name,
            gameVersion: profile.game_version,
            loader: profile.loader
          }));
          
          allServers.push(...serversWithProfile);
        } catch (e) {
          console.warn(`Failed to fetch servers for profile ${profile.name}:`, e);
        }
      }
      
      // Deduplicate servers by address
      const dedup: ServerInfo[] = [];
      const seen = new Set<string>();
      allServers.forEach(s => {
        if (!s.address) return;
        const key = s.address.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          dedup.push(s);
        }
      });
      
      console.log("[ServerSection] All processed servers:", dedup);
      setUserServers(dedup);

      // Fetch ping details for each server
      dedup.forEach(async (srv) => {
        if (!srv.address) return;
        let pingInfo: ServerPingInfo = {};
        try {
          pingInfo = (await invoke('ping_minecraft_server', { address: srv.address })) as ServerPingInfo;
        } catch (e) {
          console.warn('local ping failed', e);
        }
        // Fetch additional details from eu.mc-api.net
        try {
          const response = await fetch(`https://eu.mc-api.net/v3/server/ping/${srv.address}`);
          if (response.ok) {
            const data = await response.json();
            
            // Extract MOTD using the improved function
            const rawMotd = extractMotd(data);
            if (rawMotd) {
              pingInfo.motd_html = motdToHtml(rawMotd);
            }
            
            // Extract other server info
            if (data.version?.name) pingInfo.version_name = data.version.name;
            if (data.players?.online !== undefined) pingInfo.players_online = data.players.online;
            if (data.players?.max !== undefined) pingInfo.players_max = data.players.max;
            if (data.favicon_base64) pingInfo.favicon_base64 = data.favicon_base64.replace('data:image/png;base64,', '');
          }
        } catch (e) {
          console.warn('eu.mc-api.net fetch failed', e);
        }
        setServerDetails(prev => ({ ...prev, [srv.address!]: { ...prev[srv.address!], ...pingInfo } }));
      });
    } catch (err) {
      console.error("Failed to load user servers:", err);
      setError(err instanceof Error ? err.message : "Failed to load servers");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleServerConnect = async (server: ServerInfo | FeaturedServer) => {
  if (!server.address) return;
  
  if (serverMode === 'featured') {
    // For featured servers, launch the last played profile
    try {
      console.log(`Launching last played profile and connecting to featured server: ${server.address}`);
      
      // Get the last played profile ID
      const profilesResponse = await invoke('get_all_profiles_and_last_played') as any;
      const lastPlayedId = profilesResponse.last_played_profile_id;
      
      if (lastPlayedId) {
        await invoke('launch_profile', {
          id: lastPlayedId,
          quickPlayMultiplayer: server.address
        });
      } else {
        console.warn('No last played profile found');
      }
    } catch (e) {
      console.error('Failed to launch last played profile:', e);
    }
  } else if ('profileId' in server && server.profileId) {
    // For user servers, launch the specific profile
    console.log(`Launching profile ${server.profileName} (${server.profileId}) and connecting to ${server.address}`);
    try {
      await invoke('launch_profile', {
        id: server.profileId,
        quickPlayMultiplayer: server.address
      });
    } catch (e) {
      console.error('Failed to launch profile:', e);
    }
  }
};

  const loadFeaturedServers = useCallback(async () => {
    try {
      setError(null);
      console.log("[ServerSection] Loading featured servers from API...");
      
      // Fetch featured servers from Voxel Studios API
      const response = await fetch('https://api.voxelstudios.co.uk/api/v1/featured');
      if (!response.ok) {
        throw new Error(`Failed to fetch featured servers: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("[ServerSection] API response:", data);
      
      // Extract servers array from the nested response
      const serverList = data.servers || [];
      const count = data.count || 0;
      
      console.log(`[ServerSection] Found ${count} featured servers`);
      
      // Transform API data to our FeaturedServer format
      const servers: FeaturedServer[] = serverList.map((server: any) => ({
        name: server.name || 'Unknown Server',
        address: server.address || server.ip || ''
      })).filter((server: FeaturedServer) => server.address); // Filter out servers without addresses
      
      console.log("[ServerSection] Processed featured servers:", servers);
      setFeaturedServers(servers);
      
      // Load ping details for each server
      servers.forEach(async (server) => {
        let pingInfo: ServerPingInfo = {};
        try {
          const response = await fetch(`https://eu.mc-api.net/v3/server/ping/${server.address}`);
          if (response.ok) {
            const data = await response.json();
            
            // Extract MOTD using the improved function
            const rawMotd = extractMotd(data);
            if (rawMotd) {
              pingInfo.motd_html = motdToHtml(rawMotd);
            }
            
            // Extract other server info
            if (data.version?.name) pingInfo.version_name = data.version.name;
            if (data.players?.online !== undefined) pingInfo.players_online = data.players.online;
            if (data.players?.max !== undefined) pingInfo.players_max = data.players.max;
            if (data.favicon_base64) pingInfo.favicon_base64 = data.favicon_base64.replace('data:image/png;base64,', '');
          }
        } catch (e) {
          console.warn('eu.mc-api.net fetch failed for featured server', e);
        }
        setServerDetails(prev => ({ ...prev, [server.address]: { ...prev[server.address], ...pingInfo } }));
      });
    } catch (err) {
      console.error("Failed to load featured servers:", err);
      setError(err instanceof Error ? err.message : "Failed to load featured servers");
      // Fallback to empty array if API fails
      setFeaturedServers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(serverSectionWidth);
    e.preventDefault();
  }, [serverSectionWidth]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startX;
    const newWidth = Math.max(120, Math.min(500, startWidth - deltaX)); // Min 120px, Max 500px
    setServerSectionWidth(newWidth);
  }, [isResizing, startX, startWidth, setServerSectionWidth]);

  // Initial load
  useEffect(() => {
    if (serverMode === 'your') {
      loadUserServers();
    } else {
      loadFeaturedServers();
    }
  }, [serverMode, loadUserServers, loadFeaturedServers]);

  // Global mouse event listeners for resize functionality
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleResizeMove(e);
    const handleMouseUp = () => handleResizeEnd();

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-4">
          <Icon icon="solar:refresh-bold" className="w-6 h-6 animate-spin text-white" />
          <span className="ml-2 text-white font-minecraft text-xl">Loading servers...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center p-2">
          <Icon
            icon="streamline-cyber:server"
            className="w-8 h-8 text-white/50 mx-auto mb-2"
          />
          <p className="text-white/70">No servers available at the moment.</p>
        </div>
      );
    }

    const servers = serverMode === 'featured' ? featuredServers : userServers;
    
    if (servers.length === 0) {
      return (
        <div className="text-center p-2">
          <Icon
            icon="streamline-cyber:server"
            className="w-8 h-8 text-white/50 mx-auto mb-2"
          />
          <p className="text-white/70 text-4xl">
            {serverMode === 'featured' ? 'No featured servers available.' : 'No servers added to your profiles.'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {servers.map((server, index) => {
          const details = server.address ? serverDetails[server.address] : undefined;
          const iconSrc = details?.favicon_base64 ? `data:image/png;base64,${details.favicon_base64}` : undefined;
          
          return (
            <Card
              key={`${server.address || 'unknown'}-${index}`}
              variant="flat"
              className="group relative overflow-hidden p-3 bg-black/20 border border-accent-500/40 hover:border-accent-500/60 transition-all duration-200"
            >
              {/* Server Info - Full Width */}
              <div className="flex-1 min-w-0 group-hover:blur-sm transition-all duration-200">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-white font-minecraft-ten text-lg tracking-wide truncate normal-case">
                    {server.name || 'Unnamed Server'}
                  </h3>
                  
                  {details?.players_online !== undefined && details.players_max !== undefined && (
                    <div className="flex items-center space-x-1 text-xs text-white/70 font-minecraft-ten">
                      <Icon icon="solar:users-group-two-rounded-bold" className="w-3 h-3" />
                      <span>{details.players_online}/{details.players_max}</span>
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-white/60 font-minecraft-ten mb-2 truncate">
                  {serverMode === 'featured' ? server.address : ''}
                </div>
                
                {details && (() => {
                  const htmlColored = details.motd_html && /style=/.test(details.motd_html)
                    ? details.motd_html
                    : undefined;
                  const htmlOut = htmlColored ?? (details.description ? motdToHtml(details.description) : undefined);
                  if (!htmlOut) return null;
                  
                  // Clean up the HTML output for better display but preserve line breaks
                  const cleanedHtml = htmlOut
                    .replace(/<span[^>]*style="color:#FFFFFF;[^"]*"[^>]*>/g, '<span style="color:#FFFFFF;">')
                    .replace(/<span[^>]*style="color:#AAAAAA;[^"]*"[^>]*>/g, '<span style="color:#AAAAAA;">')
                    .replace(/\s+/g, ' ') // Only collapse multiple spaces, not line breaks
                    .trim();
                  
                  return (
                    <div
                      className="font-minecraft-ten text-xs leading-tight select-none pointer-events-none line-clamp-3 text-center"
                      dangerouslySetInnerHTML={{ __html: cleanedHtml }}
                    />
                  );
                })()}
              </div>
              
              {/* Connect button on hover */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleServerConnect(server)}
                icon={<Icon icon="solar:play-bold" className="w-4 h-4 mr-2" />}
                className="absolute inset-0 m-auto h-10 px-3 max-w-64 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center gap-1 text-xl leading-none"
                style={{ lineHeight: '0.8' }}
              >
                {serverMode === 'your' && 'profileName' in server 
                  ? `Connect with ${server.profileName}` 
                  : 'Connect'
                }
              </Button>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div
      ref={serverRef}
      className={cn("h-full flex flex-col !p-3 z-0 relative", className)}
      style={{
        width: `${serverSectionWidth}px`,
        borderLeft: `2px solid ${accentColor.value}60`,
        borderRight: `2px solid ${accentColor.value}60`,
        boxShadow: `0 0 15px ${accentColor.value}30 inset`,
      }}
    >
      {/* Resize handle */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize z-10",
          isResizing && "bg-white/20"
        )}
        style={{
          backgroundColor: isResizing ? `${accentColor.value}40` : 'transparent',
        }}
        onMouseDown={handleResizeStart}
      />
      
      <div className="pb-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon icon="streamline-cyber:server" className="w-7 h-7 text-white" />
            <h2 className="text-2xl font-minecraft lowercase text-white">SERVERS</h2>
          </div>
          
          {/* Mode toggle button */}
          <button
            onClick={() => setServerMode(serverMode === 'featured' ? 'your' : 'featured')}
            className={cn(
              "flex items-center gap-2 px-3 py-1 border rounded-sm text-xs font-minecraft-ten transition-colors",
              serverMode === 'featured'
                ? "bg-white/20 border-white/40 text-white"
                : "bg-black/30 border-white/20 text-white/60 hover:text-white hover:bg-white/10"
            )}
          >
            {serverMode === 'featured' ? 'Featured Servers' : 'Featured Servers'}
          </button>
        </div>
        <hr
          className="mt-2 border-t-2"
          style={{ borderColor: `${accentColor.value}40` }}
        />
      </div>
      
      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        {renderContent()}
      </div>
    </div>
  );
}
