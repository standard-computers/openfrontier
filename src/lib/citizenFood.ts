import { MAX_HEALTH, TILE_TYPES, type MapTile, type Position, type Resource, type Stranger, type WorldMap } from '../types/game';

export const CITIZEN_HEALTH_LOSS_PER_DAY = 5;
const land = new Set(TILE_TYPES.filter(t => t.walkable && t.type !== 'water').map(t => t.type));

export function applyCitizenHunger(citizen: Stranger, gameHour: number): Stranger {
  const previous = citizen.lastNutritionHour ?? gameHour;
  const elapsed = Math.max(0, gameHour - previous);
  return { ...citizen, health: Math.max(0, citizen.health - elapsed * CITIZEN_HEALTH_LOSS_PER_DAY / 24), lastNutritionHour: gameHour };
}

export function canCitizenGatherHere(citizen: Stranger, tile: MapTile | undefined): boolean {
  return !!tile && (citizen.allegiance ? tile.claimedBy === citizen.allegiance.userId : !tile.claimedBy);
}

export function getFreeFoodId(tile: MapTile, foods: Map<string, Resource>): string | undefined {
  return tile.resources.find(id => {
    const resource = foods.get(id);
    if (!resource?.consumable || !(resource.healthGain && resource.healthGain > 0)) return false;
    // A producing anchor is not food stock, but its extra output units are.
    return !tile.placedResources?.includes(id) || !resource.producesResource || tile.resources.filter(r => r === id).length > 1;
  });
}

export function consumeCitizenFood(citizen: Stranger, foods: Map<string, Resource>): Stranger | null {
  if (citizen.health >= MAX_HEALTH) return null;
  const index = citizen.inventory.findIndex(slot => slot.quantity > 0 && slot.resourceId && (foods.get(slot.resourceId)?.healthGain ?? 0) > 0 && foods.get(slot.resourceId)?.consumable);
  const slot = citizen.inventory[index];
  if (!slot?.resourceId) return null;
  const inventory = [...citizen.inventory];
  inventory[index] = slot.quantity > 1 ? { ...slot, quantity: slot.quantity - 1 } : { resourceId: null, quantity: 0 };
  return { ...citizen, inventory, health: Math.min(MAX_HEALTH, citizen.health + (foods.get(slot.resourceId)?.healthGain ?? 0)) };
}

/** Bounded breadth-first food search: stays in the citizen's realm, never crosses water. */
export function findCitizenFoodStep(citizen: Stranger, map: WorldMap, foods: Map<string, Resource>, canEnter: (position: Position) => boolean = () => true): Position | null {
  const start = citizen.position;
  const queue: { position: Position; first: Position | null }[] = [{ position: start, first: null }];
  const visited = new Set([`${start.x},${start.y}`]);
  for (let i = 0; i < queue.length && i < 512; i++) {
    const { position, first } = queue[i];
    const tile = map.tiles[position.y]?.[position.x];
    if (!tile || !land.has(tile.type) || !canCitizenGatherHere(citizen, tile)) continue;
    if (getFreeFoodId(tile, foods)) return first ?? start;
    for (const next of [{ x: position.x + 1, y: position.y }, { x: position.x - 1, y: position.y }, { x: position.x, y: position.y + 1 }, { x: position.x, y: position.y - 1 }]) {
      const key = `${next.x},${next.y}`;
      if (visited.has(key) || !canEnter(next)) continue;
      visited.add(key);
      queue.push({ position: next, first: first ?? next });
    }
  }
  return null;
}