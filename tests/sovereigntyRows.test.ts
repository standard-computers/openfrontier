import { describe, it as test } from 'node:test';
import { strict as assert } from 'node:assert';
import type { MapTile, NPC, Stranger } from '../src/types/game';
import { buildSovereigntyRows } from '../src/lib/sovereigntyRows';

const tile = (type: MapTile['type'], claimedBy?: string): MapTile => ({
  type,
  resources: [],
  walkable: true,
  claimedBy,
});

const person = (id: string, allegianceUserId?: string): Stranger => ({
  id,
  name: id,
  color: '#ffffff',
  position: { x: 0, y: 0 },
  inventory: [],
  health: 50,
  allegiance: allegianceUserId
    ? {
        userId: allegianceUserId,
        username: 'ruler',
        sovereigntyName: 'Reich',
        sovereigntyFlag: '⚔️',
        pledgedAt: 0,
      }
    : undefined,
});

const npc = (id: string, name: string): NPC => ({
  id,
  name,
  color: '#ff0000',
  sovereignty: { name: `${name} Realm`, flag: '🔴', motto: 'Blood and iron', foundedAt: 1 },
  position: { x: 7, y: 9 },
  coins: 0,
  inventory: [],
});

const reich = {
  userId: 'u1',
  username: 'Stg',
  name: 'Reich',
  flag: '⚔️',
  motto: 'Order',
  foundedAt: 1,
  color: '#00ff00',
};

const grid: MapTile[][] = [
  [tile('grass', 'u1'), tile('grass', 'u1'), tile('forest', 'u2')],
  [tile('grass', 'u1'), tile('water'), tile('grass', 'u2')],
];

const base = {
  tiles: grid,
  strangers: [person('s1', 'u1'), person('s2', 'u1'), person('s3'), person('s4', 'npc-0')],
  npcs: [npc('npc-0', 'Nessa')],
  worldSovereignties: [reich],
  currentSovereignty: null,
  userId: 'u1',
  userColor: '#00ff00',
  currentUsername: 'Stg',
  resources: [],
};

describe('buildSovereigntyRows', () => {
  test('shows the newly selected capital home instead of the first claimed tile', () => {
    const rows = buildSovereigntyRows({ ...base, currentSovereignty: {
      name: 'Reich', flag: '⚔️', motto: 'Order', foundedAt: 1, capitalAreaId: 'town', home: { x: 1, y: 0 },
    } });
    assert.deepEqual(rows.find(r => r.id === 'u1')?.home, { x: 1, y: 0 });
  });
  test('shows another member’s saved capital home', () => {
    const rows = buildSovereigntyRows({ ...base, userId: 'u2', worldSovereignties: [{ ...reich, home: { x: 0, y: 1 } }] });
    assert.deepEqual(rows.find(r => r.id === 'u1')?.home, { x: 0, y: 1 });
  });
  test('sums territory, land value, pledged population and home tile', () => {
    const rows = buildSovereigntyRows(base);
    assert.deepEqual(rows.map(r => r.id), ['u1', 'npc-0']);
    const u1 = rows[0];
    assert.equal(u1.name, 'Reich');
    assert.equal(u1.ruler, 'Stg');
    assert.equal(u1.tiles, 3);
    assert.equal(u1.value, 15); // three grass tiles at 5 each
    assert.equal(u1.population, 2);
    assert.deepEqual(u1.home, { x: 0, y: 0 });
    assert.equal(u1.color, '#00ff00');
    assert.equal(u1.isNPC, false);
  });

  test('leaves out players who never founded a sovereignty', () => {
    const rows = buildSovereigntyRows(base);
    assert.equal(rows.some(r => r.id === 'u2'), false);
  });

  test('lists NPC sovereignties with their own home tile', () => {
    const rows = buildSovereigntyRows(base);
    const ness = rows.find(r => r.id === 'npc-0');
    assert.ok(ness);
    assert.equal(ness.name, 'Nessa Realm');
    assert.equal(ness.flag, '🔴');
    assert.equal(ness.motto, 'Blood and iron');
    assert.equal(ness.ruler, 'Nessa');
    assert.equal(ness.isNPC, true);
    assert.equal(ness.tiles, 0);
    assert.equal(ness.value, 0);
    assert.equal(ness.population, 1);
    assert.deepEqual(ness.home, { x: 7, y: 9 });
  });

  test('shows the current player before their sovereignty is saved', () => {
    const rows = buildSovereigntyRows({
      ...base,
      worldSovereignties: [],
      currentSovereignty: { name: 'Emberholm Dominion', flag: '🌟', motto: 'Ashes', foundedAt: 1 },
      userColor: '#123456',
      currentUsername: 'You',
    });
    const mine = rows.find(r => r.id === 'u1');
    assert.ok(mine);
    assert.equal(mine.name, 'Emberholm Dominion');
    assert.equal(mine.ruler, 'You');
    assert.equal(mine.color, '#123456');
    assert.equal(mine.tiles, 3);
  });

  test('does not list the current player twice once saved', () => {
    const rows = buildSovereigntyRows({
      ...base,
      currentSovereignty: { name: 'Reich', flag: '⚔️', motto: 'Order', foundedAt: 1 },
    });
    assert.equal(rows.filter(r => r.id === 'u1').length, 1);
  });

  test('orders by territory size, then land value', () => {
    const rows = buildSovereigntyRows({
      ...base,
      tiles: [[tile('water', 'uA'), tile('grass', 'uB')]],
      strangers: [],
      npcs: [],
      worldSovereignties: [
        { ...reich, userId: 'uA', username: 'A' },
        { ...reich, userId: 'uB', username: 'B' },
      ],
      userId: 'zz',
    });
    assert.deepEqual(rows.map(r => r.id), ['uA', 'uB']);
    assert.equal(rows[0].value, 12); // water
    assert.equal(rows[1].value, 5); // grass
  });
});
