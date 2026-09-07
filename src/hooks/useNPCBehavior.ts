import { useEffect, useCallback, useRef } from 'react';
import { GameWorld, NPC, WorldMap, Resource, InventorySlot, calculateTileValue, TILE_TYPES, isAdjacentToOwnedLand, ownsAnyTile } from '@/types/game';

const NPC_ACTION_INTERVAL = 2000; // NPCs act every 2 seconds
const NPC_CLAIM_CHANCE = 0.3; // 30% chance to claim a tile when possible
const NPC_GATHER_CHANCE = 0.5; // 50% chance to gather resources
const NPC_MOVE_CHANCE = 0.7; // 70% chance to move
const NPC_GATHER_RADIUS = 12; // Only look for gatherable owned tiles near the NPC

const WALKABLE_BY_TYPE = new Map(TILE_TYPES.map(t => [t.type, t.walkable]));

interface UseNPCBehaviorProps {
  world: GameWorld;
  setWorld: React.Dispatch<React.SetStateAction<GameWorld>>;
  saveMapData: (mapData?: WorldMap) => Promise<void>;
}

export const useNPCBehavior = ({ world, setWorld, saveMapData }: UseNPCBehaviorProps) => {
  const lastUpdateRef = useRef<number>(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Find adjacent walkable tiles
  const getAdjacentTiles = useCallback((x: number, y: number, map: WorldMap): { x: number; y: number }[] => {
    const directions = [
      { dx: 0, dy: -1 }, // north
      { dx: 0, dy: 1 },  // south
      { dx: 1, dy: 0 },  // east
      { dx: -1, dy: 0 }, // west
    ];
    
    return directions
      .map(({ dx, dy }) => ({ x: x + dx, y: y + dy }))
      .filter(pos => {
        if (pos.x < 0 || pos.x >= map.width || pos.y < 0 || pos.y >= map.height) return false;
        const tile = map.tiles[pos.y][pos.x];
        return WALKABLE_BY_TYPE.get(tile.type) ?? tile.walkable;
      });
  }, []);

  // Get unclaimed tiles near NPC
  const getNearbyUnclaimedTiles = useCallback((npc: NPC, map: WorldMap, radius: number = 3): { x: number; y: number }[] => {
    const tiles: { x: number; y: number }[] = [];
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = npc.position.x + dx;
        const y = npc.position.y + dy;
        
        if (x < 0 || x >= map.width || y < 0 || y >= map.height) continue;
        
        const tile = map.tiles[y][x];
        const isWalkable = WALKABLE_BY_TYPE.get(tile.type) ?? tile.walkable;
        
        const adjacencyOk = !ownsAnyTile(map.tiles, npc.id) || isAdjacentToOwnedLand(map.tiles, x, y, npc.id);
        if (isWalkable && !tile.claimedBy && adjacencyOk) {
          tiles.push({ x, y });
        }
      }
    }
    
    return tiles;
  }, []);

  // NPC claims a tile
  const npcClaimTile = useCallback((npc: NPC, x: number, y: number, map: WorldMap, resources: Resource[]): {
    newNpc: NPC;
    newTiles: WorldMap['tiles'];
    collected: string[];
  } | null => {
    const tile = map.tiles[y]?.[x];
    if (!tile || tile.claimedBy) return null;
    // Claims must touch land the NPC already owns (unless it owns none yet)
    if (ownsAnyTile(map.tiles, npc.id) && !isAdjacentToOwnedLand(map.tiles, x, y, npc.id)) return null;
    
    const tileValue = calculateTileValue(tile, resources);
    if (npc.coins < tileValue) return null;
    
    const collected = [...tile.resources];
    
    // Copy only the affected row instead of cloning the entire map
    const newTiles = [...map.tiles];
    const newRow = [...newTiles[y]];
    newRow[x] = { ...tile, claimedBy: npc.id, resources: [] };
    newTiles[y] = newRow;
    
    // Add collected resources to NPC inventory
    let newInventory = [...npc.inventory];
    for (const resourceId of collected) {
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
      newNpc: {
        ...npc,
        coins: npc.coins - tileValue,
        inventory: newInventory,
      },
      newTiles,
      collected,
    };
  }, []);

  // NPC gathers from a tile they own
  const npcGatherFromTile = useCallback((npc: NPC, map: WorldMap): {
    newNpc: NPC;
    newTiles: WorldMap['tiles'];
  } | null => {
    // Find tiles owned by this NPC with resources
    const ownedTilesWithResources: { x: number; y: number; resources: string[] }[] = [];
    
    const minY = Math.max(0, npc.position.y - NPC_GATHER_RADIUS);
    const maxY = Math.min(map.height - 1, npc.position.y + NPC_GATHER_RADIUS);
    const minX = Math.max(0, npc.position.x - NPC_GATHER_RADIUS);
    const maxX = Math.min(map.width - 1, npc.position.x + NPC_GATHER_RADIUS);
    
    for (let y = minY; y <= maxY; y++) {
      const row = map.tiles[y];
      if (!row) continue;
      for (let x = minX; x <= maxX; x++) {
        const tile = row[x];
        if (tile && tile.claimedBy === npc.id && tile.resources.length > 0) {
          ownedTilesWithResources.push({ x, y, resources: tile.resources });
        }
      }
    }
    
    if (ownedTilesWithResources.length === 0) return null;
    
    // Pick a random tile to gather from
    const targetTile = ownedTilesWithResources[Math.floor(Math.random() * ownedTilesWithResources.length)];
    const resourceToGather = targetTile.resources[0];
    
    // Copy only the affected row instead of cloning the entire map
    const newTiles = [...map.tiles];
    const gatherRow = [...newTiles[targetTile.y]];
    const gatherTile = gatherRow[targetTile.x];
    gatherRow[targetTile.x] = { ...gatherTile, resources: gatherTile.resources.filter(r => r !== resourceToGather) };
    newTiles[targetTile.y] = gatherRow;
    
    // Add to inventory
    let newInventory = [...npc.inventory];
    let slotIndex = newInventory.findIndex(s => s.resourceId === resourceToGather && s.quantity < 99);
    if (slotIndex === -1) {
      slotIndex = newInventory.findIndex(s => !s.resourceId);
    }
    if (slotIndex !== -1) {
      if (newInventory[slotIndex].resourceId === resourceToGather) {
        newInventory[slotIndex] = { ...newInventory[slotIndex], quantity: newInventory[slotIndex].quantity + 1 };
      } else {
        newInventory[slotIndex] = { resourceId: resourceToGather, quantity: 1 };
      }
    }
    
    return {
      newNpc: { ...npc, inventory: newInventory },
      newTiles,
    };
  }, []);

  // NPC moves to an adjacent tile
  const npcMove = useCallback((npc: NPC, map: WorldMap): NPC => {
    const adjacentTiles = getAdjacentTiles(npc.position.x, npc.position.y, map);
    if (adjacentTiles.length === 0) return npc;
    
    // Prefer moving towards unclaimed tiles or tiles with resources
    const preferredTiles = adjacentTiles.filter(pos => {
      const tile = map.tiles[pos.y][pos.x];
      return !tile.claimedBy || tile.resources.length > 0;
    });
    
    const targetTiles = preferredTiles.length > 0 ? preferredTiles : adjacentTiles;
    const newPos = targetTiles[Math.floor(Math.random() * targetTiles.length)];
    
    return { ...npc, position: newPos };
  }, [getAdjacentTiles]);

  // Process one NPC's turn
  const processNPCTurn = useCallback((npc: NPC, currentMap: WorldMap, resources: Resource[]): {
    npc: NPC;
    mapTiles?: WorldMap['tiles'];
  } => {
    let updatedNpc: NPC = { ...npc, lastActionTime: Date.now() };
    let newMapTiles: WorldMap['tiles'] | undefined;
    
    // Priority 1: Claim nearby tiles
    if (Math.random() < NPC_CLAIM_CHANCE) {
      const unclaimedTiles = getNearbyUnclaimedTiles(updatedNpc, currentMap, 2);
      if (unclaimedTiles.length > 0) {
        // Prefer tiles with resources
        const tilesWithResources = unclaimedTiles.filter(pos => 
          currentMap.tiles[pos.y][pos.x].resources.length > 0
        );
        const targetTiles = tilesWithResources.length > 0 ? tilesWithResources : unclaimedTiles;
        const targetTile = targetTiles[Math.floor(Math.random() * targetTiles.length)];
        
        const claimResult = npcClaimTile(updatedNpc, targetTile.x, targetTile.y, currentMap, resources);
        if (claimResult) {
          updatedNpc = claimResult.newNpc;
          newMapTiles = claimResult.newTiles;
          return { npc: updatedNpc, mapTiles: newMapTiles };
        }
      }
    }
    
    // Priority 3: Gather from owned tiles
    if (Math.random() < NPC_GATHER_CHANCE) {
      const gatherResult = npcGatherFromTile(updatedNpc, currentMap);
      if (gatherResult) {
        updatedNpc = gatherResult.newNpc;
        newMapTiles = gatherResult.newTiles;
        return { npc: updatedNpc, mapTiles: newMapTiles };
      }
    }
    
    // Priority 4: Move around
    if (Math.random() < NPC_MOVE_CHANCE) {
      updatedNpc = npcMove(updatedNpc, currentMap);
    }
    
    return { npc: updatedNpc, mapTiles: newMapTiles };
  }, [getNearbyUnclaimedTiles, npcClaimTile, npcGatherFromTile, npcConsumeResource, npcMove]);

  // Main NPC behavior loop
  useEffect(() => {
    if (!world.enableNpcs || !world.npcs || world.npcs.length === 0) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastUpdateRef.current < NPC_ACTION_INTERVAL) return;
      lastUpdateRef.current = now;
      
      setWorld(prev => {
        if (!prev.npcs || prev.npcs.length === 0) return prev;
        
        let currentMap = prev.map;
        const updatedNpcs: NPC[] = [];
        let mapChanged = false;
        
        for (const npc of prev.npcs) {
          const result = processNPCTurn(npc, currentMap, prev.resources);
          updatedNpcs.push(result.npc);
          
          if (result.mapTiles) {
            currentMap = { ...currentMap, tiles: result.mapTiles };
            mapChanged = true;
          }
        }
        
        // Schedule a save if map changed
        if (mapChanged) {
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
          }
          saveTimeoutRef.current = setTimeout(() => {
            saveMapData(currentMap);
          }, 2000);
        }
        
        return {
          ...prev,
          npcs: updatedNpcs,
          map: currentMap,
        };
      });
    }, 500); // Check every 500ms, but only act every NPC_ACTION_INTERVAL
    
    return () => {
      clearInterval(interval);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [world.enableNpcs, world.npcs?.length, processNPCTurn, setWorld, saveMapData]);

  return null;
};
