import { useState, useCallback } from 'react';
import { GameWorld, Resource, generateMap, createEmptyInventory, USER_COLORS, STARTING_COINS, STARTING_HEALTH, DEFAULT_RESOURCES, WorldMap, TILE_TYPES, generateStrangers, Position } from '@/types/game';
import type { WorldMember } from '@/hooks/useGameWorld';

// Generate a demo world for unauthenticated users to explore
const createDemoWorld = (): GameWorld => {
  const resources: Resource[] = [...DEFAULT_RESOURCES];
  const map = generateMap(80, 50, resources);
  
  // Generate some strangers to make the world feel alive
  const strangers = generateStrangers(0.02, map);
  
  return {
    id: 'demo-world',
    name: 'Demo World',
    map,
    resources,
    inventory: createEmptyInventory(),
    playerPosition: { ...map.spawnPoint },
    userId: 'demo-player',
    userColor: USER_COLORS[0],
    coins: STARTING_COINS,
    createdAt: new Date().toISOString(),
    health: STARTING_HEALTH,
    xp: 0,
    enableMarkets: false,
    openMarkets: false,
    markets: [],
    enableStrangers: true,
    strangerDensity: 0.02,
    strangers,
  };
};

export const useDemoWorld = () => {
  const [world, setWorld] = useState<GameWorld>(createDemoWorld);
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);
  const [loading] = useState(false);

  // Movement works in demo mode
  const movePlayer = useCallback((dx: number, dy: number) => {
    setWorld(prev => {
      const newX = prev.playerPosition.x + dx;
      const newY = prev.playerPosition.y + dy;
      
      if (newX < 0 || newX >= prev.map.width || newY < 0 || newY >= prev.map.height) return prev;
      
      const targetTile = prev.map.tiles[newY][newX];
      const tileTypeInfo = TILE_TYPES.find(t => t.type === targetTile.type);
      const isWalkable = tileTypeInfo?.walkable ?? targetTile.walkable;
      
      if (!isWalkable) return prev;
      
      // Check if any non-passable resources are on the target tile
      const allResources = [...(targetTile.resources || []), ...(targetTile.placedResources || [])];
      if (allResources.length > 0) {
        const hasBlockingResource = allResources.some(resourceName => {
          const resourceDef = prev.resources.find(r => r.name === resourceName);
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

  // Stub functions that don't do anything in demo mode
  const noopResult = { success: false, message: 'Sign up to use this feature!' };
  const noopResultWithCount = { success: false, message: 'Sign up to use this feature!', claimedCount: 0, totalCost: 0 };
  
  const claimTile = useCallback(() => noopResult, []);
  const claimMultipleTiles = useCallback(() => noopResultWithCount, []);
  const gatherFromTile = useCallback(() => {}, []);
  const addResource = useCallback(async () => {}, []);
  const addExistingResource = useCallback(async () => {}, []);
  const updateResource = useCallback(async () => {}, []);
  const deleteResource = useCallback(async () => {}, []);
  const respawnResources = useCallback(() => {}, []);
  const updateWorldName = useCallback(() => {}, []);
  const setUserColor = useCallback(() => {}, []);
  const craftResource = useCallback(() => noopResult, []);
  const consumeResource = useCallback(() => noopResult, []);
  const createSovereignty = useCallback(() => {}, []);
  const updateSovereignty = useCallback(() => {}, []);
  const createArea = useCallback((_name: string, _color: string, _tiles: Position[]) => noopResult, []);
  const deleteArea = useCallback(() => {}, []);
  const updateArea = useCallback(() => {}, []);
  const renameTile = useCallback(() => {}, []);
  const placeItem = useCallback(() => noopResult, []);
  const useItemOnFacingTile = useCallback(() => noopResult, []);
  const toggleEnableMarkets = useCallback(() => {}, []);
  const addMarket = useCallback(() => {}, []);
  const removeMarket = useCallback(() => {}, []);
  const buyFromMarket = useCallback(() => noopResult, []);
  const sellToMarket = useCallback(() => noopResult, []);
  const toggleEnableNpcs = useCallback(() => {}, []);
  const updateNpcCount = useCallback(() => {}, []);
  const toggleEnableStrangers = useCallback(() => {}, []);
  const updateStrangerDensity = useCallback(() => {}, []);
  const saveMapData = useCallback(async () => {}, []);

  const members: WorldMember[] = [];
  const isOwner = false;

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
    addExistingResource,
    updateResource,
    deleteResource,
    respawnResources,
    updateWorldName,
    setUserColor,
    craftResource,
    consumeResource,
    createSovereignty,
    updateSovereignty,
    createArea,
    deleteArea,
    updateArea,
    renameTile,
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
