import type { GameWorld, Position } from '@/types/game';

export const INVENTORY_DRAG_TYPE = 'application/x-frontier-inventory-slot';

export function getInventoryDropResource(world: GameWorld, slotIndex: number, position: Position) {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= 10) return null;
  const slot = world.inventory[slotIndex];
  const tile = world.map.tiles[position.y]?.[position.x];
  if (!world.userId || tile?.claimedBy !== world.userId || !slot?.resourceId || slot.quantity <= 0) return null;
  const resource = world.resources.find(item => item.id === slot.resourceId);
  return resource?.placeable ? resource : null;
}