import { useState, useEffect, useCallback } from 'react';
import { GameWorld, WorldMap, Resource, Recipe, InventorySlot, Position, DEFAULT_RESOURCES, DEFAULT_RECIPES, createEmptyMap } from '@/types/game';

const STORAGE_KEY = 'pixel-game-world';

const createEmptyInventory = (size: number = 20): InventorySlot[] =>
  Array.from({ length: size }, () => ({ resourceId: null, quantity: 0 }));

const getDefaultWorld = (): GameWorld => {
  const defaultMap = createEmptyMap(30, 20, 'Starting Area');
  // Add some variety to the default map
  for (let y = 0; y < defaultMap.height; y++) {
    for (let x = 0; x < defaultMap.width; x++) {
      const rand = Math.random();
      if (rand < 0.05) {
        defaultMap.tiles[y][x] = { type: 'water', walkable: false };
      } else if (rand < 0.1) {
        defaultMap.tiles[y][x] = { type: 'stone', walkable: true };
      } else if (rand < 0.15) {
        defaultMap.tiles[y][x] = { type: 'sand', walkable: true };
      }
      // Add some resources
      if (defaultMap.tiles[y][x].walkable && Math.random() < 0.08) {
        const resources = ['wood', 'stone', 'fiber', 'mushroom'];
        defaultMap.tiles[y][x].resource = resources[Math.floor(Math.random() * resources.length)];
      }
    }
  }
  
  return {
    id: 'default-world',
    name: 'My World',
    maps: [defaultMap],
    resources: DEFAULT_RESOURCES,
    recipes: DEFAULT_RECIPES,
    currentMapId: defaultMap.id,
    inventory: createEmptyInventory(),
    playerPosition: { ...defaultMap.spawnPoint },
  };
};

export const useGameWorld = () => {
  const [world, setWorld] = useState<GameWorld>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return getDefaultWorld();
      }
    }
    return getDefaultWorld();
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(world));
  }, [world]);

  const currentMap = world.maps.find(m => m.id === world.currentMapId) || world.maps[0];

  const movePlayer = useCallback((dx: number, dy: number) => {
    setWorld(prev => {
      const map = prev.maps.find(m => m.id === prev.currentMapId);
      if (!map) return prev;
      
      const newX = prev.playerPosition.x + dx;
      const newY = prev.playerPosition.y + dy;
      
      if (newX < 0 || newX >= map.width || newY < 0 || newY >= map.height) return prev;
      if (!map.tiles[newY][newX].walkable) return prev;
      
      return { ...prev, playerPosition: { x: newX, y: newY } };
    });
  }, []);

  const gatherResource = useCallback(() => {
    setWorld(prev => {
      const map = prev.maps.find(m => m.id === prev.currentMapId);
      if (!map) return prev;
      
      const tile = map.tiles[prev.playerPosition.y][prev.playerPosition.x];
      if (!tile.resource) return prev;
      
      const resourceId = tile.resource;
      const newInventory = [...prev.inventory];
      
      // Find existing slot or empty slot
      let slotIndex = newInventory.findIndex(s => s.resourceId === resourceId && s.quantity < 99);
      if (slotIndex === -1) {
        slotIndex = newInventory.findIndex(s => s.resourceId === null);
      }
      
      if (slotIndex === -1) return prev; // Inventory full
      
      if (newInventory[slotIndex].resourceId === resourceId) {
        newInventory[slotIndex].quantity++;
      } else {
        newInventory[slotIndex] = { resourceId, quantity: 1 };
      }
      
      // Remove resource from map
      const newMaps = prev.maps.map(m => {
        if (m.id !== prev.currentMapId) return m;
        const newTiles = m.tiles.map((row, y) =>
          row.map((t, x) =>
            y === prev.playerPosition.y && x === prev.playerPosition.x
              ? { ...t, resource: undefined }
              : t
          )
        );
        return { ...m, tiles: newTiles };
      });
      
      return { ...prev, inventory: newInventory, maps: newMaps };
    });
  }, []);

  const updateTile = useCallback((x: number, y: number, updates: Partial<typeof currentMap.tiles[0][0]>) => {
    setWorld(prev => ({
      ...prev,
      maps: prev.maps.map(m =>
        m.id === prev.currentMapId
          ? {
              ...m,
              tiles: m.tiles.map((row, ry) =>
                row.map((tile, rx) =>
                  rx === x && ry === y ? { ...tile, ...updates } : tile
                )
              ),
            }
          : m
      ),
    }));
  }, []);

  const addMap = useCallback((name: string, width: number, height: number) => {
    const newMap = createEmptyMap(width, height, name);
    setWorld(prev => ({ ...prev, maps: [...prev.maps, newMap] }));
    return newMap.id;
  }, []);

  const switchMap = useCallback((mapId: string) => {
    setWorld(prev => {
      const map = prev.maps.find(m => m.id === mapId);
      if (!map) return prev;
      return { ...prev, currentMapId: mapId, playerPosition: { ...map.spawnPoint } };
    });
  }, []);

  const updateWorldName = useCallback((name: string) => {
    setWorld(prev => ({ ...prev, name }));
  }, []);

  const updateMapName = useCallback((mapId: string, name: string) => {
    setWorld(prev => ({
      ...prev,
      maps: prev.maps.map(m => m.id === mapId ? { ...m, name } : m),
    }));
  }, []);

  const deleteMap = useCallback((mapId: string) => {
    setWorld(prev => {
      if (prev.maps.length <= 1) return prev;
      const newMaps = prev.maps.filter(m => m.id !== mapId);
      const newCurrentId = prev.currentMapId === mapId ? newMaps[0].id : prev.currentMapId;
      return { ...prev, maps: newMaps, currentMapId: newCurrentId };
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

  const resetWorld = useCallback(() => {
    setWorld(getDefaultWorld());
  }, []);

  return {
    world,
    currentMap,
    movePlayer,
    gatherResource,
    updateTile,
    addMap,
    switchMap,
    updateWorldName,
    updateMapName,
    deleteMap,
    addResource,
    updateResource,
    deleteResource,
    resetWorld,
  };
};
