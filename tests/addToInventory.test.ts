import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addToInventory, createEmptyInventory } from '../src/types/game';

test('stacks beyond the old 99 cap into a single slot', () => {
  const inv = createEmptyInventory(2);
  addToInventory(inv, 'wood', 150);
  assert.equal(inv[0].resourceId, 'wood');
  assert.equal(inv[0].quantity, 150);
  assert.equal(inv.length, 2);
});

test('appends a new slot when every slot is occupied', () => {
  const inv = createEmptyInventory(1);
  addToInventory(inv, 'wood', 5);
  addToInventory(inv, 'stone', 3);
  assert.equal(inv.length, 2);
  assert.equal(inv[1].resourceId, 'stone');
  assert.equal(inv[1].quantity, 3);
});

test('adds to an existing stack instead of a new slot', () => {
  const inv = createEmptyInventory(3);
  addToInventory(inv, 'wood', 10);
  addToInventory(inv, 'wood', 7);
  assert.equal(inv[0].quantity, 17);
  assert.equal(inv.filter(s => s.resourceId === 'wood').length, 1);
});

test('new slots start with full life', () => {
  const inv = createEmptyInventory(1);
  addToInventory(inv, 'apple');
  assert.equal(inv[0].life, 100);
  assert.equal(inv[0].quantity, 1);
});
