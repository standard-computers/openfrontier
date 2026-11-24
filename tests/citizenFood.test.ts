import { describe, it as test } from 'node:test';
import { strict as assert } from 'node:assert';
import { applyCitizenHunger, canCitizenGatherHere, consumeCitizenFood, findCitizenFoodStep, getFreeFoodId } from '../src/lib/citizenFood';
import type { MapTile, Resource, Stranger, WorldMap } from '../src/types/game';

const apple = { id: 'apple', consumable: true, healthGain: 10 } as Resource;
const foods = new Map([['apple', apple]]);
const citizen = { id: 'a', position: { x: 0, y: 0 }, health: 80, inventory: [], allegiance: { userId: 'me' } } as unknown as Stranger;
const tile = (owner: string | undefined = 'me', resources: string[] = []): MapTile => ({ type: 'grass', walkable: true, claimedBy: owner, resources });

describe('citizen food', () => {
  test('health declines without food and elapsed time is applied only once', () => {
    const hungry = applyCitizenHunger({ ...citizen, lastNutritionHour: 0 }, 24);
    assert.equal(hungry.health, 75);
    assert.equal(applyCitizenHunger(hungry, 24).health, 75);
    assert.equal(applyCitizenHunger({ ...citizen, health: 1, lastNutritionHour: 0 }, 24).health, 0);
  });
  test('one consumable meal restores health and uses exactly one item', () => {
    const fed = consumeCitizenFood({ ...citizen, inventory: [{ resourceId: 'apple', quantity: 2 }] }, foods);
    assert.equal(fed?.health, 90);
    assert.equal(fed?.inventory[0].quantity, 1);
    assert.equal(consumeCitizenFood(citizen, foods), null);
  });
  test('placed food is free to gather but a producer anchor is preserved', () => {
    assert.equal(getFreeFoodId({ ...tile('me', ['apple']), placedResources: ['apple'] }, foods), 'apple');
    const producer = new Map([['apple', { ...apple, producesResource: 'apple' }]]);
    assert.equal(getFreeFoodId({ ...tile('me', ['apple']), placedResources: ['apple'] }, producer), undefined);
    assert.equal(getFreeFoodId({ ...tile('me', ['apple', 'apple']), placedResources: ['apple'] }, producer), 'apple');
  });
  test('hungry citizens walk toward food beyond adjacent tiles', () => {
    const map = { tiles: [[tile(), tile(), tile('me', ['apple'])]], width: 3, height: 1 } as WorldMap;
    assert.deepEqual(findCitizenFoodStep(citizen, map, foods), { x: 1, y: 0 });
  });
  test('food search cannot cross water or foreign territory', () => {
    const map = { tiles: [[tile(), { ...tile(), type: 'water' }, tile('me', ['apple'])]], width: 3, height: 1 } as WorldMap;
    assert.equal(findCitizenFoodStep(citizen, map, foods), null);
    map.tiles[0][1] = tile('other');
    assert.equal(findCitizenFoodStep(citizen, map, foods), null);
    assert.equal(canCitizenGatherHere(citizen, tile('other')), false);
    assert.equal(canCitizenGatherHere({ ...citizen, allegiance: undefined }, tile('me')), false);
    assert.equal(canCitizenGatherHere({ ...citizen, allegiance: undefined }, { ...tile(), claimedBy: undefined }), true);
  });
});