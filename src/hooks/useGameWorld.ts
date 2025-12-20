import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameWorld, Resource, Sovereignty, Market, generateMap, createEmptyInventory, USER_COLORS, STARTING_COINS, STARTING_HEALTH, MAX_HEALTH, HEALTH_DECAY_PER_DAY, calculateTileValue, WorldMap, TILE_TYPES } from '@/types/game';
import type { Json } from '@/integrations/supabase/types';

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
    enableMarkets: false,
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
          health?: number;
        };

        const mapData = worldData.map_data as unknown as WorldMap;
        const resources = worldData.resources as unknown as Resource[];

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
          createdAt: worldData.created_at,
          health: playerData.health ?? STARTING_HEALTH,
          joinCode: worldData.join_code,
          enableMarkets: worldData.enable_markets ?? false,
          markets: (worldData.markets as unknown as Market[]) ?? [],
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
        health: world.health,
      };

      await supabase
        .from('world_members')
        .update({ player_data: JSON.parse(JSON.stringify(playerData)) as Json })
        .eq('world_id', dbWorldId)
        .eq('user_id', user.id);
    };

    const timeoutId = setTimeout(savePlayerData, 1000);
    return () => clearTimeout(timeoutId);
  }, [dbWorldId, world.playerPosition, world.inventory, world.coins, world.userColor, world.sovereignty, world.health, loading]);

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

  // Save world data (name, resources) - only for owners
  const saveWorldData = useCallback(async () => {
    if (!dbWorldId || !isOwner) return;

    await supabase
      .from('worlds')
      .update({
        name: world.name,
        resources: JSON.parse(JSON.stringify(world.resources)) as Json,
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
            newInventory[slotIndex] = { resourceId, quantity: 1 };
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

  const gatherFromTile = useCallback((x: number, y: number, resourceId: string) => {
    const currentWorld = world;
    const tile = currentWorld.map.tiles[y][x];
    
    if (!tile.resources.includes(resourceId)) return;
    if (tile.claimedBy && tile.claimedBy !== currentWorld.userId) return;
    
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
        newInventory[slotIndex] = { resourceId, quantity: 1 };
      }
      
      return {
        ...prev,
        inventory: newInventory,
        map: newMapData,
      };
    });

    setTimeout(() => saveMapData(newMapData), 500);
  }, [world, saveMapData]);

  const addResource = useCallback((resource: Resource) => {
    if (!isOwner) return;
    setWorld(prev => ({ ...prev, resources: [...prev.resources, resource] }));
    setTimeout(saveWorldData, 500);
  }, [isOwner, saveWorldData]);

  const updateResource = useCallback((resource: Resource) => {
    if (!isOwner) return;
    setWorld(prev => ({
      ...prev,
      resources: prev.resources.map(r => r.id === resource.id ? resource : r),
    }));
    setTimeout(saveWorldData, 500);
  }, [isOwner, saveWorldData]);

  const deleteResource = useCallback((id: string) => {
    if (!isOwner) return;
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
      row.map(t => ({ ...t, resources: t.claimedBy ? [] : [] }))
    );
    
    for (let y = 0; y < newTiles.length; y++) {
      for (let x = 0; x < newTiles[y].length; x++) {
        const tile = newTiles[y][x];
        if (!tile.claimedBy) {
          const validResources = currentWorld.resources.filter(r => r.spawnTiles.includes(tile.type));
          for (const resource of validResources) {
            if (Math.random() < resource.spawnChance) {
              tile.resources.push(resource.id);
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
          newInventory[i] = { resourceId, quantity: add };
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
      
      result = { 
        success: true, 
        message: healthGain > 0 
          ? `Consumed ${resource.name}! +${healthGain} health` 
          : `Consumed ${resource.name}!` 
      };
      
      return { ...prev, inventory: newInventory, health: newHealth };
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
      
      // Remove from inventory
      const newInventory = [...prev.inventory];
      newInventory[slotIndex] = { 
        ...newInventory[slotIndex], 
        quantity: newInventory[slotIndex].quantity - 1 
      };
      if (newInventory[slotIndex].quantity === 0) {
        newInventory[slotIndex] = { resourceId: null, quantity: 0 };
      }
      
      // Add resource to tile
      const newTiles = prev.map.tiles.map((row, ry) =>
        row.map((t, rx) =>
          rx === targetX && ry === targetY
            ? { ...t, resources: [...t.resources, resourceId] }
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
      
      // Find empty slot or existing slot with same resource
      const newInventory = [...prev.inventory];
      let slotIndex = newInventory.findIndex(s => s.resourceId === resource.id && s.quantity < 99);
      if (slotIndex === -1) {
        slotIndex = newInventory.findIndex(s => !s.resourceId);
      }
      
      if (slotIndex === -1) {
        result = { success: false, message: 'Inventory full' };
        return prev;
      }
      
      if (newInventory[slotIndex].resourceId === resource.id) {
        newInventory[slotIndex] = { ...newInventory[slotIndex], quantity: newInventory[slotIndex].quantity + 1 };
      } else {
        newInventory[slotIndex] = { resourceId: resource.id, quantity: 1 };
      }
      
      result = { success: true, message: `Purchased ${resource.name}!` };
      return { ...prev, coins: prev.coins - cost, inventory: newInventory };
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

  return {
    world,
    selectedTile,
    isOwner,
    members,
    loading,
    movePlayer,
    selectTile,
    claimTile,
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
    renameTile,
    consumeResource,
    takeDamage,
    placeItem,
    toggleEnableMarkets,
    addMarket,
    removeMarket,
    buyFromMarket,
    sellToMarket,
  };
};
