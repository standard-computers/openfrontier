import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNpcActionInterval, getNpcTaxRate, normalizeNpcAggression } from '../src/lib/npcAggression';

test('Low preserves the current two-second NPC action speed and is the default', () => {
  assert.equal(getNpcActionInterval('low'), 2000);
  assert.equal(getNpcActionInterval(), 2000);
  assert.equal(normalizeNpcAggression(null), 'low');
  assert.equal(normalizeNpcAggression('invalid'), 'low');
});

test('Medium runs NPC gathering, claiming and movement turns twice as often as Low', () => {
  assert.equal(getNpcActionInterval('medium'), 1000);
  assert.equal(getNpcActionInterval('low') / getNpcActionInterval('medium'), 2);
});

test('High runs NPC turns four times as often as Low', () => {
  assert.equal(getNpcActionInterval('high'), 500);
  assert.equal(getNpcActionInterval('low') / getNpcActionInterval('high'), 4);
});

test('NPC tax rates are set by NPC logic from aggression, not by players', () => {
  assert.equal(getNpcTaxRate('low'), 10);
  assert.equal(getNpcTaxRate('medium'), 20);
  assert.equal(getNpcTaxRate('high'), 35);
  assert.equal(getNpcTaxRate(), 10);
});