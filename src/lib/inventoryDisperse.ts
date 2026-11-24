import { TILE_TYPES, type InventorySlot, type MapTile, type Position } from '@/types/game';

/** Uniform reservoir sample of empty, walkable owned tiles, without duplicates. */
export function getDisperseTargets(tiles: MapTile[][], userId: string, limit: number, random = Math.random): Position[] {
  const targets: Position[] = [];
  let eligible = 0;
  if (limit <= 0) return targets;
  for (let y = 0; y < tiles.length; y++) {
    const row = tiles[y];
    for (let x = 0; x < row.length; x++) {
      const tile = row[x];
      if (tile.claimedBy !== userId || tile.resources.length > 0) continue;
      const walkable = TILE_TYPES.find(t => t.type === tile.type)?.walkable ?? tile.walkable;
      if (!walkable) continue;
      eligible++;
      if (targets.length < limit) targets.push({ x, y });
      else {
        const index = Math.floor(random() * eligible);
        if (index < limit) targets[index] = { x, y };
      }
    }
  }
  return targets;
}

/** Number of items a disperse would place: min(slot quantity, empty owned tiles). */
export function getDisperseCount(slot: InventorySlot | undefined, tiles: MapTile[][], userId: string): number {
  if (!slot?.resourceId || slot.quantity <= 0) return 0;
  return getDisperseTargets(tiles, userId, slot.quantity).length;
}

/** Place one unit on each target tile and remove those units from the slot. */
export function applyDisperse(tiles: MapTile[][], inventory: InventorySlot[], slotIndex: number, targets: Position[], gameHour: number) {
  const slot = inventory[slotIndex];
  const resourceId = slot?.resourceId;
  if (!resourceId || targets.length === 0) return null;
  const count = Math.min(targets.length, slot.quantity);
  const used = targets.slice(0, count);
  const byRow = new Map<number, number[]>();
  used.forEach(p => byRow.set(p.y, [...(byRow.get(p.y) ?? []), p.x]));
  const newTiles = tiles.map((row, y) => {
    const xs = byRow.get(y);
    if (!xs) return row;
    const copy = [...row];
    xs.forEach(x => {
      const t = copy[x];
      copy[x] = { ...t, resources: [...t.resources, resourceId], placedResources: [...(t.placedResources || []), resourceId], resourceProductionHour: { ...t.resourceProductionHour, [resourceId]: gameHour } };
    });
    return copy;
  });
  const newInventory = [...inventory];
  const remaining = slot.quantity - count;
  newInventory[slotIndex] = remaining > 0 ? { ...slot, quantity: remaining } : { resourceId: null, quantity: 0 };
  return { tiles: newTiles, inventory: newInventory, placed: count };
}
