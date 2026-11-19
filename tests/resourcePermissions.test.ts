import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canEditRepositoryResource, withoutResourceCreator } from '../src/lib/resourcePermissions';

test('Stg resource-editor access allows editing resources from any creator', () => {
  assert.equal(canEditRepositoryResource('56826f34-e845-4a9f-81f1-9ef5921bab6c', 'other-creator', true), true);
  assert.equal(canEditRepositoryResource('56826f34-e845-4a9f-81f1-9ef5921bab6c', null, true), true);
});

test('ordinary users can only edit their own resources; signed-out users cannot edit', () => {
  assert.equal(canEditRepositoryResource('player', 'other-creator', false), false);
  assert.equal(canEditRepositoryResource('player', 'player', false), true);
  assert.equal(canEditRepositoryResource(undefined, null, true), false);
});

test('resource edits do not overwrite the original creator', () => {
  assert.deepEqual(withoutResourceCreator({ created_by: 'Stg', base_value: 25 }), { base_value: 25 });
});