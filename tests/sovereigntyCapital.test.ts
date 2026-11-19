import { describe, it as test } from 'node:test';
import { strict as assert } from 'node:assert';
import { makeAreaCapital } from '../src/lib/sovereigntyCapital';
import type { GameWorld } from '../src/types/game';

const world = {
  userId: 'me', playerPosition: { x: 0, y: 0 },
  sovereignty: { name: 'Realm', flag: '🏴', motto: '', foundedAt: 1 },
  map: { tiles: [[{ claimedBy: 'other' }, { claimedBy: 'me' }, { claimedBy: 'me' }, { claimedBy: 'me' }]] },
  areas: [
    { id: 'a', name: 'Town', tiles: [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }] },
    { id: 'b', name: 'Port', tiles: [{ x: 3, y: 0 }] },
    { id: 'foreign', tiles: [{ x: 0, y: 0 }] },
  ],
} as unknown as GameWorld;

describe('area capitals', () => {
  test('making an area capital updates the saved sovereignty home and home position', () => {
    const result = makeAreaCapital(world, 'a');
    assert.equal(result.sovereignty?.capitalAreaId, 'a');
    assert.deepEqual(result.sovereignty?.home, { x: 2, y: 0 });
    assert.deepEqual(result.playerPosition, { x: 2, y: 0 });
    assert.deepEqual(JSON.parse(JSON.stringify(result)).sovereignty.home, { x: 2, y: 0 });
  });
  test('a second capital replaces the previous capital', () => {
    const result = makeAreaCapital(makeAreaCapital(world, 'a'), 'b');
    assert.equal(result.sovereignty?.capitalAreaId, 'b');
    assert.deepEqual(result.playerPosition, { x: 3, y: 0 });
  });
  test('an area without owned tiles cannot become capital', () => {
    assert.equal(makeAreaCapital(world, 'foreign'), world);
  });
});