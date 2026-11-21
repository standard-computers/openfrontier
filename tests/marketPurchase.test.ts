import { describe, it as test } from 'node:test';
import { strict as assert } from 'node:assert';
import { getMarketPurchaseTotal } from '../src/lib/marketPurchase';
import { addToInventory, createEmptyInventory } from '../src/types/game';

describe('quantity marketplace purchases', () => {
  test('calculates the live total for the entered quantity at existing double-base pricing', () => {
    assert.deepEqual(getMarketPurchaseTotal(12, '3'), { quantity: 3, total: 72 });
    assert.deepEqual(getMarketPurchaseTotal(12, '30'), { quantity: 30, total: 720 });
  });
  test('rejects blank, zero, negative, fractional and unsafe quantities', () => {
    for (const input of ['', '0', '-2', '1.5', 'abc', '9007199254740992']) assert.equal(getMarketPurchaseTotal(12, input), null);
  });
  test('adds the complete purchased quantity to inventory', () => {
    const purchase = getMarketPurchaseTotal(12, '7');
    assert.ok(purchase);
    const inventory = createEmptyInventory();
    addToInventory(inventory, 'wood', purchase.quantity);
    assert.equal(inventory[0].quantity, 7);
  });
});