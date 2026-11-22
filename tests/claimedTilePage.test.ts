import { it as test } from 'node:test';
import { strict as assert } from 'node:assert';
import { getClaimedTilePage } from '../src/lib/claimedTilePage';
import type { MapTile } from '../src/types/game';

test('pages only owned tiles without duplicates or skipped coordinates', () => {
  const tiles: MapTile[][] = [Array.from({ length: 125 }, (_, x) => ({ type: 'grass', resources: [], walkable: true, claimedBy: x < 120 ? 'me' : 'other' }))];
  const first = getClaimedTilePage(tiles, 'me');
  assert.equal(first.rows.length, 50);
  assert.equal(first.nextCursor, 50);
  const second = getClaimedTilePage(tiles, 'me', first.nextCursor ?? 0);
  assert.equal(second.rows[0]?.x, 50);
  assert.equal(second.rows.length, 50);
  const last = getClaimedTilePage(tiles, 'me', second.nextCursor ?? 0);
  assert.equal(last.rows.length, 20);
  assert.equal(last.rows[19]?.x, 119);
  assert.equal(last.nextCursor, null);
});

test('does not inspect the full map when a page is available', () => {
  const row: MapTile[] = Array.from({ length: 200 }, () => ({ type: 'grass', resources: [], walkable: true, claimedBy: 'me' }));
  Object.defineProperty(row, 100, { get() { throw new Error('Unneeded tile inspected'); } });
  assert.equal(getClaimedTilePage([row], 'me').rows.length, 50);
});