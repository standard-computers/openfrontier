import { test } from 'node:test';
import assert from 'node:assert/strict';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const session = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;

test('5,000 citizens save twice within the API timeout, preserving state and rejecting stale saves', { skip: !url || !key || !session }, async () => {
  if (!url || !key || !session) throw new Error('Authenticated test environment unavailable');
  const auth = JSON.parse(session);
  const headers = { apikey: key, Authorization: `Bearer ${auth.access_token}`, 'Content-Type': 'application/json' };
  async function rpc(name: string, body: Record<string, unknown>) {
    const response = await fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await response.json();
    assert.equal(response.status, 200, JSON.stringify(data));
    return data;
  }
  const worldId = await rpc('create_world_with_owner', {
    _name: 'Temporary citizen save regression', _map_data: { width: 1, height: 1, tiles: [[{ type: 'grass', resources: [], walkable: true }]] },
    _resource_ids: [], _user_id: auth.user.id, _player_data: {},
  });
  try {
    await rpc('get_world_citizens', { _world_id: worldId });
    const citizens = Array.from({ length: 5000 }, (_, i) => ({
      id: `citizen-${i}`, name: `Clara Bennett ${i}`, coins: i, health: 76, happiness: 91,
      position: { x: 0, y: 0 }, partnerId: `citizen-${(i + 1) % 5000}`,
      inventory: [{ resourceId: 'food', quantity: 12 }],
    }));
    for (const revision of [0, 1]) {
      const start = performance.now();
      const saved = await rpc('save_world_citizens', { _world_id: worldId, _revision: revision, _strangers: citizens });
      assert.ok(performance.now() - start < 8000, 'Save must finish before the eight-second API statement timeout');
      assert.equal(saved.saved, true);
      assert.equal(saved.revision, revision + 1);
      assert.deepEqual(saved.strangers, citizens);
    }
    const stale = await rpc('save_world_citizens', { _world_id: worldId, _revision: 0, _strangers: [] });
    assert.equal(stale.saved, false);
    const loaded = await rpc('get_world_citizens', { _world_id: worldId });
    assert.equal(loaded.revision, 2);
    assert.deepEqual(loaded.strangers, citizens);
    const empty = await rpc('save_world_citizens', { _world_id: worldId, _revision: 2, _strangers: [] });
    assert.equal(empty.saved, true);
    assert.deepEqual(empty.strangers, []);
  } finally {
    const deleted = await fetch(`${url}/rest/v1/worlds?id=eq.${worldId}`, { method: 'DELETE', headers });
    assert.equal(deleted.status, 204, 'Temporary regression world must be removed');
  }
});