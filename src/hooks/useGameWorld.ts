import { useState, useEffect, useCallback } from 'react';
import { GameWorld, Resource, Position, DEFAULT_RESOURCES, generateMap, createEmptyInventory, seedResources, TileType, TILE_TYPES, USER_COLORS } from '@/types/game';

const STORAGE_KEY = 'pixel-world-v3';
const MAP_WIDTH = 80;
const MAP_HEIGHT = 50;

const getDefaultWorld = (): GameWorld => {
  const resources = [...DEFAULT_RESOURCES];
  const map = generateMap(MAP_WIDTH, MAP_HEIGHT, resources);
  
  let spawnX = map.spawnPoint.x;
  let spawnY = map.spawnPoint.y;
  while (!map.tiles[spawnY][spawnX].walkable) {
    spawnX = Math.floor(Math.random() * MAP_WIDTH);
    spawnY = Math.floor(Math.random() * MAP_HEIGHT);
  }
  map.spawnPoint = { x: spawnX, y: spawnY };
  
  return {
    id: 'world-1',
    name: 'My World',
    map,
    resources,
    inventory: createEmptyInventory(),
    playerPosition: { ...map.spawnPoint },
    userId: 'player-1',
    userColor: USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)],
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

  const [selectedTile, setSelectedTile] = useState<Position | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(world));
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

  const claimTile = useCallback((x: number, y: number) => {
    setWorld(prev => {
      const tile = prev.map.tiles[y][x];
      if (tile.claimedBy) return prev; // Already claimed
      
      const newTiles = prev.map.tiles.map((row, ry) =>
        row.map((t, rx) =>
          rx === x && ry === y ? { ...t, claimedBy: prev.userId } : t
        )
      );
      
      return { ...prev, map: { ...prev.map, tiles: newTiles } };
    });
  }, []);

  const gatherFromTile = useCallback((x: number, y: number, resourceId: string) => {
    setWorld(prev => {
      const tile = prev.map.tiles[y][x];
      if (!tile.resources.includes(resourceId)) return prev;
      if (tile.claimedBy && tile.claimedBy !== prev.userId) return prev; // Not your tile
      
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
      
      // Remove resource from tile
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
      };
    });
  }, []);

  const respawnResources = useCallback(() => {
    setWorld(prev => {
      const newTiles = prev.map.tiles.map(row => row.map(t => ({ ...t, resources: [] })));
      seedResources(newTiles, prev.resources);
      return { ...prev, map: { ...prev.map, tiles: newTiles } };
    });
  }, []);

  const updateWorldName = useCallback((name: string) => {
    setWorld(prev => ({ ...prev, name }));
  }, []);

  const setUserColor = useCallback((color: string) => {
    setWorld(prev => ({ ...prev, userColor: color }));
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
  };
};
