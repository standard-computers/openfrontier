import { test } from 'node:test';
import assert from 'node:assert/strict';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const session = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
const configured = Boolean(url && key && session);
async function assess(day: number, rate: number, overrides: Record<string, unknown> = {}) {
  if (!url || !key || !session) throw new Error('Authenticated tax test environment unavailable');
  const allegiance = { userId: 'npc-0' };
  const response = await fetch(`${url}/rest/v1/rpc/assess_citizen_tax`, {
    method: 'POST', headers: { apikey: key, Authorization: `Bearer ${JSON.parse(session).access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ _citizen: { id: 'person', coins: 100, happiness: 80, allegiance, ...overrides }, _prior: { id: 'person', lastTaxDay: 0, taxMoodDay: 0, allegiance }, _day: day, _rate: rate }),
  });
  assert.equal(response.status, 200);
  return await response.json();
}
test('no citizen taxes before 28 game days', { skip: !configured }, async () => {
  assert.equal((await assess(27, 10)).paid, 0);
});
test('NPC citizens pay percentage tax exactly at 28 game days', { skip: !configured }, async () => {
  const result = await assess(28, 10);
  assert.equal(result.paid, 10);
  assert.equal(result.citizen.coins, 90);
  assert.equal(result.citizen.lastTaxDay, 28);
});
test('higher taxes lower citizen happiness', { skip: !configured }, async () => {
  assert.ok((await assess(7, 40)).citizen.happiness < (await assess(7, 10)).citizen.happiness);
});
test('excessive taxes eventually end pledges without losing citizen money', { skip: !configured }, async () => {
  const result = await assess(15, 50);
  assert.equal(result.citizen.allegiance, undefined);
  assert.equal(result.citizen.taxExileUntilDay, 43);
  assert.equal(result.citizen.coins, 100);
});
test('zero-rate citizens retain their savings', { skip: !configured }, async () => {
  assert.equal((await assess(28, 0)).citizen.coins, 100);
});