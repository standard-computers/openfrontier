import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateStrangers, type WorldMap } from '../src/types/game';
import { readCitizenSnapshot } from '../src/lib/citizenPersistence';
import { generateCitizenName } from '../src/lib/citizenNames';

const map: WorldMap = { width: 1, height: 1, spawnPoint: { x: 0, y: 0 }, tiles: [[{ type: 'grass', walkable: true, resources: [] }]] };

test('520 saved citizens are not reset to the 500 world-size seed', () => {
  const citizens = generateStrangers(520, map);
  assert.equal(generateStrangers(500, map, citizens).length, 520);
  assert.strictEqual(generateStrangers(500, map, citizens), citizens);
});

test('complete citizen state survives serialization and re-entry', () => {
  const citizens = generateStrangers(1, map);
  Object.assign(citizens[0], {
    name: 'Clara Bennett', health: 76, happiness: 91, partnerId: 'partner-1', lastBirthTime: 1234,
    allegiance: { userId: 'owner-1', username: 'Ruler', sovereigntyName: 'Home', sovereigntyFlag: 'flag', pledgedAt: 1200 },
    inventory: [{ resourceId: 'food', quantity: 12 }],
  });
  const loaded = readCitizenSnapshot(JSON.parse(JSON.stringify({ strangers: citizens, revision: 4 })));
  assert.deepEqual(generateStrangers(500, map, loaded.strangers ?? undefined), citizens);
  assert.equal(loaded.revision, 4);
});

test('an empty saved population stays empty', () => {
  assert.deepEqual(generateStrangers(500, map, []), []);
});

test('newborn citizens inherit a family surname with a personal name', () => {
  const name = generateCitizenName('Bennett');
  assert.equal(name.split(' ')[1], 'Bennett');
  assert.notEqual(name.split(' ')[0], 'Young');
});