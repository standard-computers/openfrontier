import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Resource, WorldMap } from '../src/types/game';
import { GAME_HOUR_MS, gatherTileResource, getWorldGameHour, producePlacedResources } from '../src/lib/resourceProduction';

const resources = [
  { id: 'tree', producesResource: 'apple', producesAmount: 3, producesIntervalHours: 6 },
  { id: 'apple' },
] as Resource[];
const fixture = (): WorldMap => ({ width: 1, height: 1, tiles: [[{
  type: 'grass', walkable: true, claimedBy: 'me', resources: ['tree'], placedResources: ['tree'], resourceProductionHour: { tree: 1 },
}]] } as WorldMap);

test('one real hour is exactly 24 game hours', () => {
  assert.equal(getWorldGameHour('2026-11-22T00:00:00Z', Date.parse('2026-11-22T01:00:00Z')), 24);
  assert.equal(GAME_HOUR_MS, 150000);
});
test('3 selected outputs appear at hour 6, not before the configured clock trigger', () => {
  const map = fixture();
  assert.equal(producePlacedResources(map, resources, 5), map);
  const next = producePlacedResources(map, resources, 6);
  assert.deepEqual(next.tiles[0][0].resources, ['tree', 'apple', 'apple', 'apple']);
  assert.equal(next.tiles[0][0].resourceProductionHour?.tree, 6);
});
test('completed cycles never repeat, including after saved map re-entry', () => {
  const saved = JSON.parse(JSON.stringify(producePlacedResources(fixture(), resources, 6)));
  assert.equal(producePlacedResources(saved, resources, 6), saved);
  assert.equal(producePlacedResources(saved, resources, 11), saved);
  assert.equal(producePlacedResources(saved, resources, 12).tiles[0][0].resources.filter(id => id === 'apple').length, 6);
});
test('re-entry catches up missed cycles with the full amount per cycle', () => {
  const next = producePlacedResources(fixture(), resources, 19);
  assert.equal(next.tiles[0][0].resources.filter(id => id === 'apple').length, 9);
  assert.equal(next.tiles[0][0].resourceProductionHour?.tree, 18);
});
test('legacy placed items initialize without producing since world creation', () => {
  const map = fixture();
  delete map.tiles[0][0].resourceProductionHour;
  const next = producePlacedResources(map, resources, 100);
  assert.deepEqual(next.tiles[0][0].resources, ['tree']);
  assert.equal(next.tiles[0][0].resourceProductionHour?.tree, 100);
});
test('unplaced resources and missing output definitions do not produce', () => {
  const map = fixture();
  map.tiles[0][0].placedResources = [];
  assert.equal(producePlacedResources(map, resources, 6), map);
  assert.equal(producePlacedResources(fixture(), resources.slice(0, 1), 6).tiles[0][0].resources.length, 1);
});
test('gathering transfers all produced units and leaves the producer working', () => {
  const map = producePlacedResources(fixture(), resources, 6);
  const gathered = gatherTileResource(map.tiles[0][0], 'apple');
  assert.equal(gathered.quantity, 3);
  assert.deepEqual(gathered.tile.resources, ['tree']);
  assert.deepEqual(gathered.tile.placedResources, ['tree']);
  assert.equal(gathered.tile.resourceProductionHour?.tree, 6);
});
test('gathering a producer removes its checkpoint so replacing it starts a new cycle', () => {
  const gathered = gatherTileResource(fixture().tiles[0][0], 'tree');
  assert.equal(gathered.quantity, 1);
  assert.equal(gathered.tile.resourceProductionHour?.tree, undefined);
});
test('a producer of itself stays placed while its output is gathered', () => {
  const self = [{ ...resources[0], producesResource: 'tree' }];
  const gathered = gatherTileResource(producePlacedResources(fixture(), self, 6).tiles[0][0], 'tree');
  assert.equal(gathered.quantity, 3);
  assert.deepEqual(gathered.tile.resources, ['tree']);
  assert.deepEqual(gathered.tile.placedResources, ['tree']);
});