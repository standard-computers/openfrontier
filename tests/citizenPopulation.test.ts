import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { MapTile, Resource, Stranger, WorldMap } from '../src/types/game';
import { buildCitizenBuildingIndex, reconcileCitizenBuildings } from '../src/lib/citizenBuildings';
import { countPledgedCitizens, getSovereigntyPopulationLimits, hasPledgeRoom, reconcilePledgePopulation, updatePledgeCounts } from '../src/lib/citizenPopulation';

const house = { id: 'house', holdsPeople: true, peopleCapacity: 100, tileWidth: 2, tileHeight: 2 } as Resource;
function world(): WorldMap {
  const tiles: MapTile[][] = Array.from({ length: 5 }, () => Array.from({ length: 8 }, () => ({ type: 'grass', walkable: true, resources: [], claimedBy: 'human' })));
  tiles[2][1].resources = ['house'];
  return { id: 'test', name: 'Test', width: 8, height: 5, tiles, spawnPoint: { x: 0, y: 0 } };
}
function citizen(id: string, owner: string | null = 'human'): Stranger {
  return { id, name: id, color: '', position: { x: 1, y: 2 }, health: 80, happiness: 80, coins: 23,
    inventory: [{ resourceId: 'apple', quantity: 4 }],
    allegiance: owner ? { userId: owner, username: owner, sovereigntyName: owner, sovereigntyFlag: '', pledgedAt: 0 } : undefined };
}
test('100 building places allow 140 pledges but only 100 hidden occupants', () => {
  const map = world(); const buildings = buildCitizenBuildingIndex(map, [house]);
  const limits = getSovereigntyPopulationLimits(buildings);
  assert.equal(limits.get('human'), 140);
  const citizens = Array.from({ length: 141 }, (_, i) => citizen(String(i)));
  const result = reconcileCitizenBuildings(reconcilePledgePopulation(citizens, limits), map, buildings);
  assert.equal(result.filter(c => c.allegiance).length, 140);
  assert.equal(result.filter(c => c.buildingKey).length, 100);
  assert.equal(result.length, 141);
});
test('sum all owned buildings before rounding the forty percent bonus down', () => {
  const map = world(); map.tiles[2][4].resources = ['small'];
  const limits = getSovereigntyPopulationLimits(buildCitizenBuildingIndex(map, [{ ...house, peopleCapacity: 2 }, { ...house, id: 'small', peopleCapacity: 3 }]));
  assert.equal(limits.get('human'), 7);
  assert.equal(getSovereigntyPopulationLimits(buildCitizenBuildingIndex(world(), [{ ...house, peopleCapacity: 2 }])).get('human'), 2);
});
test('NPC and human capacity are independent; unowned and disabled resources provide no places', () => {
  const map = world(); map.tiles[2][4].resources = ['house'];
  for (const y of [1, 2]) for (const x of [4, 5]) map.tiles[y][x].claimedBy = 'npc-1';
  map.tiles[4][7].resources = ['disabled'];
  map.tiles[4][0].resources = ['house']; map.tiles[4][0].claimedBy = undefined;
  const limits = getSovereigntyPopulationLimits(buildCitizenBuildingIndex(map, [house, { ...house, id: 'disabled', holdsPeople: false }]));
  assert.equal(limits.get('human'), 140);
  assert.equal(limits.get('npc-1'), 140);
  assert.equal(hasPledgeRoom('no-buildings', limits, new Map()), false);
});
test('sequential pledge and birth reservations cannot exceed the limit', () => {
  const limits = new Map([['human', 140], ['npc-1', 140]]);
  const counts = new Map([['human', 139], ['npc-1', 140]]);
  assert.equal(hasPledgeRoom('human', limits, counts), true);
  updatePledgeCounts(citizen('new', null), citizen('new'), counts);
  assert.equal(hasPledgeRoom('human', limits, counts), false);
  assert.equal(hasPledgeRoom('npc-1', limits, counts), false);
  updatePledgeCounts(citizen('leaving'), citizen('leaving', null), counts);
  assert.equal(counts.get('human'), 139);
  updatePledgeCounts(citizen('baby', null), citizen('baby'), counts);
  assert.equal(counts.get('human'), 140);
  assert.equal(hasPledgeRoom('human', limits, counts), false);
});
test('capacity reductions unpledge excess people without deleting identity or possessions; results survive saving', () => {
  const people = [citizen('one'), { ...citizen('two'), buildingKey: '1,2:house', partnerId: 'one' }];
  people[0].partnerId = 'two';
  const result = reconcilePledgePopulation(people, new Map([['human', 1]]));
  assert.equal(result.length, 2);
  assert.equal(result[1].allegiance, undefined);
  assert.equal(result[1].buildingKey, undefined);
  assert.equal(result[0].partnerId, undefined);
  assert.equal(result[1].coins, 23);
  assert.deepEqual(result[1].inventory, [{ resourceId: 'apple', quantity: 4 }]);
  assert.equal(result[1].name, 'two');
  const reloaded = JSON.parse(JSON.stringify(result));
  assert.equal(countPledgedCitizens(reloaded).get('human'), 1);
  assert.equal(reloaded[1].allegiance, undefined);
  assert.equal(reconcilePledgePopulation(people, new Map()).filter(c => c.allegiance).length, 0);
});
test('owned resource capacity is counted even if its footprint is not accessible, without allowing entry', () => {
  const map = world(); map.tiles[1][2].type = 'water';
  const index = buildCitizenBuildingIndex(map, [house]);
  assert.equal(getSovereigntyPopulationLimits(index).get('human'), 140);
  assert.equal(index.buildings.size, 0);
});