import type { Position, Resource, Stranger, WorldMap } from '../types/game';
import { TILE_TYPES } from '../types/game';

export interface CitizenBuilding {
  key: string;
  resourceId: string;
  position: Position;
  ownerId: string;
  capacity: number;
  tiles: Position[];
}

export interface CitizenBuildingIndex {
  buildings: Map<string, CitizenBuilding>;
  byTile: Map<string, CitizenBuilding[]>;
  capacityByOwner: Map<string, number>;
}

const tileKey = (p: Position) => `${p.x},${p.y}`;
const landTypes = new Set(TILE_TYPES.filter(t => t.walkable && t.type !== 'water').map(t => t.type));
export const normalizePeopleCapacity = (value: number | undefined): number =>
  Number.isFinite(value) ? Math.max(1, Math.min(2147483647, Math.floor(value ?? 1))) : 1;

export function buildCitizenBuildingIndex(map: WorldMap, resources: Resource[]): CitizenBuildingIndex {
  const definitions = new Map(resources.filter(r => r.holdsPeople).map(r => [r.id, r]));
  const buildings = new Map<string, CitizenBuilding>();
  const byTile = new Map<string, CitizenBuilding[]>();
  const capacityByOwner = new Map<string, number>();
  if (!definitions.size) return { buildings, byTile, capacityByOwner };
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const anchor = map.tiles[y]?.[x];
      if (!anchor?.claimedBy) continue;
      for (const id of new Set(anchor.resources)) {
        const resource = definitions.get(id);
        if (!resource) continue;
        // Pledge capacity counts every owned Holds People resource once at its anchor.
        capacityByOwner.set(anchor.claimedBy, (capacityByOwner.get(anchor.claimedBy) ?? 0) + normalizePeopleCapacity(resource.peopleCapacity));
        if (resource.isFloating) continue;
        const tiles: Position[] = [];
        for (let dy = 0; dy < Math.max(1, resource.tileHeight ?? 1); dy++) {
          for (let dx = 0; dx < Math.max(1, resource.tileWidth ?? 1); dx++) {
            tiles.push({ x: x + dx, y: y - dy });
          }
        }
        // A building crossing another realm or water is not available to citizens.
        if (tiles.some(p => {
          const t = map.tiles[p.y]?.[p.x];
          return !t || t.claimedBy !== anchor.claimedBy || !landTypes.has(t.type);
        })) continue;
        const building: CitizenBuilding = {
          key: `${x},${y}:${id}`, resourceId: id, position: { x, y },
          ownerId: anchor.claimedBy, capacity: normalizePeopleCapacity(resource.peopleCapacity), tiles,
        };
        buildings.set(building.key, building);
        for (const p of tiles) {
          const key = tileKey(p);
          byTile.set(key, [...(byTile.get(key) ?? []), building]);
        }
      }
    }
  }
  return { buildings, byTile, capacityByOwner };
}

// Citizens are out and about too: occupants sometimes leave home, and
// passers-by only sometimes step inside, so streets stay lively.
export const CITIZEN_EXIT_BUILDING_CHANCE = 0.4;
export const CITIZEN_ENTER_BUILDING_CHANCE = 0.5;

// Returns the occupant's turn when they are inside a building: either they
// stay home, or they step out to an adjacent outdoor tile in their realm.
// Returns null for citizens who are already outside.
export function maybeExitBuilding(
  stranger: Stranger, adjacentTiles: Position[], map: WorldMap, index: CitizenBuildingIndex, random: number,
): Stranger | null {
  if (!stranger.buildingKey) return null;
  if (random >= CITIZEN_EXIT_BUILDING_CHANCE) return stranger;
  const outdoor = adjacentTiles.filter(p => !index.byTile.has(tileKey(p)));
  const exits = stranger.allegiance
    ? outdoor.filter(p => map.tiles[p.y]?.[p.x]?.claimedBy === stranger.allegiance!.userId)
    : outdoor.filter(p => !map.tiles[p.y]?.[p.x]?.claimedBy);
  if (!exits.length) return stranger;
  const newPos = exits[Math.floor((random / CITIZEN_EXIT_BUILDING_CHANCE) * exits.length) % exits.length];
  return { ...stranger, position: newPos, buildingKey: undefined };
}

// Outdoor citizens only head inside some of the time; otherwise they keep
// to outdoor tiles when there are any.
export function preferOutdoorTargets(targets: Position[], index: CitizenBuildingIndex, random: number): Position[] {
  if (random < CITIZEN_ENTER_BUILDING_CHANCE) return targets;
  const outdoor = targets.filter(p => !index.byTile.has(tileKey(p)));
  return outdoor.length ? outdoor : targets;
}

export function countBuildingOccupants(strangers: Stranger[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const s of strangers) {
    if (s.buildingKey) counts.set(s.buildingKey, (counts.get(s.buildingKey) ?? 0) + 1);
  }
  return counts;
}

export function moveCitizenIntoBuilding(
  stranger: Stranger, position: Position, index: CitizenBuildingIndex, counts: Map<string, number>,
): Stranger | null {
  const candidates = index.byTile.get(tileKey(position)) ?? [];
  if (!candidates.length) return { ...stranger, position, buildingKey: undefined };
  const building = candidates.find(b => b.ownerId === stranger.allegiance?.userId &&
    ((counts.get(b.key) ?? 0) - (stranger.buildingKey === b.key ? 1 : 0)) < b.capacity);
  return building ? { ...stranger, position, buildingKey: building.key } : null;
}

// Revalidate every citizen, not just the rotating subset: capacity changes,
// ownership transfers, removals and newborns must never leave overfull buildings.
export function reconcileCitizenBuildings(strangers: Stranger[], map: WorldMap, index: CitizenBuildingIndex): Stranger[] {
  const counts = new Map<string, number>();
  return strangers.map(stranger => {
    const candidates = index.byTile.get(tileKey(stranger.position)) ?? [];
    const building = candidates.find(b => b.ownerId === stranger.allegiance?.userId && (counts.get(b.key) ?? 0) < b.capacity);
    if (building) {
      counts.set(building.key, (counts.get(building.key) ?? 0) + 1);
      return stranger.buildingKey === building.key ? stranger : { ...stranger, buildingKey: building.key };
    }
    if (!candidates.length && !stranger.buildingKey) return stranger;
    // Look for an outdoor tile in the same realm near the entrance.
    const queue: Position[] = [stranger.position];
    const visited = new Set<string>();
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i];
      const key = tileKey(p);
      if (visited.has(key)) continue;
      visited.add(key);
      const tile = map.tiles[p.y]?.[p.x];
      if (!tile || !landTypes.has(tile.type) || (stranger.allegiance ? tile.claimedBy !== stranger.allegiance.userId : Boolean(tile.claimedBy))) continue;
      if (!index.byTile.has(key)) return { ...stranger, position: p, buildingKey: undefined };
      queue.push({ x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 });
    }
    // No outdoor land exists: wait at the entrance, but do not occupy a slot.
    return { ...stranger, buildingKey: undefined };
  });
}