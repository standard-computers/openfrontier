import { describe, it as test } from 'node:test';
import { strict as assert } from 'node:assert';
import { applyDisperse, getDisperseTargets } from '../src/lib/inventoryDisperse';

const tile = (claimedBy?: string, resources: string[] = []) => ({ type: 'grass', resources, walkable: true, claimedBy }) as any;
const tiles = [[tile('me'), tile('me', ['rock']), tile('other')], [tile('me'), tile(), tile('me')]];

describe('inventory disperse', () => {
  test('targets only empty owned tiles', () => {
    assert.deepEqual(getDisperseTargets(tiles, 'me', 10), [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 2, y: 1 }]);
  });
  test('stops at item quantity', () => {
    const inv = [{ resourceId: 'tree', quantity: 2 }];
    const r = applyDisperse(tiles, inv, 0, getDisperseTargets(tiles, 'me', 2), 0)!;
    assert.equal(r.placed, 2);
    assert.deepEqual(r.inventory[0], { resourceId: null, quantity: 0 });
  });
  test('stops at territory count and keeps the rest', () => {
    const inv = [{ resourceId: 'tree', quantity: 5 }];
    const r = applyDisperse(tiles, inv, 0, getDisperseTargets(tiles, 'me', 5), 0)!;
    assert.equal(r.placed, 3);
    assert.equal(r.inventory[0].quantity, 2);
  });
  test('random sampling can choose later territories without duplicates', () => {
    assert.deepEqual(getDisperseTargets(tiles, 'me', 1, () => 0), [{ x: 2, y: 1 }]);
    assert.deepEqual(getDisperseTargets(tiles, 'me', 1, () => 0.999), [{ x: 0, y: 0 }]);
    const selected = getDisperseTargets(tiles, 'me', 2, () => 0);
    assert.equal(new Set(selected.map(p => `${p.x},${p.y}`)).size, 2);
  });
});
