import type { Area, GameWorld, Position } from '@/types/game';

// Use a real owned tile nearest the area's center, even for irregular areas.
export const getAreaCapitalHome = (area: Area, world: GameWorld): Position | null => {
  const owned = area.tiles.filter(p => world.map.tiles[p.y]?.[p.x]?.claimedBy === world.userId);
  if (!owned.length) return null;
  const center = owned.reduce((sum, p) => ({ x: sum.x + p.x, y: sum.y + p.y }), { x: 0, y: 0 });
  center.x /= owned.length;
  center.y /= owned.length;
  return owned.reduce((best, p) =>
    (p.x - center.x) ** 2 + (p.y - center.y) ** 2 < (best.x - center.x) ** 2 + (best.y - center.y) ** 2 ? p : best
  );
};

export const makeAreaCapital = (world: GameWorld, areaId: string): GameWorld => {
  const area = world.areas?.find(a => a.id === areaId);
  if (!world.sovereignty || !area) return world;
  const home = getAreaCapitalHome(area, world);
  if (!home) return world;
  return {
    ...world,
    playerPosition: { ...home },
    sovereignty: { ...world.sovereignty, capitalAreaId: areaId, home: { ...home } },
  };
};