import { describe, it as test } from 'node:test';
import { strict as assert } from 'node:assert';
import { getSelectionGatherPlan } from '../src/lib/selectionGather';

const at = (
  x: number,
  y: number,
  over: { claimedBy?: string; resources?: string[]; placedResources?: string[] } = {}
) => ({
  tile: {
    claimedBy: over.claimedBy,
    resources: over.resources ?? [],
    placedResources: over.placedResources ?? [],
  },
  position: { x, y },
});

describe('multi-tile gather all', () => {
  test('offers gather all when every tile is unclaimed', () => {
    const plan = getSelectionGatherPlan(
      [at(0, 0, { resources: ['apple'] }), at(1, 0, { resources: ['wood'] })],
      'owner'
    );
    assert.equal(plan.allMineOrUnclaimed, true);
    assert.equal(plan.canGatherAll, true);
    assert.deepEqual(plan.gatherable, [
      { x: 0, y: 0, resourceId: 'apple' },
      { x: 1, y: 0, resourceId: 'wood' },
    ]);
  });

  test('offers gather all when tiles are unclaimed or claimed by me', () => {
    const plan = getSelectionGatherPlan(
      [at(0, 0, { claimedBy: 'owner', resources: ['apple'] }), at(1, 0)],
      'owner'
    );
    assert.equal(plan.allMineOrUnclaimed, true);
    assert.equal(plan.canGatherAll, true);
    assert.equal(plan.gatherable.length, 1);
  });

  test('hides gather all when any tile belongs to another player', () => {
    const plan = getSelectionGatherPlan(
      [at(0, 0, { resources: ['apple'] }), at(1, 0, { claimedBy: 'other', resources: ['wood'] })],
      'owner'
    );
    assert.equal(plan.allMineOrUnclaimed, false);
    assert.equal(plan.canGatherAll, false);
    assert.deepEqual(plan.gatherable, [{ x: 0, y: 0, resourceId: 'apple' }]);
  });

  test('ignores placed items on unclaimed land', () => {
    const plan = getSelectionGatherPlan(
      [at(0, 0, { resources: ['fence', 'apple'], placedResources: ['fence'] })],
      'owner'
    );
    assert.deepEqual(plan.gatherable, [{ x: 0, y: 0, resourceId: 'apple' }]);
  });

  test('gathers placed resources on tiles I own', () => {
    const plan = getSelectionGatherPlan(
      [at(0, 0, { claimedBy: 'owner', resources: ['fence', 'apple'], placedResources: ['fence'] })],
      'owner'
    );
    assert.equal(plan.canGatherAll, true);
    assert.deepEqual(plan.gatherable, [
      { x: 0, y: 0, resourceId: 'fence' },
      { x: 0, y: 0, resourceId: 'apple' },
    ]);
  });

  test('cannot gather placed resources from another owner', () => {
    const plan = getSelectionGatherPlan(
      [at(0, 0, { claimedBy: 'other', resources: ['fence'], placedResources: ['fence'] })],
      'owner'
    );
    assert.equal(plan.canGatherAll, false);
    assert.deepEqual(plan.gatherable, []);
  });

  test('offers nothing when the selection is empty or already picked clean', () => {
    assert.equal(getSelectionGatherPlan([], 'owner').canGatherAll, false);
    assert.equal(getSelectionGatherPlan([at(0, 0)], 'owner').canGatherAll, false);
  });
});

describe('sovereignty outsider-gathering policy', () => {
  test('allows gathering from a tile whose owner permits outsider gathering', () => {
    const plan = getSelectionGatherPlan(
      [at(0, 0, { claimedBy: 'neighbor', resources: ['apple'] })],
      'owner',
      (ownerId) => ownerId === 'neighbor'
    );
    assert.equal(plan.allMineOrUnclaimed, true);
    assert.equal(plan.canGatherAll, true);
    assert.deepEqual(plan.gatherable, [{ x: 0, y: 0, resourceId: 'apple' }]);
  });

  test('still blocks tiles whose owner does not permit outsider gathering', () => {
    const plan = getSelectionGatherPlan(
      [at(0, 0, { claimedBy: 'neighbor', resources: ['apple'] })],
      'owner',
      () => false
    );
    assert.equal(plan.allMineOrUnclaimed, false);
    assert.equal(plan.canGatherAll, false);
    assert.equal(plan.gatherable.length, 0);
  });

  test('placed resources stay owner-only even when outsider gathering is allowed', () => {
    const plan = getSelectionGatherPlan(
      [at(0, 0, { claimedBy: 'neighbor', resources: ['apple', 'fence'], placedResources: ['fence'] })],
      'owner',
      () => true
    );
    assert.deepEqual(plan.gatherable, [{ x: 0, y: 0, resourceId: 'apple' }]);
  });
});
