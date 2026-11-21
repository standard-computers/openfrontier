import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { GameWorld, Resource } from '../src/types/game';
import { fireProjectile, projectileDirection } from '../src/lib/projectiles';

function fixture(rotation = 90, distance = 4): GameWorld {
  const gun = { id: 'gun', name: 'Cannon', canInflictDamage: true, projectile: true, projectileDistance: distance, damage: 25 } as Resource;
  const wall = { id: 'wall', name: 'Wall', destructible: true, maxLife: 100 } as Resource;
  const tiles = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => ({ type: 'grass', resources: [] as string[], walkable: true })));
  tiles[4][4] = { ...tiles[4][4], resources: ['gun'], claimedBy: 'me', resourceRotation: { gun: rotation } } as typeof tiles[number][number];
  return { userId: 'me', map: { width: 9, height: 9, tiles }, resources: [gun, wall], strangers: [], xp: 0 } as unknown as GameWorld;
}
test('rotation follows north, east, south, west for 0, 90, 180, 270 degrees', () => {
  assert.deepEqual([0,90,180,270].map(projectileDirection), [{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}]);
});
test('projectile travels no farther than its configured distance', () => {
  const world = fixture(90, 2);
  world.map.tiles[4][7].resources = ['wall'];
  const result = fireProjectile(world,{x:4,y:4},'gun');
  assert.deepEqual(result.shot?.to,{x:6,y:4});
  assert.equal(result.world.map.tiles[4][7].resourceLife,undefined);
});
test('first target receives exactly the resource damage, including opposing territory', () => {
  const world = fixture();
  world.map.tiles[4][6] = { ...world.map.tiles[4][6], resources: ['wall'], claimedBy: 'other' };
  world.map.tiles[4][7].resources = ['wall'];
  const result = fireProjectile(world,{x:4,y:4},'gun');
  assert.equal(result.world.map.tiles[4][6].resourceLife?.wall,75);
  assert.equal(result.world.map.tiles[4][7].resourceLife,undefined);
});
test('multi-tile footprints intercept shots at their occupied tiles', () => {
  const world = fixture();
  world.resources[1].tileHeight = 2;
  world.map.tiles[5][6].resources = ['wall'];
  assert.equal(fireProjectile(world,{x:4,y:4},'gun').world.map.tiles[5][6].resourceLife?.wall,75);
});
test('destroyed resources lose placed, rotation and life state', () => {
  const world = fixture();
  world.map.tiles[4][5] = { ...world.map.tiles[4][5], resources: ['wall'], placedResources: ['wall'], resourceLife: {wall:20}, resourceRotation:{wall:90} };
  const tile = fireProjectile(world,{x:4,y:4},'gun').world.map.tiles[4][5];
  assert.deepEqual(tile.resources,[]);
  assert.deepEqual(tile.placedResources,[]);
  assert.equal(tile.resourceLife?.wall,undefined);
  assert.equal(tile.resourceRotation?.wall,undefined);
});
test('projectile damages citizen health by configured damage', () => {
  const world = fixture();
  world.strangers = [{id:'citizen',position:{x:5,y:4},health:80}] as GameWorld['strangers'];
  assert.equal(fireProjectile(world,{x:4,y:4},'gun').world.strangers?.[0].health,55);
});
test('firing requires an owned source and enabled projectile damage', () => {
  const world = fixture();
  world.map.tiles[4][4].claimedBy = 'other';
  assert.equal(fireProjectile(world,{x:4,y:4},'gun').shot,null);
  world.map.tiles[4][4].claimedBy = 'me';
  world.resources[0].projectile = false;
  assert.equal(fireProjectile(world,{x:4,y:4},'gun').shot,null);
});
test('protected resources block shots without bypassing tool restrictions', () => {
  const world = fixture();
  world.resources[1].destroyedBy = ['axe'];
  world.map.tiles[4][5].resources = ['wall'];
  assert.equal(fireProjectile(world,{x:4,y:4},'gun').world.map.tiles[4][5].resourceLife,undefined);
});