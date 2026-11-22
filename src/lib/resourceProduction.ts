import type { MapTile, Resource, WorldMap } from '../types/game';

export const GAME_HOUR_MS = 150000; // 1 real hour = 24 game hours.

export function getWorldGameHour(createdAt: string, now = Date.now()): number {
  const start = new Date(createdAt).getTime();
  return Number.isFinite(start) ? Math.max(0, Math.floor((now - start) / GAME_HOUR_MS)) : 0;
}

// Checkpoints use absolute game hours so cycles fire on the displayed world clock,
// survive re-entry, and catch up once without repeating completed cycles.
export function producePlacedResources(map: WorldMap, resources: Resource[], hour: number): WorldMap {
  const producers = new Map(resources.filter(r => r.producesResource).map(r => [r.id, r]));
  const availableIds = new Set(resources.map(r => r.id));
  if (!producers.size) return map;
  let changed = false;
  const tiles = map.tiles.map(row => {
    let rowChanged = false;
    const nextRow = row.map(tile => {
      let next = tile;
      for (const id of new Set(tile.placedResources ?? [])) {
        const producer = producers.get(id);
        if (!producer?.producesResource || !tile.resources.includes(id) || !availableIds.has(producer.producesResource)) continue;
        const interval = Math.max(1, Math.floor(producer.producesIntervalHours ?? 24));
        const amount = Math.max(1, Math.floor(producer.producesAmount ?? 1));
        if (!Number.isFinite(interval) || !Number.isFinite(amount)) continue;
        const lastHour = tile.resourceProductionHour?.[id];
        // Existing placed items begin now, not at world creation.
        const cycles = lastHour === undefined ? 0 : Math.max(0, Math.floor(hour / interval) - Math.floor(lastHour / interval));
        if (lastHour !== undefined && cycles === 0) continue;
        next = {
          ...next,
          resourceProductionHour: { ...next.resourceProductionHour, [id]: cycles > 0 ? Math.floor(hour / interval) * interval : hour },
          resources: cycles > 0 ? [...next.resources, ...Array<string>(cycles * amount).fill(producer.producesResource)] : next.resources,
        };
      }
      if (next !== tile) rowChanged = true;
      return next;
    });
    if (rowChanged) changed = true;
    return rowChanged ? nextRow : row;
  });
  return changed ? { ...map, tiles } : map;
}

// Repeated IDs are tile inventory units. Recover every unit, not just one.
// Self-producing placed items keep their anchor while their output is gathered.
export function gatherTileResource(tile: MapTile, resourceId: string): { tile: MapTile; quantity: number } {
  const count = tile.resources.filter(id => id === resourceId).length;
  if (!count) return { tile, quantity: 0 };
  const keepAnchor = count > 1 && tile.placedResources?.includes(resourceId) === true;
  const omit = (values?: Record<string, number>) => values ? Object.fromEntries(Object.entries(values).filter(([id]) => id !== resourceId)) : undefined;
  return {
    quantity: count - (keepAnchor ? 1 : 0),
    tile: {
      ...tile,
      resources: [...tile.resources.filter(id => id !== resourceId), ...(keepAnchor ? [resourceId] : [])],
      placedResources: keepAnchor ? tile.placedResources : tile.placedResources?.filter(id => id !== resourceId),
      resourceLife: keepAnchor ? tile.resourceLife : omit(tile.resourceLife),
      resourceRotation: keepAnchor ? tile.resourceRotation : omit(tile.resourceRotation),
      resourceProductionHour: keepAnchor ? tile.resourceProductionHour : omit(tile.resourceProductionHour),
    },
  };
}