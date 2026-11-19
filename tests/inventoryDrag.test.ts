import { describe, it as test } from 'node:test';
import { strict as assert } from 'node:assert';
import type { GameWorld } from '@/types/game';
import { getInventoryDropResource } from '../src/lib/inventoryDrag';

const world = {
  userId: 'owner',
  inventory: [{ resourceId: 'tree', quantity: 2 }],
  resources: [{ id: 'tree', placeable: true }],
  map: { tiles: [[{ claimedBy: 'owner' }, {}, { claimedBy: 'other' }]] },
} as unknown as GameWorld;

describe('inventory drag placement', () => {
  test('permits placement on owned territory', () => {
    assert.equal(getInventoryDropResource(world, 0, { x: 0, y: 0 })?.id, 'tree');
  });
  test('rejects unclaimed territory', () => {
    assert.equal(getInventoryDropResource(world, 0, { x: 1, y: 0 }), null);
  });
  test('rejects another sovereignty territory', () => {
    assert.equal(getInventoryDropResource(world, 0, { x: 2, y: 0 }), null);
  });
  test('rejects depleted inventory', () => {
    assert.equal(getInventoryDropResource({ ...world, inventory: [{ resourceId: 'tree', quantity: 0 }] }, 0, { x: 0, y: 0 }), null);
  });
  test('rejects non-placeable items', () => {
    assert.equal(getInventoryDropResource({ ...world, resources: [{ ...world.resources[0], placeable: false }] }, 0, { x: 0, y: 0 }), null);
  });
});