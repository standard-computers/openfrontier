import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNpcActionInterval, normalizeNpcAggression } from '../src/lib/npcAggression';

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