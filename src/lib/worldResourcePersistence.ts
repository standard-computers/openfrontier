// Serialize reference changes and read saved IDs, never a stale render snapshot.
export function createWorldResourceWriter(
  read: () => Promise<string[]>,
  save: (ids: string[]) => Promise<void>,
) {
  let pending: Promise<unknown> = Promise.resolve();
  const change = (added: string[], removed: string[] = []) => {
    const operation = pending.catch(() => undefined).then(async () => {
      const current = await read();
      const ids = [...new Set([...current, ...added])].filter(id => !removed.includes(id));
      await save(ids);
      return ids;
    });
    pending = operation;
    return operation;
  };
  return { add: (ids: string[]) => change(ids), remove: (id: string) => change([], [id]) };
}