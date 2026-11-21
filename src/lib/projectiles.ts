import type { GameWorld, Position, Resource } from '@/types/game';

export interface ProjectileShot { from: Position; to: Position; firedAt: number }
export const normalizeProjectileDistance = (value: number | undefined) => Number.isFinite(value) ? Math.max(1, Math.floor(value ?? 5)) : 5;
export function projectileDirection(rotation: number) {
  const directions = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
  return directions[((Math.round(rotation / 90) % 4) + 4) % 4];
}
function occupies(anchor: Position, resource: Resource, point: Position) {
  return point.x >= anchor.x && point.x < anchor.x + Math.max(1, resource.tileWidth ?? 1)
    && point.y <= anchor.y && point.y > anchor.y - Math.max(1, resource.tileHeight ?? 1);
}

export function fireProjectile(world: GameWorld, from: Position, resourceId: string) {
  const source = world.map.tiles[from.y]?.[from.x];
  const weapon = world.resources.find(r => r.id === resourceId);
  if (!source?.resources.includes(resourceId) || source.claimedBy !== world.userId || !weapon?.canInflictDamage || !weapon.projectile || !(weapon.damage && weapon.damage > 0)) {
    return { world, shot: null, message: 'Select a projectile resource on your territory' };
  }
  const direction = projectileDirection(source.resourceRotation?.[resourceId] ?? 0);
  const range = normalizeProjectileDistance(weapon.projectileDistance);
  const objects: { anchor: Position; resource: Resource }[] = [];
  const definitions = new Map(world.resources.map(r => [r.id, r]));
  const maxWidth = Math.max(1, ...world.resources.map(r => r.tileWidth ?? 1));
  const maxHeight = Math.max(1, ...world.resources.map(r => r.tileHeight ?? 1));
  const end = { x: from.x + direction.x * range, y: from.y + direction.y * range };
  for (let y = Math.max(0, Math.min(from.y, end.y)); y <= Math.min(world.map.height - 1, Math.max(from.y, end.y) + maxHeight - 1); y++) {
    for (let x = Math.max(0, Math.min(from.x, end.x) - maxWidth + 1); x <= Math.min(world.map.width - 1, Math.max(from.x, end.x)); x++) {
      for (const id of world.map.tiles[y][x].resources) {
        const resource = definitions.get(id);
        if (resource && !(x === from.x && y === from.y && id === resourceId)) objects.push({ anchor: { x, y }, resource });
      }
    }
  }
  let to = from;
  let hit: typeof objects[number] | undefined;
  let citizenId: string | undefined;
  for (let step = 1; step <= range; step++) {
    const point = { x: from.x + direction.x * step, y: from.y + direction.y * step };
    if (!world.map.tiles[point.y]?.[point.x]) break;
    to = point;
    if (occupies(from, weapon, point)) continue;
    hit = objects.find(object => occupies(object.anchor, object.resource, point));
    if (hit) break;
    citizenId = world.strangers?.find(s => !s.buildingKey && s.health > 0 && s.position.x === point.x && s.position.y === point.y)?.id;
    if (citizenId) break;
  }
  const shot = { from, to, firedAt: Date.now() };
  let next = world;
  let message = 'Shot landed on empty ground';
  if (citizenId) {
    next = { ...world, strangers: world.strangers?.map(s => s.id === citizenId ? { ...s, health: Math.max(0, s.health - weapon.damage) } : s) };
    message = `Hit citizen for ${weapon.damage} damage`;
  } else if (hit) {
    const { resource, anchor } = hit;
    if (!resource.destructible || (resource.destroyedBy?.length && !resource.destroyedBy.includes(weapon.id))) {
      message = `${resource.name} blocked the shot`;
    } else {
      const target = world.map.tiles[anchor.y][anchor.x];
      const life = Math.max(0, (target.resourceLife?.[resource.id] ?? resource.maxLife ?? 100) - weapon.damage);
      const resourceLife = { ...target.resourceLife, [resource.id]: life };
      const resourceRotation = { ...target.resourceRotation };
      if (life === 0) { delete resourceLife[resource.id]; delete resourceRotation[resource.id]; }
      const tile = { ...target, resourceLife, resourceRotation,
        resources: life === 0 ? target.resources.filter(id => id !== resource.id) : target.resources,
        placedResources: life === 0 ? target.placedResources?.filter(id => id !== resource.id) : target.placedResources };
      const tiles = [...world.map.tiles];
      tiles[anchor.y] = [...tiles[anchor.y]];
      tiles[anchor.y][anchor.x] = tile;
      next = { ...world, map: { ...world.map, tiles } };
      message = life === 0 ? `Destroyed ${resource.name}` : `Hit ${resource.name} for ${weapon.damage} damage (${life} HP)`;
    }
  }
  if (weapon.givesXp) next = { ...next, xp: next.xp + (weapon.xpAmount ?? 0) };
  return { world: next, shot, message };
}