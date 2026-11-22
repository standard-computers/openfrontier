import type { GameWorld, InventorySlot, Position } from '@/types/game';

export const INVENTORY_DRAG_TYPE = 'application/x-frontier-inventory-slot';

/** Resource currently being dragged from the inventory (dataTransfer is unreadable during dragover). */
let activeDragResourceId: string | null = null;
export const setActiveDragResourceId = (id: string | null) => { activeDragResourceId = id; };
export const getActiveDragResourceId = () => activeDragResourceId;

export function rearrangeInventory(inventory: InventorySlot[], source: number, destination: number): InventorySlot[] {
  if (!Number.isInteger(source) || !Number.isInteger(destination) || source < 0 || destination < 0 ||
    source >= inventory.length || destination >= inventory.length || source === destination ||
    !inventory[source].resourceId || inventory[source].quantity <= 0) return inventory;
  const next = [...inventory];
  [next[source], next[destination]] = [next[destination], next[source]];
  return next;
}

export function getInventoryDropResource(world: GameWorld, slotIndex: number, position: Position) {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= world.inventory.length) return null;
  const slot = world.inventory[slotIndex];
  const tile = world.map.tiles[position.y]?.[position.x];
  if (!world.userId || tile?.claimedBy !== world.userId || !slot?.resourceId || slot.quantity <= 0) return null;
  const resource = world.resources.find(item => item.id === slot.resourceId);
  return resource?.placeable ? resource : null;
}