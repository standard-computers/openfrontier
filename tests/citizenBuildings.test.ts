import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { MapTile, Resource, Stranger, WorldMap } from '../src/types/game';
import { buildCitizenBuildingIndex, countBuildingOccupants, moveCitizenIntoBuilding, normalizePeopleCapacity, reconcileCitizenBuildings } from '../src/lib/citizenBuildings';

const building = { id: 'house', holdsPeople: true, peopleCapacity: 2, tileWidth: 2, tileHeight: 2 } as Resource;
function map(): WorldMap {
  const tiles: MapTile[][] = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => ({ type: 'grass', walkable: true, claimedBy: 'realm', resources: [] })));
  tiles[2][1].resources = ['house'];
  return { id: 'world', name: 'World', width: 4, height: 4, tiles, spawnPoint: { x: 0, y: 0 } };
}
function citizen(id: string, owner = 'realm'): Stranger {
  return { id, name: id, color: '', position: { x: 1, y: 2 }, inventory: [], health: 80,
    allegiance: { userId: owner, username: owner, sovereigntyName: owner, sovereigntyFlag: '', pledgedAt: 0 } };
}
test('capacity is per building, shared across its multi-tile footprint', () => {
  const world = map(); const index = buildCitizenBuildingIndex(world, [building]);
  const people = reconcileCitizenBuildings([citizen('one'), citizen('two'), citizen('three')], world, index);
  assert.equal(people.filter(p => p.buildingKey).length, 2);
  assert.equal(index.byTile.size, 4);
  assert.equal(moveCitizenIntoBuilding(citizen('four'), { x: 2, y: 1 }, index, countBuildingOccupants(people)), null);
  assert.equal(index.byTile.has(`${people[2].position.x},${people[2].position.y}`), false);
});
test('only citizens pledged to the building owner may enter', () => {
  const index = buildCitizenBuildingIndex(map(), [building]);
  assert.equal(moveCitizenIntoBuilding(citizen('other', 'other-realm'), { x: 1, y: 2 }, index, new Map()), null);
  assert.equal(moveCitizenIntoBuilding({ ...citizen('unpledged'), allegiance: undefined }, { x: 1, y: 2 }, index, new Map()), null);
  assert.ok(moveCitizenIntoBuilding(citizen('own'), { x: 1, y: 2 }, index, new Map())?.buildingKey);
});
test('buildings spanning other territory or water are unavailable', () => {
  const world = map(); world.tiles[1][2].claimedBy = 'other';
  assert.equal(buildCitizenBuildingIndex(world, [building]).buildings.size, 0);
  world.tiles[1][2].claimedBy = 'realm'; world.tiles[1][2].type = 'water';
  assert.equal(buildCitizenBuildingIndex(world, [building]).buildings.size, 0);
});
test('capacity reductions, newborns, disabled and removed buildings release excess occupancy', () => {
  const world = map(); const people = reconcileCitizenBuildings([citizen('one'), citizen('two')], world, buildCitizenBuildingIndex(world, [building]));
  const reduced = buildCitizenBuildingIndex(world, [{ ...building, peopleCapacity: 1 }]);
  assert.equal(reconcileCitizenBuildings([...people, citizen('baby')], world, reduced).filter(p => p.buildingKey).length, 1);
  assert.equal(reconcileCitizenBuildings(people, world, buildCitizenBuildingIndex(world, [{ ...building, holdsPeople: false }])).filter(p => p.buildingKey).length, 0);
  world.tiles[2][1].resources = [];
  assert.equal(reconcileCitizenBuildings(people, world, buildCitizenBuildingIndex(world, [building])).filter(p => p.buildingKey).length, 0);
});
test('building slots free when citizens leave; saved occupancy survives serialization', () => {
  const world = map(); const index = buildCitizenBuildingIndex(world, [building]);
  const people = reconcileCitizenBuildings([citizen('one'), citizen('two')], world, index);
  const left = moveCitizenIntoBuilding(people[0], { x: 0, y: 2 }, index, countBuildingOccupants(people));
  assert.ok(left); assert.equal(left.buildingKey, undefined);
  assert.ok(moveCitizenIntoBuilding(citizen('three'), { x: 1, y: 2 }, index, countBuildingOccupants([left, people[1]])));
  assert.equal(JSON.parse(JSON.stringify(people))[0].buildingKey, '1,2:house');
});
test('people capacities are positive whole numbers', () => {
  assert.equal(normalizePeopleCapacity(2.9), 2);
  assert.equal(normalizePeopleCapacity(0), 1);
  assert.equal(normalizePeopleCapacity(undefined), 1);
});