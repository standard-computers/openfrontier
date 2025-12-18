import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameWorld, Resource, Sovereignty, DEFAULT_RESOURCES, generateMap, createEmptyInventory, USER_COLORS, STARTING_COINS, calculateTileValue, WorldMap } from '@/types/game';
import type { Json } from '@/integrations/supabase/types';

const getDefaultWorld = (): GameWorld => {
  const resources = [...DEFAULT_RESOURCES];
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
        };

        const mapData = worldData.map_data as unknown as WorldMap;
        const resources = worldData.resources as unknown as Resource[];

        setDbWorldId(worldId);
        setIsOwner(membershipData.role === 'owner');
        setWorld({
          id: worldId,
          name: worldData.name,
          map: mapData,
          resources: resources,
          inventory: playerData.inventory || createEmptyInventory(),
          playerPosition: playerData.position || mapData.spawnPoint || { x: 0, y: 0 },
          userId: user.id,
          userColor: playerData.userColor || USER_COLORS[0],
          coins: playerData.coins ?? STARTING_COINS,
          sovereignty: playerData.sovereignty,
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
      };

      await supabase
        .from('world_members')
        .update({ player_data: JSON.parse(JSON.stringify(playerData)) as Json })
        .eq('world_id', dbWorldId)
        .eq('user_id', user.id);
    };

    const timeoutId = setTimeout(savePlayerData, 1000);
    return () => clearTimeout(timeoutId);
  }, [dbWorldId, world.playerPosition, world.inventory, world.coins, world.userColor, world.sovereignty, loading]);

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
      if (!prev.map.tiles[newY][newX].walkable) return prev;
      
      return { ...prev, playerPosition: { x: newX, y: newY } };
    });
  }, []);

  const selectTile = useCallback((x: number, y: number) => {
    setSelectedTile(prev => 
      prev?.x === x && prev?.y === y ? null : { x, y }
    );
  }, []);

  const claimTile = useCallback((x: number, y: number): { success: boolean; message: string } => {
    let result = { success: false, message: '' };
    let newMapData: WorldMap | null = null;
    
    setWorld(prev => {
      const tile = prev.map.tiles[y][x];
      if (tile.claimedBy) {
        result = { success: false, message: 'Tile already claimed' };
        return prev;
      }
      
      const tileValue = calculateTileValue(tile, prev.resources);
      
      if (prev.coins < tileValue) {
        result = { success: false, message: `Not enough coins! Need ${tileValue} coins` };
        return prev;
      }
      
      let newInventory = [...prev.inventory];
      for (const resourceId of tile.resources) {
        let slotIndex = newInventory.findIndex(s => s.resourceId === resourceId && s.quantity < 99);
        if (slotIndex === -1) {
          slotIndex = newInventory.findIndex(s => s.resourceId === null);
        }
        if (slotIndex !== -1) {
          if (newInventory[slotIndex].resourceId === resourceId) {
            newInventory[slotIndex] = { ...newInventory[slotIndex], quantity: newInventory[slotIndex].quantity + 1 };
          } else {
            newInventory[slotIndex] = { resourceId, quantity: 1 };
          }
        }
      }
      
      const newTiles = prev.map.tiles.map((row, ry) =>
        row.map((t, rx) =>
          rx === x && ry === y ? { ...t, claimedBy: prev.userId, resources: [] } : t
        )
      );
      
      newMapData = { ...prev.map, tiles: newTiles };
      result = { success: true, message: `Claimed for ${tileValue} coins!` };
      
      return {
        ...prev,
        coins: prev.coins - tileValue,
        inventory: newInventory,
        map: newMapData,
      };
    });

    // Save map changes with the new map data directly
    if (result.success && newMapData) {
      setTimeout(() => saveMapData(newMapData!), 500);
    }
    
    return result;
  }, [saveMapData]);

  const gatherFromTile = useCallback((x: number, y: number, resourceId: string) => {
    let newMapData: WorldMap | null = null;
    
    setWorld(prev => {
      const tile = prev.map.tiles[y][x];
      if (!tile.resources.includes(resourceId)) return prev;
      if (tile.claimedBy && tile.claimedBy !== prev.userId) return prev;
      
      const newInventory = [...prev.inventory];
      let slotIndex = newInventory.findIndex(s => s.resourceId === resourceId && s.quantity < 99);
      if (slotIndex === -1) {
        slotIndex = newInventory.findIndex(s => s.resourceId === null);
      }
      if (slotIndex === -1) return prev;
      
      if (newInventory[slotIndex].resourceId === resourceId) {
        newInventory[slotIndex].quantity++;
      } else {
        newInventory[slotIndex] = { resourceId, quantity: 1 };
      }
      
      const newTiles = prev.map.tiles.map((row, ry) =>
        row.map((t, rx) =>
          rx === x && ry === y
            ? { ...t, resources: t.resources.filter(r => r !== resourceId) }
            : t
        )
      );
      
      newMapData = { ...prev.map, tiles: newTiles };
      
      return {
        ...prev,
        inventory: newInventory,
        map: newMapData,
      };
    });

    // Save map changes with the new map data directly
    if (newMapData) {
      setTimeout(() => saveMapData(newMapData!), 500);
    }
  }, [saveMapData]);

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
    let newMapData: WorldMap | null = null;
    
    setWorld(prev => {
      const newTiles = prev.map.tiles.map(row => 
        row.map(t => ({ ...t, resources: t.claimedBy ? [] : t.resources }))
      );
      for (let y = 0; y < newTiles.length; y++) {
        for (let x = 0; x < newTiles[y].length; x++) {
          const tile = newTiles[y][x];
          if (!tile.claimedBy) {
            tile.resources = [];
            const validResources = prev.resources.filter(r => r.spawnTiles.includes(tile.type));
            for (const resource of validResources) {
              if (Math.random() < resource.spawnChance) {
                tile.resources.push(resource.id);
              }
            }
          }
        }
      }
      newMapData = { ...prev.map, tiles: newTiles };
      return { ...prev, map: newMapData };
    });
    
    if (newMapData) {
      setTimeout(() => saveMapData(newMapData!), 500);
    }
  }, [isOwner, saveMapData]);

  const updateWorldName = useCallback((name: string) => {
    if (!isOwner) return;
    setWorld(prev => ({ ...prev, name }));
    setTimeout(saveWorldData, 500);
  }, [isOwner, saveWorldData]);

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
  };
};
