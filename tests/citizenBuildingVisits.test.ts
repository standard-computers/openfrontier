import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { MapTile, Resource, Stranger, WorldMap } from '../src/types/game';
import {
  buildCitizenBuildingIndex, maybeExitBuilding, preferOutdoorTargets,
  CITIZEN_ENTER_BUILDING_CHANCE, CITIZEN_EXIT_BUILDING_CHANCE,
} from '../src/lib/citizenBuildings';

const house = { id: 'house', holdsPeople: true, peopleCapacity: 10, tileWidth: 2, tileHeight: 2 } as Resource;
function world(): WorldMap {
  const tiles: MapTile[][] = Array.from({ length: 5 }, () => Array.from({ length: 8 }, () => ({ type: 'grass', walkable: true, resources: [], claimedBy: 'human' })));
  tiles[2][1].resources = ['house'];
  return { id: 'test', name: 'Test', width: 8, height: 5, tiles, spawnPoint: { x: 0, y: 0 } };
}
function occupant(): Stranger {
  return { id: 'a', name: 'a', color: '', position: { x: 1, y: 2 }, health: 80, happiness: 80,
    inventory: [], buildingKey: '1,2:house',
    allegiance: { userId: 'human', username: 'human', sovereigntyName: 'human', sovereigntyFlag: '', pledgedAt: 0 } };
}
const adjacent = [{ x: 0, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 1 }, { x: 1, y: 3 }];

test('occupants stay home most turns but step outside sometimes', () => {
  const map = world(); const index = buildCitizenBuildingIndex(map, [house]);
  const staying = maybeExitBuilding(occupant(), adjacent, map, index, CITIZEN_EXIT_BUILDING_CHANCE);
  assert.equal(staying?.buildingKey, '1,2:house');
  const leaving = maybeExitBuilding(occupant(), adjacent, map, index, 0.1);
  assert.equal(leaving?.buildingKey, undefined);
  // The exit tile is outdoors (not part of the house footprint) and in the realm.
  assert.ok(leaving);
  assert.equal(index.byTile.has(`${leaving.position.x},${leaving.position.y}`), false);
  assert.equal(map.tiles[leaving.position.y][leaving.position.x].claimedBy, 'human');
});

test('citizens already outside are untouched, and a boxed-in occupant stays put', () => {
  const map = world(); const index = buildCitizenBuildingIndex(map, [house]);
  const outside = { ...occupant(), buildingKey: undefined };
  assert.equal(maybeExitBuilding(outside, adjacent, map, index, 0.1), null);
  // Surrounded by building tiles: no outdoor exit, so they remain inside.
  const boxed = maybeExitBuilding(occupant(), [{ x: 2, y: 2 }, { x: 1, y: 1 }], map, index, 0.1);
  assert.equal(boxed?.buildingKey, '1,2:house');
});

test('passers-by only head inside some of the time and otherwise keep to outdoor tiles', () => {
  const map = world(); const index = buildCitizenBuildingIndex(map, [house]);
  const targets = [{ x: 2, y: 2 }, { x: 3, y: 3 }];
  const entering = preferOutdoorTargets(targets, index, CITIZEN_ENTER_BUILDING_CHANCE - 0.01);
  assert.deepEqual(entering, targets);
  const stayingOut = preferOutdoorTargets(targets, index, CITIZEN_ENTER_BUILDING_CHANCE);
  assert.deepEqual(stayingOut, [{ x: 3, y: 3 }]);
  // A fully built-up area still allows moving onto building tiles.
  const allBuildings = preferOutdoorTargets([{ x: 2, y: 2 }], index, 0.99);
  assert.deepEqual(allBuildings, [{ x: 2, y: 2 }]);
});
