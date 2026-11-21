import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorldResourceWriter } from '../src/lib/worldResourcePersistence';

test('add missing saves the complete batch before resolving and survives reloading', async () => {
  let saved = ['existing'];
  const writer = createWorldResourceWriter(async () => [...saved], async ids => { saved = [...ids]; });
  await writer.add(['missing-a', 'missing-b', 'existing']);
  assert.deepEqual(JSON.parse(JSON.stringify(saved)), ['existing', 'missing-a', 'missing-b']);
});

test('concurrent additions and removals cannot overwrite each other with stale IDs', async () => {
  let saved = ['existing'];
  const writer = createWorldResourceWriter(async () => [...saved], async ids => { saved = [...ids]; });
  await Promise.all([writer.add(['a']), writer.add(['b']), writer.remove('existing')]);
  assert.deepEqual(saved, ['a', 'b']);
});

test('failed saves reject and a subsequent addition can retry', async () => {
  let saved: string[] = [];
  let fail = true;
  const writer = createWorldResourceWriter(async () => saved, async ids => {
    if (fail) throw new Error('Save failed');
    saved = ids;
  });
  await assert.rejects(writer.add(['missing']), /Save failed/);
  assert.deepEqual(saved, []);
  fail = false;
  await writer.add(['missing']);
  assert.deepEqual(saved, ['missing']);
});