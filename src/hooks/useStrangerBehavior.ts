import { useEffect, useCallback, useRef } from 'react';
import { GameWorld, Stranger, WorldMap, Resource, TILE_TYPES, MAX_HEALTH } from '@/types/game';

const STRANGER_ACTION_INTERVAL = 3000; // Strangers act every 3 seconds (slower than NPCs)
const STRANGER_GATHER_CHANCE = 0.4; // 40% chance to gather resources
const STRANGER_CONSUME_CHANCE = 0.3; // 30% chance to consume food when low health
const STRANGER_MOVE_CHANCE = 0.8; // 80% chance to move (they wander more)

interface UseStrangerBehaviorProps {
  world: GameWorld;
  setWorld: React.Dispatch<React.SetStateAction<GameWorld>>;
  saveMapData: (mapData?: WorldMap) => Promise<void>;
}

export const useStrangerBehavior = ({ world, setWorld, saveMapData }: UseStrangerBehaviorProps) => {
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

  // Stranger gathers from any tile with resources (not just owned tiles)
  const strangerGatherFromTile = useCallback((stranger: Stranger, map: WorldMap): {
    newStranger: Stranger;
    newTiles: WorldMap['tiles'];
  } | null => {
    // Find the current tile or nearby tiles with resources
    const { x, y } = stranger.position;
    const currentTile = map.tiles[y]?.[x];
    
    if (!currentTile || currentTile.resources.length === 0) return null;
    
    const resourceToGather = currentTile.resources[0];
    
    const newTiles = map.tiles.map((row, ry) =>
      row.map((t, rx) =>
        rx === x && ry === y
          ? { ...t, resources: t.resources.filter(r => r !== resourceToGather) }
          : t
      )
    );
    
    // Add to inventory
    let newInventory = [...stranger.inventory];
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
      newStranger: { ...stranger, inventory: newInventory },
      newTiles,
    };
  }, []);

  // Stranger consumes a resource for health
  const strangerConsumeResource = useCallback((stranger: Stranger, resources: Resource[]): Stranger | null => {
    // Find consumable resources in inventory
    for (let i = 0; i < stranger.inventory.length; i++) {
      const slot = stranger.inventory[i];
      if (!slot.resourceId || slot.quantity <= 0) continue;
      
      const resource = resources.find(r => r.id === slot.resourceId);
      if (resource?.consumable && resource.healthGain && resource.healthGain > 0) {
        // Consume this resource
        const newInventory = [...stranger.inventory];
        newInventory[i] = { ...newInventory[i], quantity: newInventory[i].quantity - 1 };
        if (newInventory[i].quantity === 0) {
          newInventory[i] = { resourceId: null, quantity: 0 };
        }
        
        return {
          ...stranger,
          inventory: newInventory,
          health: Math.min(MAX_HEALTH, stranger.health + resource.healthGain),
        };
      }
    }
    
    return null;
  }, []);

  // Stranger moves to an adjacent tile (wanders around)
  const strangerMove = useCallback((stranger: Stranger, map: WorldMap): Stranger => {
    const adjacentTiles = getAdjacentTiles(stranger.position.x, stranger.position.y, map);
    if (adjacentTiles.length === 0) return stranger;
    
    // Strangers prefer tiles with resources since they gather
    const preferredTiles = adjacentTiles.filter(pos => {
      const tile = map.tiles[pos.y][pos.x];
      return tile.resources.length > 0;
    });
    
    const targetTiles = preferredTiles.length > 0 ? preferredTiles : adjacentTiles;
    const newPos = targetTiles[Math.floor(Math.random() * targetTiles.length)];
    
    return { ...stranger, position: newPos };
  }, [getAdjacentTiles]);

  // Process one stranger's turn
  const processStrangerTurn = useCallback((stranger: Stranger, currentMap: WorldMap, resources: Resource[]): {
    stranger: Stranger;
    mapTiles?: WorldMap['tiles'];
  } => {
    let updatedStranger: Stranger = { ...stranger, lastActionTime: Date.now() };
    let newMapTiles: WorldMap['tiles'] | undefined;
    
    // Priority 1: Consume if low health
    if (updatedStranger.health < 40 && Math.random() < STRANGER_CONSUME_CHANCE) {
      const consumed = strangerConsumeResource(updatedStranger, resources);
      if (consumed) {
        updatedStranger = consumed;
        return { stranger: updatedStranger };
      }
    }
    
    // Priority 2: Gather from current tile (strangers don't claim, just gather)
    if (Math.random() < STRANGER_GATHER_CHANCE) {
      const gatherResult = strangerGatherFromTile(updatedStranger, currentMap);
      if (gatherResult) {
        updatedStranger = gatherResult.newStranger;
        newMapTiles = gatherResult.newTiles;
        return { stranger: updatedStranger, mapTiles: newMapTiles };
      }
    }
    
    // Priority 3: Move around (wander)
    if (Math.random() < STRANGER_MOVE_CHANCE) {
      updatedStranger = strangerMove(updatedStranger, currentMap);
    }
    
    return { stranger: updatedStranger, mapTiles: newMapTiles };
  }, [strangerGatherFromTile, strangerConsumeResource, strangerMove]);

  // Main stranger behavior loop
  useEffect(() => {
    if (!world.enableStrangers || !world.strangers || world.strangers.length === 0) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastUpdateRef.current < STRANGER_ACTION_INTERVAL) return;
      lastUpdateRef.current = now;
      
      setWorld(prev => {
        if (!prev.strangers || prev.strangers.length === 0) return prev;
        
        let currentMap = prev.map;
        const updatedStrangers: Stranger[] = [];
        let mapChanged = false;
        
        // Process only a subset of strangers each tick to reduce performance impact
        const maxStrangersPerTick = Math.min(prev.strangers.length, 50);
        const startIndex = Math.floor(Math.random() * Math.max(1, prev.strangers.length - maxStrangersPerTick));
        
        for (let i = 0; i < prev.strangers.length; i++) {
          const stranger = prev.strangers[i];
          
          // Only process a subset each tick
          if (i >= startIndex && i < startIndex + maxStrangersPerTick) {
            const result = processStrangerTurn(stranger, currentMap, prev.resources);
            updatedStrangers.push(result.stranger);
            
            if (result.mapTiles) {
              currentMap = { ...currentMap, tiles: result.mapTiles };
              mapChanged = true;
            }
          } else {
            updatedStrangers.push(stranger);
          }
        }
        
        // Schedule a save if map changed
        if (mapChanged) {
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
          }
          saveTimeoutRef.current = setTimeout(() => {
            saveMapData(currentMap);
          }, 5000); // Longer delay for strangers to reduce DB writes
        }
        
        return {
          ...prev,
          strangers: updatedStrangers,
          map: currentMap,
        };
      });
    }, 1000); // Check every 1 second, but only act every STRANGER_ACTION_INTERVAL
    
    return () => {
      clearInterval(interval);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [world.enableStrangers, world.strangers?.length, processStrangerTurn, setWorld, saveMapData]);

  return null;
};
