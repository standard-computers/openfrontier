import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameWorld, Resource, Sovereignty, Market, NPC, Area, Position, generateMap, createEmptyInventory, USER_COLORS, STARTING_COINS, STARTING_HEALTH, MAX_HEALTH, HEALTH_DECAY_PER_DAY, calculateTileValue, WorldMap, TILE_TYPES, generateNPCs, generateStrangers, Stranger, canAddResourceToTile, isLargeResource } from '@/types/game';
import type { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';
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
    health: STARTING_HEALTH,
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

export const useGameWorld = () => {
  const [world, setWorld] = useState<GameWorld>(getDefaultWorld);
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [members, setMembers] = useState<WorldMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbWorldId, setDbWorldId] = useState<string | null>(null);

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

        const playerData = membershipData.player_data as unknown as {
          position?: { x: number; y: number };
          inventory?: { resourceId: string | null; quantity: number }[];
          coins?: number;
          userColor?: string;
          sovereignty?: Sovereignty;
          areas?: Area[];
          health?: number;
          xp?: number;
        };

        const mapData = worldData.map_data as unknown as WorldMap;
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
        const enableStrangers = (worldData as any).enable_strangers ?? false;
        const strangerDensity = parseFloat((worldData as any).stranger_density) ?? 0.02;
        
        // Generate NPCs if enabled
        const npcs = enableNpcs && npcCount > 0 
          ? generateNPCs(npcCount, mapData)
          : [];

        // Generate Strangers if enabled
        const strangers = enableStrangers 
          ? generateStrangers(strangerDensity, mapData)
          : [];

        setWorld({
          id: worldId,
          name: worldData.name,
          map: mapData,
          resources: resources,
          inventory: normalizedInventory,
          playerPosition: playerData.position || mapData.spawnPoint || { x: 0, y: 0 },
          userId: user.id,
          userColor: playerData.userColor || USER_COLORS[0],
          coins: playerData.coins ?? STARTING_COINS,
          sovereignty: playerData.sovereignty,
          areas: playerData.areas ?? [],
          createdAt: worldData.created_at,
          health: playerData.health ?? STARTING_HEALTH,
          xp: calculatedXp,
          joinCode: worldData.join_code,
          enableMarkets: worldData.enable_markets ?? false,
          openMarkets: (worldData as any).open_markets ?? true,
          markets: (worldData.markets as unknown as Market[]) ?? [],
          enableNpcs,
          npcCount,
          npcs,
          enableStrangers,
          strangerDensity,
          strangers,
        });
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

    const savePlayerData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const playerData = {
        position: world.playerPosition,
        inventory: world.inventory,
        coins: world.coins,
        userColor: world.userColor,
        sovereignty: world.sovereignty,
        areas: world.areas,
        health: world.health,
        xp: world.xp,
      };

      await supabase
        .from('world_members')
        .update({ player_data: JSON.parse(JSON.stringify(playerData)) as Json })
        .eq('world_id', dbWorldId)
        .eq('user_id', user.id);
    };

    const timeoutId = setTimeout(savePlayerData, 1000);
    return () => clearTimeout(timeoutId);
  }, [dbWorldId, world.playerPosition, world.inventory, world.coins, world.userColor, world.sovereignty, world.areas, world.health, world.xp, loading]);

  // Health decay: -5 health per world day (1 real hour)
  useEffect(() => {
    if (!world.createdAt || loading) return;

    const checkHealthDecay = () => {
      const createdAt = new Date(world.createdAt).getTime();
      const now = Date.now();
      const elapsedHours = (now - createdAt) / 3600000;
      
      // Calculate expected health based on time passed (starting at 80, -5 per hour)
      // Also factor in non-consumable healthGain resources in inventory
      const passiveHealthGain = world.inventory.reduce((sum, slot) => {
        if (!slot.resourceId) return sum;
        const resource = world.resources.find(r => r.id === slot.resourceId);
        if (resource && !resource.consumable && resource.healthGain) {
          return sum + (resource.healthGain * slot.quantity);
        }
        return sum;
      }, 0);
      
      const decayAmount = Math.floor(elapsedHours) * HEALTH_DECAY_PER_DAY;
      const passiveGain = Math.floor(elapsedHours) * passiveHealthGain;
      const expectedHealth = Math.max(0, Math.min(MAX_HEALTH, STARTING_HEALTH - decayAmount + passiveGain));
      
      // Only update if there's a meaningful difference (to avoid constant updates)
      setWorld(prev => {
        // We recalc here based on stored health to just apply hourly decay
        const newHealth = Math.max(0, prev.health - HEALTH_DECAY_PER_DAY + passiveHealthGain);
        if (Math.floor(prev.health) !== Math.floor(newHealth)) {
          return { ...prev, health: Math.max(0, Math.min(MAX_HEALTH, newHealth)) };
        }
        return prev;
      });
    };

    // Check every real hour
    const interval = setInterval(checkHealthDecay, 3600000);
    return () => clearInterval(interval);
  }, [world.createdAt, world.resources, world.inventory, loading]);

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
  const saveMapData = useCallback(async (mapData?: WorldMap) => {
    if (!dbWorldId) return;
    const dataToSave = mapData || world.map;

    await supabase
      .from('worlds')
      .update({
        map_data: JSON.parse(JSON.stringify(dataToSave)) as Json,
      })
      .eq('id', dbWorldId);
  }, [dbWorldId, world.map]);

  // Save world data (name, resource_ids) - only for owners
  const saveWorldData = useCallback(async () => {
    if (!dbWorldId || !isOwner) return;

    // Get the resource IDs from the current resources
    const resourceIds = world.resources.map(r => r.id);

    await supabase
      .from('worlds')
      .update({
        name: world.name,
        resource_ids: resourceIds,
      })
      .eq('id', dbWorldId);
  }, [dbWorldId, isOwner, world.name, world.resources]);

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
      
      // Mountain tiles deplete health by 0.05 per step
      let newHealth = prev.health;
      if (targetTile.type === 'mountain') {
        newHealth = Math.max(0, prev.health - 0.05);
      }
      
      return { ...prev, playerPosition: { x: newX, y: newY }, health: newHealth };
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
        let slotIndex = newInventory.findIndex(s => s.resourceId === resourceId && s.quantity < 99);
        if (slotIndex === -1) {
          slotIndex = newInventory.findIndex(s => !s.resourceId);
        }
        if (slotIndex !== -1) {
          if (newInventory[slotIndex].resourceId === resourceId) {
            newInventory[slotIndex] = { ...newInventory[slotIndex], quantity: newInventory[slotIndex].quantity + 1 };
          } else {
            newInventory[slotIndex] = { resourceId, quantity: 1, life: 100 };
          }
        }
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
    
    for (const pos of positions) {
      const tile = world.map.tiles[pos.y]?.[pos.x];
      if (!tile || tile.claimedBy) continue; // Skip claimed or invalid tiles
      
      const tileValue = calculateTileValue(tile, world.resources);
      totalCost += tileValue;
      validPositions.push({ x: pos.x, y: pos.y, tileValue, resources: [...tile.resources] });
    }
    
    if (validPositions.length === 0) {
      return { success: false, message: 'No claimable tiles in selection', claimedCount: 0, totalCost: 0 };
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
        let slotIndex = newInventory.findIndex(s => s.resourceId === resourceId && s.quantity < 99);
        if (slotIndex === -1) {
          slotIndex = newInventory.findIndex(s => !s.resourceId);
        }
        if (slotIndex !== -1) {
          if (newInventory[slotIndex].resourceId === resourceId) {
            newInventory[slotIndex] = { ...newInventory[slotIndex], quantity: newInventory[slotIndex].quantity + 1 };
          } else {
            newInventory[slotIndex] = { resourceId, quantity: 1 };
          }
        }
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

  const gatherFromTile = useCallback((x: number, y: number, resourceId: string) => {
    const currentWorld = world;
    const tile = currentWorld.map.tiles[y][x];
    
    if (!tile.resources.includes(resourceId)) return;
    if (tile.claimedBy && tile.claimedBy !== currentWorld.userId) return;
    
    // Cannot gather player-placed resources - they must be destroyed
    if (tile.placedResources?.includes(resourceId)) {
      toast.error('Placed items cannot be gathered. Use a tool to destroy it.');
      return;
    }
    
    const newTiles = currentWorld.map.tiles.map((row, ry) =>
      row.map((t, rx) =>
        rx === x && ry === y
          ? { ...t, resources: t.resources.filter(r => r !== resourceId) }
          : t
      )
    );
    const newMapData: WorldMap = { ...currentWorld.map, tiles: newTiles };
    
    // Compute inventory inside setWorld for accurate prev state
    setWorld(prev => {
      const newInventory = [...prev.inventory];
      let slotIndex = newInventory.findIndex(s => s.resourceId === resourceId && s.quantity < 99);
      if (slotIndex === -1) {
        slotIndex = newInventory.findIndex(s => !s.resourceId);
      }
      if (slotIndex === -1) return prev; // No empty slot, don't update
      
      if (newInventory[slotIndex].resourceId === resourceId) {
        newInventory[slotIndex] = { ...newInventory[slotIndex], quantity: newInventory[slotIndex].quantity + 1 };
      } else {
        newInventory[slotIndex] = { resourceId, quantity: 1, life: 100 };
      }
      
      return {
        ...prev,
        inventory: newInventory,
        map: newMapData,
      };
    });

    setTimeout(() => saveMapData(newMapData), 500);
  }, [world, saveMapData]);

  const addResource = useCallback(async (resource: Resource) => {
    if (!isOwner) return;
    
    // Add to repository and get the new ID
    const newId = await addResourceToRepository(resource, world.userId);
    if (newId) {
      const resourceWithId = { ...resource, id: newId };
      setWorld(prev => ({ ...prev, resources: [...prev.resources, resourceWithId] }));
      setTimeout(saveWorldData, 500);
    }
  }, [isOwner, world.userId, saveWorldData]);

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
    
    // Note: We don't delete from repository since other worlds might use it
    // We just remove the reference from this world
    setWorld(prev => ({
      ...prev,
      resources: prev.resources.filter(r => r.id !== id),
    }));
    setTimeout(saveWorldData, 500);
  }, [isOwner, saveWorldData]);

  const respawnResources = useCallback(() => {
    if (!isOwner) return;
    
    const currentWorld = world;
    const newTiles = currentWorld.map.tiles.map(row => 
      row.map(t => {
        // Preserve player-placed resources
        const placedResources = t.placedResources || [];
        return { 
          ...t, 
          resources: t.claimedBy ? [...placedResources] : [...placedResources],
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
    setTimeout(saveWorldData, 500);
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
    }));
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

      for (const ingredient of recipe.ingredients) {
        if ((inventoryCounts[ingredient.resourceId] || 0) < ingredient.quantity) {
          const ingResource = prev.resources.find(r => r.id === ingredient.resourceId);
          result = { success: false, message: `Not enough ${ingResource?.name || ingredient.resourceId}` };
          return prev;
        }
      }

      let newInventory = [...prev.inventory];
      for (const ingredient of recipe.ingredients) {
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

      let outputRemaining = recipe.outputQuantity;
      for (let i = 0; i < newInventory.length && outputRemaining > 0; i++) {
        if (newInventory[i].resourceId === resourceId && newInventory[i].quantity < 99) {
          const add = Math.min(99 - newInventory[i].quantity, outputRemaining);
          newInventory[i] = { ...newInventory[i], quantity: newInventory[i].quantity + add };
          outputRemaining -= add;
        }
      }
      for (let i = 0; i < newInventory.length && outputRemaining > 0; i++) {
        if (newInventory[i].resourceId === null) {
          const add = Math.min(99, outputRemaining);
          newInventory[i] = { resourceId, quantity: add, life: 100 };
          outputRemaining -= add;
        }
      }

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
      
      // Apply health gain
      const healthGain = resource.healthGain || 0;
      const newHealth = Math.min(MAX_HEALTH, prev.health + healthGain);
      
      // Apply XP gain
      const xpGain = resource.givesXp ? (resource.xpAmount || 0) : 0;
      const newXp = prev.xp + xpGain;
      
      const messages: string[] = [];
      if (healthGain > 0) messages.push(`+${healthGain} health`);
      if (xpGain > 0) messages.push(`+${xpGain} XP`);
      
      result = { 
        success: true, 
        message: messages.length > 0 
          ? `Consumed ${resource.name}! ${messages.join(', ')}` 
          : `Consumed ${resource.name}!` 
      };
      
      return { ...prev, inventory: newInventory, health: newHealth, xp: newXp };
    });
    
    return result;
  }, []);

  const takeDamage = useCallback((amount: number): { success: boolean; health: number } => {
    let newHealth = 0;
    setWorld(prev => {
      newHealth = Math.max(0, prev.health - amount);
      return { ...prev, health: newHealth };
    });
    return { success: true, health: newHealth };
  }, []);

  const placeItem = useCallback((resourceId: string, direction: 'north' | 'south' | 'east' | 'west'): { success: boolean; message: string } => {
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
      
      // Calculate target position based on direction
      let targetX = prev.playerPosition.x;
      let targetY = prev.playerPosition.y;
      
      switch (direction) {
        case 'north': targetY -= 1; break;
        case 'south': targetY += 1; break;
        case 'east': targetX += 1; break;
        case 'west': targetX -= 1; break;
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
    facingDirection: 'north' | 'south' | 'east' | 'west'
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
      
      // Calculate target tile based on facing direction
      let targetX = prev.playerPosition.x;
      let targetY = prev.playerPosition.y;
      
      switch (facingDirection) {
        case 'north': targetY -= 1; break;
        case 'south': targetY += 1; break;
        case 'east': targetX += 1; break;
        case 'west': targetX -= 1; break;
      }
      
      // Check bounds
      if (targetX < 0 || targetX >= prev.map.width || targetY < 0 || targetY >= prev.map.height) {
        result = { success: false, message: 'Nothing to use item on' };
        return prev;
      }
      
      const targetTile = prev.map.tiles[targetY][targetX];
      
      // Check for produce tile functionality first (on empty tiles without resources)
      if (canProduceTile && targetTile.resources.length === 0) {
        const newTileType = heldResource.produceTileType!;
        
        // Transform the tile
        let newTiles = prev.map.tiles.map((row, ry) =>
          row.map((t, rx) => {
            if (rx === targetX && ry === targetY) {
              return { 
                ...t, 
                type: newTileType,
                walkable: !['water', 'lava', 'stone'].includes(newTileType)
              };
            }
            return t;
          })
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
        
        result = { success: true, message: `Transformed tile to ${newTileType}` };
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
          for (const ingredient of recipe.ingredients) {
            for (let i = 0; i < ingredient.quantity; i++) {
              // Add ingredient to inventory
              let slotIndex = newInventory.findIndex(s => s.resourceId === ingredient.resourceId && s.quantity < 99);
              if (slotIndex === -1) {
                slotIndex = newInventory.findIndex(s => !s.resourceId);
              }
              if (slotIndex !== -1) {
                if (newInventory[slotIndex].resourceId === ingredient.resourceId) {
                  newInventory[slotIndex] = { ...newInventory[slotIndex], quantity: newInventory[slotIndex].quantity + 1 };
                } else {
                  newInventory[slotIndex] = { resourceId: ingredient.resourceId, quantity: 1, life: 100 };
                }
              }
            }
          }
          destroyedMessage = ` Broke into components!`;
        } else {
          // No recipe - give the resource itself
          let slotIndex = newInventory.findIndex(s => s.resourceId === destructibleResourceId && s.quantity < 99);
          if (slotIndex === -1) {
            slotIndex = newInventory.findIndex(s => !s.resourceId);
          }
          if (slotIndex !== -1) {
            if (newInventory[slotIndex].resourceId === destructibleResourceId) {
              newInventory[slotIndex] = { ...newInventory[slotIndex], quantity: newInventory[slotIndex].quantity + 1 };
            } else {
              newInventory[slotIndex] = { resourceId: destructibleResourceId, quantity: 1, life: 100 };
            }
          }
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

  const buyFromMarket = useCallback((resource: Resource, cost: number): { success: boolean; message: string } => {
    let result = { success: false, message: '' };
    
    setWorld(prev => {
      if (prev.coins < cost) {
        result = { success: false, message: 'Not enough coins' };
        return prev;
      }
      
      // Check if resource with same name already exists in world
      const existingResource = prev.resources.find(r => r.name.toLowerCase() === resource.name.toLowerCase());
      const resourceIdToUse = existingResource ? existingResource.id : resource.id;
      
      // Find empty slot or existing slot with same resource
      const newInventory = [...prev.inventory];
      let slotIndex = newInventory.findIndex(s => s.resourceId === resourceIdToUse && s.quantity < 99);
      if (slotIndex === -1) {
        slotIndex = newInventory.findIndex(s => !s.resourceId);
      }
      
      if (slotIndex === -1) {
        result = { success: false, message: 'Inventory full' };
        return prev;
      }
      
      if (newInventory[slotIndex].resourceId === resourceIdToUse) {
        newInventory[slotIndex] = { ...newInventory[slotIndex], quantity: newInventory[slotIndex].quantity + 1 };
      } else {
        newInventory[slotIndex] = { resourceId: resourceIdToUse, quantity: 1, life: 100 };
      }
      
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

  const sellToMarket = useCallback((resourceId: string, value: number): { success: boolean; message: string } => {
    let result = { success: false, message: '' };
    
    setWorld(prev => {
      const slotIndex = prev.inventory.findIndex(s => s.resourceId === resourceId && s.quantity > 0);
      
      if (slotIndex === -1) {
        result = { success: false, message: "You don't have this item" };
        return prev;
      }
      
      const newInventory = [...prev.inventory];
      newInventory[slotIndex] = { 
        ...newInventory[slotIndex], 
        quantity: newInventory[slotIndex].quantity - 1 
      };
      
      if (newInventory[slotIndex].quantity === 0) {
        newInventory[slotIndex] = { resourceId: null, quantity: 0 };
      }
      
      result = { success: true, message: `Sold for ${value} coins!` };
      return { ...prev, coins: prev.coins + value, inventory: newInventory };
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

  const toggleEnableStrangers = useCallback(async (enabled: boolean, density: number = 0.02) => {
    if (!isOwner || !dbWorldId) return;
    
    const strangerDensity = enabled ? Math.min(Math.max(density, 0.001), 1) : 0.02;
    
    setWorld(prev => {
      const strangers = enabled 
        ? generateStrangers(strangerDensity, prev.map, prev.strangers)
        : [];
      return { ...prev, enableStrangers: enabled, strangerDensity, strangers };
    });
    
    await supabase
      .from('worlds')
      .update({ 
        enable_strangers: enabled,
        stranger_density: strangerDensity
      })
      .eq('id', dbWorldId);
  }, [isOwner, dbWorldId]);

  const updateStrangerDensity = useCallback(async (density: number) => {
    if (!isOwner || !dbWorldId) return;
    
    const strangerDensity = Math.min(Math.max(density, 0.001), 1);
    
    setWorld(prev => {
      const strangers = generateStrangers(strangerDensity, prev.map);
      return { 
        ...prev, 
        strangerDensity,
        enableStrangers: true,
        strangers,
      };
    });
    
    await supabase
      .from('worlds')
      .update({ 
        enable_strangers: true,
        stranger_density: strangerDensity
      })
      .eq('id', dbWorldId);
  }, [isOwner, dbWorldId]);

  return {
    world,
    setWorld,
    selectedTile,
    isOwner,
    members,
    loading,
    movePlayer,
    selectTile,
    claimTile,
    claimMultipleTiles,
    gatherFromTile,
    addResource,
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
    renameTile,
    consumeResource,
    takeDamage,
    placeItem,
    useItemOnFacingTile,
    toggleEnableMarkets,
    addMarket,
    removeMarket,
    buyFromMarket,
    sellToMarket,
    toggleEnableNpcs,
    updateNpcCount,
    toggleEnableStrangers,
    updateStrangerDensity,
    saveMapData,
  };
};
