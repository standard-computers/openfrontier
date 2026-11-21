import { describe, it as test } from 'node:test';
import { strict as assert } from 'node:assert';
import { rearrangeInventory } from '../src/lib/inventoryDrag';
import type { InventorySlot } from '../src/types/game';

describe('inventory rearrangement', () => {
  const slots: InventorySlot[] = Array.from({ length: 32 }, () => ({ resourceId: null, quantity: 0 }));
  slots[0] = { resourceId: 'hammer', quantity: 3, life: 42 };
  slots[31] = { resourceId: 'wood', quantity: 150 };
  test('moves any full inventory stack to tray slot 0 without losing its displaced stack', () => {
    const result = rearrangeInventory(slots, 31, 9);
    assert.deepEqual(result[9], { resourceId: 'wood', quantity: 150 });
    assert.deepEqual(result[31], { resourceId: null, quantity: 0 });
    assert.equal(slots[31].quantity, 150);
  });
  test('swaps occupied slots preserving quantity and durability', () => {
    const result = rearrangeInventory(slots, 0, 31);
    assert.deepEqual(result[31], { resourceId: 'hammer', quantity: 3, life: 42 });
    assert.deepEqual(result[0], { resourceId: 'wood', quantity: 150 });
  });
  test('reorganizes outside the tray', () => {
    assert.deepEqual(rearrangeInventory(slots, 31, 20)[20], slots[31]);
  });
  test('rejects invalid indices, empty sources and self drops', () => {
    for (const [from, to] of [[-1, 0], [0, 32], [0.5, 2], [NaN, 2], [1, 0], [0, 0]]) {
      assert.equal(rearrangeInventory(slots, from, to), slots);
    }
  });
});