import { useEffect, useCallback, useRef } from 'react';
import { GameWorld, Stranger, WorldMap, Resource, TILE_TYPES, MAX_HEALTH, calculateTileValue, StrangerAllegiance, Sovereignty } from '@/types/game';

const STRANGER_ACTION_INTERVAL = 3000; // Strangers act every 3 seconds (slower than NPCs)
const STRANGER_GATHER_CHANCE = 0.4; // 40% chance to gather resources
const STRANGER_CONSUME_CHANCE = 0.3; // 30% chance to consume food when low health
const STRANGER_MOVE_CHANCE = 0.8; // 80% chance to move (they wander more)
const STRANGER_ALLEGIANCE_CHANCE = 0.05; // 5% chance per tick to evaluate allegiance
const ALLEGIANCE_VALUE_THRESHOLD = 100; // Minimum territory value to attract allegiance
const ALLEGIANCE_MIN_TILES = 10;
const HAPPINESS_LOVE_THRESHOLD = 70; // Both partners must be at least this happy
const BIRTH_CHANCE = 0.15; // Chance per tick that a happy couple has a child
const BIRTH_COOLDOWN_MS = 120000; // 2 minutes between children for a couple
const MAX_POPULATION = 5000; // Sovereignty must control at least this many tiles before strangers pledge

interface SovereigntyInfo {
  userId: string;
  username: string;
  sovereignty: Sovereignty;
  totalValue: number;
  tileCount: number;
  /** Sample of claimed tile positions (used to return pledged strangers home) */
  territoryPositions: { x: number; y: number }[];
}

interface UseStrangerBehaviorProps {
  world: GameWorld;
  setWorld: React.Dispatch<React.SetStateAction<GameWorld>>;
  saveMapData: (mapData?: WorldMap) => Promise<void>;
  memberSovereignties?: Map<string, { username: string; sovereignty?: Sovereignty }>;
}

const WALKABLE_BY_TYPE = new Map(TILE_TYPES.map(t => [t.type, t.walkable]));
const SOVEREIGNTY_CACHE_MS = 15000; // Re-scan the map for territory values at most this often

export const useStrangerBehavior = ({ world, setWorld, saveMapData, memberSovereignties }: UseStrangerBehaviorProps) => {
  const lastUpdateRef = useRef<number>(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sovereigntyCacheRef = useRef<{ at: number; data: SovereigntyInfo[] } | null>(null);

  // Calculate sovereignty values from map claims
  const calculateSovereigntyValues = useCallback((map: WorldMap, resources: Resource[]): SovereigntyInfo[] => {
    if (!memberSovereignties || memberSovereignties.size === 0) return [];
    
    // Calculate total value for each claimant
    const claimValues = new Map<string, { totalValue: number; tileCount: number; positions: { x: number; y: number }[] }>();
    
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.tiles[y]?.[x];
        if (tile?.claimedBy && !tile.claimedBy.startsWith('npc-')) {
          const current = claimValues.get(tile.claimedBy) || { totalValue: 0, tileCount: 0, positions: [] };
          const tileValue = calculateTileValue(tile, resources);
          // Keep a bounded sample of positions (enough for random teleport targets)
          if (current.positions.length < 200) current.positions.push({ x, y });
          claimValues.set(tile.claimedBy, {
            totalValue: current.totalValue + tileValue,
            tileCount: current.tileCount + 1,
            positions: current.positions,
          });
        }
      }
    }
    
    // Build sovereignty info array
    const sovereigntyInfos: SovereigntyInfo[] = [];
    claimValues.forEach((value, claimerId) => {
      const memberInfo = memberSovereignties.get(claimerId);
      if (memberInfo?.sovereignty) {
        sovereigntyInfos.push({
          userId: claimerId,
          username: memberInfo.username,
          sovereignty: memberInfo.sovereignty,
          totalValue: value.totalValue,
          tileCount: value.tileCount,
          territoryPositions: value.positions,
        });
      }
    });
    
    return sovereigntyInfos.sort((a, b) => b.totalValue - a.totalValue);
  }, [memberSovereignties]);

  // Evaluate if stranger should pledge allegiance
  const evaluateAllegiance = useCallback((stranger: Stranger, sovereignties: SovereigntyInfo[]): Stranger => {
    // Only evaluate sometimes
    if (Math.random() > STRANGER_ALLEGIANCE_CHANCE) return stranger;
    
    if (sovereignties.length === 0) return stranger;
    
    // Find the most valuable sovereignty that meets threshold
    const topSovereignty = sovereignties[0];
    if (topSovereignty.totalValue < ALLEGIANCE_VALUE_THRESHOLD || topSovereignty.tileCount < ALLEGIANCE_MIN_TILES) {
      // No sovereignty is valuable enough, possibly remove allegiance
      if (stranger.allegiance && Math.random() < 0.1) {
        return { ...stranger, allegiance: undefined };
      }
      return stranger;
    }
    
    // Already pledged to this sovereignty?
    if (stranger.allegiance?.userId === topSovereignty.userId) {
      return stranger;
    }
    
    // Weight by value - higher value = more likely to attract allegiance
    const attractionChance = Math.min(0.8, topSovereignty.totalValue / 1000);
    if (Math.random() < attractionChance) {
      const newAllegiance: StrangerAllegiance = {
        userId: topSovereignty.userId,
        username: topSovereignty.username,
        sovereigntyName: topSovereignty.sovereignty.name,
        sovereigntyFlag: topSovereignty.sovereignty.flag,
        pledgedAt: Date.now(),
      };
      return { ...stranger, allegiance: newAllegiance };
    }
    
    return stranger;
  }, []);

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

  // Stranger gathers from any tile with resources (not just owned tiles)
  const strangerGatherFromTile = useCallback((stranger: Stranger, map: WorldMap): {
    newStranger: Stranger;
    newTiles: WorldMap['tiles'];
  } | null => {
    // Find the current tile or nearby tiles with resources
    const { x, y } = stranger.position;
    const currentTile = map.tiles[y]?.[x];
    
    if (!currentTile || currentTile.resources.length === 0) return null;
    
    // Filter out placed resources - strangers cannot gather them
    const gatherableResources = currentTile.resources.filter(
      resId => !currentTile.placedResources?.includes(resId)
    );
    
    if (gatherableResources.length === 0) return null;
    
    const resourceToGather = gatherableResources[0];
    
    // Copy only the affected row instead of cloning the entire map
    const newTiles = [...map.tiles];
    const newRow = [...newTiles[y]];
    newRow[x] = { ...currentTile, resources: currentTile.resources.filter(r => r !== resourceToGather) };
    newTiles[y] = newRow;
    
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
    let adjacentTiles = getAdjacentTiles(stranger.position.x, stranger.position.y, map);
    if (adjacentTiles.length === 0) return stranger;
    
    if (stranger.allegiance) {
      // Pledged strangers must stay inside their sovereignty's territory
      const currentTile = map.tiles[stranger.position.y]?.[stranger.position.x];
      const insideTerritory = currentTile?.claimedBy === stranger.allegiance.userId;
      const territoryTiles = adjacentTiles.filter(
        pos => map.tiles[pos.y][pos.x].claimedBy === stranger.allegiance!.userId
      );
      if (insideTerritory) {
        // Never step outside: move within territory or stay put
        if (territoryTiles.length === 0) return stranger;
        adjacentTiles = territoryTiles;
      } else if (territoryTiles.length > 0) {
        // Outside (e.g. just pledged): head back into the territory
        adjacentTiles = territoryTiles;
      } else {
        // No direct path home this step: only unclaimed tiles are allowed
        adjacentTiles = adjacentTiles.filter(pos => !map.tiles[pos.y][pos.x].claimedBy);
        if (adjacentTiles.length === 0) return stranger;
      }
    } else {
      // Unpledged strangers cannot enter anyone's claimed territory
      adjacentTiles = adjacentTiles.filter(pos => !map.tiles[pos.y][pos.x].claimedBy);
      if (adjacentTiles.length === 0) return stranger;
    }
    
    // Strangers prefer tiles with resources since they gather
    const preferredTiles = adjacentTiles.filter(pos => {
      const tile = map.tiles[pos.y][pos.x];
      return tile.resources.length > 0;
    });
    
    const targetTiles = preferredTiles.length > 0 ? preferredTiles : adjacentTiles;
    const newPos = targetTiles[Math.floor(Math.random() * targetTiles.length)];
    
    return { ...stranger, position: newPos };
  }, [getAdjacentTiles]);

  // Update the stranger's happy index based on their conditions
  const updateHappiness = useCallback((stranger: Stranger, map: WorldMap, resources: Resource[]): Stranger => {
    let happiness = stranger.happiness ?? 50;
    const tile = map.tiles[stranger.position.y]?.[stranger.position.x];

    // Health drives mood strongly
    if (stranger.health >= 70) happiness += 2;
    else if (stranger.health < 30) happiness -= 3;
    else if (stranger.health < 50) happiness -= 1;

    // Belonging to a sovereignty and standing on its land feels safe
    if (stranger.allegiance) {
      happiness += tile?.claimedBy === stranger.allegiance.userId ? 2 : -1;
    }

    // Having food on hand
    const hasFood = stranger.inventory.some(slot => {
      if (!slot.resourceId || slot.quantity <= 0) return false;
      const res = resources.find(r => r.id === slot.resourceId);
      return !!res?.consumable;
    });
    if (hasFood) happiness += 1;
    else happiness -= 1;

    // Abundance nearby
    if (tile && tile.resources.length > 0) happiness += 1;

    // Companionship
    if (stranger.partnerId) happiness += 1;

    return { ...stranger, happiness: Math.max(0, Math.min(100, happiness)) };
  }, []);

  // Process one stranger's turn
  const processStrangerTurn = useCallback((stranger: Stranger, currentMap: WorldMap, resources: Resource[], sovereignties: SovereigntyInfo[]): {
    stranger: Stranger;
    mapTiles?: WorldMap['tiles'];
  } => {
    let updatedStranger: Stranger = { ...stranger, lastActionTime: Date.now() };
    let newMapTiles: WorldMap['tiles'] | undefined;

    // Hard rule: pledged strangers must live inside their sovereignty's territory.
    // If the sovereignty no longer qualifies (too small / dissolved), the pledge lapses.
    if (updatedStranger.allegiance) {
      const own = sovereignties.find(s => s.userId === updatedStranger.allegiance!.userId);
      if ((!own || own.tileCount < ALLEGIANCE_MIN_TILES) && sovereignties.length > 0) {
        updatedStranger = { ...updatedStranger, allegiance: undefined };
      } else {
        const standing = currentMap.tiles[updatedStranger.position.y]?.[updatedStranger.position.x];
        if (standing?.claimedBy !== own.userId && own.territoryPositions.length > 0) {
          const home = own.territoryPositions[Math.floor(Math.random() * own.territoryPositions.length)];
          updatedStranger = { ...updatedStranger, position: { ...home } };
        }
      }
    }

    
    // Priority 1: Consume if low health — only within own sovereign territory,
    // or anywhere unclaimed when unpledged
    const standingTile = currentMap.tiles[updatedStranger.position.y]?.[updatedStranger.position.x];
    const canConsumeHere = updatedStranger.allegiance
      ? standingTile?.claimedBy === updatedStranger.allegiance.userId
      : !standingTile?.claimedBy;

    if (canConsumeHere && updatedStranger.health < 40 && Math.random() < STRANGER_CONSUME_CHANCE) {
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
    
    // Priority 4: Evaluate allegiance to sovereignties
    updatedStranger = evaluateAllegiance(updatedStranger, sovereignties);

    // Finally: recompute the happy index
    updatedStranger = updateHappiness(updatedStranger, currentMap, resources);
    
    return { stranger: updatedStranger, mapTiles: newMapTiles };
  }, [strangerGatherFromTile, strangerConsumeResource, strangerMove, evaluateAllegiance, updateHappiness]);

  // Pair up happy pledged strangers and let couples have children
  const processRomance = useCallback((strangers: Stranger[], map: WorldMap): Stranger[] => {
    const now = Date.now();
    const byId = new Map(strangers.map(s => [s.id, s]));
    const result = strangers.map(s => ({ ...s }));
    const indexById = new Map(result.map((s, i) => [s.id, i]));
    const isEligible = (s: Stranger) => !!s.allegiance && (s.happiness ?? 0) >= HAPPINESS_LOVE_THRESHOLD;

    // Break bonds that are no longer valid
    result.forEach(s => {
      if (!s.partnerId) return;
      const partner = byId.get(s.partnerId);
      if (!partner || !isEligible(s) || !partner.allegiance || partner.allegiance.userId !== s.allegiance?.userId) {
        s.partnerId = undefined;
      }
    });

    // Match singles that are standing next to each other under the same flag
    const singlesByTile = new Map<string, Stranger>();
    for (const s of result) {
      if (s.partnerId || !isEligible(s)) continue;
      const key = `${s.allegiance!.userId}:${s.position.x},${s.position.y}`;
      const neighbourKeys = [
        key,
        `${s.allegiance!.userId}:${s.position.x + 1},${s.position.y}`,
        `${s.allegiance!.userId}:${s.position.x - 1},${s.position.y}`,
        `${s.allegiance!.userId}:${s.position.x},${s.position.y + 1}`,
        `${s.allegiance!.userId}:${s.position.x},${s.position.y - 1}`,
      ];
      let matched: Stranger | undefined;
      for (const nk of neighbourKeys) {
        const candidate = singlesByTile.get(nk);
        if (candidate && candidate.id !== s.id && !candidate.partnerId) {
          matched = candidate;
          singlesByTile.delete(nk);
          break;
        }
      }
      if (matched) {
        s.partnerId = matched.id;
        matched.partnerId = s.id;
      } else {
        singlesByTile.set(key, s);
      }
    }

    // Couples may have a child
    if (result.length >= MAX_POPULATION) return result;
    const babies: Stranger[] = [];
    const handled = new Set<string>();
    for (const s of result) {
      if (!s.partnerId || handled.has(s.id)) continue;
      const pIndex = indexById.get(s.partnerId);
      const partner = pIndex !== undefined ? result[pIndex] : undefined;
      if (!partner || partner.partnerId !== s.id) continue;
      handled.add(s.id);
      handled.add(partner.id);
      if (!isEligible(s) || !isEligible(partner)) continue;
      if (now - (s.lastBirthTime ?? 0) < BIRTH_COOLDOWN_MS) continue;
      if (result.length + babies.length >= MAX_POPULATION) break;
      if (Math.random() > BIRTH_CHANCE) continue;

      // Born on the parents' land
      const tile = map.tiles[s.position.y]?.[s.position.x];
      if (!tile || tile.claimedBy !== s.allegiance!.userId) continue;

      s.lastBirthTime = now;
      partner.lastBirthTime = now;
      babies.push({
        id: `stranger-born-${now}-${Math.floor(Math.random() * 100000)}`,
        name: `Young ${s.name.split(' ').slice(-1)[0]}`,
        color: s.color,
        position: { ...s.position },
        inventory: Array.from({ length: 5 }, () => ({ resourceId: null, quantity: 0 })),
        health: 60,
        happiness: 60,
        allegiance: { ...s.allegiance! },
      });
    }

    return babies.length > 0 ? [...result, ...babies] : result;
  }, []);

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
        
        // Territory values are expensive to compute (full map scan) - cache them
        const cache = sovereigntyCacheRef.current;
        let sovereignties: SovereigntyInfo[];
        if (cache && now - cache.at < SOVEREIGNTY_CACHE_MS) {
          sovereignties = cache.data;
        } else {
          sovereignties = calculateSovereigntyValues(prev.map, prev.resources);
          sovereigntyCacheRef.current = { at: now, data: sovereignties };
        }
        
        // Process only a subset of strangers each tick to reduce performance impact
        const maxStrangersPerTick = Math.min(prev.strangers.length, 50);
        const startIndex = Math.floor(Math.random() * Math.max(1, prev.strangers.length - maxStrangersPerTick));
        
        for (let i = 0; i < prev.strangers.length; i++) {
          const stranger = prev.strangers[i];
          
          // Only process a subset each tick
          if (i >= startIndex && i < startIndex + maxStrangersPerTick) {
            const result = processStrangerTurn(stranger, currentMap, prev.resources, sovereignties);
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
          strangers: processRomance(updatedStrangers, currentMap),
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
  }, [world.enableStrangers, world.strangers?.length, processStrangerTurn, processRomance, calculateSovereigntyValues, setWorld, saveMapData]);

  return null;
};
