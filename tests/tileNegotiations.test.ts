import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAME_DAY_MS, getGameHours, isContestExpired, isValidLandOffer, canRespondToTileRequest, type TileRequest } from '../src/lib/tileNegotiations';

const request: TileRequest = { id: 'r', world_id: 'w', tile_x: 1, tile_y: 2, requester_id: 'buyer', owner_id: 'seller', kind: 'contest', amount: null, status: 'pending', created_at: '2026-11-19T00:00:00Z', deadline_game_hour: 48 };

test('offers and counters cannot fall below land value', () => {
  assert.equal(isValidLandOffer(11, 12), false);
  assert.equal(isValidLandOffer(12, 12), true);
  assert.equal(isValidLandOffer(25, 12), true);
  assert.equal(isValidLandOffer(12.5, 12), false);
});
test('one game day is 24 game hours, not a real day', () => {
  const start = Date.parse('2026-11-19T00:00:00Z');
  assert.equal(getGameHours(request.created_at, start + GAME_DAY_MS), 24);
  assert.equal(getGameHours(request.created_at, start + 2 * GAME_DAY_MS), 48);
});
test('unanswered contests expire exactly at their game-day deadline', () => {
  assert.equal(isContestExpired(request, 47.999), false);
  assert.equal(isContestExpired(request, 48), true);
});
test('a conflict response stops automatic claiming', () => {
  assert.equal(isContestExpired({ ...request, status: 'conflict' }, 72), false);
  assert.equal(isContestExpired({ ...request, status: 'accepted' }, 72), false);
});
test('only the owner can answer a new request', () => {
  assert.equal(canRespondToTileRequest(request, 'seller'), true);
  assert.equal(canRespondToTileRequest(request, 'buyer'), false);
  assert.equal(canRespondToTileRequest(request, 'stranger'), false);
});
test('only the original bidder can accept or reject a counteroffer', () => {
  const counter = { ...request, kind: 'offer' as const, status: 'countered' as const };
  assert.equal(canRespondToTileRequest(counter, 'buyer'), true);
  assert.equal(canRespondToTileRequest(counter, 'seller'), false);
});