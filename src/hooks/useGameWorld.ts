import { useState, useEffect, useCallback } from 'react';
import { GameWorld, Resource, DEFAULT_RESOURCES, generateMap, createEmptyInventory, USER_COLORS, STARTING_COINS, calculateTileValue } from '@/types/game';

const MAP_WIDTH = 80;
const MAP_HEIGHT = 50;

const getStorageKey = () => {
  const worldId = localStorage.getItem('currentWorldId');
  return worldId ? `gameWorld-${worldId}` : 'gameWorld-default';
};

const getDefaultWorld = (worldName?: string): GameWorld => {
  const resources = [...DEFAULT_RESOURCES];
  const map = generateMap(MAP_WIDTH, MAP_HEIGHT, resources);
  
  let spawnX = map.spawnPoint.x;
  let spawnY = map.spawnPoint.y;
  while (!map.tiles[spawnY][spawnX].walkable) {
    spawnX = Math.floor(Math.random() * MAP_WIDTH);
    spawnY = Math.floor(Math.random() * MAP_HEIGHT);
  }
  map.spawnPoint = { x: spawnX, y: spawnY };
  
  const worldId = localStorage.getItem('currentWorldId') || 'world-default';
  
  // Try to get world name from savedWorlds
  let name = worldName || 'My World';
  try {
    const savedWorlds = localStorage.getItem('savedWorlds');
    if (savedWorlds) {
      const worlds = JSON.parse(savedWorlds);
      const found = worlds.find((w: { id: string; name: string }) => w.id === worldId);
      if (found) name = found.name;
    }
  } catch {}
  
  return {
    id: worldId,
    name,
    map,
    resources,
    inventory: createEmptyInventory(),
    playerPosition: { ...map.spawnPoint },
    userId: 'player-1',
    userColor: USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)],
    coins: STARTING_COINS,
  };
};

export const useGameWorld = () => {
  const [world, setWorld] = useState<GameWorld>(() => {
    const storageKey = getStorageKey();
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.coins === undefined) {
          parsed.coins = STARTING_COINS;
        }
        return parsed;
      } catch {
        return getDefaultWorld();
      }
    }
    return getDefaultWorld();
  });

  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const storageKey = getStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(world));
  }, [world]);

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
      
      // Add resources to inventory
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
      
      // Claim tile and clear resources (they're now in inventory)
      const newTiles = prev.map.tiles.map((row, ry) =>
        row.map((t, rx) =>
          rx === x && ry === y ? { ...t, claimedBy: prev.userId, resources: [] } : t
        )
      );
      
      result = { success: true, message: `Claimed for ${tileValue} coins!` };
      
      return {
        ...prev,
        coins: prev.coins - tileValue,
        inventory: newInventory,
        map: { ...prev.map, tiles: newTiles },
      };
    });
    
    return result;
  }, []);

  const gatherFromTile = useCallback((x: number, y: number, resourceId: string) => {
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
      
      return {
        ...prev,
        inventory: newInventory,
        map: { ...prev.map, tiles: newTiles },
      };
    });
  }, []);

  const addResource = useCallback((resource: Resource) => {
    setWorld(prev => ({ ...prev, resources: [...prev.resources, resource] }));
  }, []);

  const updateResource = useCallback((resource: Resource) => {
    setWorld(prev => ({
      ...prev,
      resources: prev.resources.map(r => r.id === resource.id ? resource : r),
    }));
  }, []);

  const deleteResource = useCallback((id: string) => {
    setWorld(prev => ({
      ...prev,
      resources: prev.resources.filter(r => r.id !== id),
    }));
  }, []);

  const regenerateWorld = useCallback(() => {
    setWorld(prev => {
      const newMap = generateMap(MAP_WIDTH, MAP_HEIGHT, prev.resources);
      let spawnX = newMap.spawnPoint.x;
      let spawnY = newMap.spawnPoint.y;
      while (!newMap.tiles[spawnY][spawnX].walkable) {
        spawnX = Math.floor(Math.random() * MAP_WIDTH);
        spawnY = Math.floor(Math.random() * MAP_HEIGHT);
      }
      return {
        ...prev,
        map: newMap,
        playerPosition: { x: spawnX, y: spawnY },
        inventory: createEmptyInventory(),
        coins: STARTING_COINS,
      };
    });
  }, []);

  const respawnResources = useCallback(() => {
    setWorld(prev => {
      const newTiles = prev.map.tiles.map(row => 
        row.map(t => ({ ...t, resources: t.claimedBy ? [] : t.resources }))
      );
      // Only reseed unclaimed tiles
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
      return { ...prev, map: { ...prev.map, tiles: newTiles } };
    });
  }, []);

  const updateWorldName = useCallback((name: string) => {
    setWorld(prev => ({ ...prev, name }));
  }, []);

  const setUserColor = useCallback((color: string) => {
    setWorld(prev => ({ ...prev, userColor: color }));
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

      // Check if we have all ingredients
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

      // Remove ingredients from inventory
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

      // Add crafted resource to inventory
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
    movePlayer,
    selectTile,
    claimTile,
    gatherFromTile,
    addResource,
    updateResource,
    deleteResource,
    regenerateWorld,
    respawnResources,
    updateWorldName,
    setUserColor,
    craftResource,
  };
};
