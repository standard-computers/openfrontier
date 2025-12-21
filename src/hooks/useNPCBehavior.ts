import { useEffect, useCallback, useRef } from 'react';
import { GameWorld, NPC, WorldMap, Resource, InventorySlot, calculateTileValue, TILE_TYPES, MAX_HEALTH } from '@/types/game';

const NPC_ACTION_INTERVAL = 2000; // NPCs act every 2 seconds
const NPC_CLAIM_CHANCE = 0.3; // 30% chance to claim a tile when possible
const NPC_GATHER_CHANCE = 0.5; // 50% chance to gather resources
const NPC_CONSUME_CHANCE = 0.2; // 20% chance to consume food when low health
const NPC_MOVE_CHANCE = 0.7; // 70% chance to move

interface UseNPCBehaviorProps {
  world: GameWorld;
  setWorld: React.Dispatch<React.SetStateAction<GameWorld>>;
  saveMapData: (mapData?: WorldMap) => Promise<void>;
}

export const useNPCBehavior = ({ world, setWorld, saveMapData }: UseNPCBehaviorProps) => {
  const lastUpdateRef = useRef<number>(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        const tileInfo = TILE_TYPES.find(t => t.type === tile.type);
        return tileInfo?.walkable ?? tile.walkable;
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
        const tileInfo = TILE_TYPES.find(t => t.type === tile.type);
        const isWalkable = tileInfo?.walkable ?? tile.walkable;
        
        if (isWalkable && !tile.claimedBy) {
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
    
    const tileValue = calculateTileValue(tile, resources);
    if (npc.coins < tileValue) return null;
    
    const collected = [...tile.resources];
    
    const newTiles = map.tiles.map((row, ry) =>
      row.map((t, rx) =>
        rx === x && ry === y ? { ...t, claimedBy: npc.id, resources: [] } : t
      )
    );
    
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
    
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.tiles[y][x];
        if (tile.claimedBy === npc.id && tile.resources.length > 0) {
          ownedTilesWithResources.push({ x, y, resources: tile.resources });
        }
      }
    }
    
    if (ownedTilesWithResources.length === 0) return null;
    
    // Pick a random tile to gather from
    const targetTile = ownedTilesWithResources[Math.floor(Math.random() * ownedTilesWithResources.length)];
    const resourceToGather = targetTile.resources[0];
    
    const newTiles = map.tiles.map((row, ry) =>
      row.map((t, rx) =>
        rx === targetTile.x && ry === targetTile.y
          ? { ...t, resources: t.resources.filter(r => r !== resourceToGather) }
          : t
      )
    );
    
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

  // NPC consumes a resource for health
  const npcConsumeResource = useCallback((npc: NPC, resources: Resource[]): NPC | null => {
    // Find consumable resources in inventory
    for (let i = 0; i < npc.inventory.length; i++) {
      const slot = npc.inventory[i];
      if (!slot.resourceId || slot.quantity <= 0) continue;
      
      const resource = resources.find(r => r.id === slot.resourceId);
      if (resource?.consumable && resource.healthGain && resource.healthGain > 0) {
        // Consume this resource
        const newInventory = [...npc.inventory];
        newInventory[i] = { ...newInventory[i], quantity: newInventory[i].quantity - 1 };
        if (newInventory[i].quantity === 0) {
          newInventory[i] = { resourceId: null, quantity: 0 };
        }
        
        return {
          ...npc,
          inventory: newInventory,
          health: Math.min(MAX_HEALTH, npc.health + resource.healthGain),
        };
      }
    }
    
    return null;
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
    
    // Priority 1: Consume if low health
    if (updatedNpc.health < 50 && Math.random() < NPC_CONSUME_CHANCE) {
      const consumed = npcConsumeResource(updatedNpc, resources);
      if (consumed) {
        updatedNpc = consumed;
        return { npc: updatedNpc };
      }
    }
    
    // Priority 2: Claim nearby tiles
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
