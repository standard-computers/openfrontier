import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCitizenGatherEarnings, getCitizenTerritoryAttraction, mergeCitizenEconomy, returnUnpledgedToUnclaimed } from '../src/lib/citizenEconomy';
import type { Stranger, WorldMap } from '../src/types/game';

const citizen = { id: 'person', position: { x: 0, y: 0 }, coins: 100, happiness: 80, inventory: [], health: 70, name: 'Clara Bennett', color: '' } as Stranger;
test('gathering earns the resource coin value, not daily income', () => {
  assert.equal(getCitizenGatherEarnings(12), 12);
  assert.equal(getCitizenGatherEarnings(0), 0);
});
test('resources within a territory make it more attractive for pledges', () => {
  assert.ok(getCitizenTerritoryAttraction(100, 10, 10) > getCitizenTerritoryAttraction(100, 0, 10));
});
test('tax deductions preserve gathering earnings while a save is in flight', () => {
  const latest = { ...citizen, coins: 112 };
  const saved = { ...citizen, coins: 90, happiness: 75, lastTaxDay: 28 };
  const result = mergeCitizenEconomy([latest], [citizen], [saved])[0];
  assert.equal(result.coins, 102);
  assert.equal(result.happiness, 75);
  assert.equal(result.lastTaxDay, 28);
});
test('canonical departure removes pledge and building occupancy while retaining wealth', () => {
  const pledged = { ...citizen, allegiance: { userId: 'npc-0', username: 'NPC', sovereigntyName: 'Realm', sovereigntyFlag: '', pledgedAt: 0 }, buildingKey: 'house' };
  const result = mergeCitizenEconomy([pledged], [pledged], [{ ...citizen, coins: 50, taxExileUntilDay: 56 }])[0];
  assert.equal(result.allegiance, undefined);
  assert.equal(result.buildingKey, undefined);
  assert.equal(result.coins, 50);
  assert.equal(result.taxExileUntilDay, 56);
});
test('departed citizens move onto unclaimed dry land', () => {
  const map = { width: 3, height: 1, tiles: [[{ type: 'grass', walkable: true, resources: [], claimedBy: 'npc-0' }, { type: 'water', walkable: true, resources: [] }, { type: 'grass', walkable: true, resources: [] }]], spawnPoint: { x: 0, y: 0 } } as WorldMap;
  assert.deepEqual(returnUnpledgedToUnclaimed([citizen], map)[0].position, { x: 2, y: 0 });
});