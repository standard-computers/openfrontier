import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameWorld, Resource, Sovereignty, Market, NPC, Area, Position, TileType, generateMap, createEmptyInventory, addToInventory, USER_COLORS, STARTING_COINS, calculateTileValue, WorldMap, TILE_TYPES, generateNPCs, generateStrangers, calculateStrangerCount, Stranger, canAddResourceToTile, isLargeResource, isAdjacentToOwnedLand, ownsAnyTile } from '@/types/game';
import type { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { normalizeNpcAggression, type NpcAggression } from '@/lib/npcAggression';
import { readCitizenSnapshot } from '@/lib/citizenPersistence';
import { makeAreaCapital } from '@/lib/sovereigntyCapital';
import { useCitizenPersistence } from './useCitizenPersistence';
import { createWorldResourceWriter } from '@/lib/worldResourcePersistence';
import { fireProjectile, type ProjectileShot } from '@/lib/projectiles';
import { fetchWorldResources, addResourceToRepository, updateResourceInRepository, deleteResourceFromRepository } from '@/utils/resourceConverter';

// Hook version marker for HMR compatibility

const getDefaultWorld = (): GameWorld => {
  const resources: Resource[] = [];
  const map = generateMap(80, 50, resources);
  
  return {
    id: 'world-default',
    name: 'My World',
    map,
    resources,
    inventory: createEmptyInventory(),
    playerPosition: { ...map.spawnPoint },
    userId: 'player-1',
    userColor: USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)],
    coins: STARTING_COINS,
    createdAt: new Date().toISOString(),
    xp: 0,
    enableMarkets: true,
    openMarkets: true,
    markets: [],
  };
};

export interface WorldMember {
  id: string;
  userId: string;
  username: string;
  role: 'owner' | 'player';
  joinedAt: string;
}

export interface MemberSovereignty {
  userId: string;
  username: string;
  name: string;
  flag: string;
  motto: string;
  foundedAt: number;
  color: string;
  home?: Position;
  openBorders?: boolean;
  allowOutsiderGathering?: boolean;
  taxRate?: number;
}

const MAP_SAVE_INTERVAL_MS = 3000;

export const useGameWorld = () => {
  const [world, setWorld] = useState<GameWorld>(getDefaultWorld);
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);
  const [projectileShot, setProjectileShot] = useState<ProjectileShot | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [members, setMembers] = useState<WorldMember[]>([]);
  const [worldSovereignties, setWorldSovereignties] = useState<MemberSovereignty[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbWorldId, setDbWorldId] = useState<string | null>(null);
  const [citizenRevision, setCitizenRevision] = useState<number | null>(null);
  const [taxPolicies, setTaxPolicies] = useState<Record<string, number>>({});
  const tradeCoinsRef = useRef(0);
  const npcTradeCoinsRef = useRef<Record<string, number>>({});

  // Load world from database
  useEffect(() => {
    const loadWorld = async () => {
      const worldId = localStorage.getItem('currentWorldId');
      if (!worldId) {
        setLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch world data
        const { data: worldData, error: worldError } = await supabase
          .from('worlds')
          .select('*')
          .eq('id', worldId)
          .single();

        if (worldError) throw worldError;

        // Fetch membership data
        const { data: membershipData, error: memberError } = await supabase
          .from('world_members')
          .select('*')
          .eq('world_id', worldId)
          .eq('user_id', user.id)
          .single();

        if (memberError) throw memberError;

        // Fetch all members using the security definer function
        const { data: allMembers, error: membersError } = await supabase
          .rpc('get_world_members', { _world_id: worldId });

        if (!membersError && allMembers) {
          const membersWithNames: WorldMember[] = allMembers.map((m: any) => ({
            id: m.id,
            userId: m.user_id,
            username: m.username || 'Unknown',
            role: m.role as 'owner' | 'player',
            joinedAt: m.joined_at,
          }));

          setMembers(membersWithNames);
        }

        // Fetch every member's sovereignty so the world view can list them
        const { data: sovRows, error: sovError } = await supabase
          .rpc('get_world_sovereignties_with_home', { _world_id: worldId });

        if (!sovError && sovRows) {
          setWorldSovereignties((sovRows as any[]).map((s: any) => ({
            userId: s.user_id,
            username: s.username || 'Unknown',
            name: s.sovereignty_name,
            flag: s.sovereignty_flag || '🏴',
            motto: s.sovereignty_motto || '',
            foundedAt: Number(s.sovereignty_founded_at) || 0,
            color: s.user_color || '#888888',
            home: s.home,
            openBorders: !!s.open_borders,
            allowOutsiderGathering: !!s.allow_outsider_gathering,
          })));
        }

        const playerData = membershipData.player_data as unknown as {
          position?: { x: number; y: number };
          inventory?: { resourceId: string | null; quantity: number }[];
          coins?: number;
          userColor?: string;
          sovereignty?: Sovereignty;
          areas?: Area[];
          xp?: number;
        };

        const mapData = worldData.map_data as unknown as WorldMap;
        tradeCoinsRef.current = membershipData.land_trade_coins ?? 0;
        // Fetch resources from repository using resource_ids
        const resourceIds = (worldData as any).resource_ids as string[] || [];
        const resources = await fetchWorldResources(resourceIds);

        setDbWorldId(worldId);
        setIsOwner(membershipData.role === 'owner');
        // Normalize inventory to ensure proper structure (null vs undefined)
        const loadedInventory = playerData.inventory || createEmptyInventory();
        const normalizedInventory = loadedInventory.map(slot => ({
          resourceId: slot.resourceId ?? null,
          quantity: slot.quantity ?? 0
        }));
        // Ensure we have at least 30 slots
        while (normalizedInventory.length < 30) {
          normalizedInventory.push({ resourceId: null, quantity: 0 });
        }

        // Calculate XP based on game days since creation
        const createdAt = new Date(worldData.created_at).getTime();
        const elapsedMs = Date.now() - createdAt;
        const gameDays = Math.floor(elapsedMs / 3600000); // 1 real hour = 1 game day
        const calculatedXp = Math.max(playerData.xp ?? 0, gameDays);

        const enableNpcs = (worldData as any).enable_npcs ?? false;
        const npcCount = (worldData as any).npc_count ?? 0;
        // Strangers are always on; population is auto-calculated from world size
        const enableStrangers = true;
        const strangerDensity = calculateStrangerCount(mapData.width, mapData.height);
        
        // Generate NPCs if enabled
        const npcs = enableNpcs && npcCount > 0 
          ? generateNPCs(npcCount, mapData)
          : [];
        npcTradeCoinsRef.current = (worldData.npc_land_trade_coins ?? {}) as Record<string, number>;
        for (const npc of npcs) npc.coins += npcTradeCoinsRef.current[npc.id] ?? 0;
        const { data: taxData } = await supabase.rpc('get_world_tax_policies', { _world_id: worldId });
        const rates = (taxData ?? {}) as Record<string, number>;
        setTaxPolicies(rates);
        for (const npc of npcs) npc.sovereignty.taxRate = rates[npc.id] ?? 10;

        // Load the complete population. Seed only a world that has never saved citizens.
        const { data: citizenData, error: citizenError } = await supabase.rpc('get_world_citizens', { _world_id: worldId });
        if (citizenError) throw citizenError;
        let citizenSnapshot = readCitizenSnapshot(citizenData);
        if (citizenSnapshot.strangers === null) {
          const { data: seededData, error: seedError } = await supabase.rpc('save_world_citizens', {
            _world_id: worldId,
            _revision: citizenSnapshot.revision,
            _strangers: JSON.parse(JSON.stringify(generateStrangers(strangerDensity, mapData))) as Json,
          });
          if (seedError) throw seedError;
          citizenSnapshot = readCitizenSnapshot(seededData);
        }
        const strangers = citizenSnapshot.strangers ?? [];
        setCitizenRevision(citizenSnapshot.revision);

        // Third-person mode: the player's spawn point is their claimed territory.
        // If the player has no claimed tiles yet, claim the spawn tile for free.
        const spawnPos = playerData.sovereignty?.home || playerData.position || mapData.spawnPoint || { x: 0, y: 0 };
        const hasClaimedTile = mapData.tiles.some(row => row.some(t => t.claimedBy === user.id));
        const spawnTile = mapData.tiles[spawnPos.y]?.[spawnPos.x];
        let claimedSpawn = false;
        if (!hasClaimedTile && spawnTile && !spawnTile.claimedBy) {
          spawnTile.claimedBy = user.id;
          claimedSpawn = true;
        }

        setWorld({
          id: worldId,
          name: worldData.name,
          map: mapData,
          resources: resources,
          inventory: normalizedInventory,
          playerPosition: spawnPos,
          userId: user.id,
          userColor: playerData.userColor || USER_COLORS[0],
          coins: (playerData.coins ?? STARTING_COINS) + tradeCoinsRef.current,
          sovereignty: playerData.sovereignty,
          areas: playerData.areas ?? [],
          createdAt: worldData.created_at,
          xp: calculatedXp,
          joinCode: worldData.join_code,
          enableMarkets: worldData.enable_markets ?? false,
          openMarkets: (worldData as any).open_markets ?? true,
          markets: (worldData.markets as unknown as Market[]) ?? [],
          enableNpcs,
          npcCount,
          npcAggression: normalizeNpcAggression(worldData.npc_aggression),
          npcs,
          enableStrangers,
          strangerDensity,
          strangers,
        });

        // Persist the spawn territory claim
        if (claimedSpawn) {
          await supabase
            .from('worlds')
            .update({ map_data: JSON.parse(JSON.stringify(mapData)) as Json })
            .eq('id', worldId);
        }
      } catch (error) {
        console.error('Error loading world:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWorld();
  }, []);

  // Save player data to database when it changes
  useEffect(() => {
    if (!dbWorldId || loading) return;
    const tradeCoinsAtSnapshot = tradeCoinsRef.current;

    const savePlayerData = async () => {
      const user = (await supabase.auth.getSession()).data.session?.user;
      if (!user) return;

      const playerData = {
        position: world.playerPosition,
        inventory: world.inventory,
        coins: world.coins - tradeCoinsAtSnapshot,
        userColor: world.userColor,
        sovereignty: world.sovereignty,
        areas: world.areas,
        xp: world.xp,
      };

      await supabase
        .from('world_members')
        .update({ player_data: JSON.parse(JSON.stringify(playerData)) as Json })
        .eq('world_id', dbWorldId)
        .eq('user_id', user.id);
    };

    const timeoutId = setTimeout(savePlayerData, 2000);
    return () => clearTimeout(timeoutId);
  }, [dbWorldId, world.playerPosition, world.inventory, world.coins, world.userColor, world.sovereignty, world.areas, world.xp, loading]);

  // XP gain: +1 XP per game day (1 real hour)
  useEffect(() => {
    if (!world.createdAt || loading) return;

    const updateXp = () => {
      const createdAt = new Date(world.createdAt).getTime();
      const now = Date.now();
      const gameDays = Math.floor((now - createdAt) / 3600000); // 1 real hour = 1 game day
      
      setWorld(prev => {
        if (gameDays > prev.xp) {
          return { ...prev, xp: gameDays };
        }
        return prev;
      });
    };

    updateXp();
    // Check every real hour (1 game day)
    const interval = setInterval(updateXp, 3600000);
    return () => clearInterval(interval);
  }, [world.createdAt, loading]);

  // Save world map data - all members can save map changes (for tile claiming)
  const refreshTileNegotiations = useCallback(async () => {
    if (!dbWorldId) return;
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    const [{ data }, { data: worldData }, { data: taxData }] = await Promise.all([
      supabase.from('world_members').select('land_trade_coins').eq('world_id', dbWorldId).eq('user_id', user.id).single(),
      supabase.from('worlds').select('npc_land_trade_coins').eq('id', dbWorldId).single(),
      supabase.rpc('get_world_tax_policies', { _world_id: dbWorldId }),
    ]);
    if (taxData) setTaxPolicies(taxData as Record<string, number>);
    if (data) {
      const delta = data.land_trade_coins - tradeCoinsRef.current;
      tradeCoinsRef.current = data.land_trade_coins;
      if (delta) setWorld(prev => ({ ...prev, coins: prev.coins + delta }));
    }
    if (worldData) {
      const balances = (worldData.npc_land_trade_coins ?? {}) as Record<string, number>;
      const previous = npcTradeCoinsRef.current;
      npcTradeCoinsRef.current = balances;
      setWorld(prev => ({ ...prev, npcs: prev.npcs.map(npc => ({ ...npc, coins: npc.coins + (balances[npc.id] ?? 0) - (previous[npc.id] ?? 0) })) }));
    }
  }, [dbWorldId]);

  useCitizenPersistence(loading ? null : dbWorldId, world.strangers, citizenRevision, setWorld, refreshTileNegotiations);

  const updateNpcTaxRate = useCallback(async (npcId: string, taxRate: number) => {
    if (!isOwner || !dbWorldId || !/^npc-\d+$/.test(npcId) || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) return;
    const { data, error: readError } = await supabase.from('worlds').select('npc_tax_rates').eq('id', dbWorldId).single();
    if (readError) { toast.error('Could not save NPC tax rate'); return; }
    const rates = { ...(data.npc_tax_rates as Record<string, number>), [npcId]: taxRate };
    const { error } = await supabase.from('worlds').update({ npc_tax_rates: rates }).eq('id', dbWorldId);
    if (error) { toast.error('Could not save NPC tax rate'); return; }
    setTaxPolicies(prev => ({ ...prev, [npcId]: taxRate }));
    setWorld(prev => ({ ...prev, npcs: prev.npcs?.map(npc => npc.id === npcId ? { ...npc, sovereignty: { ...npc.sovereignty, taxRate } } : npc) }));
  }, [isOwner, dbWorldId]);

  // Map saves are coalesced: many callers (player, NPCs, strangers) request saves,
  // but at most one full map write is sent per MAP_SAVE_INTERVAL_MS, always with the latest map.
  const pendingMapRef = useRef<WorldMap | null>(null);
  const mapSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapSaveInFlightRef = useRef(false);
  const flushMapSave = useCallback(async () => {
    mapSaveTimerRef.current = null;
    if (!dbWorldId || !pendingMapRef.current) return;
    if (mapSaveInFlightRef.current) {
      mapSaveTimerRef.current = setTimeout(() => void flushMapSave(), MAP_SAVE_INTERVAL_MS);
      return;
    }
    const map = pendingMapRef.current;
    pendingMapRef.current = null;
    mapSaveInFlightRef.current = true;
    try {
      await supabase.from('worlds').update({ map_data: JSON.parse(JSON.stringify(map)) as Json }).eq('id', dbWorldId);
    } finally {
      mapSaveInFlightRef.current = false;
    }
  }, [dbWorldId]);
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && pendingMapRef.current) {
        if (mapSaveTimerRef.current) clearTimeout(mapSaveTimerRef.current);
        void flushMapSave();
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      if (mapSaveTimerRef.current) clearTimeout(mapSaveTimerRef.current);
      if (pendingMapRef.current) void flushMapSave();
    };
  }, [flushMapSave]);

  const saveMapData = useCallback(async (mapData?: WorldMap) => {
    if (!dbWorldId) return;
    pendingMapRef.current = mapData || world.map;
    if (!mapSaveTimerRef.current) {
      mapSaveTimerRef.current = setTimeout(() => void flushMapSave(), MAP_SAVE_INTERVAL_MS);
    }
  }, [dbWorldId, world.map, flushMapSave]);

  const resourceWriter = useMemo(() => createWorldResourceWriter(async () => {
    if (!dbWorldId || !isOwner) throw new Error('Only the world owner can add resources');
    const { data, error } = await supabase.from('worlds').select('resource_ids').eq('id', dbWorldId).single();
    if (error) throw error;
    return data.resource_ids;
  }, async ids => {
    if (!dbWorldId || !isOwner) throw new Error('Only the world owner can add resources');
    const { error } = await supabase.from('worlds').update({ resource_ids: ids }).eq('id', dbWorldId).select('id').single();
    if (error) throw error;
  }), [dbWorldId, isOwner]);

  // Name saves must not overwrite resource references from an earlier render.
  const saveWorldData = useCallback(async (overrideName?: string) => {
    if (!dbWorldId || !isOwner) return;

    await supabase
      .from('worlds')
      .update({
        name: overrideName ?? world.name,
      })
      .eq('id', dbWorldId);
  }, [dbWorldId, isOwner, world.name]);

  const movePlayer = useCallback((dx: number, dy: number) => {
    setWorld(prev => {
      const newX = prev.playerPosition.x + dx;
      const newY = prev.playerPosition.y + dy;
      
      if (newX < 0 || newX >= prev.map.width || newY < 0 || newY >= prev.map.height) return prev;
      
      const targetTile = prev.map.tiles[newY][newX];
      // Check walkability from TILE_TYPES (source of truth) instead of stored tile data
      const tileTypeInfo = TILE_TYPES.find(t => t.type === targetTile.type);
      const isWalkable = tileTypeInfo?.walkable ?? targetTile.walkable;
      
      if (!isWalkable) return prev;
      
      // Check if any non-passable resources are on the target tile
      const allResources = [...(targetTile.resources || []), ...(targetTile.placedResources || [])];
      if (allResources.length > 0) {
        const hasBlockingResource = allResources.some(resourceName => {
          const resourceDef = prev.resources.find(r => r.name === resourceName);
          // If resource definition exists and passable is explicitly false, block movement
          return resourceDef && resourceDef.passable === false;
        });
        if (hasBlockingResource) return prev;
      }
      
      return { ...prev, playerPosition: { x: newX, y: newY } };
    });
  }, []);

  const selectTile = useCallback((x: number, y: number) => {
    setSelectedTile(prev => 
      prev?.x === x && prev?.y === y ? null : { x, y }
    );
  }, []);

  const claimTile = useCallback((x: number, y: number): { success: boolean; message: string } => {
    const currentWorld = world;
    const tile = currentWorld.map.tiles[y][x];
    
    if (tile.claimedBy) {
      return { success: false, message: 'Tile already claimed' };
    }
    
    if (ownsAnyTile(currentWorld.map.tiles, currentWorld.userId) &&
        !isAdjacentToOwnedLand(currentWorld.map.tiles, x, y, currentWorld.userId)) {
      return { success: false, message: 'Land must border land you already own' };
    }
    
    const tileValue = calculateTileValue(tile, currentWorld.resources);
    
    if (currentWorld.coins < tileValue) {
      return { success: false, message: `Not enough coins! Need ${tileValue} coins` };
    }
    
    const tileResources = [...tile.resources];
    
    // Compute new tiles
    const newTiles = currentWorld.map.tiles.map((row, ry) =>
      row.map((t, rx) =>
        rx === x && ry === y ? { ...t, claimedBy: currentWorld.userId, resources: [] } : t
      )
    );
    const newMapData: WorldMap = { ...currentWorld.map, tiles: newTiles };
    
    // Apply state update - compute inventory inside setWorld for accurate prev state
    setWorld(prev => {
      let newInventory = [...prev.inventory];
      for (const resourceId of tileResources) {
        addToInventory(newInventory, resourceId);
      }
      return {
        ...prev,
        coins: prev.coins - tileValue,
        inventory: newInventory,
        map: newMapData,
      };
    });

    // Save map changes
    setTimeout(() => saveMapData(newMapData), 500);
    
    return { success: true, message: `Claimed for ${tileValue} coins!` };
  }, [world, saveMapData]);

  const claimMultipleTiles = useCallback((positions: { x: number; y: number }[]): { success: boolean; message: string; claimedCount: number; totalCost: number } => {
    // Calculate total cost and validate all tiles upfront
    let totalCost = 0;
    const validPositions: { x: number; y: number; tileValue: number; resources: string[] }[] = [];
    
    const hasLand = ownsAnyTile(world.map.tiles, world.userId);
    const pending = positions.filter(pos => {
      const tile = world.map.tiles[pos.y]?.[pos.x];
      return !!tile && !tile.claimedBy;
    });

    // Grow outward from existing owned land so every claim touches owned land
    const accepted: { x: number; y: number }[] = [];
    let remaining = [...pending];
    let progress = true;
    while (progress && remaining.length > 0) {
      progress = false;
      const next: { x: number; y: number }[] = [];
      for (const pos of remaining) {
        const ok = (!hasLand && accepted.length === 0) ||
          isAdjacentToOwnedLand(world.map.tiles, pos.x, pos.y, world.userId, accepted);
        if (ok) {
          accepted.push(pos);
          progress = true;
        } else {
          next.push(pos);
        }
      }
      remaining = next;
    }

    for (const pos of accepted) {
      const tile = world.map.tiles[pos.y][pos.x];
      const tileValue = calculateTileValue(tile, world.resources);
      totalCost += tileValue;
      validPositions.push({ x: pos.x, y: pos.y, tileValue, resources: [...tile.resources] });
    }
    
    if (validPositions.length === 0) {
      return { success: false, message: 'Land must border land you already own', claimedCount: 0, totalCost: 0 };
    }
    
    if (world.coins < totalCost) {
      return { success: false, message: `Not enough coins! Need ${totalCost} coins`, claimedCount: 0, totalCost };
    }
    
    // Build new map with all tiles claimed at once
    const newTiles = world.map.tiles.map((row, ry) =>
      row.map((t, rx) => {
        const found = validPositions.find(p => p.x === rx && p.y === ry);
        if (found) {
          return { ...t, claimedBy: world.userId, resources: [] };
        }
        return t;
      })
    );
    const newMapData: WorldMap = { ...world.map, tiles: newTiles };
    
    // Collect all resources from claimed tiles
    const allResources: string[] = [];
    for (const pos of validPositions) {
      allResources.push(...pos.resources);
    }
    
    // Apply state update atomically
    setWorld(prev => {
      let newInventory = [...prev.inventory];
      for (const resourceId of allResources) {
        addToInventory(newInventory, resourceId);
      }
      return {
        ...prev,
        coins: prev.coins - totalCost,
        inventory: newInventory,
        map: newMapData,
      };
    });

    // Save map changes
    setTimeout(() => saveMapData(newMapData), 500);
    
    return { 
      success: true, 
      message: `Claimed ${validPositions.length} tiles for ${totalCost} coins!`,
      claimedCount: validPositions.length,
      totalCost
    };
  }, [world, saveMapData]);

  // Convert owned tiles to a new tile type for a per-tile coin cost
  const convertTiles = useCallback((positions: { x: number; y: number }[], newType: TileType): { success: boolean; message: string; convertedCount: number; totalCost: number } => {
    const typeInfo = TILE_TYPES.find(t => t.type === newType);
    if (!typeInfo) {
      return { success: false, message: 'Unknown tile type', convertedCount: 0, totalCost: 0 };
    }

    const eligible: Position[] = [];
    for (const pos of positions) {
      const tile = world.map.tiles[pos.y]?.[pos.x];
      if (tile && tile.claimedBy === world.userId && tile.type !== newType) {
        eligible.push(pos);
      }
    }

    if (eligible.length === 0) {
      return { success: false, message: 'No owned tiles to convert', convertedCount: 0, totalCost: 0 };
    }

    const totalCost = eligible.length * typeInfo.baseValue;
    if (world.coins < totalCost) {
      return { success: false, message: `Not enough coins! Need ${totalCost} coins`, convertedCount: 0, totalCost };
    }

    const targetSet = new Set(eligible.map(p => `${p.x},${p.y}`));
    const newTiles = world.map.tiles.map((row, ry) => {
      if (!eligible.some(p => p.y === ry)) return row;
      return row.map((t, rx) =>
        targetSet.has(`${rx},${ry}`) ? { ...t, type: newType, walkable: typeInfo.walkable } : t
      );
    });
    const newMapData: WorldMap = { ...world.map, tiles: newTiles };

    setWorld(prev => ({
      ...prev,
      coins: prev.coins - totalCost,
      map: newMapData,
    }));

    setTimeout(() => saveMapData(newMapData), 500);

    return {
      success: true,
      message: eligible.length === 1
        ? `Converted tile to ${typeInfo.label} for ${totalCost} coins!`
        : `Converted ${eligible.length} tiles to ${typeInfo.label} for ${totalCost} coins!`,
      convertedCount: eligible.length,
      totalCost,
    };
  }, [world, saveMapData]);

  // Sovereignty policy: owners may open their land to outside gatherers.
  const isOutsiderGatheringAllowed = useCallback((ownerId: string) =>
    worldSovereignties.find(s => s.userId === ownerId)?.allowOutsiderGathering ?? false
  , [worldSovereignties]);

  const gatherFromTile = useCallback((x: number, y: number, resourceId: string) => {
    const currentWorld = world;
    const tile = currentWorld.map.tiles[y][x];

    if (!tile.resources.includes(resourceId)) return;
    if (tile.claimedBy && tile.claimedBy !== currentWorld.userId && !isOutsiderGatheringAllowed(tile.claimedBy)) return;
    
    // Placed resources can only be recovered from owned land.
    if (tile.placedResources?.includes(resourceId) && tile.claimedBy !== currentWorld.userId) {
      toast.error('Claim this tile to gather placed items.');
      return;
    }
    
    const newTiles = currentWorld.map.tiles.map((row, ry) =>
      row.map((t, rx) =>
        rx === x && ry === y
          ? {
              ...t,
              resources: t.resources.filter(r => r !== resourceId),
              placedResources: t.placedResources?.filter(r => r !== resourceId),
              resourceLife: t.resourceLife ? Object.fromEntries(Object.entries(t.resourceLife).filter(([id]) => id !== resourceId)) : undefined,
            }
          : t
      )
    );
    const newMapData: WorldMap = { ...currentWorld.map, tiles: newTiles };
    
    // Compute inventory inside setWorld for accurate prev state
    setWorld(prev => {
      const newInventory = [...prev.inventory];
      addToInventory(newInventory, resourceId);

      return {
        ...prev,
        inventory: newInventory,
        map: newMapData,
      };
    });

    setTimeout(() => saveMapData(newMapData), 500);
  }, [world, saveMapData, isOutsiderGatheringAllowed]);

  // Gather a batch of resources in one pass (used by "Gather All" on a selection).
  // Doing it in a single update keeps sequential gathers from reverting each other.
  const gatherManyFromTiles = useCallback((targets: { x: number; y: number; resourceId: string }[]) => {
    const currentWorld = world;
    const inventory = [...currentWorld.inventory];
    const picked: { x: number; y: number; resourceId: string }[] = [];

    for (const target of targets) {
      const tile = currentWorld.map.tiles[target.y]?.[target.x];
      if (!tile) continue;
      if (!tile.resources.includes(target.resourceId)) continue;
      if (tile.claimedBy && tile.claimedBy !== currentWorld.userId && !isOutsiderGatheringAllowed(tile.claimedBy)) continue;
      if (tile.placedResources?.includes(target.resourceId) && tile.claimedBy !== currentWorld.userId) continue;

      addToInventory(inventory, target.resourceId);
      picked.push(target);
    }

    if (picked.length === 0) return 0;

    const removeKeys = new Set(picked.map(t => `${t.x},${t.y},${t.resourceId}`));
    const newTiles = currentWorld.map.tiles.map((row, ry) =>
      row.map((t, rx) => {
        if (t.resources.length === 0) return t;
        const resources = t.resources.filter(rid => !removeKeys.has(`${rx},${ry},${rid}`));
        return resources.length === t.resources.length ? t : {
          ...t,
          resources,
          placedResources: t.placedResources?.filter(rid => !removeKeys.has(`${rx},${ry},${rid}`)),
          resourceLife: t.resourceLife ? Object.fromEntries(Object.entries(t.resourceLife).filter(([rid]) => !removeKeys.has(`${rx},${ry},${rid}`))) : undefined,
        };
      })
    );
    const newMapData: WorldMap = { ...currentWorld.map, tiles: newTiles };

    setWorld(prev => ({ ...prev, inventory, map: newMapData }));
    setTimeout(() => saveMapData(newMapData), 500);

    return picked.length;
  }, [world, saveMapData, isOutsiderGatheringAllowed]);

  const addExistingResources = useCallback(async (resources: Resource[]) => {
    await resourceWriter.add(resources.map(resource => resource.id));
    setWorld(prev => {
      const ids = new Set(prev.resources.map(resource => resource.id));
      return { ...prev, resources: [...prev.resources, ...resources.filter(resource => {
        if (ids.has(resource.id)) return false;
        ids.add(resource.id);
        return true;
      })] };
    });
  }, [resourceWriter]);

  const addResource = useCallback(async (resource: Resource) => {
    if (!isOwner) return;
    
    // Add to repository and get the new ID
    const newId = await addResourceToRepository(resource, world.userId);
    if (newId) {
      const resourceWithId = { ...resource, id: newId };
      await addExistingResources([resourceWithId]);
    }
  }, [isOwner, world.userId, addExistingResources]);

  // Add an existing repository resource to this world (doesn't create new in repository)
  const addExistingResource = useCallback((resource: Resource) => addExistingResources([resource]), [addExistingResources]);

  const updateResource = useCallback(async (resource: Resource) => {
    if (!isOwner) return;
    
    // Update in repository
    await updateResourceInRepository(resource.id, resource, world.userId);
    
    setWorld(prev => ({
      ...prev,
      resources: prev.resources.map(r => r.id === resource.id ? resource : r),
    }));
    setTimeout(saveWorldData, 500);
  }, [isOwner, world.userId, saveWorldData]);

  const deleteResource = useCallback(async (id: string) => {
    if (!isOwner) return;
    await resourceWriter.remove(id);
    
    // Note: We don't delete from repository since other worlds might use it
    // We just remove the reference from this world
    setWorld(prev => ({
      ...prev,
      resources: prev.resources.filter(r => r.id !== id),
    }));
  }, [isOwner, resourceWriter]);

  const respawnResources = useCallback(() => {
    if (!isOwner) return;
    
    const currentWorld = world;
    const newTiles = currentWorld.map.tiles.map(row => 
      row.map(t => {
        // Preserve player-placed resources
        const placedResources = t.placedResources || [];
        return { 
          ...t, 
          // Claimed land keeps only player-placed resources — never wild spawns
          resources: t.claimedBy ? [...placedResources] : [...t.resources],
          placedResources: [...placedResources]
        };
      })
    );
    
    for (let y = 0; y < newTiles.length; y++) {
      for (let x = 0; x < newTiles[y].length; x++) {
        const tile = newTiles[y][x];
        if (!tile.claimedBy) {
          const validResources = currentWorld.resources.filter(r => r.spawnTiles.includes(tile.type));
          for (const resource of validResources) {
            if (Math.random() < resource.spawnChance) {
              // Check tile limits before adding
              if (canAddResourceToTile(tile, resource, currentWorld.resources)) {
                tile.resources.push(resource.id);
              }
            }
          }
        }
      }
    }
    
    const newMapData: WorldMap = { ...currentWorld.map, tiles: newTiles };
    
    setWorld(prev => ({ ...prev, map: newMapData }));
    
    setTimeout(() => saveMapData(newMapData), 500);
  }, [isOwner, world, saveMapData]);

  const updateWorldName = useCallback((name: string) => {
    if (!isOwner) return;
    setWorld(prev => ({ ...prev, name }));
    // Pass the new name directly to avoid stale closure issue
    saveWorldData(name);
  }, [isOwner, saveWorldData]);

  const renameTile = useCallback((x: number, y: number, name: string) => {
    setWorld(prev => {
      const tile = prev.map.tiles[y]?.[x];
      if (!tile || tile.claimedBy !== prev.userId) return prev;
      
      const newTiles = prev.map.tiles.map((row, ry) =>
        row.map((t, rx) =>
          rx === x && ry === y ? { ...t, name: name.trim() || undefined } : t
        )
      );
      const newMapData = { ...prev.map, tiles: newTiles };
      
      setTimeout(() => saveMapData(newMapData), 500);
      
      return { ...prev, map: newMapData };
    });
  }, [saveMapData]);

  const rotateResource = useCallback((x: number, y: number, resourceId: string) => {
    setWorld(prev => {
      const tile = prev.map.tiles[y]?.[x];
      const resource = prev.resources.find(r => r.id === resourceId);
      if (!tile || !resource?.rotatable || !tile.resources.includes(resourceId)) return prev;
      if (tile.claimedBy && tile.claimedBy !== prev.userId) return prev;
      const next = ((tile.resourceRotation?.[resourceId] ?? 0) + 90) % 360;
      const newTiles = prev.map.tiles.map((row, ry) => ry !== y ? row : row.map((t, rx) =>
        rx === x ? { ...t, resourceRotation: { ...(t.resourceRotation || {}), [resourceId]: next } } : t));
      const newMapData = { ...prev.map, tiles: newTiles };
      setTimeout(() => saveMapData(newMapData), 500);
      return { ...prev, map: newMapData };
    });
  }, [saveMapData]);

  const shootResource = useCallback((x: number, y: number, resourceId: string) => {
    const result = fireProjectile(world, { x, y }, resourceId);
    if (!result.shot) { toast.error(result.message); return; }
    setWorld(result.world);
    setProjectileShot(result.shot);
    void saveMapData(result.world.map);
    toast.success(result.message);
  }, [world, saveMapData]);

  const toggleResourceAutoFire = useCallback((x: number, y: number, resourceId: string) => {
    const tile = world.map.tiles[y]?.[x];
    const resource = world.resources.find(r => r.id === resourceId);
    if (tile?.claimedBy !== world.userId || !tile.resources.includes(resourceId) || !resource?.projectile || !resource.canInflictDamage) return;
    const tiles = [...world.map.tiles];
    tiles[y] = [...tiles[y]];
    tiles[y][x] = { ...tile, resourceAutoFire: { ...tile.resourceAutoFire, [resourceId]: !tile.resourceAutoFire?.[resourceId] } };
    const map = { ...world.map, tiles };
    setWorld(prev => ({ ...prev, map }));
    void saveMapData(map);
  }, [world, saveMapData]);

  const autoFireWorldRef = useRef(world);
  const autoFireSaveRef = useRef(saveMapData);
  autoFireWorldRef.current = world;
  autoFireSaveRef.current = saveMapData;
  useEffect(() => {
    if (loading || !dbWorldId) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      let current = autoFireWorldRef.current;
      let lastShot: ProjectileShot | null = null;
      current.map.tiles.forEach((row, y) => row.forEach((tile, x) => {
        if (tile.claimedBy !== current.userId) return;
        for (const id of tile.resources) {
          if (!tile.resourceAutoFire?.[id]) continue;
          const result = fireProjectile(current, { x, y }, id);
          if (result.shot) { current = result.world; lastShot = result.shot; }
        }
      }));
      if (lastShot) {
        autoFireWorldRef.current = current;
        setWorld(current);
        setProjectileShot(lastShot);
        void autoFireSaveRef.current(current.map);
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [loading, dbWorldId]);

  const setUserColor = useCallback((color: string) => {
    setWorld(prev => ({ ...prev, userColor: color }));
  }, []);

  const createSovereignty = useCallback((name: string, flag: string, motto: string) => {
    setWorld(prev => ({
      ...prev,
      sovereignty: {
        name,
        flag,
        motto,
        foundedAt: Date.now(),
      },
    }));
  }, []);

  const updateSovereignty = useCallback((updates: Partial<Sovereignty>) => {
    setWorld(prev => {
      if (!prev.sovereignty) return prev;
      return {
        ...prev,
        sovereignty: { ...prev.sovereignty, ...updates },
      };
    });
  }, []);

  const createArea = useCallback((name: string, color: string, tiles: Position[]): { success: boolean; message: string } => {
    if (!name.trim()) {
      return { success: false, message: 'Area name is required' };
    }
    if (tiles.length === 0) {
      return { success: false, message: 'No tiles selected' };
    }
    
    const newArea: Area = {
      id: `area-${Date.now()}`,
      name: name.trim(),
      color,
      tiles: tiles.map(t => ({ x: t.x, y: t.y })),
      createdAt: Date.now(),
    };
    
    setWorld(prev => ({
      ...prev,
      areas: [...(prev.areas || []), newArea],
    }));
    
    return { success: true, message: `Created area "${name}" with ${tiles.length} tiles` };
  }, []);

  const deleteArea = useCallback((areaId: string) => {
    setWorld(prev => ({
      ...prev,
      areas: (prev.areas || []).filter(a => a.id !== areaId),
      sovereignty: prev.sovereignty?.capitalAreaId === areaId
        ? { ...prev.sovereignty, capitalAreaId: undefined }
        : prev.sovereignty,
    }));
  }, []);

  const setCapitalArea = useCallback((areaId: string) => {
    setWorld(prev => makeAreaCapital(prev, areaId));
  }, []);

  const updateArea = useCallback((areaId: string, updates: Partial<Omit<Area, 'id' | 'createdAt'>>) => {
    setWorld(prev => ({
      ...prev,
      areas: (prev.areas || []).map(a => 
        a.id === areaId ? { ...a, ...updates } : a
      ),
    }));
  }, []);

  const craftResource = useCallback((resourceId: string, recipeId: string): { success: boolean; message: string } => {
    let result = { success: false, message: '' };
    
    setWorld(prev => {
      const resource = prev.resources.find(r => r.id === resourceId);
      if (!resource || !resource.recipes) {
        result = { success: false, message: 'Resource not found' };
        return prev;
      }

      const recipe = resource.recipes.find(r => r.id === recipeId);
      if (!recipe) {
        result = { success: false, message: 'Recipe not found' };
        return prev;
      }

      const inventoryCounts: Record<string, number> = {};
      prev.inventory.forEach(slot => {
        if (slot.resourceId) {
          inventoryCounts[slot.resourceId] = (inventoryCounts[slot.resourceId] || 0) + slot.quantity;
        }
      });

      for (const ingredient of (recipe.ingredients || [])) {
        if ((inventoryCounts[ingredient.resourceId] || 0) < ingredient.quantity) {
          const ingResource = prev.resources.find(r => r.id === ingredient.resourceId);
          result = { success: false, message: `Not enough ${ingResource?.name || ingredient.resourceId}` };
          return prev;
        }
      }

      let newInventory = [...prev.inventory];
      for (const ingredient of (recipe.ingredients || [])) {
        let remaining = ingredient.quantity;
        for (let i = 0; i < newInventory.length && remaining > 0; i++) {
          if (newInventory[i].resourceId === ingredient.resourceId) {
            const take = Math.min(newInventory[i].quantity, remaining);
            newInventory[i] = { ...newInventory[i], quantity: newInventory[i].quantity - take };
            remaining -= take;
            if (newInventory[i].quantity === 0) {
              newInventory[i] = { resourceId: null, quantity: 0 };
            }
          }
        }
      }

      addToInventory(newInventory, resourceId, recipe.outputQuantity);

      result = { success: true, message: `Crafted ${recipe.outputQuantity}x ${resource.name}!` };
      return { ...prev, inventory: newInventory };
    });

    return result;
  }, []);

  const consumeResource = useCallback((resourceId: string): { success: boolean; message: string } => {
    let result = { success: false, message: '' };
    
    setWorld(prev => {
      const resource = prev.resources.find(r => r.id === resourceId);
      if (!resource) {
        result = { success: false, message: 'Resource not found' };
        return prev;
      }
      
      if (!resource.consumable) {
        result = { success: false, message: 'This item cannot be consumed' };
        return prev;
      }
      
      // Check if player has the resource
      const slotIndex = prev.inventory.findIndex(s => s.resourceId === resourceId && s.quantity > 0);
      if (slotIndex === -1) {
        result = { success: false, message: 'You don\'t have this item' };
        return prev;
      }
      
      // Consume one item
      const newInventory = [...prev.inventory];
      newInventory[slotIndex] = { 
        ...newInventory[slotIndex], 
        quantity: newInventory[slotIndex].quantity - 1 
      };
      if (newInventory[slotIndex].quantity === 0) {
        newInventory[slotIndex] = { resourceId: null, quantity: 0 };
      }
      
      // Apply XP gain
      const xpGain = resource.givesXp ? (resource.xpAmount || 0) : 0;
      const newXp = prev.xp + xpGain;
      
      const messages: string[] = [];
      if (xpGain > 0) messages.push(`+${xpGain} XP`);
      
      result = { 
        success: true, 
        message: messages.length > 0 
          ? `Consumed ${resource.name}! ${messages.join(', ')}` 
          : `Consumed ${resource.name}!` 
      };
      
      return { ...prev, inventory: newInventory, xp: newXp };
    });
    
    return result;
  }, []);

  const placeItem = useCallback((resourceId: string, direction: 'north' | 'south' | 'east' | 'west', target?: { x: number; y: number }): { success: boolean; message: string } => {
    let result = { success: false, message: '' };
    
    setWorld(prev => {
      const resource = prev.resources.find(r => r.id === resourceId);
      if (!resource) {
        result = { success: false, message: 'Resource not found' };
        return prev;
      }
      
      if (!resource.placeable) {
        result = { success: false, message: 'This item cannot be placed' };
        return prev;
      }
      
      // Check if player has the resource
      const slotIndex = prev.inventory.findIndex(s => s.resourceId === resourceId && s.quantity > 0);
      if (slotIndex === -1) {
        result = { success: false, message: "You don't have this item" };
        return prev;
      }
      
      // Calculate target position: explicit target tile (third-person) or facing direction
      let targetX = target?.x ?? prev.playerPosition.x;
      let targetY = target?.y ?? prev.playerPosition.y;

      if (!target) {
        switch (direction) {
          case 'north': targetY -= 1; break;
          case 'south': targetY += 1; break;
          case 'east': targetX += 1; break;
          case 'west': targetX -= 1; break;
        }
      }
      
      // Check bounds
      if (targetX < 0 || targetX >= prev.map.width || targetY < 0 || targetY >= prev.map.height) {
        result = { success: false, message: 'Cannot place outside the map' };
        return prev;
      }
      
      const targetTile = prev.map.tiles[targetY][targetX];
      const tileTypeInfo = TILE_TYPES.find(t => t.type === targetTile.type);
      const isWalkable = tileTypeInfo?.walkable ?? targetTile.walkable;
      
      if (!isWalkable) {
        result = { success: false, message: 'Cannot place on unwalkable tile' };
        return prev;
      }
      
      // Check if tile already has this resource placed
      if (targetTile.resources.includes(resourceId)) {
        result = { success: false, message: 'Item already placed here' };
        return prev;
      }
      
      // Check tile resource limits
      if (!canAddResourceToTile(targetTile, resource, prev.resources)) {
        const isLarge = isLargeResource(resource);
        result = { success: false, message: isLarge ? 'Tile already has a large resource' : 'Tile is full (max 2 small resources)' };
        return prev;
      }
      
      // Remove from inventory
      const newInventory = [...prev.inventory];
      newInventory[slotIndex] = { 
        ...newInventory[slotIndex], 
        quantity: newInventory[slotIndex].quantity - 1 
      };
      if (newInventory[slotIndex].quantity === 0) {
        newInventory[slotIndex] = { resourceId: null, quantity: 0 };
      }
      
      // Add resource to tile and track as placed
      const newTiles = prev.map.tiles.map((row, ry) =>
        row.map((t, rx) =>
          rx === targetX && ry === targetY
            ? { 
                ...t, 
                resources: [...t.resources, resourceId],
                placedResources: [...(t.placedResources || []), resourceId]
              }
            : t
        )
      );
      const newMapData: WorldMap = { ...prev.map, tiles: newTiles };
      
      result = { success: true, message: `Placed ${resource.name}!` };
      
      // Save map changes
      setTimeout(() => saveMapData(newMapData), 500);
      
      return { ...prev, inventory: newInventory, map: newMapData };
    });
    
    return result;
  }, [saveMapData]);

  // Use damage-inflicting item on facing tile to destroy destructible resources
  const useItemOnFacingTile = useCallback((
    selectedSlot: number, 
    facingDirection: 'north' | 'south' | 'east' | 'west',
    target?: { x: number; y: number },
    targets?: { x: number; y: number }[]
  ): { success: boolean; message: string } => {
    let result = { success: false, message: '' };
    
    setWorld(prev => {
      // Check if selected slot has an item
      const slot = prev.inventory[selectedSlot];
      if (!slot || !slot.resourceId || slot.quantity <= 0) {
        result = { success: false, message: 'No item selected' };
        return prev;
      }
      
      const heldResource = prev.resources.find(r => r.id === slot.resourceId);
      if (!heldResource) {
        result = { success: false, message: 'Invalid item' };
        return prev;
      }
      
      // Check if item can do anything (inflict damage or produce tile)
      const canInflictDamage = heldResource.canInflictDamage && heldResource.damage;
      const canProduceTile = heldResource.produceTile && heldResource.produceTileType;
      
      if (!canInflictDamage && !canProduceTile) {
        result = { success: false, message: 'Selected item cannot be used here' };
        return prev;
      }
      
      // Target tile: explicit selection (third-person) or facing direction
      let targetX = target ? target.x : prev.playerPosition.x;
      let targetY = target ? target.y : prev.playerPosition.y;
      
      if (!target) {
        switch (facingDirection) {
          case 'north': targetY -= 1; break;
          case 'south': targetY += 1; break;
          case 'east': targetX += 1; break;
          case 'west': targetX -= 1; break;
        }
      }
      
      
      // Check bounds
      if (targetX < 0 || targetX >= prev.map.width || targetY < 0 || targetY >= prev.map.height) {
        result = { success: false, message: 'Nothing to use item on' };
        return prev;
      }
      
      const targetTile = prev.map.tiles[targetY][targetX];
      
      // Players may only modify tiles they own (checked per-tile for multi-select below)
      if (!targets?.length && targetTile.claimedBy !== prev.userId) {
        result = { success: false, message: 'You must own this tile to use tools on it' };
        return prev;
      }

      
      // Check for produce tile functionality first (on empty tiles without resources)
      if (canProduceTile) {
        const newTileType = heldResource.produceTileType!;
        const candidatePositions = targets && targets.length > 0 ? targets : [{ x: targetX, y: targetY }];
        
        // Transform applies to every selected tile the player owns that is empty
        const transformSet = new Set<string>();
        for (const p of candidatePositions) {
          if (p.x < 0 || p.x >= prev.map.width || p.y < 0 || p.y >= prev.map.height) continue;
          const t = prev.map.tiles[p.y][p.x];
          if (t.claimedBy !== prev.userId) continue;
          if (t.resources.length > 0) continue;
          transformSet.add(`${p.x}-${p.y}`);
        }
        
        if (transformSet.size === 0) {
          result = {
            success: false,
            message: targets && targets.length > 1
              ? 'No owned empty tiles in selection'
              : (targetTile.resources.length > 0 ? 'Tile must be empty to transform' : 'You must own this tile to use tools on it')
          };
          return prev;
        }
        
        // Copy only affected rows
        const affectedRows = new Set<number>();
        transformSet.forEach(k => affectedRows.add(Number(k.split('-')[1])));
        let newTiles = prev.map.tiles.map((row, ry) =>
          affectedRows.has(ry)
            ? row.map((t, rx) =>
                transformSet.has(`${rx}-${ry}`)
                  ? { 
                      ...t, 
                      type: newTileType,
                      walkable: !['water', 'lava', 'stone'].includes(newTileType)
                    }
                  : t
              )
            : row
        );
        
        let newInventory = [...prev.inventory];
        
        // Handle durability loss for the held item
        if (heldResource.useLife) {
          const lifeDecrease = heldResource.lifeDecreasePerUse ?? 100;
          const currentItemLife = newInventory[selectedSlot].life ?? 100;
          const newItemLife = currentItemLife - lifeDecrease;
          
          if (newItemLife <= 0) {
            newInventory[selectedSlot] = {
              ...newInventory[selectedSlot],
              quantity: newInventory[selectedSlot].quantity - 1,
              life: 100
            };
            if (newInventory[selectedSlot].quantity <= 0) {
              newInventory[selectedSlot] = { resourceId: null, quantity: 0 };
            }
          } else {
            newInventory[selectedSlot] = {
              ...newInventory[selectedSlot],
              life: newItemLife
            };
          }
        }
        
        result = {
          success: true,
          message: transformSet.size > 1
            ? `Transformed ${transformSet.size} tiles to ${newTileType}`
            : `Transformed tile to ${newTileType}`
        };
        return {
          ...prev,
          map: { ...prev.map, tiles: newTiles },
          inventory: newInventory
        };
      }
      
      // If can't produce tile or tile has resources, try damage logic
      if (!canInflictDamage) {
        result = { success: false, message: canProduceTile ? 'Tile must be empty to transform' : 'Selected item cannot inflict damage' };
        return prev;
      }
      
      // Find a destructible resource on the tile that can be destroyed by the held item
      const destructibleResourceId = targetTile.resources.find(resId => {
        const res = prev.resources.find(r => r.id === resId);
        if (!res?.destructible) return false;
        // Check if destroyedBy is specified - if so, held item must be in the list
        if (res.destroyedBy && res.destroyedBy.length > 0) {
          return res.destroyedBy.includes(heldResource.id);
        }
        // No restrictions - any damage item can destroy
        return true;
      });
      
      if (!destructibleResourceId) {
        // Check if there's a destructible resource but wrong tool
        const anyDestructible = targetTile.resources.find(resId => {
          const res = prev.resources.find(r => r.id === resId);
          return res?.destructible;
        });
        if (anyDestructible) {
          const res = prev.resources.find(r => r.id === anyDestructible);
          if (res?.destroyedBy && res.destroyedBy.length > 0) {
            result = { success: false, message: 'Wrong tool for this resource' };
            return prev;
          }
        }
        result = { success: false, message: 'Nothing destructible here' };
        return prev;
      }
      
      const destructibleResource = prev.resources.find(r => r.id === destructibleResourceId)!;
      const damageAmount = heldResource.damage;
      const maxLife = destructibleResource.maxLife ?? 100;
      
      // Get current life of the resource on this tile
      const resourceLife = targetTile.resourceLife || {};
      const currentLife = resourceLife[destructibleResourceId] ?? maxLife;
      const newLife = currentLife - damageAmount;
      
      let newInventory = [...prev.inventory];
      let newTiles = prev.map.tiles;
      let destroyedMessage = '';
      
      // Handle durability loss for the held item (useLife or canInflictDamage items)
      if (heldResource.useLife || heldResource.canInflictDamage) {
        // For damage-dealing items, life decreases by the damage amount
        // For useLife items, use lifeDecreasePerUse
        const lifeDecrease = heldResource.canInflictDamage 
          ? damageAmount 
          : (heldResource.lifeDecreasePerUse ?? 100);
        const currentItemLife = newInventory[selectedSlot].life ?? 100;
        const newItemLife = currentItemLife - lifeDecrease;
        
        if (newItemLife <= 0) {
          // Item is fully consumed, decrease quantity
          newInventory[selectedSlot] = {
            ...newInventory[selectedSlot],
            quantity: newInventory[selectedSlot].quantity - 1,
            life: 100 // Reset life for the next item in stack
          };
          if (newInventory[selectedSlot].quantity <= 0) {
            newInventory[selectedSlot] = { resourceId: null, quantity: 0 };
          }
        } else {
          // Just decrease life
          newInventory[selectedSlot] = {
            ...newInventory[selectedSlot],
            life: newItemLife
          };
        }
      }
      
      if (newLife <= 0) {
        // Resource is destroyed - remove from tile
        newTiles = prev.map.tiles.map((row, ry) =>
          row.map((t, rx) => {
            if (rx === targetX && ry === targetY) {
              const newResources = t.resources.filter(r => r !== destructibleResourceId);
              const newResourceLife = { ...t.resourceLife };
              delete newResourceLife[destructibleResourceId];
              return { ...t, resources: newResources, resourceLife: Object.keys(newResourceLife).length > 0 ? newResourceLife : undefined };
            }
            return t;
          })
        );
        
        // If the resource has a recipe, break it into ingredients; otherwise give the resource itself
        if (destructibleResource.recipes && destructibleResource.recipes.length > 0) {
          const recipe = destructibleResource.recipes[0];
          for (const ingredient of (recipe.ingredients || [])) {
            addToInventory(newInventory, ingredient.resourceId, ingredient.quantity);
          }
          destroyedMessage = ` Broke into components!`;
        } else {
          // No recipe - give the resource itself
          addToInventory(newInventory, destructibleResourceId);
          destroyedMessage = ` Collected!`;
        }
        
        result = { success: true, message: `Destroyed ${destructibleResource.name}!${destroyedMessage}` };
      } else {
        // Resource damaged but not destroyed - update life
        newTiles = prev.map.tiles.map((row, ry) =>
          row.map((t, rx) => {
            if (rx === targetX && ry === targetY) {
              const newResourceLife = { ...t.resourceLife, [destructibleResourceId]: newLife };
              return { ...t, resourceLife: newResourceLife };
            }
            return t;
          })
        );
        
        result = { success: true, message: `Hit ${destructibleResource.name}! (${newLife}/${maxLife} HP)` };
      }
      
      const newMapData: WorldMap = { ...prev.map, tiles: newTiles };
      
      // Save map changes
      setTimeout(() => saveMapData(newMapData), 500);
      
      return { ...prev, inventory: newInventory, map: newMapData };
    });
    
    return result;
  }, [saveMapData]);

  const toggleEnableMarkets = useCallback(async (enabled: boolean) => {
    if (!isOwner || !dbWorldId) return;
    
    // When enabling markets, add a default market near spawn if none exist
    const defaultMarket: Market = {
      id: `market-${Date.now()}`,
      position: { x: world.map.spawnPoint.x + 5, y: world.map.spawnPoint.y + 5 },
      name: 'Town Market',
    };
    
    const newMarkets = enabled && (!world.markets || world.markets.length === 0) 
      ? [defaultMarket] 
      : (world.markets || []);
    
    setWorld(prev => ({ ...prev, enableMarkets: enabled, markets: newMarkets }));
    
    await supabase
      .from('worlds')
      .update({ 
        enable_markets: enabled,
        markets: JSON.parse(JSON.stringify(newMarkets)) as Json
      })
      .eq('id', dbWorldId);
  }, [isOwner, dbWorldId, world.map.spawnPoint, world.markets]);

  const addMarket = useCallback(async (market: Market) => {
    if (!isOwner || !dbWorldId) return;
    
    setWorld(prev => {
      const newMarkets = [...(prev.markets || []), market];
      
      // Save to database
      supabase
        .from('worlds')
        .update({ markets: JSON.parse(JSON.stringify(newMarkets)) as Json })
        .eq('id', dbWorldId);
      
      return { ...prev, markets: newMarkets };
    });
  }, [isOwner, dbWorldId]);

  const removeMarket = useCallback(async (marketId: string) => {
    if (!isOwner || !dbWorldId) return;
    
    setWorld(prev => {
      const newMarkets = (prev.markets || []).filter(m => m.id !== marketId);
      
      // Save to database
      supabase
        .from('worlds')
        .update({ markets: JSON.parse(JSON.stringify(newMarkets)) as Json })
        .eq('id', dbWorldId);
      
      return { ...prev, markets: newMarkets };
    });
  }, [isOwner, dbWorldId]);

  const buyFromMarket = useCallback((resource: Resource, cost: number, quantity: number = 1): { success: boolean; message: string } => {
    if (!Number.isSafeInteger(quantity) || quantity < 1 || !Number.isFinite(cost) || cost < 0) {
      return { success: false, message: 'Enter a valid quantity' };
    }
    let result = { success: false, message: '' };
    
    setWorld(prev => {
      if (prev.coins < cost) {
        result = { success: false, message: 'Not enough coins' };
        return prev;
      }
      
      // Check if resource with same name already exists in world
      const existingResource = prev.resources.find(r => r.name.toLowerCase() === resource.name.toLowerCase());
      const resourceIdToUse = existingResource ? existingResource.id : resource.id;
      
      // Unlimited inventory: stack onto an existing slot or append a new one
      const newInventory = [...prev.inventory];
      addToInventory(newInventory, resourceIdToUse, quantity);
      
      // Only add resource to world.resources if it doesn't exist by name
      let newResources = prev.resources;
      if (!existingResource) {
        newResources = [...prev.resources, resource];
      }
      
      result = { success: true, message: `Purchased ${resource.name}!` };
      return { ...prev, coins: prev.coins - cost, inventory: newInventory, resources: newResources };
    });
    
    return result;
  }, []);

  const sellToMarket = useCallback((resourceId: string, value: number, quantity: number = 1): { success: boolean; message: string; soldCount: number } => {
    let result = { success: false, message: '', soldCount: 0 };
    
    setWorld(prev => {
      let newInventory = [...prev.inventory];
      let totalSold = 0;
      let remainingToSell = quantity;
      
      // Process all slots that contain this resource
      for (let i = 0; i < newInventory.length && remainingToSell > 0; i++) {
        if (newInventory[i].resourceId === resourceId && newInventory[i].quantity > 0) {
          const sellFromSlot = Math.min(newInventory[i].quantity, remainingToSell);
          newInventory[i] = {
            ...newInventory[i],
            quantity: newInventory[i].quantity - sellFromSlot
          };
          
          if (newInventory[i].quantity === 0) {
            newInventory[i] = { resourceId: null, quantity: 0 };
          }
          
          totalSold += sellFromSlot;
          remainingToSell -= sellFromSlot;
        }
      }
      
      if (totalSold === 0) {
        result = { success: false, message: "You don't have this item", soldCount: 0 };
        return prev;
      }
      
      result = { success: true, message: `Sold ${totalSold} for ${value * totalSold} coins!`, soldCount: totalSold };
      return { ...prev, coins: prev.coins + (value * totalSold), inventory: newInventory };
    });
    
    return result;
  }, []);

  const toggleEnableNpcs = useCallback(async (enabled: boolean, count: number = 0) => {
    if (!isOwner || !dbWorldId) return;
    
    const npcCount = enabled ? Math.min(Math.max(count, 1), 12) : 0;
    
    setWorld(prev => {
      const npcs = enabled && npcCount > 0 
        ? generateNPCs(npcCount, prev.map, prev.npcs)
        : [];
      return { ...prev, enableNpcs: enabled, npcCount, npcs };
    });
    
    await supabase
      .from('worlds')
      .update({ 
        enable_npcs: enabled,
        npc_count: npcCount
      })
      .eq('id', dbWorldId);
  }, [isOwner, dbWorldId]);

  const updateNpcCount = useCallback(async (count: number) => {
    if (!isOwner || !dbWorldId) return;
    
    const npcCount = Math.min(Math.max(count, 0), 12);
    
    setWorld(prev => {
      const npcs = npcCount > 0 
        ? generateNPCs(npcCount, prev.map)
        : [];
      return { 
        ...prev, 
        npcCount,
        enableNpcs: npcCount > 0,
        npcs,
      };
    });
    
    await supabase
      .from('worlds')
      .update({ 
        enable_npcs: npcCount > 0,
        npc_count: npcCount
      })
      .eq('id', dbWorldId);
  }, [isOwner, dbWorldId]);

  const toggleEnableStrangers = useCallback(async () => {
    // Strangers are always enabled and auto-sized to the world; nothing to toggle.
  }, []);

  const updateNpcAggression = useCallback(async (aggression: NpcAggression) => {
    if (!isOwner || !dbWorldId) return;
    const value = normalizeNpcAggression(aggression);
    const { error } = await supabase
      .from('worlds')
      .update({ npc_aggression: value })
      .eq('id', dbWorldId);
    if (error) {
      toast.error('Could not save NPC aggression');
      return;
    }
    setWorld(prev => ({ ...prev, npcAggression: value }));
  }, [isOwner, dbWorldId]);

  const updateStrangerDensity = useCallback(async () => {
    // Population is auto-calculated from world size; nothing to update.
  }, []);

  return {
    world,
    setWorld,
    selectedTile,
    isOwner,
    members,
    worldSovereignties,
    taxPolicies,
    updateNpcTaxRate,
    loading,
    movePlayer,
    selectTile,
    claimTile,
    claimMultipleTiles,
    convertTiles,
    gatherFromTile,
    gatherManyFromTiles,
    isOutsiderGatheringAllowed,
    addResource,
    addExistingResource,
    addExistingResources,
    updateResource,
    deleteResource,
    respawnResources,
    updateWorldName,
    setUserColor,
    craftResource,
    createSovereignty,
    updateSovereignty,
    createArea,
    deleteArea,
    updateArea,
    setCapitalArea,
    renameTile,
    rotateResource,
    shootResource,
    toggleResourceAutoFire,
    projectileShot,
    consumeResource,
    placeItem,
    useItemOnFacingTile,
    toggleEnableMarkets,
    addMarket,
    removeMarket,
    buyFromMarket,
    sellToMarket,
    toggleEnableNpcs,
    updateNpcAggression,
    updateNpcCount,
    toggleEnableStrangers,
    updateStrangerDensity,
    saveMapData,
    refreshTileNegotiations,
  };
};
