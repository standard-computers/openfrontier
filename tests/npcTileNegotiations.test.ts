import { test } from 'node:test';
import assert from 'node:assert/strict';

// These integration checks exercise the actual server decision, not a duplicate implementation.
const session = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
const token = session ? JSON.parse(session).access_token : undefined;
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
// Run explicitly against a reachable Cloud instance; ordinary unit runs stay offline.
const enabled = process.env.RUN_CLOUD_TESTS === '1' && Boolean(token && url && key);

async function response(aggression: string, kind: string, amount: number | null, value = 10) {
  assert.ok(url && key && token, 'A signed-in preview is required for server checks');
  const result = await fetch(`${url}/rest/v1/rpc/npc_land_response`, {
    method: 'POST',
    signal: AbortSignal.timeout(4000),
    headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ _aggression: aggression, _kind: kind, _amount: amount, _value: value }),
  });
  assert.equal(result.status, 200, 'NPC decision call succeeds');
  return result.json();
}

test('Low NPCs accept minimum-value offers and give up contested land', { skip: !enabled }, async () => {
  assert.equal(await response('low', 'offer', 10), 'accepted');
  assert.equal(await response('low', 'contest', null), 'accepted');
});
test('Medium NPCs counter below 150% land value, accept at it, and start conflicts', { skip: !enabled }, async () => {
  assert.equal(await response('medium', 'offer', 14), 'countered');
  assert.equal(await response('medium', 'offer', 15), 'accepted');
  assert.equal(await response('medium', 'contest', null), 'conflict');
});
test('High NPCs reject below double value, counter below triple value, and start conflicts', { skip: !enabled }, async () => {
  assert.equal(await response('high', 'offer', 19), 'rejected');
  assert.equal(await response('high', 'offer', 20), 'countered');
  assert.equal(await response('high', 'offer', 30), 'accepted');
  assert.equal(await response('high', 'contest', null), 'conflict');
});